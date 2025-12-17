/* ============================================
   BestBuddies Pet Grooming - Customer Dashboard
   ============================================ */

// Load customer dashboard
async function loadCustomerDashboard() {
  // Check if user is logged in
  const isLoggedIn = await requireLogin();
  if (!isLoggedIn) {
    return;
  }

  const user = await getCurrentUser();

  // Debug: Log user data to console
  console.log('Current user data:', user);
  console.log('User name:', user?.name);

  // Update welcome message
  const welcomeElement = document.getElementById('welcomeName');
  if (welcomeElement && user) {
    const displayName = user.name || user.email?.split('@')[0] || 'Customer';
    welcomeElement.textContent = displayName;
    console.log('Updated welcome name to:', displayName);
  } else if (welcomeElement) {
    console.warn('User not found or welcome element missing');
    welcomeElement.textContent = 'Customer';
  }

  // Setup sidebar navigation
  setupCustomerSidebarNavigation();
  setupCustomerBookingFilters();

  await renderWarningPanel();

  // Load quick stats
  await loadQuickStats();

  renderTeamCalendarPreview();
  renderCommunityShowcase();

  // Load user bookings
  await loadUserBookings();

  // Load calendar
  const bookings = await getUserBookings();
  renderCustomerCalendar(bookings);

  // Account
  setupCustomerPasswordForm();
}

// Debounce timeout for customer bookings search
let customerBookingsSearchTimeout = null;
let customerHistorySearchTimeout = null;

// Debounced search function for customer bookings
window.searchCustomerBookings = function(query) {
  if (customerBookingsSearchTimeout) clearTimeout(customerBookingsSearchTimeout);
  customerBookingsSearchTimeout = setTimeout(() => {
    renderCustomerBookings();
  }, 300);
};

// Debounced search function for customer history
window.searchCustomerHistory = function(query) {
  if (customerHistorySearchTimeout) clearTimeout(customerHistorySearchTimeout);
  customerHistorySearchTimeout = setTimeout(() => {
    filterCustomerHistory();
  }, 300);
};

// Setup sidebar navigation
function setupCustomerSidebarNavigation() {
  const menuItems = document.querySelectorAll('.sidebar-menu a[data-view]');
  menuItems.forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      const view = this.dataset.view;
      if (view) {
        switchCustomerView(view);
      }
    });
  });

  // Setup dropdown toggle
  const dropdownToggle = document.querySelector('.dropdown-toggle');
  const dropdownSubmenu = document.querySelector('.dropdown-submenu');
  const dropdownArrow = document.querySelector('.dropdown-arrow');

  if (dropdownToggle && dropdownSubmenu) {
    dropdownToggle.addEventListener('click', function (e) {
      e.preventDefault();
      const isExpanded = dropdownSubmenu.classList.contains('expanded');

      if (isExpanded) {
        dropdownSubmenu.classList.remove('expanded');
        dropdownToggle.classList.remove('expanded');
        dropdownSubmenu.style.maxHeight = '0';
      } else {
        dropdownSubmenu.classList.add('expanded');
        dropdownToggle.classList.add('expanded');
        dropdownSubmenu.style.maxHeight = '500px';
      }
    });
  }

  // Setup submenu link handlers
  const submenuLinks = document.querySelectorAll('.submenu-link');
  submenuLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      // Remove active class from all menu items
      document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
      document.querySelectorAll('.submenu-link').forEach(a => a.classList.remove('active'));

      // Add active class to clicked submenu link
      this.classList.add('active');

      // Handle different submenu actions
      if (this.dataset.filter) {
        // Filter bookings and stay on overview view (bookings are displayed there)
        setCustomerBookingFilter(this.dataset.filter);
        switchCustomerView('overview');
        
        // Also update the filter buttons to match
        const filterGroup = document.getElementById('customerBookingFilters');
        if (filterGroup) {
          filterGroup.querySelectorAll('button[data-filter]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.dataset.filter);
          });
        }
        
        // Scroll to Recent Bookings section header
        setTimeout(() => {
          const bookingsSection = document.getElementById('recentBookingsSection');
          if (bookingsSection) {
            bookingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      } else if (this.dataset.view) {
        // Switch to specified view
        switchCustomerView(this.dataset.view);
      }
    });
  });

  // Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.querySelector('.customer-layout .sidebar');
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', function () {
      sidebar.classList.toggle('active');
      const isOpen = sidebar.classList.contains('active');
      // Update button text cleanly
      if (this.firstChild && this.firstChild.nodeType === 3) { // if text node
        this.firstChild.textContent = isOpen ? '✕ Close' : '☰ Menu';
      } else {
        this.textContent = isOpen ? '✕ Close' : '☰ Menu';
      }

      if (isOpen) {
        this.classList.remove('btn-outline');
        this.classList.add('btn-primary');
      } else {
        this.classList.add('btn-outline');
        this.classList.remove('btn-primary');
      }
    });
  }
}

let customerBookingsCache = [];
let customerBookingState = {
  filter: 'all',
  page: 1,
  pageSize: 4
};

function setupCustomerBookingFilters() {
  const filterGroup = document.getElementById('customerBookingFilters');
  if (!filterGroup || filterGroup.dataset.bound === 'true') return;
  filterGroup.dataset.bound = 'true';
  filterGroup.querySelectorAll('button[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => setCustomerBookingFilter(btn.dataset.filter));
  });
}

