/**
 * Roberice POS & Inventory System - General Helper Utilities
 */

// Format numbers into Philippine Peso currency format: ₱1,250.00
function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return '₱' + num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Format raw number with comma separators (e.g. 1,250 or 1,250.50)
function formatNumber(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const num = parseFloat(val) || 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : Math.min(decimals, 2),
    maximumFractionDigits: 2
  });
}

// Format short date (YYYY-MM-DD -> Sep 28, 2026)
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Format Sack & Kg stock into clean readable text: "15 Sacks + 20 Kg" (Total: 770 Kg)
function formatStock(sacks, kg, kgPerSack = 50) {
  const s = parseInt(sacks) || 0;
  const k = parseFloat(kg) || 0;
  const totalKg = (s * kgPerSack) + k;

  let text = '';
  if (s > 0 && k > 0) {
    text = `${s} Sack${s > 1 ? 's' : ''} + ${k} Kg`;
  } else if (s > 0) {
    text = `${s} Sack${s > 1 ? 's' : ''}`;
  } else if (k > 0) {
    text = `${k} Kg`;
  } else {
    text = 'Out of Stock';
  }

  return {
    display: text,
    totalKg: totalKg
  };
}

// Format ISO or date strings into readable format: "Sep 01, 2026 11:05 AM"
function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Low Stock calculation rule
function isLowStock(product) {
  if (!product) return false;

  const status = String(product.status || 'active').toLowerCase();

  if (status === 'inactive' || status === 'deleted') {
    return false;
  }

  const stockSacks = Number(product.stockSacks) || 0;
  const stockKg = Number(product.stockKg) || 0;
  const kgPerSack = Number(product.kgPerSack) || 0;
  const thresholdKg = Number(product.thresholdKg) || 0;

  const totalKg = (stockSacks * kgPerSack) + stockKg;

  return totalKg <= thresholdKg;
}

// Toast notification UI display
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
  } else if (type === 'danger') {
    iconSvg = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
  } else {
    iconSvg = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <div style="flex: 1;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Modal Toggle Handlers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

/* ==========================================================================
   Global Branded Loading Screen & Database Sync Controller
   ========================================================================== */

let globalLoaderTimeout = null;
let activeDatabaseRequests = 0;

function initGlobalLoader() {
  if (document.getElementById('robericeGlobalLoader')) return;

  // Insert Full Overlay
  const loaderEl = document.createElement('div');
  loaderEl.id = 'robericeGlobalLoader';
  loaderEl.className = 'global-loader-overlay active'; // Active by default on page entry
  loaderEl.innerHTML = `
    <div class="loader-content-card">
      <div class="loader-spinner-wrapper">
        <div class="loader-ring-outer"></div>
        <div class="loader-ring-inner"></div>
        <div class="loader-logo-center">
          <img src="assets/roberice-logo.png" alt="Roberice Logo" onerror="this.style.display='none';this.parentElement.innerText='🌾';">
        </div>
      </div>
      <div class="loader-brand-title">Roberice Store</div>
      <div class="loader-status-pill">
        <span class="loader-status-dot"></span>
        <span id="robericeLoaderMessage" class="loader-status-text">Connecting to database...</span>
      </div>
      <div class="loader-bar-track">
        <div class="loader-bar-indicator"></div>
      </div>
    </div>
  `;

  // Insert Top Minimal Progress Bar for background syncs
  const topLoader = document.createElement('div');
  topLoader.id = 'robericeTopBarLoader';
  topLoader.className = 'top-bar-loader';
  topLoader.innerHTML = '<div class="top-bar-loader-inner"></div>';

  const appendLoaders = () => {
    if (!document.getElementById('robericeGlobalLoader')) {
      document.body.appendChild(loaderEl);
    }
    if (!document.getElementById('robericeTopBarLoader')) {
      document.body.appendChild(topLoader);
    }
  };

  if (document.body) {
    appendLoaders();
  } else {
    document.addEventListener('DOMContentLoaded', appendLoaders);
  }
}

// Show Page Loader with customizable status message
function showPageLoader(message = 'Connecting to database...') {
  initGlobalLoader();
  const loader = document.getElementById('robericeGlobalLoader');
  const msgEl = document.getElementById('robericeLoaderMessage');

  if (msgEl) {
    msgEl.textContent = message;
  }

  if (loader) {
    loader.classList.add('active');
  }

  // Safety timer fallback: Never trap user for more than 5.5s
  clearTimeout(globalLoaderTimeout);
  globalLoaderTimeout = setTimeout(() => {
    hidePageLoader();
  }, 5500);
}

// Hide Page Loader with smooth transition
function hidePageLoader() {
  const loader = document.getElementById('robericeGlobalLoader');
  if (loader && loader.classList.contains('active')) {
    loader.classList.remove('active');
  }
  clearTimeout(globalLoaderTimeout);
}

// Minimal Top Bar Loader functions
function showTopLoader() {
  const topBar = document.getElementById('robericeTopBarLoader');
  if (topBar) topBar.classList.add('active');
}

function hideTopLoader() {
  const topBar = document.getElementById('robericeTopBarLoader');
  if (topBar) topBar.classList.remove('active');
}

// Initialize loader as early as possible
initGlobalLoader();

// Automatically dismiss the initial page loader once DOM and initial resources load
window.addEventListener('load', () => {
  setTimeout(() => {
    if (activeDatabaseRequests <= 0) {
      hidePageLoader();
    }
  }, 250);
});

// Fallback safety for faster DOM transitions
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (activeDatabaseRequests <= 0) {
      hidePageLoader();
    }
  }, 1000);
});

// Global fetch wrapper: Automatically display loader during database operations
const _originalFetch = window.fetch ? window.fetch.bind(window) : null;
window.fetch = async function(...args) {
  const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
  const isApi = url.includes('api/');
  const isMutation = args[1] && ['POST', 'PUT', 'DELETE'].includes(args[1].method);

  if (isApi) {
    activeDatabaseRequests++;
    if (isMutation) {
      showPageLoader('Updating database records...');
    } else {
      showTopLoader();
    }
  }

  try {
    return await _originalFetch(...args);
  } finally {
    if (isApi) {
      activeDatabaseRequests = Math.max(0, activeDatabaseRequests - 1);
      if (activeDatabaseRequests === 0) {
        hideTopLoader();
        setTimeout(() => {
          if (activeDatabaseRequests === 0) {
            hidePageLoader();
          }
        }, 150);
      }
    }
  }
};
