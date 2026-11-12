import { getUsers, createUser, updateUser, updateUserRole, updateUserStatus, resetUserPassword } from '../api.js';
import { ROLES } from '../config/roles.js';
import { createDataTable } from '../components/table.js';
import { openModal, confirmDialog } from '../components/modal.js';
import { buildForm } from '../components/form.js';
import { statusBadge, detailsGrid } from '../components/cards.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { escapeHtml, avatarContent, isEmail, isIndianPhone, PHONE_ERROR } from '../utils.js';

export function mount(container, ctx) {
  let cancelled = false;
  let rows = [];
  let table = null;

  const pageEl = document.createElement('div');
  pageEl.innerHTML = `
    <div class="stack-md" style="gap:24px;">
      <div class="page-head" id="users-head"></div>
      <div id="users-host"></div>
    </div>`;
  container.appendChild(pageEl);

  const host = pageEl.querySelector('#users-host');
  const head = pageEl.querySelector('#users-head');

  function renderHead() {
    head.innerHTML = `
      <div>
        <h1>User Management</h1>
        <p>Accounts, roles and access across the workspace.</p>
      </div>
      <div class="page-actions">
        ${ctx.hasPermission('users.role') ? `
          <button type="button" class="btn btn-secondary" id="role-change-btn">
            ${icon('refresh', 16)} Change Role
          </button>` : ''}
        ${ctx.hasPermission('users.create') ? `
          <button type="button" class="btn btn-primary" id="user-add">
            ${icon('userPlus', 16)} Add New User
          </button>` : ''}
      </div>`;
    head.querySelector('#user-add')?.addEventListener('click', () => openAddUserModal());
    head.querySelector('#role-change-btn')?.addEventListener('click', () => openRoleChangeModal());
  }

  /**
   * Secondary line under the user's name. The email already has its own
   * column, so show the contact number instead and fall back to the join
   * date when the account has no phone on file.
   */
  function userSubline(row) {
    if (row.phone) return row.phone;
    if (row.createdAt) return `Joined ${String(row.createdAt).slice(0, 10)}`;
    return '—';
  }

  function columns() {
    return [
      {
        key: 'name',
        label: 'User',
        className: 'nowrap',
        render: (row) => `
          <div class="cell-with-sub">
            <div class="avatar" style="width:32px;height:32px;font-size:11px;">${avatarContent(row)}</div>
            <div>
              <span class="cell-strong">${escapeHtml(row.name)}</span>
              <span class="cell-sub">${escapeHtml(userSubline(row))}</span>
            </div>
          </div>`,
        sortValue: (row) => row.name.toLowerCase(),
        exportValue: (row) => row.name,
      },
      { key: 'email', label: 'Email', className: 'nowrap', exportValue: (row) => row.email, render: (row) => `<span class="mono" style="font-size:12px;">${escapeHtml(row.email)}</span>` },
      {
        key: 'role',
        label: 'Role',
        className: 'nowrap',
        render: (row) => `<span class="badge badge-accent">${escapeHtml(ROLES[row.role]?.label || row.role)}</span>`,
        sortValue: (row) => ROLES[row.role]?.label || row.role,
        exportValue: (row) => ROLES[row.role]?.label || row.role,
      },
      {
        key: 'status',
        label: 'Status',
        className: 'nowrap',
        render: (row) => statusBadge(row.status === 'active' ? 'success' : 'danger', row.status === 'active' ? 'Active' : 'Deactivated'),
        sortValue: (row) => row.status,
        exportValue: (row) => (row.status === 'active' ? 'Active' : 'Deactivated'),
      },
    ];
  }

  function isSelf(row) {
    return row.id === ctx.user.id;
  }

  function tableConfig() {
    return {
      columns: columns(),
      initialRows: rows,
      searchKeys: ['name', 'email'],
      filters: [
        {
          key: 'role',
          label: 'Role',
          options: Object.values(ROLES).map((role) => ({ value: role.key, label: role.label })),
        },
        {
          key: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }, { value: 'deactivated', label: 'Deactivated' }],
        },
      ],
      pageSize: 10,
      initialSort: { key: 'name', dir: 'asc' },
      exportFilename: 'users-report',
      toolbar: [
        {
          id: 'generate-report',
          label: 'Generate Report',
          icon: 'download',
          variant: 'secondary',
          when: () => ctx.hasPermission('reports.generate'),
          onClick: () => {
            const count = table.exportCSV('users-report');
            showToast(`Report generated — ${count} records exported to CSV.`, 'success');
          },
        },
      ],
      rowActions: (row) => [
        { id: 'view', label: 'View details', icon: 'eye', onClick: () => openDetails(row) },
        ...(ctx.hasPermission('users.update') && !isSelf(row) ? [{ id: 'edit', label: 'Edit user', icon: 'edit', onClick: () => openEditModal(row) }] : []),
        ...(ctx.hasPermission('users.role') && !isSelf(row) ? [{ id: 'role', label: 'Change role', icon: 'refresh', onClick: () => openRoleChangeModal(row) }] : []),
        ...(ctx.hasPermission('users.reset') ? [{ id: 'reset', label: 'Reset password', icon: 'key', onClick: () => openResetPasswordModal(row) }] : []),
        ...(ctx.hasPermission('users.status') && !isSelf(row) ? [{
          id: 'toggle-status',
          label: row.status === 'active' ? 'Deactivate' : 'Activate',
          icon: row.status === 'active' ? 'lock' : 'userCheck',
          danger: row.status === 'active',
          onClick: () => toggleUserStatus(row),
        }] : []),
      ],
      emptyState: {
        icon: 'users',
        title: 'No users yet',
        message: 'User accounts will appear here.',
      },
    };
  }

  function openDetails(row) {
    openModal({
      title: row.name,
      subtitle: row.email,
      content: `
        <div class="profile-card" style="margin-bottom:16px;">
          <div class="avatar avatar-lg">${avatarContent(row)}</div>
          <div class="profile-ident">
            <h3 style="font-size:16px; letter-spacing:-0.01em;">${escapeHtml(row.name)}</h3>
            <p>${escapeHtml(ROLES[row.role]?.label || row.role)}</p>
          </div>
        </div>` + detailsGrid([
        { label: 'Name', value: escapeHtml(row.name) },
        { label: 'Email', value: `<span class="mono" style="font-size:12.5px;">${escapeHtml(row.email)}</span>` },
        { label: 'Role', value: ROLES[row.role]?.label || row.role },
        { label: 'Status', value: statusBadge(row.status === 'active' ? 'success' : 'danger', row.status === 'active' ? 'Active' : 'Deactivated') },
        { label: 'Phone', value: escapeHtml(row.phone || '—') },
        { label: 'Created', value: escapeHtml(String(row.createdAt || '—').slice(0, 10)) },
      ]),
    });
  }

  /* ---------------- Add user ---------------- */
  function openAddUserModal() {
    const fields = [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Full name', span: 2 },
      { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'user@company.com', span: 2 },
      { name: 'password', label: 'Temporary password', type: 'password', required: true, span: 2, hint: 'At least 8 characters. The user changes this after sign-in.' },
      {
        name: 'role',
        label: 'Role',
        type: 'select',
        required: true,
        span: 2,
        options: Object.values(ROLES).map((role) => ({ value: role.key, label: role.label })),
      },
    ];
    const form = buildForm(fields, { role: 'sales' }, { idPrefix: 'add-user-form' });

    const modal = openModal({
      title: 'Add New User',
      subtitle: 'Create an account; the user signs in with this temporary password.',
      content: form.element,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        { label: 'Create user', variant: 'primary', onClick: (close) => handleSubmit(close) },
      ],
    });

    async function handleSubmit(close) {
      const vals = form.getValues();
      const errors = {};
      if (!vals.name?.trim()) errors.name = 'Name is required.';
      if (!isEmail(vals.email)) errors.email = 'Enter a valid email address.';
      if (String(vals.password || '').length < 8) errors.password = 'Temporary password must be at least 8 characters.';
      if (!vals.role) errors.role = 'Choose a role.';

      form.clearErrors();
      const result = form.validateRequired(errors);
      if (!result.valid) {
        result.focusFirst();
        return;
      }
      const btn = modal.element.querySelector('.modal-foot .btn-primary');
      btn.disabled = true;
      try {
        const created = await createUser({
          name: vals.name.trim(),
          email: vals.email.trim(),
          password: vals.password,
          role: vals.role,
        });
        showToast(`User ${created.name} created with ${ROLES[created.role]?.label || created.role} access.`, 'success');
        close();
        await reload();
      } catch (error) {
        form.clearErrors();
        const msg = error.message || 'Something went wrong.';
        if (/email/i.test(msg)) form.setError('email', msg);
        else if (/password/i.test(msg)) form.setError('password', msg);
        else form.showBanner(msg);
        btn.disabled = false;
      }
    }
  }

  /* ---------------- Edit user ---------------- */
  function openEditModal(row) {
    const fields = [
      { name: 'name', label: 'Name', type: 'text', required: true, span: 2 },
      { name: 'email', label: 'Email', type: 'email', required: true, span: 2 },
      { name: 'phone', label: 'Phone', type: 'tel', span: 2, placeholder: '+91 98765 43210', hint: 'Indian number with the +91 country code.' },
    ];
    const form = buildForm(fields, { name: row.name, email: row.email, phone: row.phone }, { idPrefix: 'edit-user-form' });

    const modal = openModal({
      title: 'Edit User',
      subtitle: `${row.name} · ${ROLES[row.role]?.label || row.role}`,
      content: form.element,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        { label: 'Save changes', variant: 'primary', onClick: (close) => handleSubmit(close) },
      ],
    });

    async function handleSubmit(close) {
      const vals = form.getValues();
      const errors = {};
      if (!vals.name?.trim()) errors.name = 'Name is required.';
      if (!isEmail(vals.email)) errors.email = 'Enter a valid email address.';
      if (!isIndianPhone(vals.phone)) errors.phone = PHONE_ERROR;
      form.clearErrors();
      const result = form.validateRequired(errors);
      if (!result.valid) {
        result.focusFirst();
        return;
      }
      const btn = modal.element.querySelector('.modal-foot .btn-primary');
      btn.disabled = true;
      try {
        await updateUser(row.id, {
          name: vals.name.trim(),
          email: vals.email.trim(),
          phone: vals.phone?.trim() || '',
        });
        showToast('User details updated.', 'success');
        close();
        await reload();
      } catch (error) {
        form.clearErrors();
        const msg = error.message || 'Something went wrong.';
        if (/email/i.test(msg)) form.setError('email', msg);
        else if (/phone/i.test(msg)) form.setError('phone', msg);
        else form.showBanner(msg);
        btn.disabled = false;
      }
    }
  }

  /* ---------------- Reset password ---------------- */
  async function openResetPasswordModal(row) {
    const confirmed = await confirmDialog({
      title: 'Reset password?',
      message: `Generate a new temporary password for ${row.name} (${row.email})? The old password stops working immediately.`,
      confirmLabel: 'Reset password',
    });
    if (!confirmed) return;
    try {
      const { temporaryPassword } = await resetUserPassword(row.id);
      openModal({
        title: 'Temporary password generated',
        subtitle: row.email,
        content: `
          <div class="stack-sm">
            <div class="copy-line">
              <span>${escapeHtml(temporaryPassword)}</span>
              <span class="subtle" style="font-family:var(--font-sans); font-size:11px;">Temporary</span>
            </div>
            <p class="subtle" style="font-size:12.5px;">Share securely with ${escapeHtml(row.name)}. They should change it after signing in.</p>
          </div>
        `,
        actions: [{ label: 'Done', variant: 'primary' }],
      });
      await reload();
    } catch (error) {
      showToast(error.message || 'Failed to reset password.', 'error');
    }
  }

  /* ---------------- Activate / Deactivate ---------------- */
  async function toggleUserStatus(row) {
    const deactivating = row.status === 'active';
    const confirmed = await confirmDialog({
      title: deactivating ? 'Deactivate user?' : 'Activate user?',
      message: deactivating
        ? `${row.name} will lose access immediately and cannot sign in until reactivated.`
        : `${row.name} will be able to sign in again with their existing password.`,
      confirmLabel: deactivating ? 'Deactivate' : 'Activate',
      danger: deactivating,
    });
    if (!confirmed) return;
    try {
      await updateUserStatus(row.id, deactivating ? 'deactivated' : 'active');
      showToast(`${row.name} ${deactivating ? 'deactivated' : 'activated'}.`, 'success');
      await reload();
    } catch (error) {
      showToast(error.message || 'Failed to update user.', 'error');
    }
  }

  /* ---------------- Role Change Flow (4-step stepper) ---------------- */
  function openRoleChangeModal(prefilledRow) {
    const changeable = rows.filter((row) => !isSelf(row));

    let step = 1;
    let selectedId = prefilledRow && !isSelf(prefilledRow) ? prefilledRow.id : (changeable[0]?.id || '');
    let selectedRole = (() => {
      const user = rows.find((row) => row.id === selectedId);
      const current = user ? user.role : 'sales';
      return current === 'sales' ? 'product' : current === 'product' ? 'sales' : 'product';
    })();

    const modalEl = openModal({
      title: 'Change Role',
      subtitle: 'Owner-only. Moves an employee between the six role dashboards.',
      size: 'lg',
      actions: [{ label: 'Cancel', variant: 'secondary' }],
      closeOnOverlay: false,
    });
    const host = modalEl.modal.querySelector('.modal-body');
    const footer = modalEl.modal.querySelector('.modal-foot');
    render();

    function stepperHTML() {
      const labels = ['Select Employee', 'Change Role', 'Save Changes', 'Update Access'];
      return `
        <div class="stepper" aria-hidden="true">
          ${labels.map((label, index) => {
            const current = index + 1;
            const state = current < step ? 'done' : current === step ? 'active' : '';
            const dot = current < step ? icon('check', 12) : String(current);
            return `
              <div class="step ${state}">
                <div class="step-dot">${dot}</div>
                <div class="step-label">${label}</div>
              </div>`;
          }).join('')}
        </div>`;
    }

    function render() {
      const selected = rows.find((row) => row.id === selectedId);
      const header = stepperHTML();
      let contentHTML = '';

      if (step === 1) {
        contentHTML = `
          ${header}
          <div class="form-field">
            <label for="rc-user">Employee</label>
            <select id="rc-user" name="rc-user">
              ${changeable.map((row) => `<option value="${row.id}" ${row.id === selectedId ? 'selected' : ''}>${escapeHtml(row.name)} — ${escapeHtml(ROLES[row.role]?.label || row.role)}</option>`).join('')}
            </select>
            <p class="field-hint">Only employees other than your own account can be changed.</p>
          </div>`;
      }

      if (step === 2) {
        contentHTML = `
          ${header}
          ${selected ? `
            <div class="role-compare" style="margin-bottom:16px;">
              <div class="from">
                <span>Current role</span>
                <strong>${escapeHtml(ROLES[selected.role]?.label || selected.role)}</strong>
              </div>
              <div class="arrow">${icon('arrowRight', 20)}</div>
              <div class="to">
                <span>New role</span>
                <strong>${escapeHtml(ROLES[selectedRole]?.label || selectedRole)}</strong>
              </div>
            </div>` : ''}
          <div class="form-field">
            <label for="rc-role">New role</label>
            <select id="rc-role" name="rc-role">
              ${Object.values(ROLES).map((role) => `<option value="${role.key}" ${role.key === selectedRole ? 'selected' : ''}>${role.label}</option>`).join('')}
            </select>
            <p class="field-hint">The employee's sidebar, dashboard and permissions switch to those of the new role.</p>
          </div>`;
      }

      if (step === 3) {
        contentHTML = `
          ${header}
          <div class="callout warning" style="margin-bottom:12px;">${icon('alertTriangle', 15)}<span>Review the change before applying it. The new access takes effect immediately.</span></div>
          <div class="role-compare">
            <div class="from">
              <span>Employee</span>
              <strong>${escapeHtml(selected?.name || '')}</strong>
            </div>
            <div class="arrow">${icon('arrowRight', 20)}</div>
            <div class="to">
              <span>Becomes</span>
              <strong>${escapeHtml(ROLES[selectedRole]?.label || selectedRole)}</strong>
            </div>
          </div>`;
      }

      if (step === 4) {
        contentHTML = `
          ${header}
          <div class="success-panel">
            <div class="success-icon">${icon('check', 22)}</div>
            <h3>Previous access deactivated. New access activated.</h3>
            <p>${escapeHtml(selected?.name || '')} now has <strong>${escapeHtml(ROLES[selectedRole]?.label || selectedRole)}</strong> access. The change is recorded in the activity history.</p>
          </div>`;
      }

      host.innerHTML = contentHTML;

      const buttons = [];
      if (step === 1) {
        buttons.push({ label: 'Cancel', variant: 'secondary', onClick: () => modalEl.close() });
        buttons.push({ label: 'Next: Change Role', id: 'rc-next', variant: 'primary' });
      }
      if (step === 2) {
        buttons.push({ label: 'Back', variant: 'secondary', onClick: () => { step = 1; render(); } });
        buttons.push({ label: 'Next: Save Changes', id: 'rc-next', variant: 'primary' });
      }
      if (step === 3) {
        buttons.push({ label: 'Back', variant: 'secondary', onClick: () => { step = 2; render(); } });
        buttons.push({ label: 'Save Changes', id: 'rc-save', variant: 'primary' });
      }
      if (step === 4) {
        buttons.push({ label: 'Done', id: 'rc-done', variant: 'primary' });
      }

      footer.innerHTML = '';
      buttons.forEach((button) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `btn btn-${button.variant}`;
        if (button.id) btn.id = button.id;
        btn.textContent = button.label;
        btn.addEventListener('click', () => handleStepAction(button.id ?? button.label));
        footer.appendChild(btn);
      });

      host.querySelector('#rc-user')?.addEventListener('change', (event) => {
        selectedId = event.target.value;
        const user = rows.find((row) => row.id === selectedId);
        if (user) {
          selectedRole = user.role === 'sales' ? 'product' : user.role === 'product' ? 'sales' : 'product';
        }
        render();
      });
      host.querySelector('#rc-role')?.addEventListener('change', (event) => {
        selectedRole = event.target.value;
        render();
      });
    }

    async function handleStepAction(id) {
      if (id === 'rc-next' && step === 1) {
        if (!selectedId) { showToast('Choose an employee first.', 'warning'); return; }
        step = 2;
        render();
      } else if (id === 'rc-next' && step === 2) {
        if (!selectedRole) { showToast('Choose a role first.', 'warning'); return; }
        step = 3;
        render();
      } else if (id === 'rc-save') {
        const saveBtn = footer.querySelector('#rc-save');
        saveBtn.disabled = true;
        try {
          const result = await updateUserRole(selectedId, selectedRole);
          // The success panel is only shown once the shared record really holds
          // the new role.
          if (!result?.user || result.user.role !== selectedRole) {
            throw new Error('The role change was not applied.');
          }
          const user = result.user;
          await reload();
          showToast(`${user.name} moved to ${ROLES[result.newRole]?.label || result.newRole}.`, 'success');
          step = 4;
          render();
        } catch (error) {
          showToast(error.message || 'Failed to change role.', 'error');
          if (saveBtn) saveBtn.disabled = false;
        }
      } else if (id === 'rc-done') {
        modalEl.close();
      }
    }
  }

  async function reload() {
    if (cancelled) return;
    try {
      rows = await getUsers();
      table?.setRows?.(rows);
    } catch (error) {
      showToast(error.message || 'Failed to load users.', 'error');
    }
  }

  renderHead();
  loadInitial();

  async function loadInitial() {
    host.innerHTML = `<div class="card"><div class="skeleton" style="height:14px; width:30%; margin-bottom:16px;"></div>${`<div class="skeleton" style="height:44px;"></div><div style="height:10px"></div>`.repeat(8)}</div>`;
    try {
      rows = await getUsers();
      if (cancelled) return;
      host.innerHTML = '';
      table = createDataTable(host, tableConfig());
    } catch (error) {
      if (cancelled) return;
      host.innerHTML = `
        <div class="card">
          <div class="state-box error">
            <div class="state-icon">${icon('alertCircle', 22)}</div>
            <h3>Unable to load users</h3>
            <p>${escapeHtml(error.message || 'Please try again.')}</p>
            <button type="button" class="btn btn-secondary" id="users-retry">${icon('refresh', 15)} Retry</button>
          </div>
        </div>`;
      host.querySelector('#users-retry')?.addEventListener('click', loadInitial);
    }
  }

  return () => {
    cancelled = true;
    table?.destroy?.();
    table = null;
  };
}
