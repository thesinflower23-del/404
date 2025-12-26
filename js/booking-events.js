/**
 * Booking Event System Module
 * 
 * Connects DOM events to state updates.
 * Validates input before state changes.
 * Triggers side effects (load packages, render UI, etc.).
 * 
 * Features:
 * - Event handler decoupling (no inline onclick)
 * - Input validation before state update
 * - Automatic UI re-rendering on state change
 * - Side effect management
 * - Error handling and user feedback
 */

// ============================================
// Pet Type Selection
// ============================================

/**
 * Setup pet type selection event listeners
 * 
 * @param {BookingStateManager} stateManager - State manager instance
 * @param {Function} onStateChange - Callback when state changes
 */
function setupPetTypeSelection(stateManager, onStateChange) {
  const petCards = document.querySelectorAll('.pet-type-card');
  
  petCards.forEach(card => {
    card.addEventListener('click', function () {
      const petType = this.dataset.petType;
      handlePetTypeClick(petType, stateManager, onStateChange);
    });
    
    // Keyboard support
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const petType = this.dataset.petType;
        handlePetTypeClick(petType, stateManager, onStateChange);
      }
    });
  });
}

/**
 * Handle pet type selection
 * 
 * @param {string} petType - Selected pet type
 * @param {BookingStateManager} stateManager - State manager
 * @param {Function} onStateChange - Callback
 */
function handlePetTypeClick(petType, stateManager, onStateChange) {
  if (!petType) return;
  
  // Update visual selection
  document.querySelectorAll('.pet-type-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  const selectedCard = document.querySelector(`[data-pet-type="${petType}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }
  
  // Update state
  stateManager.setState({
    petType,
    packageId: null  // Clear package when type changes
  });
  
  // Trigger side effects
  if (typeof loadPackages === 'function') {
    loadPackages();
  }
  if (typeof renderSingleServiceConfigurator === 'function') {
    renderSingleServiceConfigurator();
  }
  
  // Update grooming cuts for selected pet type
  if (typeof updateGroomingCutsForPetType === 'function') {
    updateGroomingCutsForPetType(petType);
  }
  
  // Dispatch custom event for grooming cuts system
  window.dispatchEvent(new CustomEvent('petTypeSelected', {
    detail: { petType }
  }));
  
  // Notify callback
  if (onStateChange) {
    onStateChange(stateManager.getState());
  }
}

// ============================================
// Package Selection
// ============================================

/**
 * Setup package selection event listeners
 * 
 * @param {BookingStateManager} stateManager - State manager instance
 * @param {Function} onStateChange - Callback when state changes
 */
function setupPackageSelection(stateManager, onStateChange) {
  const packageCards = document.querySelectorAll('.package-card');
  
  packageCards.forEach(card => {
    card.addEventListener('click', function () {
      const packageId = this.dataset.packageId;
      handlePackageClick(packageId, stateManager, onStateChange);
    });
    
    // Keyboard support
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const packageId = this.dataset.packageId;
        handlePackageClick(packageId, stateManager, onStateChange);
      }
    });
  });
}

/**
 * Handle package selection
 * 
 * @param {string} packageId - Selected package ID
 * @param {BookingStateManager} stateManager - State manager
 * @param {Function} onStateChange - Callback
 */
function handlePackageClick(packageId, stateManager, onStateChange) {
  if (!packageId) return;
  
  // Update state
  stateManager.setState({
    packageId
  });
  
  // Trigger side effects
  if (typeof updateSummary === 'function') {
    updateSummary();
  }
  if (typeof enableNextButton === 'function') {
    enableNextButton();
  }
  if (typeof updateSingleServicePriceLabels === 'function') {
    updateSingleServicePriceLabels();
  }
  
  // Notify callback
  if (onStateChange) {
    onStateChange(stateManager.getState());
  }
}

// ============================================
// Form Input Handling
// ============================================

/**
 * Setup form input event listeners
 * 
 * @param {BookingStateManager} stateManager - State manager instance
 * @param {Function} onStateChange - Callback when state changes
 */