// Switch customer view
function switchCustomerView(view) {
  // Hide all views
  const views = ['overviewView', 'bookingsView', 'calendarView', 'historyView', 'accountView', 'galleryView', 'profileView'];
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = 'none';
  });

  // Update active menu item
  document.querySelectorAll('.sidebar-menu a[data-view]').forEach(item => {
    if (item.dataset.view === view) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Show appropriate view
  const targetView = document.getElementById(view + 'View');
  if (targetView) {
    targetView.style.display = 'block';
  }

  // Load data if needed
  if (view === 'bookings') {
    loadUserBookings().then(() => renderCustomerSlotsList());
  } else if (view === 'calendar') {
    // Render calendar and load stats when switching to calendar view
    renderCustomerCalendar();
    loadCalendarViewStats();
  } else if (view === 'history') {
    renderCustomerBookingHistory();
  } else if (view === 'gallery') {
    renderMyPetGallery();
  } else if (view === 'profile') {
    loadCustomerProfile();
  }
}

// Helper function to normalize status for comparison
function normalizeStatus(status) {
  return (status || '').toLowerCase().replace(/\s+/g, '');
}

// Helper function to check if status is "in progress" (handles different formats)
function isInProgressStatus(status) {
  const normalized = normalizeStatus(status);
  return normalized === 'inprogress' || normalized === 'in progress';
}

// Helper function to check if booking fee is paid (confirmed, in progress, or completed)
function isBookingFeePaid(status) {
  const normalized = normalizeStatus(status);
  return ['confirmed', 'inprogress', 'completed'].includes(normalized);
}

// Load quick stats with clickable cards
async function loadQuickStats() {
  const bookings = await getUserBookings();
  const totalBookings = bookings.length;
  // Slots removed
  const cancelledStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'];
  const pendingBookings = bookings.filter(b => normalizeStatus(b.status) === 'pending').length;
  const confirmedBookings = bookings.filter(b => normalizeStatus(b.status) === 'confirmed' || isInProgressStatus(b.status)).length;
  const cancelledBookings = bookings.filter(b => cancelledStatuses.includes(b.status)).length;

  // Calculate total spent on confirmed bookings
  const totalSpent = bookings
    .filter(b => normalizeStatus(b.status) === 'confirmed' || normalizeStatus(b.status) === 'completed')
    .reduce((sum, b) => sum + (b.totalPrice || b.cost?.subtotal || 0), 0);

  const statsContainer = document.getElementById('quickStats');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-card" style="background: linear-gradient(135deg, rgba(100, 181, 246, 0.15), rgba(66, 165, 245, 0.15)); cursor: pointer; border: 2px solid transparent; transition: all 0.3s ease;" onclick="sortCustomerBookings('all')" data-sort="all">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📅</div>
        <div class="stat-value" style="font-size: 2.5rem; color: #1976d2; font-weight: 700;">${totalBookings}</div>
        <div class="stat-label" style="color: var(--gray-700); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">TOTAL BOOKINGS</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, rgba(255, 235, 59, 0.2), rgba(255, 224, 130, 0.2)); cursor: pointer; border: 2px solid transparent; transition: all 0.3s ease;" onclick="sortCustomerBookings('pending')" data-sort="pending">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⏳</div>
        <div class="stat-value" style="font-size: 2.5rem; color: #f57c00; font-weight: 700;">${pendingBookings}</div>
        <div class="stat-label" style="color: var(--gray-700); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">PENDING</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, rgba(129, 199, 132, 0.2), rgba(102, 187, 106, 0.2)); cursor: pointer; border: 2px solid transparent; transition: all 0.3s ease;" onclick="sortCustomerBookings('confirmed')" data-sort="confirmed">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">✅</div>
        <div class="stat-value" style="font-size: 2.5rem; color: #388e3c; font-weight: 700;">${confirmedBookings}</div>
        <div class="stat-label" style="color: var(--gray-700); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">CONFIRMED</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, rgba(239, 83, 80, 0.15), rgba(229, 115, 115, 0.15)); cursor: pointer; border: 2px solid transparent; transition: all 0.3s ease;" onclick="sortCustomerBookings('cancelled')" data-sort="cancelled">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">❌</div>
        <div class="stat-value" style="font-size: 2.5rem; color: #d32f2f; font-weight: 700;">${cancelledBookings}</div>
        <div class="stat-label" style="color: var(--gray-700); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">CANCELLED</div>
      </div>

    `;

    // Add hover effects
    statsContainer.querySelectorAll('.stat-card').forEach(card => {
      card.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-4px)';
        this.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
      });
      card.addEventListener('mouseleave', function () {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'var(--shadow)';
      });
    });
  }
}

// Sort customer bookings based on stat card click
function sortCustomerBookings(sortType) {
  setCustomerBookingFilter(sortType);

  // Update active stat card
  document.querySelectorAll('.stat-card[data-sort]').forEach(card => {
    if (card.dataset.sort === sortType) {
      card.style.border = '2px solid #000';
    } else {
      card.style.border = 'none';
    }
  });

  // Scroll to Recent Bookings section header
  setTimeout(() => {
    const bookingsSection = document.getElementById('recentBookingsSection');
    if (bookingsSection) {
      bookingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 150);
}

function getFilteredCustomerBookings(bookings = customerBookingsCache) {
  const filter = customerBookingState.filter;
  const searchTerm = (document.getElementById('myBookingsSearch')?.value || '').toLowerCase();

  const cancelledStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'];

  // 1. First apply tab filter
  let result = [];
  switch (filter) {
    case 'pending':
      result = bookings.filter(b => normalizeStatus(b.status) === 'pending');
      break;
    case 'confirmed':
      // Include both 'confirmed' and 'In Progress' statuses
      result = bookings.filter(b => normalizeStatus(b.status) === 'confirmed' || isInProgressStatus(b.status));
      break;
    case 'completed':
      result = bookings.filter(b => normalizeStatus(b.status) === 'completed');
      break;
    case 'cancelled':
      result = bookings.filter(b => cancelledStatuses.includes(b.status));
      break;
    case 'upcoming':
      result = bookings.filter(b => {
        if (cancelledStatuses.includes(b.status)) return false;
        if (normalizeStatus(b.status) === 'completed') return false;
        const bookingDate = new Date(b.date + ' ' + b.time);
        return bookingDate >= new Date();
      });
      break;
    case 'all':
    default:
      result = bookings;
      break;
  }

  // 2. Then apply search filter (if any)
  if (searchTerm) {
    result = result.filter(b => {
      const petName = (b.petName || '').toLowerCase();
      const service = (b.packageId || b.serviceId || '').toLowerCase(); // simplified check
      const packageName = (b.packageName || '').toLowerCase();
      const date = (b.date || '').toLowerCase();

      return petName.includes(searchTerm) ||
        service.includes(searchTerm) ||
        packageName.includes(searchTerm) ||
        date.includes(searchTerm);
    });
  }

  return result;
}

// Change the function declaration to async so await is allowed inside
async function renderCustomerBookings() {
  const container = document.getElementById('bookingsContainer');
  const pagination = document.getElementById('customerBookingPagination');
  if (!container) return;

  if (!Array.isArray(customerBookingsCache) || !customerBookingsCache.length) {
    container.innerHTML = `<div class="card" style="text-align:center; padding:3rem;"><h3>No Bookings Yet</h3></div>`;
    if (pagination) pagination.innerHTML = '';
    return;
  }

  const filtered = getFilteredCustomerBookings();
  const totalPages = Math.ceil(filtered.length / customerBookingState.pageSize) || 1;
  const safePage = Math.min(customerBookingState.page, totalPages);
  customerBookingState.page = safePage;
  const start = (safePage - 1) * customerBookingState.pageSize;
  const pageBookings = filtered.slice(start, start + customerBookingState.pageSize);

  // Build HTML asynchronously and ensure Promise.all is awaited
  const items = await Promise.all(pageBookings.map(async booking => {
    const statusClass = getCustomerStatusClass(booking.status);
    const statusLabel = formatBookingStatus ? formatBookingStatus(booking.status) : (booking.status || 'Unknown');
    const petEmoji = booking.petType === 'dog' ? '🐕' : '🐈';
    const appointmentDate = new Date((booking.date || '') + ' ' + (booking.time || ''));
    const cancelledStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'];
    const isUpcoming = !cancelledStatuses.includes(booking.status) && appointmentDate >= new Date();
    const canEdit = isUpcoming && booking.status === 'pending';
    const canCancel = isUpcoming;
    const profile = booking.profile || {};
    let cost = booking.cost;
    if (!cost) {
      try {
        const maybe = computeBookingCost ? computeBookingCost(booking.packageId, booking.petWeight, booking.addOns, booking.singleServices) : null;
        cost = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
      } catch (e) { cost = booking.cost || null; }
    }
    const bookingCode = typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : (booking.shortId || booking.id);
    return `
      <div class="card booking-card" onclick="openBookingDetailModal('${booking.id}')">
        <div class="booking-main">
          <div class="booking-avatar">${petEmoji}</div>
          <div>
            <h3>${escapeHtml(booking.petName || '')}</h3>
            <p><strong>Receipt:</strong> ${escapeHtml(String(bookingCode))}</p>
            <p><strong>Package:</strong> ${escapeHtml(booking.packageName || 'Custom')}</p>
            <p><strong>Groomer:</strong> ${escapeHtml(booking.groomerName || 'TBD')}</p>
            <p><strong>Schedule:</strong> ${formatDate ? formatDate(booking.date) : booking.date} · ${formatTime ? formatTime(booking.time) : booking.time}</p>
            <p><strong>Total:</strong> <span style="color: #2e7d32; font-weight: 600;">${typeof formatCurrency === 'function' ? formatCurrency(booking.totalPrice || booking.cost?.subtotal || 0) : `₱${booking.totalPrice || booking.cost?.subtotal || 0}`}</span></p>
          </div>
          <div class="booking-status"><span class="${statusClass}">${escapeHtml(statusLabel)}</span>
            ${canEdit ? `<button onclick="event.stopPropagation(); openBookingEditModal('${booking.id}')">Edit</button>` : ''}
            ${canCancel ? `<button onclick="event.stopPropagation(); openBookingCancelModal('${booking.id}')">Cancel</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }));

  container.innerHTML = items.join('');
  if (pagination) {
    pagination.innerHTML = `<div>Page ${customerBookingState.page} of ${totalPages}</div>`;
  }
}
window.renderCustomerBookings = renderCustomerBookings;

// Simple formatter for booking status used by renderCustomerBookings
function formatBookingStatus(status) {
  if (status === null || status === undefined) return 'Unknown';
  const s = String(status).trim();
  const map = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    inprogress: 'In Progress',
    'in progress': 'In Progress',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    cancelledbycustomer: 'Cancelled (Customer)',
    cancelledbyadmin: 'Cancelled (Admin)'
  };
  const key = s.toLowerCase().replace(/\s+/g, '');
  return map[key] || map[s.toLowerCase()] || s.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
}
window.formatBookingStatus = formatBookingStatus;

// Minimal community showcase renderer used on dashboard (safe no-op)
async function renderCommunityShowcase() {
  try {
    const container = document.getElementById('communityShowcase') || document.getElementById('customerShowcase');
    if (!container) return;
    if (typeof getCommunityPosts === 'function') {
      const posts = await getCommunityPosts().catch(() => []);
      if (Array.isArray(posts) && posts.length) {
        container.innerHTML = posts.slice(0, 6).map(p =>
          `<div class="showcase-item"><img src="${p.image || 'assets/default.jpg'}" alt="${(p.title || '')}" /><div class="caption">${p.title || ''}</div></div>`
        ).join('');
        return;
      }
    }
    container.innerHTML = '<div class="muted" style="padding:1rem">Community photos coming soon.</div>';
  } catch (e) {
    console.warn('renderCommunityShowcase failed:', e);
  }
}
window.renderCommunityShowcase = renderCommunityShowcase;

// Minimal helper: return badge class for a booking status
function getCustomerStatusClass(status) {
  switch ((status || '').toLowerCase().replace(/\s+/g, '')) {
    case 'pending': return 'badge-pending';
    case 'confirmed': return 'badge-confirmed';
    case 'inprogress':
    case 'in_progress': return 'badge-inprogress';
    case 'completed': return 'badge-completed';
    case 'cancelled':
    case 'cancelledbycustomer':
    case 'cancelledbyadmin': return 'badge-cancelled';
    default: return 'badge-gray';
  }
}
window.getCustomerStatusClass = getCustomerStatusClass;

// Allow switching booking filter (called by UI)
function setCustomerBookingFilter(filter) {
  customerBookingState.filter = filter || 'all';
  customerBookingState.page = 1;
  
  // Update filter buttons active state
  const filterGroup = document.getElementById('customerBookingFilters');
  if (filterGroup) {
    filterGroup.querySelectorAll('button[data-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  }
  
  // Prefer the async renderer if present
  try {
    const r = (typeof renderCustomerBookings === 'function') ? renderCustomerBookings() : (typeof loadUserBookings === 'function' ? loadUserBookings() : null);
    if (r && typeof r.then === 'function') r.catch(() => { });
  } catch (e) { console.warn('setCustomerBookingFilter failed', e); }
}
window.setCustomerBookingFilter = setCustomerBookingFilter;

// Minimal team calendar preview used on dashboard (safe no-op if calendar building absent)
async function renderTeamCalendarPreview() {
  try {
    let bookings = [];
    try { bookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []); } catch (e) { bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : []; }
    let absences = [];
    try { absences = typeof getStaffAbsences === 'function' ? await getStaffAbsences() : (typeof getStaffAbsencesSync === 'function' ? getStaffAbsencesSync() : []); } catch (e) { absences = typeof getStaffAbsencesSync === 'function' ? getStaffAbsencesSync() : []; }
    if (!Array.isArray(bookings)) bookings = [];
    if (!Array.isArray(absences)) absences = [];
    if (typeof buildCalendarDataset === 'function' && typeof renderMegaCalendar === 'function') {
      // Pass empty array for displayBookings to show NO details (Privacy) for the overview widget
      const dataset = buildCalendarDataset(bookings, absences, []);
      renderMegaCalendar('customerTeamCalendar', dataset);
    }
  } catch (e) {
    console.warn('renderTeamCalendarPreview failed:', e);
  }
}
window.renderTeamCalendarPreview = renderTeamCalendarPreview;

// Minimal customer slots list renderer
async function renderCustomerSlotsList() {
  try {
    let bookings = [];
    try { bookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []); } catch (e) { bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : []; }
    if (!Array.isArray(bookings)) bookings = [];
    if (typeof buildCalendarDataset === 'function') {
      const dataset = buildCalendarDataset(bookings, []);
      // lightweight rendering fallback: populate container if present
      const container = document.getElementById('customerSlotsList');
      if (container) {
        const entries = Object.entries(dataset || {}).slice(0, 4).map(([d, s]) => `<div><strong>${d}</strong> — ${s.remaining || 0} slots</div>`).join('');
        container.innerHTML = entries || '<p>No open slots.</p>';
      }
    }
  } catch (e) {
    console.warn('renderCustomerSlotsList failed:', e);
  }
}
window.renderCustomerSlotsList = renderCustomerSlotsList;

// Minimal calendar renderer used by dashboard view
// Minimal calendar renderer used by dashboard view
async function renderCustomerCalendar(userBookings = []) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      console.warn('No user logged in for calendar view');
      return;
    }

    // Fetch ALL bookings for capacity calculation
    let allBookings = [];
    try {
      allBookings = typeof getBookings === 'function' ? await getBookings() : [];
    } catch {
      allBookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
    }

    // Filter for THIS user's bookings to display on calendar
    const customerBookings = allBookings.filter(b => b.userId === user.id);
    console.log('[CustomerCalendar] Found', customerBookings.length, 'bookings for user', user.id);

    // Fetch absences for blackout dates
    let absences = [];
    try {
      absences = typeof getStaffAbsences === 'function' ? await getStaffAbsences() : [];
    } catch {
      absences = typeof getStaffAbsencesSync === 'function' ? getStaffAbsencesSync() : [];
    }

    // ALWAYS use admin-style simple calendar - shows only customer's own bookings
    // No slots, no availability - just clean booking list like admin calendar
    renderSimpleCustomerCalendar(customerBookings);
  } catch (e) { 
    console.warn('renderCustomerCalendar failed:', e);
    // Fallback to simple calendar
    try {
      const user = await getCurrentUser();
      if (user) {
        const allBookings = await getBookings();
        const customerBookings = allBookings.filter(b => b.userId === user.id);
        renderSimpleCustomerCalendar(customerBookings);
      }
    } catch (fallbackError) {
      console.error('Calendar fallback also failed:', fallbackError);
    }
  }
}
window.renderCustomerCalendar = renderCustomerCalendar;

// Fix renderCustomerBookings: await Promise.all(...) before .join()
async function renderCustomerBookings() {
  const container = document.getElementById('bookingsContainer');
  const pagination = document.getElementById('customerBookingPagination');
  if (!container) return;

  if (!Array.isArray(customerBookingsCache) || !customerBookingsCache.length) {
    container.innerHTML = `<div class="card" style="text-align:center; padding:3rem;"><h3>No Bookings Yet</h3></div>`;
    if (pagination) pagination.innerHTML = '';
    return;
  }

  const filtered = getFilteredCustomerBookings();
  const totalPages = Math.ceil(filtered.length / customerBookingState.pageSize) || 1;
  const safePage = Math.min(customerBookingState.page, totalPages);
  customerBookingState.page = safePage;
  const start = (safePage - 1) * customerBookingState.pageSize;
  const pageBookings = filtered.slice(start, start + customerBookingState.pageSize);

  // Build HTML asynchronously and ensure Promise.all is awaited
  const items = await Promise.all(pageBookings.map(async booking => {
    const statusClass = getCustomerStatusClass(booking.status);
    const statusLabel = formatBookingStatus ? formatBookingStatus(booking.status) : (booking.status || 'Unknown');
    const petEmoji = booking.petType === 'dog' ? '🐕' : '🐈';
    const appointmentDate = new Date((booking.date || '') + ' ' + (booking.time || ''));
    const cancelledStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'];
    const isUpcoming = !cancelledStatuses.includes(booking.status) && appointmentDate >= new Date();
    const canEdit = isUpcoming && booking.status === 'pending';
    const canCancel = isUpcoming;
    const profile = booking.profile || {};
    let cost = booking.cost;
    if (!cost) {
      try {
        const maybe = computeBookingCost ? computeBookingCost(booking.packageId, booking.petWeight, booking.addOns, booking.singleServices) : null;
        cost = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
      } catch (e) { cost = booking.cost || null; }
    }
    const bookingCode = typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : (booking.shortId || booking.id);
    return `
      <div class="card booking-card" onclick="openBookingDetailModal('${booking.id}')">
        <div class="booking-main">
          <div class="booking-avatar">${petEmoji}</div>
          <div>
            <h3>${escapeHtml(booking.petName || '')}</h3>
            <p><strong>Receipt:</strong> ${escapeHtml(String(bookingCode))}</p>
            <p><strong>Package:</strong> ${escapeHtml(booking.packageName || 'Custom')}</p>
            <p><strong>Groomer:</strong> ${escapeHtml(booking.groomerName || 'TBD')}</p>
            <p><strong>Schedule:</strong> ${formatDate ? formatDate(booking.date) : booking.date} · ${formatTime ? formatTime(booking.time) : booking.time}</p>
            <p><strong>Total:</strong> <span style="color: #2e7d32; font-weight: 600;">${typeof formatCurrency === 'function' ? formatCurrency(booking.totalPrice || booking.cost?.subtotal || 0) : `₱${booking.totalPrice || booking.cost?.subtotal || 0}`}</span></p>
          </div>
          <div class="booking-status"><span class="${statusClass}">${escapeHtml(statusLabel)}</span>
            ${canEdit ? `<button onclick="event.stopPropagation(); openBookingEditModal('${booking.id}')">Edit</button>` : ''}
            ${canCancel ? `<button onclick="event.stopPropagation(); openBookingCancelModal('${booking.id}')">Cancel</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }));

  container.innerHTML = items.join('');
  if (pagination) {
    pagination.innerHTML = `<div>Page ${customerBookingState.page} of ${totalPages}</div>`;
  }
}
window.renderCustomerBookings = renderCustomerBookings;

// Make openBookingDetailModal async and use awaited bookings
// Make openBookingDetailModal async and use awaited bookings
async function openBookingDetailModal(bookingId) {
  let bookings = [];
  try {
    bookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []);
  } catch (e) {
    console.warn('openBookingDetailModal: getBookings failed, using sync fallback', e);
    bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
  }
  if (!Array.isArray(bookings)) bookings = [];

  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const profile = booking.profile || {};
  const statusClass = getCustomerStatusClass(booking.status);
  const statusLabel = formatBookingStatus(booking.status);

  const weightLabel = booking.petWeight || profile.weight || '';
  const bookingCode = typeof getBookingDisplayCode === 'function'
    ? getBookingDisplayCode(booking)
    : (booking.shortId || booking.id);

  // Generate price breakdown
  const cost = booking.cost || {};
  const bookingFee = cost.bookingFee || 100;
  const isSingleService = booking.packageId === 'single-service';
  const packagePrice = isSingleService ? 0 : (cost.packagePrice || booking.totalPrice || 0);
  
  // Calculate single services total
  const singleServicesArray = cost.services || [];
  const servicesTotal = singleServicesArray.reduce((sum, s) => sum + (s.price || 0), 0);
  
  // Get add-ons
  let addOnsArray = [];
  if (booking.addOns && Array.isArray(booking.addOns) && booking.addOns.length > 0) {
    addOnsArray = booking.addOns.map(addon => {
      if (typeof addon === 'object' && addon.name && addon.price) {
        return { label: addon.name, price: addon.price };
      }
      if (typeof addon === 'string') {
        if (addon === 'toothbrush') return { label: 'Toothbrush', price: 25 };
        if (addon === 'dematting') return { label: 'De-matting', price: 80 };
        if (addon === 'anti-tick-flea') return { label: 'Anti-Tick & Flea', price: 150 };
        return { label: addon, price: 0 };
      }
      return { label: 'Unknown', price: 0 };
    });
  }
  const addOnsTotal = addOnsArray.reduce((sum, addon) => sum + (addon.price || 0), 0);
  const subtotal = packagePrice + servicesTotal + addOnsTotal;
  const isPaidStatus = isBookingFeePaid(booking.status);
  const totalAmount = isPaidStatus ? Math.max(0, subtotal - bookingFee) : subtotal;
  
  // Build price breakdown HTML
  const priceBreakdownHtml = `
    <div style="border-top: 2px solid var(--gray-200); margin-top: 1rem; padding-top: 1rem;">
      <h4 style="margin-bottom: 0.75rem; font-size: 1rem; color: var(--gray-900);">💰 Price Breakdown</h4>
      
      ${isSingleService && servicesTotal > 0 ? `
        <div style="margin-bottom: 0.5rem;">
          <div class="summary-item">
            <span class="summary-label">🛁 Single Services:</span>
            <span class="summary-value" style="font-weight: 600;">${formatCurrency(servicesTotal)}</span>
          </div>
          ${singleServicesArray.map(s => `
            <div class="summary-item" style="margin-left: 1rem;">
              <span class="summary-label" style="color: var(--gray-600);">• ${escapeHtml(s.label || s.serviceId || 'Service')}</span>
              <span class="summary-value">${formatCurrency(s.price || 0)}</span>
            </div>
          `).join('')}
        </div>
      ` : packagePrice > 0 ? `
        <div class="summary-item">
          <span class="summary-label">📦 Package:</span>
          <span class="summary-value" style="font-weight: 600;">${formatCurrency(packagePrice)}</span>
        </div>
      ` : ''}
      
      ${addOnsArray.length > 0 ? `
        <div style="margin: 0.5rem 0;">
          <span style="color: var(--gray-700); font-weight: 500;">✨ Add-ons:</span>
          ${addOnsArray.map(addon => `
            <div class="summary-item" style="margin-left: 1rem;">
              <span class="summary-label" style="color: var(--gray-600);">• ${escapeHtml(addon.label)}</span>
              <span class="summary-value">${formatCurrency(addon.price)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${(addOnsArray.length > 0 || isPaidStatus || isSingleService) ? `
        <div class="summary-item" style="border-top: 1px solid var(--gray-200); padding-top: 0.5rem; margin-top: 0.5rem;">
          <span class="summary-label" style="font-weight: 600;">Subtotal:</span>
          <span class="summary-value" style="font-weight: 700; font-size: 1.1rem;">${formatCurrency(subtotal)}</span>
        </div>
      ` : ''}
      
      ${isPaidStatus ? `
        <div class="summary-item" style="background: #e8f5e9; padding: 0.5rem; border-radius: 0.25rem; margin-top: 0.5rem;">
          <span class="summary-label" style="color: #2e7d32; font-weight: 500;">🎫 Booking Fee (Paid):</span>
          <span class="summary-value" style="color: #2e7d32; font-weight: 600;">- ${formatCurrency(bookingFee)}</span>
        </div>
      ` : ''}
      
      <div class="summary-item" style="background: #e8f5e9; padding: 0.75rem; border-radius: 0.25rem; margin-top: 0.5rem; border-left: 4px solid #2e7d32;">
        <span class="summary-label" style="color: #2e7d32; font-weight: 700; font-size: 1.1rem;">💰 Total Amount:</span>
        <span class="summary-value" style="color: #2e7d32; font-weight: 700; font-size: 1.2rem;">${formatCurrency(totalAmount)}</span>
      </div>
    </div>
  `;

  showModal(`
    <h3>Booking Details</h3>
    <div class="summary-item">
      <span class="summary-label">Pet Name:</span>
      <span class="summary-value">${escapeHtml(booking.petName)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Owner:</span>
      <span class="summary-value">${escapeHtml(profile.ownerName || booking.customerName)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Receipt:</span>
      <span class="summary-value">${escapeHtml(bookingCode)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Pet Type:</span>
      <span class="summary-value">${escapeHtml(booking.petType.charAt(0).toUpperCase() + booking.petType.slice(1))}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Package:</span>
      <span class="summary-value">${escapeHtml(booking.packageName)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Weight:</span>
      <span class="summary-value">${weightLabel ? escapeHtml(weightLabel) : 'Not specified'}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Groomer:</span>
      <span class="summary-value">${escapeHtml(booking.groomerName || 'Assigned on site')}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Date:</span>
      <span class="summary-value">${formatDate(booking.date)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Time:</span>
      <span class="summary-value">${formatTime(booking.time)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Phone:</span>
      <span class="summary-value">${escapeHtml(booking.phone)}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Status:</span>
      <span class="summary-value"><span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span></span>
    </div>
    ${booking.bookingNotes && booking.bookingNotes.trim() ? `
      <div class="summary-item">
        <span class="summary-label">Preferred Cut/Notes:</span>
        <span class="summary-value" style="background: #e8f5e9; padding: 0.5rem; border-radius: 0.25rem; color: #2e7d32; font-weight: 500;">✂️ ${escapeHtml(booking.bookingNotes)}</span>
      </div>
    ` : ''}
    ${booking.groomingNotes ? `
      <div class="summary-item">
        <span class="summary-label">Service Notes:</span>
        <span class="summary-value" style="background: #f0f9f0; padding: 0.5rem; border-radius: 0.25rem; color: #2e7d32; font-weight: 500;">✂️ ${escapeHtml(booking.groomingNotes)}</span>
      </div>
    ` : ''}
    ${booking.vaccinationProofImage ? `
      <div class="summary-item" style="flex-direction: column; align-items: flex-start;">
        <span class="summary-label" style="margin-bottom: 0.5rem;">📷 Vaccination Proof:</span>
        <img src="${booking.vaccinationProofImage}" alt="Vaccination Proof" 
          style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 2px solid #4CAF50; cursor: pointer;"
          onclick="window.openVaccinationProofLightbox('${booking.id}')">
      </div>
    ` : ''}
    
    <!-- Proof of Payment Section -->
    <div class="summary-item" style="flex-direction: column; align-items: flex-start; margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;">
      <span class="summary-label" style="margin-bottom: 0.5rem; font-weight: 600;">💳 Proof of Payment (GCash):</span>
      ${booking.proofOfPaymentImage ? `
        <div style="position: relative; display: inline-block;">
          <img src="${booking.proofOfPaymentImage}" alt="Proof of Payment" 
            style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 2px solid #2196F3; cursor: pointer;"
            onclick="window.openProofOfPaymentLightbox('${booking.id}')">
          ${booking.status === 'pending' ? `
            <button onclick="event.stopPropagation(); window.removeProofOfPayment('${booking.id}')" 
              style="position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; background: #e74c3c; color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 14px;">×</button>
          ` : ''}
        </div>
        <p style="color: #2e7d32; font-size: 0.85rem; margin-top: 0.5rem;">✓ Payment proof uploaded</p>
      ` : `
        ${booking.status === 'pending' ? `
          <p style="color: #666; font-size: 0.85rem; margin-bottom: 0.75rem;">Upload your GCash payment screenshot to confirm your booking</p>
          <input type="file" id="proofOfPaymentInput-${booking.id}" accept="image/*" style="display: none;" 
            onchange="window.handleProofOfPaymentUpload('${booking.id}', this)">
          <button onclick="document.getElementById('proofOfPaymentInput-${booking.id}').click()" 
            style="padding: 0.6rem 1rem; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>📤</span> Upload Payment Proof
          </button>
        ` : `
          <p style="color: #999; font-size: 0.85rem;">No payment proof uploaded</p>
        `}
      `}
    </div>
    
    ${priceBreakdownHtml}
    
    <div class="modal-actions">
      ${booking.status === 'pending' ? `
        <button class="btn btn-outline" onclick="closeModal(); openBookingEditModal('${booking.id}')">Edit</button>
        <button class="btn btn-danger" onclick="closeModal(); startCancelBooking('${booking.id}')">Cancel</button>
      ` : ''}
      <button class="btn btn-primary" onclick="closeModal()">Close</button>
    </div>
  `);
}

// Ensure openBookingEditModal exists globally so inline onclick handlers don't throw.
// If you have a full edit-modal implementation elsewhere, set window._openBookingEditModal to it.
async function openBookingEditModal(bookingId) {
  // prefer an in-app impl if available
  if (typeof window._openBookingEditModal === 'function') {
    try { return await window._openBookingEditModal(bookingId); } catch (e) { console.warn('fallback openBookingEditModal failed', e); }
  }

  // find booking from local store / API
  try {
    let bookings = [];
    if (typeof getBookings === 'function') {
      bookings = await getBookings();
    }
    const booking = (bookings || []).find(b => b.id === bookingId || b.shortId === bookingId);
    if (!booking) {
      // fallback: redirect with edit marker if booking not found locally
      const urlFallback = new URL(window.location.origin + '/booking.html');
      urlFallback.searchParams.set('edit', bookingId);
      return (typeof redirect === 'function') ? redirect(urlFallback.toString()) : window.location.href = urlFallback.toString();
    }

    // Map existing booking to bookingData format expected by booking page
    const formData = {
      petType: booking.petType || booking.packageType || '',
      packageId: booking.packageId || '',
      groomerId: booking.groomerId || null,
      groomerName: booking.groomerName || '',
      date: booking.date || '',
      time: booking.time || '',
      ownerName: booking.customerName || booking.profile?.ownerName || '',
      contactNumber: booking.phone || booking.profile?.contactNumber || '',
      ownerAddress: booking.profile?.address || '',
      petName: booking.petName || booking.profile?.petName || '',
      petBreed: booking.profile?.breed || '',
      petAge: booking.petAge || booking.profile?.age || '',
      petWeight: booking.petWeight || booking.profile?.weight || '',
      medicalNotes: booking.profile?.medical || booking.medicalNotes || '',
      vaccinationNotes: booking.profile?.vaccinations || booking.vaccinationNotes || '',
      addOns: booking.addOns || [],
      bookingNotes: booking.bookingNotes || '',
      saveProfile: true,
      singleServices: booking.singleServices || []
    };

    // mark editing id so booking page can update existing booking instead of creating new
    sessionStorage.setItem('editingBookingId', booking.id);
    sessionStorage.setItem('bookingData', JSON.stringify(formData));
    // go to review/summary step so user can edit fields or navigate steps
    sessionStorage.setItem('bookingStep', '4');

    // navigate to booking page
    if (typeof redirect === 'function') redirect('booking.html');
    else window.location.href = 'booking.html';
  } catch (e) {
    console.warn('openBookingEditModal fallback failed', e);
    // final fallback redirect with query param
    const url = new URL(window.location.origin + '/booking.html');
    url.searchParams.set('edit', bookingId);
    if (typeof redirect === 'function') redirect(url.toString());
    else window.location.href = url.toString();
  }
}

async function openBookingCancelModal(bookingId) {
  // prefer in-app impl
  if (typeof window._openBookingCancelModal === 'function') {
    try { return await window._openBookingCancelModal(bookingId); } catch (e) { console.warn('fallback openBookingCancelModal failed', e); }
  }

  try {
    // store cancel intent so booking page can show cancel UI immediately
    sessionStorage.setItem('bookingCancelId', bookingId);
    sessionStorage.setItem('bookingStep', '4'); // point to review where cancel action is visible
    if (typeof redirect === 'function') redirect('booking.html');
    else window.location.href = 'booking.html';
  } catch (e) {
    console.warn('openBookingCancelModal fallback failed', e);
    const url = new URL(window.location.origin + '/booking.html');
    url.searchParams.set('cancel', bookingId);
    if (typeof redirect === 'function') redirect(url.toString());
    else window.location.href = url.toString();
  }
}

// Expose globally for inline handlers
window.openBookingCancelModal = openBookingCancelModal;

window.openBookingDetailModal = openBookingDetailModal;
window.sortCustomerBookings = sortCustomerBookings;
window.changeCustomerBookingPage = changeCustomerBookingPage;
window.setRating = setRating;
window.saveReview = saveReview;

// Vaccination proof lightbox for viewing in booking details
window.openVaccinationProofLightbox = async function(bookingId) {
  let bookings = [];
  try {
    bookings = typeof getBookings === 'function' ? await getBookings() : [];
  } catch (e) {
    console.warn('Failed to get bookings for lightbox', e);
    return;
  }
  
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking || !booking.vaccinationProofImage) return;
  
  // Create lightbox overlay
  const lightbox = document.createElement('div');
  lightbox.id = 'vaccinationProofLightbox';
  lightbox.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    cursor: pointer;
  `;
  
  const img = document.createElement('img');
  img.src = booking.vaccinationProofImage;
  img.style.cssText = `
    max-width: 90%;
    max-height: 90%;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: #fff;
    border: none;
    border-radius: 50%;
    font-size: 24px;
    cursor: pointer;
    color: #333;
  `;
  
  lightbox.appendChild(img);
  lightbox.appendChild(closeBtn);
  document.body.appendChild(lightbox);
  
  // Close on click
  lightbox.addEventListener('click', function() {
    document.body.removeChild(lightbox);
  });
};

// ==================== PROOF OF PAYMENT FUNCTIONS ====================

// Handle proof of payment image upload
window.handleProofOfPaymentUpload = async function(bookingId, input) {
  const file = input.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    if (typeof customAlert !== 'undefined') {
      customAlert.warning('Invalid File', 'Please upload an image file (JPG, PNG, etc.)');
    } else {
      alert('Please upload an image file');
    }
    return;
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    if (typeof customAlert !== 'undefined') {
      customAlert.warning('File Too Large', 'Please upload an image smaller than 5MB');
    } else {
      alert('Please upload an image smaller than 5MB');
    }
    return;
  }
  
  // Show loading
  if (typeof showLoadingOverlay === 'function') {
    showLoadingOverlay('Uploading payment proof...');
  }
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64Image = e.target.result;
    
    try {
      // Get bookings and update
      let bookings = typeof getBookings === 'function' ? await getBookings() : [];
      const bookingIndex = bookings.findIndex(b => b.id === bookingId);
      
      if (bookingIndex === -1) {
        if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
        if (typeof customAlert !== 'undefined') {
          customAlert.error('Error', 'Booking not found');
        }
        return;
      }
      
      // Update booking with proof of payment
      bookings[bookingIndex].proofOfPaymentImage = base64Image;
      bookings[bookingIndex].proofOfPaymentUploadedAt = Date.now();
      
      // Save to Firebase
      if (typeof updateBooking === 'function') {
        await updateBooking(bookings[bookingIndex]);
      } else if (typeof saveBookings === 'function') {
        await saveBookings(bookings);
      }
      
      // Log history
      if (typeof logBookingHistory === 'function') {
        logBookingHistory({
          bookingId: bookingId,
          action: 'Payment Proof Uploaded',
          message: 'Customer uploaded proof of payment',
          actor: 'customer'
        });
      }
      
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      
      // Close modal and refresh
      if (typeof closeModal === 'function') closeModal();
      
      if (typeof customAlert !== 'undefined') {
        await customAlert.success('Upload Successful', 'Your payment proof has been uploaded. The admin will review it shortly.');
      }
      
      // Refresh bookings display
      if (typeof renderCustomerBookings === 'function') {
        renderCustomerBookings();
      }
      
      console.log('[ProofOfPayment] Image uploaded successfully for booking:', bookingId);
      
    } catch (error) {
      console.error('[ProofOfPayment] Upload error:', error);
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      if (typeof customAlert !== 'undefined') {
        customAlert.error('Upload Failed', 'Failed to upload payment proof. Please try again.');
      }
    }
  };
  
  reader.readAsDataURL(file);
};

// Remove proof of payment image
window.removeProofOfPayment = async function(bookingId) {
  const confirmed = typeof customAlert !== 'undefined' 
    ? await customAlert.confirm('Remove Payment Proof', 'Are you sure you want to remove the payment proof?')
    : confirm('Are you sure you want to remove the payment proof?');
  
  if (!confirmed) return;
  
  try {
    if (typeof showLoadingOverlay === 'function') {
      showLoadingOverlay('Removing...');
    }
    
    let bookings = typeof getBookings === 'function' ? await getBookings() : [];
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);
    
    if (bookingIndex === -1) {
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      return;
    }
    
    // Remove proof of payment
    bookings[bookingIndex].proofOfPaymentImage = null;
    bookings[bookingIndex].proofOfPaymentUploadedAt = null;
    
    // Save to Firebase
    if (typeof updateBooking === 'function') {
      await updateBooking(bookings[bookingIndex]);
    } else if (typeof saveBookings === 'function') {
      await saveBookings(bookings);
    }
    
    if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
    
    // Close modal and refresh
    if (typeof closeModal === 'function') closeModal();
    
    // Refresh bookings display
    if (typeof renderCustomerBookings === 'function') {
      renderCustomerBookings();
    }
    
    console.log('[ProofOfPayment] Image removed for booking:', bookingId);
    
  } catch (error) {
    console.error('[ProofOfPayment] Remove error:', error);
    if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
  }
};

// Open proof of payment in lightbox
window.openProofOfPaymentLightbox = async function(bookingId) {
  let bookings = [];
  try {
    bookings = typeof getBookings === 'function' ? await getBookings() : [];
  } catch (e) {
    console.warn('Failed to get bookings for lightbox', e);
    return;
  }
  
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking || !booking.proofOfPaymentImage) return;
  
  // Create lightbox overlay
  const lightbox = document.createElement('div');
  lightbox.id = 'proofOfPaymentLightbox';
  lightbox.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    cursor: pointer;
  `;
  
  const img = document.createElement('img');
  img.src = booking.proofOfPaymentImage;
  img.alt = 'Proof of Payment';
  img.style.cssText = `
    max-width: 90%;
    max-height: 90%;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  `;
  
  // Title
  const title = document.createElement('div');
  title.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    color: white;
    font-size: 1.2rem;
    font-weight: 600;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  `;
  title.textContent = `💳 Proof of Payment - ${booking.petName || 'Booking'}`;
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: #fff;
    border: none;
    border-radius: 50%;
    font-size: 24px;
    cursor: pointer;
    color: #333;
  `;
  
  lightbox.appendChild(title);
  lightbox.appendChild(img);
  lightbox.appendChild(closeBtn);
  document.body.appendChild(lightbox);
  
  // Close on click
  const closeHandler = () => {
    document.body.removeChild(lightbox);
  };
  
  lightbox.addEventListener('click', closeHandler);
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeHandler();
  });
  
  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeHandler();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
};

let customerHistoryState = {
  page: 1,
  pageSize: 5,
  searchTerm: '',
  sortOrder: 'desc'
};

async function renderCustomerBookingHistory() {
  const container = document.getElementById('customerHistoryTable');
  if (!container) return;

  const user = await getCurrentUser();
  if (!user) return;

  // Fetch bookings (async Firebase or sync fallback)
  let bookings = [];
  try {
    bookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []);
  } catch (e) {
    console.warn('renderCustomerBookingHistory: getBookings failed, using sync fallback', e);
    bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
  }
  if (!Array.isArray(bookings)) bookings = [];

  let history = getBookingHistory().filter(h => {
    const booking = bookings.find(b => b.id === h.bookingId);
    return booking && booking.userId === user.id;
  });

  // Apply search filter
  const searchTerm = customerHistoryState.searchTerm || '';
  if (searchTerm) {
    history = history.filter(h => {
      const booking = bookings.find(b => b.id === h.bookingId);
      const displayId = booking ? (typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : booking.id) : h.bookingId;
      const action = formatCustomerHistoryAction(h.action);
      const details = (h.message || h.note || '').toLowerCase();
      
      return displayId.toLowerCase().includes(searchTerm) ||
             action.toLowerCase().includes(searchTerm) ||
             details.includes(searchTerm);
    });
  }

  // Apply sort order
  const sortOrder = customerHistoryState.sortOrder || 'desc';
  history.sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.timestamp - b.timestamp;
    } else {
      return b.timestamp - a.timestamp;
    }
  });
  const userBookings = bookings.filter(b => b.userId === user.id);

  if (!history.length) {
    const message = customerHistoryState.searchTerm 
      ? `No results found for "${customerHistoryState.searchTerm}". Try a different search term.`
      : 'No booking history yet. Completed and cancelled bookings will appear here.';
    container.innerHTML = `
      <div style="padding: 3rem 2rem; text-align: center; background: #f9fafb; border-radius: var(--radius); border: 2px dashed var(--gray-300);">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📋</div>
        <p style="color: var(--gray-700); font-size: 1.1rem; margin-bottom: 0.5rem; font-weight: 500;">${message}</p>
        ${customerHistoryState.searchTerm ? `<p style="color: var(--gray-600); font-size: 0.9rem;">Clear the search to see all history.</p>` : ''}
      </div>
    `;
    // Still show controls even when empty
    const controls = document.getElementById('customerHistoryControls');
    if (controls) {
      controls.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1rem;">
          <div class="search-bar" style="margin-bottom: 0;">
            <input type="text" id="customerHistorySearch" class="search-input" placeholder="🔍 Search by booking ID, action, or details..." 
              value="${customerHistoryState.searchTerm || ''}" onkeyup="searchCustomerHistory(this.value)">
          </div>
          <div style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem; background: var(--gray-50); border-radius: var(--radius-sm); flex-wrap: wrap;">
            <label style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Sort by:</label>
            <select id="customerHistorySortOrder" class="form-select" style="width: auto; padding: 0.5rem;" onchange="filterCustomerHistory()">
              <option value="desc" ${customerHistoryState.sortOrder === 'desc' ? 'selected' : ''}>Newest First</option>
              <option value="asc" ${customerHistoryState.sortOrder === 'asc' ? 'selected' : ''}>Oldest First</option>
            </select>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <label for="customerHistoryPageSize" style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Show:</label>
              <select id="customerHistoryPageSize" class="form-select" style="width: auto; padding: 0.5rem;" onchange="changeCustomerHistoryPageSize(this.value)">
                <option value="5" ${customerHistoryState.pageSize === 5 ? 'selected' : ''}>5</option>
                <option value="10" ${customerHistoryState.pageSize === 10 ? 'selected' : ''}>10</option>
                <option value="20" ${customerHistoryState.pageSize === 20 ? 'selected' : ''}>20</option>
                <option value="50" ${customerHistoryState.pageSize === 50 ? 'selected' : ''}>50</option>
              </select>
              <span style="font-size: 0.9rem; color: var(--gray-600);">entries</span>
            </div>
          </div>
        </div>
      `;
    }
    return;
  }

  const totalPages = Math.ceil(history.length / customerHistoryState.pageSize);
  const start = (customerHistoryState.page - 1) * customerHistoryState.pageSize;
  const end = start + customerHistoryState.pageSize;
  const currentHistory = history.slice(start, end);

  const controls = document.getElementById('customerHistoryControls');
  if (controls) {
    controls.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1rem;">
        <div class="search-bar" style="margin-bottom: 0;">
          <input type="text" id="customerHistorySearch" class="search-input" placeholder="🔍 Search by booking ID, action, or details..." 
            value="${customerHistoryState.searchTerm || ''}" onkeyup="searchCustomerHistory(this.value)">
        </div>
        <div style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem; background: var(--gray-50); border-radius: var(--radius-sm); flex-wrap: wrap;">
          <label style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Sort by:</label>
          <select id="customerHistorySortOrder" class="form-select" style="width: auto; padding: 0.5rem;" onchange="filterCustomerHistory()">
            <option value="desc" ${customerHistoryState.sortOrder === 'desc' ? 'selected' : ''}>Newest First</option>
            <option value="asc" ${customerHistoryState.sortOrder === 'asc' ? 'selected' : ''}>Oldest First</option>
          </select>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label for="customerHistoryPageSize" style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Show:</label>
            <select id="customerHistoryPageSize" class="form-select" style="width: auto; padding: 0.5rem;" onchange="changeCustomerHistoryPageSize(this.value)">
              <option value="5" ${customerHistoryState.pageSize === 5 ? 'selected' : ''}>5</option>
              <option value="10" ${customerHistoryState.pageSize === 10 ? 'selected' : ''}>10</option>
              <option value="20" ${customerHistoryState.pageSize === 20 ? 'selected' : ''}>20</option>
              <option value="50" ${customerHistoryState.pageSize === 50 ? 'selected' : ''}>50</option>
            </select>
            <span style="font-size: 0.9rem; color: var(--gray-600);">entries</span>
          </div>
          <div style="font-size: 0.9rem; color: var(--gray-600);">
            Showing ${start + 1} to ${Math.min(end, history.length)} of ${history.length}
          </div>
        </div>
        ${totalPages > 1 ? `
          <div style="display: flex; justify-content: center; align-items: center; gap: 0.5rem;">
            <button class="btn btn-sm btn-outline" onclick="changeCustomerHistoryPage(1)" ${customerHistoryState.page === 1 ? 'disabled' : ''}>«</button>
            <button class="btn btn-sm btn-outline" onclick="changeCustomerHistoryPage(${customerHistoryState.page - 1})" ${customerHistoryState.page === 1 ? 'disabled' : ''}>‹</button>
            <span style="padding: 0.5rem 1rem; font-size: 0.9rem; color: var(--gray-700);">Page ${customerHistoryState.page} of ${totalPages}</span>
            <button class="btn btn-sm btn-outline" onclick="changeCustomerHistoryPage(${customerHistoryState.page + 1})" ${customerHistoryState.page === totalPages ? 'disabled' : ''}>›</button>
            <button class="btn btn-sm btn-outline" onclick="changeCustomerHistoryPage(${totalPages})" ${customerHistoryState.page === totalPages ? 'disabled' : ''}>»</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Booking ID</th>
            <th>Action</th>
            <th>Details</th>
            <th>Total Price</th>
          </tr>
        </thead>
        <tbody>
          ${currentHistory.map(entry => `
            ${(() => {
      const booking = bookings.find(b => b.id === entry.bookingId);
      const displayId = booking ? (typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : booking.id) : entry.bookingId;
      const actionLabel = formatCustomerHistoryAction(entry.action);
      
      // Calculate BALANCE TO PAY (what customer actually pays on visit)
      let balanceToPay = 0;
      if (booking) {
        const cost = booking.cost || {};
        const bookingFee = cost.bookingFee || 100;
        const isPaidStatus = isBookingFeePaid(booking.status);
        const isSingleServiceBooking = booking.packageId === 'single-service';
        const packagePrice = isSingleServiceBooking ? 0 : (cost.packagePrice || 0);
        
        // Get add-ons total
        let addOnsTotal = 0;
        if (booking.addOns && Array.isArray(booking.addOns)) {
          addOnsTotal = booking.addOns.reduce((sum, addon) => {
            if (typeof addon === 'object' && addon.price) return sum + addon.price;
            return sum;
          }, 0);
        } else if (cost.addOns && Array.isArray(cost.addOns)) {
          addOnsTotal = cost.addOns.reduce((sum, addon) => sum + (addon.price || 0), 0);
        }
        
        const servicesTotal = cost.services?.reduce((sum, s) => sum + (s.price || 0), 0) || 0;
        const subtotal = packagePrice + addOnsTotal + servicesTotal;
        
        if (isPaidStatus && subtotal > 0) {
          balanceToPay = Math.max(0, subtotal - bookingFee);
        } else if (cost.totalAmount) {
          balanceToPay = isPaidStatus ? Math.max(0, cost.totalAmount - bookingFee) : cost.totalAmount;
        } else if (booking.totalAmount || booking.totalPrice) {
          const total = booking.totalAmount || booking.totalPrice;
          balanceToPay = isPaidStatus ? Math.max(0, total - bookingFee) : total;
        }
      }
      
      const priceDisplay = balanceToPay > 0 
        ? (typeof formatCurrency === 'function' ? formatCurrency(balanceToPay) : `₱${balanceToPay}`)
        : '—';
      
      return `
            <tr>
              <td>
  ${new Date(entry.timestamp).toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,  // 12-hour format (AM/PM)
      })}
  ${new Date(entry.timestamp).toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      })}
</td>
              <td>${escapeHtml(displayId)}</td>
              <td>${escapeHtml(actionLabel)}</td>
              <td>${escapeHtml(entry.message || entry.note || '')}</td>
              <td><button class="btn btn-sm" style="background: #2e7d32; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 0.25rem; cursor: pointer; font-weight: 600;" onclick="openCustomerPricingBreakdownModal('${entry.bookingId}')">${priceDisplay}</button></td>
            </tr>
              `;
    })()}
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function changeCustomerHistoryPageSize(newSize) {
  customerHistoryState.pageSize = parseInt(newSize);
  customerHistoryState.page = 1;
  renderCustomerBookingHistory();
}

async function changeCustomerHistoryPage(newPage) {
  const user = await getCurrentUser();
  if (!user) return;

  // Fetch bookings once (async or sync fallback) before filtering history
  let bookings = [];
  try {
    bookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []);
  } catch (e) {
    console.warn('changeCustomerHistoryPage: getBookings failed, using sync fallback', e);
    bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
  }
  if (!Array.isArray(bookings)) bookings = [];

  const history = getBookingHistory().filter(h => {
    const booking = bookings.find(b => b.id === h.bookingId);
    return booking && booking.userId === user.id;
  });
  const totalPages = Math.ceil(history.length / customerHistoryState.pageSize);
  if (newPage >= 1 && newPage <= totalPages) {
    customerHistoryState.page = newPage;
    await renderCustomerBookingHistory();
  }
}

window.changeCustomerHistoryPageSize = changeCustomerHistoryPageSize;
window.changeCustomerHistoryPage = changeCustomerHistoryPage;

// Filter and sort booking history
function filterCustomerHistory() {
  const searchInput = document.getElementById('customerHistorySearch');
  const sortOrder = document.getElementById('customerHistorySortOrder');
  
  if (searchInput && sortOrder) {
    customerHistoryState.searchTerm = searchInput.value.toLowerCase();
    customerHistoryState.sortOrder = sortOrder.value;
    customerHistoryState.page = 1;
    renderCustomerBookingHistory();
  }
}
window.filterCustomerHistory = filterCustomerHistory;

function formatCustomerHistoryAction(action = '') {
  const normalized = action.toLowerCase();
  if (normalized.includes('cancel')) {
    return 'Cancelled';
  }
  if (normalized.includes('resched') || normalized.includes('edit')) {
    return 'Rescheduled';
  }
  if (normalized.includes('created')) {
    return 'Booked';
  }
  if (normalized.includes('updated')) {
    return 'Updated';
  }
  if (normalized.includes('confirmed')) {
    return 'Confirmed';
  }
  if (normalized.includes('completed')) {
    return 'Completed';
  }
  if (normalized.includes('no-show')) {
    return 'No Show';
  }
  if (normalized.includes('service started') || normalized.includes('in-progress') || normalized.includes('inprogress') || normalized.includes('in progress')) {
    return 'In Progress';
  }
  if (normalized.includes('pending')) {
    return 'Pending';
  }
  // Default fallback - return the original action if it doesn't match any known pattern
  return action || 'Pending';
}

function renderCustomerHistoryFallback(bookings = []) {
  // Only show completed bookings and cancelled bookings that were confirmed/inProgress
  // Don't show cancelled bookings that were only pending (waste of data)
  const historyBookings = bookings.filter(b => {
    const status = (b.status || '').toLowerCase();
    const isCancelled = status === 'cancelled' || status === 'cancelledbycustomer' || status === 'cancelledbyadmin';
    
    // Include completed bookings
    if (status === 'completed') return true;
    
    // Include cancelled bookings ONLY if they were confirmed or inProgress before cancellation
    // Check if booking has a previousStatus or if it was confirmed before being cancelled
    if (isCancelled && (b.previousStatus === 'confirmed' || b.previousStatus === 'inProgress' || b.wasConfirmed)) {
      return true;
    }
    
    return false;
  });
  
  if (!historyBookings.length) return '<p class="empty-state">No booking history yet. Completed and cancelled bookings will appear here.</p>';
  return `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Booking ID</th>
            <th>Pet</th>
            <th>Package</th>
            <th>Price</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${historyBookings.map(booking => {
    const code = typeof getBookingDisplayCode === 'function'
      ? getBookingDisplayCode(booking)
      : booking.id;

    // Calculate the BALANCE TO PAY (what customer actually pays on visit)
    // Formula: Subtotal (package + add-ons + services) - Booking Fee (if paid)
    let balanceToPay = 0;
    const cost = booking.cost || {};
    const bookingFee = cost.bookingFee || 100;
    const isPaidStatus = isBookingFeePaid(booking.status);
    
    // Calculate subtotal from package price + add-ons + single services
    const isSingleServiceBooking = booking.packageId === 'single-service';
    const packagePrice = isSingleServiceBooking ? 0 : (cost.packagePrice || 0);
    
    // Get add-ons total
    let addOnsTotal = 0;
    if (booking.addOns && Array.isArray(booking.addOns)) {
      addOnsTotal = booking.addOns.reduce((sum, addon) => {
        if (typeof addon === 'object' && addon.price) return sum + addon.price;
        return sum;
      }, 0);
    } else if (cost.addOns && Array.isArray(cost.addOns)) {
      addOnsTotal = cost.addOns.reduce((sum, addon) => sum + (addon.price || 0), 0);
    }
    
    // Get single services total
    const servicesTotal = cost.services?.reduce((sum, s) => sum + (s.price || 0), 0) || 0;
    
    // Calculate subtotal
    const subtotal = packagePrice + addOnsTotal + servicesTotal;
    
    // Balance to pay = Subtotal - Booking Fee (if status is confirmed/completed)
    if (isPaidStatus && subtotal > 0) {
      balanceToPay = Math.max(0, subtotal - bookingFee);
    } else if (cost.totalAmount) {
      // Fallback to totalAmount if available
      balanceToPay = isPaidStatus ? Math.max(0, cost.totalAmount - bookingFee) : cost.totalAmount;
    } else if (booking.totalAmount) {
      balanceToPay = isPaidStatus ? Math.max(0, booking.totalAmount - bookingFee) : booking.totalAmount;
    }
    
    const price = balanceToPay > 0 
      ? (typeof formatCurrency === 'function' ? formatCurrency(balanceToPay) : `₱${balanceToPay}`)
      : '—';

    return `
              <tr>
                <td>${formatDate(booking.date)} · ${formatTime(booking.time)}</td>
                <td>${escapeHtml(code)}</td>
                <td>${escapeHtml(booking.petName || '—')}</td>
                <td>${escapeHtml(booking.packageName || '—')}</td>
                <td><button class="btn btn-sm" style="background: #2e7d32; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 0.25rem; cursor: pointer; font-weight: 600;" onclick="openCustomerPricingBreakdownModal('${booking.id}')">${price}</button></td>
                <td>${escapeHtml(formatBookingStatus(booking.status))}</td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Ensure changeCustomerBookingPage exists before it's exported/used
function changeCustomerBookingPage(newPage) {
  if (!window.customerBookingState) {
    window.customerBookingState = { filter: 'all', page: 1, pageSize: 4 };
  }
  customerBookingState.page = Number(newPage) || 1;

  // Call the renderer; support async or sync implementations
  try {
    const result = (typeof renderCustomerBookings === 'function') ? renderCustomerBookings() : (typeof loadUserBookings === 'function' ? loadUserBookings() : null);
    if (result && typeof result.then === 'function') result.catch(() => { });
  } catch (e) {
    console.warn('changeCustomerBookingPage fallback render failed', e);
  }
}

// (Keep or move the global exposure so it runs after functions are defined)
window.changeCustomerBookingPage = changeCustomerBookingPage;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('customerDashboard')) {
    loadCustomerDashboard();
  }
});

// Ensure setRating exists for inline handlers (updates booking + redirects to review page)
async function setRating(bookingId, rating, redirectToReview = true) {
  let bookings = [];
  try {
    bookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []);
  } catch (e) {
    console.warn('setRating: getBookings failed, using sync fallback', e);
    bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
  }
  if (!Array.isArray(bookings)) bookings = [];

  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  booking.rating = Number(rating) || 0;

  try {
    if (typeof saveBookings === 'function') await saveBookings(bookings);
    else localStorage.setItem('bookings', JSON.stringify(bookings));
  } catch (e) {
    console.warn('setRating: save failed', e);
  }

  // Optionally navigate to review page so user can write a review
  if (redirectToReview) {
    window.location.href = `review.html?booking=${encodeURIComponent(bookingId)}`;
  }
}

// Expose globally for inline onclick attributes
window.setRating = setRating;

// Save review function
async function saveReview(bookingId) {
  let bookings = [];
  try {
    bookings = typeof getBookings === 'function'
      ? await getBookings()
      : (typeof getBookingsSync === 'function' ? getBookingsSync() : []);
  } catch (e) {
    console.warn('saveReview: getBookings failed, using sync fallback', e);
    bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
  }
  if (!Array.isArray(bookings)) bookings = [];

  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const reviewText = document.getElementById(`review-${bookingId}`)?.value?.trim() || '';
  const staffReviewText = document.getElementById(`staff-review-${bookingId}`)?.value?.trim() || '';

  booking.review = reviewText;
  booking.staffReview = staffReviewText;

  try {
    if (typeof saveBookings === 'function') {
      await saveBookings(bookings);
    } else {
      localStorage.setItem('bookings', JSON.stringify(bookings));
    }
  } catch (err) {
    console.error('saveReview: save failed', err);
  }

  // refresh UI if renderer exists
  try { if (typeof renderCustomerBookings === 'function') await renderCustomerBookings(); } catch (e) { /* ignore */ }

  customAlert.success('Review saved.');
}

// Expose globally for inline onclick attributes
window.saveReview = saveReview;

// Render warning panel with progress indicator towards ban (5 warnings = ban)
async function renderWarningPanel() {
  const container = document.getElementById('warningPanel');
  if (!container) return;
  
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      container.style.display = 'none';
      return;
    }

    // Get user's bookings to count no-shows and late cancellations
    const bookings = await getUserBookings();
    const noShowCount = bookings.filter(b => b.status === 'noShow' || b.status === 'no-show' || b.noShow === true).length;
    const lateCancelCount = bookings.filter(b => {
      if (!['cancelled', 'cancelledByCustomer'].includes(b.status)) return false;
      // Check if cancelled within 24 hours of appointment
      if (b.cancelledAt && b.date && b.time) {
        const appointmentTime = new Date(b.date + ' ' + b.time).getTime();
        const cancelTime = b.cancelledAt;
        const hoursBeforeAppointment = (appointmentTime - cancelTime) / (1000 * 60 * 60);
        return hoursBeforeAppointment < 24 && hoursBeforeAppointment >= 0;
      }
      return false;
    }).length;
    
    // Total warnings = no-shows + late cancellations (or use user.warnings if stored)
    const totalWarnings = user.warnings || user.warningCount || (noShowCount + lateCancelCount);
    const maxWarnings = 5;
    const isBanned = user.isBanned || totalWarnings >= maxWarnings;
    
    // Generate warning circles (5 circles)
    const generateWarningCircles = (count, max) => {
      let circles = '';
      for (let i = 1; i <= max; i++) {
        const isFilled = i <= count;
        const color = i <= 2 ? '#f9a825' : i <= 4 ? '#e65100' : '#c62828';
        circles += `<div style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; ${isFilled ? `background: ${color}; color: white;` : 'background: var(--gray-200); color: var(--gray-400);'}">${i}</div>`;
      }
      return circles;
    };
    
    // If banned
    if (isBanned) {
      container.style.display = 'block';
      container.innerHTML = `
        <div style="background: #ffebee; border-radius: 0.75rem; padding: 1rem; border: 1px solid #ffcdd2;">
          <div style="text-align: center; margin-bottom: 1rem;">
            <span style="font-size: 2.5rem;">🚫</span>
            <h4 style="margin: 0.5rem 0 0.25rem 0; color: #c62828; font-size: 1.1rem;">Account Restricted</h4>
            <p style="color: #b71c1c; font-size: 0.85rem; margin: 0;">5/5 Warnings Reached</p>
          </div>
          
          <div style="display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 1rem;">
            ${generateWarningCircles(5, 5)}
          </div>
          
          <div style="background: white; border-radius: 0.5rem; padding: 0.75rem; margin-bottom: 1rem;">
            <p style="color: var(--gray-700); font-size: 0.85rem; margin: 0 0 0.5rem 0; font-weight: 600;">How to Restore Access:</p>
            <ol style="color: var(--gray-600); font-size: 0.8rem; margin: 0; padding-left: 1.25rem;">
              <li style="margin-bottom: 0.25rem;">Pay the ₱500 uplift fee via GCash/Bank Transfer</li>
              <li style="margin-bottom: 0.25rem;">Click "Request Uplift" below</li>
              <li style="margin-bottom: 0.25rem;">Upload your proof of payment</li>
              <li>Wait for admin approval (1-2 business days)</li>
            </ol>
          </div>
          
          <button class="btn" onclick="document.getElementById('upliftModal').style.display='flex'" 
            style="width: 100%; background: #c62828; color: white; border: none; padding: 0.75rem; font-weight: 600;">
            📤 Request Uplift (₱500)
          </button>
        </div>
      `;
      return;
    }
    
    // If has warnings but not banned yet
    if (totalWarnings > 0) {
      container.style.display = 'block';
      const warningsLeft = maxWarnings - totalWarnings;
      const bgColor = totalWarnings >= 4 ? '#ffebee' : totalWarnings >= 3 ? '#fff3e0' : '#fffde7';
      const borderColor = totalWarnings >= 4 ? '#ffcdd2' : totalWarnings >= 3 ? '#ffe0b2' : '#fff9c4';
      const textColor = totalWarnings >= 4 ? '#c62828' : totalWarnings >= 3 ? '#e65100' : '#f57f17';
      
      container.innerHTML = `
        <div style="background: ${bgColor}; border-radius: 0.75rem; padding: 1rem; border: 1px solid ${borderColor};">
          <div style="text-align: center; margin-bottom: 0.75rem;">
            <span style="font-size: 2rem;">${totalWarnings >= 4 ? '😰' : totalWarnings >= 3 ? '😟' : '⚠️'}</span>
            <h4 style="margin: 0.25rem 0; color: ${textColor}; font-size: 1rem;">Warning Status</h4>
            <p style="color: ${textColor}; font-size: 1.5rem; font-weight: 700; margin: 0;">${totalWarnings}/${maxWarnings}</p>
          </div>
          
          <div style="display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 0.75rem;">
            ${generateWarningCircles(totalWarnings, maxWarnings)}
          </div>
          
          <p style="text-align: center; color: var(--gray-600); font-size: 0.8rem; margin: 0;">
            ${totalWarnings >= 4 
              ? '⚠️ <strong style="color: #c62828;">Last warning!</strong> One more and your account will be restricted.' 
              : `${warningsLeft} more warning${warningsLeft > 1 ? 's' : ''} before account restriction`}
          </p>
          
          <div style="background: white; border-radius: 0.5rem; padding: 0.5rem; margin-top: 0.75rem;">
            <p style="color: var(--gray-500); font-size: 0.75rem; margin: 0; text-align: center;">
              💡 Warnings are given for no-shows and late cancellations (within 24hrs)
            </p>
          </div>
        </div>
      `;
      return;
    }
    
    // No warnings - show good standing
    container.style.display = 'block';
    container.innerHTML = `
      <div style="background: #e8f5e9; border-radius: 0.75rem; padding: 1rem; border: 1px solid #c8e6c9;">
        <div style="text-align: center;">
          <span style="font-size: 2rem;">✨</span>
          <h4 style="margin: 0.25rem 0; color: #2e7d32; font-size: 1rem;">Good Standing</h4>
          <p style="color: #388e3c; font-size: 1.5rem; font-weight: 700; margin: 0;">0/${maxWarnings}</p>
        </div>
        
        <div style="display: flex; justify-content: center; gap: 0.5rem; margin: 0.75rem 0;">
          ${generateWarningCircles(0, maxWarnings)}
        </div>
        
        <p style="text-align: center; color: #1b5e20; font-size: 0.8rem; margin: 0;">
          🎉 No warnings! Keep up the good attendance.
        </p>
      </div>
    `;
    
  } catch (e) {
    console.warn('renderWarningPanel failed:', e);
    container.style.display = 'none';
  }
}
window.renderWarningPanel = renderWarningPanel;

