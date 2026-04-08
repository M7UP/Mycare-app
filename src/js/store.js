import { closeSheet, openSheet } from './app.js';

const STORE_ITEMS = [
  { id: 'groceries',    emoji: '🛒', name: 'Food & Groceries',  sub: 'Unlocks up to $25 spend',          cost: 10 },
  { id: 'restaurants', emoji: '🍽️', name: 'Restaurants',        sub: 'Unlocks up to $20 spend',          cost: 10 },
  { id: 'care',        emoji: '💆', name: 'Healty/productive',      sub: 'Unlocks up to $30 spend',          cost: 20 },
  { id: 'clothing',    emoji: '👕', name: 'Clothing',           sub: 'Unlocks personal clothing refund', cost: 20 },
  { id: 'entertain',   emoji: '🎬', name: 'Entertainment',      sub: 'Unlocks leisure spending',         cost: 50 },
  { id: 'transport',   emoji: '🚌', name: 'Transport',          sub: 'Unlocks transport spending',       cost: 50 },
];

function getPoints() { return parseInt(localStorage.getItem('mycare_points') || '0'); }
function deductPoints(n) {
  const current = getPoints();
  localStorage.setItem('mycare_points', Math.max(0, current - n));
}

function loadHistory() { return JSON.parse(localStorage.getItem('mycare_store_history') || '[]'); }
function saveHistory(h) { localStorage.setItem('mycare_store_history', JSON.stringify(h)); }

function itemHTML(item, pts) {
  const canAfford = pts >= item.cost;
  return `
  <div class="store-item">
    <div class="store-item-left">
      <div class="store-emoji">${item.emoji}</div>
      <div>
        <p class="store-name">${item.name}</p>
        <p class="store-sub">${item.sub}</p>
      </div>
    </div>
    <button class="spend-btn ${canAfford ? '' : 'cant-afford'}"
      onclick="${canAfford ? `window._spendOnItem('${item.id}')` : 'void(0)'}">
      ${item.cost} pts
    </button>
  </div>`;
}

function historyRowHTML(h) {
  return `
  <div class="list-row">
    <div>
      <p class="list-name">${h.emoji} ${h.name}</p>
      <p class="list-meta">${h.date}</p>
    </div>
    <span style="font-size:13px;font-weight:500;color:var(--accent);">-${h.cost} pts</span>
  </div>`;
}

export function renderStore() {
  const pts = getPoints();
  const history = loadHistory();

  document.getElementById('page-store').innerHTML = `
    <div class="page-header">
      <p class="page-subtitle">Spend your points</p>
      <p class="page-title">Life Store</p>
    </div>

    <div class="scroll-area">

      <div class="points-hero">
        <div>
          <p style="font-size:12px;color:var(--text-2);margin-bottom:4px;">Available points</p>
          <p class="points-big">${pts}</p>
        </div>
        <div class="points-ring">
          <div style="width:10px;height:10px;border-radius:50%;background:var(--accent);"></div>
        </div>
      </div>
      <p class="points-hint">Each purchase is single-use · points are deducted on spend</p>

      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        ${STORE_ITEMS.map(item => itemHTML(item, pts)).join('')}
      </div>

      ${history.length ? `
        <div>
          <div class="section-label"><p>Purchase history</p></div>
          <div class="list-card">
            ${history.map(historyRowHTML).join('')}
          </div>
        </div>` : ''}

    </div>`;
}

window._spendOnItem = (id) => {
  const item = STORE_ITEMS.find(i => i.id === id);
  if (!item) return;
  const pts = getPoints();
  if (pts < item.cost) return;

  openSheet(`
    <div class="sheet-handle"></div>
    <p class="sheet-tag">CONFIRM PURCHASE</p>
    <p class="sheet-title">${item.emoji} ${item.name}</p>
    <p style="font-size:13px;color:var(--text-2);margin-bottom:16px;">${item.sub}</p>
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:var(--text-2);">Current balance</span>
        <span style="font-size:13px;color:var(--text-1);">${pts} pts</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:var(--text-2);">Cost</span>
        <span style="font-size:13px;color:var(--red);">-${item.cost} pts</span>
      </div>
      <div style="height:1px;background:var(--border);margin-bottom:8px;"></div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:13px;font-weight:500;color:var(--text-1);">Remaining</span>
        <span style="font-size:13px;font-weight:500;color:var(--accent);">${pts - item.cost} pts</span>
      </div>
    </div>
    <button class="btn btn-primary btn-full" onclick="window._confirmSpend('${id}')">Confirm purchase</button>
  `);
};

window._confirmSpend = (id) => {
  const item = STORE_ITEMS.find(i => i.id === id);
  if (!item) return;
  deductPoints(item.cost);
  const history = loadHistory();
  history.unshift({
    id: Date.now().toString(),
    name: item.name,
    emoji: item.emoji,
    cost: item.cost,
    date: new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
  });
  saveHistory(history);
  closeSheet();
  renderStore();

  // Also refresh deadlines pts display if visible
  const ptsEl = document.getElementById('pts-display');
  if (ptsEl) ptsEl.textContent = `${getPoints()} pts`;
};