import { openSheet, closeSheet } from './app.js';

const KEY_CAPITAL    = 'mycare_capital';
const KEY_NEXT_BILL  = 'mycare_next_bill';
const KEY_ACTIVITY   = 'mycare_activity';
const KEY_EARNINGS   = 'mycare_earnings';
const KEY_PLACEMENTS = 'mycare_placements';
const KEY_CUR_WEEK   = 'mycare_current_week';

/* ── loaders ── */
function loadCapital()    { return parseFloat(localStorage.getItem(KEY_CAPITAL) || '0'); }
function loadNextBill()   { return JSON.parse(localStorage.getItem(KEY_NEXT_BILL) || 'null'); }
function loadActivity()   { return JSON.parse(localStorage.getItem(KEY_ACTIVITY) || '[]'); }
function loadEarnings()   { return JSON.parse(localStorage.getItem(KEY_EARNINGS) || '[0,0,0,0]'); }
function loadPlacements() { return JSON.parse(localStorage.getItem(KEY_PLACEMENTS) || '[]'); }

/* ── savers ── */
function saveCapital(v)    { localStorage.setItem(KEY_CAPITAL, v); }
function saveNextBill(v)   { localStorage.setItem(KEY_NEXT_BILL, JSON.stringify(v)); }
function saveActivity(v)   { localStorage.setItem(KEY_ACTIVITY, JSON.stringify(v)); }
function saveEarnings(v)   { localStorage.setItem(KEY_EARNINGS, JSON.stringify(v)); }
function savePlacements(v) { localStorage.setItem(KEY_PLACEMENTS, JSON.stringify(v)); }

