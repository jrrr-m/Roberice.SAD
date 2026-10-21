/**
 * Roberice POS & Inventory System - Transaction History Script
 */

let transactionsCache = [];

let currentTxnPage = 1;
const txnPageSize = 150;
let totalTxnRecords = 0;

document.addEventListener('DOMContentLoaded', () => initTransactionsPage());

async function initTransactionsPage() {
  await loadTransactions(1);

  const currentUser = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};
  const filterCashier = document.getElementById('filterCashier');

  if (currentUser.role === 'cashier') {
    const subtitle = document.getElementById('txnPageSubtitle');
    if (subtitle) {
      subtitle.textContent =
        `Showing your transactions for today's shift reconciliation (${currentUser.name || currentUser.username}).`;
    }
    if (filterCashier) filterCashier.style.display = 'none';
  } else {
    populateCashiers();
  }

  renderTransactions();

  // Debounced filter listeners that trigger server-side reload
  let searchTimeout = null;
  document.getElementById('searchTxn').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      await loadTransactions(1);
      renderTransactions();
    }, 300);
  });

  document.getElementById('filterCashier').addEventListener('change', async () => {
    await loadTransactions(1);
    renderTransactions();
  });

  document.getElementById('filterMethod').addEventListener('change', async () => {
    await loadTransactions(1);
    renderTransactions();
  });

  // Pagination button listeners
  const btnPrev = document.getElementById('btnPrevTxnPage');
  if (btnPrev) {
    btnPrev.addEventListener('click', async () => {
      if (currentTxnPage > 1) {
        btnPrev.disabled = true;
        await loadTransactions(currentTxnPage - 1);
        renderTransactions();
      }
    });
  }

  const btnNext = document.getElementById('btnNextTxnPage');
  if (btnNext) {
    btnNext.addEventListener('click', async () => {
      if (currentTxnPage * txnPageSize < totalTxnRecords) {
        btnNext.disabled = true;
        await loadTransactions(currentTxnPage + 1);
        renderTransactions();
      }
    });
  }
}

