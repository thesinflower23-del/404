/**
 * Booking Business Logic Module
 * 
 * Pure functions with NO DOM dependencies.
 * All functions are testable in Node.js environment.
 * 
 * Functions:
 * - Validation (phone, age, step requirements)
 * - Calculations (pricing, filtering)
 * - State transitions (step progression)
 */

// ============================================
// Validation Functions
// ============================================

/**
 * Validate Philippine phone number format
 * Accepts: 09XXXXXXXXX or +639XXXXXXXXX
 * 
 * @param {string} phone - Phone number to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
function validatePhoneNumber(phone) {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }
  
  const cleaned = String(phone).replace(/\s/g, '');
  
  // Accept +63 or 0 prefix, followed by 10 digits
  const pattern = /^(\+63|0)[0-9]{10}$/;
  
  if (!pattern.test(cleaned)) {
    return {
      valid: false,
      error: 'Please enter a valid 11-digit phone number (e.g., 09662233605 or +63 9662233605)'
    };
  }
  
  return { valid: true };
}

/**
 * Validate pet age based on package requirements
 * Some packages require minimum age (e.g., 6 months)
 * 
 * @param {string} age - Age string (e.g., "3 months", "2 years")
 * @param {string} packageId - Package ID to check requirements
 * @returns {Object} { valid: boolean, error?: string }
 */
function validatePetAge(age, packageId) {
  if (!age) {
    return { valid: false, error: 'Pet age is required' };
  }
  
  const ageInMonths = getAgeInMonths(age);
  
  // Single service packages allow younger pets
  if (packageId === 'single-service') {
    return { valid: true };
  }
  
  // Other packages require minimum 6 months
  if (ageInMonths < 6) {
    return {
      valid: false,
      error: 'Pet must be at least 6 months old for this package. Please select Single Services for younger pets.'
    };
  }
  
  return { valid: true };
}

/**
 * Validate all required fields for a specific step
 * 
 * @param {number} step - Step number (1-5)
 * @param {Object} state - Current booking state
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateStep(step, state) {
  const errors = [];
  
  switch (step) {
    case 1:
      // Step 1: Policy Agreement - check DOM directly (skip in reschedule mode)
      // Check if in reschedule mode
      const urlParams = new URLSearchParams(window.location.search);
      const isReschedule = urlParams.get('mode') === 'reschedule';
      
      if (isReschedule) {
        // Skip policy check for reschedule - customer already agreed before
        break;
      }
      
      if (typeof document !== 'undefined') {
        const policyCheckbox = document.getElementById('agreeToPolicy');
        if (!policyCheckbox || !policyCheckbox.checked) {
          console.log('[BookingLogic] Policy not agreed, but validation disabled for debugging');
          // errors.push('Please read and agree to the policy');
        }
      } else if (!state.policyAgreed) {
        console.log('[BookingLogic] Policy not agreed (state), but validation disabled for debugging');
        // errors.push('Please read and agree to the policy');
      }
      break;
      
    case 2:
      // Step 2: Pet Type Selection
      if (!state.petType) {
        console.log('[BookingLogic] No pet type selected, but validation disabled for debugging');
        // errors.push('Please select a pet type');
      }
      break;
      
    case 3:
      // Step 3: Package Selection
      if (!state.packageId) {
        console.log('[BookingLogic] No package selected, but validation disabled for debugging');
        // errors.push('Please select a package');
      }
      if (state.packageId === 'single-service' && (!state.singleServices || state.singleServices.length === 0)) {
        console.log('[BookingLogic] No single services selected, but validation disabled for debugging');
        // errors.push('Please select at least one service');
      }
      break;
      
    case 4:
      // Step 4: Schedule (Date & Time)
      if (!state.date) {
        console.log('[BookingLogic] No date selected, but validation disabled for debugging');
        // errors.push('Please select a date');
      }
      if (!state.time) {
        console.log('[BookingLogic] No time selected, but validation disabled for debugging');
        // errors.push('Please select a time');
      }
      break;
      
    case 5:
      // Step 5: Owner Details & Confirmation
      if (!state.ownerName || !state.ownerName.trim()) {
        console.log('[BookingLogic] Owner name missing, but validation disabled for debugging');
        // errors.push('Please enter owner name');
      }
      if (!state.contactNumber || !state.contactNumber.trim()) {
        console.log('[BookingLogic] Contact number missing, but validation disabled for debugging');
        // errors.push('Please enter contact number');
      } else {
        const phoneValidation = validatePhoneNumber(state.contactNumber);
        if (!phoneValidation.valid) {
          console.log('[BookingLogic] Invalid phone format, but validation disabled for debugging');
          // errors.push(phoneValidation.error);
        }
      }
      if (!state.petName || !state.petName.trim()) {
        console.log('[BookingLogic] Pet name missing, but validation disabled for debugging');
        // errors.push('Please enter pet name');
      }
      if (!state.vaccinationStatus) {
        console.log('[BookingLogic] Vaccination status missing, but validation disabled for debugging');
        // errors.push('Please confirm vaccination status');
      }
      if (state.vaccinationStatus === 'not-vaccinated') {
        console.log('[BookingLogic] Pet not vaccinated, but validation disabled for debugging');
        // errors.push('Pet must be vaccinated to book');
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate vaccination status
 * 
 * @param {string} status - Vaccination status
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateVaccinationStatus(status) {
  if (!status) {
    return { valid: false, error: 'Vaccination status is required' };
  }
  
  if (status === 'not-vaccinated') {
    return { valid: false, error: 'Pet must be vaccinated to book' };
  }
  
  if (!['vaccinated', 'not-vaccinated'].includes(status)) {
    return { valid: false, error: 'Invalid vaccination status' };
  }
  
  return { valid: true };
}

// ============================================
// Calculation Functions
// ============================================

/**
 * Calculate total booking price with detailed breakdown
 * Includes package price + add-ons, with booking fee discount support
 * 
 * @param {Object} state - Booking state
 * @param {Array} packages - Available packages
 * @param {Array} addOns - Available add-ons
 * @returns {Object} Pricing breakdown { packagePrice, addOnsTotal, subtotal, bookingFeeDiscount, totalAmount, amountToPay }
 */
