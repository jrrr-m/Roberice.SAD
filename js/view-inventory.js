/**
 * Roberice POS & Inventory System - View Inventory Script
 * Features: Dynamic Rice Variety Summary with Interactive Batch Drill-down & Real-time Depletion Tracking
 */

let inventoryCache = [];
const expandedVarietyIds = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  await loadInventory();

  // Search & Filter listeners
  const searchInput = document.getElementById('searchInventory');
  if (searchInput) searchInput.addEventListener('input', renderInventoryTable);
  const filterOrigin = document.getElementById('filterOrigin');
  if (filterOrigin) filterOrigin.addEventListener('change', renderInventoryTable);
  const filterRiceType = document.getElementById('filterRiceType');
  if (filterRiceType) filterRiceType.addEventListener('change', renderInventoryTable);
  const filterStockAge = document.getElementById('filterStockAge');
  if (filterStockAge) filterStockAge.addEventListener('change', renderInventoryTable);
  const filterStatus = document.getElementById('filterStatus');
  if (filterStatus) filterStatus.addEventListener('change', renderInventoryTable);

  // Modal Triggers & Form
  const btnViewOpenSack = document.getElementById('btnViewOpenSack');
  if (btnViewOpenSack) btnViewOpenSack.addEventListener('click', () => openViewOpenSackModal());

  const formViewOpenSack = document.getElementById('viewOpenSackForm');
  if (formViewOpenSack) formViewOpenSack.addEventListener('submit', handleViewOpenSackSubmit);

  const selViewProd = document.getElementById('viewOpenSackProduct');
  const selViewBatch = document.getElementById('viewOpenSackBatch');
  const selViewType = document.getElementById('viewOpenSackType');
  const inpViewQty = document.getElementById('viewOpenSackQty');

  if (selViewProd) selViewProd.addEventListener('change', () => {
    updateViewOpenSackBatches();
    updateViewOpenSackPreview();
  });
  if (selViewBatch) selViewBatch.addEventListener('change', updateViewOpenSackPreview);
  if (selViewType) selViewType.addEventListener('change', updateViewOpenSackPreview);
  if (inpViewQty) inpViewQty.addEventListener('input', updateViewOpenSackPreview);
});

async function loadInventory() {
  try {
    const response = await fetch('api/get_inventory.php');
    if (!response.ok) throw new Error('Failed to load inventory.');

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error(data.error || 'Invalid inventory response.');
    }

    inventoryCache = data.map(p => {
      const activeBatches = Array.isArray(p.batches)
        ? p.batches.filter(b => b.status === 'Active' && Number(b.total_kg || 0) > 0)
        : [];

      return {
        id: String(p.product_id),
        name: p.product_name,
        category: p.category || '',
        origin: p.origin || 'Local',
        riceType: p.rice_type || p.category || 'White Rice',
        priceSack: Number(p.price_sack || 0),
        priceKg: Number(p.price_kg || 0),
        kgPerSack: 50,
        stockSacks: Number(p.stock_sacks || 0),
        packaged25kg: Number(p.packaged_25kg || 0),
        packaged20kg: Number(p.packaged_20kg || 0),
        packaged10kg: Number(p.packaged_10kg || 0),
        packaged5kg: Number(p.packaged_5kg || 0),
        stockKg: Number(p.stock_kg || 0),
        receivedDate: p.received_date || '2026-09-01',
        batchNumber: p.batch_number || 'BATCH-001',
        daysOld: Number(p.days_old !== undefined && p.days_old !== null ? p.days_old : 0),
        thresholdKg: Number(p.reorder_level_kg || 100),
        status: p.product_status || 'Active',
        batches: activeBatches
      };
    });

    populateRiceTypeFilter();
    renderInventoryTable();
  } catch (error) {
    console.error('View inventory error:', error);
    const tbody = document.getElementById('inventoryTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="11" class="empty-state">Failed to load inventory: ${error && error.message ? error.message : error}</td></tr>`;
    }
  }
}

function populateRiceTypeFilter() {
  const select = document.getElementById('filterRiceType');
  if (!select) return;

  const current = select.value;
  const types = [...new Set(inventoryCache.map(p => p.riceType).filter(Boolean))];

  select.innerHTML = `<option value="all">All Rice Types</option>`;
  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    select.appendChild(opt);
  });

  if ([...select.options].some(o => o.value === current)) select.value = current;
}

function toggleBatchDrawer(productId) {
  if (expandedVarietyIds.has(productId)) {
    expandedVarietyIds.delete(productId);
  } else {
    expandedVarietyIds.add(productId);
  }
  renderInventoryTable();
}