// --- Added safe stubs to avoid runtime ReferenceErrors ---
// Minimal modal helper used by openBookingDetailModal (safe fallback)
function showModal(html) {
  // If a modal system exists elsewhere prefer it
  if (typeof window._showModal === 'function') {
    try { return window._showModal(html); } catch (e) { /* fallthrough to simple fallback */ }
  }
  // Simple fallback: create a basic modal element
  try {
    let existing = document.getElementById('simpleFallbackModal');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'simpleFallbackModal';
      existing.style.position = 'fixed';
      existing.style.left = '0';
      existing.style.top = '0';
      existing.style.width = '100%';
      existing.style.height = '100%';
      existing.style.background = 'rgba(0,0,0,0.5)';
      existing.style.display = 'flex';
      existing.style.alignItems = 'center';
      existing.style.justifyContent = 'center';
      existing.innerHTML = `<div id="simpleFallbackModalInner" style="background:#fff; max-width:480px; width:90%; max-height:90%; overflow:auto; padding:1.25rem; border-radius:12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);"></div>`;
      document.body.appendChild(existing);
      existing.addEventListener('click', (ev) => {
        if (ev.target === existing) existing.style.display = 'none';
      });
    }
    const inner = document.getElementById('simpleFallbackModalInner');
    // removed extra appended Close button to avoid duplicate small close UI
    inner.innerHTML = html;
    existing.style.display = 'flex';
  } catch (e) {
    // Last-resort fallback
    console.warn('showModal fallback failed, using alert', e);
    customAlert.show(stripHtml(html).slice(0, 200) + '...', 'info');
  }
}
window.showModal = showModal;

