import { getSales, createSale, updateSale } from '../api.js';
import { createDataTable } from '../components/table.js';
import { openModal } from '../components/modal.js';
import { buildForm } from '../components/form.js';
import { detailsGrid, readOnlyNotice } from '../components/cards.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { escapeHtml, formatDate, formatCurrency, isWholeNumber, isNonNegativeNumber, todayISO } from '../utils.js';

export function mount(container, ctx) {
  let cancelled = false;
  let rows = [];
  let table = null;

  const pageEl = document.createElement('div');
  pageEl.innerHTML = `
    <div class="stack-md" style="gap:24px;">
      <div class="page-head" id="sales-head"></div>
      <div id="sales-host"></div>
    </div>`;
  container.appendChild(pageEl);

  const host = pageEl.querySelector('#sales-host');
  const head = pageEl.querySelector('#sales-head');

  function renderHead() {
    head.innerHTML = `
      <div>
        <h1>Sales</h1>
        <p>Sales records captured by the team.</p>
      </div>
      <div class="page-actions">
        ${ctx.hasPermission('sales.create') ? `
          <button type="button" class="btn btn-primary" id="sale-add">
            ${icon('plus', 16)} Add New
          </button>` : readOnlyNotice()}
      </div>`;
    head.querySelector('#sale-add')?.addEventListener('click', () => openSaleModal());
  }

  function columns() {
    return [
      { key: 'id', label: 'Sale ID', className: 'nowrap cell-mono', render: (row) => escapeHtml(row.id), sortValue: (row) => row.id },
      { key: 'date', label: 'Date', className: 'nowrap', render: (row) => formatDate(row.date), sortValue: (row) => row.date },
      { key: 'user', label: 'Salesperson', className: 'nowrap', render: (row) => `<span class="cell-strong">${escapeHtml(row.user)}</span>`, exportValue: (row) => row.user },
      { key: 'items', label: 'Items', className: 'nowrap', render: (row) => String(row.items), sortValue: (row) => Number(row.items) },
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
      searchKeys: ['id', 'user'],
      filters: [],
      dateKey: 'date',
      pageSize: 8,
      initialSort: { key: 'date', dir: 'desc' },
      exportFilename: 'sales-report',
      toolbar: [
        {
          id: 'generate-report',
          label: 'Generate Report',
          icon: 'download',
          variant: 'secondary',
          when: () => ctx.hasPermission('reports.generate'),
          onClick: () => {
            const count = table.exportCSV('sales-report');
            showToast(`Report generated — ${count} records exported to CSV.`, 'success');
          },
        },
      ],
      rowActions: (row) => [
        { id: 'view', label: 'View details', icon: 'eye', onClick: () => openSaleDetails(row) },
        ...(ctx.hasPermission('sales.update') ? [{ id: 'edit', label: 'Edit sale', icon: 'edit', onClick: () => openSaleModal(row) }] : []),
      ],
      emptyState: {
        icon: 'sales',
        title: 'No sales recorded',
        message: 'Sales will appear here once recorded.',
      },
    };
  }

  function openSaleDetails(row) {
    openModal({
      title: `Sale ${row.id}`,
      subtitle: formatDate(row.date),
      content: detailsGrid([
        { label: 'Sale ID', value: `<span class="mono">${escapeHtml(row.id)}</span>` },
        { label: 'Date', value: formatDate(row.date) },
        { label: 'Salesperson', value: escapeHtml(row.user) },
        { label: 'Items', value: row.items },
        { label: 'Total', value: formatCurrency(row.total) },
      ]),
      actions: ctx.hasPermission('sales.update')
        ? [{ label: 'Edit sale', variant: 'primary', onClick: (close) => { close(); openSaleModal(row); } }]
        : [],
    });
  }

  function openSaleModal(existing = null) {
    const salespeople = [...new Set(rows.map((row) => row.user))].sort();
    const fields = [
      { name: 'user', label: 'Salesperson', type: 'select', required: true, options: salespeople.map((u) => ({ value: u, label: u })) },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'items', label: 'Items sold', type: 'number', required: true, step: '1', min: 0 },
      { name: 'total', label: 'Total (₹)', type: 'number', required: true, step: '0.01', min: 0 },
    ];
    const values = existing
      ? { user: existing.user, date: String(existing.date).slice(0, 10), items: existing.items, total: existing.total }
      : { date: todayISO(), items: '', total: '' };

    const form = buildForm(fields, values, { idPrefix: 'sale-form' });

    const modal = openModal({
      title: existing ? 'Edit sale' : 'Add New sale',
      subtitle: existing ? `Editing ${existing.id}` : 'Record a new sale',
      content: form.element,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        { label: existing ? 'Save changes' : 'Create sale', variant: 'primary', onClick: (close) => handleSubmit(close) },
      ],
    });

    async function handleSubmit(close) {
      const vals = form.getValues();
      const errors = {};
      if (!vals.user) errors.user = 'Choose a salesperson.';
      if (!isWholeNumber(vals.items)) errors.items = 'Items must be a whole number of 0 or more.';
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
          user: vals.user,
          date: vals.date,
          items: Number(vals.items),
          total: Number(vals.total),
        };
        if (existing) {
          const updated = await updateSale(existing.id, payload);
          showToast(`Sale ${updated.id} updated.`, 'success');
        } else {
          const created = await createSale(payload);
          showToast(`Sale ${created.id} created.`, 'success');
        }
        close();
        await reload();
      } catch (error) {
        form.clearErrors();
        form.showBanner(error.message || 'Something went wrong.');
        result.focusFirst();
        btn.disabled = false;
      }
    }
  }

  async function reload() {
    if (cancelled) return;
    try {
      rows = await getSales();
      table?.setRows?.(rows);
    } catch (error) {
      showToast(error.message || 'Failed to load sales.', 'error');
    }
  }

  renderHead();
  loadInitial();

  async function loadInitial() {
    host.innerHTML = `<div class="card"><div class="skeleton" style="height:14px; width:30%; margin-bottom:16px;"></div>${`<div class="skeleton" style="height:44px;"></div><div style="height:10px"></div>`.repeat(6)}</div>`;
    try {
      rows = await getSales();
      if (cancelled) return;
      host.innerHTML = '';
      table = createDataTable(host, tableConfig());
    } catch (error) {
      if (cancelled) return;
      host.innerHTML = `
        <div class="card">
          <div class="state-box error">
            <div class="state-icon">${icon('alertCircle', 22)}</div>
            <h3>Unable to load sales</h3>
            <p>${escapeHtml(error.message || 'Please try again.')}</p>
            <button type="button" class="btn btn-secondary" id="sales-retry">${icon('refresh', 15)} Retry</button>
          </div>
        </div>`;
      host.querySelector('#sales-retry')?.addEventListener('click', loadInitial);
    }
  }

  return () => {
    cancelled = true;
    table?.destroy?.();
    table = null;
  };
}
