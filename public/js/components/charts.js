const registry = new Map();
let chartId = 0;

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function hexToRgbaFallback(hex, alpha) {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(15, 23, 42, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function toneColor(tone) {
  const map = {
    accent: cssVar('--chart-accent', '#0891b2'),
    success: cssVar('--success', '#22c55e'),
    warning: cssVar('--warning', '#f59e0b'),
    danger: cssVar('--danger', '#ef4444'),
    info: cssVar('--info', '#3b82f6'),
    neutral: cssVar('--text-subtle', '#94a3b8'),
  };
  return map[tone] || map.accent;
}

function toneColorSoft(tone, alpha) {
  return hexToRgbaFallback(toneColor(tone), alpha);
}

export function registerChart(canvas, config) {
  if (!canvas || typeof Chart === 'undefined') return null;
  const id = `chart-${++chartId}`;
  const chart = new Chart(canvas.getContext('2d'), config);
  registry.set(id, { chart, config, canvas });
  canvas.dataset.chartId = id;
  return { id, chart };
}

function closeModalTooltip() {
  // Chart.js handles cleanup on destroy; nothing extra needed.
}

export function destroyChart(canvas) {
  const id = canvas?.dataset?.chartId;
  if (!id || !registry.has(id)) return;
  closeModalTooltip();
  const entry = registry.get(id);
  entry.chart.destroy();
  registry.delete(id);
}

export function destroyAllCharts() {
  registry.forEach((entry) => entry.chart.destroy());
  registry.clear();
}

export function resolveToneColor(tone) {
  return toneColor(tone);
}

export function applyChartTheme(chart) {
  // Charts from a page that has already been unmounted must not be updated.
  if (!chart?.canvas?.isConnected) return;
  const textColor = cssVar('--text-subtle', '#64748b');
  const gridColor = cssVar('--grid-line', 'rgba(148,163,184,0.22)');
  if (chart.options.scales?.x) {
    chart.options.scales.x.ticks = { ...chart.options.scales.x.ticks, color: textColor };
    if (chart.options.scales.x.grid) chart.options.scales.x.grid.color = gridColor;
  }
  if (chart.options.scales?.y) {
    chart.options.scales.y.ticks = { ...chart.options.scales.y.ticks, color: textColor };
    if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = gridColor;
  }
  if (chart.options.plugins?.legend?.labels) {
    chart.options.plugins.legend.labels.color = textColor;
  }
  chart.update();
}

document.addEventListener('app:themechange', () => {
  registry.forEach(({ chart }) => applyChartTheme(chart));
});

/* Chart builders ----------------------------------------------------------- */

export function lineChart(canvas, { labels, series, format = 'number', stacked = false } = {}) {
  const textColor = cssVar('--text-subtle', '#64748b');
  const gridColor = cssVar('--grid-line', 'rgba(148,163,184,0.22)');
  return registerChart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: series.map((s) => ({
        label: s.label,
        data: s.data,
        borderColor: toneColor(s.tone || 'accent'),
        backgroundColor: s.fill ? toneColorSoft(s.tone || 'accent', 0.14) : 'transparent',
        fill: Boolean(s.fill),
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.38,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 16 } },
        tooltip: {
          backgroundColor: cssVar('--sidebar-bg', '#0b1220'),
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatValue(ctx.parsed.y, format)}`,
          },
        },
      },
      scales: {
        x: { stacked, grid: { display: false }, ticks: { color: textColor }, border: { color: gridColor } },
        y: {
          stacked,
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: textColor, maxTicksLimit: 6 },
          border: { display: false },
        },
      },
    },
  });
}

export function barChart(canvas, { labels, data, series, format = 'number', horizontal = false, tones } = {}) {
  const textColor = cssVar('--text-subtle', '#64748b');
  const gridColor = cssVar('--grid-line', 'rgba(148,163,184,0.22)');
  const datasets = series
    ? series.map((s) => ({
        label: s.label,
        data: s.data,
        backgroundColor: toneColor(s.tone || 'accent'),
        borderRadius: 6,
        maxBarThickness: 34,
      }))
    : [{
        label: '',
        data,
        backgroundColor: tones
          ? tones.map((t) => toneColor(t))
          : toneColor('accent'),
        borderRadius: 6,
        maxBarThickness: 30,
      }];
  return registerChart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: Boolean(series), position: 'bottom', labels: { color: textColor, usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 16 } },
        tooltip: {
          backgroundColor: cssVar('--sidebar-bg', '#0b1220'),
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label ? `${ctx.dataset.label}: ` : ''}${formatValue(horizontal ? ctx.parsed.x : ctx.parsed.y, format)}`,
          },
        },
      },
      scales: {
        x: horizontal
          ? { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor }, border: { display: false } }
          : { grid: { display: false }, ticks: { color: textColor }, border: { color: gridColor } },
        y: horizontal
          ? { grid: { display: false }, ticks: { color: textColor }, border: { display: false } }
          : { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 6 }, border: { display: false } },
      },
    },
  });
}

export function doughnutChart(canvas, { labels, data, format = 'number', tones } = {}) {
  const palette = tones || ['accent', 'info', 'success', 'warning', 'danger', 'neutral'];
  const textColor = cssVar('--text-subtle', '#64748b');
  const border = cssVar('--surface', '#ffffff');
  return registerChart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: palette.map((tone) => toneColor(tone)),
        borderColor: border,
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 14 } },
        tooltip: {
          backgroundColor: cssVar('--sidebar-bg', '#0b1220'),
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatValue(ctx.parsed, format)} (${percent(ctx, data)})`,
          },
        },
      },
    },
  });
}

function percent(ctx, data) {
  const total = data.reduce((sum, value) => sum + Number(value || 0), 0);
  if (!total) return '0%';
  return `${Math.round((ctx.parsed / total) * 100)}%`;
}

function formatValue(value, format) {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);
  }
  if (format === 'percent') return `${Math.round(value || 0)}%`;
  return new Intl.NumberFormat('en-US').format(value || 0);
}

export function formatMetricValue(value, format) {
  return formatValue(value, format);
}