// Minimal password form setup stub (no-op if real impl is elsewhere)
function setupCustomerPasswordForm() {
  // prefer existing implementation if present
  if (typeof window._setupCustomerPasswordForm === 'function') {
    try { return window._setupCustomerPasswordForm(); } catch (e) { console.warn('fallback setupCustomerPasswordForm failed', e); }
  }
  // no-op: ensure any callers won't throw
  const el = document.getElementById('customerPasswordForm');
  if (el && !el.dataset.initialized) {
    el.dataset.initialized = 'true';
    // simple validation hookup if a form exists
    el.addEventListener('submit', function (ev) {
      ev.preventDefault();
      customAlert.info('Password change not configured on this build.');
    });
  }
}
window.setupCustomerPasswordForm = setupCustomerPasswordForm;

// helper used by alert fallback to remove tags
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Ensure getUserBookings and loadUserBookings exist for dashboard usage
async function getUserBookings() {
  const user = await (typeof getCurrentUser === 'function' ? getCurrentUser() : Promise.resolve(null));
  if (!user) return [];

  let allBookings;
  try {
    allBookings = typeof getBookings === 'function' ? await getBookings() : (typeof getBookingsSync === 'function' ? getBookingsSync() : []);
  } catch (e) {
    console.warn('getUserBookings: getBookings failed, using sync fallback', e);
    allBookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
  }
  if (!Array.isArray(allBookings)) allBookings = [];

  // Filter by userId, email, or customerName to match different booking storage methods
  return allBookings
    .filter(b => {
      // Match by userId
      if (b.userId === user.id) return true;
      // Match by email
      if (b.email === user.email) return true;
      // Match by customerName (if user has name field)
      if (user.name && b.customerName === user.name) return true;
      // Match by firstName + lastName
      if (user.firstName && b.customerName && b.customerName.includes(user.firstName)) return true;
      return false;
    })
    .sort((a, b) => {
      const da = new Date((a.date || '') + ' ' + (a.time || ''));
      const db = new Date((b.date || '') + ' ' + (b.time || ''));
      return db - da;
    });
}

