const DEFAULT_DISHES = [
  { "name": "Chole", "votes": 3, "pref": "day" },
  { "name": "Chawali", "votes": 3, "pref": "day" },
  { "name": "Pulav", "votes": 4, "pref": "night" },
  { "name": "Dal chawal", "votes": 4, "pref": "night" },
  { "name": "Dal khichadi", "votes": 4, "pref": "night" },
  { "name": "Aloo paratha", "votes": 4, "pref": "night" },
  { "name": "Methi paratha", "votes": 4, "pref": "night" },
  { "name": "Loki paratha / sabji", "votes": 4, "pref": "night" },
  { "name": "Thalipeet", "votes": 3, "pref": "night" },
  { "name": "Bhindi", "votes": 3, "pref": "any" },
  { "name": "Aloo gravey", "votes": 4, "pref": "any" },
  { "name": "Aloo dry", "votes": 4, "pref": "any" },
  { "name": "Pattagobi", "votes": 1, "pref": "any" },
  { "name": "Phoolgobi", "votes": 3, "pref": "any" },
  { "name": "French beans", "votes": 2, "pref": "any" },
  { "name": "Pumpkin (will try once)", "votes": 3, "pref": "any" },
  { "name": "Moong ki sabji (backup)", "votes": 3, "pref": "any" },
  { "name": "Mix veg", "votes": 4, "pref": "any" },
  { "name": "Aloo Kanda", "votes": 4, "pref": "any" },
  { "name": "Toru / turai (once)", "votes": 2, "pref": "any" },
  { "name": "Aloo palak", "votes": 4, "pref": "any" }
];

let allDishes = [];
let currentSlot = 'day'; // 'day' | 'night'
let cooldownDays = 7;
let suggestions = [];

const STORAGE_KEY_HISTORY = 'kya_banana_hai_history';
const STORAGE_KEY_COOLDOWN = 'kya_banana_hai_cooldown';

const btnLunch = document.getElementById('btnLunch');
const btnDinner = document.getElementById('btnDinner');
const btn7d = document.getElementById('btn7d');
const btn5d = document.getElementById('btn5d');
const rerollBtn = document.getElementById('rerollBtn');
const suggestionsBody = document.getElementById('suggestionsBody');
const historyBody = document.getElementById('historyBody');

async function init() {
  loadCooldown();
  detectSlot();
  await loadDishes();
  bindEvents();
  renderHistory();
  generateSuggestions();
}

async function loadDishes() {
  try {
    const res = await fetch('./dishes.json');
    if (res.ok) {
      allDishes = await res.json();
    } else {
      allDishes = DEFAULT_DISHES;
    }
  } catch (e) {
    allDishes = DEFAULT_DISHES;
  }
}

function detectSlot() {
  const hour = new Date().getHours();
  currentSlot = hour < 16 ? 'day' : 'night';
  updateSlotUI();
}

function updateSlotUI() {
  if (currentSlot === 'day') {
    btnLunch.classList.add('active');
    btnDinner.classList.remove('active');
  } else {
    btnDinner.classList.add('active');
    btnLunch.classList.remove('active');
  }
}

function loadCooldown() {
  const saved = localStorage.getItem(STORAGE_KEY_COOLDOWN);
  if (saved === '5' || saved === '7') {
    cooldownDays = parseInt(saved, 10);
  }
  updateCooldownUI();
}

function setCooldown(days) {
  cooldownDays = days;
  localStorage.setItem(STORAGE_KEY_COOLDOWN, days.toString());
  updateCooldownUI();
  generateSuggestions();
}

function updateCooldownUI() {
  if (cooldownDays === 7) {
    btn7d.classList.add('active');
    btn5d.classList.remove('active');
  } else {
    btn5d.classList.add('active');
    btn7d.classList.remove('active');
  }
}

function getHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveHistory(list) {
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(list));
}

function addHistory(dishName) {
  const list = getHistory();
  const now = new Date();
  const entry = {
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    dish: dishName,
    slot: currentSlot,
    timestamp: now.getTime(),
    dateStr: now.toISOString().split('T')[0]
  };
  list.unshift(entry);
  saveHistory(list);
  renderHistory();
  generateSuggestions();
}

