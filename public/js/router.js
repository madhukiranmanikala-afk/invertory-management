import { canAccess } from './config/roles.js';
import { closeAllModals } from './components/modal.js';

export const routes = [
  { path: '/dashboard', title: 'Dashboard', getPage: () => import('./pages/dashboard.js') },
  { path: '/users', title: 'User Management', ownerOnly: true, getPage: () => import('./pages/users.js') },
  { path: '/products', title: 'Products', getPage: () => import('./pages/products.js') },
  { path: '/sales', title: 'Sales', getPage: () => import('./pages/sales.js') },
  { path: '/stock', title: 'Stock', getPage: () => import('./pages/stock.js') },
  { path: '/purchase', title: 'Purchase', getPage: () => import('./pages/purchase.js') },
  { path: '/orders', title: 'Orders', getPage: () => import('./pages/orders.js') },
  { path: '/analytics', title: 'Analytics', getPage: () => import('./pages/analytics.js') },
  { path: '/reports', title: 'Reports', getPage: () => import('./pages/reports.js') },
  { path: '/notifications', title: 'Notifications', getPage: () => import('./pages/notifications.js') },
  { path: '/activity', title: 'Activity History', getPage: () => import('./pages/activity.js') },
  { path: '/profile', title: 'My Profile', getPage: () => import('./pages/profile.js') },
  { path: '/settings', title: 'Settings', getPage: () => import('./pages/settings.js') },
  { path: '/help', title: 'Help & Support', getPage: () => import('./pages/help.js') },
];

let container = null;
let getCtx = null;
let cleanup = null;
let onRouteChanged = null;
let loadingToken = 0;

/** Placeholder shown while a lazily imported page module is still loading. */
function pageSkeleton() {
  const wrap = document.createElement('div');
  wrap.className = 'stack-md';
  wrap.style.gap = '24px';
  wrap.innerHTML = `
    <div class="card">
      <div class="skeleton" style="height:14px; width:30%; margin-bottom:18px;"></div>
      ${'<div class="skeleton" style="height:44px;"></div><div style="height:10px"></div>'.repeat(5)}
    </div>`;
  return wrap;
}

export function currentPath() {
  const hash = window.location.hash || '#/dashboard';
  return hash.replace(/^#/, '') || '/dashboard';
}

export function navigate(path) {
  if (currentPath() === path) {
    render();
    return;
  }
  window.location.hash = path;
}

export function reload() {
  render();
}

export function isAllowed(path, roleKey) {
  if (path === '/403') return true;
  return canAccess(roleKey, path);
}

export async function render() {
  if (!container || !getCtx) return;
  const token = ++loadingToken;
  const path = currentPath();
  const ctx = getCtx();

  if (cleanup) {
    try { cleanup(); } catch { /* page cleanup error is non-fatal */ }
    cleanup = null;
  }

  // Overlays live on <body>, so they must be dismissed explicitly when the view changes.
  closeAllModals();

  const forbiddenPage = await import('./pages/forbidden.js');
  container.replaceChildren();

  const route = routes.find((entry) => entry.path === path);

  if (!route || path === '/403') {
    const isNotFound = !route && path !== '/403';
    cleanup = forbiddenPage.mount(container, {
      ...ctx,
      requestedPath: path,
      reason: isNotFound ? 'not-found' : 'denied',
    });
    onRouteChanged?.({ path, title: isNotFound ? 'Not found' : 'Access denied', subtitle: '' });
    return;
  }

  if (!isAllowed(path, ctx.user.role) || (route.ownerOnly && ctx.user.role !== 'owner')) {
    cleanup = forbiddenPage.mount(container, { ...ctx, requestedPath: path, reason: 'denied' });
    onRouteChanged?.({ path, title: 'Access denied', subtitle: '' });
    return;
  }

  const { title, subtitle } = { title: route.title, subtitle: '' };
  let page;
  // Page modules are loaded lazily; show a placeholder only if the import is slow
  // enough to be noticeable, so cached navigations stay instant. When the view
  // is already empty (first load) show it straight away so the shell never
  // flashes a blank content area.
  let skeletonShown = false;
  const skeletonDelay = container.childElementCount === 0 ? 0 : 150;
  const skeletonTimer = setTimeout(() => {
    if (token !== loadingToken) return;
    skeletonShown = true;
    container.replaceChildren();
    container.appendChild(pageSkeleton());
  }, skeletonDelay);
  try {
    page = await route.getPage();
  } catch (error) {
    console.error(`Failed to load page ${path}`, error);
    clearTimeout(skeletonTimer);
    cleanup = forbiddenPage.mount(container, { ...ctx, requestedPath: path, reason: 'error', loadError: true });
    onRouteChanged?.({ path, title: 'Something went wrong', subtitle: '' });
    return;
  }
  clearTimeout(skeletonTimer);
  if (token !== loadingToken) return;

  // Drop the placeholder before the real page appends itself.
  if (skeletonShown) container.replaceChildren();

  onRouteChanged?.({ path, title, subtitle });
  try {
    const result = await page.mount(container, ctx);
    if (typeof result === 'function') cleanup = result;
  } catch (error) {
    console.error(`Failed to mount page ${path}`, error);
    container.replaceChildren();
    cleanup = forbiddenPage.mount(container, { ...ctx, requestedPath: path, reason: 'error', runtimeError: error.message });
    onRouteChanged?.({ path, title: 'Something went wrong', subtitle: '' });
  }
}

export function initRouter({ view, getContext, onRouteChange }) {
  container = view;
  getCtx = getContext;
  onRouteChanged = onRouteChange;
  window.addEventListener('hashchange', () => render());
  render();
}
