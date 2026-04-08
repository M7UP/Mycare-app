import { openSheet, closeSheet } from './app.js';

const STORAGE_KEY = 'mycare_deadlines';
const NOTES_KEY = 'mycare_deadline_notes';

function load() { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function loadNotes() { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); }
function saveNotes(n) { localStorage.setItem(NOTES_KEY, JSON.stringify(n)); }

function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function daysLeft(iso) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(iso + 'T12:00:00'); due.setHours(0,0,0,0);
  const diff = Math.round((due - today) / 86400000);
  if (diff < 0) return 'OVERDUE';
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff} days`;
}

function isOverdue(iso) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(iso + 'T12:00:00'); due.setHours(0,0,0,0);
  return due < today;
}

function pushDateByOneDay(iso) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

const LEVELS = {
  3: { label: 'LEVEL 3 · 10 PTS', cls: 'lvl3', pts: 10 },
  2: { label: 'LEVEL 2 · 5 PTS',  cls: 'lvl2', pts: 5  },
  1: { label: 'LEVEL 1 · 2 PTS',  cls: 'lvl1', pts: 2  }
};

function getPoints() { return parseInt(localStorage.getItem('mycare_points') || '0'); }
function addPoints(n) {
  localStorage.setItem('mycare_points', getPoints() + n);
  window.dispatchEvent(new CustomEvent('mycare_points_changed'));
}
function deductPoints(n) {
  localStorage.setItem('mycare_points', Math.max(0, getPoints() - n));
  window.dispatchEvent(new CustomEvent('mycare_points_changed'));
}

function cardHTML(d) {
  const lv = LEVELS[d.level];
  const overdue = isOverdue(d.date);
  const dl = daysLeft(d.date);
  const notes = loadNotes();
  const hasNote = notes[d.id] && notes[d.id].trim().length > 0;

  return `
  <div class="swipe-wrapper" id="sw-${d.id}">
    <div class="swipe-actions">
      <div class="swipe-action-btn push-btn" onclick="window._confirmPush('${d.id}')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/></svg>
        <span>+1 day</span>
        <span style="font-size:10px;opacity:0.7;">2 pts</span>
      </div>
      <div class="swipe-action-btn delete-btn" onclick="window._confirmDelete('${d.id}')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5l.5-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>Delete</span>
        <span style="font-size:10px;opacity:0.7;">5 pts</span>
      </div>
    </div>
    <div class="deadline-card ${lv.cls} swipe-card" data-id="${d.id}">
      <div class="deadline-header">
        <div class="deadline-level">
          <div class="level-dot"></div>
          <span class="level-label">${lv.label}</span>
        </div>
        <div class="date-badge"><span>${formatDate(d.date)}</span></div>
      </div>
      <div class="deadline-body">
        <p class="deadline-title">${d.title}</p>
        ${d.desc ? `<p class="deadline-desc" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.desc}</p>` : ''}
        <div class="deadline-footer">
          <span class="days-left" style="${overdue ? 'color:var(--red);font-weight:500;' : ''}">${dl}</span>
          <div class="card-actions">
            <button class="btn btn-ghost" onclick="window._viewDeadline('${d.id}')">
              ${hasNote ? 'Notes ●' : 'View'}
            </button>
            <button class="btn btn-primary" onclick="window._completeDeadline('${d.id}')">Complete</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

let currentFilter = 'all';

export function renderDeadlines(filter) {
  if (filter !== undefined) currentFilter = filter;
  const deadlines = load();
  const pts = getPoints();
  const filtered = currentFilter === 'all'
    ? [...deadlines]
    : deadlines.filter(d => d.level === parseInt(currentFilter));

  filtered.sort((a, b) => {
    const aOver = isOverdue(a.date) ? -1 : 0;
    const bOver = isOverdue(b.date) ? -1 : 0;
    if (aOver !== bOver) return aOver - bOver;
    return new Date(a.date) - new Date(b.date);
  });

  document.getElementById('page-deadlines').innerHTML = `
    <div class="page-header">
      <p class="page-subtitle">${new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <p class="page-title">Deadlines</p>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:7px 14px;display:flex;align-items:center;gap:6px;">
            <div style="width:7px;height:7px;border-radius:50%;background:var(--accent);"></div>
            <span style="font-size:13px;font-weight:500;color:var(--accent);" id="pts-display">${pts} pts</span>
          </div>
          <div style="width:34px;height:34px;border-radius:50%;background:var(--bg-card);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="window._addDeadline()">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="7" y1="2" x2="7" y2="12" stroke="#4a6070" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="7" x2="12" y2="7" stroke="#4a6070" stroke-width="1.5" stroke-linecap="round"/></svg>
          </div>
        </div>
      </div>
      <div class="chips" style="margin-top:12px;">
        <div class="chip ${currentFilter==='all'?'active':''}" onclick="window._filterDeadlines('all')">All</div>
        <div class="chip ${currentFilter==='3'?'active':''}" onclick="window._filterDeadlines('3')">Level 3</div>
        <div class="chip ${currentFilter==='2'?'active':''}" onclick="window._filterDeadlines('2')">Level 2</div>
        <div class="chip ${currentFilter==='1'?'active':''}" onclick="window._filterDeadlines('1')">Level 1</div>
      </div>
    </div>
    <div class="scroll-area" id="deadlines-scroll">
      ${filtered.length
        ? filtered.map(cardHTML).join('')
        : '<p style="color:var(--text-3);font-size:14px;text-align:center;margin-top:32px;">No deadlines yet</p>'}
      <div class="add-row" onclick="window._addDeadline()">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><line x1="6.5" y1="1" x2="6.5" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="6.5" x2="12" y2="6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Add deadline
      </div>
    </div>`;

  initSwipe();
}

