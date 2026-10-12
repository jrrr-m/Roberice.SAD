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

  const pkgKgInp = document.getElementById('pkgCustomKgInput');
  if (pkgKgInp) pkgKgInp.addEventListener('input', updateModalSubtotal);
  const pkgQtyInp = document.getElementById('pkgModalQtyInput');
  if (pkgQtyInp) pkgQtyInp.addEventListener('input', updateModalSubtotal);

  const btnPosOpenSack = document.getElementById('btnPosOpenSack');
  if (btnPosOpenSack) btnPosOpenSack.addEventListener('click', () => openPosOpenSackModal());
  const formPosOpenSack = document.getElementById('posOpenSackForm');
  if (formPosOpenSack) formPosOpenSack.addEventListener('submit', handlePosOpenSackSubmit);
  const selPosProd = document.getElementById('posOpenSackProduct');
  const selPosBatch = document.getElementById('posOpenSackBatch');
  const selPosType = document.getElementById('posOpenSackType');
  const inpPosQty = document.getElementById('posOpenSackQty');
  if (selPosProd) selPosProd.addEventListener('change', () => {
    updatePosOpenSackBatches();
    updatePosOpenSackPreview();
  });
  if (selPosBatch) selPosBatch.addEventListener('change', updatePosOpenSackPreview);
  if (selPosType) selPosType.addEventListener('change', updatePosOpenSackPreview);
  if (inpPosQty) inpPosQty.addEventListener('input', updatePosOpenSackPreview);

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
      price25kg: Number(p.price_25kg || (p.price_sack ? p.price_sack / 2 : p.price_kg * 25)),
      priceKg: Number(p.price_kg || 0),
      price5kg: Number(p.price_5kg || (p.price_kg * 5)),
      price10kg: Number(p.price_10kg || (p.price_kg * 10)),
      price20kg: Number(p.price_20kg || (p.price_kg * 20)),
      kgPerSack: 50,
      stockSacks: Number(p.stock_sacks || 0),
      packaged25kg: Number(p.packaged_25kg || 0),
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
    const totalVolume = (p.stockSacks * 50) + (p.packaged25kg * 25) + (p.packaged20kg * 20) + (p.packaged10kg * 10) + (p.packaged5kg * 5) + p.stockKg;
    const isOut = totalVolume <= 0;

    const originBadge = p.origin === 'Imported'
      ? `<span class="badge badge-imported" style="font-size:11px;">Imported</span>`
      : `<span class="badge badge-local" style="font-size:11px;">Local</span>`;

    const statusBadge = isOut
      ? `<span class="badge badge-danger" style="background:#fee2e2;color:#991b1b;font-weight:700;">● Out of Stock</span>`
      : `<span class="badge badge-success" style="background:#d1fae5;color:#065f46;font-weight:700;">● Available</span>`;

    return `
      <div
        class="product-card ${isOut ? 'out-of-stock disabled' : ''}"
        ${isOut ? '' : `onclick="openPackagingModal('${p.id}')"`}
        title="${isOut ? 'Out of Stock (Not Clickable)' : 'Click to choose packaging or loose kilos'}"
      >
        <div class="product-card-header">
          <div class="product-card-title">${p.name}</div>
          ${statusBadge}
        </div>

        <div class="product-card-meta">
          ${originBadge}
          <span class="product-card-type">${p.riceType || 'Rice'}</span>
        </div>

        <div class="product-card-footer">
          <span class="product-card-price-hint">₱${formatNumber(p.priceKg)}/kg • ₱${formatNumber(p.priceSack)}/sack</span>
          <span class="product-card-action-icon">${isOut ? '🚫 Unavailable' : '🛒 Choose Packaging ➜'}</span>
        </div>
      </div>
    `;
  }).join('');
}

let activeModalProduct = null;
let activeModalUnit = 'sack';

