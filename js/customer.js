/* ============================================
   BestBuddies Pet Grooming - Customer Dashboard
   Version: 2.0 - Lazy Loading (No Full-Screen Blocker)
   Updated: December 2025
   ============================================ */

// Load customer dashboard with lazy loading (no full-screen blocker)
async function loadCustomerDashboard() {
  // Force hide any existing loaders immediately
  if (typeof loadingManager !== 'undefined') {
    loadingManager.hideAllLoaders();
  }
  if (typeof hideDashboardLoader === 'function') {
    hideDashboardLoader();
  }
  
  // Add class to body for CSS fallback (transparent navbar on mobile)
  document.body.classList.add('customer-dashboard-page');
  
  // NO full-screen loader - page shows immediately with skeleton placeholders
  
  try {
    // Check if user is logged in with timeout
    const loginTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Login check timeout')), 3000);
    });
    
    const isLoggedIn = await Promise.race([
      requireLogin(),
      loginTimeout
    ]).catch(error => {
      console.warn('Login check failed:', error.message);
      return false;
    });
    
    if (!isLoggedIn) {
      return;
    }

    // Get user with timeout and fallback
    const userTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('User fetch timeout')), 3000);
    });
    
    const user = await Promise.race([
      getCurrentUser(),
      userTimeout
    ]).catch(error => {
      console.warn('User fetch failed:', error.message);
      // Try localStorage fallback
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    });

    // Handle case where user is null
    if (!user) {
      console.warn('No user found, using guest mode');
      // Redirect to login if no user found
      window.location.href = 'login.html';
      return;
    }

    // Update welcome message immediately
    const welcomeElement = document.getElementById('welcomeName');
    if (welcomeElement) {
      const displayName = user.name || user.email?.split('@')[0] || 'Customer';
      welcomeElement.textContent = displayName;
      welcomeElement.classList.add('fade-in');
    }

    // Setup sidebar navigation (instant)
    setupCustomerSidebarNavigation();
    setupCustomerBookingFilters();

    // ============================================
    // 🚀 OPTIMIZED PARALLEL LOADING WITH CACHING
    // Load multiple components in parallel instead of sequential
    // ============================================
    const loadingPromises = [];
    
    // 1. Warning panel with timeout and caching
    loadingPromises.push(
      Promise.race([
        renderWarningPanel(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Warning panel timeout')), 3000))
      ]).catch(error => console.warn('[Dashboard] Warning panel failed:', error.message))
    );
    
    // 2. Auto-cancel check with timeout
    if (typeof checkAndCancelPendingBookings === 'function') {
      loadingPromises.push(
        Promise.race([
          checkAndCancelPendingBookings(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Auto-cancel timeout')), 3000))
        ]).catch(error => console.warn('[Dashboard] Auto-cancel failed:', error.message))
      );
    }
    
    // 3. User bookings with caching
    loadingPromises.push(
      Promise.race([
        loadUserBookingsWithCache(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Bookings timeout')), 8000))
      ]).then(() => {
        hideSkeletonBookings();
        showLiveCountdownNow();
        initMobileCountdown();
      }).catch(error => {
        console.warn('[Dashboard] Bookings failed:', error.message);
        const bookingsContainer = document.getElementById('bookingsContainer');
        if (bookingsContainer) {
          bookingsContainer.innerHTML = '<div class="no-bookings fade-in">Unable to load bookings. Please refresh the page.</div>';
        }
      })
    );
    
    // 4. Quick stats with caching
    loadingPromises.push(
      loadQuickStatsWithCache().catch(error => console.warn('[Dashboard] Stats failed:', error.message))
    );
    
    // Wait for all critical components to load in parallel
    await Promise.allSettled(loadingPromises);

    // ============================================
    // 🚀 LAZY LOAD NON-CRITICAL COMPONENTS
    // Load these after critical content is ready
    // ============================================
    lazyLoadNonCriticalComponents();
    
    // Setup lazy image loading
    setupLazyImageLoading();

    // Check for booking confirmation notifications with timeout
    try {
      const notificationsTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Notifications loading timeout')), 2000);
      });
      await Promise.race([renderBookingNotifications(), notificationsTimeout]);
    } catch (error) {
      console.warn('Notifications loading failed:', error.message);
    }
    
    // Update notification badge
    updateCustomerNotificationBadge();
  
  // Refresh notifications every 30 seconds
  setInterval(updateCustomerNotificationBadge, 30000);
  
  // Setup real-time listener for auto-refresh of bookings
  if (typeof setupBookingsListener === 'function') {
    setupBookingsListener(async (updatedBookings) => {
      // Filter bookings for current user using same logic as getUserBookings
      const userId = user.id || user.uid;
      const userEmail = user.email?.toLowerCase();
      const userName = user.name?.toLowerCase();
      
      const userBookings = updatedBookings.filter(b => {
        if (b.userId === userId) return true;
        if (b.customerId === userId) return true;
        if (userEmail && b.email?.toLowerCase() === userEmail) return true;
        if (userEmail && b.customerEmail?.toLowerCase() === userEmail) return true;
        if (userName && b.customerName?.toLowerCase() === userName) return true;
        if (userName && b.ownerName?.toLowerCase() === userName) return true;
        return false;
      }).sort((a, b) => {
        const da = new Date((a.date || '') + ' ' + (a.time || ''));
        const db = new Date((b.date || '') + ' ' + (b.time || ''));
        return db - da;
      });
      
      // Update the cache BEFORE rendering
      customerBookingsCache = userBookings;
      
      // Clear stats cache to force recalculation
      localStorage.removeItem('quickStats_cache');
      
      // Update quick stats
      await loadQuickStats();
      
      // Re-render bookings (now uses updated cache)
      await renderCustomerBookings();
      
      // Update calendar
      renderCustomerCalendar(userBookings);
      
      // Update notifications
      updateCustomerNotificationBadge();
      
      // Refresh mobile countdown banner
      initMobileCountdown();
    });
    
  }
  
  // Close notification panel when clicking outside
  document.addEventListener('click', function(e) {
    const panel = document.getElementById('customerNotificationPanel');
    const bell = document.getElementById('customerNotificationBell');
    if (panel && bell && customerNotificationPanelOpen) {
      if (!panel.contains(e.target) && !bell.contains(e.target)) {
        closeCustomerNotificationPanel();
      }
    }
  });

  // Load calendar - use cached bookings
  renderCustomerCalendar(customerBookingsCache);

  // Account
  setupCustomerPasswordForm();
  
  // Show live countdown now
  showLiveCountdownNow();
  
  // Also initialize mobile countdown
  initMobileCountdown();
  
  } catch (error) {
    console.error('Error loading customer dashboard:', error);
    // Show error in stats area instead of full-screen
    const statsContainer = document.getElementById('quickStats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-card fade-in" style="grid-column: 1 / -1; background: #ffebee; padding: 1.5rem; border-radius: 12px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
          <div style="color: #c62828; font-weight: 600;">Failed to load dashboard</div>
          <div style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">Please refresh the page</div>
        </div>
      `;
    }
  }
  // No finally block needed - no loader to hide
}

// Load quick stats with fade-in animation (replaces skeleton)
async function loadQuickStatsWithAnimation() {
  const statsContainer = document.getElementById('quickStats');
  if (!statsContainer) {
    console.error('[Customer Dashboard] quickStats container not found in HTML!');
    return;
  }
  
  // Use cached bookings
  const bookings = customerBookingsCache || [];
  const totalBookings = bookings.length;
  const cancelledStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'];
  
  // Filter pending bookings - Pay Now never expires, Pay Later expires after appointment time
  const pendingBookings = bookings.filter(b => {
    if (normalizeStatus(b.status) !== 'pending') return false;
    
    // Pay Now bookings: Never expire, always count as pending
    if (b.paymentChoice === 'payNow') {
      return true;
    }
    
    // Pay Later or no choice: Check if booking is expired (past appointment time)
    if (b.date && b.time) {
      const bookingDate = new Date(b.date);
      const now = new Date();
      
      // Parse time to get hours and minutes - handle both range (12pm-3pm) and single time (2:00 PM)
      let bookingHour = 0;
      let bookingMinute = 0;
      
      // First try to match time range format (e.g., "12pm-3pm" or "12 PM - 3 PM")
      const rangeMatch = (b.time || '').match(/(\d{1,2})\s*(am|pm)?\s*[-–]\s*(\d{1,2})\s*(am|pm)?/i);
      if (rangeMatch) {
        // For range, use the END time to determine expiration
        bookingHour = parseInt(rangeMatch[3], 10);
        bookingMinute = 0;
        const endPeriod = rangeMatch[4] || rangeMatch[2] || 'pm';
        const isPM = /pm/i.test(endPeriod);
        if (isPM && bookingHour !== 12) bookingHour += 12;
        else if (!isPM && bookingHour === 12) bookingHour = 0;
      } else {
        // Try single time format
        const timeMatch = (b.time || '').match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
          bookingHour = parseInt(timeMatch[1], 10);
          bookingMinute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const isPM = /pm/i.test(b.time);
          if (isPM && bookingHour !== 12) bookingHour += 12;
          else if (!/pm/i.test(b.time) && /am/i.test(b.time) && bookingHour === 12) bookingHour = 0;
        }
      }
      
      bookingDate.setHours(bookingHour, bookingMinute, 0, 0);
      
      // If appointment time has passed, it's expired
      if (now > bookingDate) {
        return false; // Don't count as pending
      }
    }
    
    return true;
  }).length;
  
  const confirmedBookings = bookings.filter(b => {
    const s = (b.status || '').toLowerCase().replace(/\s+/g, '');
    return s === 'confirmed' || s === 'inprogress';
  }).length;
  const cancelledBookings = bookings.filter(b => cancelledStatuses.includes(b.status)).length;
  
  // Cache the stats data
  const statsData = {
    totalBookings,
    pendingBookings,
    completedBookings: confirmedBookings,
    cancelledBookings
  };
  
  try {
    localStorage.setItem('quickStats_cache', JSON.stringify({
      data: statsData,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('[Performance] Failed to cache stats:', e.message);
  }
  
  // Replace skeleton with real stats (with fade-in animation)
  statsContainer.innerHTML = `
    <div class="stat-card fade-in" style="background: linear-gradient(135deg, rgba(100, 181, 246, 0.15), rgba(66, 165, 245, 0.15)); cursor: pointer; padding: 1.5rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" onclick="sortCustomerBookings('all')">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">📅</div>
      <div style="font-size: 2rem; color: #1976d2; font-weight: 700;">${totalBookings}</div>
      <div style="color: #666; font-weight: 600; text-transform: uppercase; font-size: 0.7rem;">TOTAL BOOKINGS</div>
    </div>
    <div class="stat-card fade-in" style="background: linear-gradient(135deg, rgba(255, 235, 59, 0.2), rgba(255, 224, 130, 0.2)); cursor: pointer; padding: 1.5rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); animation-delay: 0.05s;" onclick="sortCustomerBookings('pending')">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏳</div>
      <div style="font-size: 2rem; color: #f57c00; font-weight: 700;">${pendingBookings}</div>
      <div style="color: #666; font-weight: 600; text-transform: uppercase; font-size: 0.7rem;">PENDING</div>
    </div>
    <div class="stat-card fade-in" style="background: linear-gradient(135deg, rgba(129, 199, 132, 0.2), rgba(102, 187, 106, 0.2)); cursor: pointer; padding: 1.5rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); animation-delay: 0.1s;" onclick="sortCustomerBookings('confirmed')">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">✅</div>
      <div style="font-size: 2rem; color: #388e3c; font-weight: 700;">${confirmedBookings}</div>
      <div style="color: #666; font-weight: 600; text-transform: uppercase; font-size: 0.7rem;">CONFIRMED</div>
    </div>
    <div class="stat-card fade-in" style="background: linear-gradient(135deg, rgba(239, 83, 80, 0.15), rgba(229, 115, 115, 0.15)); cursor: pointer; padding: 1.5rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); animation-delay: 0.15s;" onclick="sortCustomerBookings('cancelled')">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">❌</div>
      <div style="font-size: 2rem; color: #d32f2f; font-weight: 700;">${cancelledBookings}</div>
      <div style="color: #666; font-weight: 600; text-transform: uppercase; font-size: 0.7rem;">CANCELLED</div>
    </div>
  `;
}

// Hide skeleton bookings after real content loads
function hideSkeletonBookings() {
  const skeletons = document.querySelectorAll('.skeleton-booking');
  skeletons.forEach(skeleton => {
    skeleton.style.display = 'none';
  });
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

  // Bottom Navigation (Mobile) - Setup click handlers
  const bottomNavItems = document.querySelectorAll('.bottom-nav-items a[data-view]');
  bottomNavItems.forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      const view = this.dataset.view;
      
      // Update active state on bottom nav
      bottomNavItems.forEach(navItem => navItem.classList.remove('active'));
      this.classList.add('active');
      
      if (view === 'bookings-dropdown') {
        // For bookings, go to overview and scroll to bookings section
        switchCustomerView('overview');
        setTimeout(() => {
          const bookingsSection = document.getElementById('recentBookingsSection');
          if (bookingsSection) {
            bookingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      } else if (view) {
        switchCustomerView(view);
      }
    });
  });
}

let customerBookingsCache = [];
let customerBookingState = {
  filter: 'all',
  page: 1,
  pageSize: 4,
  sortOrder: 'desc' // 'desc' = newest first, 'asc' = oldest first
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

// ============================================
// 📋 BOOKING STATUS HELPER FUNCTIONS
// ============================================
// These functions handle status comparison and validation
// Status can be stored in different formats (spaces, case, etc.)
// These helpers normalize and check status consistently
// ============================================

/**
 * Normalize booking status for comparison
 * Handles different status formats: "In Progress", "in progress", "inprogress"
 * 
 * @param {string} status - Booking status
 * @returns {string} Normalized status (lowercase, no spaces)
 * 
 * Example:
 * - "In Progress" -> "inprogress"
 * - "Confirmed" -> "confirmed"
 * - "Cancelled By Customer" -> "cancelledbycustomer"
 */
function normalizeStatus(status) {
  return (status || '').toLowerCase().replace(/\s+/g, '');
}

/**
 * Check if booking status is "In Progress"
 * Handles multiple formats: "inprogress", "in progress", "In Progress"
 * 
 * @param {string} status - Booking status
 * @returns {boolean} True if status is "in progress"
 */
function isInProgressStatus(status) {
  const normalized = normalizeStatus(status);
  return normalized === 'inprogress' || normalized === 'in progress';
}

/**
 * Check if booking fee has been paid
 * Booking fee is considered paid when status is:
 * - confirmed (customer paid booking fee)
 * - inprogress (service started, fee already paid)
 * - completed (service done, fee was paid)
 * 
 * @param {string} status - Booking status
 * @returns {boolean} True if booking fee is paid
 * 
 * Used for:
 * - Calculating amount to pay on arrival (subtract booking fee if paid)
 * - Determining if customer can still cancel (can't cancel if fee paid)
 * - Showing correct price breakdown
 */
function isBookingFeePaid(status) {
  const normalized = normalizeStatus(status);
  return ['confirmed', 'inprogress', 'completed'].includes(normalized);
}

// Load quick stats with clickable cards
async function loadQuickStats() {
  
  // Show loading for stats container
  const statsContainer = document.getElementById('quickStats');
  if (!statsContainer) {
    console.error('[loadQuickStats] quickStats container not found!');
    return;
  }
  
  showTableLoader('#quickStats');
  
  try {
    // Use cached bookings if available, otherwise fetch
    let bookings = customerBookingsCache;
    if (!bookings || bookings.length === 0) {
      bookings = await getUserBookings();
    }
    
  const totalBookings = bookings.length;
  // Slots removed
  const cancelledStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'];
  
  // Filter pending bookings - Pay Now never expires, Pay Later expires after appointment time
  const pendingBookings = bookings.filter(b => {
    if (normalizeStatus(b.status) !== 'pending') return false;
    
    // Pay Now bookings: Never expire, always count as pending
    if (b.paymentChoice === 'payNow') {
      return true;
    }
    
    // Pay Later or no choice: Check if booking is expired (past appointment time)
    if (b.date && b.time) {
      const bookingDate = new Date(b.date);
      const now = new Date();
      
      // Parse time to get hours and minutes - handle both range (12pm-3pm) and single time (2:00 PM)
      let bookingHour = 0;
      let bookingMinute = 0;
      
      // First try to match time range format (e.g., "12pm-3pm" or "12 PM - 3 PM")
      const rangeMatch = (b.time || '').match(/(\d{1,2})\s*(am|pm)?\s*[-–]\s*(\d{1,2})\s*(am|pm)?/i);
      if (rangeMatch) {
        // For range, use the END time to determine expiration
        bookingHour = parseInt(rangeMatch[3], 10);
        bookingMinute = 0;
        const endPeriod = rangeMatch[4] || rangeMatch[2] || 'pm';
        const isPM = /pm/i.test(endPeriod);
        if (isPM && bookingHour !== 12) bookingHour += 12;
        else if (!isPM && bookingHour === 12) bookingHour = 0;
      } else {
        // Try single time format
        const timeMatch = (b.time || '').match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
          bookingHour = parseInt(timeMatch[1], 10);
          bookingMinute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const isPM = /pm/i.test(b.time);
          if (isPM && bookingHour !== 12) bookingHour += 12;
          else if (!/pm/i.test(b.time) && /am/i.test(b.time) && bookingHour === 12) bookingHour = 0;
        }
      }
      
      bookingDate.setHours(bookingHour, bookingMinute, 0, 0);
      
      // If appointment time has passed, it's expired
      if (now > bookingDate) {
        return false; // Don't count as pending
      }
    }
    
    return true;
  }).length;
  
  const confirmedBookings = bookings.filter(b => normalizeStatus(b.status) === 'confirmed' || isInProgressStatus(b.status)).length;
  const cancelledBookings = bookings.filter(b => cancelledStatuses.includes(b.status)).length;

  // Calculate total spent on confirmed bookings
  const totalSpent = bookings
    .filter(b => normalizeStatus(b.status) === 'confirmed' || normalizeStatus(b.status) === 'completed')
    .reduce((sum, b) => sum + (b.totalPrice || b.cost?.subtotal || 0), 0);

  const statsContainer = document.getElementById('quickStats');
  if (statsContainer) {
    // Force visibility
    statsContainer.style.display = 'grid';
    statsContainer.style.visibility = 'visible';
    statsContainer.style.opacity = '1';
    
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
  } else {
    console.error('[loadQuickStats] statsContainer not found after getting bookings!');
  }
  } catch (error) {
    console.error('Error loading quick stats:', error);
    loadingManager.showError('Failed to load statistics');
  } finally {
    // Hide loading for stats container
    hideTableLoader('#quickStats');
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

  const cancelledStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'];

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

  // 3. Sort by date/time based on sortOrder
  const sortOrder = customerBookingState.sortOrder || 'desc';
  result.sort((a, b) => {
    const da = new Date((a.date || '') + ' ' + (a.time || ''));
    const db = new Date((b.date || '') + ' ' + (b.time || ''));
    if (sortOrder === 'asc') {
      return da - db; // Oldest first
    }
    return db - da; // Newest first (default)
  });

  return result;
}

// Change the function declaration to async so await is allowed inside
async function renderCustomerBookings() {
  const container = document.getElementById('bookingsContainer');
  const pagination = document.getElementById('customerBookingPagination');
  if (!container) return;

  if (!Array.isArray(customerBookingsCache) || !customerBookingsCache.length) {
    container.innerHTML = `<div class="card fade-in" style="text-align:center; padding:3rem;"><h3>No Bookings Yet</h3></div>`;
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
    const cancelledStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'];
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
    
    // Get expiration countdown for pending bookings
    const expirationInfo = typeof getBookingExpirationInfo === 'function' ? getBookingExpirationInfo(booking) : { html: '' };
    
    return `
      <div class="card booking-card" onclick="openBookingDetailModal('${booking.id}')">
        <div class="booking-main">
          <div class="booking-avatar">${petEmoji}</div>
          <div>
            <h3>${escapeHtml(booking.petName || '')}</h3>
            <p><strong>Receipt:</strong> ${escapeHtml(String(bookingCode))}</p>
            <p><strong>Package:</strong> ${escapeHtml(booking.packageName || 'Custom')}</p>
            ${normalizeStatus(booking.status) === 'inprogress' ? `<p><strong>Groomer:</strong> ${escapeHtml(booking.groomerName || 'TBD')}</p>` : ''}
            <p><strong>Schedule:</strong> ${formatDate ? formatDate(booking.date) : booking.date} · ${formatTimeDisplay(booking.time)}</p>
            <p><strong>Total:</strong> <span style="color: #2e7d32; font-weight: 600;">${typeof formatCurrency === 'function' ? formatCurrency(booking.totalPrice || booking.cost?.subtotal || 0) : `₱${booking.totalPrice || booking.cost?.subtotal || 0}`}</span></p>
            ${expirationInfo.html}
          </div>
          <div class="booking-status"><span class="${statusClass}">${escapeHtml(statusLabel)}</span></div>
        </div>
      </div>
    `;
  }));

  container.innerHTML = items.join('');
  
  // Add fade-in animation to booking cards
  container.querySelectorAll('.booking-card').forEach((card, index) => {
    card.classList.add('fade-in');
    card.style.animationDelay = `${index * 0.05}s`;
  });
  
  // Render pagination with buttons like admin
  if (pagination) {
    if (totalPages <= 1) {
      pagination.innerHTML = '';
    } else {
      let paginationHtml = '<div style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1.5rem;">';
      
      // Previous button
      paginationHtml += `
        <button onclick="changeCustomerBookingPage(${safePage - 1})" 
          style="padding: 0.5rem 1rem; border-radius: 8px; border: none; background: ${safePage === 1 ? '#ccc' : '#333'}; color: white; cursor: ${safePage === 1 ? 'not-allowed' : 'pointer'}; font-weight: 600;"
          ${safePage === 1 ? 'disabled' : ''}>
          ‹
        </button>
      `;
      
      // Page numbers
      const maxVisiblePages = 5;
      let startPage = Math.max(1, safePage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      // First page + ellipsis
      if (startPage > 1) {
        paginationHtml += `
          <button onclick="changeCustomerBookingPage(1)" 
            style="padding: 0.5rem 1rem; border-radius: 8px; border: none; background: #333; color: white; cursor: pointer; font-weight: 600;">
            1
          </button>
        `;
        if (startPage > 2) {
          paginationHtml += '<span style="padding: 0 0.5rem; color: #666;">...</span>';
        }
      }
      
      // Page buttons
      for (let i = startPage; i <= endPage; i++) {
        const isActive = i === safePage;
        paginationHtml += `
          <button onclick="changeCustomerBookingPage(${i})" 
            style="padding: 0.5rem 1rem; border-radius: 8px; border: none; background: ${isActive ? '#333' : '#e0e0e0'}; color: ${isActive ? 'white' : '#333'}; cursor: pointer; font-weight: 600;">
            ${i}
          </button>
        `;
      }
      
      // Last page + ellipsis
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          paginationHtml += '<span style="padding: 0 0.5rem; color: #666;">...</span>';
        }
        paginationHtml += `
          <button onclick="changeCustomerBookingPage(${totalPages})" 
            style="padding: 0.5rem 1rem; border-radius: 8px; border: none; background: #333; color: white; cursor: pointer; font-weight: 600;">
            ${totalPages}
          </button>
        `;
      }
      
      // Next button
      paginationHtml += `
        <button onclick="changeCustomerBookingPage(${safePage + 1})" 
          style="padding: 0.5rem 1rem; border-radius: 8px; border: none; background: ${safePage === totalPages ? '#ccc' : '#333'}; color: white; cursor: ${safePage === totalPages ? 'not-allowed' : 'pointer'}; font-weight: 600;"
          ${safePage === totalPages ? 'disabled' : ''}>
          Next
        </button>
      `;
      
      paginationHtml += '</div>';
      pagination.innerHTML = paginationHtml;
    }
  }
  
  // Start live countdown timers for pending bookings
  if (typeof startLiveCountdownTimers === 'function') {
    startLiveCountdownTimers();
  }
  
  // Also sync sidebar countdown with the first pending booking countdown
  syncSidebarWithBookingCountdown();
}
window.renderCustomerBookings = renderCustomerBookings;

/**
 * Format time to show as 9:00 instead of 9 AM or 9am-12pm
 */
function formatTimeDisplay(timeStr) {
  if (!timeStr) return 'TBD';
  
  // Handle range format like "9 AM - 12 PM" or "9am-12pm"
  const rangeMatch = timeStr.match(/(\d{1,2})\s*(am|pm)?\s*[-–]\s*(\d{1,2})\s*(am|pm)?/i);
  if (rangeMatch) {
    const startHour = parseInt(rangeMatch[1], 10);
    const startPeriod = rangeMatch[2] || rangeMatch[4]; // Use end period if start period missing
    const endHour = parseInt(rangeMatch[3], 10);
    const endPeriod = rangeMatch[4] || 'pm'; // Default to pm for end time
    
    const formatHour = (hour, period) => {
      if (!period) return `${hour}:00`;
      const isPM = /pm/i.test(period);
      let h24 = hour;
      if (isPM && hour !== 12) h24 += 12;
      else if (!isPM && hour === 12) h24 = 0;
      return `${h24.toString().padStart(2, '0')}:00`;
    };
    
    return `${formatHour(startHour, startPeriod)} - ${formatHour(endHour, endPeriod)}`;
  }
  
  // Handle single time like "9 AM" or "14:00"
  const singleMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (singleMatch) {
    const hour = parseInt(singleMatch[1], 10);
    const minute = singleMatch[2] ? parseInt(singleMatch[2], 10) : 0;
    const period = singleMatch[3];
    
    if (period) {
      const isPM = /pm/i.test(period);
      let h24 = hour;
      if (isPM && hour !== 12) h24 += 12;
      else if (!isPM && hour === 12) h24 = 0;
      return `${h24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    } else {
      // Already in 24-hour format
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
  }
  
  return timeStr; // Return original if no match
}
window.formatTimeDisplay = formatTimeDisplay;
function showLiveCountdownNow() {
  
  // Find pending booking from cache
  if (!customerBookingsCache || customerBookingsCache.length === 0) {
    return;
  }
  
  // Find soonest pending booking (closest appointment time)
  const pendingBookings = customerBookingsCache.filter(b => 
    normalizeStatus(b.status) === 'pending'
    // Include all pending bookings (both full packages and single services)
  );
  
  if (pendingBookings.length === 0) {
    return;
  }
  
  // Sort by: 1) Pay Later first (needs auto-cancel), 2) then by soonest appointment time
  const pendingBooking = pendingBookings.sort((a, b) => {
    // Prioritize Pay Later bookings (they have auto-cancel)
    const aIsPayLater = a.paymentChoice === 'payLater' ? 0 : 1;
    const bIsPayLater = b.paymentChoice === 'payLater' ? 0 : 1;
    
    if (aIsPayLater !== bIsPayLater) {
      return aIsPayLater - bIsPayLater;
    }
    
    // If same payment choice, sort by soonest appointment time
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    
    // If same date, compare by time
    if (dateA.getTime() === dateB.getTime()) {
      const timeA = parseBookingTime(a.time);
      const timeB = parseBookingTime(b.time);
      return (timeA.hour * 60 + timeA.minute) - (timeB.hour * 60 + timeB.minute);
    }
    
    return dateA - dateB;
  })[0]; // Get the first (soonest) booking
  
  // Get sidebar elements
  const container = document.getElementById('sidebarCountdown');
  const petEl = document.getElementById('sidebarCountdownPet');
  const hoursEl = document.getElementById('sidebarCountdownHours');
  const minutesEl = document.getElementById('sidebarCountdownMinutes');
  const secondsEl = document.getElementById('sidebarCountdownSeconds');
  const expiresEl = document.getElementById('sidebarCountdownExpires');
  
  if (!container || !petEl || !hoursEl || !minutesEl || !secondsEl || !expiresEl) {
    return;
  }
  
  // Calculate expiration time based on payment choice
  const { hour, minute } = parseBookingTime(pendingBooking.time);
  const expiresAt = new Date(pendingBooking.date);
  
  // Different cutoff times based on payment choice:
  // - Pay Now: 30 minutes after start (shown in booking card)
  // - Pay Later: 1 hour BEFORE start (auto-cancel time)
  if (pendingBooking.paymentChoice === 'payLater') {
    // Pay Later: 1 hour before appointment start
    expiresAt.setHours(hour - 1, minute, 0, 0);
  } else {
    // Pay Now or no choice: 30 minutes after start
    expiresAt.setHours(hour, minute + 30, 0, 0);
  }
  
  // Update pet info with formatted time
  const petEmoji = pendingBooking.petType === 'dog' ? '🐕' : '🐈';
  const bookingDate = new Date(pendingBooking.date);
  const today = new Date();
  const isToday = bookingDate.toDateString() === today.toDateString();
  const dateStr = isToday ? 'Today' : bookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formattedTime = formatTimeDisplay(pendingBooking.time);
  
  petEl.innerHTML = `${petEmoji} ${pendingBooking.petName} · ${dateStr} @ ${formattedTime}`;
  const countdownLabel = pendingBooking.paymentChoice === 'payLater' ? 'Auto-cancel at' : 'Cutoff at';
  expiresEl.innerHTML = `${countdownLabel} ${expiresAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} on ${expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  
  // Show container
  container.style.display = 'block';
  
  // Clear any existing interval to prevent multiple timers
  if (sidebarCountdownInterval) {
    clearInterval(sidebarCountdownInterval);
    sidebarCountdownInterval = null;
  }
  
  // Start live timer
  function updateTimer() {
    const now = Date.now();
    const diff = expiresAt.getTime() - now;
    
    if (diff <= 0) {
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';
      // Hide the countdown container when expired
      container.style.display = 'none';
      if (sidebarCountdownInterval) {
        clearInterval(sidebarCountdownInterval);
        sidebarCountdownInterval = null;
      }
      return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
  }
  
  // Update immediately and every second
  updateTimer();
  sidebarCountdownInterval = setInterval(updateTimer, 1000);
}
window.showLiveCountdownNow = showLiveCountdownNow;
function syncSidebarWithBookingCountdown() {
  
  // First try to find a live countdown container on the page
  const firstCountdown = document.querySelector('.live-countdown-container[data-expires]');
  if (firstCountdown) {
    const expiresAt = parseInt(firstCountdown.dataset.expires, 10);
    const bookingId = firstCountdown.dataset.bookingId;
    
    if (expiresAt && !isNaN(expiresAt)) {
      const booking = customerBookingsCache.find(b => b.id === bookingId);
      if (booking) {
        updateSidebarCountdownDisplay(booking, expiresAt);
        return;
      }
    }
  }
  
  // Fallback: Find pending booking directly from cache
  if (!customerBookingsCache || customerBookingsCache.length === 0) {
    return;
  }
  
  // Find the next upcoming PENDING booking
  const now = new Date();
  const upcomingPendingBookings = customerBookingsCache
    .filter(b => {
      const status = normalizeStatus(b.status);
      if (status !== 'pending') return false;
      
      // Skip single service bookings
      const isSingleService = b.packageId === 'single-service' || 
                              (b.packageName && b.packageName.includes('Single Service'));
      if (isSingleService) return false;
      
      // Must be in the future
      const bookingDateTime = new Date(b.date + ' ' + (b.time || '00:00'));
      return bookingDateTime >= now;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
      const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
      return dateA - dateB;
    });
  
  const booking = upcomingPendingBookings[0];
  if (!booking) {
    return;
  }
  
  // Calculate expiration time
  const { hour: bookingHour, minute: bookingMinute } = parseBookingTime(booking.time);
  const expiresAt = new Date(booking.date);
  expiresAt.setHours(bookingHour, bookingMinute, 0, 0);
  
  updateSidebarCountdownDisplay(booking, expiresAt.getTime());
}
window.syncSidebarWithBookingCountdown = syncSidebarWithBookingCountdown;

/**
 * Update sidebar countdown display with booking info
 */
function updateSidebarCountdownDisplay(booking, expiresTimestamp) {
  const container = document.getElementById('sidebarCountdown');
  if (!container) {
    return;
  }
  
  // Update pet name
  const petEl = document.getElementById('sidebarCountdownPet');
  if (petEl) {
    const petEmoji = booking.petType === 'dog' ? '🐕' : (booking.petType === 'cat' ? '🐈' : '🐾');
    const bookingDate = new Date(booking.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateStr = '';
    if (bookingDate.toDateString() === today.toDateString()) {
      dateStr = 'Today';
    } else if (bookingDate.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = bookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    petEl.innerHTML = `${petEmoji} ${booking.petName || 'Your Pet'} · ${dateStr}  ${formatTimeDisplay(booking.time) || 'TBD'}`;
  }
  
  // Update expires text
  const expiresDate = new Date(expiresTimestamp);
  const expiresEl = document.getElementById('sidebarCountdownExpires');
  if (expiresEl) {
    expiresEl.innerHTML = `Expires at ${formatTimeDisplay(expiresDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))} on ${expiresDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  
  // Force show the container (remove any CSS hiding it)
  container.style.display = 'block';
  container.style.visibility = 'visible';
  container.style.opacity = '1';
  
  // Start the timer
  startSidebarCountdownFromExpires(expiresTimestamp);
}

/**
 * Start sidebar countdown from a specific expiration timestamp
 */
function startSidebarCountdownFromExpires(expiresAt) {
  // Clear any existing interval
  if (sidebarCountdownInterval) {
    clearInterval(sidebarCountdownInterval);
  }
  
  function updateTimer() {
    const now = Date.now();
    const diff = expiresAt - now;
    
    const hoursEl = document.getElementById('sidebarCountdownHours');
    const minutesEl = document.getElementById('sidebarCountdownMinutes');
    const secondsEl = document.getElementById('sidebarCountdownSeconds');
    const container = document.getElementById('sidebarCountdown');
    
    if (!hoursEl || !minutesEl || !secondsEl) return;
    
    if (diff <= 0) {
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';
      if (container) container.classList.add('expired');
      if (sidebarCountdownInterval) {
        clearInterval(sidebarCountdownInterval);
        sidebarCountdownInterval = null;
      }
      return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
    
    // Update urgency
    if (container) {
      if (hours === 0 && minutes < 30) {
        container.classList.add('urgent');
      } else {
        container.classList.remove('urgent');
      }
    }
  }
  
  // Initial update
  updateTimer();
  
  // Update every second
  sidebarCountdownInterval = setInterval(updateTimer, 1000);
}
window.startSidebarCountdownFromExpires = startSidebarCountdownFromExpires;

// ============================================
// ⏰ LIVE EXPIRATION COUNTDOWN HELPER
// ==================================
// Shows real-time countdown for pending bookings
// Single service bookings don't expire
// ============================================

// Store active countdown intervals for cleanup
let bookingCountdownIntervals = {};

function getBookingExpirationInfo(booking) {
  // Only pending bookings can expire
  if (normalizeStatus(booking.status) !== 'pending') {
    return { expired: false, expiresAt: null, timeRemaining: null, html: '' };
  }
  
  // Single service bookings don't expire
  const isSingleService = booking.packageId === 'single-service' || 
                          (booking.packageName && booking.packageName.includes('Single Service'));
  if (isSingleService) {
    return { expired: false, expiresAt: null, timeRemaining: null, html: '' };
  }
  
  // Parse booking date and time
  const bookingDate = booking.date;
  const bookingTime = booking.time;
  
  if (!bookingDate || !bookingTime) {
    return { expired: false, expiresAt: null, timeRemaining: null, html: '' };
  }
  
  // Check if payment proof has been sent
  const hasPaymentProof = booking.paymentProofUrl || booking.paymentProof;
  
  let expiresAt;
  
  // For all bookings: countdown until CUTOFF time (30 minutes after appointment start)
  let startHour = 0;
  let startMinute = 0;
  
  // For time ranges like "12pm-3pm", extract the START time
  if (bookingTime.includes('-')) {
    const startTime = bookingTime.split('-')[0].trim();
    const timeMatch = startTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      startHour = parseInt(timeMatch[1], 10);
      startMinute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const isPM = timeMatch[3] && /pm/i.test(timeMatch[3]);
      const isAM = timeMatch[3] && /am/i.test(timeMatch[3]);
      
      if (isPM && startHour !== 12) {
        startHour += 12;
      } else if (isAM && startHour === 12) {
        startHour = 0;
      }
    }
  } else {
    // Single time format - use as-is
    const timeMatch = bookingTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      startHour = parseInt(timeMatch[1], 10);
      startMinute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const isPM = timeMatch[3] && /pm/i.test(timeMatch[3]);
      const isAM = timeMatch[3] && /am/i.test(timeMatch[3]);
      
      if (isPM && startHour !== 12) {
        startHour += 12;
      } else if (isAM && startHour === 12) {
        startHour = 0;
      }
    }
  }
  
  // Add 30 minutes for cutoff time
  expiresAt = new Date(bookingDate);
  expiresAt.setHours(startHour, startMinute + 30, 0, 0);
  
  const now = new Date();
  const timeRemaining = expiresAt.getTime() - now.getTime();
  
  // Generate unique ID for this countdown
  const countdownId = `countdown-${booking.id}`;
  
  if (timeRemaining <= 0) {
    return { 
      expired: true, 
      expiresAt, 
      timeRemaining: 0, 
      countdownId,
      html: `<div class="live-countdown-container expired" style="background: linear-gradient(135deg, #ffebee, #ffcdd2); color: #c62828; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-top: 0.75rem; border: 1px solid #ffcdd2;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1.1rem;">⚠️</span>
          <span><strong>Expired</strong> - Awaiting cancellation</span>
        </div>
      </div>`
    };
  }
  
  // Calculate time components
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const secondsRemaining = Math.floor((timeRemaining % (1000 * 60)) / 1000);
  
  // Determine urgency level
  let urgencyClass = 'normal';
  let bgGradient = 'linear-gradient(135deg, #fff3e0, #ffe0b2)';
  let borderColor = '#ffcc80';
  let textColor = '#e65100';
  
  if (hoursRemaining < 1) {
    urgencyClass = 'urgent';
    bgGradient = 'linear-gradient(135deg, #ffebee, #ffcdd2)';
    borderColor = '#ef9a9a';
    textColor = '#c62828';
  } else if (hoursRemaining < 3) {
    urgencyClass = 'warning';
    bgGradient = 'linear-gradient(135deg, #fff8e1, #ffecb3)';
    borderColor = '#ffe082';
    textColor = '#f57c00';
  }
  
  // Format initial time display
  const formatTimeUnit = (val) => String(val).padStart(2, '0');
  
  return {
    expired: false,
    expiresAt,
    timeRemaining,
    hoursRemaining,
    minutesRemaining,
    countdownId,
    html: `<div id="${countdownId}" class="live-countdown-container ${urgencyClass}" 
      data-expires="${expiresAt.getTime()}" 
      data-booking-id="${booking.id}"
      style="background: ${bgGradient}; color: ${textColor}; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; margin-top: 0.75rem; border: 1px solid ${borderColor};">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1.1rem;">⏳</span>
          <span style="font-weight: 600;">Cutoff in</span>
        </div>
        <div class="live-countdown-timer" style="display: flex; align-items: center; gap: 0.15rem; font-family: 'Inter', monospace; font-weight: 700; font-size: 1.1rem;">
          <span class="countdown-hrs" style="background: rgba(255,255,255,0.8); padding: 0.25rem 0.4rem; border-radius: 4px; min-width: 28px; text-align: center;">${formatTimeUnit(hoursRemaining)}</span>
          <span style="font-weight: 800;">:</span>
          <span class="countdown-mins" style="background: rgba(255,255,255,0.8); padding: 0.25rem 0.4rem; border-radius: 4px; min-width: 28px; text-align: center;">${formatTimeUnit(minutesRemaining)}</span>
          <span style="font-weight: 800;">:</span>
          <span class="countdown-secs" style="background: rgba(255,255,255,0.8); padding: 0.25rem 0.4rem; border-radius: 4px; min-width: 28px; text-align: center;">${formatTimeUnit(secondsRemaining)}</span>
        </div>
      </div>
      <div style="font-size: 0.7rem; margin-top: 0.4rem; opacity: 0.8;">
        Cutoff at ${expiresAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} on ${expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
    </div>`
  };
}
window.getBookingExpirationInfo = getBookingExpirationInfo;