function setupFormInputs(stateManager, onStateChange) {
  // Text inputs
  const textInputs = [
    'ownerName',
    'ownerAddress',
    'petName',
    'petBreed'
  ];
  
  textInputs.forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (input) {
      input.addEventListener('input', function () {
        handleFormInput(fieldId, this.value, stateManager, onStateChange);
      });
    }
  });
  
  // Contact number with validation
  const contactInput = document.getElementById('contactNumber');
  if (contactInput) {
    contactInput.addEventListener('input', function () {
      handlePhoneInput(this.value, stateManager, onStateChange);
    });
  }
  
  // Pet age dropdown
  const petAgeSelect = document.getElementById('petAge');
  if (petAgeSelect) {
    petAgeSelect.addEventListener('change', function () {
      handleFormInput('petAge', this.value, stateManager, onStateChange);
    });
  }
  
  // Weight radio buttons
  document.querySelectorAll('input[name="petWeight"]').forEach(radio => {
    radio.addEventListener('change', function () {
      if (this.checked) {
        handleFormInput('petWeight', this.value, stateManager, onStateChange);
      }
    });
  });
  
  // Vaccination status
  document.querySelectorAll('input[name="vaccinationStatus"]').forEach(radio => {
    radio.addEventListener('change', function () {
      if (this.checked) {
        handleFormInput('vaccinationStatus', this.value, stateManager, onStateChange);
      }
    });
  });
  
  // Text areas
  const textAreas = [
    'medicalNotes',
    'vaccinationNotes',
    'bookingNotes'
  ];
  
  textAreas.forEach(fieldId => {
    const textarea = document.getElementById(fieldId);
    if (textarea) {
      textarea.addEventListener('input', function () {
        handleFormInput(fieldId, this.value, stateManager, onStateChange);
      });
    }
  });
  
  // Save profile toggle
  const saveProfileToggle = document.getElementById('saveProfileToggle');
  if (saveProfileToggle) {
    saveProfileToggle.addEventListener('change', function () {
      stateManager.setState({
        saveProfile: this.checked
      });
      if (onStateChange) {
        onStateChange(stateManager.getState());
      }
    });
  }
}

/**
 * Handle form input change
 * 
 * @param {string} fieldName - Field name
 * @param {string} value - Input value
 * @param {BookingStateManager} stateManager - State manager
 * @param {Function} onStateChange - Callback
 */
function handleFormInput(fieldName, value, stateManager, onStateChange) {
  // Update state
  stateManager.setState({
    [fieldName]: value.trim()
  });
  
  // Trigger side effects - use debounced update for text inputs to prevent flickering
  const textInputFields = ['ownerName', 'ownerAddress', 'petName', 'petBreed', 'medicalNotes', 'vaccinationNotes', 'bookingNotes'];
  if (textInputFields.includes(fieldName)) {
    // Use debounced update for text inputs to prevent flickering during typing
    if (typeof debouncedUpdateSummary === 'function') {
      debouncedUpdateSummary();
    } else if (typeof updateSummary === 'function') {
      updateSummary();
    }
  } else {
    // Use immediate update for dropdowns and other non-text inputs
    if (typeof updateSummary === 'function') {
      updateSummary();
    }
  }
  
  if (typeof enableNextButton === 'function') {
    enableNextButton();
  }
  
  // Notify callback
  if (onStateChange) {
    onStateChange(stateManager.getState());
  }
}

/**
 * Handle phone number input with validation
 * 
 * @param {string} value - Phone number value
 * @param {BookingStateManager} stateManager - State manager
 * @param {Function} onStateChange - Callback
 */
function handlePhoneInput(value, stateManager, onStateChange) {
  const contactInput = document.getElementById('contactNumber');
  if (!contactInput) return;
  
  // Validate phone number
  const validation = BookingLogic.validatePhoneNumber(value);
  
  if (validation.valid) {
    contactInput.setCustomValidity('');
    stateManager.setState({
      contactNumber: value.trim()
    });
  } else {
    contactInput.setCustomValidity(validation.error || 'Invalid phone number');
  }
  
  // Trigger side effects - use debounced update for phone input to prevent flickering
  if (typeof debouncedUpdateSummary === 'function') {
    debouncedUpdateSummary();
  } else if (typeof updateSummary === 'function') {
    updateSummary();
  }
  
  if (typeof enableNextButton === 'function') {
    enableNextButton();
  }
  
  // Notify callback
  if (onStateChange) {
    onStateChange(stateManager.getState());
  }
}

// ============================================
// Navigation Buttons
// ============================================

/**
 * Setup navigation button event listeners
 * 
 * @param {BookingStateManager} stateManager - State manager instance
 * @param {Function} onNext - Callback for next button
 * @param {Function} onPrev - Callback for prev button
 */
