import { hexToRgba } from './utils.js';
import { ROLES, getRole } from './config/roles.js';

let theme = localStorage.getItem('inv.theme') || 'light';
let density = localStorage.getItem('inv.density') || 'default';

export function getTheme() { return theme; }
export function getDensity() { return density; }

export function applyRoleAccent(roleKey) {
  const role = getRole(roleKey);
  if (!role) return;
  const root = document.documentElement;
  root.style.setProperty('--accent', role.accent);
  root.style.setProperty('--accent-strong', role.accentStrong);
  root.style.setProperty('--accent-contrast', '#ffffff');
  root.style.setProperty('--accent-text', theme === 'dark' ? role.accentLight : role.accent);
  root.style.setProperty('--chart-accent', theme === 'dark' ? role.accentLight : role.accentStrong);
  root.style.setProperty('--accent-soft', hexToRgba(role.accent, theme === 'dark' ? 0.2 : 0.12));
  root.style.setProperty('--accent-softer', hexToRgba(role.accent, theme === 'dark' ? 0.1 : 0.06));
  root.style.setProperty('--accent-ring', hexToRgba(role.accentStrong, 0.35));
  root.style.setProperty('--sidebar-active-bg', role.accent);
  root.dataset.role = roleKey;
}

export function applyTheme(nextTheme) {
  theme = nextTheme;
  localStorage.setItem('inv.theme', theme);
  document.documentElement.dataset.theme = theme;
  const activeRole = document.documentElement.dataset.role;
  if (activeRole) applyRoleAccent(activeRole);
  document.dispatchEvent(new CustomEvent('app:themechange'));
}

export function applyDensity(nextDensity) {
  density = nextDensity;
  localStorage.setItem('inv.density', density);
  document.documentElement.dataset.density = density;
}

export function toggleTheme() {
  applyTheme(theme === 'light' ? 'dark' : 'light');
}

export function bootstrapPrefs(roleKey) {
  applyTheme(theme);
  applyDensity(density);
  applyRoleAccent(roleKey);
}
