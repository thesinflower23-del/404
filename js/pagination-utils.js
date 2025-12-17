/**
 * Pagination Utilities
 * 
 * Core pagination calculation functions for admin booking history
 * These functions are pure and have no side effects or DOM dependencies
 */

const PaginationUtils = (() => {
  /**
   * Calculate total number of pages
   * 
   * @param {number} totalBookings - Total number of bookings
   * @param {number} pageSize - Number of items per page
   * @returns {number} Total number of pages
   * 
   * Requirements: 3.1, 4.1, 6.1, 6.2
   */
  function calculateTotalPages(totalBookings, pageSize) {
    // Validate inputs
    if (typeof totalBookings !== 'number' || totalBookings < 0) {
      console.warn('calculateTotalPages: totalBookings must be a non-negative number');
      return 1;
    }
    if (typeof pageSize !== 'number' || pageSize <= 0) {
      console.warn('calculateTotalPages: pageSize must be a positive number');
      return 1;
    }

    // Handle edge case: 0 bookings
    if (totalBookings === 0) {
      return 1;
    }

    // Calculate total pages: ceil(totalBookings / pageSize)
    return Math.ceil(totalBookings / pageSize);
  }

  /**
   * Calculate start index for pagination slice
   * 
   * @param {number} page - Current page number (1-indexed)
   * @param {number} pageSize - Number of items per page
   * @returns {number} Start index for array slice (0-indexed)
   * 
   * Requirements: 3.1, 4.1, 6.1, 6.2
   */
  function calculateStartIndex(page, pageSize) {
    // Validate inputs
    if (typeof page !== 'number' || page < 1) {
      console.warn('calculateStartIndex: page must be a positive number (1-indexed)');
      return 0;
    }
    if (typeof pageSize !== 'number' || pageSize <= 0) {
      console.warn('calculateStartIndex: pageSize must be a positive number');
      return 0;
    }

    // Calculate start index: (page - 1) * pageSize
    return (page - 1) * pageSize;
  }

  /**
   * Calculate end index for pagination slice
   * 
   * @param {number} startIndex - Start index (0-indexed)
   * @param {number} pageSize - Number of items per page
   * @returns {number} End index for array slice (exclusive, 0-indexed)
   * 
   * Requirements: 3.1, 4.1, 6.1, 6.2
   */
  function calculateEndIndex(startIndex, pageSize) {
    // Validate inputs
    if (typeof startIndex !== 'number' || startIndex < 0) {
      console.warn('calculateEndIndex: startIndex must be a non-negative number');
      return pageSize;
    }
    if (typeof pageSize !== 'number' || pageSize <= 0) {
      console.warn('calculateEndIndex: pageSize must be a positive number');
      return startIndex;
    }

    // Calculate end index: startIndex + pageSize
    return startIndex + pageSize;
  }

  /**
   * Sort bookings by specified field and order
   * 
   * @param {Array} bookings - Array of booking objects
   * @param {string} sortBy - Field to sort by: 'date', 'status', 'customer', 'amount'
   * @param {string} sortOrder - Sort direction: 'asc' (ascending), 'desc' (descending)
   * @returns {Array} New sorted array (does not mutate original)
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  function sortBookings(bookings, sortBy, sortOrder) {
    // Validate inputs
    if (!Array.isArray(bookings)) {
      console.warn('sortBookings: bookings must be an array');
      return [];
    }

    if (typeof sortBy !== 'string') {
      console.warn('sortBookings: sortBy must be a string');
      return [...bookings];
    }

    if (typeof sortOrder !== 'string' || !['asc', 'desc'].includes(sortOrder)) {
      console.warn('sortBookings: sortOrder must be "asc" or "desc"');
      return [...bookings];
    }

    // Create a copy to avoid mutating the original array
    const sorted = [...bookings];

    // Define sort comparators for each field
    const comparators = {
      date: (a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB;
      },
      status: (a, b) => {
        const statusA = (a.status || '').toString().toLowerCase();
        const statusB = (b.status || '').toString().toLowerCase();
        return statusA.localeCompare(statusB);
      },
      customer: (a, b) => {
        const customerA = (a.customerName || '').toString().toLowerCase();
        const customerB = (b.customerName || '').toString().toLowerCase();
        return customerA.localeCompare(customerB);
      },
      amount: (a, b) => {
        const amountA = a.totalPrice || a.cost?.subtotal || 0;
        const amountB = b.totalPrice || b.cost?.subtotal || 0;
        return amountA - amountB;
      }
    };

    // Get the comparator function for the specified field
    const comparator = comparators[sortBy];
    if (!comparator) {
      console.warn(`sortBookings: unknown sort field "${sortBy}"`);
      return sorted;
    }

    // Sort using the comparator
    sorted.sort(comparator);

    // Reverse if descending order
    if (sortOrder === 'desc') {
      sorted.reverse();
    }

    return sorted;
  }

  // Public API
  return {
    calculateTotalPages,
    calculateStartIndex,
    calculateEndIndex,
    sortBookings
  };
})();

// Export for Node.js/CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaginationUtils;
}
