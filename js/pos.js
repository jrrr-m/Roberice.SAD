/**
 * Roberice POS & Inventory System - Point of Sale Script
 * Multi-Packaging & Tinatakal Retail Support
 */

let cart = [];
let productsCache = [];

document.addEventListener('DOMContentLoaded', () => initPOS());

async function initPOS() {
  await loadProducts();
  document.getElementById('searchProduct').addEventListener('input', renderProductGrid);
  document.getElementById('filterOrigin').addEventListener('change', renderProductGrid);
  document.getElementById('filterCategory').addEventListener('change', renderProductGrid);
  document.getElementById('btnClearCart').addEventListener('click', () => {
    cart = [];
    renderCart();
  });
  document.getElementById('inputPaymentReceived').addEventListener('input', calculateChange);
  document.getElementById('btnCompleteSale').addEventListener('click', processSale);
  renderCart();
}

async function loadProducts() {
  try {
    const response = await fetch('api/get_products.php');
    const data = await response.json();

    productsCache = data.map(p => ({
      id: String(p.product_id),
      name: p.product_name,
      category: p.category,
      origin: p.origin || 'Local',
      riceType: p.rice_type || p.category || 'White Rice',
      priceSack: Number(p.price_sack || 0),
      priceKg: Number(p.price_kg || 0),
      price5kg: Number(p.price_5kg || (p.price_kg * 5)),
      price10kg: Number(p.price_10kg || (p.price_kg * 10)),
      price20kg: Number(p.price_20kg || (p.price_kg * 20)),
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

    populateCategoryFilter();
    renderProductGrid();
  } catch (error) {
    console.error(error);
    showToast('Unable to load products.', 'danger');
  }
}

function populateCategoryFilter() {
  const select = document.getElementById('filterCategory');
  const current = select.value;
  const types = [...new Set(productsCache.map(p => p.riceType).filter(Boolean))];

  select.innerHTML = `<option value="all">All Rice Types</option>`;

  types.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    select.appendChild(option);
  });

  if ([...select.options].some(o => o.value === current)) select.value = current;
}

function renderProductGrid() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const search = document.getElementById('searchProduct').value.toLowerCase();
  const origin = document.getElementById('filterOrigin').value;
  const category = document.getElementById('filterCategory').value;

  const filtered = productsCache.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search) ||
      p.origin.toLowerCase().includes(search) ||
      p.riceType.toLowerCase().includes(search) ||
      p.category.toLowerCase().includes(search);

    const matchesOrigin = origin === 'all' || p.origin === origin;
    const matchesCategory = category === 'all' || p.riceType === category || p.category === category;

    return matchesSearch && matchesOrigin && matchesCategory;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No rice varieties found matching criteria.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const totalVolume = (p.stockSacks * p.kgPerSack) + p.stockKg + (p.packaged5kg * 5) + (p.packaged10kg * 10) + (p.packaged20kg * 20);
    const isOut = totalVolume <= 0;
    const lowStock = !isOut && totalVolume <= p.thresholdKg;

    let badge = `<span class="badge badge-success">In Stock</span>`;
    if (isOut) badge = `<span class="badge badge-danger">Out of Stock</span>`;
    else if (lowStock) badge = `<span class="badge badge-warning">Low Stock</span>`;

    const originBadge = p.origin === 'Imported'
      ? `<span class="badge badge-imported">Imported</span>`
      : `<span class="badge badge-local">Local</span>`;

    return `
      <div class="product-card ${isOut ? 'out-of-stock' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div class="product-card-title">${p.name}</div>
            <div style="display:flex;gap:4px;align-items:center;margin-top:2px;">
              ${originBadge}
              <span class="product-card-category">${p.riceType}</span>
            </div>
          </div>
          ${badge}
        </div>

        <div style="margin-top:8px;font-size:11px;font-weight:600;color:var(--text-muted);">
          SELECT PACKAGING / UNIT TO ADD:
        </div>

        <div class="pos-unit-group">
          <button type="button" class="pos-unit-btn" onclick="addToCart('${p.id}', 'sack')">
            Sack (${p.kgPerSack}k): ${formatCurrency(p.priceSack)}
          </button>
          <button type="button" class="pos-unit-btn" onclick="addToCart('${p.id}', '20kg')">
            20kg: ${formatCurrency(p.price20kg)}
          </button>
          <button type="button" class="pos-unit-btn" onclick="addToCart('${p.id}', '10kg')">
            10kg: ${formatCurrency(p.price10kg)}
          </button>
          <button type="button" class="pos-unit-btn" onclick="addToCart('${p.id}', '5kg')">
            5kg: ${formatCurrency(p.price5kg)}
          </button>
          <button type="button" class="pos-unit-btn" style="background:var(--primary-light);border-color:var(--primary);color:var(--primary);" onclick="addToCart('${p.id}', 'tinatakal', 1)">
            Tinatakal (Kg): ${formatCurrency(p.priceKg)}
          </button>
        </div>

        <div class="product-card-stock" style="margin-top:6px;font-size:11px;">
          Stock: <strong>${p.stockSacks} sacks</strong>, <strong>${p.stockKg} kg loose</strong>
          (Packs: <strong>${p.packaged5kg}</strong>x5k, <strong>${p.packaged10kg}</strong>x10k, <strong>${p.packaged20kg}</strong>x20k)
        </div>
      </div>
    `;
  }).join('');
}

