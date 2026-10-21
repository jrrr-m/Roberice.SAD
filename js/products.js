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

  const inputIdsToValidate = [
    'prodName', 'prodRiceType', 'prodCategory',
    'prodPriceSack', 'prodPrice25kg', 'prodPriceKg',
    'prodPrice20kg', 'prodPrice10kg', 'prodPrice5kg',
    'prodThresholdKg', 'prodInitialSacks', 'prodInitial25kg',
    'prodInitialKg', 'prodInitial20kg', 'prodInitial10kg', 'prodInitial5kg'
  ];

  inputIdsToValidate.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', validateProductFormLive);
  });
});

function showProductFormAlert(message) {
  const alertEl = document.getElementById('productFormAlert') || document.getElementById('productDuplicateAlert');
  if (!alertEl) return;
  const msgEl = document.getElementById('productFormAlertMsg');
  const cleanMsg = message.replace(/^⚠️\s*/, '');
  if (msgEl) {
    msgEl.textContent = '⚠️ ' + cleanMsg;
  } else {
    alertEl.textContent = '⚠️ ' + cleanMsg;
  }
  alertEl.style.display = 'block';
}

function hideProductFormAlert() {
  const alertEl = document.getElementById('productFormAlert') || document.getElementById('productDuplicateAlert');
  if (alertEl) alertEl.style.display = 'none';
}

function validateProductFormLive() {
  const nameInput = document.getElementById('prodName');
  const riceTypeInput = document.getElementById('prodRiceType');
  const categoryInput = document.getElementById('prodCategory');
  const priceSackInput = document.getElementById('prodPriceSack');
  const price25kgInput = document.getElementById('prodPrice25kg');
  const priceKgInput = document.getElementById('prodPriceKg');
  const price20kgInput = document.getElementById('prodPrice20kg');
  const price10kgInput = document.getElementById('prodPrice10kg');
  const price5kgInput = document.getElementById('prodPrice5kg');
  const thresholdInput = document.getElementById('prodThresholdKg');
  const editId = document.getElementById('prodEditId') ? document.getElementById('prodEditId').value.trim() : '';

  // 1. Check for Duplicate
  const name = nameInput ? nameInput.value.trim() : '';

  if (name) {
    const isDuplicate = productsCache.some(p => {
      if (editId && String(p.id) === String(editId)) return false;
      const pName = (p.name || '').trim().toLowerCase();
      return pName === name.toLowerCase();
    });

    if (isDuplicate) {
      showProductFormAlert('A product with this name already exists.');
      if (nameInput) nameInput.style.borderColor = '#dc2626';
      return false;
    }
  }

  if (nameInput) nameInput.style.borderColor = '';

  // 2. Validate values must be greater than zero
  if (priceSackInput && priceSackInput.value !== '') {
    const val = parseFloat(priceSackInput.value);
    if (isNaN(val) || val <= 0) {
      priceSackInput.style.borderColor = '#dc2626';
      showProductFormAlert('Value must be greater than zero.');
      return false;
    } else {
      priceSackInput.style.borderColor = '';
    }
  }

  if (priceKgInput && priceKgInput.value !== '') {
    const val = parseFloat(priceKgInput.value);
    if (isNaN(val) || val <= 0) {
      priceKgInput.style.borderColor = '#dc2626';
      showProductFormAlert('Value must be greater than zero.');
      return false;
    } else {
      priceKgInput.style.borderColor = '';
    }
  }

  if (thresholdInput && thresholdInput.value !== '') {
    const val = parseFloat(thresholdInput.value);
    if (isNaN(val) || val <= 0) {
      thresholdInput.style.borderColor = '#dc2626';
      showProductFormAlert('Value must be greater than zero.');
      return false;
    } else {
      thresholdInput.style.borderColor = '';
    }
  }

  const packInputs = [price25kgInput, price20kgInput, price10kgInput, price5kgInput];
  for (const pack of packInputs) {
    if (pack && pack.value !== '') {
      const val = parseFloat(pack.value);
      if (isNaN(val) || val <= 0) {
        pack.style.borderColor = '#dc2626';
        showProductFormAlert('Value must be greater than zero.');
        return false;
      } else {
        pack.style.borderColor = '';
      }
    }
  }

  if (priceSackInput && price25kgInput && priceSackInput.value !== '' && price25kgInput.value !== '') {
    const sVal = parseFloat(priceSackInput.value);
    const hVal = parseFloat(price25kgInput.value);
    if (!isNaN(sVal) && !isNaN(hVal) && sVal <= hVal) {
      priceSackInput.style.borderColor = '#dc2626';
      price25kgInput.style.borderColor = '#dc2626';
      showProductFormAlert('Whole sack price must be greater than half sack price.');
      return false;
    }
  }

  const stockInputIds = ['prodInitialSacks', 'prodInitial25kg', 'prodInitialKg', 'prodInitial20kg', 'prodInitial10kg', 'prodInitial5kg'];
  for (const id of stockInputIds) {
    const el = document.getElementById(id);
    if (el && el.value !== '') {
      const val = parseFloat(el.value);
      if (isNaN(val) || val < 0) {
        el.style.borderColor = '#dc2626';
        showProductFormAlert('Value must be greater than zero.');
        return false;
      } else {
        el.style.borderColor = '';
      }
    }
  }

  hideProductFormAlert();
  return true;
}

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
      const totalVolume = (p.stockSacks * p.kgPerSack) + (p.packaged25kg * 25) + (p.packaged20kg * 20) + (p.packaged10kg * 10) + (p.packaged5kg * 5) + p.stockKg;
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
              <span class="pack-chip">25k: <strong>${p.packaged25kg}</strong></span>
              <span class="pack-chip">20k: <strong>${p.packaged20kg}</strong></span>
              <span class="pack-chip">10k: <strong>${p.packaged10kg}</strong></span>
              <span class="pack-chip">5k: <strong>${p.packaged5kg}</strong></span>
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
  document.getElementById('prodPrice25kg').value = '';
  document.getElementById('prodPriceKg').value = '';
  document.getElementById('prodPrice5kg').value = '';
  document.getElementById('prodPrice10kg').value = '';
  document.getElementById('prodPrice20kg').value = '';
  document.getElementById('prodKgPerSack').value = '50';
  document.getElementById('prodThresholdKg').value = '200';
  document.getElementById('initialStockRow').style.display = 'block';
  document.getElementById('prodInitialSacks').value = '10';
  document.getElementById('prodInitial25kg').value = '0';
  document.getElementById('prodInitialKg').value = '0';
  document.getElementById('prodInitial5kg').value = '5';
  document.getElementById('prodInitial10kg').value = '3';
  document.getElementById('prodInitial20kg').value = '1';

  hideProductFormAlert();
  document.querySelectorAll('#modalProductForm input').forEach(inp => inp.style.borderColor = '');

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

  hideProductFormAlert();
  document.querySelectorAll('#modalProductForm input').forEach(inp => inp.style.borderColor = '');

  openModal('modalProductForm');
}

