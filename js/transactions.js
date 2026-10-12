/**
 * Roberice POS & Inventory System - Transaction History Script
 */

let transactionsCache = [];

document.addEventListener('DOMContentLoaded', () => initTransactionsPage());

async function initTransactionsPage() {
  await loadTransactions();

  const currentUser = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};
  const filterCashier = document.getElementById('filterCashier');

  if (currentUser.role === 'cashier') {
    document.getElementById('txnPageSubtitle').textContent =
      `Showing your transactions for today's shift reconciliation (${currentUser.name || currentUser.username}).`;

    filterCashier.style.display = 'none';
  } else {
    populateCashiers();
  }

  renderTransactions();

  document.getElementById('searchTxn').addEventListener('input', renderTransactions);
  document.getElementById('filterCashier').addEventListener('change', renderTransactions);
  document.getElementById('filterMethod').addEventListener('change', renderTransactions);
}

async function loadTransactions() {
  try {
    const response = await fetch('api/get_transactions.php');

    if (!response.ok) {
      throw new Error('Failed to load transactions.');
    }

    const data = await response.json();

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

function populateCashiers() {
  const select = document.getElementById('filterCashier');

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

  const today = new Date().toISOString().split('T')[0];

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

  tbody.innerHTML = filtered.map(t => {
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