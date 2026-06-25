// Global App State
let currentView = 'dashboard';
let tenantsData = [];
let billsData = [];
let paymentsData = [];
let statsData = {};
let activeTenantDetailsId = null;

// ==========================================
// INITIALIZATION & ROUTING
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  
  // Set current system time
  const timeEl = document.getElementById('system-time');
  if (timeEl) {
    const now = new Date();
    timeEl.innerText = now.toISOString().slice(0,16).replace('T', ' ');
  }

  // Bind Form Submissions
  document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
  document.getElementById('tenant-form').addEventListener('submit', handleTenantSubmit);
  document.getElementById('bill-form').addEventListener('submit', handleBillSubmit);
  document.getElementById('payment-form').addEventListener('submit', handlePaymentSubmit);
  document.getElementById('settings-form').addEventListener('submit', handleSettingsSubmit);

  // Auth toggle click
  document.getElementById('toggle-auth-view').addEventListener('click', toggleAuthMode);
});

async function initApp() {
  if (authApi.isLoggedIn()) {
    showAppView();
    await loadInitialData();
    switchView('dashboard');
  } else {
    showLoginView();
  }
}

function showLoginView() {
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('app-view').style.display = 'none';
}

function showAppView() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('app-view').style.display = 'flex';
  
  // Set Landlord details in sidebar footer
  const user = authApi.getUser();
  document.getElementById('user-display-name').innerText = user.name || 'Landlord';
  
  // Setup User initials avatar
  const initials = (user.name || 'L')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  document.getElementById('user-avatar').innerText = initials;
}

async function loadInitialData() {
  try {
    // Fetch stats, tenants, bills, payments
    statsData = await dashboardApi.getStats();
    tenantsData = await tenantApi.getAll();
    billsData = await billApi.getAll();
    paymentsData = await paymentApi.getAll();
  } catch (err) {
    showToast(err.message || 'Error loading dashboard data', 'error');
  }
}

// Sidebar/View switching
function switchView(viewName) {
  currentView = viewName;
  
  // Hide all sections
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  // Activate matching section
  const section = document.getElementById(`${viewName}-view-sec`);
  if (section) section.classList.add('active');

  // Update navbar title
  const titleMap = {
    dashboard: 'Dashboard',
    tenants: 'Tenants Management',
    bills: 'Monthly Bills & Invoices',
    payments: 'Payments Ledger',
    dues: 'Pending Dues Tracker',
    reports: 'Financial Reports',
    settings: 'Profile & Receipt Settings',
    'tenant-details': 'Tenant Profile Details'
  };
  
  document.getElementById('view-title').innerText = titleMap[viewName] || 'Tenant Billing';

  // Manage sidebar active class
  document.querySelectorAll('.sidebar-menu-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    }
  });

  // Refresh current view specific data
  renderViewData(viewName);

  // Close sidebar on mobile after clicking
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('active')) {
    sidebar.classList.remove('active');
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
}

// Refresh UI based on active view
async function renderViewData(viewName) {
  // Always update core lists
  await loadInitialData();

  if (viewName === 'dashboard') {
    renderDashboard();
  } else if (viewName === 'tenants') {
    renderTenantsList(tenantsData);
  } else if (viewName === 'bills') {
    renderBillsList(billsData);
  } else if (viewName === 'payments') {
    renderPaymentsList(paymentsData);
  } else if (viewName === 'dues') {
    renderDuesList();
  } else if (viewName === 'reports') {
    renderReports();
  } else if (viewName === 'settings') {
    renderSettings();
  } else if (viewName === 'tenant-details') {
    renderTenantDetails(activeTenantDetailsId);
  }
}

// ==========================================
// AUTHENTICATION LOGIC
// ==========================================
let isRegisterMode = false;

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  const title = document.getElementById('auth-title');
  const desc = document.getElementById('auth-desc');
  const btn = document.getElementById('auth-submit-btn');
  const toggleLink = document.getElementById('toggle-auth-view');
  
  if (isRegisterMode) {
    title.innerText = 'Landlord Registration';
    desc.innerText = 'Create your account to start managing rooms & rent';
    btn.innerText = 'Create Account';
    toggleLink.innerText = 'Already have an account? Sign In';
    
    // Add Name Field dynamically if not already added
    if (!document.getElementById('register-name-group')) {
      const nameGroup = document.createElement('div');
      nameGroup.className = 'form-group';
      nameGroup.id = 'register-name-group';
      nameGroup.style.marginBottom = '16px';
      nameGroup.innerHTML = `
        <label for="login-name">Landlord Full Name <span>*</span></label>
        <input type="text" id="login-name" class="form-control" placeholder="Ramanand Sagar" required>
      `;
      document.getElementById('login-form').insertBefore(nameGroup, document.getElementById('login-form').firstChild);
    }
  } else {
    title.innerText = 'Landlord Login';
    desc.innerText = 'Access your rental dashboard and billing system';
    btn.innerText = 'Sign In';
    toggleLink.innerText = 'Create Landlord Account';
    
    const nameGroup = document.getElementById('register-name-group');
    if (nameGroup) nameGroup.remove();
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  try {
    if (isRegisterMode) {
      const name = document.getElementById('login-name').value.trim();
      await authApi.register(name, email, password);
      showToast('Registration successful! Welcome.', 'success');
    } else {
      await authApi.login(email, password);
      showToast('Logged in successfully', 'success');
    }
    showAppView();
    await loadInitialData();
    switchView('dashboard');
  } catch (err) {
    showToast(err.message || 'Authentication failed', 'error');
  }
}

function logout() {
  authApi.logout();
  showToast('Logged out successfully', 'success');
}

