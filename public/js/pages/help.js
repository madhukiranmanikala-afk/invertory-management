import { submitContact } from '../api.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { escapeHtml, initials } from '../utils.js';

const FAQS = [
  {
    q: 'How do I add a product?',
    a: 'Open Products from the sidebar, click Add New, then fill in the name, SKU, category, price, quantity and minimum level. The stock status (In Stock / Low Stock / Out of Stock) is derived automatically from those quantities.',
  },
  {
    q: 'How do stock in, stock out and adjustments differ?',
    a: 'Stock In increases quantity; Stock Out decreases it and is blocked if it would exceed available stock; Adjustment sets the counted quantity directly and requires a reason — useful after audits.',
  },
  {
    q: 'Why can I not see the Users page?',
    a: 'User management is Owner-only. Other roles cannot view or edit accounts — that keeps role and access changes controlled by one person.',
  },
  {
    q: 'How does changing a role work?',
    a: 'As Owner, click Change Role in User Management, select the employee, choose the new role, review and save. The old role access is deactivated and the new one activated — the sidebar switches to the new dashboard on next sign-in.',
  },
  {
    q: 'What happens when a purchase order is received?',
    a: 'Enter the received quantity (cannot exceed what remains outstanding). Receiving increases stock; when the ordered quantity is fully received the PO closes.',
  },
  {
    q: 'How do I export data?',
    a: 'Every table has a Generate Report action that downloads the currently filtered view as CSV — the same file is available under Reports.',
  },
];

export function mount(container, ctx) {
  container.innerHTML = `
    <div class="stack-md" style="gap:24px;">
      <div class="page-head">
        <div>
          <h1>Help & Support</h1>
          <p>Answers for your role, plus a direct line to the Owner.</p>
        </div>
      </div>

      <section class="card" aria-labelledby="faq-heading">
        <div class="card-head">
          <div>
            <h3 id="faq-heading">Frequently asked questions</h3>
            <p>Quick answers to common workflows.</p>
          </div>
        </div>
        <div class="accordion" id="faq-list"></div>
      </section>

      <section class="card" aria-labelledby="contact-heading">
        <div class="card-head">
          <div class="help-contact-ident">
            <div class="avatar avatar-lg">${escapeHtml(initials('Alex Morgan'))}</div>
            <div>
              <h3 id="contact-heading">Contact the Owner</h3>
              <p>Alex Morgan · Owner · owner@demo.com</p>
            </div>
          </div>
        </div>
        <form id="contact-form" novalidate>
          <div class="form-grid">
            <div class="form-field">
              <label for="hc-name">From</label>
              <input type="text" id="hc-name" value="${escapeHtml(ctx.user.name)}" readonly>
            </div>
            <div class="form-field">
              <label for="hc-email">Reply to</label>
              <input type="email" id="hc-email" value="${escapeHtml(ctx.user.email)}" readonly>
            </div>
            <div class="form-field">
              <label for="hc-subject">Subject <span class="req">*</span></label>
              <input type="text" id="hc-subject" placeholder="Short summary" aria-invalid="false">
              <p class="field-error" aria-live="polite"></p>
            </div>
            <div class="form-field">
              <label for="hc-category">Category</label>
              <select id="hc-category">
                <option value="question">Question</option>
                <option value="issue">Report an issue</option>
                <option value="account">Account / access</option>
              </select>
            </div>
            <div class="form-field span-2">
              <label for="hc-message">Message <span class="req">*</span></label>
              <textarea id="hc-message" rows="4" placeholder="Describe your question or issue…"></textarea>
              <p class="field-error" aria-live="polite"></p>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${icon('send', 15)} Submit request</button>
          </div>
        </form>
      </section>
    </div>
  `;

  /* FAQ accordion */
  const list = container.querySelector('#faq-list');
  list.innerHTML = FAQS.map((faq, index) => `
    <div class="accordion-item">
      <button type="button" class="accordion-trigger" data-faq="${index}" aria-expanded="false" aria-controls="faq-panel-${index}">
        <span>${escapeHtml(faq.q)}</span>
        ${icon('chevronDown', 16)}
      </button>
      <div class="accordion-panel" id="faq-panel-${index}" hidden><p>${escapeHtml(faq.a)}</p></div>
    </div>`).join('');
  list.querySelectorAll('[data-faq]').forEach((button) => {
    button.addEventListener('click', () => {
      const answer = button.nextElementSibling;
      const open = !answer.hidden;
      answer.hidden = open;
      button.setAttribute('aria-expanded', String(!open));
    });
  });

  /* Contact form */
  container.querySelector('#contact-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const subject = container.querySelector('#hc-subject');
    const message = container.querySelector('#hc-message');
    let hasError = false;
    function setFieldError(input, msg) {
      const errorEl = input.closest('.form-field').querySelector('.field-error');
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (errorEl) errorEl.textContent = msg || '';
      if (msg) hasError = true;
    }
    setFieldError(subject, subject.value.trim() ? '' : 'Subject is required.');
    setFieldError(message, message.value.trim() ? '' : 'Message is required.');
    if (hasError) return;

    const button = event.target.querySelector('.btn-primary');
    button.disabled = true;
    try {
      await submitContact({
        name: ctx.user.name,
        email: ctx.user.email,
        subject: subject.value.trim(),
        category: container.querySelector('#hc-category').value,
        message: message.value.trim(),
      });
      showToast('Request sent to the Owner — activity logged.', 'success');
      event.target.reset?.();
    } catch (error) {
      showToast(error.message || 'Failed to send message.', 'error');
    } finally {
      button.disabled = false;
    }
  });

  return () => {};
}
