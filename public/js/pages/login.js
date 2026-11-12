import * as api from '../api.js';
import { setSession } from '../auth.js';
import { icon } from '../components/icons.js';
import { escapeHtml } from '../utils.js';

const root = document.getElementById('login-root');

const state = {
  showPassword: false,
  loading: false,
  identifier: '',
  error: { title: '', message: '' },
};

const DEMO_ACCOUNTS = [
  { role: 'Owner', email: 'owner@demo.com', password: 'Owner@123' },
  { role: 'Product Manager', email: 'product@demo.com', password: 'Product@123' },
  { role: 'Sales Manager', email: 'sales@demo.com', password: 'Sales@123' },
  { role: 'Stock Manager', email: 'stock@demo.com', password: 'Stock@123' },
  { role: 'Purchase Manager', email: 'purchase@demo.com', password: 'Purchase@123' },
  { role: 'Order Manager', email: 'orders@demo.com', password: 'Orders@123' },
];

function emailOrUsernameValid(value) {
  const text = value.trim();
  if (!text) return false;
  if (text.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text);
  }
  return /^[A-Za-z0-9._-]{3,}$/.test(text);
}

function render() {
  const errorHTML = state.error.message
    ? `<div class="form-error-banner" role="alert">
        ${icon(state.error.title.includes('deactivated') ? 'xCircle' : 'alertCircle', 16)}
        <span><strong>${escapeHtml(state.error.title)}</strong> ${escapeHtml(state.error.message)}</span>
      </div>`
    : '';

  root.innerHTML = `
    <div class="auth-card-head">
      <h2>Welcome back</h2>
      <p>Sign in to open your workspace.</p>
    </div>
    <div class="card">
      <form id="login-form" novalidate>
        <div class="stack-sm">
          ${errorHTML}
          <div class="form-field">
            <label for="login-identifier">Email or username <span class="req">*</span></label>
            <input type="text" id="login-identifier" name="identifier" placeholder="e.g. owner@demo.com"
              autocomplete="username" aria-invalid="false" aria-describedby="identifier-error" value="${escapeHtml(state.identifier ?? '')}">
            <p class="field-error" id="identifier-error" aria-live="polite"></p>
          </div>
          <div class="form-field">
            <label for="login-password">Password <span class="req">*</span></label>
            <div class="password-wrap">
              <input type="${state.showPassword ? 'text' : 'password'}" id="login-password" name="password" placeholder="Enter your password"
                autocomplete="current-password" aria-invalid="false" aria-describedby="password-error">
              <button type="button" class="password-toggle" id="password-toggle" aria-label="${state.showPassword ? 'Hide password' : 'Show password'}" aria-pressed="${state.showPassword}">
                ${icon(state.showPassword ? 'eyeOff' : 'eye', 15)}
              </button>
            </div>
            <p class="field-error" id="password-error" aria-live="polite"></p>
          </div>
          <div class="check-row" style="margin-top:2px;">
            <label class="checkbox">
              <input type="checkbox" id="remember-me" name="remember">
              <span>Remember me</span>
            </label>
            <a href="#" id="forgot-password">Forgot password?</a>
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block ${state.loading ? 'is-loading' : ''}" id="login-btn" ${state.loading ? 'disabled' : ''} style="margin-top:8px;">
            <span class="btn-label">${state.loading ? 'Signing in…' : 'Sign in'}</span>
          </button>
          <p class="auth-meta" style="margin-bottom:0;">
            Protected workspace · one account per role
          </p>
        </div>
      </form>
    </div>
    <details class="auth-notice" style="margin-top:16px; cursor:pointer;">
      <summary style="list-style:none; display:flex; align-items:center; gap:8px; font-weight:600;">${icon('info', 14)} Demo accounts</summary>
      <table style="width:100%; font-size:12px; margin-top:12px; border-collapse:collapse;">
        <tbody>
          ${DEMO_ACCOUNTS.map((account) => `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:6px 4px; color:var(--text-muted); white-space:nowrap;">${escapeHtml(account.role)}</td>
              <td class="mono" style="padding:6px 4px;">${escapeHtml(account.email)}</td>
              <td class="mono" style="padding:6px 4px; color:var(--text-subtle);">${escapeHtml(account.password)}</td>
              <td style="padding:6px 4px; text-align:right;">
                <button type="button" class="btn btn-ghost btn-sm" data-fill="${escapeHtml(account.email)}" data-fill-password="${escapeHtml(account.password)}">Fill</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </details>
  `;

  bind();
}

function showErrors({ identifier, password }) {
  const emailError = root.querySelector('#identifier-error');
  const passwordError = root.querySelector('#password-error');
  const emailInput = root.querySelector('#login-identifier');
  const passwordInput = root.querySelector('#login-password');
  if (emailError) emailError.textContent = identifier || '';
  if (passwordError) passwordError.textContent = password || '';
  if (emailInput) emailInput.setAttribute('aria-invalid', identifier ? 'true' : 'false');
  if (passwordInput) passwordInput.setAttribute('aria-invalid', password ? 'true' : 'false');
}

function bind() {
  const form = root.querySelector('#login-form');
  const identifier = root.querySelector('#login-identifier');
  const password = root.querySelector('#login-password');
  const submitBtn = root.querySelector('#login-btn');

  identifier?.focus();
  identifier?.addEventListener('input', () => clearFieldError('identifier-error'));
  password?.addEventListener('input', () => clearFieldError('password-error'));

  identifier?.addEventListener('input', () => {
    state.identifier = identifier.value;
  });

  root.querySelector('#password-toggle')?.addEventListener('click', () => {
    state.showPassword = !state.showPassword;
    const input = root.querySelector('#login-password');
    const toggle = root.querySelector('#password-toggle');
    if (input) {
      input.type = state.showPassword ? 'text' : 'password';
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
    if (toggle) {
      toggle.innerHTML = icon(state.showPassword ? 'eyeOff' : 'eye', 15);
      toggle.setAttribute('aria-pressed', String(state.showPassword));
      toggle.setAttribute('aria-label', state.showPassword ? 'Hide password' : 'Show password');
    }
  });

  root.querySelector('#forgot-password')?.addEventListener('click', (event) => {
    event.preventDefault();
    showToastMessage('Password resets are handled by the Owner.', 'info');
  });

  root.querySelectorAll('[data-fill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (identifier) identifier.value = btn.dataset.fill;
      if (password) password.value = btn.dataset.fillPassword;
      clearFieldError('identifier-error');
      clearFieldError('password-error');
    });
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearInlineErrors();

    const identifierValue = identifier.value.trim();
    const passwordValue = password.value;

    let identifierError = '';
    let passwordError = '';
    if (!identifierValue) identifierError = 'Email or username is required.';
    else if (!emailOrUsernameValid(identifierValue)) identifierError = 'Enter a valid email or username.';
    if (!passwordValue) passwordError = 'Password is required.';

    showErrors({ identifier: identifierError, password: passwordError });
    if (identifierError) { identifier.focus(); return; }
    if (passwordError) { password.focus(); return; }

    state.identifier = identifierValue;
    state.loading = true;
    renderLoading();

    try {
      const { user, token } = await api.login(identifierValue, passwordValue);
      setSession({
        userId: user.id,
        token,
        loginAt: Date.now(),
        sessionVersion: user.sessionVersion,
      });
      window.location.href = '/app.html#/dashboard';
    } catch (error) {
      state.loading = false;
      renderLoading();
      if (error.code === 'DEACTIVATED') {
        state.error = { title: 'Account deactivated.', message: 'Contact the Owner.' };
      } else if (error.code === 'INVALID_CREDENTIALS') {
        state.error = { title: 'Invalid credentials.', message: 'Check your email/username and password.' };
      } else {
        state.error = { title: 'Sign-in failed.', message: error.message || 'Please try again.' };
      }
      render();
      root.querySelector('#login-identifier')?.focus();
    }
  });
}

function clearInlineErrors() {
  root.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; });
  root.querySelectorAll('[aria-invalid]').forEach((el) => el.setAttribute('aria-invalid', 'false'));
}

function clearFieldError(id) {
  const el = root.querySelector(`#${id}`);
  if (el) el.textContent = '';
  const input = el?.previousElementSibling?.querySelector ? el.previousElementSibling : null;
  if (input) input.setAttribute('aria-invalid', 'false');
}

function renderLoading() {
  const btn = root.querySelector('#login-btn');
  if (btn) {
    btn.disabled = state.loading;
    btn.classList.toggle('is-loading', state.loading);
    const label = btn.querySelector('.btn-label');
    if (label) label.textContent = state.loading ? 'Signing in…' : 'Sign in';
  }
}

function showToastMessage(message, type) {
  // lightweight inline toast for the login page
  let region = document.getElementById('toast-root');
  if (!region) {
    region = document.createElement('div');
    region.id = 'toast-root';
    region.className = 'toast-region';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <div class="toast-icon">${icon(type === 'error' ? 'alertCircle' : type === 'warning' ? 'alertTriangle' : 'info', 14)}</div>
    <div><span>${escapeHtml(message)}</span></div>
  `;
  region.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 200);
  }, 4200);
}

render();