/**
 * Start live countdown timers for all pending booking cards
 * Called after renderCustomerBookings completes
 */
function startLiveCountdownTimers() {
  // Clear any existing intervals
  clearAllBookingCountdowns();
  
  // Find all countdown containers
  const countdownContainers = document.querySelectorAll('.live-countdown-container[data-expires]');
  
  countdownContainers.forEach(container => {
    const expiresAt = parseInt(container.dataset.expires, 10);
    const bookingId = container.dataset.bookingId;
    
    if (!expiresAt || isNaN(expiresAt)) return;
    
    // Start interval for this countdown
    const intervalId = setInterval(() => {
      updateSingleCountdown(container, expiresAt, bookingId);
    }, 1000);
    
    // Store interval for cleanup
    bookingCountdownIntervals[bookingId] = intervalId;
    
    // Initial update
    updateSingleCountdown(container, expiresAt, bookingId);
  });
}
window.startLiveCountdownTimers = startLiveCountdownTimers;

/**
 * Update a single countdown timer
 */
function updateSingleCountdown(container, expiresAt, bookingId) {
  const now = Date.now();
  const timeRemaining = expiresAt - now;
  
  const hrsEl = container.querySelector('.countdown-hrs');
  const minsEl = container.querySelector('.countdown-mins');
  const secsEl = container.querySelector('.countdown-secs');
  
  if (!hrsEl || !minsEl || !secsEl) return;
  
  if (timeRemaining <= 0) {
    // Expired - update display and stop interval
    hrsEl.textContent = '00';
    minsEl.textContent = '00';
    secsEl.textContent = '00';
    
    // Update container styling
    container.classList.remove('normal', 'warning');
    container.classList.add('urgent', 'expired');
    container.style.background = 'linear-gradient(135deg, #ffebee, #ffcdd2)';
    container.style.borderColor = '#ef9a9a';
    container.style.color = '#c62828';
    
    // Update text
    const textEl = container.querySelector('span[style*="font-weight: 600"]');
    if (textEl) textEl.textContent = 'Expired - Awaiting cancellation';
    
    // Clear interval
    if (bookingCountdownIntervals[bookingId]) {
      clearInterval(bookingCountdownIntervals[bookingId]);
      delete bookingCountdownIntervals[bookingId];
    }
    return;
  }
  
  // Calculate time components
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
  
  // Update display
  hrsEl.textContent = String(hours).padStart(2, '0');
  minsEl.textContent = String(minutes).padStart(2, '0');
  secsEl.textContent = String(seconds).padStart(2, '0');
  
  // Update urgency styling based on time remaining
  if (hours < 1 && !container.classList.contains('urgent')) {
    container.classList.remove('normal', 'warning');
    container.classList.add('urgent');
    container.style.background = 'linear-gradient(135deg, #ffebee, #ffcdd2)';
    container.style.borderColor = '#ef9a9a';
    container.style.color = '#c62828';
  } else if (hours >= 1 && hours < 3 && !container.classList.contains('warning')) {
    container.classList.remove('normal', 'urgent');
    container.classList.add('warning');
    container.style.background = 'linear-gradient(135deg, #fff8e1, #ffecb3)';
    container.style.borderColor = '#ffe082';
    container.style.color = '#f57c00';
  }
}