/* ── helpers ── */
function formatMoney(n) {
  return '$' + Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthlyEarned() {
  return loadEarnings().reduce((a, b) => a + b, 0);
}

function placementPct(placements) {
  if (!placements.length) return 0;
  const totalCapital = loadCapital();
  if (totalCapital <= 0) return 0;
  const totalPlaced = placements.reduce((s, p) => s + p.amount, 0);
  return Math.round((totalPlaced / totalCapital) * 100);
}

function placementRating(pct) {
  if (pct > 100) return { label: 'Debt Risk', color: '#ef4444', bg: '#1a0d0d', border: '#ef4444' };
  if (pct >= 80) return { label: 'Great',    color: '#22c55e', bg: '#0a1f0f', border: '#1a4d25' };
  if (pct >= 60) return { label: 'Good',     color: '#2e7fc1', bg: '#061020', border: '#16426c' };
  if (pct >= 40) return { label: 'Fair',     color: '#f59e0b', bg: '#140f00', border: '#4a3000' };
  return              { label: 'Poor',     color: '#ef4444', bg: '#1a0d0d', border: '#5a1a1a' };
}

/* ── week progression logic ── */
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function checkAndShiftWeeks() {
  const currentWeekStart = getStartOfWeek(new Date());
  let savedWeekStart = parseInt(localStorage.getItem(KEY_CUR_WEEK));

  if (isNaN(savedWeekStart)) {
    localStorage.setItem(KEY_CUR_WEEK, currentWeekStart);
    return;
  }

  if (currentWeekStart > savedWeekStart) {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksPassed = Math.round((currentWeekStart - savedWeekStart) / msPerWeek);

    if (weeksPassed > 0) {
      let earnings = loadEarnings();
      if (weeksPassed === 1) {
        earnings = [earnings[1], earnings[2], earnings[3], 0];
      } else if (weeksPassed === 2) {
        earnings = [earnings[2], earnings[3], 0, 0];
      } else if (weeksPassed === 3) {
        earnings = [earnings[3], 0, 0, 0];
      } else {
        earnings = [0, 0, 0, 0];
      }
      saveEarnings(earnings);
      localStorage.setItem(KEY_CUR_WEEK, currentWeekStart);
    }
  }
}

/* ── bar HTML for earnings chart ── */
function barHTML(amount, max, label, isCurrent) {
  const pct    = max > 0 ? Math.round((amount / max) * 100) : 0;
  const height = Math.max(pct, 4);
  const opacity = isCurrent ? '1' : '0.55';
  const color   = isCurrent ? '#2e7fc1' : '#16426c';
  return `
  <div class="bar-col ${isCurrent ? 'current' : ''}">
    <span class="bar-amount">${formatMoney(amount)}</span>
    <div class="bar-wrap">
      <div class="bar" style="height:${height}%;background:${color};opacity:${opacity};"></div>
    </div>
    <span class="bar-label">${label}</span>
  </div>`;
}

/* ── activity row ── */
function activityRowHTML(r) {
  const isIncome  = r.type === 'income';
  const amtClass  = isIncome ? 'amount-pos' : 'amount-neg';
  const amtPrefix = isIncome ? '+' : '-';
  const iconSvg   = isIncome
    ? `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 10V3M3 6l3.5-3 3.5 3" stroke="#22c55e" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="11" height="11" rx="3" stroke="#ef4444" stroke-width="1.2"/><line x1="4" y1="6.5" x2="9" y2="6.5" stroke="#ef4444" stroke-width="1.3" stroke-linecap="round"/></svg>`;

  return `
  <div class="list-row">
    <div class="list-row-left">
      <div class="list-icon ${isIncome ? 'list-icon-pos' : ''}">
        ${iconSvg}
      </div>
      <div>
        <p class="list-name">${r.name}</p>
        <p class="list-meta">${r.date}</p>
      </div>
    </div>
    <span class="${amtClass}">${amtPrefix}${formatMoney(r.amount)}</span>
  </div>`;
}

/* ── placement row ── */
function placementRowHTML(p) {
  return `
  <div class="list-row" style="cursor:pointer;" onclick="window._removePlacement('${p.id}')">
    <div>
      <p class="list-name">${p.name}</p>
      ${p.note ? `<p class="list-meta">${p.note}</p>` : ''}
    </div>
    <span class="placement-amount">${formatMoney(p.amount)}</span>
  </div>`;
}

/* placement removal handler */
window._removePlacement = (id) => {
  const placement = loadPlacements().find(p => p.id === id);
  if (!placement) return;
  openSheet(`
    <div class="sheet-handle"></div>
    <p class="sheet-title">Complete placement</p>
    <p style="font-size:14px;color:var(--text-2);margin-bottom:24px;">
      Mark <strong style="color:var(--text-1);">${placement.name}</strong> (${formatMoney(placement.amount)}) as finished and remove it?
    </p>
    <button class="btn btn-primary btn-full" onclick="window._confirmRemovePlacement('${id}')">Complete</button>
    <button class="btn btn-ghost btn-full" style="margin-top:8px;" onclick="window._closeSheet()">Cancel</button>
  `);
};
window._confirmRemovePlacement = (id) => {
  const list = loadPlacements().filter(p => p.id !== id);
  savePlacements(list);
  closeSheet();
  renderBudget();
};
window._closeSheet = () => {
  closeSheet();
};

/* ════════════════════════════════════════
   MAIN RENDER
════════════════════════════════════════ */
export function renderBudget() {
  checkAndShiftWeeks(); // Auto-shifts weeks if we are on a new Monday

  const capital    = loadCapital();
  const nextBill   = loadNextBill();
  const activity   = loadActivity();
  const earnings   = loadEarnings();
  const earned     = monthlyEarned();
  const placements = loadPlacements();
  const maxEarning = Math.max(...earnings, 1);
  const pct        = placementPct(placements);
  const rating     = placementRating(pct);

  // Calculate Hourly Rate from 3 completed weeks
  const completedWeeksAvg = (earnings[0] + earnings[1] + earnings[2]) / 3;
  const hourly = completedWeeksAvg / 40;

  /* ── next bill card ── */
  let nextBillMeta = "";
  if (nextBill && nextBill.dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Parse the date safely to avoid timezone offset bugs
    const [year, month, day] = nextBill.dueDate.split('-');
    const due = new Date(year, month - 1, day);
    
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) nextBillMeta = `Overdue by ${Math.abs(diffDays)} days`;
    else if (diffDays === 0) nextBillMeta = `Due today`;
    else nextBillMeta = `Due in ${diffDays} days`;
  }

  const nextBillHTML = nextBill
    ? `
    <div class="next-bill-card" onclick="window._editNextBill()">
      <div class="next-bill-left">
        <div class="next-bill-icon">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <rect x="1.5" y="2.5" width="12" height="10" rx="2.5" stroke="#2e7fc1" stroke-width="1.3"/>
            <line x1="1.5" y1="6" x2="13.5" y2="6" stroke="#2e7fc1" stroke-width="1.3"/>
          </svg>
        </div>
        <div>
          <p class="list-name">${nextBill.name}</p>
          <p class="list-meta">${nextBillMeta}</p>
        </div>
      </div>
      <span class="amount-neg">-${formatMoney(nextBill.amount)}</span>
    </div>`
    : `
    <div class="next-bill-card next-bill-empty" onclick="window._editNextBill()">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><line x1="6.5" y1="1" x2="6.5" y2="12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="1" y1="6.5" x2="12" y2="6.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      Set next bill
    </div>`;

  document.getElementById('page-budget').innerHTML = `
    <div class="page-header">
      <p class="page-subtitle">${new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <p class="page-title">Budget</p>
        <div class="edit-btn" onclick="window._editCapital()">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="#4a6070" stroke-width="1.3" stroke-linejoin="round"/></svg>
        </div>
      </div>
    </div>

    <div class="scroll-area">

      <div class="capital-card">
        <p style="font-size:12px;color:var(--text-2);margin-bottom:6px;">Current capital</p>
        <p class="capital-amount">
          ${formatMoney(capital).split('.')[0]}<span>.${formatMoney(capital).split('.')[1]}</span>
        </p>
        <div class="capital-sub">
          <div class="capital-dot"></div>
          +${formatMoney(earned)} earned this month
        </div>
      </div>

      ${nextBillHTML}

      <div class="chart-card">
        <div class="chart-header">
          <p style="font-size:13px;color:var(--text-2);">Earnings</p>
          <p style="font-size:13px;color:var(--text-3);">Last 4 weeks</p>
        </div>

        <div class="hourly-rate-row">
          <span class="hourly-rate-value">${hourly > 0 ? `$${hourly.toLocaleString('en-CA', {minimumFractionDigits:2,maximumFractionDigits:2})}` : '$0.00'}<span class="hourly-unit">/hour</span></span>
          <button class="hourly-info-btn" onclick="window._showHourlyInfo()" title="More info">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="#4a6070" stroke-width="1.2"/><line x1="6.5" y1="5.5" x2="6.5" y2="9" stroke="#4a6070" stroke-width="1.2" stroke-linecap="round"/><circle cx="6.5" cy="4" r="0.7" fill="#4a6070"/></svg>
          </button>
        </div>

        <div class="chart-bars">
          ${earnings.map((amt, i) => {
            const labels = ['W-3','W-2','W-1','W0'];
            return barHTML(amt, maxEarning, labels[i], i === earnings.length - 1);
          }).join('')}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:10px;">
          <div style="font-size:12px;color:var(--text-3);cursor:pointer;" onclick="window._editEarnings()">Edit weeks</div>
        </div>
      </div>

      <div>
        <div class="section-label">
          <p>Activity</p>
          <div class="add-link" onclick="window._addActivity()">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><line x1="5.5" y1="1" x2="5.5" y2="10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="1" y1="5.5" x2="10" y2="5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            Add
          </div>
        </div>
        <div class="list-card">
          ${activity.length
            ? (() => {
                const visible = activity.slice(0, 3);
                const hidden  = activity.slice(3);
                return `
                  ${visible.map(activityRowHTML).join('')}
                  ${hidden.length ? `
                    <div id="activity-extra" style="display:none;">
                      ${hidden.map(activityRowHTML).join('')}
                    </div>
                    <div class="list-row" style="justify-content:center;">
                      <div id="activity-toggle" style="font-size:12px;color:var(--text-3);cursor:pointer;padding:4px 0;" onclick="window._toggleActivity()">
                        Show ${hidden.length} more
                      </div>
                    </div>` : ''}`;
              })()
            : '<div class="list-row"><p style="color:var(--text-3);font-size:13px;">No activity yet</p></div>'}
        </div>
      </div>

      <div>
        <div class="section-label">
          <p>Placements</p>
          <div class="add-link" onclick="window._addPlacement()">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><line x1="5.5" y1="1" x2="5.5" y2="10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="1" y1="5.5" x2="10" y2="5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            Add
          </div>
        </div>
        <div class="placements-card">
          <div class="placements-hero">
            <span class="placements-pct">${pct}% placed</span>
            <span class="placement-badge" style="color:${rating.color};background:${rating.bg};border:1px solid ${rating.border};">${rating.label}</span>
          </div>
          <div class="list-card" style="margin-bottom:0;">
            ${placements.length
              ? placements.map(placementRowHTML).join('')
              : '<div class="list-row"><p style="color:var(--text-3);font-size:13px;">No placements yet</p></div>'}
          </div>
        </div>
      </div>

    </div>`;
}

