import { getReports, generateReport } from '../api.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { downloadCSV, escapeHtml, formatDateTime } from '../utils.js';

export function mount(container, ctx) {
  let cancelled = false;

  container.innerHTML = `
    <div class="stack-md" style="gap:24px;">
      <div class="page-head">
        <div>
          <h1>Reports</h1>
          <p>Role-relevant reports. Generate to download a CSV snapshot of the current data.</p>
        </div>
      </div>
      <div id="reports-grid" class="report-grid"></div>
    </div>
  `;

  const grid = container.querySelector('#reports-grid');
  grid.innerHTML = '<div class="card"><div class="skeleton" style="height:40px;"></div><div style="height:12px"></div><div class="skeleton" style="height:40px;"></div></div>'.repeat(2);

  async function load() {
    try {
      const reports = await getReports();
      if (cancelled) return;
      grid.innerHTML = reports.map((report) => `
        <div class="report-card">
          <div class="report-top">
            <div class="report-icon">${icon(report.icon || 'file', 19)}</div>
            <div>
              <h3>${escapeHtml(report.name)}</h3>
              <p>${escapeHtml(report.description)}</p>
            </div>
          </div>
          <footer>
            <span class="subtle" style="font-size:11.5px;">${escapeHtml(report.description)}</span>
            <button type="button" class="btn btn-primary btn-sm" data-report="${escapeHtml(report.id)}">
              ${icon('download', 14)} Generate
            </button>
          </footer>
        </div>`).join('');

      grid.querySelectorAll('[data-report]').forEach((button) => {
        button.addEventListener('click', async () => {
          const id = button.dataset.report;
          button.disabled = true;
          button.innerHTML = `${icon('clock', 14)} Generating…`;
          try {
            const { filename, rows } = await generateReport(id);
            downloadCSV(filename, rows);
            showToast(`Report generated — ${rows.length - 1} records exported.`, 'success');
          } catch (error) {
            showToast(error.message || 'Report generation failed.', 'error');
          } finally {
            button.disabled = false;
            button.innerHTML = `${icon('download', 14)} Generate`;
          }
        });
      });
    } catch (error) {
      if (cancelled) return;
      grid.innerHTML = `
        <div class="card" style="grid-column:1/-1;">
          <div class="state-box error">
            <div class="state-icon">${icon('alertCircle', 22)}</div>
            <h3>Unable to load reports</h3>
            <p>${escapeHtml(error.message || 'Please try again.')}</p>
            <button type="button" class="btn btn-secondary" id="reports-retry">${icon('refresh', 15)} Retry</button>
          </div>
        </div>`;
      grid.querySelector('#reports-retry')?.addEventListener('click', load);
    }
  }

  load();
  return () => { cancelled = true; };
}