/**
 * Clear all booking countdown intervals
 */
function clearAllBookingCountdowns() {
  Object.keys(bookingCountdownIntervals).forEach(bookingId => {
    clearInterval(bookingCountdownIntervals[bookingId]);
  });
  bookingCountdownIntervals = {};
}
window.clearAllBookingCountdowns = clearAllBookingCountdowns;

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
    cancelledbyadmin: 'Cancelled (Admin)',
    cancelledbysystem: 'Expired (Unpaid)'
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

// Change My Bookings sort order
function changeMyBookingsSortOrder(order) {
  customerBookingState.sortOrder = order;
  customerBookingState.page = 1;
  
  // Update the select element to reflect the change
  const sortSelect = document.getElementById('myBookingsSortOrder');
  if (sortSelect) {
    sortSelect.value = order;
  }
  
  // Re-render bookings
  try {
    const r = (typeof renderCustomerBookings === 'function') ? renderCustomerBookings() : null;
    if (r && typeof r.then === 'function') r.catch(() => { });
  } catch (e) { console.warn('changeMyBookingsSortOrder failed', e); }
}
window.changeMyBookingsSortOrder = changeMyBookingsSortOrder;

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
    const userId = user.id || user.uid;
    const userEmail = user.email?.toLowerCase();
    const userName = user.name?.toLowerCase();
    
    const customerBookings = allBookings.filter(b => {
      if (b.userId === userId) return true;
      if (b.customerId === userId) return true;
      if (userEmail && b.email?.toLowerCase() === userEmail) return true;
      if (userEmail && b.customerEmail?.toLowerCase() === userEmail) return true;
      if (userName && b.customerName?.toLowerCase() === userName) return true;
      if (userName && b.ownerName?.toLowerCase() === userName) return true;
      return false;
    });
    
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
  if (!booking) {
    console.error('[openBookingDetailModal] Booking not found with id:', bookingId);
    return;
  }
  
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
        <span class="summary-label" style="color: #2e7d32; font-weight: 700; font-size: 1.1rem;">💰 Balance:</span>
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
    ${normalizeStatus(booking.status) === 'inprogress' ? `
    <div class="summary-item">
      <span class="summary-label">Groomer:</span>
      <span class="summary-value">${escapeHtml(booking.groomerName || 'Assigned on site')}</span>
    </div>
    ` : ''}
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
    ${(() => {
      // Show expiration countdown for pending bookings
      const expInfo = typeof getBookingExpirationInfo === 'function' ? getBookingExpirationInfo(booking) : { html: '' };
      if (expInfo.html) {
        return `<div class="summary-item" style="flex-direction: column; align-items: flex-start;">${expInfo.html}</div>`;
      }
      return '';
    })()}
    ${(() => {
      // ============================================
      // 🔧 REFERENCE CUT & SPECIAL NOTES - Text only (no images)
      // ============================================
      let preferredCutHtml = '';
      let notesHtml = '';
      
      // Reference Cut - shows the cut style name (e.g. "Lion Cut")
      if (booking.referenceCut) {
        const cutId = booking.referenceCut;
        let cutDisplayName = typeof getReferenceCutName === 'function' 
          ? getReferenceCutName(cutId) 
          : (typeof window.getReferenceCutName === 'function' ? window.getReferenceCutName(cutId) : cutId);
        
        preferredCutHtml = `
          <div class="summary-item" style="flex-direction: column; align-items: flex-start; margin-top: 0.5rem;">
            <span class="summary-label" style="margin-bottom: 0.5rem; font-weight: 600;">✂️ Reference Cut:</span>
            <div style="background: #e8f5e9; padding: 0.75rem 1rem; border-radius: 8px; border: 2px solid #4CAF50; color: #2e7d32; font-weight: 600;">
              ${escapeHtml(cutDisplayName)}
            </div>
          </div>
        `;
      }
      
      // Special Notes - shows customer requests (groomer preference, allergies, injuries, etc.)
      if (booking.bookingNotes && booking.bookingNotes.trim()) {
        let notesToDisplay = booking.bookingNotes.trim();
        // Remove cut name from notes if it's duplicated there
        if (booking.referenceCut) {
          const cutId = booking.referenceCut;
          let cutDisplayName = typeof getReferenceCutName === 'function' 
            ? getReferenceCutName(cutId) 
            : (typeof window.getReferenceCutName === 'function' ? window.getReferenceCutName(cutId) : cutId);
          const lines = notesToDisplay.split('\\n');
          if (lines[0].trim() === cutDisplayName) {
            lines.shift();
            notesToDisplay = lines.join('\\n').trim();
          }
        }
        if (notesToDisplay) {
          notesHtml = `
            <div class="summary-item" style="flex-direction: column; align-items: flex-start; margin-top: 0.5rem;">
              <span class="summary-label" style="margin-bottom: 0.5rem; font-weight: 600;">📝 Special Notes:</span>
              <div style="background: #fff3e0; padding: 0.75rem 1rem; border-radius: 8px; border: 2px solid #ff9800; color: #e65100; font-weight: 500; width: 100%; box-sizing: border-box;">
                ${escapeHtml(notesToDisplay)}
              </div>
            </div>
          `;
        }
      }
      
      return preferredCutHtml + notesHtml;
    })()}
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
    
    <!-- Payment History Section -->
    ${booking.history && booking.history.length > 0 ? (() => {
      const paymentHistory = booking.history.filter(h => h.action === 'payment_received' || h.action === 'payment_confirmed');
      if (paymentHistory.length > 0) {
        return `
          <div class="summary-item" style="flex-direction: column; align-items: flex-start; margin-top: 1rem; padding: 1rem; background: #e8f5e9; border-radius: 8px; border: 1px solid #4CAF50;">
            <span class="summary-label" style="margin-bottom: 0.75rem; font-weight: 600; color: #2e7d32;">📋 Payment History:</span>
            <div style="width: 100%; display: flex; flex-direction: column; gap: 0.5rem;">
              ${paymentHistory.map(entry => `
                <div style="background: white; padding: 0.75rem; border-radius: 6px; border-left: 3px solid #4CAF50; font-size: 0.85rem;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span style="font-weight: 600; color: #2e7d32;">${entry.action === 'payment_received' ? '💰 Payment Received' : '✅ Payment Confirmed'}</span>
                    <span style="color: #666; font-size: 0.8rem;">${new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                  <div style="color: #555; margin-bottom: 0.25rem;">
                    <strong>Amount:</strong> ${formatCurrency(entry.paymentAmount || 0)}
                  </div>
                  <div style="color: #555; margin-bottom: 0.25rem;">
                    <strong>Method:</strong> ${entry.paymentMethod === 'payNow' ? '💳 Pay Now' : '⏰ Pay Later'}
                  </div>
                  ${entry.hasProofOfPayment ? `
                    <div style="margin-top: 0.5rem;">
                      <button onclick="window.openProofOfPaymentLightbox('${booking.id}')" 
                        style="padding: 0.4rem 0.8rem; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.3rem;">
                        👁️ View Proof
                      </button>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      return '';
    })() : ''}
    
    ${priceBreakdownHtml}
    
    <div class="modal-actions">
      ${booking.status === 'pending' ? `
        <button class="btn btn-outline" onclick="closeModal(); openBookingEditModal('${booking.id}')">Edit</button>
        <button class="btn btn-danger" onclick="closeModal(); startCancelBooking('${booking.id}')">Cancel</button>
      ` : ''}
      ${booking.status === 'cancelledByCustomer' || booking.status === 'cancelledByAdmin' || booking.status === 'cancelledBySystem' ? `
        <button class="btn btn-outline" onclick="closeModal(); openBookingEditModal('${booking.id}')">Reschedule</button>
      ` : ''}
      ${booking.status === 'confirmed' || booking.status === 'In Progress' ? `
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
    
    // Check if this is a reschedule (booking was cancelled)
    const isCancelled = ['cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(booking.status);
    if (isCancelled) {
      // Set reschedule mode
      const rescheduleData = {
        ...formData,
        rescheduleBy: 'customer' // Mark that customer is rescheduling
      };
      sessionStorage.setItem('rescheduleData', JSON.stringify(rescheduleData));
      sessionStorage.setItem('mode', 'reschedule');
      // Start from step 4 (schedule) to let customer pick new date/time
      sessionStorage.setItem('bookingStep', '4');
    } else {
      // Regular edit mode - go to review/summary step
      sessionStorage.setItem('bookingStep', '4');
    }

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
  // Check button protection
  if (window.ButtonProtection && !window.ButtonProtection.canProceed()) {
    return;
  }
  
  const file = input.files[0];
  if (!file) return;
  
  // Mark as processing
  if (window.ButtonProtection) {
    window.ButtonProtection.isProcessing = true;
  }
  
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
      
    } catch (error) {
      console.error('[ProofOfPayment] Upload error:', error);
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      if (typeof customAlert !== 'undefined') {
        customAlert.error('Upload Failed', 'Failed to upload payment proof. Please try again.');
      }
    } finally {
      // Reset button protection after cooldown
      setTimeout(() => {
        if (window.ButtonProtection) {
          window.ButtonProtection.isProcessing = false;
        }
      }, 2000);
    }
  };
  
  reader.readAsDataURL(file);
};

// Remove proof of payment image
// Protection flag for removing proof of payment
let isRemovingProof = false;

window.removeProofOfPayment = async function(bookingId) {
  // Prevent duplicate clicks
  if (isRemovingProof) {
    console.log('[removeProofOfPayment] BLOCKED - Already in progress');
    return;
  }
  
  const confirmed = typeof customAlert !== 'undefined' 
    ? await customAlert.confirm('Remove Payment Proof', 'Are you sure you want to remove the payment proof?')
    : confirm('Are you sure you want to remove the payment proof?');
  
  if (!confirmed) return;
  
  isRemovingProof = true;
  
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
    
  } catch (error) {
    console.error('[ProofOfPayment] Remove error:', error);
    if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
  } finally {
    isRemovingProof = false;
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
  sortOrder: 'desc',
  recentActive: false  // Track if "Recent" button is active (toggle state)
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

  // 🔧 BOOKING HISTORY FIX: Show UNIQUE bookings with their CURRENT STATUS
  // Instead of showing action history, show each booking only once with its status
  let userBookings = bookings.filter(b => b.userId === user.id);
  
  // Create a Map to ensure unique bookings by ID
  const uniqueBookingsMap = new Map();
  userBookings.forEach(booking => {
    // Only add if not already in map (prevents duplicates)
    if (!uniqueBookingsMap.has(booking.id)) {
      uniqueBookingsMap.set(booking.id, booking);
    }
  });
  
  // Convert back to array
  let history = Array.from(uniqueBookingsMap.values());

  // Apply search filter
  const searchTerm = customerHistoryState.searchTerm || '';
  if (searchTerm) {
    history = history.filter(booking => {
      const displayId = typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : booking.id;
      const status = booking.status || '';
      const petName = booking.petName || '';
      const packageName = booking.packageName || booking.packageId || '';
      
      return displayId.toLowerCase().includes(searchTerm) ||
             status.toLowerCase().includes(searchTerm) ||
             petName.toLowerCase().includes(searchTerm) ||
             packageName.toLowerCase().includes(searchTerm);
    });
  }

  // Apply sort order - sort by booking creation date
  const sortOrder = customerHistoryState.recentActive ? 'desc' : (customerHistoryState.sortOrder || 'desc');
  history.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.date).getTime();
    const dateB = new Date(b.createdAt || b.date).getTime();
    if (sortOrder === 'asc') {
      return dateA - dateB;
    } else {
      return dateB - dateA;
    }
  });

  if (!history.length) {
    const message = customerHistoryState.searchTerm 
      ? `No results found for "${customerHistoryState.searchTerm}". Try a different search term.`
      : 'No bookings yet. Your booking history will appear here.';
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
            <input type="text" id="customerHistorySearch" class="search-input" placeholder="🔍 Search by booking ID, status, pet name, or package..." 
              value="${customerHistoryState.searchTerm || ''}" onkeyup="searchCustomerHistory(this.value)">
          </div>
          <div style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem; background: var(--gray-50); border-radius: var(--radius-sm); flex-wrap: wrap;">
            <button class="btn btn-sm" style="background: ${customerHistoryState.recentActive ? '#007bff' : '#e0e0e0'}; color: ${customerHistoryState.recentActive ? 'white' : '#333'}; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: 600;" onclick="toggleCustomerHistoryRecent()">
              🕐 Recent
            </button>
            <label style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Sort by:</label>
            <select id="customerHistorySortOrder" class="form-select" style="width: auto; padding: 0.5rem; ${customerHistoryState.recentActive ? 'opacity: 0.5; pointer-events: none;' : ''}" onchange="filterCustomerHistory()" ${customerHistoryState.recentActive ? 'disabled' : ''}>
              <option value="desc" ${customerHistoryState.sortOrder === 'desc' ? 'selected' : ''}>⬇️ Newest First</option>
              <option value="asc" ${customerHistoryState.sortOrder === 'asc' ? 'selected' : ''}>⬆️ Oldest First</option>
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
          <input type="text" id="customerHistorySearch" class="search-input" placeholder="🔍 Search by booking ID, status, pet name, or package..." 
            value="${customerHistoryState.searchTerm || ''}" onkeyup="searchCustomerHistory(this.value)">
        </div>
        <div style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem; background: var(--gray-50); border-radius: var(--radius-sm); flex-wrap: wrap;">
          <button class="btn btn-sm" style="background: ${customerHistoryState.recentActive ? '#007bff' : '#e0e0e0'}; color: ${customerHistoryState.recentActive ? 'white' : '#333'}; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: 600;" onclick="toggleCustomerHistoryRecent()">
            🕐 Recent
          </button>
          <label style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Sort by:</label>
          <select id="customerHistorySortOrder" class="form-select" style="width: auto; padding: 0.5rem; ${customerHistoryState.recentActive ? 'opacity: 0.5; pointer-events: none;' : ''}" onchange="filterCustomerHistory()" ${customerHistoryState.recentActive ? 'disabled' : ''}>
            <option value="desc" ${customerHistoryState.sortOrder === 'desc' ? 'selected' : ''}>⬇️ Newest First</option>
            <option value="asc" ${customerHistoryState.sortOrder === 'asc' ? 'selected' : ''}>⬆️ Oldest First</option>
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

  // 🔧 BOOKING HISTORY FIX: Show unique bookings with STATUS instead of ACTION
  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Booking ID</th>
            <th>Status</th>
            <th>Details</th>
            <th>Total Price</th>
          </tr>
        </thead>
        <tbody>
          ${currentHistory.map(booking => `
            ${(() => {
      const displayId = typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : booking.id;
      
      // Get status with proper formatting and color
      const status = booking.status || 'pending';
      const statusInfo = getBookingStatusInfo(status);
      
      // Build details string
      const packageEmoji = booking.packageId === 'single-service' ? '✂️' : '🐾';
      const packageName = booking.packageName || booking.packageId || 'Unknown';
      const petName = booking.petName || 'Unknown';
      const appointmentDate = booking.date || 'N/A';
      const appointmentTime = booking.time || 'N/A';
      const details = `${packageEmoji} ${packageName} with ${petName} on ${appointmentDate} at ${appointmentTime}`;
      
      // Calculate BALANCE TO PAY (what customer actually pays on visit)
      let balanceToPay = 0;
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
      
      const priceDisplay = balanceToPay > 0 
        ? (typeof formatCurrency === 'function' ? formatCurrency(balanceToPay) : `₱${balanceToPay}`)
        : '—';
      
      // Get booking creation date
      const createdDate = booking.createdAt ? new Date(booking.createdAt) : new Date(booking.date);
      
      return `
            <tr>
              <td>
                ${createdDate.toLocaleString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}<br>
                ${createdDate.toLocaleString('en-US', {
                  month: 'numeric',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </td>
              <td>${escapeHtml(displayId)}</td>
              <td><span class="status-badge" style="background: ${statusInfo.bgColor}; color: ${statusInfo.textColor}; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.85rem; font-weight: 500;">${statusInfo.label}</span></td>
              <td style="max-width: 300px; white-space: normal; word-wrap: break-word;">${escapeHtml(details)}</td>
              <td><button class="btn btn-sm" style="background: #2e7d32; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 0.25rem; cursor: pointer; font-weight: 600;" onclick="openCustomerPricingBreakdownModal('${booking.id}')">${priceDisplay}</button></td>
            </tr>
              `;
    })()}
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Helper function to get booking status info with colors
function getBookingStatusInfo(status) {
  const statusMap = {
    'pending': { label: 'Pending', bgColor: '#fff3cd', textColor: '#856404' },
    'confirmed': { label: 'Confirmed', bgColor: '#d4edda', textColor: '#155724' },
    'in-progress': { label: 'In Progress', bgColor: '#cce5ff', textColor: '#004085' },
    'inProgress': { label: 'In Progress', bgColor: '#cce5ff', textColor: '#004085' },
    'completed': { label: 'Completed', bgColor: '#d4edda', textColor: '#155724' },
    'cancelled': { label: 'Cancelled', bgColor: '#f8d7da', textColor: '#721c24' },
    'cancelledByCustomer': { label: 'Cancelled by You', bgColor: '#f8d7da', textColor: '#721c24' },
    'cancelledByAdmin': { label: 'Cancelled by Admin', bgColor: '#f8d7da', textColor: '#721c24' },
    'cancelledBySystem': { label: 'Auto-Cancelled', bgColor: '#f8d7da', textColor: '#721c24' },
    'no-show': { label: 'No Show', bgColor: '#e2e3e5', textColor: '#383d41' },
    'noShow': { label: 'No Show', bgColor: '#e2e3e5', textColor: '#383d41' }
  };
  
  return statusMap[status] || { label: status || 'Unknown', bgColor: '#e2e3e5', textColor: '#383d41' };
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

  const history = (await getBookingHistory()).filter(h => {
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
    customerHistoryState.recentActive = false; // Disable Recent when changing sort order
    customerHistoryState.page = 1;
    renderCustomerBookingHistory();
  }
}
window.filterCustomerHistory = filterCustomerHistory;

// Toggle Recent button (on/off)
window.toggleCustomerHistoryRecent = function () {
  customerHistoryState.recentActive = !customerHistoryState.recentActive;
  customerHistoryState.page = 1;
  renderCustomerBookingHistory();
};

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
  // Find and disable save button to prevent duplicates
  const saveBtn = document.querySelector(`[onclick*="saveReview('${bookingId}')"]`)?.closest('.review-actions')?.querySelector('button');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.6';
  }
  
  // Show loading screen
  if (typeof showLoadingOverlay === 'function') {
    showLoadingOverlay('Saving review...');
  }
  
  try {
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
  } catch (error) {
    console.error('Error saving review:', error);
    customAlert.error('Error', 'Failed to save review. Please try again.');
    
    // Re-enable button on error
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
    }
  } finally {
    // Hide loading screen
    if (typeof hideLoadingOverlay === 'function') {
      hideLoadingOverlay();
    }
  }
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

    // Get user's bookings to count no-shows and late cancellations - use cache
    const bookings = customerBookingsCache.length > 0 ? customerBookingsCache : await getUserBookings();
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

// Render booking confirmation notifications
async function renderBookingNotifications() {
  try {
    // Use cached bookings instead of fetching again
    const bookings = customerBookingsCache.length > 0 ? customerBookingsCache : await getUserBookings();
    
    // Find bookings with unseen notifications
    const unseenNotifications = bookings.filter(b => 
      b.customerNotification && 
      !b.customerNotification.seen
    );
    
    if (unseenNotifications.length === 0) return;
    
    // Show notification for each unseen booking confirmation
    for (const booking of unseenNotifications) {
      const notif = booking.customerNotification;
      
      // Use customAlert if available, otherwise use a toast-style notification
      if (typeof customAlert !== 'undefined' && customAlert.success) {
        customAlert.success(notif.message, 'Booking Confirmed! 🎉');
      } else {
        // Fallback toast notification
        showBookingNotificationToast(notif.message, booking.id);
      }
      
      // Mark notification as seen
      await markNotificationAsSeen(booking.id);
    }
  } catch (e) {
    console.warn('renderBookingNotifications failed:', e);
  }
}
window.renderBookingNotifications = renderBookingNotifications;

// Show toast notification for booking confirmation
function showBookingNotificationToast(message, bookingId) {
  // Create toast container if not exists
  let toastContainer = document.getElementById('bookingNotificationToast');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'bookingNotificationToast';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    `;
    document.body.appendChild(toastContainer);
  }
  
  const toast = document.createElement('div');
  toast.className = 'booking-notification-toast';
  toast.style.cssText = `
    background: linear-gradient(135deg, #4caf50, #2e7d32);
    color: white;
    padding: 1rem 1.25rem;
    border-radius: 12px;
    margin-bottom: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    animation: slideInRight 0.3s ease-out;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  `;
  
  toast.innerHTML = `
    <span style="font-size: 1.5rem;">🎉</span>
    <div style="flex: 1;">
      <strong style="display: block; margin-bottom: 0.25rem;">Booking Confirmed!</strong>
      <span style="font-size: 0.9rem; opacity: 0.95;">${escapeHtml(message)}</span>
    </div>
    <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; font-size: 1.25rem; cursor: pointer; padding: 0; opacity: 0.8;">&times;</button>
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }
  }, 8000);
}

// Mark notification as seen in Firebase
async function markNotificationAsSeen(bookingId) {
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    
    if (booking && booking.customerNotification) {
      booking.customerNotification.seen = true;
      saveBookings(bookings);
    }
  } catch (e) {
    console.warn('markNotificationAsSeen failed:', e);
  }
}
window.markNotificationAsSeen = markNotificationAsSeen;

// ============================================
// Customer Notification Bell System
// ============================================
let customerNotificationPanelOpen = false;

// Update customer notification badge
async function updateCustomerNotificationBadge() {
  const badge = document.getElementById('customerNotificationBadge');
  const badgeMobile = document.getElementById('customerNotificationBadgeMobile');
  const bell = document.getElementById('customerNotificationBell');
  const bellMobile = document.getElementById('customerNotificationBellMobile');
  
  // Mobile notification bar elements
  const mobileNotifBar = document.getElementById('mobileNotificationBar');
  const mobileNotifBadge = document.getElementById('mobileNotifBadge');
  const mobileNotifPreview = document.getElementById('mobileNotifPreview');
  
  // Use cached bookings for better performance
  const bookings = customerBookingsCache.length > 0 ? customerBookingsCache : await getUserBookings();
  
  // Count bookings with unseen notifications (confirmed bookings)
  const unseenConfirmed = bookings.filter(b => 
    b.customerNotification && 
    !b.customerNotification.seen &&
    b.customerNotification.type === 'confirmed'
  );
  
  // Count recently confirmed bookings (within last 24 hours)
  const recentlyConfirmed = bookings.filter(b => 
    b.status === 'confirmed' &&
    b.confirmedAt &&
    (Date.now() - b.confirmedAt) < 86400000
  );
  
  // Count in-progress bookings (service started)
  const inProgress = bookings.filter(b => 
    ['inprogress', 'in progress'].includes((b.status || '').toLowerCase())
  );
  
  // Get upcoming bookings (next 3 days)
  const today = new Date();
  const threeDaysLater = new Date(today.getTime() + 3 * 86400000);
  const upcoming = bookings.filter(b => {
    if (!b.date || ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'completed'].includes(b.status)) return false;
    const bookingDate = new Date(b.date);
    return bookingDate >= today && bookingDate <= threeDaysLater;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const totalNotifications = unseenConfirmed.length + inProgress.length;
  
  if (totalNotifications > 0) {
    const badgeText = totalNotifications > 99 ? '99+' : totalNotifications;
    
    // Update desktop badge
    if (badge) {
      badge.style.display = 'block';
      badge.textContent = badgeText;
    }
    
    // Update mobile badge
    if (badgeMobile) {
      badgeMobile.style.display = 'inline-block';
      badgeMobile.textContent = badgeText;
    }
    
    // Update mobile notification bar
    if (mobileNotifBar) {
      mobileNotifBar.classList.add('has-notifications');
    }
    if (mobileNotifBadge) {
      mobileNotifBadge.style.display = 'block';
      mobileNotifBadge.textContent = badgeText;
    }
    if (mobileNotifPreview) {
      // Show preview text based on notification type
      if (inProgress.length > 0) {
        const pet = inProgress[0].petName || 'Your pet';
        mobileNotifPreview.textContent = `🐾 ${pet} is being groomed now!`;
      } else if (unseenConfirmed.length > 0) {
        mobileNotifPreview.textContent = `✅ ${unseenConfirmed.length} booking${unseenConfirmed.length > 1 ? 's' : ''} confirmed!`;
      }
    }
    
    // Animate bells
    if (bell) {
      bell.style.animation = 'bellShake 0.5s ease-in-out';
      setTimeout(() => bell.style.animation = '', 500);
    }
    if (bellMobile) {
      bellMobile.style.animation = 'bellShake 0.5s ease-in-out';
      setTimeout(() => bellMobile.style.animation = '', 500);
    }
  } else {
    // Hide badges when no notifications
    if (badge) badge.style.display = 'none';
    if (badgeMobile) badgeMobile.style.display = 'none';
    
    // Update mobile notification bar - show upcoming info
    if (mobileNotifBar) {
      mobileNotifBar.classList.remove('has-notifications');
    }
    if (mobileNotifBadge) {
      mobileNotifBadge.style.display = 'none';
    }
    if (mobileNotifPreview) {
      if (upcoming.length > 0) {
        const nextBooking = upcoming[0];
        const dateStr = formatDate ? formatDate(nextBooking.date) : nextBooking.date;
        mobileNotifPreview.textContent = `📅 Next: ${nextBooking.petName || 'Booking'} on ${dateStr}`;
      } else {
        mobileNotifPreview.textContent = 'No new notifications';
      }
    }
  }
}

// Open customer notification panel
async function openCustomerNotificationPanel() {
  
  const panel = document.getElementById('customerNotificationPanel');
  const list = document.getElementById('customerNotificationList');
  
  if (!panel || !list) {
    console.error('[Notification] Panel or list element not found!');
    return;
  }
  
  customerNotificationPanelOpen = !customerNotificationPanelOpen;
  
  if (!customerNotificationPanelOpen) {
    panel.style.display = 'none';
    return;
  }
  
  panel.style.display = 'block';
  list.innerHTML = '<div style="text-align: center; padding: 1rem;"><div class="spinner"></div></div>';
  
  // Use cached bookings for better performance
  const bookings = customerBookingsCache.length > 0 ? customerBookingsCache : await getUserBookings();
  
  // Get bookings with unseen notifications
  const unseenConfirmed = bookings.filter(b => 
    b.customerNotification && 
    !b.customerNotification.seen
  ).sort((a, b) => (b.customerNotification?.createdAt || 0) - (a.customerNotification?.createdAt || 0));
  
  // Get recently confirmed bookings
  const recentlyConfirmed = bookings.filter(b => 
    b.status === 'confirmed' &&
    b.confirmedAt &&
    (Date.now() - b.confirmedAt) < 86400000
  ).sort((a, b) => b.confirmedAt - a.confirmedAt);
  
  // Get in-progress bookings
  const inProgress = bookings.filter(b => 
    ['inprogress', 'in progress'].includes((b.status || '').toLowerCase())
  );
  
  // Get upcoming bookings (next 3 days)
  const today = new Date();
  const threeDaysLater = new Date(today.getTime() + 3 * 86400000);
  const upcoming = bookings.filter(b => {
    if (!b.date || ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'completed'].includes(b.status)) return false;
    const bookingDate = new Date(b.date);
    return bookingDate >= today && bookingDate <= threeDaysLater;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let html = '';
  
  // Unseen confirmation notifications
  if (unseenConfirmed.length > 0) {
    html += `<div style="padding: 0.5rem; background: #e8f5e9; border-radius: 8px; margin-bottom: 0.5rem;">
      <div style="font-weight: 600; font-size: 0.85rem; color: #2e7d32; margin-bottom: 0.5rem;">
        <i class="bi bi-check-circle-fill"></i> New Confirmations (${unseenConfirmed.length})
      </div>`;
    
    unseenConfirmed.forEach(booking => {
      const notif = booking.customerNotification;
      html += `
        <div style="background: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; border-left: 3px solid #4caf50; cursor: pointer;" onclick="viewBookingFromNotification('${booking.id}')">
          <div style="font-weight: 600; font-size: 0.9rem; color: #2e7d32;">🎉 Booking Confirmed!</div>
          <div style="font-size: 0.85rem; color: var(--gray-700); margin-top: 0.25rem;">${escapeHtml(booking.petName || 'Your pet')}</div>
          <div style="font-size: 0.8rem; color: var(--gray-600);">${formatDate(booking.date)} at ${booking.time || 'TBD'}</div>
          <div style="font-size: 0.8rem; color: var(--gray-600);">Groomer: ${escapeHtml(booking.groomerName || 'Assigned')}</div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  // In-progress bookings
  if (inProgress.length > 0) {
    html += `<div style="padding: 0.5rem; background: #e3f2fd; border-radius: 8px; margin-bottom: 0.5rem;">
      <div style="font-weight: 600; font-size: 0.85rem; color: #1565c0; margin-bottom: 0.5rem;">
        <i class="bi bi-scissors"></i> In Progress (${inProgress.length})
      </div>`;
    
    inProgress.forEach(booking => {
      html += `
        <div style="background: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; border-left: 3px solid #1976d2;">
          <div style="font-weight: 600; font-size: 0.9rem; color: #1565c0;">✂️ Being Groomed Now</div>
          <div style="font-size: 0.85rem; color: var(--gray-700); margin-top: 0.25rem;">${escapeHtml(booking.petName || 'Your pet')}</div>
          <div style="font-size: 0.8rem; color: var(--gray-600);">Groomer: ${escapeHtml(booking.groomerName || 'TBD')}</div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  // Upcoming bookings reminder
  if (upcoming.length > 0) {
    html += `<div style="padding: 0.5rem; background: #fff3e0; border-radius: 8px; margin-bottom: 0.5rem;">
      <div style="font-weight: 600; font-size: 0.85rem; color: #e65100; margin-bottom: 0.5rem;">
        <i class="bi bi-calendar-event"></i> Upcoming (${upcoming.length})
      </div>`;
    
    upcoming.slice(0, 3).forEach(booking => {
      const daysUntil = Math.ceil((new Date(booking.date) - today) / 86400000);
      const dayLabel = daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`;
      html += `
        <div style="background: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; border-left: 3px solid #ff9800;">
          <div style="font-weight: 600; font-size: 0.9rem; color: #e65100;">📅 ${dayLabel}</div>
          <div style="font-size: 0.85rem; color: var(--gray-700); margin-top: 0.25rem;">${escapeHtml(booking.petName || 'Your pet')} - ${escapeHtml(booking.packageName || 'Service')}</div>
          <div style="font-size: 0.8rem; color: var(--gray-600);">${formatDate(booking.date)} at ${booking.time || 'TBD'}</div>
        </div>
      `;
    });
    html += '</div>';
  }
  
  if (!html) {
    html = `<div style="text-align: center; padding: 2rem; color: var(--gray-500);">
      <i class="bi bi-bell-slash" style="font-size: 2rem; color: var(--gray-400);"></i>
      <p style="margin-top: 0.5rem;">No new notifications</p>
      <a href="booking.html" class="btn btn-primary btn-sm" style="margin-top: 0.5rem;">Book an Appointment</a>
    </div>`;
  }
  
  list.innerHTML = html;
  
  // Mark unseen notifications as seen after viewing
  for (const booking of unseenConfirmed) {
    await markNotificationAsSeen(booking.id);
  }
  
  // Update badge after marking as seen
  setTimeout(updateCustomerNotificationBadge, 1000);
}

// Close customer notification panel
function closeCustomerNotificationPanel() {
  const panel = document.getElementById('customerNotificationPanel');
  if (panel) {
    panel.style.display = 'none';
    customerNotificationPanelOpen = false;
  }
}

// View booking from notification
async function viewBookingFromNotification(bookingId) {
  closeCustomerNotificationPanel();
  // Open booking detail modal if function exists
  if (typeof openBookingDetailModal === 'function') {
    await openBookingDetailModal(bookingId);
  }
}

// Export notification functions
window.updateCustomerNotificationBadge = updateCustomerNotificationBadge;
window.openCustomerNotificationPanel = openCustomerNotificationPanel;
window.closeCustomerNotificationPanel = closeCustomerNotificationPanel;
window.viewBookingFromNotification = viewBookingFromNotification;

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
      existing.style.zIndex = '9999';
      existing.innerHTML = `<div id="simpleFallbackModalInner" style="background:#fff; max-width:480px; width:90%; max-height:85vh; overflow:auto; padding:1.25rem; padding-top:2.5rem; border-radius:12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); position:relative;">
        <button id="modalCloseBtn" onclick="closeModal()" style="position:absolute; top:8px; right:8px; width:32px; height:32px; border:none; background:#f0f0f0; border-radius:50%; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center; z-index:10;">&times;</button>
      </div>`;
      document.body.appendChild(existing);
      existing.addEventListener('click', (ev) => {
        if (ev.target === existing) existing.style.display = 'none';
      });
    }
    const inner = document.getElementById('simpleFallbackModalInner');
    // Keep the close button, add content after it
    const closeBtn = inner.querySelector('#modalCloseBtn');
    inner.innerHTML = '';
    if (closeBtn) {
      inner.appendChild(closeBtn.cloneNode(true));
    } else {
      // Re-add close button if missing
      const newCloseBtn = document.createElement('button');
      newCloseBtn.id = 'modalCloseBtn';
      newCloseBtn.onclick = closeModal;
      newCloseBtn.style.cssText = 'position:absolute; top:8px; right:8px; width:32px; height:32px; border:none; background:#f0f0f0; border-radius:50%; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center; z-index:10;';
      newCloseBtn.innerHTML = '&times;';
      inner.appendChild(newCloseBtn);
    }
    // Add the content
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = html;
    inner.appendChild(contentDiv);
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
  if (!user) {
    return [];
  }

  let allBookings;
  try {
    // Increased timeout to 8 seconds for slower connections
    if (typeof getBookings === 'function') {
      const bookingsTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('getBookings timeout')), 8000);
      });
      
      allBookings = await Promise.race([
        getBookings(),
        bookingsTimeout
      ]);
    } else {
      allBookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
    }
  } catch (e) {
    console.warn('getUserBookings: getBookings failed, using sync fallback', e);
    allBookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
    
    // If sync fallback also fails, try localStorage
    if (!Array.isArray(allBookings) || allBookings.length === 0) {
      try {
        const cachedBookings = localStorage.getItem('bookings');
        allBookings = cachedBookings ? JSON.parse(cachedBookings) : [];
      } catch (cacheError) {
        console.warn('Failed to load cached bookings:', cacheError);
        allBookings = [];
      }
    }
  }
  if (!Array.isArray(allBookings)) allBookings = [];

  // Filter by userId, email, or customerName to match different booking storage methods
  const userId = user.id || user.uid;
  const userEmail = user.email?.toLowerCase();
  const userName = user.name?.toLowerCase();
  
  const filtered = allBookings
    .filter(b => {
      // Match by userId (check both id and uid)
      if (b.userId === userId) return true;
      if (b.customerId === userId) return true;
      // Match by email (case-insensitive)
      if (userEmail && b.email?.toLowerCase() === userEmail) return true;
      if (userEmail && b.customerEmail?.toLowerCase() === userEmail) return true;
      // Match by customerName (case-insensitive)
      if (userName && b.customerName?.toLowerCase() === userName) return true;
      if (userName && b.ownerName?.toLowerCase() === userName) return true;
      return false;
    })
    .sort((a, b) => {
      const da = new Date((a.date || '') + ' ' + (a.time || ''));
      const db = new Date((b.date || '') + ' ' + (b.time || ''));
      return db - da;
    });
  
  return filtered;
}