function setupNavigationButtons(stateManager, onNext, onPrev) {
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  
  if (nextBtn) {
    nextBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (onNext) {
        onNext();
      }
    });
  }
  
  if (prevBtn) {
    prevBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (onPrev) {
        onPrev();
      }
    });
  }
}

/**
 * Handle next step navigation
 * 
 * @param {BookingStateManager} stateManager - State manager
 * @param {Function} onStepChange - Callback when step changes
 */
function handleNextStep(stateManager, onStepChange) {
  const state = stateManager.getState();
  const currentStep = state.currentStep;
  
  // Validate current step
  const validation = BookingLogic.validateStep(currentStep, state);
  if (!validation.valid) {
    if (typeof customAlert !== 'undefined' && customAlert.warning) {
      customAlert.warning('Missing Information', validation.errors[0]);
    }
    return;
  }
  
  // Get next step
  const nextStep = BookingLogic.getNextStep(currentStep, state);
  
  // Update state
  stateManager.setState({
    currentStep: nextStep
  });
  
  // Notify callback
  if (onStepChange) {
    onStepChange(nextStep);
  }
}

/**
 * Handle previous step navigation
 * 
 * @param {BookingStateManager} stateManager - State manager
 * @param {Function} onStepChange - Callback when step changes
 */
function handlePreviousStep(stateManager, onStepChange) {
  const state = stateManager.getState();
  const currentStep = state.currentStep;
  
  // Get previous step
  const prevStep = BookingLogic.getPreviousStep(currentStep);
  
  // Update state
  stateManager.setState({
    currentStep: prevStep
  });
  
  // Notify callback
  if (onStepChange) {
    onStepChange(prevStep);
  }
}

// ============================================
// Booking Submission
// ============================================

/**
 * Setup booking submission handler
 * 
 * @param {BookingStateManager} stateManager - State manager instance
 * @param {Function} onSubmit - Callback for submission
 */
function setupBookingSubmission(stateManager, onSubmit) {
  const submitBtn = document.getElementById('submitBooking');
  
  if (submitBtn) {
    submitBtn.addEventListener('click', function (e) {
      e.preventDefault();
      handleBookingSubmit(stateManager, onSubmit);
    });
  }
}

/**
 * Handle booking submission
 * 
 * @param {BookingStateManager} stateManager - State manager
 * @param {Function} onSubmit - Callback
 */
function handleBookingSubmit(stateManager, onSubmit) {
  const state = stateManager.getState();
  
  // Validate submission
  const validation = stateManager.validateForSubmission();
  if (!validation.valid) {
    if (typeof customAlert !== 'undefined' && customAlert.warning) {
      customAlert.warning('Missing Information', validation.errors[0]);
    }
    return;
  }
  
  // Call submission handler
  if (onSubmit) {
    onSubmit(state);
  }
}

// ============================================
// Setup All Events
// ============================================

/**
 * Setup all event listeners for booking flow
 * 
 * @param {BookingStateManager} stateManager - State manager instance
 * @param {Object} callbacks - Callback functions
 */
function setupAllBookingEvents(stateManager, callbacks = {}) {
  const {
    onStateChange,
    onNext,
    onPrev,
    onStepChange,
    onSubmit
  } = callbacks;
  
  // Setup all event listeners
  setupPetTypeSelection(stateManager, onStateChange);
  setupPackageSelection(stateManager, onStateChange);
  setupFormInputs(stateManager, onStateChange);
  setupNavigationButtons(
    stateManager,
    () => handleNextStep(stateManager, onStepChange),
    () => handlePreviousStep(stateManager, onStepChange)
  );
  setupBookingSubmission(stateManager, onSubmit);
}

// ============================================
// Exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setupPetTypeSelection,
    handlePetTypeClick,
    setupPackageSelection,
    handlePackageClick,
    setupFormInputs,
    handleFormInput,
    handlePhoneInput,
    setupNavigationButtons,
    handleNextStep,
    handlePreviousStep,
    setupBookingSubmission,
    handleBookingSubmit,
    setupAllBookingEvents
  };
}

// Make globally available
window.BookingEvents = {
  setupPetTypeSelection,
  handlePetTypeClick,
  setupPackageSelection,
  handlePackageClick,
  setupFormInputs,
  handleFormInput,
  handlePhoneInput,
  setupNavigationButtons,
  handleNextStep,
  handlePreviousStep,
  setupBookingSubmission,
  handleBookingSubmit,
  setupAllBookingEvents
};
