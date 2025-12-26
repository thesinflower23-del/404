/* ============================================
   BestBuddies Pet Grooming - Groomer Dashboard
   ============================================ */

let groomerGroomerId = null;

// Sort order state for groomer (must be declared before functions use them)
let groomerBookingSortOrder = 'desc'; // 'desc' = newest first, 'asc' = oldest first
let groomerBookingRecentActive = false; // Track if "Recent" button is active (toggle state)
let groomerAbsenceSortOrder = 'desc';

// Mobile navigation state
let groomerCurrentMobileView = 'overview';
let groomerMoreMenuOpen = false;

// ============================================
// 📱 MOBILE NAVIGATION FUNCTIONS (must be defined early for onclick handlers)
// ============================================

// Switch mobile view
function switchGroomerViewMobile(view) {
  console.log('[Groomer Mobile] Switching to view:', view);
  groomerCurrentMobileView = view;
  
  // Close more menu if open
  closeGroomerMoreMenu();
  
  // Update bottom nav active state
  document.querySelectorAll('.groomer-bottom-nav-item').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.view === view) {
      btn.classList.add('active');
    }
  });
  
  // Handle special views from more menu
  if (['history', 'bookings', 'password'].includes(view)) {
    document.querySelectorAll('.groomer-bottom-nav-item').forEach(btn => btn.classList.remove('active'));
    document.getElementById('groomerMoreMenuBtn')?.classList.add('active');
  }
  
  // Hide all mobile sections
  document.querySelectorAll('.groomer-mobile-section').forEach(section => {
    section.classList.remove('mobile-active', 'calendar-view', 'password-view');
  });
  
  // Show appropriate section based on view
  switch (view) {
    case 'overview':
      // Overview shows stats only - all sections hidden
      break;
    case 'profile':
      const profileSection = document.getElementById('groomerProfileSection');
      if (profileSection) {
        profileSection.classList.add('mobile-active');
      }
      break;
    case 'password':
      const passwordSection = document.getElementById('groomerProfileSection');
      if (passwordSection) {
        passwordSection.classList.add('mobile-active', 'password-view');
      }
      break;
    case 'absence':
      const absenceSection = document.getElementById('groomerAbsenceSection');
      if (absenceSection) {
        absenceSection.classList.add('mobile-active');
      }
      break;
    case 'calendar':
      const calendarSection = document.getElementById('groomerAbsenceSection');
      if (calendarSection) {
        calendarSection.classList.add('mobile-active', 'calendar-view');
      }
      break;
    case 'history':
      const historySection = document.getElementById('groomerHistorySection');
      if (historySection) {
        historySection.classList.add('mobile-active');
      }
      break;
    case 'bookings':
      const bookingsSection = document.getElementById('groomerBookingsSection');
      if (bookingsSection) {
        bookingsSection.classList.add('mobile-active');
      }
      break;
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Toggle more menu
function toggleGroomerMoreMenu() {
  groomerMoreMenuOpen = !groomerMoreMenuOpen;
  const menu = document.getElementById('groomerMoreMenu');
  if (menu) {
    menu.classList.toggle('show', groomerMoreMenuOpen);
  }
}

// Close more menu
function closeGroomerMoreMenu() {
  groomerMoreMenuOpen = false;
  const menu = document.getElementById('groomerMoreMenu');
  if (menu) {
    menu.classList.remove('show');
  }
}

// Change groomer booking sort order
function changeGroomerBookingSortOrder(order) {
  groomerBookingSortOrder = order;
  groomerBookingRecentActive = false; // Disable Recent when changing sort order
  renderGroomerBookings();
}

// Toggle Recent button (on/off)
function toggleGroomerRecent() {
  groomerBookingRecentActive = !groomerBookingRecentActive;
  renderGroomerBookings();
}

// Change groomer absence sort order
function changeGroomerAbsenceSortOrder(order) {
  groomerAbsenceSortOrder = order;
  // Need to refresh absence history
  getCurrentUser().then(user => {
    if (user) {
      const allAbsences = getStaffAbsences();
      const myAbsences = allAbsences.filter(a => a.staffId === user.id);
      renderAbsenceHistory(myAbsences);
    }
  });
}

// Export mobile nav functions immediately so onclick handlers work
window.switchGroomerViewMobile = switchGroomerViewMobile;
window.toggleGroomerMoreMenu = toggleGroomerMoreMenu;
window.closeGroomerMoreMenu = closeGroomerMoreMenu;
window.changeGroomerBookingSortOrder = changeGroomerBookingSortOrder;
window.toggleGroomerRecent = toggleGroomerRecent;
window.changeGroomerAbsenceSortOrder = changeGroomerAbsenceSortOrder;

// ============================================
// END MOBILE NAVIGATION FUNCTIONS
// ============================================

async function linkStaffToGroomer(user) {
  // Get all groomers and find one matching this user's name
  const groomers = await getGroomers();
  const matchingGroomer = groomers.find(g => g.name.toLowerCase() === user.name.toLowerCase());
  
  if (matchingGroomer) {
    // Update user with groomer ID
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex].groomerId = matchingGroomer.id;
      await saveUsers(users);
    }
    return matchingGroomer.id;
  }
  
  // If no match found, create a new groomer entry
  const newGroomer = {
    id: 'groomer-' + user.id,
    name: user.name,
    avatar: '👨‍⚕️',
    specialty: ''
  };
  groomers.push(newGroomer);
  await saveGroomers(groomers);
  
  // Update user with new groomer ID
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.id === user.id);
  if (userIndex !== -1) {
    users[userIndex].groomerId = newGroomer.id;
    await saveUsers(users);
  }
  
  return newGroomer.id;
}

