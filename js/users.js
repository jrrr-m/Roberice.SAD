/**
 * Roberice POS & Inventory System - User Management & Access Control Controller
 */

let allUsers = [];
let allRequests = [];
let customRoles = [];
let currentTab = 'users';
let pendingAdminAction = null;

const MODULE_DEFINITIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'pos', label: 'POS', icon: '🛒' },
  { id: 'view-inventory', label: 'View Inventory', icon: '📦' },
  { id: 'inventory', label: 'Manage Inventory', icon: '🏷️' },
  { id: 'products', label: 'Products', icon: '🌾' },
  { id: 'transactions', label: 'Transactions', icon: '🧾' },
  { id: 'sales-report', label: 'Sales Report', icon: '📈' },
  { id: 'file-manager', label: 'Files', icon: '📁' },
  { id: 'audit', label: 'Audit', icon: '📋' },
  { id: 'users', label: 'Users', icon: '👥' }
];

const PRESETS = {
  admin: ['dashboard', 'pos', 'view-inventory', 'inventory', 'products', 'transactions', 'sales-report', 'file-manager', 'audit', 'users'],
  cashier: ['pos', 'view-inventory', 'transactions', 'sales-report'],
  clerk: ['view-inventory', 'inventory', 'products'],
  manager: ['dashboard', 'pos', 'view-inventory', 'products', 'transactions', 'sales-report', 'file-manager', 'audit']
};

function getRolePermissions(roleName) {
  if (!roleName) return [];
  const normalized = roleName.trim().toLowerCase();
  // 1. Look up from database customRoles array
  const cr = customRoles.find(r => (r.role_name || '').trim().toLowerCase() === normalized);
  if (cr && Array.isArray(cr.default_permissions)) {
    return cr.default_permissions;
  }
  // 2. Fallback to PRESETS
  if (normalized === 'admin' || normalized === 'administrator') return PRESETS.admin;
  if (normalized === 'cashier') return PRESETS.cashier;
  if (normalized === 'inventory clerk' || normalized === 'clerk') return PRESETS.clerk;
  if (normalized === 'store manager' || normalized === 'manager') return PRESETS.manager;
  return [];
}

document.addEventListener('DOMContentLoaded', () => initUsers());

async function initUsers() {
  bindEventListeners();
  await Promise.all([loadUsers(), loadRequests()]);
}

function bindEventListeners() {
  // Modal Open for Add User
  const btnOpenAdd = document.getElementById('btnOpenAddUser');
  if (btnOpenAdd) {
    btnOpenAdd.addEventListener('click', openAddUserModal);
  }

  // Form Submit for Add/Edit User (Admin password authenticated)
  const formUser = document.getElementById('formUser');
  if (formUser) {
    formUser.addEventListener('submit', handleUserFormSubmit);
  }

  // Universal Quick Action Admin Authentication Form
  const formAdminAction = document.getElementById('formAdminActionAuth');
  if (formAdminAction) {
    formAdminAction.addEventListener('submit', handleAdminActionSubmit);
  }

  // Filter & Search for Users
  const searchInput = document.getElementById('searchUserInput');
  if (searchInput) {
    searchInput.addEventListener('input', filterUsers);
  }

  const roleFilter = document.getElementById('filterUserRole');
  if (roleFilter) {
    roleFilter.addEventListener('change', filterUsers);
  }

  const statusFilter = document.getElementById('filterUserStatus');
  if (statusFilter) {
    statusFilter.addEventListener('change', filterUsers);
  }

  // Filter & Search for Requests
  const searchReqInput = document.getElementById('searchReqInput');
  if (searchReqInput) {
    searchReqInput.addEventListener('input', filterRequests);
  }

  const statusReqFilter = document.getElementById('filterReqStatus');
  if (statusReqFilter) {
    statusReqFilter.addEventListener('change', filterRequests);
  }

  const btnRefreshRequests = document.getElementById('btnRefreshRequests');
  if (btnRefreshRequests) {
    btnRefreshRequests.addEventListener('click', () => loadRequests(true));
  }

  // Approval Form Submit (Admin Password Authenticated)
  const formApprove = document.getElementById('formApproveRequest');
  if (formApprove) {
    formApprove.addEventListener('submit', handleApproveSubmit);
  }

  // Rejection Form Submit (Admin Password Authenticated)
  const formReject = document.getElementById('formRejectRequest');
  if (formReject) {
    formReject.addEventListener('submit', handleRejectSubmit);
  }

  // Permission Presets
  document.getElementById('btnPresetAdmin')?.addEventListener('click', () => setPermissionCheckboxes(getRolePermissions('Admin')));
  document.getElementById('btnPresetCashier')?.addEventListener('click', () => setPermissionCheckboxes(getRolePermissions('Cashier')));
  document.getElementById('btnPresetClerk')?.addEventListener('click', () => setPermissionCheckboxes(getRolePermissions('Inventory Clerk')));
  document.getElementById('btnPresetManager')?.addEventListener('click', () => setPermissionCheckboxes(getRolePermissions('Store Manager')));
  document.getElementById('btnClearPerms')?.addEventListener('click', () => setPermissionCheckboxes([]));

  // Role select changes preset automatically and toggles custom role input
  const roleSelect = document.getElementById('roleSelect');
  if (roleSelect) {
    roleSelect.addEventListener('change', () => {
      const val = roleSelect.value;
      const customRoleCont = document.getElementById('customRoleInputContainer');
      const customRoleInput = document.getElementById('customRoleNameInput');

      if (val === '__custom__') {
        if (customRoleCont) customRoleCont.style.display = 'block';
        setTimeout(() => customRoleInput?.focus(), 100);
      } else {
        if (customRoleCont) customRoleCont.style.display = 'none';
        if (customRoleInput) customRoleInput.value = '';
        setPermissionCheckboxes(getRolePermissions(val));
      }
    });
  }

  // Approve modal role select toggle custom role input
  const approveRoleSelect = document.getElementById('approveRoleSelect');
  if (approveRoleSelect) {
    approveRoleSelect.addEventListener('change', () => {
      const val = approveRoleSelect.value;
      const approveCustomCont = document.getElementById('approveCustomRoleInputContainer');
      const approveCustomInput = document.getElementById('approveCustomRoleNameInput');

      if (val === '__custom__') {
        if (approveCustomCont) approveCustomCont.style.display = 'block';
        setTimeout(() => approveCustomInput?.focus(), 100);
      } else {
        if (approveCustomCont) approveCustomCont.style.display = 'none';
        if (approveCustomInput) approveCustomInput.value = '';
      }
    });
  }

  // Roles & Permissions Management Modal & Form
  const btnOpenRoles = document.getElementById('btnOpenManageRoles');
  if (btnOpenRoles) {
    btnOpenRoles.addEventListener('click', openManageRolesModal);
  }

  const formCreateRole = document.getElementById('formCreateCustomRole');
  if (formCreateRole) {
    formCreateRole.addEventListener('submit', handleCreateCustomRoleSubmit);
  }

  document.getElementById('btnRolePermsSelectAll')?.addEventListener('click', () => {
    document.querySelectorAll('input[name="newRolePerm"]').forEach(cb => cb.checked = true);
  });
  document.getElementById('btnRolePermsClear')?.addEventListener('click', () => {
    document.querySelectorAll('input[name="newRolePerm"]').forEach(cb => cb.checked = false);
  });

  // Edit Role Permissions Modal & Form
  const formEditRole = document.getElementById('formEditRolePermissions');
  if (formEditRole) {
    formEditRole.addEventListener('submit', handleEditRolePermsSubmit);
  }

  document.getElementById('btnEditRolePermsSelectAll')?.addEventListener('click', () => {
    document.querySelectorAll('input[name="editRolePerm"]').forEach(cb => cb.checked = true);
  });
  document.getElementById('btnEditRolePermsClear')?.addEventListener('click', () => {
    document.querySelectorAll('input[name="editRolePerm"]').forEach(cb => cb.checked = false);
  });
}

