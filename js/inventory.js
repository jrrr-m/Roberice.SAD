/**
 * Roberice POS & Inventory System - Inventory Management Script
 */

let inventoryCache = [];

document.addEventListener('DOMContentLoaded', () => {
  initInventoryPage();
});

async function initInventoryPage() {
  await renderInventoryManageTable();
  await renderAdjustmentLogs();

  // Filter Event Listeners
  document.getElementById('searchInventory').addEventListener('input', applyInventoryFilters);
  document.getElementById('filterOrigin').addEventListener('change', applyInventoryFilters);
  document.getElementById('filterRiceType').addEventListener('change', applyInventoryFilters);
  document.getElementById('filterStockAge').addEventListener('change', applyInventoryFilters);
  document.getElementById('filterStatus').addEventListener('change', applyInventoryFilters);

  // Modal Openers
  const btnOpenSack = document.getElementById('btnOpenOpenSackModal');
  if (btnOpenSack) btnOpenSack.addEventListener('click', () => openOpenSackModal());
  const btnRestock = document.getElementById('btnOpenRestockModal');
  if (btnRestock) btnRestock.addEventListener('click', () => openRestockModal());
  const btnAdjust = document.getElementById('btnOpenAdjustModal');
  if (btnAdjust) btnAdjust.addEventListener('click', () => openAdjustModal());

  // Form Handlers
  const formOpenSack = document.getElementById('openSackForm');
  if (formOpenSack) formOpenSack.addEventListener('submit', handleOpenSackSubmit);
  document.getElementById('restockForm').addEventListener('submit', handleRestockSubmit);
  document.getElementById('adjustStockForm').addEventListener('submit', handleAdjustSubmit);

  // Open Sack Preview Triggers
  const selOpenProd = document.getElementById('openSackProductSelect');
  const selOpenBatch = document.getElementById('openSackBatchSelect');
  const selOpenType = document.getElementById('openSackTypeSelect');
  const inpOpenQty = document.getElementById('openSackQty');
  if (selOpenProd) selOpenProd.addEventListener('change', () => {
    updateOpenSackBatches();
    updateOpenSackPreview();
  });
  if (selOpenBatch) selOpenBatch.addEventListener('change', updateOpenSackPreview);
  if (selOpenType) selOpenType.addEventListener('change', updateOpenSackPreview);
  if (inpOpenQty) inpOpenQty.addEventListener('input', updateOpenSackPreview);

  // Live Validation Listeners
  const openSackInputs = ['openSackProductSelect', 'openSackBatchSelect', 'openSackTypeSelect', 'openSackQty'];
  openSackInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', validateOpenSackLive);
    if (el && el.tagName === 'SELECT') el.addEventListener('change', validateOpenSackLive);
  });

  const restockInputs = ['restockProductSelect', 'restockDate', 'restockBatch', 'restockSacks', 'restockKg', 'restock25kg', 'restock20kg', 'restock10kg', 'restock5kg'];
  restockInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', validateRestockLive);
    if (el && el.tagName === 'SELECT') el.addEventListener('change', validateRestockLive);
  });

  // Adjust / Repack Event Triggers
  const selAdjProd = document.getElementById('adjustProductSelect');
  const selAdjType = document.getElementById('adjustType');
  if (selAdjProd) selAdjProd.addEventListener('change', () => {
    updateAdjustBatches();
    populateAdjustFormFields();
    updateAdjustRepackPreview();
  });
  if (selAdjType) selAdjType.addEventListener('change', () => {
    updateAdjustTypeUI();
    populateAdjustFormFields();
  });
  ['adjust25kg', 'adjust20kg', 'adjust10kg', 'adjust5kg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateAdjustRepackPreview);
  });

  const adjustInputs = ['adjustProductSelect', 'adjustBatchSelect', 'adjustType', 'adjustNote', 'adjustSacks', 'adjustKg', 'adjust25kg', 'adjust20kg', 'adjust10kg', 'adjust5kg'];
  adjustInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', validateAdjustLive);
    if (el && el.tagName === 'SELECT') el.addEventListener('change', validateAdjustLive);
  });
}

function showInventoryAlert(modalType, message) {
  let alertEl = null;
  let msgEl = null;
  if (modalType === 'openSack') {
    alertEl = document.getElementById('openSackAlert');
    msgEl = document.getElementById('openSackAlertMsg');
  } else if (modalType === 'restock') {
    alertEl = document.getElementById('restockAlert');
    msgEl = document.getElementById('restockAlertMsg');
  } else if (modalType === 'adjust') {
    alertEl = document.getElementById('adjustStockAlert');
    msgEl = document.getElementById('adjustStockAlertMsg');
  }
  if (!alertEl) return;
  const cleanMsg = (message || '').replace(/^⚠️\s*/, '');
  if (msgEl) {
    msgEl.textContent = '⚠️ ' + cleanMsg;
  } else {
    alertEl.textContent = '⚠️ ' + cleanMsg;
  }
  alertEl.style.display = 'block';
}

