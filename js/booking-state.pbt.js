/**
 * Property-Based Tests for BookingStateManager
 * 
 * Uses fast-check for property-based testing
 * Tests verify universal properties that should hold across all inputs
 * 
 * Run with: npx jest booking-state.pbt.js
 * Or in browser: include fast-check library and run tests
 */

// Import for Node.js testing
const BookingStateManager = typeof require !== 'undefined' 
  ? require('./booking-state.js') 
  : window.BookingStateManager;

// Import fast-check for property-based testing
const fc = typeof require !== 'undefined'
  ? require('fast-check')
  : window.fc;

// Skip tests if fast-check is not available
const describeIfAvailable = fc ? describe : describe.skip;

// ============================================
// Arbitraries (Generators)
// ============================================

/**
 * Generate valid booking state objects
 */
function bookingStateArbitrary() {
  return fc.record({
    petType: fc.oneof(fc.constant(null), fc.constant('dog'), fc.constant('cat')),
    petName: fc.string({ maxLength: 50 }),
    petBreed: fc.string({ maxLength: 50 }),
    petAge: fc.string({ maxLength: 30 }),
    petWeight: fc.string({ maxLength: 20 }),
    packageId: fc.oneof(fc.constant(null), fc.constant('full-package'), fc.constant('single-service')),
    addOns: fc.array(fc.string({ maxLength: 30 }), { maxLength: 5 }),
    singleServices: fc.array(fc.string({ maxLength: 30 }), { maxLength: 5 }),
    date: fc.oneof(fc.constant(null), fc.date()),
    time: fc.oneof(fc.constant(null), fc.string({ maxLength: 5 })),
    ownerName: fc.string({ maxLength: 100 }),
    contactNumber: fc.string({ maxLength: 20 }),
    ownerAddress: fc.string({ maxLength: 200 }),
    medicalNotes: fc.string({ maxLength: 500 }),
    vaccinationNotes: fc.string({ maxLength: 500 }),
    bookingNotes: fc.string({ maxLength: 500 }),
    vaccinationStatus: fc.oneof(fc.constant(null), fc.constant('vaccinated'), fc.constant('not-vaccinated')),
    saveProfile: fc.boolean(),
    currentStep: fc.integer({ min: 1, max: 4 }),
    isLoading: fc.boolean(),
    errors: fc.record({})
  });
}

/**
 * Generate valid phone numbers
 */
function validPhoneNumberArbitrary() {
  return fc.oneof(
    // 09XXXXXXXXX format
    fc.tuple(fc.constant('09'), fc.integer({ min: 100000000, max: 999999999 }))
      .map(([prefix, num]) => prefix + num.toString()),
    // +639XXXXXXXXX format
    fc.tuple(fc.constant('+639'), fc.integer({ min: 100000000, max: 999999999 }))
      .map(([prefix, num]) => prefix + num.toString())
  );
}

/**
 * Generate invalid phone numbers
 */
function invalidPhoneNumberArbitrary() {
  return fc.oneof(
    fc.string({ maxLength: 5 }),  // Too short
    fc.string({ minLength: 15 }), // Too long
    fc.string({ regex: /^[a-z]+$/ }), // Letters only
    fc.constant(''),  // Empty
    fc.constant('123')  // Too short
  );
}

// ============================================
// Property 2: Single Source of Truth
// ============================================

