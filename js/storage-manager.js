/* ============================================
   Storage Manager - Performance Optimized
   ============================================
   1. Automatic cleanup for old bookings
   2. Batched localStorage writes
   3. Removes unnecessary/stale keys
   ============================================ */

const StorageManager = {
  // Batch write queue
  _writeQueue: new Map(),
  _writeTimeout: null,
  _batchDelay: 500, // 500ms batch window
  
  // Keys that should be cleaned up
  CLEANUP_KEYS: [
    'bookingSecurityLogs',
    'actionLocks', 
    'bookingSubmissionStatus',
    'bookingHistory'
  ],
  
  // Max age for different data types (in days)
  MAX_AGE: {
    bookings: 90,        // Archive bookings older than 90 days
    bookingHistory: 30,  // Clear history older than 30 days
    securityLogs: 7,     // Clear logs older than 7 days
    actionLocks: 1       // Clear locks older than 1 day
  },

  /**
   * Initialize storage manager - run cleanup on load
   */
  init() {
    this.cleanupStaleData();
    this.removeUnusedKeys();
    
    // Run cleanup daily
    setInterval(() => this.cleanupStaleData(), 24 * 60 * 60 * 1000);
  },

  // ============================================
  // 1. AUTOMATIC CLEANUP FOR OLD DATA
  // ============================================
  
  /**
   * Clean up old bookings - archive completed ones older than MAX_AGE
   */
  cleanupOldBookings() {
    try {
      const stored = localStorage.getItem('bookings');
      if (!stored) return { removed: 0, archived: 0 };
      
      const bookings = JSON.parse(stored);
      if (!Array.isArray(bookings)) return { removed: 0, archived: 0 };
      
      const cutoffDate = Date.now() - (this.MAX_AGE.bookings * 24 * 60 * 60 * 1000);
      let archived = 0;
      
      // Filter out old completed/cancelled bookings
      const activeBookings = bookings.filter(booking => {
        const bookingDate = booking.createdAt || new Date(booking.date).getTime();
        const isOld = bookingDate < cutoffDate;
        const isCompleted = ['completed', 'cancelled', 'no-show'].includes(booking.status);
        
        if (isOld && isCompleted) {
          archived++;
          return false; // Remove from active
        }
        return true;
      });
      
      if (archived > 0) {
        localStorage.setItem('bookings', JSON.stringify(activeBookings));
      }
      
      return { removed: 0, archived };
    } catch (e) {
      return { removed: 0, archived: 0, error: e.message };
    }
  },

  /**
   * Clean up old booking history
   */
  cleanupBookingHistory() {
    try {
      const stored = localStorage.getItem('bookingHistory');
      if (!stored) return 0;
      
      const history = JSON.parse(stored);
      if (!Array.isArray(history)) return 0;
      
      const cutoffDate = Date.now() - (this.MAX_AGE.bookingHistory * 24 * 60 * 60 * 1000);
      const filtered = history.filter(entry => {
        const entryDate = entry.timestamp || entry.createdAt || 0;
        return entryDate > cutoffDate;
      });
      
      const removed = history.length - filtered.length;
      if (removed > 0) {
        localStorage.setItem('bookingHistory', JSON.stringify(filtered));
      }
      
      return removed;
    } catch (e) {
      return 0;
    }
  },

  /**
   * Clean up old security logs
   */
  cleanupSecurityLogs() {
    try {
      const stored = localStorage.getItem('bookingSecurityLogs');
      if (!stored) return 0;
      
      const logs = JSON.parse(stored);
      if (!Array.isArray(logs)) return 0;
      
      const cutoffDate = Date.now() - (this.MAX_AGE.securityLogs * 24 * 60 * 60 * 1000);
      const filtered = logs.filter(log => log.timestamp > cutoffDate);
      
      const removed = logs.length - filtered.length;
      if (removed > 0) {
        localStorage.setItem('bookingSecurityLogs', JSON.stringify(filtered));
      }
      
      return removed;
    } catch (e) {
      return 0;
    }
  },

  /**
   * Clean up stale action locks
   */
  cleanupActionLocks() {
    try {
      const stored = localStorage.getItem('actionLocks');
      if (!stored) return 0;
      
      const locks = JSON.parse(stored);
      if (typeof locks !== 'object') return 0;
      
      const cutoffDate = Date.now() - (this.MAX_AGE.actionLocks * 24 * 60 * 60 * 1000);
      let removed = 0;
      
      Object.keys(locks).forEach(key => {
        if (locks[key].startedAt < cutoffDate) {
          delete locks[key];
          removed++;
        }
      });
      
      if (removed > 0) {
        localStorage.setItem('actionLocks', JSON.stringify(locks));
      }
      
      return removed;
    } catch (e) {
      return 0;
    }
  },

  /**
   * Run all cleanup tasks
   */
  cleanupStaleData() {
    const results = {
      bookings: this.cleanupOldBookings(),
      history: this.cleanupBookingHistory(),
      logs: this.cleanupSecurityLogs(),
      locks: this.cleanupActionLocks()
    };
    
    return results;
  },

  // ============================================
  // 2. BATCHED LOCALSTORAGE WRITES
  // ============================================
  
  /**
   * Queue a write operation (batched)
   * @param {string} key - localStorage key
   * @param {any} value - Value to store
   */
  queueWrite(key, value) {
    this._writeQueue.set(key, value);
    
    // Clear existing timeout
    if (this._writeTimeout) {
      clearTimeout(this._writeTimeout);
    }
    
    // Set new timeout to flush writes
    this._writeTimeout = setTimeout(() => {
      this.flushWrites();
    }, this._batchDelay);
  },

  /**
   * Flush all queued writes to localStorage
   */
  flushWrites() {
    if (this._writeQueue.size === 0) return;
    
    this._writeQueue.forEach((value, key) => {
      try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, serialized);
      } catch (e) {
        // Storage full - try cleanup and retry
        if (e.name === 'QuotaExceededError') {
          this.emergencyCleanup();
          try {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          } catch (e2) {
            // Still failed - skip this write
          }
        }
      }
    });
    
    this._writeQueue.clear();
    this._writeTimeout = null;
  },

  /**
   * Immediate write (bypasses batching for critical data)
   */
  writeImmediate(key, value) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        this.emergencyCleanup();
        try {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          return true;
        } catch (e2) {
          return false;
        }
      }
      return false;
    }
  },

  /**
   * Read from localStorage with parsing
   */
  read(key, defaultValue = null) {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultValue;
      return JSON.parse(stored);
    } catch (e) {
      return defaultValue;
    }
  },

  // ============================================
  // 4. REMOVE UNNECESSARY KEYS
  // ============================================
  
  /**
   * Remove unused/legacy localStorage keys
   */
  removeUnusedKeys() {
    // Keys that are no longer used or are legacy
    const unusedKeys = [
      'debug_mode',
      'temp_booking',
      'form_draft',
      'old_bookings',
      'legacy_users',
      'test_data',
      '_temp',
      'undefined'
    ];
    
    let removed = 0;
    
    unusedKeys.forEach(key => {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        removed++;
      }
    });
    
    // Also remove any keys that start with temp_ or _
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (key.startsWith('temp_') || key.startsWith('_temp') || key === 'undefined') {
        localStorage.removeItem(key);
        removed++;
      }
    });
    
    return removed;
  },

  /**
   * Emergency cleanup when storage is full
   */
  emergencyCleanup() {
    // Priority cleanup - remove least important data first
    
    // 1. Clear security logs
    localStorage.removeItem('bookingSecurityLogs');
    
    // 2. Clear action locks
    localStorage.removeItem('actionLocks');
    
    // 3. Clear submission status
    localStorage.removeItem('bookingSubmissionStatus');
    
    // 4. Clear booking history
    localStorage.removeItem('bookingHistory');
    
    // 5. Aggressive booking cleanup
    try {
      const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      // Keep only pending and confirmed bookings
      const essential = bookings.filter(b => 
        ['pending', 'confirmed', 'in-progress'].includes(b.status)
      );
      localStorage.setItem('bookings', JSON.stringify(essential));
    } catch (e) {
      // If all else fails, clear bookings
      localStorage.removeItem('bookings');
    }
  },

  /**
   * Get storage usage statistics
   */
  getStorageStats() {
    let totalSize = 0;
    const breakdown = {};
    
    Object.keys(localStorage).forEach(key => {
      const value = localStorage.getItem(key);
      const size = value ? value.length * 2 : 0; // UTF-16 = 2 bytes per char
      breakdown[key] = {
        size: size,
        sizeKB: (size / 1024).toFixed(2)
      };
      totalSize += size;
    });
    
    // Sort by size descending
    const sorted = Object.entries(breakdown)
      .sort((a, b) => b[1].size - a[1].size)
      .reduce((obj, [key, val]) => {
        obj[key] = val;
        return obj;
      }, {});
    
    return {
      totalBytes: totalSize,
      totalKB: (totalSize / 1024).toFixed(2),
      totalMB: (totalSize / (1024 * 1024)).toFixed(2),
      maxMB: 5, // Most browsers allow 5MB
      usagePercent: ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1),
      breakdown: sorted
    };
  },

  /**
   * Clear all app data (use with caution)
   */
  clearAll() {
    const appKeys = [
      'currentUser', 'users', 'bookings', 'packages', 'groomers',
      'referenceCuts', 'customerProfiles', 'staffAbsences',
      'bookingHistory', 'calendarBlackouts', 'upliftRequests',
      'bookingSubmissionStatus', 'actionLocks', 'bookingSecurityLogs'
    ];
    
    appKeys.forEach(key => localStorage.removeItem(key));
    
    // Also clear firebase user caches
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('firebase_user_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// Initialize on load
StorageManager.init();

// Make globally available
window.StorageManager = StorageManager;

// Convenience functions
window.getStorageStats = () => StorageManager.getStorageStats();
window.cleanupStorage = () => StorageManager.cleanupStaleData();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