// ── Swipe logic ─────────────────────────────────────────────────────────────
function initSwipe() {
  document.querySelectorAll('.swipe-card').forEach(card => {
    let startX = 0, currentX = 0, swiping = false;
    const wrapper = card.closest('.swipe-wrapper');
    const actions = wrapper.querySelector('.swipe-actions');
    const actionsW = 140;

    function onStart(x) { startX = x - currentX;; swiping = true; card.style.transition = 'none'; }
    function onMove(x) {
      if (!swiping) return;
      // Calculate the new position based on the adjusted startX
      currentX = Math.min(0, Math.max(-actionsW, x - startX));
      card.style.transform = `translateX(${currentX}px)`;
      
      // Optional: Make the buttons fade in/out while sliding
      const ratio = Math.abs(currentX) / actionsW;
      actions.style.opacity = ratio;
    }
    function onEnd() {
      if (!swiping) return;
      swiping = false;
      card.style.transition = 'transform 0.25s ease';
      if (currentX < -actionsW / 2) {
        currentX = -actionsW; // 2. Force state to exact open width
        card.style.transform = `translateX(${currentX}px)`;
        actions.style.opacity = '1';
      } else {
        currentX = 0; // 3. Force state back to 0
        card.style.transform = 'translateX(0)';
        actions.style.opacity = '0';
      }
    }

    card.addEventListener('touchstart', e => onStart(e.touches[0].clientX), { passive: true });
    card.addEventListener('touchmove',  e => onMove(e.touches[0].clientX),  { passive: true });
    card.addEventListener('touchend',   onEnd);
    card.addEventListener('mousedown',  e => onStart(e.clientX));
    card.addEventListener('mousemove',  e => { if (swiping) onMove(e.clientX); });
    card.addEventListener('mouseup',    onEnd);
    card.addEventListener('mouseleave', onEnd);
  });
}

function resetSwipe(id) {
  const card = document.querySelector(`#sw-${id} .swipe-card`);
  if (!card) return;
  card.style.transition = 'transform 0.25s ease';
  card.style.transform = 'translateX(0)';
}

// ── Swipe confirmations ──────────────────────────────────────────────────────
window._confirmPush = (id) => {
  resetSwipe(id);
  const d = load().find(x => x.id === id);
  if (!d) return;
  const pts = getPoints();
  const canAfford = pts >= 2;
  openSheet(`
    <div class="sheet-handle"></div>
    <p class="sheet-tag">PUSH DUE DATE</p>
    <p class="sheet-title">${d.title}</p>
    <p style="font-size:13px;color:var(--text-2);margin-bottom:16px;">
      Push the due date from <strong style="color:var(--text-1);">${formatDate(d.date)}</strong>
      to <strong style="color:var(--text-1);">${formatDate(pushDateByOneDay(d.date))}</strong>?
    </p>
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:var(--text-2);">Current balance</span>
        <span style="font-size:13px;color:var(--text-1);">${pts} pts</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:var(--text-2);">Cost</span>
        <span style="font-size:13px;color:var(--red);">-2 pts</span>
      </div>
      <div style="height:1px;background:var(--border);margin-bottom:8px;"></div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:13px;font-weight:500;color:var(--text-1);">Remaining</span>
        <span style="font-size:13px;font-weight:500;color:var(--accent);">${pts - 2} pts</span>
      </div>
    </div>
    ${canAfford
      ? `<button class="btn btn-primary btn-full" id="confirm-push-btn">Confirm · push to ${formatDate(pushDateByOneDay(d.date))}</button>`
      : `<p style="text-align:center;color:var(--red);font-size:13px;">Not enough points (need 2 pts)</p>`}
  `);
  if (canAfford) {
    document.getElementById('confirm-push-btn').addEventListener('click', () => {
      const deadlines = load();
      const idx = deadlines.findIndex(x => x.id === id);
      if (idx !== -1) { deadlines[idx].date = pushDateByOneDay(deadlines[idx].date); save(deadlines); }
      deductPoints(2);
      closeSheet();
      renderDeadlines();
    });
  }
};