async function loadUserBookings() {
  try {
    const bookings = await getUserBookings();
    customerBookingsCache = Array.isArray(bookings) ? bookings : [];
    
    if (typeof renderCustomerBookings === 'function') {
      await renderCustomerBookings();
      
      // Immediately sync sidebar countdown after bookings are rendered
      setTimeout(() => {
        syncSidebarWithBookingCountdown();
      }, 100);
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
    // Use cached bookings for better performance
    const bookings = customerBookingsCache.length > 0 ? customerBookingsCache : await getUserBookings();
    
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
            ${normalizeStatus(booking.status) === 'inprogress' ? `
            <p style="color: var(--gray-600); font-size: 0.9rem; margin: 0.25rem 0;">
              <strong>Groomer:</strong> ${escapeHtml(booking.groomerName || 'N/A')}
            </p>
            ` : ''}
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
  
  // Check button protection
  if (window.ButtonProtection && !window.ButtonProtection.canProceed()) {
    return;
  }
  
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
    // Use cached bookings for better performance
    bookings = customerBookingsCache.length > 0 ? customerBookingsCache : await getUserBookings();
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
          <span style="color: #2e7d32; font-weight: 700;">💰 Balance:</span>
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
    // Use cached bookings for better performance
    bookings = customerBookingsCache.length > 0 ? customerBookingsCache : await getUserBookings();
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
  // Find and disable submit button to prevent duplicates
  const submitBtn = document.getElementById('customerProfileForm')?.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
  }
  
  // Show loading screen
  if (typeof showLoadingOverlay === 'function') {
    showLoadingOverlay('Updating profile...');
  }
  
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
    
    // Re-enable button on error
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
    }
  } finally {
    // Hide loading screen
    if (typeof hideLoadingOverlay === 'function') {
      hideLoadingOverlay();
    }
  }
}

