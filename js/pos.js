/**
 * Roberice POS & Inventory System - Point of Sale Script
 * Multi-Packaging & Tinatakal Retail Support
 * Strict Stock Validation: Prevents Cashier from Adding Items Beyond Inventory Stock
 */

let cart = [];
let productsCache = [];
let activeModalProduct = null;
let activeModalUnit = 'sack';

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
  if (pkgKgInp) {
    pkgKgInp.addEventListener('input', handleModalCustomKgInput);
    pkgKgInp.addEventListener('change', handleModalCustomKgInput);
  }
  const pkgQtyInp = document.getElementById('pkgModalQtyInput');
  if (pkgQtyInp) {
    pkgQtyInp.addEventListener('input', handleModalQtyInput);
    pkgQtyInp.addEventListener('change', handleModalQtyInput);
  }

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
    let data;
    try {
      const response = await fetch('api/get_inventory.php');
      data = await response.json();
      if (!Array.isArray(data)) throw new Error('Inventory endpoint returned invalid format');
    } catch (e) {
      const response = await fetch('api/get_products.php');
      data = await response.json();
    }

    if (!Array.isArray(data)) {
      throw new Error('Unable to parse product inventory list.');
    }

    productsCache = data.map(p => {
      const activeBatches = Array.isArray(p.batches)
        ? p.batches.filter(b => b.status === 'Active' && Number(b.total_kg || 0) > 0)
        : [];

      return {
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
        receivedDate: p.received_date || '2026-09-01',
        batchNumber: p.batch_number || 'BATCH-001',
        daysOld: Number(p.days_old !== undefined ? p.days_old : 0),
        status: p.product_status,
        batches: activeBatches
      };
    });

    populateCategoryFilter();
    renderProductGrid();
  } catch (error) {
    console.error(error);
    showToast('Unable to load products.', 'danger');
  }
}

// ==========================================
// Unit & Stock Helper Utilities
// ==========================================

function getUnitWeightKg(unit) {
  if (unit === 'sack' || unit === '50kg') return 50;
  if (unit === '25kg' || unit === 'half') return 25;
  if (unit === '20kg') return 20;
  if (unit === '10kg') return 10;
  if (unit === '5kg') return 5;
  return 1; // tinatakal / loose kg
}

function normalizeUnit(unit) {
  if (unit === '50kg') return 'sack';
  if (unit === 'half') return '25kg';
  if (unit === 'kg') return 'tinatakal';
  return unit;
}

function isUnitMatch(unitA, unitB) {
  return normalizeUnit(unitA) === normalizeUnit(unitB);
}

function getStockForUnit(product, unit) {
  if (!product) return 0;
  const u = normalizeUnit(unit);
  if (u === 'sack') return Number(product.stockSacks || 0);
  if (u === '25kg') return Number(product.packaged25kg || 0);
  if (u === '20kg') return Number(product.packaged20kg || 0);
  if (u === '10kg') return Number(product.packaged10kg || 0);
  if (u === '5kg') return Number(product.packaged5kg || 0);
  // Total physical volume for tinatakal (loose kg + all unopened sacks/packs that can auto-open)
  return ((Number(product.stockSacks || 0) * 50) +
          (Number(product.packaged25kg || 0) * 25) +
          (Number(product.packaged20kg || 0) * 20) +
          (Number(product.packaged10kg || 0) * 10) +
          (Number(product.packaged5kg || 0) * 5) +
          Number(product.stockKg || 0));
}

function getCartQuantity(productId, unit, excludeIndex = -1) {
  return cart.reduce((sum, item, idx) => {
    if (idx !== excludeIndex && item.productId === productId && isUnitMatch(item.unit, unit)) {
      return sum + Number(item.qty || 0);
    }
    return sum;
  }, 0);
}

function getCartReservedWeightKg(productId, excludeIndex = -1) {
  return cart.reduce((sum, item, idx) => {
    if (idx !== excludeIndex && item.productId === productId) {
      return sum + (getUnitWeightKg(item.unit) * Number(item.qty || 0));
    }
    return sum;
  }, 0);
}

