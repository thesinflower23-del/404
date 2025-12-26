/* ============================================
   Console Manager - Lightweight Error Suppression
   Performance Optimized Version
   ============================================ */

class ConsoleManager {
  constructor() {
    this.suppressedErrors = new Set();
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };
    
    // Suppress patterns - checked once per error type
    this.suppressPatterns = [
      'Tracking Prevention',
      'Permissions policy violation',
      'accelerometer',
      'streetview.js',
      'common.js',
      'init_embed.js',
      'Permission denied',
      'Error getting bookings',
      'Error getting users',
      'absences is not defined',
      'firebase-db.js',
      'Google Maps'
    ];
    
    this.init();
  }

  init() {
    this.setupErrorSuppression();
    this.setupPermissionErrorHandling();
  }

  setupErrorSuppression() {
    const self = this;
    
    // Lightweight error override
    console.error = function(...args) {
      const msg = args[0]?.toString() || '';
      
      // Quick pattern check
      for (const pattern of self.suppressPatterns) {
        if (msg.includes(pattern)) {
          const key = pattern.substring(0, 20);
          if (self.suppressedErrors.has(key)) return;
          self.suppressedErrors.add(key);
        }
      }
      
      self.originalConsole.error(...args);
    };

    // Lightweight warn override
    console.warn = function(...args) {
      const msg = args[0]?.toString() || '';
      
      for (const pattern of self.suppressPatterns) {
        if (msg.includes(pattern)) {
          const key = 'w-' + pattern.substring(0, 20);
          if (self.suppressedErrors.has(key)) return;
          self.suppressedErrors.add(key);
        }
      }
      
      self.originalConsole.warn(...args);
    };
  }

  setupPermissionErrorHandling() {
    window.addEventListener('unhandledrejection', (event) => {
      const msg = event.reason?.message || '';
      if (msg.includes('Permission denied')) {
        event.preventDefault();
      }
    });
  }

  createCleanLogger() {
    const orig = this.originalConsole;
    return {
      info: (msg, ...args) => orig.info(`[App] ${msg}`, ...args),
      success: (msg, ...args) => orig.log(`[Success] ${msg}`, ...args),
      warning: (msg, ...args) => orig.warn(`[Warning] ${msg}`, ...args),
      error: (msg, ...args) => orig.error(`[Error] ${msg}`, ...args)
    };
  }

  getErrorStats() {
    return { suppressedCount: this.suppressedErrors.size };
  }

  reset() {
    this.suppressedErrors.clear();
  }

  restore() {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
  }

  enableVerboseMode() {
    this.suppressedErrors.clear();
    this.suppressPatterns = [];
  }
}

// Create global instance
const consoleManager = new ConsoleManager();
const logger = consoleManager.createCleanLogger();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ConsoleManager, logger };
}

window.getConsoleStats = () => consoleManager.getErrorStats();
window.resetConsoleTracking = () => consoleManager.reset();
window.enableVerboseLogging = () => consoleManager.enableVerboseMode();
window.consoleManager = consoleManager;
window.logger = logger;