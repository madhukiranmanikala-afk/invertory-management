import { icon } from './icons.js';
import { escapeHtml } from '../utils.js';

let fieldSeq = 0;

const PASSWORD_STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

export function passwordStrength(value) {
  let score = 0;
  if (String(value).length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

/**
 * fields: [{ name, label, type, required, options, min, max, step, hint, readonly, disabled, span, rows, placeholder }]
 * Returns { element, getValues, setValues, setError, clearErrors, validateRequired, focusFirst, reset }
 */
export function buildForm(fields = [], values = {}, { idPrefix = 'form' } = {}) {
  const seq = ++fieldSeq;
  const prefix = `${idPrefix}-${seq}`;
  const form = document.createElement('form');
  form.className = 'form-grid';
  form.setAttribute('novalidate', '');
  form.autocomplete = 'off';

  const inputs = new Map();

  fields.forEach((field) => {
    const wrap = document.createElement('div');
    wrap.className = `form-field${field.span === 2 ? ' span-2' : ''}`;
    const inputId = `${prefix}-${field.name}`;
    const errId = `${prefix}-${field.name}-error`;

    let control;
    const common = `id="${inputId}" name="${field.name}" ${field.disabled ? 'disabled' : ''} ${field.readonly ? 'readonly' : ''}`;
    if (field.type === 'select') {
      const options = (field.options || [])
        .map((opt) => `<option value="${escapeHtml(opt.value)}" ${String(opt.value) === String(values[field.name] ?? '') ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`)
        .join('');
      control = `<select ${common} aria-invalid="false">${options}</select>`;
    } else if (field.type === 'textarea') {
      control = `<textarea ${common} rows="${field.rows || 3}" placeholder="${escapeHtml(field.placeholder || '')}" aria-invalid="false">${escapeHtml(values[field.name] ?? '')}</textarea>`;
    } else {
      const type = field.type || 'text';
      const extra = [
        field.required ? 'required' : '',
        field.min !== undefined ? `min="${field.min}"` : '',
        field.max !== undefined ? `max="${field.max}"` : '',
        field.step ? `step="${field.step}"` : '',
        field.autocomplete ? `autocomplete="${field.autocomplete}"` : '',
      ].join(' ');
      if (type === 'password') {
        control = `
          <div class="password-wrap">
            <input type="password" ${common} ${extra} placeholder="${escapeHtml(field.placeholder || '')}" value="${escapeHtml(values[field.name] ?? '')}" aria-invalid="false">
            <button type="button" class="password-toggle" aria-label="Show password" aria-pressed="false">${icon('eye', 15)}</button>
          </div>`;
      } else {
        control = `<input type="${type}" ${common} ${extra} placeholder="${escapeHtml(field.placeholder || '')}" value="${escapeHtml(values[field.name] ?? '')}" aria-invalid="false">`;
      }
    }

    wrap.innerHTML = `
      <label for="${inputId}">${escapeHtml(field.label)}${field.required ? ' <span class="req">*</span>' : ''}</label>
      ${control}
      ${field.hint ? `<p class="field-hint" id="${prefix}-${field.name}-hint">${escapeHtml(field.hint)}</p>` : ''}
      <p class="field-error" id="${errId}" role="alert" aria-live="polite"></p>
    `;
    form.appendChild(wrap);

    const actualInput = wrap.querySelector('[name]');
    if (actualInput) {
      inputs.set(field.name, actualInput);
      const toggle = wrap.querySelector('.password-toggle');
      if (toggle) {
        toggle.addEventListener('click', () => {
          const input = wrap.querySelector('input');
          const showing = input.type === 'text';
          input.type = showing ? 'password' : 'text';
          toggle.innerHTML = icon(showing ? 'eye' : 'eyeOff', 15);
          toggle.setAttribute('aria-pressed', String(!showing));
          toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
          input.focus();
        });
      }
    }
  });

  function setError(name, message) {
    const input = inputs.get(name);
    if (!input) return;
    const wrapEl = input.closest('.form-field');
    const errEl = wrapEl?.querySelector('.field-error');
    if (errEl) errEl.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errEl ? `${prefix}-${name}-error` : '');
  }

  function clearErrors() {
    inputs.forEach((input, name) => {
      const wrapEl = input.closest('.form-field');
      const errEl = wrapEl?.querySelector('.field-error');
      if (errEl) errEl.textContent = '';
      input.setAttribute('aria-invalid', 'false');
    });
    form.querySelectorAll('.form-error-banner').forEach((el) => el.remove());
  }

  function showBanner(message) {
    if (!message) return;
    const banner = document.createElement('div');
    banner.className = 'form-error-banner span-2';
    banner.style.gridColumn = '1 / -1';
    banner.innerHTML = `${icon('alertCircle', 16)}<span>${escapeHtml(message)}</span>`;
    form.prepend(banner);
  }

  function getValues() {
    const result = {};
    inputs.forEach((input, name) => {
      result[name] = input.type === 'number' ? input.value : input.value;
    });
    return result;
  }

  function setValues(newValues) {
    inputs.forEach((input, name) => {
      if (newValues[name] !== undefined) input.value = newValues[name];
    });
  }

  /**
   * A field counts as required only when the live control says so: fields can be
   * made optional at runtime (for example the stock "Reason" textarea, which is
   * only mandatory for adjustments).
   */
  function isRequiredNow(field, input) {
    if (!field.required || !input) return false;
    if (input.disabled || input.readOnly) return false;
    if (!input.required) return false;
    const wrapper = input.closest('.form-field');
    if (wrapper?.classList.contains('hidden')) return false;
    return true;
  }

  function validateRequired(businessRules) {
    clearErrors();
    const errors = {};
    fields.forEach((field) => {
      const input = inputs.get(field.name);
      if (!isRequiredNow(field, input)) return;
      const value = String(input.value ?? '').trim();
      if (!value) {
        errors[field.name] = `${field.label} is required.`;
      }
    });
    let firstError = null;
    Object.entries(errors).forEach(([name, message]) => {
      setError(name, message);
      if (!firstError) firstError = name;
    });
    if (businessRules) {
      Object.entries(businessRules).forEach(([name, message]) => {
        if (!message) return;
        setError(name, message);
        if (!firstError) firstError = name;
      });
    }
    return { valid: !firstError, firstError, focusFirst() { if (firstError) inputs.get(firstError)?.focus(); } };
  }

  function focusFirst() {
    const first = form.querySelector('input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])');
    if (first) first.focus();
  }

  return { element: form, getValues, setValues, setError, clearErrors, showBanner, validateRequired, focusFirst };
}
