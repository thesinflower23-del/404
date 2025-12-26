/* ============================================
   Maps Fallback - Alternative to Google Maps
   ============================================ */

class MapsFallback {
  constructor() {
    this.isGoogleMapsBlocked = false;
    this.init();
  }

  /**
   * Initialize maps fallback system
   */
  init() {
    // Check if Google Maps is causing issues
    this.detectGoogleMapsIssues();
    
    // Setup fallback for blocked maps
    this.setupMapsFallback();
    
    console.log('[MapsFallback] Maps fallback system initialized');
  }

  /**
   * Detect Google Maps permission issues
   */
  detectGoogleMapsIssues() {
    // Listen for Google Maps errors
    window.addEventListener('error', (event) => {
      if (event.filename && (
          event.filename.includes('maps.googleapis.com') ||
          event.filename.includes('streetview.js') ||
          event.filename.includes('common.js')
      )) {
        this.handleGoogleMapsError(event);
      }
    });

    // Check for permissions policy violations
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Permissions policy violation') && 
          (message.includes('accelerometer') || message.includes('streetview'))) {
        this.isGoogleMapsBlocked = true;
        this.showMapsFallback();
        return; // Suppress the error
      }
      originalError.apply(console, args);
    };
  }

  /**
   * Handle Google Maps errors
   */
  handleGoogleMapsError(event) {
    console.warn('[MapsFallback] Google Maps blocked by browser security policy');
    this.isGoogleMapsBlocked = true;
    this.showMapsFallback();
  }

  /**
   * Setup maps fallback system
   */
  setupMapsFallback() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.checkAndReplaceMaps();
      });
    } else {
      this.checkAndReplaceMaps();
    }
  }

  /**
   * Check for maps and replace if needed
   */
  checkAndReplaceMaps() {
    const mapIframes = document.querySelectorAll('iframe[src*="google.com/maps"]');
    
    mapIframes.forEach(iframe => {
      // Skip if parent has no-fallback attribute
      const container = iframe.parentElement;
      if (container && container.dataset.noFallback === 'true') {
        console.log('[MapsFallback] Skipping iframe with no-fallback attribute');
        return;
      }
      
      // Check if it's a Street View embed (these get blocked by permissions policy)
      const src = iframe.src || '';
      const isStreetView = src.includes('!4v') || src.includes('streetview');
      
      if (isStreetView) {
        // Street View embeds are always blocked, replace immediately
        this.replaceMapWithFallback(iframe);
        return;
      }
      
      // Add error handling to iframe
      iframe.addEventListener('error', () => {
        this.replaceMapWithFallback(iframe);
      });

      // Check if iframe is blocked after a short delay
      setTimeout(() => {
        if (this.isGoogleMapsBlocked || !this.isIframeLoaded(iframe)) {
          this.replaceMapWithFallback(iframe);
        }
      }, 1500);
    });
  }

  /**
   * Check if iframe is properly loaded
   */
  isIframeLoaded(iframe) {
    try {
      // Try to access iframe content (will fail if blocked)
      return iframe.contentDocument !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Replace Google Maps with fallback
   */
  replaceMapWithFallback(iframe) {
    const container = iframe.parentElement;
    if (!container || container.dataset.fallbackApplied) return;
    
    // Skip if container has no-fallback attribute
    if (container.dataset.noFallback === 'true') return;

    container.dataset.fallbackApplied = 'true';

    // Create fallback content
    const fallback = document.createElement('div');
    fallback.className = 'maps-fallback';
    fallback.innerHTML = this.createFallbackContent();
    
    // Apply styles to match original iframe
    const styles = window.getComputedStyle(iframe);
    fallback.style.width = iframe.style.width || '100%';
    fallback.style.height = iframe.style.height || '240px';
    fallback.style.border = iframe.style.border || '0';
    fallback.style.borderRadius = styles.borderRadius || '0';

    // Replace iframe with fallback
    container.replaceChild(fallback, iframe);

    console.log('[MapsFallback] Replaced blocked Google Maps with fallback content');
  }

  /**
   * Create fallback content
   */
  createFallbackContent() {
    return `
      <div style="
        width: 100%; 
        height: 100%; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: white;
        text-align: center;
        padding: 2rem;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
      ">
        <div style="position: relative; z-index: 1;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📍</div>
          <h3 style="margin: 0 0 0.5rem 0; font-size: 1.2rem; font-weight: 600;">
            BestBuddies Pet Grooming
          </h3>
          <p style="margin: 0 0 1rem 0; font-size: 0.9rem; opacity: 0.9;">
            Davao City, Philippines
          </p>
          <div style="
            background: rgba(255,255,255,0.2);
            padding: 0.75rem 1.5rem;
            border-radius: 25px;
            font-size: 0.85rem;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.3);
          ">
            📞 0951 986 5882
          </div>
          <p style="
            margin: 1rem 0 0 0; 
            font-size: 0.75rem; 
            opacity: 0.7;
            font-style: italic;
          ">
            Interactive map temporarily unavailable
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Show maps fallback notification
   */
  showMapsFallback() {
    // Only show notification once
    if (this.notificationShown) return;
    this.notificationShown = true;

    // Create subtle notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(23, 162, 184, 0.95);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      font-size: 0.9rem;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
      max-width: 300px;
      animation: slideInRight 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span style="font-size: 1.2rem;">🗺️</span>
        <div>
          <div style="font-weight: 600; margin-bottom: 0.25rem;">Map Alternative</div>
          <div style="font-size: 0.8rem; opacity: 0.9;">Using fallback location display</div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          color: white;
          font-size: 1.2rem;
          cursor: pointer;
          opacity: 0.7;
          margin-left: auto;
        ">&times;</button>
      </div>
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  /**
   * Create static map alternative
   */
  createStaticMap(width = 300, height = 240) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw simple map background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw location marker
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2 - 20, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw marker point
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2 - 20, 5, 0, Math.PI * 2);
    ctx.fill();

    // Add text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BestBuddies Pet Grooming', width / 2, height / 2 + 20);
    
    ctx.font = '12px Arial';
    ctx.fillText('Davao City, Philippines', width / 2, height / 2 + 40);

    return canvas.toDataURL();
  }

  /**
   * Get fallback status
   */
  getStatus() {
    return {
      isBlocked: this.isGoogleMapsBlocked,
      notificationShown: this.notificationShown || false,
      fallbacksApplied: document.querySelectorAll('[data-fallback-applied]').length
    };
  }
}

// Create global instance
const mapsFallback = new MapsFallback();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MapsFallback;
}

// Global helper functions
window.getMapsFallbackStatus = () => mapsFallback.getStatus();

// Expose for debugging
window.mapsFallback = mapsFallback;