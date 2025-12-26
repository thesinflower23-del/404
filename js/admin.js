/* ============================================
   BestBuddies Pet Grooming - Admin Dashboard
   ============================================ */

let currentView = 'overview';
let sortBy = 'date'; // 'date', 'status', 'customer'
const adminState = {
  recentPage: 1,
  recentPageSize: 5,
  recentData: [],
  recentLimit: 'all', // 'all', '3', '5', '10'

  // Pagination states for other views
  pendingPage: 1,
  pendingPageSize: 5,
  pendingSortBy: 'date',       // Sort field: 'date', 'customer', 'total'
  pendingSortOrder: 'asc',     // Sort direction: 'asc', 'desc'
  pendingRecentActive: false,  // Track if "Recent" button is active (toggle state)

  confirmedPage: 1,
  confirmedPageSize: 5,
  confirmedSortBy: 'date',
  confirmedSortOrder: 'asc',
  confirmedSearchTerm: '',
  confirmedRecentActive: false,  // Track if "Recent" button is active (toggle state)

  // In Progress state
  inprogressPage: 1,
  inprogressPageSize: 5,
  inprogressSortBy: 'date',       // Sort field: 'date', 'customer', 'package'
  inprogressSortOrder: 'asc',     // Sort direction: 'asc', 'desc'
  inprogressSearchTerm: '',       // Search term for filtering
  inprogressRecentActive: false,  // Track if "Recent" button is active (toggle state)

  customersPage: 1,
  customersPageSize: 5,

  absencesPage: 1,
  absencesPageSize: 5,

  galleryPage: 1,
  galleryPageSize: 5,

  // Booking History View State
  historyPage: 1,              // Current page number
  historyPageSize: 10,         // Items per page (3, 5, 10, 20, 1000 for "All")
  historySortBy: 'date',       // Sort field: 'date', 'status', 'customer', 'amount'
  historySortOrder: 'desc',    // Sort direction: 'asc' (oldest first), 'desc' (newest first)

  // Cached Data
  historyData: [],             // All bookings (fetched once)
  filteredData: [],            // After sorting
  paginatedData: [],           // Current page slice

  // Computed Values (calculated on demand)
  get totalBookings() {
    return this.historyData.length;
  },
  get totalPages() {
    return Math.ceil(this.totalBookings / this.historyPageSize) || 1;
  },
  get startIndex() {
    return (this.historyPage - 1) * this.historyPageSize;
  },
  get endIndex() {
    return this.startIndex + this.historyPageSize;
  }
};

// Debounce timeout variables for search functions
let confirmedSearchTimeout = null;
let customersSearchTimeout = null;
let inprogressSearchTimeout = null;
let pendingSearchTimeout = null;
let pendingBookingsSearchTimeout = null;

// ============================================
// Global Action Click Protection System
// Prevents duplicate clicks on action buttons
// ============================================
let isActionInProgress = false;
const ACTION_COOLDOWN_MS = 2000; // 2 second cooldown

/**
 * Wrapper function to protect any action from duplicate clicks
 * @param {Function} actionFn - The async action function to execute
 * @param {string} actionName - Name of the action for logging
 * @returns {Function} - Protected action function
 */
async function protectedAction(actionFn, actionName = 'action') {
  if (isActionInProgress) {
    console.log(`[protectedAction] ${actionName} blocked - another action in progress`);
    return;
  }
  
  isActionInProgress = true;
  
  // Disable all action dropdown buttons visually
  const actionButtons = document.querySelectorAll('.action-dropdown-item');
  actionButtons.forEach(btn => {
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
  });
  
  try {
    await actionFn();
  } catch (error) {
    console.error(`[protectedAction] ${actionName} failed:`, error);
  } finally {
    // Reset after cooldown
    setTimeout(() => {
      isActionInProgress = false;
      // Re-enable buttons (if modal is still open)
      const actionButtons = document.querySelectorAll('.action-dropdown-item');
      actionButtons.forEach(btn => {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      });
    }, ACTION_COOLDOWN_MS);
  }
}

// Protected wrapper functions for common actions
async function protectedConfirmBooking(bookingId) {
  await protectedAction(() => confirmBooking(bookingId), 'confirmBooking');
}

async function protectedOpenCancelModal(bookingId) {
  await protectedAction(() => openCancelModal(bookingId), 'openCancelModal');
}

async function protectedHandleStartService(bookingId) {
  await protectedAction(() => handleStartService(bookingId), 'handleStartService');
}

async function protectedOpenRescheduleModal(bookingId) {
  await protectedAction(() => openRescheduleModal(bookingId), 'openRescheduleModal');
}

async function protectedOpenAddBookingFeeModal(bookingId) {
  await protectedAction(() => openAddBookingFeeModal(bookingId), 'openAddBookingFeeModal');
}

// Export protected functions globally
window.protectedConfirmBooking = protectedConfirmBooking;
window.protectedOpenCancelModal = protectedOpenCancelModal;
window.protectedHandleStartService = protectedHandleStartService;
window.protectedOpenRescheduleModal = protectedOpenRescheduleModal;
window.protectedOpenAddBookingFeeModal = protectedOpenAddBookingFeeModal;

// ============================================
// Admin Notification System
// ============================================
let notificationPanelOpen = false;

// Get seen notifications from localStorage
function getSeenNotifications() {
  try {
    return JSON.parse(localStorage.getItem('adminSeenNotifications') || '{}');
  } catch {
    return {};
  }
}

// Save seen notifications to localStorage
function saveSeenNotifications(seen) {
  localStorage.setItem('adminSeenNotifications', JSON.stringify(seen));
}

// Mark notification as seen
function markNotificationAsSeen(type, id) {
  const seen = getSeenNotifications();
  const key = `${type}_${id}`;
  seen[key] = Date.now();
  saveSeenNotifications(seen);
}

// Check if notification is seen
function isNotificationSeen(type, id) {
  const seen = getSeenNotifications();
  const key = `${type}_${id}`;
  return !!seen[key];
}

// Mark all current notifications as read
async function markAllNotificationsAsRead() {
  const bookings = await getBookings();
  const absences = getStaffAbsences();
  
  // Get all pending with proof
  const pendingWithProof = bookings.filter(b => 
    b.status === 'pending' && 
    b.proofOfPaymentImage
  );
  
  // Get all pending absences
  const pendingAbsences = absences.filter(a => a.status === 'pending');
  
  // Mark all as seen
  pendingWithProof.forEach(b => markNotificationAsSeen('payment', b.id));
  pendingAbsences.forEach(a => markNotificationAsSeen('absence', a.id));
  
  // Update badge and close panel
  await updateNotificationBadge();
  closeNotificationPanel();
  
  if (typeof customAlert !== 'undefined') {
    customAlert.success('Done', 'All notifications marked as read');
  }
}

// Clear/Reset all seen notifications (make them appear again)
function clearSeenNotifications() {
  localStorage.removeItem('adminSeenNotifications');
  updateNotificationBadge();
  closeNotificationPanel();
  
  if (typeof customAlert !== 'undefined') {
    customAlert.success('Reset', 'Notification status has been reset');
  }
}

// Update notification badge count
async function updateNotificationBadge() {
  const badge = document.getElementById('notificationBadge');
  const bell = document.getElementById('adminNotificationBell');
  if (!badge || !bell) return;
  
  const bookings = await getBookings();
  
  // Count pending bookings with proof of payment uploaded (exclude seen)
  const pendingWithProof = bookings.filter(b => 
    b.status === 'pending' && 
    b.proofOfPaymentImage &&
    !isNotificationSeen('payment', b.id)
  );
  
  // Count pending groomer absence requests (exclude seen)
  const absences = getStaffAbsences();
  const pendingAbsences = absences.filter(a => 
    a.status === 'pending' &&
    !isNotificationSeen('absence', a.id)
  );
  
  const totalNotifications = pendingWithProof.length + pendingAbsences.length;
  
  if (totalNotifications > 0) {
    badge.style.display = 'block';
    badge.textContent = totalNotifications > 99 ? '99+' : totalNotifications;
    // Add animation
    bell.style.animation = 'bellShake 0.5s ease-in-out';
    setTimeout(() => bell.style.animation = '', 500);
  } else {
    badge.style.display = 'none';
  }
}

// Open notification panel
async function openNotificationPanel() {
  const panel = document.getElementById('notificationPanel');
  const list = document.getElementById('notificationList');
  if (!panel || !list) return;
  
  notificationPanelOpen = !notificationPanelOpen;
  
  if (!notificationPanelOpen) {
    panel.style.display = 'none';
    return;
  }
  
  panel.style.display = 'block';
  list.innerHTML = '<div style="text-align: center; padding: 1rem;"><div class="spinner"></div></div>';
  
  const bookings = await getBookings();
  const absences = getStaffAbsences();
  
  // Debug: Log all pending bookings to see their structure
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  console.log('[NotificationPanel] All pending bookings:', pendingBookings.length);
  pendingBookings.forEach(b => {
    console.log(`[NotificationPanel] Booking ${b.id}: proofOfPaymentImage=${!!b.proofOfPaymentImage}, proofOfPayment=${!!b.proofOfPayment}`);
  });
  
  // Get pending bookings with proof of payment
  const pendingWithProof = bookings.filter(b => 
    b.status === 'pending' && 
    b.proofOfPaymentImage
  ).sort((a, b) => (b.proofOfPaymentUploadedAt || b.createdAt) - (a.proofOfPaymentUploadedAt || a.createdAt));
  
  console.log('[NotificationPanel] Pending with proof:', pendingWithProof.length);
  
  // Get pending absence requests
  const pendingAbsences = absences.filter(a => a.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt);
  
  let html = '';
  
  // Payment proof notifications with image preview
  if (pendingWithProof.length > 0) {
    html += `<div style="padding: 0.5rem; background: #e3f2fd; border-radius: 8px; margin-bottom: 0.5rem;">
      <div style="font-weight: 600; font-size: 0.85rem; color: #1565c0; margin-bottom: 0.5rem;">
        <i class="bi bi-credit-card"></i> Payment Proofs (${pendingWithProof.length})
      </div>`;
    
    pendingWithProof.slice(0, 5).forEach(booking => {
      const bookingCode = typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : booking.id;
      const timeAgo = getTimeAgo(booking.proofOfPaymentUploadedAt || booking.createdAt);
      const proofImage = booking.proofOfPaymentImage || '';
      html += `
        <div style="background: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; border-left: 3px solid #1976d2;">
          <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
            ${proofImage ? `
              <div style="flex-shrink: 0;">
                <img src="${proofImage}" alt="Payment Proof" 
                  style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 2px solid #1976d2;" 
                  onclick="openProofImageLightbox('${proofImage.replace(/'/g, "\\'")}', 'Payment Proof - ${escapeHtml(booking.customerName || 'Customer')}')"
                  title="Click to view full image">
              </div>
            ` : ''}
            <div style="flex: 1; cursor: pointer;" onclick="markNotificationAsSeen('payment', '${booking.id}'); goToPendingBooking('${booking.id}'); updateNotificationBadge();">
              <div style="font-weight: 600; font-size: 0.9rem;">${escapeHtml(booking.customerName || 'Customer')}</div>
              <div style="font-size: 0.8rem; color: var(--gray-600);">Receipt: ${escapeHtml(String(bookingCode))}</div>
              <div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 0.25rem;">${timeAgo}</div>
            </div>
          </div>
        </div>
      `;
    });
    
    if (pendingWithProof.length > 5) {
      html += `<div style="text-align: center; padding: 0.5rem;"><a href="#" onclick="switchView('pending'); closeNotificationPanel();" style="font-size: 0.85rem; color: #1565c0;">View all ${pendingWithProof.length} pending payments →</a></div>`;
    }
    html += '</div>';
  }
  
  // Absence request notifications with proof image
  if (pendingAbsences.length > 0) {
    html += `<div style="padding: 0.5rem; background: #fff3e0; border-radius: 8px; margin-bottom: 0.5rem;">
      <div style="font-weight: 600; font-size: 0.85rem; color: #e65100; margin-bottom: 0.5rem;">
        <i class="bi bi-calendar-x"></i> Absence Requests (${pendingAbsences.length})
      </div>`;
    
    pendingAbsences.slice(0, 3).forEach(absence => {
      const timeAgo = getTimeAgo(absence.createdAt);
      const proofImage = absence.proofData || '';
      html += `
        <div style="background: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; border-left: 3px solid #ff9800;">
          <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
            ${proofImage ? `
              <div style="flex-shrink: 0;">
                <img src="${proofImage}" alt="Absence Proof" 
                  style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 2px solid #ff9800;" 
                  onclick="openProofImageLightbox('${proofImage.replace(/'/g, "\\'")}', 'Absence Proof - ${escapeHtml(absence.staffName || 'Groomer')}')"
                  title="Click to view full image">
              </div>
            ` : ''}
            <div style="flex: 1; cursor: pointer;" onclick="markNotificationAsSeen('absence', '${absence.id}'); switchView('groomerAbsences'); closeNotificationPanel(); updateNotificationBadge();">
              <div style="font-weight: 600; font-size: 0.9rem;">${escapeHtml(absence.staffName || 'Groomer')}</div>
              <div style="font-size: 0.8rem; color: var(--gray-600);">Date: ${formatDate(absence.date)}</div>
              <div style="font-size: 0.8rem; color: var(--gray-600);">Reason: ${escapeHtml(absence.reason || 'Not specified')}</div>
              <div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 0.25rem;">${timeAgo}</div>
            </div>
          </div>
        </div>
      `;
    });
    
    if (pendingAbsences.length > 3) {
      html += `<div style="text-align: center; padding: 0.5rem;"><a href="#" onclick="switchView('groomerAbsences'); closeNotificationPanel();" style="font-size: 0.85rem; color: #e65100;">View all ${pendingAbsences.length} requests →</a></div>`;
    }
    html += '</div>';
  }
  
  if (!html) {
    html = `<div style="text-align: center; padding: 2rem; color: var(--gray-500);">
      <i class="bi bi-check-circle" style="font-size: 2rem; color: #4caf50;"></i>
      <p style="margin-top: 0.5rem;">All caught up! No new notifications.</p>
    </div>`;
  }
  
  list.innerHTML = html;
}

// Close notification panel
function closeNotificationPanel() {
  const panel = document.getElementById('notificationPanel');
  if (panel) {
    panel.style.display = 'none';
    notificationPanelOpen = false;
  }
}

// Navigate to pending booking
function goToPendingBooking(bookingId) {
  closeNotificationPanel();
  switchView('pending');
  // Highlight the booking after a short delay
  setTimeout(() => {
    const bookingRow = document.querySelector(`[data-booking-id="${bookingId}"]`);
    if (bookingRow) {
      bookingRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      bookingRow.style.animation = 'highlightRow 2s ease-out';
    }
  }, 500);
}

// Helper: Get time ago string
function getTimeAgo(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(new Date(timestamp).toISOString().split('T')[0]);
}

// Export notification functions globally
window.updateNotificationBadge = updateNotificationBadge;
window.openNotificationPanel = openNotificationPanel;
window.closeNotificationPanel = closeNotificationPanel;
window.markNotificationAsSeen = markNotificationAsSeen;
window.isNotificationSeen = isNotificationSeen;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.clearSeenNotifications = clearSeenNotifications;
window.goToPendingBooking = goToPendingBooking;

// Open proof image in lightbox
function openProofImageLightbox(imageSrc, title) {
  // Create lightbox overlay
  const existingLightbox = document.getElementById('proofImageLightbox');
  if (existingLightbox) existingLightbox.remove();
  
  const lightbox = document.createElement('div');
  lightbox.id = 'proofImageLightbox';
  lightbox.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    padding: 1rem;
    box-sizing: border-box;
  `;
  
  lightbox.innerHTML = `
    <div style="position: absolute; top: 1rem; right: 1rem; left: 1rem; display: flex; justify-content: space-between; align-items: center;">
      <h4 style="color: white; margin: 0; font-size: 1rem;">${title || 'Image Preview'}</h4>
      <button onclick="closeProofImageLightbox()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 1.5rem; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <img src="${imageSrc}" alt="${title || 'Proof Image'}" style="max-width: 90%; max-height: 80vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
      <a href="${imageSrc}" download="proof-image.jpg" class="btn btn-outline" style="color: white; border-color: white;">
        <i class="bi bi-download"></i> Download
      </a>
    </div>
  `;
  
  // Close on background click
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) {
      closeProofImageLightbox();
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeProofImageLightbox();
      document.removeEventListener('keydown', escHandler);
    }
  });
  
  document.body.appendChild(lightbox);
}

// Close proof image lightbox
function closeProofImageLightbox() {
  const lightbox = document.getElementById('proofImageLightbox');
  if (lightbox) {
    lightbox.remove();
  }
}

window.openProofImageLightbox = openProofImageLightbox;
window.closeProofImageLightbox = closeProofImageLightbox;

// Generic pagination controls renderer
function renderPaginationControls(containerId, statePrefix, totalItems, onPageChange, onSizeChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const pageSize = adminState[`${statePrefix}PageSize`];
  const currentPage = adminState[`${statePrefix}Page`];
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalItems);

  // Generate smart page numbers with ellipsis
  let pageNumbers = [];
  if (totalPages <= 5) {
    // Show all pages if 5 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    // Show 1, 2, 3, ..., last
    pageNumbers.push(1, 2, 3);
    if (currentPage > 5) {
      pageNumbers.push('...');
    }
    if (currentPage > 4 && currentPage < totalPages - 2) {
      pageNumbers.push(currentPage);
    }
    if (currentPage < totalPages - 2) {
      pageNumbers.push('...');
    }
    pageNumbers.push(totalPages);
  }

  // Remove duplicates and sort
  pageNumbers = [...new Set(pageNumbers)].filter(p => p === '...' || typeof p === 'number').sort((a, b) => {
    if (a === '...') return 1;
    if (b === '...') return -1;
    return a - b;
  });

  const pageButtonsHtml = pageNumbers.map(page => {
    if (page === '...') {
      return `<span style="padding: 0.5rem 0.25rem; color: var(--gray-600);">…</span>`;
    }
    const isActive = page === currentPage;
    return `
      <button 
        class="btn btn-sm" 
        style="padding: 0.5rem 0.75rem; ${isActive ? 'background: var(--primary); color: white; border-color: var(--primary);' : 'background: white; border: 1px solid var(--gray-300);'}"
        onclick="${onPageChange}(${page})"
      >
        ${page}
      </button>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <label style="font-size: 0.9rem; color: var(--gray-600);">Show:</label>
        <select class="form-select" style="width: auto; padding: 0.5rem;" onchange="${onSizeChange}(this.value)">
          <option value="3" ${pageSize === 3 ? 'selected' : ''}>3</option>
          <option value="5" ${pageSize === 5 ? 'selected' : ''}>5</option>
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
          <option value="1000" ${pageSize === 1000 ? 'selected' : ''}>All</option>
        </select>
        <span style="font-size: 0.9rem; color: var(--gray-600);">entries</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <span style="font-size: 0.9rem; color: var(--gray-600);">
          Showing ${totalItems > 0 ? start : 0} to ${end} of ${totalItems}
        </span>
        ${totalPages > 1 ? `
          <div style="display: flex; align-items: center; gap: 0.25rem;">
            <button class="btn btn-outline btn-sm" onclick="${onPageChange}(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹ Prev</button>
            ${pageButtonsHtml}
            <button class="btn btn-outline btn-sm" onclick="${onPageChange}(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next ›</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ============================================
// 🔧 EXTRACT PREFERRED CUT - Supports both ID and name lookup
// ============================================
// Checks booking.referenceCut first (new ID-based system)
// Falls back to searching notes for cut names (legacy support)
// Returns display name for UI, but booking stores the ID
// ============================================
function extractPreferredCut(notes, booking = null) {
  // ============================================
  // OPTION 1: Check booking.referenceCut (new ID-based system)
  // ============================================
  // If booking has referenceCut ID, use getReferenceCutName() to get display name
  // This is the preferred method for new bookings
  // ============================================
  if (booking && booking.referenceCut) {
    const cutId = booking.referenceCut;
    // Get display name from cut ID
    const cutName = typeof getReferenceCutName === 'function' 
      ? getReferenceCutName(cutId) 
      : (typeof window.getReferenceCutName === 'function' ? window.getReferenceCutName(cutId) : cutId);
    console.log('[extractPreferredCut] Found cut ID:', cutId, '| Display name:', cutName);
    return cutName;
  }
  
  // ============================================
  // OPTION 2: Search notes for cut names (legacy support)
  // ============================================
  // For old bookings that don't have referenceCut field
  // Search the notes text for known cut names
  // ============================================
  if (!notes || typeof notes !== 'string') return null;

  const cutNames = ['Puppy Cut', 'Teddy Bear Cut', 'Lion Cut', 'Summer Cut', 'Kennel Cut', 'Show Cut'];
  const notesLower = notes.toLowerCase().trim();

  if (!notesLower) return null;

  for (let cut of cutNames) {
    // Case-insensitive check
    if (notesLower.includes(cut.toLowerCase())) {
      return cut;
    }
  }

  return null;
}


// ============================================
// 💰 PRICE BREAKDOWN GENERATOR
// ============================================
// Generates detailed price breakdown HTML for admin view
// Different display logic based on booking status:
// - PENDING: Simple view (Total Amount only)
// - CONFIRMED/IN PROGRESS/COMPLETED: Full breakdown with all components
// ============================================
/**
 * Generate price breakdown HTML for admin view
 * For PENDING bookings: Show only Total Amount (no Package/Subtotal breakdown since no add-ons yet)
 * For CONFIRMED/IN PROGRESS/COMPLETED: Show full breakdown with Package, Add-ons, Subtotal
 * 
 * @param {Object} booking - Booking object
 * @param {Object} pkg - Package object (optional)
 * @returns {string} HTML for price breakdown
 */
function generatePriceBreakdown(booking, pkg = null) {
  // Use unified price breakdown from main.js
  if (typeof generateUnifiedPriceBreakdown === 'function') {
    return generateUnifiedPriceBreakdown(booking);
  }

  if (!booking) return '';

  const cost = booking.cost || {};
  const isSingleService = booking.packageId === 'single-service';
  
  // ============================================
  // 🔧 SINGLE SERVICE PRICING CALCULATION
  // ============================================
  // Single services have individual prices based on pet weight
  // Try two sources:
  // 1. cost.services (preferred - has actual prices)
  // 2. booking.singleServices + SINGLE_SERVICE_PRICING (fallback)
  // ============================================
  const singleServices = cost.services || [];
  const singleServicesIds = booking.singleServices || [];
  
  let singleServicesTotal = 0;
  let singleServicesHtml = '';
  
  if (isSingleService && (singleServices.length > 0 || singleServicesIds.length > 0)) {
    // ============================================
    // OPTION 1: Use cost.services (has prices already calculated)
    // ============================================
    if (singleServices.length > 0) {
      singleServicesTotal = singleServices.reduce((sum, s) => sum + (s.price || 0), 0);
      singleServicesHtml = singleServices.map(service => 
        `<div style="padding-left: 1.5rem; color: var(--gray-600); font-size: 0.9rem;">
          • ${escapeHtml(service.label || service.serviceId || 'Service')} - ${formatCurrency(service.price || 0)}
        </div>`
      ).join('');
    } else if (singleServicesIds.length > 0) {
      // ============================================
      // OPTION 2: Fallback - calculate from SINGLE_SERVICE_PRICING
      // ============================================
      // Used when cost.services is empty (old bookings)
      // Estimates price based on pet weight tier
      // ============================================
      const pricing = window.SINGLE_SERVICE_PRICING || {};
      singleServicesHtml = singleServicesIds.map(serviceId => {
        const serviceInfo = pricing[serviceId];
        const label = serviceInfo?.label || serviceId;
        
        // ============================================
        // 📏 WEIGHT-BASED PRICING
        // ============================================
        // Get price from tiers based on pet weight
        // Small pets (≤5kg): Use small tier price
        // Large pets (>5kg): Use large tier price
        // ============================================
        let price = 0;
        if (serviceInfo?.tiers) {
          const weightLabel = booking.petWeight || '';
          const isSmall = weightLabel.includes('5kg') || weightLabel.includes('below');
          const tier = isSmall ? serviceInfo.tiers.small : serviceInfo.tiers.large;
          price = tier?.price || 0;
        }
        singleServicesTotal += price;
        return `<div style="padding-left: 1.5rem; color: var(--gray-600); font-size: 0.9rem;">
          • ${escapeHtml(label)} - ${formatCurrency(price)}
        </div>`;
      }).join('');
    }
  }

  // ============================================
  // 📦 PACKAGE PRICING
  // ============================================
  // Get package price from multiple sources (fallback chain)
  // Single services: packagePrice = 0 (no package, only services)
  // Full packages: Try cost.packagePrice, then booking.totalPrice, then pkg.price
  // ============================================
  const packagePrice = isSingleService ? 0 : (cost.packagePrice || booking.totalPrice || pkg?.price || 0);

  // ============================================
  // ➕ ADD-ONS PRICING
  // ============================================
  // Calculate total price of all add-ons
  // Add-ons can be added to both packages and single services
  // Each add-on has its own price
  // ============================================
  const addOns = booking.addOns || cost.addOns || [];
  const addOnsTotal = addOns.reduce((sum, addon) => sum + (parseFloat(addon.price) || 0), 0);

  // ============================================
  // 💵 SUBTOTAL CALCULATION
  // ============================================
  // Subtotal = Package Price + Add-ons + Single Services
  // This is the total BEFORE booking fee discount
  // ============================================
  const subtotal = packagePrice + addOnsTotal + singleServicesTotal;

  // ============================================
  // 🎫 BOOKING FEE
  // ============================================
  // Booking fee is paid upfront to confirm booking
  // Deducted from final amount customer pays on arrival
  // Example: ₱500 subtotal - ₱100 booking fee = ₱400 to pay on arrival
  // ============================================
  const bookingFee = cost.bookingFee || 0;

  // ============================================
  // 📊 STATUS-BASED DISPLAY LOGIC
  // ============================================
  const statusLower = (booking.status || '').toLowerCase();
  const canAddAddons = ['confirmed', 'in progress', 'inprogress'].includes(statusLower);
  const isPaidStatus = ['confirmed', 'completed', 'in progress', 'inprogress'].includes(statusLower);
  
  // ============================================
  // 💰 TOTAL AMOUNT CALCULATION
  // ============================================
  // Logic differs based on booking status:
  // 
  // PENDING: Show full subtotal
  // - Customer hasn't paid booking fee yet
  // - Total = Subtotal (no deduction)
  // 
  // CONFIRMED/IN PROGRESS/COMPLETED: Show amount after booking fee
  // - Customer already paid booking fee
  // - Total = Subtotal - Booking Fee
  // - This is what customer pays on arrival
  // ============================================
  const totalAmount = isPaidStatus ? Math.max(0, subtotal - bookingFee) : subtotal;

  // Build add-ons list HTML
  let addOnsListHtml = '';
  if (addOns.length > 0) {
    addOnsListHtml = addOns.map(addon =>
      `<div style="padding-left: 1.5rem; color: var(--gray-600); font-size: 0.9rem;">
        • ${escapeHtml(addon.name)} - ${formatCurrency(addon.price)}
      </div>`
    ).join('');
  }

  // For PENDING status: Show only Total Amount (simplified view)
  if (!canAddAddons && statusLower === 'pending') {
    return `
      <div class="price-breakdown" style="background: var(--gray-50); padding: 1rem; border-radius: var(--radius-sm); margin: 1rem 0; border: 1px solid var(--gray-200);">
        <h4 style="margin-top: 0; margin-bottom: 0.75rem; color: var(--gray-900);">Price Breakdown</h4>
        
        <div style="display: flex; justify-content: space-between; padding: 0.75rem 1rem; margin: 0 -1rem -1rem -1rem; background: #e8f5e9; border-radius: 0 0 var(--radius-sm) var(--radius-sm);">
          <span style="font-weight: 700; color: #2e7d32; font-size: 1.05rem;">Total Amount</span>
          <span style="font-weight: 700; color: #2e7d32; font-size: 1.1rem;">${formatCurrency(totalAmount)}</span>
        </div>
      </div>
    `;
  }

  // For CONFIRMED/IN PROGRESS/COMPLETED: Show full breakdown
  let html = `
    <div class="price-breakdown" style="background: var(--gray-50); padding: 1rem; border-radius: var(--radius-sm); margin: 1rem 0; border: 1px solid var(--gray-200);">
      <h4 style="margin-top: 0; margin-bottom: 0.75rem; color: var(--gray-900);">Price Breakdown</h4>
      
      ${isSingleService && singleServicesHtml ? `
        <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--gray-300);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
            <span style="font-weight: 500;">Single Services</span>
            <span style="font-weight: 600;">${formatCurrency(singleServicesTotal)}</span>
          </div>
          ${singleServicesHtml}
        </div>
      ` : `
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-300);">
          <span style="font-weight: 500;">Package</span>
          <span style="font-weight: 600;">${formatCurrency(packagePrice)}</span>
        </div>
      `}
      
      ${addOns.length > 0 ? `
        <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--gray-300);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
            <span style="font-weight: 500;">Add-ons (${addOns.length})</span>
            <span style="font-weight: 600;">${formatCurrency(addOnsTotal)}</span>
          </div>
          ${addOnsListHtml}
        </div>
      ` : ''}
      
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 2px solid var(--gray-400); font-weight: 600;">
        <span>Subtotal</span>
        <span>${formatCurrency(subtotal)}</span>
      </div>
      
      ${isPaidStatus && bookingFee > 0 ? `
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-300); color: #2e7d32;">
          <span style="font-weight: 500;">Booking Fee (Paid)</span>
          <span style="font-weight: 600;">- ${formatCurrency(bookingFee)}</span>
        </div>
      ` : ''}
      
      <div style="display: flex; justify-content: space-between; padding: 0.75rem 1rem; margin: 0.5rem -1rem -1rem -1rem; background: #e8f5e9; border-radius: 0 0 var(--radius-sm) var(--radius-sm);">
        <span style="font-weight: 700; color: #2e7d32; font-size: 1.05rem;">Total Amount</span>
        <span style="font-weight: 700; color: #2e7d32; font-size: 1.1rem;">${formatCurrency(totalAmount)}</span>
      </div>
    </div>
  `;

  return html;
}

// Initialize admin dashboard with lazy loading (no full-screen blocker)
async function initAdminDashboard() {
  // Force hide any existing loaders immediately - NO full-screen loader
  if (typeof loadingManager !== 'undefined') {
    loadingManager.hideAllLoaders();
  }
  if (typeof hideDashboardLoader === 'function') {
    hideDashboardLoader();
  }
  
  let hasPermissionIssues = false;
  
  try {
    // Check if user is admin with better error handling
    const isAdmin = await requireAdmin();
    if (!isAdmin) {
      return;
    }

    // Setup sidebar navigation (instant - no async)
    setupSidebarNavigation();
    setupAdminPasswordForm();

    // ============================================
    // 🚀 PARALLEL LOADING FOR ADMIN DASHBOARD
    // Load multiple components simultaneously
    // ============================================
    const loadingPromises = [];
    
    // 1. Load overview with timeout
    loadingPromises.push(
      Promise.race([
        loadOverview(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Overview timeout')), 8000))
      ]).catch(overviewError => {
        console.error('Error loading overview:', overviewError);
        hasPermissionIssues = overviewError.message?.includes('Permission denied');
        updateStatsCards(0, 0, 0, 0, 0, 0);
        renderRecentBookings([]);
      })
    );
    
    // 2. Update notification badge (non-critical, parallel)
    loadingPromises.push(
      Promise.race([
        (async () => {
          updateNotificationBadge();
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Notification timeout')), 3000))
      ]).catch(notificationError => {
        console.warn('Error setting up notifications:', notificationError);
      })
    );
    
    // Wait for all to complete in parallel
    await Promise.allSettled(loadingPromises);
    
    // Setup notification refresh (after initial load)
    const refreshInterval = hasPermissionIssues ? 120000 : 30000;
    setInterval(updateNotificationBadge, refreshInterval);
    
  } catch (error) {
    console.error('Error initializing admin dashboard:', error);
    
    // Show error in stats area instead of full-screen
    const statsContainer = document.getElementById('statsCardsContainer');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-card fade-in" style="grid-column: 1 / -1; background: #ffebee; padding: 1.5rem; border-radius: 12px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
          <div style="color: #c62828; font-weight: 600;">Failed to load admin dashboard</div>
          <div style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">Please refresh the page</div>
        </div>
      `;
    }
  }
  
  // Close notification panel when clicking outside
  document.addEventListener('click', function(e) {
    const panel = document.getElementById('notificationPanel');
    const bell = document.getElementById('adminNotificationBell');
    if (panel && bell && notificationPanelOpen) {
      if (!panel.contains(e.target) && !bell.contains(e.target)) {
        closeNotificationPanel();
      }
    }
  });

  // Gallery filter change handler: reload gallery when admin changes filter
  const galleryFilter = document.getElementById('galleryStatusFilter');
  if (galleryFilter) {
    galleryFilter.addEventListener('change', function () {
      if (currentView === 'gallery') {
        loadGalleryView();
      }
    });
  }
}

// Setup sidebar navigation
function setupSidebarNavigation() {
  const menuItems = document.querySelectorAll('.sidebar-menu a');
  menuItems.forEach(item => {
    item.addEventListener('click', function (e) {
      const view = this.dataset.view;
      const href = this.getAttribute('href');
      
      // Only prevent default for internal view switches, not external links
      if (view && href === '#') {
        e.preventDefault();
        switchView(view);
      }
      // Let external links (like walk-in) navigate normally
    });
  });
}

// Switch view
function switchView(view) {
  currentView = view;
  
  // Cleanup old real-time listeners to prevent memory leaks
  if (bookingsListenerUnsubscribe) {
    bookingsListenerUnsubscribe();
    bookingsListenerUnsubscribe = null;
    console.log('[Real-time] Bookings listener cleaned up');
  }
  if (packagesListenerUnsubscribe) {
    packagesListenerUnsubscribe();
    packagesListenerUnsubscribe = null;
    console.log('[Real-time] Packages listener cleaned up');
  }

  // Hide all views
  document.getElementById('overviewView').style.display = 'none';
  document.getElementById('pendingView').style.display = 'none';
  document.getElementById('confirmedView').style.display = 'none';
  const inprogressView = document.getElementById('inprogressView');
  if (inprogressView) inprogressView.style.display = 'none';
  document.getElementById('calendarView').style.display = 'none';
  document.getElementById('customersView').style.display = 'none';
  const groomerWorkloadView = document.getElementById('groomerWorkloadView');
  if (groomerWorkloadView) groomerWorkloadView.style.display = 'none';
  document.getElementById('groomerAbsencesView').style.display = 'none';
  document.getElementById('galleryView').style.display = 'none';
  const addonsView = document.getElementById('addonsView');
  if (addonsView) addonsView.style.display = 'none';
  const accountView = document.getElementById('accountView');
  if (accountView) {
    accountView.style.display = 'none';
  }
  const paymentSettingsView = document.getElementById('paymentSettingsView');
  if (paymentSettingsView) {
    paymentSettingsView.style.display = 'none';
  }
  // Hide history views
  const historyView = document.getElementById('historyView');
  if (historyView) historyView.style.display = 'none';
  const bookinghistoryView = document.getElementById('bookinghistoryView');
  if (bookinghistoryView) bookinghistoryView.style.display = 'none';

  // Update active menu item
  document.querySelectorAll('.sidebar-menu a').forEach(item => {
    if (item.dataset.view === view) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Show and load appropriate view sa admin 
  switch (view) {
    case 'overview':
      document.getElementById('overviewView').style.display = 'block';
      loadOverview();
      break;
    case 'pending':
      document.getElementById('pendingView').style.display = 'block';
      loadPendingBookings();
      break;
    case 'confirmed':
      document.getElementById('confirmedView').style.display = 'block';
      loadConfirmedBookings();
      break;
    case 'inprogress':
      if (inprogressView) {
        inprogressView.style.display = 'block';
        if (typeof loadInProgressBookings === 'function') {
          loadInProgressBookings();
        }
      }
      break;
    case 'calendar':
      document.getElementById('calendarView').style.display = 'block';
      loadCalendarView();
      break;
    case 'customers':
      document.getElementById('customersView').style.display = 'block';
      loadCustomerManagement();
      break;
    case 'groomerWorkload':
      document.getElementById('groomerWorkloadView').style.display = 'block';
      loadGroomerWorkloadView();
      break;
    case 'addons':
      if (addonsView) {
        addonsView.style.display = 'block';
        loadAddonsView();
      }
      break;
    case 'groomerAbsences':
      document.getElementById('groomerAbsencesView').style.display = 'block';
      loadGroomerAbsencesView();
      break;
    case 'history':
      document.getElementById('historyView').style.display = 'block';
      renderBookingHistory();
      break;
    case 'bookinghistory':
      document.getElementById('bookinghistoryView').style.display = 'block';
      loadBookingHistory();
      break;
    case 'gallery':
      document.getElementById('galleryView').style.display = 'block';
      loadGalleryView();
      break;
    case 'account':
      if (accountView) {
        accountView.style.display = 'block';
      }
      setupAdminPasswordForm();
      break;
    case 'paymentSettings':
      const paymentSettingsView = document.getElementById('paymentSettingsView');
      if (paymentSettingsView) {
        paymentSettingsView.style.display = 'block';
      }
      loadPaymentSettingsView();
      break;
  }
}

// Load overview
async function loadOverview() {
  // Show loading for recent bookings table
  showTableLoader('#recentBookings');
  
  // Initialize variables at function scope to ensure accessibility throughout
  let bookings = [];
  let absences = [];
  let users = [];
  
  try {
    // Fetch data with proper error handling
    bookings = await getBookings();
    absences = getStaffAbsences() || []; // Ensure fallback to empty array
    users = await getUsers();
    const customers = users.filter(u => u.role === 'customer');

    const totalBookings = bookings.length;
    // Normalize status values to avoid casing/whitespace mismatches
    const normalize = s => String(s || '').trim().toLowerCase();
    const pendingBookings = bookings.filter(b => normalize(b.status) === 'pending').length;
    const confirmedBookings = bookings.filter(b => ['confirmed', 'completed'].includes(normalize(b.status))).length;
    const cancelledBookings = bookings.filter(b => ['cancelled', 'cancelledbycustomer', 'cancelledbyadmin', 'cancelledbysystem'].includes(normalize(b.status))).length;
    const totalCustomers = customers.length;

    // Calculate total revenue from confirmed and completed bookings
    const totalRevenue = bookings
      .filter(b => ['confirmed', 'completed'].includes(normalize(b.status)))
      .reduce((sum, b) => sum + (b.totalPrice || b.cost?.subtotal || 0), 0);

    // Update stats cards
    updateStatsCards(totalBookings, pendingBookings, confirmedBookings, cancelledBookings, totalCustomers, totalRevenue);

    // Load recent bookings
    adminState.recentData = bookings.sort((a, b) => b.createdAt - a.createdAt);
    adminState.recentPage = 1;
    adminState.recentLimit = 'all';
    renderRecentBookings(adminState.recentData);
    
    // Reset filter dropdown to 'all'
    const filterSelect = document.getElementById('recentBookingsFilter');
    if (filterSelect) {
      filterSelect.value = 'all';
    }

    // Render mega calendar with loaded data
    const calendarData = buildCalendarDataset(bookings, absences);
    renderMegaCalendar('adminCalendar', calendarData);
    
  } catch (error) {
    console.error('Error loading overview:', error);
    
    // Ensure variables have fallback values even on error
    bookings = [];
    absences = [];
    users = [];
    
    // Show user-friendly error message
    const errorMessage = error.message?.includes('Permission denied') 
      ? 'Unable to load dashboard data. Please check your permissions or contact support.'
      : 'Failed to load dashboard overview. Please refresh the page.';
    
    if (typeof loadingManager !== 'undefined') {
      loadingManager.showError(errorMessage);
    }
    
    // Show empty state with fallback data
    updateStatsCards(0, 0, 0, 0, 0, 0);
    renderRecentBookings([]);
    
    // Render empty calendar with empty data
    const calendarData = buildCalendarDataset([], []);
    renderMegaCalendar('adminCalendar', calendarData);
    
  } finally {
    // Hide loading for recent bookings table
    hideTableLoader('#recentBookings');
  }

  // Additional panel updates - variables are now guaranteed to be in scope
  try {
    updateGroomerAlertPanel(absences);
    await renderBlockedCustomersPanel();
    await renderLiftBanPanel();
    await renderFeaturedCutsPanel();
    await renderCommunityReviewFeed('adminReviewFeed', 6);
  } catch (error) {
    console.warn('Error loading additional dashboard components:', error);
  }
  
  // Setup real-time listener for auto-refresh
  if (typeof setupBookingsListener === 'function' && currentView === 'overview') {
    // Remove old listener if exists
    if (bookingsListenerUnsubscribe) {
      bookingsListenerUnsubscribe();
    }
    
    // Setup new listener
    bookingsListenerUnsubscribe = setupBookingsListener(async (updatedBookings) => {
      const users = await getUsers();
      const customers = users.filter(u => u.role === 'customer');
      const absences = getStaffAbsences();
      
      const totalBookings = updatedBookings.length;
      const normalize = s => String(s || '').trim().toLowerCase();
      const pendingBookings = updatedBookings.filter(b => normalize(b.status) === 'pending').length;
      const confirmedBookings = updatedBookings.filter(b => ['confirmed', 'completed'].includes(normalize(b.status))).length;
      const cancelledBookings = updatedBookings.filter(b => ['cancelled', 'cancelledbycustomer', 'cancelledbyadmin', 'cancelledbysystem'].includes(normalize(b.status))).length;
      const totalCustomers = customers.length;
      const totalRevenue = updatedBookings
        .filter(b => ['confirmed', 'completed'].includes(normalize(b.status)))
        .reduce((sum, b) => sum + (b.totalPrice || b.cost?.subtotal || 0), 0);
      
      updateStatsCards(totalBookings, pendingBookings, confirmedBookings, cancelledBookings, totalCustomers, totalRevenue);
      
      adminState.recentData = updatedBookings.sort((a, b) => b.createdAt - a.createdAt);
      renderRecentBookings(adminState.recentData);
      
      const calendarData = buildCalendarDataset(updatedBookings, absences);
      renderMegaCalendar('adminCalendar', calendarData);
      
      await renderCommunityReviewFeed('adminReviewFeed', 6);
    });
    
    console.log('[Overview] Real-time listener activated');
  }
}

// Update stats cards with clickable/sortable functionality
function updateStatsCards(totalBookings, pendingBookings, confirmedBookings, cancelledBookings, totalCustomers, totalRevenue = 0) {
  const container = document.getElementById('statsCardsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="stat-card" onclick="filterStatsByType('all')" style="background: linear-gradient(135deg, rgba(18, 18, 18, 0.08), rgba(72, 72, 72, 0.08)); cursor: pointer; transition: all 0.3s ease;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">📅</div>
      <div class="stat-value" style="font-size: 2.5rem;">${totalBookings}</div>
      <div class="stat-label">Total Bookings</div>
    </div>
    <div class="stat-card" onclick="filterStatsByType('pending')" style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(210, 210, 210, 0.6)); cursor: pointer; transition: all 0.3s ease;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏳</div>
      <div class="stat-value" style="font-size: 2.5rem; color: var(--gray-700);">${pendingBookings}</div>
      <div class="stat-label">Pending</div>
    </div>
    <div class="stat-card" onclick="filterStatsByType('confirmed')" style="background: linear-gradient(135deg, rgba(18, 18, 18, 0.12), rgba(72, 72, 72, 0.12)); cursor: pointer; transition: all 0.3s ease;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">✅</div>
      <div class="stat-value" style="font-size: 2.5rem; color: var(--gray-900);">${confirmedBookings}</div>
      <div class="stat-label">Confirmed</div>
    </div>
    <div class="stat-card" onclick="filterStatsByType('cancelled')" style="background: linear-gradient(135deg, rgba(255, 200, 200, 0.9), rgba(240, 180, 180, 0.6)); cursor: pointer; transition: all 0.3s ease;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">❌</div>
      <div class="stat-value" style="font-size: 2.5rem; color: var(--gray-700);">${cancelledBookings}</div>
      <div class="stat-label">Cancelled</div>
    </div>
    <div class="stat-card" onclick="filterStatsByType('customers')" style="background: linear-gradient(135deg, rgba(240, 240, 240, 0.9), rgba(210, 210, 210, 0.6)); cursor: pointer; transition: all 0.3s ease;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">👥</div>
      <div class="stat-value" style="font-size: 2.5rem; color: var(--gray-700);">${totalCustomers}</div>
      <div class="stat-label">Total Customers</div>
    </div>
    <div class="stat-card" style="background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(56, 142, 60, 0.15)); cursor: pointer; transition: all 0.3s ease;" onclick="openRevenueDetailsModal()">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">💰</div>
      <div class="stat-value" style="font-size: 2.5rem; color: #2e7d32; font-weight: 700;">${formatCurrency(totalRevenue)}</div>
      <div class="stat-label">Total Revenue</div>
    </div>
  `;

  // Add hover effects
  container.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('mouseenter', function () {
      this.style.transform = 'translateY(-8px)';
      this.style.boxShadow = 'var(--shadow-lg)';
    });
    card.addEventListener('mouseleave', function () {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = 'var(--shadow)';
    });
  });
}

// Filter by stat card click - shows specific booking types
async function filterStatsByType(type) {
  const bookings = await getBookings();
  const users = await getUsers();
  const customers = users.filter(u => u.role === 'customer');

  switch (type) {
    case 'pending':
      // Navigate to pending view
      switchView('pending');
      break;
    case 'confirmed':
      // Navigate to confirmed view
      switchView('confirmed');
      break;
    case 'cancelled':
      // Show overview with filtered cancelled bookings in recent section
      const cancelledBookings = bookings.filter(b => ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status)).sort((a, b) => b.createdAt - a.createdAt);
      adminState.recentData = cancelledBookings;
      adminState.recentPage = 1;
      adminState.recentFilter = 'cancelled';
      document.getElementById('overviewView').style.display = 'block';
      document.getElementById('pendingView').style.display = 'none';
      document.getElementById('confirmedView').style.display = 'none';
      document.getElementById('customersView').style.display = 'none';
      renderRecentBookings(cancelledBookings);
      break;
    case 'customers':
      // Navigate to customer management view
      switchView('customers');
      break;
    case 'all':
    default:
      // Load full overview
      loadOverview();
      break;
  }
}

// Sort bookings based on stat card click - keep cards visible
async function sortBookings(sortType) {
  const bookings = await getBookings();
  let filtered = [...bookings];

  // Keep stat cards visible - don't hide overview
  const overviewView = document.getElementById('overviewView');
  if (overviewView) {
    overviewView.style.display = 'block';
  }

  switch (sortType) {
    case 'pending':
      filtered = bookings.filter(b => b.status === 'pending');
      // Show pending view but keep overview visible
      document.getElementById('pendingView').style.display = 'block';
      document.getElementById('confirmedView').style.display = 'none';
      document.getElementById('customersView').style.display = 'none';
      loadPendingBookings();
      break;
    case 'confirmed':
      filtered = bookings.filter(b => ['confirmed', 'completed'].includes(b.status));
      document.getElementById('pendingView').style.display = 'none';
      document.getElementById('confirmedView').style.display = 'block';
      document.getElementById('customersView').style.display = 'none';
      loadConfirmedBookings();
      break;
    case 'cancelled':
      filtered = bookings.filter(b => ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status));
      document.getElementById('pendingView').style.display = 'none';
      document.getElementById('confirmedView').style.display = 'none';
      document.getElementById('customersView').style.display = 'none';
      // Show filtered cancelled bookings in recent bookings section
      adminState.recentData = filtered.sort((a, b) => b.createdAt - a.createdAt);
      adminState.recentPage = 1;
      renderRecentBookings(adminState.recentData);
      break;
    case 'customers':
      document.getElementById('pendingView').style.display = 'none';
      document.getElementById('confirmedView').style.display = 'none';
      document.getElementById('customersView').style.display = 'block';
      loadCustomerManagement();
      break;
    case 'all':
    default:
      document.getElementById('pendingView').style.display = 'none';
      document.getElementById('confirmedView').style.display = 'none';
      document.getElementById('customersView').style.display = 'none';
      loadOverview();
      break;
  }

  // Update active stat card
  document.querySelectorAll('.stat-card[data-sort]').forEach(card => {
    if (card.dataset.sort === sortType) {
      card.style.border = '2px solid #000';
    } else {
      card.style.border = 'none';
    }
  });
}

// Render recent bookings with pagination/clickable details
function renderRecentBookings(bookings) {
  const container = document.getElementById('recentBookings');
  if (!container) return;

  // Apply the limit from dropdown
  let displayBookings = bookings;
  if (adminState.recentLimit !== 'all') {
    const limitNum = parseInt(adminState.recentLimit);
    displayBookings = bookings.slice(0, limitNum);
  }

  if (displayBookings.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 3rem;">
        <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">📅</div>
        <p style="color: var(--gray-600);">No bookings yet</p>
      </div>
    `;
    const pagination = document.getElementById('recentPagination');
    if (pagination) pagination.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(displayBookings.length / adminState.recentPageSize) || 1;
  if (adminState.recentPage > totalPages) {
    adminState.recentPage = totalPages;
  }
  const start = (adminState.recentPage - 1) * adminState.recentPageSize;
  const currentSlice = displayBookings.slice(start, start + adminState.recentPageSize);

  container.innerHTML = currentSlice.map(booking => {
    const bookingCode = typeof getBookingDisplayCode === 'function'
      ? getBookingDisplayCode(booking)
      : (booking.shortId || booking.id);
    const statusLower = (booking.status || '').toLowerCase();
    const statusClass = ['confirmed', 'completed'].includes(statusLower)
      ? 'badge-confirmed'
      : statusLower === 'in progress'
        ? 'badge-inprogress'
        : ['cancelled', 'cancelledbycustomer', 'cancelledbyadmin', 'cancelledbysystem'].includes(statusLower)
          ? 'badge-cancelled'
          : 'badge-pending';
    const statusLabel = formatBookingStatus(booking.status);

    const petEmoji = booking.petType === 'dog' ? '🐕' : '🐈';

    return `
      <div class="card recent-booking-card" data-booking-id="${booking.id}" style="margin-bottom: 1rem; cursor: pointer;">
        <div style="display: grid; grid-template-columns: auto 1fr auto; gap: 1.5rem; align-items: center;">
          <div style="font-size: 2.5rem;">${petEmoji}</div>
          <div>
            <h4 style="margin-bottom: 0.5rem; color: var(--gray-900);">${escapeHtml(booking.petName)}</h4>
            <p style="color: var(--gray-600); margin-bottom: 0.25rem; font-size: 0.875rem;">
              <strong>Customer:</strong> ${escapeHtml(booking.customerName)}
            </p>
            <p style="color: var(--gray-600); margin-bottom: 0.25rem; font-size: 0.875rem;">
              <strong>Receipt:</strong> ${escapeHtml(bookingCode)}
            </p>
            <p style="color: var(--gray-600); margin-bottom: 0.25rem; font-size: 0.875rem;">
              <strong>Package:</strong> ${escapeHtml(booking.packageName)}
            </p>
            <p style="color: var(--gray-600); margin-bottom: 0.25rem; font-size: 0.875rem;">
              <strong>Total:</strong> ${formatCurrency(booking.totalPrice || booking.cost?.subtotal || 0)}
            </p>
            <p style="color: var(--gray-500); font-size: 0.875rem;">
              📅 ${formatDate(booking.date)} at ${formatTime(booking.time)}
            </p>
          </div>
          <div>
            <span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.recent-booking-card').forEach(card => {
    card.addEventListener('click', () => {
      const bookingId = card.dataset.bookingId;
      openBookingDetail(bookingId);
    });
  });

  updateRecentPagination(displayBookings);
}

// Change limit of recent bookings shown
async function changeRecentBookingsLimit(limitValue) {
  adminState.recentLimit = limitValue;
  const bookings = await getBookings();
  adminState.recentData = bookings.sort((a, b) => b.createdAt - a.createdAt);
  adminState.recentPage = 1;
  renderRecentBookings(adminState.recentData);
}

function updateRecentPagination(bookings) {
  const container = document.getElementById('recentPagination');
  if (!container) return;

  if (!bookings || bookings.length <= adminState.recentPageSize) {
    container.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(bookings.length / adminState.recentPageSize);
  const current = adminState.recentPage;
  let pagesHtml = '';

  const renderPageBtn = (page, label = page) => `
    <button ${page === current ? 'class="active"' : ''} data-page="${page}">${label}</button>
  `;

  pagesHtml += `<button data-nav="prev" ${current === 1 ? 'disabled' : ''}>‹</button>`;

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) {
      pagesHtml += renderPageBtn(i);
    }
  } else {
    const lastPage = totalPages;
    const displayPages = [1, 2, 3];
    displayPages.forEach(page => {
      if (page <= lastPage) {
        pagesHtml += renderPageBtn(page);
      }
    });
    pagesHtml += `<span style="color: var(--gray-400);">…</span>`;
    pagesHtml += renderPageBtn(lastPage);
  }

  pagesHtml += `<button data-nav="next" ${current === totalPages ? 'disabled' : ''}>Next</button>`;

  container.innerHTML = `<div class="pagination">${pagesHtml}</div>`;

  container.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      adminState.recentPage = Number(btn.dataset.page);
      renderRecentBookings(adminState.recentData);
      updateRecentPagination(adminState.recentData);
    });
  });

  const prevBtn = container.querySelector('button[data-nav="prev"]');
  const nextBtn = container.querySelector('button[data-nav="next"]');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (adminState.recentPage > 1) {
        adminState.recentPage -= 1;
        renderRecentBookings(adminState.recentData);
        updateRecentPagination(adminState.recentData);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (adminState.recentPage < totalPages) {
        adminState.recentPage += 1;
        renderRecentBookings(adminState.recentData);
        updateRecentPagination(adminState.recentData);
      }
    });
  }
}

// Store the bookings listener unsubscribe function
let bookingsListenerUnsubscribe = null;

// Load pending bookings
async function loadPendingBookings() {
  // Show loading for pending bookings table
  showTableLoader('#pendingBookingsTable');
  
  try {
    const bookings = await getBookings();
  
  // Check for duplicate IDs
  const idCounts = {};
  bookings.forEach(b => {
    idCounts[b.id] = (idCounts[b.id] || 0) + 1;
  });
  const duplicateIds = Object.entries(idCounts).filter(([id, count]) => count > 1);
  if (duplicateIds.length > 0) {
    console.warn('[loadPendingBookings] ⚠️ DUPLICATE BOOKING IDs FOUND:', duplicateIds);
  }
  
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  
  renderPendingBookingsTable(pendingBookings);
  
  // Setup real-time listener for auto-refresh
  if (typeof setupBookingsListener === 'function' && currentView === 'pending') {
    // Remove old listener if exists
    if (bookingsListenerUnsubscribe) {
      bookingsListenerUnsubscribe();
    }
    
    // Setup new listener
    bookingsListenerUnsubscribe = setupBookingsListener((updatedBookings) => {
      const updatedPending = updatedBookings.filter(b => b.status === 'pending');
      renderPendingBookingsTable(updatedPending);
    });
    
    console.log('[Pending Bookings] Real-time listener activated');
  }

  // Setup search
  const searchInput = document.getElementById('pendingSearch');
  if (searchInput) {
    // Remove old listener to avoid duplicates if re-run
    const newInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newInput, searchInput);

    newInput.addEventListener('input', function () {
      const query = this.value.toLowerCase();
      const filtered = pendingBookings.filter(booking =>
        booking.customerName.toLowerCase().includes(query) ||
        booking.petName.toLowerCase().includes(query) ||
        booking.packageName.toLowerCase().includes(query)
      );
      // Reset to page 1 on search
      adminState.pendingPage = 1;
      renderPendingBookingsTable(filtered);
    });

    // Restore focus and value if needed (though cloning might clear it, let's keep it simple)
    // Actually cloning clears event listeners but might lose focus. 
    // Better strategy: just update the render function to handle the current search value if we wanted to be perfect,
    // but for now let's just render.
  }
  } catch (error) {
    console.error('Error loading pending bookings:', error);
    loadingManager.showError('Failed to load pending bookings');
  } finally {
    // Hide loading for pending bookings table
    hideTableLoader('#pendingBookingsTable');
  }
}

// Render pending bookings table
function renderPendingBookingsTable(bookings) {
  const container = document.getElementById('pendingBookingsTable');
  if (!container) return;

  // Get auto-cancelled bookings from notification storage
  const autoCancelledNotifications = JSON.parse(localStorage.getItem('autoCancelledNotifications') || '[]');
  const showAutoCancelled = adminState.showAutoCancelledBookings !== false; // Default to true

  if (bookings.length === 0 && autoCancelledNotifications.length === 0) {
    const searchInput = document.getElementById('pendingSearch');
    const searchTerm = searchInput ? searchInput.value : '';
    const message = searchTerm 
      ? `No results found for "${searchTerm}". Try a different search term.`
      : 'No pending bookings available yet.';
    container.innerHTML = `
      <div style="padding: 3rem 2rem; text-align: center; background: #f9fafb; border-radius: var(--radius); border: 2px dashed var(--gray-300);">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">⏳</div>
        <p style="color: var(--gray-700); font-size: 1.1rem; margin-bottom: 0.5rem; font-weight: 500;">${message}</p>
        ${searchTerm ? `<p style="color: var(--gray-600); font-size: 0.9rem; margin-bottom: 1rem;">Clear the search to see all bookings.</p><button class="btn btn-primary btn-sm" onclick="clearPendingSearch()">🔄 Clear Search</button>` : ''}
      </div>
    `;
    return;
  }

  // Apply sorting
  const sortedBookings = [...bookings];
  const sortBy = adminState.pendingRecentActive ? 'recent' : (adminState.pendingSortBy || 'date');
  const sortOrder = adminState.pendingSortOrder || 'desc'; // Default to descending (newest first)
  
  console.log('[loadPendingBookings] Sorting with:', { sortBy, sortOrder, recentActive: adminState.pendingRecentActive, bookingsCount: bookings.length });

  sortedBookings.sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case 'recent':
        // Sort by creation date (newest first) - always descending, ignore sortOrder
        aValue = new Date(a.createdAt || a.date).getTime();
        bValue = new Date(b.createdAt || b.date).getTime();
        return bValue - aValue;
        
      case 'date':
        // Sort by appointment date (accurate date comparison)
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
        if (aValue === bValue) {
          // If same date, sort by time
          const aTime = a.time ? parseInt(a.time.replace(/\D/g, '')) : 0;
          const bTime = b.time ? parseInt(b.time.replace(/\D/g, '')) : 0;
          return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
        }
        // Return date comparison result
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        
      case 'customer':
        // Sort alphabetically by customer name (accurate alphabetical)
        aValue = (a.customerName || 'Unknown').toLowerCase().trim();
        bValue = (b.customerName || 'Unknown').toLowerCase().trim();
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        
      case 'pricing':
        // Sort by total price (numeric)
        aValue = parseFloat(a.totalPrice || a.cost?.subtotal || 0);
        bValue = parseFloat(b.totalPrice || b.cost?.subtotal || 0);
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        
      default:
        // Default to date descending
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
    }

    // Handle string comparisons (for customer names)
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    // Handle numeric comparisons (for dates and pricing)
    if (sortOrder === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  // Pagination logic
  const totalItems = sortedBookings.length;
  const pageSize = adminState.pendingPageSize;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // Ensure current page is valid
  if (adminState.pendingPage > totalPages) adminState.pendingPage = totalPages;
  if (adminState.pendingPage < 1) adminState.pendingPage = 1;

  const start = (adminState.pendingPage - 1) * pageSize;
  const currentSlice = sortedBookings.slice(start, start + pageSize);

  // Create controls container ID
  const controlsId = 'pendingPaginationControls';

  let html = '';

  // Add sort controls
  html += `
    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding: 0.5rem; background: var(--gray-50); border-radius: var(--radius-sm); flex-wrap: wrap;">
      <button class="btn btn-sm" style="background: ${adminState.pendingRecentActive ? '#007bff' : '#e0e0e0'}; color: ${adminState.pendingRecentActive ? 'white' : '#333'}; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: 600;" onclick="togglePendingRecent()">
        🕐 Recent
      </button>
      <label for="pendingSortField" style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Sort by:</label>
      <select id="pendingSortField" class="form-select" style="width: auto; padding: 0.5rem; ${adminState.pendingRecentActive ? 'opacity: 0.5; pointer-events: none;' : ''}" onchange="changePendingSortField(this.value)" ${adminState.pendingRecentActive ? 'disabled' : ''}>
        <option value="date" ${adminState.pendingSortBy === 'date' ? 'selected' : ''}>📅 Date (Appointment)</option>
        <option value="customer" ${adminState.pendingSortBy === 'customer' ? 'selected' : ''}>👤 Customer (A-Z)</option>
        <option value="pricing" ${adminState.pendingSortBy === 'pricing' ? 'selected' : ''}>💰 Pricing</option>
      </select>
      <select id="pendingSortOrder" class="form-select" style="width: auto; padding: 0.5rem; ${adminState.pendingRecentActive ? 'opacity: 0.5; pointer-events: none;' : ''}" onchange="changePendingSortOrder(this.value)" ${adminState.pendingRecentActive ? 'disabled' : ''}>
        <option value="asc" ${adminState.pendingSortOrder === 'asc' ? 'selected' : ''}>⬆️ Ascending</option>
        <option value="desc" ${adminState.pendingSortOrder === 'desc' ? 'selected' : ''}>⬇️ Descending</option>
      </select>
    </div>
  `;

  // Count bookings with proof of payment for notification banner
  const withProofCount = sortedBookings.filter(b => b.proofOfPaymentImage).length;
  
  if (withProofCount > 0) {
    html += `
      <div style="margin-bottom: 1rem; padding: 0.75rem 1rem; background: #e3f2fd; border-left: 4px solid #2196F3; border-radius: 4px; display: flex; align-items: center; gap: 0.75rem;">
        <span style="font-size: 1.5rem;">💳</span>
        <div>
          <strong style="color: #1565c0;">${withProofCount} booking${withProofCount > 1 ? 's' : ''} with payment proof!</strong>
          <p style="margin: 0; font-size: 0.85rem; color: #1976d2;">Review and confirm these bookings - customers have uploaded their GCash payment screenshots.</p>
        </div>
      </div>
    `;
  }

  html += `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Code</th>
            <th>Pet</th>
            <th>Package</th>
            <th>Preferred Cut</th>
            <th>Date</th>
            <th>Time</th>
            <th>Total</th>
            <th>💳 Proof</th>
            <th>Phone</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${currentSlice.map(booking => {
    // ONLY check bookingNotes for preferred cut - NOT medical conditions!
    const notesText = booking.bookingNotes || '';
    // Pass booking object to extractPreferredCut for ID-based lookup
    const preferredCut = extractPreferredCut(notesText, booking);

    // Display preferred cut badge AND full notes text together
    let cutDisplay = '';
    if (preferredCut) {
      // Show preferred cut badge PLUS full notes below
      cutDisplay = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  <span style="background: #e8f5e9; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-weight: 600; color: #2e7d32; display: inline-block; width: fit-content;">✂️ ${escapeHtml(preferredCut)}</span>
                  ${notesText && notesText.trim() ? `<span style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.4;">${escapeHtml(notesText)}</span>` : ''}
                </div>
              `;
    } else if (notesText && notesText.trim()) {
      // Show full notes with amber badge
      cutDisplay = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  <span style="background: #fff9e6; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.85rem; color: #f57c00; font-weight: 500; display: inline-block; width: fit-content;">📝 Custom Notes</span>
                  <span style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.4;">${escapeHtml(notesText)}</span>
                </div>
              `;
    } else {
      cutDisplay = '<span style="color: var(--gray-500); font-size: 0.85rem;">Not specified</span>';
    }

    return `
            <tr>
              <td>${escapeHtml(booking.customerName)}</td>
              <td>${escapeHtml(typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : (booking.shortId || booking.id))}</td>
              <td>${escapeHtml(booking.petName)} (${escapeHtml(booking.petType)})</td>
              <td>${escapeHtml(booking.packageName)}${booking.packageId === 'single-service' && booking.singleServices?.length ? `<br><span style="font-size: 0.8rem; color: var(--gray-600);">${booking.singleServices.map(id => getSingleServiceLabel(id)).join(', ')}</span>` : ''}</td>
              <td>${cutDisplay}</td>
              <td>${formatDate(booking.date)}</td>
              <td>${formatTime(booking.time)}</td>
              <td>
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                  <span style="font-weight: 600;">${formatCurrency(booking.totalPrice || booking.cost?.subtotal || 0)}</span>
                  ${booking.packageId === 'single-service' ? `
                    <span style="font-size: 0.75rem; color: #2e7d32; background: #e8f5e9; padding: 0.125rem 0.375rem; border-radius: 0.25rem; display: inline-block; width: fit-content;">
                      ✓ No booking fee
                    </span>
                  ` : (booking.cost?.bookingFee > 0 ? `
                    <span style="font-size: 0.75rem; color: var(--primary); background: rgba(var(--primary-rgb, 0, 123, 255), 0.1); padding: 0.125rem 0.375rem; border-radius: 0.25rem; display: inline-block; width: fit-content;">
                      💰 Fee: ${formatCurrency(booking.cost.bookingFee)}
                    </span>
                  ` : `
                    <span style="font-size: 0.75rem; color: var(--gray-500);">No fee yet</span>
                  `)}
                </div>
              </td>
              <td>
                ${booking.proofOfPaymentImage ? `
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
                    <span style="background: #4CAF50; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; cursor: pointer;" onclick="window.openAdminProofOfPaymentLightbox('${booking.id}')">
                      ✓ Uploaded
                    </span>
                    <span style="font-size: 0.7rem; color: var(--gray-500);">Click to view</span>
                  </div>
                ` : `
                  <span style="color: var(--gray-400); font-size: 0.85rem;">—</span>
                `}
              </td>
              <td>${escapeHtml(booking.phone)}</td>
              <td>
                <div class="action-dropdown" style="position: relative; display: inline-block;">
                  <button class="btn btn-primary btn-sm" onclick="toggleActionDropdown(this)">
                    Actions ▼
                  </button>
                  <div class="action-dropdown-menu" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid var(--gray-300); border-radius: var(--radius-sm); box-shadow: var(--shadow); z-index: 10; min-width: 180px;">
                    <button class="action-dropdown-item" onclick="protectedOpenAddBookingFeeModal('${booking.id}'); closeActionDropdown(this)">
                      💰 Add Booking Fee
                    </button>
                    <button class="action-dropdown-item" onclick="protectedConfirmBooking('${booking.id}'); closeActionDropdown(this)">
                      ✅ Confirm
                    </button>
                    <button class="action-dropdown-item" onclick="openBookingDetail('${booking.id}'); closeActionDropdown(this)">
                      👁️ View
                    </button>
                    <button class="action-dropdown-item" onclick="protectedOpenCancelModal('${booking.id}'); closeActionDropdown(this)">
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              </td>
            </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
    <div id="${controlsId}"></div>
  `;

  // ============================================
  // AUTO-CANCELLED BOOKINGS SECTION
  // ============================================
  // Display auto-cancelled bookings below pending bookings
  // Includes: banner, filter toggle, separate table
  // ============================================
  if (autoCancelledNotifications.length > 0) {
    html += `
      <div style="margin-top: 2rem; padding-top: 2rem; border-top: 2px solid var(--gray-300);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.5rem;">⚠️</span>
            <div>
              <h3 style="margin: 0; color: #d32f2f; font-size: 1.1rem;">Auto-Cancelled Bookings</h3>
              <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--gray-600);">${autoCancelledNotifications.length} booking${autoCancelledNotifications.length > 1 ? 's' : ''} auto-cancelled (appointment time passed)</p>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-outline btn-sm" onclick="toggleAutoCancelledDisplay()" style="border-color: #d32f2f; color: #d32f2f;">
              ${showAutoCancelled ? '👁️ Hide' : '👁️ Show'}
            </button>
            <button class="btn btn-outline btn-sm" onclick="clearAutoCancelledNotifications()" style="border-color: #d32f2f; color: #d32f2f;">
              🗑️ Clear All
            </button>
          </div>
        </div>

        ${showAutoCancelled ? `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Pet</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Cancellation Reason</th>
                  <th>Cancelled At</th>
                </tr>
              </thead>
              <tbody>
                ${autoCancelledNotifications.map(cancelled => `
                  <tr style="background: #ffebee; opacity: 0.9;">
                    <td>${escapeHtml(cancelled.customerName || 'Unknown')}</td>
                    <td>${escapeHtml(cancelled.petName || 'Unknown')}</td>
                    <td>${formatDate(cancelled.date)}</td>
                    <td>${formatTime(cancelled.time)}</td>
                    <td>
                      <span style="background: #ffcdd2; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.85rem; color: #c62828;">
                        ${escapeHtml(cancelled.reason || 'System auto-cancelled')}
                      </span>
                    </td>
                    <td style="font-size: 0.85rem; color: var(--gray-600);">${formatDate(new Date(cancelled.cancelledAt).toISOString().split('T')[0])}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="padding: 1rem; background: #fff3e0; border-radius: var(--radius-sm); text-align: center; color: var(--gray-600);">
            <p style="margin: 0;">Click "Show" to view auto-cancelled bookings</p>
          </div>
        `}
      </div>
    `;
  }

  container.innerHTML = html;

  // Render pagination controls at bottom
  renderPaginationControls(controlsId, 'pending', totalItems, 'changePendingPage', 'changePendingPageSize');
}

// Window handlers for pending pagination
window.changePendingPage = function (page) {
  adminState.pendingPage = parseInt(page);
  loadPendingBookings();
};

window.changePendingPageSize = function (size) {
  adminState.pendingPageSize = parseInt(size);
  adminState.pendingPage = 1;
  loadPendingBookings();
};

// Window handlers for pending sorting
window.changePendingSortField = function (field) {
  console.log('[changePendingSortField] Changing sort field to:', field);
  adminState.pendingSortBy = field;
  adminState.pendingRecentActive = false; // Disable Recent when changing sort field
  adminState.pendingPage = 1;
  console.log('[changePendingSortField] New adminState:', { sortBy: adminState.pendingSortBy, sortOrder: adminState.pendingSortOrder, recentActive: adminState.pendingRecentActive });
  loadPendingBookings();
};

window.changePendingSortOrder = function (order) {
  console.log('[changePendingSortOrder] Changing sort order to:', order);
  adminState.pendingSortOrder = order;
  adminState.pendingRecentActive = false; // Disable Recent when changing sort order
  adminState.pendingPage = 1;
  console.log('[changePendingSortOrder] New adminState:', { sortBy: adminState.pendingSortBy, sortOrder: adminState.pendingSortOrder, recentActive: adminState.pendingRecentActive });
  loadPendingBookings();
};

// Toggle Recent button (on/off)
window.togglePendingRecent = function () {
  console.log('[togglePendingRecent] Toggling Recent from:', adminState.pendingRecentActive);
  adminState.pendingRecentActive = !adminState.pendingRecentActive;
  adminState.pendingPage = 1;
  console.log('[togglePendingRecent] Recent is now:', adminState.pendingRecentActive);
  loadPendingBookings();
};

// ============================================
// AUTO-CANCELLED BOOKINGS FUNCTIONS
// ============================================
// Toggle display of auto-cancelled bookings
window.toggleAutoCancelledDisplay = function () {
  adminState.showAutoCancelledBookings = !adminState.showAutoCancelledBookings;
  loadPendingBookings();
};

// Clear all auto-cancelled notifications
window.clearAutoCancelledNotifications = function () {
  if (confirm('Are you sure you want to clear all auto-cancelled booking records? This cannot be undone.')) {
    localStorage.removeItem('autoCancelledNotifications');
    adminState.showAutoCancelledBookings = true;
    loadPendingBookings();
    
    if (typeof customAlert !== 'undefined') {
      customAlert.success('Cleared', 'All auto-cancelled booking records have been removed');
    }
  }
};

// Confirmed bookings cache
let confirmedBookingsCache = [];

// Load confirmed bookings
async function loadConfirmedBookings() {
  const bookings = await getBookings();
  // STRICT FILTER: Only 'confirmed'
  confirmedBookingsCache = bookings.filter(b => b.status === 'confirmed');
  renderConfirmedBookingsTable();
  
  // Setup real-time listener for auto-refresh
  if (typeof setupBookingsListener === 'function' && currentView === 'confirmed') {
    // Remove old listener if exists
    if (bookingsListenerUnsubscribe) {
      bookingsListenerUnsubscribe();
    }
    
    // Setup new listener
    bookingsListenerUnsubscribe = setupBookingsListener((updatedBookings) => {
      confirmedBookingsCache = updatedBookings.filter(b => b.status === 'confirmed');
      renderConfirmedBookingsTable();
    });
    
    console.log('[Confirmed Bookings] Real-time listener activated');
  }
}

// Render confirmed bookings table
function renderConfirmedBookingsTable() {
  const container = document.getElementById('confirmedBookingsTable');
  if (!container) return;

  let filteredBookings = [...confirmedBookingsCache];

  // Apply search filter
  if (adminState.confirmedSearchTerm) {
    const q = adminState.confirmedSearchTerm.toLowerCase();
    filteredBookings = filteredBookings.filter(b =>
      (b.customerName || '').toLowerCase().includes(q) ||
      (b.petName || '').toLowerCase().includes(q) ||
      (b.packageName || '').toLowerCase().includes(q)
    );
  }

  if (filteredBookings.length === 0) {
    const message = adminState.confirmedSearchTerm 
      ? `No results found for "${adminState.confirmedSearchTerm}". Try a different search term.`
      : 'No confirmed bookings available yet.';
    container.innerHTML = `
      <div class="search-bar" style="margin-bottom: 1rem;">
        <input type="text" class="search-input" placeholder="🔍 Search by customer, pet, or package..."
          value="${adminState.confirmedSearchTerm || ''}" onkeyup="searchConfirmedBookings(this.value)">
      </div>
      <div style="padding: 3rem 2rem; text-align: center; background: #f9fafb; border-radius: var(--radius); border: 2px dashed var(--gray-300);">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">✅</div>
        <p style="color: var(--gray-700); font-size: 1.1rem; margin-bottom: 0.5rem; font-weight: 500;">${message}</p>
        ${adminState.confirmedSearchTerm ? `<p style="color: var(--gray-600); font-size: 0.9rem; margin-bottom: 1rem;">Clear the search to see all bookings.</p><button class="btn btn-primary btn-sm" onclick="clearConfirmedSearch()">🔄 Clear Search</button>` : ''}
      </div>
    `;
    return;
  }

  // Apply sorting
  const sortBy = adminState.confirmedRecentActive ? 'recent' : (adminState.confirmedSortBy || 'date');
  const sortOrder = adminState.confirmedSortOrder || 'asc';

  filteredBookings.sort((a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'recent':
        // Sort by creation date (newest first) - always descending, ignore sortOrder
        valA = new Date(a.createdAt || a.date).getTime();
        valB = new Date(b.createdAt || b.date).getTime();
        return valB - valA; // Always descending for recent
      case 'customer':
        valA = (a.customerName || '').toLowerCase();
        valB = (b.customerName || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      case 'package':
        valA = (a.packageName || '').toLowerCase();
        valB = (b.packageName || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      case 'total':
        valA = a.totalPrice || a.cost?.subtotal || 0;
        valB = b.totalPrice || b.cost?.subtotal || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      case 'date':
      default:
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
        if (valA === valB) {
          // If same date, sort by time
          const aTime = a.time ? parseInt(a.time.replace(/\D/g, '')) : 0;
          const bTime = b.time ? parseInt(b.time.replace(/\D/g, '')) : 0;
          return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Pagination logic
  const totalItems = filteredBookings.length;
  const pageSize = adminState.confirmedPageSize || 5;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // Ensure current page is valid
  if (adminState.confirmedPage > totalPages) adminState.confirmedPage = totalPages;
  if (adminState.confirmedPage < 1) adminState.confirmedPage = 1;

  const startIndex = (adminState.confirmedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentSlice = filteredBookings.slice(startIndex, endIndex);

  // Build HTML with controls
  let html = `
    <div class="search-bar" style="margin-bottom: 1rem;">
      <input type="text" class="search-input" placeholder="🔍 Search by customer, pet, or package..."
        value="${adminState.confirmedSearchTerm || ''}" onkeyup="searchConfirmedBookings(this.value)">
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <label style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Show:</label>
        <select class="form-select" style="width: auto; padding: 0.5rem;" onchange="changeConfirmedPageSize(this.value)">
          <option value="5" ${pageSize === 5 ? 'selected' : ''}>5</option>
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
        </select>
        <span style="font-size: 0.9rem; color: var(--gray-600);">entries</span>
      </div>
      <div style="font-size: 0.9rem; color: var(--gray-600);">
        Showing ${startIndex + 1} to ${endIndex} of ${totalItems}
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding: 0.5rem; background: var(--gray-50); border-radius: var(--radius-sm); flex-wrap: wrap;">
      <button class="btn btn-sm" style="background: ${sortBy === 'recent' ? '#007bff' : '#e0e0e0'}; color: ${sortBy === 'recent' ? 'white' : '#333'}; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: 600;" onclick="toggleConfirmedRecent()">
        🕐 Recent
      </button>
      <label style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Sort by:</label>
      <select class="form-select" style="width: auto; padding: 0.5rem; ${adminState.confirmedRecentActive ? 'opacity: 0.5; pointer-events: none;' : ''}" onchange="changeConfirmedSortField(this.value)" ${adminState.confirmedRecentActive ? 'disabled' : ''}>
        <option value="date" ${sortBy === 'date' ? 'selected' : ''}>📅 Date (Appointment)</option>
        <option value="customer" ${sortBy === 'customer' ? 'selected' : ''}>👤 Customer (A-Z)</option>
        <option value="package" ${sortBy === 'package' ? 'selected' : ''}>📦 Package</option>
        <option value="total" ${sortBy === 'total' ? 'selected' : ''}>💰 Pricing</option>
      </select>
      <select class="form-select" style="width: auto; padding: 0.5rem; ${adminState.confirmedRecentActive ? 'opacity: 0.5; pointer-events: none;' : ''}" onchange="changeConfirmedSortOrder(this.value)" ${adminState.confirmedRecentActive ? 'disabled' : ''}>
        <option value="asc" ${sortOrder === 'asc' ? 'selected' : ''}>⬆️ Ascending</option>
        <option value="desc" ${sortOrder === 'desc' ? 'selected' : ''}>⬇️ Descending</option>
      </select>
    </div>
  `;

  html += `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Code</th>
            <th>Pet</th>
            <th>Package</th>
            <th>Preferred Cut</th>
            <th>Date</th>
            <th>Time</th>
            <th>Total</th>
            <th>Phone</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${currentSlice.map(booking => {
    // ONLY check bookingNotes for preferred cut - NOT medical conditions!
    const notesText = booking.bookingNotes || '';
    // Pass booking object to extractPreferredCut for ID-based lookup
    const preferredCut = extractPreferredCut(notesText, booking);

    // Display preferred cut badge AND full notes text together
    let cutDisplay = '';
    if (preferredCut) {
      // Show preferred cut badge PLUS full notes below
      cutDisplay = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  <span style="background: #e8f5e9; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-weight: 600; color: #2e7d32; display: inline-block; width: fit-content;">✂️ ${escapeHtml(preferredCut)}</span>
                  ${notesText && notesText.trim() ? `<span style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.4;">${escapeHtml(notesText)}</span>` : ''}
                </div>
              `;
    } else if (notesText && notesText.trim()) {
      // Show full notes with amber badge
      cutDisplay = `
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  <span style="background: #fff9e6; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.85rem; color: #f57c00; font-weight: 500; display: inline-block; width: fit-content;">📝 Custom Notes</span>
                  <span style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.4;">${escapeHtml(notesText)}</span>
                </div>
              `;
    } else {
      cutDisplay = '<span style="color: var(--gray-500); font-size: 0.85rem;">Not specified</span>';
    }

    return `
            <tr>
              <td>${escapeHtml(booking.customerName)}</td>
              <td>${escapeHtml(typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : (booking.shortId || booking.id))}</td>
              <td>${escapeHtml(booking.petName)} (${escapeHtml(booking.petType)})</td>
              <td>${escapeHtml(booking.packageName)}${booking.packageId === 'single-service' && booking.singleServices?.length ? `<br><span style="font-size: 0.8rem; color: var(--gray-600);">${booking.singleServices.map(id => getSingleServiceLabel(id)).join(', ')}</span>` : ''}</td>
              <td>${cutDisplay}</td>
              <td>${formatDate(booking.date)}</td>
              <td>${formatTime(booking.time)}</td>
              <td>${formatCurrency(booking.totalPrice || booking.cost?.subtotal || 0)}</td>
              <td>${escapeHtml(booking.phone)}</td>
              <td>
                <div class="action-dropdown" style="position: relative; display: inline-block;">
                  <button class="btn btn-primary btn-sm" onclick="toggleActionDropdown(this)">
                    Actions ▼
                  </button>
                  <div class="action-dropdown-menu" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid var(--gray-300); border-radius: var(--radius-sm); box-shadow: var(--shadow); z-index: 10; min-width: 180px;">
                    <button class="action-dropdown-item" onclick="openBookingDetail('${booking.id}'); closeActionDropdown(this)">
                      👁️ View Details
                    </button>
                    ${(() => {
                      const today = new Date();
                      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      const isToday = booking.date === todayStr;
                      if (isToday) {
                        return `<button class="action-dropdown-item" onclick="protectedHandleStartService('${booking.id}'); closeActionDropdown(this)">
                          ▶️ Start Service
                        </button>`;
                      } else {
                        return `<button class="action-dropdown-item" disabled style="opacity: 0.5; cursor: not-allowed;" title="Can only start service on appointment date (${booking.date})">
                          ▶️ Start Service (Not Today)
                        </button>`;
                      }
                    })()}
                    <button class="action-dropdown-item" onclick="protectedOpenRescheduleModal('${booking.id}'); closeActionDropdown(this)">
                      📅 Reschedule
                    </button>
                    <button class="action-dropdown-item" onclick="protectedOpenCancelModal('${booking.id}'); closeActionDropdown(this)">
                      ❌ Cancel
                    </button>
                    <button class="action-dropdown-item" onclick="openNoShowModal('${booking.id}'); closeActionDropdown(this)" style="color: #dc3545; font-weight: 600;">
                      ⚠️ Mark No-show
                    </button>
                  </div>
                </div>
              </td>
            </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Pagination controls
  if (totalPages > 1) {
    html += `
      <div style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1rem;">
        <button class="btn btn-sm btn-outline" onclick="changeConfirmedPage(1)" ${adminState.confirmedPage === 1 ? 'disabled' : ''}>«</button>
        <button class="btn btn-sm btn-outline" onclick="changeConfirmedPage(${adminState.confirmedPage - 1})" ${adminState.confirmedPage === 1 ? 'disabled' : ''}>‹</button>
        <span style="padding: 0.5rem 1rem; font-size: 0.9rem; color: var(--gray-700);">Page ${adminState.confirmedPage} of ${totalPages}</span>
        <button class="btn btn-sm btn-outline" onclick="changeConfirmedPage(${adminState.confirmedPage + 1})" ${adminState.confirmedPage === totalPages ? 'disabled' : ''}>›</button>
        <button class="btn btn-sm btn-outline" onclick="changeConfirmedPage(${totalPages})" ${adminState.confirmedPage === totalPages ? 'disabled' : ''}>»</button>
      </div>
    `;
  }

  container.innerHTML = html;
}

// Window handlers for confirmed bookings
window.searchConfirmedBookings = function(query) {
  if (confirmedSearchTimeout) clearTimeout(confirmedSearchTimeout);
  confirmedSearchTimeout = setTimeout(() => {
    adminState.confirmedSearchTerm = query;
    adminState.confirmedPage = 1;
    renderConfirmedBookingsTable();
  }, 300);
};

window.changeConfirmedSortField = function(field) {
  adminState.confirmedSortBy = field;
  adminState.confirmedRecentActive = false; // Disable Recent when changing sort field
  adminState.confirmedPage = 1;
  renderConfirmedBookingsTable();
};

window.changeConfirmedSortOrder = function(order) {
  adminState.confirmedSortOrder = order;
  adminState.confirmedRecentActive = false; // Disable Recent when changing sort order
  adminState.confirmedPage = 1;
  renderConfirmedBookingsTable();
};

// Toggle Recent button (on/off)
window.toggleConfirmedRecent = function () {
  adminState.confirmedRecentActive = !adminState.confirmedRecentActive;
  adminState.confirmedPage = 1;
  renderConfirmedBookingsTable();
};

window.changeConfirmedPage = function(page) {
  const totalPages = Math.ceil(confirmedBookingsCache.length / adminState.confirmedPageSize) || 1;
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  adminState.confirmedPage = page;
  renderConfirmedBookingsTable();
};

window.changeConfirmedPageSize = function(size) {
  adminState.confirmedPageSize = parseInt(size, 10);
  adminState.confirmedPage = 1;
  renderConfirmedBookingsTable();
};

// Load calendar view
function loadCalendarView() {
  const dateInput = document.getElementById('calendarDate');
  if (dateInput) {
    dateInput.min = getMinDate();
    dateInput.value = toLocalISO(new Date());

    dateInput.addEventListener('change', function () {
      loadCalendarAppointments(this.value);
      updateCalendarBlockStatus(this.value);
    });

    // Load today's appointments
    loadCalendarAppointments(dateInput.value);
    updateCalendarBlockStatus(dateInput.value);
  }
  setupCalendarBlockControls();
  renderCalendarBlackoutList();
}

// Load appointments for selected date
async function loadCalendarAppointments(date) {
  const bookings = await getBookings();
  const blackout = typeof getCalendarBlackout === 'function' ? getCalendarBlackout(date) : null;
  const dayBookings = bookings.filter(b => b.date === date && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status));

  const container = document.getElementById('calendarAppointments');
  if (!container) return;

  if (blackout) {
    container.innerHTML = `
      <div class="card" style="text-align:center; padding:2rem;">
        <div style="font-size:2.5rem; margin-bottom:0.5rem;">🚫</div>
        <h3 style="margin-bottom:0.5rem;">Closed for ${formatDate(date)}</h3>
        <p style="color:var(--gray-600);">${escapeHtml(blackout.reason || 'Admin hold')}</p>
      </div>
    `;
    return;
  }

  if (dayBookings.length === 0) {
    container.innerHTML = '<p class="empty-state">No appointments for this date</p>';
    return;
  }

  // Sort by time
  dayBookings.sort((a, b) => {
    const timeA = a.time.replace('am', '').replace('pm', '');
    const timeB = b.time.replace('am', '').replace('pm', '');
    return timeA.localeCompare(timeB);
  });

  container.innerHTML = `
    <div class="grid">
      ${dayBookings.map(booking => {
    const statusClass = booking.status === 'confirmed'
      ? 'badge-confirmed'
      : booking.status === 'In Progress'
        ? 'badge-inprogress'
        : booking.status === 'completed'
          ? 'badge-completed'
          : 'badge-pending';

    return `
          <div class="card">
            <div class="card-body">
              <h3 class="card-title">${escapeHtml(booking.petName)}</h3>
              <p><strong>Customer:</strong> ${escapeHtml(booking.customerName)}</p>
              <p><strong>Package:</strong> ${escapeHtml(booking.packageName)}</p>
              <p><strong>Time:</strong> ${formatTime(booking.time)}</p>
              <p><strong>Total:</strong> ${formatCurrency(booking.totalPrice || booking.cost?.subtotal || 0)}</p>
              <p><strong>Phone:</strong> ${escapeHtml(booking.phone)}</p>
              <p><span class="badge ${statusClass}">${escapeHtml(booking.status)}</span></p>
            </div>
          </div>
        `;
  }).join('')}
    </div>
  `;
}

// Day off or cancel day for shop
function setupCalendarBlockControls() {
  const blockBtn = document.getElementById('calendarBlockBtn');
  if (blockBtn && blockBtn.dataset.bound !== 'true') {
    blockBtn.dataset.bound = 'true';
    blockBtn.addEventListener('click', blockSelectedDay);
  }
  const unblockBtn = document.getElementById('calendarUnblockBtn');
  if (unblockBtn && unblockBtn.dataset.bound !== 'true') {
    unblockBtn.dataset.bound = 'true';
    unblockBtn.addEventListener('click', unblockSelectedDay);
  }
}

function getSelectedCalendarDate() {
  const dateInput = document.getElementById('calendarDate');
  return dateInput?.value || null;
}

function blockSelectedDay() {
  const date = getSelectedCalendarDate();
  if (!date) {
    customAlert.warning('Select a date first.');
    return;
  }
  const reasonInput = document.getElementById('calendarBlockReason');
  const reason = reasonInput?.value?.trim() || 'Closed by admin';

  customAlert.confirm('Confirm', `Block ${formatDate(date)} for "${reason}"? All bookings on this day will be cancelled.`).then((confirmed) => {
    if (!confirmed) return;

    addCalendarBlackout(date, reason);
    cancelBookingsForDate(date, reason);
    loadCalendarAppointments(date);
    renderCalendarBlackoutList();
    updateCalendarBlockStatus(date);
    loadOverview();
    if (reasonInput) {
      reasonInput.value = '';
    }
    customAlert.success('Day blocked and affected customers notified via history log.');
  });
}

function unblockSelectedDay() {
  const date = getSelectedCalendarDate();
  if (!date) {
    customAlert.warning('Select a date first.');
    return;
  }
  if (!isCalendarBlackout(date)) {
    customAlert.warning('Selected day is already open.');
    return;
  }
  customAlert.confirm('Confirm', `Re-open ${formatDate(date)} for bookings?`).then((confirmed) => {
    if (!confirmed) return;

    removeCalendarBlackout(date);
    renderCalendarBlackoutList();
    updateCalendarBlockStatus(date);
    loadOverview();
    customAlert.success('Day reopened. Customers can now book again.');
  });
}

async function cancelBookingsForDate(date, reason) {
  const bookings = await getBookings();
  let changed = false;
  bookings.forEach(booking => {
    if (booking.date === date && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(booking.status)) {
      booking.status = 'Cancelled By Admin';
      booking.cancellationNote = `Closed day: ${reason}`;
      changed = true;
      logBookingHistory({
        bookingId: booking.id,
        action: 'Cancelled',
        message: booking.cancellationNote,
        actor: 'Admin'
      });
    }
  });
  if (changed) {
    saveBookings(bookings);
  }
}

function renderCalendarBlackoutList() {
  const container = document.getElementById('calendarBlackoutList');
  if (!container) return;
  const today = toLocalISO(new Date());
  const entries = getCalendarBlackouts()
    .filter(entry => entry.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!entries.length) {
    container.innerHTML = '<p class="empty-state" style="margin:0;">No closed days yet.</p>';
    return;
  }
  container.innerHTML = entries.map(entry => `
    <div class="sidebar-panel-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
      <div>
        <strong>${formatDate(entry.date)}</strong>
        <p style="margin:0; font-size:0.85rem; color:var(--gray-600);">${escapeHtml(entry.reason)}</p>
      </div>
      <button class="btn btn-outline btn-sm" data-reopen-date="${entry.date}">Re-open</button>
    </div>
  `).join('');
  container.querySelectorAll('[data-reopen-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('calendarDate').value = btn.dataset.reopenDate;
      unblockSelectedDay();
    });
  });
}

function updateCalendarBlockStatus(date) {
  const statusEl = document.getElementById('calendarBlockStatus');
  if (!statusEl || !date) return;
  const blackout = getCalendarBlackout(date);
  if (blackout) {
    statusEl.textContent = `${formatDate(date)} is closed (${blackout.reason}).`;
  } else {
    statusEl.textContent = `${formatDate(date)} is open for bookings.`;
  }
}

// Customer management state
let customersCache = [];
let customersState = {
  page: 1,
  pageSize: 5,
  sortBy: 'name',
  sortOrder: 'asc',
  searchTerm: ''
};

// Load customer management
async function loadCustomerManagement() {
  const users = await getUsers();
  const customers = users.filter(u => u.role === 'customer');
  const bookings = await getBookings();

  // Add booking count to each customer
  const customersWithBookings = customers.map(customer => {
    const customerBookings = bookings.filter(b => b.userId === customer.id);
    return {
      ...customer,
      bookingCount: customerBookings.length
    };
  });

  customersCache = customersWithBookings;
  
  // Initialize search input only once
  const container = document.getElementById('customersTable');
  if (container && !document.getElementById('customersSearch')) {
    const searchDiv = document.createElement('div');
    searchDiv.className = 'search-bar';
    searchDiv.style.marginBottom = '1rem';
    searchDiv.innerHTML = `
      <input type="text" id="customersSearch" class="search-input"
        placeholder="🔍 Search by name or email..."
        onkeyup="searchCustomers(this.value)">
    `;
    container.insertBefore(searchDiv, container.firstChild);
  }
  
  renderCustomerTable();
}

// Render customer table with sorting, pagination, and search
function renderCustomerTable() {
  const container = document.getElementById('customersTable');
  if (!container) return;

  let filteredCustomers = [...customersCache];

  // Apply search filter
  if (customersState.searchTerm) {
    const q = customersState.searchTerm.toLowerCase();
    filteredCustomers = filteredCustomers.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }

  if (filteredCustomers.length === 0) {
    const message = customersState.searchTerm 
      ? `No results found for "${customersState.searchTerm}". Try a different search term.`
      : 'No customers available yet.';
    container.innerHTML = `
      <div class="search-bar" style="margin-bottom: 1rem;">
        <input type="text" id="customersSearch" class="search-input"
          placeholder="🔍 Search by name or email..."
          value="${customersState.searchTerm || ''}"
          onkeyup="searchCustomers(this.value)">
      </div>
      <div style="padding: 3rem 2rem; text-align: center; background: #f9fafb; border-radius: var(--radius); border: 2px dashed var(--gray-300);">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">👥</div>
        <p style="color: var(--gray-700); font-size: 1.1rem; margin-bottom: 0.5rem; font-weight: 500;">${message}</p>
        ${customersState.searchTerm ? `<p style="color: var(--gray-600); font-size: 0.9rem;">Clear the search to see all customers.</p>` : ''}
      </div>
    `;
    return;
  }

  // Apply sorting
  const sortBy = customersState.sortBy || 'name';
  const sortOrder = customersState.sortOrder || 'asc';

  filteredCustomers.sort((a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'email':
        valA = (a.email || '').toLowerCase();
        valB = (b.email || '').toLowerCase();
        break;
      case 'bookings':
        valA = a.bookingCount || 0;
        valB = b.bookingCount || 0;
        break;
      case 'warnings':
        valA = a.warningCount || 0;
        valB = b.warningCount || 0;
        break;
      case 'status':
        valA = a.isBanned ? 2 : ((a.warningCount || 0) >= WARNING_THRESHOLD ? 1 : 0);
        valB = b.isBanned ? 2 : ((b.warningCount || 0) >= WARNING_THRESHOLD ? 1 : 0);
        break;
      case 'name':
      default:
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
        break;
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const pageSize = customersState.pageSize || 5;
  const currentPage = customersState.page || 1;
  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Build HTML (without search input - it's managed separately)
  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <label style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Show:</label>
        <select class="form-select" style="width: auto; padding: 0.5rem;" onchange="changeCustomersPageSize(this.value)">
          <option value="5" ${pageSize === 5 ? 'selected' : ''}>5</option>
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
        </select>
        <span style="font-size: 0.9rem; color: var(--gray-600);">entries</span>
      </div>
      <div style="font-size: 0.9rem; color: var(--gray-600);">
        Showing ${startIndex + 1} to ${endIndex} of ${totalItems}
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding: 0.5rem; background: var(--gray-50); border-radius: var(--radius-sm);">
      <label style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Sort by:</label>
      <select class="form-select" style="width: auto; padding: 0.5rem;" onchange="changeCustomersSortField(this.value)">
        <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Name</option>
        <option value="email" ${sortBy === 'email' ? 'selected' : ''}>Email</option>
        <option value="bookings" ${sortBy === 'bookings' ? 'selected' : ''}>Total Bookings</option>
        <option value="warnings" ${sortBy === 'warnings' ? 'selected' : ''}>Warnings</option>
        <option value="status" ${sortBy === 'status' ? 'selected' : ''}>Status</option>
      </select>
      <select class="form-select" style="width: auto; padding: 0.5rem;" onchange="changeCustomersSortOrder(this.value)">
        <option value="asc" ${sortOrder === 'asc' ? 'selected' : ''}>Ascending</option>
        <option value="desc" ${sortOrder === 'desc' ? 'selected' : ''}>Descending</option>
      </select>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Joined Date</th>
            <th>Total Bookings</th>
            <th>Warnings</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  paginatedCustomers.forEach(customer => {
    const warningCount = customer.warningCount || 0;
    const limit = typeof WARNING_HARD_LIMIT === 'number' ? WARNING_HARD_LIMIT : 5;
    const joined = customer.createdAt ? formatDate(toLocalISO(new Date(customer.createdAt))) : '—';
    const statusLabel = customer.isBanned ? 'Banned' : (warningCount >= WARNING_THRESHOLD ? 'Watchlist' : 'Active');
    const statusClass = customer.isBanned ? 'badge badge-cancelled' : (warningCount >= WARNING_THRESHOLD ? 'badge badge-pending' : 'badge badge-confirmed');
    const canLift = customer.isBanned || warningCount >= limit;

    html += `
      <tr>
        <td>${escapeHtml(customer.name)}</td>
        <td>${escapeHtml(customer.email)}</td>
        <td>${joined}</td>
        <td>${customer.bookingCount}</td>
        <td>${warningCount}/${limit}</td>
        <td><span class="${statusClass}" style="text-transform:capitalize;">${statusLabel}</span></td>
        <td style="display:flex; gap:0.25rem; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" data-add-warning="${customer.id}">Add Warning</button>
          ${customer.isBanned ? '' : `<button class="btn btn-danger btn-sm" data-ban="${customer.id}">Ban</button>`}
          ${canLift ? `<button class="btn btn-success btn-sm" data-lift="${customer.id}">Lift</button>` : ''}
        </td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';

  // Pagination controls
  if (totalPages > 1) {
    html += `
      <div style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1rem;">
        <button class="btn btn-sm btn-outline" onclick="changeCustomersPage(1)" ${currentPage === 1 ? 'disabled' : ''}>«</button>
        <button class="btn btn-sm btn-outline" onclick="changeCustomersPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>
        <span style="padding: 0.5rem 1rem; font-size: 0.9rem; color: var(--gray-700);">Page ${currentPage} of ${totalPages}</span>
        <button class="btn btn-sm btn-outline" onclick="changeCustomersPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>
        <button class="btn btn-sm btn-outline" onclick="changeCustomersPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>»</button>
      </div>
    `;
  }

  container.innerHTML = html;

  // Add event listeners
  container.querySelectorAll('[data-add-warning]').forEach(btn => {
    btn.addEventListener('click', () => handleAddWarning(btn.dataset.addWarning));
  });
  container.querySelectorAll('[data-ban]').forEach(btn => {
    btn.addEventListener('click', () => handleBanCustomer(btn.dataset.ban));
  });
  container.querySelectorAll('[data-lift]').forEach(btn => {
    btn.addEventListener('click', () => openLiftBanModal(btn.dataset.lift));
  });
}

// Customers handlers
window.searchCustomers = function(query) {
  if (customersSearchTimeout) clearTimeout(customersSearchTimeout);
  customersSearchTimeout = setTimeout(() => {
    customersState.searchTerm = query;
    customersState.page = 1;
    renderCustomerTable();
  }, 300);
};

window.changeCustomersSortField = function(field) {
  customersState.sortBy = field;
  customersState.page = 1;
  renderCustomerTable();
};

window.changeCustomersSortOrder = function(order) {
  customersState.sortOrder = order;
  customersState.page = 1;
  renderCustomerTable();
};

window.changeCustomersPageSize = function(size) {
  customersState.pageSize = parseInt(size, 10);
  customersState.page = 1;
  renderCustomerTable();
};

window.changeCustomersPage = function(page) {
  const totalPages = Math.ceil(customersCache.length / customersState.pageSize) || 1;
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  customersState.page = page;
  renderCustomerTable();
};

// Protection flags for customer management
let isAddingWarning = false;
let isBanningCustomer = false;

async function handleAddWarning(userId) {
  // Prevent duplicate clicks
  if (isAddingWarning) {
    console.log('[handleAddWarning] BLOCKED - Already in progress');
    return;
  }
  isAddingWarning = true;
  
  try {
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const reason = prompt(`Reason for warning for ${user.name}?`, 'No-show / late cancellation');
    if (reason === null) return;
    const info = await incrementCustomerWarning(userId, reason.trim() || 'Admin issued warning');
    customAlert.info(`${user.name} now has ${info?.warnings || 0}/5 warnings.`);
    await loadCustomerManagement();
    renderBlockedCustomersPanel();
    renderLiftBanPanel();
  } finally {
    isAddingWarning = false;
  }
}

async function handleBanCustomer(userId) {
  // Prevent duplicate clicks
  if (isBanningCustomer) {
    console.log('[handleBanCustomer] BLOCKED - Already in progress');
    return;
  }
  
  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  const reason = prompt(`Why ban ${user.name}?`, 'Exceeded warning limit');
  if (reason === null) return;
  
  customAlert.confirm('Confirm', `Ban ${user.name}? They will be blocked from booking until lifted.`).then(async (confirmed) => {
    if (!confirmed) return;
    
    if (isBanningCustomer) return;
    isBanningCustomer = true;
    
    try {
      await banCustomer(userId, reason.trim() || 'Admin manual ban');
      customAlert.error(`${user.name} has been banned.`);
      await loadCustomerManagement();
      renderBlockedCustomersPanel();
      renderLiftBanPanel();
    } finally {
      isBanningCustomer = false;
    }
  });
}

// Booking detail modal
async function openBookingDetail(bookingId) {
  // Use protected action wrapper to prevent multiple modal opens
  await protectedAction(async () => {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const packages = await getPackages();
  const pkg = packages.find(p => p.id === booking.packageId);
  
  // Get history from both sources:
  // 1. getBookingHistory() - global activity log (now from Firebase)
  // 2. booking.history - booking-specific history (includes payment history)
  const globalHistory = (await getBookingHistory())
    .filter(entry => entry.bookingId === bookingId)
    .sort((a, b) => b.timestamp - a.timestamp);
  
  // Combine with booking.history (payment history)
  const bookingPaymentHistory = (booking.history || [])
    .map(entry => ({
      ...entry,
      bookingId: bookingId,
      timestamp: entry.timestamp || Date.now()
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
  
  // Merge and sort all history
  const allHistory = [...globalHistory, ...bookingPaymentHistory]
    .sort((a, b) => b.timestamp - a.timestamp);
  
  const bookingCode = typeof getBookingDisplayCode === 'function'
    ? getBookingDisplayCode(booking)
    : booking.id;

  // Calculate total price with add-ons and single services
  const isSingleService = booking.packageId === 'single-service';
  const packagePrice = isSingleService ? 0 : (booking.cost?.packagePrice || 0);
  
  // Calculate single services total
  let servicesTotal = 0;
  if (isSingleService) {
    const costServices = booking.cost?.services || [];
    servicesTotal = costServices.reduce((sum, s) => sum + (s.price || 0), 0);
    
    // Fallback: calculate from booking.singleServices if cost.services is empty
    if (servicesTotal === 0 && booking.singleServices?.length > 0) {
      const pricing = window.SINGLE_SERVICE_PRICING || {};
      booking.singleServices.forEach(serviceId => {
        const serviceInfo = pricing[serviceId];
        if (serviceInfo?.tiers) {
          const weightLabel = booking.petWeight || '';
          const isSmall = weightLabel.includes('5kg') || weightLabel.includes('below');
          const tier = isSmall ? serviceInfo.tiers.small : serviceInfo.tiers.large;
          servicesTotal += tier?.price || 0;
        }
      });
    }
  }
  
  const addOnsTotal = (booking.addOns || []).reduce((sum, addon) => sum + (parseFloat(addon.price) || 0), 0);
  const currentTotal = packagePrice + servicesTotal + addOnsTotal;

  // Calculate remaining balance after booking fee
  const bookingFee = booking.cost?.bookingFee || 0;
  const remainingBalance = Math.max(0, currentTotal - bookingFee);


  // Progress bar
  const progress = booking.status === 'In Progress' ? 'In Progress' : 'confirmed';
  const statusClass = booking.status === 'confirmed' || booking.status === 'completed'
    ? 'badge-confirmed'
    : booking.status === 'In Progress'
      ? 'badge-inprogress'
      : ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(booking.status)
        ? 'badge-cancelled'
        : 'badge-pending';

  const historyHtml = allHistory.length
    ? `<div class="history-list">${allHistory.map(item => {
        // Format payment history entries specially
        if (item.action === 'payment_received' || item.action === 'payment_confirmed') {
          return `
            <div style="padding:0.75rem; border-bottom:1px dashed var(--gray-200); background: #e8f5e9; border-radius: 4px; margin-bottom: 0.5rem;">
              <strong style="color: #2e7d32;">${new Date(item.timestamp).toLocaleString()}</strong><br>
              <span style="color: #2e7d32; font-weight: 600; text-transform: capitalize;">
                ${item.action === 'payment_received' ? '💰 Payment Received' : '✅ Payment Confirmed'}
              </span><br>
              <span style="color: #555; font-size: 0.9rem;">
                Amount: ${formatCurrency(item.paymentAmount || 0)} | 
                Method: ${item.paymentMethod === 'payNow' ? '💳 Pay Now' : '⏰ Pay Later'}
              </span>
              ${item.hasProofOfPayment ? `
                <div style="margin-top: 0.5rem;">
                  <button onclick="window.openAdminProofOfPaymentLightbox('${bookingId}')" 
                    style="padding: 0.3rem 0.6rem; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">
                    👁️ View Proof
                  </button>
                </div>
              ` : ''}
            </div>
          `;
        }
        // Regular history entries
        return `
          <div style="padding:0.5rem 0; border-bottom:1px dashed var(--gray-200);">
            <strong>${new Date(item.timestamp).toLocaleString()}</strong><br>
            <span style="color:var(--gray-600); text-transform:capitalize;">${escapeHtml(item.action)}</span> – ${escapeHtml(item.message || '')}
          </div>
        `;
      }).join('')}</div>`
    : '<p class="empty-state" style="padding:1rem;">No history yet.</p>';

  // Groomer assignment section (only for pending bookings)
  const groomerSection = booking.status === 'pending' && booking.groomerId ? `
    <p><strong>✓ Groomer:</strong> <span style="background: #e8f5e9; padding: 0.25rem 0.5rem; border-radius: 0.25rem; color: #2e7d32; font-weight: 600;">${escapeHtml(booking.groomerName)}</span></p>
  ` : (booking.status === 'In Progress' && booking.groomerId ? `
    <p><strong>✓ Groomer:</strong> <span style="background: #e8f5e9; padding: 0.25rem 0.5rem; border-radius: 0.25rem; color: #2e7d32; font-weight: 600;">${escapeHtml(booking.groomerName)}</span></p>
  ` : ``);



  // Add-on Section (Visible if Confirmed or In-Progress) 
  let addonsHtml = `<p><strong>Add-ons:</strong> ${booking.addOns?.length ? booking.addOns.map(a => escapeHtml(a.name)).join(', ') : 'None'}</p>`;

  if (booking.status === 'In Progress') {
    const availableAddonPackages = packages.filter(p => p.type === 'addon');
    // Simple dropdown for now. Ideally this would be smarter.
    let addonOptions = `<option value="">Select Add-on</option>`;
    availableAddonPackages.forEach(p => {
      if (p.tiers && p.tiers.length > 0) {
        p.tiers.forEach(t => {
          const val = `${p.id}|${t.label}|${t.price}`; // encode details
          addonOptions += `<option value="${val}">${p.name} - ${t.label} (${formatCurrency(t.price)})</option>`;
        });
      } else {
        const val = `${p.id}|Base|${p.price}`;
        addonOptions += `<option value="${val}">${p.name} (${formatCurrency(p.price)})</option>`;
      }
    });

    const currentAddonsList = booking.addOns && booking.addOns.length ?
      `<ul style="margin: 0.5rem 0; padding-left: 1.2rem; list-style-type: none;">
            ${booking.addOns.map((addon, idx) => `
                <li style="margin-bottom: 0.25rem;">
                    ${escapeHtml(addon.name)} (${formatCurrency(addon.price)}) 
                    <button class="btn btn-outline btn-sm" style="padding: 0 0.25rem; font-size: 0.7rem; color: red; border-color: red;" onclick="handleRemoveAddonFromBooking('${bookingId}', ${idx})">Remove</button>
                </li>
            `).join('')}
         </ul>` :
      '<p style="color: var(--gray-600); font-style: italic; font-size: 0.9rem;">No add-ons added yet.</p>';

    addonsHtml = `
        <div style="background: var(--gray-50); padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; border: 1px solid var(--gray-200);">
            <h4 style="margin-top:0; margin-bottom: 0.5rem;">Managing Add-ons</h4>
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <select id="addonSelect-${bookingId}" class="form-select" style="flex:1;">
                    ${addonOptions}
                </select>
                <button class="btn btn-primary btn-sm" onclick="handleAddAddonToBooking('${bookingId}')">Add</button>
            </div>
            ${currentAddonsList}
            <p style="text-align: right; font-weight: 600; margin-top: 0.5rem; margin-bottom: 0;">Current Total: ${formatCurrency(remainingBalance)}</p>
        </div>
    `;
  }

  showModal(`
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem;">
      <h3 style="margin:0;">${escapeHtml(booking.customerName)} · ${escapeHtml(booking.petName)}</h3>
      ${booking.isFeatured ? `<span style="background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); padding: 0.5rem 0.75rem; border-radius: 0.5rem; font-weight: 700; color: #333; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3); white-space: nowrap;">⭐ FEATURED</span>` : ''}
    </div>
    <p><strong>Booking code:</strong> ${escapeHtml(bookingCode)}</p>
    <p><strong>Service:</strong> ${escapeHtml(booking.packageName)}${pkg ? ` (${pkg.duration} min)` : ''}${booking.packageId === 'single-service' && booking.singleServices?.length ? ` <span style="color: var(--gray-600); font-size: 0.9rem;">(${booking.singleServices.map(id => getSingleServiceLabel(id)).join(', ')})</span>` : ''}</p>
    <p><strong>Schedule:</strong> ${formatDate(booking.date)} at ${formatTime(booking.time)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(booking.phone)}</p>
    ${groomerSection}
    
    ${addonsHtml}

    ${(() => {
      // ============================================
      // 🔧 REFERENCE CUT & SPECIAL NOTES - Text only (no images for faster loading)
      // ============================================
      let preferredCutHtml = '';
      let notesHtml = '';
      
      // Reference Cut - shows the cut style name (e.g. "Lion Cut", "Teddy Bear Cut")
      if (booking.referenceCut) {
        const cutId = booking.referenceCut;
        let cutDisplayName = typeof getReferenceCutName === 'function' 
          ? getReferenceCutName(cutId) 
          : (typeof window.getReferenceCutName === 'function' ? window.getReferenceCutName(cutId) : cutId);
        
        preferredCutHtml = `
          <div style="margin: 1rem 0; padding: 1rem; background: #e8f5e9; border-radius: 8px; border: 2px solid #4CAF50;">
            <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #2e7d32;">✂️ Reference Cut:</p>
            <p style="margin: 0; font-size: 1.1rem; font-weight: 600; color: #1b5e20;">${escapeHtml(cutDisplayName)}</p>
          </div>
        `;
      }
      
      // Special Notes - shows customer requests (groomer preference, allergies, injuries, etc.)
      if (booking.bookingNotes && booking.bookingNotes.trim()) {
        let notesToDisplay = booking.bookingNotes.trim();
        // Remove cut name from notes if duplicated
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
            <div style="margin: 1rem 0; padding: 1rem; background: #fff3e0; border-radius: 8px; border: 2px solid #ff9800;">
              <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #e65100;">📝 Special Notes:</p>
              <p style="margin: 0; color: #5d4037; line-height: 1.5;">${escapeHtml(notesToDisplay)}</p>
            </div>
          `;
        }
      }
      
      return preferredCutHtml + notesHtml;
    })()}
    
    ${booking.vaccinationProofImage ? `
      <div style="margin: 1rem 0;">
        <p style="margin-bottom: 0.5rem;"><strong>📷 Vaccination Proof:</strong></p>
        <img src="${booking.vaccinationProofImage}" alt="Vaccination Proof" 
          style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 2px solid #4CAF50; cursor: pointer;"
          onclick="window.openAdminVaccinationLightbox('${booking.id}')">
      </div>
    ` : ''}
    
    <!-- Proof of Payment Section -->
    <div style="margin: 1rem 0; padding: 1rem; background: ${booking.proofOfPaymentImage ? '#e3f2fd' : '#fff3e0'}; border-radius: 8px; border: 1px solid ${booking.proofOfPaymentImage ? '#2196F3' : '#ff9800'};">
      <p style="margin-bottom: 0.5rem; font-weight: 600;"><strong>💳 Proof of Payment (GCash):</strong></p>
      ${booking.proofOfPaymentImage ? `
        <img src="${booking.proofOfPaymentImage}" alt="Proof of Payment" 
          style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 2px solid #2196F3; cursor: pointer;"
          onclick="window.openAdminProofOfPaymentLightbox('${booking.id}')">
        <p style="color: #2e7d32; font-size: 0.85rem; margin-top: 0.5rem;">✓ Payment proof uploaded by customer</p>
      ` : `
        <p style="color: #f57c00; font-size: 0.9rem;">⚠️ No payment proof uploaded yet</p>
      `}
    </div>
    
    ${generatePriceBreakdown(booking, pkg)}
    <p>
      <strong>Status:</strong>
      <span class="badge ${statusClass}">${escapeHtml(booking.status.replace('_', ' '))}</span>
    </p>
    ${booking.cancellationNote ? `<p><strong>Latest note:</strong> ${escapeHtml(booking.cancellationNote)}</p>` : ''}
    ${(booking.beforeImage || booking.afterImage) ? `
      <div class="before-after" style="margin:1rem 0;">
        ${booking.beforeImage ? `<figure><figcaption>Before</figcaption><img src="${booking.beforeImage}" alt="Before photo" /></figure>` : ''}
        ${booking.afterImage ? `<figure><figcaption>After</figcaption><img src="${booking.afterImage}" alt="After photo" /></figure>` : ''}
      </div>
    ` : ''}
    <h4>Activity</h4>
    ${historyHtml}
    
    <div class="modal-actions" style="flex-direction: column; align-items: stretch;">
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;">
        ${booking.status === 'pending' && booking.groomerId ? `<button class="btn btn-success btn-sm" onclick="protectedConfirmBooking('${booking.id}')">Confirm</button>` : ''}
        ${booking.status === 'pending' && !booking.groomerId ? `<button class="btn btn-success btn-sm" onclick="protectedConfirmBooking('${booking.id}')">Confirm</button>` : ''}
        
        ${booking.status === 'confirmed' ? (() => {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const isToday = booking.date === todayStr;
          if (isToday) {
            return `<button class="btn btn-primary btn-sm" onclick="protectedHandleStartService('${booking.id}')">▶ Start Service</button>`;
          } else {
            return `<button class="btn btn-primary btn-sm" disabled style="opacity: 0.6;" title="Can only start service on appointment date (${booking.date})">▶ Start Service (Not Today)</button>`;
          }
        })() : ''}
        
        ${booking.status === 'In Progress' ? `<button class="btn btn-success btn-sm" onclick="handleCompleteService('${booking.id}')">✓ Complete Service</button>` : ''}
        ${booking.status === 'confirmed' ? `<button class="btn btn-success btn-sm" onclick="handleCompleteService('${booking.id}')">✓ Complete (Skip In-Progress)</button>` : ''}


        ${['confirmed', 'completed', 'In Progress'].includes(booking.status) ? `<button class="btn btn-secondary btn-sm" onclick="openMediaModal('${booking.id}')">Add Photos</button>` : ''}
        ${booking.beforeImage && booking.afterImage ? `<button class="btn ${booking.isFeatured ? 'btn-warning' : 'btn-secondary'} btn-sm" onclick="toggleFeature('${booking.id}')">${booking.isFeatured ? '⭐ Featured' : '☆ Feature This'}</button>` : ''}
        
        ${booking.status !== 'cancelledByAdmin' && booking.status !== 'cancelledByCustomer' && booking.status !== 'In Progress' ? `<button class="btn btn-secondary btn-sm" onclick="protectedOpenRescheduleModal('${booking.id}')">Reschedule</button>` : ''}
        ${booking.status === 'confirmed' ? `<button class="btn btn-secondary btn-sm" onclick="openNoShowModal('${booking.id}')">⚠ Mark No-show</button>` : ''}
        ${booking.status !== 'cancelledByAdmin' && booking.status !== 'cancelledByCustomer' && booking.status !== 'completed' ? `<button class="btn btn-danger btn-sm" onclick="protectedOpenCancelModal('${booking.id}')">Cancel</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="modalSystem.close()">Close</button>
      </div>
    </div>
  `);
  }, 'openBookingDetail');
}

// ============================================
// 👥 GROOMER ASSIGNMENT MODAL
// ============================================
// Allows admin to assign a groomer to a booking
// Features:
// - Filters out absent groomers automatically
// - Recommends groomer with least workload (fair assignment)
// - Shows capacity and availability for each groomer
// ============================================
async function openGroomerAssignmentModal(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const groomers = await getGroomers();
  const absences = getStaffAbsences();

  // Debug: Log absences and booking date
  console.log('[Groomer Assignment Modal] Booking date:', booking.date);
  console.log('[Groomer Assignment Modal] All absences:', absences);
  console.log('[Groomer Assignment Modal] Approved absences for this date:', 
    absences.filter(a => a.date === booking.date && a.status === 'approved')
  );

  // ============================================
  // 🚫 FILTER OUT ABSENT GROOMERS
  // ============================================
  // Check if groomer has approved absence on booking date
  // Absence matching logic:
  // 1. Check staffId (user login ID, e.g., "sam")
  // 2. Check groomerId (groomer system ID, e.g., "groomer-1")
  // 3. Match booking date exactly
  // 4. Only approved absences block assignment
  // 
  // Why check both IDs?
  // - staffId: Set when groomer submits absence request (user ID)
  // - groomerId: Set when linking staff to groomer system (groomer ID)
  // - Both must be checked for compatibility with old/new data
  // ============================================
  const activeGroomers = groomers.filter(groomer => {
    const absence = absences.find(a => {
      // ============================================
      // 🔍 ABSENCE ID MATCHING LOGIC
      // ============================================
      // Check BOTH staffId and groomerId to handle:
      // - Old absences (may only have staffId)
      // - New absences (should have both staffId and groomerId)
      // - Ensures absent groomers are always filtered out
      // ============================================
      const idMatch = a.staffId === groomer.id || a.groomerId === groomer.id;
      return idMatch && a.date === booking.date && a.status === 'approved';
    });
    
    // Debug: Log each groomer's absence status
    if (absence) {
      console.log(`[Groomer Assignment Modal] ${groomer.name} is ABSENT on ${booking.date}`, absence);
    }
    
    return !absence; // Return true if NOT absent (available)
  });
  
  console.log('[Groomer Assignment Modal] Active groomers:', activeGroomers.map(g => g.name));
  
  // Helper to check if booking is confirmed (not pending, not cancelled)
  const isConfirmedStatus = (status) => {
    const s = (status || '').toString().toLowerCase();
    return ['confirmed', 'completed', 'inprogress', 'in progress'].includes(s);
  };
  
  // Calculate the day BEFORE the booking date for fair assignment
  // This ensures future bookings (e.g., Dec 26) use Dec 25's picks, not today's
  const bookingDateParts = booking.date.split('-');
  const bookingDateObj = new Date(bookingDateParts[0], bookingDateParts[1] - 1, bookingDateParts[2]);
  bookingDateObj.setDate(bookingDateObj.getDate() - 1);
  const dayBeforeBooking = `${bookingDateObj.getFullYear()}-${String(bookingDateObj.getMonth() + 1).padStart(2, '0')}-${String(bookingDateObj.getDate()).padStart(2, '0')}`;

  // Compute loads for active groomers - use day before booking's CONFIRMED picks for fair assignment
  const groomerLoads = await Promise.all(activeGroomers.map(async (g) => {
    // Today's load (for capacity display)
    const todayLoad = (typeof getGroomerDailyLoad === 'function') ? await getGroomerDailyLoad(g.id, booking.date) : 0;
    
    // Day before booking's CONFIRMED picks (for fair assignment priority)
    const dayBeforePicks = bookings.filter(b =>
      b.groomerId === g.id &&
      b.date === dayBeforeBooking &&
      isConfirmedStatus(b.status)
    ).length;
    
    // Total CONFIRMED bookings (for tiebreaker)
    const totalConfirmed = bookings.filter(b =>
      b.groomerId === g.id &&
      isConfirmedStatus(b.status)
    ).length;
    
    return { groomer: g, todayLoad, dayBeforePicks, totalConfirmed };
  }));

  // Sort by: 1. Day before booking's picks (least = 1st priority), 2. Total confirmed, 3. Today's load
  groomerLoads.sort((a, b) => {
    if (a.dayBeforePicks !== b.dayBeforePicks) {
      return a.dayBeforePicks - b.dayBeforePicks;
    }
    if (a.totalConfirmed !== b.totalConfirmed) {
      return a.totalConfirmed - b.totalConfirmed;
    }
    return a.todayLoad - b.todayLoad;
  });
  
  // Highlight the recommended groomer (least picked on day before booking)
  const recommendedGroomer = groomerLoads.length > 0 ? groomerLoads[0].groomer : null;

  const groomerOptions = groomerLoads.map(({ groomer, todayLoad, dayBeforePicks }) => {
    const dailyLoad = todayLoad;
    const limit = groomer.maxDailyBookings || GROOMER_DAILY_LIMIT;
    const available = limit - dailyLoad;
    const hasCapacity = available > 0;
    const isRecommended = recommendedGroomer && groomer.id === recommendedGroomer.id;

    return `
      <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border: 2px solid ${isRecommended ? '#4CAF50' : (hasCapacity ? 'var(--gray-200)' : 'var(--gray-300)')}; border-radius: var(--radius-sm); margin-bottom: 0.75rem; cursor: ${hasCapacity ? 'pointer' : 'not-allowed'}; opacity: ${hasCapacity ? '1' : '0.6'}; background: ${isRecommended ? '#f1f8f4' : 'transparent'};" onclick="assignGroomerToBooking('${bookingId}', '${groomer.id}', '${groomer.name}')">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem;">
          ${groomer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div style="flex: 1;">
          <p style="margin: 0; font-weight: 600; color: var(--gray-900);">${escapeHtml(groomer.name)} ${isRecommended ? '<span style="background: #4CAF50; color: white; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-left: 0.5rem;">⭐ RECOMMENDED</span>' : ''}</p>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--gray-600);">${escapeHtml(groomer.specialty || 'All-around stylist')}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-weight: 600; font-size: 0.95rem; color: ${hasCapacity ? '#2e7d32' : '#d32f2f'};">${available}/${limit} slots</p>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: var(--gray-600);">${dailyLoad} picked today</p>
        </div>
      </div>
    `;
  }).join('');

  const unavailableGroomers = groomers.filter(g => !activeGroomers.find(ag => ag.id === g.id));
  const unavailableHtml = unavailableGroomers.length ? `
    <p style="color: var(--gray-600); font-size: 0.9rem; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 500;">Unavailable on ${formatDate(booking.date)}:</p>
    ${unavailableGroomers.map(groomer => `
      <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm); margin-bottom: 0.5rem; opacity: 0.5; background: var(--gray-50);">
        <div style="background: var(--gray-400); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem;">
          ${groomer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div style="flex: 1;">
          <p style="margin: 0; font-weight: 600; color: var(--gray-700);">${escapeHtml(groomer.name)}</p>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--gray-600);">On leave / Not available</p>
        </div>
      </div>
    `).join('')}
  ` : '';

  showModal(`
    <h3 style="margin-top:0;">Assign Groomer for ${escapeHtml(booking.petName)}</h3>
    <p style="color: var(--gray-600); margin-bottom: 1rem;">
      <strong>Date:</strong> ${formatDate(booking.date)} at ${formatTime(booking.time)}<br>
      <strong>Service:</strong> ${escapeHtml(booking.packageName)}
    </p>
    <div style="border-top: 1px solid var(--gray-200); padding-top: 1rem;">
      <p style="font-weight: 600; color: var(--gray-900); margin-bottom: 1rem;">Available Groomers:</p>
      ${groomerOptions || '<p style="color: var(--gray-600);">No available groomers for this date.</p>'}
      ${unavailableHtml}
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline btn-sm" onclick="openBookingDetail('${bookingId}')">Back</button>
    </div>
  `);
}

// New function for groomer assignment when starting service
async function openGroomerAssignmentModalForStartService(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const groomers = await getGroomers();
  const absences = getStaffAbsences();

  // Debug: Log absences and booking date
  console.log('[Start Service Modal] Booking date:', booking.date);
  console.log('[Start Service Modal] Booking date type:', typeof booking.date);
  console.log('[Start Service Modal] All absences:', absences);
  console.log('[Start Service Modal] All groomers:', groomers.map(g => ({ id: g.id, name: g.name })));
  
  // Check each absence against booking date
  absences.forEach(a => {
    console.log(`[Start Service Modal] Absence: staffId=${a.staffId}, date=${a.date}, status=${a.status}, matches booking date: ${a.date === booking.date}`);
  });

  // Get only active groomers (not on absence) for the booking date
  const activeGroomers = groomers.filter(groomer => {
    const absence = absences.find(a => {
      // Check both staffId and groomerId for compatibility
      const staffIdMatch = a.staffId === groomer.id || a.groomerId === groomer.id;
      const dateMatch = a.date === booking.date;
      const statusMatch = a.status === 'approved';
      
      console.log(`[Start Service Modal] Checking ${groomer.name}: staffId match=${staffIdMatch} (staffId: ${a.staffId}, groomerId: ${a.groomerId} vs groomer.id: ${groomer.id}), date match=${dateMatch} (${a.date} vs ${booking.date}), status match=${statusMatch} (${a.status})`);
      
      return staffIdMatch && dateMatch && statusMatch;
    });
    
    // Debug: Log each groomer's absence status
    if (absence) {
      console.log(`[Start Service Modal] ❌ ${groomer.name} is ABSENT on ${booking.date}`, absence);
      return false; // Exclude absent groomer
    } else {
      console.log(`[Start Service Modal] ✅ ${groomer.name} is AVAILABLE on ${booking.date}`);
      return true; // Include available groomer
    }
  });
  
  console.log('[Start Service Modal] Final active groomers:', activeGroomers.map(g => g.name));
  
  // Helper to check if booking is confirmed (not pending, not cancelled)
  const isConfirmedStatus = (status) => {
    const s = (status || '').toString().toLowerCase();
    return ['confirmed', 'completed', 'inprogress', 'in progress'].includes(s);
  };
  
  // Calculate the day BEFORE the booking date for fair assignment
  // This ensures future bookings (e.g., Dec 26) use Dec 25's picks, not today's
  const bookingDateParts = booking.date.split('-');
  const bookingDateObj = new Date(bookingDateParts[0], bookingDateParts[1] - 1, bookingDateParts[2]);
  bookingDateObj.setDate(bookingDateObj.getDate() - 1);
  const dayBeforeBooking = `${bookingDateObj.getFullYear()}-${String(bookingDateObj.getMonth() + 1).padStart(2, '0')}-${String(bookingDateObj.getDate()).padStart(2, '0')}`;

  // Compute loads for active groomers - use day before booking's CONFIRMED picks for fair assignment
  const groomerLoads = await Promise.all(activeGroomers.map(async (g) => {
    // Today's load (for capacity display)
    const todayLoad = (typeof getGroomerDailyLoad === 'function') ? await getGroomerDailyLoad(g.id, booking.date) : 0;
    
    // Day before booking's CONFIRMED picks (for fair assignment priority)
    const dayBeforePicks = bookings.filter(b =>
      b.groomerId === g.id &&
      b.date === dayBeforeBooking &&
      isConfirmedStatus(b.status)
    ).length;
    
    // Total CONFIRMED bookings (for tiebreaker)
    const totalConfirmed = bookings.filter(b =>
      b.groomerId === g.id &&
      isConfirmedStatus(b.status)
    ).length;
    
    return { groomer: g, todayLoad, dayBeforePicks, totalConfirmed };
  }));

  // Sort by: 1. Day before booking's picks (least = 1st priority), 2. Total confirmed, 3. Today's load
  groomerLoads.sort((a, b) => {
    if (a.dayBeforePicks !== b.dayBeforePicks) {
      return a.dayBeforePicks - b.dayBeforePicks;
    }
    if (a.totalConfirmed !== b.totalConfirmed) {
      return a.totalConfirmed - b.totalConfirmed;
    }
    return a.todayLoad - b.todayLoad;
  });

  // Highlight the recommended groomer (least picked on day before booking)
  const recommendedGroomer = groomerLoads.length > 0 ? groomerLoads[0].groomer : null;

  const groomerOptions = groomerLoads.map(({ groomer, todayLoad, dayBeforePicks }, index) => {
    const dailyLoad = todayLoad;
    const limit = groomer.maxDailyBookings || GROOMER_DAILY_LIMIT;
    const available = limit - dailyLoad;
    const hasCapacity = available > 0;
    const isRecommended = recommendedGroomer && groomer.id === recommendedGroomer.id;

    return `
      <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border: 2px solid ${isRecommended ? '#4CAF50' : (hasCapacity ? 'var(--gray-200)' : 'var(--gray-300)')}; border-radius: var(--radius-sm); margin-bottom: 0.75rem; cursor: ${hasCapacity ? 'pointer' : 'not-allowed'}; opacity: ${hasCapacity ? '1' : '0.6'}; background: ${isRecommended ? '#f1f8f4' : 'transparent'};" onclick="assignGroomerToBookingAndStartService('${bookingId}', '${groomer.id}', '${groomer.name}')">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem;">
          ${groomer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div style="flex: 1;">
          <p style="margin: 0; font-weight: 600; color: var(--gray-900);">${escapeHtml(groomer.name)} ${isRecommended ? '<span style="background: #4CAF50; color: white; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-left: 0.5rem;">⭐ RECOMMENDED</span>' : ''}</p>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--gray-600);">${escapeHtml(groomer.specialty || 'All-around stylist')}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-weight: 600; font-size: 0.95rem; color: ${hasCapacity ? '#2e7d32' : '#d32f2f'};">${available}/${limit} slots</p>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; color: var(--gray-600);">${dailyLoad} picked today</p>
        </div>
      </div>
    `;
  }).join('');

  const unavailableGroomers = groomers.filter(g => !activeGroomers.find(ag => ag.id === g.id));
  const unavailableHtml = unavailableGroomers.length ? `
    <p style="color: var(--gray-600); font-size: 0.9rem; margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 500;">Unavailable on ${formatDate(booking.date)}:</p>
    ${unavailableGroomers.map(groomer => `
      <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm); margin-bottom: 0.5rem; opacity: 0.5; background: var(--gray-50);">
        <div style="background: var(--gray-400); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem;">
          ${groomer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div style="flex: 1;">
          <p style="margin: 0; font-weight: 600; color: var(--gray-700);">${escapeHtml(groomer.name)}</p>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--gray-600);">On leave / Not available</p>
        </div>
      </div>
    `).join('')}
  ` : '';

  showModal(`
    <h3 style="margin-top:0;">🚀 Start Service - Assign Groomer</h3>
    <p style="color: var(--gray-600); margin-bottom: 1rem;">
      <strong>Pet:</strong> ${escapeHtml(booking.petName)}<br>
      <strong>Date:</strong> ${formatDate(booking.date)} at ${formatTime(booking.time)}<br>
      <strong>Service:</strong> ${escapeHtml(booking.packageName)}
    </p>
    <div style="background: #e3f2fd; padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 1rem; border-left: 4px solid #2196F3;">
      <p style="margin: 0; font-size: 0.9rem; color: #1565c0;"><strong>💡 Tip:</strong> The groomer with the fewest confirmed picks yesterday is recommended for fair rotation.</p>
    </div>
    <div style="border-top: 1px solid var(--gray-200); padding-top: 1rem;">
      <p style="font-weight: 600; color: var(--gray-900); margin-bottom: 1rem;">Select a Groomer:</p>
      ${groomerOptions || '<p style="color: var(--gray-600);">No available groomers for this date.</p>'}
      ${unavailableHtml}
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline btn-sm" onclick="openBookingDetail('${bookingId}')">Cancel</button>
    </div>
  `);
}

// Click protection flag for groomer assignment
let isAssigningGroomer = false;

async function assignGroomerToBooking(bookingId, groomerId, groomerName) {
  // Prevent duplicate clicks
  if (isAssigningGroomer) {
    console.log('[assignGroomerToBooking] Already processing, ignoring click');
    return;
  }
  
  isAssigningGroomer = true;
  
  // Disable all groomer selection buttons visually
  const groomerButtons = document.querySelectorAll('[onclick*="assignGroomerToBooking"]');
  groomerButtons.forEach(btn => {
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
    btn.style.cursor = 'wait';
  });

  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      isAssigningGroomer = false;
      return;
    }

    booking.groomerId = groomerId;
    booking.groomerName = groomerName;
    await saveBookings(bookings);

    logBookingHistory({
      bookingId,
      action: 'Groomer Assigned',
      message: `Assigned to ${groomerName}`,
      actor: 'Admin'
    });

    modalSystem.close();
    openBookingDetail(bookingId);
    customAlert.success(`✓ ${groomerName} assigned to ${booking.petName}'s booking!`);
  } catch (error) {
    console.error('[assignGroomerToBooking] Error:', error);
    customAlert.error('Failed to assign groomer. Please try again.');
  } finally {
    // Reset after 3 seconds cooldown
    setTimeout(() => {
      isAssigningGroomer = false;
    }, 3000);
  }
}

// New function: Assign groomer AND start service (called from Start Service flow)
async function assignGroomerToBookingAndStartService(bookingId, groomerId, groomerName) {
  // Prevent duplicate clicks
  if (isAssigningGroomer) {
    console.log('[assignGroomerToBookingAndStartService] Already processing, ignoring click');
    return;
  }
  
  isAssigningGroomer = true;
  
  // Disable all groomer selection buttons visually
  const groomerButtons = document.querySelectorAll('[onclick*="assignGroomerToBookingAndStartService"]');
  groomerButtons.forEach(btn => {
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
    btn.style.cursor = 'wait';
  });

  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      isAssigningGroomer = false;
      return;
    }

    // Assign groomer
    booking.groomerId = groomerId;
    booking.groomerName = groomerName;

    // Start service
    booking.status = 'In Progress';
    booking.startedAt = Date.now();

    if (!booking.addOns) booking.addOns = [];

    await saveBookings(bookings);

    logBookingHistory({
      bookingId,
      action: 'Service Started',
      message: `Assigned to ${groomerName} and moved to In-Progress`,
      actor: 'Admin'
    });

    modalSystem.close();
    openBookingDetail(bookingId);
    customAlert.success(`✓ ${groomerName} assigned and service started for ${booking.petName}!`);
  } catch (error) {
    console.error('[assignGroomerToBookingAndStartService] Error:', error);
    customAlert.error('Failed to start service. Please try again.');
  } finally {
    // Reset after 3 seconds cooldown
    setTimeout(() => {
      isAssigningGroomer = false;
    }, 3000);
  }
}

async function openRescheduleModal(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  // Store the booking data for reschedule in sessionStorage
  const rescheduleData = {
    isReschedule: true,
    rescheduleBy: 'admin', // Mark that admin is rescheduling
    originalBookingId: booking.id,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    customerAddress: booking.customerAddress,
    petName: booking.petName,
    petType: booking.petType,
    petBreed: booking.petBreed,
    petAge: booking.petAge,
    petWeight: booking.petWeight,
    packageId: booking.packageId,
    addOns: booking.addOns || [],
    medicalNotes: booking.medicalNotes,
    specialInstructions: booking.specialInstructions,
    groomingNotes: booking.groomingNotes,
    currentDate: booking.date,
    currentTime: booking.time,
    currentGroomerId: booking.groomerId
  };

  sessionStorage.setItem('rescheduleData', JSON.stringify(rescheduleData));
  
  // Redirect to booking page
  window.location.href = 'booking.html?mode=reschedule';
}

async function handleRescheduleSubmit(event, bookingId) {
  event.preventDefault();
  
  // Disable submit button to prevent duplicates
  const submitBtn = event.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
  }
  
  // Show loading screen (lazy - non-blocking)
  if (typeof showTableLoader === 'function') {
    showTableLoader('#adminBookingsTable');
  }
  
  try {
    const groomerInput = document.getElementById('rescheduleGroomer');
    const dateInput = document.getElementById('rescheduleDate');
    const timeInput = document.getElementById('rescheduleTime');
    const packageInput = document.getElementById('reschedulePackage');
    const noteInput = document.getElementById('rescheduleNote');

    const newGroomerId = groomerInput?.value;
    const newDate = dateInput?.value;
    const newTime = timeInput?.value;
    const newPackageId = packageInput?.value;
    if (!newGroomerId || !newDate || !newTime || !newPackageId) {
      customAlert.warning('Please complete all fields.');
      // Re-enable button on validation error
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
      return;
    }

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    // Check if the new time slot is available (only if groomer or date/time changed)
    if ((newGroomerId !== booking.groomerId || newDate !== booking.date || newTime !== booking.time)) {
      // Check availability excluding current booking
      const conflictingBooking = bookings.find(b =>
        b.id !== bookingId &&
        b.groomerId === newGroomerId &&
        b.date === newDate &&
        b.time === newTime &&
        !['Cancelled', 'CancelledByCustomer', 'CancelledByAdmin', 'CancelledBySystem'].includes(b.status)
      );
      if (conflictingBooking) {
        // Hide loading and ask for confirmation
        if (typeof hideLoadingOverlay === 'function') {
          hideLoadingOverlay();
        }
        
        // Cancel the conflicting booking automatically
        // We need to pause execution here until user confirms
        // Ask for confirmation then continue with the reschedule if confirmed
        customAlert.confirm('Confirm', `This time slot is already booked by ${conflictingBooking.customerName}. Cancel that booking and reschedule this one?`).then((confirmed) => {
          if (confirmed) {
            // Show loading again for the actual reschedule
            if (typeof showLoadingOverlay === 'function') {
              showLoadingOverlay('Rescheduling booking...');
            }
            
            conflictingBooking.status = 'Cancelled By Admin';
            conflictingBooking.cancellationNote = `Cancelled due to reschedule conflict with booking ${getBookingDisplayCode(booking)}`;
            logBookingHistory({
              bookingId: conflictingBooking.id,
              action: 'Cancelled',
              message: `Cancelled due to reschedule conflict`,
              actor: 'Admin'
            });
            saveBookings(bookings);

            // Continue with rescheduling
            proceedWithReschedule();
          }
        });
        return;
      }
    }

    proceedWithReschedule();

    function proceedWithReschedule() {
      const pkListInner = Array.isArray(packages) ? packages : (packages ? Object.values(packages) : []);
      const grListInner = Array.isArray(groomers) ? groomers : (groomers ? Object.values(groomers) : []);
      const selectedPackage = pkListInner.find(pkg => pkg.id === newPackageId);
      const selectedGroomer = grListInner.find(g => g.id === newGroomerId);

      booking.groomerId = newGroomerId;
      booking.groomerName = selectedGroomer ? selectedGroomer.name : booking.groomerName;
      booking.date = newDate;
      booking.time = newTime;
      booking.packageId = newPackageId;
      booking.packageName = selectedPackage ? selectedPackage.name : booking.packageName;
      booking.status = 'Pending';

      saveBookings(bookings);
      logBookingHistory({
        bookingId,
        action: 'Rescheduled',
        message: `Moved to ${formatDate(newDate)} at ${formatTime(newTime)}. ${selectedPackage ? selectedPackage.name : ''} with ${selectedGroomer ? selectedGroomer.name : 'groomer'}`,
        actor: 'Admin',
        note: noteInput?.value?.trim() || ''
      });

      modalSystem.close();
      switchView(currentView);
      customAlert.success('Booking rescheduled and set to pending for confirmation.');
      
      // Hide loading screen
      if (typeof hideLoadingOverlay === 'function') {
        hideLoadingOverlay();
      }
    }
  } catch (error) {
    console.error('Error rescheduling booking:', error);
    customAlert.error('Error', 'Failed to reschedule booking. Please try again.');
    
    // Re-enable button on error
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
    }
    
    // Hide loading screen
    if (typeof hideLoadingOverlay === 'function') {
      hideLoadingOverlay();
    }
  }
}

function openCancelModal(bookingId) {
  showModal(`
    <h3>Cancel Appointment</h3>
    <p style="color:var(--gray-600);">Share the reason so the customer sees it on their dashboard.</p>
    <div class="form-group">
      <label class="form-label" for="adminCancelNote">Reason</label>
      <textarea id="adminCancelNote" class="form-input" rows="3" placeholder="e.g. Groomer is on emergency leave"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn btn-danger" onclick="handleAdminCancel('${bookingId}')">Cancel Booking</button>
      <button class="btn btn-outline" onclick="modalSystem.close()">Keep Booking</button>
    </div>
  `);
}

function handleAdminCancel(bookingId) {
  const note = document.getElementById('adminCancelNote')?.value?.trim() || 'Cancelled by admin';
  cancelBooking(bookingId, note, true);
  switchView(currentView);
  customAlert.success('Booking cancelled and customer notified.');
}

async function loadGalleryView() {
  const container = document.getElementById('galleryGrid');
  if (!container) return;

  container.innerHTML = '<p style="text-align: center; color: var(--gray-600);">Loading gallery...</p>';

  try {
    const bookings = await getBookings();
    const filterStatus = document.getElementById('galleryStatusFilter')?.value || 'confirmed';

    // Filter bookings based on selection
    let filteredBookings = bookings;
    if (filterStatus === 'with-images') {
      filteredBookings = bookings.filter(b => b.beforeImage || b.afterImage);
    } else if (filterStatus === 'featured') {
      filteredBookings = bookings.filter(b => b.isFeatured && (b.beforeImage || b.afterImage));
    } else {
      filteredBookings = bookings.filter(b => b.status === 'confirmed');
    }

    if (!filteredBookings.length) {
      container.innerHTML = '<p style="text-align: center; color: var(--gray-600);">No bookings found.</p>';
      return;
    }

    // Sort by date, newest first
    filteredBookings.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = filteredBookings.map(booking => `
      <div class="gallery-card" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; background: var(--bg-secondary); display: flex; flex-direction: column; gap: 0.75rem;">
        
        <!-- Booking Info -->
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 0.5rem;">
          <div>
            <div style="font-weight: 600; font-size: 0.95rem;">${escapeHtml(booking.petName || 'Pet')}</div>
            <div style="font-size: 0.85rem; color: var(--gray-600);">
              ${escapeHtml(booking.petType || 'Unknown')} • ${escapeHtml(booking.packageId || 'No Package')}
            </div>
            <div style="font-size: 0.85rem; color: var(--gray-600);">
              ${new Date(booking.date).toLocaleDateString()}
            </div>
          </div>
          <div style="text-align: right;">
            ${booking.isFeatured ? '<span style="background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); color: #333; padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600; display: inline-block; box-shadow: 0 2px 4px rgba(255,215,0,0.3);">⭐ Featured</span>' : ''}
          </div>
        </div>

        <!-- Image Preview -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; min-height: 100px;">
          ${booking.beforeImage ? `<img src="${booking.beforeImage}" alt="Before" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="openMediaModal('${booking.id}')">` : '<div style="background: var(--gray-200); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--gray-500); font-size: 0.85rem;">Before</div>'}
          ${booking.afterImage ? `<img src="${booking.afterImage}" alt="After" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="openMediaModal('${booking.id}')">` : '<div style="background: var(--gray-200); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--gray-500); font-size: 0.85rem;">After</div>'}
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: space-between;">
          <button class="btn btn-outline btn-sm" onclick="openMediaModal('${booking.id}')" style="flex: 1; min-width: 80px;">
            📸 Upload Photos
          </button>
          <button class="btn ${booking.isFeatured ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="toggleFeatureGallery('${booking.id}')" style="flex: 1; min-width: 80px;">
            ⭐ ${booking.isFeatured ? 'Unfeature' : 'Feature'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="handleDeleteFeaturedImages('${booking.id}')" style="flex: 1; min-width: 80px;" ${!booking.beforeImage && !booking.afterImage ? 'disabled' : ''}>
            🗑️ Delete
          </button>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error loading gallery:', error);
    container.innerHTML = '<p style="text-align: center; color: var(--error-color);">Error loading gallery. Please try again.</p>';
  }
}

async function toggleFeatureGallery(bookingId) {
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    if (booking.isFeatured) {
      await unmarkAsFeatured(bookingId);
      customAlert.success('Removed from featured');
    } else {
      if (!booking.beforeImage || !booking.afterImage) {
        customAlert.error('Please upload both before and after photos first');
        return;
      }
      await markAsFeatured(bookingId);
      customAlert.success('Added to featured');
    }

    loadGalleryView();
  } catch (error) {
    console.error('Error toggling feature:', error);
    customAlert.error('Error updating featured status');
  }
}

async function openMediaModal(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;
  showModal(`
    <h3>Attach Before & After · ${escapeHtml(booking.petName)}</h3>
    <div class="media-fieldset">
      <div class="form-group">
        <label class="form-label" for="beforeImageFile">Before Image</label>
        <input type="file" id="beforeImageFile" class="form-input" accept="image/*">
        <input type="text" id="beforeImageInput" class="form-input" style="margin-top:0.5rem;" value="${booking.beforeImage || ''}" placeholder="Or paste hosted image URL">
        <div class="media-preview" id="beforePreview">
          ${booking.beforeImage ? `<img src="${booking.beforeImage}" alt="Before photo">` : '<p>No photo yet.</p>'}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="afterImageFile">After Image</label>
        <input type="file" id="afterImageFile" class="form-input" accept="image/*">
        <input type="text" id="afterImageInput" class="form-input" style="margin-top:0.5rem;" value="${booking.afterImage || ''}" placeholder="Or paste hosted image URL">
        <div class="media-preview" id="afterPreview">
          ${booking.afterImage ? `<img src="${booking.afterImage}" alt="After photo">` : '<p>No photo yet.</p>'}
        </div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="handleMediaSubmit('${booking.id}')">Save Gallery</button>
      <button class="btn btn-outline" onclick="modalSystem.close()">Close</button>
    </div>
  `);

  document.getElementById('beforeImageFile')?.addEventListener('change', (event) => {
    handleMediaFileChange(event, 'beforeImageInput', 'beforePreview');
  });
  document.getElementById('afterImageFile')?.addEventListener('change', (event) => {
    handleMediaFileChange(event, 'afterImageInput', 'afterPreview');
  });
}

async function handleMediaSubmit(bookingId) {
  // Find and disable save button to prevent duplicates
  const saveBtn = document.querySelector('[onclick*="handleMediaSubmit"]')?.closest('.modal-actions')?.querySelector('button.btn-primary');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.6';
  }
  
  // Show loading screen (lazy - non-blocking)
  if (typeof showTableLoader === 'function') {
    showTableLoader('#galleryContainer');
  }
  
  try {
    const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB in bytes
    const beforeInput = document.getElementById('beforeImageInput');
    const afterInput = document.getElementById('afterImageInput');

    // Validate data URLs/inputs for size
    const beforeValue = beforeInput?.value?.trim() || '';
    const afterValue = afterInput?.value?.trim() || '';

    // Rough check: Data URLs are ~1.33x the original size
    if (beforeValue.length > MAX_FILE_SIZE * 1.5) {
      customAlert.error('Before image is too large (max 8 MB). Please choose a smaller file.');
      console.warn('Before image exceeds 8 MB limit. Size:', beforeValue.length);
      // Re-enable button on validation error
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
      }
      return;
    }
    if (afterValue.length > MAX_FILE_SIZE * 1.5) {
      customAlert.error('After image is too large (max 8 MB). Please choose a smaller file.');
      console.warn('After image exceeds 8 MB limit. Size:', afterValue.length);
      // Re-enable button on validation error
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
      }
      return;
    }

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      customAlert.error('Booking not found.');
      console.error('Booking not found for ID:', bookingId);
      return;
    }

    booking.beforeImage = beforeValue;
    booking.afterImage = afterValue;

    console.log(`[Media Upload] Saving booking ${bookingId} with images...`);
    console.log(`[Media Upload] Before image size: ${beforeValue.length} bytes`);
    console.log(`[Media Upload] After image size: ${afterValue.length} bytes`);

    await saveBookings(bookings);

    console.log(`[Media Upload] ✅ Successfully saved booking ${bookingId} to Firebase`);

    logBookingHistory({
      bookingId,
      action: 'Media Updated',
      message: 'Updated grooming gallery',
      actor: 'Admin'
    });
    modalSystem.close();
    customAlert.success('✅ Gallery updated for the customer!');
    await renderCommunityReviewFeed('adminReviewFeed', 6);
  } catch (error) {
    console.error(`[Media Upload] ❌ Failed to save booking ${bookingId}:`, error);
    customAlert.error('Failed to save gallery. Check console for details.');
    
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

function handleMediaFileChange(event, inputId, previewId) {
  const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
  const file = event.target.files?.[0];

  if (!file) {
    console.log(`[File Select] No file selected for ${inputId}`);
    return;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    customAlert.error(`File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Max 8 MB.`);
    console.warn(`[File Select] ❌ File exceeds 8 MB limit: ${file.name} (${file.size} bytes)`);
    event.target.value = ''; // Clear input
    return;
  }

  console.log(`[File Select] Reading file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const input = document.getElementById(inputId);
    if (input) {
      input.value = dataUrl;
      console.log(`[File Select] ✅ Converted to Base64 Data URL (${(dataUrl.length / 1024).toFixed(2)} KB) for ${inputId}`);
    }
    updateMediaPreview(previewId, dataUrl);
  };
  reader.onerror = (err) => {
    console.error(`[File Select] ❌ FileReader error for ${inputId}:`, err);
    customAlert.error('Failed to read file. Please try again.');
  };
  reader.readAsDataURL(file);
}

function updateMediaPreview(previewId, src) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  if (src) {
    preview.innerHTML = `<img src="${src}" alt="Uploaded preview">`;
  } else {
    preview.innerHTML = '<p>No photo yet.</p>';
  }
}

// Track if no-show submission is in progress
let isNoShowInProgress = false;

function openNoShowModal(bookingId) {
  // Reset flag when opening modal
  isNoShowInProgress = false;
  
  showModal(`
    <h3>Mark as No-show</h3>
    <p style="color:var(--gray-600);">This will cancel the booking, log a warning, and notify the customer.</p>
    <div class="modal-actions">
      <button class="btn btn-danger" id="noShowSubmitBtn" onclick="handleNoShowSubmit('${bookingId}')">Mark No-show</button>
      <button class="btn btn-outline" onclick="modalSystem.close()">Close</button>
    </div>
  `);
}

async function handleNoShowSubmit(bookingId) {
  // Prevent duplicate submissions
  if (isNoShowInProgress) {
    console.log('[handleNoShowSubmit] Already in progress, skipping');
    return;
  }
  
  isNoShowInProgress = true;
  
  // Disable button immediately
  const submitBtn = document.getElementById('noShowSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
  }
  
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      isNoShowInProgress = false;
      return;
    }
    
    // Check if already marked as no-show
    if (booking.status === 'Cancelled By Admin' && booking.cancellationNote?.includes('no-show')) {
      console.log('[handleNoShowSubmit] Booking already marked as no-show');
      modalSystem.close();
      customAlert.warning('Already Processed', 'This booking has already been marked as no-show.');
      isNoShowInProgress = false;
      return;
    }
    
    booking.status = 'Cancelled By Admin';
    booking.cancellationNote = 'Marked as no-show by admin';
    await saveBookings(bookings);
    
    const warningInfo = await incrementCustomerWarning(booking.userId, `No Show on ${formatDate(booking.date)} at ${formatTime(booking.time)}`);
    
    logBookingHistory({
      bookingId,
      action: 'No Show',
      message: 'Marked as no-show, warning issued',
      actor: 'Admin'
    });
    
    modalSystem.close();
    switchView(currentView);
    customAlert.warning(`No-show recorded. Customer warnings: ${warningInfo?.warnings || 0}/5`);
    renderBlockedCustomersPanel();
  } catch (error) {
    console.error('[handleNoShowSubmit] Error:', error);
    customAlert.error('Error', 'Failed to mark as no-show. Please try again.');
  } finally {
    isNoShowInProgress = false;
  }
}

// Groomer absences
function loadGroomerAbsencesView() {
  const absences = getStaffAbsences().sort((a, b) => b.createdAt - a.createdAt);
  renderGroomerAbsenceTable(absences);
}

function renderGroomerAbsenceTable(absences) {
  const container = document.getElementById('groomerAbsenceTable');
  if (!container) return;

  if (!absences.length) {
    container.innerHTML = '<p class="empty-state">No groomer absence requests yet.</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Groomer</th>
            <th>Date</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Proof</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${absences.map(absence => {
    const badgeClass = absence.status === 'approved'
      ? 'badge-confirmed'
      : absence.status === 'pending'
        ? 'badge-pending'
        : 'badge-cancelled';
    return `
              <tr>
                <td>${escapeHtml(absence.staffName)}</td>
                <td>${formatDate(absence.date)}</td>
                <td>${escapeHtml(absence.reason)}</td>
                <td><span class="badge ${badgeClass}">${escapeHtml(absence.status)}</span></td>
                <td>${absence.proofData ? `<button class="btn btn-outline btn-sm" onclick="previewAbsenceProof('${absence.id}')">View</button>` : '—'}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="openAbsenceDetail('${absence.id}')">Review</button>
                </td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function previewAbsenceProof(absenceId) {
  const absence = getStaffAbsences().find(a => a.id === absenceId);
  if (!absence || !absence.proofData) return;

  showModal(`
    <h3>Proof from ${escapeHtml(absence.staffName)}</h3>
    ${absence.proofData.includes('pdf')
      ? `<iframe src="${absence.proofData}" style="width:100%;height:400px;"></iframe>`
      : `<img src="${absence.proofData}" alt="Proof" style="width:100%;border-radius:var(--radius);">`}
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="modalSystem.close()">Close</button>
    </div>
  `);
}

function openAbsenceDetail(absenceId) {
  const absence = getStaffAbsences().find(a => a.id === absenceId);
  if (!absence) return;

  const canReview = absence.status === 'pending';
  showModal(`
    <h3>Review ${escapeHtml(absence.staffName)}</h3>
    <p><strong>Date:</strong> ${formatDate(absence.date)}</p>
    <p><strong>Reason:</strong> ${escapeHtml(absence.reason)}</p>
    ${absence.proofData ? `<div style="margin:1rem 0;">
      ${absence.proofData.includes('pdf')
        ? `<iframe src="${absence.proofData}" style="width:100%;height:320px;"></iframe>`
        : `<img src="${absence.proofData}" style="width:100%;border-radius:var(--radius);">`}
    </div>` : '<p>No proof submitted.</p>'}
    <div class="form-group">
      <label class="form-label" for="absenceNote">Admin Note</label>
      <textarea id="absenceNote" class="form-input" rows="3" placeholder="Add a note for the groomer">${absence.adminNote || ''}</textarea>
    </div>
    <div class="modal-actions">
      ${canReview ? `
        <button class="btn btn-success btn-sm" onclick="processAbsence('${absence.id}', 'approved')">Approve</button>
        <button class="btn btn-danger btn-sm" onclick="processAbsence('${absence.id}', 'rejected')">Reject</button>
      ` : ''}
      <button class="btn btn-outline btn-sm" onclick="modalSystem.close()">Close</button>
    </div>
  `);
}

function processAbsence(absenceId, status) {
  const absences = getStaffAbsences();
  const absence = absences.find(a => a.id === absenceId);
  if (!absence) return;

  const noteInput = document.getElementById('absenceNote');
  absence.status = status;
  absence.adminNote = noteInput ? noteInput.value.trim() : '';
  absence.reviewedAt = Date.now();

  saveStaffAbsences(absences);
  modalSystem.close();
  loadGroomerAbsencesView();
  updateGroomerAlertPanel(absences);
  showCustomAlert(`Marked as ${status}.`, 'success');
}

function updateGroomerAlertPanel(absences = getStaffAbsences()) {
  const container = document.getElementById('staffAlertPanel');
  if (!container) return;

  const pending = absences.filter(a => a.status === 'pending');
  if (pending.length === 0) {
    container.innerHTML = '<p class="empty-state" style="margin:0;">All caught up!</p>';
    return;
  }

  container.innerHTML = pending.slice(0, 3).map(absence => `
    <div class="sidebar-panel-item">
      <strong>${escapeHtml(absence.staffName || 'Groomer')}</strong>
      <p style="margin:0.25rem 0;">${formatDate(absence.date)}</p>
      <button class="btn btn-outline btn-sm" data-absence-id="${absence.id}">Review</button>
    </div>
  `).join('') + (pending.length > 3 ? `<p style="font-size:0.875rem;color:var(--gray-500);">+${pending.length - 3} more</p>` : '');

  container.querySelectorAll('[data-absence-id]').forEach(btn => {
    btn.addEventListener('click', () => openAbsenceDetail(btn.dataset.absenceId));
  });
}

async function renderBlockedCustomersPanel() {
  const container = document.getElementById('blockedCustomersPanel');
  if (!container) return;
  const blocked = (await getUsers()).filter(user => user.role === 'customer' && user.isBanned);
  const bookings = await getBookings();

  if (!blocked.length) {
    container.innerHTML = '<p class="empty-state" style="margin:0; font-size:0.85rem;">No blocked customers</p>';
    return;
  }

  container.innerHTML = blocked.map(user => {
    // Find no-show bookings for this user
    const noShowBookings = bookings.filter(b =>
      b.userId === user.id &&
      ['cancelledByAdmin'].includes(b.status) &&
      b.cancellationNote?.toLowerCase().includes('no-show')
    );

    return `
      <div class="sidebar-panel-item" style="margin-bottom:0.75rem; padding:0.75rem; background:var(--gray-50); border-radius:var(--radius-sm);">
        <strong>${escapeHtml(user.name)}</strong>
        <p style="margin:0.25rem 0; font-size:0.85rem; color:var(--gray-600);">${user.warningCount || 0}/5 warnings</p>
        ${noShowBookings.length ? `<p style="margin:0.25rem 0; font-size:0.85rem; color:var(--warning-600);">${noShowBookings.length} no-show(s)</p>` : ''}
        <div style="display:flex; gap:0.5rem; margin-top:0.5rem; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" data-lift-ban="${user.id}">Confirm Lift</button>
          ${noShowBookings.length ? `<button class="btn btn-outline btn-sm" onclick="viewNoShowBookings('${user.id}')">View Details</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-lift-ban]').forEach(btn => {
    btn.addEventListener('click', () => openLiftBanModal(btn.dataset.liftBan));
  });
}

async function openLiftBanModal(userId) {
  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;

  const banUpliftFee = typeof BAN_UPLIFT_FEE !== 'undefined' ? BAN_UPLIFT_FEE : 500;

  showModal(`
    <h3>Lift Ban for ${escapeHtml(user.name)}</h3>
    <p style="color: var(--gray-600); margin-bottom: 1rem;">
      ${user.warningCount || 0}/5 warnings · ${user.isBanned ? 'Currently banned' : 'Active'}
    </p>
    <div style="background: #fff3cd; padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; border-left: 4px solid #ff9800;">
      <p style="margin: 0; color: #000; font-weight: 600;">⚠️ Ban Uplift Fee Required</p>
      <p style="margin: 0.5rem 0 0 0; color: #333; font-size: 0.95rem;">
        Customer must pay <strong>₱${banUpliftFee}</strong> to lift the ban and reset warnings.
      </p>
    </div>
    <div class="form-group">
      <label style="font-weight: 600; color: var(--gray-900);">Verify Payment:</label>
      <div style="display: flex; gap: 0.5rem;">
        <input type="checkbox" id="banPaymentVerified" style="width: 20px; height: 20px; cursor: pointer;">
        <label for="banPaymentVerified" style="cursor: pointer; color: var(--gray-700);">
          Customer has paid ₱${banUpliftFee} ban uplift fee
        </label>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" id="liftBanConfirmBtn" disabled onclick="handleLiftBan('${userId}', true)">Confirm & Lift Ban</button>
      <button class="btn btn-outline" onclick="modalSystem.close()">Cancel</button>
    </div>
  `);

  // Enable/disable confirm button based on checkbox
  const checkbox = document.getElementById('banPaymentVerified');
  const confirmBtn = document.getElementById('liftBanConfirmBtn');
  if (checkbox && confirmBtn) {
    checkbox.addEventListener('change', function () {
      confirmBtn.disabled = !this.checked;
    });
  }
}

async function viewNoShowBookings(userId) {
  const bookings = await getBookings();
  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  const noShowBookings = bookings.filter(b =>
    b.userId === userId &&
    ['cancelledByAdmin'].includes(b.status) &&
    b.cancellationNote?.toLowerCase().includes('no-show')
  );

  if (!noShowBookings.length) {
    showCustomAlert('No no-show bookings found for this customer.', 'info');
    return;
  }

  const bookingsList = noShowBookings.map(b => `
    <div style="padding:0.75rem; margin-bottom:0.5rem; background:var(--gray-50); border-radius:var(--radius-sm);">
      <strong>${escapeHtml(b.petName)}</strong><br>
      <span style="font-size:0.85rem; color:var(--gray-600);">
        ${formatDate(b.date)} at ${formatTime(b.time)}<br>
        ${b.groomerName ? `Groomer: ${escapeHtml(b.groomerName)}` : ''}
      </span>
      <div style="margin-top:0.5rem;">
        <button class="btn btn-danger btn-sm" onclick="cancelBookingForDate('${b.date}', '${b.groomerId || ''}')">Cancel Date/Groomer</button>
      </div>
    </div>
  `).join('');

  showModal(`
    <h3>No-Show Bookings for ${escapeHtml(user?.name || 'Customer')}</h3>
    <div style="max-height:400px; overflow-y:auto;">
      ${bookingsList}
    </div>
    <div class="modal-actions" style="margin-top:1rem;">
      <button class="btn btn-outline" onclick="modalSystem.close()">Close</button>
    </div>
  `);
}

async function cancelBookingForDate(date, groomerId) {
  const bookings = await getBookings();
  let cancelled = 0;

  bookings.forEach(booking => {
    if (booking.date === date &&
      (!groomerId || booking.groomerId === groomerId) &&
      !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(booking.status)) {
      booking.status = 'cancelledByAdmin';
      booking.cancellationNote = `Cancelled due to no-show on ${formatDate(date)}`;
      cancelled++;
      logBookingHistory({
        bookingId: booking.id,
        action: 'Cancelled',
        message: booking.cancellationNote,
        actor: 'Admin'
      });
    }
  });

  if (cancelled > 0) {
    saveBookings(bookings);
    showCustomAlert(`${cancelled} booking(s) cancelled for ${formatDate(date)}${groomerId ? ' with selected groomer' : ''}.`, 'success');
    modalSystem.close();
    loadOverview();
  } else {
    showCustomAlert('No bookings found to cancel.', 'info');
  }
}

async function handleLiftBan(userId, skipPrompt = false) {
  const users = await getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  if (!skipPrompt) {
    try {
      const confirmed = await customAlert.confirm('Confirm', `Confirm that ${user.name} paid the ₱500 ban uplift fee and reset warnings to 0?`);
      if (!confirmed) return;
    } catch (e) {
      // Fallback to browser confirm if customAlert fails
      if (!confirm(`Confirm that ${user.name} paid the ₱500 ban uplift fee and reset warnings to 0?`)) return;
    }
  }
  await liftCustomerBan(userId, {
    reason: 'Admin cleared ban after ₱500 payment verified',
    resetWarnings: true
  });
  await renderBlockedCustomersPanel();
  await renderLiftBanPanel();
  modalSystem.close();
  showCustomAlert(`✓ ${user.name} ban lifted. Warnings reset to 0.`, 'success');
}

// Booking history log view
let adminHistoryState = {
  page: 1,
  pageSize: 5,
  searchTerm: '',
  sortOrder: 'desc',
  sortBy: 'date'  // Sort field: 'date', 'status', 'customer', 'amount'
};

async function renderBookingHistory() {
  const container = document.getElementById('bookingHistoryTable');
  if (!container) return;

  let rawHistory = getBookingHistory();
  const bookings = await getBookings();

  // If history is empty but we have bookings, generate history from bookings for display
  if (!rawHistory.length && bookings.length > 0) {
    rawHistory = bookings.map(b => ({
      id: 'hist-' + b.id,
      bookingId: b.id,
      timestamp: b.createdAt || Date.now(),
      action: 'Created',
      message: `Booking created for ${b.customerName} - ${b.petName}`,
      actor: 'System'
    }));
  }

  // Group by bookingId to show only the latest entry per booking
  let history = [];
  const seenBookings = new Set();
  for (const entry of rawHistory) {
    if (!seenBookings.has(entry.bookingId)) {
      seenBookings.add(entry.bookingId);
      history.push(entry);
    }
  }

  // Apply search filter
  const searchTerm = adminHistoryState.searchTerm || '';
  if (searchTerm) {
    history = history.filter(h => {
      const booking = bookings.find(b => b.id === h.bookingId);
      const displayCode = booking ? (typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : (booking.shortId || booking.id)) : h.bookingId;
      const action = (h.action || '').toLowerCase();
      const details = (h.message || h.note || '').toLowerCase();
      const customerName = (booking?.customerName || '').toLowerCase();
      const petName = (booking?.petName || '').toLowerCase();

      return displayCode.toLowerCase().includes(searchTerm) ||
        action.includes(searchTerm) ||
        details.includes(searchTerm) ||
        customerName.includes(searchTerm) ||
        petName.includes(searchTerm);
    });
  }

  // Apply sort based on sortBy field and sortOrder
  const sortBy = adminHistoryState.recentActive ? 'recent' : (adminHistoryState.sortBy || 'date');
  const sortOrder = adminHistoryState.sortOrder || 'desc';

  history.sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case 'recent':
        // Sort by timestamp (newest first) - always descending
        aValue = a.timestamp;
        bValue = b.timestamp;
        return bValue - aValue;
      case 'date':
        aValue = a.timestamp;
        bValue = b.timestamp;
        break;
      case 'status':
        const bookingA = bookings.find(bk => bk.id === a.bookingId);
        const bookingB = bookings.find(bk => bk.id === b.bookingId);
        aValue = (bookingA?.status || '').toLowerCase();
        bValue = (bookingB?.status || '').toLowerCase();
        break;
      case 'customer':
        const custA = bookings.find(bk => bk.id === a.bookingId);
        const custB = bookings.find(bk => bk.id === b.bookingId);
        aValue = (custA?.customerName || '').toLowerCase();
        bValue = (custB?.customerName || '').toLowerCase();
        break;
      case 'amount':
        const amtA = bookings.find(bk => bk.id === a.bookingId);
        const amtB = bookings.find(bk => bk.id === b.bookingId);
        aValue = amtA?.totalPrice || amtA?.cost?.subtotal || 0;
        bValue = amtB?.totalPrice || amtB?.cost?.subtotal || 0;
        break;
      default:
        aValue = a.timestamp;
        bValue = b.timestamp;
    }

    // Handle string comparisons
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    // Handle numeric comparisons
    if (sortOrder === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  if (!history.length) {
    container.innerHTML = '<p class="empty-state">No booking activity yet.</p>';
    const controls = document.getElementById('historyControls');
    if (controls) controls.innerHTML = '';
    return;
  }

  // Pagination controls
  const totalPages = Math.ceil(history.length / adminHistoryState.pageSize);
  const start = (adminHistoryState.page - 1) * adminHistoryState.pageSize;
  const end = start + adminHistoryState.pageSize;
  const currentHistory = history.slice(start, end);

  const controls = document.getElementById('historyControls');
  if (controls) {
    controls.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <input type="text" id="historySearch" class="form-input" placeholder="🔍 Search by booking ID, customer, pet, or action..." style="flex: 1; min-width: 200px;" onkeyup="filterAdminHistory()">
          <button class="btn btn-sm" style="background: ${adminHistoryState.recentActive ? '#007bff' : '#e0e0e0'}; color: ${adminHistoryState.recentActive ? 'white' : '#333'}; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: 600;" onclick="toggleHistoryRecent()">
            🕐 Recent
          </button>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label for="historySortField" style="font-size: 0.9rem; color: var(--gray-600);">Sort by:</label>
            <select id="historySortField" class="form-select" style="width: auto; padding: 0.5rem; ${adminHistoryState.recentActive ? 'opacity: 0.5; pointer-events: none;' : ''}" onchange="changeHistorySortField(this.value)" ${adminHistoryState.recentActive ? 'disabled' : ''}>
              <option value="date" ${adminHistoryState.sortBy === 'date' ? 'selected' : ''}>📅 Date</option>
              <option value="status" ${adminHistoryState.sortBy === 'status' ? 'selected' : ''}>📊 Status</option>
              <option value="customer" ${adminHistoryState.sortBy === 'customer' ? 'selected' : ''}>👤 Customer</option>
              <option value="amount" ${adminHistoryState.sortBy === 'amount' ? 'selected' : ''}>💰 Amount</option>
            </select>
          </div>
          <select id="historySortOrder" class="form-select" style="width: auto; padding: 0.5rem; ${adminHistoryState.recentActive ? 'opacity: 0.5; pointer-events: none;' : ''}" onchange="changeHistorySortOrder(this.value)" ${adminHistoryState.recentActive ? 'disabled' : ''}>
            <option value="desc" ${adminHistoryState.sortOrder === 'desc' ? 'selected' : ''}>⬇️ Newest First</option>
            <option value="asc" ${adminHistoryState.sortOrder === 'asc' ? 'selected' : ''}>⬆️ Oldest First</option>
          </select>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label for="historyPageSize" style="font-size: 0.9rem; color: var(--gray-600);">Show:</label>
            <select id="historyPageSize" class="form-select" style="width: auto; padding: 0.5rem;" onchange="changeHistoryPageSize(this.value)">
              <option value="3" ${adminHistoryState.pageSize === 3 ? 'selected' : ''}>3</option>
              <option value="5" ${adminHistoryState.pageSize === 5 ? 'selected' : ''}>5</option>
              <option value="10" ${adminHistoryState.pageSize === 10 ? 'selected' : ''}>10</option>
              <option value="20" ${adminHistoryState.pageSize === 20 ? 'selected' : ''}>20</option>
            </select>
            <span style="font-size: 0.9rem; color: var(--gray-600);">entries</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.9rem; color: var(--gray-600);">
              Showing ${start + 1} to ${Math.min(end, history.length)} of ${history.length}
            </span>
            ${totalPages > 1 ? `
              <button class="btn btn-outline btn-sm" onclick="changeHistoryPage(${adminHistoryState.page - 1})" ${adminHistoryState.page === 1 ? 'disabled' : ''}>Previous</button>
              <span style="font-size: 0.9rem; color: var(--gray-600);">Page ${adminHistoryState.page} of ${totalPages}</span>
              <button class="btn btn-outline btn-sm" onclick="changeHistoryPage(${adminHistoryState.page + 1})" ${adminHistoryState.page === totalPages ? 'disabled' : ''}>Next</button>
            ` : ''}
          </div>
        </div>
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
            <th>Total</th>
            <th>Manage</th>
          </tr>
        </thead>
        <tbody>
          ${currentHistory.map(entry => {
    const booking = bookings.find(b => b.id === entry.bookingId);
    const displayCode = booking
      ? (typeof getBookingDisplayCode === 'function'
        ? getBookingDisplayCode(booking)
        : (booking.shortId || booking.id))
      : entry.bookingId;
    return `
            <tr>
              <td>${new Date(entry.timestamp).toLocaleString()}</td>
              <td>${escapeHtml(displayCode)}</td>
              <td>${escapeHtml(entry.action)}${entry.actor ? ` (${escapeHtml(entry.actor)})` : ''}</td>
              <td>
                ${formatHistoryDetails(entry, bookings)}
              </td>
              <td>${formatHistoryAmount(entry.bookingId, bookings)}</td>
              <td>${renderHistoryActions(entry.bookingId, bookings)}</td>
            </tr>
          `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('[data-history-cancel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const bookingId = btn.dataset.historyCancel;
      cancelBooking(bookingId);
    });
  });
}

function changeHistoryPageSize(newSize) {
  adminHistoryState.pageSize = parseInt(newSize);
  adminHistoryState.page = 1;
  renderBookingHistory();
}

function changeHistoryPage(newPage) {
  const history = getBookingHistory();
  const totalPages = Math.ceil(history.length / adminHistoryState.pageSize);
  if (newPage >= 1 && newPage <= totalPages) {
    adminHistoryState.page = newPage;
    renderBookingHistory();
  }
}

// Filter and sort booking history
function filterAdminHistory() {
  const searchInput = document.getElementById('historySearch');
  const sortOrder = document.getElementById('historySortOrder');

  if (searchInput && sortOrder) {
    adminHistoryState.searchTerm = searchInput.value.toLowerCase();
    adminHistoryState.sortOrder = sortOrder.value;
    adminHistoryState.page = 1;
    renderBookingHistory();
  }
}
window.filterAdminHistory = filterAdminHistory;

// Change sort field for booking history
function changeHistorySortField(field) {
  adminHistoryState.sortBy = field;
  adminHistoryState.recentActive = false; // Disable Recent when changing sort field
  adminHistoryState.page = 1;  // Reset to page 1 when sort changes
  renderBookingHistory();
}
window.changeHistorySortField = changeHistorySortField;

// Change sort order for booking history
function changeHistorySortOrder(order) {
  adminHistoryState.sortOrder = order;
  adminHistoryState.recentActive = false; // Disable Recent when changing sort order
  adminHistoryState.page = 1;  // Reset to page 1 when sort changes
  renderBookingHistory();
}
window.changeHistorySortOrder = changeHistorySortOrder;

// Toggle Recent button (on/off)
window.toggleHistoryRecent = function () {
  adminHistoryState.recentActive = !adminHistoryState.recentActive;
  adminHistoryState.page = 1;
  renderBookingHistory();
};

function getBookingForHistory(bookingId, bookings = []) {
  // Try exact ID match first
  let booking = bookings.find(b => b.id === bookingId);
  if (booking) return booking;

  // Try shortId match
  booking = bookings.find(b => b.shortId === bookingId);
  if (booking) return booking;

  // Try matching the display code
  booking = bookings.find(b => {
    const displayCode = typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(b) : (b.shortId || b.id);
    return displayCode === bookingId;
  });

  return booking || null;
}

function formatHistoryDetails(entry, bookings = []) {
  const booking = getBookingForHistory(entry.bookingId, bookings);
  let detailText = escapeHtml(entry.message || entry.note || '');
  if (booking) {
    const status = formatBookingStatus(booking.status);
    const cost = booking.cost;
    const total = booking.totalPrice || cost?.subtotal || 0;
    const balance = booking.balanceOnVisit ?? cost?.balanceOnVisit ?? 0;
    const bookingFee = cost?.bookingFee || 100;
    const services = Array.isArray(booking.singleServices) && booking.singleServices.length
      ? booking.singleServices.map(getSingleServiceLabel).join(', ')
      : '';
    const addOns = cost?.addOns?.length
      ? cost.addOns.map(addon => `${escapeHtml(addon.label)} (${formatCurrency(addon.price)})`).join(', ')
      : (booking.addOns?.length ? escapeHtml(booking.addOns.join(', ')) : '');

    detailText += `
      <div style="font-size:0.85rem; color:var(--gray-600); margin-top:0.35rem;">
        <strong>Status:</strong> ${escapeHtml(status)}<br>
        ${booking.petName ? `<strong>Pet:</strong> ${escapeHtml(booking.petName)}<br>` : ''}
        ${booking.packageName ? `<strong>Package:</strong> ${escapeHtml(booking.packageName)}<br>` : ''}
        ${cost?.weightLabel ? `<strong>Weight:</strong> ${escapeHtml(cost.weightLabel)}<br>` : ''}
        ${services ? `<strong>Services:</strong> ${escapeHtml(services)}<br>` : ''}
        ${addOns ? `<strong>Add-ons:</strong> ${addOns}<br>` : ''}
        ${total ? `<strong>Subtotal:</strong> ${formatCurrency(total)}<br>` : ''}
        ${booking.status === 'pending' && balance ? `<strong>Balance on Visit:</strong> ${formatCurrency(balance)}<br>` : ''}
        ${(booking.status === 'confirmed' || booking.status === 'completed') && balance ? `<strong>Remaining Balance:</strong> ${formatCurrency(balance)}<br>` : ''}
        ${cost?.totalAmount ? `<strong>Total Amount:</strong> ${formatCurrency(cost.totalAmount)}` : total ? `<strong>Total Amount:</strong> ${formatCurrency(total)}` : ''}
      </div>
    `;
  }
  return detailText || '—';
}

function formatHistoryAmount(bookingId, bookings = []) {
  const booking = getBookingForHistory(bookingId, bookings);
  if (!booking) return '—';

  // Try multiple ways to get the total price
  const totalPrice = booking.totalPrice || booking.cost?.subtotal || booking.cost?.totalAmount || 0;

  if (totalPrice > 0) {
    return `<button class="btn btn-sm" style="background: #2e7d32; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 0.25rem; cursor: pointer; font-weight: 600;" onclick="openPricingBreakdownModal('${booking.id}')">${formatCurrency(totalPrice)}</button>`;
  }

  // Fallback: calculate from cost object
  const cost = booking.cost;
  if (cost) {
    const subtotal = cost.subtotal || 0;
    const bookingFee = cost.bookingFee || 100;
    const total = subtotal + bookingFee;
    if (total > 0) {
      return `<button class="btn btn-sm" style="background: #2e7d32; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 0.25rem; cursor: pointer; font-weight: 600;" onclick="openPricingBreakdownModal('${booking.id}')">${formatCurrency(total)}</button>`;
    }
  }

  return '—';
}

function renderHistoryActions(bookingId, bookings = []) {
  const booking = getBookingForHistory(bookingId, bookings);
  if (!booking) return '—';

  const actions = [];

  if (booking.status === 'pending') {
    actions.push(`<button class="btn btn-success btn-sm" onclick="protectedConfirmBooking('${bookingId}')">Approve</button>`);
  }

  if (['pending', 'confirmed', 'completed'].includes(booking.status)) {
    actions.push(`<button class="btn btn-secondary btn-sm" onclick="protectedOpenRescheduleModal('${bookingId}')">Resched</button>`);
  }

  if (['pending', 'confirmed'].includes(booking.status)) {
    actions.push(`<button class="btn btn-danger btn-sm" onclick="protectedOpenCancelModal('${bookingId}')">Cancel</button>`);
  }

  if (booking.status === 'confirmed') {
    actions.push(`<button class="btn btn-warning btn-sm" onclick="openNoShowModal('${bookingId}')">No Show</button>`);
  }

  if (actions.length === 0) {
    return '<span style="color:var(--gray-500); font-size:0.85rem;">No actions</span>';
  }

  return actions.join(' ');
}

function getSingleServiceLabel(serviceId) {
  const pricing = window.SINGLE_SERVICE_PRICING || {};
  return pricing[serviceId]?.label || serviceId;
}

/**
 * Legacy modal wrapper - converts old showModal calls to ModalSystem
 * This maintains backward compatibility while using the new modal system
 * Note: closeModal() has been removed - use modalSystem.close() directly
 */
function showModal(content, options = {}) {
  if (typeof modalSystem === 'undefined') {
    console.error('ModalSystem not loaded');
    return;
  }

  // Store the content for reference
  window._currentModalContent = content;

  // Create a container element for the HTML content
  const contentElement = document.createElement('div');
  contentElement.innerHTML = content;

  // Show modal with the HTML content
  const modalConfig = {
    content: contentElement,
    actions: [],
    ...options
  };
  
  // Store the modal config for custom styling
  window._currentModalConfig = modalConfig;
  
  // Show modal with the HTML content
  const promise = modalSystem.show(modalConfig);
  
  // Apply custom width if specified
  if (options.maxWidth) {
    setTimeout(() => {
      const dialog = document.querySelector('.modal-dialog');
      if (dialog) {
        dialog.style.maxWidth = options.maxWidth;
      }
    }, 0);
  }
  
  return promise;
}

// modalSystem.close() removed - use modalSystem.close() directly

/**
 * Open Add Booking Fee Modal
 * Allows admin to add a booking fee to a pending booking
 */
async function openAddBookingFeeModal(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);

  if (!booking) {
    showCustomAlert('❌ Booking not found', 'error');
    return;
  }

  // Check if booking is pending
  if (booking.status !== 'pending') {
    showCustomAlert('❌ Can only add booking fee to pending bookings', 'error');
    return;
  }

  const bookingCode = typeof getBookingDisplayCode === 'function'
    ? getBookingDisplayCode(booking)
    : (booking.shortId || booking.id);

  // Calculate subtotal (handle single service bookings)
  const isSingleServiceBooking = booking.packageId === 'single-service';
  const packagePrice = isSingleServiceBooking ? 0 : (booking.cost?.packagePrice || booking.totalPrice || 0);
  const servicesTotal = (booking.cost?.services || []).reduce((sum, s) => sum + (s.price || 0), 0);
  const addOnsTotal = (booking.addOns || []).reduce((sum, addon) => sum + (parseFloat(addon.price) || 0), 0);
  const subtotal = packagePrice + servicesTotal + addOnsTotal;

  // Get current booking fee
  const currentFee = booking.cost?.bookingFee || 0;

  const modalContent = `
    <div style="max-width: 500px;">
      <h3 style="margin-top: 0; margin-bottom: 1.5rem; color: var(--gray-900);">Add Booking Fee</h3>
      
      <div style="background: var(--gray-50); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1.5rem; border: 1px solid var(--gray-200);">
        <p style="margin: 0 0 0.5rem 0; color: var(--gray-700);"><strong>Booking Code:</strong> ${escapeHtml(bookingCode)}</p>
        <p style="margin: 0 0 0.5rem 0; color: var(--gray-700);"><strong>Customer:</strong> ${escapeHtml(booking.customerName)}</p>
        <p style="margin: 0 0 0.5rem 0; color: var(--gray-700);"><strong>Pet:</strong> ${escapeHtml(booking.petName)}</p>
        <p style="margin: 0; color: var(--gray-700);"><strong>Subtotal:</strong> ${formatCurrency(subtotal)}</p>
      </div>
      
      ${currentFee > 0 ? `
        <div style="background: #fff3cd; padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; border-left: 4px solid #ff9800;">
          <p style="margin: 0; color: var(--gray-900);">⚠️ Current booking fee: ${formatCurrency(currentFee)}</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: var(--gray-700);">Entering a new amount will replace the current fee.</p>
        </div>
      ` : ''}
      
      <div style="margin-bottom: 1rem;">
        <label for="bookingFeeAmount" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--gray-900);">
          Booking Fee Amount (₱)
        </label>
        <input 
          type="number" 
          id="bookingFeeAmount" 
          class="form-input" 
          placeholder="Enter amount (e.g., 100)" 
          min="0.01" 
          step="0.01"
          value="${currentFee > 0 ? currentFee : ''}"
          style="width: 100%; padding: 0.75rem; font-size: 1rem;"
        />
        <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: var(--gray-600);">
          This amount will be deducted from the total when calculating the amount to pay on visit.
        </p>
      </div>
      
      <div id="bookingFeeWarning" style="display: none; background: #fff3cd; padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; border-left: 4px solid #ff9800;">
        <p style="margin: 0; color: var(--gray-900); font-weight: 600;">⚠️ Warning</p>
        <p id="bookingFeeWarningText" style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: var(--gray-700);"></p>
      </div>
      
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem;">
        <button class="btn btn-outline" onclick="modalSystem.close()">Cancel</button>
        <button class="btn btn-primary" onclick="saveBookingFee('${bookingId}', ${subtotal})">
          💾 Save Booking Fee
        </button>
      </div>
    </div>
  `;

  showModal(modalContent);

  // Add input validation
  setTimeout(() => {
    const input = document.getElementById('bookingFeeAmount');
    const warning = document.getElementById('bookingFeeWarning');
    const warningText = document.getElementById('bookingFeeWarningText');

    if (input && warning && warningText) {
      input.addEventListener('input', function () {
        const amount = parseFloat(this.value);

        if (isNaN(amount) || amount <= 0) {
          warning.style.display = 'none';
          return;
        }

        if (amount > subtotal) {
          warning.style.display = 'block';
          warningText.textContent = `Booking fee (₱${amount.toFixed(2)}) exceeds subtotal (₱${subtotal.toFixed(2)}). Amount to pay on visit will be ₱0.`;
        } else {
          warning.style.display = 'none';
        }
      });

      // Focus the input
      input.focus();
    }
  }, 100);
}

/**
 * Save Booking Fee
 * Validates and saves the booking fee to the booking
 */
async function saveBookingFee(bookingId, subtotal) {
  const input = document.getElementById('bookingFeeAmount');

  if (!input) {
    showCustomAlert('❌ Error: Input field not found', 'error');
    return;
  }

  const amount = parseFloat(input.value);

  // Validate amount
  if (isNaN(amount) || amount <= 0) {
    showCustomAlert('❌ Please enter a valid booking fee amount greater than 0', 'error');
    input.focus();
    return;
  }

  try {
    // Get bookings
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);

    if (!booking) {
      showCustomAlert('❌ Booking not found', 'error');
      modalSystem.close();
      return;
    }

    // Ensure cost object exists
    if (!booking.cost) {
      booking.cost = {};
    }

    // Save booking fee
    booking.cost.bookingFee = Math.round(amount * 100) / 100;
    booking.bookingFeeAddedAt = new Date().toISOString();
    booking.bookingFeeAddedBy = 'admin'; // TODO: Get actual admin ID

    // Calculate amount to pay on arrival (but don't change total)
    booking.cost.amountToPayOnArrival = Math.max(0, subtotal - booking.cost.bookingFee);

    // Auto-confirm if booking is pending and fee is paid
    const wasConfirmed = booking.status === 'confirmed';
    if (booking.status === 'pending') {
      booking.status = 'confirmed';
      booking.confirmedAt = new Date().toISOString();
    }

    // ============================================
    // 💳 PAYMENT HISTORY LOGGING
    // ============================================
    // Log payment (booking fee) to booking history
    // Tracks: amount paid, timestamp, proof status
    // ============================================
    if (!booking.history) {
      booking.history = [];
    }

    booking.history.push({
      action: 'payment_received',
      timestamp: Date.now(),
      paymentMethod: booking.paymentChoice || 'unknown',
      paymentAmount: booking.cost.bookingFee,
      subtotal: subtotal,
      bookingFee: booking.cost.bookingFee,
      amountToPayOnArrival: booking.cost.amountToPayOnArrival,
      totalAmount: booking.cost.subtotal,
      hasProofOfPayment: !!booking.proofOfPaymentImage,
      confirmedBy: 'admin',
      message: `Payment received: ${formatCurrency(booking.cost.bookingFee)} (${booking.paymentChoice === 'payNow' ? 'Pay Now' : 'Pay Later'})`
    });

    // Save to database
    saveBookings(bookings);

    // Log history
    logBookingHistory({
      bookingId,
      action: 'Booking Fee Added',
      message: `Booking fee of ${formatCurrency(booking.cost.bookingFee)} added. Amount to pay on visit: ${formatCurrency(booking.cost.amountToPayOnArrival)}${!wasConfirmed && booking.status === 'confirmed' ? '. Booking auto-confirmed.' : ''}`,
      actor: 'Admin'
    });

    // Close modal
    modalSystem.close();

    // Refresh the appropriate view
    if (currentView === 'pending') {
      loadPendingBookings();
    } else if (currentView === 'confirmed') {
      loadConfirmedBookings();
    } else {
      loadOverview();
    }

    // Show success message with custom alert
    const confirmMsg = !wasConfirmed && booking.status === 'confirmed' ? ' Booking auto-confirmed! ' : '';
    showCustomAlert(` Booking fee of ${formatCurrency(booking.cost.bookingFee)} added successfully!${confirmMsg}`, 'success');

  } catch (error) {
    console.error('Error saving booking fee:', error);
    showCustomAlert(' Failed to save booking fee. Please try again.', 'error');
  }
}

// Make functions globally available
window.openAddBookingFeeModal = openAddBookingFeeModal;
window.saveBookingFee = saveBookingFee;

// ============================================
// ✅ CONFIRM BOOKING (PENDING → CONFIRMED)
// ============================================
// Moves booking from pending to confirmed status
// Requirements:
// - Groomer must be assigned
// - Price breakdown must be calculated
// - Customer notification is sent
// - Booking fee is tracked (if paid)
// ============================================
async function confirmBooking(bookingId) {
  // ============================================
  // 🛡️ DATABASE-BACKED LOCK - Prevent duplicate confirms
  // ============================================
  if (typeof isActionLocked === 'function' && isActionLocked('confirm', bookingId)) {
    console.log('[confirmBooking] BLOCKED - Action already in progress');
    customAlert.warning('Please Wait', 'This booking is being processed. Please wait...');
    return;
  }
  
  // Acquire lock
  let lockToken = null;
  if (typeof acquireActionLock === 'function') {
    lockToken = acquireActionLock('confirm', bookingId);
    if (!lockToken) {
      console.log('[confirmBooking] BLOCKED - Could not acquire lock');
      customAlert.warning('Please Wait', 'Another action is in progress. Please wait...');
      return;
    }
  }
  
  // Show loading screen (full-screen overlay)
  if (typeof showGlobalLoader === 'function') {
    showGlobalLoader('Confirming booking...');
  }
  
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);

    if (!booking) return;

    // ============================================
    // 📝 UPDATE BOOKING STATUS
    // ============================================
    // Status: pending → confirmed
    // Timestamp: Record confirmation time
    // ============================================
    booking.status = 'confirmed';
    booking.confirmedAt = Date.now();
    
    // ============================================
    // 🔔 CUSTOMER NOTIFICATION
    // ============================================
    // Send notification to customer about confirmation
    // Includes: Pet name, date, groomer name
    // Customer will see this in their dashboard
    // ============================================
    booking.customerNotification = {
      type: 'confirmed',
      message: `Your booking for ${booking.petName || 'your pet'} on ${formatDate(booking.date)} has been confirmed! Groomer: ${booking.groomerName || 'TBD'}`,
      createdAt: Date.now(),
      seen: false
    };

    // ============================================
    // 💰 CALCULATE PRICE BREAKDOWN
    // ============================================
    // Ensure cost object exists and has correct structure
    if (!booking.cost) {
      booking.cost = {};
    }

    // ============================================
    // 📊 PRICE COMPONENTS
    // ============================================
    // 1. Package Price (0 for single services)
    // 2. Services Total (for single service bookings)
    // 3. Add-ons Total
    // 4. Subtotal = Package + Services + Add-ons
    // 5. Booking Fee (if paid, doesn't change total)
    // ============================================
    const isSingleServiceBooking = booking.packageId === 'single-service';
    const packagePrice = isSingleServiceBooking ? 0 : (booking.cost.packagePrice || booking.totalPrice || 0);
    const servicesTotal = (booking.cost?.services || []).reduce((sum, s) => sum + (s.price || 0), 0);
    const addOnsTotal = (booking.addOns || []).reduce((sum, addon) => sum + (parseFloat(addon.price) || 0), 0);
    booking.cost.subtotal = packagePrice + servicesTotal + addOnsTotal;
    booking.cost.totalAmount = booking.cost.subtotal;

    // ============================================
    // 🎫 BOOKING FEE TRACKING
    // ============================================
    // Booking fee is paid upfront (if applicable)
    // Doesn't change total amount
    // Deducted from amount to pay on arrival
    // ============================================
    if (!booking.cost.bookingFee) {
      booking.cost.bookingFee = 0;
    }

    // Calculate amount to pay on visit
    booking.cost.amountToPayOnArrival = Math.max(0, booking.cost.subtotal - booking.cost.bookingFee);

    // ============================================
    // 💳 PAYMENT HISTORY LOGGING
    // ============================================
    // Log payment confirmation to booking history
    // Tracks: payment method, amount, timestamp
    // ============================================
    if (!booking.history) {
      booking.history = [];
    }

    booking.history.push({
      action: 'payment_confirmed',
      timestamp: Date.now(),
      paymentMethod: booking.paymentChoice || 'unknown',
      paymentAmount: booking.cost.bookingFee || 0,
      subtotal: booking.cost.subtotal,
      bookingFee: booking.cost.bookingFee || 0,
      amountToPayOnArrival: booking.cost.amountToPayOnArrival,
      totalAmount: booking.cost.totalAmount,
      hasProofOfPayment: !!booking.proofOfPaymentImage,
      confirmedBy: 'admin',
      message: `Payment confirmed - ${booking.paymentChoice === 'payNow' ? 'Pay Now' : 'Pay Later'} booking`
    });

    await saveBookings(bookings);
    logBookingHistory({
      bookingId,
      action: 'Confirmed',
      message: `Confirmed and moved to In Progress with ${booking.groomerName} for ${formatDate(booking.date)} at ${formatTime(booking.time)}`,
      actor: 'Admin'
    });
    
    // Show success alert first
    customAlert.success('Booking confirmed and moved to In Progress!');
    
    // Then close modal and switch view
    modalSystem.close();
    switchView('inprogress');
    
    // Release lock with success
    if (typeof releaseActionLock === 'function' && lockToken) {
      releaseActionLock('confirm', bookingId, lockToken, 'success');
    }
  } catch (error) {
    console.error('Error confirming booking:', error);
    customAlert.error('Error', 'Failed to confirm booking. Please try again.');
    
    // Release lock with failure
    if (typeof releaseActionLock === 'function' && lockToken) {
      releaseActionLock('confirm', bookingId, lockToken, 'failed');
    }
  } finally {
    // Hide loading screen
    if (typeof hideGlobalLoader === 'function') {
      hideGlobalLoader();
    }
  }
}

// Complete booking (grooming service finished)
async function completeBooking(bookingId) {
  // Use protected action wrapper to prevent duplicates
  await protectedAction(() => {
    // Show modal for grooming notes
    showGroomingNotesModal(bookingId);
  }, 'completeBooking');
}

// Show modal for entering grooming notes
async function showGroomingNotesModal(bookingId) {
  let bookings = [];
  try {
    bookings = typeof getBookings === 'function' ? await getBookings() : [];
  } catch (e) {
    console.warn('showGroomingNotesModal: getBookings failed', e);
    bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
  }

  if (!Array.isArray(bookings)) bookings = [];

  const booking = bookings.find(b => b.id === bookingId);

  if (!booking) {
    showCustomAlert('Booking not found', 'error');
    return;
  }

  // Auto-extract preferred cut from customer's notes - check Notes for Groomer FIRST, then Medical Conditions
  let notesText = booking.bookingNotes || '';

  // If no bookingNotes, try other notes fields including medical (in case customer put cut there)
  if (!notesText) {
    notesText = booking.notes || booking.profile?.notes || booking.profile?.bookingNotes || '';
  }

  // Pass booking object to extractPreferredCut for ID-based lookup
  const preferredCut = extractPreferredCut(notesText, booking);
  const prefilledNotes = booking.groomingNotes || (preferredCut ? `${preferredCut}` : notesText);

  const modalHTML = `
    <div class="modal-overlay" id="groomingNotesOverlay" onclick="closeGroomingNotesModal()">
      <div class="modal" onclick="event.stopPropagation()" style="max-width: 500px;">
        <div class="modal-header">
          <h2>Complete Grooming Service</h2>
          <button class="modal-close" onclick="closeGroomingNotesModal()">×</button>
        </div>
        <div class="modal-body">
          ${preferredCut ? `<div style="background: #e8f5e9; padding: 0.75rem; border-left: 4px solid #2e7d32; margin-bottom: 1rem; border-radius: 0.25rem;"><strong style="color: #2e7d32;">✂️ Auto-detected:</strong> <span style="color: #1b5e20;">Customer requested "${preferredCut}"</span></div>` : ''}
          <p style="margin-bottom: 1rem;">Please enter details about the grooming service performed:</p>
          <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
            Type of Cut/Service Performed:
          </label>
          <textarea 
            id="groomingNotesInput" 
            placeholder="e.g., Summer cut, Bath & dry, Full grooming with styling, Nail trim only, etc."
            style="width: 100%; padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: var(--radius-sm); font-family: inherit; font-size: 0.95rem; min-height: 100px; resize: vertical;"
          >${escapeHtml(prefilledNotes)}</textarea>
          <p style="color: var(--gray-600); font-size: 0.85rem; margin-top: 0.5rem;">This will be visible to the customer in their booking history and reviews.</p>
        </div>
        <div class="modal-footer" style="display: flex; gap: 0.75rem; justify-content: flex-end;">
          <button class="btn btn-outline btn-sm" onclick="closeGroomingNotesModal()">Cancel</button>
          <button class="btn btn-success btn-sm" onclick="submitGroomingNotes('${bookingId}')">Mark Completed</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.getElementById('groomingNotesOverlay').style.display = 'flex';
}

function closeGroomingNotesModal() {
  const modal = document.getElementById('groomingNotesOverlay');
  if (modal) {
    modal.remove();
  }
}

async function submitGroomingNotes(bookingId) {
  // Find and disable submit button to prevent duplicates
  const submitBtn = document.querySelector('#groomingNotesOverlay button.btn-success');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
  }
  
  // Show loading screen (lazy - non-blocking)
  if (typeof showTableLoader === 'function') {
    showTableLoader('#adminBookingsTable');
  }
  
  try {
    const notes = document.getElementById('groomingNotesInput').value.trim();

    let bookings = [];
    try {
      bookings = typeof getBookings === 'function' ? await getBookings() : [];
    } catch (e) {
      console.warn('submitGroomingNotes: getBookings failed', e);
      bookings = typeof getBookingsSync === 'function' ? getBookingsSync() : [];
    }

    if (!Array.isArray(bookings)) bookings = [];

    const booking = bookings.find(b => b.id === bookingId);

    if (booking) {
      booking.status = 'completed';
      booking.groomingNotes = notes;
      booking.completedAt = toLocalISO(new Date());

      try {
        if (typeof saveBookings === 'function') {
          await saveBookings(bookings);
        }
      } catch (e) {
        console.error('submitGroomingNotes: saveBookings failed', e);
      }

      logBookingHistory({
        bookingId,
        action: 'Completed',
        message: `Grooming completed on ${formatDate(toLocalISO(new Date()))}. Service: ${notes || 'No details provided'}`,
        actor: 'Admin'
      });
      closeGroomingNotesModal();

      // Reload current view
      switchView(currentView);
      customAlert.success('Booking marked as completed!');
    }
  } catch (error) {
    console.error('Error completing booking:', error);
    customAlert.error('Error', 'Failed to complete booking. Please try again.');
    
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

// Cancel booking
async function cancelBooking(bookingId, note = '', skipPrompt = false) {
  if (!skipPrompt && !confirm('Are you sure you want to cancel this booking?')) {
    return;
  }

  // ============================================
  // 🛡️ DATABASE-BACKED LOCK - Prevent duplicate cancels
  // ============================================
  if (typeof isActionLocked === 'function' && isActionLocked('cancel', bookingId)) {
    console.log('[cancelBooking] BLOCKED - Action already in progress');
    customAlert.warning('Please Wait', 'This booking is being processed. Please wait...');
    return;
  }
  
  let lockToken = null;
  if (typeof acquireActionLock === 'function') {
    lockToken = acquireActionLock('cancel', bookingId);
    if (!lockToken) {
      console.log('[cancelBooking] BLOCKED - Could not acquire lock');
      customAlert.warning('Please Wait', 'Another action is in progress. Please wait...');
      return;
    }
  }

  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);

    if (booking) {
      // Track previous status before cancelling (for history filtering)
      booking.previousStatus = booking.status;
      booking.wasConfirmed = booking.status === 'confirmed' || booking.status === 'inProgress';
      
      // ============================================
      // 🔄 RELEASE SLOT - Return slot to calendar availability
      // ============================================
      // When booking is cancelled, the slot should be available again
      // +1 to increase availability count for that date/time
      // ============================================
      const bookingDate = booking.date;
      const bookingTime = booking.time;
      
      booking.status = 'cancelledByAdmin';
      booking.cancellationNote = note || 'Cancelled by admin';
      booking.cancelledAt = Date.now();
      await saveBookings(bookings);
      
      // Release the slot back to availability
      try {
        if (typeof adjustSlotCount === 'function') {
          await adjustSlotCount(bookingDate, bookingTime, +1);
          console.log(`[cancelBooking] Released slot for ${bookingDate} ${bookingTime}`);
        } else if (typeof window.adjustSlotCount === 'function') {
          await window.adjustSlotCount(bookingDate, bookingTime, +1);
          console.log(`[cancelBooking] Released slot for ${bookingDate} ${bookingTime}`);
        }
      } catch (slotError) {
        console.warn('[cancelBooking] Failed to release slot:', slotError);
      }
      
      logBookingHistory({
        bookingId,
        action: 'Cancelled',
        message: booking.cancellationNote,
        actor: 'Admin'
      });
      modalSystem.close();

      // Reload current view
      switchView(currentView);
      showCustomAlert('Booking cancelled successfully!', 'success');
      
      // Release lock with success
      if (typeof releaseActionLock === 'function' && lockToken) {
        releaseActionLock('cancel', bookingId, lockToken, 'success');
      }
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    customAlert.error('Error', 'Failed to cancel booking. Please try again.');
    
    // Release lock with failure
    if (typeof releaseActionLock === 'function' && lockToken) {
      releaseActionLock('cancel', bookingId, lockToken, 'failed');
    }
  }
}

// Make functions globally available
window.confirmBooking = confirmBooking;
window.completeBooking = completeBooking;
window.cancelBooking = cancelBooking;
window.openBookingDetail = openBookingDetail;
window.openGroomerAssignmentModal = openGroomerAssignmentModal;
window.openGroomerAssignmentModalForStartService = openGroomerAssignmentModalForStartService;
window.assignGroomerToBooking = assignGroomerToBooking;
window.sortBookings = sortBookings;
window.filterStatsByType = filterStatsByType;
window.openRescheduleModal = openRescheduleModal;
window.handleRescheduleSubmit = handleRescheduleSubmit;
window.openCancelModal = openCancelModal;
window.handleAdminCancel = handleAdminCancel;
window.openMediaModal = openMediaModal;
window.liftCustomerBan = liftCustomerBan;
window.showGroomingNotesModal = showGroomingNotesModal;
window.closeGroomingNotesModal = closeGroomingNotesModal;
window.submitGroomingNotes = submitGroomingNotes;
window.handleMediaSubmit = handleMediaSubmit;
window.openNoShowModal = openNoShowModal;
window.handleNoShowSubmit = handleNoShowSubmit;
window.previewAbsenceProof = previewAbsenceProof;
window.openAbsenceDetail = openAbsenceDetail;
window.processAbsence = processAbsence;
// window.closeModal removed - use modalSystem.close() directly
window.changeRecentBookingsLimit = changeRecentBookingsLimit;
window.openLiftBanModal = openLiftBanModal;
window.viewNoShowBookings = viewNoShowBookings;
window.cancelBookingForDate = cancelBookingForDate;

async function renderLiftBanPanel() {
  const container = document.getElementById('liftBanPanel');
  if (!container) return;

  const users = await getUsers();
  const limit = typeof WARNING_HARD_LIMIT === 'number' ? WARNING_HARD_LIMIT : 5;
  const banned = users.filter(user =>
    user.role === 'customer' &&
    ((user.warningCount || 0) >= limit || user.isBanned)
  );

  if (!banned.length) {
    container.innerHTML = '<p class="empty-state" style="margin:0; font-size:0.85rem;">No customers awaiting lift approval</p>';
    return;
  }

  container.innerHTML = banned.slice(0, 4).map(user => `
    <div class="sidebar-panel-item" style="margin-bottom:0.75rem; padding:0.75rem; background:var(--warning-50); border-radius:var(--radius-sm);">
      <strong>${escapeHtml(user.name)}</strong>
      <p style="margin:0.25rem 0; font-size:0.85rem; color:var(--gray-600);">
        ${user.warningCount || 0}/${limit} warnings · ${user.isBanned ? 'Banned' : 'Flagged'}
      </p>
      <button class="btn btn-outline btn-sm" data-lift-ban="${user.id}">Confirm Lift Ban</button>
    </div>
  `).join('') + (banned.length > 4 ? `<p style="font-size:0.85rem;color:var(--gray-500);">+${banned.length - 4} more needing review</p>` : '');

  container.querySelectorAll('[data-lift-ban]').forEach(btn => {
    btn.addEventListener('click', () => openLiftBanModal(btn.dataset.liftBan));
  });
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatBookingStatus(status) {
  // Normalize to lowercase for comparison
  const normalizedStatus = String(status || '').toLowerCase();

  switch (normalizedStatus) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Confirmed';
    case 'completed':
      return 'Completed';
    case 'inprogress':
    case 'in_progress':
    case 'in progress':
      return 'In Progress';
    case 'cancelledbycustomer':
      return 'Cancelled by Customer';
    case 'cancelledbyadmin':
      return 'Cancelled by Admin';
    case 'cancelledbysystem':
      return 'Expired (Unpaid)';
    case 'cancelled':
      return 'Cancelled';
    default:
      // Capitalize first letter of each word for unknown statuses
      return status ? String(status).replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()) : 'Unknown';
  }
}

// Render featured cuts management panel
async function renderFeaturedCutsPanel() {
  const container = document.getElementById('featuredCutsPanel');
  if (!container) return;

  try {
    const featured = await getFeaturedBookings(100); // Get all featured for management
    const totalWithImages = (await getBookings()).filter(b => b.beforeImage && b.afterImage).length;

    if (featured.length === 0) {
      container.innerHTML = `
        <div style="padding: 1rem; background: #f9f9f9; border-radius: 0.5rem; border-left: 4px solid #ff9800;">
          <p style="margin: 0; color: #666;"><strong>📸 Featured Cuts:</strong> None yet</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #999;">Mark bookings with images as "Featured" to showcase them on the home page.</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #999;">Total with images: ${totalWithImages}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="padding: 1rem; background: #f0f9ff; border-radius: 0.5rem; border-left: 4px solid #2196f3;">
        <p style="margin: 0 0 0.75rem 0; font-weight: 600; color: #000;">📸 Featured Cuts (${featured.length}/${Math.min(4, totalWithImages)})</p>
        <div style="display: grid; gap: 0.75rem;">
          ${featured.map(booking => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: white; border-radius: 0.25rem; border: 1px solid #e0e0e0;">
              <div>
                <strong style="color: #000;">${escapeHtml(booking.petName)}</strong> · ${escapeHtml(booking.packageName || 'Custom')}
                <br>
                <span style="font-size: 0.85rem; color: #666;">${formatDate(booking.date)} · ${escapeHtml(booking.groomerName)}</span>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-sm btn-outline" onclick="unmarkAsFeatured('${booking.id}'); renderFeaturedCutsPanel();" style="border: 1px solid #f44336; color: #f44336;">Unfeature</button>
                <button class="btn btn-sm btn-danger" onclick="handleDeleteFeaturedImages('${booking.id}');" style="background: #ff6b6b; border: 1px solid #ff6b6b;">Delete Images</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('[Featured] Error rendering panel:', error);
    container.innerHTML = `<div style="padding: 1rem; color: #d32f2f;">Error loading featured cuts.</div>`;
  }
}

// Handle delete images from featured
function handleDeleteFeaturedImages(bookingId) {
  if (!confirm('Delete images from this booking? The booking will remain in the system.')) return;

  deleteBookingImages(bookingId).then(success => {
    if (success) {
      customAlert.success('Images deleted. Booking unfeature will refresh.');
      renderFeaturedCutsPanel();
    } else {
      customAlert.error('Failed to delete images.');
    }
  });
}

// Toggle featured status for a booking
async function toggleFeature(bookingId) {
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || !booking.beforeImage || !booking.afterImage) {
      customAlert.error('Booking must have images before featuring.');
      return;
    }

    if (booking.isFeatured) {
      await unmarkAsFeatured(bookingId);
      customAlert.success('Removed from featured gallery.');
    } else {
      await markAsFeatured(bookingId);
      customAlert.success('Added to featured gallery!');
    }

    // Refresh the booking detail and panels
    await renderFeaturedCutsPanel();
    openBookingDetail(bookingId);
  } catch (error) {
    console.error('Error toggling feature:', error);
    customAlert.error('Failed to update feature status.');
  }
}

function setupAdminPasswordForm() {
  const form = document.getElementById('adminPasswordForm');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const current = document.getElementById('adminCurrentPassword')?.value.trim();
    const next = document.getElementById('adminNewPassword')?.value.trim();
    const confirm = document.getElementById('adminConfirmPassword')?.value.trim();

    if (!current || !next || !confirm) {
      showCustomAlert('Please complete all fields.', 'error');
      return;
    }

    if (next !== confirm) {
      showCustomAlert('New password and confirmation do not match.', 'error');
      return;
    }

    const result = changePasswordForCurrentUser(current, next);
    if (!result?.success) {
      showCustomAlert(result?.message || 'Unable to update password.', 'error');
      return;
    }

    form.reset();
    showCustomAlert('Password updated successfully!', 'success');
  });
}

// Make functions globally available
window.extractPreferredCut = extractPreferredCut;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('adminDashboard')) {
    initAdminDashboard();
  }
});


// ============================================
// Add-on Management Logic
// ============================================

// Store the listener unsubscribe function
let packagesListenerUnsubscribe = null;

async function loadAddonsView() {
  const container = document.getElementById('addonsTable');
  if (!container) return;

  container.innerHTML = '<p class="empty-state">Loading add-ons...</p>';

  const packages = await getPackages();
  // Filter for add-ons
  const addons = packages.filter(p => p.type === 'addon');

  renderAddonsTable(addons);
  
  // Setup real-time listener for auto-refresh
  if (typeof setupPackagesListener === 'function') {
    // Remove old listener if exists
    if (packagesListenerUnsubscribe) {
      packagesListenerUnsubscribe();
    }
    
    // Setup new listener
    packagesListenerUnsubscribe = setupPackagesListener((updatedPackages) => {
      const updatedAddons = updatedPackages.filter(p => p.type === 'addon');
      renderAddonsTable(updatedAddons);
    });
    
    console.log('[Add-ons] Real-time listener activated');
  }
}

function renderAddonsTable(addons) {
  const container = document.getElementById('addonsTable');
  if (!container) return;

  if (addons.length === 0) {
    container.innerHTML = '<p class="empty-state">No add-ons found.</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Duration</th>
            <th>Pricing Structure</th>
            <th>Includes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${addons.map(addon => {
    const pricing = addon.tiers ?
      addon.tiers.map(t => `${t.label}: ₱${t.price}`).join('<br>') :
      `₱${addon.price || 0}`;

    return `
              <tr>
                <td>${escapeHtml(addon.name)}</td>
                <td><span class="badge badge-pending">Add-on</span></td>
                <td>${addon.duration || 0} mins</td>
                <td style="font-size: 0.9rem;">${pricing}</td>
                <td style="font-size: 0.9rem; color: var(--gray-600);">${addon.includes ? addon.includes.join(', ') : '-'}</td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="handleAddonEdit('${addon.id}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="handleAddonDelete('${addon.id}')">Delete</button>
                </td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function handleAddonCreate() {
  showModal(`
    <h3>Create New Add-on</h3>
    <form id="createAddonForm" onsubmit="submitAddonCreate(event)">
      <div class="form-group">
        <label class="form-label" for="newAddonName">Add-on Name</label>
        <input type="text" id="newAddonName" class="form-input" required placeholder="e.g. Anti-Tick Treatment">
      </div>
      <div class="form-group">
        <label class="form-label" for="newAddonDuration">Duration (minutes)</label>
        <input type="number" id="newAddonDuration" class="form-input" required value="15" min="0">
      </div>
      
      <div class="form-group">
        <label class="form-label">Pricing Mode</label>
        <div class="form-radio-group">
          <label class="radio-label">
            <input type="radio" name="pricingMode" value="fixed" checked onchange="togglePricingInputs(this.value)">
            <span>Fixed Price</span>
          </label>
          <label class="radio-label">
            <input type="radio" name="pricingMode" value="tiered" onchange="togglePricingInputs(this.value)">
            <span>Tiered / Varied</span>
          </label>
        </div>
      </div>

      <div id="fixedPriceInput" class="form-group">
        <label class="form-label" for="newAddonPrice">Price (₱)</label>
        <input type="number" id="newAddonPrice" class="form-input" placeholder="0">
      </div>

      <div id="tieredPriceInput" class="form-group" style="display:none; padding: 1rem; background: var(--gray-100); border-radius: 4px;">
        <label class="form-label">Tiers (Label : Price)</label>
        <div id="tierRows">
          <div class="tier-row" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
            <input type="text" class="form-input tier-label" placeholder="Label (e.g. Small)">
            <input type="number" class="form-input tier-price" placeholder="Price">
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-outline" onclick="addTierRow()">+ Add Tier</button>
      </div>

      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">Create Add-on</button>
        <button type="button" class="btn btn-outline" onclick="modalSystem.close()">Cancel</button>
      </div>
    </form>
  `);
}

function togglePricingInputs(mode) {
  document.getElementById('fixedPriceInput').style.display = mode === 'fixed' ? 'block' : 'none';
  document.getElementById('tieredPriceInput').style.display = mode === 'tiered' ? 'block' : 'none';
}

function addTierRow() {
  const container = document.getElementById('tierRows');
  const div = document.createElement('div');
  div.className = 'tier-row';
  div.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem;';
  div.innerHTML = `
    <input type="text" class="form-input tier-label" placeholder="Label (e.g. Large)">
    <input type="number" class="form-input tier-price" placeholder="Price">
    <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(div);
}

async function submitAddonCreate(e) {
  e.preventDefault();
  
  // Disable submit button to prevent duplicates
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
  }
  
  // Show loading screen (lazy - non-blocking)
  if (typeof showTableLoader === 'function') {
    showTableLoader('#addOnsTable');
  }
  
  try {
    const name = document.getElementById('newAddonName').value;
    const duration = parseInt(document.getElementById('newAddonDuration').value);
    const mode = document.querySelector('input[name="pricingMode"]:checked').value;

    let tiers = [];
    if (mode === 'fixed') {
      const price = parseInt(document.getElementById('newAddonPrice').value) || 0;
      tiers.push({ label: 'Per Service', price: price });
    } else {
      document.querySelectorAll('.tier-row').forEach(row => {
        const label = row.querySelector('.tier-label').value;
        const price = parseInt(row.querySelector('.tier-price').value) || 0;
        if (label) tiers.push({ label, price });
      });
    }

    const newAddon = {
      id: 'addon-' + Date.now(),
      name: name,
      type: 'addon',
      duration: duration,
      tiers: tiers,
      createdAt: Date.now()
    };

    const packages = await getPackages();
    packages.push(newAddon);
    await savePackages(packages);

    modalSystem.close();
    await loadAddonsView();
    customAlert.success('Add-on created successfully');
  } catch (error) {
    console.error('Error creating add-on:', error);
    customAlert.error('Error', 'Failed to create add-on. Please try again.');
    
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

async function handleAddonDelete(id) {
  customAlert.confirm('Delete Add-on', 'Are you sure? This cannot be undone.').then(async (confirmed) => {
    if (!confirmed) return;
    const packages = await getPackages();
    const newPackages = packages.filter(p => p.id !== id);
    await savePackages(newPackages);
    await loadAddonsView();
    customAlert.success('Add-on deleted.');
  });
}

async function handleAddonEdit(id) {
  const packages = await getPackages();
  const addon = packages.find(p => p.id === id);
  if (!addon) return;

  const isTiered = addon.tiers && (addon.tiers.length > 1 || (addon.tiers.length === 1 && addon.tiers[0].label !== 'Per Service'));

  showModal(`
    <h3>Edit Add-on</h3>
    <form id="editAddonForm" onsubmit="submitAddonEdit(event, '${id}')">
      <div class="form-group">
        <label class="form-label" for="editAddonName">Add-on Name</label>
        <input type="text" id="editAddonName" class="form-input" required value="${escapeHtml(addon.name)}">
      </div>
      <div class="form-group">
        <label class="form-label" for="editAddonDuration">Duration (minutes)</label>
        <input type="number" id="editAddonDuration" class="form-input" required value="${addon.duration || 15}">
      </div>
      
      <!-- Simplified Editing: Dynamic tiers list -->
      <div class="form-group" style="padding: 1rem; background: var(--gray-100); border-radius: 4px;">
        <label class="form-label">Pricing Tiers</label>
        <div id="editTierRows">
          ${addon.tiers ? addon.tiers.map(t => `
            <div class="tier-row" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
              <input type="text" class="form-input tier-label" placeholder="Label" value="${escapeHtml(t.label)}">
              <input type="number" class="form-input tier-price" placeholder="Price" value="${t.price}">
              <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">×</button>
            </div>
          `).join('') : ''}
        </div>
        <button type="button" class="btn btn-sm btn-outline" onclick="addEditTierRow()">+ Add Tier</button>
      </div>

      <div class="modal-actions">
        <button type="submit" class="btn btn-primary">Save Changes</button>
        <button type="button" class="btn btn-outline" onclick="modalSystem.close()">Cancel</button>
      </div>
    </form>
  `);
}

function addEditTierRow() {
  const container = document.getElementById('editTierRows');
  const div = document.createElement('div');
  div.className = 'tier-row';
  div.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem;';
  div.innerHTML = `
    <input type="text" class="form-input tier-label" placeholder="Label">
    <input type="number" class="form-input tier-price" placeholder="Price">
    <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(div);
}

async function submitAddonEdit(e, id) {
  e.preventDefault();
  
  // Disable submit button to prevent duplicates
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
  }
  
  // Show loading screen (lazy - non-blocking)
  if (typeof showTableLoader === 'function') {
    showTableLoader('#addOnsTable');
  }
  
  try {
    const name = document.getElementById('editAddonName').value;
    const duration = parseInt(document.getElementById('editAddonDuration').value);

    let tiers = [];
    document.getElementById('editTierRows').querySelectorAll('.tier-row').forEach(row => {
      const label = row.querySelector('.tier-label').value;
      const price = parseInt(row.querySelector('.tier-price').value) || 0;
      if (label) tiers.push({ label, price });
    });

    if (tiers.length === 0) {
      customAlert.warning('Please add at least one price tier.');
      // Re-enable button on validation error
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
      return;
    }

    const packages = await getPackages();
    const idx = packages.findIndex(p => p.id === id);
    if (idx === -1) return;

    packages[idx].name = name;
    packages[idx].duration = duration;
    packages[idx].tiers = tiers;

    await savePackages(packages);
    modalSystem.close();
    await loadAddonsView();
    customAlert.success('Add-on updated.');
  } catch (error) {
    console.error('Error updating add-on:', error);
    customAlert.error('Error', 'Failed to update add-on. Please try again.');
    
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

window.loadAddonsView = loadAddonsView;
window.renderAddonsTable = renderAddonsTable;
window.handleAddonCreate = handleAddonCreate;
window.handleAddonEdit = handleAddonEdit;
window.handleAddonDelete = handleAddonDelete;
window.submitAddonCreate = submitAddonCreate;
window.submitAddonEdit = submitAddonEdit;
window.togglePricingInputs = togglePricingInputs;
window.addTierRow = addTierRow;
window.addEditTierRow = addEditTierRow;


// ============================================
// Booking Flow & Add-on Handlers
// ============================================

// Protection flags for service actions
let isStartingService = false;
let isCompletingService = false;

async function handleStartService(bookingId) {
  // Prevent duplicate clicks
  if (isStartingService) {
    console.log('[handleStartService] BLOCKED - Already in progress');
    return;
  }
  isStartingService = true;
  
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    console.log('[handleStartService] Booking:', bookingId, 'Opening groomer selection modal');

    // 🔧 START SERVICE DATE VALIDATION: Only allow starting service on the booking date (TODAY)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (booking.date !== todayStr) {
      const bookingDate = new Date(booking.date);
      const formattedDate = bookingDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (booking.date > todayStr) {
        // Future booking
        await customAlert.warning(
          'Cannot Start Service Yet', 
          `This booking is scheduled for ${formattedDate}. You can only start the service on the appointment date.`
        );
      } else {
        // Past booking
        await customAlert.warning(
          'Booking Date Has Passed', 
          `This booking was scheduled for ${formattedDate}. The appointment date has already passed.`
        );
      }
      return;
    }

    // ALWAYS show groomer selection modal when starting service
    // Admin must select a groomer (with recommendation for fairness)
    await openGroomerAssignmentModalForStartService(bookingId);
  } finally {
    isStartingService = false;
  }
}

async function handleCompleteService(bookingId) {
  // Prevent duplicate clicks
  if (isCompletingService) {
    console.log('[handleCompleteService] BLOCKED - Already in progress');
    return;
  }
  
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  customAlert.confirm('Complete Service', 'Are you sure you want to mark this as done?').then(async (confirmed) => {
    if (!confirmed) return;
    
    if (isCompletingService) return;
    isCompletingService = true;

    try {
      booking.status = 'completed';
      booking.completedAt = toLocalISO(new Date());
      await saveBookings(bookings);

      logBookingHistory({
        bookingId,
        action: 'Completed',
        message: 'Service marked as completed',
        actor: 'Admin'
      });

      modalSystem.close();
      loadOverview(); // or whatever the current view is
      customAlert.success('Booking completed successfully.');
    } finally {
      isCompletingService = false;
    }
  });
}

// Protection flag for old addon function
let isAddingAddonOld = false;

async function handleAddonToBooking(bookingId) {
  // Prevent duplicate clicks
  if (isAddingAddonOld) {
    console.log('[handleAddonToBooking] BLOCKED - Already in progress');
    return;
  }
  isAddingAddonOld = true;
  
  try {
    const select = document.getElementById(`addonSelect-${bookingId}`);
    if (!select || !select.value) {
      customAlert.warning('Please select an add-on first.');
      return;
    }

    const [id, label, priceStr] = select.value.split('|');
    const price = parseFloat(priceStr);
    const packages = await getPackages();
    const addonPkg = packages.find(p => p.id === id);
    const name = addonPkg ? (label === 'Base' ? addonPkg.name : `${addonPkg.name} - ${label}`) : 'Unknown Add-on';

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    if (!booking.addOns) booking.addOns = [];
    
    // Check for duplicate add-on
    const isDuplicate = booking.addOns.some(addon => addon.id === id && addon.name === name);
    if (isDuplicate) {
      customAlert.warning('Duplicate Add-on', 'This add-on is already added to the booking.');
      return;
    }

    booking.addOns.push({
      id: id,
      name: name,
      price: price,
      addedAt: Date.now()
    });

    recalculateBookingTotal(booking);

    await saveBookings(bookings);
    openBookingDetail(bookingId); // Refresh modal
  } finally {
    isAddingAddonOld = false;
  }
}

function recalculateBookingTotal(booking) {
  // Base cost is tricky because we might need to look up the package price again if it wasn't stored separately.
  // Assuming booking.cost.subtotal was the "Base Price" at booking time.
  // BUT, to be safe, if we are editing it, we should re-derive base price from package + add-ons?
  // Existing system: booking.totalPrice OR booking.cost.subtotal.

  // Initialize basePrice from current total if not already set
  if (booking.basePrice === undefined) {
    // Initialize basePrice from current total (assuming no add-ons yet or they are included).
    // Since we are just starting to use this feature, assume current total IS the base price (minus any legacy add-ons if they exist).
    // However, booking object structure might change.
    // Let's trust totalAmount for now as base if we don't have basePrice.
    let currentTotal = parseFloat(booking.totalPrice) || (booking.cost ? parseFloat(booking.cost.subtotal) : 0) || 0;
    booking.basePrice = currentTotal;
  }

  const basePrice = parseFloat(booking.basePrice) || 0;
  const addOnsTotal = (booking.addOns || []).reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0);
  const newTotal = basePrice + addOnsTotal;

  // Validate result is a number
  if (isNaN(newTotal)) {
    console.error('Error calculating total price for booking', booking.id);
    return;
  }

  booking.totalPrice = newTotal;
  if (booking.cost) {
    booking.cost.subtotal = newTotal;
    // Update balance on visit if deposit was paid? 
    // Assuming deposit is fixed or percentage?
    // If we change total, balance changes.
    // let's assume deposit doesn't change after booking.
    // Balance = Total - Deposit.
    // usage: booking.cost.deposit (if exists).
    const deposit = parseFloat(booking.cost.deposit) || 0;
    booking.cost.balanceOnVisit = newTotal - deposit;
  }
}

window.handleStartService = handleStartService;
window.assignGroomerToBookingAndStartService = assignGroomerToBookingAndStartService;
window.handleCompleteService = handleCompleteService;
window.handleAddonToBooking = handleAddonToBooking;
// handleRemoveAddonFromBooking is defined and exported later in the file

// ============================================
// Mega Calendar Logic
// ============================================

function buildCalendarDataset(bookings, absences) {
  const dataset = {};

  // Process bookings
  bookings.forEach(booking => {
    if (['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(booking.status)) return;
    const date = booking.date;
    if (!dataset[date]) {
      dataset[date] = { bookings: [], absences: [], status: 'open' };
    }
    dataset[date].bookings.push(booking);
  });

  // Process absences/blackouts - check legacy list if passed
  if (Array.isArray(absences)) {
    absences.forEach(absence => {
      // Handle shop blackouts
      if (absence.type === 'shop_closed') {
        const date = absence.date;
        if (!dataset[date]) dataset[date] = { bookings: [], absences: [], status: 'open' };
        dataset[date].status = 'closed';
        dataset[date].reason = absence.reason;
      }
    });
  }

  // Also check existing calendar blackouts helper if available
  if (typeof getCalendarBlackouts === 'function') {
    const blackouts = getCalendarBlackouts();
    blackouts.forEach(b => {
      const date = b.date;
      if (!dataset[date]) dataset[date] = { bookings: [], absences: [], status: 'open' };
      dataset[date].status = 'closed';
      dataset[date].reason = b.reason;
    });
  }

  return dataset;
}

function renderMegaCalendar(containerId, dataset) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // State management for navigation
  if (!container.__calendarDate) {
    container.__calendarDate = new Date();
  }

  const displayDate = container.__calendarDate;
  const monthName = displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
  const lastDay = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);
  const startWeekday = firstDay.getDay();

  // Create grid
  let html = `
    <div class="mega-calendar-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
       <button class="btn btn-outline btn-sm" onclick="changeAdminCalendarMonth('${containerId}', -1)">← Prev</button>
       <h3 style="margin:0;">${monthName}</h3>
       <button class="btn btn-outline btn-sm" onclick="changeAdminCalendarMonth('${containerId}', 1)">Next →</button>
    </div>
    <div class="calendar-grid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:0.5rem;">
      ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div style="text-align:center; font-weight:bold; color:var(--gray-500); font-size:0.85rem; padding:0.5rem;">${d}</div>`).join('')}
  `;

  // Empty cells
  for (let i = 0; i < startWeekday; i++) {
    html += `<div style="background:transparent;"></div>`;
  }

  // Days
  const today = toLocalISO(new Date());

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
    const isoDate = toLocalISO(date);
    const data = dataset[isoDate] || { bookings: [], status: 'open' };
    const isToday = isoDate === today;

    let statusColor = 'var(--white)';
    let textColor = 'var(--gray-900)';
    let borderColor = 'var(--gray-200)';

    if (data.status === 'closed') {
      statusColor = 'var(--gray-100)';
      textColor = 'var(--gray-500)';
    } else if (data.bookings.length > 0) {
      if (data.bookings.length >= 5) borderColor = '#ff9800'; // busy
    }

    if (isToday) {
      borderColor = 'var(--primary-color)';
    }

    html += `
        <div onclick="openAdminCalendarModal('${isoDate}')" 
             style="background:${statusColor}; border:1px solid ${borderColor}; border-radius:var(--radius-sm); padding:0.5rem; min-height:80px; cursor:pointer; position:relative; transition:all 0.2s;">
           <div style="font-weight:600; color:${textColor}; display:flex; justify-content:space-between;">
             <span>${day}</span>
             ${data.status === 'closed' ? '<span style="font-size:0.75rem;">🚫</span>' : ''}
           </div>
           
           <div style="margin-top:0.25rem;">
             ${data.bookings.slice(0, 3).map(b => {
      let dotColor = '#4caf50'; // confirmed
      if (b.status === 'pending') dotColor = '#ff9800';
      if (b.status === 'In Progress') dotColor = '#2196f3';
      return `<div style="font-size:0.75rem; color:var(--gray-700); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                   <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${dotColor}; margin-right:4px;"></span>
                   ${b.time} ${b.petName}
                 </div>`;
    }).join('')}
             ${data.bookings.length > 3 ? `<div style="font-size:0.75rem; color:var(--gray-500); text-align:center;">+${data.bookings.length - 3} more</div>` : ''}
           </div>
        </div>
      `;
  }

  html += `</div>`;
  container.innerHTML = html;

  // Save global reference for re-rendering
  window._adminCalendarContainerId = containerId;
}

function changeAdminCalendarMonth(containerId, offset) {
  const container = document.getElementById(containerId);
  if (!container || !container.__calendarDate) return;

  container.__calendarDate.setMonth(container.__calendarDate.getMonth() + offset);
  loadOverview(); // Reload data/view to refresh calendar with new date
}

async function openAdminCalendarModal(date) {
  const bookings = await getBookings();
  const dayBookings = bookings.filter(b => b.date === date && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status));
  const groomers = await getGroomers();

  // Check blackout
  const blackout = typeof getCalendarBlackout === 'function' ? getCalendarBlackout(date) : null;

  // Sort bookings
  dayBookings.sort((a, b) => {
    // Convert times to sortable (remove am/pm then compare)
    // Or string comparison is usually fine for 9am vs 12pm if structured, but 12pm < 3pm < 9am string wise? No. 
    // 9am < 12pm < 3pm. 12pm is lexically < 3pm ? yes. 12 < 3? No.
    // Let's rely on standard formats or helper if exists.
    return a.time.localeCompare(b.time);
  });

  let content = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
         <h2 style="margin:0;">📅 ${formatDate(date)}</h2>
         <div>
            ${blackout ?
      `<button class="btn btn-outline btn-sm" onclick="unblockDateFromModal('${date}')">Re-open Day</button>` :
      `<button class="btn btn-danger btn-sm" onclick="blockDateFromModal('${date}')">Block Day</button>`
    }
         </div>
      </div>
    `;

  if (blackout) {
    content += `
           <div style="background:var(--error-50); padding:1rem; border-radius:var(--radius-sm); margin-bottom:1.5rem; text-align:center;">
              <h3 style="color:var(--error-700); margin-bottom:0.5rem;">🚫 Closed</h3>
              <p style="margin:0; color:var(--error-600);">${escapeHtml(blackout.reason)}</p>
           </div>
        `;
  }

  content += `<h3 style="margin-bottom:1rem;">Bookings (${dayBookings.length})</h3>`;

  if (dayBookings.length === 0) {
    content += `<p class="empty-state">No bookings for this day.</p>`;
  } else {
    content += `<div style="max-height:300px; overflow-y:auto; margin-bottom:2rem;">
          ${dayBookings.map(b => {
      const statusColor = b.status === 'confirmed' ? 'var(--success-color)' : b.status === 'pending' ? 'var(--warning-color)' : (b.status === 'In Progress' ? 'var(--info-color)' : 'var(--gray-400)');
      return `
               <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem; border-bottom:1px solid var(--gray-200);">
                  <div>
                     <div style="font-weight:600; color:var(--gray-900);">
                       <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${statusColor}; margin-right:0.5rem;"></span>
                       ${b.time} — ${escapeHtml(b.petName)} <span style="font-weight:400; color:var(--gray-600);">(${escapeHtml(b.customerName)})</span>
                     </div>
                     <div style="font-size:0.85rem; color:var(--gray-600); margin-left:1.25rem;">
                        ${escapeHtml(b.packageName)} · ${escapeHtml(b.groomerName)}
                     </div>
                  </div>
                  <button class="btn btn-outline btn-sm" onclick="modalSystem.close(); openBookingDetail('${b.id}')">View</button>
               </div>
             `;
    }).join('')}
        </div>`;
  }

  // Availability Summary
  content += `<h3 style="margin-bottom:1rem;">Availability</h3>
      <div style="display:flex; gap:1rem; overflow-x:auto; padding-bottom:1rem;">`;

  const slots = ['9am-12pm', '12pm-3pm', '3pm-6pm'];

  for (const groomer of groomers) {
    const groomerBookings = dayBookings.filter(b => b.groomerId === groomer.id);

    content += `
           <div style="min-width:200px; padding:1rem; border:1px solid var(--gray-200); border-radius:var(--radius-sm); background:var(--gray-50);">
              <div style="font-weight:600; margin-bottom:0.5rem;">${escapeHtml(groomer.name)}</div>
              <div style="display:grid; grid-template-columns:1fr; gap:0.25rem;">
                 ${slots.map(slot => {
      const isBooked = groomerBookings.some(b => b.time === slot && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status));
      return `
                        <div style="font-size:0.85rem; padding:0.25rem 0.5rem; border-radius:4px; ${isBooked ? 'background:#ffebee; color:#c62828;' : 'background:#e8f5e9; color:#2e7d32;'}">
                           ${slot}: ${isBooked ? 'Booked' : 'Available'}
                        </div>
                     `;
    }).join('')}
              </div>
           </div>
        `;
  }
  content += `</div>`;

  content += `
       <div class="modal-actions">
          <button class="btn btn-outline" onclick="modalSystem.close()">Close</button>
       </div>
    `;

  showModal(content);
}

function blockDateFromModal(date) {
  const reason = prompt("Reason for blocking this day:");
  if (reason) {
    addCalendarBlackout(date, reason);
    cancelBookingsForDate(date, reason);
    openAdminCalendarModal(date); // Refresh modal
    loadOverview(); // Refresh background
  }
}

function unblockDateFromModal(date) {
  if (confirm("Re-open this day for bookings?")) {
    removeCalendarBlackout(date);
    openAdminCalendarModal(date); // Refresh modal
    loadOverview(); // Refresh background
  }
}

// Expose functions
window.changeAdminCalendarMonth = changeAdminCalendarMonth;
window.openAdminCalendarModal = openAdminCalendarModal;
window.blockDateFromModal = blockDateFromModal;
window.unblockDateFromModal = unblockDateFromModal;
window.buildCalendarDataset = buildCalendarDataset;
window.renderMegaCalendar = renderMegaCalendar;

// ============================================
// Calendar Blackout & Bulk Cancellation Helpers
// ============================================

function getCalendarBlackouts() {
  try {
    const stored = localStorage.getItem('adminCalendarBlackouts');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

function addCalendarBlackout(date, reason) {
  const blackouts = getCalendarBlackouts();
  // Check if exists
  const idx = blackouts.findIndex(b => b.date === date);
  if (idx >= 0) {
    blackouts[idx].reason = reason;
  } else {
    blackouts.push({ date, reason, type: 'shop_closed' });
  }
  localStorage.setItem('adminCalendarBlackouts', JSON.stringify(blackouts));
}

function removeCalendarBlackout(date) {
  const blackouts = getCalendarBlackouts();
  const newList = blackouts.filter(b => b.date !== date);
  localStorage.setItem('adminCalendarBlackouts', JSON.stringify(newList));
}

async function cancelBookingForDate(date, reason) {
  const bookings = await getBookings();
  const targetBookings = bookings.filter(b => b.date === date && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status));

  if (targetBookings.length === 0) return;

  // Bulk cancel
  for (const booking of targetBookings) {
    booking.status = 'CancelledByAdmin';
    booking.cancellationNote = reason || 'Shop Closed';
    // Log history?
  }

  await saveBookings(bookings);
  showCustomAlert(`Cancelled ${targetBookings.length} bookings for ${date}.`, 'success');
}

function getCalendarBlackout(date) {
  const blackouts = getCalendarBlackouts();
  return blackouts.find(b => b.date === date);
}

// Expose helpers
window.getCalendarBlackouts = getCalendarBlackouts;
window.addCalendarBlackout = addCalendarBlackout;
window.removeCalendarBlackout = removeCalendarBlackout;
window.cancelBookingForDate = cancelBookingForDate;
window.getCalendarBlackout = getCalendarBlackout;



// Search In Progress Bookings
let inprogressBookingsCache = [];

window.searchInProgressBookings = async function (query) {
  if (inprogressSearchTimeout) clearTimeout(inprogressSearchTimeout);
  inprogressSearchTimeout = setTimeout(async () => {
    if (inprogressBookingsCache.length === 0) {
      const allBookings = await getBookings();
      inprogressBookingsCache = allBookings.filter(b =>
        b.status === 'In Progress' || b.status === 'inprogress' || b.status === 'in_progress'
      );
    }

    // Reset to page 1 on search
    adminState.inprogressPage = 1;

    if (!query || query.trim() === '') {
      renderInProgressBookingsTable(inprogressBookingsCache);
      return;
    }

    const q = query.toLowerCase();
    const filtered = inprogressBookingsCache.filter(b =>
      (b.customerName || '').toLowerCase().includes(q) ||
      (b.petName || '').toLowerCase().includes(q) ||
      (b.packageName || '').toLowerCase().includes(q) ||
      (b.email || '').toLowerCase().includes(q) ||
      (b.phone || '').toLowerCase().includes(q)
    );

    renderInProgressBookingsTable(filtered);
  }, 300);
};

// Load In Progress Bookings
window.loadInProgressBookings = async function () {
  const bookings = await getBookings();
  const inprogress = bookings.filter(b =>
    b.status === 'In Progress' || b.status === 'inprogress' || b.status === 'in_progress'
  );
  inprogressBookingsCache = inprogress;
  renderInProgressBookingsTable(inprogress);
  
  // Setup real-time listener for auto-refresh
  if (typeof setupBookingsListener === 'function' && currentView === 'inprogress') {
    // Remove old listener if exists
    if (bookingsListenerUnsubscribe) {
      bookingsListenerUnsubscribe();
    }
    
    // Setup new listener
    bookingsListenerUnsubscribe = setupBookingsListener((updatedBookings) => {
      const updatedInProgress = updatedBookings.filter(b =>
        b.status === 'In Progress' || b.status === 'inprogress' || b.status === 'in_progress'
      );
      inprogressBookingsCache = updatedInProgress;
      renderInProgressBookingsTable(updatedInProgress);
    });
    
    console.log('[In Progress Bookings] Real-time listener activated');
  }
};


// Toggle Actions Dropdown
window.toggleActionsDropdown = function (event, bookingId) {
  event.stopPropagation();
  const dropdown = event.currentTarget.parentElement;
  const isOpen = dropdown.classList.contains('open');

  // Close all dropdowns first
  document.querySelectorAll('.actions-dropdown').forEach(d => d.classList.remove('open'));

  // Toggle this one
  if (!isOpen) {
    dropdown.classList.add('open');
  }
};

// Close dropdowns when clicking outside
document.addEventListener('click', function (event) {
  if (!event.target.closest('.actions-dropdown')) {
    document.querySelectorAll('.actions-dropdown').forEach(d => d.classList.remove('open'));
  }
});
// Updated table renderers with Actions dropdown
// This overrides the previous versions

// Toggle Actions Dropdown
window.toggleActionsDropdown = function (event, bookingId) {
  event.stopPropagation();
  const dropdown = event.currentTarget.parentElement;
  const isOpen = dropdown.classList.contains('open');

  // Close all dropdowns first
  document.querySelectorAll('.actions-dropdown').forEach(d => d.classList.remove('open'));

  // Toggle this one
  if (!isOpen) {
    dropdown.classList.add('open');
  }
};

// Close dropdowns when clicking outside
document.addEventListener('click', function (event) {
  if (!event.target.closest('.actions-dropdown')) {
    document.querySelectorAll('.actions-dropdown').forEach(d => d.classList.remove('open'));
  }
});

// Updated In Progress Table with Actions Dropdown, Sorting, and Pagination
window.renderInProgressBookingsTable = function (bookings) {
  const container = document.getElementById('inprogressBookingsTable');
  if (!container) return;

  if (!bookings || bookings.length === 0) {
    container.innerHTML = '<div class="card"><p class="empty-state" style="text-align:center; padding:2rem;">No bookings in progress.</p></div>';
    return;
  }

  // Apply search filter first
  let filteredBookings = [...bookings];
  if (adminState.inprogressSearchTerm) {
    const q = adminState.inprogressSearchTerm.toLowerCase();
    filteredBookings = filteredBookings.filter(b =>
      (b.customerName || '').toLowerCase().includes(q) ||
      (b.petName || '').toLowerCase().includes(q) ||
      (b.packageName || '').toLowerCase().includes(q)
    );
  }

  if (filteredBookings.length === 0) {
    const message = adminState.inprogressSearchTerm 
      ? `No results found for "${adminState.inprogressSearchTerm}". Try a different search term.`
      : 'No bookings in progress.';
    container.innerHTML = `
      <div class="search-bar" style="margin-bottom: 1rem;">
        <input type="text" class="search-input" placeholder="🔍 Search by customer, pet, or package..."
          onkeyup="searchInProgressBookings(this.value)">
      </div>
      <div style="padding: 3rem 2rem; text-align: center; background: #f9fafb; border-radius: var(--radius); border: 2px dashed var(--gray-300);">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">🔄</div>
        <p style="color: var(--gray-700); font-size: 1.1rem; margin-bottom: 0.5rem; font-weight: 500;">${message}</p>
        ${adminState.inprogressSearchTerm ? `<p style="color: var(--gray-600); font-size: 0.9rem; margin-bottom: 1rem;">Clear the search to see all bookings.</p><button class="btn btn-primary btn-sm" onclick="clearInprogressSearch()">🔄 Clear Search</button>` : ''}
      </div>
    `;
    return;
  }

  // Apply sorting
  const sortedBookings = [...filteredBookings];
  const sortBy = adminState.inprogressRecentActive ? 'recent' : (adminState.inprogressSortBy || 'date');
  const sortOrder = adminState.inprogressSortOrder || 'asc';
  
  console.log('[InProgress] Sorting by:', sortBy, 'Order:', sortOrder, 'Items:', sortedBookings.length);

  // Helper to parse time string to comparable value
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    // Handle formats like "9 AM - 12 PM", "9:00 AM", "14:00"
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const isPM = match[3] && match[3].toLowerCase() === 'pm';
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  sortedBookings.sort((a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'recent':
        // Sort by creation date (newest first) - always descending
        valA = new Date(a.createdAt || a.date).getTime();
        valB = new Date(b.createdAt || b.date).getTime();
        return valB - valA;
      case 'customer':
        valA = (a.customerName || '').toLowerCase();
        valB = (b.customerName || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      case 'package':
        valA = (a.packageName || '').toLowerCase();
        valB = (b.packageName || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      case 'date':
      default:
        // Compare by date first, then by time
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) {
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        }
        // Same date, compare by time
        valA = parseTimeToMinutes(a.time);
        valB = parseTimeToMinutes(b.time);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Pagination
  const pageSize = adminState.inprogressPageSize || 5;
  const currentPage = adminState.inprogressPage || 1;
  const totalItems = sortedBookings.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedBookings = sortedBookings.slice(startIndex, endIndex);

  // Build HTML with controls
  let html = `
    <div class="search-bar" style="margin-bottom: 1rem;">
      <input type="text" class="search-input" placeholder="🔍 Search by customer, pet, or package..."
        value="${adminState.inprogressSearchTerm || ''}" onkeyup="searchInProgressBookings(this.value)">
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <label style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Show:</label>
        <select id="inprogressPageSize" class="form-select" style="width: auto; padding: 0.5rem;" onchange="changeInprogressPageSize(this.value)">
          <option value="5" ${pageSize === 5 ? 'selected' : ''}>5</option>
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
        </select>
        <span style="font-size: 0.9rem; color: var(--gray-600);">entries</span>
      </div>
      <div style="font-size: 0.9rem; color: var(--gray-600);">
        Showing ${startIndex + 1} to ${endIndex} of ${totalItems}
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding: 0.5rem; background: var(--gray-50); border-radius: var(--radius-sm);">
      <button class="btn btn-sm" style="background: ${sortBy === 'recent' ? '#007bff' : '#e0e0e0'}; color: ${sortBy === 'recent' ? 'white' : '#333'}; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: 600;" onclick="toggleInprogressRecent()">
        🕐 Recent
      </button>
      <label style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Sort by:</label>
      <select id="inprogressSortField" class="form-select" style="width: auto; padding: 0.5rem; ${adminState.inprogressRecentActive ? 'opacity: 0.5; pointer-events: none;' : ''}" onchange="changeInprogressSortField(this.value)" ${adminState.inprogressRecentActive ? 'disabled' : ''}>
        <option value="date" ${sortBy === 'date' ? 'selected' : ''}>📅 Date (Appointment)</option>
        <option value="customer" ${sortBy === 'customer' ? 'selected' : ''}>👤 Customer (A-Z)</option>
        <option value="package" ${sortBy === 'package' ? 'selected' : ''}>📦 Package</option>
      </select>
      <select id="inprogressSortOrder" class="form-select" style="width: auto; padding: 0.5rem; ${adminState.inprogressRecentActive ? 'opacity: 0.5; pointer-events: none;' : ''}" onchange="changeInprogressSortOrder(this.value)" ${adminState.inprogressRecentActive ? 'disabled' : ''}>
        <option value="asc" ${sortOrder === 'asc' ? 'selected' : ''}>⬆️ Ascending</option>
        <option value="desc" ${sortOrder === 'desc' ? 'selected' : ''}>⬇️ Descending</option>
      </select>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Customer</th>
            <th>Pet</th>
            <th>Package</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
    `;

  paginatedBookings.forEach(booking => {
    const statusClass = 'badge-inprogress';
    html += `
      <tr>
        <td>${formatDate(booking.date)} · ${formatTime(booking.time)}</td>
        <td>${escapeHtml(booking.customerName || 'N/A')}</td>
        <td>${escapeHtml(booking.petName || 'N/A')}</td>
        <td>${escapeHtml(booking.packageName || 'N/A')}${booking.packageId === 'single-service' && booking.singleServices?.length ? `<br><span style="font-size: 0.8rem; color: var(--gray-600);">${booking.singleServices.map(id => getSingleServiceLabel(id)).join(', ')}</span>` : ''}</td>
        <td><span class="badge ${statusClass}">In Progress</span></td>
        <td>
          <div class="actions-dropdown">
            <button class="actions-btn" onclick="toggleActionsDropdown(event, '${booking.id}')">Actions</button>
            <div class="actions-menu">
              <button class="actions-menu-item" onclick="completeBooking('${booking.id}')">✓ Complete Service</button>
              <button class="actions-menu-item" onclick="openSimpleBookingView('${booking.id}')">👁 View</button>
              <button class="actions-menu-item" onclick="openAddonsModal('${booking.id}')">🛁 Add-ons</button>
              <button class="actions-menu-item" onclick="showCustomAlert('Add Photos coming soon', 'info')">📸 Add Photos</button>
              <button class="actions-menu-item danger" onclick="protectedOpenCancelModal('${booking.id}')">✖ Cancel</button>
            </div>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
    `;

  // Pagination controls
  if (totalPages > 1) {
    html += `
      <div style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1rem;">
        <button class="btn btn-sm btn-outline" onclick="changeInprogressPage(1)" ${currentPage === 1 ? 'disabled' : ''}>«</button>
        <button class="btn btn-sm btn-outline" onclick="changeInprogressPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>
        <span style="padding: 0.5rem 1rem; font-size: 0.9rem; color: var(--gray-700);">Page ${currentPage} of ${totalPages}</span>
        <button class="btn btn-sm btn-outline" onclick="changeInprogressPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>
        <button class="btn btn-sm btn-outline" onclick="changeInprogressPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>»</button>
      </div>
    `;
  }

  container.innerHTML = html;
};

// In Progress sorting and pagination handlers
window.changeInprogressSortField = function (field) {
  console.log('[InProgress] Sort field changed to:', field);
  adminState.inprogressSortBy = field;
  adminState.inprogressRecentActive = false; // Disable Recent when changing sort field
  adminState.inprogressPage = 1;
  loadInProgressBookings();
};

window.changeInprogressSortOrder = function (order) {
  console.log('[InProgress] Sort order changed to:', order);
  adminState.inprogressSortOrder = order;
  adminState.inprogressRecentActive = false; // Disable Recent when changing sort order
  adminState.inprogressPage = 1;
  loadInProgressBookings();
};

// Toggle Recent button (on/off)
window.toggleInprogressRecent = function () {
  console.log('[InProgress] Toggling Recent from:', adminState.inprogressRecentActive);
  adminState.inprogressRecentActive = !adminState.inprogressRecentActive;
  adminState.inprogressPage = 1;
  console.log('[InProgress] Recent is now:', adminState.inprogressRecentActive);
  loadInProgressBookings();
};

window.changeInprogressPageSize = function (size) {
  adminState.inprogressPageSize = parseInt(size, 10);
  adminState.inprogressPage = 1;
  loadInProgressBookings();
};

window.changeInprogressPage = function (page) {
  const totalItems = inprogressBookingsCache.length;
  const totalPages = Math.ceil(totalItems / adminState.inprogressPageSize) || 1;
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  adminState.inprogressPage = page;
  renderInProgressBookingsTable(inprogressBookingsCache);
};

// Updated Confirmed Bookings Table with Actions Dropdown


// Add-ons Management Modal (removed duplicate - see openAddonsModal below)

// Add-on Management Functions
// Add-on addition protection
let isAddingAddon = false;
let lastAddonAddTime = 0;
const ADDON_ADD_COOLDOWN = 2000; // 2 seconds

window.handleAddAddonToBooking = async function (bookingId) {
  // ============================================
  // 🛡️ DUPLICATE PREVENTION CHECK
  // ============================================
  const now = Date.now();
  const timeSinceLastAdd = now - lastAddonAddTime;
  
  // Check if already adding an add-on
  if (isAddingAddon) {
    console.log('[handleAddAddonToBooking] BLOCKED - Already adding add-on');
    customAlert.warning('Please wait, add-on is being processed...');
    return;
  }
  
  // Check cooldown
  if (timeSinceLastAdd < ADDON_ADD_COOLDOWN) {
    const timeLeft = Math.ceil((ADDON_ADD_COOLDOWN - timeSinceLastAdd) / 1000);
    console.log(`[handleAddAddonToBooking] BLOCKED - Cooldown active. Time left: ${timeLeft}s`);
    customAlert.warning(`Please wait ${timeLeft} seconds before adding another add-on`);
    return;
  }
  
  // ============================================
  // ✅ ALLOW ADD-ON ADDITION
  // ============================================
  isAddingAddon = true;
  lastAddonAddTime = now;
  
  // Disable the Add button and show loading
  const addButton = document.getElementById(`addAddonBtn-${bookingId}`);
  if (addButton) {
    addButton.disabled = true;
    addButton.style.opacity = '0.5';
    addButton.style.cursor = 'not-allowed';
    addButton.textContent = 'Adding...';
  }
  
  // Show loading screen (lazy - non-blocking)
  if (typeof showTableLoader === 'function') {
    showTableLoader('#modalRoot');
  }
  
  try {
    const selectEl = document.getElementById(`addonSelect-${bookingId}`);
    const selectedValue = selectEl.value;

    if (!selectedValue) {
      customAlert.warning('Please select an add-on first');
      return;
    }

  const [packageId, tierLabel, price] = selectedValue.split('|');
  const packages = await getPackages();
  const addonPkg = packages.find(p => p.id === packageId);

  if (!addonPkg) {
    showCustomAlert('Add-on package not found', 'error');
    return;
  }

  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);

  if (!booking) {
    showCustomAlert('Booking not found', 'error');
    return;
  }

  // Initialize addOns array if not exists
  if (!booking.addOns) {
    booking.addOns = [];
  }

  // ============================================
  // 🛡️ CHECK FOR DUPLICATE ADD-ON
  // ============================================
  // Prevent adding the same add-on twice
  const addonAlreadyExists = booking.addOns.some(addon => 
    addon.id === packageId && addon.name === (addonPkg.name + (tierLabel !== 'Base' ? ` - ${tierLabel}` : ''))
  );

  if (addonAlreadyExists) {
    customAlert.warning(`This add-on is already added to the booking`);
    isAddingAddon = false;
    openAddonsModal(bookingId);
    return;
  }

  // Add the new add-on
  const addonPrice = parseFloat(price) || 0;
  if (isNaN(addonPrice)) {
    showCustomAlert('Invalid add-on price', 'error');
    return;
  }

  booking.addOns.push({
    id: packageId,
    name: addonPkg.name + (tierLabel !== 'Base' ? ` - ${tierLabel}` : ''),
    price: addonPrice
  });

  // Recalculate total - ensure all values are valid numbers
  const packagePrice = parseFloat(booking.cost?.packagePrice) || 0;
  const servicesTotal = (booking.cost?.services || []).reduce((sum, service) => sum + (parseFloat(service.price) || 0), 0);
  const addOnsTotal = booking.addOns.reduce((sum, addon) => sum + (parseFloat(addon.price) || 0), 0);
  const newSubtotal = packagePrice + servicesTotal + addOnsTotal;

  // Validate the result is a number
  if (isNaN(newSubtotal)) {
    alert('Error calculating total price');
    return;
  }

  // Update cost object
  if (!booking.cost) booking.cost = {};
  booking.cost.subtotal = newSubtotal;
  booking.totalPrice = newSubtotal;

  // Save bookings
  await saveBookings(bookings);

  // Log activity
  const bookingHistoryList = await getBookingHistory() || [];
  bookingHistoryList.push({
    bookingId: bookingId,
    timestamp: Date.now(),
    action: 'Add-on Added',
    message: `Added: ${addonPkg.name}${tierLabel !== 'Base' ? ` - ${tierLabel}` : ''} (₱${price})`,
    actor: 'Admin'
  });
  saveBookingHistory(bookingHistoryList);

    // Hide loading overlay
    if (typeof hideLoadingOverlay === 'function') {
      hideLoadingOverlay();
    }
    
    // Show success message
    customAlert.success(`Add-on added: ${addonPkg.name}`);

    // Refresh the modal
    openAddonsModal(bookingId);
    
  } catch (error) {
    console.error('[handleAddAddonToBooking] Error:', error);
    
    // Hide loading overlay
    if (typeof hideLoadingOverlay === 'function') {
      hideLoadingOverlay();
    }
    
    customAlert.error('Failed to add add-on. Please try again.');
  } finally {
    // ============================================
    // 🔄 RESET PROTECTION FLAGS
    // ============================================
    isAddingAddon = false;
    
    // Re-enable the Add button after a short delay
    setTimeout(() => {
      const addButton = document.getElementById(`addAddonBtn-${bookingId}`);
      if (addButton) {
        addButton.disabled = false;
        addButton.style.opacity = '1';
        addButton.style.cursor = 'pointer';
        addButton.textContent = 'Add';
      }
    }, 1000); // 1 second delay before re-enabling
  }
};

// Add-on removal protection
let isRemovingAddon = false;
let lastAddonRemoveTime = 0;
const ADDON_REMOVE_COOLDOWN = 1500; // 1.5 seconds

window.handleRemoveAddonFromBooking = async function (bookingId, addonIndex) {
  // ============================================
  // 🛡️ DUPLICATE PREVENTION CHECK
  // ============================================
  const now = Date.now();
  const timeSinceLastRemove = now - lastAddonRemoveTime;
  
  // Check if already removing an add-on
  if (isRemovingAddon) {
    console.log('[handleRemoveAddonFromBooking] BLOCKED - Already removing add-on');
    customAlert.warning('Please wait, add-on is being removed...');
    return;
  }
  
  // Check cooldown
  if (timeSinceLastRemove < ADDON_REMOVE_COOLDOWN) {
    const timeLeft = Math.ceil((ADDON_REMOVE_COOLDOWN - timeSinceLastRemove) / 1000);
    console.log(`[handleRemoveAddonFromBooking] BLOCKED - Cooldown active. Time left: ${timeLeft}s`);
    customAlert.warning(`Please wait ${timeLeft} second(s) before removing another add-on`);
    return;
  }
  
  // ============================================
  // ✅ ALLOW ADD-ON REMOVAL
  // ============================================
  isRemovingAddon = true;
  lastAddonRemoveTime = now;
  
  // Disable all remove buttons to prevent multiple clicks
  const removeButtons = document.querySelectorAll('[onclick*="handleRemoveAddonFromBooking"]');
  removeButtons.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  });
  
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);

    if (!booking || !booking.addOns) {
      customAlert.error('Booking or add-ons not found');
      return;
    }

  // Get the addon name before removing
  const removedAddon = booking.addOns[addonIndex];

  // Remove the add-on
  booking.addOns.splice(addonIndex, 1);

  // Recalculate total - ensure all values are valid numbers
  const packagePrice = parseFloat(booking.cost?.packagePrice) || 0;
  const servicesTotal = (booking.cost?.services || []).reduce((sum, service) => sum + (parseFloat(service.price) || 0), 0);
  const addOnsTotal = booking.addOns.reduce((sum, addon) => sum + (parseFloat(addon.price) || 0), 0);
  const newSubtotal = packagePrice + servicesTotal + addOnsTotal;

  // Validate the result is a number
  if (isNaN(newSubtotal)) {
    alert('Error calculating total price');
    return;
  }

  // Update cost object
  if (!booking.cost) booking.cost = {};
  booking.cost.subtotal = newSubtotal;
  booking.totalPrice = newSubtotal;

  // Save bookings
  await saveBookings(bookings);

  // Log activity
  const bookingHistoryList = await getBookingHistory() || [];
  bookingHistoryList.push({
    bookingId: bookingId,
    timestamp: Date.now(),
    action: 'Add-on Removed',
    message: `Removed: ${removedAddon.name} (₱${removedAddon.price})`,
    actor: 'Admin'
  });
  saveBookingHistory(bookingHistoryList);

    // Show success message
    customAlert.success(`Add-on removed: ${removedAddon.name}`);

    // Refresh the modal
    openAddonsModal(bookingId);
    
  } catch (error) {
    console.error('[handleRemoveAddonFromBooking] Error:', error);
    customAlert.error('Failed to remove add-on. Please try again.');
  } finally {
    // ============================================
    // 🔄 RESET PROTECTION FLAGS
    // ============================================
    isRemovingAddon = false;
  }
};

// OPEN ADD-ONS ONLY MODAL (No booking view)
window.openAddonsModal = async function (bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const packages = await getPackages();
  const availableAddonPackages = packages.filter(p => p.type === 'addon');

  let addonOptions = `<option value="">Select Add-on</option>`;
  availableAddonPackages.forEach(p => {
    if (p.tiers) {
      p.tiers.forEach(t => {
        const v = `${p.id}|${t.label}|${t.price}`;
        addonOptions += `<option value="${v}">${p.name} - ${t.label} (₱${t.price})</option>`;
      });
    } else {
      const v = `${p.id}|Base|${p.price}`;
      addonOptions += `<option value="${v}">${p.name} (₱${p.price})</option>`;
    }
  });

  const currentAddons = booking.addOns?.length
    ? booking.addOns.map((addon, idx) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;">
                <span style="font-weight:500;color:#374151">${escapeHtml(addon.name)}</span>
                <div style="display:flex;align-items:center;gap:1rem;">
                    <strong style="color:#059669;">₱${addon.price}</strong>
                    <button onclick="handleRemoveAddonFromBooking('${bookingId}',${idx})"
                        style="padding:0.35rem 0.8rem;border-radius:8px;border:1px solid #fca5a5;color:#dc2626;background:transparent;"
                        onmouseover="this.style.background='#fee2e2'"
                        onmouseout="this.style.background='transparent'">
                        Remove
                    </button>
                </div>
            </div>
        `).join('')
    : `<p style="color:#9ca3af;text-align:center;font-style:italic;padding:1rem;">No add-ons yet.</p>`;

  // Calculate prices (handle single service bookings)
  const isSingleServiceBooking = booking.packageId === 'single-service';
  const packagePrice = isSingleServiceBooking ? 0 : (booking.cost?.packagePrice || booking.totalPrice || 0);
  const servicesTotal = (booking.cost?.services || []).reduce((sum, s) => sum + (s.price || 0), 0);
  const addOnsTotal = booking.addOns?.reduce((sum, a) => sum + (a.price || 0), 0) || 0;
  const subtotal = packagePrice + servicesTotal + addOnsTotal;
  const bookingFee = booking.cost?.bookingFee || booking.bookingFee || 0;
  const remainingBalance = Math.max(0, subtotal - bookingFee);

  // Create content as HTML element instead of string
  const contentElement = document.createElement('div');
  
  // Display price breakdown at the top (correct order: Package/Services -> Add-ons -> Subtotal -> Fee -> Balance)
  const isPaidStatus = ['confirmed', 'completed', 'inProgress', 'in progress'].includes((booking.status || '').toLowerCase());
  const singleServicesArray = booking.cost?.services || [];
  const priceBreakdownDisplay = `
    <div style="background:#f9fafb;padding:1rem;border-radius:10px;margin-bottom:1.5rem;border:1px solid #e5e7eb;">
      ${isSingleServiceBooking && servicesTotal > 0 ? `
        <div style="margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">
            <span style="font-weight:500;color:#374151;">Single Services</span>
            <span style="font-weight:600;color:#111827;">${formatCurrency(servicesTotal)}</span>
          </div>
          ${singleServicesArray.map(s => `
            <div style="display:flex;justify-content:space-between;padding-left:0.75rem;font-size:0.9rem;">
              <span style="color:#6b7280;">• ${escapeHtml(s.label || s.serviceId || 'Service')}</span>
              <span style="color:#374151;">${formatCurrency(s.price || 0)}</span>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
          <span style="font-weight:500;color:#374151;">Package Price</span>
          <span style="font-weight:600;color:#111827;">${formatCurrency(packagePrice)}</span>
        </div>
      `}
      ${addOnsTotal > 0 ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
          <span style="font-weight:500;color:#374151;">Add-ons Total</span>
          <span style="font-weight:600;color:#111827;">${formatCurrency(addOnsTotal)}</span>
        </div>
      ` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:0.5rem;border-top:1px solid #e5e7eb;">
        <span style="font-weight:600;color:#111827;">Subtotal</span>
        <span style="font-weight:700;color:#111827;">${formatCurrency(subtotal)}</span>
      </div>
      ${bookingFee > 0 ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.5rem;padding:0.5rem;background:${isPaidStatus ? '#e8f5e9' : '#fff3e0'};border-radius:6px;">
          <span style="font-weight:500;color:${isPaidStatus ? '#2e7d32' : '#e65100'};">Booking Fee ${isPaidStatus ? '(Paid)' : '(To Pay)'}</span>
          <span style="font-weight:600;color:${isPaidStatus ? '#2e7d32' : '#e65100'};">- ${formatCurrency(bookingFee)}</span>
        </div>
      ` : ''}
    </div>
  `;
  
  contentElement.innerHTML = `
    <div style="display:flex;gap:0.75rem;margin-bottom:1.2rem;">
      <select id="addonSelect-${bookingId}" 
        style="flex:1;padding:0.7rem 1rem;border:1px solid #d1d5db;border-radius:10px;font-size:0.95rem;">
        ${addonOptions}
      </select>
      <button id="addAddonBtn-${bookingId}" onclick="handleAddAddonToBooking('${bookingId}')"
        style="padding:0.7rem 1.4rem;background:#111827;color:white;border:none;border-radius:10px;font-weight:600;">
        Add
      </button>
    </div>

    ${currentAddons}

    ${priceBreakdownDisplay}

    <div style="text-align:right;margin-top:1rem;border-top:2px solid #e5e7eb;padding-top:1rem;">
      <span style="font-size:1.15rem;font-weight:700;color:#111827;">
        Remaining Balance: <span style="color:#059669;">${formatCurrency(remainingBalance)}</span>
      </span>
    </div>
  `;

  // Use modalSystem.show directly for better control
  if (typeof modalSystem !== 'undefined') {
    modalSystem.show({
      title: 'Manage Add-ons',
      content: contentElement,
      actions: [
        {
          label: 'Close',
          handler: () => modalSystem.close(),
          style: 'outline'
        }
      ]
    });
  } else {
    showModal(contentElement.innerHTML, { maxWidth: '520px' });
  }
};

// OPEN BOOKING VIEW MODAL (with Price and Actions)
window.openSimpleBookingView = async function (bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const bookingCode = typeof getBookingDisplayCode === 'function'
    ? getBookingDisplayCode(booking)
    : booking.id;

  // Calculate prices
  const cost = booking.cost || {};
  const isSingleService = booking.packageId === 'single-service';
  
  // For single service: packagePrice should be 0, use servicesTotal instead
  // For packages: use cost.packagePrice or booking.totalPrice
  const packagePrice = isSingleService ? 0 : (cost.packagePrice || booking.totalPrice || 0);
  
  // Calculate single services total from cost.services or booking.singleServices
  let servicesTotal = 0;
  let singleServicesArray = [];
  if (isSingleService) {
    singleServicesArray = cost.services || [];
    servicesTotal = singleServicesArray.reduce((sum, s) => sum + (s.price || 0), 0);
    
    // Fallback: calculate from booking.singleServices if cost.services is empty
    if (servicesTotal === 0 && booking.singleServices?.length > 0) {
      const pricing = window.SINGLE_SERVICE_PRICING || {};
      singleServicesArray = booking.singleServices.map(serviceId => {
        const serviceInfo = pricing[serviceId];
        const label = serviceInfo?.label || serviceId;
        let price = 0;
        if (serviceInfo?.tiers) {
          const weightLabel = booking.petWeight || '';
          const isSmall = weightLabel.includes('5kg') || weightLabel.includes('below');
          const tier = isSmall ? serviceInfo.tiers.small : serviceInfo.tiers.large;
          price = tier?.price || 0;
        }
        return { label, price, serviceId };
      });
      servicesTotal = singleServicesArray.reduce((sum, s) => sum + (s.price || 0), 0);
    }
  }
  
  const addOnsTotal = booking.addOns?.reduce((sum, a) => sum + (a.price || 0), 0) || 0;
  const subtotal = packagePrice + servicesTotal + addOnsTotal;
  const bookingFee = cost.bookingFee || 0;
  const statusLower = (booking.status || '').toLowerCase();
  const isPaidStatus = ['confirmed', 'completed', 'inprogress', 'in progress'].includes(statusLower);
  const remainingBalance = isPaidStatus ? Math.max(0, subtotal - bookingFee) : subtotal;

  // Status badge
  const statusClass = statusLower === 'completed' ? 'badge-completed' : 
                      statusLower === 'confirmed' ? 'badge-confirmed' :
                      statusLower.includes('progress') ? 'badge-inprogress' :
                      statusLower.includes('cancel') ? 'badge-cancelled' : 'badge-pending';

  const modal = `
        <div class="modal-overlay" onclick="closeSimpleModal()" 
            style="background:rgba(0,0,0,0.5);position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;">
            
            <div class="modal-content" onclick="event.stopPropagation()"
                style="max-width:520px;width:90%;background:white;border-radius:14px;
                box-shadow:0 20px 30px rgba(0,0,0,0.12);">

                <!-- Header -->
                <div style="padding:1.5rem 2rem;border-bottom:1px solid #e5e7eb;
                    display:flex;justify-content:space-between;align-items:center;">
                    
                    <h2 style="margin:0;font-size:1.35rem;font-weight:700;color:#111827;">
                        ${escapeHtml(booking.customerName)} · ${escapeHtml(booking.petName)}
                    </h2>

                    <button onclick="closeSimpleModal()" 
                        style="background:transparent;border:none;font-size:1.75rem;
                        color:#9ca3af;cursor:pointer;line-height:1;">
                        ×
                    </button>
                </div>

                <!-- Body -->
                <div style="padding:1.5rem 2rem;max-height:60vh;overflow-y:auto;">
                    
                    <div style="display:grid;gap:0.75rem;font-size:0.95rem;">

                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong style="color:#6b7280;">Booking Code:</strong>
                            <span style="color:#111827;font-weight:600;">${bookingCode}</span>
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong style="color:#6b7280;">Service:</strong>
                            <span style="color:#111827;font-weight:500;">
                                ${escapeHtml(booking.packageName)}${booking.packageId === 'single-service' && booking.singleServices?.length ? ` (${booking.singleServices.map(id => getSingleServiceLabel(id)).join(', ')})` : ''}
                            </span>
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong style="color:#6b7280;">Schedule:</strong>
                            <span style="color:#111827;font-weight:500;">
                                ${formatDate(booking.date)} at ${formatTime(booking.time)}
                            </span>
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong style="color:#6b7280;">Phone:</strong>
                            <span style="color:#111827;font-weight:500;">${escapeHtml(booking.phone || "N/A")}</span>
                        </div>

                        ${booking.groomerId ? `
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong style="color:#6b7280;">Groomer:</strong>
                            <span style="background:#d1fae5;padding:0.3rem 0.6rem;border-radius:6px;color:#065f46;font-weight:600;">
                                ${escapeHtml(booking.groomerName)}
                            </span>
                        </div>` : ""}

                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong style="color:#6b7280;">Status:</strong>
                            <span class="badge ${statusClass}">${escapeHtml(booking.status)}</span>
                        </div>
                    </div>

                    <!-- Price Breakdown -->
                    <div style="background:#f9fafb;padding:1rem;border-radius:10px;margin-top:1rem;border:1px solid #e5e7eb;">
                        ${isSingleService && servicesTotal > 0 ? `
                        <div style="margin-bottom:0.4rem;">
                            <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
                                <span style="color:#374151;font-weight:500;">Single Services</span>
                                <span style="font-weight:600;">${formatCurrency(servicesTotal)}</span>
                            </div>
                            ${singleServicesArray.map(s => `
                            <div style="display:flex;justify-content:space-between;padding-left:0.75rem;font-size:0.9rem;">
                                <span style="color:#6b7280;">• ${escapeHtml(s.label || s.serviceId || 'Service')}</span>
                                <span style="color:#374151;">${formatCurrency(s.price || 0)}</span>
                            </div>`).join('')}
                        </div>
                        ` : `
                        <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;">
                            <span style="color:#374151;">Package Price</span>
                            <span style="font-weight:600;">${formatCurrency(packagePrice)}</span>
                        </div>
                        `}
                        ${addOnsTotal > 0 ? `
                        <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;">
                            <span style="color:#374151;">Add-ons</span>
                            <span style="font-weight:600;">${formatCurrency(addOnsTotal)}</span>
                        </div>` : ''}
                        <div style="display:flex;justify-content:space-between;padding-top:0.4rem;border-top:1px solid #e5e7eb;">
                            <span style="font-weight:600;">Subtotal</span>
                            <span style="font-weight:700;">${formatCurrency(subtotal)}</span>
                        </div>
                        ${bookingFee > 0 ? `
                        <div style="display:flex;justify-content:space-between;margin-top:0.4rem;padding:0.4rem;background:${isPaidStatus ? '#e8f5e9' : '#fff3e0'};border-radius:6px;">
                            <span style="color:${isPaidStatus ? '#2e7d32' : '#e65100'};">Booking Fee ${isPaidStatus ? '(Paid)' : '(To Pay)'}</span>
                            <span style="font-weight:600;color:${isPaidStatus ? '#2e7d32' : '#e65100'};">- ${formatCurrency(bookingFee)}</span>
                        </div>` : ''}
                        <div style="display:flex;justify-content:space-between;margin-top:0.5rem;padding:0.5rem;background:#e8f5e9;border-radius:6px;">
                            <span style="font-weight:700;color:#2e7d32;">Remaining Balance</span>
                            <span style="font-weight:700;color:#2e7d32;font-size:1.1rem;">${formatCurrency(remainingBalance)}</span>
                        </div>
                    </div>

                </div>

                <!-- Footer with Actions -->
                <div style="padding:1rem 2rem;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                        ${statusLower === 'completed' || statusLower.includes('cancel') ? '' : `
                            <button onclick="closeSimpleModal(); openRescheduleModal('${bookingId}')" 
                                style="padding:0.5rem 1rem;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:8px;font-weight:500;cursor:pointer;">
                                🔄 Reschedule
                            </button>
                        `}
                        ${statusLower === 'completed' || statusLower.includes('cancel') ? '' : `
                            <button onclick="closeSimpleModal(); openCancelModal('${bookingId}')" 
                                style="padding:0.5rem 1rem;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:8px;font-weight:500;cursor:pointer;">
                                ✖ Cancel
                            </button>
                        `}
                    </div>
                    <button onclick="closeSimpleModal()" 
                        style="padding:0.5rem 1.25rem;background:white;color:#374151;
                        border:1px solid #d1d5db;border-radius:8px;font-weight:600;cursor:pointer;">
                        Close
                    </button>
                </div>

            </div>
        </div>
    `;

  // Use modalRoot if exists, otherwise create one
  let modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) {
    modalRoot = document.createElement('div');
    modalRoot.id = 'modalRoot';
    document.body.appendChild(modalRoot);
  }
  modalRoot.innerHTML = modal;
};

// Close simple modal helper
window.closeSimpleModal = function() {
  const modalRoot = document.getElementById('modalRoot');
  if (modalRoot) {
    modalRoot.innerHTML = '';
  }
};

// ==================== BOOKING HISTORY ====================

// Load and display booking history (completed, cancelled confirmed bookings, no-show)
window.loadBookingHistory = async function () {
  const bookings = await getBookings();
  const historyBookings = bookings.filter(b => {
    const status = (b.status || '').toLowerCase();
    const isCancelled = status === 'cancelled' || status === 'cancelledbycustomer' || status === 'cancelledbyadmin';
    
    // Include completed bookings
    if (status === 'completed') return true;
    
    // Include no-show bookings
    if (status === 'no-show') return true;
    
    // Include cancelled bookings ONLY if they were confirmed or inProgress before cancellation
    // Don't record pending bookings that were cancelled (waste of data)
    if (isCancelled && (b.previousStatus === 'confirmed' || b.previousStatus === 'inProgress' || b.wasConfirmed)) {
      return true;
    }
    
    return false;
  });

  renderBookingHistoryTable(historyBookings);
};

// Booking History state for the bookinghistoryView
let bookingHistoryCache = [];
let bookingHistorySearchTimeout = null;
let bookingHistoryState = {
  page: 1,
  pageSize: 5,
  sortBy: 'date',
  sortOrder: 'desc',
  searchTerm: ''
};

// Render booking history table with Actions dropdown, sorting, and pagination
window.renderBookingHistoryTable = function (bookings) {
  const container = document.getElementById('bookingHistoryTableContainer');
  if (!container) return;

  // Cache the bookings for pagination
  if (bookings) {
    bookingHistoryCache = bookings;
  }

  let filteredBookings = [...bookingHistoryCache];

  // Apply search filter
  if (bookingHistoryState.searchTerm) {
    const q = bookingHistoryState.searchTerm.toLowerCase();
    filteredBookings = filteredBookings.filter(b =>
      (b.customerName || '').toLowerCase().includes(q) ||
      (b.petName || '').toLowerCase().includes(q) ||
      (b.packageName || '').toLowerCase().includes(q) ||
      (b.status || '').toLowerCase().includes(q)
    );
  }

  if (filteredBookings.length === 0) {
    const message = bookingHistoryState.searchTerm 
      ? `No results found for "${bookingHistoryState.searchTerm}". Try a different search term.`
      : 'No booking history available yet.';
    container.innerHTML = `
      <div style="padding: 3rem 2rem; text-align: center; background: #f9fafb; border-radius: var(--radius); border: 2px dashed var(--gray-300);">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📋</div>
        <p style="color: var(--gray-700); font-size: 1.1rem; margin-bottom: 0.5rem; font-weight: 500;">${message}</p>
        ${bookingHistoryState.searchTerm ? `<p style="color: var(--gray-600); font-size: 0.9rem; margin-bottom: 1rem;">Clear the search to see all bookings.</p><button class="btn btn-primary btn-sm" onclick="clearBookingHistorySearch()">🔄 Clear Search</button>` : ''}
      </div>
    `;
    return;
  }

  // Apply sorting
  const sortBy = bookingHistoryState.sortBy || 'date';
  const sortOrder = bookingHistoryState.sortOrder || 'desc';

  filteredBookings.sort((a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'customer':
        valA = (a.customerName || '').toLowerCase();
        valB = (b.customerName || '').toLowerCase();
        break;
      case 'status':
        valA = (a.status || '').toLowerCase();
        valB = (b.status || '').toLowerCase();
        break;
      case 'amount':
        valA = a.totalPrice || a.cost?.subtotal || 0;
        valB = b.totalPrice || b.cost?.subtotal || 0;
        break;
      case 'date':
      default:
        valA = new Date(a.date + ' ' + (a.time || '00:00'));
        valB = new Date(b.date + ' ' + (b.time || '00:00'));
        break;
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const pageSize = bookingHistoryState.pageSize || 5;
  const currentPage = bookingHistoryState.page || 1;
  const totalItems = filteredBookings.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  // Build HTML with controls
  let html = `
    <div class="search-bar" style="margin-bottom: 1rem;">
      <input type="text" id="bookingHistorySearch" class="search-input"
        placeholder="🔍 Search by customer name, pet name, package, or status..."
        value="${bookingHistoryState.searchTerm || ''}"
        onkeyup="searchBookingHistory(this.value)">
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <label style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Show:</label>
        <select id="bookingHistoryPageSize" class="form-select" style="width: auto; padding: 0.5rem;" onchange="changeBookingHistoryPageSize(this.value)">
          <option value="5" ${pageSize === 5 ? 'selected' : ''}>5</option>
          <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
        </select>
        <span style="font-size: 0.9rem; color: var(--gray-600);">entries</span>
      </div>
      <div style="font-size: 0.9rem; color: var(--gray-600);">
        Showing ${startIndex + 1} to ${endIndex} of ${totalItems}
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding: 0.5rem; background: var(--gray-50); border-radius: var(--radius-sm);">
      <label style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Sort by:</label>
      <select id="bookingHistorySortField" class="form-select" style="width: auto; padding: 0.5rem;" onchange="changeBookingHistorySortField(this.value)">
        <option value="date" ${sortBy === 'date' ? 'selected' : ''}>Date</option>
        <option value="customer" ${sortBy === 'customer' ? 'selected' : ''}>Customer</option>
        <option value="status" ${sortBy === 'status' ? 'selected' : ''}>Status</option>
        <option value="amount" ${sortBy === 'amount' ? 'selected' : ''}>Amount</option>
      </select>
      <select id="bookingHistorySortOrder" class="form-select" style="width: auto; padding: 0.5rem;" onchange="changeBookingHistorySortOrder(this.value)">
        <option value="desc" ${sortOrder === 'desc' ? 'selected' : ''}>Newest First</option>
        <option value="asc" ${sortOrder === 'asc' ? 'selected' : ''}>Oldest First</option>
      </select>
    </div>

    <div class="table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>DATE & TIME</th>
            <th>CUSTOMER</th>
            <th>PET</th>
            <th>PACKAGE</th>
            <th>PRICE</th>
            <th>STATUS</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
  `;

  paginatedBookings.forEach(booking => {
    const statusLower = (booking.status || '').toLowerCase();
    const isCancelled = statusLower === 'cancelled' || statusLower === 'cancelledbycustomer' || statusLower === 'cancelledbyadmin';
    const statusClass = statusLower === 'completed' ? 'badge-completed' :
      isCancelled ? 'badge-cancelled' : 'badge-noshow';
    const statusText = isCancelled ? 'Cancelled' : (booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('-', ' '));
    const totalPrice = booking.totalPrice || booking.cost?.subtotal || 0;
    const priceButton = totalPrice > 0
      ? `<button class="btn btn-sm" style="background: #2e7d32; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 0.25rem; cursor: pointer; font-weight: 600;" onclick="openPricingBreakdownModal('${booking.id}')">${formatCurrency(totalPrice)}</button>`
      : '—';

    html += `
      <tr>
        <td>${formatDate(booking.date)} · ${formatTime(booking.time)}</td>
        <td>${escapeHtml(booking.customerName || 'N/A')}</td>
        <td>${escapeHtml(booking.petName || 'N/A')}</td>
        <td>${escapeHtml(booking.packageName || 'N/A')}${booking.packageId === 'single-service' && booking.singleServices?.length ? `<br><span style="font-size: 0.8rem; color: var(--gray-600);">${booking.singleServices.map(id => getSingleServiceLabel(id)).join(', ')}</span>` : ''}</td>
        <td>${priceButton}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>
          <div class="actions-dropdown">
            <button class="actions-btn" onclick="toggleActionsDropdown(event, '${booking.id}')">Actions</button>
            <div class="actions-menu">
              <button class="actions-menu-item" onclick="openSimpleBookingView('${booking.id}')">👁 View</button>
              <button class="actions-menu-item" onclick="protectedOpenRescheduleModal('${booking.id}')">🔄 Reschedule</button>
            </div>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  // Pagination controls
  if (totalPages > 1) {
    html += `
      <div style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1rem;">
        <button class="btn btn-sm btn-outline" onclick="changeBookingHistoryPage(1)" ${currentPage === 1 ? 'disabled' : ''}>«</button>
        <button class="btn btn-sm btn-outline" onclick="changeBookingHistoryPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>
        <span style="padding: 0.5rem 1rem; font-size: 0.9rem; color: var(--gray-700);">Page ${currentPage} of ${totalPages}</span>
        <button class="btn btn-sm btn-outline" onclick="changeBookingHistoryPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>
        <button class="btn btn-sm btn-outline" onclick="changeBookingHistoryPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>»</button>
      </div>
    `;
  }

  container.innerHTML = html;
};

// Booking History sorting and pagination handlers
window.searchBookingHistory = async function (query) {
  // Clear previous timeout
  if (bookingHistorySearchTimeout) {
    clearTimeout(bookingHistorySearchTimeout);
  }
  
  // Set new timeout - wait 300ms after user stops typing
  bookingHistorySearchTimeout = setTimeout(async () => {
    bookingHistoryState.searchTerm = query;
    bookingHistoryState.page = 1;
    
    // If cache is empty, load the data first
    if (bookingHistoryCache.length === 0) {
      try {
        const bookings = await getBookings();
        const historyBookings = bookings.filter(b => {
          const status = (b.status || '').toLowerCase();
          const isCancelled = status === 'cancelled' || status === 'cancelledbycustomer' || status === 'cancelledbyadmin';
          if (status === 'completed') return true;
          if (status === 'no-show') return true;
          if (isCancelled && (b.previousStatus === 'confirmed' || b.previousStatus === 'inProgress' || b.wasConfirmed)) {
            return true;
          }
          return false;
        });
        bookingHistoryCache = historyBookings;
      } catch (e) {
        console.error('Error loading booking history:', e);
        return;
      }
    }
    
    renderBookingHistoryTable();
  }, 300);
};

// Clear search functions
window.clearBookingHistorySearch = function () {
  bookingHistoryState.searchTerm = '';
  bookingHistoryState.page = 1;
  const searchInput = document.getElementById('bookingHistorySearch');
  if (searchInput) searchInput.value = '';
  renderBookingHistoryTable();
};

window.clearInprogressSearch = function () {
  adminState.inprogressSearchTerm = '';
  adminState.inprogressPage = 1;
  const searchInput = document.getElementById('inprogressSearch');
  if (searchInput) searchInput.value = '';
  loadInProgressBookings();
};

window.clearConfirmedSearch = function () {
  adminState.confirmedSearchTerm = '';
  adminState.confirmedPage = 1;
  const searchInput = document.getElementById('confirmedSearch');
  if (searchInput) searchInput.value = '';
  renderConfirmedBookingsTable();
};

window.clearPendingSearch = function () {
  const searchInput = document.getElementById('pendingSearch');
  if (searchInput) searchInput.value = '';
  loadPendingBookings();
};

window.changeBookingHistorySortField = function (field) {
  bookingHistoryState.sortBy = field;
  bookingHistoryState.page = 1;
  renderBookingHistoryTable();
};

window.changeBookingHistorySortOrder = function (order) {
  bookingHistoryState.sortOrder = order;
  bookingHistoryState.page = 1;
  renderBookingHistoryTable();
};

window.changeBookingHistoryPageSize = function (size) {
  bookingHistoryState.pageSize = parseInt(size, 10);
  bookingHistoryState.page = 1;
  renderBookingHistoryTable();
};

window.changeBookingHistoryPage = function (page) {
  const totalItems = bookingHistoryCache.length;
  const totalPages = Math.ceil(totalItems / bookingHistoryState.pageSize) || 1;
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  bookingHistoryState.page = page;
  renderBookingHistoryTable();
};

// Open reschedule modal
window.openRescheduleModal = async function (bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  console.log('Booking data for reschedule:', booking); // Debug log

  // Store the booking data for reschedule in sessionStorage
  const rescheduleData = {
    isReschedule: true,
    originalBookingId: booking.id,
    customerName: booking.customerName,
    customerEmail: booking.profile?.ownerEmail || booking.customerEmail || '',
    customerPhone: booking.phone || booking.customerPhone || '',
    customerAddress: booking.profile?.ownerAddress || booking.customerAddress || '',
    petName: booking.petName,
    petType: booking.petType,
    petBreed: booking.profile?.petBreed || booking.petBreed || '',
    petAge: booking.profile?.petAge || booking.petAge || '',
    petWeight: booking.petWeight || booking.profile?.petWeight || '',
    packageId: booking.packageId,
    addOns: booking.addOns || [],
    medicalNotes: booking.profile?.medicalNotes || booking.medicalNotes || '',
    specialInstructions: booking.bookingNotes || booking.specialInstructions || '',
    groomingNotes: booking.groomingNotes || '',
    currentDate: booking.date,
    currentTime: booking.time,
    currentGroomerId: booking.groomerId
  };

  console.log('Reschedule data to store:', rescheduleData); // Debug log
  sessionStorage.setItem('rescheduleData', JSON.stringify(rescheduleData));
  
  // Redirect to booking page
  window.location.href = 'booking.html?mode=reschedule';
};

// Handle reschedule - create new booking with new date/service
window.handleReschedule = async function (oldBookingId) {
  try {
    const serviceId = document.getElementById(`reschedule-service-${oldBookingId}`)?.value;
    const newDate = document.getElementById(`reschedule-date-${oldBookingId}`)?.value;
    const newTime = document.getElementById(`reschedule-time-${oldBookingId}`)?.value;

    if (!serviceId || !newDate || !newTime) {
      customAlert.warning('Please fill in all fields');
      return;
    }

    const bookings = await getBookings();
    const oldBooking = bookings.find(b => b.id === oldBookingId);
    if (!oldBooking) {
      customAlert.error('Booking not found');
      return;
    }

    const packages = await getPackages();
    const selectedPackage = packages.find(p => p.id === serviceId);

    // Create new booking (rescheduled)
    const newBooking = {
      ...oldBooking,
      id: `booking_${Date.now()}`,
      packageId: serviceId,
      packageName: selectedPackage?.name || oldBooking.packageName,
      date: newDate,
      time: newTime,
      status: 'confirmed',
      rescheduledFrom: oldBookingId,
      createdAt: Date.now()
    };

    bookings.push(newBooking);

    // Mark old booking as rescheduled
    oldBooking.rescheduledTo = newBooking.id;
    oldBooking.status = 'rescheduled';

    // Log the reschedule action
    logBookingHistory({
      bookingId: oldBookingId,
      action: 'Rescheduled',
      message: `Rescheduled to ${formatDate(newDate)} at ${formatTime(newTime)}`,
      actor: 'Admin'
    });

    await saveBookings(bookings);
    
    // Close modal properly
    if (typeof modalSystem !== 'undefined' && modalSystem.close) {
      modalSystem.close();
    }
    
    customAlert.success('Booking rescheduled successfully!');

    // Reload the current view
    if (typeof loadBookingHistory === 'function') {
      await loadBookingHistory();
    }
    if (typeof switchView === 'function') {
      switchView(currentView);
    }
  } catch (error) {
    console.error('Error rescheduling booking:', error);
    customAlert.error('Failed to reschedule booking. Please try again.');
  }
};


// Add Booking History navigation handler
document.addEventListener('DOMContentLoaded', function () {
  const historyLink = document.querySelector('[data-view="bookinghistory"]');
  if (historyLink) {
    historyLink.addEventListener('click', function (e) {
      e.preventDefault();

      // Hide all views
      document.querySelectorAll('[id$="View"]').forEach(view => {
        view.style.display = 'none';
      });

      // Remove active class from all links
      document.querySelectorAll('[data-view]').forEach(link => {
        link.classList.remove('active');
      });

      // Show booking history view
      const bookinghistoryView = document.getElementById('bookinghistoryView');
      if (bookinghistoryView) {
        bookinghistoryView.style.display = 'block';
      }

      // Add active class
      this.classList.add('active');

      // Load booking history data
      loadBookingHistory();
    });
  }
});


// ==================== COLLAPSIBLE SIDEBAR ====================

window.toggleSidebarSection = function (sectionId) {
  const section = document.getElementById(`sidebar-${sectionId}`);
  const submenu = document.getElementById(`submenu-${sectionId}`);
  const arrow = section?.querySelector('.dropdown-arrow');

  if (!submenu) return;

  const isOpen = submenu.classList.contains('open');

  if (isOpen) {
    submenu.classList.remove('open');
    section.classList.remove('open');
    if (arrow) arrow.textContent = '›';
  } else {
    submenu.classList.add('open');
    section.classList.add('open');
    if (arrow) arrow.textContent = '▼';
  }
};



// ==================== ACTION DROPDOWN FUNCTIONS ====================

window.toggleActionDropdown = function (button) {
  const dropdown = button.closest('.action-dropdown');
  const menu = dropdown.querySelector('.action-dropdown-menu');

  // Close all other dropdowns
  document.querySelectorAll('.action-dropdown-menu.show').forEach(m => {
    if (m !== menu) m.classList.remove('show');
  });

  // Toggle current dropdown
  menu.classList.toggle('show');
};

window.closeActionDropdown = function (button) {
  const dropdown = button.closest('.action-dropdown');
  const menu = dropdown.querySelector('.action-dropdown-menu');
  menu.classList.remove('show');
};

// Close dropdown when clicking outside
document.addEventListener('click', function (e) {
  if (!e.target.closest('.action-dropdown')) {
    document.querySelectorAll('.action-dropdown-menu.show').forEach(menu => {
      menu.classList.remove('show');
    });
  }
});



// Open pricing breakdown modal for admin
async function openPricingBreakdownModal(bookingId) {
  let bookings = [];
  try {
    bookings = await getBookings();
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

  // Get the base package price (without add-ons)
  const packagePrice = cost.packagePrice || 0;

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
  
  // Get single services - from cost.services or calculate from booking.singleServices
  let singleServicesArray = cost.services || [];
  let servicesTotal = singleServicesArray.reduce((sum, service) => sum + (service.price || 0), 0);
  
  // If no cost.services but booking has singleServices, calculate from SINGLE_SERVICE_PRICING
  if (singleServicesArray.length === 0 && booking.singleServices?.length > 0) {
    const pricing = window.SINGLE_SERVICE_PRICING || {};
    singleServicesArray = booking.singleServices.map(serviceId => {
      const serviceInfo = pricing[serviceId];
      const label = serviceInfo?.label || serviceId;
      let price = 0;
      if (serviceInfo?.tiers) {
        const weightLabel = booking.petWeight || '';
        const isSmall = weightLabel.includes('5kg') || weightLabel.includes('below');
        const tier = isSmall ? serviceInfo.tiers.small : serviceInfo.tiers.large;
        price = tier?.price || 0;
      }
      return { label, price, serviceId };
    });
    servicesTotal = singleServicesArray.reduce((sum, s) => sum + (s.price || 0), 0);
  }

  // Calculate correct total: Total Amount = Subtotal - Booking Fee (MINUS, not plus!)
  const subtotal = packagePrice + servicesTotal + addOnsTotal;
  const totalAmount = Math.max(0, subtotal - bookingFee);

  const modalContent = `
    <div style="max-width: 500px;">
      <h2 style="margin-bottom: 1.5rem; color: var(--gray-900);">💰 Pricing Breakdown</h2>
      
      <div style="background: var(--gray-50); padding: 1.5rem; border-radius: var(--radius); margin-bottom: 1.5rem;">
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem; margin-bottom: 1rem;">
          <span style="color: var(--gray-700); font-weight: 500;">Booking ID:</span>
          <span style="font-weight: 600; color: var(--gray-900);">${escapeHtml(typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : booking.id)}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem; margin-bottom: 1rem;">
          <span style="color: var(--gray-700); font-weight: 500;">Customer:</span>
          <span style="font-weight: 600; color: var(--gray-900);">${escapeHtml(booking.customerName)}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem;">
          <span style="color: var(--gray-700); font-weight: 500;">Pet:</span>
          <span style="font-weight: 600; color: var(--gray-900);">${escapeHtml(booking.petName)}</span>
        </div>
      </div>

      <div style="border-top: 2px solid var(--gray-200); padding-top: 1rem; margin-bottom: 1rem;">
        <h3 style="margin-bottom: 1rem; font-size: 1rem; color: var(--gray-900);">Cost Breakdown</h3>
        
        ${packagePrice > 0 ? `
          <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem; margin-bottom: 0.75rem;">
            <span style="color: var(--gray-700);">📦 Package (${booking.packageName}):</span>
            <span style="font-weight: 600; color: var(--gray-900);">${formatCurrency(packagePrice)}</span>
          </div>
        ` : ''}

        ${singleServicesArray.length > 0 ? `
          <div style="margin-bottom: 0.75rem;">
            <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem; margin-bottom: 0.5rem;">
              <span style="color: var(--gray-700); font-weight: 500;">🛁 Single Services:</span>
              <span style="font-weight: 600; color: var(--gray-900);">${formatCurrency(servicesTotal)}</span>
            </div>
            ${singleServicesArray.map(service => `
              <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem; margin-left: 1rem;">
                <span style="color: var(--gray-600);">• ${escapeHtml(service.label || service.serviceId || 'Service')}</span>
                <span style="font-weight: 600; color: var(--gray-900);">${formatCurrency(service.price || 0)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${addOnsArray.length > 0 ? `
          <div style="margin-bottom: 0.75rem;">
            <span style="color: var(--gray-700); font-weight: 500;">✨ Add-ons:</span>
            ${addOnsArray.map(addon => `
              <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem; margin-top: 0.5rem; margin-left: 1rem;">
                <span style="color: var(--gray-600);">• ${escapeHtml(addon.label)}</span>
                <span style="font-weight: 600; color: var(--gray-900);">${formatCurrency(addon.price)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem; margin-bottom: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--gray-300);">
          <span style="color: var(--gray-700); font-weight: 600;">Subtotal:</span>
          <span style="font-weight: 700; color: var(--gray-900); font-size: 1.1rem;">${formatCurrency(subtotal)}</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem; margin-bottom: 1rem; background: ${['confirmed', 'completed', 'inProgress'].includes(booking.status) ? '#e8f5e9' : '#fff3cd'}; padding: 0.75rem; border-radius: 0.25rem;">
          <span style="color: ${['confirmed', 'completed', 'inProgress'].includes(booking.status) ? '#2e7d32' : 'var(--danger, #dc3545)'}; font-weight: 500;">🎫 Booking Fee ${['confirmed', 'completed', 'inProgress'].includes(booking.status) ? '(Paid)' : '(To Pay)'}:</span>
          <span style="font-weight: 600; color: ${['confirmed', 'completed', 'inProgress'].includes(booking.status) ? '#2e7d32' : 'var(--danger, #dc3545)'};">- ${formatCurrency(bookingFee)}</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem; background: #e8f5e9; padding: 1rem; border-radius: 0.25rem; border-left: 4px solid #2e7d32;">
          <span style="color: #2e7d32; font-weight: 700; font-size: 1.1rem;">💰 Total Amount:</span>
          <span style="font-weight: 700; color: #2e7d32; font-size: 1.2rem;">${formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <div style="margin-top: 1.5rem; text-align: center;">
        <button class="btn btn-primary" onclick="modalSystem.close()" style="width: 100%;">Close</button>
      </div>
    </div>
  `;

  showModal(modalContent);
}
window.openPricingBreakdownModal = openPricingBreakdownModal;


// Open revenue details modal for admin
async function openRevenueDetailsModal() {
  let bookings = [];
  try {
    bookings = await getBookings();
  } catch (e) {
    console.warn('Failed to fetch bookings:', e);
    return;
  }

  // Filter confirmed and completed bookings
  const normalize = s => String(s || '').trim().toLowerCase();
  const revenueBookings = bookings.filter(b => ['confirmed', 'completed'].includes(normalize(b.status)));

  if (revenueBookings.length === 0) {
    showModal(`
      <div style="text-align: center; padding: 2rem;">
        <h2 style="margin-bottom: 1rem;">💰 Revenue Details</h2>
        <p style="color: var(--gray-600);">No confirmed or completed bookings yet.</p>
      </div>
    `);
    return;
  }

  // Calculate totals
  let totalRevenue = 0;
  let totalPackages = 0;
  let totalAddOns = 0;
  let totalBookingFees = 0;

  const bookingDetails = revenueBookings.map(booking => {
    const cost = booking.cost || {};
    const isSingleServiceBooking = booking.packageId === 'single-service';
    const packagePrice = isSingleServiceBooking ? 0 : (parseFloat(cost.packagePrice) || 0);
    const servicesTotal = (cost.services || []).reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
    const addOnsTotal = (booking.addOns || []).reduce((sum, addon) => sum + (parseFloat(addon.price) || 0), 0);
    const bookingFee = parseFloat(cost.bookingFee) || 100;
    // Use cost.totalAmount if available, otherwise calculate from components
    const totalPrice = parseFloat(cost.totalAmount) || parseFloat(booking.totalPrice) || (packagePrice + servicesTotal + addOnsTotal);

    totalRevenue += totalPrice;
    totalPackages += packagePrice + servicesTotal; // Include services in package total for revenue
    totalAddOns += addOnsTotal;
    totalBookingFees += bookingFee;

    return {
      id: typeof getBookingDisplayCode === 'function' ? getBookingDisplayCode(booking) : booking.id,
      customer: booking.ownerName || booking.customerName || '—',
      pet: booking.petName || '—',
      package: booking.packageName || '—',
      packagePrice: packagePrice + servicesTotal, // Show combined for display
      addOnsTotal,
      bookingFee,
      totalPrice,
      date: booking.date,
      time: booking.time
    };
  });

  const modalContent = `
    <div style="max-width: 900px;">
      <h2 style="margin-bottom: 1.5rem; color: var(--gray-900);">💰 Revenue Details</h2>
      
      <!-- Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div style="background: #e8f5e9; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid #2e7d32;">
          <div style="color: #2e7d32; font-size: 0.9rem; font-weight: 600;">Total Revenue</div>
          <div style="color: #2e7d32; font-size: 1.8rem; font-weight: 700; margin-top: 0.5rem;">${formatCurrency(totalRevenue)}</div>
        </div>
        <div style="background: var(--gray-100); padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--gray-900);">
          <div style="color: var(--gray-900); font-size: 0.9rem; font-weight: 600;">Packages</div>
          <div style="color: var(--gray-900); font-size: 1.8rem; font-weight: 700; margin-top: 0.5rem;">${formatCurrency(totalPackages)}</div>
        </div>
        <div style="background: var(--gray-50); padding: 1rem; border-radius: 0.5rem; border-left: 4px solid var(--gray-700);">
          <div style="color: var(--gray-700); font-size: 0.9rem; font-weight: 600;">Add-ons</div>
          <div style="color: var(--gray-700); font-size: 1.8rem; font-weight: 700; margin-top: 0.5rem;">${formatCurrency(totalAddOns)}</div>
        </div>
        <div style="background: #e8f5e9; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid #2e7d32;">
          <div style="color: #2e7d32; font-size: 0.9rem; font-weight: 600;">Booking Fees (Collected)</div>
          <div style="color: #2e7d32; font-size: 1.8rem; font-weight: 700; margin-top: 0.5rem;">${formatCurrency(totalBookingFees)}</div>
        </div>
      </div>

      <!-- Detailed Table with Black & White Striped Theme -->
      <div style="border-top: 2px solid var(--gray-900); padding-top: 1.5rem; margin-bottom: 1.5rem;">
        <h3 style="margin-bottom: 1rem; color: var(--gray-900);">Booking Breakdown</h3>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
              <tr style="background: var(--gray-900); color: white;">
                <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Booking ID</th>
                <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Customer</th>
                <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Pet</th>
                <th style="padding: 0.75rem; text-align: right; font-weight: 600;">Package</th>
                <th style="padding: 0.75rem; text-align: right; font-weight: 600;">Add-ons</th>
                <th style="padding: 0.75rem; text-align: right; font-weight: 600;">Subtotal</th>
                <th style="padding: 0.75rem; text-align: right; font-weight: 600;">Booking Fee</th>
                <th style="padding: 0.75rem; text-align: right; font-weight: 600;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${bookingDetails.map((b, idx) => {
    const subtotal = b.packagePrice + b.addOnsTotal;
    const rowBg = idx % 2 === 0 ? 'background: white;' : 'background: var(--gray-100);';
    return `<tr style="${rowBg} border-bottom: 1px solid var(--gray-300);"><td style="padding: 0.75rem; font-weight: 600; color: var(--gray-900);">${escapeHtml(b.id)}</td><td style="padding: 0.75rem;">${escapeHtml(b.customer)}</td><td style="padding: 0.75rem;">${escapeHtml(b.pet)}</td><td style="padding: 0.75rem; text-align: right;">${formatCurrency(b.packagePrice)}</td><td style="padding: 0.75rem; text-align: right; color: #f57c00; font-weight: 600;">${formatCurrency(b.addOnsTotal)}</td><td style="padding: 0.75rem; text-align: right; font-weight: 600;">${formatCurrency(subtotal)}</td><td style="padding: 0.75rem; text-align: right; color: #dc3545; font-weight: 600;">-${formatCurrency(b.bookingFee)}</td><td style="padding: 0.75rem; text-align: right; font-weight: 700; color: #2e7d32;">${formatCurrency(b.totalPrice)}</td></tr>`;
  }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div style="text-align: center; margin-top: 1.5rem;">
        <button class="btn btn-primary" onclick="modalSystem.close()" style="width: 100%;">Close</button>
      </div>
    </div>
  `;

  showModal(modalContent, { maxWidth: '1000px' });
}
window.openRevenueDetailsModal = openRevenueDetailsModal;

// ============================================
// 📊 GROOMER WORKLOAD MANAGEMENT SYSTEM
// ============================================
// Tracks and displays groomer workload, capacity, and fair assignment
// Used by admin to balance work distribution and monitor capacity
// ============================================

// Load groomer workload view
async function loadGroomerWorkloadView() {
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  const datePicker = document.getElementById('workloadDatePicker');
  if (datePicker && !datePicker.value) {
    datePicker.value = today;
  }
  
  await loadGroomerWorkload();
}

// Set workload date to today
function setWorkloadDateToday() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('workloadDatePicker').value = today;
  loadGroomerWorkload();
}

// Set workload date to tomorrow
function setWorkloadDateTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  document.getElementById('workloadDatePicker').value = tomorrowStr;
  loadGroomerWorkload();
}

// ============================================
// 📊 GROOMER WORKLOAD CALCULATION
// ============================================
// Calculates workload metrics for each groomer on selected date
// Metrics include:
// - Daily bookings (today's workload)
// - Total confirmed bookings (all-time for fair assignment)
// - Yesterday's picks (for fair rotation)
// - Available capacity (remaining slots)
// - Utilization rate (% of capacity used)
// - Absence status (unavailable dates)
// ============================================
async function loadGroomerWorkload() {
  const selectedDate = document.getElementById('workloadDatePicker').value;
  if (!selectedDate) return;

  try {
    // Get all groomers and bookings
    const groomers = (typeof getGroomers === 'function') ? await getGroomers() : [];
    const bookings = (typeof getBookings === 'function') ? await getBookings() : [];
    
    if (!Array.isArray(groomers) || groomers.length === 0) {
      document.getElementById('groomerWorkloadCards').innerHTML = `
        <div class="card" style="text-align: center; padding: 3rem;">
          <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">👥</div>
          <p style="color: var(--gray-600);">No groomers found</p>
        </div>
      `;
      return;
    }

    // ============================================
    // 📈 CALCULATE WORKLOAD STATS FOR EACH GROOMER
    // ============================================
    const groomerStats = await Promise.all(groomers.map(async (groomer) => {
      // ============================================
      // 📅 DAILY BOOKINGS (Selected Date Only)
      // ============================================
      // Count bookings for the selected date
      // Excludes cancelled bookings (all cancellation types)
      // Used to calculate today's workload and available capacity
      // ============================================
      const dailyBookings = bookings.filter(b => 
        b.groomerId === groomer.id && 
        b.date === selectedDate &&
        !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes((b.status || '').toLowerCase())
      );

      // ============================================
      // 🎯 TOTAL CONFIRMED BOOKINGS (All Time)
      // ============================================
      // Count ALL confirmed/completed bookings (not just today)
      // Excludes pending and cancelled bookings
      // Used for FAIR ASSIGNMENT - groomers with fewer total bookings get priority
      // This ensures work is distributed evenly over time
      // ============================================
      const totalBookings = bookings.filter(b => 
        b.groomerId === groomer.id &&
        ['confirmed', 'completed', 'inprogress', 'in progress'].includes((b.status || '').toLowerCase())
      );
      
      // ============================================
      // 📆 YESTERDAY'S PICKS (Fair Rotation)
      // ============================================
      // Count how many times this groomer was picked yesterday
      // Used for daily fair rotation - groomers picked less yesterday get priority today
      // Helps balance workload on a day-to-day basis
      // ============================================
      const yesterday = new Date(selectedDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const yesterdayPicks = bookings.filter(b => 
        b.groomerId === groomer.id &&
        b.date === yesterdayStr &&
        ['confirmed', 'completed', 'inprogress', 'in progress'].includes((b.status || '').toLowerCase())
      ).length;

      // ============================================
      // ✅ CAPACITY AND AVAILABILITY CHECK
      // ============================================
      // hasCapacity: Can groomer accept more bookings today?
      // isAbsent: Is groomer on approved leave for this date?
      // maxDaily: Maximum bookings per day (default: 3)
      // availableSlots: How many more bookings can be accepted
      // ============================================
      const hasCapacity = (typeof groomerHasCapacity === 'function') ? await groomerHasCapacity(groomer.id, selectedDate) : true;
      const isAbsent = (typeof isGroomerAbsent === 'function') ? isGroomerAbsent(groomer.id, selectedDate) : false;
      
      const maxDaily = groomer.maxDailyBookings || 3;
      const availableSlots = Math.max(0, maxDaily - dailyBookings.length);

      // ============================================
      // 📊 UTILIZATION RATE CALCULATION
      // ============================================
      // Percentage of daily capacity used
      // Example: 2 bookings / 3 max = 66.7% utilization
      // 100% = fully booked, 0% = no bookings
      // ============================================
      return {
        groomer,
        dailyBookings,
        totalBookings: totalBookings.length,
        yesterdayPicks,
        dailyCount: dailyBookings.length,
        maxDaily,
        availableSlots,
        hasCapacity,
        isAbsent,
        utilizationRate: maxDaily > 0 ? (dailyBookings.length / maxDaily) * 100 : 0
      };
    }));

    // Render workload stats
    renderWorkloadStats(groomerStats, selectedDate);
    
    // Render groomer cards
    renderGroomerWorkloadCards(groomerStats, selectedDate);

  } catch (error) {
    console.error('Error loading groomer workload:', error);
    document.getElementById('groomerWorkloadCards').innerHTML = `
      <div class="card" style="text-align: center; padding: 3rem;">
        <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">⚠️</div>
        <p style="color: var(--gray-600);">Error loading workload data</p>
      </div>
    `;
  }
}

// Render workload statistics
function renderWorkloadStats(groomerStats, selectedDate) {
  const container = document.getElementById('groomerWorkloadStats');
  if (!container) return;

  const totalGroomers = groomerStats.length;
  const activeGroomers = groomerStats.filter(g => !g.isAbsent).length;
  const totalDailyBookings = groomerStats.reduce((sum, g) => sum + g.dailyCount, 0);
  const totalCapacity = groomerStats.reduce((sum, g) => sum + g.maxDaily, 0);
  const averageUtilization = totalGroomers > 0 ? groomerStats.reduce((sum, g) => sum + g.utilizationRate, 0) / totalGroomers : 0;
  
  // Find most and least busy groomers based on total confirmed bookings (for workload summary)
  const activeStats = groomerStats.filter(g => !g.isAbsent);
  const mostBusy = activeStats.length > 0 ? activeStats.reduce((max, g) => g.totalBookings > max.totalBookings ? g : max) : null;
  const leastBusy = activeStats.length > 0 ? activeStats.reduce((min, g) => g.totalBookings < min.totalBookings ? g : min) : null;
  
  // Find groomers with most/least picks yesterday (for fair assignment)
  const mostPickedYesterday = activeStats.length > 0 ? activeStats.reduce((max, g) => g.yesterdayPicks > max.yesterdayPicks ? g : max) : null;
  const leastPickedYesterday = activeStats.length > 0 ? activeStats.reduce((min, g) => g.yesterdayPicks < min.yesterdayPicks ? g : min) : null;

  const dateFormatted = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  container.innerHTML = `
    <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
      <div class="stat-card" style="background: white; color: #000; border: 2px solid #000;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">👥</div>
        <div class="stat-value" style="font-size: 2rem; font-weight: 700;">${activeGroomers}/${totalGroomers}</div>
        <div class="stat-label">Active Groomers</div>
      </div>
      
      <div class="stat-card" style="background: white; color: #000; border: 2px solid #000;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📅</div>
        <div class="stat-value" style="font-size: 2rem; font-weight: 700;">${totalDailyBookings}</div>
        <div class="stat-label">Total Bookings</div>
      </div>
      
      <div class="stat-card" style="background: white; color: #000; border: 2px solid #000;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚡</div>
        <div class="stat-value" style="font-size: 2rem; font-weight: 700;">${totalCapacity - totalDailyBookings}</div>
        <div class="stat-label">Available Slots</div>
      </div>
      
      <div class="stat-card" style="background: white; color: #000; border: 2px solid #000;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
        <div class="stat-value" style="font-size: 2rem; font-weight: 700;">${averageUtilization.toFixed(0)}%</div>
        <div class="stat-label">Avg Utilization</div>
      </div>
    </div>

    <div class="card" style="padding: 1.5rem; background: #f8f9fa; border-left: 4px solid #17a2b8;">
      <h4 style="margin-top: 0; color: #0c5460;">📈 Workload Summary for ${dateFormatted}</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
        ${mostBusy ? `
          <div>
            <p style="margin: 0.5rem 0; color: #0c5460;"><strong>Most Busy (Total Confirmed):</strong> ${escapeHtml(mostBusy.groomer.name)} (${mostBusy.totalBookings} confirmed bookings, ${mostBusy.dailyCount}/${mostBusy.maxDaily} today)</p>
          </div>
        ` : ''}
        ${leastBusy ? `
          <div>
            <p style="margin: 0.5rem 0; color: #0c5460;"><strong>Least Busy (Total Confirmed):</strong> ${escapeHtml(leastBusy.groomer.name)} (${leastBusy.totalBookings} confirmed bookings, ${leastBusy.dailyCount}/${leastBusy.maxDaily} today)</p>
          </div>
        ` : ''}
        ${leastPickedYesterday ? `
          <div>
            <p style="margin: 0.5rem 0; color: #28a745;"><strong>🏆 1st Priority Today:</strong> ${escapeHtml(leastPickedYesterday.groomer.name)} (${leastPickedYesterday.yesterdayPicks} picks yesterday)</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Render groomer workload cards
function renderGroomerWorkloadCards(groomerStats, selectedDate) {
  const container = document.getElementById('groomerWorkloadCards');
  if (!container) return;

  // Sort by yesterday's picks (ascending) for fair assignment - least picked yesterday gets priority
  const sortedStats = [...groomerStats].sort((a, b) => {
    // Primary: Sort by yesterday's picks (least picked yesterday = 1st priority)
    if (a.yesterdayPicks !== b.yesterdayPicks) {
      return a.yesterdayPicks - b.yesterdayPicks;
    }
    // Secondary: Sort by total confirmed bookings if tied
    if (a.totalBookings !== b.totalBookings) {
      return a.totalBookings - b.totalBookings;
    }
    // Tertiary: Sort by daily count if still tied
    if (a.dailyCount !== b.dailyCount) {
      return a.dailyCount - b.dailyCount;
    }
    // Quaternary: Sort by name for consistency
    return a.groomer.name.localeCompare(b.groomer.name);
  });

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem;">
      ${sortedStats.map((stat, index) => {
        const { groomer, dailyBookings, dailyCount, maxDaily, availableSlots, hasCapacity, isAbsent, utilizationRate } = stat;
        
        // Determine card styling based on workload (black and white theme)
        let cardColor = 'white';
        let borderColor = '#000';
        let statusIcon = '✅';
        let statusText = 'Available';
        let borderWidth = '2px';
        
        if (isAbsent) {
          cardColor = '#f5f5f5';
          borderColor = '#666';
          statusIcon = '🚫';
          statusText = 'Absent';
          borderWidth = '2px';
        } else if (utilizationRate >= 100) {
          cardColor = '#000';
          borderColor = '#000';
          statusIcon = '🔴';
          statusText = 'Full Capacity';
          borderWidth = '3px';
        } else if (utilizationRate >= 75) {
          cardColor = '#333';
          borderColor = '#000';
          statusIcon = '🟡';
          statusText = 'High Load';
          borderWidth = '2px';
        } else if (utilizationRate >= 50) {
          cardColor = '#f8f8f8';
          borderColor = '#000';
          statusIcon = '🟠';
          statusText = 'Moderate Load';
          borderWidth = '2px';
        } else {
          cardColor = 'white';
          borderColor = '#000';
          statusIcon = '🟢';
          statusText = 'Low Load';
          borderWidth = '1px';
        }

        // Fairness ranking based on yesterday's picks (least picked yesterday = 1st priority)
        const rankSuffix = index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th';
        const fairnessRank = `${index + 1}${rankSuffix} priority (${stat.yesterdayPicks} picks yesterday)`;

        return `
          <div class="card" style="background: ${cardColor}; border: ${borderWidth} solid ${borderColor}; padding: 1.5rem; color: ${cardColor === '#000' || cardColor === '#333' ? 'white' : '#000'};">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
              <div style="background: #000; color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1rem; border: 2px solid #000;">
                ${groomer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style="flex: 1;">
                <h4 style="margin: 0; color: var(--gray-900);">${escapeHtml(groomer.name)}</h4>
                <p style="margin: 0.25rem 0 0 0; color: var(--gray-600); font-size: 0.9rem;">${statusIcon} ${statusText}</p>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--gray-900);">${dailyCount}/${maxDaily}</div>
                <div style="font-size: 0.8rem; color: var(--gray-600);">bookings</div>
              </div>
            </div>

            <div style="margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="font-size: 0.9rem; color: var(--gray-700);">Utilization</span>
                <span style="font-size: 0.9rem; font-weight: 600; color: var(--gray-900);">${utilizationRate.toFixed(0)}%</span>
              </div>
              <div style="background: #e9ecef; height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: ${utilizationRate >= 100 ? '#dc3545' : utilizationRate >= 75 ? '#ffc107' : utilizationRate >= 50 ? '#17a2b8' : '#28a745'}; height: 100%; width: ${Math.min(utilizationRate, 100)}%; transition: width 0.3s ease;"></div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div style="text-align: center; padding: 0.75rem; background: rgba(255, 255, 255, 0.7); border-radius: 6px;">
                <div style="font-size: 1.2rem; font-weight: 600; color: var(--gray-900);">${availableSlots}</div>
                <div style="font-size: 0.8rem; color: var(--gray-600);">Available Slots</div>
              </div>
              <div style="text-align: center; padding: 0.75rem; background: rgba(255, 255, 255, 0.7); border-radius: 6px;">
                <div style="font-size: 1.2rem; font-weight: 600; color: var(--gray-900);">${stat.totalBookings}</div>
                <div style="font-size: 0.8rem; color: var(--gray-600);">Total Bookings</div>
              </div>
            </div>

            <div style="background: rgba(255, 255, 255, 0.8); padding: 1rem; border-radius: 6px; border-left: 4px solid ${index === 0 ? '#28a745' : '#6c757d'};">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.9rem; color: var(--gray-700);">Fair Assignment Priority</span>
                <span style="font-size: 0.9rem; font-weight: 600; color: ${index === 0 ? '#28a745' : '#6c757d'};">
                  ${fairnessRank} ${index === 0 ? '🏆' : ''}
                </span>
              </div>
            </div>

            ${dailyBookings.length > 0 ? `
              <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.1);">
                <h5 style="margin: 0 0 0.75rem 0; color: var(--gray-900); font-size: 0.9rem;">Today's Bookings:</h5>
                <div style="max-height: 120px; overflow-y: auto;">
                  ${dailyBookings.map(booking => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: rgba(255, 255, 255, 0.6); border-radius: 4px; margin-bottom: 0.5rem; font-size: 0.85rem;">
                      <span>${escapeHtml(booking.petName)} (${escapeHtml(booking.customerName)})</span>
                      <span style="font-weight: 600;">${formatTime(booking.time)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Make functions globally available
window.loadGroomerWorkloadView = loadGroomerWorkloadView;
window.setWorkloadDateToday = setWorkloadDateToday;
window.setWorkloadDateTomorrow = setWorkloadDateTomorrow;
window.loadGroomerWorkload = loadGroomerWorkload;


// ==================== VACCINATION PROOF LIGHTBOX ====================

// Open vaccination proof image in lightbox for admin view
window.openAdminVaccinationLightbox = async function(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  
  if (!booking || !booking.vaccinationProofImage) {
    console.warn('[Admin] No vaccination proof image found for booking:', bookingId);
    return;
  }
  
  // Create lightbox overlay
  const overlay = document.createElement('div');
  overlay.id = 'adminVaccinationLightbox';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    cursor: pointer;
  `;
  
  const img = document.createElement('img');
  img.src = booking.vaccinationProofImage;
  img.alt = 'Vaccination Proof';
  img.style.cssText = `
    max-width: 90%;
    max-height: 90%;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  `;
  
  // Add title
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
  title.textContent = `📷 Vaccination Proof - ${booking.petName || 'Pet'}`;
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: rgba(255,255,255,0.2);
    border: none;
    border-radius: 50%;
    color: white;
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  overlay.appendChild(title);
  overlay.appendChild(img);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
  
  // Close on click
  const closeHandler = () => {
    document.body.removeChild(overlay);
  };
  
  overlay.addEventListener('click', closeHandler);
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeHandler();
  });
  
  // Close on Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeHandler();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
};


// ==================== PROOF OF PAYMENT LIGHTBOX ====================

// Open proof of payment image in lightbox for admin view
window.openAdminProofOfPaymentLightbox = async function(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  
  if (!booking || !booking.proofOfPaymentImage) {
    console.warn('[Admin] No proof of payment image found for booking:', bookingId);
    return;
  }
  
  // Create lightbox overlay
  const overlay = document.createElement('div');
  overlay.id = 'adminProofOfPaymentLightbox';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    cursor: pointer;
  `;
  
  const img = document.createElement('img');
  img.src = booking.proofOfPaymentImage;
  img.alt = 'Proof of Payment';
  img.style.cssText = `
    max-width: 90%;
    max-height: 90%;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  `;
  
  // Add title
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
  title.textContent = `💳 Proof of Payment - ${booking.petName || 'Booking'} (${booking.customerName || 'Customer'})`;
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: rgba(255,255,255,0.2);
    border: none;
    border-radius: 50%;
    color: white;
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  overlay.appendChild(title);
  overlay.appendChild(img);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);
  
  // Close on click
  const closeHandler = () => {
    document.body.removeChild(overlay);
  };
  
  overlay.addEventListener('click', closeHandler);
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeHandler();
  });
  
  // Close on Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeHandler();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
};


// 🔧 DEBUG: Function to check for duplicate bookings
async function debugCheckDuplicateBookings() {
  const bookings = await getBookings();
  
  console.log('=== BOOKING DEBUG REPORT ===');
  console.log('Total bookings:', bookings.length);
  
  // Check for duplicate IDs
  const idCounts = {};
  bookings.forEach(b => {
    idCounts[b.id] = (idCounts[b.id] || 0) + 1;
  });
  
  const duplicateIds = Object.entries(idCounts).filter(([id, count]) => count > 1);
  if (duplicateIds.length > 0) {
    console.warn('⚠️ DUPLICATE IDs FOUND:');
    duplicateIds.forEach(([id, count]) => {
      console.warn(`  - ID "${id}" appears ${count} times`);
      const dupes = bookings.filter(b => b.id === id);
      dupes.forEach((b, i) => {
        console.log(`    [${i + 1}] Customer: ${b.customerName}, Date: ${b.date}, Time: ${b.time}, Status: ${b.status}`);
      });
    });
  } else {
    console.log('✅ No duplicate IDs found');
  }
  
  // Check pending bookings
  const pending = bookings.filter(b => b.status === 'pending');
  console.log('\nPending bookings:', pending.length);
  pending.forEach(b => {
    console.log(`  - ${b.id}: ${b.customerName}, ${b.date} ${b.time}, hasProof: ${!!b.proofOfPaymentImage}`);
  });
  
  // Check for bookings with same customer, date, time
  const keyMap = {};
  bookings.forEach(b => {
    const key = `${b.customerName}_${b.date}_${b.time}`;
    if (!keyMap[key]) keyMap[key] = [];
    keyMap[key].push(b);
  });
  
  const potentialDupes = Object.entries(keyMap).filter(([key, arr]) => arr.length > 1);
  if (potentialDupes.length > 0) {
    console.warn('\n⚠️ POTENTIAL DUPLICATE BOOKINGS (same customer, date, time):');
    potentialDupes.forEach(([key, arr]) => {
      console.warn(`  Key: ${key}`);
      arr.forEach(b => {
        console.log(`    - ID: ${b.id}, Status: ${b.status}`);
      });
    });
  }
  
  console.log('=== END DEBUG REPORT ===');
  
  return {
    total: bookings.length,
    pending: pending.length,
    duplicateIds: duplicateIds.length,
    potentialDupes: potentialDupes.length
  };
}

window.debugCheckDuplicateBookings = debugCheckDuplicateBookings;

// ============================================
// 📱 MOBILE RESPONSIVE SIDEBAR
// ============================================

/**
 * Toggle admin mobile sidebar
 */
function toggleAdminMobileSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  const toggleBtn = document.getElementById('adminMobileMenuToggle');
  const menuIcon = document.getElementById('mobileMenuIcon');
  
  if (sidebar && overlay && toggleBtn) {
    const isOpen = sidebar.classList.contains('mobile-open');
    
    if (isOpen) {
      closeAdminMobileSidebar();
    } else {
      sidebar.classList.add('mobile-open');
      overlay.classList.add('active');
      toggleBtn.classList.add('active');
      if (menuIcon) menuIcon.textContent = '✕';
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
  }
}

/**
 * Close admin mobile sidebar
 */
function closeAdminMobileSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('adminSidebarOverlay');
  const toggleBtn = document.getElementById('adminMobileMenuToggle');
  const menuIcon = document.getElementById('mobileMenuIcon');
  
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('active');
  if (toggleBtn) toggleBtn.classList.remove('active');
  if (menuIcon) menuIcon.textContent = '☰';
  document.body.style.overflow = ''; // Restore scroll
}

/**
 * Close sidebar when clicking a menu item (mobile)
 */
function setupMobileSidebarAutoClose() {
  const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Only close on mobile
      if (window.innerWidth <= 992) {
        closeAdminMobileSidebar();
      }
    });
  });
}

// Initialize mobile sidebar on page load
document.addEventListener('DOMContentLoaded', function() {
  setupMobileSidebarAutoClose();
  
  // Close sidebar on window resize to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 992) {
      closeAdminMobileSidebar();
    }
  });
  
  // Close sidebar on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAdminMobileSidebar();
    }
  });
});

// Make functions globally available
window.toggleAdminMobileSidebar = toggleAdminMobileSidebar;
window.closeAdminMobileSidebar = closeAdminMobileSidebar;

// ============================================
// 📱 MOBILE BOTTOM NAVIGATION
// ============================================

/**
 * Switch view from mobile bottom nav
 */
function switchViewMobile(view) {
  // Close more menu if open
  closeMoreMenu();
  
  // Switch the view
  if (typeof switchView === 'function') {
    switchView(view);
  }
  
  // Update bottom nav active state
  updateBottomNavActive(view);
}

/**
 * Update bottom nav active state
 */
function updateBottomNavActive(view) {
  const navItems = document.querySelectorAll('.admin-bottom-nav-item');
  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.dataset.view === view) {
      item.classList.add('active');
    }
  });
  
  // If view is in "more" menu, highlight the more button
  const moreViews = ['inprogress', 'customers', 'groomerWorkload', 'groomerAbsences', 'bookinghistory', 'gallery', 'addons', 'account'];
  if (moreViews.includes(view)) {
    const moreBtn = document.getElementById('moreMenuBtn');
    if (moreBtn) moreBtn.classList.add('active');
  }
}

/**
 * Toggle more menu popup
 */
function toggleMoreMenu() {
  const moreMenu = document.getElementById('adminMoreMenu');
  if (moreMenu) {
    moreMenu.classList.toggle('active');
  }
}

/**
 * Close more menu
 */
function closeMoreMenu() {
  const moreMenu = document.getElementById('adminMoreMenu');
  if (moreMenu) {
    moreMenu.classList.remove('active');
  }
}

/**
 * Update pending badge count
 */
function updatePendingBadge(count) {
  const badge = document.getElementById('pendingBadge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Close more menu when clicking outside
document.addEventListener('click', function(e) {
  const moreMenu = document.getElementById('adminMoreMenu');
  const moreBtn = document.getElementById('moreMenuBtn');
  
  if (moreMenu && moreBtn) {
    if (!moreMenu.contains(e.target) && !moreBtn.contains(e.target)) {
      closeMoreMenu();
    }
  }
});

// Sync bottom nav with sidebar navigation
const originalSwitchView = typeof switchView === 'function' ? switchView : null;
if (originalSwitchView) {
  window.switchView = function(view) {
    originalSwitchView(view);
    updateBottomNavActive(view);
  };
}

// Make functions globally available
window.switchViewMobile = switchViewMobile;
window.updateBottomNavActive = updateBottomNavActive;
window.toggleMoreMenu = toggleMoreMenu;
window.closeMoreMenu = closeMoreMenu;
window.updatePendingBadge = updatePendingBadge;


// ============================================
// Payment Settings Functions
// ============================================

let pendingQRCodeFile = null;

/**
 * Load payment settings view
 */
async function loadPaymentSettingsView() {
  try {
    let settings = null;
    
    // Try to get settings from Firebase
    if (typeof window.firebaseGetPaymentSettings === 'function') {
      settings = await window.firebaseGetPaymentSettings();
    }
    
    if (settings) {
      // Populate form fields
      const gcashInput = document.getElementById('gcashNumber');
      const accountInput = document.getElementById('accountName');
      
      if (gcashInput && settings.gcashNumber) {
        gcashInput.value = settings.gcashNumber;
      }
      if (accountInput && settings.accountName) {
        accountInput.value = settings.accountName;
      }
      
      // Show current QR code if exists
      if (settings.qrCodeImage) {
        const currentQRSection = document.getElementById('currentQRCode');
        const currentQRImg = document.getElementById('currentQRCodeImg');
        if (currentQRSection && currentQRImg) {
          currentQRImg.src = settings.qrCodeImage;
          currentQRSection.style.display = 'block';
        }
      }
    }
  } catch (error) {
    console.warn('Could not load payment settings:', error);
  }
}

/**
 * Preview QR code before upload
 */
function previewQRCode(input) {
  const file = input.files[0];
  if (!file) return;
  
  pendingQRCodeFile = file;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('qrCodePreview');
    const previewImg = document.getElementById('qrCodePreviewImg');
    if (preview && previewImg) {
      previewImg.src = e.target.result;
      preview.style.display = 'block';
    }
    
    // Hide current QR code section when new one is selected
    const currentQRSection = document.getElementById('currentQRCode');
    if (currentQRSection) {
      currentQRSection.style.display = 'none';
    }
  };
  reader.readAsDataURL(file);
}

/**
 * Remove QR code preview
 */
function removeQRCode() {
  pendingQRCodeFile = null;
  
  const preview = document.getElementById('qrCodePreview');
  const input = document.getElementById('qrCodeInput');
  
  if (preview) preview.style.display = 'none';
  if (input) input.value = '';
  
  // Show current QR code section again if it exists
  loadPaymentSettingsView();
}

/**
 * Save payment settings
 */
async function savePaymentSettings(event) {
  // Prevent form submission immediately
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  const gcashNumber = document.getElementById('gcashNumber')?.value?.trim() || '';
  const accountName = document.getElementById('accountName')?.value?.trim() || '';
  
  // Show loading state
  const submitBtn = document.querySelector('#paymentSettingsForm button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Saving...';
  }
  
  try {
    let qrCodeUrl = null;
    
    // Upload QR code to Cloudinary if a new file was selected
    if (pendingQRCodeFile) {
      console.log('[PaymentSettings] Uploading QR code image...');
      if (typeof uploadImageToCloudinary === 'function') {
        qrCodeUrl = await uploadImageToCloudinary(pendingQRCodeFile, 'payment-qr');
        console.log('[PaymentSettings] QR code uploaded to Cloudinary:', qrCodeUrl);
      } else {
        // Fallback to base64
        console.log('[PaymentSettings] Cloudinary not available, using base64');
        qrCodeUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(pendingQRCodeFile);
        });
        console.log('[PaymentSettings] QR code converted to base64');
      }
    }
    
    // Get existing settings to preserve QR code if not changed
    let existingSettings = {};
    try {
      if (typeof window.firebaseGetPaymentSettings === 'function') {
        existingSettings = await window.firebaseGetPaymentSettings() || {};
      }
    } catch (e) {
      console.warn('[PaymentSettings] Could not get existing settings:', e);
      // Try localStorage fallback
      const localSettings = localStorage.getItem('paymentSettings');
      if (localSettings) {
        existingSettings = JSON.parse(localSettings);
      }
    }
    
    // Build settings object
    const settings = {
      gcashNumber: gcashNumber,
      accountName: accountName,
      qrCodeImage: qrCodeUrl || existingSettings.qrCodeImage || null,
      updatedAt: Date.now()
    };
    
    console.log('[PaymentSettings] Saving settings:', settings);
    
    // Save to Firebase
    if (typeof window.firebaseSavePaymentSettings === 'function') {
      await window.firebaseSavePaymentSettings(settings);
    }
    
    // Also save to localStorage as backup
    localStorage.setItem('paymentSettings', JSON.stringify(settings));
    
    // Clear pending file
    pendingQRCodeFile = null;
    
    // Show success
    if (typeof customAlert !== 'undefined') {
      customAlert.success('Success', 'Payment settings saved successfully!');
    } else {
      alert('Payment settings saved successfully!');
    }
    
    // Reload view to show updated settings
    loadPaymentSettingsView();
    
  } catch (error) {
    console.error('Error saving payment settings:', error);
    if (typeof customAlert !== 'undefined') {
      customAlert.alert('Error', 'Failed to save payment settings. Please try again.');
    } else {
      alert('Failed to save payment settings. Please try again.');
    }
  } finally {
    // Restore button state
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
  
  return false; // Extra safety to prevent form submission
}

// Make functions globally available
window.loadPaymentSettingsView = loadPaymentSettingsView;
window.previewQRCode = previewQRCode;
window.removeQRCode = removeQRCode;
window.savePaymentSettings = savePaymentSettings;
