/**
 * Tests for Pagination Utilities
 * 
 * Tests verify:
 * - calculateTotalPages works with various booking counts and page sizes
 * - calculateStartIndex and calculateEndIndex produce correct slice boundaries
 * - Edge cases are handled gracefully (0 bookings, invalid inputs)
 * - All functions have NO DOM dependencies
 * 
 * Requirements: 6.1, 6.2
 */

const PaginationUtils = typeof require !== 'undefined'
  ? require('./pagination-utils.js')
  : window.PaginationUtils;

describe('Pagination Utilities', () => {
  
  // ============================================
  // calculateTotalPages Tests
  // ============================================
  
  describe('calculateTotalPages', () => {
    it('returns 1 for 0 bookings', () => {
      const result = PaginationUtils.calculateTotalPages(0, 10);
      expect(result).toBe(1);
    });

    it('returns 1 for bookings less than page size', () => {
      const result = PaginationUtils.calculateTotalPages(5, 10);
      expect(result).toBe(1);
    });

    it('returns 1 for bookings equal to page size', () => {
      const result = PaginationUtils.calculateTotalPages(10, 10);
      expect(result).toBe(1);
    });

    it('returns 2 for bookings slightly more than page size', () => {
      const result = PaginationUtils.calculateTotalPages(11, 10);
      expect(result).toBe(2);
    });

    it('returns correct pages for 100 bookings with 10 per page', () => {
      const result = PaginationUtils.calculateTotalPages(100, 10);
      expect(result).toBe(10);
    });

    it('returns correct pages for 247 bookings with 10 per page', () => {
      const result = PaginationUtils.calculateTotalPages(247, 10);
      expect(result).toBe(25);
    });

    it('returns correct pages for 1000 bookings with 10 per page', () => {
      const result = PaginationUtils.calculateTotalPages(1000, 10);
      expect(result).toBe(100);
    });

    it('returns correct pages for 10000 bookings with 10 per page', () => {
      const result = PaginationUtils.calculateTotalPages(10000, 10);
      expect(result).toBe(1000);
    });

    it('returns correct pages with page size 3', () => {
      const result = PaginationUtils.calculateTotalPages(10, 3);
      expect(result).toBe(4);
    });

    it('returns correct pages with page size 5', () => {
      const result = PaginationUtils.calculateTotalPages(100, 5);
      expect(result).toBe(20);
    });

    it('returns correct pages with page size 20', () => {
      const result = PaginationUtils.calculateTotalPages(100, 20);
      expect(result).toBe(5);
    });

    it('handles single booking', () => {
      const result = PaginationUtils.calculateTotalPages(1, 10);
      expect(result).toBe(1);
    });

    it('returns 1 for invalid totalBookings (negative)', () => {
      const result = PaginationUtils.calculateTotalPages(-5, 10);
      expect(result).toBe(1);
    });

    it('returns 1 for invalid pageSize (zero)', () => {
      const result = PaginationUtils.calculateTotalPages(100, 0);
      expect(result).toBe(1);
    });

    it('returns 1 for invalid pageSize (negative)', () => {
      const result = PaginationUtils.calculateTotalPages(100, -5);
      expect(result).toBe(1);
    });

    it('returns 1 for non-numeric totalBookings', () => {
      const result = PaginationUtils.calculateTotalPages('100', 10);
      expect(result).toBe(1);
    });

    it('returns 1 for non-numeric pageSize', () => {
      const result = PaginationUtils.calculateTotalPages(100, '10');
      expect(result).toBe(1);
    });
  });

  // ============================================
  // calculateStartIndex Tests
  // ============================================
  
  describe('calculateStartIndex', () => {
    it('returns 0 for page 1', () => {
      const result = PaginationUtils.calculateStartIndex(1, 10);
      expect(result).toBe(0);
    });

    it('returns 10 for page 2 with page size 10', () => {
      const result = PaginationUtils.calculateStartIndex(2, 10);
      expect(result).toBe(10);
    });

    it('returns 20 for page 3 with page size 10', () => {
      const result = PaginationUtils.calculateStartIndex(3, 10);
      expect(result).toBe(20);
    });

    it('returns 100 for page 11 with page size 10', () => {
      const result = PaginationUtils.calculateStartIndex(11, 10);
      expect(result).toBe(100);
    });

    it('returns 0 for page 1 with page size 5', () => {
      const result = PaginationUtils.calculateStartIndex(1, 5);
      expect(result).toBe(0);
    });

    it('returns 5 for page 2 with page size 5', () => {
      const result = PaginationUtils.calculateStartIndex(2, 5);
      expect(result).toBe(5);
    });

    it('returns 0 for page 1 with page size 20', () => {
      const result = PaginationUtils.calculateStartIndex(1, 20);
      expect(result).toBe(0);
    });

    it('returns 20 for page 2 with page size 20', () => {
      const result = PaginationUtils.calculateStartIndex(2, 20);
      expect(result).toBe(20);
    });

    it('returns 0 for page 1 with page size 3', () => {
      const result = PaginationUtils.calculateStartIndex(1, 3);
      expect(result).toBe(0);
    });

    it('returns 3 for page 2 with page size 3', () => {
      const result = PaginationUtils.calculateStartIndex(2, 3);
      expect(result).toBe(3);
    });

    it('returns 0 for invalid page (zero)', () => {
      const result = PaginationUtils.calculateStartIndex(0, 10);
      expect(result).toBe(0);
    });

    it('returns 0 for invalid page (negative)', () => {
      const result = PaginationUtils.calculateStartIndex(-1, 10);
      expect(result).toBe(0);
    });

    it('returns 0 for invalid pageSize (zero)', () => {
      const result = PaginationUtils.calculateStartIndex(2, 0);
      expect(result).toBe(0);
    });

    it('returns 0 for invalid pageSize (negative)', () => {
      const result = PaginationUtils.calculateStartIndex(2, -5);
      expect(result).toBe(0);
    });

    it('returns 0 for non-numeric page', () => {
      const result = PaginationUtils.calculateStartIndex('2', 10);
      expect(result).toBe(0);
    });

    it('returns 0 for non-numeric pageSize', () => {
      const result = PaginationUtils.calculateStartIndex(2, '10');
      expect(result).toBe(0);
    });
  });

  // ============================================
  // calculateEndIndex Tests
  // ============================================
  
  describe('calculateEndIndex', () => {
    it('returns 10 for start 0 and page size 10', () => {
      const result = PaginationUtils.calculateEndIndex(0, 10);
      expect(result).toBe(10);
    });

    it('returns 20 for start 10 and page size 10', () => {
      const result = PaginationUtils.calculateEndIndex(10, 10);
      expect(result).toBe(20);
    });

    it('returns 30 for start 20 and page size 10', () => {
      const result = PaginationUtils.calculateEndIndex(20, 10);
      expect(result).toBe(30);
    });

    it('returns 5 for start 0 and page size 5', () => {
      const result = PaginationUtils.calculateEndIndex(0, 5);
      expect(result).toBe(5);
    });

    it('returns 10 for start 5 and page size 5', () => {
      const result = PaginationUtils.calculateEndIndex(5, 5);
      expect(result).toBe(10);
    });

    it('returns 20 for start 0 and page size 20', () => {
      const result = PaginationUtils.calculateEndIndex(0, 20);
      expect(result).toBe(20);
    });

    it('returns 40 for start 20 and page size 20', () => {
      const result = PaginationUtils.calculateEndIndex(20, 20);
      expect(result).toBe(40);
    });

    it('returns 3 for start 0 and page size 3', () => {
      const result = PaginationUtils.calculateEndIndex(0, 3);
      expect(result).toBe(3);
    });

    it('returns 6 for start 3 and page size 3', () => {
      const result = PaginationUtils.calculateEndIndex(3, 3);
      expect(result).toBe(6);
    });

    it('returns 110 for start 100 and page size 10', () => {
      const result = PaginationUtils.calculateEndIndex(100, 10);
      expect(result).toBe(110);
    });

    it('returns pageSize for invalid startIndex (negative)', () => {
      const result = PaginationUtils.calculateEndIndex(-5, 10);
      expect(result).toBe(10);
    });

    it('returns startIndex for invalid pageSize (zero)', () => {
      const result = PaginationUtils.calculateEndIndex(10, 0);
      expect(result).toBe(10);
    });

    it('returns startIndex for invalid pageSize (negative)', () => {
      const result = PaginationUtils.calculateEndIndex(10, -5);
      expect(result).toBe(10);
    });

    it('returns pageSize for non-numeric startIndex', () => {
      const result = PaginationUtils.calculateEndIndex('10', 10);
      expect(result).toBe(10);
    });

    it('returns startIndex for non-numeric pageSize', () => {
      const result = PaginationUtils.calculateEndIndex(10, '10');
      expect(result).toBe(10);
    });
  });

  // ============================================
  // Integration Tests - Slice Boundaries
  // ============================================
  
  describe('Slice Boundary Correctness', () => {
    it('page 1 with 10 items per page slices correctly', () => {
      const start = PaginationUtils.calculateStartIndex(1, 10);
      const end = PaginationUtils.calculateEndIndex(start, 10);
      expect(start).toBe(0);
      expect(end).toBe(10);
    });

    it('page 2 with 10 items per page slices correctly', () => {
      const start = PaginationUtils.calculateStartIndex(2, 10);
      const end = PaginationUtils.calculateEndIndex(start, 10);
      expect(start).toBe(10);
      expect(end).toBe(20);
    });

    it('page 3 with 10 items per page slices correctly', () => {
      const start = PaginationUtils.calculateStartIndex(3, 10);
      const end = PaginationUtils.calculateEndIndex(start, 10);
      expect(start).toBe(20);
      expect(end).toBe(30);
    });

    it('page 1 with 5 items per page slices correctly', () => {
      const start = PaginationUtils.calculateStartIndex(1, 5);
      const end = PaginationUtils.calculateEndIndex(start, 5);
      expect(start).toBe(0);
      expect(end).toBe(5);
    });

    it('page 2 with 5 items per page slices correctly', () => {
      const start = PaginationUtils.calculateStartIndex(2, 5);
      const end = PaginationUtils.calculateEndIndex(start, 5);
      expect(start).toBe(5);
      expect(end).toBe(10);
    });

    it('page 1 with 20 items per page slices correctly', () => {
      const start = PaginationUtils.calculateStartIndex(1, 20);
      const end = PaginationUtils.calculateEndIndex(start, 20);
      expect(start).toBe(0);
      expect(end).toBe(20);
    });

    it('page 2 with 20 items per page slices correctly', () => {
      const start = PaginationUtils.calculateStartIndex(2, 20);
      const end = PaginationUtils.calculateEndIndex(start, 20);
      expect(start).toBe(20);
      expect(end).toBe(40);
    });

    it('no overlap between consecutive pages', () => {
      const page1Start = PaginationUtils.calculateStartIndex(1, 10);
      const page1End = PaginationUtils.calculateEndIndex(page1Start, 10);
      const page2Start = PaginationUtils.calculateStartIndex(2, 10);
      const page2End = PaginationUtils.calculateEndIndex(page2Start, 10);
      
      expect(page1End).toBe(page2Start);
    });

    it('no gaps between consecutive pages', () => {
      const page2Start = PaginationUtils.calculateStartIndex(2, 10);
      const page2End = PaginationUtils.calculateEndIndex(page2Start, 10);
      const page3Start = PaginationUtils.calculateStartIndex(3, 10);
      
      expect(page2End).toBe(page3Start);
    });
  });

  // ============================================
  // Edge Case Tests
  // ============================================
  
  describe('Edge Cases', () => {
    it('handles 0 bookings correctly', () => {
      const totalPages = PaginationUtils.calculateTotalPages(0, 10);
      expect(totalPages).toBe(1);
    });

    it('handles 1 booking correctly', () => {
      const totalPages = PaginationUtils.calculateTotalPages(1, 10);
      expect(totalPages).toBe(1);
    });

    it('handles exactly pageSize bookings', () => {
      const totalPages = PaginationUtils.calculateTotalPages(10, 10);
      expect(totalPages).toBe(1);
    });

    it('handles large dataset (10000 bookings)', () => {
      const totalPages = PaginationUtils.calculateTotalPages(10000, 10);
      expect(totalPages).toBe(1000);
    });

    it('handles very small page size (3)', () => {
      const totalPages = PaginationUtils.calculateTotalPages(100, 3);
      expect(totalPages).toBe(34);
    });

    it('handles large page size (1000)', () => {
      const totalPages = PaginationUtils.calculateTotalPages(10000, 1000);
      expect(totalPages).toBe(10);
    });
  });
});
