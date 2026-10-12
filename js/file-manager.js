/**
 * Roberice POS & Inventory System - File Management Controller
 */

let filesCache = [];

document.addEventListener('DOMContentLoaded', () => initFileManager());

async function initFileManager() {
  bindEvents();
  await loadFiles();
}

function bindEvents() {
  const btnUpload = document.getElementById('btnOpenUploadModal');
  if (btnUpload) {
    btnUpload.addEventListener('click', () => {
      document.getElementById('uploadFileForm').reset();
      openModal('modalUploadFile');
    });
  } else {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btnOpenUploadModal')) {
        document.getElementById('uploadFileForm').reset();
        openModal('modalUploadFile');
      }
    });
  }

  document.getElementById('uploadFileForm').addEventListener('submit', handleUploadSubmit);

  const btnBackup = document.getElementById('btnQuickBackup');
  if (btnBackup) {
    btnBackup.addEventListener('click', handleQuickBackup);
  } else {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btnQuickBackup')) handleQuickBackup();
    });
  }

  document.getElementById('searchFile').addEventListener('input', renderFilesTable);
  document.getElementById('filterCategory').addEventListener('change', renderFilesTable);
}

async function loadFiles() {
  try {
    const res = await fetch('api/file_manager.php?action=list');
    if (!res.ok) throw new Error('Failed to load file records.');

    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Error loading files.');

    filesCache = data.files || [];

    // Update Stats
    const stats = data.stats || {};
    document.getElementById('statFileCount').textContent = `${stats.totalFiles || 0} files`;
    document.getElementById('statStorageUsed').textContent = formatBytes(stats.totalSize || 0);

    const latestBackup = filesCache.find(f => f.category === 'Database Backup');
    document.getElementById('statLatestBackup').textContent = latestBackup
      ? formatDateTime(latestBackup.uploaded_at)
      : 'None yet';

    renderFilesTable();
  } catch (e) {
    console.error('Error loading files:', e);
    showToast('Failed to load files: ' + e.message, 'danger');
  }
}

function renderFilesTable() {
  const tbody = document.getElementById('filesTableBody');
  if (!tbody) return;

  const search = document.getElementById('searchFile').value.toLowerCase();
  const category = document.getElementById('filterCategory').value;

  const filtered = filesCache.filter(f => {
    const matchesCategory = category === 'all' || f.category === category;
    const matchesSearch =
      (f.original_name || '').toLowerCase().includes(search) ||
      (f.description || '').toLowerCase().includes(search) ||
      (f.category || '').toLowerCase().includes(search) ||
      (f.uploaded_by || '').toLowerCase().includes(search);

    return matchesCategory && matchesSearch;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No files found matching the criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(f => {
    const ext = (f.original_name.split('.').pop() || '').toLowerCase();
    let typeClass = 'file-type-doc';
    if (ext === 'sql') typeClass = 'file-type-sql';
    else if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') typeClass = 'file-type-csv';
    else if (ext === 'pdf') typeClass = 'file-type-pdf';

    let categoryBadge = `<span class="badge badge-info">${f.category}</span>`;
    if (f.category === 'Database Backup') categoryBadge = `<span class="badge badge-purple" style="background:#f3e8ff;color:#7e22ce;">Database Backup</span>`;
    else if (f.category === 'Supplier Invoice') categoryBadge = `<span class="badge badge-warning">Invoice / DR</span>`;
    else if (f.category === 'Sales Report') categoryBadge = `<span class="badge badge-success">Sales Report</span>`;

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="file-type-icon ${typeClass}">${ext || 'FILE'}</div>
            <div>
              <div style="font-weight:600;color:var(--text-main);">${f.original_name}</div>
              <div style="font-size:11px;color:var(--text-muted);">${f.file_name}</div>
            </div>
          </div>
        </td>
        <td>${categoryBadge}</td>
        <td><strong>${formatBytes(f.file_size)}</strong></td>
        <td style="max-width:240px;color:var(--text-muted);">${f.description || '-'}</td>
        <td><strong>${f.uploaded_by}</strong></td>
        <td>${formatDateTime(f.uploaded_at)}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <a href="../${f.file_path}" target="_blank" download class="btn btn-primary btn-sm" style="text-decoration:none;">
              Download
            </a>
            <button class="btn btn-danger btn-sm" onclick="deleteFileRecord(${f.file_id}, '${f.original_name}')">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleUploadSubmit(e) {
  e.preventDefault();

  const fileInput = document.getElementById('inputFile');
  if (!fileInput.files.length) {
    showToast('Please select a file to upload.', 'warning');
    return;
  }

  const file = fileInput.files[0];
  const category = document.getElementById('inputCategory').value;
  const description = document.getElementById('inputDescription').value.trim();
  const user = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};

  const formData = new FormData();
  formData.append('action', 'upload');
  formData.append('file', file);
  formData.append('category', category);
  formData.append('description', description);
  formData.append('uploader', user.name || 'Admin User');

  const btn = document.getElementById('btnSubmitUpload');
  btn.disabled = true;
  btn.textContent = 'Uploading...';
  showPageLoader('Uploading file and saving record to database...');

  try {
    const res = await fetch('api/file_manager.php', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      showToast(`File "${file.name}" uploaded successfully!`, 'success');
      closeModal('modalUploadFile');
      await loadFiles();
    } else {
      showToast(data.message || 'Upload failed.', 'danger');
    }
  } catch (err) {
    console.error(err);
    showToast('Upload error occurred.', 'danger');
  } finally {
    hidePageLoader();
    btn.disabled = false;
    btn.textContent = 'Upload File';
  }
}

async function handleQuickBackup() {
  const btn = document.getElementById('btnQuickBackup');
  btn.disabled = true;
  btn.innerHTML = 'Creating Backup...';
  showPageLoader('Backing up MySQL database (roberice_db)...');

  const user = JSON.parse(sessionStorage.getItem('roberice_logged_user')) || {};
  const formData = new FormData();
  formData.append('action', 'backup_db');
  formData.append('uploader', user.name || 'Admin User');

  try {
    const res = await fetch('api/file_manager.php', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Database backup created: ${data.file} (${formatBytes(data.size)})`, 'success');
      await loadFiles();
    } else {
      showToast(data.message || 'Backup failed.', 'danger');
    }
  } catch (e) {
    console.error(e);
    showToast('Failed to create database backup.', 'danger');
  } finally {
    hidePageLoader();
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
      One-Click Database Backup
    `;
  }
}

async function deleteFileRecord(fileId, fileName) {
  if (!confirm(`Are you sure you want to permanently delete "${fileName}"?`)) return;

  showPageLoader(`Deleting "${fileName}"...`);

  try {
    const res = await fetch('api/file_manager.php?action=delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Deleted file "${fileName}".`, 'info');
      await loadFiles();
    } else {
      showToast(data.message || 'Unable to delete file.', 'warning');
    }
  } catch (e) {
    console.error(e);
    showToast('Failed to delete file.', 'danger');
  } finally {
    hidePageLoader();
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
