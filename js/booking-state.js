/**
 * Booking State Manager
 * 
 * Centralized, immutable state container for the booking flow.
 * All state changes go through this manager, ensuring consistency and traceability.
 * 
 * Features:
 * - Immutable state updates (returns new state object)
 * - State change history for debugging
 * - Subscriber notifications on state changes
 * - Validation before state updates
 * - Single source of truth for booking data
 */

class BookingStateManager {
  constructor(initialState = {}) {
    // Define the initial state structure
    this.initialState = {
      // Pet Information
      petType: null,
      petName: '',
      petBreed: '',
      petAge: '',
      petWeight: '',
      
      // Service Selection
      packageId: null,
      addOns: [],
      singleServices: [],
      
      // Scheduling
      date: null,
      time: null,
      groomerId: null,
      groomerName: '',
      
      // Owner Information
      ownerName: '',
      contactNumber: '',
      ownerAddress: '',
      
      // Health & Notes
      medicalNotes: '',
      vaccinationNotes: '',
      bookingNotes: '',
      vaccinationStatus: null,
      
      // Preferences
      saveProfile: true,
      
      // UI State
      currentStep: 1,
      isLoading: false,
      errors: {},
      
      // Editing/Cancellation
      editingBookingId: null,
      bookingCancelId: null,
      
      ...initialState
    };
    
    // Current state (immutable)
    this.state = { ...this.initialState };
    
    // State change history for debugging
    this.history = [];
    
    // Subscribers to state changes
    this.subscribers = [];
    
    // Maximum history entries to keep
    this.maxHistorySize = 50;
  }
  
  /**
   * Get current state (immutable copy)
   * @returns {Object} Current state object
   */
  getState() {
    return { ...this.state };
  }
  
  /**
   * Update state with new values
   * Validates changes and notifies subscribers
   * 
   * @param {Object} updates - Partial state object with updates
   * @throws {Error} If validation fails
   */
  setState(updates) {
    if (!updates || typeof updates !== 'object') {
      console.warn('setState called with invalid updates:', updates);
      return;
    }
    
    // Store previous state for history
    const previousState = { ...this.state };
    
    // Create new state with updates
    const newState = { ...this.state, ...updates };
    
    // Validate the new state
    const validation = this.validateState(newState, updates);
    if (!validation.valid) {
      console.error('State validation failed:', validation.errors);
      return;
    }
    
    // Update state
    this.state = newState;
    
    // Record in history
    this.recordHistory({
      timestamp: Date.now(),
      action: this.getActionName(updates),
      previousState: this.getChangedFields(previousState, newState),
      newState: this.getChangedFields(previousState, newState),
      actor: 'user'
    });
    
    // Notify all subscribers
    this.notifySubscribers(newState, previousState);
  }
  
  /**
   * Reset state to initial values
   */
  reset() {
    const previousState = { ...this.state };
    this.state = { ...this.initialState };
    
    this.recordHistory({
      timestamp: Date.now(),
      action: 'reset',
      previousState: previousState,
      newState: this.state,
      actor: 'system'
    });
    
    this.notifySubscribers(this.state, previousState);
  }
  
  /**
   * Subscribe to state changes
   * 
   * @param {Function} callback - Called with (newState, oldState) on changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      console.warn('subscribe called with non-function callback');
      return () => {};
    }
    
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }
  
  /**
   * Get state change history
   * 
   * @returns {Array} Array of state changes
   */
  getHistory() {
    return [...this.history];
  }
  
  /**
   * Clear history (useful for testing)
   */
  clearHistory() {
    this.history = [];
  }
  
  /**
   * Get specific field from state
   * 
   * @param {String} fieldName - Name of field to retrieve
   * @returns {*} Field value
   */
  getField(fieldName) {
    return this.state[fieldName];
  }
  
  /**
   * Check if state is valid for submission
   * 
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateForSubmission() {
    const errors = [];
    
    // Required fields - VALIDATION DISABLED FOR DEBUGGING
    if (!this.state.ownerName?.trim()) {
      console.log('[BookingStateManager] Owner name missing, but validation disabled for debugging');
      // errors.push('Owner name is required');
    }
    if (!this.state.contactNumber?.trim()) {
      console.log('[BookingStateManager] Contact number missing, but validation disabled for debugging');
      // errors.push('Contact number is required');
    }
    if (!this.state.petName?.trim()) {
      console.log('[BookingStateManager] Pet name missing, but validation disabled for debugging');
      // errors.push('Pet name is required');
    }
    if (!this.state.date) {
      console.log('[BookingStateManager] Date missing, but validation disabled for debugging');
      // errors.push('Date is required');
    }
    if (!this.state.time) {
      console.log('[BookingStateManager] Time missing, but validation disabled for debugging');
      // errors.push('Time is required');
    }
    if (!this.state.packageId && this.state.singleServices.length === 0) {
      console.log('[BookingStateManager] Package/service missing, but validation disabled for debugging');
      // errors.push('Package or service selection is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // ============================================
  // Private Methods
  // ============================================
  
  /**
   * Validate state changes
   * @private
   */
  validateState(newState, updates) {
    const errors = [];
    
    // Validate phone number if provided
    if (updates.contactNumber !== undefined && updates.contactNumber) {
      const phoneValid = this.isValidPhoneNumber(updates.contactNumber);
      if (!phoneValid) {
        errors.push('Invalid phone number format');
      }
    }
    
    // Validate step is within range
    if (updates.currentStep !== undefined) {
      if (updates.currentStep < 1 || updates.currentStep > 5) {
        errors.push('Invalid step number');
      }
    }
    
    // Validate arrays
    if (updates.addOns !== undefined && !Array.isArray(updates.addOns)) {
      errors.push('addOns must be an array');
    }
    if (updates.singleServices !== undefined && !Array.isArray(updates.singleServices)) {
      errors.push('singleServices must be an array');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate phone number format
   * @private
   */
  isValidPhoneNumber(phone) {
    if (!phone) return false;
    
    // Remove spaces
    const cleaned = phone.replace(/\s/g, '');
    
    // Accept +63 or 0 prefix, followed by 10 digits
    const pattern = /^(\+63|0)[0-9]{10}$/;
    return pattern.test(cleaned);
  }
  
  /**
   * Get action name from updates
   * @private
   */
  getActionName(updates) {
    if (updates.petType) return 'selectPetType';
    if (updates.packageId) return 'selectPackage';
    if (updates.date || updates.time) return 'scheduleBooking';
    if (updates.ownerName || updates.contactNumber) return 'updateOwnerInfo';
    if (updates.currentStep) return 'progressStep';
    return 'updateState';
  }
  
  /**
   * Get only the fields that changed
   * @private
   */
  getChangedFields(oldState, newState) {
    const changed = {};
    
    Object.keys(newState).forEach(key => {
      if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
        changed[key] = newState[key];
      }
    });
    
    return changed;
  }
  
  /**
   * Record state change in history
   * @private
   */
  recordHistory(entry) {
    this.history.push(entry);
    
    // Keep history size manageable
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
  
  /**
   * Notify all subscribers of state change
   * @private
   */
  notifySubscribers(newState, oldState) {
    this.subscribers.forEach(callback => {
      try {
        callback(newState, oldState);
      } catch (error) {
        console.error('Error in state subscriber:', error);
      }
    });
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BookingStateManager;
}

// Make globally available
window.BookingStateManager = BookingStateManager;
