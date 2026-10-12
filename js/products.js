/**
 * Roberice POS & Inventory System - Products & Pricing Script
 */

let productsCache = [];

document.addEventListener('DOMContentLoaded', () => {
  renderProductsTable();
  const btn = document.getElementById('btnOpenAddProduct');
  if (btn) {
    btn.addEventListener('click', openAddProductModal);
  } else {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btnOpenAddProduct')) {
        openAddProductModal();
      }
    });
  }
  document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
});

async function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  try {
    const response = await fetch('api/get_products.php');
    if (!response.ok) throw new Error('Failed to retrieve products.');

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
      status: p.product_status
    }));

    if (productsCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" class="empty-state">No rice varieties configured yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = productsCache.map(p => {
      const totalVolume = (p.stockSacks * p.kgPerSack) + p.stockKg + (p.packaged5kg * 5) + (p.packaged10kg * 10) + (p.packaged20kg * 20);
      const isOut = totalVolume <= 0;
      const lowStock = !isOut && totalVolume <= p.thresholdKg;

      const originBadge = p.origin === 'Imported'
        ? `<span class="badge badge-imported">Imported</span>`
        : `<span class="badge badge-local">Local</span>`;

      return `
        <tr>
          <td>
            <strong>${p.name}</strong>
            <div style="font-size:11px;color:var(--text-muted);">${p.category}</div>
          </td>
          <td>${originBadge}</td>
          <td><span style="font-weight:600;font-size:12px;">${p.riceType}</span></td>
          <td><strong>${formatCurrency(p.priceSack)}</strong></td>
          <td><strong>${formatCurrency(p.priceKg)}</strong></td>
          <td>${formatCurrency(p.price5kg)}</td>
          <td>${formatCurrency(p.price10kg)}</td>
          <td>${formatCurrency(p.price20kg)}</td>
          <td>
            <div><strong>${p.stockSacks} sacks</strong>, ${p.stockKg} kg</div>
            <div class="pack-chips-group" style="margin-top:2px;">
              <span class="pack-chip">5k: <strong>${p.packaged5kg}</strong></span>
              <span class="pack-chip">10k: <strong>${p.packaged10kg}</strong></span>
              <span class="pack-chip">20k: <strong>${p.packaged20kg}</strong></span>
            </div>
          </td>
          <td>${p.thresholdKg} kg</td>
          <td>
            <span class="badge ${isOut ? 'badge-danger' : (lowStock ? 'badge-warning' : 'badge-success')}">
              ${isOut ? 'Out of Stock' : (lowStock ? 'Low Stock' : 'Active')}
            </span>
          </td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="openEditProductModal('${p.id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading products:', error);
    tbody.innerHTML = `<tr><td colspan="12" class="empty-state">Failed to load products.</td></tr>`;
  }
}

function openAddProductModal() {
  document.getElementById('productModalTitle').textContent = 'Add New Rice Variety';
  document.getElementById('prodEditId').value = '';
  document.getElementById('prodName').value = '';
  document.getElementById('prodOrigin').value = 'Local';
  document.getElementById('prodRiceType').value = '';
  document.getElementById('prodCategory').value = 'Regular Milled';
  document.getElementById('prodPriceSack').value = '';
  document.getElementById('prodPriceKg').value = '';
  document.getElementById('prodPrice5kg').value = '';
  document.getElementById('prodPrice10kg').value = '';
  document.getElementById('prodPrice20kg').value = '';
  document.getElementById('prodKgPerSack').value = '50';
  document.getElementById('prodThresholdKg').value = '200';
  document.getElementById('initialStockRow').style.display = 'block';
  document.getElementById('prodInitialSacks').value = '10';
  document.getElementById('prodInitialKg').value = '0';
  document.getElementById('prodInitial5kg').value = '5';
  document.getElementById('prodInitial10kg').value = '3';
  document.getElementById('prodInitial20kg').value = '1';
  openModal('modalProductForm');
}

function openEditProductModal(productId) {
  const p = productsCache.find(product => product.id === productId);
  if (!p) return;

  document.getElementById('productModalTitle').textContent = 'Edit Rice Variety';
  document.getElementById('prodEditId').value = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodOrigin').value = p.origin;
  document.getElementById('prodRiceType').value = p.riceType;
  document.getElementById('prodCategory').value = p.category;
  document.getElementById('prodPriceSack').value = p.priceSack;
  document.getElementById('prodPrice25kg').value = p.price25kg || (p.priceSack ? p.priceSack / 2 : '');
  document.getElementById('prodPriceKg').value = p.priceKg;
  document.getElementById('prodPrice5kg').value = p.price5kg;
  document.getElementById('prodPrice10kg').value = p.price10kg;
  document.getElementById('prodPrice20kg').value = p.price20kg;
  document.getElementById('prodKgPerSack').value = 50;
  document.getElementById('prodThresholdKg').value = p.thresholdKg;
  document.getElementById('initialStockRow').style.display = 'none';

  openModal('modalProductForm');
}

async function handleProductSubmit(e) {
  e.preventDefault();

  const editId = document.getElementById('prodEditId').value;
  const name = document.getElementById('prodName').value.trim();
  const origin = document.getElementById('prodOrigin').value;
  const riceType = document.getElementById('prodRiceType').value.trim();
  const category = document.getElementById('prodCategory').value.trim();
  const priceSack = parseFloat(document.getElementById('prodPriceSack').value);
  const price25kg = parseFloat(document.getElementById('prodPrice25kg').value) || (priceSack / 2);
  const priceKg = parseFloat(document.getElementById('prodPriceKg').value);
  const price5kg = parseFloat(document.getElementById('prodPrice5kg').value) || (priceKg * 5);
  const price10kg = parseFloat(document.getElementById('prodPrice10kg').value) || (priceKg * 10);
  const price20kg = parseFloat(document.getElementById('prodPrice20kg').value) || (priceKg * 20);
  const kgPerSack = 50;
  const thresholdKg = parseFloat(document.getElementById('prodThresholdKg').value) || 200;

  if (!name || !category || isNaN(priceSack) || isNaN(priceKg)) {
    showToast('Please complete all required fields.', 'warning');
    return;
  }

  if (priceSack < 0 || priceKg < 0) {
    showToast('Prices cannot be negative values.', 'warning');
    return;
  }

  try {
    let url;
    let body;

    if (editId) {
      url = 'api/update_product.php';
      body = {
        productId: editId,
        name,
        origin,
        riceType,
        category,
        priceSack,
        price25kg,
        priceKg,
        price5kg,
        price10kg,
        price20kg,
        kgPerSack: 50,
        thresholdKg
      };
    } else {
      url = 'api/add_product.php';

      const initialSacks = parseInt(document.getElementById('prodInitialSacks').value) || 0;
      const packaged25kg = parseInt(document.getElementById('prodInitial25kg').value) || 0;
      const initialKg = parseFloat(document.getElementById('prodInitialKg').value) || 0;
      const packaged5kg = parseInt(document.getElementById('prodInitial5kg').value) || 0;
      const packaged10kg = parseInt(document.getElementById('prodInitial10kg').value) || 0;
      const packaged20kg = parseInt(document.getElementById('prodInitial20kg').value) || 0;

      body = {
        name,
        origin,
        riceType,
        category,
        priceSack,
        price25kg,
        priceKg,
        price5kg,
        price10kg,
        price20kg,
        kgPerSack: 50,
        thresholdKg,
        initialSacks,
        packaged25kg,
        initialKg,
        packaged5kg,
        packaged10kg,
        packaged20kg
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (result.success) {
      showToast(
        editId
          ? `Product "${name}" updated successfully.`
          : `New product "${name}" created successfully.`,
        'success'
      );

      closeModal('modalProductForm');
      renderProductsTable();
    } else {
      showToast(result.message || 'Something went wrong.', 'warning');
    }
  } catch (error) {
    console.error(error);
    showToast('Unable to save product.', 'warning');
  }
}

async function deleteProduct(productId) {
  const p = productsCache.find(product => product.id === productId);
  if (!p) return;

  if (!confirm(`Are you sure you want to delete "${p.name}"?`)) return;

  try {
    const response = await fetch('api/delete_product.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    });

    const result = await response.json();

    if (result.success) {
      showToast(`Deleted product "${p.name}".`, 'info');
      renderProductsTable();
    } else {
      showToast(result.message || 'Unable to delete product.', 'warning');
    }
  } catch (error) {
    console.error(error);
    showToast('Unable to delete product.', 'warning');
  }
}