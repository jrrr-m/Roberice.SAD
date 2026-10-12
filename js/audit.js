/**
 * Roberice POS & Inventory System - Audit History & System Trail
 * Tracks all warehouse modifications, sack openings, batch depletions, sales, and system changes.
 */

let auditLogsCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadAuditLogs();

  const searchInput = document.getElementById('searchAudit');
  if (searchInput) searchInput.addEventListener('input', renderAuditTable);

  const filterType = document.getElementById('filterEventType');
  if (filterType) filterType.addEventListener('change', renderAuditTable);

  const filterDate = document.getElementById('filterDateRange');
  if (filterDate) filterDate.addEventListener('change', renderAuditTable);

  const btnRefresh = document.getElementById('btnRefreshAudit');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      btnRefresh.disabled = true;
      await loadAuditLogs();
      btnRefresh.disabled = false;
      showToast('Audit logs refreshed.', 'info');
    });
  }

  const btnExport = document.getElementById('btnExportAuditCsv');
  if (btnExport) btnExport.addEventListener('click', exportAuditLogsToCsv);
});

async function loadAuditLogs() {
  try {
    const response = await fetch('api/get_audit_logs.php');
    if (!response.ok) throw new Error('Failed to load audit history.');

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Server returned error loading audit logs.');
    }

    auditLogsCache = data.logs || [];

    // Update KPI summary cards
    if (data.summary) {
      const elTotal = document.getElementById('kpiTotalEvents');
      if (elTotal) elTotal.textContent = data.summary.total_events || 0;

      const elSacks = document.getElementById('kpiSacksOpened');
      if (elSacks) elSacks.textContent = data.summary.sacks_opened || 0;

      const elBatches = document.getElementById('kpiBatchesDepleted');
      if (elBatches) elBatches.textContent = data.summary.batches_depleted || 0;

      const elRestocks = document.getElementById('kpiRestocks');
      if (elRestocks) elRestocks.textContent = data.summary.restocks || 0;
    }

    renderAuditTable();
  } catch (error) {
    console.error('Audit load error:', error);
    const tbody = document.getElementById('auditTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Failed to load audit logs: ${error.message}</td></tr>`;
    }
  }
}

function renderAuditTable() {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;

  const search = (document.getElementById('searchAudit')?.value || '').toLowerCase();
  const typeFilter = document.getElementById('filterEventType')?.value || 'all';
  const dateFilter = document.getElementById('filterDateRange')?.value || 'all';

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

  const filtered = auditLogsCache.filter(item => {
    // 1. Search filter
    const matchesSearch =
      item.id.toLowerCase().includes(search) ||
      (item.product_name && item.product_name.toLowerCase().includes(search)) ||
      (item.batch_code && item.batch_code.toLowerCase().includes(search)) ||
      (item.user && item.user.toLowerCase().includes(search)) ||
      (item.note && item.note.toLowerCase().includes(search)) ||
      item.label.toLowerCase().includes(search);

    // 2. Type filter
    const matchesType = typeFilter === 'all' || item.type === typeFilter;

    // 3. Date range filter
    let matchesDate = true;
    if (dateFilter !== 'all' && item.raw_date) {
      const itemDate = new Date(item.raw_date.replace(' ', 'T'));
      const itemDateStr = item.raw_date.slice(0, 10);

      if (dateFilter === 'today') {
        matchesDate = itemDateStr === todayStr;
      } else if (dateFilter === 'week') {
        matchesDate = itemDate >= sevenDaysAgo;
      } else if (dateFilter === 'month') {
        matchesDate = itemDate >= thirtyDaysAgo;
      }
    }

    return matchesSearch && matchesType && matchesDate;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No matching audit events found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    // Action Type Badge
    let badgeClass = item.badge_class || 'badge-secondary';
    if (item.type === 'open_sack') badgeClass = 'badge-open-sack';
    else if (item.type === 'batch_depleted') badgeClass = 'badge-danger';
    else if (item.type === 'restock') badgeClass = 'badge-success';
    else if (item.type === 'sale') badgeClass = 'badge-sale';
    else if (item.type === 'spoilage') badgeClass = 'badge-danger';
    else if (item.type === 'repack') badgeClass = 'badge-info';
    else if (item.type === 'correction') badgeClass = 'badge-warning';

    const typeBadge = `<span class="badge ${badgeClass}" style="white-space:nowrap;">${item.label}</span>`;

    // Batch code pill
    let batchDisplay = '-';
    if (item.batch_code && item.batch_code !== 'N/A') {
      batchDisplay = `<span class="batch-code-tag">${item.batch_code}</span>`;
    }

    return `
      <tr>
        <td style="white-space:nowrap;font-size:12px;color:var(--text-muted);">
          <strong>${item.date_formatted}</strong>
          <div style="font-size:10.5px;color:var(--text-light);">${item.id}</div>
        </td>
        <td style="white-space:nowrap;">${typeBadge}</td>
        <td>
          <strong>${item.product_name}</strong>
          ${item.origin ? `<div style="font-size:11px;color:var(--text-muted);">${item.origin}</div>` : ''}
        </td>
        <td style="white-space:nowrap;">${batchDisplay}</td>
        <td style="white-space:nowrap;">
          <strong style="color:var(--primary);">${item.qty_impact || '-'}</strong>
        </td>
        <td>
          <div style="max-width:320px;font-size:12px;line-height:1.4;">${item.note || 'No notes recorded'}</div>
        </td>
        <td style="white-space:nowrap;">
          <span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--text-main);">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            ${item.user}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function exportAuditLogsToCsv() {
  if (auditLogsCache.length === 0) {
    showToast('No audit logs available to export.', 'warning');
    return;
  }

  const headers = ['Audit ID', 'Timestamp', 'Action Type', 'Item / Variety', 'Batch / Reference', 'Quantity Shift', 'Reason / Note', 'Performed By'];
  const rows = auditLogsCache.map(i => [
    `"${i.id}"`,
    `"${i.raw_date}"`,
    `"${i.label}"`,
    `"${(i.product_name || '').replace(/"/g, '""')}"`,
    `"${i.batch_code || ''}"`,
    `"${(i.qty_impact || '').replace(/"/g, '""')}"`,
    `"${(i.note || '').replace(/"/g, '""')}"`,
    `"${(i.user || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Roberice_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Audit history CSV exported successfully.', 'success');
}