function hideInventoryAlert(modalType) {
  let alertEl = null;
  if (modalType === 'openSack') {
    alertEl = document.getElementById('openSackAlert');
  } else if (modalType === 'restock') {
    alertEl = document.getElementById('restockAlert');
  } else if (modalType === 'adjust') {
    alertEl = document.getElementById('adjustStockAlert');
  }
  if (alertEl) alertEl.style.display = 'none';
}

function hideAllInventoryAlerts() {
  hideInventoryAlert('openSack');
  hideInventoryAlert('restock');
  hideInventoryAlert('adjust');
}

function validateOpenSackLive() {
  const prodSelect = document.getElementById('openSackProductSelect');
  const batchSelect = document.getElementById('openSackBatchSelect');
  const qtyInput = document.getElementById('openSackQty');

  if (prodSelect && prodSelect.value) prodSelect.style.borderColor = '';
  if (batchSelect && batchSelect.value) batchSelect.style.borderColor = '';

  if (qtyInput && qtyInput.value !== '') {
    const val = parseFloat(qtyInput.value);
    if (isNaN(val) || val <= 0) {
      qtyInput.style.borderColor = '#dc2626';
      showInventoryAlert('openSack', 'Value must be greater than zero.');
      return false;
    } else {
      qtyInput.style.borderColor = '';
    }
  }

  hideInventoryAlert('openSack');
  return true;
}

function validateRestockLive() {
  const prodSelect = document.getElementById('restockProductSelect');
  const dateInput = document.getElementById('restockDate');
  const batchInput = document.getElementById('restockBatch');

  if (prodSelect && prodSelect.value) prodSelect.style.borderColor = '';
  if (dateInput && dateInput.value) dateInput.style.borderColor = '';
  if (batchInput && batchInput.value.trim()) batchInput.style.borderColor = '';

  const qtyIds = ['restockSacks', 'restockKg', 'restock25kg', 'restock20kg', 'restock10kg', 'restock5kg'];
  let hasNegative = false;

  qtyIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value !== '') {
      const val = parseFloat(el.value);
      if (isNaN(val) || val < 0) {
        el.style.borderColor = '#dc2626';
        hasNegative = true;
      } else {
        el.style.borderColor = '';
      }
    }
  });

  if (hasNegative) {
    showInventoryAlert('restock', 'Value must be greater than zero.');
    return false;
  }

  hideInventoryAlert('restock');
  return true;
}

function validateAdjustLive() {
  const prodSelect = document.getElementById('adjustProductSelect');
  const typeSelect = document.getElementById('adjustType');
  const noteInput = document.getElementById('adjustNote');

  if (prodSelect && prodSelect.value) prodSelect.style.borderColor = '';
  if (typeSelect && typeSelect.value) typeSelect.style.borderColor = '';
  if (noteInput && noteInput.value.trim()) noteInput.style.borderColor = '';

  const qtyIds = ['adjustSacks', 'adjustKg', 'adjust25kg', 'adjust20kg', 'adjust10kg', 'adjust5kg'];
  let hasNegative = false;

  qtyIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value !== '') {
      const val = parseFloat(el.value);
      if (isNaN(val) || val < 0) {
        el.style.borderColor = '#dc2626';
        hasNegative = true;
      } else {
        el.style.borderColor = '';
      }
    }
  });

  if (hasNegative) {
    showInventoryAlert('adjust', 'Value must be greater than zero.');
    return false;
  }

  hideInventoryAlert('adjust');
  return true;
}

async function renderInventoryManageTable() {
  const tbody = document.getElementById('inventoryManageTable');
  if (!tbody) return;

  try {
    const response = await fetch('api/get_inventory.php');
    if (!response.ok) throw new Error('HTTP error ' + response.status);

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error(data.error || data.message || 'Invalid data returned from server.');
    }

    inventoryCache = data.map(p => ({
      id: String(p.product_id),
      name: p.product_name,
      category: p.category || '',
      origin: p.origin || 'Local',
      riceType: p.rice_type || p.category || 'White Rice',
      kgPerSack: 50,
      stockSacks: Number(p.stock_sacks || 0),
      packaged25kg: Number(p.packaged_25kg || 0),
      stockKg: Number(p.stock_kg || 0),
      packaged5kg: Number(p.packaged_5kg || 0),
      packaged10kg: Number(p.packaged_10kg || 0),
      packaged20kg: Number(p.packaged_20kg || 0),
      receivedDate: p.received_date || '2026-09-01',
      batchNumber: p.batch_number || 'BATCH-001',
      daysOld: Number(p.days_old !== undefined && p.days_old !== null ? p.days_old : 0),
      thresholdKg: Number(p.reorder_level_kg || 0),
      batches: p.batches || []
    }));

    // Populate Rice Type Filter
    populateRiceTypeFilter();

    // Check Old Stocks Count (> 60 days)
    checkOldStocksBanner();

    // Render Filtered Table
    applyInventoryFilters();

  } catch (error) {
    console.error('Inventory load error:', error);
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">Failed to load inventory from server: ${error && error.message ? error.message : error}</td></tr>`;
  }
}

