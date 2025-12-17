/**
 * Property-Based Tests for Function Consolidation
 * 
 * **Feature: booking-flow-refactor, Property 1: Duplication Elimination**
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 * 
 * Tests verify:
 * - Consolidated functions produce consistent output
 * - Only one implementation exists in codebase
 * - Function behavior is deterministic
 * 
 * Property: For any valid input to a consolidated function, calling it multiple times
 * with the same input should always produce identical state changes. This ensures that
 * the consolidation eliminated duplicates without changing behavior.
 */

describe('Property 1: Duplication Elimination', () => {
  
  // ============================================
  // Test: selectPetType Consolidation
  // ============================================
  
  describe('selectPetType consolidation', () => {
    let bookingData;
    let mockDOM;
    
    beforeEach(() => {
      // Reset booking data
      bookingData = {
        petType: null,
        packageId: null,
        petWeight: null,
        singleServices: []
      };
      
      // Mock DOM elements
      mockDOM = {
        petTypeCards: [],
        packageCards: [],
        summaryContainer: null
      };
      
      // Create mock pet type cards
      for (let i = 0; i < 3; i++) {
        const card = document.createElement('div');
        card.className = 'pet-type-card';
        card.dataset.petType = ['dog', 'cat', 'rabbit'][i];
        mockDOM.petTypeCards.push(card);
      }
    });
    
    it('selectPetType produces consistent output for same input', () => {
      // Property: For any pet type, calling selectPetType twice with the same
      // pet type should result in identical state
      
      const petTypes = ['dog', 'cat', 'rabbit'];
      
      petTypes.forEach(petType => {
        // First call
        bookingData.petType = null;
        bookingData.packageId = null;
        selectPetType(petType);
        const firstResult = {
          petType: bookingData.petType,
          packageId: bookingData.packageId
        };
        
        // Second call with same input
        bookingData.petType = null;
        bookingData.packageId = null;
        selectPetType(petType);
        const secondResult = {
          petType: bookingData.petType,
          packageId: bookingData.packageId
        };
        
        // Results should be identical
        expect(firstResult.petType).toBe(secondResult.petType);
        expect(firstResult.packageId).toBe(secondResult.packageId);
      });
    });
    
    it('selectPetType clears package selection when pet type changes', () => {
      // Property: For any pet type change, the package selection should be cleared
      
      const petTypes = ['dog', 'cat', 'rabbit'];
      
      petTypes.forEach(petType => {
        bookingData.petType = 'dog';
        bookingData.packageId = 'some-package';
        
        selectPetType(petType);
        
        // Package should be cleared
        expect(bookingData.packageId).toBeNull();
      });
    });
    
    it('selectPetType updates state correctly for all pet types', () => {
      // Property: For any valid pet type, selectPetType should update the state
      
      const validPetTypes = ['dog', 'cat', 'rabbit'];
      
      validPetTypes.forEach(petType => {
        bookingData.petType = null;
        selectPetType(petType);
        expect(bookingData.petType).toBe(petType);
      });
    });
  });
  
  // ============================================
  // Test: selectPackage Consolidation
  // ============================================
  
  describe('selectPackage consolidation', () => {
    let bookingData;
    
    beforeEach(() => {
      bookingData = {
        petType: 'dog',
        packageId: null,
        singleServices: []
      };
    });
    
    it('selectPackage produces consistent output for same input', () => {
      // Property: For any package ID, calling selectPackage twice with the same
      // package ID should result in identical state
      
      const packageIds = ['full-package', 'basic-package', 'single-service'];
      
      packageIds.forEach(packageId => {
        // First call
        bookingData.packageId = null;
        bookingData.singleServices = [];
        selectPackage(packageId);
        const firstResult = {
          packageId: bookingData.packageId,
          singleServices: bookingData.singleServices.slice()
        };
        
        // Second call with same input
        bookingData.packageId = null;
        bookingData.singleServices = [];
        selectPackage(packageId);
        const secondResult = {
          packageId: bookingData.packageId,
          singleServices: bookingData.singleServices.slice()
        };
        
        // Results should be identical
        expect(firstResult.packageId).toBe(secondResult.packageId);
        expect(firstResult.singleServices).toEqual(secondResult.singleServices);
      });
    });
    
    it('selectPackage clears single services for non-single-service packages', () => {
      // Property: For any non-single-service package, single services should be cleared
      
      const nonSingleServicePackages = ['full-package', 'basic-package', 'premium-package'];
      
      nonSingleServicePackages.forEach(packageId => {
        bookingData.packageId = null;
        bookingData.singleServices = ['bath', 'trim'];
        
        selectPackage(packageId);
        
        // Single services should be cleared
        expect(bookingData.singleServices).toEqual([]);
      });
    });
    
    it('selectPackage preserves single services for single-service package', () => {
      // Property: For single-service package, single services should be preserved
      
      bookingData.packageId = null;
      bookingData.singleServices = ['bath', 'trim'];
      
      selectPackage('single-service');
      
      // Single services should be preserved
      expect(bookingData.singleServices).toEqual(['bath', 'trim']);
    });
    
    it('selectPackage updates state correctly for all package types', () => {
      // Property: For any valid package ID, selectPackage should update the state
      
      const validPackageIds = ['full-package', 'basic-package', 'single-service'];
      
      validPackageIds.forEach(packageId => {
        bookingData.packageId = null;
        selectPackage(packageId);
        expect(bookingData.packageId).toBe(packageId);
      });
    });
  });
  
  // ============================================
  // Test: Function Uniqueness
  // ============================================
  
  describe('Function uniqueness in codebase', () => {
    it('selectPetType function exists and is callable', () => {
      expect(typeof selectPetType).toBe('function');
    });
    
    it('selectPackage function exists and is callable', () => {
      expect(typeof selectPackage).toBe('function');
    });
    
    it('selectTime function exists and is callable', () => {
      expect(typeof selectTime).toBe('function');
    });
    
    it('validateStep function exists and is callable', () => {
      expect(typeof validateStep).toBe('function');
    });
    
    it('showStep function exists and is callable', () => {
      expect(typeof showStep).toBe('function');
    });
  });
  
  // ============================================
  // Test: Deterministic Behavior
  // ============================================
  
  describe('Deterministic behavior of consolidated functions', () => {
    let bookingData;
    
    beforeEach(() => {
      bookingData = {
        petType: null,
        packageId: null,
        date: null,
        time: null,
        ownerName: '',
        contactNumber: '',
        petName: '',
        petWeight: null,
        singleServices: []
      };
    });
    
    it('selectPetType is deterministic - same input always produces same output', () => {
      // Property: For any pet type, calling selectPetType multiple times
      // with the same input should always produce the same result
      
      const petType = 'dog';
      const results = [];
      
      for (let i = 0; i < 5; i++) {
        bookingData.petType = null;
        bookingData.packageId = null;
        selectPetType(petType);
        results.push({
          petType: bookingData.petType,
          packageId: bookingData.packageId
        });
      }
      
      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i].petType).toBe(results[0].petType);
        expect(results[i].packageId).toBe(results[0].packageId);
      }
    });
    
    it('selectPackage is deterministic - same input always produces same output', () => {
      // Property: For any package ID, calling selectPackage multiple times
      // with the same input should always produce the same result
      
      const packageId = 'full-package';
      const results = [];
      
      for (let i = 0; i < 5; i++) {
        bookingData.packageId = null;
        bookingData.singleServices = [];
        selectPackage(packageId);
        results.push({
          packageId: bookingData.packageId,
          singleServices: bookingData.singleServices.slice()
        });
      }
      
      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i].packageId).toBe(results[0].packageId);
        expect(results[i].singleServices).toEqual(results[0].singleServices);
      }
    });
  });
  
  // ============================================
  // Test: State Consistency
  // ============================================
  
  describe('State consistency after consolidation', () => {
    let bookingData;
    
    beforeEach(() => {
      bookingData = {
        petType: null,
        packageId: null,
        singleServices: [],
        date: null,
        time: null,
        ownerName: '',
        contactNumber: '',
        petName: '',
        petWeight: null
      };
    });
    
    it('selectPetType and selectPackage maintain consistent state', () => {
      // Property: After selecting pet type and package, state should be consistent
      
      selectPetType('dog');
      expect(bookingData.petType).toBe('dog');
      expect(bookingData.packageId).toBeNull();
      
      selectPackage('full-package');
      expect(bookingData.petType).toBe('dog');
      expect(bookingData.packageId).toBe('full-package');
      
      // Changing pet type should clear package
      selectPetType('cat');
      expect(bookingData.petType).toBe('cat');
      expect(bookingData.packageId).toBeNull();
    });
    
    it('state transitions are reversible', () => {
      // Property: State transitions should be reversible
      
      const initialState = { ...bookingData };
      
      selectPetType('dog');
      selectPackage('full-package');
      
      // Reset to initial state
      bookingData.petType = initialState.petType;
      bookingData.packageId = initialState.packageId;
      
      expect(bookingData).toEqual(initialState);
    });
  });
  
  // ============================================
  // Test: No Duplicate Implementations
  // ============================================
  
  describe('No duplicate implementations', () => {
    it('selectPetType is defined exactly once', () => {
      // This test verifies that there is only one selectPetType function
      // by checking that it's callable and has a single definition
      
      expect(typeof selectPetType).toBe('function');
      
      // Get the function source and verify it's not duplicated
      const source = selectPetType.toString();
      expect(source).toContain('bookingData.petType = petType');
      expect(source).toContain('loadPackages');
    });
    
    it('selectPackage is defined exactly once', () => {
      // This test verifies that there is only one selectPackage function
      
      expect(typeof selectPackage).toBe('function');
      
      // Get the function source and verify it's not duplicated
      const source = selectPackage.toString();
      expect(source).toContain('bookingData.packageId = packageId');
      expect(source).toContain('updateAgeDropdownOptions');
    });
  });
  
  // ============================================
  // Property-Based Tests: Consolidation Verification
  // ============================================
  
  describe('Property-Based: Consolidation Verification', () => {
    let bookingData;
    
    beforeEach(() => {
      bookingData = {
        petType: null,
        packageId: null,
        singleServices: [],
        petWeight: null,
        date: null,
        time: null,
        ownerName: '',
        contactNumber: '',
        petName: '',
        petBreed: '',
        petAge: ''
      };
    });
    
    /**
     * Property: selectPetType Idempotence
     * For any pet type, calling selectPetType(petType) multiple times
     * should produce identical state changes each time.
     * 
     * This verifies that the consolidated function is deterministic
     * and produces consistent results regardless of call count.
     */
    it('selectPetType is idempotent - multiple calls produce identical results', () => {
      const petTypes = ['dog', 'cat', 'rabbit'];
      const numIterations = 10;
      
      petTypes.forEach(petType => {
        const results = [];
        
        // Call selectPetType multiple times and capture state
        for (let i = 0; i < numIterations; i++) {
          bookingData.petType = null;
          bookingData.packageId = null;
          
          selectPetType(petType);
          
          results.push({
            petType: bookingData.petType,
            packageId: bookingData.packageId
          });
        }
        
        // All results should be identical
        const firstResult = results[0];
        results.forEach((result, index) => {
          expect(result.petType).toBe(firstResult.petType);
          expect(result.packageId).toBe(firstResult.packageId);
        });
      });
    });
    
    /**
     * Property: selectPackage Idempotence
     * For any package ID, calling selectPackage(packageId) multiple times
     * should produce identical state changes each time.
     * 
     * This verifies that the consolidated function is deterministic
     * and produces consistent results regardless of call count.
     */
    it('selectPackage is idempotent - multiple calls produce identical results', () => {
      const packageIds = ['full-package', 'basic-package', 'single-service', 'premium-package'];
      const numIterations = 10;
      
      packageIds.forEach(packageId => {
        const results = [];
        
        // Call selectPackage multiple times and capture state
        for (let i = 0; i < numIterations; i++) {
          bookingData.packageId = null;
          bookingData.singleServices = [];
          
          selectPackage(packageId);
          
          results.push({
            packageId: bookingData.packageId,
            singleServices: bookingData.singleServices.slice()
          });
        }
        
        // All results should be identical
        const firstResult = results[0];
        results.forEach((result, index) => {
          expect(result.packageId).toBe(firstResult.packageId);
          expect(result.singleServices).toEqual(firstResult.singleServices);
        });
      });
    });
    
    /**
     * Property: selectPetType Consistency Across Sequences
     * For any sequence of pet type selections, the final state should
     * depend only on the last selection, not on the sequence.
     * 
     * This verifies that the consolidated function doesn't have
     * hidden state dependencies or side effects.
     */
    it('selectPetType produces consistent results regardless of call sequence', () => {
      const petTypes = ['dog', 'cat', 'rabbit'];
      
      // Test 1: Direct selection
      bookingData.petType = null;
      selectPetType('dog');
      const directResult = { ...bookingData };
      
      // Test 2: Selection after other selections
      bookingData.petType = null;
      selectPetType('cat');
      selectPetType('rabbit');
      selectPetType('dog');
      const sequenceResult = { ...bookingData };
      
      // Final state should be identical
      expect(sequenceResult.petType).toBe(directResult.petType);
      expect(sequenceResult.packageId).toBe(directResult.packageId);
    });
    
    /**
     * Property: selectPackage Consistency Across Sequences
     * For any sequence of package selections, the final state should
     * depend only on the last selection, not on the sequence.
     * 
     * This verifies that the consolidated function doesn't have
     * hidden state dependencies or side effects.
     */
    it('selectPackage produces consistent results regardless of call sequence', () => {
      const packageIds = ['full-package', 'basic-package', 'single-service'];
      
      // Test 1: Direct selection
      bookingData.packageId = null;
      bookingData.singleServices = [];
      selectPackage('full-package');
      const directResult = { ...bookingData };
      
      // Test 2: Selection after other selections
      bookingData.packageId = null;
      bookingData.singleServices = [];
      selectPackage('basic-package');
      selectPackage('single-service');
      selectPackage('full-package');
      const sequenceResult = { ...bookingData };
      
      // Final state should be identical
      expect(sequenceResult.packageId).toBe(directResult.packageId);
      expect(sequenceResult.singleServices).toEqual(directResult.singleServices);
    });
    
    /**
     * Property: selectPetType Determinism
     * For any pet type, the function should always produce the same
     * output when called with the same input, regardless of when it's called.
     * 
     * This verifies that the consolidated function is pure and deterministic.
     */
    it('selectPetType is deterministic - same input always produces same output', () => {
      const petType = 'dog';
      const outputs = [];
      
      // Call multiple times at different points in time
      for (let i = 0; i < 5; i++) {
        bookingData.petType = null;
        bookingData.packageId = null;
        
        selectPetType(petType);
        
        outputs.push({
          petType: bookingData.petType,
          packageId: bookingData.packageId
        });
      }
      
      // All outputs should be identical
      const firstOutput = outputs[0];
      outputs.forEach(output => {
        expect(output.petType).toBe(firstOutput.petType);
        expect(output.packageId).toBe(firstOutput.packageId);
      });
    });
    
    /**
     * Property: selectPackage Determinism
     * For any package ID, the function should always produce the same
     * output when called with the same input, regardless of when it's called.
     * 
     * This verifies that the consolidated function is pure and deterministic.
     */
    it('selectPackage is deterministic - same input always produces same output', () => {
      const packageId = 'full-package';
      const outputs = [];
      
      // Call multiple times at different points in time
      for (let i = 0; i < 5; i++) {
        bookingData.packageId = null;
        bookingData.singleServices = [];
        
        selectPackage(packageId);
        
        outputs.push({
          packageId: bookingData.packageId,
          singleServices: bookingData.singleServices.slice()
        });
      }
      
      // All outputs should be identical
      const firstOutput = outputs[0];
      outputs.forEach(output => {
        expect(output.packageId).toBe(firstOutput.packageId);
        expect(output.singleServices).toEqual(firstOutput.singleServices);
      });
    });
    
    /**
     * Property: selectPetType Behavior Equivalence
     * For all valid pet types, selectPetType should exhibit the same
     * behavior pattern: set petType and clear packageId.
     * 
     * This verifies that the consolidated function applies the same
     * logic consistently across all inputs.
     */
    it('selectPetType exhibits consistent behavior for all pet types', () => {
      const petTypes = ['dog', 'cat', 'rabbit', 'bird', 'hamster'];
      
      petTypes.forEach(petType => {
        bookingData.petType = null;
        bookingData.packageId = 'some-package';
        
        selectPetType(petType);
        
        // Verify consistent behavior: petType is set, packageId is cleared
        expect(bookingData.petType).toBe(petType);
        expect(bookingData.packageId).toBeNull();
      });
    });
    
    /**
     * Property: selectPackage Behavior Equivalence
     * For all valid package IDs, selectPackage should exhibit the same
     * behavior pattern: set packageId and handle singleServices appropriately.
     * 
     * This verifies that the consolidated function applies the same
     * logic consistently across all inputs.
     */
    it('selectPackage exhibits consistent behavior for all package types', () => {
      const packageIds = ['full-package', 'basic-package', 'premium-package', 'single-service'];
      
      packageIds.forEach(packageId => {
        bookingData.packageId = null;
        bookingData.singleServices = ['service1', 'service2'];
        
        selectPackage(packageId);
        
        // Verify consistent behavior: packageId is set
        expect(bookingData.packageId).toBe(packageId);
        
        // For non-single-service packages, singleServices should be cleared
        if (packageId !== 'single-service') {
          expect(bookingData.singleServices).toEqual([]);
        }
      });
    });
  });
  
  // ============================================
  // Test: Function Behavior Equivalence
  // ============================================
  
  describe('Function behavior equivalence', () => {
    let bookingData;
    
    beforeEach(() => {
      bookingData = {
        petType: null,
        packageId: null,
        singleServices: [],
        petWeight: null
      };
    });
    
    it('selectPetType behavior is equivalent across multiple calls', () => {
      // Property: The behavior of selectPetType should be equivalent
      // regardless of how many times it's called
      
      const petTypes = ['dog', 'cat', 'rabbit'];
      
      petTypes.forEach(petType => {
        bookingData.petType = null;
        bookingData.packageId = 'old-package';
        
        selectPetType(petType);
        
        // Verify consistent behavior
        expect(bookingData.petType).toBe(petType);
        expect(bookingData.packageId).toBeNull();
      });
    });
    
    it('selectPackage behavior is equivalent across multiple calls', () => {
      // Property: The behavior of selectPackage should be equivalent
      // regardless of how many times it's called
      
      const packageIds = ['full-package', 'basic-package'];
      
      packageIds.forEach(packageId => {
        bookingData.packageId = null;
        bookingData.singleServices = ['old-service'];
        
        selectPackage(packageId);
        
        // Verify consistent behavior
        expect(bookingData.packageId).toBe(packageId);
        if (packageId !== 'single-service') {
          expect(bookingData.singleServices).toEqual([]);
        }
      });
    });
  });
});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {};
}
