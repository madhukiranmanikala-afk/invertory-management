import { icon } from '../components/icons.js';
import { getRole } from '../config/roles.js';
import { escapeHtml } from '../utils.js';

const COPY = {
  denied: {
    code: '403',
    title: 'Access denied',
    body: (roleLabel, path) => `
        Your role (${escapeHtml(roleLabel)}) does not have permission to open this page${path ? ` (<code class="mono">#${escapeHtml(path)}</code>)` : ''}.
        If you believe this is a mistake, contact the Owner.`,
  },
  'not-found': {
    code: '404',
    title: 'Page not found',
    body: (roleLabel, path) => `
        There is no page at <code class="mono">#${escapeHtml(path || 'unknown')}</code>.
        Check the address or head back to your dashboard.`,
  },
  error: {
    code: '500',
    title: 'Something went wrong',
    body: (roleLabel, path) => `
        This page could not be loaded${path ? ` (<code class="mono">#${escapeHtml(path)}</code>)` : ''}.
        Try again, and if the problem continues contact the Owner.`,
  },
};

export function mount(container, ctx) {
  const reason = COPY[ctx.reason] ? ctx.reason : 'denied';
  const copy = COPY[reason];
  const roleLabel = ctx.user?.role ? getRole(ctx.user.role)?.label || ctx.user.role : 'unknown';
  const path = ctx.requestedPath && ctx.requestedPath !== '/403' ? ctx.requestedPath : '';

  const detail = ctx.runtimeError
    ? `<p class="denied-detail">${escapeHtml(ctx.runtimeError)}</p>`
    : ctx.loadError
      ? '<p class="denied-detail">The page module failed to load.</p>'
      : '';

  container.innerHTML = `
    <section class="denied" role="alert" aria-live="assertive">
      <div class="denied-code">${copy.code}</div>
      <h1>${copy.title}</h1>
      <p>${copy.body(roleLabel, path)}</p>
      ${detail}
      <div class="denied-actions">
        <button type="button" class="btn btn-primary" id="denied-dashboard">
          ${icon('dashboard', 15)} Back to my dashboard
        </button>
      </div>
    </section>
  `;
  container.querySelector('#denied-dashboard')?.addEventListener('click', () => ctx.navigate('/dashboard'));
  return () => {};
}