async function handleProductSubmit(e) {
  e.preventDefault();

  const editId = document.getElementById('prodEditId').value;
  const name = document.getElementById('prodName').value.trim();
  const origin = document.getElementById('prodOrigin').value;
  const riceType = document.getElementById('prodRiceType').value.trim();
  const category = document.getElementById('prodCategory').value.trim();
  const priceSackInput = document.getElementById('prodPriceSack');
  const priceKgInput = document.getElementById('prodPriceKg');
  const thresholdKgInput = document.getElementById('prodThresholdKg');

  // 1. Missing required fields check
  const requiredFields = [
    { el: document.getElementById('prodName'), val: name, label: 'Rice Variety Name' },
    { el: document.getElementById('prodRiceType'), val: riceType, label: 'Specific Rice Type' },
    { el: document.getElementById('prodCategory'), val: category, label: 'Category Classification' },
    { el: priceSackInput, val: priceSackInput ? priceSackInput.value.trim() : '', label: 'Whole Sack Price' },
    { el: priceKgInput, val: priceKgInput ? priceKgInput.value.trim() : '', label: 'Price per Kg' },
    { el: thresholdKgInput, val: thresholdKgInput ? thresholdKgInput.value.trim() : '', label: 'Low-Stock Alert Threshold' }
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
    showProductFormAlert(errorMsg);
    if (firstMissingEl) firstMissingEl.focus();
    return;
  }

  const priceSack = parseFloat(priceSackInput.value);
  const price25kg = parseFloat(document.getElementById('prodPrice25kg').value) || (priceSack / 2);
  const priceKg = parseFloat(priceKgInput.value);
  const price5kg = parseFloat(document.getElementById('prodPrice5kg').value) || (priceKg * 5);
  const price10kg = parseFloat(document.getElementById('prodPrice10kg').value) || (priceKg * 10);
  const price20kg = parseFloat(document.getElementById('prodPrice20kg').value) || (priceKg * 20);
  const kgPerSack = 50;
  const thresholdKg = parseFloat(thresholdKgInput.value) || 200;

  // 2. Data duplication check: Ensure same product name does not already exist
  const isDuplicate = productsCache.some(p => {
    if (editId && String(p.id) === String(editId)) return false;
    const pName = (p.name || '').trim().toLowerCase();
    return pName === name.toLowerCase();
  });

  if (isDuplicate) {
    showToast('A product with this name already exists.', 'warning');
    showProductFormAlert('A product with this name already exists.');
    const nameInput = document.getElementById('prodName');
    if (nameInput) {
      nameInput.focus();
      nameInput.style.borderColor = '#dc2626';
    }
    return;
  }

  // 3. Values must be greater than zero validation
  if (priceSack <= 0) {
    showToast('Value must be greater than zero.', 'warning');
    showProductFormAlert('Value must be greater than zero.');
    const el = document.getElementById('prodPriceSack');
    if (el) { el.focus(); el.style.borderColor = '#dc2626'; }
    return;
  }

  if (priceKg <= 0) {
    showToast('Value must be greater than zero.', 'warning');
    showProductFormAlert('Value must be greater than zero.');
    const el = document.getElementById('prodPriceKg');
    if (el) { el.focus(); el.style.borderColor = '#dc2626'; }
    return;
  }

  if (thresholdKg <= 0) {
    showToast('Value must be greater than zero.', 'warning');
    showProductFormAlert('Value must be greater than zero.');
    const el = document.getElementById('prodThresholdKg');
    if (el) { el.focus(); el.style.borderColor = '#dc2626'; }
    return;
  }

  if (price25kg <= 0 || price5kg <= 0 || price10kg <= 0 || price20kg <= 0) {
    showToast('Value must be greater than zero.', 'warning');
    showProductFormAlert('Value must be greater than zero.');
    return;
  }

  if (priceSack <= price25kg) {
    showToast('Whole sack price must be greater than half sack price.', 'warning');
    showProductFormAlert('Whole sack price must be greater than half sack price.');
    const el = document.getElementById('prodPriceSack');
    if (el) el.style.borderColor = '#dc2626';
    const el2 = document.getElementById('prodPrice25kg');
    if (el2) el2.style.borderColor = '#dc2626';
    return;
  }

  // 4. Initial stock quantities must be greater than or equal to 0 (for new product)
  if (!editId) {
    const initialSacks = parseInt(document.getElementById('prodInitialSacks').value) || 0;
    const packaged25kg = parseInt(document.getElementById('prodInitial25kg').value) || 0;
    const initialKg = parseFloat(document.getElementById('prodInitialKg').value) || 0;
    const packaged5kg = parseInt(document.getElementById('prodInitial5kg').value) || 0;
    const packaged10kg = parseInt(document.getElementById('prodInitial10kg').value) || 0;
    const packaged20kg = parseInt(document.getElementById('prodInitial20kg').value) || 0;

    if (initialSacks < 0 || packaged25kg < 0 || initialKg < 0 || packaged5kg < 0 || packaged10kg < 0 || packaged20kg < 0) {
      showToast('Value must be greater than zero.', 'warning');
      showProductFormAlert('Value must be greater than zero.');
      return;
    }
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
      showProductFormAlert(result.message || 'Something went wrong.');
    }
  } catch (error) {
    console.error(error);
    showToast('Unable to save product.', 'warning');
  }
}