function openPackagingModal(productId) {
  const product = productsCache.find(p => p.id === productId);
  if (!product) return;

  activeModalProduct = product;
  activeModalUnit = 'sack';

  document.getElementById('modalPkgProductName').textContent = product.name;
  document.getElementById('modalPkgRiceType').textContent = product.riceType || 'Rice';

  const originEl = document.getElementById('modalPkgOriginBadge');
  if (originEl) {
    originEl.textContent = product.origin;
    originEl.className = product.origin === 'Imported' ? 'badge badge-imported' : 'badge badge-local';
  }

  const batchSelect = document.getElementById('modalPkgBatchSelect');
  if (batchSelect) {
    const batches = getProductBatches(product);
    batchSelect.innerHTML = batches.map(b => `
      <option value="${b.batchNumber}">${b.label}</option>
    `).join('');
  }

  const totalVolume = (product.stockSacks * 50) + (product.packaged25kg * 25) + (product.packaged20kg * 20) + (product.packaged10kg * 10) + (product.packaged5kg * 5) + product.stockKg;
  const statusEl = document.getElementById('modalPkgStockStatus');
  if (statusEl) {
    statusEl.textContent = totalVolume > 0 ? '● Available' : '● Out of Stock';
    statusEl.className = totalVolume > 0 ? 'badge badge-success' : 'badge badge-danger';
  }

  const optionsGrid = document.getElementById('modalPkgOptionsGrid');
  if (optionsGrid) {
    optionsGrid.innerHTML = `
      <!-- Whole Sack 50kg -->
      <div class="pkg-option-card active" id="pkgOpt_sack" onclick="selectModalUnit('sack')">
        <div class="pkg-option-title">Whole Sack (50 Kilos)</div>
        <div class="pkg-option-price">${formatCurrency(product.priceSack)}</div>
        <div class="pkg-option-stock">Stock: <strong>${product.stockSacks}</strong> sacks</div>
      </div>

      <!-- Half Sack 25kg -->
      <div class="pkg-option-card" id="pkgOpt_25kg" onclick="selectModalUnit('25kg')">
        <div class="pkg-option-title">Half Sack (25 Kilos)</div>
        <div class="pkg-option-price">${formatCurrency(product.price25kg)}</div>
        <div class="pkg-option-stock">Stock: <strong>${product.packaged25kg}</strong> half sacks</div>
      </div>

      <!-- 20kg Sack -->
      <div class="pkg-option-card" id="pkgOpt_20kg" onclick="selectModalUnit('20kg')">
        <div class="pkg-option-title">20 Kilos Sack</div>
        <div class="pkg-option-price">${formatCurrency(product.price20kg)}</div>
        <div class="pkg-option-stock">Stock: <strong>${product.packaged20kg}</strong> sacks</div>
      </div>

      <!-- 10kg Sack -->
      <div class="pkg-option-card" id="pkgOpt_10kg" onclick="selectModalUnit('10kg')">
        <div class="pkg-option-title">10 Kilos Sack</div>
        <div class="pkg-option-price">${formatCurrency(product.price10kg)}</div>
        <div class="pkg-option-stock">Stock: <strong>${product.packaged10kg}</strong> sacks</div>
      </div>

      <!-- 5kg Sack -->
      <div class="pkg-option-card" id="pkgOpt_5kg" onclick="selectModalUnit('5kg')">
        <div class="pkg-option-title">5 Kilos Sack</div>
        <div class="pkg-option-price">${formatCurrency(product.price5kg)}</div>
        <div class="pkg-option-stock">Stock: <strong>${product.packaged5kg}</strong> sacks</div>
      </div>

      <!-- Specified Kilos (Loose Rice / Tinatakal) -->
      <div class="pkg-option-card" id="pkgOpt_tinatakal" onclick="selectModalUnit('tinatakal')">
        <div class="pkg-option-title">Specified Kilos (Loose Rice)</div>
        <div class="pkg-option-price">${formatCurrency(product.priceKg)} <span style="font-size:11px;font-weight:500;">/ kg</span></div>
        <div class="pkg-option-stock">Loose Stock: <strong>${formatNumber(product.stockKg)}</strong> kg</div>
      </div>
    `;
  }

  const qtyInput = document.getElementById('pkgModalQtyInput');
  if (qtyInput) qtyInput.value = '1';

  const kgInput = document.getElementById('pkgCustomKgInput');
  if (kgInput) kgInput.value = '1';

  const looseInfo = document.getElementById('pkgLooseStockInfo');
  if (looseInfo) looseInfo.textContent = `Loose Stock: ${formatNumber(product.stockKg)} kg`;

  selectModalUnit('sack');
  openModal('modalProductPackaging');
}