async function initGroomerDashboard() {
  // Don't block with loading screen - use lazy loading approach
  try {
    if (!(await requireGroomer())) {
      return;
    }

    const user = await getCurrentUser();
    if (!user) return;
    groomerGroomerId = user?.groomerId || await linkStaffToGroomer(user);
    const nameEl = document.getElementById('groomerWelcomeName');
    if (nameEl) {
      nameEl.textContent = user.name;
    }

    // Setup forms immediately (non-blocking)
    setupAbsenceForm();
    setupGroomerPasswordForm();
    
    // Show skeleton loaders for data sections
    showGroomerSkeletons();
    
    // Load data in parallel with lazy loading
    const loadPromises = [
      loadGroomerStatsLazy(),
      loadGroomerProfileLazy(),
      loadGroomerBookingsLazy(),
      loadGroomerAbsencesLazy(),
      loadGroomerCalendarLazy()
    ];
    
    // Don't wait for all - let them load independently
    Promise.allSettled(loadPromises).then(() => {
      console.log('[Groomer] All lazy loading complete');
    });
    
    // Update notification badge (non-blocking)
    updateGroomerNotificationBadge();
    
    // Refresh notifications every 30 seconds
    setInterval(updateGroomerNotificationBadge, 30000);
  
    // Close notification panel when clicking outside
    document.addEventListener('click', function(e) {
      const panel = document.getElementById('groomerNotificationPanel');
      const bell = document.getElementById('groomerNotificationBell');
      if (panel && bell && groomerNotificationPanelOpen) {
        if (!panel.contains(e.target) && !bell.contains(e.target)) {
          closeGroomerNotificationPanel();
        }
      }
    });
  } catch (error) {
    console.error('Error initializing groomer dashboard:', error);
    if (typeof customAlert !== 'undefined') {
      customAlert.error('Error', 'Failed to load groomer dashboard. Please refresh the page.');
    }
  }
}

// ============================================
// 🔄 LAZY LOADING FUNCTIONS
// ============================================

function showGroomerSkeletons() {
  // Stats skeleton
  const statsEl = document.getElementById('groomerStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card skeleton-stat">
        <div class="skeleton skeleton-icon"></div>
        <div class="skeleton skeleton-number"></div>
        <div class="skeleton skeleton-label"></div>
      </div>
      <div class="stat-card skeleton-stat">
        <div class="skeleton skeleton-icon"></div>
        <div class="skeleton skeleton-number"></div>
        <div class="skeleton skeleton-label"></div>
      </div>
      <div class="stat-card skeleton-stat">
        <div class="skeleton skeleton-icon"></div>
        <div class="skeleton skeleton-number"></div>
        <div class="skeleton skeleton-label"></div>
      </div>
      <div class="stat-card skeleton-stat">
        <div class="skeleton skeleton-icon"></div>
        <div class="skeleton skeleton-number"></div>
        <div class="skeleton skeleton-label"></div>
      </div>
    `;
  }
  
  // Bookings skeleton
  const bookingsContainer = document.getElementById('groomerBookingsContainer');
  if (bookingsContainer) {
    bookingsContainer.innerHTML = `
      <div class="card skeleton-booking">
        <div class="card-body">
          <div style="display: flex; gap: 1rem; align-items: center;">
            <div class="skeleton" style="width: 50px; height: 50px; border-radius: 50%;"></div>
            <div style="flex: 1;">
              <div class="skeleton" style="height: 1rem; width: 60%; margin-bottom: 0.5rem;"></div>
              <div class="skeleton" style="height: 0.8rem; width: 80%; margin-bottom: 0.3rem;"></div>
              <div class="skeleton" style="height: 0.8rem; width: 40%;"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="card skeleton-booking">
        <div class="card-body">
          <div style="display: flex; gap: 1rem; align-items: center;">
            <div class="skeleton" style="width: 50px; height: 50px; border-radius: 50%;"></div>
            <div style="flex: 1;">
              <div class="skeleton" style="height: 1rem; width: 60%; margin-bottom: 0.5rem;"></div>
              <div class="skeleton" style="height: 0.8rem; width: 80%; margin-bottom: 0.3rem;"></div>
              <div class="skeleton" style="height: 0.8rem; width: 40%;"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Absence history skeleton
  const absenceHistory = document.getElementById('absenceHistory');
  if (absenceHistory) {
    absenceHistory.innerHTML = `
      <div class="card skeleton-absence">
        <div class="card-body">
          <div class="skeleton" style="height: 1.2rem; width: 40%; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="height: 0.8rem; width: 70%;"></div>
        </div>
      </div>
      <div class="card skeleton-absence">
        <div class="card-body">
          <div class="skeleton" style="height: 1.2rem; width: 40%; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="height: 0.8rem; width: 70%;"></div>
        </div>
      </div>
    `;
  }
}

async function loadGroomerStatsLazy() {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    
    const allAbsences = getStaffAbsences();
    const myAbsences = allAbsences.filter(a => a.staffId === user.id);
    await renderGroomerStats(myAbsences);
    updateNextDayOffBadge(myAbsences);
  } catch (error) {
    console.warn('[Groomer] Stats loading failed:', error);
  }
}

async function loadGroomerProfileLazy() {
  try {
    await setupGroomerProfileForm();
  } catch (error) {
    console.warn('[Groomer] Profile loading failed:', error);
  }
}

async function loadGroomerBookingsLazy() {
  try {
    await renderGroomerBookings();
  } catch (error) {
    console.warn('[Groomer] Bookings loading failed:', error);
    const container = document.getElementById('groomerBookingsContainer');
    if (container) {
      container.innerHTML = '<p class="empty-state">Unable to load bookings. Please refresh.</p>';
    }
  }
}

async function loadGroomerAbsencesLazy() {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    
    const allAbsences = getStaffAbsences();
    const myAbsences = allAbsences.filter(a => a.staffId === user.id);
    renderAbsenceHistory(myAbsences);
  } catch (error) {
    console.warn('[Groomer] Absences loading failed:', error);
    const container = document.getElementById('absenceHistory');
    if (container) {
      container.innerHTML = '<p class="empty-state">Unable to load absence history. Please refresh.</p>';
    }
  }
}

