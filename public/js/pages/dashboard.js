import { getDashboard } from '../api.js';
import { getRole } from '../config/roles.js';
import { icon } from '../components/icons.js';
import { kpiCard, pageHead, activityList, alertList } from '../components/cards.js';
import { lineChart, barChart, doughnutChart, destroyAllCharts } from '../components/charts.js';
import { escapeHtml } from '../utils.js';

let charts = [];

export function mount(container, ctx) {
  const role = getRole(ctx.user.role);
  container.innerHTML = `
    <div class="stack-md" style="gap:24px;">
      ${pageHead({
        title: role.overviewTitle,
        description: role.welcome,
        badge: `<span class="role-badge">${escapeHtml(role.label)}</span> <span>Welcome, ${escapeHtml(ctx.user.name)}</span>`,
      })}
      <div id="dash-kpis" class="kpi-grid"></div>
      <div class="dashboard-charts" id="dash-charts"></div>
      <div class="dashboard-lower" id="dash-lower"></div>
    </div>
  `;

  let cancelled = false;

  const cleanup = () => { cancelled = true; destroyCharts(); };

  loadDashboard(container, role, ctx, () => cancelled);
  return cleanup;
}

async function loadDashboard(container, role, ctx, isCancelled) {
  const kpisEl = container.querySelector('#dash-kpis');
  const chartsEl = container.querySelector('#dash-charts');
  const lowerEl = container.querySelector('#dash-lower');

  // Skeletons
  kpisEl.innerHTML = skeletonKpis();
  chartsEl.innerHTML = `
    <div class="card chart-card"><div class="skeleton" style="height:286px;"></div></div>
    <div class="card chart-card"><div class="skeleton" style="height:286px;"></div></div>`;
  lowerEl.innerHTML = `
    <div class="card"><div class="skeleton" style="height:220px;"></div></div>
    <div class="card"><div class="skeleton" style="height:220px;"></div></div>`;

  try {
    const data = await getDashboard(role.key);
    if (isCancelled()) return;
    destroyCharts();

    // KPI cards
    kpisEl.innerHTML = role.kpis.map((kpiDef) => {
      const entry = data.kpis[kpiDef.key] || {};
      return kpiCard({
        ...kpiDef,
        value: entry.value,
        note: entry.note || '',
      });
    }).join('');

    // Charts
    const trend = data.charts.trend;
    const breakdown = data.charts.breakdown;
    chartsEl.innerHTML = `
      <div class="card chart-card">
        <div class="card-head"><div><h2>${escapeHtml(trend.title)}</h2><p>${escapeHtml(trend.subtitle)}</p></div></div>
        <div class="chart-box"><canvas id="dash-trend" role="img" aria-label="${escapeHtml(trend.title)}"></canvas></div>
      </div>
      <div class="card chart-card">
        <div class="card-head"><div><h2>${escapeHtml(breakdown.title)}</h2><p>${escapeHtml(breakdown.subtitle)}</p></div></div>
        <div class="chart-box"><canvas id="dash-breakdown" role="img" aria-label="${escapeHtml(breakdown.title)}"></canvas></div>
      </div>`;

    renderChart(trend, breakdown);

    // Lower panels
    lowerEl.innerHTML = `
      <div class="card">
        <div class="card-head"><div><h2>Recent activity</h2><p>The latest actions in your workspace.</p></div></div>
        ${activityList(data.recentActivity)}
      </div>
      <div class="card">
        <div class="card-head">
          <div><h2>Alerts</h2><p>Things that may need your attention.</p></div>
        </div>
        ${alertList(data.alerts)}
      </div>`;
  } catch (error) {
    kpisEl.innerHTML = '';
    chartsEl.innerHTML = '';
    lowerEl.innerHTML = '';
    renderDashboardError(container, ctx, error.message);
  }
}

function renderChart(trend, breakdown) {
  const trendCanvas = document.getElementById('dash-trend');
  if (trend && trendCanvas) {
    const trendBuilt = trend.type === 'bar'
      ? barChart(trendCanvas, { labels: trend.labels, series: trend.series, format: trend.format })
      : lineChart(trendCanvas, { labels: trend.labels, series: trend.series, format: trend.format });
    if (trendBuilt?.chart) charts.push(trendBuilt.chart);
  }
  const breakdownCanvas = document.getElementById('dash-breakdown');
  if (breakdown && breakdownCanvas) {
    const breakdownBuilt = breakdown.type === 'doughnut'
      ? doughnutChart(breakdownCanvas, {
          labels: breakdown.labels,
          data: breakdown.data,
          format: breakdown.format,
          tones: breakdown.tones,
        })
      : barChart(breakdownCanvas, {
          labels: breakdown.labels,
          data: breakdown.data,
          format: breakdown.format,
          horizontal: breakdown.horizontal,
          tones: breakdown.tones,
        });
    if (breakdownBuilt?.chart) charts.push(breakdownBuilt.chart);
  }
}

function destroyCharts() {
  destroyAllCharts();
  charts = [];
}

function skeletonKpis() {
  return Array.from({ length: 4 }).map(() => `
    <div class="kpi-card">
      <div class="skeleton skeleton-line w-60"></div>
      <div class="skeleton" style="height:34px; width:50%; margin-top:22px;"></div>
      <div class="skeleton skeleton-line w-40" style="margin-top:14px;"></div>
    </div>`).join('');
}

function renderDashboardError(container, ctx, message) {
  const host = container.querySelector('.stack-md');
  if (!host) return;
  host.insertAdjacentHTML('beforeend', `
    <div class="card">
      <div class="state-box error">
        <div class="state-icon">${icon('alertCircle', 24)}</div>
        <h3>Unable to load dashboard</h3>
        <p>${escapeHtml(message || 'Please try again.')}</p>
        <button type="button" class="btn btn-secondary" id="dash-retry">${icon('refresh', 15)} Retry</button>
      </div>
    </div>`);
  host.querySelector('#dash-retry')?.addEventListener('click', () => ctx.reload());
}