function selectModalUnit(unit) {
  activeModalUnit = unit;

  ['sack', '25kg', '20kg', '10kg', '5kg', 'tinatakal'].forEach(u => {
    const el = document.getElementById(`pkgOpt_${u}`);
    if (el) {
      if (u === unit) el.classList.add('active');
      else el.classList.remove('active');
    }
  });

  const customSec = document.getElementById('pkgCustomKgSection');
  const sackSec = document.getElementById('pkgSackQtySection');

  if (unit === 'tinatakal') {
    if (customSec) customSec.style.display = 'block';
    if (sackSec) sackSec.style.display = 'none';
  } else {
    if (customSec) customSec.style.display = 'none';
    if (sackSec) sackSec.style.display = 'flex';
  }

  updateModalSubtotal();
}

function setModalCustomKg(kg) {
  const input = document.getElementById('pkgCustomKgInput');
  if (input) {
    input.value = kg;
    updateModalSubtotal();
  }
}

function stepModalQty(delta) {
  const input = document.getElementById('pkgModalQtyInput');
  if (input) {
    const current = parseInt(input.value) || 1;
    input.value = Math.max(1, current + delta);
    updateModalSubtotal();
  }
}

function updateModalSubtotal() {
  if (!activeModalProduct) return;

  const subtotalEl = document.getElementById('modalPkgSubtotal');
  const labelEl = document.getElementById('modalPkgSelectedLabel');
  const autoNote = document.getElementById('pkgAutoOpenNote');

  let price = 0;
  let qty = 1;
  let label = '';

  if (activeModalUnit === 'tinatakal') {
    const kgInput = document.getElementById('pkgCustomKgInput');
    qty = parseFloat(kgInput ? kgInput.value : 1) || 1;
    price = activeModalProduct.priceKg * qty;
    label = `Specified Kilos (${qty} kg @ ${formatCurrency(activeModalProduct.priceKg)}/kg)`;

    if (autoNote) {
      if (qty > activeModalProduct.stockKg) {
        autoNote.style.display = 'block';
      } else {
        autoNote.style.display = 'none';
      }
    }
  } else {
    const qtyInput = document.getElementById('pkgModalQtyInput');
    qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;

    let unitPrice = activeModalProduct.priceSack;
    let unitName = 'Whole Sack (50kg)';

    if (activeModalUnit === '25kg') {
      unitPrice = activeModalProduct.price25kg;
      unitName = 'Half Sack (25kg)';
    } else if (activeModalUnit === '20kg') {
      unitPrice = activeModalProduct.price20kg;
      unitName = '20kg Sack';
    } else if (activeModalUnit === '10kg') {
      unitPrice = activeModalProduct.price10kg;
      unitName = '10kg Sack';
    } else if (activeModalUnit === '5kg') {
      unitPrice = activeModalProduct.price5kg;
      unitName = '5kg Sack';
    }

    price = unitPrice * qty;
    label = `${unitName} x ${qty}`;
    if (autoNote) autoNote.style.display = 'none';
  }

  if (subtotalEl) subtotalEl.textContent = formatCurrency(price);
  if (labelEl) labelEl.textContent = label;
}

function confirmModalAddToCart() {
  if (!activeModalProduct) return;

  let qty = 1;
  if (activeModalUnit === 'tinatakal') {
    const kgInput = document.getElementById('pkgCustomKgInput');
    qty = parseFloat(kgInput ? kgInput.value : 1) || 1;
    if (qty <= 0) {
      showToast('Please enter a valid kilo amount.', 'warning');
      return;
    }
  } else {
    const qtyInput = document.getElementById('pkgModalQtyInput');
    qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
    if (qty <= 0) {
      showToast('Please enter a valid quantity.', 'warning');
      return;
    }
  }

  const batchSelect = document.getElementById('modalPkgBatchSelect');
  const batchNumber = batchSelect ? batchSelect.value : (activeModalProduct ? activeModalProduct.batchNumber : 'BATCH-001');

  addToCart(activeModalProduct.id, activeModalUnit, qty, batchNumber);
  closeModal('modalProductPackaging');
}

function addToCart(productId, unit = 'sack', initialQty = 1, batchNumber = null) {
  const product = productsCache.find(p => p.id === productId);
  if (!product) return;

  const itemBatch = batchNumber || product.batchNumber || 'BATCH-001';
  const existing = cart.find(item => item.productId === productId && item.unit === unit && item.batchNumber === itemBatch);

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
      batchNumber: itemBatch,
      priceSack: product.priceSack,
      price25kg: product.price25kg,
      priceKg: product.priceKg,
      price5kg: product.price5kg,
      price10kg: product.price10kg,
      price20kg: product.price20kg
    });
  }

  showToast(`Added ${product.name} (${formatUnitLabel(unit)} • ${itemBatch}) to order.`, 'success');
  renderCart();
}