// -------------------------------------------------------------
// TAB SWITCHING: Users vs Account Creation Requests
// -------------------------------------------------------------
function switchUserTab(tab) {
  currentTab = tab;
  const tabUsersBtn = document.getElementById('tabUsersBtn');
  const tabRequestsBtn = document.getElementById('tabRequestsBtn');
  const panelUsers = document.getElementById('panelUsers');
  const panelRequests = document.getElementById('panelRequests');

  if (tab === 'requests') {
    tabUsersBtn?.classList.remove('active');
    tabRequestsBtn?.classList.add('active');
    if (panelUsers) panelUsers.style.display = 'none';
    if (panelRequests) panelRequests.style.display = 'block';
    loadRequests();
  } else {
    tabRequestsBtn?.classList.remove('active');
    tabUsersBtn?.classList.add('active');
    if (panelRequests) panelRequests.style.display = 'none';
    if (panelUsers) panelUsers.style.display = 'block';
    filterUsers();
  }
}

// -------------------------------------------------------------
// DATA LOADING: System Users
// -------------------------------------------------------------
async function loadUsers() {
  showTopLoader();
  try {
    const res = await fetch('../api/users.php');
    if (!res.ok) throw new Error('Failed to retrieve user accounts.');

    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Server error.');

    allUsers = data.users || [];
    customRoles = data.custom_roles || [];
    populateRoleOptions();
    renderCustomRolesList();
    updateKpis();
    filterUsers();
  } catch (err) {
    console.error('Error loading users:', err);
    showToast('Failed to load users: ' + err.message, 'danger');
  } finally {
    hideTopLoader();
    hidePageLoader();
  }
}

// -------------------------------------------------------------
// DATA LOADING: Account Creation Requests
// -------------------------------------------------------------
async function loadRequests(showFeedback = false) {
  showTopLoader();
  try {
    const res = await fetch('../api/users.php?requests=1');
    if (!res.ok) throw new Error('Failed to retrieve account creation requests.');

    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Server error.');

    allRequests = data.requests || [];
    updateKpis();
    filterRequests();

    if (showFeedback) {
      showToast('Account creation requests refreshed.', 'info');
    }
  } catch (err) {
    console.error('Error loading account requests:', err);
    showToast('Failed to load account requests: ' + err.message, 'danger');
  } finally {
    hideTopLoader();
  }
}

// -------------------------------------------------------------
// UPDATE KPIS
// -------------------------------------------------------------
function updateKpis() {
  const total = allUsers.length;
  const active = allUsers.filter(u => (u.account_status || 'Active').toLowerCase() === 'active').length;
  const admins = allUsers.filter(u => (u.role || '').toLowerCase() === 'admin').length;
  const pendingRequests = allRequests.filter(r => (r.status || 'Pending').toLowerCase() === 'pending').length;

  // KPI Cards
  const kpiTotal = document.getElementById('kpiTotalUsers');
  const kpiActive = document.getElementById('kpiActiveUsers');
  const kpiAdmin = document.getElementById('kpiAdminUsers');
  const kpiPending = document.getElementById('kpiPendingRequests');
  const kpiPendingSub = document.getElementById('kpiPendingSubtext');

  if (kpiTotal) kpiTotal.textContent = total;
  if (kpiActive) kpiActive.textContent = active;
  if (kpiAdmin) kpiAdmin.textContent = admins;

  if (kpiPending) {
    kpiPending.textContent = pendingRequests;
    if (pendingRequests > 0) {
      kpiPending.style.color = '#d97706';
      if (kpiPendingSub) kpiPendingSub.textContent = 'Action required: Review requests';
    } else {
      kpiPending.style.color = 'var(--text-muted)';
      if (kpiPendingSub) kpiPendingSub.textContent = 'All requests reviewed';
    }
  }

  // Tab count badges
  const tabUsersBadge = document.getElementById('tabUsersCountBadge');
  const tabRequestsBadge = document.getElementById('tabRequestsPendingBadge');

  if (tabUsersBadge) tabUsersBadge.textContent = total;
  if (tabRequestsBadge) {
    tabRequestsBadge.textContent = `${pendingRequests} Pending`;
    if (pendingRequests > 0) {
      tabRequestsBadge.className = 'badge badge-warning';
    } else {
      tabRequestsBadge.className = 'badge badge-secondary';
    }
  }
}