describeIfAvailable('Property 2: Single Source of Truth (PBT)', () => {
  let stateManager;
  
  beforeEach(() => {
    stateManager = new BookingStateManager();
  });
  
  /**
   * Property: Multiple calls to getState() return identical values
   * 
   * For any state, calling getState() multiple times should return
   * objects with identical values (though different object references)
   * 
   * **Feature: booking-flow-refactor, Property 2: Single Source of Truth**
   * **Validates: Requirements 3.3**
   */
  it('getState() returns consistent values across multiple calls', () => {
    fc.assert(
      fc.property(bookingStateArbitrary(), (stateUpdate) => {
        stateManager.setState(stateUpdate);
        
        // Get state multiple times
        const state1 = stateManager.getState();
        const state2 = stateManager.getState();
        const state3 = stateManager.getState();
        
        // All should have identical values
        expect(JSON.stringify(state1)).toBe(JSON.stringify(state2));
        expect(JSON.stringify(state2)).toBe(JSON.stringify(state3));
      }),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: All subscribers receive identical state
   * 
   * When state changes, all subscribers should receive the exact same
   * state object (by value, not reference)
   * 
   * **Feature: booking-flow-refactor, Property 2: Single Source of Truth**
   * **Validates: Requirements 3.3**
   */
  it('all subscribers receive identical state on update', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),  // Number of subscribers
        bookingStateArbitrary(),
        (numSubscribers, stateUpdate) => {
          const stateManager = new BookingStateManager();
          const receivedStates = [];
          
          // Add multiple subscribers
          for (let i = 0; i < numSubscribers; i++) {
            stateManager.subscribe((newState) => {
              receivedStates.push(JSON.stringify(newState));
            });
          }
          
          // Update state
          stateManager.setState(stateUpdate);
          
          // All subscribers should have received identical state
          if (receivedStates.length > 0) {
            const firstState = receivedStates[0];
            receivedStates.forEach(state => {
              expect(state).toBe(firstState);
            });
          }
        }
      ),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: getField() returns same value as getState()
   * 
   * For any field name, getField(name) should return the same value
   * as getState()[name]
   * 
   * **Feature: booking-flow-refactor, Property 2: Single Source of Truth**
   * **Validates: Requirements 3.3**
   */
  it('getField() returns same value as getState()[fieldName]', () => {
    fc.assert(
      fc.property(bookingStateArbitrary(), (stateUpdate) => {
        stateManager.setState(stateUpdate);
        
        const state = stateManager.getState();
        const fieldNames = Object.keys(state);
        
        // For each field, getField should return same value
        fieldNames.forEach(fieldName => {
          const fieldValue = stateManager.getField(fieldName);
          const stateValue = state[fieldName];
          
          expect(JSON.stringify(fieldValue)).toBe(JSON.stringify(stateValue));
        });
      }),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: State consistency after multiple updates
   * 
   * After multiple state updates, the current state should reflect
   * all updates applied in order
   * 
   * **Feature: booking-flow-refactor, Property 2: Single Source of Truth**
   * **Validates: Requirements 3.3**
   */
  it('state remains consistent after multiple sequential updates', () => {
    fc.assert(
      fc.property(
        fc.array(bookingStateArbitrary(), { minLength: 1, maxLength: 10 }),
        (updates) => {
          const stateManager = new BookingStateManager();
          
          // Apply all updates
          updates.forEach(update => {
            stateManager.setState(update);
          });
          
          // Final state should reflect last update
          const finalState = stateManager.getState();
          const lastUpdate = updates[updates.length - 1];
          
          // All fields from last update should be in final state
          Object.keys(lastUpdate).forEach(key => {
            expect(JSON.stringify(finalState[key])).toBe(JSON.stringify(lastUpdate[key]));
          });
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================
// Property 3: State Change Logging
// ============================================

describeIfAvailable('Property 3: State Change Logging (PBT)', () => {
  let stateManager;
  
  beforeEach(() => {
    stateManager = new BookingStateManager();
  });
  
  /**
   * Property: Each state update is recorded in history
   * 
   * For any number of state updates, the history should contain
   * exactly that many entries
   * 
   * **Feature: booking-flow-refactor, Property 3: State Change Logging**
   * **Validates: Requirements 3.4**
   */
  it('each state update is recorded in history', () => {
    fc.assert(
      fc.property(
        fc.array(bookingStateArbitrary(), { minLength: 1, maxLength: 20 }),
        (updates) => {
          const stateManager = new BookingStateManager();
          
          // Apply updates
          updates.forEach(update => {
            stateManager.setState(update);
          });
          
          // History should have same number of entries
          const history = stateManager.getHistory();
          expect(history.length).toBe(updates.length);
        }
      ),
      { numRuns: 50 }
    );
  });
  
  /**
   * Property: History entries contain required fields
   * 
   * Each history entry should have timestamp, action, previousState, and newState
   * 
   * **Feature: booking-flow-refactor, Property 3: State Change Logging**
   * **Validates: Requirements 3.4**
   */
  it('history entries contain all required fields', () => {
    fc.assert(
      fc.property(bookingStateArbitrary(), (stateUpdate) => {
        const stateManager = new BookingStateManager();
        stateManager.setState(stateUpdate);
        
        const history = stateManager.getHistory();
        expect(history.length).toBeGreaterThan(0);
        
        history.forEach(entry => {
          expect(entry).toHaveProperty('timestamp');
          expect(entry).toHaveProperty('action');
          expect(entry).toHaveProperty('previousState');
          expect(entry).toHaveProperty('newState');
          expect(entry).toHaveProperty('actor');
          
          // Timestamp should be a number
          expect(typeof entry.timestamp).toBe('number');
          expect(entry.timestamp).toBeGreaterThan(0);
          
          // Action should be a string
          expect(typeof entry.action).toBe('string');
          expect(entry.action.length).toBeGreaterThan(0);
        });
      }),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: History is limited to prevent memory bloat
   * 
   * History should never exceed maxHistorySize
   * 
   * **Feature: booking-flow-refactor, Property 3: State Change Logging**
   * **Validates: Requirements 3.4**
   */
  it('history size is limited to prevent memory bloat', () => {
    fc.assert(
      fc.property(
        fc.array(bookingStateArbitrary(), { minLength: 1, maxLength: 100 }),
        (updates) => {
          const stateManager = new BookingStateManager();
          const maxSize = stateManager.maxHistorySize;
          
          // Apply many updates
          updates.forEach(update => {
            stateManager.setState(update);
          });
          
          // History should not exceed max size
          const history = stateManager.getHistory();
          expect(history.length).toBeLessThanOrEqual(maxSize);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================
// Property 9: Validation Consistency
// ============================================

describeIfAvailable('Property 9: Validation Consistency (PBT)', () => {
  let stateManager;
  
  beforeEach(() => {
    stateManager = new BookingStateManager();
  });
  
  /**
   * Property: Valid phone numbers are always accepted
   * 
   * For any valid phone number, setState should accept it
   * 
   * **Feature: booking-flow-refactor, Property 9: Validation Consistency**
   * **Validates: Requirements 6.3, 6.4**
   */
  it('valid phone numbers are consistently accepted', () => {
    fc.assert(
      fc.property(validPhoneNumberArbitrary(), (phone) => {
        const stateManager = new BookingStateManager();
        stateManager.setState({ contactNumber: phone });
        
        const state = stateManager.getState();
        // Valid phone should be stored
        expect(state.contactNumber).toBe(phone);
      }),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Invalid phone numbers are consistently rejected
   * 
   * For any invalid phone number, setState should reject it
   * 
   * **Feature: booking-flow-refactor, Property 9: Validation Consistency**
   * **Validates: Requirements 6.3, 6.4**
   */
  it('invalid phone numbers are consistently rejected', () => {
    fc.assert(
      fc.property(invalidPhoneNumberArbitrary(), (phone) => {
        const stateManager = new BookingStateManager();
        stateManager.setState({ contactNumber: phone });
        
        const state = stateManager.getState();
        // Invalid phone should not be stored (or stored as empty)
        expect(state.contactNumber).not.toBe(phone);
      }),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Step validation is consistent
   * 
   * Valid steps (1-4) should be accepted, invalid steps rejected
   * 
   * **Feature: booking-flow-refactor, Property 9: Validation Consistency**
   * **Validates: Requirements 6.3, 6.4**
   */
  it('step validation is consistent', () => {
    fc.assert(
      fc.property(fc.integer(), (step) => {
        const stateManager = new BookingStateManager();
        stateManager.setState({ currentStep: step });
        
        const state = stateManager.getState();
        
        // Valid steps should be stored
        if (step >= 1 && step <= 4) {
          expect(state.currentStep).toBe(step);
        } else {
          // Invalid steps should not be stored
          expect(state.currentStep).not.toBe(step);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Export for Node.js
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    bookingStateArbitrary,
    validPhoneNumberArbitrary,
    invalidPhoneNumberArbitrary
  };
}
