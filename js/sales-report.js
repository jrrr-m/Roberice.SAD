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

  showTopLoader();

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