// ==========================================
// DASHBOARD RENDERING
// ==========================================
function renderDashboard() {
  // Set stat card values
  document.getElementById('stat-tenants').innerText = statsData.totalActiveTenants || 0;
  document.getElementById('stat-expected-rent').innerText = `₹${(statsData.monthlyExpectedRent || 0).toLocaleString('en-IN')}`;
  document.getElementById('stat-collected').innerText = `₹${(statsData.totalCollected || 0).toLocaleString('en-IN')}`;
  document.getElementById('stat-pending').innerText = `₹${(statsData.totalPending || 0).toLocaleString('en-IN')}`;

  // Draw chart
  renderDashboardChart(statsData.chartData || []);

  // Render recent payments
  const paymentsTable = document.getElementById('recent-payments-table');
  paymentsTable.innerHTML = '';
  if (!statsData.recentPayments || statsData.recentPayments.length === 0) {
    paymentsTable.innerHTML = `<tr><td colspan="3" class="text-muted" style="text-align:center;">No recent payments</td></tr>`;
  } else {
    statsData.recentPayments.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.tenantName}</strong></td>
        <td><span class="badge badge-active" style="background:#e0f2fe; color:#0369a1;">${p.roomNumber}</span></td>
        <td class="text-right" style="color:var(--success); font-weight:700;">+₹${p.amountPaid}</td>
      `;
      paymentsTable.appendChild(tr);
    });
  }

  // Render recent bills
  const billsTable = document.getElementById('recent-bills-table');
  billsTable.innerHTML = '';
  if (!statsData.recentBills || statsData.recentBills.length === 0) {
    billsTable.innerHTML = `<tr><td colspan="8" class="text-muted" style="text-align:center;">No recent bills</td></tr>`;
  } else {
    statsData.recentBills.forEach(b => {
      const statusClass = b.paymentStatus === 'Paid' ? 'paid' : (b.paymentStatus === 'Partially Paid' ? 'partial' : 'unpaid');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${b.billNumber}</strong></td>
        <td>${b.tenantName}</td>
        <td>${b.roomNumber}</td>
        <td>${b.billingMonth}</td>
        <td style="font-weight:600;">₹${b.totalAmount}</td>
        <td style="color:var(--danger); font-weight:600;">₹${b.pendingAmount}</td>
        <td><span class="badge badge-${statusClass}">${b.paymentStatus}</span></td>
        <td>
          <div class="action-cell">
            <span class="action-link" onclick="viewReceiptFromBill('${b._id}')" title="Print/View Receipt"><i class="fa-solid fa-receipt"></i></span>
            <span class="action-link" onclick="openBillModal('${b._id}')" title="Edit Bill"><i class="fa-solid fa-pen-to-square"></i></span>
          </div>
        </td>
      `;
      billsTable.appendChild(tr);
    });
  }
}

function renderDashboardChart(chartData) {
  const container = document.getElementById('chart-container');
  container.innerHTML = '';
  
  if (chartData.length === 0) {
    container.innerHTML = `<div class="text-muted" style="margin: auto;">Not enough data to display chart trends.</div>`;
    return;
  }

  // Find max value to calibrate bar heights
  let maxVal = 0;
  chartData.forEach(d => {
    if (d.expected > maxVal) maxVal = d.expected;
    if (d.collected > maxVal) maxVal = d.collected;
  });
  if (maxVal === 0) maxVal = 10000;

  chartData.forEach(d => {
    const expectedHeight = (d.expected / maxVal) * 100;
    const collectedHeight = (d.collected / maxVal) * 100;
    
    // Format Month "YYYY-MM" to readable "Jan 26"
    const [year, month] = d.month.split('-');
    const dateObj = new Date(year, parseInt(month) - 1, 1);
    const label = dateObj.toLocaleString('en-US', { month: 'short' }) + ' ' + year.slice(2);

    const barGroup = document.createElement('div');
    barGroup.className = 'chart-bar-group';
    barGroup.innerHTML = `
      <div class="chart-bars-wrap">
        <div class="chart-bar expected" style="height: ${expectedHeight}%;" title="Expected: ₹${d.expected}"></div>
        <div class="chart-bar collected" style="height: ${collectedHeight}%;" title="Collected: ₹${d.collected}"></div>
      </div>
      <div class="chart-label">${label}</div>
    `;
    container.appendChild(barGroup);
  });
}