function getMaxAllowedQuantity(product, unit, excludeIndex = -1) {
  if (!product) return 0;
  const u = normalizeUnit(unit);
  const isTinatakal = (u === 'tinatakal');

  if (isTinatakal) {
    const totalVolumeKg = getStockForUnit(product, 'tinatakal');
    const reservedKg = getCartReservedWeightKg(product.id, excludeIndex);
    return Math.max(0, Math.round((totalVolumeKg - reservedKg) * 100) / 100);
  } else {
    const availableSacks = getStockForUnit(product, u);
    const inCartSacks = getCartQuantity(product.id, u, excludeIndex);
    const remainingSacks = Math.max(0, availableSacks - inCartSacks);

    // Also check total remaining volume capacity across store
    const totalVolumeKg = getStockForUnit(product, 'tinatakal');
    const reservedKg = getCartReservedWeightKg(product.id, excludeIndex);
    const remainingKg = Math.max(0, totalVolumeKg - reservedKg);
    const unitWeight = getUnitWeightKg(u);
    const maxByWeight = Math.floor(remainingKg / unitWeight);

    return Math.min(remainingSacks, maxByWeight);
  }
}

function getPosProductBatches(product) {
  if (!product) return [];
  if (Array.isArray(product.batches) && product.batches.length > 0) {
    return product.batches.map(b => {
      const days = Number(b.days_old || 0);
      let ageLabel = 'Fresh';
      if (days > 60) ageLabel = 'Old Stock';
      else if (days > 30) ageLabel = 'Aging';
      else if (days > 14) ageLabel = 'Normal';
      return {
        batchNumber: b.batch_code,
        label: `${b.batch_code} (${formatDate(b.received_date)} • ${days}d ${ageLabel}) [Total: ${formatNumber(b.total_kg)}kg]`
      };
    });
  }
  if (typeof getProductBatches === 'function') {
    return getProductBatches(product);
  }
  return [{ batchNumber: product.batchNumber || 'BATCH-001', label: product.batchNumber || 'BATCH-001' }];
}

// ==========================================
// POS Product Grid Rendering
// ==========================================

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

// ==========================================
// Packaging Modal & Stock Validation
// ==========================================

