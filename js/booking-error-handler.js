/* ============================================
   Enhanced Error Handling for Secure Booking
   ============================================ */

/**
 * Handle booking creation errors with user-friendly messages
 * @param {Error} error - Error from booking creation
 * @param {Function} hideLoadingOverlay - Function to hide loading
 * @param {Object} customAlert - Alert system
 */
function handleBookingError(error, hideLoadingOverlay, customAlert) {
  console.error('[handleBookingError] Booking error:', error);
  
  // Hide loading overlay
  if (typeof hideLoadingOverlay === 'function') {
    hideLoadingOverlay();
  }
  
  // Determine error type and show appropriate message
  let title = 'Booking Failed';
  let message = 'An unexpected error occurred. Please try again.';
  let type = 'error';
  
  if (error.message) {
    const errorMsg = error.message.toLowerCase();
    
    if (errorMsg.includes('duplicate') || errorMsg.includes('already exists')) {
      title = 'Booking Already Exists';
      message = 'You already have a booking for this time slot. Please check your dashboard or choose a different time.';
      type = 'warning';
    } else if (errorMsg.includes('time slot') || errorMsg.includes('not available')) {
      title = 'Time Slot Unavailable';
      message = 'The selected time slot is no longer available. Please choose a different time.';
      type = 'warning';
    } else if (errorMsg.includes('validation')) {
      title = 'Invalid Information';
      message = error.message.replace('Validation failed: ', '');
      type = 'warning';
    } else if (errorMsg.includes('permission') || errorMsg.includes('unauthorized')) {
      title = 'Access Denied';
      message = 'You do not have permission to perform this action. Please log in and try again.';
      type = 'error';
    } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
      title = 'Connection Error';
      message = 'Unable to connect to the server. Please check your internet connection and try again.';
      type = 'error';
    } else if (errorMsg.includes('authentication') || errorMsg.includes('not authenticated')) {
      title = 'Login Required';
      message = 'Please log in to create a booking.';
      type = 'warning';
    }
  }
  
  // Show error message
  if (customAlert && typeof customAlert.show === 'function') {
    customAlert.show(title, message, type);
  } else {
    alert(`${title}: ${message}`);
  }
  
  // Log error for debugging
  if (typeof BookingSecurityLogger !== 'undefined') {
    BookingSecurityLogger.log('booking_error_handled', {
      error: error.message,
      errorType: type,
      timestamp: Date.now()
    }, 'error');
  }
}

/**
 * Validate form data before submission
 * @param {Object} bookingData - Form data to validate
 * @returns {Object} Validation result
 */
function validateFormData(bookingData) {
  const errors = [];
  
  // Check required fields
  if (!bookingData.customerName?.trim()) {
    errors.push('Customer name is required');
  }
  
  if (!bookingData.customerEmail?.trim()) {
    errors.push('Email address is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingData.customerEmail)) {
      errors.push('Please enter a valid email address');
    }
  }
  
  if (!bookingData.customerPhone?.trim()) {
    errors.push('Phone number is required');
  } else {
    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(bookingData.customerPhone)) {
      errors.push('Phone number must be in format 09XXXXXXXXX');
    }
  }
  
  if (!bookingData.petName?.trim()) {
    errors.push('Pet name is required');
  }
  
  if (!bookingData.petType) {
    errors.push('Please select pet type');
  }
  
  if (!bookingData.packageId) {
    errors.push('Please select a service package');
  }
  
  if (!bookingData.date) {
    errors.push('Please select a date');
  } else {
    const selectedDate = new Date(bookingData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      errors.push('Booking date cannot be in the past');
    }
  }
  
  if (!bookingData.time) {
    errors.push('Please select a time');
  }
  
  if (!bookingData.groomerName) {
    errors.push('Please select a groomer');
  }
  
  // Validate vaccination proof for certain packages
  if (bookingData.packageId && bookingData.packageId !== 'single-service') {
    if (!bookingData.vaccinationProofImage) {
      errors.push('Vaccination proof is required for full grooming packages');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Show validation errors to user
 * @param {Array} errors - Array of error messages
 * @param {Object} customAlert - Alert system
 */
function showValidationErrors(errors, customAlert) {
  const errorList = errors.map(error => `• ${error}`).join('\n');
  const message = `Please fix the following issues:\n\n${errorList}`;
  
  if (customAlert && typeof customAlert.warning === 'function') {
    customAlert.warning('Form Validation', message);
  } else {
    alert(`Form Validation:\n${message}`);
  }
}

/**
 * Enhanced booking submission with validation
 * @param {Object} bookingData - Booking data from form
 * @param {Object} options - Options object with callbacks
 * @returns {Promise<Object>} Created booking or throws error
 */
async function submitBookingSecure(bookingData, options = {}) {
  const {
    showLoadingOverlay,
    hideLoadingOverlay,
    customAlert,
    onSuccess,
    onError
  } = options;
  
  try {
    // Show loading
    if (typeof showLoadingOverlay === 'function') {
      showLoadingOverlay('Validating booking information...');
    }
    
    // 1. Client-side validation
    const validation = validateFormData(bookingData);
    if (!validation.isValid) {
      if (typeof hideLoadingOverlay === 'function') {
        hideLoadingOverlay();
      }
      showValidationErrors(validation.errors, customAlert);
      return null;
    }
    
    // 2. Update loading message
    if (typeof showLoadingOverlay === 'function') {
      showLoadingOverlay('Creating your booking...');
    }
    
    // 3. Create booking with server-side validation
    const createdBooking = await createBookingWithValidation(bookingData);
    
    // 4. Success callback
    if (typeof onSuccess === 'function') {
      onSuccess(createdBooking);
    }
    
    return createdBooking;
    
  } catch (error) {
    // Handle error
    handleBookingError(error, hideLoadingOverlay, customAlert);
    
    // Error callback
    if (typeof onError === 'function') {
      onError(error);
    }
    
    throw error;
  }
}

// Make functions globally available
window.handleBookingError = handleBookingError;
window.validateFormData = validateFormData;
window.showValidationErrors = showValidationErrors;
window.submitBookingSecure = submitBookingSecure;

console.log('[booking-error-handler.js] Enhanced error handling loaded');