import { renderDeadlines } from './deadlines.js';
import { renderBudget } from './budget.js';
import { renderStore } from './store.js';

// Navigation
const pages = { deadlines: document.getElementById('page-deadlines'), budget: document.getElementById('page-budget'), store: document.getElementById('page-store') };
const navItems = document.querySelectorAll('.nav-item');

function showPage(name) {
  Object.entries(pages).forEach(([key, el]) => el.classList.toggle('active', key === name));
  navItems.forEach(el => el.classList.toggle('active', el.dataset.page === name));
}

navItems.forEach(item => item.addEventListener('click', () => showPage(item.dataset.page)));

// Bottom sheet helpers
export function openSheet(html) {
  document.getElementById('bottom-sheet').innerHTML = html;
  document.getElementById('bottom-sheet').classList.remove('hidden');
  document.getElementById('sheet-overlay').classList.remove('hidden');
}
export function closeSheet() {
  document.getElementById('bottom-sheet').classList.add('hidden');
  document.getElementById('sheet-overlay').classList.add('hidden');
}
document.getElementById('sheet-overlay').addEventListener('click', closeSheet);

// Init
renderDeadlines();
renderBudget();
renderStore();
showPage('deadlines');