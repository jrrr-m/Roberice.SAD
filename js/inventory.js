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
  document.getElementById('btnOpenRestockModal').addEventListener('click', () => openRestockModal());
  document.getElementById('btnOpenAdjustModal').addEventListener('click', () => openAdjustModal());

  // Form Handlers
  document.getElementById('restockForm').addEventListener('submit', handleRestockSubmit);
  document.getElementById('adjustStockForm').addEventListener('submit', handleAdjustSubmit);
}

async function renderInventoryManageTable() {
  const tbody = document.getElementById('inventoryManageTable');
  if (!tbody) return;

  try {
    const response = await fetch('api/get_inventory.php');
    if (!response.ok) throw new Error('Failed to load inventory.');

    const data = await response.json();

    inventoryCache = data.map(p => ({
      id: String(p.product_id),
      name: p.product_name,
      category: p.category,
      origin: p.origin || 'Local',
      riceType: p.rice_type || p.category || 'White Rice',
      kgPerSack: Number(p.kg_per_sack || 50),
      stockSacks: Number(p.stock_sacks || 0),
      stockKg: Number(p.stock_kg || 0),
      packaged5kg: Number(p.packaged_5kg || 0),
      packaged10kg: Number(p.packaged_10kg || 0),
      packaged20kg: Number(p.packaged_20kg || 0),
      receivedDate: p.received_date || '2026-09-01',
      batchNumber: p.batch_number || 'BATCH-001',
      daysOld: Number(p.days_old !== undefined ? p.days_old : 0),
      thresholdKg: Number(p.reorder_level_kg || 0)
    }));

    // Populate Rice Type Filter
    populateRiceTypeFilter();

    // Check Old Stocks Count (> 60 days)
    checkOldStocksBanner();

    // Render Filtered Table
    applyInventoryFilters();

  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">Failed to load inventory from server.</td></tr>`;
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
    const totalVolume = (p.stockSacks * p.kgPerSack) + p.stockKg + (p.packaged5kg * 5) + (p.packaged10kg * 10) + (p.packaged20kg * 20);
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
    const totalVolume = (p.stockSacks * p.kgPerSack) + p.stockKg + (p.packaged5kg * 5) + (p.packaged10kg * 10) + (p.packaged20kg * 20);
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

        <td><strong>${p.stockSacks} sacks</strong></td>

        <td>
          <div class="pack-chips-group">
            <span class="pack-chip">5kg: <strong>${p.packaged5kg}</strong></span>
            <span class="pack-chip">10kg: <strong>${p.packaged10kg}</strong></span>
            <span class="pack-chip">20kg: <strong>${p.packaged20kg}</strong></span>
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
          <div style="display:flex;gap:6px;">
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
      if (a.adjustment_type === 'restock') typeBadge = `<span class="badge badge-success">Restock</span>`;
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
      ${p.name} [${p.origin}] - Current: ${p.stockSacks} sacks, ${p.stockKg} kg (Packs: ${p.packaged5kg}x 5k, ${p.packaged10kg}x 10k, ${p.packaged20kg}x 20k)
    </option>
  `).join('');
}

function openRestockModal(productId = null) {
  populateProductSelect('restockProductSelect', productId);
  document.getElementById('restockSacks').value = '0';
  document.getElementById('restockKg').value = '0';
  document.getElementById('restock5kg').value = '0';
  document.getElementById('restock10kg').value = '0';
  document.getElementById('restock20kg').value = '0';
  document.getElementById('restockDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('restockBatch').value = `BATCH-${dateCode()}`;
  openModal('modalRestock');
}

function openAdjustModal(productId = null) {
  populateProductSelect('adjustProductSelect', productId);
  document.getElementById('adjustType').value = 'repack';
  document.getElementById('adjustSacks').value = '0';
  document.getElementById('adjustKg').value = '0';
  document.getElementById('adjust5kg').value = '0';
  document.getElementById('adjust10kg').value = '0';
  document.getElementById('adjust20kg').value = '0';
  document.getElementById('adjustNote').value = '';
  openModal('modalStockAdjust');
}

async function handleRestockSubmit(e) {
  e.preventDefault();

  const productId = document.getElementById('restockProductSelect').value;
  const sacks = parseInt(document.getElementById('restockSacks').value) || 0;
  const kg = parseFloat(document.getElementById('restockKg').value) || 0;
  const packaged5kg = parseInt(document.getElementById('restock5kg').value) || 0;
  const packaged10kg = parseInt(document.getElementById('restock10kg').value) || 0;
  const packaged20kg = parseInt(document.getElementById('restock20kg').value) || 0;
  const receivedDate = document.getElementById('restockDate').value;
  const batchNumber = document.getElementById('restockBatch').value.trim();

  if (sacks <= 0 && kg <= 0 && packaged5kg <= 0 && packaged10kg <= 0 && packaged20kg <= 0) {
    showToast('Please enter an amount of sacks, kg, or packages to restock.', 'warning');
    return;
  }

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
        packaged5kg,
        packaged10kg,
        packaged20kg,
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
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to save restock.', 'danger');
  } finally {
    hidePageLoader();
  }
}

async function handleAdjustSubmit(e) {
  e.preventDefault();

  const productId = document.getElementById('adjustProductSelect').value;
  const type = document.getElementById('adjustType').value;
  const sacks = parseInt(document.getElementById('adjustSacks').value) || 0;
  const kg = parseFloat(document.getElementById('adjustKg').value) || 0;
  const packaged5kg = parseInt(document.getElementById('adjust5kg').value) || 0;
  const packaged10kg = parseInt(document.getElementById('adjust10kg').value) || 0;
  const packaged20kg = parseInt(document.getElementById('adjust20kg').value) || 0;
  const note = document.getElementById('adjustNote').value.trim();

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
        packaged5kg,
        packaged10kg,
        packaged20kg,
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
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to save adjustment.', 'danger');
  } finally {
    hidePageLoader();
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