async function loadGroomerCalendarLazy() {
  try {
    const bookings = await getBookings();
    const user = await getCurrentUser();
    if (!user) return;
    
    const allAbsences = getStaffAbsences();
    const myAbsences = allAbsences.filter(a => a.staffId === user.id);
    const dataset = buildCalendarDataset(bookings, myAbsences);
    renderMegaCalendar('groomerCalendar', dataset);
  } catch (error) {
    console.warn('[Groomer] Calendar loading failed:', error);
  }
}

async function refreshGroomerDashboard() {
  const user = await getCurrentUser();
  if (!user) return;

  const allAbsences = getStaffAbsences();
  const myAbsences = allAbsences.filter(a => a.staffId === user.id);
  await renderGroomerStats(myAbsences);
  renderAbsenceHistory(myAbsences);
  updateNextDayOffBadge(myAbsences);
  await renderGroomerBookings();

  const bookings = await getBookings();
  const dataset = buildCalendarDataset(bookings, myAbsences);
  renderMegaCalendar('groomerCalendar', dataset);
}

async function renderGroomerBookings() {
  const container = document.getElementById('groomerBookingsContainer');
  if (!container || !groomerGroomerId) return;

  let bookings = (await getBookings()).filter(b =>
    b.groomerId === groomerGroomerId &&
    !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status)
  );

  // Apply sorting
  const sortBy = groomerBookingRecentActive ? 'recent' : 'date';
  const sortOrder = groomerBookingSortOrder || 'desc';

  bookings.sort((a, b) => {
    if (sortBy === 'recent') {
      // Sort by creation date (newest first) - always descending
      const dateA = new Date(a.createdAt || a.date).getTime();
      const dateB = new Date(b.createdAt || b.date).getTime();
      return dateB - dateA;
    } else {
      // Sort by appointment date + time
      const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
      const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
      if (sortOrder === 'asc') {
        return dateA - dateB; // Oldest first
      }
      return dateB - dateA; // Newest first (default)
    }
  });

  // Sort controls HTML
  const sortControlsHtml = `
    <div class="groomer-sort-controls" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding: 0.5rem; background: var(--gray-50); border-radius: var(--radius-sm); flex-wrap: wrap;">
      <button class="btn btn-sm" style="background: ${groomerBookingRecentActive ? '#007bff' : '#e0e0e0'}; color: ${groomerBookingRecentActive ? 'white' : '#333'}; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: 600;" onclick="toggleGroomerRecent()">
        🕐 Recent
      </button>
      <label style="font-size: 0.9rem; color: var(--gray-600); font-weight: 500;">Sort by:</label>
      <select id="groomerBookingSortSelect" style="width: auto; padding: 0.5rem; ${groomerBookingRecentActive ? 'opacity: 0.5; pointer-events: none;' : ''}" onchange="changeGroomerBookingSortOrder(this.value)" ${groomerBookingRecentActive ? 'disabled' : ''}>
        <option value="desc" ${sortOrder === 'desc' ? 'selected' : ''}>⬇️ Newest First</option>
        <option value="asc" ${sortOrder === 'asc' ? 'selected' : ''}>⬆️ Oldest First</option>
      </select>
    </div>
  `;

  if (bookings.length === 0) {
    container.innerHTML = sortControlsHtml + '<p class="empty-state">No bookings assigned to you yet.</p>';
    return;
  }

  container.innerHTML = sortControlsHtml + bookings.map(booking => {
    const statusClass = ['confirmed', 'completed'].includes(booking.status)
      ? 'badge-confirmed'
      : 'badge-pending';
    const statusLabel = booking.status === 'pending' ? 'Pending' : booking.status === 'confirmed' ? 'Confirmed' : 'Completed';
    const petEmoji = booking.petType === 'dog' ? '🐕' : '🐈';
    const profile = booking.profile || {};
    const weightLabel = booking.petWeight || profile.weight || 'Not provided';
    const cost = booking.cost;
    const addOnDisplay = cost?.addOns?.length
      ? cost.addOns.map(addon => `${escapeHtml(addon.label)} (${formatCurrency(addon.price)})`).join(', ')
      : (booking.addOns?.length ? escapeHtml(booking.addOns.join(', ')) : 'None');
    const totalLine = cost
      ? `${formatCurrency(cost.subtotal)} · Balance ${formatCurrency(cost.balanceOnVisit)}`
      : 'Will be computed once weight is set';

    return `
      <div class="card" style="margin-bottom: 1rem;">
        <div class="card-body">
          <div style="display: grid; grid-template-columns: auto 1fr auto; gap: 1.5rem; align-items: center;">
            <div style="font-size: 2.5rem;">${petEmoji}</div>
            <div>
              <h4 style="margin-bottom: 0.5rem; color: var(--gray-900);">${escapeHtml(booking.petName)}</h4>
              <p style="color: var(--gray-600); margin-bottom: 0.25rem; font-size: 0.875rem;">
                <strong>Customer:</strong> ${escapeHtml(booking.customerName || 'N/A')}
              </p>
              <p style="color: var(--gray-600); margin-bottom: 0.25rem; font-size: 0.875rem;">
                <strong>Package:</strong> ${escapeHtml(booking.packageName)}
              </p>
              <p style="color: var(--gray-600); margin-bottom: 0.25rem; font-size: 0.875rem;">
                <strong>Weight Tier:</strong> ${escapeHtml(weightLabel)}
              </p>
              <p style="color: var(--gray-600); margin-bottom: 0.25rem; font-size: 0.875rem;">
                <strong>Add-ons:</strong> ${addOnDisplay}
              </p>
              <p style="color: var(--gray-900); font-size: 0.9rem; font-weight: 600;">
                <strong>Estimate:</strong> ${totalLine}
              </p>
              <p style="color: var(--gray-500); font-size: 0.875rem;">
                📅 ${formatDate(booking.date)} at ${formatTime(booking.time)}
              </p>
              ${booking.phone ? `<p style="color: var(--gray-500); font-size: 0.875rem;">📞 ${escapeHtml(booking.phone)}</p>` : ''}
            </div>
            <div>
              <span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span>
              <button class="btn btn-outline btn-sm" onclick="openGroomerBookingModal('${booking.id}')" style="margin-top:0.5rem;">View Details</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-groomer-booking]').forEach(btn => {
    btn.addEventListener('click', async () => await openGroomerBookingModal(btn.dataset.groomerBooking));
  });
}

async function renderGroomerStats(absences) {
  const statsEl = document.getElementById('groomerStats');
  if (!statsEl) return;

  const total = absences.length;
  const pending = absences.filter(a => a.status === 'pending').length;
  const approved = absences.filter(a => a.status === 'approved').length;
  const rejected = absences.filter(a => a.status === 'rejected').length;

  // Count total customers who chose this groomer
  const bookings = await getBookings();
  const customerCount = new Set(
    bookings
      .filter(b => b.groomerId === groomerGroomerId && !b.isWalkIn)
      .map(b => b.userId)
  ).size;

  statsEl.innerHTML = `
    <div class="stat-card">
      <div style="font-size: 2rem;">👥</div>
      <div class="stat-value">${customerCount}</div>
      <div class="stat-label">Total Customers</div>
    </div>
    <div class="stat-card">
      <div style="font-size: 2rem;">📄</div>
      <div class="stat-value">${total}</div>
      <div class="stat-label">Total Requests</div>
    </div>
    <div class="stat-card">
      <div style="font-size: 2rem;">⏳</div>
      <div class="stat-value" style="color:var(--gray-700)">${pending}</div>
      <div class="stat-label">Pending</div>
    </div>
    <div class="stat-card">
      <div style="font-size: 2rem;">✅</div>
      <div class="stat-value" style="color:var(--gray-900)">${approved}</div>
      <div class="stat-label">Approved</div>
    </div>
  `;
}

// Protection flag for groomer profile update
let isUpdatingGroomerProfile = false;

async function setupGroomerProfileForm() {
  const form = document.getElementById('groomerProfileForm');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  const user = await getCurrentUser();
  if (!user || !groomerGroomerId) return;

  // Try to get groomer from localStorage first (most up-to-date)
  let groomer = null;
  const storedGroomers = JSON.parse(localStorage.getItem('groomers') || '[]');
  groomer = storedGroomers.find(g => g.id === groomerGroomerId);
  
  // If not found in localStorage, try Firebase
  if (!groomer) {
    groomer = await getGroomerById(groomerGroomerId);
  }
  
  if (groomer) {
    const nameInput = document.getElementById('groomerName');
    const specialtyInput = document.getElementById('groomerSpecialty');

    if (nameInput) nameInput.value = groomer.name || user.name || '';
    if (specialtyInput) specialtyInput.value = groomer.specialty || '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isUpdatingGroomerProfile) {
      console.log('[setupGroomerProfileForm] BLOCKED - Already in progress');
      return;
    }
    isUpdatingGroomerProfile = true;
    
    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    const nameInput = document.getElementById('groomerName');
    const specialtyInput = document.getElementById('groomerSpecialty');

    const name = nameInput?.value.trim() || '';
    const specialty = specialtyInput?.value.trim() || '';

    if (!name) {
      customAlert.warning('Missing Information', 'Please enter your name');
      isUpdatingGroomerProfile = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
      }
      return;
    }

    try {
      const groomers = await getGroomers();
      console.log('Current groomers:', groomers);
      console.log('Looking for groomer ID:', groomerGroomerId);
      
      const groomerIndex = groomers.findIndex(g => g.id === groomerGroomerId);
      console.log('Groomer index:', groomerIndex);

      if (groomerIndex !== -1) {
        // Create updated groomer object with all existing properties
        const updatedGroomer = {
          ...groomers[groomerIndex],
          name: name,
          specialty: specialty,
          updatedAt: Date.now()
        };
        
        console.log('Updated groomer:', updatedGroomer);
        groomers[groomerIndex] = updatedGroomer;
        
        // Save to localStorage first (immediate)
        localStorage.setItem('groomers', JSON.stringify(groomers));
        console.log('Groomers saved to localStorage');
        
        // Then save to Firebase (async)
        await saveGroomers(groomers);
        console.log('Groomers saved to Firebase');

        // Verify the save by fetching from localStorage
        const storedGroomers = JSON.parse(localStorage.getItem('groomers') || '[]');
        const verifyGroomer = storedGroomers.find(g => g.id === groomerGroomerId);
        console.log('Verified groomer in localStorage:', verifyGroomer);

        // Update user name if needed
        const users = await getUsers();
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          users[userIndex].name = name;
          await saveUsers(users);
        }

        // Update welcome name
        const welcomeName = document.getElementById('groomerWelcomeName');
        if (welcomeName) welcomeName.textContent = name;

        customAlert.success('Profile Updated', 'Your profile has been updated successfully!');
        
        // Refresh to verify changes were saved
        await refreshGroomerDashboard();
      } else {
        customAlert.error('Error', 'Groomer profile not found');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      customAlert.error('Update Failed', 'Failed to update profile. Please try again.');
    } finally {
      isUpdatingGroomerProfile = false;
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
      }
    }
  });
}

function setupGroomerPasswordForm() {
  const form = document.getElementById('groomerPasswordForm');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const current = document.getElementById('groomerCurrentPassword')?.value.trim();
    const next = document.getElementById('groomerNewPassword')?.value.trim();
    const confirm = document.getElementById('groomerConfirmPassword')?.value.trim();

    if (!current || !next || !confirm) {
      customAlert.warning('Missing Information', 'Please fill in all fields.');
      return;
    }

    if (next !== confirm) {
      customAlert.warning('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }

    const result = changePasswordForCurrentUser(current, next);
    if (!result?.success) {
      customAlert.error('Password Error', result?.message || 'Unable to update password.');
      return;
    }

    form.reset();
    customAlert.success('Password Updated', 'Your password has been updated successfully!');
  });
}

// ============================================
// 📅 ABSENCE REQUEST FORM SETUP
// ============================================
// Allows groomers to request time off
// Includes proof upload (optional) and reason
// Admin must approve before absence is active
// ============================================
function setupAbsenceForm() {
  const form = document.getElementById('absenceForm');
  if (!form) return;

  // Setup calendar picker
  setupAbsenceCalendarPicker();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = await getCurrentUser();
    const dateInput = document.getElementById('absenceDate');
    const date = dateInput ? dateInput.value : null;
    const reason = document.getElementById('absenceReason').value.trim();
    const proofInput = document.getElementById('absenceProof');

    // ============================================
    // ✅ FORM VALIDATION
    // ============================================
    if (!date || !reason) {
      customAlert.warning('Incomplete Form', 'Please complete the form.');
      return;
    }

    // ============================================
    // 📎 PROOF FILE UPLOAD (Optional)
    // ============================================
    // Convert uploaded file to base64 data URL
    // Stored directly in absence record for easy display
    // ============================================
    const file = proofInput?.files?.[0];
    let proofData = '';
    if (file) {
      proofData = await readFileAsDataUrl(file);
    }

    // ============================================
    // 🔑 GROOMER ID RESOLUTION
    // ============================================
    // CRITICAL: Must use correct groomer ID from server
    // 
    // Why this matters:
    // - staffId: User login ID (e.g., "sam")
    // - groomerId: Groomer system ID (e.g., "groomer-1")
    // - Admin checks BOTH IDs when filtering absent groomers
    // - If groomerId is wrong, groomer will still appear in assignment modal
    // 
    // Resolution process:
    // 1. Try global groomerGroomerId (set on dashboard load)
    // 2. Try user.groomerId (if already linked)
    // 3. Call linkStaffToGroomer() to fetch/create groomer ID from server
    // ============================================
    let finalGroomerId = groomerGroomerId;
    if (!finalGroomerId) {
      // If not set, try to get it from user or link to groomer
      finalGroomerId = user?.groomerId || await linkStaffToGroomer(user);
      groomerGroomerId = finalGroomerId; // Update global variable
    }
    
    console.log('[Absence Submission] Using groomer ID:', finalGroomerId, 'for user:', user.name);

    // ============================================
    // 💾 CREATE ABSENCE RECORD
    // ============================================
    // Absence record includes:
    // - staffId: User login ID (for user identification)
    // - groomerId: Groomer system ID (for absence filtering)
    // - date: Absence date (YYYY-MM-DD format)
    // - reason: Text explanation
    // - proofData: Base64 encoded file (optional)
    // - status: 'pending' (admin must approve)
    // ============================================
    const absences = getStaffAbsences();
    absences.push({
      id: 'abs-' + Date.now(),
      staffId: user.id,              // User login ID
      staffName: user.name,
      groomerId: finalGroomerId,     // Groomer system ID (CRITICAL!)
      date,
      reason,
      proofName: file ? file.name : '',
      proofData,
      status: 'pending',
      createdAt: Date.now(),
      adminNote: ''
    });
    saveStaffAbsences(absences);
    
    console.log('[Absence Submission] Absence created:', {
      staffId: user.id,
      groomerId: finalGroomerId,
      date: date
    });
    
    // ============================================
    // 🔄 RESET FORM AND REFRESH
    // ============================================
    form.reset();
    const dateInputReset = document.getElementById('absenceDate');
    if (dateInputReset) dateInputReset.value = '';
    setupAbsenceCalendarPicker(); // Reset calendar
    customAlert.success('Absence Request Submitted', 'The admin will review it shortly.');
    refreshGroomerDashboard();
  });
}

function setupAbsenceCalendarPicker() {
  const container = document.getElementById('absenceCalendarPicker');
  if (!container) return;

  const state = { monthOffset: 0, selectedDate: null };
  container.__pickerState = state;

  renderAbsenceCalendarPicker();
}

function renderAbsenceCalendarPicker() {
  const container = document.getElementById('absenceCalendarPicker');
  if (!container) return;

  const state = container.__pickerState || { monthOffset: 0, selectedDate: null };
  const baseDate = new Date();
  const displayDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + state.monthOffset, 1);
  const monthName = displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
  const lastDayOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);
  const startWeekday = firstDayOfMonth.getDay();

  const days = [];
  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const date = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
    const iso = toLocalISO(date);
    days.push({ day, iso });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const selectedDate = state.selectedDate;
  const minDate = getMinDate();

  container.innerHTML = `
    <div class="mega-calendar">
      <div class="calendar-header">
        <button class="calendar-nav" data-cal-action="prev">←</button>
        <h3 style="font-size: 1rem; margin: 0;">${monthName}</h3>
        <button class="calendar-nav" data-cal-action="next">→</button>
      </div>
      <div class="calendar-grid calendar-grid-head">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="calendar-cell head">${d}</div>`).join('')}
      </div>
      <div class="calendar-grid calendar-grid-body">
        ${weeks.map(week => week.map(day => {
    if (!day) {
      return '<div class="calendar-cell empty"></div>';
    }
    const isPast = isPastDate(day.iso);
    const isSelected = selectedDate === day.iso;
    return `
            <div class="calendar-cell day ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}" 
                 data-date="${day.iso}" 
                 style="cursor: ${isPast ? 'not-allowed' : 'pointer'}; opacity: ${isPast ? '0.5' : '1'}; min-height: 60px;">
              <span class="day-number">${day.day}</span>
            </div>
          `;
  }).join('')).join('')}
      </div>
    </div>
  `;

  // Attach event listeners
  container.querySelectorAll('.calendar-cell.day:not(.past)').forEach(cell => {
    cell.addEventListener('click', function () {
      const date = this.dataset.date;
      state.selectedDate = date;
      const dateInput = document.getElementById('absenceDate');
      if (dateInput) {
        dateInput.value = date;
      }
      renderAbsenceCalendarPicker();
    });
  });

  const prevBtn = container.querySelector('[data-cal-action="prev"]');
  const nextBtn = container.querySelector('[data-cal-action="next"]');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      state.monthOffset -= 1;
      renderAbsenceCalendarPicker();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      state.monthOffset += 1;
      renderAbsenceCalendarPicker();
    });
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderAbsenceHistory(absences) {
  const container = document.getElementById('absenceHistory');
  if (!container) return;

  // Sort controls HTML
  const sortControlsHtml = `
    <div class="groomer-sort-controls">
      <label>Sort by:</label>
      <select id="groomerAbsenceSortSelect" onchange="changeGroomerAbsenceSortOrder(this.value)">
        <option value="desc" ${groomerAbsenceSortOrder === 'desc' ? 'selected' : ''}>Newest First</option>
        <option value="asc" ${groomerAbsenceSortOrder === 'asc' ? 'selected' : ''}>Oldest First</option>
      </select>
    </div>
  `;

  if (absences.length === 0) {
    container.innerHTML = sortControlsHtml + '<p class="empty-state">No absence requests yet.</p>';
    return;
  }

  // Apply sort order
  const sortedAbsences = [...absences].sort((a, b) => {
    if (groomerAbsenceSortOrder === 'asc') {
      return a.createdAt - b.createdAt; // Oldest first
    }
    return b.createdAt - a.createdAt; // Newest first (default)
  });

  container.innerHTML = sortControlsHtml + sortedAbsences
    .map(absence => {
      const statusClass = absence.status === 'approved'
        ? 'badge-confirmed'
        : (absence.status === 'rejected' || absence.status === 'cancelledByStaff')
          ? 'badge-cancelled'
          : 'badge-pending';
      const statusLabel = absence.status === 'cancelledByStaff' ? 'cancelled' : absence.status;
      return `
        <div class="card absence-card" data-absence-id="${absence.id}" style="margin-bottom:1rem; cursor: pointer; transition: var(--transition);" onclick="viewAbsenceDetail('${absence.id}')">
          <div class="card-body">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
              <div style="flex: 1;">
                <h3 class="card-title">${formatDate(absence.date)}</h3>
                <p style="color:var(--gray-600); margin:0.25rem 0;">${escapeHtml(absence.reason)}</p>
                ${absence.adminNote ? `<p style="color:var(--gray-500); font-size:0.875rem;"><strong>Admin note:</strong> ${escapeHtml(absence.adminNote)}</p>` : ''}
              </div>
              <span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span>
            </div>
            <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
              ${absence.proofData ? `<button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); previewProof('${absence.id}')">View Proof</button>` : ''}
              ${absence.status === 'pending' ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); cancelAbsence('${absence.id}')">Cancel Request</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
}

function previewProof(absenceId) {
  const absences = getStaffAbsences();
  const absence = absences.find(a => a.id === absenceId);
  if (!absence || !absence.proofData) return;

  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  modalRoot.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h3>Proof for ${formatDate(absence.date)}</h3>
        ${absence.proofData.includes('pdf')
      ? `<iframe src="${absence.proofData}" style="width:100%;height:400px;"></iframe>`
      : `<img src="${absence.proofData}" alt="Proof" style="width:100%;border-radius:var(--radius);">`}
      </div>
    </div>
  `;
}

function closeModal() {
  const modalRoot = document.getElementById('modalRoot');
  if (modalRoot) {
    modalRoot.innerHTML = '';
  }
}

function viewAbsenceDetail(absenceId) {
  const absences = getStaffAbsences();
  const absence = absences.find(a => a.id === absenceId);
  if (!absence) return;

  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  const statusClass = absence.status === 'approved'
    ? 'badge-confirmed'
    : (absence.status === 'rejected' || absence.status === 'cancelledByStaff')
      ? 'badge-cancelled'
      : 'badge-pending';
  const statusLabel = absence.status === 'cancelledByStaff' ? 'cancelled' : absence.status;

  modalRoot.innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal" onclick="event.stopPropagation()" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h3 style="margin-bottom: 1rem;">Absence Request Details</h3>
        <div style="margin-bottom: 1rem;">
          <p><strong>Date:</strong> ${formatDate(absence.date)}</p>
          <p><strong>Status:</strong> <span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span></p>
        </div>
        <div style="margin-bottom: 1rem;">
          <p><strong>Reason:</strong></p>
          <p style="color:var(--gray-600); padding: 1rem; background: var(--gray-50); border-radius: var(--radius-sm);">${escapeHtml(absence.reason)}</p>
        </div>
        ${absence.adminNote ? `
          <div style="margin-bottom: 1rem;">
            <p><strong>Admin Note:</strong></p>
            <p style="color:var(--gray-600); padding: 1rem; background: var(--gray-50); border-radius: var(--radius-sm);">${escapeHtml(absence.adminNote)}</p>
          </div>
        ` : ''}
        ${absence.proofData ? `
          <div style="margin-bottom: 1rem;">
            <p><strong>Proof:</strong></p>
            <div style="margin-top: 0.5rem;">
              ${absence.proofData.includes('pdf')
        ? `<iframe src="${absence.proofData}" style="width:100%;height:400px;border-radius:var(--radius-sm);"></iframe>`
        : `<img src="${absence.proofData}" alt="Proof" style="width:100%;max-height:400px;object-fit:contain;border-radius:var(--radius-sm);">`}
            </div>
          </div>
        ` : '<p style="color:var(--gray-500);">No proof provided</p>'}
        <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem;">
          ${absence.status === 'pending' ? `<button class="btn btn-danger" onclick="cancelAbsence('${absence.id}')">Cancel Request</button>` : ''}
          <button class="btn btn-outline" onclick="closeModal()">Close</button>
        </div>
      </div>
    </div>
  `;
}

function cancelAbsence(absenceId) {
  // Check button protection
  if (window.ButtonProtection && !window.ButtonProtection.canProceed()) {
    console.log('[cancelAbsence] Action blocked - another action in progress');
    return;
  }
  
  customAlert.confirm('Confirm', 'Cancel this request?').then(async (confirmed) => {
    if (!confirmed) return;
    
    // Use button protection for the actual action
    if (window.ButtonProtection) {
      await window.ButtonProtection.protect(async () => {
        const absences = getStaffAbsences();
        const updated = absences.map(abs =>
          abs.id === absenceId ? { ...abs, status: 'cancelledByStaff' } : abs
        );
        saveStaffAbsences(updated);
        refreshGroomerDashboard();
        customAlert.success('Request Cancelled', 'Your absence request has been cancelled.');
      }, null, 'cancelAbsence');
    } else {
      const absences = getStaffAbsences();
      const updated = absences.map(abs =>
        abs.id === absenceId ? { ...abs, status: 'cancelledByStaff' } : abs
      );
      saveStaffAbsences(updated);
      refreshGroomerDashboard();
      customAlert.success('Request Cancelled', 'Your absence request has been cancelled.');
    }
  });
}

function getSingleServiceLabel(serviceId) {
  const pricing = window.SINGLE_SERVICE_PRICING || {};
  return pricing[serviceId]?.label || serviceId;
}

async function openGroomerBookingModal(bookingId) {
  console.log('[openGroomerBookingModal] Opening modal for booking:', bookingId);
  
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) {
    console.warn('[openGroomerBookingModal] Booking not found:', bookingId);
    return;
  }

  const profile = booking.profile || {};
  const services = Array.isArray(booking.singleServices) && booking.singleServices.length
    ? booking.singleServices.map(s => typeof getSingleServiceLabel === 'function' ? getSingleServiceLabel(s) : s).join(', ')
    : 'Not specified';
  const total = booking.totalPrice || booking.cost?.subtotal || 0;
  const balance = booking.balanceOnVisit ?? booking.cost?.balanceOnVisit ?? 0;
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) {
    console.warn('[openGroomerBookingModal] modalRoot element not found');
    return;
  }

  modalRoot.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <button class="modal-close" onclick="closeModal()">×</button>
        <h3 style="margin-bottom: 1rem;">Booking Details</h3>
        <div class="summary-item">
          <span class="summary-label">Customer:</span>
          <span class="summary-value">${escapeHtml(booking.customerName || 'Walk-in')}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Pet / Package:</span>
          <span class="summary-value">${escapeHtml(booking.petName)} · ${escapeHtml(booking.packageName)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Schedule:</span>
          <span class="summary-value">${formatDate(booking.date)} at ${formatTime(booking.time)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Weight:</span>
          <span class="summary-value">${escapeHtml(booking.petWeight || profile.weight || 'Not provided')}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Services:</span>
          <span class="summary-value">${escapeHtml(services)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Estimate:</span>
          <span class="summary-value">${total ? formatCurrency(total) : 'Not set'}</span>
        </div>
        ${balance ? `
          <div class="summary-item">
            <span class="summary-label">Balance on visit:</span>
            <span class="summary-value">${formatCurrency(balance)}</span>
          </div>
        ` : ''}
        <div style="margin-top: 1rem;">
          <button class="btn btn-primary" onclick="closeModal()">Close</button>
        </div>
      </div>
    </div>
  `;
}

function updateNextDayOffBadge(absences) {
  const badge = document.getElementById('nextDayOffBadge');
  if (!badge) return;

  const upcoming = absences
    .filter(a => (a.status === 'approved' || a.status === 'pending') && new Date(a.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (upcoming.length === 0) {
    badge.textContent = 'No upcoming day-off';
    return;
  }
  badge.textContent = `${upcoming[0].status === 'approved' ? 'Approved' : 'Pending'}: ${formatDate(upcoming[0].date)}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('groomerDashboard')) {
    await initGroomerDashboard();
  }
});

