import { icon } from './icons.js';
import { escapeHtml } from '../utils.js';

let region = null;
let counter = 0;
const ICON_MAP = {
  success: 'checkCircle',
  error: 'alertCircle',
  danger: 'alertCircle',
  warning: 'alertTriangle',
  info: 'info',
};

function ensureRegion() {
  if (!region || !document.body.contains(region)) {
    region = document.getElementById('toast-root');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toast-root';
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
  }
  return region;
}

export function showToast(message, type = 'success', options = {}) {
  const host = ensureRegion();
  const title = options.title || (type === 'error' ? 'Something went wrong' : type === 'warning' ? 'Warning' : 'Success');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <div class="toast-icon">${icon(ICON_MAP[type] || 'info', 14)}</div>
    <div>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    </div>
    <button class="icon-btn" style="width:24px;height:24px;margin-left:auto;" aria-label="Dismiss notification">${icon('close', 14)}</button>
  `;
  const dismiss = () => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 190);
  };
  el.querySelector('button').addEventListener('click', dismiss);
  host.appendChild(el);
  const duration = options.duration ?? 3800;
  setTimeout(dismiss, duration);
  counter += 1;
  if (host.children.length > 4) host.firstElementChild.remove();
  return el;
}

export const toast = {
  success: (message, options) => showToast(message, 'success', options),
  error: (message, options) => showToast(message, 'error', options),
  info: (message, options) => showToast(message, 'info', options),
  warning: (message, options) => showToast(message, 'warning', options),
};