async function loadUserBookings() {
  try {
    const bookings = await getUserBookings();
    customerBookingsCache = Array.isArray(bookings) ? bookings : [];
    if (typeof renderCustomerBookings === 'function') {
      await renderCustomerBookings();
    } else {
      // best-effort: if renderer missing, log and keep cache populated
      console.warn('renderCustomerBookings not found; customerBookingsCache updated.');
    }
    // Refresh calendar/preview if those exist
    if (typeof renderTeamCalendarPreview === 'function') await renderTeamCalendarPreview();
    if (typeof renderCustomerSlotsList === 'function') await renderCustomerSlotsList();
    return customerBookingsCache;
  } catch (e) {
    console.error('loadUserBookings failed:', e);
    return [];
  }
}

// Expose to global scope for inline handlers / nav
window.getUserBookings = getUserBookings;
window.loadUserBookings = loadUserBookings;

// Render My Pet's Gallery - shows before/after photos from customer's completed bookings
async function renderMyPetGallery() {
  const container = document.getElementById('myPetGalleryContainer');
  if (!container) return;

  container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">Loading your pet gallery...</p>';

  try {
    const bookings = await getUserBookings();
    
    // Filter bookings that have before/after images
    const galleryBookings = bookings.filter(b => b.beforeImage || b.afterImage);

    if (!galleryBookings.length) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📷</div>
          <h3 style="margin-bottom: 0.5rem; color: var(--gray-700);">No Photos Yet</h3>
          <p style="color: var(--gray-500);">Before & after photos will appear here after your grooming sessions are completed.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = galleryBookings.map(booking => {
      const bookingCode = typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : booking.id;
      const isPublic = booking.isPublicGallery || false;
      
      return `
        <div class="card" style="margin-bottom: 1.5rem; overflow: hidden;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0;">
            ${booking.beforeImage ? `
              <div style="position: relative;">
                <img src="${booking.beforeImage}" alt="Before" style="width: 100%; height: 200px; object-fit: cover;">
                <span style="position: absolute; top: 0.5rem; left: 0.5rem; background: rgba(0,0,0,0.7); color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600;">Before</span>
              </div>
            ` : '<div style="background: var(--gray-100); height: 200px; display: flex; align-items: center; justify-content: center; color: var(--gray-400);">No before photo</div>'}
            ${booking.afterImage ? `
              <div style="position: relative;">
                <img src="${booking.afterImage}" alt="After" style="width: 100%; height: 200px; object-fit: cover;">
                <span style="position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.7); color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600;">After</span>
              </div>
            ` : '<div style="background: var(--gray-100); height: 200px; display: flex; align-items: center; justify-content: center; color: var(--gray-400);">No after photo</div>'}
          </div>
          <div style="padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h4 style="margin: 0;">${escapeHtml(booking.petName || 'Pet')}</h4>
              <span class="badge ${getCustomerStatusClass(booking.status)}">${formatBookingStatus(booking.status)}</span>
            </div>
            <p style="color: var(--gray-600); font-size: 0.9rem; margin: 0.25rem 0;">
              <strong>Package:</strong> ${escapeHtml(booking.packageName || 'N/A')}
            </p>
            <p style="color: var(--gray-600); font-size: 0.9rem; margin: 0.25rem 0;">
              <strong>Date:</strong> ${formatDate ? formatDate(booking.date) : booking.date}
            </p>
            <p style="color: var(--gray-600); font-size: 0.9rem; margin: 0.25rem 0;">
              <strong>Groomer:</strong> ${escapeHtml(booking.groomerName || 'N/A')}
            </p>
            ${booking.groomingNotes ? `
              <p style="color: var(--gray-600); font-size: 0.9rem; margin: 0.25rem 0;">
                <strong>Notes:</strong> ${escapeHtml(booking.groomingNotes)}
              </p>
            ` : ''}
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--gray-200); display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 0.85rem; color: var(--gray-600);">Share to Reviews:</span>
                <label class="toggle-switch" style="position: relative; display: inline-block; width: 44px; height: 24px;">
                  <input type="checkbox" ${isPublic ? 'checked' : ''} onchange="toggleGalleryPublic('${booking.id}', this.checked)" style="opacity: 0; width: 0; height: 0;">
                  <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${isPublic ? '#2e7d32' : '#ccc'}; transition: 0.3s; border-radius: 24px;"></span>
                  <span style="position: absolute; content: ''; height: 18px; width: 18px; left: ${isPublic ? '23px' : '3px'}; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%;"></span>
                </label>
              </div>
              <span style="font-size: 0.75rem; color: ${isPublic ? '#2e7d32' : 'var(--gray-500)'}; font-weight: 500;">
                ${isPublic ? '✓ Visible on Reviews' : 'Private'}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error('renderMyPetGallery failed:', e);
    container.innerHTML = '<p class="empty-state" style="color: var(--danger);">Failed to load gallery. Please try again.</p>';
  }
}
window.renderMyPetGallery = renderMyPetGallery;

// Toggle gallery public/private status
async function toggleGalleryPublic(bookingId, isPublic) {
  try {
    let bookings = [];
    if (typeof getBookings === 'function') {
      bookings = await getBookings();
    }
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      customAlert.error('Booking not found');
      return;
    }

    booking.isPublicGallery = isPublic;

    if (typeof updateBooking === 'function') {
      await updateBooking(booking);
    } else if (typeof saveBookings === 'function') {
      await saveBookings(bookings);
    }

    // Re-render gallery to update UI
    renderMyPetGallery();
    
    if (isPublic) {
      customAlert.success('Photo shared to Reviews page!');
    } else {
      customAlert.success('Photo set to private.');
    }
  } catch (e) {
    console.error('toggleGalleryPublic failed:', e);
    customAlert.error('Failed to update. Please try again.');
  }
}
window.toggleGalleryPublic = toggleGalleryPublic;

// Window exports for helper functions (main definitions are above)
window.renderCommunityShowcase = renderCommunityShowcase;
window.formatBookingStatus = formatBookingStatus;

// Provide a safe global closeModal so HTML buttons won't throw
function closeModal() {
  // prefer an existing app-provided hook
  if (typeof window._closeModal === 'function') {
    try { window._closeModal(); return; } catch (e) { /* fallback below */ }
  }

  // Hide the simple fallback modal if present
  const simple = document.getElementById('simpleFallbackModal');
  if (simple) {
    simple.style.display = 'none';
    return;
  }

  // Generic fallback: hide common modal containers / role=dialog elements
  try {
    const candidates = Array.from(document.querySelectorAll('.modal, .modal-backdrop, [role="dialog"]'));
    candidates.forEach(el => {
      try { el.style.display = 'none'; } catch (e) { /* ignore */ }
    });
  } catch (e) { /* ignore */ }
}
window.closeModal = closeModal;

// Provide a safe startCancelBooking that cancels immediately (prefers app impl if present)
async function startCancelBooking(bookingId) {
  if (!bookingId) return;
  if (typeof window._startCancelBooking === 'function') {
    try { return await window._startCancelBooking(bookingId); } catch (e) { console.warn('fallback _startCancelBooking failed', e); }
  }

  customAlert.confirm('Confirm', 'Are you sure you want to cancel this booking? This action cannot be undone.').then(async (confirmed) => {
    if (!confirmed) return;

    try {
      let booking = null;
      if (typeof getBookingById === 'function') booking = await getBookingById(bookingId);
      else {
        const all = (typeof getBookings === 'function') ? await getBookings() : JSON.parse(localStorage.getItem('bookings') || '[]');
        booking = all.find(b => b.id === bookingId || b.shortId === bookingId) || null;
      }
      if (!booking) { customAlert.error('Booking not found.'); return; }
      
      // Track previous status before cancelling (for history filtering)
      booking.previousStatus = booking.status;
      booking.wasConfirmed = normalizeStatus(booking.status) === 'confirmed' || isInProgressStatus(booking.status);
      
      booking.status = 'cancelledByCustomer';
      booking.cancellationNote = booking.cancellationNote || 'Cancelled by customer';
      booking.cancelledAt = Date.now();

      if (typeof updateBooking === 'function') {
        await updateBooking(booking);
      } else if (typeof saveBookings === 'function' && typeof getBookings === 'function') {
        const all = await getBookings();
        const idx = all.findIndex(b => b.id === booking.id);
        if (idx >= 0) all[idx] = booking; else all.push(booking);
        await saveBookings(all);
      } else {
        const all = JSON.parse(localStorage.getItem('bookings') || '[]');
        const idx = all.findIndex(b => b.id === booking.id);
        if (idx >= 0) all[idx] = booking; else all.push(booking);
        localStorage.setItem('bookings', JSON.stringify(all));
      }

      if (typeof logBookingHistory === 'function') {
        try {
          logBookingHistory({
            bookingId: booking.id,
            action: 'Cancelled',
            message: `Customer cancelled booking ${booking.shortId || booking.id}`,
            actor: 'Customer'
          });
        } catch (e) { /* ignore */ }
      }

      // try to increment slot if booking date/time available
      try { if (typeof window.adjustSlotCount === 'function') await adjustSlotCount(booking.date, booking.time, +1); } catch (e) { /* ignore */ }

      customAlert.success('Your booking has been cancelled.');
      if (typeof refreshCustomerBookings === 'function') refreshCustomerBookings(); else window.location.reload();
    } catch (err) {
      console.error('Cancel booking failed', err);
      customAlert.error('Unable to cancel booking. Please try again or contact support.');
    }
  });
}
window.startCancelBooking = startCancelBooking;


// Open pricing breakdown modal for customer
async function openCustomerPricingBreakdownModal(bookingId) {
  let bookings = [];
  try {
    bookings = await getUserBookings();
  } catch (e) {
    console.warn('Failed to fetch bookings:', e);
    return;
  }

  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) {
    alert('Booking not found');
    return;
  }

  const cost = booking.cost || {};
  const bookingFee = cost.bookingFee || 100;
  
  // Get the base package price (without add-ons) - handle single service bookings
  const isSingleService = booking.packageId === 'single-service';
  const packagePrice = isSingleService ? 0 : (cost.packagePrice || 0);
  
  // Get single services
  const singleServicesArray = cost.services || [];
  const servicesTotal = singleServicesArray.reduce((sum, service) => sum + (service.price || 0), 0);
  
  // Get add-ons - prioritize booking.addOns since that's where we store them
  let addOnsArray = [];
  
  if (booking.addOns && Array.isArray(booking.addOns) && booking.addOns.length > 0) {
    // Use booking.addOns (this is where add-ons are stored when added via Manage Add-ons)
    addOnsArray = booking.addOns.map(addon => {
      // Handle object format: { name: 'Anti - Tick & Flea (FLIP 1cc) - Per Service', price: 124 }
      if (typeof addon === 'object' && addon.name && addon.price) {
        return { label: addon.name, price: addon.price };
      }
      // Handle string format: 'toothbrush', 'dematting', etc.
      if (typeof addon === 'string') {
        if (addon === 'toothbrush') return { label: 'Toothbrush', price: 25 };
        if (addon === 'dematting') return { label: 'De-matting', price: 80 };
        if (addon === 'anti-tick-flea') return { label: 'Anti-Tick & Flea', price: 150 };
        return { label: addon, price: 0 };
      }
      return { label: 'Unknown', price: 0 };
    });
  } else if (cost.addOns && Array.isArray(cost.addOns) && cost.addOns.length > 0) {
    // Fallback to cost.addOns if booking.addOns is empty
    addOnsArray = cost.addOns;
  }
  
  const addOnsTotal = addOnsArray.reduce((sum, addon) => sum + (addon.price || 0), 0);
  
  // Calculate correct total based on status
  // - For PENDING: Show full subtotal (customer hasn't paid booking fee yet)
  // - For CONFIRMED/IN PROGRESS/COMPLETED: Show subtotal minus booking fee (already paid)
  const subtotal = packagePrice + servicesTotal + addOnsTotal;
  const isPaidStatus = isBookingFeePaid(booking.status);
  const totalAmount = isPaidStatus ? Math.max(0, subtotal - bookingFee) : subtotal;

  const modalContent = `
    <div style="width: 100%; max-width: 450px; margin: 0 auto;">
      <h2 style="margin-bottom: 1rem; color: var(--gray-900);">💰 Pricing Breakdown</h2>
      
      <div style="background: var(--gray-50); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
          <span style="color: var(--gray-700);">Booking ID:</span>
          <span style="font-weight: 600; color: var(--gray-900);">${escapeHtml(typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : booking.id)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
          <span style="color: var(--gray-700);">Pet:</span>
          <span style="font-weight: 600; color: var(--gray-900);">${escapeHtml(booking.petName)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--gray-700);">Package:</span>
          <span style="font-weight: 600; color: var(--gray-900);">${escapeHtml(booking.packageName)}</span>
        </div>
      </div>

      <div style="border-top: 1px solid #e0e0e0; padding-top: 1rem; margin-bottom: 1rem;">
        <h3 style="margin-bottom: 0.75rem; font-size: 0.95rem; color: var(--gray-900);">Cost Breakdown</h3>
        
        ${packagePrice > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="color: var(--gray-700);">📦 Package:</span>
            <span style="font-weight: 600; color: var(--gray-900);">${formatCurrency(packagePrice)}</span>
          </div>
        ` : ''}

        ${servicesTotal > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="color: var(--gray-700);">🛁 Single Services:</span>
            <span style="font-weight: 600; color: var(--gray-900);">${formatCurrency(servicesTotal)}</span>
          </div>
        ` : ''}

        ${addOnsArray.length > 0 ? `
          <div style="margin-bottom: 0.5rem;">
            <span style="color: var(--gray-700);">✨ Add-ons:</span>
            ${addOnsArray.map(addon => `
              <div style="display: flex; justify-content: space-between; margin-top: 0.35rem; margin-left: 1rem;">
                <span style="color: var(--gray-600); font-size: 0.9rem;">• ${escapeHtml(addon.label)}</span>
                <span style="font-weight: 600; color: var(--gray-900);">${formatCurrency(addon.price)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; padding-top: 0.5rem; border-top: 1px solid #e0e0e0;">
          <span style="color: var(--gray-700); font-weight: 600;">Subtotal:</span>
          <span style="font-weight: 700; color: var(--gray-900);">${formatCurrency(subtotal)}</span>
        </div>

        ${isPaidStatus ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; background: #e8f5e9; padding: 0.5rem 0.75rem; border-radius: 4px;">
          <span style="color: #2e7d32;">🎫 Booking Fee (Paid):</span>
          <span style="font-weight: 600; color: #2e7d32;">- ${formatCurrency(bookingFee)}</span>
        </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; background: #e8f5e9; padding: 0.75rem; border-radius: 4px; border-left: 3px solid #2e7d32;">
          <span style="color: #2e7d32; font-weight: 700;">💰 Total Amount:</span>
          <span style="font-weight: 700; color: #2e7d32; font-size: 1.1rem;">${formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <button class="btn btn-primary" onclick="closeModal()" style="width: 100%; margin-top: 1rem;">Close</button>
    </div>
  `;

  showModal(modalContent);
}
window.openCustomerPricingBreakdownModal = openCustomerPricingBreakdownModal;


// Open spending details modal for customer
async function openCustomerSpendingDetailsModal() {
  let bookings = [];
  try {
    bookings = await getUserBookings();
  } catch (e) {
    console.warn('Failed to fetch bookings:', e);
    return;
  }

  // Filter confirmed and completed bookings
  const spendingBookings = bookings.filter(b => normalizeStatus(b.status) === 'confirmed' || normalizeStatus(b.status) === 'completed');

  if (spendingBookings.length === 0) {
    showModal(`
      <div style="text-align: center; padding: 2rem;">
        <h2 style="margin-bottom: 1rem;">💰 Spending Details</h2>
        <p style="color: var(--gray-600);">No confirmed or completed bookings yet.</p>
      </div>
    `);
    return;
  }

  // Calculate totals
  let totalSpent = 0;
  let totalPackages = 0;
  let totalAddOns = 0;

  const bookingDetails = spendingBookings.map(booking => {
    const cost = booking.cost || {};
    const isSingleServiceBooking = booking.packageId === 'single-service';
    const packagePrice = isSingleServiceBooking ? 0 : (cost.packagePrice || 0);
    const servicesTotal = (cost.services || []).reduce((sum, s) => sum + (s.price || 0), 0);
    const addOnsTotal = booking.addOns?.reduce((sum, addon) => sum + (addon.price || 0), 0) || 0;
    const totalPrice = booking.totalPrice || (packagePrice + servicesTotal + addOnsTotal);

    totalSpent += totalPrice;
    totalPackages += packagePrice + servicesTotal; // Include services in package total
    totalAddOns += addOnsTotal;

    return {
      id: typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : booking.id,
      pet: booking.petName,
      package: booking.packageName,
      packagePrice: packagePrice + servicesTotal, // Show combined for display
      addOnsTotal,
      totalPrice,
      date: booking.date,
      time: booking.time,
      status: booking.status
    };
  });

  const modalContent = `
    <div style="max-width: 900px;">
      <h2 style="margin-bottom: 1.5rem; color: var(--gray-900);">💰 Your Spending Details</h2>
      
      <!-- Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div style="background: #e8f5e9; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid #2e7d32;">
          <div style="color: #2e7d32; font-size: 0.9rem; font-weight: 600;">Total Spent</div>
          <div style="color: #2e7d32; font-size: 1.8rem; font-weight: 700; margin-top: 0.5rem;">${formatCurrency(totalSpent)}</div>
        </div>
        <div style="background: var(--gray-100); padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--gray-900);">
          <div style="color: var(--gray-900); font-size: 0.9rem; font-weight: 600;">Packages</div>
          <div style="color: var(--gray-900); font-size: 1.8rem; font-weight: 700; margin-top: 0.5rem;">${formatCurrency(totalPackages)}</div>
        </div>
        <div style="background: var(--gray-50); padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--gray-700);">
          <div style="color: var(--gray-700); font-size: 0.9rem; font-weight: 600;">Add-ons</div>
          <div style="color: var(--gray-700); font-size: 1.8rem; font-weight: 700; margin-top: 0.5rem;">${formatCurrency(totalAddOns)}</div>
        </div>
      </div>

      <!-- Detailed Table with Black & White Striped Theme -->
      <div style="border-top: 2px solid var(--gray-900); padding-top: 1.5rem; margin-bottom: 1.5rem;">
        <h3 style="margin-bottom: 1rem; color: var(--gray-900);">Booking Breakdown</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
              <tr style="background: var(--gray-900); color: white;">
                <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Receipt</th>
                <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Pet</th>
                <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Package</th>
                <th style="padding: 0.75rem; text-align: right; font-weight: 600;">Package</th>
                <th style="padding: 0.75rem; text-align: right; font-weight: 600;">Add-ons</th>
                <th style="padding: 0.75rem; text-align: right; font-weight: 600;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${bookingDetails.map((b, idx) => {
                const rowBg = idx % 2 === 0 ? 'background: white;' : 'background: var(--gray-100);';
                return `
                <tr style="${rowBg} border-bottom: 1px solid var(--gray-300);">
                  <td style="padding: 0.75rem; font-weight: 600; color: var(--gray-900);">${escapeHtml(b.id)}</td>
                  <td style="padding: 0.75rem;">${escapeHtml(b.pet)}</td>
                  <td style="padding: 0.75rem;">${escapeHtml(b.package)}</td>
                  <td style="padding: 0.75rem; text-align: right;">${formatCurrency(b.packagePrice)}</td>
                  <td style="padding: 0.75rem; text-align: right; color: #f57c00; font-weight: 600;">${formatCurrency(b.addOnsTotal)}</td>
                  <td style="padding: 0.75rem; text-align: right; font-weight: 700; color: #2e7d32;">${formatCurrency(b.totalPrice)}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div style="text-align: center; margin-top: 1.5rem;">
        <button class="btn btn-primary" onclick="closeModal()" style="width: 100%;">Close</button>
      </div>
    </div>
  `;

  showModal(modalContent);
}
window.openCustomerSpendingDetailsModal = openCustomerSpendingDetailsModal;

// ============================================
// CUSTOMER PROFILE MANAGEMENT
// ============================================

// Load customer profile data
async function loadCustomerProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      customAlert.warning('Not Logged In', 'Please log in to manage your profile.');
      return;
    }

    // Load profile data from user account and saved profile
    const profileForm = document.getElementById('customerProfileForm');
    const petForm = document.getElementById('customerPetForm');
    
    if (profileForm) {
      // Fill personal information
      document.getElementById('profileName').value = user.name || '';
      document.getElementById('profileEmail').value = user.email || '';
      document.getElementById('profilePhone').value = user.phone || '';
      document.getElementById('profileAddress').value = user.address || '';
    }

    // Load saved pet profile if exists
    try {
      const savedProfile = await getCustomerProfile(user.id);
      if (savedProfile && petForm) {
        document.getElementById('defaultPetName').value = savedProfile.petName || '';
        document.getElementById('defaultPetType').value = savedProfile.petType || '';
        document.getElementById('defaultPetBreed').value = savedProfile.breed || '';
        document.getElementById('defaultPetAge').value = savedProfile.age || '';
        document.getElementById('defaultMedicalNotes').value = savedProfile.medical || '';
        
        // Set weight radio button
        if (savedProfile.weight) {
          const weightRadio = document.querySelector(`input[name="defaultPetWeight"][value="${savedProfile.weight}"]`);
          if (weightRadio) weightRadio.checked = true;
        }
      }
    } catch (e) {
      console.warn('Could not load pet profile:', e);
    }

    // Load account statistics
    await loadProfileStats(user.id);

    // Setup form event listeners
    setupProfileFormListeners();

  } catch (error) {
    console.error('Error loading customer profile:', error);
    customAlert.error('Loading Error', 'Could not load profile data. Please try again.');
  }
}

// Setup profile form event listeners
function setupProfileFormListeners() {
  const profileForm = document.getElementById('customerProfileForm');
  const petForm = document.getElementById('customerPetForm');

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await updateCustomerProfile();
    });
  }

  if (petForm) {
    petForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await updatePetProfile();
    });
  }
}