// Update pet profile
async function updatePetProfile() {
  // Find and disable submit button to prevent duplicates
  const submitBtn = document.getElementById('customerPetForm')?.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
  }
  
  // Show loading screen
  if (typeof showLoadingOverlay === 'function') {
    showLoadingOverlay('Saving pet profile...');
  }
  
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
    
    // Re-enable button on error
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
    }
  } finally {
    // Hide loading screen
    if (typeof hideLoadingOverlay === 'function') {
      hideLoadingOverlay();
    }
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
            if (['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(booking.status)) dotColor = '#f44336'; // red
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

// ============================================
// 🕐 MOBILE LIVE COUNTDOWN BANNER
// ============================================
// Shows a live countdown for today's upcoming booking
// Only visible on mobile devices
// Reuses time parsing logic from getBookingExpirationInfo
// ============================================

let countdownInterval = null;
let todaysBooking = null;

/**
 * Parse booking time string to hours and minutes
 * Handles formats: "9:30 AM", "2:00 PM", "14:00", "9am", "9am-12pm"
 * Reuses same logic as getBookingExpirationInfo for consistency
 */
function parseBookingTime(timeStr) {
  let hour = 9; // Default 9 AM
  let minute = 0;
  
  if (!timeStr) return { hour, minute };
  
  // For time ranges like "09:00 - 12:00", extract just the start time
  let startTime = timeStr;
  if (timeStr.includes('-')) {
    startTime = timeStr.split('-')[0].trim();
  }
  
  const timeMatch = startTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const isPM = timeMatch[3] && /pm/i.test(timeMatch[3]);
    const isAM = timeMatch[3] && /am/i.test(timeMatch[3]);
    
    // Convert to 24-hour format
    if (isPM && hour !== 12) {
      hour += 12;
    } else if (isAM && hour === 12) {
      hour = 0;
    }
    // If no AM/PM specified, assume it's already in 24-hour format or morning time
  }
  
  return { hour, minute };
}

/**
 * Check if a booking date is today
 */
function isBookingToday(bookingDate) {
  if (!bookingDate) return false;
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Direct match
  if (bookingDate === todayStr) return true;
  
  // Try parsing the date
  try {
    const parsed = new Date(bookingDate);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0] === todayStr;
    }
  } catch (e) {}
  
  return false;
}

