/**
 * Custom Alert System
 * Replaces standard browser alerts with styled popups
 */

class CustomAlert {
    constructor() {
        this.overlay = null;
        this.box = null;
        this.init();
    }

    init() {
        // Create DOM structure
        if (document.getElementById('customAlertOverlay')) {
            return; // Already initialized
        }

        const overlay = document.createElement('div');
        overlay.id = 'customAlertOverlay';
        overlay.className = 'custom-alert-overlay';

        const box = document.createElement('div');
        box.id = 'customAlertBox';
        box.className = 'custom-alert-box';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        this.overlay = overlay;
        this.box = box;

        // Close on overlay click (optional, maybe not for alerts that require action)
        // this.overlay.addEventListener('click', (e) => {
        //   if (e.target === this.overlay) this.close();
        // });
    }

    /**
     * Show a generic alert
     * @param {string} title - The title of the alert
     * @param {string} message - The message body
     * @param {string} type - 'success', 'failed', 'warning', 'confirmation'
     * @param {string} icon - Icon character (✓, ✕, !, ?)
     * @param {string} btnText - Text for the primary button
     * @returns {Promise} - Resolves when closed
     */
    show(title, message, type = 'success', icon = '✓', btnText = 'Okay') {
        return new Promise((resolve) => {
            // Reset classes
            this.box.className = `custom-alert-box alert-${type}`;

            // Build HTML
            this.box.innerHTML = `
        <div class="custom-alert-header">
          <div class="custom-alert-icon-circle">${icon}</div>
        </div>
        <div class="custom-alert-content">
          <div class="custom-alert-title">${title}</div>
          <div class="custom-alert-message">${message}</div>
          <div class="custom-alert-actions">
            <button class="custom-alert-btn custom-alert-btn-primary" id="customAlertBtn">${btnText}</button>
          </div>
        </div>
      `;

            // Show
            this.overlay.classList.add('active');

            // Handle click
            const btn = document.getElementById('customAlertBtn');
            btn.focus();

            const closeHandler = () => {
                this.close();
                resolve(true);
                btn.removeEventListener('click', closeHandler);
            };

            btn.addEventListener('click', closeHandler);
        });
    }

    /**
     * Show a confirmation dialog
     * @param {string} title 
     * @param {string} message 
     * @returns {Promise<boolean>} - Resolves true if Yes, false if No
     */

    // dara ang suspect sa banning
    confirm(title, message, btnYesText = 'Yes', btnNoText = 'No') {
        return new Promise((resolve) => {
            this.box.className = `custom-alert-box alert-confirmation`;

            this.box.innerHTML = `
        <div class="custom-alert-header">
          <div class="custom-alert-icon-circle">?</div>
        </div>
        <div class="custom-alert-content">
          <div class="custom-alert-title">${title}</div>
          <div class="custom-alert-message">${message}</div>
          <div class="custom-alert-actions">
            <button class="custom-alert-btn custom-alert-btn-secondary" id="customAlertBtnNo">${btnNoText}</button>
            <button class="custom-alert-btn custom-alert-btn-primary" id="customAlertBtnYes">${btnYesText}</button>
          </div>
        </div>
      `;

            this.overlay.classList.add('active');

            const btnYes = document.getElementById('customAlertBtnYes');
            const btnNo = document.getElementById('customAlertBtnNo');

            btnYes.focus();

            const handleYes = () => {
                this.close();
                resolve(true);
                cleanup();
            };

            const handleNo = () => {
                this.close();
                resolve(false);
                cleanup();
            };

            const cleanup = () => {
                btnYes.removeEventListener('click', handleYes);
                btnNo.removeEventListener('click', handleNo);
            };

            btnYes.addEventListener('click', handleYes);
            btnNo.addEventListener('click', handleNo);
        });
    }

    close() {
        this.overlay.classList.remove('active');
    }

    // Convenience methods
    success(title, message) {
        return this.show(title, message, 'success', '✓', 'Okay');
    }

    error(title, message) {
        return this.show(title, message, 'failed', '✕', 'Okay');
    }

    warning(title, message) {
        return this.show(title, message, 'warning', '!', 'Okay');
    }

    info(title, message) {
        return this.show(title, message, 'info', 'ℹ️', 'Okay');
    }

    /**
     * Show loading overlay with spinner
     * @param {string} message - Loading message (default: "Loading...")
     */
    showLoading(message = 'Loading...') {
        // Reset classes for loading
        this.box.className = 'custom-alert-box alert-loading';

        // Build loading HTML with spinner
        this.box.innerHTML = `
            <div class="custom-alert-header">
                <div class="loading-spinner"></div>
            </div>
            <div class="custom-alert-content">
                <div class="custom-alert-title">${message}</div>
                <div class="custom-alert-message">Please wait while we process your request</div>
            </div>
        `;

        // Show overlay
        this.overlay.classList.add('active');
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.overlay.classList.remove('active');
    }
}

// Initialize global instance
window.customAlert = new CustomAlert();

// Make loading functions globally available
window.showLoadingOverlay = function(message) {
    window.customAlert.showLoading(message);
};

window.hideLoadingOverlay = function() {
    window.customAlert.hideLoading();
};

// Optional: Override window.alert (Note: this makes it async-ish, but window.alert is sync.
// Code expecting sync blocking will continue immediately. Use with caution or refactor.)
/*
window.alert = function(message) {
  window.customAlert.warning('Alert', message);
};
*/