async function deleteProduct(productId) {
  const p = productsCache.find(product => product.id === productId);
  if (!p) return;

  const totalVolume = (p.stockSacks * 50) + (p.packaged25kg * 25) + (p.packaged20kg * 20) + (p.packaged10kg * 10) + (p.packaged5kg * 5) + p.stockKg;
  let confirmMsg = `Are you sure you want to deactivate "${p.name}"?`;
  if (totalVolume > 0) {
    confirmMsg = `⚠️ Attention: "${p.name}" still has ${formatNumber(totalVolume)} kg in physical warehouse stock (${p.stockSacks} sacks, ${formatNumber(p.stockKg)} kg loose).\n\nDeactivating this variety will remove it from the active POS register and inventory views.\n\nAre you sure you want to proceed?`;
  }

  if (!confirm(confirmMsg)) return;

  const user = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};

  try {
    const response = await fetch('api/delete_product.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        productId,
        user: user.name || user.username || 'Admin User'
      })
    });

    const result = await response.json();

    if (result.success) {
      showToast(result.message || `Deactivated product "${p.name}".`, 'info');
      renderProductsTable();
    } else {
      showToast(result.message || 'Unable to delete product.', 'warning');
    }
  } catch (error) {
    console.error(error);
    showToast('Unable to delete product.', 'warning');
  }
}