// -------------------------------------------------------------
// FILTER & RENDER: System Users Table
// -------------------------------------------------------------
function filterUsers() {
  const query = (document.getElementById('searchUserInput')?.value || '').toLowerCase().trim();
  const roleVal = document.getElementById('filterUserRole')?.value || 'all';
  const statusVal = document.getElementById('filterUserStatus')?.value || 'all';

  const filtered = allUsers.filter(u => {
    const matchQuery = !query || 
      (u.full_name || '').toLowerCase().includes(query) || 
      (u.username || '').toLowerCase().includes(query) || 
      (u.email || '').toLowerCase().includes(query);

    const matchRole = (roleVal === 'all') || 
      (u.role || '').toLowerCase() === roleVal.toLowerCase();

    const matchStatus = (statusVal === 'all') || 
      (u.account_status || 'Active').toLowerCase() === statusVal.toLowerCase();

    return matchQuery && matchRole && matchStatus;
  });

  renderUsersTable(filtered);
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  const badge = document.getElementById('userCountBadge');

  if (badge) {
    badge.textContent = `Showing ${users.length} of ${allUsers.length} account${allUsers.length === 1 ? '' : 's'}`;
  }

  if (!users.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          <div>No user accounts match the search or filter criteria.</div>
        </td>
      </tr>
    `;
    return;
  }

  const currentUser = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};

  tbody.innerHTML = users.map(u => {
    // Generate Initials Avatar
    const initials = (u.full_name || u.username || 'U')
      .split(' ')
      .map(p => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    // Role Badge
    let roleBadgeClass = 'badge-info';
    const roleLower = (u.role || '').toLowerCase();
    if (roleLower === 'admin') roleBadgeClass = 'badge-success';
    else if (roleLower === 'store manager') roleBadgeClass = 'badge-primary';
    else if (roleLower === 'inventory clerk') roleBadgeClass = 'badge-warning';

    // Account Status Badge
    const isActive = (u.account_status || 'Active').toLowerCase() === 'active';
    const statusBadge = isActive
      ? `<span class="badge badge-success">Active</span>`
      : `<span class="badge" style="background:#f3f4f6; color:#6b7280; border:1px solid #d1d5db;">Inactive</span>`;

    // Permission Badges List
    const userPerms = Array.isArray(u.permissions) ? u.permissions : [];
    let permsHtml = '';

    if (roleLower === 'admin' || userPerms.length >= 10) {
      permsHtml = `<span class="badge badge-success" style="font-weight:700;">★ Full System Access (${userPerms.length || 10} Modules)</span>`;
    } else if (userPerms.length === 0) {
      permsHtml = `<span class="badge" style="background:#fee2e2; color:#b91c1c;">No Access Assigned</span>`;
    } else {
      const badges = userPerms.map(p => {
        const def = MODULE_DEFINITIONS.find(m => m.id === p);
        return `<span class="badge badge-secondary" style="font-size:11px; padding:3px 6px; margin:2px 2px 2px 0;">${def ? def.icon + ' ' + def.label : p}</span>`;
      });
      permsHtml = `<div style="display:flex; flex-wrap:wrap; max-width:420px;">${badges.join('')}</div>`;
    }

    // Action buttons
    const isPrimaryAdmin = u.user_id === 1;
    const isSelf = String(u.user_id) === String(currentUser.id);

    const toggleBtnTitle = isActive ? 'Deactivate account' : 'Activate account';
    const toggleBtnIcon = isActive 
      ? `<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>`
      : `<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="user-avatar">${initials}</div>
            <div>
              <div style="font-weight:700; color:var(--text-main); font-size:13.5px;">
                ${escapeHtml(u.full_name)}
                ${isSelf ? '<span class="badge badge-info" style="font-size:10px; margin-left:4px;">You</span>' : ''}
              </div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:1px;">
                ${u.email ? `<span title="Email: ${escapeHtml(u.email)}">✉ ${escapeHtml(u.email)}</span>` : '<span style="font-style:italic;">No email registered</span>'}
              </div>
            </div>
          </div>
        </td>
        <td><code>${escapeHtml(u.username)}</code></td>
        <td><span class="badge ${roleBadgeClass}">${escapeHtml(u.role)}</span></td>
        <td>${permsHtml}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="openEditUserModal(${u.user_id})" title="Edit User & Permissions">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              Edit
            </button>

            ${!isPrimaryAdmin ? `
              <button class="btn btn-secondary btn-sm" onclick="promptToggleUserStatus(${u.user_id}, '${escapeHtml(u.full_name)}', '${u.account_status}')" title="${toggleBtnTitle}" style="${isActive ? 'color:var(--danger-text);' : 'color:#059669;'}">
                ${toggleBtnIcon}
                ${isActive ? 'Deactivate' : 'Activate'}
              </button>

              ${u.transaction_count === 0 ? `
                <button class="btn btn-secondary btn-sm" onclick="promptDeleteUser(${u.user_id}, '${escapeHtml(u.full_name)}')" title="Delete Account" style="color:var(--danger-text);">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              ` : ''}
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------
// FILTER & RENDER: Account Creation Requests Table
// -------------------------------------------------------------
function filterRequests() {
  const query = (document.getElementById('searchReqInput')?.value || '').toLowerCase().trim();
  const statusVal = document.getElementById('filterReqStatus')?.value || 'all';

  const filtered = allRequests.filter(r => {
    const matchQuery = !query || 
      (r.full_name || '').toLowerCase().includes(query) || 
      (r.username || '').toLowerCase().includes(query) || 
      (r.email || '').toLowerCase().includes(query);

    const matchStatus = (statusVal === 'all') || 
      (r.status || 'Pending').toLowerCase() === statusVal.toLowerCase();

    return matchQuery && matchStatus;
  });

  renderRequestsTable(filtered);
}

function renderRequestsTable(requests) {
  const tbody = document.getElementById('requestsTableBody');
  const badge = document.getElementById('requestsCountBadge');

  if (badge) {
    const pendingTotal = allRequests.filter(r => (r.status || '').toLowerCase() === 'pending').length;
    badge.textContent = `Showing ${requests.length} of ${allRequests.length} request${allRequests.length === 1 ? '' : 's'} (${pendingTotal} pending)`;
  }

  if (!requests.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>No account creation requests match the search or filter criteria.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = requests.map(r => {
    const initials = (r.full_name || r.username || 'R')
      .split(' ')
      .map(p => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    // Status Badge
    const status = r.status || 'Pending';
    let statusBadge = '';
    if (status === 'Pending') {
      statusBadge = `<span class="badge badge-warning" style="font-weight:700;">⏳ Pending Approval</span>`;
    } else if (status === 'Approved') {
      statusBadge = `<span class="badge badge-success">✓ Approved</span>`;
    } else {
      statusBadge = `<span class="badge" style="background:var(--danger-bg); color:var(--danger-text); border:1px solid #fca5a5;">✗ Rejected</span>`;
    }

    // Formatted dates
    const dateFormatted = formatDateTime(r.created_at);
    const reviewDateFormatted = r.reviewed_at ? formatDateTime(r.reviewed_at) : '';

    // Review details
    let reviewDetails = '';
    if (status === 'Pending') {
      reviewDetails = `<span style="color:var(--text-muted); font-size:12px;">Awaiting administrator review</span>`;
    } else if (status === 'Approved') {
      reviewDetails = `
        <div style="font-size:12px; color:var(--text-main);">
          Authorized by: <strong>${escapeHtml(r.reviewer_name || r.reviewer_username || 'Admin')}</strong>
          <div style="font-size:11px; color:var(--text-muted);">${reviewDateFormatted}</div>
        </div>
      `;
    } else if (status === 'Rejected') {
      reviewDetails = `
        <div style="font-size:12px; color:var(--danger-text);">
          Declined by: <strong>${escapeHtml(r.reviewer_name || r.reviewer_username || 'Admin')}</strong>
          ${r.rejection_reason ? `<div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">Reason: <em>${escapeHtml(r.rejection_reason)}</em></div>` : ''}
          <div style="font-size:11px; color:var(--text-muted); margin-top:1px;">${reviewDateFormatted}</div>
        </div>
      `;
    }

    // Action buttons
    let actionButtons = '';
    if (status === 'Pending') {
      actionButtons = `
        <div style="display:inline-flex; gap:6px; justify-content:flex-end;">
          <button class="btn btn-primary btn-sm" onclick="openApproveModal(${r.request_id})" title="Authorize and approve this account" style="background:#059669; border-color:#047857;">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            Approve
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openRejectModal(${r.request_id})" title="Decline this account request" style="color:var(--danger-text);">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            Decline
          </button>
        </div>
      `;
    } else {
      actionButtons = `
        <div style="display:inline-flex; gap:6px; justify-content:flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="promptDeleteRequestRecord(${r.request_id})" title="Remove record from request history" style="color:var(--text-muted);">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      `;
    }

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="user-avatar" style="background:var(--brand-gold-light); color:var(--brand-gold-hover);">${initials}</div>
            <div>
              <div style="font-weight:700; color:var(--text-main); font-size:13.5px;">${escapeHtml(r.full_name)}</div>
              <div style="font-size:11.5px; color:var(--text-muted);"><code>@${escapeHtml(r.username)}</code></div>
            </div>
          </div>
        </td>
        <td>
          <a href="mailto:${escapeHtml(r.email)}" style="color:var(--primary); text-decoration:none; font-weight:600;">
            ${escapeHtml(r.email)}
          </a>
        </td>
        <td><span class="badge badge-info">${escapeHtml(r.role || 'Cashier')}</span></td>
        <td style="font-size:12px; color:var(--text-muted);">${dateFormatted}</td>
        <td>${statusBadge}</td>
        <td>${reviewDetails}</td>
        <td style="text-align: right;">${actionButtons}</td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------
// UNIVERSAL ACTION AUTHORIZATION PROMPT (Password Required)
// -------------------------------------------------------------
function promptAdminPasswordAction({ title, promptText, confirmBtnText, btnColor, onConfirm }) {
  pendingAdminAction = onConfirm;
  document.getElementById('adminActionModalTitle').textContent = title || 'Administrator Authorization';
  document.getElementById('adminActionPromptText').innerHTML = promptText;

  const btnConfirm = document.getElementById('btnAdminActionConfirm');
  btnConfirm.textContent = confirmBtnText || 'Confirm Authorization';
  if (btnColor) {
    btnConfirm.style.background = btnColor;
    btnConfirm.style.borderColor = btnColor;
  } else {
    btnConfirm.style.background = 'var(--primary)';
    btnConfirm.style.borderColor = 'var(--primary)';
  }

  const passInput = document.getElementById('adminActionPasswordInput');
  if (passInput) passInput.value = '';

  const alertBox = document.getElementById('adminActionErrorAlert');
  if (alertBox) alertBox.style.display = 'none';

  openModal('modalAdminActionAuth');
  setTimeout(() => passInput?.focus(), 150);
}

async function handleAdminActionSubmit(e) {
  e.preventDefault();

  const adminPassword = document.getElementById('adminActionPasswordInput').value;
  const alertBox = document.getElementById('adminActionErrorAlert');
  const btnConfirm = document.getElementById('btnAdminActionConfirm');

  if (!adminPassword) {
    if (alertBox) {
      alertBox.textContent = 'Please enter your administrator password to proceed.';
      alertBox.style.display = 'block';
    }
    return;
  }

  if (typeof pendingAdminAction !== 'function') {
    closeModal('modalAdminActionAuth');
    return;
  }

  btnConfirm.disabled = true;
  btnConfirm.textContent = 'Verifying Password...';

  try {
    const success = await pendingAdminAction(adminPassword);
    if (success) {
      closeModal('modalAdminActionAuth');
      pendingAdminAction = null;
    }
  } catch (err) {
    if (alertBox) {
      alertBox.textContent = err.message || 'Authorization failed. Incorrect administrator password.';
      alertBox.style.display = 'block';
    }
    document.getElementById('adminActionPasswordInput')?.select();
  } finally {
    btnConfirm.disabled = false;
    btnConfirm.textContent = 'Confirm Authorization';
  }
}

// -------------------------------------------------------------
// QUICK ACTIONS WITH PASSWORD PROMPT: Toggle Status, Delete User, Delete Request
// -------------------------------------------------------------
function promptToggleUserStatus(userId, fullName, currentStatus) {
  const isActivating = (currentStatus || 'Active').toLowerCase() !== 'active';
  const actionText = isActivating ? 'activate' : 'deactivate';

  promptAdminPasswordAction({
    title: `${isActivating ? 'Activate' : 'Deactivate'} User Account`,
    promptText: `Are you sure you want to <strong>${actionText}</strong> the account for <strong>${fullName}</strong>? Enter your administrator password to authorize this status change:`,
    confirmBtnText: `Authorize & ${isActivating ? 'Activate' : 'Deactivate'}`,
    btnColor: isActivating ? '#059669' : 'var(--danger-text)',
    onConfirm: async (adminPassword) => {
      const currentUser = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};
      const res = await fetch('../api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_status',
          user_id: userId,
          admin_password: adminPassword,
          admin_user_id: currentUser.id || 1,
          admin_username: currentUser.username || 'admin'
        })
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Authorization failed.');

      showToast(result.message || 'Status updated successfully.', 'success');
      await loadUsers();
      return true;
    }
  });
}

