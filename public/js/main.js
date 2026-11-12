import { restoreSession, clearSession, logout as authLogout, fetchCurrentUser, syncSession } from './auth.js';
import { getNotifications, peekCurrentUser } from './api.js';
import { renderSidebar, setActiveNav, setUnreadCount, toggleDrawer, closeDrawer } from './components/sidebar.js';
import { renderTopbar, setTopbarTitle } from './components/topbar.js';
import { initRouter, currentPath, navigate, reload as routerReload } from './router.js';
import { applyRoleAccent, applyTheme, applyDensity, toggleTheme, getTheme, getDensity } from './preferences.js';
import { confirmDialog } from './components/modal.js';
import { getRole } from './config/roles.js';
import { getRolePermissions } from './config/permissions.js';

let shellUser = null;
let unreadCount = 0;

/**
 * The signed-in user, read from the shared user record. Everything that needs
 * a role — the sidebar, the router guard and the action buttons — goes
 * through here so a role change is applied straight away.
 */
function currentUser() {
  return peekCurrentUser() || shellUser;
}

async function refreshUnreadCount() {
  try {
    const notifications = await getNotifications();
    unreadCount = notifications.filter((notification) => !notification.read).length;
    setUnreadCount(unreadCount);
  } catch { /* session may have expired mid-poll */ }
}

function buildContext() {
  const user = currentUser();
  return {
    user,
    // Permissions are derived from the current role every time they are needed.
    get permissions() { return getRolePermissions(currentUser()?.role); },
    hasPermission: (key) => getRolePermissions(currentUser()?.role).includes(key),
    navigate,
    reload: () => routerReload(),
    refreshUnreadCount,
    onNotificationsChanged: refreshUnreadCount,
    onUserUpdated: (updatedUser) => {
      shellUser = updatedUser;
      renderShell();
    },
  };
}

function renderShell() {
  const user = currentUser();
  const role = user?.role;
  const roleLabel = getRole(role)?.label || '';
  applyRoleAccent(role);
  renderSidebar(document.getElementById('sidebar'), {
    user,
    roleName: role,
    activePath: currentPath(),
    unreadCount,
    onNavigate: (path) => navigate(path),
    onLogout: handleLogout,
  });
  renderTopbar(document.getElementById('topbar'), {
    user,
    roleName: roleLabel,
    pageMeta: { title: 'Dashboard' },
    theme: getTheme(),
    onToggleSidebar: () => toggleDrawer(),
    onToggleTheme: () => { toggleTheme(); applyRoleAccent(role); },
    onMenuAction: (action) => {
      if (action === '/logout') handleLogout();
      else navigate(action);
    },
  });
}

async function handleLogout() {
  const confirmed = await confirmDialog({
    title: 'Log out',
    message: 'End your current session and return to the login screen?',
    confirmLabel: 'Log out',
    cancelLabel: 'Cancel',
  });
  if (!confirmed) return;
  authLogout();
  window.location.href = '/index.html';
}

async function start() {
  const session = restoreSession();
  if (!session) {
    window.location.href = '/index.html';
    return;
  }

  try {
    shellUser = await fetchCurrentUser();
    // A role change bumps the user's session version, so bring the stored
    // session in step with the shared record before the shell is built.
    syncSession();
  } catch (error) {
    // Session invalid or account deactivated mid-flight
    clearSession();
    window.location.href = '/index.html';
    return;
  }

  applyTheme(getTheme());
  applyDensity(getDensity());
  renderShell();
  refreshUnreadCount();

  // Scrims & drawers
  document.querySelector('.sidebar-scrim')?.addEventListener('click', () => closeDrawer());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });

  window.addEventListener('hashchange', () => {
    closeDrawer();
    setActiveNav(currentPath());
  });

  initRouter({
    view: document.getElementById('view'),
    getContext: buildContext,
    onRouteChange: ({ title, subtitle }) => {
      setTopbarTitle(title, subtitle);
      setActiveNav(currentPath());
    },
  });
}

start();