function openPackagingModal(productId) {
  const product = productsCache.find(p => p.id === productId);
  if (!product) return;

  activeModalProduct = product;

  document.getElementById('modalPkgProductName').textContent = product.name;
  document.getElementById('modalPkgRiceType').textContent = product.riceType || 'Rice';

  const originEl = document.getElementById('modalPkgOriginBadge');
  if (originEl) {
    originEl.textContent = product.origin;
    originEl.className = product.origin === 'Imported' ? 'badge badge-imported' : 'badge badge-local';
  }

  const batchSelect = document.getElementById('modalPkgBatchSelect');
  if (batchSelect) {
    const batches = getPosProductBatches(product);
    batchSelect.innerHTML = batches.map(b => `
      <option value="${b.batchNumber}">${b.label}</option>
    `).join('');
  }

  const totalVolume = getStockForUnit(product, 'tinatakal');
  const statusEl = document.getElementById('modalPkgStockStatus');
  if (statusEl) {
    statusEl.textContent = totalVolume > 0 ? '● Available' : '● Out of Stock';
    statusEl.className = totalVolume > 0 ? 'badge badge-success' : 'badge badge-danger';
  }

  // Calculate stock and cart capacities for all packaging types
  const unitsDef = [
    { key: 'sack', title: 'Whole Sack (50 Kilos)', price: product.priceSack, isSack: true },
    { key: '25kg', title: 'Half Sack (25 Kilos)', price: product.price25kg, isSack: true },
    { key: '20kg', title: '20 Kilos Sack', price: product.price20kg, isSack: true },
    { key: '10kg', title: '10 Kilos Sack', price: product.price10kg, isSack: true },
    { key: '5kg', title: '5 Kilos Sack', price: product.price5kg, isSack: true },
    { key: 'tinatakal', title: 'Specified Kilos (Loose Rice)', price: product.priceKg, isSack: false }
  ];

  const optionsGrid = document.getElementById('modalPkgOptionsGrid');
  if (optionsGrid) {
    optionsGrid.innerHTML = unitsDef.map(u => {
      const availStock = getStockForUnit(product, u.key);
      const inCart = u.isSack ? getCartQuantity(product.id, u.key) : 0;
      const maxAllowed = getMaxAllowedQuantity(product, u.key);

      let cardClass = 'pkg-option-card';
      let clickAttr = `onclick="selectModalUnit('${u.key}')"`;
      let stockHtml = '';

      if (u.isSack) {
        if (availStock <= 0) {
          cardClass += ' disabled';
          clickAttr = `title="Out of stock in inventory"`;
          stockHtml = `<div class="pkg-option-stock" style="color:var(--danger);font-weight:600;">Stock: 0 sacks (Out of stock)</div>`;
        } else if (maxAllowed <= 0) {
          cardClass += ' disabled';
          clickAttr = `title="Maximum stock (${availStock} sacks) already in cart"`;
          stockHtml = `<div class="pkg-option-stock" style="color:#d97706;font-weight:600;">Stock: ${availStock} (All in cart)</div>`;
        } else {
          const inCartNote = inCart > 0 ? ` <span style="color:#b45309;">(${maxAllowed} left to add)</span>` : '';
          stockHtml = `<div class="pkg-option-stock">Stock: <strong>${availStock}</strong> sacks${inCartNote}</div>`;
        }
      } else {
        // Tinatakal / loose kilos
        if (totalVolume <= 0) {
          cardClass += ' disabled';
          clickAttr = `title="No rice available in store"`;
          stockHtml = `<div class="pkg-option-stock" style="color:var(--danger);font-weight:600;">No rice stock available</div>`;
        } else if (maxAllowed <= 0) {
          cardClass += ' disabled';
          clickAttr = `title="All available store volume reserved in cart"`;
          stockHtml = `<div class="pkg-option-stock" style="color:#d97706;font-weight:600;">Max store volume in cart</div>`;
        } else {
          stockHtml = `<div class="pkg-option-stock">Max available: <strong>${formatNumber(maxAllowed)}</strong> kg (Loose: ${formatNumber(product.stockKg)}kg)</div>`;
        }
      }

      const priceDisplay = u.isSack
        ? formatCurrency(u.price)
        : `${formatCurrency(u.price)} <span style="font-size:11px;font-weight:500;">/ kg</span>`;

      return `
        <div class="${cardClass}" id="pkgOpt_${u.key}" ${clickAttr}>
          <div class="pkg-option-title">${u.title}</div>
          <div class="pkg-option-price">${priceDisplay}</div>
          ${stockHtml}
        </div>
      `;
    }).join('');
  }

  // Find first selectable unit with available stock
  const candidateUnit = unitsDef.find(u => getMaxAllowedQuantity(product, u.key) > 0);
  const defaultUnit = candidateUnit ? candidateUnit.key : 'sack';

  selectModalUnit(defaultUnit);
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
  const btnConfirm = document.getElementById('btnConfirmAddToOrder');

  const maxAllowed = activeModalProduct ? getMaxAllowedQuantity(activeModalProduct, unit) : 0;

  if (unit === 'tinatakal') {
    if (customSec) customSec.style.display = 'block';
    if (sackSec) sackSec.style.display = 'none';

    const kgInput = document.getElementById('pkgCustomKgInput');
    if (kgInput) {
      kgInput.max = maxAllowed;
      kgInput.min = maxAllowed > 0 ? 0.1 : 0;
      kgInput.value = maxAllowed > 0 ? (maxAllowed >= 1 ? '1' : String(maxAllowed)) : '0';
    }

    const looseInfo = document.getElementById('pkgLooseStockInfo');
    if (looseInfo && activeModalProduct) {
      looseInfo.textContent = `Loose: ${formatNumber(activeModalProduct.stockKg)} kg • Max available: ${formatNumber(maxAllowed)} kg`;
    }
  } else {
    if (customSec) customSec.style.display = 'none';
    if (sackSec) sackSec.style.display = 'flex';

    const qtyInput = document.getElementById('pkgModalQtyInput');
    if (qtyInput) {
      qtyInput.max = maxAllowed;
      qtyInput.min = maxAllowed > 0 ? 1 : 0;
      qtyInput.value = maxAllowed > 0 ? '1' : '0';
    }

    const sackLabel = document.getElementById('pkgSackQtyLabel');
    if (sackLabel && activeModalProduct) {
      const avail = getStockForUnit(activeModalProduct, unit);
      const inCart = getCartQuantity(activeModalProduct.id, unit);
      if (inCart > 0) {
        sackLabel.innerHTML = `Stock: <strong>${avail}</strong> (${inCart} in cart) • <span style="color:var(--primary);font-weight:700;">Max you can add: ${maxAllowed}</span>`;
      } else {
        sackLabel.innerHTML = `Available in inventory: <strong>${avail}</strong> sack(s)`;
      }
    }
  }

  if (btnConfirm) {
    btnConfirm.disabled = (maxAllowed <= 0);
  }

  updateModalSubtotal();
}

