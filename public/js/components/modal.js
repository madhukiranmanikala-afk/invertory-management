import { icon } from './icons.js';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
let openModals = [];

function trapFocus(modal, event) {
  const focusable = modal.querySelectorAll(FOCUSABLE);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function closeTopModal(result) {
  const top = openModals[openModals.length - 1];
  if (top) top.close(result);
}

export function openModal(options = {}) {
  const {
    title,
    subtitle = '',
    content = '',
    actions = [],
    size = 'md',
    onClose = null,
    initialFocus = null,
    closeOnOverlay = true,
  } = options;

  const previouslyFocused = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal modal-${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title-${openModals.length}" tabindex="-1">
      <div class="modal-head">
        <div>
          <h2 id="modal-title-${openModals.length}">${title}</h2>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
        <button type="button" class="modal-close" aria-label="Close dialog">${icon('close', 16)}</button>
      </div>
      <div class="modal-body"></div>
      ${actions.length ? '<div class="modal-foot"></div>' : ''}
    </div>
  `;

  const body = overlay.querySelector('.modal-body');
  if (typeof content === 'string') body.innerHTML = content;
  else if (content instanceof Node) body.appendChild(content);

  const foot = overlay.querySelector('.modal-foot');
  const controller = {
    element: overlay,
    modal: overlay.querySelector('.modal'),
    close(result) {
      if (!controller.element.isConnected) return;
      controller.element.remove();
      openModals = openModals.filter((m) => m !== controller);
      if (!openModals.length) document.body.classList.remove('modal-open');
      if (onClose) onClose(result);
      if (previouslyFocused?.focus) previouslyFocused.focus();
    },
  };

  // Close button
  overlay.querySelector('.modal-close').addEventListener('click', () => controller.close());

  overlay.addEventListener('mousedown', (e) => {
    if (closeOnOverlay && e.target === overlay) controller.close();
  });

  if (foot) {
    actions.forEach((action) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn btn-${action.variant || 'secondary'}`;
      btn.innerHTML = action.label;
      btn.addEventListener('click', () => {
        if (typeof action.onClick === 'function') action.onClick(controller.close);
        else controller.close();
      });
      foot.appendChild(btn);
    });
  }

  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');
  openModals.push(controller);

  // Focus management
  const focusTarget = initialFocus
    ? (typeof initialFocus === 'string' ? overlay.querySelector(initialFocus) : initialFocus)
    : overlay.querySelector('.modal-close');
  if (focusTarget) focusTarget.focus();
  else overlay.querySelector('.modal').focus();

  globalThis._modalTrapHandler = globalThis._modalTrapHandler || ((e) => {
    if (!openModals.length) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeTopModal();
    } else if (e.key === 'Tab') {
      trapFocus(openModals[openModals.length - 1].modal, e);
    }
  });
  globalThis._modalTrapHandler && document.addEventListener('keydown', globalThis._modalTrapHandler);

  return controller;
}

export function closeModal() {
  closeTopModal();
}

export function closeAllModals() {
  while (openModals.length) {
    openModals[openModals.length - 1].close();
  }
}

export function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    let resolved = false;
    const modal = openModal({
      title,
      content: `<p style="font-size:14px; color: var(--text-muted);">${message}</p>`,
      size: 'sm',
      actions: [
        { label: cancelLabel, variant: 'secondary' },
        {
          label: confirmLabel,
          variant: danger ? 'danger' : 'primary',
          onClick: (close) => {
            resolved = true;
            close(true);
          },
        },
      ],
      onClose: (result) => {
        if (!resolved) resolve(false);
        else resolve(result === true);
      },
    });
  });
}

