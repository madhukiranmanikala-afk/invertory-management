import { NOTIFICATION_TYPES, getNotifications, markNotificationRead, markAllNotificationsRead } from '../api.js';
import { getRole } from '../config/roles.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { escapeHtml, timeAgo } from '../utils.js';

export function mount(container, ctx) {
  let cancelled = false;
  let notifications = [];
  let activeFilter = 'all';

  container.innerHTML = `
    <div class="stack-md" style="gap:24px;">
      <div class="page-head">
        <div>
          <h1>Notifications</h1>
          <p>Alerts relevant to your role. Mark them read as you review them.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="mark-all-read">${icon('check', 15)} Mark all read</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px;">
        <div class="filter-tabs" id="notif-tabs" role="group" aria-label="Filter by type"></div>
      </div>
      <div id="notif-list"></div>
    </div>
  `;

  function typeLabel(type) {
    return NOTIFICATION_TYPES[type]?.label || type;
  }

  function iconFor(type) {
    return NOTIFICATION_TYPES[type]?.icon || 'info';
  }

  function badgesHTML() {
    const counts = {};
    notifications.forEach((notification) => {
      counts[notification.type] = (counts[notification.type] || 0) + (notification.read ? 0 : 1);
    });
    const roleTypes = getRole(ctx.user.role)?.notificationTypes || Object.keys(NOTIFICATION_TYPES);
    const tabs = [
      { key: 'all', label: 'All' },
      ...roleTypes
        .filter((type) => NOTIFICATION_TYPES[type])
        .map((type) => ({ key: type, label: typeLabel(type) })),
    ];
    return tabs.map((tab) => `
      <button type="button" class="filter-tab" data-filter="table" data-type="${escapeHtml(tab.key)}" aria-pressed="${activeFilter === tab.key}">
        ${escapeHtml(tab.label)}${tab.key !== 'all' && counts[tab.key] ? ` <span style="margin-left:4px; font-weight:700; color:var(--danger);">${counts[tab.key]}</span>` : ''}
      </button>`).join('');
  }

  function listHTML() {
    const visible = activeFilter === 'all' ? notifications : notifications.filter((n) => n.type === activeFilter);
    if (!visible.length) {
      return `
        <div class="card">
          <div class="state-box">
            <div class="state-icon">${icon('bell', 22)}</div>
            <h3>No notifications</h3>
            <p>You are all caught up.</p>
          </div>
        </div>`;
    }
    return `
      <div class="card" style="padding:0;">
        <div class="notif-list">
          ${visible.map((notification) => `
            <div class="notif-item ${notification.read ? '' : 'unread'}" data-notif="${escapeHtml(notification.id)}">
              <div class="notif-icon type-${escapeHtml(notification.type)}">${icon(iconFor(notification.type), 17)}</div>
              <div class="notif-copy">
                <strong>${escapeHtml(notification.title)}</strong>
                <p>${escapeHtml(notification.message)}</p>
                <div class="notif-meta">
                  <span class="badge badge-accent">${escapeHtml(typeLabel(notification.type))}</span>
                  <span class="notif-time">${escapeHtml(timeAgo(notification.createdAt))}</span>
                  ${!notification.read ? '<span class="badge badge-success badge-dot">New</span>' : ''}
                </div>
              </div>
              <div class="notif-actions">
                ${!notification.read ? `<button type="button" class="btn btn-soft btn-sm" data-mark-read="${escapeHtml(notification.id)}">${icon('check', 13)} Mark read</button>` : ''}
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  function render() {
    container.querySelector('#notif-tabs').innerHTML = badgesHTML();
    container.querySelector('#notif-list').innerHTML = listHTML();
    bindTabs();
    bindList();
  }

  function bindTabs() {
    container.querySelectorAll('[data-filter="table"]').forEach((tab) => {
      tab.addEventListener('click', () => {
        activeFilter = tab.dataset.type;
        render();
      });
    });
  }

  function bindStatic() {
    container.querySelector('#mark-all-read')?.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await markAllNotificationsRead();
        notifications = await getNotifications();
        ctx.onNotificationsChanged?.();
        showToast('All notifications marked as read.', 'success');
        render();
      } catch (error) {
        showToast(error.message || 'Failed to update notifications.', 'error');
      }
    });
  }

  function bindList() {
    container.querySelectorAll('[data-mark-read]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.markRead;
        try {
          await markNotificationRead(id);
          const target = notifications.find((n) => n.id === id);
          if (target) target.read = true;
          ctx.onNotificationsChanged?.();
          render();
        } catch (error) {
          showToast(error.message || 'Failed to update notification.', 'error');
        }
      });
    });
  }

  async function load() {
    try {
      notifications = await getNotifications();
      if (cancelled) return;
      render();
    } catch (error) {
      if (cancelled) return;
      container.querySelector('#notif-list').innerHTML = `
        <div class="card">
          <div class="state-box error">
            <div class="state-icon">${icon('alertCircle', 22)}</div>
            <h3>Unable to load notifications</h3>
            <p>${escapeHtml(error.message || 'Please try again.')}</p>
            <button type="button" class="btn btn-secondary" id="notif-retry">${icon('refresh', 15)} Retry</button>
          </div>
        </div>`;
      container.querySelector('#notif-retry')?.addEventListener('click', load);
    }
  }

  bindStatic();
  load();
  return () => { cancelled = true; };
}