function promptDeleteUser(userId, fullName) {
  promptAdminPasswordAction({
    title: 'Delete System User Account',
    promptText: `Are you sure you want to permanently delete the account for <strong>${fullName}</strong>? This action cannot be undone. Enter your administrator password to authorize deletion:`,
    confirmBtnText: 'Authorize & Delete Account',
    btnColor: 'var(--danger-text)',
    onConfirm: async (adminPassword) => {
      const currentUser = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};
      const res = await fetch('../api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          user_id: userId,
          admin_password: adminPassword,
          admin_user_id: currentUser.id || 1,
          admin_username: currentUser.username || 'admin'
        })
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Authorization failed.');

      showToast(result.message || 'User deleted successfully.', 'success');
      await loadUsers();
      return true;
    }
  });
}

function promptDeleteRequestRecord(requestId) {
  promptAdminPasswordAction({
    title: 'Remove Request Record',
    promptText: `Remove this account request record from historical logs? Enter your administrator password to authorize removal:`,
    confirmBtnText: 'Authorize & Remove',
    btnColor: 'var(--danger-text)',
    onConfirm: async (adminPassword) => {
      const currentUser = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};
      const res = await fetch('../api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_request',
          request_id: requestId,
          admin_password: adminPassword,
          admin_user_id: currentUser.id || 1,
          admin_username: currentUser.username || 'admin'
        })
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Authorization failed.');

      showToast(result.message || 'Record removed.', 'success');
      await loadRequests();
      return true;
    }
  });
}

// -------------------------------------------------------------
// APPROVAL MODAL (WITH ADMIN PASSWORD AUTHENTICATION)
// -------------------------------------------------------------
function openApproveModal(requestId) {
  const req = allRequests.find(r => r.request_id === requestId);
  if (!req) {
    showToast('Account request not found.', 'danger');
    return;
  }

  document.getElementById('approveReqId').value = req.request_id;
  document.getElementById('approveApplicantName').textContent = req.full_name;
  document.getElementById('approveApplicantUsername').textContent = `@${req.username}`;
  document.getElementById('approveApplicantEmail').textContent = req.email;
  document.getElementById('approveApplicantRole').textContent = req.role || 'Cashier';

  const roleSelect = document.getElementById('approveRoleSelect');
  const approveCustomCont = document.getElementById('approveCustomRoleInputContainer');
  const approveCustomInput = document.getElementById('approveCustomRoleNameInput');

  const reqRole = req.role || 'Cashier';
  const roleExists = roleSelect && [...roleSelect.options].some(o => o.value.toLowerCase() === reqRole.toLowerCase());

  if (roleSelect) {
    if (roleExists) {
      roleSelect.value = reqRole;
      if (approveCustomCont) approveCustomCont.style.display = 'none';
      if (approveCustomInput) approveCustomInput.value = '';
    } else {
      roleSelect.value = '__custom__';
      if (approveCustomCont) approveCustomCont.style.display = 'block';
      if (approveCustomInput) approveCustomInput.value = reqRole;
    }
  }

  const passInput = document.getElementById('approveAdminPassword');
  if (passInput) passInput.value = '';

  const alertBox = document.getElementById('approveErrorAlert');
  if (alertBox) alertBox.style.display = 'none';

  openModal('modalApproveRequest');
  setTimeout(() => passInput?.focus(), 150);
}

