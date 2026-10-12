/**
 * Roberice POS & Inventory System - Sales Report Controller
 */

let currentReportData = null;

document.addEventListener('DOMContentLoaded', () => initSalesReport());

async function initSalesReport() {
  bindFilterEvents();
  await loadSalesReport();
}

function bindFilterEvents() {
  const presetSelect = document.getElementById('filterPeriodPreset');
  const monthInput = document.getElementById('filterMonthInput');
  const monthGroup = document.getElementById('monthPickerGroup');
  const customStartGroup = document.getElementById('customStartGroup');
  const customEndGroup = document.getElementById('customEndGroup');

  presetSelect.addEventListener('change', () => {
    const val = presetSelect.value;
    if (val === 'september_2026') {
      monthGroup.style.display = 'block';
      monthInput.value = '2026-09';
      customStartGroup.style.display = 'none';
      customEndGroup.style.display = 'none';
    } else if (val === 'this_month') {
      monthGroup.style.display = 'block';
      const now = new Date();
      monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      customStartGroup.style.display = 'none';
      customEndGroup.style.display = 'none';
    } else if (val === 'custom') {
      monthGroup.style.display = 'none';
      customStartGroup.style.display = 'block';
      customEndGroup.style.display = 'block';
    } else {
      monthGroup.style.display = 'none';
      customStartGroup.style.display = 'none';
      customEndGroup.style.display = 'none';
    }
  });

  document.getElementById('btnApplyFilter').addEventListener('click', () => loadSalesReport());
  document.getElementById('btnResetFilter').addEventListener('click', () => {
    presetSelect.value = 'september_2026';
    monthInput.value = '2026-09';
    monthGroup.style.display = 'block';
    customStartGroup.style.display = 'none';
    customEndGroup.style.display = 'none';
    document.getElementById('filterOrigin').value = 'all';
    document.getElementById('filterCashier').value = 'all';
    document.getElementById('filterPayment').value = 'all';
    loadSalesReport();
  });

  document.getElementById('btnOpenPrintReport').addEventListener('click', openPrintReportModal);
  document.getElementById('btnExportCSV').addEventListener('click', exportSalesCSV);
}