/* ════════════════════════════════════════
   SHEET HANDLERS
════════════════════════════════════════ */

window._toggleActivity = () => {
  const extra  = document.getElementById('activity-extra');
  const toggle = document.getElementById('activity-toggle');
  const hidden = extra.style.display === 'none';
  extra.style.display  = hidden ? 'block' : 'none';
  toggle.textContent   = hidden ? 'Show less' : `Show ${extra.children.length} more`;
};

/* edit capital */
window._editCapital = () => {
  openSheet(`
    <div class="sheet-handle"></div>
    <p class="sheet-title">Set current capital</p>
    <div class="field"><label>Amount ($)</label><input type="number" id="s-capital" placeholder="0.00" value="${loadCapital()}"/></div>
    <button class="btn btn-primary btn-full" onclick="window._saveCapital()">Save</button>
  `);
};
window._saveCapital = () => {
  const v = parseFloat(document.getElementById('s-capital').value);
  if (isNaN(v)) return alert('Enter a valid amount.');
  saveCapital(v);
  closeSheet();
  renderBudget();
};

/* show hourly info */
window._showHourlyInfo = () => {
  alert("Ce taux horaire est une approximation. Il est calculé en prenant la moyenne de vos revenus des 3 dernières semaines terminées (W-3, W-2, W-1), puis divisée par 40 heures (situation de temps plein).");
};

