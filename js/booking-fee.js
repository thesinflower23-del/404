/**
 * Booking Fee Management Module
 * 
 * Handles booking fee calculations, validation, and data model updates.
 * Pure functions with NO DOM dependencies.
 * 
 * Functions:
 * - Calculate total amount with booking fee
 * - Calculate amount to pay on arrival
 * - Validate booking fee amounts
 * - Update booking data model with fee information
 */

// ============================================
// Booking Fee Calculation Functions
// ============================================

/**
 * Calculate total amount including booking fee
 * 
 * @param {number} subtotal - Subtotal (package + add-ons)
 * @param {number} bookingFee - Booking fee amount (default: 0)
 * @returns {number} Total amount (subtotal + booking fee)
 * 
 * Requirements: 3.5, 7.1
 */
function calculateTotalAmount(subtotal, bookingFee = 0) {
  if (typeof subtotal !== 'number' || isNaN(subtotal)) {
    console.warn('calculateTotalAmount: subtotal must be a number');
    return 0;
  }
  
  if (typeof bookingFee !== 'number' || isNaN(bookingFee)) {
    console.warn('calculateTotalAmount: bookingFee must be a number');
    return subtotal;
  }
  
  const total = subtotal + bookingFee;
  return Math.round(total * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate amount to pay on arrival
 * 
 * @param {number} subtotal - Subtotal (package + add-ons)
 * @param {number} bookingFee - Booking fee amount (default: 0)
 * @returns {number} Amount to pay on arrival (subtotal - booking fee)
 * 
 * Requirements: 3.6, 7.1
 */
function calculateAmountToPayOnArrival(subtotal, bookingFee = 0) {
  if (typeof subtotal !== 'number' || isNaN(subtotal)) {
    console.warn('calculateAmountToPayOnArrival: subtotal must be a number');
    return 0;
  }
  
  if (typeof bookingFee !== 'number' || isNaN(bookingFee)) {
    console.warn('calculateAmountToPayOnArrival: bookingFee must be a number');
    return subtotal;
  }
  
  const amountToPay = Math.max(0, subtotal - bookingFee);
  return Math.round(amountToPay * 100) / 100; // Round to 2 decimal places
}

// ============================================
// Booking Fee Validation Functions
// ============================================

/**
 * Validate booking fee amount
 * 
 * @param {number} amount - Booking fee amount to validate
 * @param {number} subtotal - Subtotal for comparison
 * @returns {Object} { valid: boolean, error?: string, warning?: string }
 * 
 * Requirements: 5.1-5.3
 */
function validateBookingFeeAmount(amount, subtotal) {
  // Check if amount is provided
  if (amount === null || amount === undefined || amount === '') {
    return {
      valid: false,
      error: 'Booking fee amount is required'
    };
  }
  
  // Convert to number
  const numAmount = parseFloat(amount);
  
  // Check if numeric
  if (isNaN(numAmount)) {
    return {
      valid: false,
      error: 'Booking fee must be a valid number'
    };
  }
  
  // Check if positive
  if (numAmount <= 0) {
    return {
      valid: false,
      error: 'Booking fee must be greater than 0'
    };
  }
  
  // Check if exceeds subtotal (warning, not error)
  if (numAmount > subtotal) {
    return {
      valid: true,
      warning: `Booking fee (₱${numAmount.toFixed(2)}) exceeds subtotal (₱${subtotal.toFixed(2)}). Amount to pay on arrival will be negative.`
    };
  }
  
  return { valid: true };
}

/**
 * Validate booking fee can be added to booking
 * 
 * @param {Object} booking - Booking object
 * @returns {Object} { canAdd: boolean, reason?: string }
 * 
 * Requirements: 5.4, 5.5
 */
function canAddBookingFee(booking) {
  if (!booking) {
    return {
      canAdd: false,
      reason: 'Booking not found'
    };
  }
  
  // Cannot add fee to confirmed bookings
  if (booking.status === 'confirmed') {
    return {
      canAdd: false,
      reason: 'Cannot add booking fee to confirmed bookings'
    };
  }
  
  // Cannot add fee to cancelled bookings
  if (booking.status === 'cancelled') {
    return {
      canAdd: false,
      reason: 'Cannot add booking fee to cancelled bookings'
    };
  }
  
  // Cannot add fee to completed bookings
  if (booking.status === 'completed') {
    return {
      canAdd: false,
      reason: 'Cannot add booking fee to completed bookings'
    };
  }
  
  return { canAdd: true };
}

// ============================================
// Booking Data Model Update Functions
// ============================================

/**
 * Initialize booking cost object with fee fields
 * 
 * @param {Object} booking - Booking object to update
 * @returns {Object} Updated booking object
 * 
 * Requirements: 1.5, 3.1-3.6, 7.1
 */
function initializeBookingCost(booking) {
  if (!booking) return booking;
  
  // Ensure cost object exists
  if (!booking.cost) {
    booking.cost = {};
  }
  
  // Initialize fee fields if not present
  if (booking.cost.bookingFee === undefined) {
    booking.cost.bookingFee = 0;
  }
  
  if (booking.cost.amountToPayOnArrival === undefined) {
    booking.cost.amountToPayOnArrival = booking.cost.subtotal || 0;
  }
  
  if (!booking.bookingFeeAddedAt) {
    booking.bookingFeeAddedAt = null;
  }
  
  if (!booking.bookingFeeAddedBy) {
    booking.bookingFeeAddedBy = null;
  }
  
  return booking;
}

/**
 * Add booking fee to a booking
 * 
 * @param {Object} booking - Booking object to update
 * @param {number} feeAmount - Fee amount to add
 * @param {string} adminId - Admin ID who added the fee
 * @returns {Object} Updated booking object
 * 
 * Requirements: 1.4, 1.5, 7.1
 */
function addBookingFeeToBooking(booking, feeAmount, adminId) {
  if (!booking) {
    console.error('addBookingFeeToBooking: booking is required');
    return null;
  }
  
  // Validate fee amount
  const subtotal = booking.cost?.subtotal || 0;
  const validation = validateBookingFeeAmount(feeAmount, subtotal);
  
  if (!validation.valid) {
    console.error('addBookingFeeToBooking: validation failed -', validation.error);
    return null;
  }
  
  // Initialize cost if needed
  if (!booking.cost) {
    booking.cost = {};
  }
  
  // Update booking fee
  const numFee = parseFloat(feeAmount);
  booking.cost.bookingFee = Math.round(numFee * 100) / 100;
  
  // Recalculate totals
  booking.cost.totalAmount = calculateTotalAmount(subtotal, booking.cost.bookingFee);
  booking.cost.amountToPayOnArrival = calculateAmountToPayOnArrival(subtotal, booking.cost.bookingFee);
  
  // Record metadata
  booking.bookingFeeAddedAt = new Date().toISOString();
  booking.bookingFeeAddedBy = adminId;
  
  return booking;
}

/**
 * Confirm booking after payment
 * Updates status and calculates remaining balance
 * 
 * @param {Object} booking - Booking object to confirm
 * @returns {Object} Updated booking object
 * 
 * Requirements: 2.1-2.4, 7.1
 */
function confirmBookingAfterPayment(booking) {
  if (!booking) {
    console.error('confirmBookingAfterPayment: booking is required');
    return null;
  }
  
  // Initialize cost if needed
  if (!booking.cost) {
    booking.cost = {};
  }
  
  // Update status
  booking.status = 'confirmed';
  booking.confirmedAt = new Date().toISOString();
  
  // Ensure amount to pay on arrival is calculated
  const subtotal = booking.cost.subtotal || 0;
  const bookingFee = booking.cost.bookingFee || 0;
  booking.cost.amountToPayOnArrival = calculateAmountToPayOnArrival(subtotal, bookingFee);
  
  return booking;
}

/**
 * Add history entry for booking fee
 * 
 * @param {Object} booking - Booking object
 * @param {string} action - Action type ('booking_fee_added', 'confirmed', etc.)
 * @param {Object} details - Additional details for history entry
 * @returns {Object} Updated booking object
 * 
 * Requirements: 4.1-4.5
 */
function addBookingHistoryEntry(booking, action, details = {}) {
  if (!booking) {
    console.error('addBookingHistoryEntry: booking is required');
    return null;
  }
  
  // Initialize history if needed
  if (!booking.history) {
    booking.history = [];
  }
  
  // Create history entry
  const entry = {
    action: action,
    timestamp: new Date().toISOString(),
    totalAmount: booking.cost?.totalAmount || booking.totalPrice || 0,
    bookingFee: booking.cost?.bookingFee || 0,
    subtotal: booking.cost?.subtotal || 0,
    amountToPayOnArrival: booking.cost?.amountToPayOnArrival || 0,
    ...details
  };
  
  // Add to history
  booking.history.push(entry);
  
  return booking;
}

/**
 * Get booking fee status
 * 
 * @param {Object} booking - Booking object
 * @returns {Object} { hasFee: boolean, amount: number, addedAt: string, addedBy: string }
 */
function getBookingFeeStatus(booking) {
  if (!booking || !booking.cost) {
    return {
      hasFee: false,
      amount: 0,
      addedAt: null,
      addedBy: null
    };
  }
  
  return {
    hasFee: booking.cost.bookingFee > 0,
    amount: booking.cost.bookingFee || 0,
    addedAt: booking.bookingFeeAddedAt || null,
    addedBy: booking.bookingFeeAddedBy || null
  };
}

// ============================================
// Exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateTotalAmount,
    calculateAmountToPayOnArrival,
    validateBookingFeeAmount,
    canAddBookingFee,
    initializeBookingCost,
    addBookingFeeToBooking,
    confirmBookingAfterPayment,
    addBookingHistoryEntry,
    getBookingFeeStatus
  };
}

// Make globally available
window.BookingFee = {
  calculateTotalAmount,
  calculateAmountToPayOnArrival,
  validateBookingFeeAmount,
  canAddBookingFee,
  initializeBookingCost,
  addBookingFeeToBooking,
  confirmBookingAfterPayment,
  addBookingHistoryEntry,
  getBookingFeeStatus
};