function getAgeBadge(daysOld) {
  const days = Number(daysOld || 0);
  if (days > 60) {
    return `<span class="badge badge-old-stock">🔴 ${days}d (Old Stock)</span>`;
  } else if (days > 30) {
    return `<span class="badge badge-aging">🟡 ${days}d (Aging)</span>`;
  } else if (days >= 15) {
    return `<span class="badge badge-normal-age">🔵 ${days}d (Normal)</span>`;
  } else {
    return `<span class="badge badge-fresh">🟢 ${days}d (Fresh)</span>`;
  }
}

function renderInventoryTable() {
  const tbody = document.getElementById('inventoryTableBody');
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
      p.batches.some(b => b.batch_code.toLowerCase().includes(search));

    const matchesOrigin = origin === 'all' || p.origin === origin;
    const matchesType = riceType === 'all' || p.riceType === riceType;

    let matchesAge = true;
    if (ageFilter === 'fresh') matchesAge = p.daysOld < 15;
    else if (ageFilter === 'normal') matchesAge = p.daysOld >= 15 && p.daysOld <= 30;
    else if (ageFilter === 'aging') matchesAge = p.daysOld > 30 && p.daysOld <= 60;
    else if (ageFilter === 'old') matchesAge = p.daysOld > 60;

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
    tbody.innerHTML = `<tr><td colspan="11" class="empty-state">No matching rice varieties found.</td></tr>`;
    return;
  }

  let htmlRows = '';

  filtered.forEach(p => {
    const isExpanded = expandedVarietyIds.has(p.id);
    const totalVolume = (p.stockSacks * 50) + (p.packaged25kg * 25) + (p.packaged20kg * 20) + (p.packaged10kg * 10) + (p.packaged5kg * 5) + p.stockKg;
    const isOut = totalVolume <= 0;
    const isLow = !isOut && totalVolume <= p.thresholdKg;

    // Single-line Status Badge
    let statusBadge = `<span class="badge badge-success">In Stock</span>`;
    if (isOut) statusBadge = `<span class="badge badge-danger">Out of Stock</span>`;
    else if (isLow) statusBadge = `<span class="badge badge-warning">Low Stock</span>`;

    // Origin Badge
    const originBadge = p.origin === 'Imported'
      ? `<span class="badge badge-imported">Imported</span>`
      : `<span class="badge badge-local">Local</span>`;

    // Available Batches Pill / Toggle
    const batchCount = p.batches.length;
    let batchPillHtml = '';
    if (batchCount > 0) {
      batchPillHtml = `
        <button class="batch-toggle-pill" type="button" onclick="event.stopPropagation(); toggleBatchDrawer('${p.id}')" title="Click to view all available batches">
          <span>${batchCount} Batch${batchCount > 1 ? 'es' : ''}</span>
          <span class="chevron-icon">${isExpanded ? '▲' : '▼'}</span>
        </button>
      `;
    } else if (totalVolume > 0) {
      batchPillHtml = `
        <button class="batch-toggle-pill" type="button" onclick="event.stopPropagation(); toggleBatchDrawer('${p.id}')" title="Click to view active lot">
          <span>1 Batch (Active)</span>
          <span class="chevron-icon">${isExpanded ? '▲' : '▼'}</span>
        </button>
      `;
    } else {
      batchPillHtml = `<span style="font-size:11px;color:var(--text-muted);font-style:italic;">No active batches</span>`;
    }

    // Main Variety Summary Row
    htmlRows += `
      <tr class="inventory-variety-row ${isExpanded ? 'is-expanded' : ''}" onclick="toggleBatchDrawer('${p.id}')" title="Click row to expand/collapse batches">
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div>
              <strong>${p.name}</strong>
              <div style="font-size:11px;color:var(--text-muted);">${p.category}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;">
            ${originBadge}
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);">${p.riceType}</span>
          </div>
        </td>
        <td><strong>${formatCurrency(p.priceSack)}</strong></td>
        <td><strong>${formatCurrency(p.priceKg)}</strong></td>
        <td><strong>${p.stockSacks}</strong> sacks (50Kg)</td>
        <td>
          <div class="pack-chips-group">
            <span class="pack-chip" style="background:#e0e7ff;color:#3730a3;">25Kg: <strong>${p.packaged25kg}</strong></span>
            <span class="pack-chip">20Kg: <strong>${p.packaged20kg}</strong></span>
            <span class="pack-chip">10Kg: <strong>${p.packaged10kg}</strong></span>
            <span class="pack-chip">5Kg: <strong>${p.packaged5kg}</strong></span>
          </div>
        </td>
        <td><strong>${formatNumber(p.stockKg)}</strong> kg</td>
        <td><strong style="color:var(--primary);">${formatNumber(totalVolume)} kg</strong></td>
        <td>${batchPillHtml}</td>
        <td style="min-width:105px;text-align:center;white-space:nowrap;">${statusBadge}</td>
        <td>
          <button class="btn btn-open-sack btn-sm" type="button" onclick="event.stopPropagation(); openViewOpenSackModal('${p.id}')">
            Open Sack
          </button>
        </td>
      </tr>
    `;

    // If Expanded, Render Batch Breakdown Drawer Sub-table
    if (isExpanded) {
      let subTableContent = '';

      if (p.batches.length === 0 && totalVolume <= 0) {
        subTableContent = `
          <div style="padding:14px;text-align:center;color:var(--text-muted);font-style:italic;">
            All previous batches for <strong>${p.name}</strong> have run out and been archived to the audit log. Restock new inventory to create an active batch.
          </div>
        `;
      } else {
        const displayBatches = p.batches.length > 0 ? p.batches : [{
          batch_code: p.batchNumber || 'ACTIVE-LOT',
          received_date: p.receivedDate || '2026-10-12',
          days_old: p.daysOld || 0,
          stock_sacks: p.stockSacks,
          packaged_25kg: p.packaged25kg,
          packaged_20kg: p.packaged20kg,
          packaged_10kg: p.packaged10kg,
          packaged_5kg: p.packaged5kg,
          stock_kg: p.stockKg,
          total_kg: totalVolume
        }];

        const batchRowsHtml = displayBatches.map(b => {
          const bVolume = Number(b.total_kg !== undefined ? b.total_kg : ((b.stock_sacks * 50) + (b.packaged_25kg * 25) + (b.packaged_20kg * 20) + (b.packaged_10kg * 10) + (b.packaged_5kg * 5) + b.stock_kg));
          const bAgeBadge = getAgeBadge(b.days_old);

          return `
            <tr>
              <td><span class="batch-code-tag">${b.batch_code}</span></td>
              <td>${b.received_date}</td>
              <td>${bAgeBadge}</td>
              <td><strong>${b.stock_sacks}</strong> whole</td>
              <td>${b.packaged_25kg}</td>
              <td>${b.packaged_20kg}</td>
              <td>${b.packaged_10kg}</td>
              <td>${b.packaged_5kg}</td>
              <td>${formatNumber(b.stock_kg)} kg</td>
              <td><strong style="color:var(--primary);">${formatNumber(bVolume)} kg</strong></td>
              <td>
                <button class="btn btn-open-sack btn-sm" type="button" onclick="event.stopPropagation(); openViewOpenSackModal('${p.id}', '${b.batch_code}')" title="Open a sack from Batch ${b.batch_code}">
                  Open Sack
                </button>
              </td>
            </tr>
          `;
        }).join('');

        subTableContent = `
          <table class="batch-subtable">
            <thead>
              <tr>
                <th>Batch Code</th>
                <th>Date Received</th>
                <th>Stock Age</th>
                <th>50Kg Sacks</th>
                <th>25Kg Half</th>
                <th>20Kg Sacks</th>
                <th>10Kg Packs</th>
                <th>5Kg Packs</th>
                <th>Loose Kg</th>
                <th>Batch Volume</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${batchRowsHtml}
            </tbody>
          </table>
        `;
      }

      htmlRows += `
        <tr class="batch-drawer-row">
          <td colspan="11">
            <div class="batch-drawer-box">
              <div class="batch-drawer-title-bar">
                <h4>
                  <span>📦 Available Batches for ${p.name}</span>
                  <span style="font-size:12px;font-weight:600;color:var(--text-muted);">(${p.batches.length} lot(s) currently in warehouse)</span>
                </h4>
                <span class="batch-fifo-tag">FIFO: Oldest batches listed first for quality rotation</span>
              </div>
              ${subTableContent}
            </div>
          </td>
        </tr>
      `;
    }
  });

  tbody.innerHTML = htmlRows;
}