function populateRiceTypeFilter() {
  const select = document.getElementById('filterRiceType');
  if (!select) return;

  const current = select.value;
  const types = [...new Set(inventoryCache.map(p => p.riceType).filter(Boolean))];

  select.innerHTML = `<option value="all">All Rice Types</option>`;
  types.forEach(type => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type;
    select.appendChild(opt);
  });

  if ([...select.options].some(o => o.value === current)) select.value = current;
}

function checkOldStocksBanner() {
  const banner = document.getElementById('oldStockAlertBanner');
  const countEl = document.getElementById('oldStockAlertCount');
  if (!banner || !countEl) return;

  const oldStocks = inventoryCache.filter(p => p.daysOld > 60 && (p.stockSacks > 0 || p.stockKg > 0));

  if (oldStocks.length > 0) {
    banner.style.display = 'flex';
    countEl.textContent = `Attention: ${oldStocks.length} rice ${oldStocks.length === 1 ? 'variety' : 'varieties'}`;
  } else {
    banner.style.display = 'none';
  }
}

function filterByOldStockOnly() {
  document.getElementById('filterStockAge').value = 'old';
  applyInventoryFilters();
}

function applyInventoryFilters() {
  const tbody = document.getElementById('inventoryManageTable');
  if (!tbody) return;

  const search = document.getElementById('searchInventory').value.toLowerCase();
  const origin = document.getElementById('filterOrigin').value;
  const riceType = document.getElementById('filterRiceType').value;
  const ageFilter = document.getElementById('filterStockAge').value;
  const statusFilter = document.getElementById('filterStatus').value;

  const filtered = inventoryCache.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search) ||
      p.origin.toLowerCase().includes(search) ||
      p.riceType.toLowerCase().includes(search) ||
      p.batchNumber.toLowerCase().includes(search);

    const matchesOrigin = origin === 'all' || p.origin === origin;
    const matchesType = riceType === 'all' || p.riceType === riceType;

    // Age matching
    let matchesAge = true;
    if (ageFilter === 'fresh') matchesAge = p.daysOld < 15;
    else if (ageFilter === 'normal') matchesAge = p.daysOld >= 15 && p.daysOld <= 30;
    else if (ageFilter === 'aging') matchesAge = p.daysOld > 30 && p.daysOld <= 60;
    else if (ageFilter === 'old') matchesAge = p.daysOld > 60;

    // Total stock in kg
    const totalVolume = (p.stockSacks * 50) + (p.packaged25kg * 25) + (p.packaged20kg * 20) + (p.packaged10kg * 10) + (p.packaged5kg * 5) + p.stockKg;
    const isOut = totalVolume <= 0;
    const isLow = !isOut && totalVolume <= p.thresholdKg;

    let matchesStatus = true;
    if (statusFilter === 'instock') matchesStatus = !isOut && !isLow;
    else if (statusFilter === 'lowstock') matchesStatus = isLow;
    else if (statusFilter === 'outofstock') matchesStatus = isOut;

    return matchesSearch && matchesOrigin && matchesType && matchesAge && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">No rice inventory items match the current filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const totalVolume = (p.stockSacks * 50) + (p.packaged25kg * 25) + (p.packaged20kg * 20) + (p.packaged10kg * 10) + (p.packaged5kg * 5) + p.stockKg;
    const isOut = totalVolume <= 0;
    const isLow = !isOut && totalVolume <= p.thresholdKg;

    // Stock Age Badge
    let ageBadge = '';
    if (p.daysOld > 60) {
      ageBadge = `<span class="badge badge-old-stock">🔴 ${p.daysOld}d (Old Stock)</span>`;
    } else if (p.daysOld > 30) {
      ageBadge = `<span class="badge badge-aging">🟡 ${p.daysOld}d (Aging)</span>`;
    } else if (p.daysOld >= 15) {
      ageBadge = `<span class="badge badge-normal-age">🔵 ${p.daysOld}d (Normal)</span>`;
    } else {
      ageBadge = `<span class="badge badge-fresh">🟢 ${p.daysOld}d (Fresh)</span>`;
    }

    // Origin Badge
    const originBadge = p.origin === 'Imported'
      ? `<span class="badge badge-imported">Imported</span>`
      : `<span class="badge badge-local">Local</span>`;

    // Status Badge
    let statusBadge = `<span class="badge badge-success">Sufficient</span>`;
    if (isOut) statusBadge = `<span class="badge badge-danger">Out of Stock</span>`;
    else if (isLow) statusBadge = `<span class="badge badge-warning">Low Stock</span>`;

    return `
      <tr>
        <td>
          <strong>${p.name}</strong>
          <div style="font-size:11px;color:var(--text-muted);">${p.category}</div>
        </td>

        <td>
          <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;">
            ${originBadge}
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);">${p.riceType}</span>
          </div>
        </td>

        <td><strong>${p.stockSacks} sacks (50Kg)</strong></td>

        <td>
          <div class="pack-chips-group">
            <span class="pack-chip" style="background:#e0e7ff;color:#3730a3;">25Kg Half: <strong>${p.packaged25kg}</strong></span>
            <span class="pack-chip">20Kg: <strong>${p.packaged20kg}</strong></span>
            <span class="pack-chip">10Kg: <strong>${p.packaged10kg}</strong></span>
            <span class="pack-chip">5Kg: <strong>${p.packaged5kg}</strong></span>
          </div>
        </td>

        <td><strong>${p.stockKg} kg</strong></td>

        <td><strong>${formatNumber(totalVolume)} kg</strong></td>

        <td>
          <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;">
            ${ageBadge}
            <span style="font-size:11px;color:var(--text-muted);">${p.batchNumber} (${formatDate(p.receivedDate)})</span>
          </div>
        </td>

        <td>${p.thresholdKg} kg alert</td>

        <td>${statusBadge}</td>

        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-open-sack btn-sm" onclick="openOpenSackModal('${p.id}')" title="Open a sack into loose rice">Open Sack</button>
            <button class="btn btn-primary btn-sm" onclick="openRestockModal('${p.id}')">Restock</button>
            <button class="btn btn-secondary btn-sm" onclick="openAdjustModal('${p.id}')">Adjust/Repack</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function renderAdjustmentLogs() {
  const tbody = document.getElementById('adjustmentLogTable');
  if (!tbody) return;

  try {
    const response = await fetch('api/get_adjustments.php');
    if (!response.ok) throw new Error('Failed to load adjustment logs.');

    const adjustments = await response.json();
    if (!adjustments.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No adjustments logged yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = adjustments.map(a => {
      let typeBadge = `<span class="badge badge-info">${a.adjustment_type}</span>`;
      if (a.adjustment_type === 'open_sack') typeBadge = `<span class="badge badge-warning" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;font-weight:700;">📦 Opened Sack</span>`;
      else if (a.adjustment_type === 'restock') typeBadge = `<span class="badge badge-success">Restock</span>`;
      else if (a.adjustment_type === 'spoilage') typeBadge = `<span class="badge badge-danger">Damage / Spoilage</span>`;
      else if (a.adjustment_type === 'repack') typeBadge = `<span class="badge badge-purple" style="background:#f3e8ff;color:#7e22ce;">Repack</span>`;

      const sacks = Number(a.sacks);
      const kg = Number(a.kg);
      const shiftText = `${sacks > 0 ? sacks + ' sacks' : ''} ${kg > 0 ? kg + ' kg' : ''}`.trim() || '0';

      return `
        <tr>
          <td>${formatDateTime(a.adjustment_date)}</td>
          <td><strong>${a.product_name}</strong></td>
          <td>${typeBadge}</td>
          <td>${shiftText}</td>
          <td style="max-width:240px;">${a.note || '-'}</td>
          <td>${a.performed_by || 'Admin User'}</td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Failed to load adjustment logs.</td></tr>`;
  }
}