async function loadSalesReport() {
  const preset = document.getElementById('filterPeriodPreset').value;
  const month = document.getElementById('filterMonthInput').value;
  const start = document.getElementById('filterStartDate').value;
  const end = document.getElementById('filterEndDate').value;
  const origin = document.getElementById('filterOrigin').value;
  const cashier = document.getElementById('filterCashier').value;
  const payment = document.getElementById('filterPayment').value;

  showPageLoader('Compiling sales report from database...');

  const params = new URLSearchParams();

  if (preset === 'september_2026' || preset === 'this_month') {
    if (month) params.append('month', month);
  } else if (preset === 'custom') {
    if (start) params.append('start_date', start);
    if (end) params.append('end_date', end);
  } else if (preset === 'today') {
    const today = new Date().toISOString().split('T')[0];
    params.append('start_date', today);
    params.append('end_date', today);
  }

  if (origin !== 'all') params.append('origin', origin);
  if (cashier !== 'all') params.append('cashier_id', cashier);
  if (payment !== 'all') params.append('payment_method', payment);

  try {
    const response = await fetch(`api/get_sales_report.php?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to retrieve sales report data.');

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Server error loading report.');

    currentReportData = data;
    renderReportView(data);
  } catch (err) {
    hidePageLoader();
    console.error('Error fetching sales report:', err);
    showToast('Failed to load sales report: ' + err.message, 'danger');
  } finally {
    setTimeout(hidePageLoader, 200);
  }
}

function renderReportView(data) {
  const summary = data.summary || {};
  const periodLabel = data.periodLabel || 'Selected Period';

  document.getElementById('currentPeriodDisplay').textContent = `Period: ${periodLabel}`;

  // Update KPI Cards
  document.getElementById('kpiTotalRevenue').textContent = formatCurrency(summary.totalRevenue || 0);
  document.getElementById('kpiRevenueSub').textContent = `Cash: ${formatCurrency(summary.totalCash || 0)} | Non-Cash: ${formatCurrency(summary.totalNonCash || 0)}`;

  document.getElementById('kpiTxnCount').textContent = `${summary.totalTransactions || 0} completed`;
  document.getElementById('kpiAvgTxn').textContent = `Avg: ${formatCurrency(summary.averageTransaction || 0)} / txn`;

  document.getElementById('kpiSacksSold').textContent = `${summary.totalSacksSold || 0} sacks`;
  document.getElementById('kpiTotalKgSold').textContent = `${formatNumber(summary.totalVolumeKg || 0)} kg total equivalent`;

  const packsTotal = (summary.total5kgPacks || 0) + (summary.total10kgPacks || 0) + (summary.total20kgPacks || 0);
  document.getElementById('kpiPacksSold').textContent = `${packsTotal} pre-packed bags`;
  document.getElementById('kpiTinatakalKg').textContent = `${summary.totalTinatakalKg || 0} kg loose tinatakal`;

  // Populate Cashier Dropdown once if not already filled
  const cashierSelect = document.getElementById('filterCashier');
  if (cashierSelect.options.length <= 1 && data.cashierBreakdown) {
    data.cashierBreakdown.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.cashier;
      opt.textContent = `${c.cashier} (${c.transactions} txns)`;
      cashierSelect.appendChild(opt);
    });
  }

  // Render Variety Breakdown Table
  const vTable = document.getElementById('varietyReportTableBody');
  const varieties = data.varietyBreakdown || [];

  if (!varieties.length) {
    vTable.innerHTML = `<tr><td colspan="11" class="empty-state">No rice sales recorded in this period.</td></tr>`;
  } else {
    vTable.innerHTML = varieties.map(v => {
      const originBadge = v.origin === 'Imported'
        ? `<span class="badge badge-imported">Imported</span>`
        : `<span class="badge badge-local">Local</span>`;

      return `
        <tr>
          <td><strong>${v.name}</strong></td>
          <td>${originBadge}</td>
          <td><span style="color:var(--text-muted);font-size:12px;">${v.rice_type || v.category}</span></td>
          <td><strong>${v.sacks || 0}</strong></td>
          <td>${v.packs_5kg || 0}</td>
          <td>${v.packs_10kg || 0}</td>
          <td>${v.packs_20kg || 0}</td>
          <td>${v.tinatakal_kg || 0} kg</td>
          <td><strong>${formatNumber(v.total_kg || 0)} kg</strong></td>
          <td><strong style="color:var(--primary);">${formatCurrency(v.revenue || 0)}</strong></td>
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="flex:1;background:var(--bg-main);height:6px;border-radius:3px;overflow:hidden;min-width:40px;">
                <div style="width:${v.percentage}%;background:var(--primary);height:100%;"></div>
              </div>
              <span style="font-size:11px;font-weight:600;">${v.percentage}%</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Render Transactions Table
  const tTable = document.getElementById('txnReportTableBody');
  const transactions = data.transactions || [];

  if (!transactions.length) {
    tTable.innerHTML = `<tr><td colspan="6" class="empty-state">No transactions match the selected filters.</td></tr>`;
  } else {
    tTable.innerHTML = transactions.map(t => {
      const itemsList = (t.items || []).map(i =>
        `${i.product_name} <span style="color:var(--text-muted);">(${i.quantity} ${i.unit})</span>`
      ).join(', ');

      return `
        <tr>
          <td><code>TXN-${String(t.transaction_id).padStart(4, '0')}</code></td>
          <td>${formatDateTime(t.transaction_date)}</td>
          <td><strong>${t.cashier_name}</strong></td>
          <td style="max-width:320px;">${itemsList}</td>
          <td><span class="badge badge-info">${t.payment_method}</span></td>
          <td><strong>${formatCurrency(t.total_amount)}</strong></td>
        </tr>
      `;
    }).join('');
  }
}

function openPrintReportModal() {
  if (!currentReportData) {
    showToast('No report data available to print.', 'warning');
    return;
  }

  const data = currentReportData;
  const summary = data.summary || {};
  const user = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};
  const printContainer = document.getElementById('printReportContainer');

  const varietiesHtml = (data.varietyBreakdown || []).map((v, idx) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${idx + 1}. <strong>${v.name}</strong> (${v.origin})</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${v.sacks}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${v.packs_5kg} / ${v.packs_10kg} / ${v.packs_20kg}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${v.tinatakal_kg} kg</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatNumber(v.total_kg)} kg</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold;">${formatCurrency(v.revenue)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${v.percentage}%</td>
    </tr>
  `).join('');

  printContainer.innerHTML = `
    <div class="print-store-header">
      <h1>ROBERICE RICE RETAILING STORE</h1>
      <p>Wholesale & Retail Rice Merchandising | POS & Inventory System</p>
      <p style="font-size:11px;color:#6b7280;">Batangas, Philippines | Contact: (+63) 912-345-6789</p>
    </div>

    <div class="print-report-title">
      <h2>OFFICIAL SALES SUMMARY STATEMENT</h2>
      <span>Coverage Period: ${data.periodLabel}</span>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">Date Generated: ${new Date().toLocaleString()} | Prepared by: ${user.name || user.username || 'Admin'}</div>
    </div>

    <div class="print-summary-grid">
      <div class="print-stat-item">
        <span class="lbl">Total Gross Sales</span>
        <span class="val">${formatCurrency(summary.totalRevenue || 0)}</span>
      </div>
      <div class="print-stat-item">
        <span class="lbl">Completed Sales</span>
        <span class="val">${summary.totalTransactions || 0} Transactions</span>
      </div>
      <div class="print-stat-item">
        <span class="lbl">Total Rice Volume</span>
        <span class="val">${formatNumber(summary.totalVolumeKg || 0)} Kilograms</span>
      </div>
      <div class="print-stat-item">
        <span class="lbl">Sacks & Packs Sold</span>
        <span class="val">${summary.totalSacksSold || 0} Sacks / ${(summary.total5kgPacks||0)+(summary.total10kgPacks||0)+(summary.total20kgPacks||0)} Packs</span>
      </div>
    </div>

    <h4 style="margin:16px 0 8px;font-size:13px;text-transform:uppercase;color:#374151;border-bottom:1px solid #d1d5db;padding-bottom:4px;">Variety & Packaging Sales Breakdown</h4>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #9ca3af;">Rice Variety</th>
          <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #9ca3af;">Sacks</th>
          <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #9ca3af;">Packs (5k/10k/20k)</th>
          <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #9ca3af;">Tinatakal</th>
          <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #9ca3af;">Total Volume</th>
          <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #9ca3af;">Revenue</th>
          <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #9ca3af;">Share</th>
        </tr>
      </thead>
      <tbody>
        ${varietiesHtml}
        <tr style="background:#f9fafb;font-weight:bold;">
          <td style="padding:8px;border-top:2px solid #111;">TOTAL</td>
          <td style="padding:8px;border-top:2px solid #111;text-align:center;">${summary.totalSacksSold || 0}</td>
          <td style="padding:8px;border-top:2px solid #111;text-align:center;">${(summary.total5kgPacks||0)+(summary.total10kgPacks||0)+(summary.total20kgPacks||0)}</td>
          <td style="padding:8px;border-top:2px solid #111;text-align:center;">${summary.totalTinatakalKg || 0} kg</td>
          <td style="padding:8px;border-top:2px solid #111;text-align:right;">${formatNumber(summary.totalVolumeKg || 0)} kg</td>
          <td style="padding:8px;border-top:2px solid #111;text-align:right;color:#1f4d32;">${formatCurrency(summary.totalRevenue || 0)}</td>
          <td style="padding:8px;border-top:2px solid #111;text-align:right;">100%</td>
        </tr>
      </tbody>
    </table>

    <div class="print-signatures">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Prepared By: Cashier / System User</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Verified & Certified Correct: Store Manager / Owner</div>
      </div>
    </div>
  `;

  openModal('modalPrintReport');
}

async function exportSalesCSV() {
  try {
    const user = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};
    const formData = new FormData();
    formData.append('action', 'export_sales');
    formData.append('uploader', user.name || 'Admin User');

    const res = await fetch('api/file_manager.php', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Exported sales to ${data.file}! Available in File Management.`, 'success');
      // Trigger download
      window.open(`uploads/${data.file}`, '_blank');
    } else {
      showToast(data.message || 'Export failed.', 'warning');
    }
  } catch (e) {
    console.error(e);
    showToast('Failed to export CSV.', 'danger');
  }
}
