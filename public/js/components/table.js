import { icon } from './icons.js';
import { escapeHtml, csvEscape } from '../utils.js';

const PAGE_SIZE_DEFAULT = 8;

function sortValue(row, key) {
  const value = row[key];
  if (value === null || value === undefined) return '';
  return value;
}

/**
 * config = {
 *   columns: [{ key, label, sortable, sortValue(row), className, render(row), exportValue(row) }],
 *   initialRows: [],
 *   searchKeys: ['name'],
 *   filters: [{ key, label, options }]  // select filters, matched against row[key]
 *   dateKey: 'date',                    // enables From/To date filter
 *   pageSize: 8,
 *   toolbar: [{ id, label, icon, variant, when: permissionContext, onClick }],
 *   rowActions: (row) => [{ id, label, icon, danger, onClick }],
 *   emptyState: { icon, title, message },
 *   exportFilename: 'export',
 *   loading: Boolean
 * }
 */
export function createDataTable(container, config) {
  let rows = [...(config.initialRows || [])];
  let search = '';
  let filterValues = Object.fromEntries((config.filters || []).map((f) => [f.key, 'all']));
  let dateFrom = '';
  let dateTo = '';
  let sortKey = config.initialSort?.key || null;
  let sortDir = config.initialSort?.dir || 'desc';
  let page = 1;
  const pageSize = config.pageSize || PAGE_SIZE_DEFAULT;

  const root = document.createElement('div');
  root.className = 'table-card';
  container.appendChild(root);

  function filteredRows() {
    let result = rows;
    if (search) {
      const needle = search.toLowerCase();
      const keys = config.searchKeys || Object.keys(rows[0] || {});
      result = result.filter((row) => keys.some((key) => String(row[key] ?? '').toLowerCase().includes(needle)));
    }
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value !== 'all') result = result.filter((row) => String(row[key]) === value);
    });
    if (config.dateKey) {
      result = result.filter((row) => {
        const date = String(row[config.dateKey] || '').slice(0, 10);
        if (dateFrom && (!date || date < dateFrom)) return false;
        if (dateTo && (!date || date > dateTo)) return false;
        return true;
      });
    }
    if (sortKey) {
      const column = config.columns.find((col) => col.key === sortKey);
      const getter = column?.sortValue || ((row) => sortValue(row, sortKey));
      result = [...result].sort((a, b) => {
        const av = getter(a);
        const bv = getter(b);
        if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
        const as = String(av).toLowerCase();
        const bs = String(bv).toLowerCase();
        return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
      });
    }
    return result;
  }

  function renderSkeleton() {
    const cell = '<td><div class="skeleton skeleton-line w-60"></div></td>';
    const row = `<tr class="skeleton-row">${cell.repeat(config.columns.length)}<td><div class="skeleton skeleton-line w-40"></div></td></tr>`;
    root.innerHTML = `
      <div class="table-toolbar"><div class="skeleton skeleton-line w-40" style="height:32px;"></div></div>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr>${config.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}<th>Actions</th></tr></thead>
          <tbody>${row.repeat(5)}</tbody>
        </table>
      </div>`;
  }

  function html() {
    const filtered = filteredRows();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page > totalPages) page = totalPages;
    const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
    const activeToolbar = (config.toolbar || []).filter((action) => !action.when || action.when());

    const filtersHTML = (config.filters || []).map((filter) => {
      const options = typeof filter.options === 'function' ? filter.options() : (filter.options || []);
      return `
      <div class="toolbar-field">
        <label for="flt-${filter.key}">${escapeHtml(filter.label)}</label>
        <select id="flt-${filter.key}" data-filter="${filter.key}" style="max-width:170px;">
          <option value="all">All</option>
          ${options.map((opt) => `<option value="${escapeHtml(opt.value)}" ${filterValues[filter.key] === String(opt.value) ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('')}
        </select>
      </div>`;
    }).join('');

    const dateFilterHTML = config.dateKey ? `
      <div class="toolbar-field">
        <label for="date-from">From</label>
        <input type="date" id="date-from" data-date="from" value="${dateFrom}" style="max-width:140px;">
      </div>
      <div class="toolbar-field">
        <label for="date-to">To</label>
        <input type="date" id="date-to" data-date="to" value="${dateTo}" style="max-width:140px;">
      </div>
    ` : '';

    const toolbarHTML = `
      <div class="table-toolbar">
        <div class="table-toolbar-filters">
          <div class="toolbar-field search-field">
            <label for="tbl-search" class="sr-only">Search</label>
            ${icon('search', 15)}
            <input type="search" id="tbl-search" data-search placeholder="Search…" value="${escapeHtml(search)}" aria-label="Search table">
          </div>
          ${filtersHTML}
          ${dateFilterHTML}
        </div>
        <div class="table-toolbar-actions">
          ${activeToolbar.map((action) => `
            <button type="button" class="btn btn-${action.variant || 'primary'} btn-sm" data-toolbar="${action.id}">
              ${action.icon ? icon(action.icon, 15) : ''}${escapeHtml(action.label)}
            </button>`).join('')}
        </div>
      </div>`;

    if (!rows.length) {
      return `${toolbarHTML}${emptyState()}`;
    }

    const emptyFiltered = !visible.length && filtered.length === 0;

    const headerHTML = `
      <tr>
        ${config.columns.map((col) => {
          const sortable = col.sortable !== false;
          const isSorted = sortKey === col.key;
          return `<th ${isSorted ? `aria-sort="${sortDir === 'asc' ? 'ascending' : 'descending'}"` : 'aria-sort="none"'}>
            ${sortable ? `
              <button type="button" class="sort-btn" data-sort="${col.key}">
                ${escapeHtml(col.label)}${icon('arrowUp', 12, 'sort-icon')}
              </button>` : escapeHtml(col.label)}
          </th>`;
        }).join('')}
        <th style="text-align:right;">Actions</th>
      </tr>`;

    const bodyHTML = visible.map((row, index) => {
      const rowActions = (config.rowActions ? config.rowActions(row) : []).filter(Boolean);
      return `
        <tr data-row-id="${escapeHtml(row.id)}" data-row-index="${(page - 1) * pageSize + index}">
          ${config.columns.map((col) => {
            const raw = col.render ? col.render(row) : row[col.key];
            return `<td class="${col.className || ''}" data-cell="${escapeHtml(col.key)}">${raw ?? ''}</td>`;
          }).join('')}
          <td>
            <div class="row-actions">
              ${rowActions.map((action) => `
                <button type="button" class="row-action ${action.danger ? 'danger' : ''}" data-row-action="${escapeHtml(action.id)}" title="${escapeHtml(action.label)}" aria-label="${escapeHtml(action.label)}">
                  ${icon(action.icon || 'eye', 15)}
                </button>`).join('')}
            </div>
          </td>
        </tr>`;
    }).join('');

    const emptyRowHTML = emptyFiltered
      ? `<tr><td colspan="${config.columns.length + 1}">
          <div class="state-box" style="min-height:180px;">
            <div class="state-icon">${icon('search', 22)}</div>
            <h3>No matching records</h3>
            <p>No records match your current search or filters.</p>
          </div>
        </td></tr>`
      : '';

    const from = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(filtered.length, page * pageSize);

    const footerHTML = `
      <div class="table-footer">
        <span>Showing <strong>${from}–${to}</strong> of <strong>${filtered.length}</strong> ${filtered.length === 1 ? 'record' : 'records'}</span>
        <div class="pagination" style="gap:4px;">
          <button type="button" class="page-btn" data-page="prev" ${page === 1 ? 'disabled' : ''} aria-label="Previous page">${icon('chevronLeft', 14)}</button>
          ${pageButtons(totalPages)}
          <button type="button" class="page-btn" data-page="next" ${page === totalPages ? 'disabled' : ''} aria-label="Next page">${icon('chevronRight', 14)}</button>
        </div>
      </div>`;

    return `
      ${toolbarHTML}
      <div class="table-scroll">
        <table class="data-table">
          <thead>${headerHTML}</thead>
          <tbody>${bodyHTML || ''}${emptyRowHTML}</tbody>
        </table>
      </div>
      ${footerHTML}`;
  }

  function emptyState() {
    const empty = config.emptyState || { icon: 'database', title: 'No records yet', message: 'Records will appear here once created.' };
    return `
      <div class="state-box">
        <div class="state-icon">${icon(empty.icon || 'database', 24)}</div>
        <h3>${escapeHtml(empty.title)}</h3>
        <p>${escapeHtml(empty.message || '')}</p>
      </div>`;
  }

  function pageButtons(totalPages) {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    if (start > 1) pages.push(`<span class="page-ellipsis">…</span>`);
    for (let i = start; i <= end; i += 1) {
      pages.push(`<button type="button" class="page-btn" data-page="${i}" ${i === page ? 'aria-current="page"' : ''}>${i}</button>`);
    }
    if (end < totalPages) pages.push(`<span class="page-ellipsis">…</span>`);
    return pages.join('');
  }

  function render() {
    root.innerHTML = html();
    bind();
  }

  let searchTimer = null;

  function bind() {
    const searchInput = root.querySelector('[data-search]');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        const value = e.target.value;
        searchTimer = setTimeout(() => {
          search = value;
          page = 1;
          rerenderKeepingFocus();
        }, 180);
      });
    }

    root.querySelectorAll('[data-filter]').forEach((select) => {
      select.addEventListener('change', () => {
        filterValues[select.dataset.filter] = select.value;
        page = 1;
        render();
      });
    });

    root.querySelectorAll('[data-date]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.dataset.date === 'from') dateFrom = input.value;
        else dateTo = input.value;
        page = 1;
        render();
      });
    });

    root.querySelectorAll('[data-sort]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.sort;
        if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        else { sortKey = key; sortDir = 'asc'; }
        render();
      });
    });

    root.querySelectorAll('[data-toolbar]').forEach((btn) => {
      const action = (config.toolbar || []).find((a) => a.id === btn.dataset.toolbar);
      if (action) btn.addEventListener('click', () => action.onClick?.());
    });

    root.querySelectorAll('[data-row-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tr = btn.closest('tr');
        const row = rows.find((item) => String(item.id) === tr.dataset.rowId) || filteredRows()[Number(tr.dataset.rowIndex)];
        const action = (config.rowActions ? config.rowActions(row) : []).find((a) => a.id === btn.dataset.rowAction);
        action?.onClick?.(row);
      });
    });

    root.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.page;
        const totalPages = Math.max(1, Math.ceil(filteredRows().length / pageSize));
        if (target === 'prev') page = Math.max(1, page - 1);
        else if (target === 'next') page = Math.min(totalPages, page + 1);
        else page = Number(target);
        render();
      });
    });
  }

  function rerenderKeepingFocus() {
    const activeId = document.activeElement?.id;
    const selectionStart = document.activeElement?.selectionStart;
    render();
    if (activeId) {
      const again = root.querySelector(`#${CSS.escape(activeId)}`);
      if (again) {
        again.focus();
        try { again.setSelectionRange(selectionStart, selectionStart); } catch { /* non-text input */ }
      }
    }
  }

  function update(newRows) {
    rows = [...newRows];
    render();
  }

  function refresh() {
    render();
  }

  function setRows(newRows, { keepPage = true } = {}) {
    const previousCount = filteredRows().length;
    rows = [...newRows];
    const newCount = rows.length;
    if (newCount !== previousCount) page = 1;
    else if (!keepPage) page = 1;
    render();
  }

  function exportCSV(filename = config.exportFilename || 'export') {
    const filtered = filteredRows();
    const header = config.columns.map((col) => csvEscape(col.label || col.key));
    const body = filtered.map((row) => config.columns.map((col) => {
      const value = col.exportValue ? col.exportValue(row) : row[col.key];
      const text = typeof value === 'number' ? String(value) : String(value ?? '').replace(/<[^>]*>/g, '');
      return csvEscape(text);
    }));
    const full = [header, ...body];
    const content = full.map((row) => row.join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${String(filename).replace(/\.csv$/i, '')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return filtered.length;
  }

  // Initial render
  if (config.loading) {
    renderSkeleton();
  } else {
    render();
  }

  return {
    update,
    setRows,
    refresh,
    exportCSV,
    getRows: () => rows,
    getFiltered: () => filteredRows(),
    destroy: () => root.remove(),
  };
}
