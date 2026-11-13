import { getProducts, getProductCategories, createProduct, updateProduct } from '../api.js';
import { createDataTable } from '../components/table.js';
import { openModal } from '../components/modal.js';
import { buildForm } from '../components/form.js';
import { statusBadge, detailsGrid, readOnlyNotice } from '../components/cards.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { statusTone, stockAvailability, escapeHtml, formatCurrency, isNonNegativeNumber, isWholeNumber } from '../utils.js';

let table = null;

export function mount(container, ctx) {
  let cancelled = false;
  let rows = [];
  let categories = [];

  const AVAILABILITY_RANK = { Low: 0, Medium: 1, High: 2 };
  const AVAILABILITY_TONE = { High: 'success', Medium: 'warning', Low: 'danger' };
  const availabilityBadge = (level) => statusBadge(AVAILABILITY_TONE[level], level);

  const pageEl = document.createElement('div');
  pageEl.innerHTML = `
    <div class="stack-md" style="gap:24px;">
      <div class="page-head" id="products-head"></div>
      <div id="products-host"></div>
    </div>
  `;
  container.appendChild(pageEl);

  const host = pageEl.querySelector('#products-host');
  const head = pageEl.querySelector('#products-head');

  function renderHead() {
    const canOverrideEdit = ctx.hasPermission('products.update.owner');
    head.innerHTML = `
      <div>
        <h1>Products</h1>
        <p>Manage product records, stock levels and pricing.</p>
      </div>
      <div class="page-actions">
        ${ctx.hasPermission('products.create') ? `
          <button type="button" class="btn btn-primary" id="product-add">
            ${icon('plus', 16)} Add New
          </button>` : `${readOnlyNotice()}${canOverrideEdit ? `
          <button type="button" class="btn btn-primary" id="product-edit">
            ${icon('edit', 16)} Edit
          </button>` : ''}`}
      </div>`;
    head.querySelector('#product-add')?.addEventListener('click', () => openProductModal());
    head.querySelector('#product-edit')?.addEventListener('click', () => openOwnerEditModal());
  }

  function columns() {
    return [
      {
        key: 'name',
        label: 'Product',
        className: 'nowrap',
        render: (row) => `
          <div class="cell-with-sub">
            <div>
              <span class="cell-strong">${escapeHtml(row.name)}</span>
              <span class="cell-sub">${escapeHtml(row.sku)}</span>
            </div>
          </div>`,
        sortValue: (row) => row.name.toLowerCase(),
        exportValue: (row) => `${row.name} (${row.sku})`,
      },
      { key: 'category', label: 'Category', className: 'nowrap' },
      {
        key: 'price',
        label: 'Price',
        className: 'nowrap',
        render: (row) => formatCurrency(row.price),
        sortValue: (row) => Number(row.price),
      },
      { key: 'quantity', label: 'Qty', className: 'nowrap', render: (row) => String(row.quantity), sortValue: (row) => Number(row.quantity) },
      { key: 'minLevel', label: 'Min Level', className: 'nowrap', render: (row) => String(row.minLevel), sortValue: (row) => Number(row.minLevel), exportValue: (row) => String(row.minLevel) },
      {
        key: 'availability',
        label: 'Availability',
        className: 'nowrap',
        render: (row) => availabilityBadge(stockAvailability(row.quantity, row.minLevel)),
        sortValue: (row) => AVAILABILITY_RANK[stockAvailability(row.quantity, row.minLevel)],
        exportValue: (row) => stockAvailability(row.quantity, row.minLevel),
      },
      {
        key: 'status',
        label: 'Status',
        className: 'nowrap',
        render: (row) => statusBadge(statusTone(row.status), row.status),
        sortValue: (row) => row.status,
        exportValue: (row) => row.status,
      },
    ];
  }

  function tableConfig() {
    return {
      columns: columns(),
      initialRows: rows,
      searchKeys: ['name', 'sku', 'category', 'status'],
      filters: [
        { key: 'status', label: 'Status', options: ['In Stock', 'Low Stock', 'Out of Stock'].map((s) => ({ value: s, label: s })) },
        {
          key: 'category',
          label: 'Category',
          options: () => [...new Set(rows.map((row) => row.category))].sort().map((c) => ({ value: c, label: c })),
        },
      ],
      pageSize: 8,
      exportFilename: 'products-report',
      initialSort: { key: 'name', dir: 'asc' },
      toolbar: [
        {
          id: 'generate-report',
          label: 'Generate Report',
          icon: 'download',
          variant: 'secondary',
          when: () => ctx.hasPermission('reports.generate'),
          onClick: () => {
            const count = table.exportCSV('products-report');
            showToast(`Report generated — ${count} records exported to CSV.`, 'success');
          },
        },
      ],
      rowActions: (row) => [
        { id: 'view', label: 'View details', icon: 'eye', onClick: () => openProductDetails(row) },
        ...(ctx.hasPermission('products.update') ? [{ id: 'edit', label: 'Edit product', icon: 'edit', onClick: () => openProductModal(row) }] : []),
      ],
      emptyState: {
        icon: 'box',
        title: 'No products yet',
        message: ctx.hasPermission('products.create') ? 'Add your first product to get started.' : 'No product records to display.',
      },
    };
  }

  function validate(values) {
    const errors = {};
    if (!values.name?.trim()) errors.name = 'Product name is required.';
    if (!values.sku?.trim()) errors.sku = 'SKU is required.';
    if (!values.category) errors.category = 'Choose a category.';
    if (!isNonNegativeNumber(values.price)) errors.price = 'Price must be a number of 0 or more.';
    if (!isWholeNumber(values.quantity)) errors.quantity = 'Quantity must be a whole number of 0 or more.';
    if (!isWholeNumber(values.minLevel)) errors.minLevel = 'Minimum level must be a whole number of 0 or more.';
    return errors;
  }

  function computedStatus(quantity, minLevel) {
    const qty = Number(quantity) || 0;
    const min = Number(minLevel) || 0;
    if (qty <= 0) return 'Out of Stock';
    if (qty <= min) return 'Low Stock';
    return 'In Stock';
  }

  function openProductDetails(row) {
    openModal({
      title: row.name,
      subtitle: row.sku,
      size: 'md',
      content: `
        ${detailsGrid([
          { label: 'Product name', value: row.name },
          { label: 'SKU', value: `<span class="mono">${escapeHtml(row.sku)}</span>` },
          { label: 'Category', value: escapeHtml(row.category) },
          { label: 'Unit price', value: formatCurrency(row.price) },
          { label: 'Quantity on hand', value: row.quantity },
          { label: 'Minimum stock level', value: row.minLevel },
          { label: 'Availability', value: availabilityBadge(stockAvailability(row.quantity, row.minLevel)) },
          { label: 'Status', value: statusBadge(statusTone(row.status), row.status) },
        ])}
      `,
      actions: [
        ...(ctx.hasPermission('products.update') ? [{ label: 'Edit product', variant: 'primary', onClick: (close) => { close(); openProductModal(row); } }] : []),
      ],
    });
  }

  /**
   * Owner-only override: the read-only product screen can be switched into an
   * editable form so the Owner can correct any product record.
   */
  function openOwnerEditModal() {
    if (!rows.length) {
      showToast('There are no products to edit yet.', 'error');
      return;
    }

    const fields = [
      { name: 'productId', label: 'Product', type: 'select', required: true, span: 2, options: rows.map((row) => ({ value: row.id, label: `${row.name} — ${row.sku}` })) },
      { name: 'name', label: 'Product name', type: 'text', required: true, placeholder: 'e.g. Aurora Desk Lamp' },
      { name: 'sku', label: 'SKU', type: 'text', required: true, placeholder: 'e.g. ELEC-1010' },
      { name: 'category', label: 'Category', type: 'select', required: true, options: categories.map((c) => ({ value: c, label: c })) },
      { name: 'price', label: 'Price (₹)', type: 'number', required: true, step: '0.01', min: 0 },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true, step: '1', min: 0 },
      { name: 'minLevel', label: 'Minimum stock level', type: 'number', required: true, step: '1', min: 0 },
      { name: 'status', label: 'Status preview', type: 'text', readonly: true, span: 2 },
    ];

    const valuesFor = (product) => ({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      quantity: product.quantity,
      minLevel: product.minLevel,
      status: product.status,
    });

    const form = buildForm(fields, valuesFor(rows[0]), { idPrefix: 'owner-product-form' });
    const statusInput = form.element.querySelector('[name="status"]');
    const previewInput = (name) => form.element.querySelector(`[name="${name}"]`);
    const updateStatusPreview = () => {
      const status = computedStatus(previewInput('quantity')?.value, previewInput('minLevel')?.value);
      if (statusInput) statusInput.value = status;
    };
    ['quantity', 'minLevel'].forEach((name) => form.element.querySelector(`[name="${name}"]`)?.addEventListener('input', updateStatusPreview));

    // Switching the product loads that product's current values into the form.
    previewInput('productId')?.addEventListener('change', (event) => {
      const product = rows.find((row) => row.id === event.target.value);
      if (!product) return;
      form.setValues(valuesFor(product));
      updateStatusPreview();
      form.clearErrors();
    });

    const modalForm = openModal({
      title: 'Edit product',
      subtitle: 'Owner override — update any product record',
      size: 'lg',
      content: form.element,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        { label: 'Save changes', variant: 'primary', onClick: (close) => handleSubmit(close) },
      ],
    });

    async function handleSubmit(close) {
      const vals = form.getValues();
      const errors = validate(vals);
      form.clearErrors();
      const result = form.validateRequired(errors);
      if (!result.valid) {
        result.focusFirst();
        const modalBody = modalForm?.modal?.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTop = 0;
        return;
      }
      const payload = {
        name: vals.name.trim(),
        sku: vals.sku.trim(),
        category: vals.category,
        price: Number(vals.price),
        quantity: Number(vals.quantity),
        minLevel: Number(vals.minLevel),
      };
      const submitBtn = modalForm.element.querySelector('.modal-foot .btn-primary');
      submitBtn.disabled = true;
      try {
        const updated = await updateProduct(vals.productId, payload);
        showToast(`Product "${updated.name}" updated.`, 'success');
        close();
        await reload();
      } catch (error) {
        showToast(error.message || 'Something went wrong.', 'error');
        form.clearErrors();
        handleApiErrors(form, error);
        result.focusFirst();
        submitBtn.disabled = false;
      }
    }
  }

  function openProductModal(existing = null) {
    const fields = [
      { name: 'name', label: 'Product name', type: 'text', required: true, placeholder: 'e.g. Aurora Desk Lamp' },
      { name: 'sku', label: 'SKU', type: 'text', required: true, placeholder: 'e.g. ELEC-1010' },
      { name: 'category', label: 'Category', type: 'select', required: true, options: categories.map((c) => ({ value: c, label: c })) },
      { name: 'price', label: 'Price (₹)', type: 'number', required: true, step: '0.01', min: 0 },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true, step: '1', min: 0 },
      { name: 'minLevel', label: 'Minimum stock level', type: 'number', required: true, step: '1', min: 0 },
      { name: 'status', label: 'Status preview', type: 'text', readonly: true, span: 2 },
    ];
    const values = existing
      ? {
          name: existing.name,
          sku: existing.sku,
          category: existing.category,
          price: existing.price,
          quantity: existing.quantity,
          minLevel: existing.minLevel,
          status: existing.status,
        }
      : { price: 0, quantity: 0, minLevel: 0, status: computedStatus(0, 0) };

    const form = buildForm(fields, values, { idPrefix: 'product-form' });
    const statusInput = form.element.querySelector('[name="status"]');
    const previewInput = (name) => form.element.querySelector(`[name="${name}"]`);
    const updateStatusPreview = () => {
      const status = computedStatus(previewInput('quantity')?.value, previewInput('minLevel')?.value);
      if (statusInput) statusInput.value = status;
    };
    ['quantity', 'minLevel'].forEach((name) => form.element.querySelector(`[name="${name}"]`)?.addEventListener('input', updateStatusPreview));

    const modalForm = openModal({
      title: existing ? 'Edit product' : 'Add New product',
      subtitle: existing ? `Editing ${existing.name} (${existing.sku})` : 'Create a new product record',
      size: 'lg',
      content: form.element,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        {
          label: existing ? 'Save changes' : 'Create product',
          variant: 'primary',
          onClick: (close) => handleSubmit(close),
        },
      ],
      onClose: () => {},
    });

    async function handleSubmit(close) {
      const vals = form.getValues();
      const errors = validate(vals);
      form.clearErrors();
      const result = form.validateRequired(errors);
      if (!result.valid) {
        result.focusFirst();
        const modalBody = modalForm?.modal?.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTop = 0;
        return;
      }
      const payload = {
        name: vals.name.trim(),
        sku: vals.sku.trim(),
        category: vals.category,
        price: Number(vals.price),
        quantity: Number(vals.quantity),
        minLevel: Number(vals.minLevel),
      };
      const submitBtn = modalForm.element.querySelector('.modal-foot .btn-primary');
      submitBtn.disabled = true;
      try {
        if (existing) {
          const updated = await updateProduct(existing.id, payload);
          showToast(`Product "${updated.name}" updated.`, 'success');
        } else {
          const created = await createProduct(payload);
          showToast(`Product "${created.name}" created.`, 'success');
        }
        close();
        await reload();
      } catch (error) {
        form.clearErrors();
        handleApiErrors(form, error);
        result.focusFirst();
        submitBtn.disabled = false;
      }
    }
  }

  function handleApiErrors(form, error) {
    const message = error.message || 'Something went wrong.';
    if (message.toLowerCase().includes('sku')) {
      form.setError('sku', message);
    } else if (message.toLowerCase().includes('choose a valid category')) {
      form.setError('category', message);
    } else {
      form.showBanner(message);
    }
  }

  async function reload() {
    if (cancelled) return;
    try {
      [rows, categories] = await Promise.all([getProducts(), getProductCategories()]);
      table?.setRows?.(rows);
    } catch (error) {
      showToast(`${error.message}`, 'error');
    }
  }

  renderHead();
  table = createDataTable(host, {
    ...tableConfig(),
    loading: true,
  });
  // Load data async then swap in the populated table
  (async () => {
    if (cancelled) return;
    try {
      [rows, categories] = await Promise.all([getProducts(), getProductCategories()]);
      if (cancelled) return;
      table?.destroy?.();
      table = createDataTable(host, tableConfig());
    } catch (error) {
      if (cancelled) return;
      host.innerHTML = `
        <div class="card">
          <div class="state-box error">
            <div class="state-icon">${icon('alertCircle', 22)}</div>
            <h3>Unable to load products</h3>
            <p>${escapeHtml(error.message || 'Please try again.')}</p>
            <button type="button" class="btn btn-secondary" id="products-retry">${icon('refresh', 15)} Retry</button>
          </div>
        </div>`;
      host.querySelector('#products-retry')?.addEventListener('click', () => reload());
    }
  })();

  const cleanup = () => {
    cancelled = true;
    table?.destroy?.();
    table = null;
  };
  return cleanup;
}
