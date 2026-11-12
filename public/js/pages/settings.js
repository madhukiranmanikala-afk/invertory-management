import { changePassword } from '../api.js';
import { ROLES } from '../config/roles.js';
import { getTheme, getDensity, applyTheme, applyDensity } from '../preferences.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils.js';

export function mount(container, ctx) {
  const roleLabel = ROLES[ctx.user.role]?.label || escapeHtml(ctx.user.role);

  container.innerHTML = `
    <div class="stack-md" style="gap:24px;">
      <div class="page-head">
        <div>
          <h1>Settings</h1>
          <p>Display preferences and account security for your profile.</p>
        </div>
      </div>

      <section class="card" aria-labelledby="set-display">
        <div class="card-head">
          <div>
            <h3 id="set-display">Display</h3>
            <p>Theme and density are remembered on this device and applied for ${roleLabel} view.</p>
          </div>
        </div>
        <div class="setting-row">
          <div>
            <h3>Theme</h3>
            <p>Choose light or dark appearance.</p>
          </div>
          <div class="theme-picker" role="radiogroup" aria-label="Theme">
            <button type="button" class="theme-option" data-theme="light" role="radio" aria-checked="${getTheme() === 'light'}">
              <span class="theme-preview light"></span>Light
            </button>
            <button type="button" class="theme-option" data-theme="dark" role="radio" aria-checked="${getTheme() === 'dark'}">
              <span class="theme-preview dark"></span>Dark
            </button>
          </div>
        </div>
        <div class="setting-row">
          <div>
            <h3>Density</h3>
            <p>Default spacing, or compact for denser tables and lists.</p>
          </div>
          <select id="density-select" aria-label="Density">
            <option value="default" ${getDensity() === 'default' ? 'selected' : ''}>Default</option>
            <option value="compact" ${getDensity() === 'compact' ? 'selected' : ''}>Compact</option>
          </select>
        </div>
      </section>

      <section class="card" aria-labelledby="set-account">
        <div class="card-head">
          <div>
            <h3 id="set-account">Account</h3>
            <p>The signed-in identity for this session.</p>
          </div>
        </div>
        <div class="setting-row">
          <div>
            <h3>Email</h3>
            <p>${escapeHtml(ctx.user.email)}</p>
          </div>
          <span class="badge badge-accent">${icon('mail', 12)} Read-only</span>
        </div>
        <div class="setting-row">
          <div>
            <h3>Role</h3>
            <p>${escapeHtml(roleLabel)}</p>
          </div>
          <span class="badge badge-accent">${icon('shield', 12)} Managed by Owner</span>
        </div>
        <div class="setting-row">
          <div>
            <h3>Contact</h3>
            <p>Update your name or phone number.</p>
          </div>
          <a class="btn btn-secondary btn-sm" href="#/profile">${icon('user', 13)} Edit in Profile</a>
        </div>
      </section>

      <section class="card" aria-labelledby="set-security">
        <div class="card-head">
          <div>
            <h3 id="set-security">Security</h3>
            <p>Change your password. Minimum 8 characters.</p>
          </div>
        </div>
        <form id="password-form" novalidate>
          <div class="form-grid">
            <div class="form-field span-2">
              <label for="cur-password">Current password <span class="req">*</span></label>
              <div class="password-wrap">
                <input type="password" id="cur-password" autocomplete="current-password" aria-invalid="false">
                <button type="button" class="password-toggle pw-toggle" data-for="cur-password" aria-label="Show password" aria-pressed="false">${icon('eye', 16)}</button>
              </div>
              <p class="field-error" aria-live="polite"></p>
            </div>
            <div class="form-field">
              <label for="new-password">New password <span class="req">*</span></label>
              <div class="password-wrap">
                <input type="password" id="new-password" autocomplete="new-password" aria-invalid="false">
                <button type="button" class="password-toggle pw-toggle" data-for="new-password" aria-label="Show password" aria-pressed="false">${icon('eye', 16)}</button>
              </div>
              <div class="pwd-meter" aria-hidden="true"><span class="pw-bar" id="pw-bar"></span></div>
              <div class="pwd-strength" id="pw-label">Strength: —</div>
              <p class="field-error" aria-live="polite"></p>
            </div>
            <div class="form-field">
              <label for="confirm-password">Confirm new password <span class="req">*</span></label>
              <div class="password-wrap">
                <input type="password" id="confirm-password" autocomplete="new-password" aria-invalid="false">
                <button type="button" class="password-toggle pw-toggle" data-for="confirm-password" aria-label="Show password" aria-pressed="false">${icon('eye', 16)}</button>
              </div>
              <p class="field-error" aria-live="polite"></p>
            </div>
          </div>
          <div class="form-actions" style="margin-top:12px;">
            <button type="submit" class="btn btn-primary">${icon('key', 15)} Change password</button>
          </div>
        </form>
      </section>
    </div>
  `;

  /* Theme options */
  container.querySelectorAll('[data-theme]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(button.dataset.theme);
      container.querySelectorAll('[data-theme]').forEach((other) => other.setAttribute('aria-checked', other.dataset.theme === button.dataset.theme ? 'true' : 'false'));
    });
  });
  container.querySelector('#density-select')?.addEventListener('change', (event) => {
    applyDensity(event.target.value);
  });

  /* Password visibility toggles */
  container.querySelectorAll('.pw-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const input = container.querySelector(`#${toggle.dataset.for}`);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.innerHTML = show ? icon('eyeOff', 16) : icon('eye', 16);
      toggle.setAttribute('aria-pressed', String(show));
      toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      input.focus();
    });
  });

  /* Strength meter */
  const newPasswordInput = container.querySelector('#new-password');
  const bar = container.querySelector('#pw-bar');
  const label = container.querySelector('#pw-label');
  function strength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.min(score, 4);
  }
  const strengthWords = ['Weak', 'Weak', 'Okay', 'Strong', 'Very strong'];
  const strengthColors = ['', 'var(--danger)', 'var(--warning)', 'var(--success)', 'var(--success)'];
  newPasswordInput?.addEventListener('input', () => {
    const score = strength(newPasswordInput.value);
    label.textContent = `Strength: ${strengthWords[score]}`;
    bar.style.width = `${(score / 4) * 100}%`;
    bar.style.background = strengthColors[score];
  });

  /* Submit */
  container.querySelector('#password-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const current = container.querySelector('#cur-password');
    const confirm = container.querySelector('#confirm-password');
    let hasError = false;

    function setFieldError(input, message) {
      const errorEl = input.closest('.form-field').querySelector('.field-error');
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (errorEl) errorEl.textContent = message || '';
      if (message) hasError = true;
    }

    setFieldError(current, current.value ? '' : 'Current password is required.');
    setFieldError(newPasswordInput, newPasswordInput.value.length < 8 ? 'New password must be at least 8 characters.' : '');
    setFieldError(confirm, confirm.value !== newPasswordInput.value ? 'Passwords do not match.' : '');
    if (hasError) return;

    try {
      await changePassword(current.value, newPasswordInput.value);
      showToast('Password changed successfully.', 'success');
      event.target.reset?.();
      label.textContent = 'Strength: —';
      bar.style.width = '0%';
      setFieldError(current, '');
      setFieldError(newPasswordInput, '');
      setFieldError(confirm, '');
    } catch (error) {
      const msg = error?.message || 'Failed to change password.';
      if (/current/i.test(msg)) setFieldError(current, msg);
      else setFieldError(newPasswordInput, msg);
    }
  });

  return () => {};
}