window._confirmDelete = (id) => {
  resetSwipe(id);
  const d = load().find(x => x.id === id);
  if (!d) return;
  const pts = getPoints();
  const canAfford = pts >= 5;
  openSheet(`
    <div class="sheet-handle"></div>
    <p class="sheet-tag" style="color:var(--red);">DELETE DEADLINE</p>
    <p class="sheet-title">${d.title}</p>
    <p style="font-size:13px;color:var(--text-2);margin-bottom:16px;">
      This will permanently delete this deadline. This cannot be undone.
    </p>
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:var(--text-2);">Current balance</span>
        <span style="font-size:13px;color:var(--text-1);">${pts} pts</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:var(--text-2);">Cost</span>
        <span style="font-size:13px;color:var(--red);">-5 pts</span>
      </div>
      <div style="height:1px;background:var(--border);margin-bottom:8px;"></div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:13px;font-weight:500;color:var(--text-1);">Remaining</span>
        <span style="font-size:13px;font-weight:500;color:var(--accent);">${pts - 5} pts</span>
      </div>
    </div>
    ${canAfford
      ? `<button class="btn btn-primary btn-full" id="confirm-delete-btn" style="background:#3d1a1a;color:var(--red);">Delete deadline</button>`
      : `<p style="text-align:center;color:var(--red);font-size:13px;">Not enough points (need 5 pts)</p>`}
  `);
  if (canAfford) {
    document.getElementById('confirm-delete-btn').addEventListener('click', () => {
      const deadlines = load().filter(x => x.id !== id);
      save(deadlines);
      const n = loadNotes(); delete n[id]; saveNotes(n);
      deductPoints(5);
      closeSheet();
      renderDeadlines();
    });
  }
};

// ── Add deadline ─────────────────────────────────────────────────────────────
window._filterDeadlines = (f) => renderDeadlines(f);

window._addDeadline = () => {
  openSheet(`
    <div class="sheet-handle"></div>
    <p class="sheet-title">New deadline</p>
    <div class="field"><label>Title</label>
      <input type="text" id="s-title" placeholder="What needs to be done?"/>
    </div>
    <div class="field"><label>Short description (optional)</label>
      <input type="text" id="s-desc" placeholder="Extra details..."/>
    </div>
    <div class="field">
      <label>Due date</label>
      <div style="position:relative;">
        <input type="text" id="s-date-text" placeholder="e.g. Apr 15 or 2026-04-15"
          style="padding-right:44px;"
          oninput="window._parseDateInput(this.value)"/>
        <input type="date" id="s-date-hidden"
          style="position:absolute;top:0;right:0;width:40px;height:100%;opacity:0;cursor:pointer;"/>
        <div style="position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="13" rx="2" stroke="#2e7fc1" stroke-width="1.4"/><line x1="2" y1="7" x2="16" y2="7" stroke="#2e7fc1" stroke-width="1.4"/><line x1="6" y1="1" x2="6" y2="5" stroke="#2e7fc1" stroke-width="1.4" stroke-linecap="round"/><line x1="12" y1="1" x2="12" y2="5" stroke="#2e7fc1" stroke-width="1.4" stroke-linecap="round"/></svg>
        </div>
      </div>
      <p id="date-preview" style="font-size:11px;color:var(--accent);margin-top:4px;min-height:16px;"></p>
    </div>
    <div class="field"><label>Effort level</label>
      <select id="s-level">
        <option value="3">Level 3 — Major effort (10 pts)</option>
        <option value="2">Level 2 — Moderate effort (5 pts)</option>
        <option value="1">Level 1 — Light effort (2 pts)</option>
      </select>
    </div>
    <button class="btn btn-primary btn-full" id="save-deadline-btn">Add deadline</button>
  `);

  // Sync calendar picker → text field
  document.getElementById('s-date-hidden').addEventListener('change', function() {
    const iso = this.value;
    if (!iso) return;
    document.getElementById('s-date-text').value = formatDate(iso);
    document.getElementById('date-preview').textContent = '✓ ' + formatDate(iso);
    document.getElementById('s-date-text').dataset.iso = iso;
  });

  document.getElementById('save-deadline-btn').addEventListener('click', window._saveDeadline);
};