// ==========================================
// TENANTS MODULE
// ==========================================
function renderTenantsList(list) {
  const tableBody = document.getElementById('tenants-table-body');
  tableBody.innerHTML = '';
  
  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <div class="empty-state-icon"><i class="fa-solid fa-users"></i></div>
      <div class="empty-state-title">No tenants added yet</div>
      <div class="empty-state-desc">Start adding room renting tenants to generate invoices and manage deposits.</div>
      <button class="btn btn-primary btn-sm" onclick="openTenantModal()">Add First Tenant</button>
    </div></td></tr>`;
    return;
  }

  list.forEach(t => {
    const statusClass = t.status === 'Active' ? 'active' : 'left';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${t.tenantName}</strong></td>
      <td><span class="badge badge-active" style="background:#e0f2fe; color:#0369a1;">${t.roomNumber}</span></td>
      <td>${t.mobile}</td>
      <td>${new Date(t.rentStartDate).toLocaleDateString('en-IN')}</td>
      <td style="font-weight:600;">₹${t.monthlyRent}</td>
      <td>₹${t.securityDeposit || 0}</td>
      <td><span class="badge badge-${statusClass}">${t.status}</span></td>
      <td>
        <div class="action-cell">
          <span class="action-link" onclick="viewTenantDetails('${t._id}')" title="View Details"><i class="fa-solid fa-eye"></i></span>
          <span class="action-link" onclick="openTenantModal('${t._id}')" title="Edit Tenant"><i class="fa-solid fa-pen-to-square"></i></span>
          <span class="action-link" onclick="triggerGenBillForTenant('${t._id}')" title="Generate Bill"><i class="fa-solid fa-file-circle-plus"></i></span>
          <span class="action-link delete" onclick="confirmDeleteTenant('${t._id}')" title="Delete Tenant"><i class="fa-solid fa-trash"></i></span>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function filterTenants() {
  const searchVal = document.getElementById('tenant-search').value.toLowerCase();
  const statusVal = document.getElementById('tenant-filter-status').value;

  const filtered = tenantsData.filter(t => {
    const matchesSearch = t.tenantName.toLowerCase().includes(searchVal) || 
                          t.roomNumber.toLowerCase().includes(searchVal) || 
                          t.mobile.toLowerCase().includes(searchVal);
    const matchesStatus = statusVal === 'All' || t.status === statusVal;
    return matchesSearch && matchesStatus;
  });

  renderTenantsList(filtered);
}

// Modal open/close for Tenant
function openTenantModal(id = null) {
  const modal = document.getElementById('tenant-modal');
  const title = document.getElementById('tenant-modal-title');
  const form = document.getElementById('tenant-form');
  form.reset();
  
  if (id) {
    title.innerText = 'Edit Tenant Details';
    const tenant = tenantsData.find(t => t._id === id);
    if (tenant) {
      document.getElementById('tenant-id-input').value = tenant._id;
      document.getElementById('t-name').value = tenant.tenantName;
      document.getElementById('t-room').value = tenant.roomNumber;
      document.getElementById('t-mobile').value = tenant.mobile;
      document.getElementById('t-alt-mobile').value = tenant.alternateMobile || '';
      document.getElementById('t-idproof').value = tenant.idProof || '';
      document.getElementById('t-rent').value = tenant.monthlyRent;
      document.getElementById('t-deposit').value = tenant.securityDeposit || 0;
      document.getElementById('t-start-date').value = tenant.rentStartDate.split('T')[0];
      document.getElementById('t-status').value = tenant.status;
      document.getElementById('t-address').value = tenant.address;
      document.getElementById('t-notes').value = tenant.notes || '';
    }
  } else {
    title.innerText = 'Add New Tenant';
    document.getElementById('tenant-id-input').value = '';
    document.getElementById('t-status').value = 'Active';
    // Default rent start date to today
    document.getElementById('t-start-date').value = new Date().toISOString().split('T')[0];
  }
  
  modal.classList.add('active');
}

function closeTenantModal() {
  document.getElementById('tenant-modal').classList.remove('active');
}

async function handleTenantSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('tenant-id-input').value;
  
  const tenantData = {
    tenantName: document.getElementById('t-name').value.trim(),
    roomNumber: document.getElementById('t-room').value.trim(),
    mobile: document.getElementById('t-mobile').value.trim(),
    alternateMobile: document.getElementById('t-alt-mobile').value.trim(),
    idProof: document.getElementById('t-idproof').value.trim(),
    monthlyRent: parseFloat(document.getElementById('t-rent').value),
    securityDeposit: parseFloat(document.getElementById('t-deposit').value) || 0,
    rentStartDate: document.getElementById('t-start-date').value,
    status: document.getElementById('t-status').value,
    address: document.getElementById('t-address').value.trim(),
    notes: document.getElementById('t-notes').value.trim()
  };

  try {
    if (id) {
      await tenantApi.update(id, tenantData);
      showToast('Tenant updated successfully', 'success');
    } else {
      await tenantApi.create(tenantData);
      showToast('Tenant added successfully', 'success');
    }
    closeTenantModal();
    renderViewData(currentView);
  } catch (err) {
    showToast(err.message || 'Error saving tenant info', 'error');
  }
}

function confirmDeleteTenant(id) {
  const tenant = tenantsData.find(t => t._id === id);
  if (!tenant) return;
  
  openConfirmModal(
    `Are you sure you want to delete tenant <strong>${tenant.tenantName}</strong>? This will permanently delete the profile, all billing history, and payment transactions associated with them.`,
    async () => {
      try {
        await tenantApi.delete(id);
        showToast('Tenant and bills deleted successfully', 'success');
        closeConfirmModal();
        renderViewData(currentView);
      } catch (err) {
        showToast(err.message || 'Error deleting tenant', 'error');
      }
    }
  );
}

// ==========================================
// TENANT DETAILS VIEW
// ==========================================
async function viewTenantDetails(tenantId) {
  activeTenantDetailsId = tenantId;
  switchView('tenant-details');
}

async function renderTenantDetails(tenantId) {
  try {
    const data = await tenantApi.getById(tenantId);
    const { tenant, bills, payments, totalPending } = data;
    
    // Set Profile Personal Details
    document.getElementById('detail-tenant-name').innerText = tenant.tenantName;
    const statusBadge = document.getElementById('detail-tenant-status-badge');
    statusBadge.innerHTML = tenant.status === 'Active' 
      ? `<span class="badge badge-active">Active</span>` 
      : `<span class="badge badge-left">Left (Inactive)</span>`;
      
    document.getElementById('detail-room').innerText = tenant.roomNumber;
    document.getElementById('detail-mobile').innerText = tenant.mobile;
    document.getElementById('detail-alt-mobile').innerText = tenant.alternateMobile || '-';
    document.getElementById('detail-idproof').innerText = tenant.idProof || '-';
    document.getElementById('detail-start-date').innerText = new Date(tenant.rentStartDate).toLocaleDateString('en-IN');
    document.getElementById('detail-rent').innerText = `₹${tenant.monthlyRent.toLocaleString('en-IN')}`;
    document.getElementById('detail-deposit').innerText = `₹${(tenant.securityDeposit || 0).toLocaleString('en-IN')}`;
    document.getElementById('detail-address').innerText = tenant.address;
    document.getElementById('detail-notes').innerText = tenant.notes || 'No remarks recorded.';
    
    // Outstanding dues
    const pendingText = document.getElementById('detail-total-pending');
    pendingText.innerText = `₹${totalPending.toLocaleString('en-IN')}`;
    if (totalPending > 0) {
      pendingText.className = 'red-text';
      document.getElementById('detail-collect-dues-btn').style.display = 'block';
      document.getElementById('detail-collect-dues-btn').onclick = () => {
        openPaymentModalForTenant(tenant._id);
      };
    } else {
      pendingText.className = '';
      document.getElementById('detail-collect-dues-btn').style.display = 'none';
    }

    // Bind edit profile / generate bill links
    document.getElementById('detail-edit-tenant-btn').onclick = () => openTenantModal(tenant._id);
    document.getElementById('detail-gen-bill-btn').onclick = () => triggerGenBillForTenant(tenant._id);

    // Bill History Table
    const billHistoryBody = document.getElementById('detail-bills-table-body');
    billHistoryBody.innerHTML = '';
    if (bills.length === 0) {
      billHistoryBody.innerHTML = `<tr><td colspan="7" class="text-muted" style="text-align:center;">No bills generated for this tenant.</td></tr>`;
    } else {
      bills.forEach(b => {
        const statusClass = b.paymentStatus === 'Paid' ? 'paid' : (b.paymentStatus === 'Partially Paid' ? 'partial' : 'unpaid');
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${b.billNumber}</strong></td>
          <td>${b.billingMonth}</td>
          <td style="font-weight:600;">₹${b.totalAmount}</td>
          <td style="color:var(--success);">₹${b.amountPaid || 0}</td>
          <td style="color:var(--danger); font-weight:600;">₹${b.pendingAmount}</td>
          <td><span class="badge badge-${statusClass}">${b.paymentStatus}</span></td>
          <td>
            <div class="action-cell">
              <span class="action-link" onclick="viewReceiptFromBill('${b._id}')" title="Receipt"><i class="fa-solid fa-receipt"></i></span>
              <span class="action-link" onclick="openBillModal('${b._id}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></span>
            </div>
          </td>
        `;
        billHistoryBody.appendChild(tr);
      });
    }

    // Payment History Table
    const paymentHistoryBody = document.getElementById('detail-payments-table-body');
    paymentHistoryBody.innerHTML = '';
    if (payments.length === 0) {
      paymentHistoryBody.innerHTML = `<tr><td colspan="6" class="text-muted" style="text-align:center;">No payment receipts logged.</td></tr>`;
    } else {
      payments.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${p.paymentNumber || 'N/A'}</strong></td>
          <td>${new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
          <td><span class="badge badge-active" style="background:#f1f5f9; color:#475569;">${p.paymentMethod}</span></td>
          <td style="font-weight:700; color:var(--success);">₹${p.amountPaid}</td>
          <td><span style="font-size:0.75rem; color:var(--text-secondary);">${p.transactionReference || '-'}</span></td>
          <td>
            <div class="action-cell">
              <span class="action-link" onclick="viewReceipt('${p._id}')" title="View/Print Receipt"><i class="fa-solid fa-print"></i></span>
            </div>
          </td>
        `;
        paymentHistoryBody.appendChild(tr);
      });
    }
  } catch (err) {
    showToast('Error loading tenant profile details', 'error');
  }
}

// ==========================================
// MONTHLY BILL GENERATION MODULE
// ==========================================
function renderBillsList(list) {
  const tableBody = document.getElementById('bills-table-body');
  tableBody.innerHTML = '';
  
  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="9"><div class="empty-state">
      <div class="empty-state-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
      <div class="empty-state-title">No rent bills generated</div>
      <div class="empty-state-desc">Generate monthly bills including electricity, water, and maintenance for your tenants.</div>
      <button class="btn btn-primary btn-sm" onclick="openBillModal()">Generate First Bill</button>
    </div></td></tr>`;
    return;
  }

  // Pre-load tenant map
  const tenantMap = {};
  tenantsData.forEach(t => {
    tenantMap[t._id.toString()] = { name: t.tenantName, room: t.roomNumber };
  });

  list.forEach(b => {
    const tenantInfo = tenantMap[b.tenantId.toString()] || { name: 'Deleted Tenant', room: 'N/A' };
    const statusClass = b.paymentStatus === 'Paid' ? 'paid' : (b.paymentStatus === 'Partially Paid' ? 'partial' : 'unpaid');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${b.billNumber}</strong></td>
      <td><strong>${tenantInfo.name}</strong></td>
      <td><span class="badge badge-active" style="background:#e0f2fe; color:#0369a1;">${tenantInfo.room}</span></td>
      <td>${b.billingMonth}</td>
      <td style="font-weight:600;">₹${b.totalAmount}</td>
      <td style="color:var(--success);">₹${b.amountPaid || 0}</td>
      <td style="color:var(--danger); font-weight:600;">₹${b.pendingAmount}</td>
      <td><span class="badge badge-${statusClass}">${b.paymentStatus}</span></td>
      <td>
        <div class="action-cell">
          <span class="action-link" onclick="viewReceiptFromBill('${b._id}')" title="Print/View Receipt"><i class="fa-solid fa-receipt"></i></span>
          <span class="action-link" onclick="openBillModal('${b._id}')" title="Edit Bill"><i class="fa-solid fa-pen-to-square"></i></span>
          <span class="action-link delete" onclick="confirmDeleteBill('${b._id}')" title="Delete Bill"><i class="fa-solid fa-trash"></i></span>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function filterBills() {
  const searchVal = document.getElementById('bill-search').value.toLowerCase();
  const statusVal = document.getElementById('bill-filter-status').value;
  const monthVal = document.getElementById('bill-filter-month').value; // YYYY-MM

  // Pre-load tenant map
  const tenantMap = {};
  tenantsData.forEach(t => {
    tenantMap[t._id.toString()] = { name: t.tenantName };
  });

  const filtered = billsData.filter(b => {
    const tenantInfo = tenantMap[b.tenantId.toString()] || { name: '' };
    const matchesSearch = b.billNumber.toLowerCase().includes(searchVal) || 
                          tenantInfo.name.toLowerCase().includes(searchVal);
    const matchesStatus = statusVal === 'All' || b.paymentStatus === statusVal;
    const matchesMonth = !monthVal || b.billingMonth === monthVal;
    return matchesSearch && matchesStatus && matchesMonth;
  });

  renderBillsList(filtered);
}

// Open Bill Generation Modal
async function openBillModal(id = null) {
  const modal = document.getElementById('bill-modal');
  const title = document.getElementById('bill-modal-title');
  const form = document.getElementById('bill-form');
  form.reset();

  // Populate Tenant dropdown list
  const tenantSelect = document.getElementById('b-tenant');
  tenantSelect.innerHTML = `<option value="">-- Choose Tenant --</option>`;
  // Only include active tenants unless we are editing a bill for an inactive tenant
  tenantsData.forEach(t => {
    if (t.status === 'Active' || (id && billsData.find(b => b._id === id)?.tenantId === t._id)) {
      tenantSelect.innerHTML += `<option value="${t._id}">${t.tenantName} (${t.roomNumber})</option>`;
    }
  });

  // Enable select
  tenantSelect.removeAttribute('disabled');

  if (id) {
    title.innerText = 'Edit Monthly Rent Bill';
    const bill = billsData.find(b => b._id === id);
    if (bill) {
      document.getElementById('bill-id-input').value = bill._id;
      document.getElementById('b-tenant').value = bill.tenantId;
      document.getElementById('b-tenant').setAttribute('disabled', 'true'); // Disallow tenant changing on edit
      document.getElementById('b-month').value = bill.billingMonth;
      document.getElementById('b-number').value = bill.billNumber;
      document.getElementById('b-rent').value = bill.rentAmount;
      document.getElementById('b-elec').value = bill.electricityBill;
      document.getElementById('b-water').value = bill.waterBill;
      document.getElementById('b-maint').value = bill.maintenanceCharge;
      document.getElementById('b-other').value = bill.otherCharges;
      document.getElementById('b-dues').value = bill.previousPending;
      document.getElementById('b-discount').value = bill.discount;
      document.getElementById('b-advance').value = bill.advanceAdjustment;
      document.getElementById('b-total').value = bill.totalAmount;
      document.getElementById('b-notes').value = bill.notes || '';
    }
  } else {
    title.innerText = 'Generate Monthly Rent Bill';
    document.getElementById('bill-id-input').value = '';
    document.getElementById('b-number').value = '';
    // Auto-select current month (YYYY-MM)
    const now = new Date();
    const curMonthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('b-month').value = curMonthStr;
    
    document.getElementById('b-rent').value = 0;
    document.getElementById('b-elec').value = 0;
    document.getElementById('b-water').value = 0;
    document.getElementById('b-maint').value = 0;
    document.getElementById('b-other').value = 0;
    document.getElementById('b-dues').value = 0;
    document.getElementById('b-discount').value = 0;
    document.getElementById('b-advance').value = 0;
    document.getElementById('b-total').value = 0;
  }

  document.getElementById('bill-overwrite-flag').value = 'false';
  modal.classList.add('active');
}

function closeBillModal() {
  document.getElementById('bill-modal').classList.remove('active');
}

function triggerGenBillForTenant(tenantId) {
  // Go to bills view
  switchView('bills');
  // Open modal and pre-fill tenant
  openBillModal().then(() => {
    document.getElementById('b-tenant').value = tenantId;
    onBillTenantSelect();
  });
}

// Calculate the total rent bill using the formula
function calculateBillTotal() {
  const rent = parseFloat(document.getElementById('b-rent').value) || 0;
  const elec = parseFloat(document.getElementById('b-elec').value) || 0;
  const water = parseFloat(document.getElementById('b-water').value) || 0;
  const maint = parseFloat(document.getElementById('b-maint').value) || 0;
  const other = parseFloat(document.getElementById('b-other').value) || 0;
  const dues = parseFloat(document.getElementById('b-dues').value) || 0;
  const discount = parseFloat(document.getElementById('b-discount').value) || 0;
  const advance = parseFloat(document.getElementById('b-advance').value) || 0;

  const total = rent + elec + water + maint + other + dues - discount - advance;
  document.getElementById('b-total').value = Math.max(0, total);
}

// Handle Tenant selection: Auto-fill rent, previous dues, and next bill number
async function onBillTenantSelect() {
  const tenantId = document.getElementById('b-tenant').value;
  if (!tenantId) return;

  try {
    const suggestions = await billApi.getSuggestDues(tenantId);
    
    // Auto-fill values
    document.getElementById('b-rent').value = suggestions.monthlyRent;
    document.getElementById('b-dues').value = suggestions.previousPending;
    document.getElementById('b-number').value = suggestions.nextBillNumber;
    
    calculateBillTotal();
  } catch (err) {
    showToast('Failed to retrieve tenant billing defaults', 'error');
  }
}

async function handleBillSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('bill-id-input').value;
  const overwrite = document.getElementById('bill-overwrite-flag').value === 'true';

  const billData = {
    tenantId: document.getElementById('b-tenant').value,
    billingMonth: document.getElementById('b-month').value,
    rentAmount: parseFloat(document.getElementById('b-rent').value),
    electricityBill: parseFloat(document.getElementById('b-elec').value) || 0,
    waterBill: parseFloat(document.getElementById('b-water').value) || 0,
    maintenanceCharge: parseFloat(document.getElementById('b-maint').value) || 0,
    otherCharges: parseFloat(document.getElementById('b-other').value) || 0,
    previousPending: parseFloat(document.getElementById('b-dues').value) || 0,
    discount: parseFloat(document.getElementById('b-discount').value) || 0,
    advanceAdjustment: parseFloat(document.getElementById('b-advance').value) || 0,
    notes: document.getElementById('b-notes').value.trim(),
    overwrite
  };

  try {
    if (id) {
      await billApi.update(id, billData);
      showToast('Rent bill invoice updated successfully', 'success');
    } else {
      await billApi.create(billData);
      showToast('Rent bill invoice generated successfully', 'success');
    }
    closeBillModal();
    renderViewData(currentView);
  } catch (err) {
    if (err.status === 409) {
      // Duplicate bill detected
      openConfirmModal(
        err.message + ' Overwriting will re-calculate the bill based on these new charges and retain previous payments.',
        async () => {
          document.getElementById('bill-overwrite-flag').value = 'true';
          closeConfirmModal();
          // Re-submit
          const submitEvent = new Event('submit', { cancelable: true });
          document.getElementById('bill-form').dispatchEvent(submitEvent);
        },
        'Yes, Overwrite'
      );
    } else {
      showToast(err.message || 'Error creating rent bill', 'error');
    }
  }
}

function confirmDeleteBill(id) {
  openConfirmModal(
    'Are you sure you want to delete this bill? This will also remove any payment transactions collected against this invoice.',
    async () => {
      try {
        await billApi.delete(id);
        showToast('Bill invoice deleted successfully', 'success');
        closeConfirmModal();
        renderViewData(currentView);
      } catch (err) {
        showToast(err.message || 'Error deleting bill invoice', 'error');
      }
    }
  );
}

// ==========================================
// PAYMENT LEDGER MODULE
// ==========================================
function renderPaymentsList(list) {
  const tableBody = document.getElementById('payments-table-body');
  tableBody.innerHTML = '';
  
  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <div class="empty-state-icon"><i class="fa-solid fa-receipt"></i></div>
      <div class="empty-state-title">No payments collected yet</div>
      <div class="empty-state-desc">Record full or partial rent collections against generated bills.</div>
      <button class="btn btn-success btn-sm" onclick="openPaymentModal()">Record Payment</button>
    </div></td></tr>`;
    return;
  }

  // Pre-load mappings
  const tenantMap = {};
  tenantsData.forEach(t => { tenantMap[t._id.toString()] = { name: t.tenantName, room: t.roomNumber }; });

  list.forEach(p => {
    const tenantInfo = tenantMap[p.tenantId.toString()] || { name: 'Deleted Tenant', room: 'N/A' };
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${p.paymentNumber || 'N/A'}</strong></td>
      <td><strong>${tenantInfo.name}</strong></td>
      <td><span class="badge badge-active" style="background:#e0f2fe; color:#0369a1;">${tenantInfo.room}</span></td>
      <td>${new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
      <td><span class="badge badge-active" style="background:#f1f5f9; color:#475569;">${p.paymentMethod}</span></td>
      <td><span style="font-size:0.8rem; font-weight:600; color:var(--text-secondary);">${p.transactionReference || '-'}</span></td>
      <td style="font-weight:700; color:var(--success);">₹${p.amountPaid}</td>
      <td>
        <div class="action-cell">
          <span class="action-link" onclick="viewReceipt('${p._id}')" title="Print Receipt"><i class="fa-solid fa-print"></i></span>
          <span class="action-link" onclick="openPaymentModal('${p._id}')" title="Edit Payment"><i class="fa-solid fa-pen-to-square"></i></span>
          <span class="action-link delete" onclick="confirmDeletePayment('${p._id}')" title="Delete Payment"><i class="fa-solid fa-trash"></i></span>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function filterPayments() {
  const searchVal = document.getElementById('payment-search').value.toLowerCase();
  const methodVal = document.getElementById('payment-filter-method').value;

  const tenantMap = {};
  tenantsData.forEach(t => { tenantMap[t._id.toString()] = { name: t.tenantName }; });

  const filtered = paymentsData.filter(p => {
    const tenantInfo = tenantMap[p.tenantId.toString()] || { name: '' };
    const matchesSearch = (p.paymentNumber && p.paymentNumber.toLowerCase().includes(searchVal)) || 
                          tenantInfo.name.toLowerCase().includes(searchVal);
    const matchesMethod = methodVal === 'All' || p.paymentMethod === methodVal;
    return matchesSearch && matchesMethod;
  });

  renderPaymentsList(filtered);
}

// Open Collect Payment Modal
async function openPaymentModal(id = null) {
  const modal = document.getElementById('payment-overlay'); // Wait, the ID in HTML is payment-modal
  const actualModal = document.getElementById('payment-modal');
  const title = document.getElementById('payment-modal-title');
  const form = document.getElementById('payment-form');
  form.reset();

  document.getElementById('payment-bill-stats-row').style.display = 'none';

  // Populate Tenant dropdown list (Active ones first)
  const tenantSelect = document.getElementById('p-tenant');
  tenantSelect.innerHTML = `<option value="">-- Choose Tenant --</option>`;
  tenantsData.forEach(t => {
    tenantSelect.innerHTML += `<option value="${t._id}">${t.tenantName} (${t.roomNumber})</option>`;
  });

  // Enable fields
  tenantSelect.removeAttribute('disabled');
  document.getElementById('p-bill').removeAttribute('disabled');

  if (id) {
    title.innerText = 'Edit Payment Record';
    const payment = paymentsData.find(p => p._id === id);
    if (payment) {
      document.getElementById('payment-id-input').value = payment._id;
      
      document.getElementById('p-tenant').value = payment.tenantId;
      document.getElementById('p-tenant').setAttribute('disabled', 'true');
      
      await onPaymentTenantSelect(payment.billId);
      document.getElementById('p-bill').value = payment.billId;
      document.getElementById('p-bill').setAttribute('disabled', 'true');
      
      document.getElementById('p-date').value = payment.paymentDate.split('T')[0];
      document.getElementById('p-amount').value = payment.amountPaid;
      document.getElementById('p-method').value = payment.paymentMethod;
      document.getElementById('p-reference').value = payment.transactionReference || '';
      document.getElementById('p-notes').value = payment.notes || '';
    }
  } else {
    title.innerText = 'Record Dues Payment';
    document.getElementById('payment-id-input').value = '';
    // Set date to today
    document.getElementById('p-date').value = new Date().toISOString().split('T')[0];
  }

  actualModal.classList.add('active');
}

function openPaymentModalForTenant(tenantId) {
  switchView('payments');
  openPaymentModal().then(() => {
    document.getElementById('p-tenant').value = tenantId;
    onPaymentTenantSelect();
  });
}

function closePaymentModal() {
  document.getElementById('payment-modal').classList.remove('active');
}

// Triggered when Tenant is selected in Payment form: populated unpaid/partial bills list
async function onPaymentTenantSelect(preselectedBillId = null) {
  const tenantId = document.getElementById('p-tenant').value;
  const billSelect = document.getElementById('p-bill');
  billSelect.innerHTML = `<option value="">-- Choose Invoice --</option>`;
  document.getElementById('payment-bill-stats-row').style.display = 'none';

  if (!tenantId) return;

  // Filter bills for this tenant that are Unpaid or Partially Paid
  // Also include the preselected bill if we are editing
  const tenantBills = billsData.filter(b => {
    return b.tenantId.toString() === tenantId.toString() && 
           (b.paymentStatus !== 'Paid' || (preselectedBillId && b._id.toString() === preselectedBillId.toString()));
  });

  tenantBills.forEach(b => {
    billSelect.innerHTML += `<option value="${b._id}">${b.billNumber} (${b.billingMonth}) - Pending: ₹${b.pendingAmount}</option>`;
  });
}

// Triggered when Bill is selected in Payment form: show pending statistics
function onPaymentBillSelect() {
  const billId = document.getElementById('p-bill').value;
  const statsRow = document.getElementById('payment-bill-stats-row');
  
  if (!billId) {
    statsRow.style.display = 'none';
    return;
  }

  const bill = billsData.find(b => b._id === billId);
  if (bill) {
    document.getElementById('p-bill-total').innerText = `₹${bill.totalAmount}`;
    document.getElementById('p-bill-paid').innerText = `₹${bill.amountPaid || 0}`;
    document.getElementById('p-bill-pending').innerText = `₹${bill.pendingAmount}`;
    
    // Auto-fill amount collected with remaining pending balance
    document.getElementById('p-amount').value = bill.pendingAmount;
    document.getElementById('p-amount').setAttribute('max', bill.pendingAmount);

    statsRow.style.display = 'block';
  }
}

async function handlePaymentSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('payment-id-input').value;
  
  const paymentData = {
    tenantId: document.getElementById('p-tenant').value,
    billId: document.getElementById('p-bill').value,
    paymentDate: document.getElementById('p-date').value,
    amountPaid: parseFloat(document.getElementById('p-amount').value),
    paymentMethod: document.getElementById('p-method').value,
    transactionReference: document.getElementById('p-reference').value.trim(),
    notes: document.getElementById('p-notes').value.trim()
  };

  try {
    if (id) {
      await paymentApi.update(id, paymentData);
      showToast('Payment record updated successfully', 'success');
    } else {
      await paymentApi.create(paymentData);
      showToast('Payment collected successfully', 'success');
    }
    closePaymentModal();
    renderViewData(currentView);
  } catch (err) {
    showToast(err.message || 'Error recording payment', 'error');
  }
}

function confirmDeletePayment(id) {
  openConfirmModal(
    'Are you sure you want to delete this payment record? This will adjust the bill invoice status and re-open the pending balances.',
    async () => {
      try {
        await paymentApi.delete(id);
        showToast('Payment record deleted successfully', 'success');
        closeConfirmModal();
        renderViewData(currentView);
      } catch (err) {
        showToast(err.message || 'Error deleting payment record', 'error');
      }
    }
  );
}

// ==========================================
// PENDING DUES TRACKER MODULE
// ==========================================
function renderDuesList() {
  const tableBody = document.getElementById('dues-table-body');
  tableBody.innerHTML = '';

  // Group bills by tenant to calculate their current overall outstanding dues
  const tenantDues = {};
  
  // Initialize map with active tenants
  tenantsData.forEach(t => {
    tenantDues[t._id.toString()] = {
      tenantId: t._id,
      name: t.tenantName,
      room: t.roomNumber,
      mobile: t.mobile,
      status: t.status,
      pendingTotal: 0,
      lastPaymentDate: 'No payments'
    };
  });

  // Accumulate pending bill amounts
  billsData.forEach(b => {
    if (tenantDues[b.tenantId.toString()]) {
      tenantDues[b.tenantId.toString()].pendingTotal += b.pendingAmount || 0;
    }
  });

  // Attach last payment date
  paymentsData.forEach(p => {
    if (tenantDues[p.tenantId.toString()]) {
      const pDate = new Date(p.paymentDate);
      const currentLast = tenantDues[p.tenantId.toString()].lastPaymentDate;
      if (currentLast === 'No payments' || pDate > new Date(currentLast)) {
        tenantDues[p.tenantId.toString()].lastPaymentDate = p.paymentDate.split('T')[0];
      }
    }
  });

  // Filter out tenants with 0 dues
  let duesList = Object.values(tenantDues).filter(d => d.pendingTotal > 0);

  if (duesList.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <div class="empty-state-icon" style="color:var(--success);"><i class="fa-solid fa-circle-check"></i></div>
      <div class="empty-state-title">All dues cleared!</div>
      <div class="empty-state-desc">Awesome! None of the tenants have outstanding rent balances.</div>
    </div></td></tr>`;
    return;
  }

  // Handle Sort
  const sortVal = document.getElementById('dues-sort').value;
  if (sortVal === 'highest') {
    duesList.sort((a, b) => b.pendingTotal - a.pendingTotal);
  } else if (sortVal === 'alphabetical') {
    duesList.sort((a, b) => a.name.localeCompare(b.name));
  }

  duesList.forEach(d => {
    // Check if dues are high (e.g. > 10,000 or any arbitrary value) to display name or amount in red
    const isHighDues = d.pendingTotal >= 8000;
    const duesClass = isHighDues ? 'red-text' : '';
    const statusClass = d.status === 'Active' ? 'active' : 'left';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${d.name}</strong></td>
      <td><span class="badge badge-active" style="background:#e0f2fe; color:#0369a1;">${d.room}</span></td>
      <td>${d.mobile}</td>
      <td><span class="badge badge-${statusClass}">${d.status}</span></td>
      <td class="${duesClass}" style="font-size:1rem; font-weight:700;">₹${d.pendingTotal.toLocaleString('en-IN')}</td>
      <td style="font-size:0.8rem; font-weight:600; color:var(--text-secondary);">${d.lastPaymentDate}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="openPaymentModalForTenant('${d.tenantId}')">Collect Payment</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function filterDues() {
  // Simple trigger to re-render using sort and search filters
  const searchVal = document.getElementById('dues-search').value.toLowerCase();
  
  // Temporarily backup tenantsData, filter and restore
  const originalTenants = [...tenantsData];
  tenantsData = originalTenants.filter(t => {
    return t.tenantName.toLowerCase().includes(searchVal) || 
           t.roomNumber.toLowerCase().includes(searchVal);
  });

  renderDuesList();
  tenantsData = originalTenants;
}

// ==========================================
// REPORTS & CSV EXPORT
// ==========================================
function renderReports() {
  // Calculate collection rate
  let totalExpected = 0;
  let totalCollected = 0;
  let currentMonthCollected = 0;

  const now = new Date();
  const curMonthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

  billsData.forEach(b => {
    totalExpected += b.totalAmount || 0;
    totalCollected += b.amountPaid || 0;
    
    if (b.billingMonth === curMonthStr) {
      currentMonthCollected += b.amountPaid || 0;
    }
  });

  const rate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  
  document.getElementById('report-collection-rate').innerText = `${rate}%`;
  document.getElementById('report-month-collected').innerText = `₹${currentMonthCollected.toLocaleString('en-IN')}`;
  document.getElementById('report-total-dues').innerText = `₹${(totalExpected - totalCollected).toLocaleString('en-IN')}`;

  // Month-wise aggregation
  const monthData = {};
  billsData.forEach(b => {
    const month = b.billingMonth;
    if (!monthData[month]) {
      monthData[month] = { month, expected: 0, collected: 0, pending: 0 };
    }
    monthData[month].expected += b.totalAmount || 0;
    monthData[month].collected += b.amountPaid || 0;
    monthData[month].pending += b.pendingAmount || 0;
  });

  const sortedMonths = Object.keys(monthData).sort().reverse(); // Latest months first
  const reportBody = document.getElementById('report-summary-table-body');
  reportBody.innerHTML = '';

  if (sortedMonths.length === 0) {
    reportBody.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center;">No bills generated for reporting.</td></tr>`;
    return;
  }

  sortedMonths.forEach(m => {
    const d = monthData[m];
    const completion = d.expected > 0 ? Math.round((d.collected / d.expected) * 100) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${d.month}</strong></td>
      <td style="font-weight:600;">₹${d.expected.toLocaleString('en-IN')}</td>
      <td style="color:var(--success); font-weight:600;">₹${d.collected.toLocaleString('en-IN')}</td>
      <td style="color:var(--danger); font-weight:600;">₹${d.pending.toLocaleString('en-IN')}</td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="flex-grow:1; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden; width:100px;">
            <div style="background:var(--success); width:${completion}%; height:100%;"></div>
          </div>
          <strong>${completion}%</strong>
        </div>
      </td>
    `;
    reportBody.appendChild(tr);
  });
}

// Export Bills list to CSV format
function exportBillsCSV() {
  if (billsData.length === 0) {
    showToast('No bills available to export', 'warning');
    return;
  }

  const tenantMap = {};
  tenantsData.forEach(t => { tenantMap[t._id.toString()] = t.tenantName; });

  const headers = ['Bill Number', 'Tenant Name', 'Billing Month', 'Rent Amount', 'Electricity', 'Water', 'Maintenance', 'Other Charges', 'Dues', 'Discount', 'Total Amount', 'Amount Paid', 'Pending Balance', 'Status'];
  const rows = billsData.map(b => [
    b.billNumber,
    tenantMap[b.tenantId.toString()] || 'Deleted Tenant',
    b.billingMonth,
    b.rentAmount,
    b.electricityBill,
    b.waterBill,
    b.maintenanceCharge,
    b.otherCharges,
    b.previousPending,
    b.discount,
    b.totalAmount,
    b.amountPaid,
    b.pendingAmount,
    b.paymentStatus
  ]);

  downloadCSV('bills_report.csv', headers, rows);
}

// Export Payments list to CSV format
function exportPaymentsCSV() {
  if (paymentsData.length === 0) {
    showToast('No payments available to export', 'warning');
    return;
  }

  const tenantMap = {};
  tenantsData.forEach(t => { tenantMap[t._id.toString()] = t.tenantName; });

  const headers = ['Receipt Number', 'Tenant Name', 'Payment Date', 'Payment Method', 'Amount Paid', 'Reference'];
  const rows = paymentsData.map(p => [
    p.paymentNumber || 'N/A',
    tenantMap[p.tenantId.toString()] || 'Deleted Tenant',
    p.paymentDate.split('T')[0],
    p.paymentMethod,
    p.amountPaid,
    p.transactionReference || ''
  ]);

  downloadCSV('payments_report.csv', headers, rows);
}

// Helper to trigger file download in browser
function downloadCSV(filename, headers, rows) {
  let csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function printCollectionsReport() {
  window.print();
}

// ==========================================
// PROFILE / LANDLORD SETTINGS
// ==========================================
function renderSettings() {
  const user = authApi.getUser();
  document.getElementById('settings-name').value = user.name || '';
  document.getElementById('settings-phone').value = user.phone || '';
  document.getElementById('settings-address').value = user.address || '';
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const profileData = {
    name: document.getElementById('settings-name').value.trim(),
    phone: document.getElementById('settings-phone').value.trim(),
    address: document.getElementById('settings-address').value.trim()
  };

  try {
    await authApi.updateProfile(profileData);
    showToast('Settings saved successfully', 'success');
    showAppView(); // Refresh sidebar user details
  } catch (err) {
    showToast(err.message || 'Error saving settings', 'error');
  }
}

// ==========================================
// RECEIPT GENERATION & PRINT VIEW
// ==========================================

// Display Receipt from Bill list: selects the last payment, or shows the unpaid bill overview
async function viewReceiptFromBill(billId) {
  const bill = billsData.find(b => b._id === billId);
  if (!bill) return;

  // Search for payments made against this bill
  const billPayments = paymentsData.filter(p => p.billId.toString() === billId.toString());
  if (billPayments.length > 0) {
    // Show the receipt of the latest payment
    viewReceipt(billPayments[0]._id);
  } else {
    // No payments made yet, show an Unpaid Invoice receipt
    populateReceiptDetails(bill, null);
  }
}

async function viewReceipt(paymentId) {
  try {
    const payment = await paymentApi.getById(paymentId);
    const bill = await billApi.getById(payment.billId);
    populateReceiptDetails(bill, payment);
  } catch (err) {
    showToast('Failed to load transaction receipt details', 'error');
  }
}

function populateReceiptDetails(bill, payment) {
  const tenant = tenantsData.find(t => t._id.toString() === bill.tenantId.toString()) || { tenantName: 'Deleted Tenant', roomNumber: 'N/A', mobile: '-' };
  const landlord = authApi.getUser();

  // Receipt Numbers
  document.getElementById('r-number').innerText = payment ? payment.paymentNumber : `INV-${bill.billNumber}`;
  document.getElementById('r-date').innerText = payment ? new Date(payment.paymentDate).toLocaleDateString('en-IN') : new Date(bill.createdAt).toLocaleDateString('en-IN');
  
  // Status badge
  const statusBadge = document.querySelector('.receipt-meta .badge');
  statusBadge.className = `badge badge-${bill.paymentStatus === 'Paid' ? 'paid' : (bill.paymentStatus === 'Partially Paid' ? 'partial' : 'unpaid')}`;
  statusBadge.innerText = bill.paymentStatus;

  // Tenant Details
  document.getElementById('r-tenant-name').innerText = tenant.tenantName;
  document.getElementById('r-room').innerText = tenant.roomNumber;
  document.getElementById('r-mobile').innerText = tenant.mobile;

  // Landlord profile settings details
  document.getElementById('r-landlord-name').innerText = landlord.name || 'Landlord Owner';
  document.getElementById('r-landlord-address').innerText = landlord.address || 'Address not updated in settings';
  document.getElementById('r-landlord-phone').innerText = landlord.phone || '-';

  // Details Table Charges
  document.getElementById('r-month').innerText = bill.billingMonth;
  document.getElementById('r-details-rent').innerText = `₹${bill.rentAmount}`;
  
  toggleReceiptRow('r-row-elec', 'r-details-elec', bill.electricityBill);
  toggleReceiptRow('r-row-water', 'r-details-water', bill.waterBill);
  toggleReceiptRow('r-row-maint', 'r-details-maint', bill.maintenanceCharge);
  toggleReceiptRow('r-row-other', 'r-details-other', bill.otherCharges);
  toggleReceiptRow('r-row-dues', 'r-details-dues', bill.previousPending);
  
  toggleReceiptRow('r-row-discount', 'r-details-discount', bill.discount, '-₹');
  toggleReceiptRow('r-row-advance', 'r-details-advance', bill.advanceAdjustment, '-₹');

  // Summary Totals
  document.getElementById('r-sum-total').innerText = `₹${bill.totalAmount}`;
  document.getElementById('r-sum-paid').innerText = payment ? `₹${payment.amountPaid}` : '₹0';
  document.getElementById('r-sum-accumulated').innerText = `₹${bill.amountPaid || 0}`;
  document.getElementById('r-sum-pending').innerText = `₹${bill.pendingAmount}`;

  // Footer notes
  const footerMethodEl = document.getElementById('r-details-method');
  const footerRefEl = document.getElementById('r-details-ref');
  
  if (payment) {
    footerMethodEl.parentElement.style.display = 'block';
    footerMethodEl.innerText = payment.paymentMethod;
    footerRefEl.innerText = payment.transactionReference || 'None';
  } else {
    footerMethodEl.parentElement.style.display = 'none';
  }

  // Open modal
  document.getElementById('receipt-modal').classList.add('active');
}

function toggleReceiptRow(rowId, textId, value, prefix = '₹') {
  const row = document.getElementById(rowId);
  const text = document.getElementById(textId);
  if (value > 0) {
    row.style.display = 'table-row';
    text.innerText = `${prefix}${value}`;
  } else {
    row.style.display = 'none';
  }
}

function closeReceiptModal() {
  document.getElementById('receipt-modal').classList.remove('active');
}

function printReceipt() {
  window.print();
}

// ==========================================
// TOASTS & DIALOG UTILITIES
// ==========================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'circle-check' : (type === 'error' ? 'circle-xmark' : 'triangle-exclamation');
  toast.innerHTML = `
    <i class="fa-solid fa-${icon}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Remove toast after animation finishes
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Confirmation Dialog Logic
let confirmCallback = null;

function openConfirmModal(text, onConfirm, actionText = 'Delete') {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-modal-text').innerHTML = text;
  
  const confirmBtn = document.getElementById('confirm-modal-btn');
  confirmBtn.innerText = actionText;
  if (actionText === 'Delete' || actionText === 'Yes, Delete') {
    confirmBtn.className = 'btn btn-danger btn-sm';
  } else {
    confirmBtn.className = 'btn btn-primary btn-sm';
  }

  confirmCallback = onConfirm;
  
  confirmBtn.onclick = () => {
    if (confirmCallback) confirmCallback();
  };
  
  modal.classList.add('active');
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.remove('active');
  confirmCallback = null;
}
