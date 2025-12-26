// ============================================
// 🔒 BOOKING SECURITY LOGGER (Performance Optimized)
// ============================================
// Lightweight security logging - only logs critical events
// ============================================

const BookingSecurityLogger = {
  STORAGE_KEY: 'bookingSecurityLogs',
  MAX_LOGS: 100, // Reduced from 1000 for better performance
  
  // In-memory cache to avoid repeated localStorage reads
  _cache: null,
  _cacheTime: 0,
  _cacheDuration: 5000, // 5 second cache
  _sessionId: null,
  
  // Production mode - disable verbose logging
  _productionMode: true,
  
  LEVELS: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    SECURITY: 'security'
  },
  
  init() {
    // Silent init in production
  },
  
  /**
   * Log only critical events (blocked, errors, security)
   */
  log(action, details = {}) {
    // Skip INFO level logs in production for performance
    const level = this.determineLevel(action);
    if (this._productionMode && level === this.LEVELS.INFO) {
      return null;
    }
    
    const logEntry = {
      timestamp: Date.now(),
      action: action,
      level: level,
      userId: details.userId || 'anonymous',
      sessionId: this.getSessionId()
    };
    
    // Only add extra details for non-INFO logs
    if (level !== this.LEVELS.INFO) {
      Object.assign(logEntry, details);
    }
    
    this.saveLog(logEntry);
    return logEntry;
  },
  
  determineLevel(action) {
    if (action.includes('blocked') || action.includes('duplicate')) return this.LEVELS.WARNING;
    if (action.includes('error') || action.includes('failed')) return this.LEVELS.ERROR;
    if (action.includes('abuse') || action.includes('suspicious')) return this.LEVELS.SECURITY;
    return this.LEVELS.INFO;
  },
  
  saveLog(logEntry) {
    try {
      const logs = this.getLogs();
      logs.push(logEntry);
      
      // Trim to MAX_LOGS
      if (logs.length > this.MAX_LOGS) {
        logs.splice(0, logs.length - this.MAX_LOGS);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
      this._cache = logs;
      this._cacheTime = Date.now();
    } catch (e) {
      // Silent fail
    }
  },
  
  getLogs() {
    // Return cached if valid
    if (this._cache && (Date.now() - this._cacheTime) < this._cacheDuration) {
      return this._cache;
    }
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      this._cache = stored ? JSON.parse(stored) : [];
      this._cacheTime = Date.now();
      return this._cache;
    } catch (e) {
      return [];
    }
  },
  
  getSessionId() {
    if (this._sessionId) return this._sessionId;
    
    this._sessionId = sessionStorage.getItem('bookingSessionId');
    if (!this._sessionId) {
      this._sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('bookingSessionId', this._sessionId);
    }
    return this._sessionId;
  },
  
  // Simplified stats - only called when needed (admin dashboard)
  getStats(timeWindow = 3600000) {
    const logs = this.getLogs();
    const cutoff = Date.now() - timeWindow;
    const recentLogs = logs.filter(log => log.timestamp >= cutoff);
    
    return {
      totalAttempts: recentLogs.filter(log => log.action.includes('attempt')).length,
      successfulSubmissions: recentLogs.filter(log => log.action === 'submission_success').length,
      blockedAttempts: recentLogs.filter(log => log.action.includes('blocked')).length,
      errors: recentLogs.filter(log => log.level === 'error').length,
      securityAlerts: recentLogs.filter(log => log.level === 'security').length
    };
  },
  
  clearLogs() {
    localStorage.removeItem(this.STORAGE_KEY);
    this._cache = null;
  },
  
  // Enable verbose mode for debugging
  enableDebugMode() {
    this._productionMode = false;
  }
};

// Silent init
BookingSecurityLogger.init();
window.BookingSecurityLogger = BookingSecurityLogger;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BookingSecurityLogger;
}