// Update customer profile
async function updateCustomerProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      customAlert.warning('Not Logged In', 'Please log in to update your profile.');
      return;
    }

    const name = document.getElementById('profileName').value.trim();
    const phone = document.getElementById('profilePhone').value.trim();
    const address = document.getElementById('profileAddress').value.trim();

    if (!name) {
      customAlert.warning('Missing Information', 'Please enter your full name.');
      return;
    }

    // Validate phone number if provided
    if (phone) {
      const cleanPhone = phone.replace(/\s/g, '');
      if (!/^(\+63|0)[0-9]{10}$/.test(cleanPhone)) {
        customAlert.warning('Invalid Phone', 'Please enter a valid 11-digit phone number.');
        return;
      }
    }

    // Update user profile
    const updatedUser = {
      ...user,
      name: name,
      phone: phone,
      address: address
    };

    // Save updated profile
    if (typeof updateUserProfile === 'function') {
      await updateUserProfile(updatedUser);
    } else {
      // Fallback: update localStorage
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }

    customAlert.success('Profile Updated', 'Your personal information has been updated successfully.');
    
    // Update welcome name in dashboard
    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName) {
      welcomeName.textContent = name;
    }

  } catch (error) {
    console.error('Error updating profile:', error);
    customAlert.error('Update Failed', 'Could not update your profile. Please try again.');
  }
}