function populateProductSelect(selectId, productId = null) {
  const select = document.getElementById(selectId);
  select.innerHTML = inventoryCache.map(p => `
    <option value="${p.id}" ${p.id === productId ? 'selected' : ''}>
      ${p.name} [${p.origin}] - Current: ${p.stockSacks} sacks, ${p.packaged25kg}x 25kg, ${p.stockKg} kg (Packs: ${p.packaged20kg}x 20Kg, ${p.packaged10kg}x 10Kg, ${p.packaged5kg}x 5Kg)
    </option>
  `).join('');
}

function openRestockModal(productId = null) {
  populateProductSelect('restockProductSelect', productId);
  const resetIds = ['restockProductSelect', 'restockSacks', 'restockKg', 'restock25kg', 'restock20kg', 'restock10kg', 'restock5kg', 'restockDate', 'restockBatch'];
  resetIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.borderColor = '';
  });
  document.getElementById('restockSacks').value = '0';
  document.getElementById('restockKg').value = '0';
  document.getElementById('restock25kg').value = '0';
  document.getElementById('restock20kg').value = '0';
  document.getElementById('restock10kg').value = '0';
  document.getElementById('restock5kg').value = '0';
  document.getElementById('restockDate').value = typeof getLocalDateString === 'function' ? getLocalDateString() : new Date().toLocaleDateString('en-CA');
  document.getElementById('restockBatch').value = `BATCH-${dateCode()}`;
  hideInventoryAlert('restock');
  openModal('modalRestock');
}

function openAdjustModal(productId = null) {
  populateProductSelect('adjustProductSelect', productId);
  updateAdjustBatches();
  const resetIds = ['adjustProductSelect', 'adjustBatchSelect', 'adjustType', 'adjustSacks', 'adjustKg', 'adjust25kg', 'adjust20kg', 'adjust10kg', 'adjust5kg', 'adjustNote'];
  resetIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.borderColor = '';
  });
  document.getElementById('adjustType').value = 'correction';
  populateAdjustFormFields();
  document.getElementById('adjustNote').value = '';
  hideInventoryAlert('adjust');
  updateAdjustTypeUI();
  openModal('modalStockAdjust');
}