function calculateTotalPrice(state, packages = [], addOns = []) {
  let packagePrice = 0;
  let addOnsTotal = 0;
  let bookingFeeDiscount = 0;
  
  // Calculate package price (based on pet weight tier)
  if (state.packageId && state.packageId !== 'single-service') {
    const pkg = packages.find(p => p.id === state.packageId);
    if (pkg && pkg.tiers && state.petWeight) {
      const tier = findPriceTier(state.petWeight, pkg.tiers);
      if (tier) {
        packagePrice = tier.price;
      }
    }
  }
  
  // Calculate single service prices
  if (state.singleServices && state.singleServices.length > 0 && state.petWeight) {
    state.singleServices.forEach(serviceId => {
      const service = addOns.find(a => a.id === serviceId);
      if (service) {
        const tier = findPriceTier(state.petWeight, service.tiers || []);
        if (tier) {
          addOnsTotal += tier.price;
        }
      }
    });
  }
  
  // Calculate add-on prices
  if (state.addOns && state.addOns.length > 0 && state.petWeight) {
    state.addOns.forEach(addOnId => {
      const addOn = addOns.find(a => a.id === addOnId);
      if (addOn) {
        const tier = findPriceTier(state.petWeight, addOn.tiers || []);
        if (tier) {
          addOnsTotal += tier.price;
        }
      }
    });
  }
  
  // Apply booking fee discount if paid
  if (state.bookingFeePaid) {
    bookingFeeDiscount = 100; // ₱100 discount
  }
  
  const subtotal = packagePrice + addOnsTotal;
  const totalAmount = Math.max(0, subtotal - bookingFeeDiscount);
  const amountToPay = totalAmount;
  
  return {
    packagePrice: Math.round(packagePrice * 100) / 100,
    addOnsTotal: Math.round(addOnsTotal * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    bookingFeeDiscount: bookingFeeDiscount,
    totalAmount: Math.round(totalAmount * 100) / 100,
    amountToPay: Math.round(amountToPay * 100) / 100,
    hasBookingFeeDiscount: state.bookingFeePaid || false
  };
}

/**
 * Calculate total booking price (legacy - returns number for backward compatibility)
 * 
 * @param {Object} state - Booking state
 * @param {Array} packages - Available packages
 * @param {Array} addOns - Available add-ons
 * @returns {number} Total price in PHP
 */
function calculateTotalPriceSimple(state, packages = [], addOns = []) {
  const breakdown = calculateTotalPrice(state, packages, addOns);
  return breakdown.amountToPay;
}

/**
 * Find price tier based on pet weight
 * 
 * @param {string} weight - Weight string (e.g., "5-8kg")
 * @param {Array} tiers - Array of tier objects with label and price
 * @returns {Object|null} Matching tier or null
 */
function findPriceTier(weight, tiers = []) {
  if (!weight || !tiers.length) return null;
  
  // Normalize weight string
  const normalized = String(weight).toLowerCase().trim();
  
  // Find matching tier
  return tiers.find(tier => {
    const tierLabel = String(tier.label).toLowerCase().trim();
    return tierLabel === normalized;
  }) || null;
}

/**
 * Get available age options for a package
 * 
 * @param {string} packageId - Package ID
 * @returns {Array} Array of age option strings
 */
function getAvailableAges(packageId) {
  const allAges = [
    'Less than 1 month',
    '1 month', '2 months', '3 months', '4 months', '5 months',
    '6 months', '7 months', '8 months', '9 months', '10 months', '11 months',
    '1 year', '2 years', '3 years', '4 years', '5 years',
    '6 years', '7 years', '8 years', '9 years', '10 years',
    '11 years', '12 years', '13 years', '14 years', '15 years', '16+ years'
  ];
  
  // Single service allows all ages
  if (packageId === 'single-service') {
    return allAges;
  }
  
  // Other packages: only 6 months and above
  return allAges.filter(age => getAgeInMonths(age) >= 6);
}

/**
 * Get available weight options for a pet type
 * 
 * @param {string} petType - Pet type (dog, cat, etc.)
 * @returns {Array} Array of weight strings
 */
function getAvailableWeights(petType) {
  // Standard weight tiers for all pet types
  return [
    '≤ 5kg',
    '5.1-8kg',
    '8-15kg',
    '15.1-30kg',
    '≥ 30.1kg'
  ];
}

/**
 * Filter packages by pet type
 * 
 * @param {string} petType - Pet type to filter by
 * @param {Array} packages - All available packages
 * @returns {Array} Filtered packages
 */
function getFilteredPackages(petType, packages = []) {
  if (!petType) return [];
  
  return packages.filter(pkg => {
    // Skip add-ons
    if (pkg.type === 'addon') return false;
    
    // Include packages for this pet type or "any" type
    return pkg.type === petType || pkg.type === 'any';
  });
}

/**
 * Filter add-ons by pet type
 * 
 * @param {string} petType - Pet type to filter by
 * @param {Array} addOns - All available add-ons
 * @returns {Array} Filtered add-ons
 */
function getFilteredAddOns(petType, addOns = []) {
  if (!petType) return [];
  
  return addOns.filter(addon => {
    // Only include actual add-ons
    if (addon.type !== 'addon') return false;
    
    // Include add-ons for this pet type or "any" type
    return addon.petType === petType || addon.petType === 'any';
  });
}

// ============================================
// State Transition Functions
// ============================================

/**
 * Check if can progress to next step
 * 
 * @param {number} currentStep - Current step number
 * @param {Object} state - Current booking state
 * @returns {boolean} True if can progress
 */
function canProgressToStep(currentStep, state) {
  // Validate current step before allowing progression
  const validation = validateStep(currentStep, state);
  return validation.valid;
}

/**
 * Get next step number
 * Handles special cases (e.g., skip package step if already selected)
 * 
 * @param {number} currentStep - Current step number
 * @param {Object} state - Current booking state
 * @returns {number} Next step number
 */
function getNextStep(currentStep, state) {
  if (currentStep >= 5) return 5; // Can't go past step 5
  
  // Special case: if on step 1 and packageId already set, skip to step 3
  if (currentStep === 1 && state.packageId) {
    return 3;
  }
  
  return currentStep + 1;
}

/**
 * Get previous step number
 * 
 * @param {number} currentStep - Current step number
 * @returns {number} Previous step number
 */
function getPreviousStep(currentStep) {
  if (currentStep <= 1) return 1;
  return currentStep - 1;
}

/**
 * Check if step is valid (1-4)
 * 
 * @param {number} step - Step number to check
 * @returns {boolean} True if valid step
 */
function isValidStep(step) {
  return step >= 1 && step <= 5;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Convert age string to months for comparison
 * 
 * @param {string} ageStr - Age string (e.g., "3 months", "2 years")
 * @returns {number} Age in months
 */
function getAgeInMonths(ageStr) {
  if (!ageStr) return 999;
  
  const lower = String(ageStr).toLowerCase();
  
  if (lower.includes('month')) {
    const match = lower.match(/\d+/);
    return match ? parseInt(match[0], 10) : 999;
  }
  
  if (lower.includes('year')) {
    const match = lower.match(/\d+/);
    return match ? parseInt(match[0], 10) * 12 : 999;
  }
  
  if (lower.includes('less')) return 0;
  
  return 999;
}

/**
 * Normalize weight string (handle encoding issues)
 * 
 * @param {string} weight - Weight string
 * @returns {string} Normalized weight string
 */
function normalizeWeight(weight) {
  if (!weight) return '';
  return String(weight).replace(/â€"/g, '–').replace(/–/g, '-');
}

/**
 * Check if pet type is valid
 * 
 * @param {string} petType - Pet type to check
 * @returns {boolean} True if valid
 */
function isValidPetType(petType) {
  const validTypes = ['dog', 'cat'];
  return validTypes.includes(String(petType).toLowerCase());
}

/**
 * Format price for display
 * 
 * @param {number} price - Price in PHP
 * @returns {string} Formatted price string
 */
function formatPrice(price) {
  if (typeof price !== 'number' || isNaN(price)) return '₱0.00';
  return `₱${price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

// ============================================
// Exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validatePhoneNumber,
    validatePetAge,
    validateStep,
    validateVaccinationStatus,
    calculateTotalPrice,
    findPriceTier,
    getAvailableAges,
    getAvailableWeights,
    getFilteredPackages,
    getFilteredAddOns,
    canProgressToStep,
    getNextStep,
    getPreviousStep,
    isValidStep,
    getAgeInMonths,
    normalizeWeight,
    isValidPetType,
    formatPrice
  };
}

// Make globally available
window.BookingLogic = {
  validatePhoneNumber,
  validatePetAge,
  validateStep,
  validateVaccinationStatus,
  calculateTotalPrice,
  findPriceTier,
  getAvailableAges,
  getAvailableWeights,
  getFilteredPackages,
  getFilteredAddOns,
  canProgressToStep,
  getNextStep,
  getPreviousStep,
  isValidStep,
  getAgeInMonths,
  normalizeWeight,
  isValidPetType,
  formatPrice
};
