/**
 * Tests for Booking Business Logic
 * 
 * Tests verify:
 * - Validation functions work correctly
 * - Calculations are accurate
 * - State transitions are valid
 * - All functions have NO DOM dependencies
 */

const BookingLogic = typeof require !== 'undefined'
  ? require('./booking-logic.js')
  : window.BookingLogic;

describe('Booking Business Logic', () => {
  
  // ============================================
  // Phone Number Validation Tests
  // ============================================
  
  describe('validatePhoneNumber', () => {
    it('accepts valid 09 format numbers', () => {
      const result = BookingLogic.validatePhoneNumber('09123456789');
      expect(result.valid).toBe(true);
    });
    
    it('accepts valid +63 format numbers', () => {
      const result = BookingLogic.validatePhoneNumber('+639123456789');
      expect(result.valid).toBe(true);
    });
    
    it('accepts numbers with spaces', () => {
      const result = BookingLogic.validatePhoneNumber('0912 345 6789');
      expect(result.valid).toBe(true);
    });
    
    it('rejects numbers with wrong length', () => {
      const result = BookingLogic.validatePhoneNumber('0912345678');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
    
    it('rejects empty phone number', () => {
      const result = BookingLogic.validatePhoneNumber('');
      expect(result.valid).toBe(false);
    });
    
    it('rejects null phone number', () => {
      const result = BookingLogic.validatePhoneNumber(null);
      expect(result.valid).toBe(false);
    });
    
    it('rejects invalid format', () => {
      const result = BookingLogic.validatePhoneNumber('abcdefghijk');
      expect(result.valid).toBe(false);
    });
  });
  
  // ============================================
  // Pet Age Validation Tests
  // ============================================
  
  describe('validatePetAge', () => {
    it('accepts any age for single-service package', () => {
      const result = BookingLogic.validatePetAge('2 months', 'single-service');
      expect(result.valid).toBe(true);
    });
    
    it('accepts 6+ months for regular packages', () => {
      const result = BookingLogic.validatePetAge('6 months', 'full-package');
      expect(result.valid).toBe(true);
    });
    
    it('rejects under 6 months for regular packages', () => {
      const result = BookingLogic.validatePetAge('3 months', 'full-package');
      expect(result.valid).toBe(false);
    });
    
    it('accepts years for regular packages', () => {
      const result = BookingLogic.validatePetAge('2 years', 'full-package');
      expect(result.valid).toBe(true);
    });
    
    it('rejects empty age', () => {
      const result = BookingLogic.validatePetAge('', 'full-package');
      expect(result.valid).toBe(false);
    });
  });
  
  // ============================================
  // Step Validation Tests
  // ============================================
  
  describe('validateStep', () => {
    it('validates step 1 requires pet type', () => {
      const state = { petType: null };
      const result = BookingLogic.validateStep(1, state);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('passes step 1 with pet type', () => {
      const state = { petType: 'dog' };
      const result = BookingLogic.validateStep(1, state);
      expect(result.valid).toBe(true);
    });
    
    it('validates step 2 requires package', () => {
      const state = { packageId: null, singleServices: [] };
      const result = BookingLogic.validateStep(2, state);
      expect(result.valid).toBe(false);
    });
    
    it('passes step 2 with package', () => {
      const state = { packageId: 'full-package' };
      const result = BookingLogic.validateStep(2, state);
      expect(result.valid).toBe(true);
    });
    
    it('validates step 2 single-service requires services', () => {
      const state = { packageId: 'single-service', singleServices: [] };
      const result = BookingLogic.validateStep(2, state);
      expect(result.valid).toBe(false);
    });
    
    it('passes step 2 single-service with services', () => {
      const state = { packageId: 'single-service', singleServices: ['bath'] };
      const result = BookingLogic.validateStep(2, state);
      expect(result.valid).toBe(true);
    });
    
    it('validates step 3 requires date and time', () => {
      const state = { date: null, time: null };
      const result = BookingLogic.validateStep(3, state);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
    
    it('passes step 3 with date and time', () => {
      const state = { date: '2024-01-15', time: '10:00' };
      const result = BookingLogic.validateStep(3, state);
      expect(result.valid).toBe(true);
    });
    
    it('validates step 4 requires owner details', () => {
      const state = {
        ownerName: '',
        contactNumber: '',
        petName: '',
        vaccinationStatus: null
      };
      const result = BookingLogic.validateStep(4, state);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('passes step 4 with all required fields', () => {
      const state = {
        ownerName: 'John Doe',
        contactNumber: '09123456789',
        petName: 'Buddy',
        vaccinationStatus: 'vaccinated'
      };
      const result = BookingLogic.validateStep(4, state);
      expect(result.valid).toBe(true);
    });
    
    it('rejects step 4 with not-vaccinated status', () => {
      const state = {
        ownerName: 'John Doe',
        contactNumber: '09123456789',
        petName: 'Buddy',
        vaccinationStatus: 'not-vaccinated'
      };
      const result = BookingLogic.validateStep(4, state);
      expect(result.valid).toBe(false);
    });
  });
  
  // ============================================
  // Vaccination Status Validation Tests
  // ============================================
  
  describe('validateVaccinationStatus', () => {
    it('accepts vaccinated status', () => {
      const result = BookingLogic.validateVaccinationStatus('vaccinated');
      expect(result.valid).toBe(true);
    });
    
    it('rejects not-vaccinated status', () => {
      const result = BookingLogic.validateVaccinationStatus('not-vaccinated');
      expect(result.valid).toBe(false);
    });
    
    it('rejects invalid status', () => {
      const result = BookingLogic.validateVaccinationStatus('unknown');
      expect(result.valid).toBe(false);
    });
    
    it('rejects empty status', () => {
      const result = BookingLogic.validateVaccinationStatus('');
      expect(result.valid).toBe(false);
    });
  });
  
  // ============================================
  // Price Calculation Tests
  // ============================================
  
  describe('calculateTotalPrice', () => {
    const mockPackages = [
      {
        id: 'full-package',
        name: 'Full Package',
        tiers: [
          { label: '≤ 5kg', price: 500 },
          { label: '5.1-8kg', price: 600 },
          { label: '8-15kg', price: 700 }
        ]
      }
    ];
    
    const mockAddOns = [
      {
        id: 'toothbrush',
        name: 'Toothbrushing',
        type: 'addon',
        tiers: [
          { label: '≤ 5kg', price: 100 },
          { label: '5.1-8kg', price: 150 }
        ]
      }
    ];
    
    it('calculates price for package only', () => {
      const state = {
        packageId: 'full-package',
        petWeight: '≤ 5kg',
        addOns: [],
        singleServices: []
      };
      const pricing = BookingLogic.calculateTotalPrice(state, mockPackages, mockAddOns);
      expect(pricing.amountToPay).toBe(500);
      expect(pricing.packagePrice).toBe(500);
      expect(pricing.addOnsTotal).toBe(0);
    });
    
    it('calculates price with add-ons', () => {
      const state = {
        packageId: 'full-package',
        petWeight: '≤ 5kg',
        addOns: ['toothbrush'],
        singleServices: []
      };
      const pricing = BookingLogic.calculateTotalPrice(state, mockPackages, mockAddOns);
      expect(pricing.amountToPay).toBe(600); // 500 + 100
      expect(pricing.packagePrice).toBe(500);
      expect(pricing.addOnsTotal).toBe(100);
    });
    
    it('returns 0 for empty state', () => {
      const state = {
        packageId: null,
        petWeight: '',
        addOns: [],
        singleServices: []
      };
      const pricing = BookingLogic.calculateTotalPrice(state, mockPackages, mockAddOns);
      expect(pricing.amountToPay).toBe(0);
      expect(pricing.packagePrice).toBe(0);
    });
    
    it('handles different weight tiers', () => {
      const state = {
        packageId: 'full-package',
        petWeight: '8-15kg',
        addOns: [],
        singleServices: []
      };
      const pricing = BookingLogic.calculateTotalPrice(state, mockPackages, mockAddOns);
      expect(pricing.amountToPay).toBe(700);
      expect(pricing.packagePrice).toBe(700);
    });
    
    it('applies booking fee discount when bookingFeePaid is true', () => {
      const state = {
        packageId: 'full-package',
        petWeight: '≤ 5kg',
        addOns: [],
        singleServices: [],
        bookingFeePaid: true
      };
      const pricing = BookingLogic.calculateTotalPrice(state, mockPackages, mockAddOns);
      expect(pricing.bookingFeeDiscount).toBe(100);
      expect(pricing.hasBookingFeeDiscount).toBe(true);
      expect(pricing.amountToPay).toBe(400); // 500 - 100
    });
    
    it('shows ₱350 for weight "5kg & below" with standard package', () => {
      // This test verifies the pricing scenario from PRICING_UPDATE_SUMMARY.md
      // Scenario 1: Small Dog, Basic Package
      // Task: Select weight "≤ 5kg" → Price shows ₱350
      const standardPackages = [
        {
          id: 'shampoo-bath',
          name: 'Shampoo Bath \'n Bubble',
          tiers: [
            { label: '5kg & below', price: 350 },
            { label: '5.1 – 8kg', price: 450 },
            { label: '8.1 – 15kg', price: 550 },
            { label: '15.1 – 30kg', price: 600 },
            { label: '30kg & above', price: 700 }
          ]
        }
      ];
      
      const state = {
        packageId: 'shampoo-bath',
        petWeight: '5kg & below',
        addOns: [],
        singleServices: [],
        bookingFeePaid: false
      };
      
      const pricing = BookingLogic.calculateTotalPrice(state, standardPackages, []);
      expect(pricing.packagePrice).toBe(350);
      expect(pricing.amountToPay).toBe(350);
      expect(pricing.hasBookingFeeDiscount).toBe(false);
    });
  });
  
  // ============================================
  // Available Options Tests
  // ============================================
  
  describe('getAvailableAges', () => {
    it('returns all ages for single-service', () => {
      const ages = BookingLogic.getAvailableAges('single-service');
      expect(ages.length).toBeGreaterThan(20);
      expect(ages).toContain('Less than 1 month');
      expect(ages).toContain('3 months');
    });
    
    it('returns only 6+ months for regular packages', () => {
      const ages = BookingLogic.getAvailableAges('full-package');
      expect(ages).not.toContain('Less than 1 month');
      expect(ages).not.toContain('3 months');
      expect(ages).toContain('6 months');
      expect(ages).toContain('1 year');
    });
  });
  
  describe('getAvailableWeights', () => {
    it('returns standard weight tiers', () => {
      const weights = BookingLogic.getAvailableWeights('dog');
      expect(weights.length).toBe(5);
      expect(weights).toContain('≤ 5kg');
      expect(weights).toContain('≥ 30.1kg');
    });
  });
  
  describe('getFilteredPackages', () => {
    const mockPackages = [
      { id: 'pkg1', type: 'dog', name: 'Dog Package' },
      { id: 'pkg2', type: 'cat', name: 'Cat Package' },
      { id: 'pkg3', type: 'any', name: 'Any Package' },
      { id: 'addon1', type: 'addon', name: 'Add-on' }
    ];
    
    it('filters packages by pet type', () => {
      const filtered = BookingLogic.getFilteredPackages('dog', mockPackages);
      expect(filtered.length).toBe(2); // dog + any
      expect(filtered.map(p => p.id)).toContain('pkg1');
      expect(filtered.map(p => p.id)).toContain('pkg3');
    });
    
    it('excludes add-ons from packages', () => {
      const filtered = BookingLogic.getFilteredPackages('dog', mockPackages);
      expect(filtered.map(p => p.id)).not.toContain('addon1');
    });
    
    it('returns empty array for no pet type', () => {
      const filtered = BookingLogic.getFilteredPackages('', mockPackages);
      expect(filtered.length).toBe(0);
    });
  });
  
  // ============================================
  // State Transition Tests
  // ============================================
  
  describe('canProgressToStep', () => {
    it('allows progression when current step is valid', () => {
      const state = { petType: 'dog' };
      const result = BookingLogic.canProgressToStep(1, state);
      expect(result).toBe(true);
    });
    
    it('prevents progression when current step is invalid', () => {
      const state = { petType: null };
      const result = BookingLogic.canProgressToStep(1, state);
      expect(result).toBe(false);
    });
  });
  
  describe('getNextStep', () => {
    it('returns next step normally', () => {
      const state = { packageId: null };
      const next = BookingLogic.getNextStep(1, state);
      expect(next).toBe(2);
    });
    
    it('skips to step 3 if packageId already set on step 1', () => {
      const state = { packageId: 'full-package' };
      const next = BookingLogic.getNextStep(1, state);
      expect(next).toBe(3);
    });
    
    it('does not go past step 4', () => {
      const state = {};
      const next = BookingLogic.getNextStep(4, state);
      expect(next).toBe(4);
    });
  });
  
  describe('getPreviousStep', () => {
    it('returns previous step', () => {
      const prev = BookingLogic.getPreviousStep(3);
      expect(prev).toBe(2);
    });
    
    it('does not go below step 1', () => {
      const prev = BookingLogic.getPreviousStep(1);
      expect(prev).toBe(1);
    });
  });
  
  describe('isValidStep', () => {
    it('accepts steps 1-4', () => {
      expect(BookingLogic.isValidStep(1)).toBe(true);
      expect(BookingLogic.isValidStep(2)).toBe(true);
      expect(BookingLogic.isValidStep(3)).toBe(true);
      expect(BookingLogic.isValidStep(4)).toBe(true);
    });
    
    it('rejects invalid steps', () => {
      expect(BookingLogic.isValidStep(0)).toBe(false);
      expect(BookingLogic.isValidStep(5)).toBe(false);
      expect(BookingLogic.isValidStep(-1)).toBe(false);
    });
  });
  
  // ============================================
  // Helper Function Tests
  // ============================================
  
  describe('getAgeInMonths', () => {
    it('converts month strings to months', () => {
      expect(BookingLogic.getAgeInMonths('3 months')).toBe(3);
      expect(BookingLogic.getAgeInMonths('6 months')).toBe(6);
    });
    
    it('converts year strings to months', () => {
      expect(BookingLogic.getAgeInMonths('1 year')).toBe(12);
      expect(BookingLogic.getAgeInMonths('2 years')).toBe(24);
    });
    
    it('handles "less than" strings', () => {
      expect(BookingLogic.getAgeInMonths('Less than 1 month')).toBe(0);
    });
    
    it('returns 999 for invalid strings', () => {
      expect(BookingLogic.getAgeInMonths('invalid')).toBe(999);
      expect(BookingLogic.getAgeInMonths('')).toBe(999);
    });
  });
  
  describe('isValidPetType', () => {
    it('accepts valid pet types', () => {
      expect(BookingLogic.isValidPetType('dog')).toBe(true);
      expect(BookingLogic.isValidPetType('cat')).toBe(true);
    });
    
    it('rejects invalid pet types', () => {
      expect(BookingLogic.isValidPetType('bird')).toBe(false);
      expect(BookingLogic.isValidPetType('')).toBe(false);
    });
  });
  
  describe('formatPrice', () => {
    it('formats prices correctly', () => {
      expect(BookingLogic.formatPrice(500)).toBe('₱500.00');
      expect(BookingLogic.formatPrice(1500)).toBe('₱1,500.00');
      expect(BookingLogic.formatPrice(10000)).toBe('₱10,000.00');
    });
    
    it('handles invalid prices', () => {
      expect(BookingLogic.formatPrice(null)).toBe('₱0.00');
      expect(BookingLogic.formatPrice(undefined)).toBe('₱0.00');
      expect(BookingLogic.formatPrice('invalid')).toBe('₱0.00');
    });
  });
  
  // ============================================
  // Property: Business Logic Independence
  // ============================================
  
  describe('Property 5: Business Logic Independence', () => {
    it('all functions execute without DOM access', () => {
      // This test verifies that functions don't throw errors
      // when DOM is not available (Node.js environment)
      
      expect(() => {
        BookingLogic.validatePhoneNumber('09123456789');
        BookingLogic.validatePetAge('6 months', 'full-package');
        BookingLogic.validateStep(1, { petType: 'dog' });
        BookingLogic.calculateTotalPrice({}, [], []);
        BookingLogic.getAvailableAges('full-package');
        BookingLogic.getAvailableWeights('dog');
        BookingLogic.getFilteredPackages('dog', []);
        BookingLogic.canProgressToStep(1, { petType: 'dog' });
        BookingLogic.getNextStep(1, {});
        BookingLogic.getAgeInMonths('6 months');
        BookingLogic.isValidPetType('dog');
        BookingLogic.formatPrice(500);
      }).not.toThrow();
    });
  });
  
  // ============================================
  // Property: Validation Consistency
  // ============================================
  
  describe('Property 9: Validation Consistency', () => {
    it('validation produces consistent results for same input', () => {
      const phone = '09123456789';
      const result1 = BookingLogic.validatePhoneNumber(phone);
      const result2 = BookingLogic.validatePhoneNumber(phone);
      
      expect(result1.valid).toBe(result2.valid);
      expect(result1.error).toBe(result2.error);
    });
    
    it('validation rules are consistent across calls', () => {
      const state = { petType: null };
      const result1 = BookingLogic.validateStep(1, state);
      const result2 = BookingLogic.validateStep(1, state);
      
      expect(result1.valid).toBe(result2.valid);
      expect(result1.errors).toEqual(result2.errors);
    });
  });
  
  // ============================================
  // Integration Test: Weight Selection Pricing
  // ============================================
  
  describe('Integration: Weight Selection Pricing', () => {
    it('calculates correct price for weight "5kg & below" (₱350)', () => {
      // Task: Select weight "≤ 5kg" → Price shows ₱350
      // This integration test verifies the complete pricing flow
      
      // Setup: Real package data from main.js
      const realPackages = [
        {
          id: 'shampoo-bath',
          name: 'Shampoo Bath \'n Bubble',
          duration: 60,
          includes: ['Bath', 'Dry', 'Cut'],
          tiers: [
            { label: '5kg & below', price: 350 },
            { label: '5.1 – 8kg', price: 450 },
            { label: '8.1 – 15kg', price: 550 },
            { label: '15.1 – 30kg', price: 600 },
            { label: '30kg & above', price: 700 }
          ]
        }
      ];
      
      // Scenario: Customer selects small dog package with weight "5kg & below"
      const bookingState = {
        petType: 'dog',
        petName: 'Buddy',
        packageId: 'shampoo-bath',
        petWeight: '5kg & below',
        addOns: [],
        singleServices: [],
        bookingFeePaid: false
      };
      
      // Calculate pricing
      const pricing = BookingLogic.calculateTotalPrice(bookingState, realPackages, []);
      
      // Verify: Price should be ₱350
      expect(pricing.packagePrice).toBe(350);
      expect(pricing.addOnsTotal).toBe(0);
      expect(pricing.subtotal).toBe(350);
      expect(pricing.bookingFeeDiscount).toBe(0);
      expect(pricing.totalAmount).toBe(350);
      expect(pricing.amountToPay).toBe(350);
      expect(pricing.hasBookingFeeDiscount).toBe(false);
    });
    
    it('calculates correct price for weight "15.1 – 30kg" (₱600)', () => {
      // Verify pricing for larger dogs
      const realPackages = [
        {
          id: 'shampoo-bath',
          name: 'Shampoo Bath \'n Bubble',
          tiers: [
            { label: '5kg & below', price: 350 },
            { label: '5.1 – 8kg', price: 450 },
            { label: '8.1 – 15kg', price: 550 },
            { label: '15.1 – 30kg', price: 600 },
            { label: '30kg & above', price: 700 }
          ]
        }
      ];
      
      const bookingState = {
        packageId: 'shampoo-bath',
        petWeight: '15.1 – 30kg',
        addOns: [],
        singleServices: []
      };
      
      const pricing = BookingLogic.calculateTotalPrice(bookingState, realPackages, []);
      expect(pricing.packagePrice).toBe(600);
      expect(pricing.amountToPay).toBe(600);
    });
    
    it('calculates correct price for weight "30kg & above" (₱700)', () => {
      // Verify pricing for extra large dogs
      const realPackages = [
        {
          id: 'shampoo-bath',
          name: 'Shampoo Bath \'n Bubble',
          tiers: [
            { label: '5kg & below', price: 350 },
            { label: '5.1 – 8kg', price: 450 },
            { label: '8.1 – 15kg', price: 550 },
            { label: '15.1 – 30kg', price: 600 },
            { label: '30kg & above', price: 700 }
          ]
        }
      ];
      
      const bookingState = {
        packageId: 'shampoo-bath',
        petWeight: '30kg & above',
        addOns: [],
        singleServices: []
      };
      
      const pricing = BookingLogic.calculateTotalPrice(bookingState, realPackages, []);
      expect(pricing.packagePrice).toBe(700);
      expect(pricing.amountToPay).toBe(700);
    });
  });
});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BookingLogic };
}