function populateAdjustFormFields() {
  const prodSelect = document.getElementById('adjustProductSelect');
  const typeSelect = document.getElementById('adjustType');
  if (!prodSelect || !typeSelect) return;

  const product = inventoryCache.find(p => p.id === prodSelect.value);
  if (!product) return;

  if (typeSelect.value === 'correction') {
    document.getElementById('adjustSacks').value = product.stockSacks || 0;
    document.getElementById('adjustKg').value = product.stockKg || 0;
    document.getElementById('adjust25kg').value = product.packaged25kg || 0;
    document.getElementById('adjust20kg').value = product.packaged20kg || 0;
    document.getElementById('adjust10kg').value = product.packaged10kg || 0;
    document.getElementById('adjust5kg').value = product.packaged5kg || 0;
  } else {
    document.getElementById('adjustSacks').value = 0;
    document.getElementById('adjustKg').value = 0;
    document.getElementById('adjust25kg').value = 0;
    document.getElementById('adjust20kg').value = 0;
    document.getElementById('adjust10kg').value = 0;
    document.getElementById('adjust5kg').value = 0;
  }
}

function updateAdjustBatches() {
  const prodSelect = document.getElementById('adjustProductSelect');
  const batchSelect = document.getElementById('adjustBatchSelect');
  if (!prodSelect || !batchSelect) return;

  const product = inventoryCache.find(p => p.id === prodSelect.value);
  if (!product) return;

  if (product.batches && product.batches.length > 0) {
    batchSelect.innerHTML = product.batches.map(b => {
      return `<option value="${b.batch_code}">${b.batch_code} (${b.stock_sacks} sacks, ${b.packaged_25kg || 0}x 25kg, ${Number(b.stock_kg).toFixed(1)} kg loose • ${b.days_old}d old)</option>`;
    }).join('');
  } else {
    const batches = getProductBatches(product);
    batchSelect.innerHTML = batches.map(b => `
      <option value="${b.batchNumber}">${b.label}</option>
    `).join('');
  }
}

function updateAdjustTypeUI() {
  const typeSelect = document.getElementById('adjustType');
  const infoBox = document.getElementById('adjustRepackInfoBox');
  const bulkRow = document.getElementById('adjustBulkRow');
  const packsHeading = document.getElementById('adjustPacksHeading');
  if (!typeSelect) return;

  const type = typeSelect.value;
  if (type === 'repack') {
    if (infoBox) infoBox.style.display = 'block';
    if (bulkRow) bulkRow.style.display = 'grid';
    if (packsHeading) packsHeading.textContent = 'Retail Bags to Produce (25kg Half / 20kg / 10kg / 5kg)';
    updateAdjustRepackPreview();
  } else if (type === 'correction') {
    if (infoBox) infoBox.style.display = 'none';
    if (bulkRow) bulkRow.style.display = 'grid';
    if (packsHeading) packsHeading.textContent = 'Package Bags Count (Physical Count Recount)';
  } else {
    // Spoilage
    if (infoBox) infoBox.style.display = 'none';
    if (bulkRow) bulkRow.style.display = 'grid';
    if (packsHeading) packsHeading.textContent = 'Damaged Package Bags to Discard';
  }
}

function updateAdjustRepackPreview() {
  const infoText = document.getElementById('adjustRepackInfoText');
  if (!infoText) return;
  const p25 = parseInt(document.getElementById('adjust25kg').value) || 0;
  const p20 = parseInt(document.getElementById('adjust20kg').value) || 0;
  const p10 = parseInt(document.getElementById('adjust10kg').value) || 0;
  const p5 = parseInt(document.getElementById('adjust5kg').value) || 0;
  const totalKg = (p25 * 25) + (p20 * 20) + (p10 * 10) + (p5 * 5);

  if (totalKg === 0) {
    infoText.innerHTML = `Enter how many 25kg, 20kg, 10kg, or 5kg retail bags to produce. The system will automatically deduct the required kilos from loose stock or whole sacks in the selected batch.`;
  } else {
    infoText.innerHTML = `Repacking <strong>${totalKg} kg</strong> total (${p25 > 0 ? p25 + 'x 25kg Half ' : ''}${p20 > 0 ? p20 + 'x 20kg ' : ''}${p10 > 0 ? p10 + 'x 10kg ' : ''}${p5 > 0 ? p5 + 'x 5kg' : ''}).<br>This will deduct <strong>${totalKg} kg</strong> from bulk inventory (first from loose tinatakal, then opening whole sacks if needed).`;
  }
}