function formatUnitLabel(unit) {
  if (unit === 'sack' || unit === '50kg') return 'Whole Sack (50kg)';
  if (unit === '25kg' || unit === 'half') return 'Half Sack (25kg)';
  if (unit === '20kg') return '20kg Pack';
  if (unit === '10kg') return '10kg Pack';
  if (unit === '5kg') return '5kg Pack';
  return 'Tinatakal (Kg)';
}

function getItemUnitPrice(item) {
  if (item.unit === 'sack' || item.unit === '50kg') return item.priceSack;
  if (item.unit === '25kg' || item.unit === 'half') return item.price25kg;
  if (item.unit === '20kg') return item.price20kg;
  if (item.unit === '10kg') return item.price10kg;
  if (item.unit === '5kg') return item.price5kg;
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
            ${item.batchNumber ? `<span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:10px;margin-left:4px;padding:2px 5px;">${item.batchNumber}</span>` : ''}
          </div>
          <button class="btn-remove-item" onclick="removeFromCart(${index})" title="Remove item">&times;</button>
        </div>

        <!-- Packaging Selection Pills -->
        <div class="pos-unit-group" style="margin:4px 0 6px;">
          <button class="pos-unit-btn ${item.unit === 'sack' ? 'active' : ''}" onclick="toggleUnit(${index}, 'sack')">50k Whole</button>
          <button class="pos-unit-btn ${item.unit === '25kg' ? 'active' : ''}" onclick="toggleUnit(${index}, '25kg')">25k Half</button>
          <button class="pos-unit-btn ${item.unit === '20kg' ? 'active' : ''}" onclick="toggleUnit(${index}, '20kg')">20kg</button>
          <button class="pos-unit-btn ${item.unit === '10kg' ? 'active' : ''}" onclick="toggleUnit(${index}, '10kg')">10kg</button>
          <button class="pos-unit-btn ${item.unit === '5kg' ? 'active' : ''}" onclick="toggleUnit(${index}, '5kg')">5kg</button>
          <button class="pos-unit-btn ${isTinatakal ? 'active' : ''}" onclick="toggleUnit(${index}, 'tinatakal')">Tinatakal</button>
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
          ${(() => {
            const prod = productsCache.find(p => p.id === item.productId);
            const availLoose = prod ? prod.stockKg : 0;
            if (prod && availLoose < item.qty) {
              return `
                <div style="margin-top:6px;font-size:11px;background:#fef3c7;color:#92400e;padding:4px 8px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;">
                  <span>ℹ️ Selling beyond loose stock (${formatNumber(availLoose)} kg). Sacks auto-open on sale, or:</span>
                  <button type="button" class="btn btn-open-sack btn-sm" style="padding:2px 7px;font-size:10px;" onclick="openPosOpenSackModal('${item.productId}')">Open Sack</button>
                </div>
              `;
            } else if (prod) {
              return `
                <div style="margin-top:4px;font-size:11px;color:var(--text-muted);">
                  Loose stock: <strong>${formatNumber(availLoose)} kg</strong> available
                </div>
              `;
            }
            return '';
          })()}
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
          qty: item.qty,
          batchNumber: item.batchNumber
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
      <h2>ROBERICE</h2>
      <div style="font-size:11px;margin-bottom:2px;font-weight:600;">Address: 73 Farmers st. Corner Ampalaya, Marikina 1800</div>
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

function openPosOpenSackModal(productId = null) {
  const prodSelect = document.getElementById('posOpenSackProduct');
  if (!prodSelect) return;

  prodSelect.innerHTML = productsCache.map(p => `
    <option value="${p.id}" ${p.id === productId ? 'selected' : ''}>
      ${p.name} [${p.origin}] - Loose: ${formatNumber(p.stockKg)} kg (50k: ${p.stockSacks}, 25k: ${p.packaged25kg}, 20k: ${p.packaged20kg})
    </option>
  `).join('');

  updatePosOpenSackBatches();

  document.getElementById('posOpenSackType').value = '50kg';
  document.getElementById('posOpenSackQty').value = '1';
  document.getElementById('posOpenSackNote').value = '';
  updatePosOpenSackPreview();
  openModal('modalOpenSackPos');
}

function updatePosOpenSackBatches() {
  const prodSelect = document.getElementById('posOpenSackProduct');
  const batchSelect = document.getElementById('posOpenSackBatch');
  if (!prodSelect || !batchSelect) return;

  const product = productsCache.find(p => p.id === prodSelect.value);
  if (!product) return;

  const batches = getProductBatches(product);
  batchSelect.innerHTML = batches.map(b => `
    <option value="${b.batchNumber}">${b.label}</option>
  `).join('');
}

function updatePosOpenSackPreview() {
  const prodSelect = document.getElementById('posOpenSackProduct');
  const batchSelect = document.getElementById('posOpenSackBatch');
  const typeSelect = document.getElementById('posOpenSackType');
  const qtyInput = document.getElementById('posOpenSackQty');
  const previewText = document.getElementById('posOpenSackPreviewText');

  if (!prodSelect || !typeSelect || !qtyInput || !previewText) return;

  const prodId = prodSelect.value;
  const product = productsCache.find(p => p.id === prodId);
  const sackType = typeSelect.value;
  const qty = parseInt(qtyInput.value) || 1;
  const batchNumber = batchSelect ? batchSelect.value : (product ? product.batchNumber : 'BATCH-001');

  if (!product) return;

  let unitWeight = 50;
  let currentSacks = product.stockSacks;
  let sackLabel = 'Whole (50kg) sack(s)';

  if (sackType === '25kg' || sackType === 'half') {
    unitWeight = 25;
    currentSacks = product.packaged25kg;
    sackLabel = 'Half (25kg) sack(s)';
  } else if (sackType === '20kg') {
    unitWeight = 20;
    currentSacks = product.packaged20kg;
    sackLabel = '20kg sack(s)';
  } else if (sackType === '10kg') {
    unitWeight = 10;
    currentSacks = product.packaged10kg;
    sackLabel = '10kg sack(s)';
  } else if (sackType === '5kg') {
    unitWeight = 5;
    currentSacks = product.packaged5kg;
    sackLabel = '5kg sack(s)';
  }

  const addedKg = qty * unitWeight;
  const newLooseKg = product.stockKg + addedKg;
  const remainingSacks = currentSacks - qty;

  let warningHtml = '';
  if (remainingSacks < 0) {
    warningHtml = `<div style="color:var(--danger);font-weight:700;margin-top:6px;">⚠️ Warning: You only have ${currentSacks} of this sack in inventory!</div>`;
  }

  previewText.innerHTML = `
    Product: <strong>${product.name}</strong> • Selected Lot: <strong style="color:var(--primary);">${batchNumber}</strong><br>
    Opening <strong>${qty}x ${sackLabel}</strong> from Batch <strong>${batchNumber}</strong> will deduct <strong>${qty} sack(s)</strong> (Current: ${currentSacks} -> Remaining: ${Math.max(0, remainingSacks)})<br>
    and deposit <strong>+${formatNumber(addedKg)} kg</strong> into Loose (Tinatakal) inventory (Current: ${formatNumber(product.stockKg)} kg -> New Loose: <strong>${formatNumber(newLooseKg)} kg</strong>).
    ${warningHtml}
  `;
}

async function handlePosOpenSackSubmit(e) {
  e.preventDefault();

  const productId = document.getElementById('posOpenSackProduct').value;
  const sackType = document.getElementById('posOpenSackType').value;
  const qty = parseInt(document.getElementById('posOpenSackQty').value) || 1;
  const batchNumber = document.getElementById('posOpenSackBatch').value;
  const note = document.getElementById('posOpenSackNote').value.trim();

  if (qty <= 0) {
    showToast('Please specify a valid quantity of sacks to open.', 'warning');
    return;
  }

  const user = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};

  showTopLoader();

  try {
    const res = await fetch('api/adjust_stock.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        type: 'open_sack',
        sackType,
        qty,
        batchNumber,
        note: note ? `${note} (Batch: ${batchNumber})` : `Opened from Batch ${batchNumber}`,
        user: user.name || 'Cashier'
      })
    });

    const result = await res.json();
    if (result.success) {
      showToast(`Opened ${qty}x ${sackType} sack from Batch ${batchNumber} for ${result.productName}! Loose stock is now ${formatNumber(result.stockKg)} kg.`, 'success');
      closeModal('modalOpenSackPos');
      await loadProducts();
      renderCart();
    } else {
      showToast(result.message || 'Failed to open sack.', 'danger');
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to process sack opening.', 'danger');
  } finally {
    hideTopLoader();
  }
}