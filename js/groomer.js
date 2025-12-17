/* ============================================
   BestBuddies Pet Grooming - Groomer Dashboard
   ============================================ */

let groomerGroomerId = null;

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

  setupAbsenceForm();
  await setupGroomerProfileForm();
  setupGroomerPasswordForm();
  await refreshGroomerDashboard();
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

  const bookings = (await getBookings()).filter(b =>
    b.groomerId === groomerGroomerId &&
    !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(b.status)
  ).sort((a, b) => {
    const dateA = new Date(a.date + ' ' + a.time);
    const dateB = new Date(b.date + ' ' + b.time);
    return dateA - dateB;
  });

  if (bookings.length === 0) {
    container.innerHTML = '<p class="empty-state">No bookings assigned to you yet.</p>';
    return;
  }

  container.innerHTML = bookings.map(booking => {
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
              <button class="btn btn-outline btn-sm" data-groomer-booking="${booking.id}" style="margin-top:0.5rem;">View Details</button>
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

    const nameInput = document.getElementById('groomerName');
    const specialtyInput = document.getElementById('groomerSpecialty');

    const name = nameInput?.value.trim() || '';
    const specialty = specialtyInput?.value.trim() || '';

    if (!name) {
      customAlert.warning('Please enter your name');
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

        customAlert.success('Profile updated successfully!');
        
        // Refresh to verify changes were saved
        await refreshGroomerDashboard();
      } else {
        customAlert.error('Groomer profile not found');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      customAlert.error('Failed to update profile. Please try again.');
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
      customAlert.warning('Please fill in all fields.');
      return;
    }

    if (next !== confirm) {
      customAlert.warning('New password and confirmation do not match.');
      return;
    }

    const result = changePasswordForCurrentUser(current, next);
    if (!result?.success) {
      customAlert.error(result?.message || 'Unable to update password.');
      return;
    }

    form.reset();
    customAlert.success('Password updated successfully!');
  });
}

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

    if (!date || !reason) {
      customAlert.warning('Please complete the form.');
      return;
    }

    const file = proofInput?.files?.[0];
    let proofData = '';
    if (file) {
      proofData = await readFileAsDataUrl(file);
    }

    const absences = getStaffAbsences();
    absences.push({
      id: 'abs-' + Date.now(),
      staffId: user.id,
      staffName: user.name,
      groomerId: groomerGroomerId || user.id,
      date,
      reason,
      proofName: file ? file.name : '',
      proofData,
      status: 'pending',
      createdAt: Date.now(),
      adminNote: ''
    });
    saveStaffAbsences(absences);
    form.reset();
    const dateInputReset = document.getElementById('absenceDate');
    if (dateInputReset) dateInputReset.value = '';
    setupAbsenceCalendarPicker(); // Reset calendar
    customAlert.success('Request submitted! The admin team will review it shortly.');
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

  if (absences.length === 0) {
    container.innerHTML = '<p class="empty-state">No absence requests yet.</p>';
    return;
  }

  container.innerHTML = absences
    .sort((a, b) => b.createdAt - a.createdAt)
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
  customAlert.confirm('Confirm', 'Cancel this request?').then((confirmed) => {
    if (!confirmed) return;
    const absences = getStaffAbsences();
    const updated = absences.map(abs =>
      abs.id === absenceId ? { ...abs, status: 'cancelledByStaff' } : abs
    );
    saveStaffAbsences(updated);
    refreshGroomerDashboard();
    customAlert.success('Request cancelled.');
  });
}

function getSingleServiceLabel(serviceId) {
  const pricing = window.SINGLE_SERVICE_PRICING || {};
  return pricing[serviceId]?.label || serviceId;
}

async function openGroomerBookingModal(bookingId) {
  const bookings = await getBookings();
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return;

  const profile = booking.profile || {};
  const services = Array.isArray(booking.singleServices) && booking.singleServices.length
    ? booking.singleServices.map(getSingleServiceLabel).join(', ')
    : 'Not specified';
  const total = booking.totalPrice || booking.cost?.subtotal || 0;
  const balance = booking.balanceOnVisit ?? booking.cost?.balanceOnVisit ?? 0;
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

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

