import { getOrders, createOrder, updateOrder, updateOrderStatus } from '../api.js';
import { createDataTable } from '../components/table.js';
import { openModal, confirmDialog } from '../components/modal.js';
import { buildForm } from '../components/form.js';
import { statusBadge, detailsGrid, readOnlyNotice } from '../components/cards.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { escapeHtml, formatDate, formatCurrency, isNonNegativeNumber, todayISO, statusTone } from '../utils.js';

const STATUSES = ['New', 'Processing', 'Completed', 'Cancelled'];

export function mount(container, ctx) {
  let cancelled = false;
  let rows = [];
  let table = null;

  const pageEl = document.createElement('div');
  pageEl.innerHTML = `
    <div class="stack-md" style="gap:24px;">
      <div class="page-head" id="orders-head"></div>
      <div id="orders-host"></div>
    </div>`;
  container.appendChild(pageEl);

  const host = pageEl.querySelector('#orders-host');
  const head = pageEl.querySelector('#orders-head');

  function renderHead() {
    head.innerHTML = `
      <div>
        <h1>Orders</h1>
        <p>Customer orders and their fulfilment status.</p>
      </div>
      <div class="page-actions">
        ${ctx.hasPermission('orders.create') ? `
          <button type="button" class="btn btn-primary" id="order-add">
            ${icon('plus', 16)} Add New Order
          </button>` : readOnlyNotice()}
      </div>`;
    head.querySelector('#order-add')?.addEventListener('click', () => openOrderModal());
  }

  function columns() {
    return [
      { key: 'id', label: 'Order', className: 'nowrap cell-mono', render: (row) => escapeHtml(row.id), sortValue: (row) => row.id },
      { key: 'customer', label: 'Customer', className: 'nowrap', render: (row) => `<span class="cell-strong">${escapeHtml(row.customer)}</span>`, sortValue: (row) => row.customer, exportValue: (row) => row.customer },
      { key: 'date', label: 'Date', className: 'nowrap', render: (row) => formatDate(row.date), sortValue: (row) => row.date },
      {
        key: 'status',
        label: 'Status',
        className: 'nowrap',
        render: (row) => statusBadge(statusTone(row.status), row.status),
        sortValue: (row) => row.status,
        exportValue: (row) => row.status,
      },
      {
        key: 'total',
        label: 'Total',
        className: 'nowrap',
        render: (row) => `<span class="cell-strong">${formatCurrency(row.total)}</span>`,
        sortValue: (row) => Number(row.total),
        exportValue: (row) => row.total,
      },
    ];
  }

  function tableConfig() {
    return {
      columns: columns(),
      initialRows: rows,
      searchKeys: ['id', 'customer', 'status'],
      filters: [
        { key: 'status', label: 'Status', options: STATUSES.map((s) => ({ value: s, label: s })) },
      ],
      dateKey: 'date',
      pageSize: 8,
      initialSort: { key: 'date', dir: 'desc' },
      exportFilename: 'orders-report',
      toolbar: [
        {
          id: 'generate-report',
          label: 'Generate Report',
          icon: 'download',
          variant: 'secondary',
          when: () => ctx.hasPermission('reports.generate'),
          onClick: () => {
            const count = table.exportCSV('orders-report');
            showToast(`Report generated — ${count} records exported to CSV.`, 'success');
          },
        },
      ],
      rowActions: (row) => [
        { id: 'view', label: 'View details', icon: 'eye', onClick: () => openDetails(row) },
        ...(ctx.hasPermission('orders.update') ? [{ id: 'edit', label: 'Edit order', icon: 'edit', onClick: () => openOrderModal(row) }] : []),
        ...(ctx.hasPermission('orders.status') ? [{ id: 'status', label: 'Change status', icon: 'refresh', onClick: () => openStatusModal(row) }] : []),
      ],
      emptyState: {
        icon: 'orders',
        title: 'No orders yet',
        message: 'Customer orders will appear here once received.',
      },
    };
  }

  function openDetails(row) {
    openModal({
      title: `Order ${row.id}`,
      subtitle: formatDate(row.date),
      content: detailsGrid([
        { label: 'Order', value: `<span class="mono">${escapeHtml(row.id)}</span>` },
        { label: 'Customer', value: escapeHtml(row.customer) },
        { label: 'Date', value: formatDate(row.date) },
        { label: 'Status', value: statusBadge(statusTone(row.status), row.status) },
        { label: 'Total', value: formatCurrency(row.total) },
      ]),
      actions: [
        ...(ctx.hasPermission('orders.update') ? [{ label: 'Edit order', variant: 'secondary', onClick: (close) => { close(); openOrderModal(row); } }] : []),
        ...(ctx.hasPermission('orders.status') ? [{ label: 'Change status', variant: 'primary', onClick: (close) => { close(); openStatusModal(row); } }] : []),
      ],
    });
  }

  function openOrderModal(existing = null) {
    const fields = [
      { name: 'customer', label: 'Customer', type: 'text', required: true, placeholder: 'e.g. Northwind Retail', span: 2 },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'select', required: true, options: STATUSES.map((s) => ({ value: s, label: s })) },
      { name: 'total', label: 'Total value (₹)', type: 'number', required: true, step: '0.01', min: 0, span: 2 },
    ];
    const values = existing
      ? { customer: existing.customer, date: String(existing.date).slice(0, 10), status: existing.status, total: existing.total }
      : { date: todayISO(), status: 'New', total: '' };

    const form = buildForm(fields, values, { idPrefix: 'order-form' });

    const modal = openModal({
      title: existing ? 'Edit order' : 'Add New order',
      subtitle: existing ? `Editing ${existing.id}` : 'Record a new customer order',
      content: form.element,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        { label: existing ? 'Save changes' : 'Create order', variant: 'primary', onClick: (close) => handleSubmit(close) },
      ],
    });

    async function handleSubmit(close) {
      const vals = form.getValues();
      const errors = {};
      if (!vals.customer?.trim()) errors.customer = 'Customer is required.';
      if (!isNonNegativeNumber(vals.total)) errors.total = 'Total must be a number of 0 or more.';

      form.clearErrors();
      const result = form.validateRequired(errors);
      if (!result.valid) {
        result.focusFirst();
        return;
      }
      const btn = modal.element.querySelector('.modal-foot .btn-primary');
      btn.disabled = true;
      try {
        const payload = {
          customer: vals.customer.trim(),
          date: vals.date,
          status: vals.status,
          total: Number(vals.total),
        };
        if (existing) {
          const updated = await updateOrder(existing.id, payload);
          showToast(`Order ${updated.id} updated.`, 'success');
        } else {
          const created = await createOrder(payload);
          showToast(`Order ${created.id} created.`, 'success');
        }
        close();
        await reload();
      } catch (error) {
        form.clearErrors();
        const msg = error.message || 'Something went wrong.';
        if (/total/i.test(msg)) form.setError('total', msg);
        else if (/customer/i.test(msg)) form.setError('customer', msg);
        else form.showBanner(msg);
        btn.disabled = false;
      }
    }
  }

  function openStatusModal(row) {
    const fields = [
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: STATUSES.map((status) => ({ value: status, label: status })),
        span: 2,
        hint: 'New orders sit in the queue; Processing means the warehouse is preparing them; Completed means delivered; Cancelled closes them out.',
      },
    ];
    const form = buildForm(fields, { status: row.status }, { idPrefix: 'order-status-form' });

    const modal = openModal({
      title: 'Change order status',
      subtitle: `${row.id} · ${row.customer}`,
      content: form.element,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        { label: 'Change status', variant: 'primary', onClick: (close) => handleSubmit(close) },
      ],
    });

    async function handleSubmit(close) {
      const vals = form.getValues();
      const next = vals.status;
      if (next === row.status) {
        modal.close();
        return;
      }
      form.clearErrors();
      const result = form.validateRequired({});
      if (!result.valid) return;

      if (next === 'Cancelled') {
        const confirmed = await confirmDialog({
          title: 'Cancel this order?',
          message: `Mark order ${row.id} for ${row.customer} as Cancelled? This closes the order.`,
          confirmLabel: 'Cancel order',
          danger: true,
        });
        if (!confirmed) return;
      }

      const btn = modal.element.querySelector('.modal-foot .btn-primary');
      btn.disabled = true;
      try {
        const updated = await updateOrderStatus(row.id, next);
        showToast(`Order ${updated.id} moved to ${updated.status}.`, 'success');
        close();
        await reload();
      } catch (error) {
        form.clearErrors();
        form.showBanner(error.message || 'Something went wrong.');
        btn.disabled = false;
      }
    }
  }

  async function reload() {
    if (cancelled) return;
    try {
      rows = await getOrders();
      table?.setRows?.(rows);
    } catch (error) {
      showToast(error.message || 'Failed to load orders.', 'error');
    }
  }

  renderHead();
  loadInitial();

  async function loadInitial() {
    host.innerHTML = `<div class="card"><div class="skeleton" style="height:14px; width:30%; margin-bottom:16px;"></div>${`<div class="skeleton" style="height:44px;"></div><div style="height:10px"></div>`.repeat(6)}</div>`;
    try {
      rows = await getOrders();
      if (cancelled) return;
      host.innerHTML = '';
      table = createDataTable(host, tableConfig());
    } catch (error) {
      if (cancelled) return;
      host.innerHTML = `
        <div class="card">
          <div class="state-box error">
            <div class="state-icon">${icon('alertCircle', 22)}</div>
            <h3>Unable to load orders</h3>
            <p>${escapeHtml(error.message || 'Please try again.')}</p>
            <button type="button" class="btn btn-secondary" id="orders-retry">${icon('refresh', 15)} Retry</button>
          </div>
        </div>`;
      host.querySelector('#orders-retry')?.addEventListener('click', loadInitial);
    }
  }

  return () => {
    cancelled = true;
    table?.destroy?.();
    table = null;
  };
}
