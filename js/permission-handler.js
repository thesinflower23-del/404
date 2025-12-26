/* ============================================
   Firebase Permission Handler
   ============================================ */

class PermissionHandler {
  constructor() {
    this.permissionWarnings = new Set();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
  }

  /**
   * Show permission warning for specific resource
   */
  showPermissionWarning(resource) {
    // Avoid showing duplicate warnings
    if (this.permissionWarnings.has(resource)) return;
    
    this.permissionWarnings.add(resource);
    
    const warnings = {
      bookings: {
        title: 'Booking Data Access Issue',
        message: 'Unable to access booking data from the server. Using local data instead.',
        action: 'Contact your administrator to update Firebase permissions.',
        icon: '📅'
      },
      users: {
        title: 'User Data Access Issue',
        message: 'Unable to access user data from the server. Using local data instead.',
        action: 'Contact your administrator to update Firebase permissions.',
        icon: '👥'
      },
      groomers: {
        title: 'Groomer Data Access Issue',
        message: 'Unable to access groomer data from the server. Using local data instead.',
        action: 'Contact your administrator to update Firebase permissions.',
        icon: '🧑‍⚕️'
      }
    };

    const warning = warnings[resource] || {
      title: 'Data Access Issue',
      message: `Unable to access ${resource} data from the server.`,
      action: 'Contact your administrator for assistance.',
      icon: '⚠️'
    };

    this.displayPermissionWarning(warning);
  }

  /**
   * Display permission warning to user
   * DISABLED: Visual warnings are now suppressed to avoid annoying users
   * The app works fine with local data fallback
   */
  displayPermissionWarning(warning) {
    // DISABLED: Don't show visual warning banner - it's annoying and the app works with local data
    // Just log to console instead
    console.info(`[PermissionHandler] ${warning.title}: ${warning.message}`);
    return;
    
  }