function deleteHistory(id) {
  let list = getHistory();
  list = list.filter(item => item.id !== id);
  saveHistory(list);
  renderHistory();
  generateSuggestions();
}

function isInCooldown(dishName, days) {
  const history = getHistory();
  if (history.length === 0) return false;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nowTime = now.getTime();

  for (const entry of history) {
    if (entry.dish.toLowerCase() === dishName.toLowerCase()) {
      if (entry.dateStr === todayStr) {
        return true;
      }
      const diffDays = (nowTime - entry.timestamp) / (1000 * 60 * 60 * 24);
      if (diffDays < days) {
        return true;
      }
    }
  }
  return false;
}

function isSlotMatch(dish, slot) {
  return dish.pref === 'any' || dish.pref === slot;
}

function generateSuggestions() {
  if (!allDishes || allDishes.length === 0) return;

  let effectiveDays = cooldownDays;
  let candidates = [];

  while (effectiveDays >= 0) {
    candidates = allDishes.filter(dish => {
      return isSlotMatch(dish, currentSlot) && !isInCooldown(dish.name, effectiveDays);
    });

    if (candidates.length >= 3 || effectiveDays === 0) {
      break;
    }
    effectiveDays--;
  }

  suggestions = pickWeighted(candidates, 3);
  renderSuggestions();
}

function pickWeighted(pool, count) {
  if (pool.length <= count) return [...pool];

  const result = [];
  const available = [...pool];

  for (let i = 0; i < count; i++) {
    const totalWeight = available.reduce((acc, d) => acc + (d.votes || 1), 0);
    let r = Math.random() * totalWeight;
    let chosenIdx = 0;

    for (let j = 0; j < available.length; j++) {
      r -= (available[j].votes || 1);
      if (r <= 0) {
        chosenIdx = j;
        break;
      }
    }

    result.push(available[chosenIdx]);
    available.splice(chosenIdx, 1);
  }

  return result;
}

function renderSuggestions() {
  suggestionsBody.innerHTML = '';

  if (suggestions.length === 0) {
    suggestionsBody.innerHTML = `<tr><td colspan="3" class="empty-cell">No eligible dishes found</td></tr>`;
    return;
  }

  suggestions.forEach(dish => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="dish-name">${escapeHtml(dish.name)}</td>
      <td class="text-center vote-count">${dish.votes}/4</td>
      <td class="text-right">
        <button type="button" class="btn-cook" data-name="${escapeHtml(dish.name)}">Cook</button>
      </td>
    `;
    const btn = tr.querySelector('.btn-cook');
    btn.addEventListener('click', () => addHistory(dish.name));
    suggestionsBody.appendChild(tr);
  });
}

function renderHistory() {
  const list = getHistory();
  historyBody.innerHTML = '';

  if (list.length === 0) {
    historyBody.innerHTML = `<tr><td colspan="4" class="empty-cell">No meals logged yet</td></tr>`;
    return;
  }

  list.forEach(item => {
    const tr = document.createElement('tr');
    const slotLabel = item.slot === 'day' ? 'Lunch' : 'Dinner';
    const dateLabel = formatDate(item.timestamp);

    tr.innerHTML = `
      <td>${dateLabel}</td>
      <td>${slotLabel}</td>
      <td class="dish-name">${escapeHtml(item.dish)}</td>
      <td class="text-right">
        <button type="button" class="btn-delete" data-id="${item.id}">Delete</button>
      </td>
    `;

    const delBtn = tr.querySelector('.btn-delete');
    delBtn.addEventListener('click', () => deleteHistory(item.id));
    historyBody.appendChild(tr);
  });
}

function formatDate(timestamp) {
  const d = new Date(timestamp);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function bindEvents() {
  btnLunch.addEventListener('click', () => {
    currentSlot = 'day';
    updateSlotUI();
    generateSuggestions();
  });

  btnDinner.addEventListener('click', () => {
    currentSlot = 'night';
    updateSlotUI();
    generateSuggestions();
  });

  btn7d.addEventListener('click', () => setCooldown(7));
  btn5d.addEventListener('click', () => setCooldown(5));
  rerollBtn.addEventListener('click', generateSuggestions);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', init);