async function loadTransactions(page = 1) {
  try {
    currentTxnPage = page;
    const offset = (page - 1) * txnPageSize;
    const search = (document.getElementById('searchTxn')?.value || '').trim();
    const cashier = document.getElementById('filterCashier')?.value || 'all';
    const method = document.getElementById('filterMethod')?.value || 'all';

    let url = `api/get_transactions.php?limit=${txnPageSize}&offset=${offset}&format=paged`;
    if (cashier !== 'all') url += `&cashier=${encodeURIComponent(cashier)}`;
    if (method !== 'all') url += `&method=${encodeURIComponent(method)}`;
    if (search !== '') url += `&search=${encodeURIComponent(search)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to load transactions.');
    }

    const raw = await response.json();
    const data = Array.isArray(raw) ? raw : (raw.transactions || []);
    totalTxnRecords = raw.total !== undefined ? raw.total : data.length;

    transactionsCache = data.map(t => ({
      id: 'TXN-' + String(t.transaction_id).padStart(4, '0'),
      dbId: String(t.transaction_id),
      timestamp: t.transaction_date,
      cashierId: String(t.user_id),
      cashierUsername: t.username,
      cashierName: t.full_name,
      totalAmount: Number(t.total_amount),
      paymentReceived: Number(t.payment_amount),
      changeAmount: Number(t.change_amount),
      paymentMethod: t.payment_method,
      status: t.transaction_status,

      items: (t.items || []).map(i => ({
        productName: i.product_name,
        unit: i.unit,
        qty: Number(i.quantity),
        unitPrice: Number(i.unit_price),
        subtotal: Number(i.subtotal)
      }))
    }));
  } catch (error) {
    console.error(error);
    transactionsCache = [];
  }
}

async function populateCashiers() {
  const select = document.getElementById('filterCashier');
  if (!select) return;

  try {
    const res = await fetch('api/users.php');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        select.innerHTML = '<option value="all">All Cashiers</option>';
        data.users.forEach(u => {
          const opt = document.createElement('option');
          opt.value = u.user_id;
          opt.textContent = `${u.full_name} (${u.role})`;
          select.appendChild(opt);
        });
        return;
      }
    }
  } catch (e) {
    // Fallback to cache
  }

  const cashiers = [
    ...new Map(
      transactionsCache.map(t => [
        t.cashierId,
        {
          id: t.cashierId,
          name: t.cashierName
        }
      ])
    ).values()
  ];

  cashiers.forEach(cashier => {
    const option = document.createElement('option');
    option.value = cashier.id;
    option.textContent = cashier.name;
    select.appendChild(option);
  });
}

function renderTransactions() {
  const tbody = document.getElementById('txnTableBody');
  if (!tbody) return;

  const currentUser = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};
  const isCashier = currentUser.role === 'cashier';

  const search = document.getElementById('searchTxn').value.toLowerCase();
  const cashier = document.getElementById('filterCashier').value;
  const method = document.getElementById('filterMethod').value;

  const today = typeof getLocalDateString === 'function' ? getLocalDateString() : new Date().toLocaleDateString('en-CA');

  const filtered = transactionsCache.filter(t => {
    if (isCashier) {
      const transactionDate = t.timestamp.split(' ')[0];

      if (
        t.cashierUsername !== currentUser.username ||
        transactionDate !== today
      ) {
        return false;
      }
    }

    if (!isCashier && cashier !== 'all' && t.cashierId !== cashier) {
      return false;
    }

    if (method !== 'all' && t.paymentMethod !== method) {
      return false;
    }

    const items = t.items
      .map(i => `${i.productName} ${i.qty} ${i.unit}`)
      .join(' ');

    const searchTarget =
      `${t.id} ${t.cashierName} ${t.paymentMethod} ${items}`.toLowerCase();

    return searchTarget.includes(search);
  });

  const totalRevenue = filtered.reduce(
    (sum, t) => sum + t.totalAmount,
    0
  );

  const cashCollected = filtered
    .filter(t => t.paymentMethod === 'Cash')
    .reduce((sum, t) => sum + t.totalAmount, 0);

  document.getElementById('summaryCount').textContent = filtered.length;
  document.getElementById('summaryTotal').textContent = formatCurrency(totalRevenue);
  document.getElementById('summaryCash').textContent = formatCurrency(cashCollected);

  if (!filtered.length) {
    tbody.innerHTML =
      `<tr><td colspan="7" class="empty-state">No transaction records found.</td></tr>`;
    return;
  }

  // Display up to 150 transactions for responsive DOM performance
  const displayLimit = 150;
  const toDisplay = filtered.slice(0, displayLimit);

  let rowsHtml = toDisplay.map(t => {
    const items = t.items.map(i =>
      `${i.productName} <span style="color:var(--text-muted);">(${i.qty} ${i.unit})</span>`
    ).join(', ');

    return `
      <tr>
        <td><code>${t.id}</code></td>
        <td>${formatDateTime(t.timestamp)}</td>
        <td><strong>${t.cashierName}</strong></td>
        <td style="max-width:260px;">${items}</td>
        <td><span class="badge badge-info">${t.paymentMethod}</span></td>
        <td><strong>${formatCurrency(t.totalAmount)}</strong></td>
        <td>
          <button class="btn btn-secondary btn-sm"
            onclick="viewTxnReceipt('${t.dbId}')">
            View Receipt
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rowsHtml;

  // Synchronize pagination controls
  const paginationBar = document.getElementById('txnPaginationBar');
  const paginationInfo = document.getElementById('txnPaginationInfo');
  const btnPrev = document.getElementById('btnPrevTxnPage');
  const btnNext = document.getElementById('btnNextTxnPage');

  if (paginationBar) {
    if (totalTxnRecords > 0) {
      paginationBar.style.display = 'flex';
      const startIdx = (currentTxnPage - 1) * txnPageSize + 1;
      const endIdx = Math.min(currentTxnPage * txnPageSize, totalTxnRecords);
      if (paginationInfo) {
        paginationInfo.textContent = `Showing ${startIdx.toLocaleString()}–${endIdx.toLocaleString()} of ${totalTxnRecords.toLocaleString()} transactions (Page ${currentTxnPage})`;
      }
      if (btnPrev) btnPrev.disabled = currentTxnPage <= 1;
      if (btnNext) btnNext.disabled = endIdx >= totalTxnRecords;
    } else {
      paginationBar.style.display = 'none';
    }
  }
}

function viewTxnReceipt(transactionId) {
  const txn = transactionsCache.find(t => t.dbId === transactionId);
  if (!txn) return;

  const container = document.getElementById('receiptContent');
  if (!container) return;

  const items = txn.items.map(i => `
    <div class="receipt-row">
      <span>${i.productName} (${i.qty} ${i.unit})</span>
      <span>${formatCurrency(i.subtotal)}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="receipt-header">
      <h2>ROBERICE</h2>
      <div style="font-size:11px;margin-bottom:2px;font-weight:600;">Address: 73 Farmers st. Corner Ampalaya, Marikina 1800</div>
      <div>Rice Wholesaler & Retailer</div>
      <div>Official Sales Receipt</div>
    </div>

    <div class="receipt-divider"></div>

    <div class="receipt-row">
      <span>Txn ID:</span>
      <span>${txn.id}</span>
    </div>

    <div class="receipt-row">
      <span>Date/Time:</span>
      <span>${txn.timestamp}</span>
    </div>

    <div class="receipt-row">
      <span>Cashier:</span>
      <span>${txn.cashierName}</span>
    </div>

    <div class="receipt-divider"></div>

    ${items}

    <div class="receipt-divider"></div>

    <div class="receipt-row" style="font-weight:bold;font-size:14px;">
      <span>TOTAL AMOUNT:</span>
      <span>${formatCurrency(txn.totalAmount)}</span>
    </div>

    <div class="receipt-row">
      <span>Payment (${txn.paymentMethod}):</span>
      <span>${formatCurrency(txn.paymentReceived)}</span>
    </div>

    <div class="receipt-row">
      <span>Change:</span>
      <span>${formatCurrency(txn.changeAmount)}</span>
    </div>

    <div class="receipt-divider"></div>

    <div style="text-align:center;margin-top:10px;">
      Thank you for shopping at Roberice!
    </div>
  `;

  openModal('modalReceipt');
}