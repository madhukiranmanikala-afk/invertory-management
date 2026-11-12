import { getStockTransactions, createStockTransaction, updateStockTransaction, getProducts } from '../api.js';
import { createDataTable } from '../components/table.js';
import { openModal } from '../components/modal.js';
import { buildForm } from '../components/form.js';
import { detailsGrid, readOnlyNotice } from '../components/cards.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { escapeHtml, formatDate, formatNumber, isWholeNumber, todayISO } from '../utils.js';

export function mount(container, ctx) {
  let cancelled = false;
  let rows = [];
  let productRows = [];
  let table = null;

  const pageEl = document.createElement('div');
  pageEl.innerHTML = `
    <div class="stack-md" style="gap:24px;">
      <div class="page-head" id="stock-head"></div>
      <div id="stock-host"></div>
    </div>`;
  container.appendChild(pageEl);

  const host = pageEl.querySelector('#stock-host');
  const head = pageEl.querySelector('#stock-head');

  function renderHead() {
    head.innerHTML = `
      <div>
        <h1>Stock</h1>
        <p>Warehouse transactions: stock in, stock out and count adjustments.</p>
      </div>
      <div class="page-actions">
        ${ctx.hasPermission('stock.create') ? `
          <button type="button" class="btn btn-primary" id="stock-add">
            ${icon('plus', 16)} Add New Transaction
          </button>` : readOnlyNotice()}
      </div>`;
    head.querySelector('#stock-add')?.addEventListener('click', () => openStockModal());
  }

  const TYPE_META = {
    in: { label: 'Stock in', badge: 'badge-success', tone: 'success' },
    out: { label: 'Stock out', badge: 'badge-warning', tone: 'warning' },
    adjustment: { label: 'Adjustment', badge: 'badge-info', tone: 'info' },
  };

  function columns() {
    return [
      { key: 'id', label: 'Reference', className: 'nowrap cell-mono', render: (row) => escapeHtml(row.id), sortValue: (row) => row.id },
      { key: 'productName', label: 'Product', className: 'nowrap', render: (row) => `<span class="cell-strong">${escapeHtml(row.productName)}</span>`, sortValue: (row) => row.productName, exportValue: (row) => row.productName },
      {
        key: 'type',
        label: 'Type',
        className: 'nowrap',
        render: (row) => {
          const meta = TYPE_META[row.type] || TYPE_META.in;
          return `<span class="badge ${meta.badge} badge-dot">${meta.label}</span>`;
        },
        sortValue: (row) => row.type,
        exportValue: (row) => TYPE_META[row.type]?.label || row.type,
      },
      { key: 'quantity', label: 'Quantity', className: 'nowrap', render: (row) => formatNumber(row.quantity), sortValue: (row) => Number(row.quantity), exportValue: (row) => row.quantity },
      { key: 'date', label: 'Date', className: 'nowrap', render: (row) => formatDate(row.date), sortValue: (row) => row.date },
      { key: 'user', label: 'Recorded by', className: 'nowrap', exportValue: (row) => row.user, render: (row) => escapeHtml(row.user) },
      {
        key: 'reason',
        label: 'Reason',
        exportValue: (row) => row.reason || '',
        render: (row) => row.type === 'adjustment'
          ? `<span title="${escapeHtml(row.reason)}">${escapeHtml(row.reason.length > 34 ? `${row.reason.slice(0, 34)}…` : row.reason)}</span>`
          : '<span class="subtle">—</span>',
      },
    ];
  }

  function tableConfig() {
    return {
      columns: columns(),
      initialRows: rows,
      searchKeys: ['id', 'productName', 'user', 'reason'],
      filters: [
        {
          key: 'type',
          label: 'Type',
          options: [
            { value: 'in', label: 'Stock in' },
            { value: 'out', label: 'Stock out' },
            { value: 'adjustment', label: 'Adjustment' },
          ],
        },
      ],
      dateKey: 'date',
      pageSize: 8,
      initialSort: { key: 'date', dir: 'desc' },
      exportFilename: 'stock-movements-report',
      toolbar: [
        {
          id: 'generate-report',
          label: 'Generate Report',
          icon: 'download',
          variant: 'secondary',
          when: () => ctx.hasPermission('reports.generate'),
          onClick: () => {
            const count = table.exportCSV('stock-movements');
            showToast(`Report generated — ${count} records exported to CSV.`, 'success');
          },
        },
      ],
      rowActions: (row) => [
        { id: 'view', label: 'View details', icon: 'eye', onClick: () => openStockDetails(row) },
        ...(ctx.hasPermission('stock.update') ? [{ id: 'edit', label: 'Edit transaction', icon: 'edit', onClick: () => openStockModal(row) }] : []),
      ],
      emptyState: {
        icon: 'stock',
        title: 'No stock transactions yet',
        message: 'Stock movements will appear here once recorded.',
      },
    };
  }

  function openStockDetails(row) {
    const meta = TYPE_META[row.type] || TYPE_META.in;
    openModal({
      title: `Transaction ${row.id}`,
      subtitle: formatDate(row.date),
      content: detailsGrid([
        { label: 'Reference', value: `<span class="mono">${escapeHtml(row.id)}</span>` },
        { label: 'Type', value: `<span class="badge ${meta.badge} badge-dot">${meta.label}</span>` },
        { label: 'Product', value: escapeHtml(row.productName) },
        { label: row.type === 'adjustment' ? 'Counted level' : 'Quantity', value: formatNumber(row.quantity) },
        ...(row.type === 'adjustment' ? [{ label: 'Previous quantity', value: formatNumber(row.previousQuantity ?? '') }] : []),
        { label: 'Date', value: formatDate(row.date) },
        { label: 'Recorded by', value: escapeHtml(row.user) },
        ...(row.type === 'adjustment' ? [{ label: 'Reason', value: escapeHtml(row.reason) }] : []),
      ]),
      actions: ctx.hasPermission('stock.update')
        ? [{ label: 'Edit transaction', variant: 'primary', onClick: (close) => { close(); openStockModal(row); } }]
        : [],
    });
  }

  function openStockModal(existing = null) {
    const productOptions = productRows
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((product) => ({ value: product.id, label: `${product.name} — ${product.quantity} on hand` }));

    const fields = [
      { name: 'productId', label: 'Product', type: 'select', required: true, options: productOptions, span: 2 },
      { name: 'type', label: 'Transaction type', type: 'select', required: true, options: [
        { value: 'in', label: 'Stock in' },
        { value: 'out', label: 'Stock out' },
        { value: 'adjustment', label: 'Adjustment (set counted level)' },
      ] },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true, step: '1', min: 0, hint: '' },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'reason', label: 'Reason', type: 'textarea', required: true, span: 2, placeholder: 'Explain why this adjustment is needed…' },
    ];

    const values = existing
      ? {
          productId: existing.productId,
          type: existing.type,
          quantity: existing.quantity,
          date: String(existing.date).slice(0, 10),
          reason: existing.reason || '',
        }
      : { type: 'in', quantity: '', date: todayISO() };

    const form = buildForm(fields, values, { idPrefix: 'stock-form' });

    const quantityField = form.element.querySelector('[name="quantity"]')?.closest('.form-field');
    const hintEl = quantityField?.querySelector('.field-hint');
    const productSelect = form.element.querySelector('[name="productId"]');
    const typeSelect = form.element.querySelector('[name="type"]');
    const reasonWrap = form.element.querySelector('[name="reason"]')?.closest('.form-field');

    function selectedProduct() {
      return productRows.find((product) => product.id === productSelect?.value);
    }

    function syncFields() {
      const type = typeSelect?.value || 'in';
      const product = selectedProduct();

      // Totals hint
      if (type === 'out') {
        if (hintEl) hintEl.textContent = `Available: ${product ? product.quantity : '—'} units. You cannot issue more than available.`;
      } else if (type === 'adjustment') {
        if (hintEl) hintEl.textContent = 'Adjustment sets the counted stock level for this product.';
      } else if (hintEl) {
        hintEl.textContent = 'Units received into the warehouse.';
      }

      // Reason only required for adjustments
      const isAdjustment = type === 'adjustment';
      if (reasonWrap) {
        reasonWrap.classList.toggle('hidden', !isAdjustment);
        reasonWrap.querySelector('.req')?.classList.toggle('hidden', !isAdjustment);
      }
      const reasonInput = form.element.querySelector('[name="reason"]');
      if (reasonInput) reasonInput.required = isAdjustment;

      // Quantity label
      const qtyLabel = quantityField?.querySelector('label');
      if (qtyLabel) {
        qtyLabel.innerHTML = `${isAdjustment ? 'New counted level' : 'Quantity '} <span class="req">*</span>`;
      }
    }

    productSelect?.addEventListener('change', syncFields);
    typeSelect?.addEventListener('change', syncFields);
    syncFields();

    const modal = openModal({
      title: existing ? 'Edit transaction' : 'Add New stock transaction',
      subtitle: existing ? `Editing ${existing.id}` : 'Record a warehouse movement',
      content: form.element,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        {
          label: existing ? 'Save changes' : 'Create transaction',
          variant: 'primary',
          onClick: (close) => handleSubmit(close),
        },
      ],
    });

    async function handleSubmit(close) {
      const vals = form.getValues();
      const type = vals.type;
      const product = selectedProduct();
      const errors = {};
      if (!vals.productId) errors.productId = 'Choose a product.';
      if (!isWholeNumber(vals.quantity)) {
        errors.quantity = 'Quantity must be a whole number of 0 or more.';
      } else if (type === 'out' && product && Number(vals.quantity) > product.quantity) {
        errors.quantity = `Cannot issue ${vals.quantity} units — only ${product.quantity} are available.`;
      }
      if (type === 'adjustment' && !String(vals.reason || '').trim()) {
        errors.reason = 'A reason is required for a stock adjustment.';
      }

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
          productId: vals.productId,
          type,
          quantity: Number(vals.quantity),
          date: vals.date,
          reason: type === 'adjustment' ? vals.reason.trim() : undefined,
        };
        if (existing) {
          const updated = await updateStockTransaction(existing.id, payload);
          showToast(`Transaction ${updated.id} updated.`, 'success');
        } else {
          const created = await createStockTransaction(payload);
          showToast(`Transaction ${created.id} recorded.`, 'success');
        }
        close();
        await reload();
      } catch (error) {
        form.clearErrors();
        const msg = error.message || 'Something went wrong.';
        if (/units|quantity/i.test(msg)) form.setError('quantity', msg);
        else if (/reason/i.test(msg)) form.setError('reason', msg);
        else form.showBanner(msg);
        btn.disabled = false;
      }
    }
  }

  async function reload() {
    if (cancelled) return;
    try {
      const [transactions, products] = await Promise.all([getStockTransactions(), getProducts()]);
      rows = transactions;
      productRows = products;
      table?.setRows?.(rows);
    } catch (error) {
      showToast(error.message || 'Failed to load stock.', 'error');
    }
  }

  renderHead();
  loadInitial();

  async function loadInitial() {
    host.innerHTML = `<div class="card"><div class="skeleton" style="height:14px; width:30%; margin-bottom:16px;"></div>${`<div class="skeleton" style="height:44px;"></div><div style="height:10px"></div>`.repeat(6)}</div>`;
    try {
      const [transactions, products] = await Promise.all([getStockTransactions(), getProducts()]);
      if (cancelled) return;
      rows = transactions;
      productRows = products;
      host.innerHTML = '';
      table = createDataTable(host, tableConfig());
    } catch (error) {
      if (cancelled) return;
      host.innerHTML = `
        <div class="card">
          <div class="state-box error">
            <div class="state-icon">${icon('alertCircle', 22)}</div>
            <h3>Unable to load stock</h3>
            <p>${escapeHtml(error.message || 'Please try again.')}</p>
            <button type="button" class="btn btn-secondary" id="stock-retry">${icon('refresh', 15)} Retry</button>
          </div>
        </div>`;
      host.querySelector('#stock-retry')?.addEventListener('click', loadInitial);
    }
  }

  return () => {
    cancelled = true;
    table?.destroy?.();
    table = null;
  };
}