/**
 * Initialize the live countdown banner
 * Finds the next upcoming PENDING booking and starts the countdown
 * Shows in sidebar on mobile, booking cards on desktop
 */
async function initMobileCountdown() {
  try {
    // Get user's bookings from cache or fetch
    let bookings = customerBookingsCache;
    if (!bookings || bookings.length === 0) {
      bookings = await getUserBookings();
    }
    
    if (!Array.isArray(bookings) || bookings.length === 0) {
      hideMobileCountdown();
      hideSidebarCountdown();
      return;
    }
    
    // Find the next upcoming PENDING booking (today or future)
    const now = new Date();
    const upcomingPendingBookings = bookings
      .filter(b => {
        const status = normalizeStatus(b.status);
        if (status !== 'pending') return false;
        
        // Skip single service bookings (they don't expire)
        const isSingleService = b.packageId === 'single-service' || 
                                (b.packageName && b.packageName.includes('Single Service'));
        if (isSingleService) return false;
        
        // Parse booking date
        const bookingDate = new Date(b.date);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return bookingDate >= todayStart; // Must be today or future
      })
      .sort((a, b) => {
        // Sort by date ascending (nearest first)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        // If same date, compare by time
        if (dateA.getTime() === dateB.getTime()) {
          const timeA = typeof parseBookingTime === 'function' ? parseBookingTime(a.time) : { hour: 0, minute: 0 };
          const timeB = typeof parseBookingTime === 'function' ? parseBookingTime(b.time) : { hour: 0, minute: 0 };
          return (timeA.hour * 60 + timeA.minute) - (timeB.hour * 60 + timeB.minute);
        }
        
        return dateA - dateB;
      });
    
    todaysBooking = upcomingPendingBookings[0] || null;
    
    if (!todaysBooking) {
      hideMobileCountdown();
      hideSidebarCountdown();
      return;
    }
    
    // Show sidebar countdown (for both mobile and desktop)
    showSidebarCountdown(todaysBooking);
    startSidebarCountdownTimer(todaysBooking);
    
    // Also update the mobile banner if on mobile
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      showMobileCountdown(todaysBooking);
      startCountdownTimer(todaysBooking);
    }
    
  } catch (error) {
    console.warn('[MobileCountdown] Error initializing:', error);
    hideMobileCountdown();
    hideSidebarCountdown();
  }
}