window.previewProof = previewProof;
window.closeModal = closeModal;
window.cancelAbsence = cancelAbsence;
window.viewAbsenceDetail = viewAbsenceDetail;
window.closeModal = closeModal;
window.openGroomerBookingModal = openGroomerBookingModal;

// ============================================
// Groomer Notification System
// ============================================
let groomerNotificationPanelOpen = false;

// Update groomer notification badge
async function updateGroomerNotificationBadge() {
  const badge = document.getElementById('groomerNotificationBadge');
  const bell = document.getElementById('groomerNotificationBell');
  if (!badge || !bell) return;
  
  const user = await getCurrentUser();
  if (!user) return;
  
  // Get absences for this groomer
  const absences = getStaffAbsences();
  const myAbsences = absences.filter(a => a.staffId === user.id);
  
  // Count approved absences (new approvals)
  const recentApproved = myAbsences.filter(a => 
    a.status === 'approved' && 
    a.reviewedAt && 
    (Date.now() - a.reviewedAt) < 86400000 // Within last 24 hours
  );
  
  // Count rejected absences (new rejections)
  const recentRejected = myAbsences.filter(a => 
    a.status === 'rejected' && 
    a.reviewedAt && 
    (Date.now() - a.reviewedAt) < 86400000 // Within last 24 hours
  );
  
  // Get bookings assigned to this groomer
  const bookings = await getBookings();
  const myBookings = bookings.filter(b => 
    b.groomerId === groomerGroomerId &&
    ['confirmed', 'inprogress', 'in progress'].includes((b.status || '').toLowerCase())
  );
  
  // Count today's bookings
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = myBookings.filter(b => b.date === today);
  
  const totalNotifications = recentApproved.length + recentRejected.length + todayBookings.length;
  
  if (totalNotifications > 0) {
    badge.style.display = 'block';
    badge.textContent = totalNotifications > 99 ? '99+' : totalNotifications;
    bell.style.animation = 'bellShake 0.5s ease-in-out';
    setTimeout(() => bell.style.animation = '', 500);
  } else {
    badge.style.display = 'none';
  }
}

