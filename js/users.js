/**
 * Roberice POS & Inventory System - User Management & Access Control Controller
 */

let allUsers = [];

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

document.addEventListener('DOMContentLoaded', () => initUsers());

async function initUsers() {
  bindEventListeners();
  await loadUsers();
}

function bindEventListeners() {
  // Modal Open
  const btnOpenAdd = document.getElementById('btnOpenAddUser');
  if (btnOpenAdd) {
    btnOpenAdd.addEventListener('click', openAddUserModal);
  }

  // Form Submit
  const formUser = document.getElementById('formUser');
  if (formUser) {
    formUser.addEventListener('submit', handleUserFormSubmit);
  }

  // Filter & Search
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

  // Permission Presets
  document.getElementById('btnPresetAdmin')?.addEventListener('click', () => setPermissionCheckboxes(PRESETS.admin));
  document.getElementById('btnPresetCashier')?.addEventListener('click', () => setPermissionCheckboxes(PRESETS.cashier));
  document.getElementById('btnPresetClerk')?.addEventListener('click', () => setPermissionCheckboxes(PRESETS.clerk));
  document.getElementById('btnPresetManager')?.addEventListener('click', () => setPermissionCheckboxes(PRESETS.manager));
  document.getElementById('btnClearPerms')?.addEventListener('click', () => setPermissionCheckboxes([]));

  // Role select changes preset automatically
  const roleSelect = document.getElementById('roleSelect');
  if (roleSelect) {
    roleSelect.addEventListener('change', () => {
      const val = roleSelect.value;
      if (val === 'Admin') setPermissionCheckboxes(PRESETS.admin);
      else if (val === 'Cashier') setPermissionCheckboxes(PRESETS.cashier);
      else if (val === 'Inventory Clerk') setPermissionCheckboxes(PRESETS.clerk);
      else if (val === 'Store Manager') setPermissionCheckboxes(PRESETS.manager);
    });
  }
}

async function loadUsers() {
  showTopLoader();
  try {
    const res = await fetch('../api/users.php');
    if (!res.ok) throw new Error('Failed to retrieve user accounts.');

    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Server error.');

    allUsers = data.users || [];
    updateKpis(allUsers);
    filterUsers();
  } catch (err) {
    console.error('Error loading users:', err);
    showToast('Failed to load users: ' + err.message, 'danger');
  } finally {
    hideTopLoader();
    hidePageLoader();
  }
}

function updateKpis(users) {
  const total = users.length;
  const active = users.filter(u => (u.account_status || 'Active').toLowerCase() === 'active').length;
  const admins = users.filter(u => (u.role || '').toLowerCase() === 'admin').length;
  const staff = total - admins;

  document.getElementById('kpiTotalUsers').textContent = total;
  document.getElementById('kpiActiveUsers').textContent = active;
  document.getElementById('kpiAdminUsers').textContent = admins;
  document.getElementById('kpiStaffUsers').textContent = staff;
}

