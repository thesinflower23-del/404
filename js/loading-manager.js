/* ============================================
   Loading Manager - Performance Optimized
   ============================================ */

class LoadingManager {
  constructor() {
    this.activeLoaders = new Set();
    this.loadingTimeouts = new Map();
    this.defaultTimeout = 10000;
  }

  showGlobalLoader(message = 'Loading...', timeout = this.defaultTimeout) {
    const loaderId = 'global-loader';
    this.hideGlobalLoader();
    
    const overlay = document.createElement('div');
    overlay.id = loaderId;
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-message">
        <div class="spinner spinner-large"></div>
        <div class="loading-text">${message}</div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.activeLoaders.add(loaderId);
    
    if (timeout > 0) {
      const timeoutId = setTimeout(() => {
        this.hideGlobalLoader();
      }, timeout);
      this.loadingTimeouts.set(loaderId, timeoutId);
    }
    
    return loaderId;
  }

  hideGlobalLoader() {
    const overlay = document.getElementById('global-loader');
    if (overlay) overlay.remove();
    this.activeLoaders.delete('global-loader');
    this.clearTimeout('global-loader');
  }

  showContainerLoader(container, message = 'Loading...', type = 'spinner') {
    const element = typeof container === 'string' ? document.querySelector(container) : container;
    if (!element) return null;

    const loaderId = `loader-${Date.now()}`;
    element.dataset.originalContent = element.innerHTML;
    element.dataset.loaderId = loaderId;
    
    element.innerHTML = `
      <div class="dashboard-loading">
        <div class="spinner"></div>
        <div class="loading-text">${message}</div>
      </div>
    `;
    element.classList.add('content-loading');
    this.activeLoaders.add(loaderId);
    
    return loaderId;
  }

  hideContainerLoader(container) {
    const element = typeof container === 'string' ? document.querySelector(container) : container;
    if (!element) return;

    const loaderId = element.dataset.loaderId;
    if (loaderId) this.activeLoaders.delete(loaderId);
    
    if (element.dataset.originalContent) {
      element.innerHTML = element.dataset.originalContent;
      delete element.dataset.originalContent;
      delete element.dataset.loaderId;
    }
    
    element.classList.remove('content-loading');
  }

  showDashboardLoader(dashboardType = 'admin') {
    const messages = {
      admin: 'Loading admin dashboard...',
      customer: 'Loading your dashboard...',
      groomer: 'Loading groomer dashboard...'
    };
    return this.showGlobalLoader(messages[dashboardType] || 'Loading...');
  }

  showTableLoader(tableContainer, rows = 5) {
    return this.showContainerLoader(tableContainer, 'Loading data...', 'table');
  }

  showBookingFormLoader(formContainer) {
    const element = typeof formContainer === 'string' ? document.querySelector(formContainer) : formContainer;
    if (element) element.classList.add('booking-form-loading');
    return 'booking-form-loader';
  }

  hideBookingFormLoader(formContainer) {
    const element = typeof formContainer === 'string' ? document.querySelector(formContainer) : formContainer;
    if (element) element.classList.remove('booking-form-loading');
  }

  showButtonLoader(button, loadingText = 'Loading...') {
    const element = typeof button === 'string' ? document.querySelector(button) : button;
    if (!element) return;

    element.dataset.originalText = element.textContent;
    element.textContent = loadingText;
    element.classList.add('btn-loading');
    element.disabled = true;
  }

  hideButtonLoader(button) {
    const element = typeof button === 'string' ? document.querySelector(button) : button;
    if (!element) return;

    if (element.dataset.originalText) {
      element.textContent = element.dataset.originalText;
      delete element.dataset.originalText;
    }
    element.classList.remove('btn-loading');
    element.disabled = false;
  }

  retryLastOperation(errorId) {
    this.hideError(errorId);
    window.location.reload();
  }

  clearTimeout(loaderId) {
    const timeoutId = this.loadingTimeouts.get(loaderId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.loadingTimeouts.delete(loaderId);
    }
  }

  hideAllLoaders() {
    this.activeLoaders.forEach(loaderId => {
      const element = document.getElementById(loaderId);
      if (element) element.remove();
    });
    
    this.loadingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.activeLoaders.clear();
    this.loadingTimeouts.clear();
    
    document.querySelectorAll('.content-loading, .booking-form-loading, .btn-loading').forEach(el => {
      el.classList.remove('content-loading', 'booking-form-loading', 'btn-loading');
    });
  }

  async withLoader(asyncFn, options = {}) {
    const { container = null, message = 'Loading...', global = false, timeout = this.defaultTimeout } = options;
    let loaderId;
    
    try {
      if (global) {
        loaderId = this.showGlobalLoader(message, timeout);
      } else if (container) {
        loaderId = this.showContainerLoader(container, message);
      }
      
      return await asyncFn();
    } finally {
      if (global) this.hideGlobalLoader();
      else if (container) this.hideContainerLoader(container);
    }
  }

  showError(message, duration = 5000) {
    const errorId = `error-${Date.now()}`;
    const errorDiv = document.createElement('div');
    errorDiv.id = errorId;
    errorDiv.className = 'loading-overlay';
    errorDiv.style.background = 'rgba(220, 53, 69, 0.95)';
    errorDiv.style.color = 'white';
    errorDiv.innerHTML = `
      <div class="loading-message">
        <div class="icon">⚠️</div>
        <div style="font-weight: 600; margin-bottom: 0.5rem;">Loading Error</div>
        <div>${message}</div>
        <button onclick="loadingManager.retryLastOperation('${errorId}')" 
                style="margin-top: 1rem; padding: 0.5rem 1rem; background: white; color: #dc3545; border: none; border-radius: 4px; cursor: pointer;">
          Try Again
        </button>
      </div>
    `;
    
    document.body.appendChild(errorDiv);
    if (duration > 0) setTimeout(() => this.hideError(errorId), duration);
    return errorId;
  }

  hideError(errorId) {
    const errorDiv = document.getElementById(errorId);
    if (errorDiv) errorDiv.remove();
  }
}

const loadingManager = new LoadingManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoadingManager;
}

window.addEventListener('beforeunload', () => loadingManager.hideAllLoaders());

// Helper functions
window.showDashboardLoader = (type) => loadingManager.showDashboardLoader(type);
window.hideDashboardLoader = () => loadingManager.hideGlobalLoader();
window.showTableLoader = (container) => loadingManager.showTableLoader(container);
window.hideTableLoader = (container) => loadingManager.hideContainerLoader(container);
window.showCalendarLoader = (container) => loadingManager.showContainerLoader(container, 'Loading calendar...', 'calendar');
window.hideCalendarLoader = (container) => loadingManager.hideContainerLoader(container);
window.showBookingFormLoader = (container) => loadingManager.showBookingFormLoader(container);
window.hideBookingFormLoader = (container) => loadingManager.hideBookingFormLoader(container);
window.showGalleryLoader = (container) => loadingManager.showContainerLoader(container, 'Loading photos...', 'gallery');
window.hideGalleryLoader = (container) => loadingManager.hideContainerLoader(container);