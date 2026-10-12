/**
 * Roberice POS & Inventory System - Authentication & Access Control Module
 */

// Nav Items Definition with role permissions (Optimized store operation workflow)
const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    url: 'dashboard.html',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>`,
    roles: ['admin']
  },
  {
    id: 'pos',
    label: 'Point of Sale',
    url: 'pos.html',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`,
    roles: ['admin', 'cashier']
  },
  {
    id: 'view-inventory',
    label: 'View Inventory',
    url: 'view-inventory.html',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>`,
    roles: ['admin', 'cashier']
  },
  {
    id: 'inventory',
    label: 'Manage Inventory',
    url: 'inventory.html',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>`,
    roles: ['admin']
  },
  {
    id: 'products',
    label: 'Products & Pricing',
    url: 'products.html',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 11h.01M7 15h.01M11 7h8M11 11h8M11 15h8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>`,
    roles: ['admin']
  },
  {
    id: 'transactions',
    label: 'Transaction History',
    url: 'transactions.html',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    roles: ['admin', 'cashier']
  },
  {
    id: 'sales-report',
    label: 'Sales Report',
    url: 'sales-report.html',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`,
    roles: ['admin', 'cashier']
  },
  {
    id: 'file-manager',
    label: 'File Management',
    url: 'file-manager.html',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>`,
    roles: ['admin']
  },
  {
    id: 'audit',
    label: 'Audit History',
    url: 'audit.html',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>`,
    roles: ['admin']
  },
  {
    id: 'users',
    label: 'User Management',
    url: 'users.html',
    icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`,
    roles: ['admin']
  }
];

// Check if user has permission to view a nav item or module
function hasPermission(user, item) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  if (role === 'admin') return true;
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.includes(item.id);
  }
  return item.roles && item.roles.map(r => r.toLowerCase()).includes(role);
}

// Verify Authentication & Role Access Control
function checkAuth() {
  const isLoginPage = window.location.pathname.endsWith('login.html');
  const userJson = sessionStorage.getItem('roberice_logged_user');
  
  if (!userJson) {
    if (!isLoginPage) {
      window.location.href = 'login.html';
    }
    return null;
  }

  const user = JSON.parse(userJson);

  if (isLoginPage) {
    // If logged in and on login page, redirect to appropriate home
    if (user.role === 'admin') {
      window.location.href = 'dashboard.html';
    } else {
      const firstAllowed = NAV_ITEMS.find(item => hasPermission(user, item));
      window.location.href = firstAllowed ? firstAllowed.url : 'pos.html';
    }
    return user;
  }

  // Check page permission
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navItem = NAV_ITEMS.find(item => item.url === currentPage);

  if (navItem && !hasPermission(user, navItem)) {
    // Unauthorized access attempt
    showToast('Access Restricted: You do not have permission to view that page.', 'danger');
    const firstAllowed = NAV_ITEMS.find(item => hasPermission(user, item));
    window.location.href = firstAllowed ? firstAllowed.url : 'login.html';
    return null;
  }

  return user;
}

// Render dynamic Layout Frame (Sidebar + Top Header)
function renderAppFrame(user) {
  if (!user) return;

  const appContainer = document.querySelector('.app-container');
  if (!appContainer) return;

  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  const userName = user.full_name || user.name || user.username || (user.role === 'admin' ? 'Admin User' : 'Cashier');

  // Build Sidebar HTML
  const sidebarNavHtml = NAV_ITEMS
    .filter(item => hasPermission(user, item))
    .map(item => {
      const isActive = currentPage === item.url ? 'active' : '';
      return `
        <a href="${item.url}" class="nav-item ${isActive}">
          ${item.icon}
          <span>${item.label}</span>
        </a>
      `;
    }).join('');

  const sidebarHtml = `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand-icon brand-logo"><img src="../assets/roberice-logo.png" alt="RBR Rice Retailing logo"></div>
        <div class="brand-info">
          <h1>Roberice POS</h1>
          <span>Sales & Inventory System</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${sidebarNavHtml}
      </nav>
      <div class="sidebar-user-section">
        <div class="sidebar-user-card">
          <div class="profile-details">
            <div class="user-name">${userName}</div>
            <div class="user-role">${user.role === 'admin' ? 'Admin (Full Access)' : 'Cashier (Restricted)'}</div>
          </div>
          <button class="btn-logout" id="btnLogout" title="Logout">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Logout
          </button>
        </div>
      </div>
      <div class="sidebar-footer">
        &copy; 2026 Roberice System v1.0
      </div>
    </aside>
  `;

  // Dynamic Page Header & Subtitle Mapping
  const PAGE_HEADER_MAP = {
    'dashboard.html': {
      title: 'Dashboard',
      subtitle: `Welcome back, ${userName}! Here's your store overview.`,
      subtitleId: 'welcomeSubtitle'
    },
    'pos.html': {
      title: 'Point of Sale (POS)',
      subtitle: 'Process customer rice transactions and automatically update inventory stock.'
    },
    'view-inventory.html': {
      title: 'Available Inventory',
      subtitle: 'Current stock levels of all rice varieties in sacks and kilograms.'
    },
    'inventory.html': {
      title: 'Manage Inventory',
      subtitle: 'Admin control panel for restocking, physical count corrections, and damage reporting.'
    },
    'products.html': {
      title: 'Products & Pricing',
      subtitle: 'Manage rice catalog, base sack pricing, and per-kg retail rates.',
      actionsHtml: `
        <button class="btn btn-primary" id="btnOpenAddProduct" style="font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Add New Rice Variety
        </button>
      `
    },
    'transactions.html': {
      title: 'Transaction History',
      subtitle: 'View sales records and customer transaction details.',
      subtitleId: 'txnPageSubtitle'
    },
    'sales-report.html': {
      title: 'Sales Report & Analytics',
      subtitle: 'Comprehensive store revenue reports, variety sales volume, and print-ready statements.',
      actionsHtml: `
        <button class="btn btn-secondary" id="btnExportCSV" style="display: inline-flex; align-items: center; gap: 6px;">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Export CSV
        </button>
        <button class="btn btn-primary" id="btnOpenPrintReport" style="display: inline-flex; align-items: center; gap: 6px;">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          Print Sales Report
        </button>
      `
    },
    'file-manager.html': {
      title: 'File & Document Management',
      subtitle: 'Organize store receipts, supplier delivery invoices, audit records, and backup files.',
      actionsHtml: `
        <button class="btn btn-secondary" id="btnQuickBackup" style="display: inline-flex; align-items: center; gap: 6px;">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
          One-Click Database Backup
        </button>
        <button class="btn btn-primary" id="btnOpenUploadModal" style="display: inline-flex; align-items: center; gap: 6px;">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          Upload New Document
        </button>
      `
    },
    'audit.html': {
      title: 'Audit History & System Trail',
      subtitle: 'Chronological audit log tracking warehouse adjustments, sack openings, and batch depletions.',
      actionsHtml: `
        <button class="btn btn-secondary" id="btnExportAuditCsv" style="display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Export CSV
        </button>
        <button class="btn btn-primary" id="btnRefreshAudit" style="display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Refresh Log
        </button>
      `
    },
    'users.html': {
      title: 'User Management & Permissions',
      subtitle: 'Add system users, assign roles, and configure granular module permissions.'
    }
  };

  const pageInfo = PAGE_HEADER_MAP[currentPage] || {
    title: 'Roberice POS',
    subtitle: `Welcome back, ${userName}!`
  };

  const subtitleIdAttr = pageInfo.subtitleId ? `id="${pageInfo.subtitleId}"` : '';

  // Build Top Header HTML
  const headerHtml = `
    <header class="top-header">
      <div class="header-title-area">
        <h2 class="top-nav-title">${pageInfo.title}</h2>
        <p class="top-nav-subtitle" ${subtitleIdAttr}>${pageInfo.subtitle}</p>
      </div>
      <div class="header-actions" id="headerActions">
        ${pageInfo.actionsHtml || ''}
      </div>
    </header>
  `;

  // Inject Sidebar
  const existingSidebar = document.querySelector('.sidebar');
  if (!existingSidebar) {
    appContainer.insertAdjacentHTML('afterbegin', sidebarHtml);
  }

  // Inject Top Header
  const mainWrapper = document.querySelector('.main-wrapper');
  if (mainWrapper && !document.querySelector('.top-header')) {
    mainWrapper.insertAdjacentHTML('afterbegin', headerHtml);
  }

  // Bind Logout Event
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }
}

// User Logout Handler
function logout() {
  const user = JSON.parse(sessionStorage.getItem('roberice_logged_user'));
  if (user && typeof addAuditLog === 'function') {
    addAuditLog('User Logout', `${user.name || user.username} logged out.`);
  }
  sessionStorage.removeItem('roberice_logged_user');
  window.location.href = 'login.html';
}

// Execute checkAuth and render on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth();
  if (user && !window.location.pathname.endsWith('login.html')) {
    renderAppFrame(user);
  }
});