// Update pet profile
async function updatePetProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      customAlert.warning('Not Logged In', 'Please log in to update your pet profile.');
      return;
    }

    const petName = document.getElementById('defaultPetName').value.trim();
    const petType = document.getElementById('defaultPetType').value;
    const petBreed = document.getElementById('defaultPetBreed').value.trim();
    const petAge = document.getElementById('defaultPetAge').value;
    const medicalNotes = document.getElementById('defaultMedicalNotes').value.trim();
    const petWeight = document.querySelector('input[name="defaultPetWeight"]:checked')?.value || '';

    const petProfile = {
      petName: petName,
      petType: petType,
      breed: petBreed,
      age: petAge,
      weight: petWeight,
      medical: medicalNotes,
      ownerName: user.name || '',
      contactNumber: user.phone || '',
      address: user.address || ''
    };

    // Save pet profile
    await saveCustomerProfile(user.id, petProfile);

    customAlert.success('Pet Profile Saved', 'Your default pet information has been saved for faster booking.');

  } catch (error) {
    console.error('Error updating pet profile:', error);
    customAlert.error('Update Failed', 'Could not save your pet profile. Please try again.');
  }
}

// Load profile statistics
async function loadProfileStats(userId) {
  try {
    const user = await getCurrentUser();
    const bookings = await getUserBookings();
    const userBookings = bookings.filter(b => b.userId === userId);
    
    const totalBookings = userBookings.length;
    const completedBookings = userBookings.filter(b => b.status === 'completed').length;
    const totalSpent = userBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => {
        const cost = b.cost || {};
        return sum + (cost.totalAmount || b.totalPrice || 0);
      }, 0);
    
    const favoritePackage = getFavoritePackage(userBookings);
    const memberSince = user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();

    const statsContainer = document.getElementById('profileStats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #e8f5e9, #c8e6c9); border-radius: 8px; border-left: 4px solid #2e7d32;">
          <div style="font-size: 2rem; font-weight: 700; color: #2e7d32; margin-bottom: 0.5rem;">${totalBookings}</div>
          <div style="color: #2e7d32; font-weight: 600;">Total Bookings</div>
        </div>
        <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #e3f2fd, #bbdefb); border-radius: 8px; border-left: 4px solid #1976d2;">
          <div style="font-size: 2rem; font-weight: 700; color: #1976d2; margin-bottom: 0.5rem;">${completedBookings}</div>
          <div style="color: #1976d2; font-weight: 600;">Completed Sessions</div>
        </div>
        <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #fff3e0, #ffe0b2); border-radius: 8px; border-left: 4px solid #f57c00;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #f57c00; margin-bottom: 0.5rem;">${formatCurrency(totalSpent)}</div>
          <div style="color: #f57c00; font-weight: 600;">Total Spent</div>
        </div>
        <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #f3e5f5, #e1bee7); border-radius: 8px; border-left: 4px solid #8e24aa;">
          <div style="font-size: 1.2rem; font-weight: 700; color: #8e24aa; margin-bottom: 0.5rem;">${favoritePackage}</div>
          <div style="color: #8e24aa; font-weight: 600;">Favorite Package</div>
        </div>
        <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #fce4ec, #f8bbd9); border-radius: 8px; border-left: 4px solid #c2185b;">
          <div style="font-size: 2rem; font-weight: 700; color: #c2185b; margin-bottom: 0.5rem;">${memberSince}</div>
          <div style="color: #c2185b; font-weight: 600;">Member Since</div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading profile stats:', error);
  }
}

