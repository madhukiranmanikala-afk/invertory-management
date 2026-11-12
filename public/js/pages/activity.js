import { getActivity } from '../api.js';
import { createDataTable } from '../components/table.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { escapeHtml, formatShortDate, parseDate } from '../utils.js';

export function mount(container, ctx) {
  let cancelled = false;
  const host = document.createElement('div');
  host.className = 'stack-md';
  host.style.gap = '24px';
  host.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Activity History</h1>
        <p>Your recent actions, newest first. Owner sees all users' actions.</p>
      </div>
    </div>
    <div id="activity-host"></div>`;
  container.appendChild(host);

  async function load() {
    const inner = host.querySelector('#activity-host');
    inner.innerHTML = '<div class="card"><div class="skeleton" style="height:14px; width:30%; margin-bottom:16px;"></div>'.concat(
      Array.from({ length: 8 }, () => '<div class="skeleton" style="height:40px;"></div><div style="height:10px"></div>').join(''),
      '</div>');
    try {
      const entries = await getActivity();
      if (cancelled) return;
      inner.innerHTML = '';

      const table = createDataTable(inner, {
        columns: [
          {
            key: 'timestamp',
            label: 'When',
            className: 'nowrap',
            render: (row) => `<span class="cell-sub mono" style="font-size:11.5px;">${escapeHtml(formatShortDate(row.timestamp))}</span>`,
            sortValue: (row) => parseDate(row.timestamp)?.getTime?.() || 0,
            exportValue: (row) => formatShortDate(row.timestamp),
          },
          ...(ctx.user.role === 'owner' ? [{
            key: 'userName',
            label: 'User',
            className: 'nowrap',
            render: (row) => `<span class="cell-strong">${escapeHtml(row.userName)}</span>`,
            sortValue: (row) => row.userName.toLowerCase(),
            exportValue: (row) => row.userName,
          }] : []),
          {
            key: 'module',
            label: 'Module',
            className: 'nowrap',
            render: (row) => `<span class="badge badge-accent">${escapeHtml(row.module)}</span>`,
            sortValue: (row) => row.module,
            exportValue: (row) => row.module,
          },
          {
            key: 'action',
            label: 'Action',
            render: (row) => `<span>${escapeHtml(row.action)}</span>`,
            sortValue: (row) => row.action.toLowerCase(),
            exportValue: (row) => row.action,
          },
        ],
        initialRows: entries,
        searchKeys: ['action', 'userName', 'module'],
        filters: [
          {
            key: 'module',
            label: 'Module',
            options: Array.from(new Set(entries.map((row) => row.module))).sort().map((module) => ({ value: module, label: module })),
          },
        ],
        pageSize: 12,
        initialSort: { key: 'timestamp', dir: 'desc' },
        exportFilename: `${ctx.user.name.replace(/\s+/g, '-').toLowerCase()}-activity-history`,
        dateKey: 'timestamp',
        toolbar: [
          {
            id: 'generate-report',
            label: 'Generate Report',
            icon: 'download',
            variant: 'secondary',
            onClick: () => {
              const entries = table.exportCSV('activity-history');
              if (entries) showToast(`Report generated — ${entries} entries exported.`, 'success');
            },
          },
        ],
        emptyState: {
          icon: 'clock',
          title: 'No activity yet',
          message: 'Your actions will appear here as you work.',
        },
      });
    } catch (error) {
      if (cancelled) return;
      inner.innerHTML = `
        <div class="card">
          <div class="state-box error">
            <div class="state-icon">${icon('alertCircle', 22)}</div>
            <h3>Unable to load activity</h3>
            <p>${escapeHtml(error.message || 'Please try again.')}</p>
            <button type="button" class="btn btn-secondary" id="activity-retry">${icon('refresh', 15)} Retry</button>
          </div>
        </div>`;
      inner.querySelector('#activity-retry')?.addEventListener('click', load);
    }
  }

  load();
  return () => { cancelled = true; };
}
