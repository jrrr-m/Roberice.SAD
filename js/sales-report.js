/**
 * Roberice POS & Inventory System - Sales Report Controller
 */

let currentReportData = null;

document.addEventListener('DOMContentLoaded', () => initSalesReport());

async function initSalesReport() {
  bindFilterEvents();
  setDefaultFilterDates();
  setReportType('daily', false);
  await loadSalesReport();
}

function getCurrentISOWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function setDefaultFilterDates() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const curWeekStr = getCurrentISOWeek();

  const dailyInput = document.getElementById('filterDailyDate');
  if (dailyInput && !dailyInput.value) dailyInput.value = todayStr;

  const weekInput = document.getElementById('filterWeekInput');
  if (weekInput && !weekInput.value) weekInput.value = curWeekStr;

  const monthInput = document.getElementById('filterMonthInput');
  if (monthInput && !monthInput.value) monthInput.value = curMonthStr;

  updateWeeklyNotice();
}

function updateWeeklyNotice() {
  const weekInput = document.getElementById('filterWeekInput');
  const notice = document.getElementById('weeklyRangeNotice');
  if (!weekInput || !notice) return;
  const val = weekInput.value;
  if (!val) {
    notice.textContent = '';
    return;
  }
  const match = val.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) {
    notice.textContent = '';
    return;
  }
  const y = parseInt(match[1], 10);
  const w = parseInt(match[2], 10);
  const simple = new Date(y, 0, 1 + (w - 1) * 7);
  const dayOfWeek = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dayOfWeek <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setDate(ISOweekStart.getDate() + 6);

  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  notice.textContent = `Coverage: ${ISOweekStart.toLocaleDateString(undefined, opts)} – ${ISOweekEnd.toLocaleDateString(undefined, opts)}`;
}