function handleModalQtyInput() {
  if (!activeModalProduct) return;
  const input = document.getElementById('pkgModalQtyInput');
  if (!input) return;

  const maxAllowed = getMaxAllowedQuantity(activeModalProduct, activeModalUnit);
  let val = parseInt(input.value);

  if (isNaN(val) || val < 1) {
    if (maxAllowed > 0 && input.value !== '') input.value = '1';
    updateModalSubtotal();
    return;
  }

  if (val > maxAllowed) {
    input.value = maxAllowed;
    const availStock = getStockForUnit(activeModalProduct, activeModalUnit);
    showToast(`Cannot add beyond stock! Maximum available to add is ${maxAllowed} sack(s) (${availStock} total in stock).`, 'warning');
  }

  updateModalSubtotal();
}

function handleModalCustomKgInput() {
  if (!activeModalProduct) return;
  const input = document.getElementById('pkgCustomKgInput');
  if (!input) return;

  const maxAllowed = getMaxAllowedQuantity(activeModalProduct, 'tinatakal');
  let val = parseFloat(input.value);

  if (isNaN(val) || val < 0.1) {
    if (maxAllowed > 0 && input.value !== '') input.value = maxAllowed >= 1 ? '1' : String(maxAllowed);
    updateModalSubtotal();
    return;
  }

  if (val > maxAllowed) {
    input.value = maxAllowed;
    showToast(`Cannot exceed stock! Maximum available loose rice volume is ${formatNumber(maxAllowed)} kg.`, 'warning');
  }

  updateModalSubtotal();
}

function setModalCustomKg(kg) {
  if (!activeModalProduct) return;
  const input = document.getElementById('pkgCustomKgInput');
  if (!input) return;

  const maxAllowed = getMaxAllowedQuantity(activeModalProduct, 'tinatakal');
  if (maxAllowed <= 0) {
    showToast('No stock available for loose rice selling.', 'warning');
    return;
  }

  if (kg > maxAllowed) {
    input.value = maxAllowed;
    showToast(`Capped at maximum available stock: ${formatNumber(maxAllowed)} kg.`, 'warning');
  } else {
    input.value = kg;
  }

  updateModalSubtotal();
}

function stepModalQty(delta) {
  if (!activeModalProduct) return;
  const input = document.getElementById('pkgModalQtyInput');
  if (!input) return;

  const maxAllowed = getMaxAllowedQuantity(activeModalProduct, activeModalUnit);
  if (maxAllowed <= 0) {
    input.value = '0';
    showToast('This packaging unit is out of stock or max quantity is already in cart.', 'warning');
    return;
  }

  const current = parseInt(input.value) || 1;
  if (delta > 0 && current >= maxAllowed) {
    showToast(`Cannot add more. Maximum available stock to add is ${maxAllowed} sack(s).`, 'warning');
    return;
  }

  input.value = Math.max(1, Math.min(maxAllowed, current + delta));
  updateModalSubtotal();
}