/**
 * Show the sidebar countdown with booking info
 */
function showSidebarCountdown(booking) {
  const container = document.getElementById('sidebarCountdown');
  if (!container) {
    console.warn('[SidebarCountdown] Container #sidebarCountdown not found');
    return;
  }
  
  // Calculate expiration time (appointment time)
  const { hour: bookingHour, minute: bookingMinute } = parseBookingTime(booking.time);
  const expiresAt = new Date(booking.date);
  expiresAt.setHours(bookingHour, bookingMinute, 0, 0);
  
  // Update pet name
  const petEl = document.getElementById('sidebarCountdownPet');
  if (petEl) {
    const petEmoji = booking.petType === 'dog' ? '🐕' : (booking.petType === 'cat' ? '🐈' : '🐾');
    const bookingDate = new Date(booking.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateStr = '';
    if (bookingDate.toDateString() === today.toDateString()) {
      dateStr = 'Today';
    } else if (bookingDate.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = bookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    const petText = `${petEmoji} ${booking.petName || 'Your Pet'} · ${dateStr} @ ${formatTimeDisplay(booking.time) || 'TBD'}`;
    petEl.innerHTML = petText;
  }
  
  // Update expires text
  const expiresEl = document.getElementById('sidebarCountdownExpires');
  if (expiresEl) {
    const expiresText = `Expires at ${formatTimeDisplay(expiresAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false }))} on ${expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    expiresEl.innerHTML = expiresText;
  }
  
  // Show the container
  container.style.display = 'block';
}

/**
 * Hide the sidebar countdown
 */
function hideSidebarCountdown() {
  const container = document.getElementById('sidebarCountdown');
  if (container) {
    container.style.display = 'none';
  }
  
  if (sidebarCountdownInterval) {
    clearInterval(sidebarCountdownInterval);
    sidebarCountdownInterval = null;
  }
}

// Sidebar countdown interval
let sidebarCountdownInterval = null;

/**
 * Start the sidebar countdown timer
 */
function startSidebarCountdownTimer(booking) {
  // Clear any existing interval
  if (sidebarCountdownInterval) {
    clearInterval(sidebarCountdownInterval);
  }
  
  // Parse booking time
  const { hour: bookingHour, minute: bookingMinute } = parseBookingTime(booking.time);
  
  // Create target date from booking date and time
  // Handle different date formats
  let targetDate;
  try {
    // Try parsing the date string directly
    targetDate = new Date(booking.date + ' ' + (booking.time || '09:00'));
    
    // If that fails, try just the date and set hours manually
    if (isNaN(targetDate.getTime())) {
      targetDate = new Date(booking.date);
      targetDate.setHours(bookingHour, bookingMinute, 0, 0);
    }
    
    // If still invalid, use a fallback
    if (isNaN(targetDate.getTime())) {
      console.warn('[SidebarCountdown] Could not parse date:', booking.date, booking.time);
      return;
    }
  } catch (e) {
    console.warn('[SidebarCountdown] Date parsing error:', e);
    return;
  }
  
  // Update function
  function updateSidebarCountdown() {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    
    const container = document.getElementById('sidebarCountdown');
    const hoursEl = document.getElementById('sidebarCountdownHours');
    const minutesEl = document.getElementById('sidebarCountdownMinutes');
    const secondsEl = document.getElementById('sidebarCountdownSeconds');
    
    if (!hoursEl || !minutesEl || !secondsEl) {
      console.warn('[SidebarCountdown] Elements not found');
      return;
    }
    
    if (diff <= 0) {
      // Expired
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';
      
      if (container) {
        container.classList.add('expired');
        const labelEl = container.querySelector('.sidebar-countdown-label');
        if (labelEl) labelEl.textContent = 'Expired';
      }
      
      if (sidebarCountdownInterval) {
        clearInterval(sidebarCountdownInterval);
        sidebarCountdownInterval = null;
      }
      return;
    }
    
    // Calculate time components
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    // Update display
    hoursEl.textContent = String(hours).padStart(2, '0');
    minutesEl.textContent = String(minutes).padStart(2, '0');
    secondsEl.textContent = String(seconds).padStart(2, '0');
    
    // Update urgency styling
    if (container) {
      if (hours === 0 && minutes < 30) {
        container.classList.add('urgent');
      } else {
        container.classList.remove('urgent');
      }
    }
  }
  
  // Initial update immediately
  updateSidebarCountdown();
  
  // Update every second
  sidebarCountdownInterval = setInterval(updateSidebarCountdown, 1000);
}

// Export sidebar countdown functions
window.showSidebarCountdown = showSidebarCountdown;
window.hideSidebarCountdown = hideSidebarCountdown;
window.startSidebarCountdownTimer = startSidebarCountdownTimer;

/**
 * Show the countdown banner with booking info
 * Only for PENDING bookings - shows "Pay to confirm" message
 */
function showMobileCountdown(booking) {
  const banner = document.getElementById('mobileCountdownBanner');
  if (!banner) return;
  
  // Calculate expiration time (appointment time)
  const { hour: bookingHour, minute: bookingMinute } = parseBookingTime(booking.time);
  const expiresAt = new Date(booking.date);
  expiresAt.setHours(bookingHour, bookingMinute, 0, 0);
  
  // Update pet name, date and time
  const petNameEl = document.getElementById('countdownPetName');
  if (petNameEl) {
    const petEmoji = booking.petType === 'dog' ? '🐕' : (booking.petType === 'cat' ? '🐈' : '🐾');
    // Format date nicely
    const bookingDate = new Date(booking.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateStr = '';
    if (bookingDate.toDateString() === today.toDateString()) {
      dateStr = 'Today';
    } else if (bookingDate.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = bookingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    petNameEl.textContent = `${petEmoji} ${booking.petName || 'Your Pet'} · ${dateStr} @ ${booking.time || 'TBD'}`;
  }
  
  // Update label to show "Pay to confirm" style
  const labelEl = document.querySelector('.countdown-label');
  if (labelEl) {
    labelEl.innerHTML = `⏳ <strong>Pay to confirm</strong> · Expires at ${expiresAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  
  // Update status - always pending since we only show for pending
  const statusText = document.getElementById('countdownStatusText');
  
  // Remove all status classes and set to pending
  banner.classList.remove('inprogress', 'urgent', 'confirmed');
  banner.classList.add('pending');
  if (statusText) statusText.textContent = 'Pending - Pay to confirm';
  
  // Show the banner
  banner.style.display = 'block';
}

/**
 * Hide the mobile countdown banner
 */
function hideMobileCountdown() {
  const banner = document.getElementById('mobileCountdownBanner');
  if (banner) {
    banner.style.display = 'none';
  }
  
  // Clear interval if running
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

/**
 * Start the live countdown timer
 */
function startCountdownTimer(booking) {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  // Parse booking time using shared function
  const { hour: bookingHour, minute: bookingMinute } = parseBookingTime(booking.time);
  
  // Create target date from booking date and time
  const targetDate = new Date(booking.date + ' ' + (booking.time || '00:00'));
  // Fallback if parsing fails
  if (isNaN(targetDate.getTime())) {
    const today = new Date();
    targetDate.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
    targetDate.setHours(bookingHour, bookingMinute, 0, 0);
  }
  
  // Update function
  function updateCountdown() {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    
    const banner = document.getElementById('mobileCountdownBanner');
    const hoursEl = document.getElementById('countdownHours');
    const minutesEl = document.getElementById('countdownMinutes');
    const secondsEl = document.getElementById('countdownSeconds');
    
    if (!hoursEl || !minutesEl || !secondsEl) return;
    
    if (diff <= 0) {
      // Appointment time reached or passed
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';
      
      const statusText = document.getElementById('countdownStatusText');
      if (statusText) {
        statusText.textContent = 'Appointment time! 🎉';
      }
      
      // Add inprogress class for visual feedback
      if (banner) {
        banner.classList.remove('pending', 'confirmed', 'urgent');
        banner.classList.add('inprogress');
      }
      
      // Stop the countdown
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      return;
    }
    
    // Calculate days, hours, minutes, seconds
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    // Update display - show days if more than 24 hours
    if (days > 0) {
      hoursEl.textContent = String(days).padStart(2, '0');
      minutesEl.textContent = String(hours).padStart(2, '0');
      secondsEl.textContent = String(minutes).padStart(2, '0');
      
      // Update labels for days view
      const hoursUnit = hoursEl.parentElement?.querySelector('.countdown-unit');
      const minutesUnit = minutesEl.parentElement?.querySelector('.countdown-unit');
      const secondsUnit = secondsEl.parentElement?.querySelector('.countdown-unit');
      if (hoursUnit) hoursUnit.textContent = 'days';
      if (minutesUnit) minutesUnit.textContent = 'hrs';
      if (secondsUnit) secondsUnit.textContent = 'min';
    } else {
      hoursEl.textContent = String(hours).padStart(2, '0');
      minutesEl.textContent = String(minutes).padStart(2, '0');
      secondsEl.textContent = String(seconds).padStart(2, '0');
      
      // Reset labels for hours view
      const hoursUnit = hoursEl.parentElement?.querySelector('.countdown-unit');
      const minutesUnit = minutesEl.parentElement?.querySelector('.countdown-unit');
      const secondsUnit = secondsEl.parentElement?.querySelector('.countdown-unit');
      if (hoursUnit) hoursUnit.textContent = 'hrs';
      if (minutesUnit) minutesUnit.textContent = 'min';
      if (secondsUnit) secondsUnit.textContent = 'sec';
    }
    
    // Add urgent class if less than 30 minutes
    if (banner) {
      if (hours === 0 && minutes < 30) {
        banner.classList.add('urgent');
      } else {
        banner.classList.remove('urgent');
      }
    }
  }
  
  // Initial update
  updateCountdown();
  
  // Update every second
  countdownInterval = setInterval(updateCountdown, 1000);
}

/**
 * Handle window resize - show/hide countdown based on screen size
 * Both Mobile and Desktop: Show sidebar countdown
 */
function handleCountdownResize() {
  const isMobile = window.innerWidth <= 768;
  
  if (todaysBooking) {
    // Show sidebar countdown on both mobile and desktop
    showSidebarCountdown(todaysBooking);
    startSidebarCountdownTimer(todaysBooking);
    
    if (isMobile) {
      // On mobile, also show the mobile banner
      showMobileCountdown(todaysBooking);
      startCountdownTimer(todaysBooking);
    } else {
      // On desktop, hide the mobile banner (only show sidebar countdown)
      hideMobileCountdown();
    }
  } else {
    // No booking to show
    hideSidebarCountdown();
    hideMobileCountdown();
  }
}

// Listen for resize events (debounced)
let resizeTimeout;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(handleCountdownResize, 250);
});

// Export countdown functions
window.initMobileCountdown = initMobileCountdown;
window.hideMobileCountdown = hideMobileCountdown;
window.parseBookingTime = parseBookingTime;

// ============================================
// 🚀 PERFORMANCE OPTIMIZATIONS
// ============================================

/**
 * Load user bookings with caching to reduce API calls
 */
async function loadUserBookingsWithCache() {
  const CACHE_KEY = 'userBookings_cache';
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
  
  // Check cache first
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log('[Performance] Using cached bookings');
        customerBookingsCache = data;
        renderCustomerBookings(data);
        return;
      }
    } catch (e) {
      localStorage.removeItem(CACHE_KEY);
    }
  }
  
  // Load fresh data
  await loadUserBookings();
  
  // Cache the result
  if (customerBookingsCache && customerBookingsCache.length > 0) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: customerBookingsCache,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('[Performance] Failed to cache bookings:', e.message);
    }
  }
}