async function handleRestockSubmit(e) {
  e.preventDefault();

  const prodSelect = document.getElementById('restockProductSelect');
  const dateInput = document.getElementById('restockDate');
  const batchInput = document.getElementById('restockBatch');
  const sacksInput = document.getElementById('restockSacks');
  const kgInput = document.getElementById('restockKg');
  const p25Input = document.getElementById('restock25kg');
  const p20Input = document.getElementById('restock20kg');
  const p10Input = document.getElementById('restock10kg');
  const p5Input = document.getElementById('restock5kg');

  const productId = prodSelect.value;
  const receivedDate = dateInput.value.trim();
  const batchNumber = batchInput.value.trim();
  const sacks = parseInt(sacksInput.value) || 0;
  const kg = parseFloat(kgInput.value) || 0;
  const packaged25kg = parseInt(p25Input ? p25Input.value : 0) || 0;
  const packaged20kg = parseInt(p20Input.value) || 0;
  const packaged10kg = parseInt(p10Input.value) || 0;
  const packaged5kg = parseInt(p5Input.value) || 0;

  // 1. Missing required fields check
  const requiredFields = [
    { el: prodSelect, val: productId, label: 'Rice Variety' },
    { el: dateInput, val: receivedDate, label: 'Date Received' },
    { el: batchInput, val: batchNumber, label: 'Batch Number / Lot' }
  ];

  const missingLabels = [];
  let firstMissingEl = null;

  requiredFields.forEach(f => {
    if (!f.val) {
      missingLabels.push(f.label);
      if (f.el) {
        f.el.style.borderColor = '#dc2626';
        if (!firstMissingEl) firstMissingEl = f.el;
      }
    } else {
      if (f.el) f.el.style.borderColor = '';
    }
  });

  if (missingLabels.length > 0) {
    const errorMsg = missingLabels.length === 1
      ? `${missingLabels[0]} is required.`
      : `Please fill in all required fields: ${missingLabels.join(', ')}.`;
    showToast(errorMsg, 'warning');
    showInventoryAlert('restock', errorMsg);
    if (firstMissingEl) firstMissingEl.focus();
    return;
  }

  // 2. Value must be greater than zero validation
  const qtyInputs = [
    { el: sacksInput, val: sacks },
    { el: kgInput, val: kg },
    { el: p25Input, val: packaged25kg },
    { el: p20Input, val: packaged20kg },
    { el: p10Input, val: packaged10kg },
    { el: p5Input, val: packaged5kg }
  ];

  // Any negative?
  for (const item of qtyInputs) {
    if (item.val < 0) {
      if (item.el) {
        item.el.style.borderColor = '#dc2626';
        item.el.focus();
      }
      showToast('Value must be greater than zero.', 'warning');
      showInventoryAlert('restock', 'Value must be greater than zero.');
      return;
    }
  }

  // All zero?
  if (sacks <= 0 && kg <= 0 && packaged25kg <= 0 && packaged20kg <= 0 && packaged10kg <= 0 && packaged5kg <= 0) {
    qtyInputs.forEach(item => { if (item.el) item.el.style.borderColor = '#dc2626'; });
    sacksInput.focus();
    showToast('Value must be greater than zero.', 'warning');
    showInventoryAlert('restock', 'Value must be greater than zero.');
    return;
  }

  qtyInputs.forEach(item => { if (item.el) item.el.style.borderColor = ''; });
  hideInventoryAlert('restock');

  const user = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};

  showPageLoader('Recording restock batch and updating warehouse stock...');

  try {
    const res = await fetch('api/adjust_stock.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        type: 'restock',
        sacks,
        kg,
        packaged25kg,
        packaged20kg,
        packaged10kg,
        packaged5kg,
        receivedDate,
        batchNumber,
        note: `Restocked batch ${batchNumber} (${receivedDate})`,
        user: user.name || 'Admin User'
      })
    });

    const result = await res.json();
    if (result.success) {
      showToast(`Restocked ${result.productName} successfully! Stock age reset.`, 'success');
      closeModal('modalRestock');
      await renderInventoryManageTable();
      await renderAdjustmentLogs();
    } else {
      showToast(result.message || 'Restock failed.', 'danger');
      showInventoryAlert('restock', result.message || 'Restock failed.');
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to save restock.', 'danger');
    showInventoryAlert('restock', 'Failed to save restock.');
  } finally {
    hidePageLoader();
  }
}

