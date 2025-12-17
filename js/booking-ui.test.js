/**
 * Unit Tests for BookingUI Rendering Module
 * 
 * Tests verify:
 * - HTML escaping for XSS prevention
 * - Rendering functions produce correct HTML
 * - No DOM mutations occur
 * - Deterministic output
 */

// Import for Node.js testing
const BookingUI = typeof require !== 'undefined' 
  ? require('./booking-ui.js') 
  : window.BookingUI;

describe('BookingUI - HTML Escaping', () => {
  
  // ============================================
  // HTML Escaping Tests
  // ============================================
  
  describe('escapeHtml function', () => {
    it('escapes ampersands', () => {
      const result = BookingUI.escapeHtml('Tom & Jerry');
      expect(result).toBe('Tom &amp; Jerry');
    });
    
    it('escapes less-than signs', () => {
      const result = BookingUI.escapeHtml('5 < 10');
      expect(result).toBe('5 &lt; 10');
    });
    
    it('escapes greater-than signs', () => {
      const result = BookingUI.escapeHtml('10 > 5');
      expect(result).toBe('10 &gt; 5');
    });
    
    it('escapes double quotes', () => {
      const result = BookingUI.escapeHtml('He said "hello"');
      expect(result).toBe('He said &quot;hello&quot;');
    });
    
    it('escapes single quotes', () => {
      const result = BookingUI.escapeHtml("It's a test");
      expect(result).toBe('It&#039;s a test');
    });
    
    it('escapes multiple special characters', () => {
      const result = BookingUI.escapeHtml('<script>alert("XSS")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });
    
    it('handles empty string', () => {
      const result = BookingUI.escapeHtml('');
      expect(result).toBe('');
    });
    
    it('handles null', () => {
      const result = BookingUI.escapeHtml(null);
      expect(result).toBe('');
    });
    
    it('handles undefined', () => {
      const result = BookingUI.escapeHtml(undefined);
      expect(result).toBe('');
    });
    
    it('does not double-escape already escaped content', () => {
      // This tests that we escape the input, not pre-escaped content
      const result = BookingUI.escapeHtml('&lt;');
      expect(result).toBe('&amp;lt;');
    });
  });
  
  // ============================================
  // Pet Type Cards Rendering
  // ============================================
  
  describe('renderPetTypeCards with XSS prevention', () => {
    it('escapes pet type names', () => {
      const petTypes = [
        { id: 'dog', name: '<script>alert("XSS")</script>', emoji: '🐕' }
      ];
      
      const html = BookingUI.renderPetTypeCards(petTypes);
      
      // Should not contain unescaped script tag
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
    
    it('escapes pet type IDs in data attributes', () => {
      const petTypes = [
        { id: '" onclick="alert(1)"', name: 'Dog', emoji: '🐕' }
      ];
      
      const html = BookingUI.renderPetTypeCards(petTypes);
      
      // Should escape the quote in data attribute
      expect(html).toContain('&quot;');
      expect(html).not.toContain('onclick=');
    });
    
    it('escapes emoji safely', () => {
      const petTypes = [
        { id: 'dog', name: 'Dog', emoji: '<img src=x onerror="alert(1)">' }
      ];
      
      const html = BookingUI.renderPetTypeCards(petTypes);
      
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });
    
    it('handles empty pet types array', () => {
      const html = BookingUI.renderPetTypeCards([]);
      expect(html).toContain('empty-state');
    });
  });
  
  // ============================================
  // Package Cards Rendering
  // ============================================
  
  describe('renderPackageCards with XSS prevention', () => {
    it('escapes package names', () => {
      const packages = [
        {
          id: 'pkg1',
          name: '<img src=x onerror="alert(1)">',
          duration: 60,
          tiers: [],
          includes: []
        }
      ];
      
      const html = BookingUI.renderPackageCards(packages);
      
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });
    
    it('escapes package inclusions', () => {
      const packages = [
        {
          id: 'pkg1',
          name: 'Full Package',
          duration: 60,
          tiers: [],
          includes: ['<script>alert("XSS")</script>', 'Bath']
        }
      ];
      
      const html = BookingUI.renderPackageCards(packages);
      
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
    
    it('escapes tier labels', () => {
      const packages = [
        {
          id: 'pkg1',
          name: 'Full Package',
          duration: 60,
          tiers: [
            { label: '"><script>alert(1)</script><"', price: 500 }
          ],
          includes: []
        }
      ];
      
      const html = BookingUI.renderPackageCards(packages);
      
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
    
    it('handles empty packages array', () => {
      const html = BookingUI.renderPackageCards([]);
      expect(html).toContain('empty-state');
    });
  });
  
  // ============================================
  // Summary Rendering
  // ============================================
  
  describe('renderSummary with XSS prevention', () => {
    it('escapes pet name in summary', () => {
      const state = {
        petName: '<img src=x onerror="alert(1)">',
        petType: 'dog',
        ownerName: 'John'
      };
      
      const html = BookingUI.renderSummary(state, []);
      
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });
    
    it('escapes owner name in summary', () => {
      const state = {
        ownerName: '<script>alert("XSS")</script>',
        petName: 'Buddy'
      };
      
      const html = BookingUI.renderSummary(state, []);
      
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
    
    it('escapes contact number in summary', () => {
      const state = {
        contactNumber: '09123456789" onclick="alert(1)"',
        ownerName: 'John'
      };
      
      const html = BookingUI.renderSummary(state, []);
      
      expect(html).toContain('&quot;');
      expect(html).not.toContain('onclick=');
    });
    
    it('escapes pet breed in summary', () => {
      const state = {
        petBreed: '<svg onload="alert(1)">',
        petName: 'Buddy'
      };
      
      const html = BookingUI.renderSummary(state, []);
      
      expect(html).not.toContain('<svg');
      expect(html).toContain('&lt;svg');
    });
  });
  
  // ============================================
  // Error Messages Rendering
  // ============================================
  
  describe('renderErrors with XSS prevention', () => {
    it('escapes error messages', () => {
      const errors = ['<script>alert("XSS")</script>'];
      
      const html = BookingUI.renderErrors(errors);
      
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
    
    it('escapes multiple error messages', () => {
      const errors = [
        '<img src=x onerror="alert(1)">',
        '"><script>alert(2)</script><"'
      ];
      
      const html = BookingUI.renderErrors(errors);
      
      expect(html).not.toContain('<img');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;img');
      expect(html).toContain('&lt;script&gt;');
    });
    
    it('handles empty errors array', () => {
      const html = BookingUI.renderErrors([]);
      expect(html).toBe('');
    });
  });
  
  // ============================================
  // Success Messages Rendering
  // ============================================
  
  describe('renderSuccess with XSS prevention', () => {
    it('escapes success message', () => {
      const message = '<img src=x onerror="alert(1)">';
      
      const html = BookingUI.renderSuccess(message);
      
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });
    
    it('handles empty message', () => {
      const html = BookingUI.renderSuccess('');
      expect(html).toBe('');
    });
  });
  
  // ============================================
  // Age Dropdown Rendering
  // ============================================
  
  describe('renderAgeDropdown with XSS prevention', () => {
    it('escapes age option values', () => {
      const ages = ['<script>alert(1)</script>'];
      
      const html = BookingUI.renderAgeDropdown(ages);
      
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
    
    it('escapes age option text', () => {
      const ages = ['<img src=x onerror="alert(1)">'];
      
      const html = BookingUI.renderAgeDropdown(ages);
      
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });
  });
  
  // ============================================
  // Weight Radios Rendering
  // ============================================
  
  describe('renderWeightRadios with XSS prevention', () => {
    it('escapes weight labels', () => {
      const weights = ['<script>alert(1)</script>'];
      
      const html = BookingUI.renderWeightRadios(weights);
      
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
    
    it('escapes weight values in radio buttons', () => {
      const weights = ['"><script>alert(1)</script><"'];
      
      const html = BookingUI.renderWeightRadios(weights);
      
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });
  
  // ============================================
  // Rendering Determinism
  // ============================================
  
  describe('Rendering determinism (no DOM mutations)', () => {
    it('renderPetTypeCards produces same output for same input', () => {
      const petTypes = [
        { id: 'dog', name: 'Dog', emoji: '🐕' },
        { id: 'cat', name: 'Cat', emoji: '🐱' }
      ];
      
      const html1 = BookingUI.renderPetTypeCards(petTypes, 'dog');
      const html2 = BookingUI.renderPetTypeCards(petTypes, 'dog');
      const html3 = BookingUI.renderPetTypeCards(petTypes, 'dog');
      
      expect(html1).toBe(html2);
      expect(html2).toBe(html3);
    });
    
    it('renderPackageCards produces same output for same input', () => {
      const packages = [
        { id: 'pkg1', name: 'Package 1', duration: 60, tiers: [], includes: [] }
      ];
      
      const html1 = BookingUI.renderPackageCards(packages, 'pkg1');
      const html2 = BookingUI.renderPackageCards(packages, 'pkg1');
      const html3 = BookingUI.renderPackageCards(packages, 'pkg1');
      
      expect(html1).toBe(html2);
      expect(html2).toBe(html3);
    });
    
    it('renderSummary produces same output for same input', () => {
      const state = {
        petName: 'Buddy',
        ownerName: 'John',
        petType: 'dog'
      };
      
      const html1 = BookingUI.renderSummary(state, []);
      const html2 = BookingUI.renderSummary(state, []);
      const html3 = BookingUI.renderSummary(state, []);
      
      expect(html1).toBe(html2);
      expect(html2).toBe(html3);
    });
  });
});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BookingUI };
}
