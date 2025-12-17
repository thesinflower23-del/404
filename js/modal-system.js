/**
 * Modal System Module
 * 
 * Reusable, configuration-driven modal component.
 * Eliminates duplicate modal code throughout the application.
 * 
 * Features:
 * - Configuration-based modal creation
 * - Event handler decoupling (no inline onclick)
 * - Automatic cleanup (event listeners, focus restoration)
 * - Promise-based API for async operations
 * - Support for multiple action styles
 * - Accessibility support (ARIA, keyboard navigation)
 */

class ModalSystem {
  constructor() {
    this.currentModal = null;
    this.previousFocus = null;
    this.modalContainer = null;
    this.overlayElement = null;
    this.isOpen = false;
  }
  
  /**
   * Initialize modal system
   * Creates container elements if they don't exist
   */
  init() {
    if (this.modalContainer) return;
    
    // Create modal container
    this.modalContainer = document.createElement('div');
    this.modalContainer.id = 'modal-container';
    this.modalContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: none;
      z-index: 1000;
    `;
    
    // Create overlay
    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'modal-overlay';
    this.overlayElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      cursor: pointer;
    `;
    
    this.modalContainer.appendChild(this.overlayElement);
    document.body.appendChild(this.modalContainer);
    
    // Close on overlay click - bind to preserve 'this' context
    const overlayCloseHandler = () => this.close();
    this.overlayElement.addEventListener('click', overlayCloseHandler);
    this.overlayElement._closeHandler = overlayCloseHandler;
    
    // Close on Escape key - bind to preserve 'this' context
    const escapeHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    };
    document.addEventListener('keydown', escapeHandler);
    this._escapeHandler = escapeHandler;
  }
  
  /**
   * Show modal with configuration
   * 
   * @param {Object} config - Modal configuration
   * @param {string} config.title - Modal title
   * @param {string|HTMLElement} config.content - Modal content
   * @param {Array} config.actions - Array of action objects
   * @param {Function} config.onClose - Callback when modal closes
   * @returns {Promise} Resolves when modal closes
   */
  show(config = {}) {
    return new Promise((resolve) => {
      this.init();
      
      // Store resolve function for later
      this.resolvePromise = resolve;
      
      // Store previous focus for restoration
      this.previousFocus = document.activeElement;
      
      // Create modal content
      const modalContent = this.createModalContent(config);
      
      // Clear previous modal
      const existingModal = this.modalContainer.querySelector('.modal-dialog');
      if (existingModal) {
        existingModal.remove();
      }
      
      // Add new modal
      this.modalContainer.appendChild(modalContent);
      
      // Show modal
      this.modalContainer.style.display = 'flex';
      this.modalContainer.style.alignItems = 'center';
      this.modalContainer.style.justifyContent = 'center';
      this.isOpen = true;
      
      // Focus first button
      setTimeout(() => {
        const firstButton = modalContent.querySelector('button');
        if (firstButton) {
          firstButton.focus();
        }
      }, 100);
      
      this.currentModal = config;
    });
  }
  
  /**
   * Close current modal
   * 
   * @param {*} result - Result to pass to promise resolver
   */
  close(result = null) {
    console.log('Modal close called, isOpen:', this.isOpen);
    
    if (!this.isOpen) {
      console.log('Modal is not open, skipping close');
      return;
    }
    
    try {
      // Hide modal
      if (this.modalContainer) {
        this.modalContainer.style.display = 'none';
      }
      this.isOpen = false;
      
      // Remove modal content
      if (this.modalContainer) {
        const modalDialog = this.modalContainer.querySelector('.modal-dialog');
        if (modalDialog) {
          modalDialog.remove();
        }
      }
      
      // Restore focus
      if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
        try {
          this.previousFocus.focus();
        } catch (e) {
          console.warn('Could not restore focus:', e);
        }
      }
      
      // Call onClose callback if provided
      if (this.currentModal && this.currentModal.onClose) {
        try {
          this.currentModal.onClose();
        } catch (error) {
          console.error('Error in modal onClose callback:', error);
        }
      }
      
      // Resolve promise
      if (this.resolvePromise) {
        this.resolvePromise(result);
        this.resolvePromise = null;
      }
      
      this.currentModal = null;
      console.log('Modal closed successfully');
    } catch (error) {
      console.error('Error closing modal:', error);
    }
  }
  
  /**
   * Show confirmation dialog (yes/no)
   * 
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message
   * @returns {Promise<boolean>} True if confirmed, false if cancelled
   */
  confirm(title = '', message = '') {
    return this.show({
      title,
      content: message,
      actions: [
        {
          label: 'Yes',
          handler: () => this.close(true),
          style: 'primary'
        },
        {
          label: 'No',
          handler: () => this.close(false),
          style: 'outline'
        }
      ]
    });
  }
  
  /**
   * Show alert dialog
   * 
   * @param {string} title - Alert title
   * @param {string} message - Alert message
   * @returns {Promise<void>} Resolves when dismissed
   */
  alert(title = '', message = '') {
    return this.show({
      title,
      content: message,
      actions: [
        {
          label: 'OK',
          handler: () => this.close(),
          style: 'primary'
        }
      ]
    });
  }
  
  /**
   * Show warning dialog
   * 
   * @param {string} title - Warning title
   * @param {string} message - Warning message
   * @returns {Promise<void>} Resolves when dismissed
   */
  warning(title = '', message = '') {
    return this.show({
      title,
      content: message,
      actions: [
        {
          label: 'OK',
          handler: () => this.close(),
          style: 'danger'
        }
      ]
    });
  }
  
  /**
   * Show success dialog
   * 
   * @param {string} title - Success title
   * @param {string} message - Success message
   * @returns {Promise<void>} Resolves when dismissed
   */
  success(title = '', message = '') {
    return this.show({
      title,
      content: message,
      actions: [
        {
          label: 'OK',
          handler: () => this.close(),
          style: 'primary'
        }
      ]
    });
  }
  
  // ============================================
  // Private Methods
  // ============================================
  
  /**
   * Create modal content HTML
   * @private
   */
  createModalContent(config) {
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.style.cssText = `
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      padding: 2rem;
      position: relative;
      z-index: 1001;
    `;
    
    // Add X close button in top-right corner (will be added after content to ensure it's on top)
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.setAttribute('aria-label', 'Close modal');
    closeButton.type = 'button';
    closeButton.className = 'modal-close-btn';
    closeButton.style.cssText = `
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: transparent;
      border: none;
      font-size: 2.5rem;
      line-height: 1;
      color: var(--gray-600);
      cursor: pointer;
      padding: 0;
      width: 2.5rem;
      height: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      transition: all 0.2s ease;
      z-index: 1002;
    `;
    
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'var(--gray-200)';
      closeButton.style.color = 'var(--gray-900)';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'transparent';
      closeButton.style.color = 'var(--gray-600)';
    });
    
    // Bind close method to preserve 'this' context
    const closeHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Close button clicked');
      this.close();
    };
    closeButton.addEventListener('click', closeHandler, true); // Use capture phase
    
    // Store reference for later
    this._closeButton = closeButton;
    
    // Title
    if (config.title) {
      const title = document.createElement('h2');
      title.textContent = config.title;
      title.style.cssText = `
        margin: 0 0 1rem 0;
        font-size: 1.5rem;
        color: var(--gray-900);
        padding-right: 2rem;
      `;
      dialog.appendChild(title);
    }
    
    // Content
    if (config.content) {
      const content = document.createElement('div');
      content.className = 'modal-content';
      content.style.cssText = `
        margin-bottom: 1.5rem;
        color: var(--gray-700);
        line-height: 1.6;
      `;
      
      if (typeof config.content === 'string') {
        content.textContent = config.content;
      } else if (config.content instanceof HTMLElement) {
        content.appendChild(config.content);
      }
      
      dialog.appendChild(content);
    }
    
    // Actions
    if (config.actions && config.actions.length) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'modal-actions';
      actionsDiv.style.cssText = `
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        flex-wrap: wrap;
      `;
      
      config.actions.forEach((action, index) => {
        const button = document.createElement('button');
        button.textContent = action.label;
        button.className = `btn btn-${action.style || 'outline'}`;
        button.style.cssText = `
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        `;
        
        // Apply style
        if (action.style === 'primary') {
          button.style.cssText += `
            background: var(--primary, #007bff);
            color: white;
          `;
        } else if (action.style === 'danger') {
          button.style.cssText += `
            background: var(--danger, #dc3545);
            color: white;
          `;
        } else {
          button.style.cssText += `
            background: var(--gray-200);
            color: var(--gray-900);
            border: 1px solid var(--gray-300);
          `;
        }
        
        // Add hover effect
        button.addEventListener('mouseenter', () => {
          button.style.opacity = '0.8';
        });
        button.addEventListener('mouseleave', () => {
          button.style.opacity = '1';
        });
        
        // Attach handler
        button.addEventListener('click', async () => {
          try {
            if (action.handler) {
              const result = action.handler();
              // Handle async handlers
              if (result instanceof Promise) {
                await result;
              }
            }
          } catch (error) {
            console.error('Error in modal action handler:', error);
          }
        });
        
        actionsDiv.appendChild(button);
      });
      
      dialog.appendChild(actionsDiv);
    }
    
    // Add close button at the end to ensure it's on top
    if (this._closeButton) {
      dialog.appendChild(this._closeButton);
    }
    
    return dialog;
  }
}

// ============================================
// Global Instance
// ============================================

// Create global modal system instance
const modalSystem = new ModalSystem();

// ============================================
// Exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ModalSystem, modalSystem };
}

// Make globally available
window.ModalSystem = ModalSystem;
window.modalSystem = modalSystem;