function openViewOpenSackModal(productId = null, targetBatchCode = null) {
  const prodSelect = document.getElementById('viewOpenSackProduct');
  if (!prodSelect) return;

  prodSelect.innerHTML = inventoryCache.map(p => `
    <option value="${p.id}" ${p.id === productId ? 'selected' : ''}>
      ${p.name} [${p.origin}] - Loose: ${formatNumber(p.stockKg)} kg (50Kg: ${p.stockSacks}, 25Kg: ${p.packaged25kg}, 20Kg: ${p.packaged20kg})
    </option>
  `).join('');

  updateViewOpenSackBatches(targetBatchCode);

  document.getElementById('viewOpenSackType').value = '50kg';
  document.getElementById('viewOpenSackQty').value = '1';
  document.getElementById('viewOpenSackNote').value = '';
  updateViewOpenSackPreview();
  openModal('modalOpenSackView');
}

function updateViewOpenSackBatches(selectedBatchCode = null) {
  const prodSelect = document.getElementById('viewOpenSackProduct');
  const batchSelect = document.getElementById('viewOpenSackBatch');
  if (!prodSelect || !batchSelect) return;

  const product = inventoryCache.find(p => p.id === prodSelect.value);
  if (!product) return;

  if (product.batches && product.batches.length > 0) {
    batchSelect.innerHTML = product.batches.map(b => `
      <option value="${b.batch_code}" ${(selectedBatchCode && b.batch_code === selectedBatchCode) ? 'selected' : ''}>
        ${b.batch_code} (Recv: ${b.received_date}, ${b.days_old}d) - ${b.stock_sacks} whole sacks, ${b.packaged25kg} half
      </option>
    `).join('');
  } else {
    batchSelect.innerHTML = `<option value="${product.batchNumber}">${product.batchNumber} (Default Lot)</option>`;
  }
}