function filterUsers() {
  const query = (document.getElementById('searchUserInput')?.value || '').toLowerCase().trim();
  const roleVal = document.getElementById('filterUserRole')?.value || 'all';
  const statusVal = document.getElementById('filterUserStatus')?.value || 'all';

  const filtered = allUsers.filter(u => {
    const matchQuery = !query || 
      (u.full_name || '').toLowerCase().includes(query) || 
      (u.username || '').toLowerCase().includes(query);

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
                ${u.full_name}
                ${isSelf ? '<span class="badge badge-info" style="font-size:10px; margin-left:4px;">You</span>' : ''}
              </div>
              <div style="font-size:11.5px; color:var(--text-muted);">
                User ID: #${u.user_id} &bull; ${u.transaction_count || 0} sales recorded
              </div>
            </div>
          </div>
        </td>
        <td><code>${u.username}</code></td>
        <td><span class="badge ${roleBadgeClass}">${u.role}</span></td>
        <td>${permsHtml}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="openEditUserModal(${u.user_id})" title="Edit User & Permissions">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              Edit
            </button>

            ${!isPrimaryAdmin ? `
              <button class="btn btn-secondary btn-sm" onclick="toggleUserStatus(${u.user_id}, '${u.account_status}')" title="${toggleBtnTitle}" style="${isActive ? 'color:var(--danger-text);' : 'color:#059669;'}">
                ${toggleBtnIcon}
                ${isActive ? 'Deactivate' : 'Activate'}
              </button>

              ${u.transaction_count === 0 ? `
                <button class="btn btn-secondary btn-sm" onclick="deleteUser(${u.user_id}, '${encodeURIComponent(u.full_name)}')" title="Delete Account" style="color:var(--danger-text);">
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
  document.getElementById('usernameInput').value = '';
  document.getElementById('passwordInput').value = '';
  document.getElementById('passwordInput').required = true;
  document.getElementById('passwordRequiredStar').style.display = 'inline';
  document.getElementById('passwordHelpText').style.display = 'none';

  document.getElementById('roleSelect').value = 'Cashier';
  document.getElementById('statusSelect').value = 'Active';

  setPermissionCheckboxes(PRESETS.cashier);
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
  document.getElementById('fullNameInput').value = user.full_name;
  document.getElementById('usernameInput').value = user.username;
  document.getElementById('passwordInput').value = '';
  document.getElementById('passwordInput').required = false;
  document.getElementById('passwordRequiredStar').style.display = 'none';
  document.getElementById('passwordHelpText').style.display = 'block';

  document.getElementById('roleSelect').value = user.role || 'Cashier';
  document.getElementById('statusSelect').value = user.account_status || 'Active';

  const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
  setPermissionCheckboxes(userPerms);

  openModal('modalUserForm');
}

async function handleUserFormSubmit(e) {
  e.preventDefault();

  const userId = document.getElementById('userIdInput').value;
  const fullName = document.getElementById('fullNameInput').value.trim();
  const username = document.getElementById('usernameInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const role = document.getElementById('roleSelect').value;
  const account_status = document.getElementById('statusSelect').value;
  const permissions = getSelectedPermissions();

  if (!fullName || !username) {
    showToast('Please fill in all required fields.', 'warning');
    return;
  }

  if (!userId && !password) {
    showToast('Password is required for new accounts.', 'warning');
    return;
  }

  if (permissions.length === 0) {
    if (!confirm('Warning: You have not granted any module permissions to this account. The user will have no access upon signing in. Continue?')) {
      return;
    }
  }

  const isEditing = Boolean(userId);
  const payload = {
    action: isEditing ? 'update' : 'create',
    user_id: isEditing ? parseInt(userId, 10) : undefined,
    full_name: fullName,
    username: username,
    password: password,
    role: role,
    account_status: account_status,
    permissions: permissions
  };

  const btnSave = document.getElementById('btnSaveUser');
  btnSave.disabled = true;
  btnSave.textContent = 'Saving Account...';
  showTopLoader();

  try {
    const res = await fetch('../api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.message || 'Error processing user account.');
    }

    showToast(result.message || 'User saved successfully!', 'success');
    closeModal('modalUserForm');
    await loadUsers();
  } catch (err) {
    console.error('Save user error:', err);
    showToast(err.message, 'danger');
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = 'Save User Account';
    hideTopLoader();
  }
}

async function toggleUserStatus(userId, currentStatus) {
  const isActivating = (currentStatus || 'Active').toLowerCase() !== 'active';
  const actionText = isActivating ? 'activate' : 'deactivate';

  if (!confirm(`Are you sure you want to ${actionText} this user account?`)) {
    return;
  }

  showTopLoader();
  try {
    const res = await fetch('../api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle_status',
        user_id: userId
      })
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message || 'Failed to update status.');

    showToast(result.message || 'Status updated successfully.', 'success');
    await loadUsers();
  } catch (err) {
    console.error('Toggle status error:', err);
    showToast(err.message, 'danger');
  } finally {
    hideTopLoader();
  }
}

async function deleteUser(userId, encodedName) {
  const fullName = decodeURIComponent(encodedName);
  if (!confirm(`Are you sure you want to permanently delete the account for "${fullName}"? This action cannot be undone.`)) {
    return;
  }

  showTopLoader();
  try {
    const res = await fetch('../api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        user_id: userId
      })
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message || 'Failed to delete user.');

    showToast(result.message || 'User deleted successfully.', 'success');
    await loadUsers();
  } catch (err) {
    console.error('Delete user error:', err);
    showToast(err.message, 'danger');
  } finally {
    hideTopLoader();
  }
}
