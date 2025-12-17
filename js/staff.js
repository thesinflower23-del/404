/* ============================================
   BestBuddies Pet Grooming - Staff Dashboard
   ============================================ */

let staffGroomerId = null;

async function initStaffDashboard() {
  if (!requireStaff()) {
    return;
  }

  const user = await getCurrentUser();
  staffGroomerId = user?.groomerId || await linkStaffToGroomer(user);
  const nameEl = document.getElementById('staffWelcomeName');
  if (nameEl) {
    nameEl.textContent = user.name;
  }

  setupAbsenceForm();
  refreshStaffDashboard();
}

function refreshStaffDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  const allAbsences = getStaffAbsences();
  const myAbsences = allAbsences.filter(a => a.staffId === user.id);
  renderStaffStats(myAbsences);
  renderAbsenceHistory(myAbsences);
  updateNextDayOffBadge(myAbsences);

  const bookings = getBookings();
  const dataset = buildCalendarDataset(bookings, myAbsences);
  renderMegaCalendar('staffCalendar', dataset);
}

function renderStaffStats(absences) {
  const statsEl = document.getElementById('staffStats');
  if (!statsEl) return;

  const total = absences.length;
  const pending = absences.filter(a => a.status === 'pending').length;
  const approved = absences.filter(a => a.status === 'approved').length;
  const rejected = absences.filter(a => a.status === 'rejected').length;

  statsEl.innerHTML = `
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
    <div class="stat-card">
      <div style="font-size: 2rem;">❌</div>
      <div class="stat-value" style="color:var(--gray-600)">${rejected}</div>
      <div class="stat-label">Rejected</div>
    </div>
  `;
}

function setupAbsenceForm() {
  const form = document.getElementById('absenceForm');
  if (!form) return;

  // Setup calendar picker
  setupAbsenceCalendarPicker();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = getCurrentUser();
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
      groomerId: staffGroomerId || user.id,
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
    refreshStaffDashboard();
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
    const isToday = day.iso === minDate;
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
        <div class="card" style="margin-bottom:1rem;">
          <div class="card-body">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
              <div>
                <h3 class="card-title">${formatDate(absence.date)}</h3>
                <p style="color:var(--gray-600); margin:0.25rem 0;">${escapeHtml(absence.reason)}</p>
                ${absence.adminNote ? `<p style="color:var(--gray-500); font-size:0.875rem;"><strong>Admin note:</strong> ${escapeHtml(absence.adminNote)}</p>` : ''}
                ${absence.proofData ? `<button class="btn btn-outline btn-sm" onclick="previewProof('${absence.id}')">View Proof</button>` : ''}
                ${absence.status === 'pending' ? `<button class="btn btn-danger btn-sm" onclick="cancelAbsence('${absence.id}')">Cancel Request</button>` : ''}
              </div>
              <span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span>
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

function cancelAbsence(absenceId) {
  customAlert.confirm('Confirm', 'Cancel this request?').then((confirmed) => {
    if (!confirmed) return;
    const absences = getStaffAbsences();
    const updated = absences.map(abs =>
      abs.id === absenceId ? { ...abs, status: 'cancelledByStaff' } : abs
    );
    saveStaffAbsences(updated);
    refreshStaffDashboard();
    customAlert.success('Request cancelled.');
  });
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

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('staffDashboard')) {
    initStaffDashboard();
  }
});

window.previewProof = previewProof;
window.closeModal = closeModal;
window.cancelAbsence = cancelAbsence;