function addToCart(productId, unit = 'sack', initialQty = 1) {
  const product = productsCache.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.productId === productId && item.unit === unit);

  if (existing) {
    existing.qty += initialQty;
  } else {
    cart.push({
      productId: product.id,
      productName: product.name,
      origin: product.origin,
      riceType: product.riceType,
      unit: unit,
      qty: initialQty,
      priceSack: product.priceSack,
      priceKg: product.priceKg,
      price5kg: product.price5kg,
      price10kg: product.price10kg,
      price20kg: product.price20kg
    });
  }

  showToast(`Added ${product.name} (${formatUnitLabel(unit)}) to order.`, 'success');
  renderCart();
}

function formatUnitLabel(unit) {
  if (unit === 'sack') return 'Sack';
  if (unit === '5kg') return '5kg Pack';
  if (unit === '10kg') return '10kg Pack';
  if (unit === '20kg') return '20kg Pack';
  return 'Tinatakal (Kg)';
}

function getItemUnitPrice(item) {
  if (item.unit === 'sack') return item.priceSack;
  if (item.unit === '5kg') return item.price5kg;
  if (item.unit === '10kg') return item.price10kg;
  if (item.unit === '20kg') return item.price20kg;
  return item.priceKg; // tinatakal / loose kg
}

function renderCart() {
  const container = document.getElementById('cartItemsList');
  if (!container) return;

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div>Cart is empty. Select a rice variety and packaging option above to start sale.</div>
      </div>
    `;
    updateTotals();
    return;
  }

  container.innerHTML = cart.map((item, index) => {
    const unitPrice = getItemUnitPrice(item);
    const subtotal = unitPrice * item.qty;
    const isTinatakal = item.unit === 'tinatakal' || item.unit === 'kg';

    return `
      <div class="cart-item">
        <div class="cart-item-top">
          <div>
            <span class="cart-item-name">${item.productName}</span>
            <span style="font-size:11px;color:var(--text-muted);margin-left:4px;">(${item.origin})</span>
          </div>
          <button class="btn-remove-item" onclick="removeFromCart(${index})" title="Remove item">&times;</button>
        </div>

        <!-- Packaging Selection Pills -->
        <div class="pos-unit-group" style="margin:4px 0 6px;">
          <button class="pos-unit-btn ${item.unit === 'sack' ? 'active' : ''}" onclick="toggleUnit(${index}, 'sack')">Sack</button>
          <button class="pos-unit-btn ${item.unit === '20kg' ? 'active' : ''}" onclick="toggleUnit(${index}, '20kg')">20kg</button>
          <button class="pos-unit-btn ${item.unit === '10kg' ? 'active' : ''}" onclick="toggleUnit(${index}, '10kg')">10kg</button>
          <button class="pos-unit-btn ${item.unit === '5kg' ? 'active' : ''}" onclick="toggleUnit(${index}, '5kg')">5kg</button>
          <button class="pos-unit-btn ${isTinatakal ? 'active' : ''}" onclick="toggleUnit(${index}, 'tinatakal')">Tinatakal (Kg)</button>
        </div>

        <div class="cart-item-controls">
          <div class="qty-control">
            <button class="qty-btn" onclick="updateQty(${index}, ${item.qty - (isTinatakal ? 0.5 : 1)})">-</button>
            <input
              type="number"
              class="qty-input"
              value="${item.qty}"
              min="0.1"
              step="${isTinatakal ? '0.1' : '1'}"
              style="width: 70px;"
              onchange="updateQty(${index}, parseFloat(this.value))"
            >
            <button class="qty-btn" onclick="updateQty(${index}, ${item.qty + (isTinatakal ? 0.5 : 1)})">+</button>
          </div>

          <div style="text-align:right;">
            <div style="font-size:11px;color:var(--text-muted);">${formatCurrency(unitPrice)} / ${isTinatakal ? 'kg' : item.unit}</div>
            <div class="cart-item-price">${formatCurrency(subtotal)}</div>
          </div>
        </div>

        ${isTinatakal ? `
          <div class="tinatakal-chips-bar">
            <span style="font-size:10px;color:var(--text-muted);">Quick scoop:</span>
            <button type="button" class="tinatakal-chip" onclick="setTinatakalQty(${index}, 0.5)">+0.5kg</button>
            <button type="button" class="tinatakal-chip" onclick="setTinatakalQty(${index}, 1.0)">+1kg</button>
            <button type="button" class="tinatakal-chip" onclick="setTinatakalQty(${index}, 2.0)">+2kg</button>
            <button type="button" class="tinatakal-chip" onclick="setTinatakalQty(${index}, 3.0)">+3kg</button>
            <button type="button" class="tinatakal-chip" onclick="setTinatakalQty(${index}, 5.0)">+5kg</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  updateTotals();
}

function toggleUnit(index, unit) {
  if (!cart[index]) return;
  cart[index].unit = unit;
  if (unit !== 'tinatakal' && unit !== 'kg') {
    cart[index].qty = Math.max(1, Math.floor(cart[index].qty));
  }
  renderCart();
}

function setTinatakalQty(index, addKg) {
  if (!cart[index]) return;
  cart[index].qty = Math.round((cart[index].qty + addKg) * 100) / 100;
  renderCart();
}

function updateQty(index, qty) {
  if (!cart[index]) return;

  qty = Number(qty);
  if (!qty || qty <= 0) {
    removeFromCart(index);
    return;
  }

  if (cart[index].unit !== 'tinatakal' && cart[index].unit !== 'kg') {
    qty = Math.floor(qty);
  }

  cart[index].qty = Math.round(qty * 100) / 100;
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function getGrandTotal() {
  return cart.reduce((total, item) => {
    const price = getItemUnitPrice(item);
    return total + (price * item.qty);
  }, 0);
}

function updateTotals() {
  const total = getGrandTotal();
  document.getElementById('lblSubtotal').textContent = formatCurrency(total);
  document.getElementById('lblTotal').textContent = formatCurrency(total);
  calculateChange();
}

function calculateChange() {
  const total = getGrandTotal();
  const payment = parseFloat(document.getElementById('inputPaymentReceived').value) || 0;
  const change = payment - total;
  const button = document.getElementById('btnCompleteSale');
  const label = document.getElementById('lblChange');

  if (cart.length && total > 0 && payment >= total) {
    button.disabled = false;
    label.textContent = formatCurrency(change);
    label.style.color = 'var(--success-text)';
  } else {
    button.disabled = true;
    label.textContent = payment > 0 && payment < total ? 'Insufficient Amount' : '₱0.00';
    label.style.color = payment > 0 && payment < total ? 'var(--danger-text)' : 'var(--text-main)';
  }
}

async function processSale() {
  if (!cart.length) return;

  const paymentReceived = parseFloat(document.getElementById('inputPaymentReceived').value) || 0;
  const paymentMethod = document.getElementById('paymentMethod').value;
  const user = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};

  showPageLoader('Processing checkout & updating inventory in database...');

  try {
    const response = await fetch('api/process_sale.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user.username || 'admin',
        paymentReceived,
        paymentMethod,
        items: cart.map(item => ({
          productId: item.productId,
          unit: item.unit,
          qty: item.qty
        }))
      })
    });

    const result = await response.json();

    if (!result.success) {
      hidePageLoader();
      showToast(result.message || 'Unable to complete sale.', 'danger');
      return;
    }

    const transaction = {
      id: 'TXN-' + String(result.transactionId).padStart(4, '0'),
      timestamp: new Date().toLocaleString(),
      cashierName: result.cashierName,
      items: result.items,
      totalAmount: Number(result.totalAmount),
      paymentReceived: Number(result.paymentReceived),
      changeAmount: Number(result.changeAmount),
      paymentMethod: result.paymentMethod
    };

    renderReceiptModal(transaction);
    if (typeof addAuditLog === 'function') {
      addAuditLog('Sale Completed', `Processed transaction ${transaction.id} for ${formatCurrency(transaction.totalAmount)} (${transaction.paymentMethod}).`);
    }

    cart = [];
    document.getElementById('inputPaymentReceived').value = '';
    renderCart();
    await loadProducts();

    showToast(`Sale completed! Txn: ${transaction.id}`, 'success');
  } catch (error) {
    console.error(error);
    showToast('Unable to complete sale.', 'danger');
  }
}

function renderReceiptModal(txn) {
  const container = document.getElementById('receiptContent');
  if (!container) return;

  const items = txn.items.map(i => {
    let unitDisplay = i.unit;
    if (i.unit === 'tinatakal') unitDisplay = 'kg tinatakal';
    else if (i.unit === '5kg') unitDisplay = '5kg pack';
    else if (i.unit === '10kg') unitDisplay = '10kg pack';
    else if (i.unit === '20kg') unitDisplay = '20kg pack';
    else if (i.unit === 'sack') unitDisplay = 'sack';

    return `
      <div class="receipt-row">
        <span>${i.productName} (${i.qty} ${unitDisplay})</span>
        <span>${formatCurrency(Number(i.subtotal))}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="receipt-header">
      <h2>ROBERICE STORE</h2>
      <div>Rice Wholesaler & Retailer</div>
      <div>Official Sales Receipt</div>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-row"><span>Txn ID:</span><span>${txn.id}</span></div>
    <div class="receipt-row"><span>Date/Time:</span><span>${txn.timestamp}</span></div>
    <div class="receipt-row"><span>Cashier:</span><span>${txn.cashierName}</span></div>
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
    <div class="receipt-row"><span>Change:</span><span>${formatCurrency(txn.changeAmount)}</span></div>
    <div class="receipt-divider"></div>
    <div style="text-align:center;margin-top:10px;">Thank you for shopping at Roberice!</div>
  `;

  openModal('modalReceipt');
}