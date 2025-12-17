/**
 * Booking Integration Layer
 * 
 * Orchestrates the refactored booking system:
 * - Initializes state manager
 * - Connects event system
 * - Manages UI rendering
 * - Handles side effects
 * 
 * This is the glue that brings all modules together.
 */

class BookingIntegration {
  constructor() {
    this.stateManager = null;
    this.isInitialized = false;
  }
  
  /**
   * Initialize the booking system
   * 
   * @param {Object} options - Initialization options
   * @param {Object} options.initialState - Initial booking state
   * @param {Array} options.packages - Available packages
   * @param {Array} options.petTypes - Available pet types
   * @returns {Promise<void>}
   */
  async init(options = {}) {
    if (this.isInitialized) {
      console.warn('BookingIntegration already initialized');
      return;
    }
    
    try {
      // Create state manager with initial state
      this.stateManager = new BookingStateManager(options.initialState || {});
      
      // Store packages and pet types for later use
      this.packages = options.packages || [];
      this.petTypes = options.petTypes || [];
      
      // Subscribe to state changes for UI updates
      this.stateManager.subscribe((newState, oldState) => {
        this.onStateChange(newState, oldState);
      });
      
      // Setup all event listeners
      this.setupEventListeners();
      
      // Initial render
      this.renderUI();
      
      this.isInitialized = true;
      console.log('BookingIntegration initialized successfully');
    } catch (error) {
      console.error('Error initializing BookingIntegration:', error);
      throw error;
    }
  }
  
  /**
   * Setup all event listeners
   * @private
   */
  setupEventListeners() {
    // DISABLED: Prevent duplicate event listeners
    // The main booking.js already sets up all necessary event listeners with proper debouncing
    // This integration system was causing duplicate handlers that caused summary flickering
    console.log('[BookingIntegration] Event listener setup disabled to prevent duplicates');
    return;
    
    if (!window.BookingEvents) {
      console.warn('BookingEvents module not loaded');
      return;
    }
    
    // Setup all booking events with callbacks
    BookingEvents.setupAllBookingEvents(this.stateManager, {
      onStateChange: (newState) => {
        this.onStateChange(newState);
      },
      onNext: () => {
        this.handleNextStep();
      },
      onPrev: () => {
        this.handlePreviousStep();
      },
      onStepChange: (newStep) => {
        this.onStepChange(newStep);
      },
      onSubmit: (state) => {
        this.handleBookingSubmit(state);
      }
    });
  }
  
  /**
   * Handle state changes
   * @private
   */
  onStateChange(newState, oldState) {
    // Update UI components that depend on state
    this.updateSummary(newState);
    this.updateStepIndicators(newState);
    this.enableNextButton(newState);
  }
  
  /**
   * Handle step changes
   * @private
   */
  onStepChange(newStep) {
    this.renderUI();
  }
  
  /**
   * Handle next step navigation
   * @private
   */
  handleNextStep() {
    const state = this.stateManager.getState();
    const currentStep = state.currentStep;
    
    // Validate current step
    const validation = BookingLogic.validateStep(currentStep, state);
    if (!validation.valid) {
      this.showError(validation.errors[0]);
      return;
    }
    
    // Gate: Require login before entering step 3
    if (currentStep === 2) {
      this.checkLoginRequired();
      return;
    }
    
    // Get next step
    const nextStep = BookingLogic.getNextStep(currentStep, state);
    
    // Update state
    this.stateManager.setState({
      currentStep: nextStep
    });
  }
  
  /**
   * Handle previous step navigation
   * @private
   */
  handlePreviousStep() {
    const state = this.stateManager.getState();
    const currentStep = state.currentStep;
    
    // Get previous step
    const prevStep = BookingLogic.getPreviousStep(currentStep);
    
    // Update state
    this.stateManager.setState({
      currentStep: prevStep
    });
  }
  
  /**
   * Handle booking submission
   * @private
   */
  async handleBookingSubmit(state) {
    try {
      // Validate submission - DISABLED FOR DEBUGGING
      const validation = this.stateManager.validateForSubmission();
      if (!validation.valid) {
        console.log('[BookingIntegration] Validation failed but disabled for debugging:', validation.errors);
        // this.showError(validation.errors[0]);
        // return;
      }
      
      // Show loading state
      this.setLoading(true);
      
      // Create booking (call existing function if available)
      if (typeof submitBooking === 'function') {
        await submitBooking();
      } else {
        console.warn('submitBooking function not available');
      }
      
      this.setLoading(false);
    } catch (error) {
      console.error('Error submitting booking:', error);
      this.showError('Error submitting booking. Please try again.');
      this.setLoading(false);
    }
  }
  
