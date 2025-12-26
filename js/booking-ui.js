/**
 * Booking UI Rendering Module
 * 
 * Pure rendering functions that:
 * - Take state as parameters
 * - Return HTML strings (no DOM manipulation)
 * - Are deterministic (same state = same output)
 * - Escape all user input for XSS prevention
 * 
 * No DOM access, no side effects, fully testable.
 */

// ============================================
// HTML Escaping Utility
// ============================================

/**
 * Escape HTML special characters to prevent XSS
 * 
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return String(text).replace(/[&<>"']/g, char => map[char]);
}

// ============================================
// Pet Type Cards Rendering
// ============================================

/**
 * Render pet type selection cards
 * 
 * @param {Array} petTypes - Array of pet type objects { id, name, emoji }
 * @param {string} selectedType - Currently selected pet type
 * @returns {string} HTML string
 */
function renderPetTypeCards(petTypes = [], selectedType = null) {
  if (!petTypes.length) {
    return '<p class="empty-state">No pet types available</p>';
  }
  
  return petTypes.map(petType => {
    const isSelected = petType.id === selectedType;
    const selectedClass = isSelected ? 'selected' : '';
    
    return `
      <div class="card card-selectable pet-type-card ${selectedClass}" 
           data-pet-type="${escapeHtml(petType.id)}"
           role="button"
           tabindex="0"
           aria-pressed="${isSelected}">
        <div class="card-body" style="text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">${escapeHtml(petType.emoji || '🐾')}</div>
          <h3 class="card-title">${escapeHtml(petType.name)}</h3>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// Package Cards Rendering
// ============================================

/**
 * Render package selection cards
 * 
 * @param {Array} packages - Array of package objects
 * @param {string} selectedId - Currently selected package ID
 * @returns {string} HTML string
 */
function renderPackageCards(packages = [], selectedId = null) {
  if (!packages.length) {
    return '<p class="empty-state">No packages available for this pet type</p>';
  }
  
  return packages.map(pkg => {
    const isSelected = pkg.id === selectedId;
    const selectedClass = isSelected ? 'selected' : '';
    
    // Render price tiers
    const tiersHtml = (pkg.tiers || [])
      .map(tier => `<div><strong>${escapeHtml(tier.label)}</strong> · ₱${tier.price.toFixed(2)}</div>`)
      .join('');
    
    // Render inclusions
    const inclusionsHtml = (pkg.includes || [])
      .map(item => `<li>${escapeHtml(item)}</li>`)
      .join('');
    
    return `
      <div class="card card-selectable package-card ${selectedClass}"
           data-package-id="${escapeHtml(pkg.id)}"
           role="button"
           tabindex="0"
           aria-pressed="${isSelected}">
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(pkg.name)}</h3>
          <p style="color: var(--gray-600); font-size: 0.9rem; margin-bottom: 0.5rem;">
            Duration · ${escapeHtml(String(pkg.duration))} mins
          </p>
          
          ${inclusionsHtml ? `
            <div class="package-includes" style="margin-bottom: 0.5rem;">
              <strong style="font-size: 0.85rem; color: var(--gray-700);">Includes:</strong>
              <ul style="list-style: none; padding: 0; margin: 0.25rem 0; font-size: 0.85rem;">
                ${inclusionsHtml}
              </ul>
            </div>
          ` : ''}
          
          <div class="package-tiers" style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--gray-200);">
            <strong style="font-size: 0.85rem; color: var(--gray-700);">Pricing by Weight:</strong>
            <div style="font-size: 0.85rem; margin-top: 0.25rem; color: var(--gray-600);">
              ${tiersHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// Step Indicators Rendering
// ============================================

/**
 * Render step progress indicators
 * 
 * @param {number} currentStep - Current step number
 * @param {number} totalSteps - Total number of steps
 * @param {Array} stepLabels - Optional labels for each step
 * @returns {string} HTML string
 */
function renderStepIndicators(currentStep = 1, totalSteps = 5, stepLabels = []) {
  const defaultLabels = ['Policy', 'Pet Type', 'Package', 'Schedule', 'Details'];
  const labels = stepLabels.length ? stepLabels : defaultLabels;
  
  let html = '<div class="step-indicators" style="display: flex; gap: 1rem; margin-bottom: 2rem;">';
  
  for (let i = 1; i <= totalSteps; i++) {
    const isActive = i === currentStep;
    const isCompleted = i < currentStep;
    const activeClass = isActive ? 'active' : '';
    const completedClass = isCompleted ? 'completed' : '';
    
    html += `
      <div class="step ${activeClass} ${completedClass}" 
           style="flex: 1; text-align: center;">
        <div class="step-number" 
             style="
               width: 2.5rem;
               height: 2.5rem;
               margin: 0 auto 0.5rem;
               border-radius: 50%;
               display: flex;
               align-items: center;
               justify-content: center;
               font-weight: bold;
               ${isActive ? 'background: var(--primary); color: white;' : ''}
               ${isCompleted ? 'background: var(--success); color: white;' : 'background: var(--gray-200); color: var(--gray-600);'}
             ">
          ${isCompleted ? '✓' : i}
        </div>
        <div class="step-label" style="font-size: 0.85rem; color: var(--gray-600);">
          ${escapeHtml(labels[i - 1] || `Step ${i}`)}
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
}

// ============================================
// Form Inputs Rendering
// ============================================

/**
 * Render age dropdown options
 * 
 * @param {Array} ages - Array of age strings
 * @param {string} selectedAge - Currently selected age
 * @returns {string} HTML string
 */
function renderAgeDropdown(ages = [], selectedAge = '') {
  const options = ages
    .map(age => {
      const selected = age === selectedAge ? 'selected' : '';
      return `<option value="${escapeHtml(age)}" ${selected}>${escapeHtml(age)}</option>`;
    })
    .join('');
  
  return `
    <select id="petAge" class="form-select" required>
      <option value="">Select age...</option>
      ${options}
    </select>
  `;
}

/**
 * Render weight radio buttons
 * 
 * @param {Array} weights - Array of weight strings
 * @param {string} selectedWeight - Currently selected weight
 * @returns {string} HTML string
 */
function renderWeightRadios(weights = [], selectedWeight = '') {
  if (!weights.length) {
    return '<p class="empty-state">No weight options available</p>';
  }
  
  return weights
    .map((weight, index) => {
      const id = `weight-${index}`;
      const checked = weight === selectedWeight ? 'checked' : '';
      
      return `
        <div style="margin-bottom: 0.75rem;">
          <input 
            type="radio" 
            id="${id}" 
            name="petWeight" 
            value="${escapeHtml(weight)}"
            ${checked}
            class="form-radio">
          <label for="${id}" style="margin-left: 0.5rem; cursor: pointer;">
            ${escapeHtml(weight)}
          </label>
        </div>
      `;
    })
    .join('');
}

/**
 * Render vaccination status radio buttons
 * 
 * @param {string} selectedStatus - Currently selected status
 * @returns {string} HTML string
 */
function renderVaccinationRadios(selectedStatus = '') {
  return `
    <div style="margin-bottom: 1rem;">
      <div style="margin-bottom: 0.75rem;">
        <input 
          type="radio" 
          id="vaccAntiRabies" 
          name="vaccinationStatus" 
          value="vaccinated"
          ${selectedStatus === 'vaccinated' ? 'checked' : ''}
          class="form-radio">
        <label for="vaccAntiRabies" style="margin-left: 0.5rem; cursor: pointer;">
          Vaccinated (Anti-rabies & Anti-parvo)
        </label>
      </div>
      
      <div style="margin-bottom: 0.75rem;">
        <input 
          type="radio" 
          id="vaccNotVaccinated" 
          name="vaccinationStatus" 
          value="not-vaccinated"
          ${selectedStatus === 'not-vaccinated' ? 'checked' : ''}
          class="form-radio">
        <label for="vaccNotVaccinated" style="margin-left: 0.5rem; cursor: pointer;">
          Not Vaccinated
        </label>
      </div>
    </div>
  `;
}

// ============================================
// Summary Rendering
// ============================================

/**
 * Render booking summary with pricing breakdown
 * 
 * @param {Object} state - Current booking state
 * @param {Array} packages - Available packages
 * @param {Object} pricing - Pricing breakdown from calculateTotalPrice
 * @returns {string} HTML string
 */
function renderSummary(state = {}, packages = [], pricing = null) {
  const summaryItems = [];
  
  // Pet information
  if (state.petType) {
    summaryItems.push({
      label: 'Pet Type',
      value: escapeHtml(state.petType)
    });
  }
  
  if (state.petName) {
    summaryItems.push({
      label: 'Pet Name',
      value: escapeHtml(state.petName)
    });
  }
  
  if (state.petBreed) {
    summaryItems.push({
      label: 'Breed',
      value: escapeHtml(state.petBreed)
    });
  }
  
  if (state.petWeight) {
    summaryItems.push({
      label: 'Weight',
      value: escapeHtml(state.petWeight)
    });
  }
  
  // Service information
  if (state.packageId) {
    const pkg = packages.find(p => p.id === state.packageId);
    if (pkg) {
      summaryItems.push({
        label: 'Package',
        value: escapeHtml(pkg.name)
      });
    }
  }
  
  // Schedule information
  if (state.date) {
    summaryItems.push({
      label: 'Date',
      value: escapeHtml(formatDate(state.date))
    });
  }
  
  if (state.time) {
    summaryItems.push({
      label: 'Time',
      value: escapeHtml(state.time)
    });
  }
  
  // Owner information
  if (state.ownerName) {
    summaryItems.push({
      label: 'Owner',
      value: escapeHtml(state.ownerName)
    });
  }
  
  if (state.contactNumber) {
    summaryItems.push({
      label: 'Contact',
      value: escapeHtml(state.contactNumber)
    });
  }
  
  // Build pricing section HTML
  let pricingHTML = '';
  if (pricing) {
    pricingHTML = `
      <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid var(--gray-300);">
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 1rem; margin-bottom: 0.75rem;">
          <strong style="color: var(--gray-700);">Package:</strong>
          <span style="color: var(--gray-900); font-weight: 600;">₱${pricing.packagePrice.toFixed(2)}</span>
        </div>
        
        ${pricing.addOnsTotal > 0 ? `
          <div style="display: grid; grid-template-columns: 150px 1fr; gap: 1rem; margin-bottom: 0.75rem;">
            <strong style="color: var(--gray-700);">Add-ons:</strong>
            <span style="color: var(--gray-900);">₱${pricing.addOnsTotal.toFixed(2)}</span>
          </div>
        ` : ''}
        
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 1rem; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--gray-200);">
          <strong style="color: var(--gray-700);">Subtotal:</strong>
          <span style="color: var(--gray-900); font-weight: 600;">₱${pricing.subtotal.toFixed(2)}</span>
        </div>
        
        ${pricing.hasBookingFeeDiscount ? `
          <div style="display: grid; grid-template-columns: 150px 1fr; gap: 1rem; margin-bottom: 0.75rem; background: #e8f5e9; padding: 0.75rem; border-radius: 0.4rem; border-left: 4px solid #4caf50;">
            <strong style="color: #2e7d32;">Booking Fee:</strong>
            <span style="color: #2e7d32; font-weight: 600;">Paid ✓</span>
          </div>
          
          <div style="display: grid; grid-template-columns: 150px 1fr; gap: 1rem; margin-bottom: 0.75rem; background: #fff3e0; padding: 0.75rem; border-radius: 0.4rem;">
            <strong style="color: #e65100;">Discount:</strong>
            <span style="color: #e65100; font-weight: 600;">-₱${pricing.bookingFeeDiscount.toFixed(2)}</span>
          </div>
        ` : ''}
        
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 1rem; margin-bottom: 0.75rem; padding: 1rem; background: #f3e5f5; border-radius: 0.4rem; border-left: 4px solid #9c27b0;">
          <strong style="color: #6a1b9a; font-size: 1.1rem;">Total Amount:</strong>
          <span style="color: #6a1b9a; font-weight: 700; font-size: 1.1rem;">₱${pricing.totalAmount.toFixed(2)}</span>
        </div>
        
        <div style="display: grid; grid-template-columns: 150px 1fr; gap: 1rem; padding: 1rem; background: #e3f2fd; border-radius: 0.4rem; border-left: 4px solid #1976d2;">
          <strong style="color: #0d47a1; font-size: 1.1rem;">Amount to Pay:</strong>
          <span style="color: #0d47a1; font-weight: 700; font-size: 1.1rem;">₱${pricing.amountToPay.toFixed(2)}</span>
        </div>
      </div>
    `;
  }
  
  if (!summaryItems.length && !pricing) {
    return '<p class="empty-state">No booking information yet</p>';
  }
  
  return `
    <div class="booking-summary" style="background: var(--gray-50); padding: 1.5rem; border-radius: 0.5rem;">
      ${summaryItems
        .map(item => `
          <div style="display: grid; grid-template-columns: 150px 1fr; gap: 1rem; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--gray-200);">
            <strong style="color: var(--gray-700);">${escapeHtml(item.label)}:</strong>
            <span style="color: var(--gray-900);">${item.value}</span>
          </div>
        `)
        .join('')}
      ${pricingHTML}
    </div>
  `;
}

// ============================================
// Error Messages Rendering
// ============================================

/**
 * Render validation error messages
 * 
 * @param {Array} errors - Array of error strings
 * @returns {string} HTML string
 */
function renderErrors(errors = []) {
  if (!errors.length) return '';
  
  return `
    <div class="alert alert-danger" style="margin-bottom: 1rem;">
      <strong>Please fix the following errors:</strong>
      <ul style="margin: 0.5rem 0 0 1.5rem; padding: 0;">
        ${errors.map(error => `<li>${escapeHtml(error)}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * Render success message
 * 
 * @param {string} message - Success message
 * @returns {string} HTML string
 */
function renderSuccess(message = '') {
  if (!message) return '';
  
  return `
    <div class="alert alert-success" style="margin-bottom: 1rem;">
      ✓ ${escapeHtml(message)}
    </div>
  `;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format date for display
 * 
 * @param {string} dateStr - Date string (ISO format)
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    // Return month abbreviation + day (e.g., "Dec 23", "Dec 24", "Dec 25")
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    return `${month} ${day}`;
  } catch (e) {
    return escapeHtml(dateStr);
  }
}

/**
 * Format time for display
 * 
 * @param {string} timeStr - Time string (HH:MM format)
 * @returns {string} Formatted time
 */
function formatTime(timeStr) {
  if (!timeStr) return '';
  
  try {
    // Check if it's a time slot format like "9am-12pm" or "3pm-6pm"
    if (timeStr.includes('am') || timeStr.includes('pm')) {
      // Return the full time slot with proper formatting
      const parts = timeStr.split('-');
      const startTime = parts[0].trim();
      const endTime = parts[1] ? parts[1].trim() : '';
      
      // Capitalize first letter
      const formatted = startTime.charAt(0).toUpperCase() + startTime.slice(1);
      if (endTime) {
        const formattedEnd = endTime.charAt(0).toUpperCase() + endTime.slice(1);
        return `${formatted} - ${formattedEnd}`;
      }
      return formatted;
    }
    
    // Otherwise, assume HH:MM format
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch (e) {
    return escapeHtml(timeStr);
  }
}

// ============================================
// Exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    renderPetTypeCards,
    renderPackageCards,
    renderStepIndicators,
    renderAgeDropdown,
    renderWeightRadios,
    renderVaccinationRadios,
    renderSummary,
    renderErrors,
    renderSuccess,
    formatDate,
    formatTime
  };
}

// Make globally available
window.BookingUI = {
  escapeHtml,
  renderPetTypeCards,
  renderPackageCards,
  renderStepIndicators,
  renderAgeDropdown,
  renderWeightRadios,
  renderVaccinationRadios,
  renderSummary,
  renderErrors,
  renderSuccess,
  formatDate,
  formatTime
};