function setReportType(type, autoLoad = true) {
  // Update nav buttons
  document.querySelectorAll('.report-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  // Update dropdown
  const select = document.getElementById('filterReportType');
  if (select && select.value !== type) {
    select.value = type;
  }

  // Update badge
  const badge = document.getElementById('currentReportTypeBadge');
  if (badge) {
    const labels = {
      daily: 'Daily Report',
      weekly: 'Weekly Report',
      monthly: 'Monthly Report',
      quarterly: 'Quarterly Report',
      yearly: 'Yearly Report',
      custom: 'Custom Range',
      all_time: 'All Time History'
    };
    badge.textContent = labels[type] || 'Report';
  }

  // Toggle Visibility
  const dailyGrp = document.getElementById('dailyPickerGroup');
  const weeklyGrp = document.getElementById('weeklyPickerGroup');
  const monthGrp = document.getElementById('monthPickerGroup');
  const quarterGrp = document.getElementById('quarterPickerGroup');
  const quarterYrGrp = document.getElementById('quarterYearGroup');
  const yearGrp = document.getElementById('yearPickerGroup');
  const customStartGrp = document.getElementById('customStartGroup');
  const customEndGrp = document.getElementById('customEndGroup');

  if (dailyGrp) dailyGrp.style.display = type === 'daily' ? 'block' : 'none';
  if (weeklyGrp) weeklyGrp.style.display = type === 'weekly' ? 'block' : 'none';
  if (monthGrp) monthGrp.style.display = type === 'monthly' ? 'block' : 'none';
  if (quarterGrp) quarterGrp.style.display = type === 'quarterly' ? 'block' : 'none';
  if (quarterYrGrp) quarterYrGrp.style.display = type === 'quarterly' ? 'block' : 'none';
  if (yearGrp) yearGrp.style.display = type === 'yearly' ? 'block' : 'none';
  if (customStartGrp) customStartGrp.style.display = type === 'custom' ? 'block' : 'none';
  if (customEndGrp) customEndGrp.style.display = type === 'custom' ? 'block' : 'none';

  if (type === 'weekly') {
    updateWeeklyNotice();
  }

  if (autoLoad) {
    loadSalesReport();
  }
}

function bindFilterEvents() {
  // Navigation pill buttons
  document.querySelectorAll('.report-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      setReportType(type, true);
    });
  });

  // Report type dropdown change
  const typeSelect = document.getElementById('filterReportType');
  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      setReportType(typeSelect.value, true);
    });
  }

  // Week input change -> update notice
  const weekInput = document.getElementById('filterWeekInput');
  if (weekInput) {
    weekInput.addEventListener('input', updateWeeklyNotice);
    weekInput.addEventListener('change', () => {
      updateWeeklyNotice();
      loadSalesReport();
    });
  }

  // Date input quick buttons
  const btnDailyToday = document.getElementById('btnDailyToday');
  if (btnDailyToday) {
    btnDailyToday.addEventListener('click', () => {
      const dailyInput = document.getElementById('filterDailyDate');
      if (dailyInput) {
        dailyInput.value = new Date().toISOString().split('T')[0];
        loadSalesReport();
      }
    });
  }

  const btnWeekCurrent = document.getElementById('btnWeekCurrent');
  if (btnWeekCurrent) {
    btnWeekCurrent.addEventListener('click', () => {
      const weekInput = document.getElementById('filterWeekInput');
      if (weekInput) {
        weekInput.value = getCurrentISOWeek();
        updateWeeklyNotice();
        loadSalesReport();
      }
    });
  }

  const btnMonthPrev = document.getElementById('btnMonthPrev') || document.getElementById('btnMonthDemo');
  if (btnMonthPrev) {
    btnMonthPrev.addEventListener('click', () => {
      const monthInput = document.getElementById('filterMonthInput');
      if (monthInput) {
        monthInput.value = '2026-09';
        loadSalesReport();
      }
    });
  }

  // Quick auto-refresh on changes
  const dailyDate = document.getElementById('filterDailyDate');
  if (dailyDate) dailyDate.addEventListener('change', () => loadSalesReport());

  const monthInput = document.getElementById('filterMonthInput');
  if (monthInput) monthInput.addEventListener('change', () => loadSalesReport());

  const quarterSelect = document.getElementById('filterQuarter');
  if (quarterSelect) quarterSelect.addEventListener('change', () => loadSalesReport());

  const quarterYearSelect = document.getElementById('filterQuarterYear');
  if (quarterYearSelect) quarterYearSelect.addEventListener('change', () => loadSalesReport());

  const yearInput = document.getElementById('filterYearInput');
  if (yearInput) yearInput.addEventListener('change', () => loadSalesReport());

  // Apply Filter button
  document.getElementById('btnApplyFilter').addEventListener('click', () => loadSalesReport());

  // Reset Filter button
  document.getElementById('btnResetFilter').addEventListener('click', () => {
    document.getElementById('filterOrigin').value = 'all';
    document.getElementById('filterCashier').value = 'all';
    document.getElementById('filterPayment').value = 'all';
    const now = new Date();
    document.getElementById('filterDailyDate').value = now.toISOString().split('T')[0];
    document.getElementById('filterWeekInput').value = getCurrentISOWeek();
    document.getElementById('filterMonthInput').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('filterQuarter').value = '4';
    document.getElementById('filterQuarterYear').value = '2026';
    document.getElementById('filterYearInput').value = '2026';
    setReportType('daily', true);
  });

  const btnPrint = document.getElementById('btnOpenPrintReport');
  if (btnPrint) {
    btnPrint.addEventListener('click', openPrintReportModal);
  } else {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btnOpenPrintReport')) openPrintReportModal();
    });
  }

  const btnExport = document.getElementById('btnExportCSV');
  if (btnExport) {
    btnExport.addEventListener('click', exportSalesCSV);
  } else {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btnExportCSV')) exportSalesCSV();
    });
  }
}