function updateModalSubtotal() {
  if (!activeModalProduct) return;

  const subtotalEl = document.getElementById('modalPkgSubtotal');
  const labelEl = document.getElementById('modalPkgSelectedLabel');
  const autoNote = document.getElementById('pkgAutoOpenNote');
  const btnConfirm = document.getElementById('btnConfirmAddToOrder');

  const maxAllowed = getMaxAllowedQuantity(activeModalProduct, activeModalUnit);

  let price = 0;
  let qty = 1;
  let label = '';

  if (activeModalUnit === 'tinatakal') {
    const kgInput = document.getElementById('pkgCustomKgInput');
    qty = parseFloat(kgInput ? kgInput.value : 0) || 0;

    if (qty > maxAllowed) {
      qty = maxAllowed;
      if (kgInput) kgInput.value = maxAllowed;
    }

    price = activeModalProduct.priceKg * qty;
    label = `Specified Kilos (${formatNumber(qty)} kg @ ${formatCurrency(activeModalProduct.priceKg)}/kg)`;

    if (autoNote) {
      if (qty > activeModalProduct.stockKg && qty <= maxAllowed) {
        autoNote.style.display = 'block';
      } else {
        autoNote.style.display = 'none';
      }
    }

    if (btnConfirm) btnConfirm.disabled = (qty <= 0 || qty > maxAllowed);
  } else {
    const qtyInput = document.getElementById('pkgModalQtyInput');
    qty = parseInt(qtyInput ? qtyInput.value : 0) || 0;

    if (qty > maxAllowed) {
      qty = maxAllowed;
      if (qtyInput) qtyInput.value = maxAllowed;
    }

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

    if (btnConfirm) btnConfirm.disabled = (qty <= 0 || qty > maxAllowed);
  }

  if (subtotalEl) subtotalEl.textContent = formatCurrency(price);
  if (labelEl) labelEl.textContent = label;
}