async function handleAdjustSubmit(e) {
  e.preventDefault();

  const prodSelect = document.getElementById('adjustProductSelect');
  const batchSelect = document.getElementById('adjustBatchSelect');
  const typeSelect = document.getElementById('adjustType');
  const noteInput = document.getElementById('adjustNote');
  const sacksInput = document.getElementById('adjustSacks');
  const kgInput = document.getElementById('adjustKg');
  const p25Input = document.getElementById('adjust25kg');
  const p20Input = document.getElementById('adjust20kg');
  const p10Input = document.getElementById('adjust10kg');
  const p5Input = document.getElementById('adjust5kg');

  const productId = prodSelect.value;
  const batchNumber = batchSelect ? batchSelect.value : '';
  const type = typeSelect.value;
  const note = noteInput.value.trim();
  const sacks = parseInt(sacksInput.value) || 0;
  const kg = parseFloat(kgInput.value) || 0;
  const packaged25kg = parseInt(p25Input ? p25Input.value : 0) || 0;
  const packaged20kg = parseInt(p20Input ? p20Input.value : 0) || 0;
  const packaged10kg = parseInt(p10Input ? p10Input.value : 0) || 0;
  const packaged5kg = parseInt(p5Input ? p5Input.value : 0) || 0;

  // 1. Missing required fields check
  const requiredFields = [
    { el: prodSelect, val: productId, label: 'Rice Variety' },
    { el: typeSelect, val: type, label: 'Action / Adjustment Type' },
    { el: noteInput, val: note, label: 'Reason / Notes' }
  ];

  const missingLabels = [];
  let firstMissingEl = null;

  requiredFields.forEach(f => {
    if (!f.val) {
      missingLabels.push(f.label);
      if (f.el) {
        f.el.style.borderColor = '#dc2626';
        if (!firstMissingEl) firstMissingEl = f.el;
      }
    } else {
      if (f.el) f.el.style.borderColor = '';
    }
  });

  if (missingLabels.length > 0) {
    const errorMsg = missingLabels.length === 1
      ? `${missingLabels[0]} is required.`
      : `Please fill in all required fields: ${missingLabels.join(', ')}.`;
    showToast(errorMsg, 'warning');
    showInventoryAlert('adjust', errorMsg);
    if (firstMissingEl) firstMissingEl.focus();
    return;
  }

  // 2. Repack requires at least one retail package bag > 0
  if (type === 'repack') {
    if (packaged25kg <= 0 && packaged20kg <= 0 && packaged10kg <= 0 && packaged5kg <= 0) {
      [p25Input, p20Input, p10Input, p5Input].forEach(el => { if (el) el.style.borderColor = '#dc2626'; });
      const msg = 'Please enter at least one bag quantity (25kg Half, 20kg, 10kg, or 5kg) to repack.';
      showToast(msg, 'warning');
      showInventoryAlert('adjust', msg);
      return;
    }

    const totalRepackedKg = (packaged25kg * 25) + (packaged20kg * 20) + (packaged10kg * 10) + (packaged5kg * 5);
    const product = inventoryCache.find(p => p.id === productId);
    if (product) {
      const availableKg = (product.stockSacks * 50) + (product.packaged25kg * 25) + (product.packaged20kg * 20) + (product.packaged10kg * 10) + (product.packaged5kg * 5) + product.stockKg;
      if (totalRepackedKg > availableKg) {
        [p25Input, p20Input, p10Input, p5Input].forEach(el => { if (el) el.style.borderColor = '#dc2626'; });
        const msg = `Insufficient bulk inventory: Needs ${totalRepackedKg} kg to repack, but only ${availableKg.toFixed(1)} kg is available.`;
        showToast(msg, 'warning');
        showInventoryAlert('adjust', msg);
        return;
      }
    }
  } else {
    // Physical count / Spoilage validation
    const qtyInputs = [
      { el: sacksInput, val: sacks },
      { el: kgInput, val: kg },
      { el: p25Input, val: packaged25kg },
      { el: p20Input, val: packaged20kg },
      { el: p10Input, val: packaged10kg },
      { el: p5Input, val: packaged5kg }
    ];

    for (const item of qtyInputs) {
      if (item.val < 0) {
        if (item.el) {
          item.el.style.borderColor = '#dc2626';
          item.el.focus();
        }
        showToast('Value must be greater than zero.', 'warning');
        showInventoryAlert('adjust', 'Value must be greater than zero.');
        return;
      }
    }

    if (sacks <= 0 && kg <= 0 && packaged25kg <= 0 && packaged20kg <= 0 && packaged10kg <= 0 && packaged5kg <= 0) {
      qtyInputs.forEach(item => { if (item.el) item.el.style.borderColor = '#dc2626'; });
      sacksInput.focus();
      showToast('Value must be greater than zero.', 'warning');
      showInventoryAlert('adjust', 'Value must be greater than zero.');
      return;
    }
  }

  [sacksInput, kgInput, p25Input, p20Input, p10Input, p5Input].forEach(el => { if (el) el.style.borderColor = ''; });
  hideInventoryAlert('adjust');

  const user = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};

  showPageLoader('Saving inventory adjustment to database...');

  try {
    const res = await fetch('api/adjust_stock.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        type,
        sacks,
        kg,
        packaged25kg,
        packaged20kg,
        packaged10kg,
        packaged5kg,
        batchNumber,
        note,
        user: user.name || 'Admin User'
      })
    });

    const result = await res.json();
    if (result.success) {
      showToast(`Adjustment saved for ${result.productName}.`, 'success');
      closeModal('modalStockAdjust');
      await renderInventoryManageTable();
      await renderAdjustmentLogs();
    } else {
      showToast(result.message || 'Adjustment failed.', 'danger');
      showInventoryAlert('adjust', result.message || 'Adjustment failed.');
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to save adjustment.', 'danger');
    showInventoryAlert('adjust', 'Failed to save adjustment.');
  } finally {
    hidePageLoader();
  }
}

