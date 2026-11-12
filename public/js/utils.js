const numberFormatter = new Intl.NumberFormat('en-US');
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});
const compactCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

export function formatCompactCurrency(value) {
  return compactCurrencyFormatter.format(Number(value) || 0);
}

export function formatDecimal(value, digits = 1) {
  return (Number(value) || 0).toFixed(digits);
}

export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return new Date(value.getTime());
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value) {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(value) {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(value) {
  const date = parseDate(value);
  if (!date) return '—';
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function dateTimeDaysAgo(days, hours = 0, minutes = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(date.getHours() - hours, date.getMinutes() - minutes, 0, 0);
  return date.toISOString();
}

export function isWithinDays(value, days) {
  const date = parseDate(value);
  if (!date) return false;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return date.getTime() >= cutoff.getTime();
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function debounce(fn, wait = 220) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

export function hexToRgba(hex, alpha = 1) {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(8, 145, 178, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

/** Uploaded photo first, then the avatar URL, then nothing (initials). */
export function avatarSrc(user) {
  return String(user?.photo || user?.avatar || '').trim();
}

/**
 * Inner HTML for an avatar circle. The initials stay underneath the image, so
 * a broken image falls back to them when the onerror handler removes the img.
 */
export function avatarContent(user, name = user?.name) {
  const label = name || '';
  const fallback = escapeHtml(initials(label));
  const src = avatarSrc(user);
  if (!src) return fallback;
  return `<span class="avatar-initials" aria-hidden="true">${fallback}</span><img src="${escapeHtml(src)}" alt="Profile photo of ${escapeHtml(label)}" onerror="this.remove()">`;
}

export function sum(items, selector = (item) => item) {
  return items.reduce((total, item) => total + (Number(selector(item)) || 0), 0);
}

export function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function downloadCSV(filename, rows) {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function capitalize(value) {
  const text = String(value || '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function titleCase(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function stockAvailability(quantity, minLevel) {
  const qty = Number(quantity) || 0;
  const min = Number(minLevel) || 0;
  if (qty <= min) return 'Low';
  if (qty <= min * 2) return 'Medium';
  return 'High';
}

export function statusTone(status) {
  const normalized = String(status || '').toLowerCase();
  if (['active', 'in stock', 'completed', 'received', 'success'].includes(normalized)) return 'success';
  if (['low stock', 'pending', 'partially received', 'processing', 'new', 'warning'].includes(normalized)) return 'warning';
  if (['out of stock', 'cancelled', 'deactivated', 'error', 'danger'].includes(normalized)) return 'danger';
  if (['in', 'info'].includes(normalized)) return 'info';
  return 'neutral';
}

export function uniqueValues(items, selector) {
  return [...new Set(items.map(selector).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

export function isWholeNumber(value) {
  if (value === '' || value === null || value === undefined) return false;
  const num = Number(value);
  return Number.isFinite(num) && Number.isInteger(num) && num >= 0;
}

export function isNonNegativeNumber(value) {
  if (value === '' || value === null || value === undefined) return false;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0;
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}

/**
 * Indian phone numbers.
 * A phone is "+91" followed by a 10-digit mobile number starting with 6-9.
 * Spaces, dashes and brackets are accepted as separators. An empty value is
 * valid because the phone field is optional.
 */
export function isIndianPhone(value) {
  const phone = String(value ?? '').trim();
  if (!phone) return true;
  return /^\+91[6-9]\d{9}$/.test(phone.replace(/[\s\-().]/g, ''));
}

/** Shared message shown whenever a phone number is rejected. */
export const PHONE_ERROR = 'Enter a valid Indian phone number (e.g. +91 98765 43210).';

/** Canonical display form of an Indian phone number: +91 98765 43210. */
export function formatIndianPhone(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (!isIndianPhone(raw)) return raw;
  const digits = raw.replace(/\D/g, '').slice(2);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function deburr(value) {
  return String(value ?? '').toLowerCase();
}
