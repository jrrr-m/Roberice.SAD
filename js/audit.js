/**
 * Roberice POS & Inventory System - Audit History & System Trail
 * Tracks all warehouse modifications, sack openings, batch depletions, sales, and system changes.
 */

let auditLogsCache = [];
let currentAuditPage = 1;
const auditPageSize = 150;
let totalAuditRecords = 0;

document.addEventListener('DOMContentLoaded', async () => {
  await loadAuditLogs(1);

  let searchTimeout = null;
  const searchInput = document.getElementById('searchAudit');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        await loadAuditLogs(1);
      }, 300);
    });
  }

  const filterType = document.getElementById('filterEventType');
  if (filterType) {
    filterType.addEventListener('change', async () => {
      await loadAuditLogs(1);
    });
  }

  const filterDate = document.getElementById('filterDateRange');
  if (filterDate) {
    filterDate.addEventListener('change', async () => {
      await loadAuditLogs(1);
    });
  }

  const btnPrev = document.getElementById('btnPrevAuditPage');
  if (btnPrev) {
    btnPrev.addEventListener('click', async () => {
      if (currentAuditPage > 1) {
        btnPrev.disabled = true;
        await loadAuditLogs(currentAuditPage - 1);
      }
    });
  }

  const btnNext = document.getElementById('btnNextAuditPage');
  if (btnNext) {
    btnNext.addEventListener('click', async () => {
      if (currentAuditPage * auditPageSize < totalAuditRecords) {
        btnNext.disabled = true;
        await loadAuditLogs(currentAuditPage + 1);
      }
    });
  }

  const btnRefresh = document.getElementById('btnRefreshAudit');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      btnRefresh.disabled = true;
      await loadAuditLogs(1);
      btnRefresh.disabled = false;
      showToast('Audit logs refreshed.', 'info');
    });
  }

  const btnExport = document.getElementById('btnExportAuditCsv');
  if (btnExport) btnExport.addEventListener('click', exportAuditLogsToCsv);
});

async function loadAuditLogs(page = 1) {
  try {
    currentAuditPage = page;
    const offset = (page - 1) * auditPageSize;
    const search = (document.getElementById('searchAudit')?.value || '').trim();
    const typeFilter = document.getElementById('filterEventType')?.value || 'all';
    const dateFilter = document.getElementById('filterDateRange')?.value || 'all';

    let url = `api/get_audit_logs.php?limit=${auditPageSize}&offset=${offset}`;
    if (typeFilter !== 'all') url += `&type=${encodeURIComponent(typeFilter)}`;
    if (dateFilter !== 'all') url += `&date=${encodeURIComponent(dateFilter)}`;
    if (search !== '') url += `&search=${encodeURIComponent(search)}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load audit history.');

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Server returned error loading audit logs.');
    }

    auditLogsCache = data.logs || [];
    totalAuditRecords = data.summary?.total_events || data.total || auditLogsCache.length;

    // Update KPI summary cards
    if (data.summary) {
      const elTotal = document.getElementById('kpiTotalEvents');
      if (elTotal) elTotal.textContent = Number(data.summary.total_events || 0).toLocaleString();

      const elSacks = document.getElementById('kpiSacksOpened');
      if (elSacks) elSacks.textContent = Number(data.summary.sacks_opened || 0).toLocaleString();

      const elBatches = document.getElementById('kpiBatchesDepleted');
      if (elBatches) elBatches.textContent = Number(data.summary.batches_depleted || 0).toLocaleString();

      const elRestocks = document.getElementById('kpiRestocks');
      if (elRestocks) elRestocks.textContent = Number(data.summary.restocks || 0).toLocaleString();
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
  const todayStr = typeof getLocalDateString === 'function' ? getLocalDateString(now) : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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

  // Display up to 150 audit items for responsive DOM performance
  const displayLimit = 150;
  const toDisplay = filtered.slice(0, displayLimit);

  let rowsHtml = toDisplay.map(item => {
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

  tbody.innerHTML = rowsHtml;

  // Synchronize pagination controls
  const paginationBar = document.getElementById('auditPaginationBar');
  const paginationInfo = document.getElementById('auditPaginationInfo');
  const btnPrev = document.getElementById('btnPrevAuditPage');
  const btnNext = document.getElementById('btnNextAuditPage');

  if (paginationBar) {
    if (totalAuditRecords > 0) {
      paginationBar.style.display = 'flex';
      const startIdx = (currentAuditPage - 1) * auditPageSize + 1;
      const endIdx = Math.min(currentAuditPage * auditPageSize, totalAuditRecords);
      if (paginationInfo) {
        paginationInfo.textContent = `Showing ${startIdx.toLocaleString()}–${endIdx.toLocaleString()} of ${totalAuditRecords.toLocaleString()} audit events (Page ${currentAuditPage})`;
      }
      if (btnPrev) btnPrev.disabled = currentAuditPage <= 1;
      if (btnNext) btnNext.disabled = endIdx >= totalAuditRecords;
    } else {
      paginationBar.style.display = 'none';
    }
  }
}

async function exportAuditLogsToCsv() {
  const btnExport = document.getElementById('btnExportAuditCsv');
  if (btnExport) btnExport.disabled = true;

  try {
    const search = (document.getElementById('searchAudit')?.value || '').trim();
    const typeFilter = document.getElementById('filterEventType')?.value || 'all';
    const dateFilter = document.getElementById('filterDateRange')?.value || 'all';

    let url = `api/get_audit_logs.php?limit=all`;
    if (typeFilter !== 'all') url += `&type=${encodeURIComponent(typeFilter)}`;
    if (dateFilter !== 'all') url += `&date=${encodeURIComponent(dateFilter)}`;
    if (search !== '') url += `&search=${encodeURIComponent(search)}`;

    const res = await fetch(url);
    const data = await res.json();
    const exportList = data.logs || auditLogsCache;

    if (exportList.length === 0) {
      showToast('No audit logs available to export.', 'warning');
      return;
    }

    const headers = ['Audit ID', 'Timestamp', 'Action Type', 'Item / Variety', 'Batch / Reference', 'Quantity Shift', 'Reason / Note', 'Performed By'];
    const rows = exportList.map(i => [
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
    const dateStr = typeof getLocalDateString === 'function' ? getLocalDateString() : new Date().toLocaleDateString('en-CA');
    link.setAttribute('download', `Roberice_Audit_Log_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Audit history CSV (${exportList.length} records) exported successfully.`, 'success');
  } catch (err) {
    showToast('Failed to export audit logs: ' + err.message, 'danger');
  } finally {
    if (btnExport) btnExport.disabled = false;
  }
}
