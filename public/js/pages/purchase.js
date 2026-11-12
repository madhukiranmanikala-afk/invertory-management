import { getPurchaseOrders, getSuppliers, createPurchaseOrder, updatePurchaseOrder, receivePurchaseOrder } from '../api.js';
import { createDataTable } from '../components/table.js';
import { openModal, confirmDialog } from '../components/modal.js';
import { buildForm } from '../components/form.js';
import { statusBadge, progressLine, detailsGrid, readOnlyNotice } from '../components/cards.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { escapeHtml, formatDate, formatCurrency, formatNumber, isWholeNumber, isNonNegativeNumber, todayISO } from '../utils.js';

export function mount(container, ctx) {
  let cancelled = false;
  let rows = [];
  let supplierRows = [];
  let table = null;

  const pageEl = document.createElement('div');
  pageEl.innerHTML = `
    <div class="stack-md" style="gap:24px;">
      <div class="page-head" id="purchase-head"></div>
      <div id="purchase-host"></div>
    </div>`;
  container.appendChild(pageEl);

  const host = pageEl.querySelector('#purchase-host');
  const head = pageEl.querySelector('#purchase-head');

  function renderHead() {
    head.innerHTML = `
      <div>
        <h1>Purchase</h1>
        <p>Purchase orders raised with suppliers and their receipt progress.</p>
      </div>
      <div class="page-actions">
        ${ctx.hasPermission('purchases.create') ? `
          <button type="button" class="btn btn-primary" id="po-add">
            ${icon('plus', 16)} Add New Order
          </button>` : readOnlyNotice()}
      </div>`;
    head.querySelector('#po-add')?.addEventListener('click', () => openPurchaseModal());
  }

  function columns() {
    return [
      { key: 'id', label: 'Order', className: 'nowrap cell-mono', render: (row) => escapeHtml(row.id), sortValue: (row) => row.id },
      { key: 'supplier', label: 'Supplier', className: 'nowrap', render: (row) => `<span class="cell-strong">${escapeHtml(row.supplier)}</span>`, sortValue: (row) => row.supplier, exportValue: (row) => row.supplier },
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
      {
        key: 'receipt',
        label: 'Receipt',
        className: 'nowrap',
        sortable: false,
        render: (row) => progressLine(row.qtyReceived, row.qtyOrdered),
        exportValue: (row) => `${row.qtyReceived}/${row.qtyOrdered}`,
      },
    ];
  }

  function statusTone(status) {
    if (status === 'Received') return 'success';
    if (status === 'Partially Received') return 'info';
    return 'warning';
  }

  function tableConfig() {
    return {
      columns: columns(),
      initialRows: rows,
      searchKeys: ['id', 'supplier', 'status'],
      filters: [
        {
          key: 'status',
          label: 'Status',
          options: ['Pending', 'Partially Received', 'Received'].map((s) => ({ value: s, label: s })),
        },
      ],
      dateKey: 'date',
      pageSize: 8,
      initialSort: { key: 'date', dir: 'desc' },
      exportFilename: 'purchase-orders-report',
      toolbar: [
        {
          id: 'generate-report',
          label: 'Generate Report',
          icon: 'download',
          variant: 'secondary',
          when: () => ctx.hasPermission('reports.generate'),
          onClick: () => {
            const count = table.exportCSV('purchase-orders');
            showToast(`Report generated — ${count} records exported to CSV.`, 'success');
          },
        },
      ],
      rowActions: (row) => [
        { id: 'view', label: 'View details', icon: 'eye', onClick: () => openDetails(row) },
        ...(ctx.hasPermission('purchases.update') ? [{ id: 'edit', label: 'Edit order', icon: 'edit', onClick: () => openPurchaseModal(row) }] : []),
        ...(ctx.hasPermission('purchases.receive') && row.status !== 'Received'
          ? [{ id: 'receive', label: 'Receive stock', icon: 'download', onClick: () => openReceiveModal(row) }]
          : []),
      ],
      emptyState: {
        icon: 'purchase',
        title: 'No purchase orders yet',
        message: 'Purchase orders will appear here once raised.',
      },
    };
  }

  function openDetails(row) {
    openModal({
      title: `Purchase order ${row.id}`,
      subtitle: row.supplier,
      content: detailsGrid([
        { label: 'Order', value: `<span class="mono">${escapeHtml(row.id)}</span>` },
        { label: 'Supplier', value: escapeHtml(row.supplier) },
        { label: 'Date', value: formatDate(row.date) },
        { label: 'Status', value: statusBadge(statusTone(row.status), row.status) },
        { label: 'Order quantity', value: formatNumber(row.qtyOrdered) },
        { label: 'Received quantity', value: formatNumber(row.qtyReceived) },
        { label: 'Receipt progress', value: progressLine(row.qtyReceived, row.qtyOrdered) },
        { label: 'Total', value: formatCurrency(row.total) },
      ]),
      actions: [
        ...(ctx.hasPermission('purchases.update') ? [{ label: 'Edit order', variant: 'secondary', onClick: (close) => { close(); openPurchaseModal(row); } }] : []),
        ...(ctx.hasPermission('purchases.receive') && row.status !== 'Received'
          ? [{ label: 'Receive stock', variant: 'primary', onClick: (close) => { close(); openReceiveModal(row); } }]
          : []),
      ],
    });
  }

  function openPurchaseModal(existing = null) {
    const fields = [
      { name: 'supplierId', label: 'Supplier', type: 'select', required: true, options: supplierRows.map((s) => ({ value: s.id, label: s.name })) },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'qtyOrdered', label: 'Order quantity', type: 'number', required: true, step: '1', min: 0, hint: 'Total units ordered from the supplier.' },
      { name: 'total', label: 'Total value (₹)', type: 'number', required: true, step: '0.01', min: 0 },
      { name: 'status', label: 'Status', type: 'text', readonly: true, span: 2 },
    ];
    const values = existing
      ? {
          supplierId: existing.supplierId,
          date: String(existing.date).slice(0, 10),
          qtyOrdered: existing.qtyOrdered,
          total: existing.total,
          status: `${existing.status} — updates automatically as you receive stock.`,
        }
      : {
          date: todayISO(),
          qtyOrdered: '',
          total: '',
          status: 'New orders start as Pending.',
        };

    const form = buildForm(fields, values, { idPrefix: 'purchase-form' });

    const modal = openModal({
      title: existing ? 'Edit purchase order' : 'Add New purchase order',
      subtitle: existing ? `Editing ${existing.id}` : 'Raise a new purchase order',
      content: form.element,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        { label: existing ? 'Save changes' : 'Create order', variant: 'primary', onClick: (close) => handleSubmit(close) },
      ],
    });

    async function handleSubmit(close) {
      const vals = form.getValues();
      const errors = {};
      if (!vals.supplierId) errors.supplierId = 'Choose a supplier.';
      if (!isWholeNumber(vals.qtyOrdered)) errors.qtyOrdered = 'Order quantity must be a whole number of 0 or more.';
      if (existing && isWholeNumber(vals.qtyOrdered) && Number(vals.qtyOrdered) < existing.qtyReceived) {
        errors.qtyOrdered = `Order quantity cannot be lower than the ${existing.qtyReceived} units already received.`;
      }
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
          supplierId: vals.supplierId,
          date: vals.date,
          qtyOrdered: Number(vals.qtyOrdered),
          total: Number(vals.total),
        };
        if (existing) {
          const updated = await updatePurchaseOrder(existing.id, payload);
          showToast(`Purchase order ${updated.id} updated.`, 'success');
        } else {
          const created = await createPurchaseOrder(payload);
          showToast(`Purchase order ${created.id} created.`, 'success');
        }
        close();
        await reload();
      } catch (error) {
        form.clearErrors();
        const msg = error.message || 'Something went wrong.';
        if (/quantity/i.test(msg)) form.setError('qtyOrdered', msg);
        else if (/total/i.test(msg)) form.setError('total', msg);
        else if (/supplier/i.test(msg)) form.setError('supplierId', msg);
        else form.showBanner(msg);
        btn.disabled = false;
      }
    }
  }

  function openReceiveModal(row) {
    const remaining = row.qtyOrdered - row.qtyReceived;
    const fields = [
      { name: 'quantity', label: 'Quantity received now', type: 'number', required: true, step: '1', min: 1, hint: `${remaining} units still due from ${formatNumber(row.qtyOrdered)} ordered.`, span: 2 },
    ];
    const form = buildForm(fields, { quantity: String(remaining) }, { idPrefix: 'receive-form' });

    const modal = openModal({
      title: 'Receive stock',
      subtitle: `${row.id} · ${row.supplier}`,
      content: form.element,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        { label: 'Confirm receipt', variant: 'primary', onClick: (close) => handleSubmit(close) },
      ],
    });

    async function handleSubmit(close) {
      const vals = form.getValues();
      const errors = {};
      const qty = Number(vals.quantity);
      if (!isWholeNumber(qty) || qty <= 0) errors.quantity = 'Received quantity must be a whole number greater than 0.';
      else if (qty > remaining) errors.quantity = `Received quantity exceeds the ${remaining} units still due.`;

      form.clearErrors();
      const result = form.validateRequired(errors);
      if (!result.valid) {
        result.focusFirst();
        return;
      }

      const confirmed = await confirmDialog({
        title: 'Confirm receipt',
        message: `Record receipt of ${qty} unit${qty === 1 ? '' : 's'} for ${row.id} from ${row.supplier}?`,
        confirmLabel: 'Confirm',
      });
      if (!confirmed) return;

      const btn = modal.element.querySelector('.modal-foot .btn-primary');
      btn.disabled = true;
      try {
        const updated = await receivePurchaseOrder(row.id, qty);
        const statusText = updated.status === 'Received'
          ? `Purchase order ${updated.id} is now fully Received.`
          : `Received ${qty} units — ${updated.status}.`;
        showToast(statusText, 'success');
        close();
        await reload();
      } catch (error) {
        form.clearErrors();
        const msg = error.message || 'Something went wrong.';
        form.setError('quantity', msg);
        btn.disabled = false;
      }
    }
  }

  async function reload() {
    if (cancelled) return;
    try {
      const [orders, suppliers] = await Promise.all([getPurchaseOrders(), getSuppliers()]);
      rows = orders;
      supplierRows = suppliers;
      table?.setRows?.(rows);
    } catch (error) {
      showToast(error.message || 'Failed to load purchase orders.', 'error');
    }
  }

  renderHead();
  loadInitial();

  async function loadInitial() {
    host.innerHTML = `<div class="card"><div class="skeleton" style="height:14px; width:30%; margin-bottom:16px;"></div>${`<div class="skeleton" style="height:44px;"></div><div style="height:10px"></div>`.repeat(6)}</div>`;
    try {
      const [orders, suppliers] = await Promise.all([getPurchaseOrders(), getSuppliers()]);
      if (cancelled) return;
      rows = orders;
      supplierRows = suppliers;
      host.innerHTML = '';
      table = createDataTable(host, tableConfig());
    } catch (error) {
      if (cancelled) return;
      host.innerHTML = `
        <div class="card">
          <div class="state-box error">
            <div class="state-icon">${icon('alertCircle', 22)}</div>
            <h3>Unable to load purchase orders</h3>
            <p>${escapeHtml(error.message || 'Please try again.')}</p>
            <button type="button" class="btn btn-secondary" id="purchase-retry">${icon('refresh', 15)} Retry</button>
          </div>
        </div>`;
      host.querySelector('#purchase-retry')?.addEventListener('click', loadInitial);
    }
  }

  return () => {
    cancelled = true;
    table?.destroy?.();
    table = null;
  };
}