  /**
   * Add CSS styles for permission warnings
   */
  addPermissionWarningStyles() {
    if (document.getElementById('permission-warning-styles')) return;

    const style = document.createElement('style');
    style.id = 'permission-warning-styles';
    style.textContent = `
      .permission-warning {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #fff3cd, #ffeaa7);
        border-bottom: 3px solid #ffc107;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 10001;
        animation: slideDown 0.3s ease-out;
      }

      .permission-warning-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem 2rem;
      }

      .permission-warning-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
      }

      .permission-warning-icon {
        font-size: 1.5rem;
      }

      .permission-warning-title {
        margin: 0;
        font-size: 1.1rem;
        color: #856404;
        flex: 1;
      }

      .permission-warning-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #856404;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
      }

      .permission-warning-close:hover {
        background-color: rgba(133, 100, 4, 0.1);
      }

      .permission-warning-message {
        margin: 0 0 0.5rem 0;
        color: #856404;
        font-size: 0.95rem;
      }

      .permission-warning-action {
        margin: 0 0 1rem 0;
        color: #856404;
        font-size: 0.9rem;
      }

      .permission-warning-buttons {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .permission-warning .btn {
        font-size: 0.85rem;
        padding: 0.4rem 0.8rem;
      }

      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @media (max-width: 768px) {
        .permission-warning-content {
          padding: 1rem;
        }
        
        .permission-warning-header {
          flex-wrap: wrap;
        }
        
        .permission-warning-buttons {
          flex-direction: column;
        }
        
        .permission-warning .btn {
          width: 100%;
          justify-content: center;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Retry Firebase connection
   */
  async retryConnection() {
    console.log('[PermissionHandler] Retrying Firebase connection...');
    
    // Show loading state
    if (typeof loadingManager !== 'undefined') {
      loadingManager.showGlobalLoader('Retrying connection...', 5000);
    }

    try {
      // Clear previous warnings
      this.permissionWarnings.clear();
      
      // Remove existing warning notifications
      document.querySelectorAll('.permission-warning').forEach(warning => {
        warning.remove();
      });

      // Try to reconnect to Firebase
      if (typeof initializeFirebase === 'function') {
        await initializeFirebase();
      }

      // Refresh current page data
      if (typeof refreshCurrentPageData === 'function') {
        await refreshCurrentPageData();
      } else {
        // Fallback: reload the page
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }

      console.log('[PermissionHandler] Connection retry successful');
      
      if (typeof customAlert !== 'undefined') {
        customAlert.success('Connection restored', 'Successfully reconnected to the server.');
      }

    } catch (error) {
      console.error('[PermissionHandler] Retry failed:', error);
      
      if (typeof customAlert !== 'undefined') {
        customAlert.error('Retry failed', 'Unable to reconnect. Please contact support.');
      }
    } finally {
      if (typeof loadingManager !== 'undefined') {
        loadingManager.hideGlobalLoader();
      }
    }
  }

  /**
   * Show troubleshooting information
   */
  showTroubleshooting() {
    const troubleshootingModal = document.createElement('div');
    troubleshootingModal.className = 'modal-overlay';
    troubleshootingModal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3>🔧 Troubleshooting Data Access Issues</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <h4>Common Causes:</h4>
          <ul>
            <li><strong>Firebase Permissions:</strong> Database security rules may be too restrictive</li>
            <li><strong>Authentication:</strong> You may not be logged in or lack proper permissions</li>
            <li><strong>Network Issues:</strong> Connection problems with Firebase servers</li>
            <li><strong>Configuration:</strong> Firebase configuration may be incorrect</li>
          </ul>
          
          <h4>What You Can Do:</h4>
          <ol>
            <li><strong>Check Login Status:</strong> Make sure you're logged in with proper credentials</li>
            <li><strong>Refresh Page:</strong> Try refreshing the browser page</li>
            <li><strong>Clear Cache:</strong> Clear browser cache and cookies</li>
            <li><strong>Check Network:</strong> Ensure stable internet connection</li>
          </ol>
          
          <h4>For Administrators:</h4>
          <ul>
            <li>Review Firebase Database security rules</li>
            <li>Check Firebase project configuration</li>
            <li>Verify user authentication and roles</li>
            <li>Monitor Firebase usage and quotas</li>
          </ul>
          
          <div style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-top: 1rem;">
            <strong>Note:</strong> The application will continue to work using locally stored data, 
            but changes may not sync until the connection is restored.
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="permissionHandler.retryConnection()">
            <i class="bi bi-arrow-clockwise"></i> Retry Connection
          </button>
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(troubleshootingModal);
  }

  /**
   * Check if user has admin permissions
   */
  async checkAdminPermissions() {
    try {
      const user = await getCurrentUser();
      return user && user.role === 'admin';
    } catch (error) {
      console.error('Error checking admin permissions:', error);
      return false;
    }
  }

  /**
   * Show permission upgrade suggestion
   */
  showPermissionUpgrade() {
    if (typeof customAlert !== 'undefined') {
      customAlert.info(
        'Limited Access', 
        'You have limited access to some features. Contact an administrator to upgrade your permissions.'
      );
    }
  }

  /**
   * Clear all permission warnings
   */
  clearWarnings() {
    this.permissionWarnings.clear();
    document.querySelectorAll('.permission-warning').forEach(warning => {
      warning.remove();
    });
  }

  /**
   * Get current permission status
   */
  getPermissionStatus() {
    return {
      hasWarnings: this.permissionWarnings.size > 0,
      warnings: Array.from(this.permissionWarnings),
      retryAttempts: Object.fromEntries(this.retryAttempts)
    };
  }
}

// Create global instance
const permissionHandler = new PermissionHandler();

// Global helper function for Firebase functions to use
window.showPermissionWarning = (resource) => permissionHandler.showPermissionWarning(resource);

// Function to refresh current page data (to be implemented by each page)
window.refreshCurrentPageData = async function() {
  console.log('[PermissionHandler] Refreshing current page data...');
  
  // Try to refresh based on current page
  const path = window.location.pathname;
  
  if (path.includes('admin-dashboard')) {
    if (typeof initAdminDashboard === 'function') {
      await initAdminDashboard();
    }
  } else if (path.includes('customer-dashboard')) {
    if (typeof loadCustomerDashboard === 'function') {
      await loadCustomerDashboard();
    }
  } else if (path.includes('groomer-dashboard')) {
    if (typeof initGroomerDashboard === 'function') {
      await initGroomerDashboard();
    }
  } else if (path.includes('booking')) {
    if (typeof initBooking === 'function') {
      await initBooking();
    }
  } else {
    // Fallback: reload page
    window.location.reload();
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PermissionHandler;
}

// Expose for debugging
window.permissionHandler = permissionHandler;

console.log('[PermissionHandler] Permission handler initialized');