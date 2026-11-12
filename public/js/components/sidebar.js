import { icon } from './icons.js';
import { icon as getIcon } from './icons.js';
import { getNavItems, getRole } from '../config/roles.js';
import { escapeHtml, avatarContent } from '../utils.js';

let currentUnread = 0;
let currentRole = null;

function brandBlock(role) {
  return `
    <div class="sidebar-brand">
      <div class="brand-mark"><img src="/logo.svg" width="26" height="26" alt="" /></div>
      <div class="sidebar-user-name">
        <strong>Inventory<br>Management</strong>
        <span>${role ? escapeHtml(role.overviewTitle).replace(' Overview', '') : 'Workspace'}</span>
      </div>
    </div>
  `;
}

function userBlock(user, role) {
  return `
    <div class="sidebar-user">
      <div class="avatar">${avatarContent(user)}</div>
      <div class="sidebar-user-name">
        <strong>${escapeHtml(user?.name || '')}</strong>
        <span>${escapeHtml(role?.label || '')}</span>
      </div>
    </div>
  `;
}

export function renderSidebar(container, { user, roleName, activePath, onNavigate, onLogout, unreadCount = 0 }) {
  currentUnread = unreadCount;
  currentRole = getRole(roleName);
  if (!container) return;
  const items = getNavItems(roleName);

  const navHTML = items.map((item, index) => {
    const active = item.path === activePath;
    const badge = item.badge && unreadCount > 0
      ? `<span class="nav-badge" data-nav-badge aria-label="${unreadCount} unread notifications">${unreadCount > 99 ? '99+' : unreadCount}</span>`
      : (item.badge ? `<span class="nav-badge hidden" data-nav-badge></span>` : '');
    return `
      <a href="#${item.path}" class="nav-item ${active ? 'active' : ''}" ${active ? 'aria-current="page"' : ''} ${item.readOnly ? 'title="Read only — you can view this module but not change it"' : ''}>
        ${icon(item.icon, 18)}
        <span class="nav-text">${escapeHtml(item.label)}</span>
        ${item.readOnly ? '<span class="nav-tag">view</span>' : ''}
        ${badge}
      </a>
    `;
  }).join('');

  container.innerHTML = `
    ${brandBlock(currentRole)}
    ${userBlock(user, currentRole)}
    <nav class="sidebar-nav" aria-label="Main navigation">
      ${navHTML}
      <a href="#logout" class="nav-item nav-danger" id="nav-logout">
        ${icon('logout', 18)}
        <span class="nav-text">Logout</span>
      </a>
    </nav>
  `;

  container.querySelectorAll('.nav-item').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const path = link.getAttribute('href').slice(1);
      if (path === 'logout') {
        onLogout?.();
        return;
      }
      closeDrawer();
      onNavigate?.(path, event);
    });
  });
}

export function setActiveNav(path) {
  document.querySelectorAll('#sidebar .nav-item').forEach((link) => {
    const isActive = link.getAttribute('href') === `#${path}`;
    link.classList.toggle('active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

export function setUnreadCount(count) {
  currentUnread = count;
  document.querySelectorAll('[data-nav-badge]').forEach((badge) => {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.classList.remove('hidden');
      badge.setAttribute('aria-label', `${count} unread notifications`);
    } else {
      badge.textContent = '';
      badge.classList.add('hidden');
    }
  });
}

export function toggleDrawer(forceOpen) {
  const app = document.getElementById('app');
  if (!app) return;
  const shouldOpen = forceOpen ?? !app.classList.contains('sidebar-open');
  app.classList.toggle('sidebar-open', shouldOpen);
}

export function closeDrawer() {
  document.getElementById('app')?.classList.remove('sidebar-open');
}

export function isDrawerOpen() {
  return document.getElementById('app')?.classList.contains('sidebar-open') ?? false;
}

export function initSidebarChrome({ onLogout, user, roleName }) {
  const app = document.getElementById('app');
  const sidebar = document.getElementById('sidebar');
  if (!app || !sidebar) return;

  if (getComputedStyle(sidebar).position === 'fixed') {
    const scrim = app.querySelector('.sidebar-scrim');
    scrim?.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isDrawerOpen()) closeDrawer();
    });
    app.classList.add('initialized-drawer');
  }
}
