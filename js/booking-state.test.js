/**
 * Tests for BookingStateManager
 * 
 * Tests verify:
 * - State immutability
 * - Single source of truth
 * - State change logging
 * - Subscriber notifications
 * - Validation rules
 */

// Import for Node.js testing
const BookingStateManager = typeof require !== 'undefined' 
  ? require('./booking-state.js') 
  : window.BookingStateManager;

describe('BookingStateManager', () => {
  let stateManager;
  
  beforeEach(() => {
    stateManager = new BookingStateManager();
  });
  
  // ============================================
  // Property 1: State Immutability
  // ============================================
  
  describe('Property 1: State Immutability', () => {
    it('returns a copy of state, not the original', () => {
      const state1 = stateManager.getState();
      const state2 = stateManager.getState();
      
      // Should be equal but not the same object
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });
    
    it('does not mutate original state when returned state is modified', () => {
      const state = stateManager.getState();
      state.petName = 'Modified';
      
      const newState = stateManager.getState();
      expect(newState.petName).toBe('');
    });
    
    it('creates new state object on setState, not mutating old one', () => {
      const oldState = stateManager.getState();
      const oldPetName = oldState.petName;
      
      stateManager.setState({ petName: 'Fluffy' });
      
      // Old state reference should not change
      expect(oldState.petName).toBe(oldPetName);
      
      // New state should have update
      const newState = stateManager.getState();
      expect(newState.petName).toBe('Fluffy');
    });
    
    it('maintains immutability with nested objects', () => {
      stateManager.setState({ errors: { name: 'Required' } });
      
      const state = stateManager.getState();
      state.errors.name = 'Modified';
      
      const newState = stateManager.getState();
      expect(newState.errors.name).toBe('Required');
    });
    
    it('maintains immutability with arrays', () => {
      stateManager.setState({ addOns: ['toothbrush', 'dematting'] });
      
      const state = stateManager.getState();
      state.addOns.push('medicated-wash');
      
      const newState = stateManager.getState();
      expect(newState.addOns.length).toBe(2);
    });
  });
  
  // ============================================
  // Property 2: Single Source of Truth
  // ============================================
  
  describe('Property 2: Single Source of Truth', () => {
    it('returns same state values across multiple calls', () => {
      stateManager.setState({ petName: 'Buddy', petType: 'dog' });
      
      const state1 = stateManager.getState();
      const state2 = stateManager.getState();
      const state3 = stateManager.getState();
      
      expect(state1.petName).toBe(state2.petName);
      expect(state2.petName).toBe(state3.petName);
      expect(state1.petType).toBe(state2.petType);
    });
    
    it('all subscribers receive identical state', (done) => {
      const states = [];
      
      stateManager.subscribe((newState) => {
        states.push(newState);
      });
      
      stateManager.subscribe((newState) => {
        states.push(newState);
      });
      
      stateManager.setState({ petName: 'Buddy' });
      
      setTimeout(() => {
        expect(states[0]).toEqual(states[1]);
        expect(states[0].petName).toBe('Buddy');
        done();
      }, 10);
    });
    
    it('getField returns same value as getState', () => {
      stateManager.setState({ petName: 'Buddy', contactNumber: '09123456789' });
      
      const state = stateManager.getState();
      expect(stateManager.getField('petName')).toBe(state.petName);
      expect(stateManager.getField('contactNumber')).toBe(state.contactNumber);
    });
  });
  
  // ============================================
  // Property 3: State Change Logging
  // ============================================
  
  describe('Property 3: State Change Logging', () => {
    it('records state changes in history', () => {
      stateManager.setState({ petName: 'Buddy' });
      stateManager.setState({ petType: 'dog' });
      
      const history = stateManager.getHistory();
      expect(history.length).toBe(2);
    });
    
    it('history entries contain timestamp', () => {
      const before = Date.now();
      stateManager.setState({ petName: 'Buddy' });
      const after = Date.now();
      
      const history = stateManager.getHistory();
      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);
    });
    
    it('history entries contain action name', () => {
      stateManager.setState({ petType: 'dog' });
      stateManager.setState({ packageId: 'full-package' });
      stateManager.setState({ ownerName: 'John' });
      
      const history = stateManager.getHistory();
      expect(history[0].action).toBe('selectPetType');
      expect(history[1].action).toBe('selectPackage');
      expect(history[2].action).toBe('updateOwnerInfo');
    });
    
    it('history entries contain previous and new state', () => {
      stateManager.setState({ petName: 'Buddy' });
      
      const history = stateManager.getHistory();
      expect(history[0].previousState).toBeDefined();
      expect(history[0].newState).toBeDefined();
      expect(history[0].newState.petName).toBe('Buddy');
    });
    
    it('limits history size to prevent memory bloat', () => {
      // Set max history to 10 for testing
      stateManager.maxHistorySize = 10;
      
      // Add 15 entries
      for (let i = 0; i < 15; i++) {
        stateManager.setState({ petName: `Pet${i}` });
      }
      
      const history = stateManager.getHistory();
      expect(history.length).toBe(10);
    });
    
    it('clearHistory removes all history entries', () => {
      stateManager.setState({ petName: 'Buddy' });
      stateManager.setState({ petType: 'dog' });
      
      expect(stateManager.getHistory().length).toBe(2);
      
      stateManager.clearHistory();
      expect(stateManager.getHistory().length).toBe(0);
    });
  });
  
  // ============================================
  // Property 4: Subscriber Notifications
  // ============================================
  
  describe('Property 4: Subscriber Notifications', () => {
    it('notifies subscribers on state change', (done) => {
      let notified = false;
      
      stateManager.subscribe((newState) => {
        notified = true;
        expect(newState.petName).toBe('Buddy');
      });
      
      stateManager.setState({ petName: 'Buddy' });
      
      setTimeout(() => {
        expect(notified).toBe(true);
        done();
      }, 10);
    });
    
    it('passes both new and old state to subscribers', (done) => {
      let oldState, newState;
      
      stateManager.setState({ petName: 'Original' });
      
      stateManager.subscribe((newS, oldS) => {
        newState = newS;
        oldState = oldS;
      });
      
      stateManager.setState({ petName: 'Updated' });
      
      setTimeout(() => {
        expect(oldState.petName).toBe('Original');
        expect(newState.petName).toBe('Updated');
        done();
      }, 10);
    });
    
    it('unsubscribe function stops notifications', (done) => {
      let callCount = 0;
      
      const unsubscribe = stateManager.subscribe(() => {
        callCount++;
      });
      
      stateManager.setState({ petName: 'First' });
      
      setTimeout(() => {
        expect(callCount).toBe(1);
        
        unsubscribe();
        stateManager.setState({ petName: 'Second' });
        
        setTimeout(() => {
          expect(callCount).toBe(1); // Should not increase
          done();
        }, 10);
      }, 10);
    });
    
    it('handles subscriber errors gracefully', (done) => {
      stateManager.subscribe(() => {
        throw new Error('Subscriber error');
      });
      
      stateManager.subscribe((newState) => {
        expect(newState.petName).toBe('Buddy');
      });
      
      // Should not throw
      expect(() => {
        stateManager.setState({ petName: 'Buddy' });
      }).not.toThrow();
      
      done();
    });
  });
  
  // ============================================
  // Property 5: Validation
  // ============================================
  
  describe('Property 5: Validation', () => {
    it('rejects invalid phone numbers', () => {
      stateManager.setState({ contactNumber: '123' });
      
      const state = stateManager.getState();
      // Should not update if invalid
      expect(state.contactNumber).toBe('');
    });
    
    it('accepts valid Philippine phone numbers', () => {
      stateManager.setState({ contactNumber: '09123456789' });
      
      const state = stateManager.getState();
      expect(state.contactNumber).toBe('09123456789');
    });
    
    it('accepts +63 format phone numbers', () => {
      stateManager.setState({ contactNumber: '+639123456789' });
      
      const state = stateManager.getState();
      expect(state.contactNumber).toBe('+639123456789');
    });
    
    it('rejects invalid step numbers', () => {
      stateManager.setState({ currentStep: 5 });
      
      const state = stateManager.getState();
      expect(state.currentStep).toBe(1); // Should remain at initial
    });
    
    it('validates arrays for addOns and singleServices', () => {
      stateManager.setState({ addOns: 'not-an-array' });
      
      const state = stateManager.getState();
      expect(Array.isArray(state.addOns)).toBe(true);
    });
  });
  
  // ============================================
  // Property 6: Reset Functionality
  // ============================================
  
  describe('Property 6: Reset Functionality', () => {
    it('resets state to initial values', () => {
      stateManager.setState({
        petName: 'Buddy',
        petType: 'dog',
        ownerName: 'John'
      });
      
      stateManager.reset();
      
      const state = stateManager.getState();
      expect(state.petName).toBe('');
      expect(state.petType).toBeNull();
      expect(state.ownerName).toBe('');
    });
    
    it('records reset in history', () => {
      stateManager.setState({ petName: 'Buddy' });
      stateManager.reset();
      
      const history = stateManager.getHistory();
      expect(history[history.length - 1].action).toBe('reset');
    });
    
    it('notifies subscribers on reset', (done) => {
      let notified = false;
      
      stateManager.setState({ petName: 'Buddy' });
      
      stateManager.subscribe((newState) => {
        notified = true;
        expect(newState.petName).toBe('');
      });
      
      stateManager.reset();
      
      setTimeout(() => {
        expect(notified).toBe(true);
        done();
      }, 10);
    });
  });
  
  // ============================================
  // Property 7: Validation for Submission
  // ============================================
  
  describe('Property 7: Validation for Submission', () => {
    it('validates required fields for submission', () => {
      const validation = stateManager.validateForSubmission();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
    
    it('passes validation when all required fields are set', () => {
      stateManager.setState({
        ownerName: 'John Doe',
        contactNumber: '09123456789',
        petName: 'Buddy',
        date: '2024-01-15',
        time: '10:00',
        packageId: 'full-package'
      });
      
      const validation = stateManager.validateForSubmission();
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
    
    it('accepts singleServices as alternative to packageId', () => {
      stateManager.setState({
        ownerName: 'John Doe',
        contactNumber: '09123456789',
        petName: 'Buddy',
        date: '2024-01-15',
        time: '10:00',
        singleServices: ['bath', 'dry']
      });
      
      const validation = stateManager.validateForSubmission();
      expect(validation.valid).toBe(true);
    });
  });
});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BookingStateManager };
}