function openOpenSackModal(productId = null) {
  populateProductSelect('openSackProductSelect', productId);
  updateOpenSackBatches();
  document.getElementById('openSackTypeSelect').value = '50kg';
  const qtyEl = document.getElementById('openSackQty');
  qtyEl.value = '1';
  qtyEl.style.borderColor = '';
  const noteEl = document.getElementById('openSackNote');
  noteEl.value = '';
  noteEl.style.borderColor = '';
  document.getElementById('openSackProductSelect').style.borderColor = '';
  document.getElementById('openSackBatchSelect').style.borderColor = '';
  hideInventoryAlert('openSack');
  updateOpenSackPreview();
  openModal('modalOpenSack');
}

function updateOpenSackBatches() {
  const prodSelect = document.getElementById('openSackProductSelect');
  const batchSelect = document.getElementById('openSackBatchSelect');
  if (!prodSelect || !batchSelect) return;

  const product = inventoryCache.find(p => p.id === prodSelect.value);
  if (!product) return;

  const batches = getProductBatches(product);
  batchSelect.innerHTML = batches.map(b => `
    <option value="${b.batchNumber}">${b.label}</option>
  `).join('');
}

function updateOpenSackPreview() {
  const prodSelect = document.getElementById('openSackProductSelect');
  const batchSelect = document.getElementById('openSackBatchSelect');
  const typeSelect = document.getElementById('openSackTypeSelect');
  const qtyInput = document.getElementById('openSackQty');
  const previewText = document.getElementById('openSackPreviewText');

  if (!prodSelect || !typeSelect || !qtyInput || !previewText) return;

  const prodId = prodSelect.value;
  const product = inventoryCache.find(p => p.id === prodId);
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

async function handleOpenSackSubmit(e) {
  e.preventDefault();

  const prodSelect = document.getElementById('openSackProductSelect');
  const batchSelect = document.getElementById('openSackBatchSelect');
  const typeSelect = document.getElementById('openSackTypeSelect');
  const qtyInput = document.getElementById('openSackQty');
  const noteInput = document.getElementById('openSackNote');

  const productId = prodSelect.value;
  const sackType = typeSelect.value;
  const rawQty = qtyInput.value.trim();
  const batchNumber = batchSelect.value;
  const note = noteInput.value.trim();

  // 1. Missing required fields check
  const requiredFields = [
    { el: prodSelect, val: productId, label: 'Rice Variety' },
    { el: batchSelect, val: batchNumber, label: 'Rice Batch' },
    { el: qtyInput, val: rawQty, label: 'Number of Sacks to Open' }
  ];

  const missingLabels = [];
  let firstMissingEl = null;

  requiredFields.forEach(f => {
    if (!f.val) {
      missingLabels.push(f.label);
      if (f.el) {
        f.el.style.borderColor = '#dc2626';
        if (!firstMissingEl) firstMissingEl = f.el;
      }
    } else {
      if (f.el) f.el.style.borderColor = '';
    }
  });

  if (missingLabels.length > 0) {
    const errorMsg = missingLabels.length === 1
      ? `${missingLabels[0]} is required.`
      : `Please fill in all required fields: ${missingLabels.join(', ')}.`;
    showToast(errorMsg, 'warning');
    showInventoryAlert('openSack', errorMsg);
    if (firstMissingEl) firstMissingEl.focus();
    return;
  }

  // 2. Value must be greater than zero validation
  const qty = parseInt(rawQty);
  if (isNaN(qty) || qty <= 0) {
    qtyInput.style.borderColor = '#dc2626';
    qtyInput.focus();
    showToast('Value must be greater than zero.', 'warning');
    showInventoryAlert('openSack', 'Value must be greater than zero.');
    return;
  }

  // 3. Stock sufficiency check
  const product = inventoryCache.find(p => p.id === productId);
  if (product) {
    let currentSacks = product.stockSacks;
    if (sackType === '25kg' || sackType === 'half') currentSacks = product.packaged25kg;
    else if (sackType === '20kg') currentSacks = product.packaged20kg;
    else if (sackType === '10kg') currentSacks = product.packaged10kg;
    else if (sackType === '5kg') currentSacks = product.packaged5kg;

    if (qty > currentSacks) {
      qtyInput.style.borderColor = '#dc2626';
      qtyInput.focus();
      const msg = `Insufficient stock: You only have ${currentSacks} sack(s) available.`;
      showToast(msg, 'warning');
      showInventoryAlert('openSack', msg);
      return;
    }
  }

  hideInventoryAlert('openSack');
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
        user: user.name || 'Admin User'
      })
    });

    const result = await res.json();
    if (result.success) {
      showToast(`Successfully opened ${qty}x ${sackType} sack from Batch ${batchNumber} for ${result.productName}! Loose inventory updated to ${formatNumber(result.stockKg)} kg.`, 'success');
      closeModal('modalOpenSack');
      await renderInventoryManageTable();
      await renderAdjustmentLogs();
    } else {
      showToast(result.message || 'Failed to open sack.', 'danger');
      showInventoryAlert('openSack', result.message || 'Failed to open sack.');
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to process sack opening.', 'danger');
    showInventoryAlert('openSack', 'Failed to process sack opening.');
  } finally {
    hideTopLoader();
  }
}

function dateCode() {
  const d = new Date();
  return `${d.getFullYear().toString().slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}