async function loadSalesReport() {
  const reportType = document.getElementById('filterReportType').value;
  const dailyDate = document.getElementById('filterDailyDate').value;
  const week = document.getElementById('filterWeekInput').value;
  const month = document.getElementById('filterMonthInput').value;
  const quarter = document.getElementById('filterQuarter').value;
  const quarterYear = document.getElementById('filterQuarterYear').value;
  const year = document.getElementById('filterYearInput').value;
  const start = document.getElementById('filterStartDate').value;
  const end = document.getElementById('filterEndDate').value;
  const origin = document.getElementById('filterOrigin').value;
  const cashier = document.getElementById('filterCashier').value;
  const payment = document.getElementById('filterPayment').value;

  showTopLoader();

  const params = new URLSearchParams();
  params.append('report_type', reportType);

  if (reportType === 'daily') {
    if (dailyDate) params.append('daily_date', dailyDate);
  } else if (reportType === 'weekly') {
    if (week) params.append('week', week);
  } else if (reportType === 'monthly') {
    if (month) params.append('month', month);
  } else if (reportType === 'quarterly') {
    if (quarter) params.append('quarter', quarter);
    if (quarterYear) params.append('year', quarterYear);
  } else if (reportType === 'yearly') {
    if (year) params.append('year', year);
  } else if (reportType === 'custom') {
    if (start) params.append('start_date', start);
    if (end) params.append('end_date', end);
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
    console.error('Error fetching sales report:', err);
    showToast('Failed to load sales report: ' + err.message, 'danger');
  } finally {
    hideTopLoader();
    hidePageLoader();
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
          <td>${v.packs_25kg || 0}</td>
          <td>${v.packs_20kg || 0}</td>
          <td>${v.packs_10kg || 0}</td>
          <td>${v.packs_5kg || 0}</td>
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
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${v.packs_25kg || 0}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${v.packs_20kg || 0} / ${v.packs_10kg || 0} / ${v.packs_5kg || 0}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${v.tinatakal_kg} kg</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatNumber(v.total_kg)} kg</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold;">${formatCurrency(v.revenue)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${v.percentage}%</td>
    </tr>
  `).join('');

  printContainer.innerHTML = `
    <div class="print-store-header">
      <h1>ROBERICE</h1>
      <p style="font-weight:700;font-size:12px;color:#1f2937;">Address: 73 Farmers st. Corner Ampalaya, Marikina 1800</p>
      <p style="font-size:11px;color:#6b7280;">Wholesale & Retail Rice Merchandising | POS & Inventory System</p>
    </div>

    <div class="print-report-title">
      <h2>${data.reportTitle || 'OFFICIAL SALES SUMMARY STATEMENT'}</h2>
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
          <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #9ca3af;">50Kg Sacks</th>
          <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #9ca3af;">25Kg Half</th>
          <th style="padding:6px 8px;text-align:center;border-bottom:2px solid #9ca3af;">Packs (20Kg/10Kg/5Kg)</th>
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
          <td style="padding:8px;border-top:2px solid #111;text-align:center;">${summary.total25kgPacks || 0}</td>
          <td style="padding:8px;border-top:2px solid #111;text-align:center;">${(summary.total20kgPacks||0)+(summary.total10kgPacks||0)+(summary.total5kgPacks||0)}</td>
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

function printReportSheet() {
  const printContainer = document.getElementById('printReportContainer');
  if (!printContainer || !printContainer.innerHTML.trim()) {
    openPrintReportModal();
  }

  const contentHtml = document.getElementById('printReportContainer').innerHTML;
  if (!contentHtml || !contentHtml.trim()) {
    showToast('No sales statement content to print.', 'warning');
    return;
  }

  // Remove any previously created print iframe
  const existingFrame = document.getElementById('reportPrintFrame');
  if (existingFrame) {
    existingFrame.remove();
  }

  // Create dedicated print iframe with real dimensions, positioned off-screen
  const printFrame = document.createElement('iframe');
  printFrame.id = 'reportPrintFrame';
  printFrame.setAttribute('aria-hidden', 'true');
  printFrame.style.position = 'fixed';
  printFrame.style.left = '-9999px';
  printFrame.style.top = '-9999px';
  printFrame.style.width = '1024px';
  printFrame.style.height = '1000px';
  printFrame.style.border = '0';
  printFrame.style.opacity = '0';
  printFrame.style.pointerEvents = 'none';
  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow.document;
  frameDoc.open();
  frameDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Official Sales Statement - Roberice Store</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 10mm 12mm 10mm;
        }
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          background: #ffffff !important;
          color: #111827 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 10.5pt;
          line-height: 1.4;
          width: 100%;
          height: auto;
          margin: 0;
          padding: 0;
        }
        .print-report-sheet {
          width: 100%;
          padding: 0;
          margin: 0;
          background: #ffffff;
        }
        .print-store-header {
          text-align: center;
          border-bottom: 2px double #1f4d32;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .print-store-header h1 {
          font-size: 18pt;
          font-weight: 800;
          color: #1f4d32 !important;
          margin: 0 0 3px 0;
          letter-spacing: 0.5px;
        }
        .print-store-header p {
          margin: 2px 0;
          font-size: 9pt;
          color: #4b5563;
        }
        .print-report-title {
          text-align: center;
          margin-bottom: 14px;
        }
        .print-report-title h2 {
          font-size: 13pt;
          font-weight: 700;
          margin: 0 0 3px 0;
          color: #111827;
          letter-spacing: 0.5px;
        }
        .print-report-title span {
          font-size: 10.5pt;
          color: #1f4d32;
          font-weight: 700;
        }
        .print-summary-grid {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 8px !important;
          background: #f9fafb !important;
          border: 1px solid #e5e7eb !important;
          padding: 10px 12px !important;
          border-radius: 6px !important;
          margin-bottom: 14px !important;
        }
        .print-stat-item .lbl {
          display: block;
          font-size: 8pt;
          text-transform: uppercase;
          color: #6b7280;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .print-stat-item .val {
          display: block;
          font-size: 12pt;
          font-weight: 800;
          color: #111827;
          margin-top: 2px;
        }
        h4 {
          margin: 14px 0 6px !important;
          font-size: 11pt !important;
          text-transform: uppercase !important;
          color: #374151 !important;
          border-bottom: 1px solid #d1d5db !important;
          padding-bottom: 4px !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin-bottom: 16px !important;
          font-size: 9.5pt !important;
        }
        th, td {
          border-bottom: 1px solid #e5e7eb !important;
          padding: 5px 8px !important;
        }
        th {
          background: #f3f4f6 !important;
          font-weight: 700;
          border-bottom: 2px solid #9ca3af !important;
          font-size: 8.5pt;
          text-transform: uppercase;
          color: #374151;
        }
        .print-signatures {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 40px !important;
          margin-top: 25px !important;
          padding-top: 15px !important;
          border-top: 1px solid #e5e7eb !important;
          page-break-inside: avoid;
        }
        .signature-box {
          text-align: center;
        }
        .signature-line {
          border-bottom: 1px solid #111;
          height: 30px;
          margin-bottom: 6px;
        }
        .signature-label {
          font-size: 9pt;
          font-weight: 600;
          color: #374151;
        }
      </style>
    </head>
    <body>
      <div class="print-report-sheet">
        ${contentHtml}
      </div>
    </body>
    </html>
  `);
  frameDoc.close();

  // Allow iframe layout to calculate completely then trigger print dialog
  setTimeout(() => {
    try {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    } catch (e) {
      console.warn('Iframe print error, falling back to window.print():', e);
      window.print();
    }
  }, 250);
}

async function exportSalesCSV() {
  try {
    const user = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};
    const formData = new FormData();
    formData.append('action', 'export_sales');
    formData.append('uploader', user.name || 'Admin User');

    const reportType = document.getElementById('filterReportType').value;
    formData.append('report_type', reportType);

    if (reportType === 'daily') {
      const dailyDate = document.getElementById('filterDailyDate').value;
      if (dailyDate) formData.append('daily_date', dailyDate);
    } else if (reportType === 'weekly') {
      const week = document.getElementById('filterWeekInput').value;
      if (week) formData.append('week', week);
    } else if (reportType === 'monthly') {
      const month = document.getElementById('filterMonthInput').value;
      if (month) formData.append('month', month);
    } else if (reportType === 'quarterly') {
      const quarter = document.getElementById('filterQuarter').value;
      const quarterYear = document.getElementById('filterQuarterYear').value;
      if (quarter) formData.append('quarter', quarter);
      if (quarterYear) formData.append('year', quarterYear);
    } else if (reportType === 'yearly') {
      const year = document.getElementById('filterYearInput').value;
      if (year) formData.append('year', year);
    } else if (reportType === 'custom') {
      const start = document.getElementById('filterStartDate').value;
      const end = document.getElementById('filterEndDate').value;
      if (start) formData.append('start_date', start);
      if (end) formData.append('end_date', end);
    }

    const origin = document.getElementById('filterOrigin').value;
    const cashier = document.getElementById('filterCashier').value;
    const payment = document.getElementById('filterPayment').value;

    if (origin !== 'all') formData.append('origin', origin);
    if (cashier !== 'all') formData.append('cashier_id', cashier);
    if (payment !== 'all') formData.append('payment_method', payment);

    const res = await fetch('api/file_manager.php', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Exported sales to ${data.file}! Available in File Management.`, 'success');
      // Trigger download
      window.open(`../uploads/${data.file}`, '_blank');
    } else {
      showToast(data.message || 'Export failed.', 'warning');
    }
  } catch (e) {
    console.error(e);
    showToast('Failed to export CSV.', 'danger');
  }
}
