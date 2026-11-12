import { icon } from './icons.js';
import { escapeHtml, avatarContent } from '../utils.js';

let menuOpen = false;
let currentUser = null;
let onMenuAction = null;
let documentListenersBound = false;
let clockTimer = null;

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  document.querySelectorAll('[data-live-clock]').forEach((node) => {
    node.textContent = time;
    node.setAttribute('datetime', now.toISOString());
    node.title = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  });
}

function startClock() {
  updateClock();
  if (clockTimer) return;
  clockTimer = setInterval(updateClock, 1000);
}

function renderUserMenu(container, user, roleName) {
  const dropdown = container.querySelector('.user-dropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('hidden', !menuOpen);
  if (menuOpen) {
    dropdown.innerHTML = `
      <div class="user-dropdown-head">
        <strong>${escapeHtml(user?.name || 'Profile')}</strong>
        <span>${escapeHtml(user?.email || '')}</span>
      </div>
      <button type="button" class="dropdown-item" data-menu-action="/profile">
        ${icon('user', 15)} My Profile
      </button>
      <button type="button" class="dropdown-item" data-menu-action="/settings">
        ${icon('settings', 15)} Settings
      </button>
      <button type="button" class="dropdown-item danger" data-menu-action="/logout">
        ${icon('logout', 15)} Log out
      </button>
    `;
  }
}

export function renderTopbar(container, { user, roleName, pageMeta = {}, theme = 'light', onToggleSidebar, onMenuAction: menuAction, onToggleTheme }) {
  if (!container) return;
  currentUser = user;
  onMenuAction = menuAction;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  container.innerHTML = `
    <div class="topbar-left">
      <button type="button" class="icon-btn mobile-only" id="hamburger" aria-label="Open navigation menu" aria-expanded="false">
        ${icon('menu', 20)}
      </button>
      <div class="topbar-title">
        <h2 data-topbar-title>${escapeHtml(pageMeta.title || 'Dashboard')}</h2>
        <p data-topbar-subtitle>${escapeHtml(pageMeta.subtitle || today)}</p>
      </div>
    </div>
    <div class="topbar-actions">
      <span class="topbar-clock" aria-label="Current time">
        ${icon('clock', 15)}
        <time data-live-clock></time>
      </span>
      <button type="button" class="icon-btn" id="theme-toggle" aria-label="Toggle dark mode" title="Toggle theme">
        ${icon(theme === 'dark' ? 'sun' : 'moon', 18)}
      </button>
      <div class="topbar-menu">
        <button type="button" class="topbar-user" id="user-menu-btn" aria-haspopup="true" aria-expanded="false">
          <span class="avatar">${avatarContent(user)}</span>
          <span class="topbar-user-meta">
            <strong>${escapeHtml(user?.name || '')}</strong>
            <span>${escapeHtml(roleName || '')}</span>
          </span>
          ${icon('chevronDown', 14)}
        </button>
        <div class="user-dropdown hidden" role="menu"></div>
      </div>
    </div>
  `;

  startClock();

  container.querySelector('#hamburger')?.addEventListener('click', (event) => {
    onToggleSidebar?.();
    const open = document.getElementById('app')?.classList.contains('sidebar-open');
    event.currentTarget.setAttribute('aria-expanded', String(Boolean(open)));
    event.currentTarget.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  });

  container.querySelector('#theme-toggle')?.addEventListener('click', () => {
    onToggleTheme?.();
  });

  const menuBtn = container.querySelector('#user-menu-btn');
  menuBtn?.addEventListener('click', () => {
    menuOpen = !menuOpen;
    menuBtn.setAttribute('aria-expanded', String(menuOpen));
    renderUserMenu(container, user, roleName);
  });

  // Delegated so menu items rendered later still work.
  container.addEventListener('click', (event) => {
    const item = event.target.closest('[data-menu-action]');
    if (!item) return;
    const action = item.dataset.menuAction;
    menuOpen = false;
    menuBtn?.setAttribute('aria-expanded', 'false');
    renderUserMenu(container, user, roleName);
    menuAction?.(action);
  });

  if (!documentListenersBound) {
    documentListenersBound = true;
    document.addEventListener('click', (event) => {
      if (!menuOpen) return;
      const bar = document.getElementById('topbar');
      if (!bar || !bar.querySelector('.topbar-menu')?.contains(event.target)) {
        menuOpen = false;
        document.getElementById('user-menu-btn')?.setAttribute('aria-expanded', 'false');
        const dropdown = bar?.querySelector('.user-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !menuOpen) return;
      menuOpen = false;
      document.getElementById('user-menu-btn')?.setAttribute('aria-expanded', 'false');
      document.querySelector('.user-dropdown')?.classList.add('hidden');
    });
  }
}

export function setTopbarTitle(title, subtitle) {
  const node = document.querySelector('[data-topbar-title]');
  const sub = document.querySelector('[data-topbar-subtitle]');
  if (node) node.textContent = title;
  if (sub) sub.textContent = subtitle || new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function setUser(user) {
  currentUser = user;
  const container = document.getElementById('topbar');
  if (container && user) {
    const avatar = container.querySelector('.topbar-user .avatar');
    const name = container.querySelector('.topbar-user-meta strong');
    if (avatar) avatar.innerHTML = avatarContent(user);
    if (name) name.textContent = user.name;
  }
}
