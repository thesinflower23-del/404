/**
 * Unit Tests for Booking Fee Module
 * 
 * Tests verify:
 * - Booking fee calculations are correct
 * - Validation functions work properly
 * - Booking data model updates correctly
 * - History entries are recorded
 * - Edge cases are handled gracefully
 */

const BookingFee = require('./booking-fee.js');

describe('Booking Fee Module', () => {
  
  // ============================================
  // calculateTotalAmount Tests
  // ============================================
  
  describe('calculateTotalAmount', () => {
    it('returns subtotal when booking fee is 0', () => {
      const result = BookingFee.calculateTotalAmount(600, 0);
      expect(result).toBe(600);
    });
    
    it('returns correct total with booking fee', () => {
      const result = BookingFee.calculateTotalAmount(600, 100);
      expect(result).toBe(700);
    });
    
    it('handles decimal values correctly', () => {
      const result = BookingFee.calculateTotalAmount(630.50, 99.99);
      expect(result).toBe(730.49);
    });
    
    it('rounds to 2 decimal places', () => {
      const result = BookingFee.calculateTotalAmount(600.123, 100.456);
      expect(result).toBe(700.58);
    });
    
    it('returns 0 for invalid subtotal', () => {
      const result = BookingFee.calculateTotalAmount('invalid', 100);
      expect(result).toBe(0);
    });
    
    it('returns subtotal for invalid booking fee', () => {
      const result = BookingFee.calculateTotalAmount(600, 'invalid');
      expect(result).toBe(600);
    });
  });
  
  // ============================================
  // calculateAmountToPayOnArrival Tests
  // ============================================
  
  describe('calculateAmountToPayOnArrival', () => {
    it('returns subtotal when booking fee is 0', () => {
      const result = BookingFee.calculateAmountToPayOnArrival(600, 0);
      expect(result).toBe(600);
    });
    
    it('returns correct amount when fee is less than subtotal', () => {
      const result = BookingFee.calculateAmountToPayOnArrival(600, 100);
      expect(result).toBe(500);
    });
    
    it('returns 0 when fee equals subtotal', () => {
      const result = BookingFee.calculateAmountToPayOnArrival(600, 600);
      expect(result).toBe(0);
    });
    
    it('returns 0 when fee exceeds subtotal', () => {
      const result = BookingFee.calculateAmountToPayOnArrival(600, 700);
      expect(result).toBe(0);
    });
    
    it('handles decimal values correctly', () => {
      const result = BookingFee.calculateAmountToPayOnArrival(630.50, 99.99);
      expect(result).toBe(530.51);
    });
    
    it('rounds to 2 decimal places', () => {
      const result = BookingFee.calculateAmountToPayOnArrival(600.123, 100.456);
      expect(result).toBe(499.67);
    });
  });
  
  // ============================================
  // validateBookingFeeAmount Tests
  // ============================================
  
  describe('validateBookingFeeAmount', () => {
    it('rejects null amount', () => {
      const result = BookingFee.validateBookingFeeAmount(null, 600);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });
    
    it('rejects undefined amount', () => {
      const result = BookingFee.validateBookingFeeAmount(undefined, 600);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });
    
    it('rejects empty string', () => {
      const result = BookingFee.validateBookingFeeAmount('', 600);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });
    
    it('rejects non-numeric value', () => {
      const result = BookingFee.validateBookingFeeAmount('abc', 600);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid number');
    });
    
    it('rejects zero amount', () => {
      const result = BookingFee.validateBookingFeeAmount(0, 600);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });
    
    it('rejects negative amount', () => {
      const result = BookingFee.validateBookingFeeAmount(-100, 600);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });
    
    it('accepts valid amount less than subtotal', () => {
      const result = BookingFee.validateBookingFeeAmount(100, 600);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('warns when amount exceeds subtotal', () => {
      const result = BookingFee.validateBookingFeeAmount(700, 600);
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('exceeds subtotal');
    });
    
    it('accepts string numbers', () => {
      const result = BookingFee.validateBookingFeeAmount('100', 600);
      expect(result.valid).toBe(true);
    });
  });
  
  // ============================================
  // canAddBookingFee Tests
  // ============================================
  
  describe('canAddBookingFee', () => {
    it('returns false for null booking', () => {
      const result = BookingFee.canAddBookingFee(null);
      expect(result.canAdd).toBe(false);
    });
    
    it('returns false for confirmed booking', () => {
      const booking = { status: 'confirmed' };
      const result = BookingFee.canAddBookingFee(booking);
      expect(result.canAdd).toBe(false);
      expect(result.reason).toContain('confirmed');
    });
    
    it('returns false for cancelled booking', () => {
      const booking = { status: 'cancelled' };
      const result = BookingFee.canAddBookingFee(booking);
      expect(result.canAdd).toBe(false);
      expect(result.reason).toContain('cancelled');
    });
    
    it('returns false for completed booking', () => {
      const booking = { status: 'completed' };
      const result = BookingFee.canAddBookingFee(booking);
      expect(result.canAdd).toBe(false);
      expect(result.reason).toContain('completed');
    });
    
    it('returns true for pending booking', () => {
      const booking = { status: 'pending' };
      const result = BookingFee.canAddBookingFee(booking);
      expect(result.canAdd).toBe(true);
    });
  });
  
  // ============================================
  // initializeBookingCost Tests
  // ============================================
  
  describe('initializeBookingCost', () => {
    it('creates cost object if not present', () => {
      const booking = {};
      const result = BookingFee.initializeBookingCost(booking);
      expect(result.cost).toBeDefined();
    });
    
    it('initializes bookingFee to 0', () => {
      const booking = {};
      const result = BookingFee.initializeBookingCost(booking);
      expect(result.cost.bookingFee).toBe(0);
    });
    
    it('initializes amountToPayOnArrival', () => {
      const booking = { cost: { subtotal: 600 } };
      const result = BookingFee.initializeBookingCost(booking);
      expect(result.cost.amountToPayOnArrival).toBe(600);
    });
    
    it('initializes bookingFeeAddedAt to null', () => {
      const booking = {};
      const result = BookingFee.initializeBookingCost(booking);
      expect(result.bookingFeeAddedAt).toBeNull();
    });
    
    it('initializes bookingFeeAddedBy to null', () => {
      const booking = {};
      const result = BookingFee.initializeBookingCost(booking);
      expect(result.bookingFeeAddedBy).toBeNull();
    });
    
    it('preserves existing cost values', () => {
      const booking = { cost: { subtotal: 600, bookingFee: 50 } };
      const result = BookingFee.initializeBookingCost(booking);
      expect(result.cost.subtotal).toBe(600);
      expect(result.cost.bookingFee).toBe(50);
    });
  });
  
  // ============================================
  // addBookingFeeToBooking Tests
  // ============================================
  
  describe('addBookingFeeToBooking', () => {
    it('returns null for null booking', () => {
      const result = BookingFee.addBookingFeeToBooking(null, 100, 'admin-1');
      expect(result).toBeNull();
    });
    
    it('returns null for invalid fee amount', () => {
      const booking = { cost: { subtotal: 600 } };
      const result = BookingFee.addBookingFeeToBooking(booking, -100, 'admin-1');
      expect(result).toBeNull();
    });
    
    it('adds booking fee correctly', () => {
      const booking = { cost: { subtotal: 600 } };
      const result = BookingFee.addBookingFeeToBooking(booking, 100, 'admin-1');
      expect(result.cost.bookingFee).toBe(100);
    });
    
    it('updates totalAmount correctly', () => {
      const booking = { cost: { subtotal: 600 } };
      const result = BookingFee.addBookingFeeToBooking(booking, 100, 'admin-1');
      expect(result.cost.totalAmount).toBe(700);
    });
    
    it('updates amountToPayOnArrival correctly', () => {
      const booking = { cost: { subtotal: 600 } };
      const result = BookingFee.addBookingFeeToBooking(booking, 100, 'admin-1');
      expect(result.cost.amountToPayOnArrival).toBe(500);
    });
    
    it('records bookingFeeAddedAt timestamp', () => {
      const booking = { cost: { subtotal: 600 } };
      const result = BookingFee.addBookingFeeToBooking(booking, 100, 'admin-1');
      expect(result.bookingFeeAddedAt).toBeDefined();
      expect(typeof result.bookingFeeAddedAt).toBe('string');
    });
    
    it('records bookingFeeAddedBy admin ID', () => {
      const booking = { cost: { subtotal: 600 } };
      const result = BookingFee.addBookingFeeToBooking(booking, 100, 'admin-1');
      expect(result.bookingFeeAddedBy).toBe('admin-1');
    });
    
    it('handles string fee amounts', () => {
      const booking = { cost: { subtotal: 600 } };
      const result = BookingFee.addBookingFeeToBooking(booking, '100', 'admin-1');
      expect(result.cost.bookingFee).toBe(100);
    });
  });
  
  // ============================================
  // confirmBookingAfterPayment Tests
  // ============================================
  
  describe('confirmBookingAfterPayment', () => {
    it('returns null for null booking', () => {
      const result = BookingFee.confirmBookingAfterPayment(null);
      expect(result).toBeNull();
    });
    
    it('updates status to confirmed', () => {
      const booking = { status: 'pending', cost: { subtotal: 600, bookingFee: 100 } };
      const result = BookingFee.confirmBookingAfterPayment(booking);
      expect(result.status).toBe('confirmed');
    });
    
    it('sets confirmedAt timestamp', () => {
      const booking = { status: 'pending', cost: { subtotal: 600, bookingFee: 100 } };
      const result = BookingFee.confirmBookingAfterPayment(booking);
      expect(result.confirmedAt).toBeDefined();
      expect(typeof result.confirmedAt).toBe('string');
    });
    
    it('calculates amountToPayOnArrival', () => {
      const booking = { status: 'pending', cost: { subtotal: 600, bookingFee: 100 } };
      const result = BookingFee.confirmBookingAfterPayment(booking);
      expect(result.cost.amountToPayOnArrival).toBe(500);
    });
    
    it('handles booking without cost object', () => {
      const booking = { status: 'pending' };
      const result = BookingFee.confirmBookingAfterPayment(booking);
      expect(result.status).toBe('confirmed');
      expect(result.cost).toBeDefined();
    });
  });
  
  // ============================================
  // addBookingHistoryEntry Tests
  // ============================================
  
  describe('addBookingHistoryEntry', () => {
    it('returns null for null booking', () => {
      const result = BookingFee.addBookingHistoryEntry(null, 'booking_fee_added');
      expect(result).toBeNull();
    });
    
    it('creates history array if not present', () => {
      const booking = { cost: { subtotal: 600, bookingFee: 100, totalAmount: 700 } };
      const result = BookingFee.addBookingHistoryEntry(booking, 'booking_fee_added');
      expect(Array.isArray(result.history)).toBe(true);
    });
    
    it('adds entry with correct action', () => {
      const booking = { cost: { subtotal: 600, bookingFee: 100, totalAmount: 700 } };
      const result = BookingFee.addBookingHistoryEntry(booking, 'booking_fee_added');
      expect(result.history[0].action).toBe('booking_fee_added');
    });
    
    it('records timestamp', () => {
      const booking = { cost: { subtotal: 600, bookingFee: 100, totalAmount: 700 } };
      const result = BookingFee.addBookingHistoryEntry(booking, 'booking_fee_added');
      expect(result.history[0].timestamp).toBeDefined();
    });
    
    it('records totalAmount in history', () => {
      const booking = { cost: { subtotal: 600, bookingFee: 100, totalAmount: 700 } };
      const result = BookingFee.addBookingHistoryEntry(booking, 'booking_fee_added');
      expect(result.history[0].totalAmount).toBe(700);
    });
    
    it('records bookingFee in history', () => {
      const booking = { cost: { subtotal: 600, bookingFee: 100, totalAmount: 700 } };
      const result = BookingFee.addBookingHistoryEntry(booking, 'booking_fee_added');
      expect(result.history[0].bookingFee).toBe(100);
    });
    
    it('includes additional details', () => {
      const booking = { cost: { subtotal: 600, bookingFee: 100, totalAmount: 700 } };
      const result = BookingFee.addBookingHistoryEntry(booking, 'booking_fee_added', { adminId: 'admin-1' });
      expect(result.history[0].adminId).toBe('admin-1');
    });
  });
  
  // ============================================
  // getBookingFeeStatus Tests
  // ============================================
  
  describe('getBookingFeeStatus', () => {
    it('returns default status for null booking', () => {
      const result = BookingFee.getBookingFeeStatus(null);
      expect(result.hasFee).toBe(false);
      expect(result.amount).toBe(0);
    });
    
    it('returns hasFee false when bookingFee is 0', () => {
      const booking = { cost: { bookingFee: 0 } };
      const result = BookingFee.getBookingFeeStatus(booking);
      expect(result.hasFee).toBe(false);
    });
    
    it('returns hasFee true when bookingFee > 0', () => {
      const booking = { cost: { bookingFee: 100 } };
      const result = BookingFee.getBookingFeeStatus(booking);
      expect(result.hasFee).toBe(true);
    });
    
    it('returns correct amount', () => {
      const booking = { cost: { bookingFee: 100 } };
      const result = BookingFee.getBookingFeeStatus(booking);
      expect(result.amount).toBe(100);
    });
    
    it('returns addedAt timestamp', () => {
      const booking = { cost: { bookingFee: 100 }, bookingFeeAddedAt: '2024-01-01T00:00:00Z' };
      const result = BookingFee.getBookingFeeStatus(booking);
      expect(result.addedAt).toBe('2024-01-01T00:00:00Z');
    });
    
    it('returns addedBy admin ID', () => {
      const booking = { cost: { bookingFee: 100 }, bookingFeeAddedBy: 'admin-1' };
      const result = BookingFee.getBookingFeeStatus(booking);
      expect(result.addedBy).toBe('admin-1');
    });
  });
});
