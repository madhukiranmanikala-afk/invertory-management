import { getAnalytics } from '../api.js';
import { getRole } from '../config/roles.js';
import { icon } from '../components/icons.js';
import { lineChart, barChart, doughnutChart, formatMetricValue, destroyAllCharts } from '../components/charts.js';
import { escapeHtml } from '../utils.js';

let charts = [];

export function mount(container, ctx) {
  const role = getRole(ctx.user.role);
  container.innerHTML = `
    <div class="stack-md" style="gap:24px;">
      <div class="page-head">
        <div>
          <h1>Analytics</h1>
          <p>Role-relevant trends. Choose a date range to refresh the data.</p>
        </div>
        <div class="page-actions">
          <div class="filter-tabs" role="group" aria-label="Date range">
            <button type="button" class="filter-tab" data-days="7" aria-pressed="false">Last 7 days</button>
            <button type="button" class="filter-tab" data-days="30" aria-pressed="true">Last 30 days</button>
            <button type="button" class="filter-tab" data-days="90" aria-pressed="false">Last 90 days</button>
          </div>
        </div>
      </div>
      <div id="analytics-summary" style="display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:16px;">
        ${'<div class="card"><div class="skeleton" style="height:64px;"></div></div>'.repeat(3)}
      </div>
      <div class="dashboard-charts" id="analytics-charts"></div>
    </div>
  `;

  let cancelled = false;
  let activeDays = 30;

  function bindRangeTabs() {
    container.querySelectorAll('[data-days]').forEach((tab) => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('[data-days]').forEach((other) => other.setAttribute('aria-pressed', 'false'));
        tab.setAttribute('aria-pressed', 'true');
        activeDays = Number(tab.dataset.days);
        load(activeDays);
      });
    });
  }

  function destroyCharts() {
    destroyAllCharts();
    charts = [];
  }

  async function load(days) {
    destroyCharts();
    const summaryEl = container.querySelector('#analytics-summary');
    const chartsEl = container.querySelector('#analytics-charts');
    summaryEl.innerHTML = '<div class="card"><div class="skeleton" style="height:64px;"></div></div>'.repeat(3);
    chartsEl.innerHTML = `
      <div class="card"><div class="skeleton" style="height:286px;"></div></div>
      <div class="card"><div class="skeleton" style="height:286px;"></div></div>`;
    try {
      const data = await getAnalytics(days);
      if (cancelled) return;
      summaryEl.innerHTML = data.summary.map((item) => `
        <div class="card" style="display:flex; align-items:center; gap:14px;">
          <div class="kpi-icon">${icon(item.icon, 20)}</div>
          <div style="min-width:0;">
            <div class="subtle" style="font-size:12px;">${escapeHtml(item.label)}</div>
            <div class="kpi-value" style="font-size:24px;">${escapeHtml(formatMetricValue(item.value, item.format))}</div>
          </div>
        </div>`).join('');

      const labels = data.trend.labels;
      chartsEl.innerHTML = `
        <div class="card chart-card">
          <div class="card-head"><div><h2>${escapeHtml(data.trend.title)}</h2><p>Over the last ${escapeHtml(String(days))} days</p></div></div>
          <div class="chart-box"><canvas id="an-trend" role="img" aria-label="${escapeHtml(data.trend.title)}"></canvas></div>
        </div>
        <div class="card chart-card">
          <div class="card-head"><div><h2>${escapeHtml(data.breakdown.title)}</h2><p>Breakdown for the same period</p></div></div>
          <div class="chart-box"><canvas id="an-breakdown" role="img" aria-label="${escapeHtml(data.breakdown.title)}"></canvas></div>
        </div>`;

      const trendCanvas = container.querySelector('#an-trend');
      if (trendCanvas) {
        const built = lineChart(trendCanvas, { labels, series: data.trend.series, format: data.trend.format });
        if (built?.chart) charts.push(built.chart);
      }
      const breakdownCanvas = container.querySelector('#an-breakdown');
      const breakdown = data.breakdown;
      if (breakdownCanvas) {
        const built = breakdown.type === 'doughnut'
          ? doughnutChart(breakdownCanvas, { labels: breakdown.labels, data: breakdown.data, format: breakdown.format, tones: breakdown.tones })
          : barChart(breakdownCanvas, { labels: breakdown.labels, data: breakdown.data, format: breakdown.format, horizontal: breakdown.horizontal, tones: breakdown.tones });
        if (built?.chart) charts.push(built.chart);
      }
    } catch (error) {
      if (cancelled) return;
      summaryEl.innerHTML = '';
      chartsEl.innerHTML = `
        <div class="card" style="grid-column: 1 / -1;">
          <div class="state-box error">
            <div class="state-icon">${icon('alertCircle', 22)}</div>
            <h3>Unable to load analytics</h3>
            <p>${escapeHtml(error.message || 'Please try again.')}</p>
            <button type="button" class="btn btn-secondary" id="an-retry">${icon('refresh', 15)} Retry</button>
          </div>
        </div>`;
      chartsEl.querySelector('#an-retry')?.addEventListener('click', () => load(activeDays));
    }
  }

  bindRangeTabs();
  load(activeDays);

  return () => {
    cancelled = true;
    destroyCharts();
  };
}
