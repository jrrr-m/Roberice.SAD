/**
 * Roberice POS & Inventory System - View Inventory Script
 */

let inventoryCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadInventory();

  document.getElementById('searchInventory').addEventListener('input', renderInventoryTable);
  document.getElementById('filterOrigin').addEventListener('change', renderInventoryTable);
  document.getElementById('filterRiceType').addEventListener('change', renderInventoryTable);
  document.getElementById('filterStockAge').addEventListener('change', renderInventoryTable);
  document.getElementById('filterStatus').addEventListener('change', renderInventoryTable);
});

async function loadInventory() {
  try {
    const response = await fetch('api/get_products.php');
    if (!response.ok) throw new Error('Failed to load inventory.');

    const data = await response.json();

    inventoryCache = data.map(p => ({
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
      receivedDate: p.received_date || '2026-09-01',
      batchNumber: p.batch_number || 'BATCH-001',
      daysOld: Number(p.days_old !== undefined ? p.days_old : 0),
      thresholdKg: Number(p.reorder_level_kg || 0),
      status: p.product_status
    }));

    populateRiceTypeFilter();
    renderInventoryTable();
  } catch (error) {
    console.error(error);
    const tbody = document.getElementById('inventoryTableBody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-state">Failed to load inventory.</td></tr>`;
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
      p.batchNumber.toLowerCase().includes(search);

    const matchesOrigin = origin === 'all' || p.origin === origin;
    const matchesType = riceType === 'all' || p.riceType === riceType;

    let matchesAge = true;
    if (ageFilter === 'fresh') matchesAge = p.daysOld < 15;
    else if (ageFilter === 'normal') matchesAge = p.daysOld >= 15 && p.daysOld <= 30;
    else if (ageFilter === 'aging') matchesAge = p.daysOld > 30 && p.daysOld <= 60;
    else if (ageFilter === 'old') matchesAge = p.daysOld > 60;

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
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">No matching rice items found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const totalVolume = (p.stockSacks * p.kgPerSack) + p.stockKg + (p.packaged5kg * 5) + (p.packaged10kg * 10) + (p.packaged20kg * 20);
    const isOut = totalVolume <= 0;
    const isLow = !isOut && totalVolume <= p.thresholdKg;

    // Status Badge
    let statusBadge = `<span class="badge badge-success">In Stock</span>`;
    if (isOut) statusBadge = `<span class="badge badge-danger">Out of Stock</span>`;
    else if (isLow) statusBadge = `<span class="badge badge-warning">Low Stock</span>`;

    // Origin Badge
    const originBadge = p.origin === 'Imported'
      ? `<span class="badge badge-imported">Imported</span>`
      : `<span class="badge badge-local">Local</span>`;

    // Age Badge
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
        <td><strong>${formatCurrency(p.priceSack)}</strong></td>
        <td><strong>${formatCurrency(p.priceKg)}</strong></td>
        <td>${p.stockSacks} sacks</td>
        <td>
          <div class="pack-chips-group">
            <span class="pack-chip">5k: <strong>${p.packaged5kg}</strong></span>
            <span class="pack-chip">10k: <strong>${p.packaged10kg}</strong></span>
            <span class="pack-chip">20k: <strong>${p.packaged20kg}</strong></span>
          </div>
        </td>
        <td>${p.stockKg} kg</td>
        <td><strong>${formatNumber(totalVolume)} kg</strong></td>
        <td>
          <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;">
            ${ageBadge}
            <span style="font-size:11px;color:var(--text-muted);">${p.batchNumber}</span>
          </div>
        </td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
}