window._parseDateInput = (val) => {
  const preview = document.getElementById('date-preview');
  const textEl = document.getElementById('s-date-text');
  // Try direct ISO
  let d = new Date(val + 'T12:00:00');
  if (isNaN(d.getTime())) {
    // Try "Apr 15" style
    d = new Date(val + ' 2026');
  }
  if (!isNaN(d.getTime()) && d.getFullYear() >= 2026) {
    const iso = d.toISOString().split('T')[0];
    textEl.dataset.iso = iso;
    preview.textContent = '✓ ' + formatDate(iso);
    preview.style.color = 'var(--accent)';
  } else {
    textEl.dataset.iso = '';
    preview.textContent = val.length > 2 ? 'Type a date like Apr 15 or 2026-04-15' : '';
    preview.style.color = 'var(--text-3)';
  }
};

window._saveDeadline = () => {
  const title = document.getElementById('s-title').value.trim();
  const textEl = document.getElementById('s-date-text');
  const date = textEl.dataset.iso || '';
  if (!title) { alert('Please enter a title.'); return; }
  if (!date) { alert('Please enter a valid due date.'); return; }
  const deadlines = load();
  deadlines.push({
    id: Date.now().toString(),
    title,
    desc: document.getElementById('s-desc').value.trim(),
    date,
    level: parseInt(document.getElementById('s-level').value)
  });
  save(deadlines);
  closeSheet();
  renderDeadlines();
};

// ── View ─────────────────────────────────────────────────────────────────────
window._viewDeadline = (id) => {
  const d = load().find(x => x.id === id);
  if (!d) return;
  const lv = LEVELS[d.level];
  const notes = loadNotes();
  const currentNote = notes[id] || '';

  openSheet(`
    <div class="sheet-handle"></div>
    <p class="sheet-tag">${lv.label}</p>
    <p class="sheet-title">${d.title}</p>
    ${d.desc ? `<p style="font-size:13px;color:var(--text-2);margin-bottom:10px;white-space:normal;word-break:break-word;">${d.desc}</p>` : ''}
    <p style="font-size:12px;color:var(--text-3);margin-bottom:14px;">Due: ${formatDate(d.date)} · ${daysLeft(d.date)}</p>
    <label style="font-size:12px;color:var(--text-2);display:block;margin-bottom:6px;">Progress notes</label>
    <textarea id="view-note" rows="6" placeholder="Write your progress, thoughts, or updates here...">${currentNote}</textarea>
    <button class="btn btn-primary btn-full" id="save-note-btn">Save notes</button>
  `);
  document.getElementById('save-note-btn').addEventListener('click', () => {
    const notes = loadNotes();
    notes[id] = document.getElementById('view-note').value;
    saveNotes(notes);
    closeSheet();
    renderDeadlines();
  });
};

// ── Complete ─────────────────────────────────────────────────────────────────
window._completeDeadline = (id) => {
  const d = load().find(x => x.id === id);
  if (!d) return;
  const lv = LEVELS[d.level];
  const notes = loadNotes();
  const savedNote = notes[id] || '';

  openSheet(`
    <div class="sheet-handle"></div>
    <p class="sheet-tag">COMPLETING: ${d.title}</p>
    <p style="font-size:12px;color:var(--text-2);margin-bottom:8px;">Describe what you did <span style="color:var(--red);">· min. 20 words</span></p>
    <textarea id="completion-text" rows="5" placeholder="Explain what you accomplished, how you did it, what challenges you faced...">${savedNote}</textarea>
    <p class="word-count warn" id="wc-display">0 / 20 words minimum</p>
    <button class="btn btn-primary btn-full" id="confirm-complete-btn">Confirm · earn ${lv.pts} pts</button>
  `);

  const textarea = document.getElementById('completion-text');
  const wcDisplay = document.getElementById('wc-display');
  function updateWC() {
    const count = textarea.value.trim().split(/\s+/).filter(Boolean).length;
    wcDisplay.textContent = `${count} / 20 words minimum`;
    wcDisplay.className = 'word-count ' + (count >= 20 ? 'ok' : 'warn');
  }
  updateWC();
  textarea.addEventListener('input', updateWC);

  document.getElementById('confirm-complete-btn').addEventListener('click', () => {
    const text = textarea.value.trim();
    if (text.split(/\s+/).filter(Boolean).length < 20) {
      alert('Please write at least 20 words describing what you did.');
      return;
    }
    const deadlines = load().filter(x => x.id !== id);
    save(deadlines);
    const n = loadNotes(); delete n[id]; saveNotes(n);
    addPoints(lv.pts);
    closeSheet();
    renderDeadlines();
  });
};
