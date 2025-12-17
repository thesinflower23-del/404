/**
 * Unit Tests for ModalSystem
 * 
 * Tests verify:
 * - Modal creation and display
 * - Event listener cleanup on close
 * - Focus restoration
 * - Modal configuration handling
 * - Promise-based API
 */

// Import for Node.js testing
const { ModalSystem, modalSystem } = typeof require !== 'undefined' 
  ? require('./modal-system.js') 
  : { ModalSystem: window.ModalSystem, modalSystem: window.modalSystem };

describe('ModalSystem', () => {
  let modal;
  
  beforeEach(() => {
    modal = new ModalSystem();
    // Clean up any existing modals
    const container = document.getElementById('modal-container');
    if (container) {
      container.remove();
    }
  });
  
  afterEach(() => {
    // Clean up
    const container = document.getElementById('modal-container');
    if (container) {
      container.remove();
    }
  });
  
  // ============================================
  // Modal Initialization
  // ============================================
  
  describe('Modal initialization', () => {
    it('creates modal container on init', () => {
      modal.init();
      
      const container = document.getElementById('modal-container');
      expect(container).toBeDefined();
      expect(container).not.toBeNull();
    });
    
    it('creates overlay element on init', () => {
      modal.init();
      
      const overlay = document.getElementById('modal-overlay');
      expect(overlay).toBeDefined();
      expect(overlay).not.toBeNull();
    });
    
    it('does not create duplicate containers on multiple init calls', () => {
      modal.init();
      const container1 = document.getElementById('modal-container');
      
      modal.init();
      const container2 = document.getElementById('modal-container');
      
      expect(container1).toBe(container2);
    });
  });
  
  // ============================================
  // Modal Display
  // ============================================
  
  describe('Modal display', () => {
    it('shows modal with configuration', async () => {
      const promise = modal.show({
        title: 'Test Modal',
        content: 'Test content',
        actions: [
          { label: 'OK', handler: () => modal.close() }
        ]
      });
      
      // Modal should be visible
      expect(modal.isOpen).toBe(true);
      
      const container = document.getElementById('modal-container');
      expect(container.style.display).not.toBe('none');
      
      // Close modal
      modal.close();
      
      // Wait for promise
      await promise;
    });
    
    it('displays modal title', async () => {
      const promise = modal.show({
        title: 'Test Title',
        content: 'Content',
        actions: [{ label: 'OK', handler: () => modal.close() }]
      });
      
      const dialog = document.querySelector('.modal-dialog');
      expect(dialog.textContent).toContain('Test Title');
      
      modal.close();
      await promise;
    });
    
    it('displays modal content', async () => {
      const promise = modal.show({
        title: 'Title',
        content: 'Test content here',
        actions: [{ label: 'OK', handler: () => modal.close() }]
      });
      
      const dialog = document.querySelector('.modal-dialog');
      expect(dialog.textContent).toContain('Test content here');
      
      modal.close();
      await promise;
    });
    
    it('displays action buttons', async () => {
      const promise = modal.show({
        title: 'Title',
        content: 'Content',
        actions: [
          { label: 'Yes', handler: () => modal.close() },
          { label: 'No', handler: () => modal.close() }
        ]
      });
      
      const buttons = document.querySelectorAll('.modal-dialog button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toBe('Yes');
      expect(buttons[1].textContent).toBe('No');
      
      modal.close();
      await promise;
    });
  });
  
  // ============================================
  // Event Listener Cleanup
  // ============================================
  
  describe('Event listener cleanup', () => {
    it('removes event listeners when modal closes', async () => {
      let handlerCalled = false;
      
      const promise = modal.show({
        title: 'Title',
        content: 'Content',
        actions: [
          {
            label: 'Click me',
            handler: () => {
              handlerCalled = true;
              modal.close();
            }
          }
        ]
      });
      
      // Click button
      const button = document.querySelector('.modal-dialog button');
      button.click();
      
      await promise;
      
      // Handler should have been called
      expect(handlerCalled).toBe(true);
      
      // Modal should be closed
      expect(modal.isOpen).toBe(false);
      
      // Container should be hidden
      const container = document.getElementById('modal-container');
      expect(container.style.display).toBe('none');
    });
    
    it('removes modal dialog from DOM on close', async () => {
      const promise = modal.show({
        title: 'Title',
        content: 'Content',
        actions: [{ label: 'OK', handler: () => modal.close() }]
      });
      
      // Dialog should exist
      let dialog = document.querySelector('.modal-dialog');
      expect(dialog).not.toBeNull();
      
      modal.close();
      await promise;
      
      // Dialog should be removed
      dialog = document.querySelector('.modal-dialog');
      expect(dialog).toBeNull();
    });
    
    it('closes modal when overlay is clicked', async () => {
      const promise = modal.show({
        title: 'Title',
        content: 'Content',
        actions: [{ label: 'OK', handler: () => {} }]
      });
      
      expect(modal.isOpen).toBe(true);
      
      // Click overlay
      const overlay = document.getElementById('modal-overlay');
      overlay.click();
      
      await promise;
      
      expect(modal.isOpen).toBe(false);
    });
    
    it('closes modal on Escape key', async () => {
      const promise = modal.show({
        title: 'Title',
        content: 'Content',
        actions: [{ label: 'OK', handler: () => {} }]
      });
      
      expect(modal.isOpen).toBe(true);
      
      // Simulate Escape key
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
      
      await promise;
      
      expect(modal.isOpen).toBe(false);
    });
  });
  
  // ============================================
  // Focus Management
  // ============================================
  
  describe('Focus management', () => {
    it('restores focus to previous element on close', async () => {
      // Create a button to focus
      const button = document.createElement('button');
      button.id = 'test-button';
      button.textContent = 'Test';
      document.body.appendChild(button);
      
      // Focus the button
      button.focus();
      expect(document.activeElement).toBe(button);
      
      const promise = modal.show({
        title: 'Title',
        content: 'Content',
        actions: [{ label: 'OK', handler: () => modal.close() }]
      });
      
      // Focus should move to modal
      const modalButton = document.querySelector('.modal-dialog button');
      expect(document.activeElement).not.toBe(button);
      
      modal.close();
      await promise;
      
      // Focus should be restored to original button
      expect(document.activeElement).toBe(button);
      
      // Clean up
      button.remove();
    });
    
    it('focuses first button when modal opens', async () => {
      const promise = modal.show({
        title: 'Title',
        content: 'Content',
        actions: [
          { label: 'First', handler: () => {} },
          { label: 'Second', handler: () => {} }
        ]
      });
      
      // Wait for focus to be set
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const buttons = document.querySelectorAll('.modal-dialog button');
      expect(document.activeElement).toBe(buttons[0]);
      
      modal.close();
      await promise;
    });
  });
  
  // ============================================
  // Promise-based API
  // ============================================
  
  describe('Promise-based API', () => {
    it('returns promise that resolves when modal closes', async () => {
      const promise = modal.show({
        title: 'Title',
        content: 'Content',
        actions: [{ label: 'OK', handler: () => modal.close() }]
      });
      
      expect(promise instanceof Promise).toBe(true);
      
      modal.close();
      
      const result = await promise;
      expect(result).toBeUndefined();
    });
    
    it('passes result to promise resolver', async () => {
      const promise = modal.show({
        title: 'Title',
        content: 'Content',
        actions: [{ label: 'OK', handler: () => modal.close('success') }]
      });
      
      modal.close('success');
      
      const result = await promise;
      expect(result).toBe('success');
    });
    
    it('confirm returns true when confirmed', async () => {
      const promise = modal.confirm('Confirm?', 'Are you sure?');
      
      // Click Yes button
      const buttons = document.querySelectorAll('.modal-dialog button');
      buttons[0].click();
      
      const result = await promise;
      expect(result).toBe(true);
    });
    
    it('confirm returns false when cancelled', async () => {
      const promise = modal.confirm('Confirm?', 'Are you sure?');
      
      // Click No button
      const buttons = document.querySelectorAll('.modal-dialog button');
      buttons[1].click();
      
      const result = await promise;
      expect(result).toBe(false);
    });
  });
  
  // ============================================
  // Modal Configuration
  // ============================================
  
  describe('Modal configuration', () => {
    it('supports alert dialog', async () => {
      const promise = modal.alert('Alert', 'This is an alert');
      
      const dialog = document.querySelector('.modal-dialog');
      expect(dialog.textContent).toContain('Alert');
      expect(dialog.textContent).toContain('This is an alert');
      
      const button = document.querySelector('.modal-dialog button');
      button.click();
      
      await promise;
    });
    
    it('supports warning dialog', async () => {
      const promise = modal.warning('Warning', 'This is a warning');
      
      const dialog = document.querySelector('.modal-dialog');
      expect(dialog.textContent).toContain('Warning');
      expect(dialog.textContent).toContain('This is a warning');
      
      const button = document.querySelector('.modal-dialog button');
      button.click();
      
      await promise;
    });
    
    it('supports success dialog', async () => {
      const promise = modal.success('Success', 'Operation successful');
      
      const dialog = document.querySelector('.modal-dialog');
      expect(dialog.textContent).toContain('Success');
      expect(dialog.textContent).toContain('Operation successful');
      
      const button = document.querySelector('.modal-dialog button');
      button.click();
      
      await promise;
    });
    
    it('calls onClose callback when modal closes', async () => {
      let onCloseCalled = false;
      
      const promise = modal.show({
        title: 'Title',
        content: 'Content',
        actions: [{ label: 'OK', handler: () => modal.close() }],
        onClose: () => {
          onCloseCalled = true;
        }
      });
      
      modal.close();
      await promise;
      
      expect(onCloseCalled).toBe(true);
    });
  });
  
  // ============================================
  // Action Handlers
  // ============================================
  
  describe('Action handlers', () => {
    it('executes action handler when button clicked', async () => {
      let handlerCalled = false;
      
      const promise = modal.show({
        title: 'Title',
        content: 'Content',
        actions: [
          {
            label: 'Click me',
            handler: () => {
              handlerCalled = true;
              modal.close();
            }
          }
        ]
      });
      
      const button = document.querySelector('.modal-dialog button');
      button.click();
      
      await promise;
      
      expect(handlerCalled).toBe(true);
    });
    
    it('supports async action handlers', async () => {
      let handlerCalled = false;
      
      const promise = modal.show({
        title: 'Title',
        content: 'Content',
        actions: [
          {
            label: 'Async',
            handler: async () => {
              await new Promise(resolve => setTimeout(resolve, 10));
              handlerCalled = true;
              modal.close();
            }
          }
        ]
      });
      
      const button = document.querySelector('.modal-dialog button');
      button.click();
      
      await promise;
      
      expect(handlerCalled).toBe(true);
    });
    
    it('handles handler errors gracefully', async () => {
      const promise = modal.show({
        title: 'Title',
        content: 'Content',
        actions: [
          {
            label: 'Error',
            handler: () => {
              throw new Error('Handler error');
            }
          }
        ]
      });
      
      const button = document.querySelector('.modal-dialog button');
      
      // Should not throw
      expect(() => {
        button.click();
      }).not.toThrow();
      
      // Modal should still be open (handler didn't close it)
      expect(modal.isOpen).toBe(true);
      
      modal.close();
      await promise;
    });
  });
});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ModalSystem, modalSystem };
}