// Open groomer notification panel
async function openGroomerNotificationPanel() {
  const panel = document.getElementById('groomerNotificationPanel');
  const list = document.getElementById('groomerNotificationList');
  if (!panel || !list) return;
  
  groomerNotificationPanelOpen = !groomerNotificationPanelOpen;
  
  if (!groomerNotificationPanelOpen) {
    panel.style.display = 'none';
    return;
  }
  
  panel.style.display = 'block';
  list.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <div style="width: 30px; height: 30px; border: 3px solid #e0e0e0; border-top-color: #4CAF50; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
      <p style="margin-top: 0.5rem; color: var(--gray-500); font-size: 0.85rem;">Loading...</p>
    </div>
    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  `;
  
  try {
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );
    
    const loadDataPromise = (async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error('No user');
      
      const absences = getStaffAbsences();
      const myAbsences = absences.filter(a => a.staffId === user.id);
      const bookings = await getBookings();
      
      return { user, myAbsences, bookings };
    })();
    
    const { user, myAbsences, bookings } = await Promise.race([loadDataPromise, timeoutPromise]);
    
    // Get recent absence updates
    const recentApproved = myAbsences.filter(a => 
      a.status === 'approved' && 
      a.reviewedAt && 
      (Date.now() - a.reviewedAt) < 86400000
    );
    
    const recentRejected = myAbsences.filter(a => 
      a.status === 'rejected' && 
      a.reviewedAt && 
      (Date.now() - a.reviewedAt) < 86400000
    );
    
    // Get today's bookings
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => 
      b.groomerId === groomerGroomerId &&
      b.date === today &&
      ['confirmed', 'inprogress', 'in progress'].includes((b.status || '').toLowerCase())
    );
    
    let html = '';
    
    // Today's bookings
    if (todayBookings.length > 0) {
      html += `<div style="padding: 0.5rem; background: #e3f2fd; border-radius: 8px; margin-bottom: 0.5rem;">
        <div style="font-weight: 600; font-size: 0.85rem; color: #1565c0; margin-bottom: 0.5rem;">
          <i class="bi bi-calendar-check"></i> Today's Bookings (${todayBookings.length})
        </div>`;
      
      todayBookings.forEach(booking => {
        html += `
          <div style="background: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; border-left: 3px solid #1976d2;">
            <div style="font-weight: 600; font-size: 0.9rem;">${escapeHtml(booking.petName || 'Pet')}</div>
            <div style="font-size: 0.8rem; color: var(--gray-600);">${escapeHtml(booking.packageName || 'Service')}</div>
            <div style="font-size: 0.8rem; color: var(--gray-600);">Time: ${booking.time || 'TBD'}</div>
          </div>
        `;
      });
      html += '</div>';
    }
    
    // Approved absences
    if (recentApproved.length > 0) {
      html += `<div style="padding: 0.5rem; background: #e8f5e9; border-radius: 8px; margin-bottom: 0.5rem;">
        <div style="font-weight: 600; font-size: 0.85rem; color: #2e7d32; margin-bottom: 0.5rem;">
          <i class="bi bi-check-circle"></i> Approved Absences
        </div>`;
      
      recentApproved.forEach(absence => {
        html += `
          <div style="background: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; border-left: 3px solid #4caf50;">
            <div style="font-weight: 600; font-size: 0.9rem;">Day Off Approved! ✓</div>
            <div style="font-size: 0.8rem; color: var(--gray-600);">Date: ${formatDate(absence.date)}</div>
            ${absence.adminNote ? `<div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 0.25rem;">Note: ${escapeHtml(absence.adminNote)}</div>` : ''}
          </div>
        `;
      });
      html += '</div>';
    }
    
    // Rejected absences
    if (recentRejected.length > 0) {
      html += `<div style="padding: 0.5rem; background: #ffebee; border-radius: 8px; margin-bottom: 0.5rem;">
        <div style="font-weight: 600; font-size: 0.85rem; color: #c62828; margin-bottom: 0.5rem;">
          <i class="bi bi-x-circle"></i> Rejected Requests
        </div>`;
      
      recentRejected.forEach(absence => {
        html += `
          <div style="background: white; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.5rem; border-left: 3px solid #f44336;">
            <div style="font-weight: 600; font-size: 0.9rem;">Request Rejected</div>
            <div style="font-size: 0.8rem; color: var(--gray-600);">Date: ${formatDate(absence.date)}</div>
            ${absence.adminNote ? `<div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 0.25rem;">Reason: ${escapeHtml(absence.adminNote)}</div>` : ''}
          </div>
        `;
      });
      html += '</div>';
    }
    
    if (!html) {
      html = `<div style="text-align: center; padding: 2rem; color: var(--gray-500);">
        <i class="bi bi-check-circle" style="font-size: 2rem; color: #4caf50;"></i>
        <p style="margin-top: 0.5rem;">No new notifications.</p>
      </div>`;
    }
    
    list.innerHTML = html;
    
  } catch (error) {
    console.warn('[Groomer Notifications] Error loading:', error);
    list.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--gray-500);">
        <i class="bi bi-exclamation-circle" style="font-size: 2rem; color: #f44336;"></i>
        <p style="margin-top: 0.5rem;">Unable to load notifications.</p>
        <button onclick="openGroomerNotificationPanel(); openGroomerNotificationPanel();" 
          style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: var(--gray-100); border: none; border-radius: 6px; cursor: pointer;">
          Retry
        </button>
      </div>
    `;
  }
}

// Close groomer notification panel
function closeGroomerNotificationPanel() {
  const panel = document.getElementById('groomerNotificationPanel');
  if (panel) {
    panel.style.display = 'none';
    groomerNotificationPanelOpen = false;
  }
}

// Export notification functions
window.updateGroomerNotificationBadge = updateGroomerNotificationBadge;
window.openGroomerNotificationPanel = openGroomerNotificationPanel;
window.closeGroomerNotificationPanel = closeGroomerNotificationPanel;

// Close more menu when clicking outside (event listener)
document.addEventListener('click', function(e) {
  const menu = document.getElementById('groomerMoreMenu');
  const btn = document.getElementById('groomerMoreMenuBtn');
  if (menu && btn && groomerMoreMenuOpen) {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      closeGroomerMoreMenu();
    }
  }
});