function confirmModalAddToCart() {
  if (!activeModalProduct) return;

  const maxAllowed = getMaxAllowedQuantity(activeModalProduct, activeModalUnit);
  if (maxAllowed <= 0) {
    showToast('Cannot add to order: Out of stock or already at maximum stock limit in cart.', 'danger');
    return;
  }

  let qty = 1;
  if (activeModalUnit === 'tinatakal') {
    const kgInput = document.getElementById('pkgCustomKgInput');
    qty = parseFloat(kgInput ? kgInput.value : 0) || 0;
    if (qty <= 0) {
      showToast('Please enter a valid kilo amount.', 'warning');
      return;
    }
    if (qty > maxAllowed) {
      showToast(`Cannot add ${qty} kg. Only ${formatNumber(maxAllowed)} kg available in stock!`, 'danger');
      if (kgInput) kgInput.value = maxAllowed;
      updateModalSubtotal();
      return;
    }
  } else {
    const qtyInput = document.getElementById('pkgModalQtyInput');
    qty = parseInt(qtyInput ? qtyInput.value : 0) || 0;
    if (qty <= 0) {
      showToast('Please enter a valid quantity.', 'warning');
      return;
    }
    if (qty > maxAllowed) {
      showToast(`Cannot add ${qty} sack(s). Only ${maxAllowed} available in stock!`, 'danger');
      if (qtyInput) qtyInput.value = maxAllowed;
      updateModalSubtotal();
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

  const maxAllowed = getMaxAllowedQuantity(product, unit);
  if (maxAllowed <= 0) {
    showToast(`No stock available to add for ${product.name} (${formatUnitLabel(unit)}).`, 'warning');
    return;
  }

  if (initialQty > maxAllowed) {
    initialQty = maxAllowed;
    showToast(`Quantity adjusted to maximum available stock (${maxAllowed}).`, 'warning');
  }

  const itemBatch = batchNumber || product.batchNumber || 'BATCH-001';
  const existing = cart.find(item => item.productId === productId && item.unit === unit && item.batchNumber === itemBatch);

  if (existing) {
    const itemIndex = cart.indexOf(existing);
    const maxForItem = getMaxAllowedQuantity(product, unit, itemIndex) + existing.qty;
    const newQty = existing.qty + initialQty;
    if (newQty > maxForItem) {
      existing.qty = maxForItem;
      showToast(`Capped ${product.name} to maximum available stock (${maxForItem}).`, 'warning');
    } else {
      existing.qty = newQty;
    }
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

// ==========================================
// POS Cart Rendering & Quantity Enforcement
// ==========================================

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
    const prod = productsCache.find(p => p.id === item.productId);
    const maxAllowed = prod ? getMaxAllowedQuantity(prod, item.unit, index) : item.qty;
    const isTinatakal = item.unit === 'tinatakal' || item.unit === 'kg';
    const isMaxReached = item.qty >= maxAllowed;

    const unitPrice = getItemUnitPrice(item);
    const subtotal = unitPrice * item.qty;
    const totalUnitStock = prod ? getStockForUnit(prod, item.unit) : 0;

    // Determine availability of each unit pill for this item
    const pillSackDisabled = prod && getStockForUnit(prod, 'sack') <= 0;
    const pill25Disabled = prod && getStockForUnit(prod, '25kg') <= 0;
    const pill20Disabled = prod && getStockForUnit(prod, '20kg') <= 0;
    const pill10Disabled = prod && getStockForUnit(prod, '10kg') <= 0;
    const pill5Disabled = prod && getStockForUnit(prod, '5kg') <= 0;
    const pillLooseDisabled = prod && getStockForUnit(prod, 'tinatakal') <= 0;

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
          <button class="pos-unit-btn ${item.unit === 'sack' ? 'active' : ''} ${pillSackDisabled ? 'disabled' : ''}" onclick="toggleUnit(${index}, 'sack')" title="${pillSackDisabled ? 'Out of stock' : '50Kg Whole Sack'}">50Kg Whole</button>
          <button class="pos-unit-btn ${item.unit === '25kg' ? 'active' : ''} ${pill25Disabled ? 'disabled' : ''}" onclick="toggleUnit(${index}, '25kg')" title="${pill25Disabled ? 'Out of stock' : '25Kg Half Sack'}">25Kg Half</button>
          <button class="pos-unit-btn ${item.unit === '20kg' ? 'active' : ''} ${pill20Disabled ? 'disabled' : ''}" onclick="toggleUnit(${index}, '20kg')" title="${pill20Disabled ? 'Out of stock' : '20Kg Pack'}">20Kg</button>
          <button class="pos-unit-btn ${item.unit === '10kg' ? 'active' : ''} ${pill10Disabled ? 'disabled' : ''}" onclick="toggleUnit(${index}, '10kg')" title="${pill10Disabled ? 'Out of stock' : '10Kg Pack'}">10Kg</button>
          <button class="pos-unit-btn ${item.unit === '5kg' ? 'active' : ''} ${pill5Disabled ? 'disabled' : ''}" onclick="toggleUnit(${index}, '5kg')" title="${pill5Disabled ? 'Out of stock' : '5Kg Pack'}">5Kg</button>
          <button class="pos-unit-btn ${isTinatakal ? 'active' : ''} ${pillLooseDisabled ? 'disabled' : ''}" onclick="toggleUnit(${index}, 'tinatakal')" title="${pillLooseDisabled ? 'Out of stock' : 'Tinatakal (Loose Kg)'}">Tinatakal</button>
        </div>

        <div class="cart-item-controls">
          <div class="qty-control">
            <button class="qty-btn" onclick="stepCartQty(${index}, -${isTinatakal ? 0.5 : 1})">-</button>
            <input
              type="number"
              class="qty-input"
              value="${item.qty}"
              min="${isTinatakal ? 0.1 : 1}"
              max="${maxAllowed}"
              step="${isTinatakal ? '0.1' : '1'}"
              style="width: 70px;"
              oninput="validateCartQtyInput(${index}, this)"
              onchange="updateQty(${index}, parseFloat(this.value))"
            >
            <button
              class="qty-btn ${isMaxReached ? 'disabled' : ''}"
              ${isMaxReached ? 'disabled' : ''}
              onclick="stepCartQty(${index}, ${isTinatakal ? 0.5 : 1})"
              title="${isMaxReached ? 'Maximum available stock reached' : 'Add one'}"
            >+</button>
          </div>

          <div style="text-align:right;">
            <div style="font-size:11px;color:var(--text-muted);">${formatCurrency(unitPrice)} / ${isTinatakal ? 'kg' : item.unit}</div>
            <div class="cart-item-price">${formatCurrency(subtotal)}</div>
          </div>
        </div>

        <!-- Stock Limit Indicator -->
        <div style="font-size:10.5px; color:${isMaxReached ? '#b91c1c' : 'var(--text-muted)'}; margin-top:3px; text-align:left;">
          ${isMaxReached ? '⚠️ Max stock reached' : 'Stock limit'}: <strong>${item.qty} / ${maxAllowed}</strong> ${isTinatakal ? 'kg' : 'sacks'} available (Total inventory: ${totalUnitStock})
        </div>

        ${isTinatakal ? `
          <div class="tinatakal-chips-bar" style="margin-top:6px;">
            <span style="font-size:10px;color:var(--text-muted);">Quick scoop:</span>
            <button type="button" class="tinatakal-chip" onclick="setTinatakalQty(${index}, 0.5)">+0.5kg</button>
            <button type="button" class="tinatakal-chip" onclick="setTinatakalQty(${index}, 1.0)">+1kg</button>
            <button type="button" class="tinatakal-chip" onclick="setTinatakalQty(${index}, 2.0)">+2kg</button>
            <button type="button" class="tinatakal-chip" onclick="setTinatakalQty(${index}, 3.0)">+3kg</button>
            <button type="button" class="tinatakal-chip" onclick="setTinatakalQty(${index}, 5.0)">+5kg</button>
          </div>
          ${(() => {
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

function stepCartQty(index, delta) {
  if (!cart[index]) return;
  const item = cart[index];
  const prod = productsCache.find(p => p.id === item.productId);
  const maxAllowed = prod ? getMaxAllowedQuantity(prod, item.unit, index) : 9999;
  const isTinatakal = item.unit === 'tinatakal' || item.unit === 'kg';

  if (delta > 0 && item.qty >= maxAllowed) {
    showToast(`Cannot add more. Maximum available stock for ${item.productName} (${formatUnitLabel(item.unit)}) is ${maxAllowed}.`, 'warning');
    return;
  }

  const targetQty = isTinatakal
    ? Math.round((item.qty + delta) * 100) / 100
    : Math.floor(item.qty + delta);

  if (targetQty <= 0) {
    removeFromCart(index);
    return;
  }

  if (targetQty > maxAllowed) {
    item.qty = maxAllowed;
    showToast(`Quantity capped at maximum available stock (${maxAllowed}).`, 'warning');
  } else {
    item.qty = targetQty;
  }

  renderCart();
}

function validateCartQtyInput(index, input) {
  if (!cart[index]) return;
  const item = cart[index];
  const prod = productsCache.find(p => p.id === item.productId);
  const maxAllowed = prod ? getMaxAllowedQuantity(prod, item.unit, index) : 9999;
  const val = parseFloat(input.value);

  if (!isNaN(val) && val > maxAllowed) {
    input.value = maxAllowed;
    cart[index].qty = maxAllowed;
    showToast(`Cannot input beyond stock! Maximum available is ${maxAllowed} for ${formatUnitLabel(item.unit)}.`, 'warning');
    updateTotals();
  }
}

function updateQty(index, qty) {
  if (!cart[index]) return;
  const item = cart[index];
  const prod = productsCache.find(p => p.id === item.productId);
  const maxAllowed = prod ? getMaxAllowedQuantity(prod, item.unit, index) : 9999;
  const isTinatakal = item.unit === 'tinatakal' || item.unit === 'kg';

  qty = Number(qty);
  if (!qty || qty <= 0) {
    removeFromCart(index);
    return;
  }

  if (!isTinatakal) {
    qty = Math.floor(qty);
  } else {
    qty = Math.round(qty * 100) / 100;
  }

  if (qty > maxAllowed) {
    cart[index].qty = maxAllowed;
    showToast(`Cannot input beyond stock! Maximum available is ${maxAllowed} for ${formatUnitLabel(item.unit)}.`, 'warning');
  } else {
    cart[index].qty = qty;
  }

  renderCart();
}

function setTinatakalQty(index, addKg) {
  if (!cart[index]) return;
  const item = cart[index];
  const prod = productsCache.find(p => p.id === item.productId);
  const maxAllowed = prod ? getMaxAllowedQuantity(prod, 'tinatakal', index) : 9999;

  const targetQty = Math.round((item.qty + addKg) * 100) / 100;
  if (targetQty > maxAllowed) {
    cart[index].qty = maxAllowed;
    showToast(`Capped at maximum available loose stock capacity (${formatNumber(maxAllowed)} kg).`, 'warning');
  } else {
    cart[index].qty = targetQty;
  }

  renderCart();
}

function toggleUnit(index, unit) {
  if (!cart[index]) return;
  const item = cart[index];
  const prod = productsCache.find(p => p.id === item.productId);
  if (!prod) return;

  const availStock = getStockForUnit(prod, unit);
  if (availStock <= 0) {
    showToast(`Cannot switch to ${formatUnitLabel(unit)}: 0 available in inventory for ${prod.name}!`, 'warning');
    return;
  }

  const maxAllowed = getMaxAllowedQuantity(prod, unit, index);
  if (maxAllowed <= 0) {
    showToast(`Cannot switch to ${formatUnitLabel(unit)}: Maximum available stock is already allocated in cart.`, 'warning');
    return;
  }

  cart[index].unit = unit;
  if (unit !== 'tinatakal' && unit !== 'kg') {
    cart[index].qty = Math.max(1, Math.min(maxAllowed, Math.floor(cart[index].qty)));
  } else {
    cart[index].qty = Math.min(maxAllowed, Math.max(0.5, cart[index].qty));
  }

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

// ==========================================
// Checkout & Sale Processing
// ==========================================

async function processSale() {
  if (!cart.length) return;

  // Final pre-flight validation scan against live inventory limits
  for (let i = 0; i < cart.length; i++) {
    const item = cart[i];
    const prod = productsCache.find(p => p.id === item.productId);
    if (prod) {
      const maxAllowed = getMaxAllowedQuantity(prod, item.unit, i);
      if (item.qty > maxAllowed) {
        showToast(`Cannot checkout: ${item.productName} (${item.qty} ${formatUnitLabel(item.unit)}) exceeds available stock (${maxAllowed}). Please adjust your order.`, 'danger');
        renderCart();
        return;
      }
    }
  }

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
  } finally {
    hidePageLoader();
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

// ==========================================
// Open Sack Modal in POS
// ==========================================

function openPosOpenSackModal(productId = null) {
  const prodSelect = document.getElementById('posOpenSackProduct');
  if (!prodSelect) return;

  prodSelect.innerHTML = productsCache.map(p => `
    <option value="${p.id}" ${p.id === productId ? 'selected' : ''}>
      ${p.name} [${p.origin}] - Loose: ${formatNumber(p.stockKg)} kg (50Kg: ${p.stockSacks}, 25Kg: ${p.packaged25kg}, 20Kg: ${p.packaged20kg})
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

  const batches = getPosProductBatches(product);
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
    warningHtml = `<div style="color:var(--danger);font-weight:700;margin-top:6px;">⚠️ Warning: You only have ${currentSacks} of this sack in inventory! Cannot open beyond available stock.</div>`;
  }

  const btnSubmit = document.querySelector('#posOpenSackForm button[type="submit"]');
  if (btnSubmit) {
    btnSubmit.disabled = (remainingSacks < 0 || currentSacks <= 0);
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

  const product = productsCache.find(p => p.id === productId);
  if (!product) return;

  let currentSacks = product.stockSacks;
  if (sackType === '25kg' || sackType === 'half') currentSacks = product.packaged25kg;
  else if (sackType === '20kg') currentSacks = product.packaged20kg;
  else if (sackType === '10kg') currentSacks = product.packaged10kg;
  else if (sackType === '5kg') currentSacks = product.packaged5kg;

  if (qty <= 0) {
    showToast('Please specify a valid quantity of sacks to open.', 'warning');
    return;
  }

  if (qty > currentSacks) {
    showToast(`Cannot open ${qty} sack(s). Only ${currentSacks} available in inventory!`, 'danger');
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