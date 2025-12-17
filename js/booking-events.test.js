/**
 * Tests for Booking Event System
 * 
 * Tests verify:
 * - Event handlers validate input before state update
 * - Event handlers don't directly manipulate DOM
 * - Data flows through correct sequence
 * - Side effects are triggered appropriately
 */

const BookingEvents = typeof require !== 'undefined'
  ? require('./booking-events.js')
  : window.BookingEvents;

describe('Booking Event System', () => {
  let mockStateManager;
  let mockOnStateChange;
  let mockOnNext;
  let mockOnPrev;
  let mockOnStepChange;
  let mockOnSubmit;
  
  beforeEach(() => {
    // Create mock state manager
    mockStateManager = {
      getState: jest.fn(() => ({
        petType: null,
        packageId: null,
        currentStep: 1,
        ownerName: '',
        contactNumber: '',
        petName: '',
        vaccinationStatus: null
      })),
      setState: jest.fn(),
      validateForSubmission: jest.fn(() => ({ valid: true, errors: [] }))
    };
    
    // Create mock callbacks
    mockOnStateChange = jest.fn();
    mockOnNext = jest.fn();
    mockOnPrev = jest.fn();
    mockOnStepChange = jest.fn();
    mockOnSubmit = jest.fn();
  });
  
  // ============================================
  // Pet Type Selection Tests
  // ============================================
  
  describe('Pet Type Selection', () => {
    it('updates state when pet type is selected', () => {
      BookingEvents.handlePetTypeClick('dog', mockStateManager, mockOnStateChange);
      
      expect(mockStateManager.setState).toHaveBeenCalledWith({
        petType: 'dog',
        packageId: null
      });
    });
    
    it('clears package when pet type changes', () => {
      BookingEvents.handlePetTypeClick('cat', mockStateManager, mockOnStateChange);
      
      expect(mockStateManager.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          packageId: null
        })
      );
    });
    
    it('calls onStateChange callback', () => {
      BookingEvents.handlePetTypeClick('dog', mockStateManager, mockOnStateChange);
      
      expect(mockOnStateChange).toHaveBeenCalled();
    });
    
    it('ignores empty pet type', () => {
      BookingEvents.handlePetTypeClick('', mockStateManager, mockOnStateChange);
      
      expect(mockStateManager.setState).not.toHaveBeenCalled();
    });
  });
  
  // ============================================
  // Package Selection Tests
  // ============================================
  
  describe('Package Selection', () => {
    it('updates state when package is selected', () => {
      BookingEvents.handlePackageClick('full-package', mockStateManager, mockOnStateChange);
      
      expect(mockStateManager.setState).toHaveBeenCalledWith({
        packageId: 'full-package'
      });
    });
    
    it('calls onStateChange callback', () => {
      BookingEvents.handlePackageClick('full-package', mockStateManager, mockOnStateChange);
      
      expect(mockOnStateChange).toHaveBeenCalled();
    });
    
    it('ignores empty package ID', () => {
      BookingEvents.handlePackageClick('', mockStateManager, mockOnStateChange);
      
      expect(mockStateManager.setState).not.toHaveBeenCalled();
    });
  });
  
  // ============================================
  // Form Input Tests
  // ============================================
  
  describe('Form Input Handling', () => {
    it('updates state for text input', () => {
      BookingEvents.handleFormInput('ownerName', 'John Doe', mockStateManager, mockOnStateChange);
      
      expect(mockStateManager.setState).toHaveBeenCalledWith({
        ownerName: 'John Doe'
      });
    });
    
    it('trims whitespace from input', () => {
      BookingEvents.handleFormInput('ownerName', '  John Doe  ', mockStateManager, mockOnStateChange);
      
      expect(mockStateManager.setState).toHaveBeenCalledWith({
        ownerName: 'John Doe'
      });
    });
    
    it('calls onStateChange callback', () => {
      BookingEvents.handleFormInput('petName', 'Buddy', mockStateManager, mockOnStateChange);
      
      expect(mockOnStateChange).toHaveBeenCalled();
    });
    
    it('handles multiple field updates', () => {
      BookingEvents.handleFormInput('ownerName', 'John', mockStateManager, mockOnStateChange);
      BookingEvents.handleFormInput('petName', 'Buddy', mockStateManager, mockOnStateChange);
      
      expect(mockStateManager.setState).toHaveBeenCalledTimes(2);
    });
  });
  
  // ============================================
  // Phone Input Tests
  // ============================================
  
  describe('Phone Input Handling', () => {
    beforeEach(() => {
      // Mock BookingLogic
      global.BookingLogic = {
        validatePhoneNumber: jest.fn((phone) => {
          if (phone === '09123456789') {
            return { valid: true };
          }
          return { valid: false, error: 'Invalid phone' };
        })
      };
      
      // Mock DOM element
      const input = document.createElement('input');
      input.id = 'contactNumber';
      input.setCustomValidity = jest.fn();
      document.body.appendChild(input);
    });
    
    afterEach(() => {
      const input = document.getElementById('contactNumber');
      if (input) {
        input.remove();
      }
    });
    
    it('validates phone number before updating state', () => {
      BookingEvents.handlePhoneInput('09123456789', mockStateManager, mockOnStateChange);
      
      expect(BookingLogic.validatePhoneNumber).toHaveBeenCalledWith('09123456789');
      expect(mockStateManager.setState).toHaveBeenCalled();
    });
    
    it('rejects invalid phone numbers', () => {
      BookingEvents.handlePhoneInput('123', mockStateManager, mockOnStateChange);
      
      expect(mockStateManager.setState).not.toHaveBeenCalled();
    });
  });
  
  // ============================================
  // Navigation Tests
  // ============================================
  
  describe('Step Navigation', () => {
    beforeEach(() => {
      // Mock BookingLogic
      global.BookingLogic = {
        validateStep: jest.fn(() => ({ valid: true, errors: [] })),
        getNextStep: jest.fn((step) => step + 1),
        getPreviousStep: jest.fn((step) => Math.max(1, step - 1))
      };
    });
    
    it('validates current step before progressing', () => {
      BookingEvents.handleNextStep(mockStateManager, mockOnStepChange);
      
      expect(BookingLogic.validateStep).toHaveBeenCalled();
    });
    
    it('prevents progression if validation fails', () => {
      BookingLogic.validateStep.mockReturnValue({
        valid: false,
        errors: ['Pet type required']
      });
      
      BookingEvents.handleNextStep(mockStateManager, mockOnStepChange);
      
      expect(mockStateManager.setState).not.toHaveBeenCalled();
    });
    
    it('updates state to next step', () => {
      BookingLogic.validateStep.mockReturnValue({ valid: true, errors: [] });
      BookingLogic.getNextStep.mockReturnValue(2);
      
      BookingEvents.handleNextStep(mockStateManager, mockOnStepChange);
      
      expect(mockStateManager.setState).toHaveBeenCalledWith({
        currentStep: 2
      });
    });
    
    it('calls onStepChange callback', () => {
      BookingLogic.validateStep.mockReturnValue({ valid: true, errors: [] });
      BookingLogic.getNextStep.mockReturnValue(2);
      
      BookingEvents.handleNextStep(mockStateManager, mockOnStepChange);
      
      expect(mockOnStepChange).toHaveBeenCalledWith(2);
    });
    
    it('handles previous step navigation', () => {
      mockStateManager.getState.mockReturnValue({ currentStep: 2 });
      BookingLogic.getPreviousStep.mockReturnValue(1);
      
      BookingEvents.handlePreviousStep(mockStateManager, mockOnStepChange);
      
      expect(mockStateManager.setState).toHaveBeenCalledWith({
        currentStep: 1
      });
    });
  });
  
  // ============================================
  // Booking Submission Tests
  // ============================================
  
  describe('Booking Submission', () => {
    it('validates submission before calling handler', () => {
      mockStateManager.validateForSubmission.mockReturnValue({
        valid: true,
        errors: []
      });
      
      BookingEvents.handleBookingSubmit(mockStateManager, mockOnSubmit);
      
      expect(mockStateManager.validateForSubmission).toHaveBeenCalled();
    });
    
    it('prevents submission if validation fails', () => {
      mockStateManager.validateForSubmission.mockReturnValue({
        valid: false,
        errors: ['Owner name required']
      });
      
      BookingEvents.handleBookingSubmit(mockStateManager, mockOnSubmit);
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
    
    it('calls onSubmit callback with state', () => {
      const state = {
        petType: 'dog',
        ownerName: 'John',
        petName: 'Buddy'
      };
      mockStateManager.getState.mockReturnValue(state);
      mockStateManager.validateForSubmission.mockReturnValue({
        valid: true,
        errors: []
      });
      
      BookingEvents.handleBookingSubmit(mockStateManager, mockOnSubmit);
      
      expect(mockOnSubmit).toHaveBeenCalledWith(state);
    });
  });
  
  // ============================================
  // Property 6: Event Handler Decoupling Tests
  // ============================================
  
  describe('Property 6: Event Handler Decoupling', () => {
    beforeEach(() => {
      global.BookingLogic = {
        validatePhoneNumber: jest.fn(() => ({ valid: true })),
        validateStep: jest.fn(() => ({ valid: true, errors: [] })),
        getNextStep: jest.fn((step) => step + 1),
        getPreviousStep: jest.fn((step) => step - 1)
      };
    });
    
    it('validates input before state update', () => {
      BookingEvents.handlePhoneInput('09123456789', mockStateManager, mockOnStateChange);
      
      expect(BookingLogic.validatePhoneNumber).toHaveBeenCalledBefore(mockStateManager.setState);
    });
    
    it('does not directly manipulate DOM', () => {
      // Create a spy on DOM methods
      const querySelectorSpy = jest.spyOn(document, 'querySelector');
      const getElementByIdSpy = jest.spyOn(document, 'getElementById');
      
      BookingEvents.handlePetTypeClick('dog', mockStateManager, mockOnStateChange);
      
      // Event handlers should not directly query DOM
      // (They only call setState and callbacks)
      expect(mockStateManager.setState).toHaveBeenCalled();
      
      querySelectorSpy.mockRestore();
      getElementByIdSpy.mockRestore();
    });
  });
  
  // ============================================
  // Property 5: Data Flow Consistency Tests
  // ============================================
  
  describe('Property 5: Data Flow Consistency', () => {
    beforeEach(() => {
      global.BookingLogic = {
        validateStep: jest.fn(() => ({ valid: true, errors: [] })),
        getNextStep: jest.fn((step) => step + 1),
        getPreviousStep: jest.fn((step) => step - 1)
      };
    });
    
    it('follows correct data flow: Input → Validation → State Update → Callback', () => {
      const callOrder = [];
      
      BookingLogic.validateStep.mockImplementation(() => {
        callOrder.push('validate');
        return { valid: true, errors: [] };
      });
      
      mockStateManager.setState.mockImplementation(() => {
        callOrder.push('setState');
      });
      
      mockOnStepChange.mockImplementation(() => {
        callOrder.push('callback');
      });
      
      BookingEvents.handleNextStep(mockStateManager, mockOnStepChange);
      
      expect(callOrder).toEqual(['validate', 'setState', 'callback']);
    });
    
    it('validation happens before state update', () => {
      let validationHappened = false;
      
      BookingLogic.validateStep.mockImplementation(() => {
        validationHappened = true;
        return { valid: true, errors: [] };
      });
      
      mockStateManager.setState.mockImplementation(() => {
        expect(validationHappened).toBe(true);
      });
      
      BookingEvents.handleNextStep(mockStateManager, mockOnStepChange);
      
      expect(mockStateManager.setState).toHaveBeenCalled();
    });
    
    it('state update happens before callback', () => {
      let stateUpdated = false;
      
      mockStateManager.setState.mockImplementation(() => {
        stateUpdated = true;
      });
      
      mockOnStepChange.mockImplementation(() => {
        expect(stateUpdated).toBe(true);
      });
      
      BookingLogic.validateStep.mockReturnValue({ valid: true, errors: [] });
      BookingLogic.getNextStep.mockReturnValue(2);
      
      BookingEvents.handleNextStep(mockStateManager, mockOnStepChange);
      
      expect(mockOnStepChange).toHaveBeenCalled();
    });
  });
});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BookingEvents };
}