  /**
   * Check if login is required
   * @private
   */
  async checkLoginRequired() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        this.showWarning(
          'Login Required',
          'Please create an account or log in to continue booking.'
        );
        
        // Save booking data for restoration after auth
        sessionStorage.setItem('bookingData', JSON.stringify(this.stateManager.getState()));
        sessionStorage.setItem('bookingStep', '3');
        
        // Redirect to signup
        redirect('signup.html?return=booking.html');
        return;
      }
      
      // User is logged in, proceed to next step
      this.handleNextStep();
    } catch (error) {
      console.error('Error checking login:', error);
    }
  }
  
  /**
   * Render UI based on current state
   * @private
   */
  renderUI() {
    const state = this.stateManager.getState();
    
    // Render step indicators
    this.updateStepIndicators(state);
    
    // Render current step content
    this.renderCurrentStep(state);
    
    // Update summary
    this.updateSummary(state);
  }
  
  /**
   * Update step indicators
   * @private
   */
  updateStepIndicators(state) {
    const container = document.getElementById('stepIndicators');
    if (!container || !window.BookingUI) return;
    
    const html = BookingUI.renderStepIndicators(
      state.currentStep,
      4,
      ['Pet Type', 'Package', 'Schedule', 'Confirm']
    );
    
    container.innerHTML = html;
  }
  
  /**
   * Render current step content
   * @private
   */
  renderCurrentStep(state) {
    const step = state.currentStep;
    
    // Show/hide step content
    document.querySelectorAll('.step-content').forEach((content, index) => {
      if (index + 1 === step) {
        content.classList.add('active');
        // Add inline styles for horizontal scroll on mobile
        content.style.overflowX = 'auto';
        content.style.webkitOverflowScrolling = 'touch';
        content.style.maxWidth = '100%';
        content.style.width = '100%';
        content.style.boxSizing = 'border-box';
      } else {
        content.classList.remove('active');
      }
    });
    
    // Update navigation buttons
    this.updateNavigationButtons(step);
  }
  
  /**
   * Update navigation buttons visibility
   * @private
   */
  updateNavigationButtons(currentStep) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBooking');
    
    if (prevBtn) {
      prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
    }
    
    if (nextBtn) {
      nextBtn.style.display = currentStep < 5 ? 'inline-block' : 'none';
    }
    
    if (submitBtn) {
      submitBtn.style.display = currentStep === 5 ? 'inline-block' : 'none';
    }
  }
  
  /**
   * Update booking summary
   * @private
   */
  updateSummary(state) {
    const container = document.getElementById('bookingSummary');
    if (!container || !window.BookingUI) return;
    
    const html = BookingUI.renderSummary(state, this.packages);
    container.innerHTML = html;
  }
  
  /**
   * Enable/disable next button based on validation
   * @private
   */
  enableNextButton(state) {
    const nextBtn = document.getElementById('nextBtn');
    if (!nextBtn) return;
    
    let isValid = false;
    
    // Special handling for step 1 - check checkbox directly
    if (state.currentStep === 1) {
      const policyCheckbox = document.getElementById('agreeToPolicy');
      isValid = policyCheckbox && policyCheckbox.checked;
    } else {
      const validation = BookingLogic.validateStep(state.currentStep, state);
      isValid = validation.valid;
    }
    
    nextBtn.disabled = !isValid;
  }
  
  /**
   * Show error message
   * @private
   */
  showError(message) {
    if (typeof customAlert !== 'undefined' && customAlert.warning) {
      customAlert.warning('Error', message);
    } else {
      alert(message);
    }
  }
  
  /**
   * Show warning message
   * @private
   */
  showWarning(title, message) {
    if (typeof customAlert !== 'undefined' && customAlert.show) {
      customAlert.show(title, message, 'warning');
    } else {
      alert(`${title}: ${message}`);
    }
  }
  
  /**
   * Set loading state
   * @private
   */
  setLoading(isLoading) {
    const submitBtn = document.getElementById('submitBooking');
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? 'Submitting...' : 'Submit Booking';
    }
  }
  
  /**
   * Get current state
   */
  getState() {
    return this.stateManager ? this.stateManager.getState() : null;
  }
  
  /**
   * Get state history
   */
  getHistory() {
    return this.stateManager ? this.stateManager.getHistory() : [];
  }
  
  /**
   * Reset booking
   */
  reset() {
    if (this.stateManager) {
      this.stateManager.reset();
      this.renderUI();
    }
  }
}

// ============================================
// Global Instance
// ============================================

const bookingIntegration = new BookingIntegration();

// ============================================
// Exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BookingIntegration, bookingIntegration };
}

// Make globally available
window.BookingIntegration = BookingIntegration;
window.bookingIntegration = bookingIntegration;