// Get favorite package from booking history
function getFavoritePackage(bookings) {
  if (!bookings.length) return 'None yet';
  
  const packageCounts = {};
  bookings.forEach(booking => {
    const packageName = booking.packageName || 'Unknown';
    packageCounts[packageName] = (packageCounts[packageName] || 0) + 1;
  });
  
  let maxCount = 0;
  let favoritePackage = 'None yet';
  
  Object.entries(packageCounts).forEach(([packageName, count]) => {
    if (count > maxCount) {
      maxCount = count;
      favoritePackage = packageName;
    }
  });
  
  return favoritePackage;
}

// Export functions
window.loadCustomerProfile = loadCustomerProfile;
window.updateCustomerProfile = updateCustomerProfile;
window.updatePetProfile = updatePetProfile;
// Load account statistics for calendar view
async function loadCalendarViewStats() {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const bookings = await getUserBookings();
    const userBookings = bookings.filter(b => b.userId === user.id);
    
    const totalBookings = userBookings.length;
    const completedBookings = userBookings.filter(b => b.status === 'completed').length;
    const pendingBookings = userBookings.filter(b => b.status === 'pending').length;
    const confirmedBookings = userBookings.filter(b => b.status === 'confirmed' || b.status === 'inProgress').length;
    
    const totalSpent = userBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => {
        const cost = b.cost || {};
        return sum + (cost.totalAmount || b.totalPrice || 0);
      }, 0);
    
    const favoritePackage = getFavoritePackage(userBookings);

    const statsContainer = document.getElementById('calendarViewStats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #e8f5e9, #c8e6c9); border-radius: 6px; border-left: 3px solid #2e7d32;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #2e7d32; margin-bottom: 0.25rem;">${totalBookings}</div>
          <div style="color: #2e7d32; font-weight: 600; font-size: 0.85rem;">Total Bookings</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #fff3e0, #ffe0b2); border-radius: 6px; border-left: 3px solid #f57c00;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #f57c00; margin-bottom: 0.25rem;">${pendingBookings}</div>
          <div style="color: #f57c00; font-weight: 600; font-size: 0.85rem;">Pending</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #e3f2fd, #bbdefb); border-radius: 6px; border-left: 3px solid #1976d2;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #1976d2; margin-bottom: 0.25rem;">${confirmedBookings}</div>
          <div style="color: #1976d2; font-weight: 600; font-size: 0.85rem;">Confirmed</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #e8f5e9, #c8e6c9); border-radius: 6px; border-left: 3px solid #388e3c;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #388e3c; margin-bottom: 0.25rem;">${completedBookings}</div>
          <div style="color: #388e3c; font-weight: 600; font-size: 0.85rem;">Completed</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #f3e5f5, #e1bee7); border-radius: 6px; border-left: 3px solid #8e24aa;">
          <div style="font-size: 1.1rem; font-weight: 700; color: #8e24aa; margin-bottom: 0.25rem;">${formatCurrency(totalSpent)}</div>
          <div style="color: #8e24aa; font-weight: 600; font-size: 0.85rem;">Total Spent</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: linear-gradient(135deg, #fce4ec, #f8bbd9); border-radius: 6px; border-left: 3px solid #c2185b;">
          <div style="font-size: 0.9rem; font-weight: 700; color: #c2185b; margin-bottom: 0.25rem;">${favoritePackage}</div>
          <div style="color: #c2185b; font-weight: 600; font-size: 0.85rem;">Favorite Package</div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading calendar view stats:', error);
  }
}

// Export the new function
window.loadCalendarViewStats = loadCalendarViewStats;
// Admin-style customer calendar - exact match to admin booking calendar
async function renderSimpleCustomerCalendar(customerBookings = []) {
  const container = document.getElementById('customerCalendar');
  if (!container) return;

  const currentDate = new Date();
  const currentMonth = customerCalendarMonth;
  const currentYear = customerCalendarYear;

  // Group customer bookings by date
  const customerBookingsByDate = {};
  customerBookings.forEach(booking => {
    if (booking.date) {
      if (!customerBookingsByDate[booking.date]) {
        customerBookingsByDate[booking.date] = [];
      }
      customerBookingsByDate[booking.date].push(booking);
    }
  });

  // Generate calendar HTML - EXACT Admin style match
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Get today's date in ISO format for comparison
  const todayISO = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  let calendarHTML = `
    <div class="mega-calendar-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
      <button class="btn btn-outline btn-sm" onclick="changeCustomerCalendarMonth(-1)">← Prev</button>
      <h3 style="margin:0;">${monthNames[currentMonth]} ${currentYear}</h3>
      <button class="btn btn-outline btn-sm" onclick="changeCustomerCalendarMonth(1)">Next →</button>
    </div>
    <div class="calendar-grid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:0.5rem;">
      ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div style="text-align:center; font-weight:bold; color:var(--gray-500); font-size:0.85rem; padding:0.5rem;">${d}</div>`).join('')}
  `;

  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarHTML += `<div style="background:transparent;"></div>`;
  }

  // Add days of the month - EXACT admin style
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayBookings = customerBookingsByDate[dateStr] || [];
    const isToday = dateStr === todayISO;
    
    // Admin-style colors
    let borderColor = 'var(--gray-200)';
    if (dayBookings.length >= 3) borderColor = '#ff9800'; // busy day
    if (isToday) borderColor = 'var(--primary-color)';
    
    calendarHTML += `
      <div style="background:var(--white); border:1px solid ${borderColor}; border-radius:var(--radius-sm); padding:0.5rem; min-height:80px; cursor:pointer; position:relative; transition:all 0.2s;">
        <div style="font-weight:600; color:var(--gray-900); display:flex; justify-content:space-between;">
          <span>${day}</span>
        </div>
        
        <div style="margin-top:0.25rem;">
          ${dayBookings.slice(0, 3).map(booking => {
            let dotColor = '#4caf50'; // confirmed - green
            if (booking.status === 'pending') dotColor = '#ff9800'; // orange
            if (booking.status === 'In Progress' || booking.status === 'inprogress') dotColor = '#2196f3'; // blue
            if (booking.status === 'completed') dotColor = '#4caf50'; // green
            if (['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(booking.status)) dotColor = '#f44336'; // red
            return `<div style="font-size:0.75rem; color:var(--gray-700); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer;" onclick="openBookingDetailModal('${booking.id}')" title="${booking.petName} - ${booking.packageName || 'Custom'} (${booking.status})">
              <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${dotColor}; margin-right:4px;"></span>
              ${booking.time} ${booking.petName}
            </div>`;
          }).join('')}
          ${dayBookings.length > 3 ? `<div style="font-size:0.75rem; color:var(--gray-500); text-align:center;">+${dayBookings.length - 3} more</div>` : ''}
        </div>
      </div>
    `;
  }

  calendarHTML += `</div>`;
  container.innerHTML = calendarHTML;
}

// Get admin-style dot color based on booking status
function getAdminStyleDotColor(status) {
  const normalizedStatus = (status || '').toLowerCase();
  switch (normalizedStatus) {
    case 'completed': return '#4caf50';  // Green
    case 'confirmed': return '#2196f3';  // Blue
    case 'inprogress': case 'in progress': return '#2196f3';  // Blue
    case 'pending': return '#ff9800';    // Orange/Yellow
    case 'cancelled': case 'cancelledbycustomer': case 'cancelledbyadmin': return '#f44336';  // Red
    default: return '#9e9e9e';  // Gray
  }
}



// Get booking status color
function getBookingStatusColor(status) {
  const normalizedStatus = (status || '').toLowerCase();
  switch (normalizedStatus) {
    case 'completed': return '#4caf50';
    case 'confirmed': return '#2196f3';
    case 'inprogress': case 'in progress': return '#2196f3';
    case 'pending': return '#ff9800';
    case 'cancelled': case 'cancelledbycustomer': case 'cancelledbyadmin': return '#f44336';
    default: return '#9e9e9e';
  }
}

// Calendar month navigation (placeholder)
let customerCalendarMonth = new Date().getMonth();
let customerCalendarYear = new Date().getFullYear();

async function changeCustomerCalendarMonth(direction) {
  customerCalendarMonth += direction;
  if (customerCalendarMonth < 0) {
    customerCalendarMonth = 11;
    customerCalendarYear--;
  } else if (customerCalendarMonth > 11) {
    customerCalendarMonth = 0;
    customerCalendarYear++;
  }
  
  // Re-render calendar with new month
  try {
    const user = await getCurrentUser();
    if (user) {
      const allBookings = await getBookings();
      const customerBookings = allBookings.filter(b => b.userId === user.id);
      await renderSimpleCustomerCalendar(customerBookings);
    }
  } catch (e) {
    console.error('Error changing calendar month:', e);
  }
}

// Export functions
window.renderSimpleCustomerCalendar = renderSimpleCustomerCalendar;
window.changeCustomerCalendarMonth = changeCustomerCalendarMonth;