/* edit weekly earnings */
window._editEarnings = () => {
  const e = loadEarnings();
  const labels = ['W-3','W-2','W-1','W0 (current)'];
  openSheet(`
    <div class="sheet-handle"></div>
    <p class="sheet-title">Edit weekly earnings</p>
    ${e.map((v, i) => `<div class="field"><label>${labels[i]}</label><input type="number" id="s-w${i}" value="${v}" placeholder="0"/></div>`).join('')}
    <button class="btn btn-primary btn-full" onclick="window._saveEarnings()">Save</button>
  `);
};
window._saveEarnings = () => {
  const e = [0,1,2,3].map(i => parseFloat(document.getElementById(`s-w${i}`).value) || 0);
  saveEarnings(e);
  closeSheet();
  renderBudget();
};

/* next bill */
/* next bill */
window._editNextBill = () => {
  const b = loadNextBill();
  openSheet(`
    <div class="sheet-handle"></div>
    <p class="sheet-title">Next bill</p>
    <div class="field"><label>Name</label><input type="text" id="s-bname" placeholder="Rent, Insurance..." value="${b ? b.name : ''}"/></div>
    <div class="field"><label>Amount ($)</label><input type="number" id="s-bamt" placeholder="0.00" value="${b ? b.amount : ''}"/></div>
    <div class="field"><label>Due Date</label><input type="date" id="s-bdate" value="${b ? b.dueDate : ''}"/></div>
    <button class="btn btn-primary btn-full" onclick="window._saveNextBill()">Save</button>
    ${b ? `<button class="btn btn-ghost btn-full" style="margin-top:8px;" onclick="window._clearNextBill()">Remove</button>` : ''}
  `);
};