function updateViewOpenSackPreview() {
  const prodSelect = document.getElementById('viewOpenSackProduct');
  const batchSelect = document.getElementById('viewOpenSackBatch');
  const typeSelect = document.getElementById('viewOpenSackType');
  const qtyInput = document.getElementById('viewOpenSackQty');
  const previewText = document.getElementById('viewOpenSackPreviewText');

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
    sackLabel = '25kg Half sack(s)';
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
  const afterLoose = product.stockKg + addedKg;
  const afterSacks = currentSacks - qty;

  let statusClass = 'color: #065f46; font-weight: 600;';
  let warningNote = '';

  if (afterSacks < 0) {
    statusClass = 'color: #dc2626; font-weight: 700;';
    warningNote = `<br><span style="color:#dc2626;">⚠️ Warning: Insufficient sacks in inventory (Only ${currentSacks} available).</span>`;
  }

  previewText.innerHTML = `
    <div style="${statusClass}">
      Opening <strong>${qty}x ${sackLabel}</strong> (${unitWeight} kg each) from <strong>Batch ${batchNumber}</strong>:
      <ul style="margin: 6px 0 0 18px; padding: 0;">
        <li>Remaining ${sackLabel}: <strong>${Math.max(0, afterSacks)}</strong> (was ${currentSacks})</li>
        <li>Loose Inventory Gain: <strong>+${addedKg} kg</strong></li>
        <li>New Total Loose Stock: <strong>${formatNumber(afterLoose)} kg</strong> (was ${formatNumber(product.stockKg)} kg)</li>
      </ul>
      ${warningNote}
    </div>
  `;
}

async function handleViewOpenSackSubmit(e) {
  e.preventDefault();
  const prodSelect = document.getElementById('viewOpenSackProduct');
  const batchSelect = document.getElementById('viewOpenSackBatch');
  const typeSelect = document.getElementById('viewOpenSackType');
  const qtyInput = document.getElementById('viewOpenSackQty');
  const noteInput = document.getElementById('viewOpenSackNote');

  if (!prodSelect || !typeSelect || !qtyInput) return;

  const productId = prodSelect.value;
  const sackType = typeSelect.value;
  const openQty = parseInt(qtyInput.value) || 1;
  const batchNumber = batchSelect ? batchSelect.value : '';
  const note = noteInput ? noteInput.value.trim() : '';

  const loggedUser = JSON.parse(sessionStorage.getItem('roberice_logged_user') || '{}');
  const userName = loggedUser.full_name || 'Admin User';

  try {
    const response = await fetch('api/adjust_stock.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        type: 'open_sack',
        sackType,
        openQty,
        batchNumber,
        note,
        user: userName
      })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to open sack.');
    }

    showToast(`Successfully opened ${openQty}x ${sackType} sack for ${result.productName}. Loose inventory updated.`, 'success');
    closeModal('modalOpenSackView');
    await loadInventory();
  } catch (err) {
    console.error('Error opening sack:', err);
    showToast(err.message || 'Failed to open sack.', 'danger');
  }
}