/**
 * Load quick stats with caching
 */
async function loadQuickStatsWithCache() {
  const CACHE_KEY = 'quickStats_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Check cache first
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log('[Performance] Using cached stats');
        renderQuickStatsFromData(data);
        return;
      }
    } catch (e) {
      localStorage.removeItem(CACHE_KEY);
    }
  }
  
  // FIXED: Ensure we have bookings data before calculating stats
  let bookings = customerBookingsCache;
  if (!bookings || bookings.length === 0) {
    // Load bookings first if cache is empty
    bookings = await getUserBookings();
    customerBookingsCache = bookings;
  }
  
  // Calculate stats from actual bookings data
  const totalBookings = bookings.length;
  const cancelledStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'];
  const pendingBookings = bookings.filter(b => (b.status || '').toLowerCase() === 'pending').length;
  const confirmedBookings = bookings.filter(b => {
    const s = (b.status || '').toLowerCase().replace(/\s+/g, '');
    return s === 'confirmed' || s === 'inprogress';
  }).length;
  const cancelledBookings = bookings.filter(b => cancelledStatuses.includes(b.status)).length;
  
  const statsData = {
    totalBookings,
    pendingBookings,
    completedBookings: confirmedBookings,
    cancelledBookings
  };
  
  // Cache the result
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: statsData,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('[Performance] Failed to cache stats:', e.message);
  }
  
  // Render the stats
  renderQuickStatsFromData(statsData);
}

/**
 * Render quick stats from cached data
 */
function renderQuickStatsFromData(statsData) {
  const statsContainer = document.getElementById('quickStats');
  if (!statsContainer || !statsData) return;
  
  // Create the stats HTML from cached data
  const { totalBookings, pendingBookings, completedBookings, cancelledBookings } = statsData;
  
  statsContainer.innerHTML = `
    <div class="stat-card fade-in" style="background: linear-gradient(135deg, #e3f2fd, #bbdefb);">
      <div class="stat-icon" style="color: #1976d2;">📊</div>
      <div class="stat-content">
        <div class="stat-number">${totalBookings || 0}</div>
        <div class="stat-label">Total Bookings</div>
      </div>
    </div>
    <div class="stat-card fade-in" style="background: linear-gradient(135deg, #fff3e0, #ffe0b2);">
      <div class="stat-icon" style="color: #f57c00;">⏳</div>
      <div class="stat-content">
        <div class="stat-number">${pendingBookings || 0}</div>
        <div class="stat-label">Pending</div>
      </div>
    </div>
    <div class="stat-card fade-in" style="background: linear-gradient(135deg, #e8f5e9, #c8e6c9);">
      <div class="stat-icon" style="color: #388e3c;">✅</div>
      <div class="stat-content">
        <div class="stat-number">${completedBookings || 0}</div>
        <div class="stat-label">Completed</div>
      </div>
    </div>
    <div class="stat-card fade-in" style="background: linear-gradient(135deg, #ffebee, #ffcdd2);">
      <div class="stat-icon" style="color: #d32f2f;">❌</div>
      <div class="stat-content">
        <div class="stat-number">${cancelledBookings || 0}</div>
        <div class="stat-label">Cancelled</div>
      </div>
    </div>
  `;
}

/**
 * Clear all dashboard caches (call when user makes changes)
 */
function clearDashboardCache() {
  localStorage.removeItem('userBookings_cache');
  localStorage.removeItem('quickStats_cache');
  console.log('[Performance] Dashboard cache cleared');
}

// Make functions globally available
window.loadUserBookingsWithCache = loadUserBookingsWithCache;
window.loadQuickStatsWithCache = loadQuickStatsWithCache;
window.clearDashboardCache = clearDashboardCache;
// ============================================
// 🚀 LAZY LOADING FOR NON-CRITICAL COMPONENTS
// ============================================

/**
 * Lazy load non-critical components after main content is ready
 */
function lazyLoadNonCriticalComponents() {
  // Use requestIdleCallback for better performance
  const loadWhenIdle = (callback) => {
    if (window.requestIdleCallback) {
      requestIdleCallback(callback, { timeout: 2000 });
    } else {
      setTimeout(callback, 100);
    }
  };
  
  // Lazy load team calendar preview
  loadWhenIdle(() => {
    try {
      renderTeamCalendarPreview();
    } catch (e) {
      console.warn('[LazyLoad] Team calendar failed:', e.message);
    }
  });
  
  // Lazy load community showcase
  loadWhenIdle(() => {
    try {
      renderCommunityShowcase();
    } catch (e) {
      console.warn('[LazyLoad] Community showcase failed:', e.message);
    }
  });
  
  // Lazy load booking notifications
  loadWhenIdle(async () => {
    try {
      const notificationsTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Notifications timeout')), 2000);
      });
      await Promise.race([renderBookingNotifications(), notificationsTimeout]);
    } catch (e) {
      console.warn('[LazyLoad] Notifications failed:', e.message);
    }
  });
  
  // Lazy load notification badge updates
  loadWhenIdle(() => {
    try {
      updateCustomerNotificationBadge();
      // Refresh notifications every 30 seconds
      setInterval(updateCustomerNotificationBadge, 30000);
    } catch (e) {
      console.warn('[LazyLoad] Notification badge failed:', e.message);
    }
  });
}

/**
 * Intersection Observer for lazy loading images
 */
function setupLazyImageLoading() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    });
    
    // Observe all images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
}

// Make functions globally available
window.lazyLoadNonCriticalComponents = lazyLoadNonCriticalComponents;
window.setupLazyImageLoading = setupLazyImageLoading;
// ============================================
// 🚀 DEBOUNCING UTILITIES
// ============================================

/**
 * Debounce function to reduce excessive function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Debounced versions of common functions
const debouncedUpdateSummary = debounce(() => {
  if (typeof updateSummary === 'function') {
    updateSummary();
  }
}, 300);

const debouncedFilterBookings = debounce((filterType) => {
  if (typeof filterBookings === 'function') {
    filterBookings(filterType);
  }
}, 200);

const throttledScrollHandler = throttle(() => {
  // Handle scroll events efficiently
  if (typeof handleScroll === 'function') {
    handleScroll();
  }
}, 100);

// Make utilities globally available
window.debounce = debounce;
window.throttle = throttle;
window.debouncedUpdateSummary = debouncedUpdateSummary;
window.debouncedFilterBookings = debouncedFilterBookings;
window.throttledScrollHandler = throttledScrollHandler;
/**
 * Render quick stats from data object
 */
function renderQuickStatsFromData(statsData) {
  const statsContainer = document.getElementById('quickStats');
  if (!statsContainer) {
    console.error('[Customer Dashboard] quickStats container not found in HTML!');
    return;
  }
  
  const { totalBookings, pendingBookings, completedBookings, cancelledBookings } = statsData;
  
  // Replace skeleton with real stats (with fade-in animation)
  statsContainer.innerHTML = `
    <div class="stat-card fade-in" style="background: linear-gradient(135deg, rgba(100, 181, 246, 0.15), rgba(66, 165, 245, 0.15)); cursor: pointer; padding: 1.5rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" onclick="sortCustomerBookings('all')">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">📅</div>
      <div style="font-size: 2rem; color: #1976d2; font-weight: 700;">${totalBookings}</div>
      <div style="color: #666; font-weight: 600; text-transform: uppercase; font-size: 0.7rem;">TOTAL BOOKINGS</div>
    </div>
    <div class="stat-card fade-in" style="background: linear-gradient(135deg, rgba(255, 235, 59, 0.2), rgba(255, 224, 130, 0.2)); cursor: pointer; padding: 1.5rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); animation-delay: 0.05s;" onclick="sortCustomerBookings('pending')">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏳</div>
      <div style="font-size: 2rem; color: #f57c00; font-weight: 700;">${pendingBookings}</div>
      <div style="color: #666; font-weight: 600; text-transform: uppercase; font-size: 0.7rem;">PENDING</div>
    </div>
    <div class="stat-card fade-in" style="background: linear-gradient(135deg, rgba(129, 199, 132, 0.2), rgba(102, 187, 106, 0.2)); cursor: pointer; padding: 1.5rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); animation-delay: 0.1s;" onclick="sortCustomerBookings('confirmed')">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">✅</div>
      <div style="font-size: 2rem; color: #388e3c; font-weight: 700;">${completedBookings}</div>
      <div style="color: #666; font-weight: 600; text-transform: uppercase; font-size: 0.7rem;">CONFIRMED</div>
    </div>
    <div class="stat-card fade-in" style="background: linear-gradient(135deg, rgba(239, 83, 80, 0.15), rgba(229, 115, 115, 0.15)); cursor: pointer; padding: 1.5rem; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); animation-delay: 0.15s;" onclick="sortCustomerBookings('cancelled')">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">❌</div>
      <div style="font-size: 2rem; color: #d32f2f; font-weight: 700;">${cancelledBookings}</div>
      <div style="color: #666; font-weight: 600; text-transform: uppercase; font-size: 0.7rem;">CANCELLED</div>
    </div>
  `;
  
  console.log('[Stats] Rendered stats:', statsData);
}

// Make function globally available
window.renderQuickStatsFromData = renderQuickStatsFromData;
// ============================================
// 🚀 PROGRESSIVE LOADING INDICATORS
// ============================================

/**
 * Show progressive loading with steps
 */
function showProgressiveLoading() {
  const steps = [
    'Loading user data...',
    'Checking bookings...',
    'Preparing dashboard...',
    'Almost ready...'
  ];
  
  let currentStep = 0;
  const loadingEl = document.getElementById('loadingMessage');
  
  if (loadingEl) {
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        loadingEl.textContent = steps[currentStep];
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 800);
    
    // Clear after 5 seconds max
    setTimeout(() => clearInterval(interval), 5000);
  }
}

/**
 * Update loading progress
 */
function updateLoadingProgress(message, percentage = null) {
  const loadingEl = document.getElementById('loadingMessage');
  const progressEl = document.getElementById('loadingProgress');
  
  if (loadingEl) {
    loadingEl.textContent = message;
  }
  
  if (progressEl && percentage !== null) {
    progressEl.style.width = `${percentage}%`;
  }
}

// Make functions globally available
window.showProgressiveLoading = showProgressiveLoading;
window.updateLoadingProgress = updateLoadingProgress;