window._saveNextBill = () => {
  const name    = document.getElementById('s-bname').value.trim();
  const amount  = parseFloat(document.getElementById('s-bamt').value);
  const dueDate = document.getElementById('s-bdate').value;
  
  if (!name || isNaN(amount) || !dueDate) return alert('Please fill all fields.');
  
  saveNextBill({ name, amount, dueDate });
  closeSheet();
  renderBudget();
};

/* activity (income + expense) */
window._addActivity = () => {
  openSheet(`
    <div class="sheet-handle"></div>
    <p class="sheet-title">Add activity</p>
    <div class="field"><label>Type</label>
      <select id="s-atype">
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
    </div>
    <div class="field"><label>Name</label><input type="text" id="s-aname" placeholder="Groceries, Jugg..."/></div>
    <div class="field"><label>Amount ($)</label><input type="number" id="s-aamt" placeholder="0.00"/></div>
    <button class="btn btn-primary btn-full" onclick="window._saveActivity()">Add</button>
  `);
};
window._saveActivity = () => {
  const name   = document.getElementById('s-aname').value.trim();
  const amount = parseFloat(document.getElementById('s-aamt').value);
  const type   = document.getElementById('s-atype').value;
  
  if (!name || isNaN(amount)) return alert('Please fill all fields.');
  
  // Auto-generate date based on system
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  
  const list = loadActivity();
  list.unshift({ id: Date.now().toString(), name, amount, date, type });
  saveActivity(list);

  // Update capital: income adds, expense subtracts
  const capital = loadCapital();
  saveCapital(type === 'income' ? capital + amount : capital - amount);

  // Also add to W0 (current week) earnings bar if it's income
  if (type === 'income') {
    const earnings = loadEarnings();
    earnings[3] += amount;
    saveEarnings(earnings);
  }

  closeSheet();
  renderBudget();
};

/* placements */
window._addPlacement = () => {
  openSheet(`
    <div class="sheet-handle"></div>
    <p class="sheet-title">Add placement</p>
    <div class="field"><label>Name</label><input type="text" id="s-pname" placeholder="Apple, Loan Vito..."/></div>
    <div class="field"><label>Amount ($)</label><input type="number" id="s-pamt" placeholder="0.00"/></div>
    <div class="field"><label>Note (optional)</label><input type="text" id="s-pnote" placeholder="Pour son order de meta..."/></div>
    <button class="btn btn-primary btn-full" onclick="window._savePlacement()">Add</button>
  `);
};
window._savePlacement = () => {
  const name   = document.getElementById('s-pname').value.trim();
  const amount = parseFloat(document.getElementById('s-pamt').value);
  const note   = document.getElementById('s-pnote').value.trim();
  if (!name || isNaN(amount)) return alert('Please fill required fields.');
  const list = loadPlacements();
  list.push({ id: Date.now().toString(), name, amount, note });
  savePlacements(list);
  closeSheet();
  renderBudget();
};

/* ════════════════════════════════════════
   DEBUG / SIMULATION
════════════════════════════════════════ */
window._simulateNextWeek = () => {
  let saved = parseInt(localStorage.getItem(KEY_CUR_WEEK));
  if (!isNaN(saved)) {
    // Falsify the "saved" week by setting it exactly 1 week in the past
    localStorage.setItem(KEY_CUR_WEEK, saved - (7 * 24 * 60 * 60 * 1000));
    renderBudget();
    console.log("Simulated 1 week passing!");
  } else {
    console.log("No week saved yet. Add an activity first or reload.");
  }
};