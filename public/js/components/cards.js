import { icon } from './icons.js';
import { formatMetricValue } from './charts.js';
import { escapeHtml } from '../utils.js';

export function pageHead({ title, description = '', actionsHTML = '', badge = '' }) {
  return `
    <div class="page-head">
      <div>
        <div class="inline" style="gap:10px; margin-bottom:6px;">${badge}</div>
        <h1>${escapeHtml(title)}</h1>
        ${description ? `<p>${escapeHtml(description)}</p>` : ''}
      </div>
      ${actionsHTML ? `<div class="page-actions">${actionsHTML}</div>` : ''}
    </div>
  `;
}

export function kpiCard({ label, value, format = 'number', icon: iconName, hint = '', note = '', delta }) {
  const display = format === 'text' ? (value ?? '—') : formatMetricValue(value, format);
  return `
    <div class="kpi-card">
      <div class="kpi-top">
        <div class="kpi-label">${escapeHtml(label)}</div>
        <div class="kpi-icon">${icon(iconName, 20)}</div>
      </div>
      <div class="kpi-value" title="${escapeHtml(String(display))}">${escapeHtml(String(display))}</div>
      <div class="kpi-foot">
        ${note ? `<span title="${escapeHtml(note)}">${escapeHtml(note)}</span>` : `<span>${escapeHtml(hint)}</span>`}
      </div>
    </div>
  `;
}

export function skeletonBlocks(kind = 'table') {
  if (kind === 'dashboard') {
    return `
      <div class="kpi-grid">
        ${'<div class="kpi-card"><div class="skeleton" style="height:14px;width:55%;"></div><div class="skeleton" style="height:34px;width:45%;margin-top:22px;"></div><div class="skeleton" style="height:10px;width:40%;margin-top:14px;"></div></div>'.repeat(4)}
      </div>
      <div class="dashboard-charts" style="margin-top:24px;">
        <div class="card"><div class="skeleton" style="height:286px;"></div></div>
        <div class="card"><div class="skeleton" style="height:286px;"></div></div>
      </div>
    `;
  }
  return `<div class="card"><div class="skeleton" style="height:14px;width:30%;margin-bottom:18px;"></div>${'<div class="skeleton" style="height:44px;"></div><div style="height:10px"></div>'.repeat(6)}</div>`;
}

export function errorState({ title = 'Something went wrong', message = 'We could not load this data. Please try again.', onRetry }) {
  const box = document.createElement('div');
  box.className = 'state-box error';
  box.innerHTML = `
    <div class="state-icon">${icon('alertCircle', 26)}</div>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(message)}</p>
    <button type="button" class="btn btn-secondary">${icon('refresh', 15)} Retry</button>
  `;
  if (onRetry) box.querySelector('button').addEventListener('click', onRetry);
  return box;
}

export function emptyState({ icon: iconName = 'info', title = 'Nothing here yet', message = '', actionHTML = '' }) {
  return `
    <div class="card">
      <div class="state-box">
        <div class="state-icon">${icon(iconName, 26)}</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        ${actionHTML}
      </div>
    </div>
  `;
}

export function activityList(items) {
  if (!items.length) return '<p class="subtle" style="font-size:13px; padding: 8px 0;">No activity recorded yet.</p>';
  return `
    <div class="activity-list">
      ${items.map((item) => `
        <div class="activity-item">
          <div class="activity-icon ${item.tone ? `tone-${item.tone}` : ''}">${icon(item.icon || 'activity', 15)}</div>
          <div class="activity-copy">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.meta || '')}</span>
          </div>
          <div class="activity-time">${escapeHtml(item.time)}</div>
        </div>`).join('')}
    </div>
  `;
}

export function alertList(items) {
  if (!items.length) return '<p class="subtle" style="font-size:13px; padding: 8px 0;">No alerts — everything looks healthy.</p>';
  return `
    <div class="alert-list">
      ${items.map((item) => `
        <div class="alert-item ${item.tone === 'info' || item.tone === 'success' ? `tone-${item.tone}` : item.tone === 'danger' ? 'tone-danger' : ''}">
          <div class="alert-icon">${icon(item.icon || 'alertTriangle', 15)}</div>
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.message)}</span>
          </div>
        </div>`).join('')}
    </div>
  `;
}

export function statusBadge(tone, text) {
  const map = { neutral: '', success: 'badge-success', warning: 'badge-warning', danger: 'badge-danger', info: 'badge-info' };
  const cls = map[tone] || map.neutral;
  const dot = tone === 'neutral' ? '' : ' badge-dot';
  return `<span class="badge ${cls}${dot}">${escapeHtml(text)}</span>`;
}

/** Shown in a module header when the signed-in role may look but not change records. */
export function readOnlyNotice() {
  return `<span class="badge badge-info" title="Your role can view these records but not change them">Read only</span>`;
}

export function detailsGrid(items) {
  return `
    <dl class="detail-grid">
      ${items.map((item) => `
        <div class="detail-item">
          <dt>${escapeHtml(item.label)}</dt>
          <dd>${item.value ?? '—'}</dd>
        </div>`).join('')}
    </dl>
  `;
}

export function progressLine(value, max) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return `
    <div style="display:flex; align-items:center; gap:10px;">
      <div class="progress ${pct >= 100 ? 'success' : ''}" style="flex:1;"><span style="width:${pct}%"></span></div>
      <span class="subtle" style="font-size:12px;">${pct}%</span>
    </div>
  `;
}

export function parsePageHTML(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  return wrap.firstElementChild ? [...wrap.children] : [];
}
