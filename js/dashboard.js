/**
 * Roberice POS & Inventory System - Dashboard Page Logic
 */

let dashboardProducts = [];
let dashboardTransactions = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = JSON.parse(sessionStorage.getItem('roberice_logged_user'));

  if (user) {
    const subtitle = document.getElementById('welcomeSubtitle');
    if (subtitle) {
      subtitle.textContent = `Welcome back, ${user.name || user.username}! Here's your store overview.`;
    }
  }

  await loadDashboardData();
});

async function loadDashboardData() {
  try {
    const [productResponse, transactionResponse] = await Promise.all([
      fetch('api/get_products.php'),
      fetch('api/get_transactions.php')
    ]);

    const products = await productResponse.json();
    const transactions = await transactionResponse.json();

    dashboardProducts = products.map(p => ({
      id: String(p.product_id),
      name: p.product_name,
      category: p.category,
      origin: p.origin || 'Local',
      riceType: p.rice_type || p.category || 'White Rice',
      priceSack: Number(p.price_sack || 0),
      priceKg: Number(p.price_kg || 0),
      kgPerSack: Number(p.kg_per_sack || 50),
      stockSacks: Number(p.stock_sacks || 0),
      stockKg: Number(p.stock_kg || 0),
      packaged5kg: Number(p.packaged_5kg || 0),
      packaged10kg: Number(p.packaged_10kg || 0),
      packaged20kg: Number(p.packaged_20kg || 0),
      thresholdKg: Number(p.reorder_level_kg || 0),
      daysOld: Number(p.days_old !== undefined ? p.days_old : 0),
      status: p.product_status
    }));

    dashboardTransactions = transactions.map(t => ({
      id: String(t.transaction_id),
      timestamp: t.transaction_date,
      totalAmount: Number(t.total_amount),
      paymentMethod: t.payment_method,
      items: (t.items || []).map(i => ({
        productName: i.product_name,
        unit: i.unit,
        qty: Number(i.quantity),
        subtotal: Number(i.subtotal)
      }))
    }));

    loadDashboardMetrics();
    renderSalesBarChart('chartSalesTrend', dashboardTransactions);
    renderCategoryPieChart('chartProductCategories', dashboardTransactions, dashboardProducts);

  } catch (error) {
    console.error('Dashboard error:', error);
  }
}

function loadDashboardMetrics() {
  const products = dashboardProducts;
  const transactions = dashboardTransactions;

  document.getElementById('statTotalProducts').textContent = products.length;

  const totalValue = products.reduce((total, p) => {
    return total + (p.stockSacks * p.priceSack) + (p.stockKg * p.priceKg);
  }, 0);

  document.getElementById('statInventoryValue').textContent = formatCurrency(totalValue);

  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  const recentTransactions = transactions.filter(t => {
    return new Date(t.timestamp) >= sevenDaysAgo;
  });

  const salesTotal = recentTransactions.reduce((sum, t) => sum + t.totalAmount, 0);

  document.getElementById('statSalesCount').textContent = recentTransactions.length;
  document.getElementById('statSalesTotal').textContent = `${formatCurrency(salesTotal)} total`;

  const lowStockProducts = products.filter(p => isLowStock(p));
  document.getElementById('statLowStockCount').textContent = lowStockProducts.length;

  const oldStockCount = products.filter(p => p.daysOld > 60 && (p.stockSacks > 0 || p.stockKg > 0)).length;
  const oldStockEl = document.getElementById('statOldStockCount');
  if (oldStockEl) oldStockEl.textContent = oldStockCount;

  renderTopSelling(transactions, products);
  renderLowStockAlerts(lowStockProducts);
}

function renderTopSelling(transactions, products) {
  const container = document.getElementById('topSellingList');
  if (!container) return;

  const salesMap = {};

  products.forEach(p => {
    salesMap[p.name] = {
      name: p.name,
      category: p.category,
      qtySacks: 0,
      qtyKg: 0,
      revenue: 0
    };
  });

  transactions.forEach(t => {
    t.items.forEach(item => {
      if (!salesMap[item.productName]) return;

      if (item.unit === 'sack') {
        salesMap[item.productName].qtySacks += item.qty;
      } else {
        salesMap[item.productName].qtyKg += item.qty;
      }

      salesMap[item.productName].revenue += item.subtotal;
    });
  });

  const sorted = Object.values(salesMap)
    .filter(p => p.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  if (!sorted.length) {
    container.innerHTML = `<div class="empty-state">No sales recorded yet.</div>`;
    return;
  }

  container.innerHTML = sorted.map(item => `
    <div class="list-item">
      <div class="item-main">
        <span class="item-title">${item.name}</span>
        <span class="item-meta">
          Category: ${item.category} | Sold: ${item.qtySacks} sacks, ${item.qtyKg} kg
        </span>
      </div>
      <div class="item-badge-value">${formatCurrency(item.revenue)}</div>
    </div>
  `).join('');
}

function renderLowStockAlerts(products) {
  const container = document.getElementById('lowStockAlertList');
  if (!container) return;

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div>All items are well stocked!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(p => {
    const stockInfo = formatStock(p.stockSacks, p.stockKg, p.kgPerSack);

    return `
      <div class="list-item" style="border-left:3px solid var(--warning);">
        <div class="item-main">
          <span class="item-title">${p.name}</span>
          <span class="item-meta">
            Current Stock: <strong>${stockInfo.display}</strong>
            (Threshold: ${p.thresholdKg} kg)
          </span>
        </div>
        <a href="inventory.html" class="btn btn-warning btn-sm">Restock</a>
      </div>
    `;
  }).join('');
}