async function handleApproveSubmit(e) {
  e.preventDefault();

  const requestId = parseInt(document.getElementById('approveReqId').value, 10);
  const adminPassword = document.getElementById('approveAdminPassword').value;
  let assignedRole = document.getElementById('approveRoleSelect').value;
  const alertBox = document.getElementById('approveErrorAlert');
  const btnConfirm = document.getElementById('btnConfirmApprove');

  if (assignedRole === '__custom__') {
    const customRoleName = document.getElementById('approveCustomRoleNameInput').value.trim();
    if (!customRoleName) {
      if (alertBox) {
        alertBox.textContent = 'Please enter a name for the custom role.';
        alertBox.style.display = 'block';
      }
      document.getElementById('approveCustomRoleNameInput')?.focus();
      return;
    }
    assignedRole = customRoleName;
  }

  if (!adminPassword) {
    if (alertBox) {
      alertBox.textContent = 'Please enter your administrator password to confirm approval.';
      alertBox.style.display = 'block';
    }
    return;
  }

  const currentUser = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};

  btnConfirm.disabled = true;
  btnConfirm.textContent = 'Verifying Admin Password...';
  if (alertBox) alertBox.style.display = 'none';

  try {
    const res = await fetch('../api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve_request',
        request_id: requestId,
        admin_password: adminPassword,
        admin_user_id: currentUser.id || 1,
        admin_username: currentUser.username || 'admin',
        role: assignedRole
      })
    });

    const result = await res.json();

    if (!result.success) {
      if (alertBox) {
        alertBox.textContent = result.message || 'Authorization failed. Incorrect administrator password.';
        alertBox.style.display = 'block';
      }
      document.getElementById('approveAdminPassword')?.select();
      return;
    }

    closeModal('modalApproveRequest');
    showToast(result.message || 'Account approved successfully!', 'success');

    // Reload both requests and users
    await Promise.all([loadRequests(), loadUsers()]);

  } catch (err) {
    console.error('Approval error:', err);
    if (alertBox) {
      alertBox.textContent = 'Server error during approval: ' + err.message;
      alertBox.style.display = 'block';
    }
  } finally {
    btnConfirm.disabled = false;
    btnConfirm.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
      Authorize & Approve Account
    `;
  }
}

// -------------------------------------------------------------
// REJECTION MODAL (WITH ADMIN PASSWORD AUTHENTICATION)
// -------------------------------------------------------------
function openRejectModal(requestId) {
  const req = allRequests.find(r => r.request_id === requestId);
  if (!req) {
    showToast('Account request not found.', 'danger');
    return;
  }

  document.getElementById('rejectReqId').value = req.request_id;
  document.getElementById('rejectApplicantName').textContent = req.full_name;
  document.getElementById('rejectApplicantUsername').textContent = `@${req.username}`;

  const reasonInput = document.getElementById('rejectReasonInput');
  if (reasonInput) reasonInput.value = '';

  const passInput = document.getElementById('rejectAdminPassword');
  if (passInput) passInput.value = '';

  const alertBox = document.getElementById('rejectErrorAlert');
  if (alertBox) alertBox.style.display = 'none';

  openModal('modalRejectRequest');
  setTimeout(() => passInput?.focus(), 150);
}

async function handleRejectSubmit(e) {
  e.preventDefault();

  const requestId = parseInt(document.getElementById('rejectReqId').value, 10);
  const adminPassword = document.getElementById('rejectAdminPassword').value;
  const reason = document.getElementById('rejectReasonInput').value.trim();
  const alertBox = document.getElementById('rejectErrorAlert');
  const btnConfirm = document.getElementById('btnConfirmReject');

  if (!adminPassword) {
    if (alertBox) {
      alertBox.textContent = 'Please enter your administrator password to authenticate.';
      alertBox.style.display = 'block';
    }
    return;
  }

  const currentUser = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};

  btnConfirm.disabled = true;
  btnConfirm.textContent = 'Verifying Admin Password...';
  if (alertBox) alertBox.style.display = 'none';

  try {
    const res = await fetch('../api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reject_request',
        request_id: requestId,
        admin_password: adminPassword,
        admin_user_id: currentUser.id || 1,
        admin_username: currentUser.username || 'admin',
        rejection_reason: reason || 'Declined by administrator'
      })
    });

    const result = await res.json();

    if (!result.success) {
      if (alertBox) {
        alertBox.textContent = result.message || 'Authorization failed. Incorrect administrator password.';
        alertBox.style.display = 'block';
      }
      document.getElementById('rejectAdminPassword')?.select();
      return;
    }

    closeModal('modalRejectRequest');
    showToast(result.message || 'Account request declined.', 'info');
    await loadRequests();

  } catch (err) {
    console.error('Rejection error:', err);
    if (alertBox) {
      alertBox.textContent = 'Server error during rejection: ' + err.message;
      alertBox.style.display = 'block';
    }
  } finally {
    btnConfirm.disabled = false;
    btnConfirm.textContent = 'Decline Request';
  }
}

// -------------------------------------------------------------
// MODAL: ADD / EDIT SYSTEM USER (ADMIN PASSWORD REQUIRED)
// -------------------------------------------------------------
function setPermissionCheckboxes(permIds) {
  const checkboxes = document.querySelectorAll('input[name="perm"]');
  checkboxes.forEach(cb => {
    cb.checked = permIds.includes(cb.value);
  });
}

function getSelectedPermissions() {
  const selected = [];
  document.querySelectorAll('input[name="perm"]:checked').forEach(cb => {
    selected.push(cb.value);
  });
  return selected;
}

function openAddUserModal() {
  document.getElementById('modalUserTitle').textContent = 'Add New System User';
  document.getElementById('userIdInput').value = '';
  document.getElementById('fullNameInput').value = '';
  document.getElementById('emailInput').value = '';
  document.getElementById('usernameInput').value = '';
  document.getElementById('passwordInput').value = '';
  document.getElementById('passwordInput').required = true;
  document.getElementById('passwordRequiredStar').style.display = 'inline';
  document.getElementById('passwordHelpText').style.display = 'none';

  document.getElementById('roleSelect').value = 'Cashier';
  document.getElementById('statusSelect').value = 'Active';

  const customRoleCont = document.getElementById('customRoleInputContainer');
  const customRoleInput = document.getElementById('customRoleNameInput');
  if (customRoleCont) customRoleCont.style.display = 'none';
  if (customRoleInput) customRoleInput.value = '';

  const authPass = document.getElementById('adminAuthPasswordUserForm');
  if (authPass) authPass.value = '';

  const errAlert = document.getElementById('userFormErrorAlert');
  if (errAlert) errAlert.style.display = 'none';

  setPermissionCheckboxes(getRolePermissions('Cashier'));
  openModal('modalUserForm');
}

function openEditUserModal(userId) {
  const user = allUsers.find(u => u.user_id === userId);
  if (!user) {
    showToast('User not found.', 'danger');
    return;
  }

  document.getElementById('modalUserTitle').textContent = `Edit User & Permissions: ${user.full_name}`;
  document.getElementById('userIdInput').value = user.user_id;
  document.getElementById('fullNameInput').value = user.full_name || '';
  document.getElementById('emailInput').value = user.email || '';
  document.getElementById('usernameInput').value = user.username || '';
  document.getElementById('passwordInput').value = '';
  document.getElementById('passwordInput').required = false;
  document.getElementById('passwordRequiredStar').style.display = 'none';
  document.getElementById('passwordHelpText').style.display = 'block';

  const roleSelect = document.getElementById('roleSelect');
  const customRoleCont = document.getElementById('customRoleInputContainer');
  const customRoleInput = document.getElementById('customRoleNameInput');
  const userRole = user.role || 'Cashier';
  const roleExists = roleSelect && [...roleSelect.options].some(o => o.value.toLowerCase() === userRole.toLowerCase());

  if (roleSelect) {
    if (roleExists) {
      roleSelect.value = userRole;
      if (customRoleCont) customRoleCont.style.display = 'none';
      if (customRoleInput) customRoleInput.value = '';
    } else {
      roleSelect.value = '__custom__';
      if (customRoleCont) customRoleCont.style.display = 'block';
      if (customRoleInput) customRoleInput.value = userRole;
    }
  }

  document.getElementById('statusSelect').value = user.account_status || 'Active';

  const authPass = document.getElementById('adminAuthPasswordUserForm');
  if (authPass) authPass.value = '';

  const errAlert = document.getElementById('userFormErrorAlert');
  if (errAlert) errAlert.style.display = 'none';

  const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
  setPermissionCheckboxes(userPerms);

  openModal('modalUserForm');
}

async function handleUserFormSubmit(e) {
  e.preventDefault();

  const userId = document.getElementById('userIdInput').value;
  const fullName = document.getElementById('fullNameInput').value.trim();
  const email = document.getElementById('emailInput').value.trim();
  const username = document.getElementById('usernameInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  let role = document.getElementById('roleSelect').value;
  const account_status = document.getElementById('statusSelect').value;
  const permissions = getSelectedPermissions();
  const adminPassword = document.getElementById('adminAuthPasswordUserForm').value;
  const errAlert = document.getElementById('userFormErrorAlert');

  if (errAlert) errAlert.style.display = 'none';

  if (role === '__custom__') {
    const customRoleName = document.getElementById('customRoleNameInput').value.trim();
    if (!customRoleName) {
      if (errAlert) {
        errAlert.textContent = 'Please enter a name for the custom role.';
        errAlert.style.display = 'block';
      }
      document.getElementById('customRoleNameInput')?.focus();
      return;
    }
    role = customRoleName;
  }

  if (!fullName || !username || !email) {
    showToast('Please fill in all required fields (Full name, Email, and Username).', 'warning');
    return;
  }

  if (!userId && !password) {
    showToast('Password is required for new accounts.', 'warning');
    return;
  }

  if (!adminPassword) {
    if (errAlert) {
      errAlert.textContent = 'Administrator password is required to authorize this action.';
      errAlert.style.display = 'block';
    }
    document.getElementById('adminAuthPasswordUserForm')?.focus();
    return;
  }

  if (permissions.length === 0) {
    if (!confirm('Warning: You have not granted any module permissions to this account. The user will have no access upon signing in. Continue?')) {
      return;
    }
  }

  const currentUser = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};
  const isEditing = Boolean(userId);
  const payload = {
    action: isEditing ? 'update' : 'create',
    user_id: isEditing ? parseInt(userId, 10) : undefined,
    full_name: fullName,
    email: email,
    username: username,
    password: password,
    role: role,
    account_status: account_status,
    permissions: permissions,
    admin_password: adminPassword,
    admin_user_id: currentUser.id || 1,
    admin_username: currentUser.username || 'admin'
  };

  const btnSave = document.getElementById('btnSaveUser');
  btnSave.disabled = true;
  btnSave.textContent = 'Verifying Admin Password...';
  showTopLoader();

  try {
    const res = await fetch('../api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!result.success) {
      if (errAlert) {
        errAlert.textContent = result.message || 'Authorization failed. Incorrect administrator password.';
        errAlert.style.display = 'block';
      }
      document.getElementById('adminAuthPasswordUserForm')?.select();
      return;
    }

    showToast(result.message || 'User saved successfully!', 'success');
    closeModal('modalUserForm');
    await loadUsers();
  } catch (err) {
    console.error('Save user error:', err);
    if (errAlert) {
      errAlert.textContent = 'Error processing request: ' + err.message;
      errAlert.style.display = 'block';
    }
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = 'Authorize & Save Account';
    hideTopLoader();
  }
}

// -------------------------------------------------------------
// HELPER FUNCTIONS
// -------------------------------------------------------------
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dateStr;
  }
}

// -------------------------------------------------------------
// ROLE MANAGEMENT & PERMISSION CONFIGURATION FUNCTIONS
// -------------------------------------------------------------
function populateRoleOptions() {
  const filterRoleSelect = document.getElementById('filterUserRole');
  const roleSelect = document.getElementById('roleSelect');
  const approveRoleSelect = document.getElementById('approveRoleSelect');

  const currentFilterVal = filterRoleSelect ? filterRoleSelect.value : 'all';
  const currentRoleVal = roleSelect ? roleSelect.value : 'Cashier';
  const currentApproveVal = approveRoleSelect ? approveRoleSelect.value : 'Cashier';

  // Separate system vs custom roles
  const systemRolesList = customRoles.filter(r => r.is_system);
  const userCustomRolesList = customRoles.filter(r => !r.is_system);

  // Fallback defaults if table was empty
  const defaultSysRoles = [
    { role_name: 'Admin', label: 'Administrator (Full Access)' },
    { role_name: 'Cashier', label: 'Cashier' },
    { role_name: 'Store Manager', label: 'Store Manager' },
    { role_name: 'Inventory Clerk', label: 'Inventory Clerk' }
  ];

  // 1. Populate filterUserRole
  if (filterRoleSelect) {
    let filterHtml = `<option value="all">All Roles</option>`;
    const sysToUse = systemRolesList.length > 0 ? systemRolesList : defaultSysRoles;
    sysToUse.forEach(sr => {
      filterHtml += `<option value="${escapeHtml(sr.role_name)}">${escapeHtml(sr.role_name)}</option>`;
    });
    if (userCustomRolesList.length > 0) {
      userCustomRolesList.forEach(cr => {
        filterHtml += `<option value="${escapeHtml(cr.role_name)}">${escapeHtml(cr.role_name)}</option>`;
      });
    }
    filterRoleSelect.innerHTML = filterHtml;
    if ([...filterRoleSelect.options].some(o => o.value.toLowerCase() === currentFilterVal.toLowerCase())) {
      filterRoleSelect.value = currentFilterVal;
    }
  }

  // 2. Populate roleSelect (in User Add/Edit modal)
  if (roleSelect) {
    let optsHtml = '';
    const sysToUse = systemRolesList.length > 0 ? systemRolesList : defaultSysRoles;
    optsHtml += `<optgroup label="Standard System Roles">`;
    sysToUse.forEach(sr => {
      const label = sr.role_name === 'Admin' ? 'Administrator (Full Access)' : sr.role_name;
      optsHtml += `<option value="${escapeHtml(sr.role_name)}">${escapeHtml(label)}</option>`;
    });
    optsHtml += `</optgroup>`;

    if (userCustomRolesList.length > 0) {
      optsHtml += `<optgroup label="Custom Roles">`;
      userCustomRolesList.forEach(cr => {
        optsHtml += `<option value="${escapeHtml(cr.role_name)}">${escapeHtml(cr.role_name)}</option>`;
      });
      optsHtml += `</optgroup>`;
    }
    optsHtml += `<option value="__custom__">✨ + Enter Custom Role Name...</option>`;
    roleSelect.innerHTML = optsHtml;
    if ([...roleSelect.options].some(o => o.value.toLowerCase() === currentRoleVal.toLowerCase())) {
      roleSelect.value = currentRoleVal;
    }
  }

  // 3. Populate approveRoleSelect (in Approve Request modal)
  if (approveRoleSelect) {
    let approveOptsHtml = '';
    const sysToUse = systemRolesList.length > 0 ? systemRolesList : defaultSysRoles;
    approveOptsHtml += `<optgroup label="Standard System Roles">`;
    sysToUse.forEach(sr => {
      approveOptsHtml += `<option value="${escapeHtml(sr.role_name)}">${escapeHtml(sr.role_name)}</option>`;
    });
    approveOptsHtml += `</optgroup>`;

    if (userCustomRolesList.length > 0) {
      approveOptsHtml += `<optgroup label="Custom Roles">`;
      userCustomRolesList.forEach(cr => {
        approveOptsHtml += `<option value="${escapeHtml(cr.role_name)}">${escapeHtml(cr.role_name)}</option>`;
      });
      approveOptsHtml += `</optgroup>`;
    }
    approveOptsHtml += `<option value="__custom__">✨ + Enter Custom Role Name...</option>`;
    approveRoleSelect.innerHTML = approveOptsHtml;
    if ([...approveRoleSelect.options].some(o => o.value.toLowerCase() === currentApproveVal.toLowerCase())) {
      approveRoleSelect.value = currentApproveVal;
    }
  }
}

function openManageRolesModal() {
  const errBox = document.getElementById('customRoleFormError');
  if (errBox) errBox.style.display = 'none';

  const roleNameInput = document.getElementById('newRoleNameInput');
  if (roleNameInput) roleNameInput.value = '';

  const passInput = document.getElementById('createRoleAdminPassword');
  if (passInput) passInput.value = '';

  // Default permissions: pos, view-inventory, transactions
  document.querySelectorAll('input[name="newRolePerm"]').forEach(cb => {
    cb.checked = ['pos', 'view-inventory', 'transactions'].includes(cb.value);
  });

  renderCustomRolesList();
  openModal('modalManageRoles');
  setTimeout(() => roleNameInput?.focus(), 150);
}

function renderCustomRolesList() {
  const container = document.getElementById('customRolesListContainer');
  const countBadge = document.getElementById('customRolesCountBadge');

  if (countBadge) {
    countBadge.textContent = `${customRoles.length} Role${customRoles.length === 1 ? '' : 's'} Configured`;
  }

  if (!container) return;

  if (customRoles.length === 0) {
    container.innerHTML = `
      <div style="font-size: 12.5px; color: var(--text-muted); padding: 14px; background: var(--bg-main); border-radius: var(--radius-md); text-align: center; border: 1px dashed var(--border-color);">
        No roles configured yet. You can define one below.
      </div>
    `;
    return;
  }

  container.innerHTML = customRoles.map(cr => {
    const perms = Array.isArray(cr.default_permissions) ? cr.default_permissions : [];
    let permsBadges = '';
    if (perms.length >= 10) {
      permsBadges = `<span class="badge badge-success" style="font-size: 10.5px; padding: 2px 6px; font-weight:700;">★ Full System Access (10 Modules)</span>`;
    } else if (perms.length === 0) {
      permsBadges = `<span class="badge" style="background:#fee2e2; color:#b91c1c; font-size:10.5px;">No Default Permissions</span>`;
    } else {
      permsBadges = perms.map(p => {
        const def = MODULE_DEFINITIONS.find(m => m.id === p);
        return `<span class="badge badge-secondary" style="font-size: 10.5px; padding: 2px 6px;">${def ? def.icon + ' ' + def.label : p}</span>`;
      }).join(' ');
    }

    const assignedUserCount = allUsers.filter(u => (u.role || '').toLowerCase() === cr.role_name.toLowerCase()).length;
    const isSys = Boolean(cr.is_system);

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); gap: 12px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 220px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
            <strong style="font-size: 14px; color: var(--text-main);">${escapeHtml(cr.role_name)}</strong>
            <span class="badge ${isSys ? 'badge-primary' : 'badge-info'}" style="font-size: 10px;">
              ${isSys ? 'System Role' : 'Custom Role'}
            </span>
            <span class="badge badge-secondary" style="font-size: 10px;">
              ${assignedUserCount} User${assignedUserCount === 1 ? '' : 's'} Assigned
            </span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-top: 4px;">
            <span style="font-size: 11px; color: var(--text-muted); font-weight:600;">Default Access:</span>
            ${permsBadges}
          </div>
        </div>
        <div style="display: inline-flex; gap: 6px; align-items: center;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openEditRolePermsModal(${cr.role_id})" title="Edit Default Permissions for ${escapeHtml(cr.role_name)}" style="padding: 5px 10px; font-size: 11.5px; font-weight: 600; color: var(--primary);">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            Edit Permissions
          </button>
          ${!isSys ? `
            <button type="button" class="btn btn-secondary btn-sm" onclick="promptDeleteCustomRole(${cr.role_id}, '${escapeHtml(cr.role_name)}')" title="Delete custom role" style="color: var(--danger-text); padding: 5px 8px; font-size: 11.5px;">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              Delete
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function openEditRolePermsModal(roleId) {
  const role = customRoles.find(r => r.role_id === roleId);
  if (!role) {
    showToast('Role not found.', 'danger');
    return;
  }

  document.getElementById('editRoleIdInput').value = role.role_id;
  document.getElementById('editRoleNameInput').value = role.role_name;
  document.getElementById('editRoleDisplayName').textContent = role.role_name;

  const assignedUsers = allUsers.filter(u => (u.role || '').toLowerCase() === role.role_name.toLowerCase());
  const assignedCount = assignedUsers.length;

  const badgeCont = document.getElementById('editRoleBadgeContainer');
  if (badgeCont) {
    const isSys = Boolean(role.is_system);
    badgeCont.innerHTML = `
      <span class="badge ${isSys ? 'badge-primary' : 'badge-info'}" style="font-size: 11px;">
        ${isSys ? 'Standard System Role' : 'Custom Role'}
      </span>
      <span class="badge badge-secondary" style="font-size: 11px;">
        ${assignedCount} User${assignedCount === 1 ? '' : 's'} Assigned
      </span>
    `;
  }

  const applyHelp = document.getElementById('editRoleApplyHelp');
  if (applyHelp) {
    applyHelp.textContent = assignedCount > 0 
      ? `Synchronizes these permissions immediately across all ${assignedCount} active user account(s) currently assigned the '${role.role_name}' role.`
      : `No user accounts are currently assigned to this role. When new accounts are given this role, they will receive these permissions by default.`;
  }

  const applyCheckbox = document.getElementById('editRoleApplyToUsers');
  if (applyCheckbox) {
    applyCheckbox.checked = true;
  }

  // Populate Permissions Grid
  const grid = document.getElementById('editRolePermsGrid');
  if (grid) {
    const rolePerms = Array.isArray(role.default_permissions) ? role.default_permissions : [];
    grid.innerHTML = MODULE_DEFINITIONS.map(m => {
      const isChecked = rolePerms.includes(m.id);
      return `
        <label class="permission-item" style="cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #fff; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 12.5px;">
          <input type="checkbox" name="editRolePerm" value="${m.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer;">
          <span>${m.icon} <strong>${escapeHtml(m.label)}</strong></span>
        </label>
      `;
    }).join('');
  }

  const errAlert = document.getElementById('editRoleFormError');
  if (errAlert) errAlert.style.display = 'none';

  const passInput = document.getElementById('editRoleAdminPassword');
  if (passInput) passInput.value = '';

  openModal('modalEditRolePerms');
  setTimeout(() => passInput?.focus(), 150);
}

async function handleEditRolePermsSubmit(e) {
  e.preventDefault();

  const roleId = parseInt(document.getElementById('editRoleIdInput').value, 10);
  const roleName = document.getElementById('editRoleNameInput').value;
  const adminPassword = document.getElementById('editRoleAdminPassword').value;
  const applyToUsers = document.getElementById('editRoleApplyToUsers')?.checked ? 1 : 0;
  const errBox = document.getElementById('editRoleFormError');
  const btnSubmit = document.getElementById('btnSubmitEditRolePerms');

  if (errBox) errBox.style.display = 'none';

  if (!adminPassword) {
    if (errBox) {
      errBox.textContent = 'Administrator password is required to authorize modifying role permissions.';
      errBox.style.display = 'block';
    }
    document.getElementById('editRoleAdminPassword')?.focus();
    return;
  }

  const selectedPerms = [];
  document.querySelectorAll('input[name="editRolePerm"]:checked').forEach(cb => {
    selectedPerms.push(cb.value);
  });

  const currentUser = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Verifying Admin Password...';
  showTopLoader();

  try {
    const res = await fetch('../api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_role_permissions',
        role_id: roleId,
        role_name: roleName,
        permissions: selectedPerms,
        apply_to_users: applyToUsers,
        admin_password: adminPassword,
        admin_user_id: currentUser.id || 1,
        admin_username: currentUser.username || 'admin'
      })
    });

    const result = await res.json();

    if (!result.success) {
      if (errBox) {
        errBox.textContent = result.message || 'Failed to update role permissions. Check administrator password.';
        errBox.style.display = 'block';
      }
      document.getElementById('editRoleAdminPassword')?.select();
      return;
    }

    showToast(result.message || 'Role permissions updated successfully!', 'success');
    closeModal('modalEditRolePerms');

    // Reload users and custom roles from server
    await loadUsers();
  } catch (err) {
    console.error('Error updating role permissions:', err);
    if (errBox) {
      errBox.textContent = 'Server error: ' + err.message;
      errBox.style.display = 'block';
    }
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
      Save Role Permissions
    `;
    hideTopLoader();
  }
}

async function handleCreateCustomRoleSubmit(e) {
  e.preventDefault();

  const roleName = document.getElementById('newRoleNameInput').value.trim();
  const adminPassword = document.getElementById('createRoleAdminPassword').value;
  const errBox = document.getElementById('customRoleFormError');
  const btnSubmit = document.getElementById('btnSubmitCustomRole');

  if (errBox) errBox.style.display = 'none';

  if (!roleName) {
    if (errBox) {
      errBox.textContent = 'Please enter a custom role name.';
      errBox.style.display = 'block';
    }
    return;
  }

  if (!adminPassword) {
    if (errBox) {
      errBox.textContent = 'Administrator password is required to authorize creating a custom role.';
      errBox.style.display = 'block';
    }
    document.getElementById('createRoleAdminPassword')?.focus();
    return;
  }

  const selectedPerms = [];
  document.querySelectorAll('input[name="newRolePerm"]:checked').forEach(cb => {
    selectedPerms.push(cb.value);
  });

  const currentUser = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Verifying Admin Password...';

  try {
    const res = await fetch('../api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_role',
        role_name: roleName,
        permissions: selectedPerms,
        admin_password: adminPassword,
        admin_user_id: currentUser.id || 1,
        admin_username: currentUser.username || 'admin'
      })
    });

    const result = await res.json();

    if (!result.success) {
      if (errBox) {
        errBox.textContent = result.message || 'Failed to create custom role. Check administrator password.';
        errBox.style.display = 'block';
      }
      document.getElementById('createRoleAdminPassword')?.select();
      return;
    }

    showToast(result.message || 'Custom role created successfully!', 'success');

    // Reset inputs
    document.getElementById('newRoleNameInput').value = '';
    document.getElementById('createRoleAdminPassword').value = '';

    // Reload users and custom roles from server
    await loadUsers();
    renderCustomRolesList();
  } catch (err) {
    console.error('Error creating custom role:', err);
    if (errBox) {
      errBox.textContent = 'Server error: ' + err.message;
      errBox.style.display = 'block';
    }
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
      Authorize & Save Custom Role
    `;
  }
}

function promptDeleteCustomRole(roleId, roleName) {
  promptAdminPasswordAction({
    title: 'Delete Custom Role',
    promptText: `Are you sure you want to delete the custom role <strong>'${escapeHtml(roleName)}'</strong>? Enter your administrator password to authorize:`,
    confirmBtnText: 'Authorize & Delete Role',
    btnColor: 'var(--danger-text)',
    onConfirm: async (adminPassword) => {
      const currentUser = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};
      const res = await fetch('../api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_role',
          role_id: roleId,
          role_name: roleName,
          admin_password: adminPassword,
          admin_user_id: currentUser.id || 1,
          admin_username: currentUser.username || 'admin'
        })
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Authorization failed.');

      showToast(result.message || 'Custom role deleted.', 'success');
      await loadUsers();
      renderCustomRolesList();
      return true;
    }
  });
}
