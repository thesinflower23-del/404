/* ============================================
   BestBuddies Pet Grooming - Main Utilities
   ============================================ */

// ============================================
// Global Button Click Protection System
// Prevents duplicate clicks on any button
// ============================================
const ButtonProtection = {
  isProcessing: false,
  cooldownMs: 2000, // 2 second cooldown
  
  /**
   * Protect a button click from duplicates
   * @param {Function} actionFn - The async action function to execute
   * @param {HTMLElement} button - The button element (optional)
   * @param {string} actionName - Name for logging (optional)
   */
  async protect(actionFn, button = null, actionName = 'action') {
    if (this.isProcessing) {
      console.log(`[ButtonProtection] ${actionName} blocked - action in progress`);
      return false;
    }
    
    this.isProcessing = true;
    
    // Disable the clicked button visually
    if (button) {
      button.disabled = true;
      button.style.opacity = '0.6';
      button.style.pointerEvents = 'none';
      button.dataset.originalText = button.textContent;
      button.textContent = 'Processing...';
    }
    
    // Disable all buttons with same class
    const allButtons = document.querySelectorAll('button:not([disabled])');
    const disabledButtons = [];
    allButtons.forEach(btn => {
      if (btn !== button && !btn.classList.contains('btn-outline')) {
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';
        disabledButtons.push(btn);
      }
    });
    
    try {
      await actionFn();
      return true;
    } catch (error) {
      console.error(`[ButtonProtection] ${actionName} failed:`, error);
      return false;
    } finally {
      // Reset after cooldown
      setTimeout(() => {
        this.isProcessing = false;
        
        // Re-enable the clicked button
        if (button) {
          button.disabled = false;
          button.style.opacity = '1';
          button.style.pointerEvents = 'auto';
          if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
          }
        }
        
        // Re-enable other buttons
        disabledButtons.forEach(btn => {
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
        });
      }, this.cooldownMs);
    }
  },
  
  /**
   * Quick check if an action can proceed
   */
  canProceed() {
    return !this.isProcessing;
  },
  
  /**
   * Reset protection state (use carefully)
   */
  reset() {
    this.isProcessing = false;
  }
};

// Make it globally available
window.ButtonProtection = ButtonProtection;

// Simple wrapper for inline onclick handlers
async function protectedClick(actionFn, buttonElement, actionName) {
  return ButtonProtection.protect(actionFn, buttonElement, actionName);
}
window.protectedClick = protectedClick;

// Store Contact Information
const STORE_INFO = {
  name: "Yen's Pet Shop",
  phone: '0951 986 5882',
  email: 'yenspetshop@gmail.com',
  address: '' // Add address if needed
};
window.STORE_INFO = STORE_INFO;

const STANDARD_TIME_SLOTS = ['9am-12pm', '12pm-3pm', '3pm-6pm']; // 3-hour intervals
const GROOMER_DAILY_LIMIT = 3; // Each groomer handles 3 bookings per day
const GROOMING_DURATION_HOURS = 3; // Duration is 3 hours
const WARNING_THRESHOLD = 3;
const WARNING_HARD_LIMIT = 5;
const CALENDAR_BLACKOUTS_KEY = 'calendarBlackouts';
const CUSTOMER_PROFILE_KEY = 'customerProfiles';
const BOOKING_FEE = 100;
const BAN_UPLIFT_FEE = 500;
const CURRENCY_SYMBOL = '\u20B1'; // Peso symbol using Unicode escape to avoid encoding issues


const ADDON_PRICE_MAP = {
  toothbrush: {
    key: 'toothbrush',
    label: 'Toothbrush Add-on',
    price: 25
  },
  dematting: {
    key: 'dematting',
    label: 'De-matting Add-on',
    price: 80 // Starting rate; actual depends on coat condition
  }
};

const SINGLE_SERVICE_PRICING = {
  nail: {
    id: 'nail',
    label: 'Nail Trim',
    tiers: {
      small: { label: 'Nail Trim ≤ 5kg', price: 50 },
      medium: { label: 'Nail Trim 5.1-15kg', price: 60 },
      large: { label: 'Nail Trim 15.1-30kg', price: 70 },
      xlarge: { label: 'Nail Trim ≥ 30.1kg', price: 80 }
    }
  },
  ear: {
    id: 'ear',
    label: 'Ear Clean',
    tiers: {
      small: { label: 'Ear Clean ≤ 5kg', price: 70 },
      medium: { label: 'Ear Clean 5.1-15kg', price: 80 },
      large: { label: 'Ear Clean 15.1-30kg', price: 85 },
      xlarge: { label: 'Ear Clean ≥ 30.1kg', price: 90 }
    }
  },
  face: {
    id: 'face',
    label: 'Face Trim',
    tiers: {
      small: { label: 'Face Trim ≤ 5kg', price: 120 },
      medium: { label: 'Face Trim 5.1-15kg', price: 140 },
      large: { label: 'Face Trim 15.1-30kg', price: 155 },
      xlarge: { label: 'Face Trim ≥ 30.1kg', price: 170 }
    }
  }
};

const PREMIUM_PACKAGES = [
  {
    id: 'full-basic',
    name: '✂️ Full Package · Basic',
    type: 'any',
    duration: 75,
    includes: [
      'Bath & Dry',
      'Brush / De-Shedding',
      'Hair Cut (Basic)',
      'Nail Trim',
      'Ear Clean',
      'Foot Pad Clean',
      'Cologne'
    ],
    tiers: [
      { label: '5kg & below', price: 530 },
      { label: '5.1 – 8kg', price: 630 },
      { label: '8.1 – 15kg', price: 750 },
      { label: '15.1 – 30kg', price: 800 },
      { label: '30kg & above', price: 920 }
    ]
  },
  {
    id: 'full-styled',
    name: '✂️ Full Package · Trimming & Styling',
    type: 'any',
    duration: 90,
    includes: [
      'Bath & Dry',
      'Brush / De-Shedding',
      'Hair Cut (Styled)',
      'Nail Trim',
      'Ear Clean',
      'Foot Pad Clean',
      'Cologne'
    ],
    tiers: [
      { label: '5kg & below', price: 630 },
      { label: '5.1 – 8kg', price: 730 },
      { label: '8.1 – 15kg', price: 880 },
      { label: '15.1 – 30kg', price: 930 },
      { label: '30kg & above', price: 1050 }
    ]
  },
  {
    id: 'bubble-bath',
    name: '🧴 Shampoo Bath ’n Bubble',
    type: 'any',
    duration: 60,
    includes: [
      'Bath & Dry',
      'Brush / De-Shedding',
      'Hygiene Trim',
      'Nail Trim',
      'Ear Clean',
      'Foot Pad Clean',
      'Cologne'
    ],
    tiers: [
      { label: '5kg & below', price: 350 },
      { label: '5.1 – 8kg', price: 450 },
      { label: '8.1 – 15kg', price: 550 },
      { label: '15.1 – 30kg', price: 600 },
      { label: '30kg & above', price: 700 }
    ]
  },
  {
    id: 'single-service',
    name: '🚿 Single Service · Mix & Match',
    type: 'any',
    duration: 45,
    includes: [
      'Choose from Nail Trim, Ear Clean, or Hygiene Focus',
      'Add to any package as needed'
    ],
    tiers: [
      { label: 'Nail Trim 5kg & below', price: 50 },
      { label: 'Nail Trim 30kg & above', price: 80 },
      { label: 'Ear Clean 5kg & below', price: 70 },
      { label: 'Ear Clean 30kg & above', price: 90 }
    ]
  },
  {
    id: 'addon-toothbrush',
    name: '🛁 Add-on · Toothbrush',
    type: 'addon',
    duration: 5,
    includes: ['Individual toothbrush to bring home'],
    tiers: [{ label: 'Per item', price: 25 }]
  },
  {
    id: 'addon-dematting',
    name: '🛁 Add-on · De-matting',
    type: 'addon',
    duration: 25,
    includes: ['Targeted de-matting service'],
    tiers: [
      { label: 'Light tangles', price: 80 },
      { label: 'Heavy tangles', price: 250 }
    ]
  }
];

// ============================================
// 🔧 REFERENCE CUTS - Database-backed with unique IDs
// Each cut has a unique ID for easy tracking and no duplicates
// ============================================
const DEFAULT_REFERENCE_CUTS = [
  // Dog Cuts
  { 
    id: 'cut-puppy', 
    name: 'Puppy Cut', 
    description: 'Short & uniform all over, easy to maintain',
    image: 'assets/1.jpg',
    petTypes: ['dog'],
    isActive: true,
    sortOrder: 1
  },
  { 
    id: 'cut-teddy-bear', 
    name: 'Teddy Bear Cut', 
    description: 'Rounded face, fluffy body - looks like a teddy bear',
    image: 'assets/2.jpg',
    petTypes: ['dog'],
    isActive: true,
    sortOrder: 2
  },
  { 
    id: 'cut-lion', 
    name: 'Lion Cut', 
    description: 'Mane around head, short body - majestic look',
    image: 'assets/3.jpg',
    petTypes: ['dog'],
    isActive: true,
    sortOrder: 3
  },
  { 
    id: 'cut-summer', 
    name: 'Summer Cut', 
    description: 'Very short all over for hot weather',
    image: 'assets/4.jpg',
    petTypes: ['dog'],
    isActive: true,
    sortOrder: 4
  },
  { 
    id: 'cut-kennel', 
    name: 'Kennel Cut', 
    description: 'Practical short cut, easy grooming',
    image: 'assets/5.jpg',
    petTypes: ['dog'],
    isActive: true,
    sortOrder: 5
  },
  { 
    id: 'cut-show', 
    name: 'Show Cut', 
    description: 'Breed-standard styling for competitions',
    image: 'assets/6.jpg',
    petTypes: ['dog'],
    isActive: true,
    sortOrder: 6
  },
  // Cat Cuts
  { 
    id: 'belly-shave', 
    name: 'Belly Shave', 
    description: 'Shaved belly area for hygiene and comfort',
    image: 'assets/cuts/bellyshave.png',
    petTypes: ['cat'],
    isActive: true,
    sortOrder: 7
  },
  { 
    id: 'hygiene-cut', 
    name: 'Hygiene Cut', 
    description: 'Sanitary trim around private areas',
    image: 'assets/cuts/hygncut.png',
    petTypes: ['cat'],
    isActive: true,
    sortOrder: 8
  },
  { 
    id: 'cat-lion-cut', 
    name: 'Lion Cut', 
    description: 'Short body with full head mane and tail tuft',
    image: 'assets/cuts/lioncut.png',
    petTypes: ['cat'],
    isActive: true,
    sortOrder: 9
  }
];

// Get reference cuts from localStorage/Firebase
function getReferenceCuts() {
  const stored = localStorage.getItem('referenceCuts');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : DEFAULT_REFERENCE_CUTS;
    } catch (e) {
      console.error('Error parsing reference cuts:', e);
      return DEFAULT_REFERENCE_CUTS;
    }
  }
  // Initialize with defaults if not found
  localStorage.setItem('referenceCuts', JSON.stringify(DEFAULT_REFERENCE_CUTS));
  return DEFAULT_REFERENCE_CUTS;
}

// Save reference cuts to localStorage/Firebase
function saveReferenceCuts(cuts) {
  localStorage.setItem('referenceCuts', JSON.stringify(cuts));
}

// Get a single reference cut by ID
function getReferenceCutById(cutId) {
  const cuts = getReferenceCuts();
  return cuts.find(c => c.id === cutId) || null;
}

// Get reference cut name by ID (for display)
function getReferenceCutName(cutId) {
  if (!cutId) return null;
  const cut = getReferenceCutById(cutId);
  return cut ? cut.name : cutId; // Fallback to ID if not found
}

// Get reference cut image by ID (for display)
function getReferenceCutImage(cutId) {
  if (!cutId) return null;
  const cut = getReferenceCutById(cutId);
  return cut ? cut.image : null;
}

// Get active reference cuts only
function getActiveReferenceCuts(petType = null) {
  const cuts = getReferenceCuts();
  let active = cuts.filter(c => c.isActive);
  if (petType) {
    active = active.filter(c => c.petTypes.includes(petType));
  }
  return active.sort((a, b) => a.sortOrder - b.sortOrder);
}

// Initialize reference cuts on app load
function initializeReferenceCuts() {
  // Always update to ensure cat cuts are included
  localStorage.setItem('referenceCuts', JSON.stringify(DEFAULT_REFERENCE_CUTS));
  console.log('[ReferenceCuts] Initialized/updated with defaults (including cat cuts)');
}

// Export for global access
window.getReferenceCuts = getReferenceCuts;
window.saveReferenceCuts = saveReferenceCuts;
window.getReferenceCutById = getReferenceCutById;
window.getReferenceCutName = getReferenceCutName;
window.getReferenceCutImage = getReferenceCutImage;
window.getActiveReferenceCuts = getActiveReferenceCuts;
window.DEFAULT_REFERENCE_CUTS = DEFAULT_REFERENCE_CUTS;

// ============================================
// 🛡️ SUBMISSION STATUS SYSTEM - Database-backed duplicate prevention
// ============================================
// Tracks submission status in database to prevent duplicate bookings
// Status flow: idle -> submitting -> success/failed -> idle
// Each submission has a unique token for tracking
// ============================================
const SUBMISSION_STATUS_KEY = 'bookingSubmissionStatus';

/**
 * Get current submission status from database
 * @returns {Object} Current submission status
 */
function getSubmissionStatus() {
  const stored = localStorage.getItem(SUBMISSION_STATUS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('[SubmissionStatus] Error parsing status:', e);
    }
  }
  return {
    status: 'idle',        // idle, submitting, success, failed
    token: null,           // Unique submission token
    userId: null,          // User who is submitting
    startedAt: null,       // When submission started
    completedAt: null,     // When submission completed
    bookingId: null,       // Created booking ID (on success)
    error: null            // Error message (on failure)
  };
}

/**
 * Save submission status to database (uses batched writes)
 * @param {Object} status - Status object to save
 */
function saveSubmissionStatus(status) {
  // Use StorageManager if available for batched writes
  if (window.StorageManager) {
    window.StorageManager.queueWrite(SUBMISSION_STATUS_KEY, status);
  } else {
    localStorage.setItem(SUBMISSION_STATUS_KEY, JSON.stringify(status));
  }
}

/**
 * Generate unique submission token
 * @returns {string} Unique token
 */
function generateSubmissionToken() {
  return `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start a new submission - returns token if allowed, null if blocked
 * @param {string} userId - User ID attempting submission
 * @returns {string|null} Submission token or null if blocked
 */
function startSubmission(userId) {
  const current = getSubmissionStatus();
  
  // Check if another submission is in progress
  if (current.status === 'submitting') {
    // Check if it's stale (older than 30 seconds)
    const age = Date.now() - (current.startedAt || 0);
    if (age < 30000) {
      console.log('[SubmissionStatus] BLOCKED - Submission in progress:', current.token);
      return null;
    }
    // Stale submission, allow override
    console.log('[SubmissionStatus] Stale submission detected, allowing override');
  }
  
  // Create new submission
  const token = generateSubmissionToken();
  const status = {
    status: 'submitting',
    token: token,
    userId: userId,
    startedAt: Date.now(),
    completedAt: null,
    bookingId: null,
    error: null
  };
  
  saveSubmissionStatus(status);
  return token;
}

/**
 * Complete a submission with success
 * @param {string} token - Submission token
 * @param {string} bookingId - Created booking ID
 */
function completeSubmissionSuccess(token, bookingId) {
  const current = getSubmissionStatus();
  
  // Verify token matches
  if (current.token !== token) {
    console.warn('[SubmissionStatus] Token mismatch on success:', token, 'vs', current.token);
    return false;
  }
  
  const status = {
    ...current,
    status: 'success',
    completedAt: Date.now(),
    bookingId: bookingId,
    error: null
  };
  
  saveSubmissionStatus(status);
  console.log('[SubmissionStatus] Submission completed successfully:', token, bookingId);
  
  // Auto-reset to idle after 5 seconds
  setTimeout(() => {
    resetSubmissionStatus();
  }, 5000);
  
  return true;
}

/**
 * Complete a submission with failure
 * @param {string} token - Submission token
 * @param {string} error - Error message
 */
function completeSubmissionFailed(token, error) {
  const current = getSubmissionStatus();
  
  // Verify token matches
  if (current.token !== token) {
    console.warn('[SubmissionStatus] Token mismatch on failure:', token, 'vs', current.token);
    return false;
  }
  
  const status = {
    ...current,
    status: 'failed',
    completedAt: Date.now(),
    error: error
  };
  
  saveSubmissionStatus(status);
  console.log('[SubmissionStatus] Submission failed:', token, error);
  
  // Auto-reset to idle after 3 seconds
  setTimeout(() => {
    resetSubmissionStatus();
  }, 3000);
  
  return true;
}

/**
 * Reset submission status to idle
 */
function resetSubmissionStatus() {
  const status = {
    status: 'idle',
    token: null,
    userId: null,
    startedAt: null,
    completedAt: null,
    bookingId: null,
    error: null
  };
  saveSubmissionStatus(status);
  console.log('[SubmissionStatus] Status reset to idle');
}

/**
 * Check if submission is allowed for user
 * @param {string} userId - User ID
 * @returns {boolean} True if submission is allowed
 */
function canSubmit(userId) {
  const current = getSubmissionStatus();
  
  if (current.status === 'idle') {
    return true;
  }
  
  if (current.status === 'submitting') {
    // Check if stale
    const age = Date.now() - (current.startedAt || 0);
    if (age >= 30000) {
      return true; // Stale, allow
    }
    return false; // Active submission
  }
  
  // success or failed - allow new submission
  return true;
}

// Export submission status functions
window.getSubmissionStatus = getSubmissionStatus;
window.startSubmission = startSubmission;
window.completeSubmissionSuccess = completeSubmissionSuccess;
window.completeSubmissionFailed = completeSubmissionFailed;
window.resetSubmissionStatus = resetSubmissionStatus;
window.canSubmit = canSubmit;

// ============================================
// 🛡️ ACTION LOCK SYSTEM - Database-backed duplicate prevention for ALL actions
// ============================================
// Generic system to prevent duplicate actions on any button/operation
// Used for: Confirm, Cancel, Start Service, Complete, Reschedule, etc.
// Each action type + target ID has its own lock
// ============================================
const ACTION_LOCK_KEY = 'actionLocks';
const ACTION_LOCK_TIMEOUT = 30000; // 30 seconds max lock time

/**
 * Get all action locks from database
 * @returns {Object} Map of action locks
 */
function getActionLocks() {
  const stored = localStorage.getItem(ACTION_LOCK_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('[ActionLock] Error parsing locks:', e);
    }
  }
  return {};
}

/**
 * Save action locks to database
 * @param {Object} locks - Locks object to save
 */
function saveActionLocks(locks) {
  localStorage.setItem(ACTION_LOCK_KEY, JSON.stringify(locks));
}

/**
 * Generate unique lock key for action + target
 * @param {string} actionType - Type of action (confirm, cancel, start, complete, etc.)
 * @param {string} targetId - Target ID (booking ID, etc.)
 * @returns {string} Lock key
 */
function getActionLockKey(actionType, targetId) {
  return `${actionType}-${targetId}`;
}

/**
 * Try to acquire lock for an action
 * @param {string} actionType - Type of action
 * @param {string} targetId - Target ID
 * @param {string} userId - User attempting action (optional)
 * @returns {string|null} Lock token if acquired, null if blocked
 */
function acquireActionLock(actionType, targetId, userId = null) {
  const locks = getActionLocks();
  const lockKey = getActionLockKey(actionType, targetId);
  const existing = locks[lockKey];
  
  // Check if lock exists and is not stale
  if (existing) {
    const age = Date.now() - (existing.startedAt || 0);
    if (age < ACTION_LOCK_TIMEOUT) {
      console.log(`[ActionLock] BLOCKED - Lock exists for ${lockKey}:`, existing.token);
      return null;
    }
    // Stale lock, allow override
    console.log(`[ActionLock] Stale lock detected for ${lockKey}, allowing override`);
  }
  
  // Create new lock
  const token = `lock-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  locks[lockKey] = {
    token: token,
    actionType: actionType,
    targetId: targetId,
    userId: userId,
    startedAt: Date.now(),
    status: 'processing'
  };
  
  saveActionLocks(locks);
  console.log(`[ActionLock] Lock acquired for ${lockKey}:`, token);
  return token;
}

/**
 * Release lock after action completes
 * @param {string} actionType - Type of action
 * @param {string} targetId - Target ID
 * @param {string} token - Lock token to verify
 * @param {string} result - Result status (success, failed, cancelled)
 * @returns {boolean} True if released successfully
 */
function releaseActionLock(actionType, targetId, token, result = 'success') {
  const locks = getActionLocks();
  const lockKey = getActionLockKey(actionType, targetId);
  const existing = locks[lockKey];
  
  // Verify token matches
  if (!existing || existing.token !== token) {
    console.warn(`[ActionLock] Token mismatch for ${lockKey}:`, token, 'vs', existing?.token);
    return false;
  }
  
  // Update lock status and schedule removal
  locks[lockKey] = {
    ...existing,
    status: result,
    completedAt: Date.now()
  };
  saveActionLocks(locks);
  
  console.log(`[ActionLock] Lock released for ${lockKey}:`, token, result);
  
  // Remove lock after short delay
  setTimeout(() => {
    const currentLocks = getActionLocks();
    if (currentLocks[lockKey]?.token === token) {
      delete currentLocks[lockKey];
      saveActionLocks(currentLocks);
      console.log(`[ActionLock] Lock removed for ${lockKey}`);
    }
  }, 2000);
  
  return true;
}

/**
 * Check if action is locked
 * @param {string} actionType - Type of action
 * @param {string} targetId - Target ID
 * @returns {boolean} True if locked
 */
function isActionLocked(actionType, targetId) {
  const locks = getActionLocks();
  const lockKey = getActionLockKey(actionType, targetId);
  const existing = locks[lockKey];
  
  if (!existing) return false;
  
  // Check if stale
  const age = Date.now() - (existing.startedAt || 0);
  if (age >= ACTION_LOCK_TIMEOUT) {
    return false; // Stale, not locked
  }
  
  return existing.status === 'processing';
}

/**
 * Clean up stale locks
 */
function cleanupStaleLocks() {
  const locks = getActionLocks();
  const now = Date.now();
  let changed = false;
  
  Object.keys(locks).forEach(key => {
    const lock = locks[key];
    const age = now - (lock.startedAt || 0);
    if (age >= ACTION_LOCK_TIMEOUT) {
      delete locks[key];
      changed = true;
      console.log(`[ActionLock] Cleaned up stale lock: ${key}`);
    }
  });
  
  if (changed) {
    saveActionLocks(locks);
  }
}

/**
 * Execute action with lock protection
 * @param {string} actionType - Type of action (confirm, cancel, start, complete)
 * @param {string} targetId - Target ID (booking ID)
 * @param {Function} actionFn - Async function to execute
 * @param {Object} options - Options (userId, onBlocked callback)
 * @returns {Promise<any>} Result of action or null if blocked
 */
async function executeWithLock(actionType, targetId, actionFn, options = {}) {
  const { userId = null, onBlocked = null } = options;
  
  // Try to acquire lock
  const token = acquireActionLock(actionType, targetId, userId);
  if (!token) {
    console.log(`[ActionLock] Action blocked: ${actionType} on ${targetId}`);
    if (onBlocked) {
      onBlocked();
    }
    return null;
  }
  
  try {
    // Execute the action
    const result = await actionFn();
    
    // Release lock with success
    releaseActionLock(actionType, targetId, token, 'success');
    
    return result;
  } catch (error) {
    // Release lock with failure
    releaseActionLock(actionType, targetId, token, 'failed');
    throw error;
  }
}

// Export action lock functions
window.acquireActionLock = acquireActionLock;
window.releaseActionLock = releaseActionLock;
window.isActionLocked = isActionLocked;
window.executeWithLock = executeWithLock;
window.cleanupStaleLocks = cleanupStaleLocks;

// Clean up stale locks on page load
cleanupStaleLocks();

const NAMED_GROOMERS = [
  { id: 'groomer-sam', name: 'Sam', specialty: 'Small breed specialist', email: 'sam@gmail.com' },
  { id: 'groomer-jom', name: 'Jom', specialty: 'Double-coat care', email: 'jom@gmail.com' },
  { id: 'groomer-botchoy', name: 'Botchoy', specialty: 'Creative trims & styling', email: 'botchoy@gmail.com' },
  { id: 'groomer-jinold', name: 'Jinold', specialty: 'Senior pet handler', email: 'jinold@gmail.com' },
  { id: 'groomer-ejay', name: 'Ejay', specialty: 'Cat whisperer', email: 'ejay@gmail.com' }
];

const DEFAULT_GROOMERS = NAMED_GROOMERS.map(({ id, name, specialty }) => ({
  id,
  name,
  specialty,
  maxDailyBookings: GROOMER_DAILY_LIMIT,
  reserve: false
}));

const DEFAULT_GROOMER_ACCOUNTS = NAMED_GROOMERS.map(({ id, name, email }) => ({
  name,
  email,
  groomerId: id
}));

window.STANDARD_TIME_SLOTS = STANDARD_TIME_SLOTS;

// Return a local YYYY-MM-DD string for a Date (avoids UTC shift from toISOString)
function toLocalISO(date) {
  if (!date) date = new Date();
  if (!(date instanceof Date)) date = new Date(date);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
window.toLocalISO = toLocalISO;

// Initialize default data on first load
// Fix 1: Make initializeData return a Promise
async function initializeData() {
  await ensurePackages();
  ensureGroomerDirectory();

  // Wait for current user (returns null if unauthenticated)
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (e) {
    user = null;
  }

  if (user) {
    // Only run admin/groomer persistence when a real user is signed in
    await ensureDefaultAdmin();
    await ensureGroomerAccounts();
  } else {
    console.log('No authenticated user — skipping protected DB initialization.');
  }

  await migrateLegacyBookings();
  await ensureBookingShortCodes();
  return Promise.resolve();
}

function ensureCollection(key, fallback) {
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(fallback));
  }
}

async function ensurePackages() {
  try {
    let packages = await getPackages();
    if (typeof packages === 'function') {
      packages = PREMIUM_PACKAGES;
    }
    if (!Array.isArray(packages) || !packages.length || packages.some(pkg => !pkg.tiers)) {
      // Save default packages to localStorage/Firebase
      localStorage.setItem('packages', JSON.stringify(PREMIUM_PACKAGES));
    }
  } catch (error) {
    console.warn('Could not check packages:', error);
    localStorage.setItem('packages', JSON.stringify(PREMIUM_PACKAGES));
  }
}

async function ensureDefaultAdmin() {
  try {
    const users = await getUsers();
    let updated = false;
    if (!users.some(user => user.email === 'admin@gmail.com')) {
      users.push({
        id: 'admin-001',
        name: 'Admin User',
        email: 'admin@gmail.com',
        password: 'admin12345',
        role: 'admin',
        createdAt: Date.now(),
        warnings: 0
      });
      updated = true;
    }
    // Create permanent customer account
    if (!users.some(user => user.email === 'qwert@gmail.com')) {
      users.push({
        id: 'customer-perm-001',
        name: 'Customer Account',
        email: 'qwert@gmail.com',
        password: 'qwerty',
        role: 'customer',
        createdAt: Date.now(),
        warnings: 0
      });
      updated = true;
    }
    if (updated) {
      await saveUsers(users);
    }
  } catch (error) {
    console.warn('Could not ensure default admin:', error);
  }
}

async function ensureGroomerAccounts() {
  try {
    const users = await getUsers();
    let updated = false;
    DEFAULT_GROOMER_ACCOUNTS.forEach(account => {
      const legacyEmail = account.email.replace('@gmail.com', '@gmai.com');
      let existing = users.find(user => user.groomerId === account.groomerId);
      if (!existing) {
        existing = users.find(user => user.email === account.email);
      }
      if (!existing && legacyEmail !== account.email) {
        existing = users.find(user => user.email === legacyEmail);
      }

      if (existing) {
        if (existing.email !== account.email) {
          existing.email = account.email;
          updated = true;
        }
        if (existing.groomerId !== account.groomerId) {
          existing.groomerId = account.groomerId;
          updated = true;
        }
        if (existing.role !== 'groomer') {
          existing.role = 'groomer';
          updated = true;
        }
        return;
      }

      users.push({
        id: `${account.groomerId}-user`,
        name: account.name,
        email: account.email,
        password: 'qwerty',
        role: 'groomer',
        groomerId: account.groomerId,
        createdAt: Date.now(),
        warnings: 0
      });
      updated = true;
    });
    if (updated) {
      await saveUsers(users);
    }
  } catch (error) {
    console.warn('Could not ensure groomer accounts:', error);
  }
}

function ensureGroomerDirectory() {
  const stored = JSON.parse(localStorage.getItem('groomers') || 'null');
  if (!stored || !stored.length) {
    localStorage.setItem('groomers', JSON.stringify(DEFAULT_GROOMERS));
    return;
  }
  const merged = [...stored];
  DEFAULT_GROOMERS.forEach(defaultGroomer => {
    if (!merged.some(g => g.id === defaultGroomer.id)) {
      merged.push({ ...defaultGroomer });
    }
  });
  const normalized = merged.map(groomer => ({
    id: groomer.id || `groomer-${generateId()}`,
    name: groomer.name || 'On-duty Groomer',
    specialty: groomer.specialty || 'All-around stylist',
    reserve: !!groomer.reserve,
    maxDailyBookings: groomer.maxDailyBookings || GROOMER_DAILY_LIMIT,
    staffId: groomer.staffId || null
  }));
  localStorage.setItem('groomers', JSON.stringify(normalized));
}

async function migrateLegacyBookings() {
  const bookings = await getBookings();

  // Ensure bookings is an array
  if (!Array.isArray(bookings)) {
    console.warn('Bookings is not an array:', bookings);
    return;
  }

  const groomers = await getGroomers();
  let shouldSave = false;
  const cutExamples = ['Puppy Cut', 'Teddy Bear Cut', 'Lion Cut', 'Summer Cut', 'Kennel Cut', 'Show Cut'];
  let cutIndex = 0;

  bookings.forEach((booking, idx) => {
    if (!booking.groomerId) {
      const fallback = groomers[0] || DEFAULT_GROOMERS[0];
      booking.groomerId = fallback?.id;
      booking.groomerName = fallback?.name;
      shouldSave = true;
    }
    if (!booking.profile) {
      booking.profile = {
        ownerName: booking.customerName || '',
        contactNumber: booking.phone || '',
        address: '',
        breed: '',
        age: '',
        weight: '',
        medical: '',
        vaccinations: '',
        addOns: []
      };
      shouldSave = true;
    }
    if (typeof booking.beforeImage === 'undefined') {
      booking.beforeImage = '';
      booking.afterImage = '';
      shouldSave = true;
    }
    if (typeof booking.cancellationNote === 'undefined') {
      booking.cancellationNote = '';
      shouldSave = true;
    }
    if (typeof booking.customerNotes === 'undefined') {
      booking.customerNotes = '';
      shouldSave = true;
    }
    if (typeof booking.bookingNotes === 'undefined' || booking.bookingNotes === null) {
      booking.bookingNotes = '';
      shouldSave = true;
    }
    if (typeof booking.bookingNotes !== 'string') {
      booking.bookingNotes = String(booking.bookingNotes || '');
      shouldSave = true;
    }
    if (!booking.bookingNotes.trim() && idx < cutExamples.length) {
      booking.bookingNotes = cutExamples[idx];
      shouldSave = true;
    }
  });

  if (shouldSave) {
    await saveBookings(bookings);
  }
}

async function ensureBookingShortCodes() {
  const bookings = await getBookings();

  // Ensure bookings is an array
  if (!Array.isArray(bookings)) {
    console.warn('Bookings is not an array in ensureBookingShortCodes:', bookings);
    return;
  }

  let changed = false;
  bookings.forEach(booking => {
    if (!booking.shortId) {
      booking.shortId = generateBookingCode();
      changed = true;
    }
  });
  if (changed) {
    await saveBookings(bookings);
  }
}

// Get current user - uses Firebase if available, falls back to localStorage
async function getCurrentUser() {
  if (typeof window.getCurrentUser === 'function') {
    return await window.getCurrentUser();
  }
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

// Set current user in localStorage
function setCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
}

// Clear current user
function clearCurrentUser() {
  localStorage.removeItem('currentUser');
}

// Get all users - uses Firebase if available, falls back to localStorage
// Fix: Make getUsers async to handle Firebase
async function getUsers() {
  const stored = localStorage.getItem('users');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error parsing users:', e);
      return [];
    }
  }
  return [];
}

// Save users - uses Firebase if available, falls back to localStorage
async function saveUsers(users) {
  if (typeof window.saveUsers === 'function') {
    return await window.saveUsers(users);
  }
  localStorage.setItem('users', JSON.stringify(users));
}

// Get all bookings - uses Firebase if available, falls back to localStorage
// Auto-cancel pending bookings based on time rules
// When cancelled, the slot is released back to availability
// ============================================
// ⏰ PENDING BOOKING EXPIRATION SYSTEM
// ============================================
// Automatically cancels pending bookings that haven't been confirmed
// Rule: Full packages must be confirmed 1 hour before appointment time
// Single services are EXEMPT from auto-cancellation
// ============================================
async function checkAndCancelPendingBookings() {
  try {
    // Try to get bookings from Firebase first, then localStorage
    let bookings = [];
    
    // Check if firebase-db's getBookings is available
    if (typeof window.firebaseGetBookings === 'function') {
      try {
        bookings = await window.firebaseGetBookings();
      } catch (e) {
        console.warn('[AutoCancel] Firebase getBookings failed, using localStorage');
        bookings = getBookingsRaw();
      }
    } else {
      // Fallback to localStorage
      bookings = getBookingsRaw();
    }
    
    if (!Array.isArray(bookings) || bookings.length === 0) {
      return;
    }
    
    const now = new Date();
    const today = toLocalISO(now);
    let hasChanges = false;
    
    // Track cancelled bookings to release their slots
    const cancelledBookings = [];
    
    // Track auto-cancelled bookings for admin notification
    const autoCancelledBookings = [];

    bookings.forEach(booking => {
      // ============================================
      // 📋 FILTER: Only process PENDING bookings
      // ============================================
      const status = (booking.status || '').toLowerCase();
      
      if (status !== 'pending') {
        return;
      }
      
      // ============================================
      // 🕐 AUTO-CANCEL LOGIC FOR ALL BOOKINGS
      // All pending bookings should be auto-cancelled when appointment time passes:
      // - Pay Now: No countdown shown, but still auto-cancel when time passes
      // - Pay Later: Shows countdown + auto-cancel when time passes  
      // - No choice: Auto-cancel when time passes
      // This ensures slots are released back to availability
      // ============================================
      // (No skip logic - process all pending bookings)

      // Check if single service (different cutoff time)
      const isSingleService = booking.packageId === 'single-service' || 
                              (booking.packageName && booking.packageName.includes('Single Service'));

      const bookingDate = booking.date;
      const bookingTime = booking.time;

      // ============================================
      // 🕐 PARSE BOOKING TIME
      // ============================================
      // Convert booking time string to 24-hour format
      // Handles formats: "9:30 AM", "2:00 PM", "9 AM - 12 PM"
      // For ranges like "9 AM - 12 PM", use the START time
      // ============================================
      let bookingHour = 0;
      let bookingMinute = 0;

      if (bookingTime) {
        // For time ranges like "9 AM - 12 PM", extract just the start time
        let startTime = bookingTime;
        if (bookingTime.includes('-')) {
          startTime = bookingTime.split('-')[0].trim();
        }
        
        // Extract hour, minute, and AM/PM from start time
        const timeMatch = startTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
          bookingHour = parseInt(timeMatch[1], 10);
          bookingMinute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
          const isPM = timeMatch[3] && /pm/i.test(timeMatch[3]);
          
          // Convert to 24-hour format
          if (isPM && bookingHour !== 12) {
            bookingHour += 12; // 2 PM -> 14:00
          } else if (!isPM && bookingHour === 12) {
            bookingHour = 0; // 12 AM -> 00:00
          }
        }
        
        console.log(`[AutoCancel] Booking ${booking.id}: date=${bookingDate}, time=${bookingTime}, parsed=${bookingHour}:${bookingMinute}`);
      }

      // ============================================
      // 🔍 CHECK IF BOOKING SHOULD BE CANCELLED
      // ============================================
      let shouldCancel = false;
      
      // Parse booking date properly (handles "2025-12-21" or "December 21, 2025")
      const bookingDateObj = new Date(bookingDate);
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const bookingDateOnly = new Date(bookingDateObj.getFullYear(), bookingDateObj.getMonth(), bookingDateObj.getDate());
      
      console.log(`[AutoCancel] Checking booking ${booking.id}: bookingDate=${bookingDate}, parsed=${bookingDateOnly.toDateString()}, today=${todayDate.toDateString()}`);

      if (bookingDateOnly < todayDate) {
        // ============================================
        // CASE 1: Past date - definitely cancel
        // ============================================
        shouldCancel = true;
        console.log(`[AutoCancel] Past date booking ${booking.id} should be cancelled`);
      } else if (bookingDateOnly.getTime() === todayDate.getTime()) {
        // ============================================
        // CASE 2: Same-day booking
        // ============================================
        // Calculate cutoff time based on booking type:
        // - Full packages: 1 hour before appointment
        // - Single services: 30 minutes before appointment
        // ============================================
        let cutoffHour = bookingHour;
        let cutoffMinute = bookingMinute;
        
        if (isSingleService) {
          // Single service: 30 minutes before
          cutoffMinute -= 30;
          if (cutoffMinute < 0) {
            cutoffHour -= 1;
            cutoffMinute += 60;
          }
          console.log(`[AutoCancel] Single service cutoff: ${cutoffHour}:${cutoffMinute} (30 min before ${bookingHour}:${bookingMinute})`);
        } else {
          // Full package: 1 hour before
          cutoffHour -= 1;
          if (cutoffHour < 0) cutoffHour = 0;
          console.log(`[AutoCancel] Full package cutoff: ${cutoffHour}:${cutoffMinute} (1 hour before ${bookingHour}:${bookingMinute})`);
        }
        
        if (now.getHours() > cutoffHour || 
            (now.getHours() === cutoffHour && now.getMinutes() >= cutoffMinute)) {
          shouldCancel = true;
          console.log(`[AutoCancel] Same-day booking ${booking.id} should be cancelled (current: ${now.getHours()}:${now.getMinutes()}, cutoff: ${cutoffHour}:${cutoffMinute})`);
        } else {
          console.log(`[AutoCancel] Same-day booking ${booking.id} not yet expired (current: ${now.getHours()}:${now.getMinutes()}, cutoff: ${cutoffHour}:${cutoffMinute})`);
        }
      } else {
        console.log(`[AutoCancel] Future booking ${booking.id} - not cancelling`);
      }

      // ============================================
      // ❌ CANCEL BOOKING IF EXPIRED
      // ============================================
      // Pay Now: Never auto-cancel, admin must cancel manually
      // Pay Later: Auto-cancel only if no payment proof submitted
      // ============================================
      if (shouldCancel) {
        if (booking.paymentChoice === 'payNow') {
          // Pay Now: Don't auto-cancel, let admin handle it
          console.log(`[AutoCancel] Pay Now booking ${booking.id} reached cutoff - skipping auto-cancel, admin will review`);
        } else {
          // Pay Later or no payment choice: Check for payment proof
          const hasPaymentProof = booking.paymentProofUrl || booking.paymentProof;
          
          if (hasPaymentProof) {
            // Payment proof submitted - don't auto-cancel, let admin review
            console.log(`[AutoCancel] Booking ${booking.id} has payment proof - skipping auto-cancel, admin will review`);
          } else {
            // No payment proof - proceed with cancellation
            booking.status = 'cancelledBySystem';
            let reason;
            if (booking.paymentChoice === 'payLater') {
              reason = 'Pay Later booking expired - payment not received before appointment time';
            } else {
              reason = 'Booking expired - no payment received before appointment time';
            }
            booking.cancellationNote = `Auto-cancelled: ${reason}`;
            booking.cancelledAt = Date.now();
            hasChanges = true;
            
            // Track this booking to release its slot
            cancelledBookings.push({
              id: booking.id,
              date: bookingDate,
              time: bookingTime
            });
            
            // Track for admin notification
            autoCancelledBookings.push({
              id: booking.id,
              customerName: booking.customerName,
              petName: booking.petName,
              date: bookingDate,
              time: bookingTime,
              reason: reason,
              cancelledAt: Date.now()
            });
          }
        }
      }
    });

    // ============================================
    // 💾 SAVE CHANGES AND RELEASE SLOTS
    // ============================================
    if (hasChanges) {
      // Save to Firebase if available
      if (typeof window.firebaseSaveBookings === 'function') {
        await window.firebaseSaveBookings(bookings);
      } else {
        await saveBookings(bookings);
      }
      
      console.log(`[AutoCancel] Saved ${cancelledBookings.length} cancelled booking(s)`);
      
      // Store auto-cancelled bookings for admin notification
      if (autoCancelledBookings.length > 0) {
        try {
          const existingNotifications = JSON.parse(localStorage.getItem('autoCancelledNotifications') || '[]');
          const newNotifications = [...existingNotifications, ...autoCancelledBookings];
          localStorage.setItem('autoCancelledNotifications', JSON.stringify(newNotifications));
          console.log(`[AutoCancel] Stored ${autoCancelledBookings.length} auto-cancelled notification(s) for admin`);
        } catch (e) {
          console.warn('[AutoCancel] Failed to store notifications:', e);
        }
      }
      
      // Release slots for all cancelled bookings
      for (const cancelled of cancelledBookings) {
        try {
          // Release the slot (+1 to increase availability)
          if (typeof adjustSlotCount === 'function') {
            await adjustSlotCount(cancelled.date, cancelled.time, +1);
            console.log(`[AutoCancel] Released slot for booking ${cancelled.id} (${cancelled.date} ${cancelled.time})`);
          } else if (typeof window.adjustSlotCount === 'function') {
            await window.adjustSlotCount(cancelled.date, cancelled.time, +1);
            console.log(`[AutoCancel] Released slot for booking ${cancelled.id} (${cancelled.date} ${cancelled.time})`);
          }
        } catch (slotError) {
          console.warn(`[AutoCancel] Failed to release slot for booking ${cancelled.id}:`, slotError);
        }
      }
    }
  } catch (error) {
    console.error('[AutoCancel] Error checking bookings:', error);
  }
}

// Internal function to get bookings without triggering auto-cancel (prevents infinite loop)
function getBookingsRaw() {
  const stored = localStorage.getItem('bookings');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error parsing bookings:', e);
      return [];
    }
  }
  return [];
}

// Flag to prevent recursive auto-cancel calls
let isCheckingAutoCancel = false;

// Fix: Make getBookings async to handle Firebase
async function getBookings() {
  // Get bookings from storage
  const stored = localStorage.getItem('bookings');
  let bookings = [];
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      bookings = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error parsing bookings:', e);
      bookings = [];
    }
  }
  
  // Run auto-cancel check (but prevent infinite loop)
  if (!isCheckingAutoCancel) {
    isCheckingAutoCancel = true;
    try {
      await checkAndCancelPendingBookings();
    } catch (error) {
      console.error('[AutoCancel] Error:', error);
    } finally {
      isCheckingAutoCancel = false;
    }
  }
  
  // Return fresh bookings after auto-cancel
  const freshStored = localStorage.getItem('bookings');
  if (freshStored) {
    try {
      const parsed = JSON.parse(freshStored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return bookings;
    }
  }
  
  return bookings;
}

// Get packages - uses Firebase if available, falls back to localStorage
function getPackages() {
  const stored = localStorage.getItem('packages');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : PREMIUM_PACKAGES;
    } catch (e) {
      console.error('Error parsing packages:', e);
      return PREMIUM_PACKAGES;
    }
  }
  return PREMIUM_PACKAGES;
}

// Fix 2: Replace getGroomers function (around line 495) - remove recursion
async function getGroomers() {
  const stored = localStorage.getItem('groomers');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : DEFAULT_GROOMERS;
    } catch (e) {
      console.error('Error parsing groomers:', e);
      return DEFAULT_GROOMERS;
    }
  }
  return DEFAULT_GROOMERS;
}

async function saveGroomers(groomers) {
  if (typeof window.saveGroomers === 'function') {
    return await window.saveGroomers(groomers);
  }
  localStorage.setItem('groomers', JSON.stringify(groomers));
  return Promise.resolve();
}

async function getGroomerById(groomerId) {
  const groomers = await getGroomers();
  return groomers.find(g => g.id === groomerId);
}

function getCustomerProfiles() {
  return JSON.parse(localStorage.getItem(CUSTOMER_PROFILE_KEY) || '{}');
}

function saveCustomerProfiles(profiles) {
  localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(profiles));
}

function getCustomerProfile(userId) {
  const profiles = getCustomerProfiles();
  return profiles[userId] || null;
}

function saveCustomerProfile(userId, profile) {
  const profiles = getCustomerProfiles();
  profiles[userId] = {
    ...profile,
    updatedAt: Date.now()
  };
  saveCustomerProfiles(profiles);
}

async function getCustomerWarningInfo(userId) {
  try {
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      return { warnings: 0, isBanned: false, banReason: '', warningHistory: [] };
    }
    return {
      warnings: user.warningCount || 0,
      isBanned: !!user.isBanned,
      banReason: user.banReason || '',
      warningHistory: user.warningHistory || []
    };
  } catch (error) {
    console.warn('Could not get customer warning info:', error);
    // Fallback to localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.id === userId);
    if (!user) {
      return { warnings: 0, isBanned: false, banReason: '', warningHistory: [] };
    }
    return {
      warnings: user.warningCount || 0,
      isBanned: !!user.isBanned,
      banReason: user.banReason || '',
      warningHistory: user.warningHistory || []
    };
  }
}

async function incrementCustomerWarning(userId, reason = 'No-show recorded') {
  try {
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    user.warningCount = (user.warningCount || 0) + 1;
    if (!Array.isArray(user.warningHistory)) {
      user.warningHistory = [];
    }
    user.warningHistory.push({
      timestamp: Date.now(),
      reason
    });
    if (user.warningCount >= WARNING_HARD_LIMIT) {
      user.isBanned = true;
      user.banReason = reason;
      user.banInfoUpdatedAt = Date.now();
    }
    await saveUsers(users);
    await syncCurrentUser(userId);
    return await getCustomerWarningInfo(userId);
  } catch (error) {
    console.error('Error incrementing customer warning:', error);
    return { warnings: 0, isBanned: false, banReason: '', warningHistory: [] };
  }
}

async function banCustomer(userId, reason = 'Admin issued ban') {
  try {
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    user.isBanned = true;
    user.warningCount = Math.max(user.warningCount || WARNING_HARD_LIMIT, WARNING_HARD_LIMIT);
    user.banReason = reason;
    user.banInfoUpdatedAt = Date.now();
    if (!Array.isArray(user.warningHistory)) {
      user.warningHistory = [];
    }
    user.warningHistory.push({
      timestamp: Date.now(),
      reason,
      type: 'ban'
    });
    await saveUsers(users);
    await syncCurrentUser(userId);
    return await getCustomerWarningInfo(userId);
  } catch (error) {
    console.error('Error banning customer:', error);
    return { warnings: 0, isBanned: false, banReason: '', warningHistory: [] };
  }
}

async function liftCustomerBan(userId, options = {}) {
  try {
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    user.isBanned = false;
    user.banReason = '';
    const resetWarnings = options.resetWarnings !== false;
    if (resetWarnings) {
      user.warningCount = 0;
      if (!Array.isArray(user.warningHistory)) {
        user.warningHistory = [];
      }
      user.warningHistory.push({
        timestamp: Date.now(),
        reason: options.reason || 'Admin confirmed lift ban and reset warnings',
        type: 'reset'
      });
    } else {
      user.warningCount = Math.min(user.warningCount || 0, WARNING_THRESHOLD);
    }
    user.banInfoUpdatedAt = Date.now();
    await saveUsers(users);
    await syncCurrentUser(userId);
    return await getCustomerWarningInfo(userId);
  } catch (error) {
    console.error('Error lifting customer ban:', error);
    return { warnings: 0, isBanned: false, banReason: '', warningHistory: [] };
  }
}

async function syncCurrentUser(userId) {
  try {
    const current = await getCurrentUser();
    if (current && current.id === userId) {
      const users = await getUsers();
      const refreshed = users.find(u => u.id === userId);
      if (refreshed) {
        setCurrentUser(refreshed);
      }
    }
  } catch (error) {
    console.warn('Could not sync current user:', error);
  }
}

async function changePasswordForCurrentUser(currentPassword, newPassword) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Please log in again.' };
    }
    if (!currentPassword || !newPassword) {
      return { success: false, message: 'Fill in all password fields.' };
    }
    if (newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters.' };
    }

    // Note: Firebase handles password changes, but we keep this for localStorage fallback
    // For Firebase, password changes should be done via Firebase Auth API
    const users = await getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index === -1) {
      return { success: false, message: 'Account not found.' };
    }

    // For Firebase users, password is managed by Firebase Auth
    // This is mainly for localStorage fallback
    if (users[index].password && users[index].password !== currentPassword) {
      return { success: false, message: 'Current password is incorrect.' };
    }

    users[index] = {
      ...users[index],
      password: newPassword
    };
    await saveUsers(users);
    setCurrentUser(users[index]);

    return { success: true, message: 'Password updated successfully.' };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, message: 'Error updating password. Please try again.' };
  }
}

// Staff absences helpers
function getStaffAbsences() {
  return JSON.parse(localStorage.getItem('staffAbsences') || '[]');
}

function saveStaffAbsences(absences) {
  localStorage.setItem('staffAbsences', JSON.stringify(absences));
}

// Booking history helpers - Now uses Firebase instead of localStorage
async function getBookingHistory() {
  try {
    // Try to get from Firebase first
    if (typeof window.firebaseGetBookings === 'function') {
      const bookings = await window.firebaseGetBookings();
      if (Array.isArray(bookings)) {
        // Flatten all booking.history entries into a single array
        const allHistory = [];
        bookings.forEach(booking => {
          if (booking.history && Array.isArray(booking.history)) {
            booking.history.forEach(entry => {
              allHistory.push({
                ...entry,
                bookingId: booking.id
              });
            });
          }
        });
        return allHistory;
      }
    }
  } catch (error) {
    console.warn('[getBookingHistory] Firebase fetch failed:', error.message);
  }
  
  // Fallback to localStorage if Firebase fails
  return JSON.parse(localStorage.getItem('bookingHistory') || '[]');
}

function saveBookingHistory(history) {
  // No longer needed - history is saved with bookings in Firebase
  // Kept for backward compatibility
  console.log('[saveBookingHistory] Deprecated - history saved with bookings in Firebase');
}

async function logBookingHistory(entry) {
  try {
    // Get the booking and add entry to its history array
    if (typeof window.firebaseGetBookings === 'function' && entry.bookingId) {
      const bookings = await window.firebaseGetBookings();
      const booking = bookings.find(b => b.id === entry.bookingId);
      
      if (booking) {
        if (!booking.history) {
          booking.history = [];
        }
        
        booking.history.push({
          id: 'hist-' + Date.now(),
          timestamp: Date.now(),
          ...entry
        });
        
        // Save back to Firebase
        if (typeof window.firebaseSaveBookings === 'function') {
          await window.firebaseSaveBookings(bookings);
          return;
        }
      }
    }
  } catch (error) {
    console.warn('[logBookingHistory] Firebase save failed:', error.message);
  }
  
  // Fallback to localStorage if Firebase fails
  const history = JSON.parse(localStorage.getItem('bookingHistory') || '[]');
  history.push({
    id: 'hist-' + Date.now(),
    timestamp: Date.now(),
    ...entry
  });
  localStorage.setItem('bookingHistory', JSON.stringify(history));
}

function getCalendarBlackouts() {
  return JSON.parse(localStorage.getItem(CALENDAR_BLACKOUTS_KEY) || '[]');
}

function saveCalendarBlackouts(blackouts) {
  localStorage.setItem(CALENDAR_BLACKOUTS_KEY, JSON.stringify(blackouts));
}

function getCalendarBlackout(date) {
  if (!date) return null;
  return getCalendarBlackouts().find(entry => entry.date === date) || null;
}

function isCalendarBlackout(date) {
  return !!getCalendarBlackout(date);
}

function addCalendarBlackout(date, reason = 'Closed') {
  if (!date) return;
  const blackouts = getCalendarBlackouts().filter(entry => entry.date !== date);
  blackouts.push({
    id: 'blackout-' + Date.now(),
    date,
    reason: reason || 'Closed',
    createdAt: Date.now()
  });
  saveCalendarBlackouts(blackouts);
}

function removeCalendarBlackout(date) {
  if (!date) return;
  const filtered = getCalendarBlackouts().filter(entry => entry.date !== date);
  saveCalendarBlackouts(filtered);
}

// Simple routing helper
function redirect(path) {
  window.location.href = path;
}
window.redirect = redirect;

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  // Return month abbreviation + day (e.g., "Dec 23", "Dec 24", "Dec 25")
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');
  return `${month} ${day}`;
}

// Format time for display (convert 24-hour to 12-hour format)
function formatTime(timeString) {
  if (!timeString) return '';
  
  try {
    const lowerTime = timeString.toLowerCase();
    
    // Check if it's already in a readable format like "9:30 AM" or "9am-12pm"
    if (lowerTime.includes('am') || lowerTime.includes('pm')) {
      // Check if it's a time range like "9am-12pm" or "3pm-6pm"
      if (timeString.includes('-')) {
        const parts = timeString.split('-');
        const startTime = parts[0].trim();
        const endTime = parts[1] ? parts[1].trim() : '';
        
        // Normalize: remove all AM/PM first, then add back properly
        const startClean = startTime.replace(/\s*(am|pm|AM|PM)\s*/gi, '').trim();
        const endClean = endTime.replace(/\s*(am|pm|AM|PM)\s*/gi, '').trim();
        
        // Determine AM/PM for start time
        const startHasAM = /am/i.test(startTime);
        const startHasPM = /pm/i.test(startTime);
        const startAMPM = startHasPM ? 'PM' : (startHasAM ? 'AM' : 'AM');
        
        // Determine AM/PM for end time
        const endHasAM = /am/i.test(endTime);
        const endHasPM = /pm/i.test(endTime);
        const endAMPM = endHasPM ? 'PM' : (endHasAM ? 'AM' : 'AM');
        
        const formatted = `${startClean} ${startAMPM}`;
        const formattedEnd = `${endClean} ${endAMPM}`;
        return `${formatted} - ${formattedEnd}`;
      }
      
      // Single time like "9:30 AM" or "9am"
      // Remove all AM/PM first to avoid duplicates
      const timePart = timeString.replace(/\s*(am|pm|AM|PM)\s*/gi, '').trim();
      const hasAM = /am/i.test(timeString);
      const hasPM = /pm/i.test(timeString);
      const ampm = hasPM ? 'PM' : (hasAM ? 'AM' : 'AM');
      return `${timePart} ${ampm}`;
    }
    
    // Otherwise, assume HH:MM format (24-hour)
    const parts = timeString.split(':');
    if (parts.length < 2) return timeString;
    
    const hours = parts[0];
    const minutes = parts[1];
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch (e) {
    return timeString;
  }
}

function formatCurrency(amount = 0) {
  const numericValue = Number(amount) || 0;
  return `${CURRENCY_SYMBOL}${numericValue.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
}

function normalizeWeightLabel(value = '') {
  return value
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[–—-]/g, '-')
    .replace(/kg/g, 'kg');
}

function getWeightCategory(weightLabel = '') {
  if (!weightLabel) return 'small';
  const normalized = normalizeWeightLabel(weightLabel);
  
  console.log('[getWeightCategory] Input:', weightLabel, 'Normalized:', normalized);
  
  // Check for specific weight ranges
  if (normalized.includes('5kg') && (normalized.includes('below') || normalized.includes('&'))) {
    return 'small';
  }
  if (normalized.includes('5.1') && normalized.includes('8kg')) {
    return 'medium';
  }
  if (normalized.includes('8') && normalized.includes('15kg')) {
    return 'medium';
  }
  if (normalized.includes('15.1') && normalized.includes('30kg')) {
    return 'large';
  }
  if (normalized.includes('30kg') && (normalized.includes('above') || normalized.includes('&'))) {
    return 'xlarge';
  }
  
  // Fallback: parse numeric value
  const numeric = parseFloat(weightLabel);
  if (!Number.isNaN(numeric)) {
    if (numeric <= 5) return 'small';
    if (numeric <= 8) return 'medium';
    if (numeric <= 15) return 'medium';
    if (numeric <= 30) return 'large';
    return 'xlarge';
  }
  
  console.log('[getWeightCategory] Defaulting to small for:', weightLabel);
  return 'small';
}

function getSingleServicePrice(serviceId, weightLabel) {
  const service = SINGLE_SERVICE_PRICING[serviceId];
  if (!service) {
    return {
      serviceId,
      label: 'Unknown service',
      price: 0,
      tierLabel: '',
      requiresWeight: true
    };
  }
  const hasWeight = !!weightLabel;
  const category = hasWeight ? getWeightCategory(weightLabel) : 'small';
  const tierData = service.tiers[category] || service.tiers.small;
  
  // Handle both old string format and new object format
  const tierLabel = typeof tierData === 'string' ? tierData : tierData.label;
  const price = typeof tierData === 'string' ? 0 : (tierData.price || 0);

  return {
    serviceId,
    label: service.label,
    price: hasWeight ? price : 0,
    tierLabel,
    category,
    requiresWeight: !hasWeight
  };
}

// Provide a saveBookings wrapper so other code can call it regardless of Firebase availability
async function saveBookings(bookings) {
  // Fallback to localStorage for development/testing
  try {
    localStorage.setItem('bookings', JSON.stringify(bookings));
    return Promise.resolve();
  } catch (err) {
    console.error('saveBookings error:', err);
    throw err;
  }
}

// Compute booking cost with full support for packages and single services
function computeBookingCost(packageId, petWeight, addOns, singleServices) {
  // Initialize result object
  // Single service packages have NO booking fee (customer pays only service price)
  const isSingleService = packageId === 'single-service';
  const result = {
    packagePrice: 0,
    subtotal: 0,
    bookingFee: isSingleService ? 0 : 100,
    totalAmount: 0,
    totalDueToday: isSingleService ? 0 : 100,
    balanceOnVisit: 0,
    addOns: [],
    services: [],
    weightLabel: petWeight || ''
  };

  // Get packages list
  let packagesData = [];
  if (Array.isArray(window.packagesList)) {
    packagesData = window.packagesList;
  } else if (typeof PACKAGES !== 'undefined' && Array.isArray(PACKAGES)) {
    packagesData = PACKAGES;
  }

  const pkg = packagesData.find(p => p.id === packageId) || null;

  // Handle single service package
  if (isSingleService) {
    result.packagePrice = 0;
    
    // Calculate single services total
    if (Array.isArray(singleServices) && singleServices.length > 0 && petWeight) {
      singleServices.forEach(serviceId => {
        const priceInfo = getSingleServicePrice(serviceId, petWeight);
        if (priceInfo && priceInfo.price > 0) {
          result.services.push({
            serviceId: serviceId,
            label: priceInfo.label || serviceId,
            price: priceInfo.price
          });
          result.subtotal += priceInfo.price;
        }
      });
    }
  } else if (pkg && pkg.tiers && petWeight) {
    // Handle regular package with tiers
    const tier = pkg.tiers.find(t => t.label === petWeight);
    if (tier) {
      result.packagePrice = tier.price || 0;
      result.subtotal = result.packagePrice;
    }
  }

  // Calculate add-ons
  if (Array.isArray(addOns) && addOns.length > 0) {
    addOns.forEach(addonId => {
      // Find addon in packages
      const addonPkg = packagesData.find(p => p.id === addonId && p.type === 'addon');
      if (addonPkg) {
        let addonPrice = 0;
        if (addonPkg.tiers && petWeight) {
          const tier = addonPkg.tiers.find(t => t.label === petWeight);
          addonPrice = tier?.price || addonPkg.price || 0;
        } else {
          addonPrice = addonPkg.price || 0;
        }
        result.addOns.push({
          id: addonId,
          label: addonPkg.name,
          price: addonPrice
        });
        result.subtotal += addonPrice;
      }
    });
  }

  // Calculate totals
  result.totalAmount = result.subtotal;
  result.balanceOnVisit = Math.max(0, result.subtotal - result.bookingFee);

  return result;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// 🔧 GENERATE UNIQUE ID - Improved to prevent collisions
// ============================================
// Uses multiple sources of randomness to ensure uniqueness:
// 1. Timestamp (milliseconds)
// 2. Counter (for same-millisecond calls)
// 3. Random string (crypto-grade if available)
// 4. Session-unique prefix
// ============================================
let lastGeneratedIdTimestamp = 0;
let idCounter = 0;
const sessionPrefix = Math.random().toString(36).slice(-4).toUpperCase(); // Unique per browser session

function generateId() {
  const now = Date.now();
  
  // If same millisecond, increment counter; otherwise reset
  if (now === lastGeneratedIdTimestamp) {
    idCounter++;
  } else {
    idCounter = 0;
    lastGeneratedIdTimestamp = now;
  }
  
  // Generate strong random string
  let random;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Use crypto API for better randomness
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    random = array[0].toString(36).toUpperCase().slice(-6);
  } else {
    // Fallback to Math.random
    random = Math.random().toString(36).slice(-6).toUpperCase();
  }
  
  const counter = idCounter.toString().padStart(3, '0');
  
  // Format: BK-{timestamp}-{counter}-{sessionPrefix}-{random}
  // Example: BK-1703001234567-001-A1B2-C3D4E5
  return `BK-${now}-${counter}-${sessionPrefix}-${random}`;
}

// ============================================
// 🔧 GENERATE BOOKING CODE - Short display code
// ============================================
// Format: BB-{random8} for easy reading
// Uses crypto API for better randomness
// ============================================
function generateBookingCode() {
  let random;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    random = (array[0].toString(36) + array[1].toString(36)).toUpperCase().slice(-8);
  } else {
    random = (Math.random().toString(36) + Math.random().toString(36)).slice(-8).toUpperCase();
  }
  return `BB-${random}`;
}

function getBookingDisplayCode(booking) {
  if (!booking) return '';
  return booking.shortId || booking.id;
}

async function getPublicReviewEntries(limit = 8) {
  // Fetch fresh bookings from Firebase (not localStorage) to get latest uploaded images
  let bookings = [];
  try {
    if (typeof getBookings === 'function') {
      bookings = await getBookings();
    }
  } catch (e) {
    console.warn('Failed to fetch bookings from Firebase, falling back to localStorage:', e);
    bookings = localStorage.getItem('bookings')
      ? JSON.parse(localStorage.getItem('bookings'))
      : [];
  }

  if (!Array.isArray(bookings)) {
    return [];
  }

  // Filter bookings that have before/after images AND are marked as public by customer
  // OR are featured by admin (isFeatured)
  const entries = bookings
    .filter(booking => {
      const hasImages = booking.beforeImage && booking.afterImage;
      const isPublic = booking.isPublicGallery === true || booking.isFeatured === true;
      return hasImages && isPublic;
    })
    .map(booking => {
      // Build service description from package and single services
      let serviceDescription = booking.packageName || 'Custom Service';
      if (booking.packageId === 'single-service' && booking.singleServices?.length) {
        const services = booking.singleServices.map(id => SINGLE_SERVICE_PRICING?.[id]?.label || id).join(', ');
        serviceDescription = `Single Services: ${services}`;
      }

      return {
        id: booking.id,
        shortId: getBookingDisplayCode(booking),
        petName: booking.petName,
        packageName: booking.packageName,
        serviceDescription: serviceDescription,
        bookingNotes: booking.bookingNotes || '',
        groomingNotes: booking.groomingNotes || '',
        review: booking.review || '',
        rating: booking.rating || 0,
        beforeImage: booking.beforeImage,
        afterImage: booking.afterImage,
        date: booking.date,
        customerName: booking.customerName || 'Customer',
        groomerName: booking.groomerName || 'Professional Groomer'
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.date || a.id);
      const dateB = new Date(b.date || b.id);
      return dateB - dateA;
    });
  return entries.slice(0, limit);
}

async function renderCommunityReviewFeed(targetId = 'adminReviewFeed', limit = 6) {
  const container = document.getElementById(targetId);
  if (!container || typeof getPublicReviewEntries !== 'function') return;

  // Support 'all' as a special value
  let fetchLimit = limit;
  if (typeof fetchLimit === 'string' && fetchLimit.toLowerCase() === 'all') {
    fetchLimit = 10000; // large number to effectively fetch all
  }

  const entries = await getPublicReviewEntries(fetchLimit);
  if (!entries.length) {
    container.innerHTML = '<p class="empty-state" style="margin:0;">No shared galleries yet.</p>';
    return;
  }

  // Render as a responsive grid of cards
  container.innerHTML = entries.map(entry => `
    <article class="review-card">
      <div class="review-card-gallery" onclick="openGalleryZoom('${entry.beforeImage}', '${entry.afterImage}', '${escapeHtml(entry.petName)}');" role="button" tabindex="0" style="cursor: pointer;">
        <img src="${entry.beforeImage}" alt="Before ${escapeHtml(entry.petName)}">
        <img src="${entry.afterImage}" alt="After ${escapeHtml(entry.petName)}">
      </div>
      <div class="review-card-content">
        <h4 style="margin-bottom:0.35rem;">${escapeHtml(entry.petName)}</h4>
        <p style="font-size:0.85rem; color:var(--gray-600); margin-bottom:0.5rem;">
          ${formatDate(entry.date)} · <strong style="color: #000; font-weight: 700;">${escapeHtml(entry.packageName || 'Custom package')}</strong>
        </p>
        ${(() => {
      const notesText = entry.bookingNotes || '';
      // ============================================
      // 🔧 PREFERRED CUT EXTRACTION - Supports ID-based system
      // ============================================
      // First check entry.referenceCut for ID-based lookup
      // Falls back to searching notes for cut names (legacy)
      // ============================================
      let preferredCut = null;
      
      // Check for ID-based reference cut first
      if (entry.referenceCut) {
        const cutId = entry.referenceCut;
        // Get display name from cut ID
        preferredCut = typeof getReferenceCutName === 'function' 
          ? getReferenceCutName(cutId) 
          : (typeof window.getReferenceCutName === 'function' ? window.getReferenceCutName(cutId) : cutId);
      }
      
      // Fallback: search notes for cut names (legacy support)
      if (!preferredCut && notesText && notesText.trim()) {
        const extractPreferredCutFallback = window.extractPreferredCut || function (notes) {
          if (!notes || typeof notes !== 'string') return null;
          const cutNames = ['Puppy Cut', 'Teddy Bear Cut', 'Lion Cut', 'Summer Cut', 'Kennel Cut', 'Show Cut'];
          const notesLower = notes.toLowerCase().trim();
          for (let cut of cutNames) {
            if (notesLower.includes(cut.toLowerCase())) return cut;
          }
          return null;
        };
        preferredCut = extractPreferredCutFallback(notesText);
      }
      
      if (!notesText || !notesText.trim()) {
        // If no notes but has preferred cut from ID, show it
        if (preferredCut) {
          return `<p style="font-size:0.85rem; background: #e8f5e9; padding: 0.5rem; border-left: 3px solid #2e7d32; margin: 0.5rem 0; font-weight: 500;"><strong>✂️ Preferred Cut:</strong> <span style="font-weight: 700; color: #2e7d32;">${escapeHtml(preferredCut)}</span></p>`;
        }
        return '';
      }
      if (preferredCut) {
        return `<p style="font-size:0.85rem; background: #e8f5e9; padding: 0.5rem; border-left: 3px solid #2e7d32; margin: 0.5rem 0; font-weight: 500;"><strong>✂️ Preferred Cut:</strong> <span style="font-weight: 700; color: #2e7d32;">${escapeHtml(preferredCut)}</span>${notesText.trim() !== preferredCut ? ` · ${escapeHtml(notesText)}` : ''}</p>`;
      } else {
        return `<p style="font-size:0.85rem; background: #fff9e6; padding: 0.5rem; border-left: 3px solid #f57c00; margin: 0.5rem 0; font-weight: 500;"><strong>✂️ Notes:</strong> ${escapeHtml(notesText)}</p>`;
      }
    })()}
        <p style="font-size:0.9rem; color:var(--gray-700);">
          ${entry.review ? `"${escapeHtml(entry.review)}"` : 'Fresh from the grooming table!'}
        </p>
        <div class="review-card-meta">
          <div>Code ${escapeHtml(entry.shortId)} · ${escapeHtml(entry.customerName)}</div>
          <div style="margin-top: 0.5rem; font-size: 0.85rem; background: #f0f0f0; padding: 0.5rem; border-radius: 0.25rem; font-weight: 600; color: #000;">✂️ Groomed by ${escapeHtml(entry.groomerName)}</div>
        </div>
      </div>
    </article>
  `).join('');

  // If this is on the public feed page, wire the dropdown control to update count
  try {
    const limitSelect = document.getElementById('reviewLimitSelect');
    if (limitSelect) {
      limitSelect.value = String(limit || 9);
      limitSelect.onchange = function () {
        const val = this.value;
        if (typeof renderCommunityReviewFeed === 'function') {
          renderCommunityReviewFeed(targetId, val === 'all' ? 'all' : parseInt(val, 10));
        }
      };
    }
  } catch (e) {
    // ignore wiring errors
  }
}

// Gallery Zoom Modal
function openGalleryZoom(beforeImage, afterImage, petName) {
  const modal = document.createElement('div');
  modal.id = 'galleryZoomModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    cursor: pointer;
  `;

  modal.innerHTML = `
    <div style="position: relative; width: 90%; max-width: 1000px; display: flex; gap: 1rem; align-items: center;">
      <button onclick="document.getElementById('galleryZoomModal').remove();" style="position: absolute; top: -40px; right: 0; background: #000; border: 2px solid #fff; font-size: 2rem; cursor: pointer; color: #fff; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">×</button>
      
      <div style="flex: 1; text-align: center;">
        <h3 style="color: #fff; margin-bottom: 1rem;">Before</h3>
        <img src="${beforeImage}" alt="Before ${escapeHtml(petName)}" style="width: 100%; height: auto; border-radius: 0.5rem; max-height: 500px; object-fit: contain;">
      </div>
      
      <div style="flex: 1; text-align: center;">
        <h3 style="color: #fff; margin-bottom: 1rem;">After</h3>
        <img src="${afterImage}" alt="After ${escapeHtml(petName)}" style="width: 100%; height: auto; border-radius: 0.5rem; max-height: 500px; object-fit: contain;">
      </div>
    </div>
  `;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  document.body.appendChild(modal);
}

// Check if date is in the past
function isPastDate(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

// Get minimum date (today)
function getMinDate() {
  const today = new Date();
  return toLocalISO(today);
}

// Validate phone number
function validatePhoneNumber(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/\s/g, '');
  return /^(\+63|0)[0-9]{10}$/.test(cleaned);
}

// Mega calendar renderer shared across dashboards
function renderMegaCalendar(containerId, dataset = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const state = container.__calendarState || { monthOffset: 0 };
  container.__calendarState = state;
  state.dataset = dataset;

  const baseDate = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const displayDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + state.monthOffset, 1);
  const monthName = displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
  const lastDayOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);
  const startWeekday = firstDayOfMonth.getDay(); // 0-6

  const days = [];
  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const date = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
    const iso = toLocalISO(date);
    days.push({
      day,
      iso,
      stats: dataset[iso] || { bookings: 0, absences: 0 }
    });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  container.innerHTML = `
    <div class="mega-calendar">
      <div class="calendar-header">
        <button class="calendar-nav" data-cal-action="prev">←</button>
        <h3>${monthName}</h3>
        <button class="calendar-nav" data-cal-action="next">→</button>
      </div>
      <div class="calendar-grid calendar-grid-head">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="calendar-cell head">${d}</div>`).join('')}
      </div>
      <div class="calendar-grid calendar-grid-body">
        ${weeks.map(week => week.map(day => {
    if (!day) {
      return '<div class="calendar-cell empty"></div>';
    }
    // Note: getDayCapacityStatus is async, but we use pre-computed stats here
    // If stats are missing, we'll use default values
    const statsSnapshot = day.stats && Object.keys(day.stats).length
      ? day.stats
      : { bookings: 0, absences: 0, capacityStatus: 'green', remaining: 0, capacity: 0 };
    const { bookings = 0, bookingsList = [], absences = 0, capacityStatus = 'green', remaining = 0, capacity = 0, blackout = null } = statsSnapshot || {};
    const hasEvents = bookings > 0 || absences > 0;
    const dateObj = new Date(day.iso);
    dateObj.setHours(0, 0, 0, 0);
    const isPast = dateObj < today;
    // Use statusClass primarily for border or text color if needed, but remove background from cell
    // We will apply a specific style for "blackout" or "past" but keep active cells white.
    const statusClass = `status-${capacityStatus}`;

    // User-friendly text for past/booked slots
    let slotsText = '';
    if (capacityStatus === 'blackout') {
      slotsText = 'Closed';
    } else if (bookings > 0 && isPast) {
      slotsText = 'View Booking';
    } else if (isPast) {
      slotsText = 'Not available';
    } else {
      slotsText = remaining > 0 ? `${remaining} slots left` : 'Fully booked';
    }

    const clickAttr = bookings > 0 ? `onclick="openCalendarDayDetails('${containerId}', '${day.iso}')"` : '';
    const cursorStyle = bookings > 0 ? 'cursor: pointer;' : '';

    // Remove 'statusClass' from classList to avoid background colors from CSS
    // Keep 'day' class. Add 'white-bg' style explicitly.
    // Use coloring mainly on the slotsText pill.

    // Determine pill color matching user's legend image
    // Open (Green): #dcfce7 bg, #166534 text
    // Filling fast (Yellow): #fef9c3 bg, #854d0e text
    // Fully booked (Red): #fee2e2 bg, #991b1b text
    // Closed/Past (Gray): #f3f4f6 bg, #374151 text (or #9ca3af for text)

    let pillStyle = 'background-color: #f3f4f6; color: #374151;'; // default/past/closed

    if (capacityStatus === 'green') {
      pillStyle = 'background-color: #dcfce7; color: #166534;';
    } else if (capacityStatus === 'yellow') {
      pillStyle = 'background-color: #fef9c3; color: #854d0e;';
    } else if (capacityStatus === 'red') {
      pillStyle = 'background-color: #fee2e2; color: #991b1b;';
    }

    // Override for past
    if (isPast) {
      pillStyle = 'background-color: #f3f4f6; color: #9ca3af;';
    }

    return `
            <div class="calendar-cell day ${hasEvents ? 'has-events' : ''} ${isPast ? 'past' : ''}" 
                 style="background-color: white; ${capacityStatus === 'blackout' ? 'background-color: #f9fafb; color: #9ca3af;' : ''} ${cursorStyle}"
                 ${clickAttr}>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                 <span class="day-number" style="${isPast ? 'color: #d1d5db;' : ''}">${day.day}</span>
                 ${bookings > 0 && bookingsList.length === 0 ? '<div title="Booking data hidden" style="width:8px; height:8px; background-color:var(--gray-300); border-radius:50%;"></div>' : ''}
              </div>
              
              ${bookingsList.length > 0 ? `
                <div class="booking-list" style="margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
                  ${bookingsList.map(b => `
                    <div style="font-size: 0.65rem; color: #374151; display: flex; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      <div style="width:5px; height:5px; background-color:var(--primary-color); border-radius:50%; flex-shrink: 0;"></div>
                      <span style="font-weight: 500;">${b.time.split('-')[0].replace(/\s/g, '').toLowerCase()}-${b.time.split('-')[1] ? b.time.split('-')[1].replace(/\s/g, '').toLowerCase() : ''}</span>
                      <span style="color: #6b7280; overflow: hidden; text-overflow: ellipsis;">${b.petName || 'Pet'}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${capacityStatus !== 'blackout' ?
        `<div class="capacity-pill" style="font-size: 0.65rem; margin-top: auto; font-weight: 600; padding: 2px 6px; border-radius: 9999px; text-align:center; width: fit-content; ${pillStyle}; align-self: flex-start; margin-top: 4px;">${slotsText}</div>`
        : ''}
            </div>
          `;

  }).join('')).join('')}
      </div>
      <div class="calendar-legend">
        <div class="legend-chip status-green">Open</div>
        <div class="legend-chip status-yellow">Filling fast</div>
        <div class="legend-chip status-red">Fully booked</div>
        <div class="legend-chip status-blackout">Closed</div>
      </div>
    </div>
  `;

  const prevBtn = container.querySelector('[data-cal-action="prev"]');
  const nextBtn = container.querySelector('[data-cal-action="next"]');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      state.monthOffset -= 1;
      renderMegaCalendar(containerId, state.dataset);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      state.monthOffset += 1;
      renderMegaCalendar(containerId, state.dataset);
    });
  }
}

// Open modal with day details
function openCalendarDayDetails(containerId, isoDate) {
  const container = document.getElementById(containerId);
  if (!container || !container.__calendarState || !container.__calendarState.dataset) return;

  const data = container.__calendarState.dataset[isoDate];
  if (!data || !data.bookingsList || data.bookingsList.length === 0) return;

  const bookings = data.bookingsList;
  const dateStr = formatDate(isoDate);

  // Create modal content
  const modal = document.createElement('div');
  modal.id = 'dayDetailsModal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;
  `;

  const listHtml = bookings.map(b => `
    <div style="background:var(--gray-100); padding:1rem; border-radius:var(--radius-sm); margin-bottom:0.75rem;">
      <div style="font-weight:600; margin-bottom:0.25rem; display:flex; justify-content:space-between;">
        <span>${b.time}</span>
        <span class="badge ${getCustomerStatusClass ? getCustomerStatusClass(b.status) : 'badge-secondary'}">${b.status}</span>
      </div>
      <div style="font-size:0.9rem; margin-bottom:0.25rem;"><strong>Pet:</strong> ${escapeHtml(b.petName || 'Unknown')} (${b.petType})</div>
      <div style="font-size:0.9rem; margin-bottom:0.25rem;"><strong>Service:</strong> ${escapeHtml(b.packageName || 'Grooming')}</div>
      <div style="font-size:0.85rem; color:var(--gray-600);">${b.bookingNotes ? `Note: ${escapeHtml(b.bookingNotes)}` : ''}</div>
    </div>
  `).join('');

  modal.innerHTML = `
    <div style="background:white; width:90%; max-width:400px; max-height:80vh; overflow-y:auto; border-radius:var(--radius); box-shadow:var(--shadow-lg); animation: slideUp 0.3s ease-out;">
      <div style="padding:1rem 1.5rem; border-bottom:1px solid var(--gray-200); display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; background:white;">
        <h3 style="margin:0;">${dateStr}</h3>
        <button onclick="document.getElementById('dayDetailsModal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
      </div>
      <div style="padding:1.5rem;">
         <h4 style="margin-top:0; margin-bottom:1rem; color:var(--gray-700);">Your Bookings</h4>
         ${listHtml}
      </div>
      <div style="padding:1rem; border-top:1px solid var(--gray-200); text-align:right;">
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('dayDetailsModal').remove()">Close</button>
      </div>
    </div>
  `;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  const existing = document.getElementById('dayDetailsModal');
  if (existing) existing.remove();

  document.body.appendChild(modal);
}
window.openCalendarDayDetails = openCalendarDayDetails;

function buildCalendarDataset(bookings = null, absences = null, displayBookings = null) {
  // Capacity Bookings: Used for calculating slots left (should include everyone)
  const capacityBookings = bookings || (typeof getBookings === 'function' ? getBookings() : []);
  if (absences === null) absences = (typeof getStaffAbsences === 'function' ? getStaffAbsences() : []);

  // Display Bookings: Used for showing "Booked" pill and details list (should be user-specific)
  // If displayBookings is null, default to capacityBookings (e.g. for Admin view)
  const relevantDisplayBookings = displayBookings !== null ? displayBookings : capacityBookings;

  const dataset = {};
  const relevantStatuses = ['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'];

  // Active bookings for capacity (All users)
  const activeCapacityBookings = capacityBookings.filter(b => !relevantStatuses.includes(b.status));
  // Active bookings for display (User only, or all if null)
  const activeDisplayBookings = relevantDisplayBookings.filter(b => !relevantStatuses.includes(b.status));

  const activeAbsences = absences.filter(absence => !['rejected', 'cancelledByStaff'].includes(absence.status));

  // Get all dates from today onwards (for current month view)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 2); // Show 2 months ahead

  // Initialize all dates with default status
  for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
    const iso = toLocalISO(d);

    // DIFFERENTIATE: Capacity vs Display
    const dayCapacityBookings = activeCapacityBookings.filter(b => b.date === iso);
    const dayDisplayBookings = activeDisplayBookings.filter(b => b.date === iso);

    const dayAbsences = activeAbsences.filter(a => a.date === iso);
    const blackout = getCalendarBlackout(iso);
    if (blackout) {
      dataset[iso] = {
        bookings: dayCapacityBookings.length,
        bookingsList: dayDisplayBookings,
        absences: dayAbsences.length,
        remaining: 0,
        capacity: 0,
        capacityStatus: 'blackout',
        blackout
      };
    } else {
      // getDayCapacityStatus is async, but we need to compute synchronously here
      // Use a simplified calculation for calendar display
      const groomers = getGroomers();
      const totalGroomers = groomers.length || DEFAULT_GROOMERS.length;
      const availableGroomers = Math.max(totalGroomers - dayAbsences.length, 1);
      const capacity = availableGroomers * (typeof GROOMER_DAILY_LIMIT !== 'undefined' ? GROOMER_DAILY_LIMIT : 5);
      let remaining = Math.max(capacity - dayCapacityBookings.length, 0);

      // FIX: If today, subtract capacity of past time slots (Start + 30m)
      const todayIso = toLocalISO(new Date());
      if (iso === todayIso) {
        const timeSlots = window.STANDARD_TIME_SLOTS || ['9am-12pm', '12pm-3pm', '3pm-6pm'];
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const capacityPerSlot = Math.floor(capacity / timeSlots.length);
        let pastSlotsCapacity = 0;
        let pastBookingsCount = 0;

        timeSlots.forEach(slot => {
          const parts = slot.split('-');
          const endTimeStr = (parts[1] || parts[0]).trim();
          let endHour = parseInt(endTimeStr);
          const isPM = endTimeStr.toLowerCase().includes('pm');
          if (isPM && endHour !== 12) endHour += 12;
          else if (!isPM && endHour === 12) endHour = 0;

          // Cutoff: 30 mins before END
          let cutoffHour = endHour;
          let cutoffMinute = 0;
          if (cutoffMinute === 0) {
            cutoffHour -= 1;
            cutoffMinute = 30;
          } else {
            cutoffMinute -= 30;
          }

          // Past if current time > Cutoff
          const isPast = currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute >= cutoffMinute);

          if (isPast) {
            pastSlotsCapacity += capacityPerSlot;
            const bookingsForSlot = dayCapacityBookings.filter(b => b.time === slot).length;
            pastBookingsCount += bookingsForSlot;
          }
        });

        const futureCapacity = capacity - pastSlotsCapacity;
        const futureBookings = dayCapacityBookings.length - pastBookingsCount;
        remaining = Math.max(0, futureCapacity - futureBookings);
      }

      let capacityStatus = 'green';
      if (dayCapacityBookings.length === 0 && remaining > 0) {
        capacityStatus = 'green';
      } else if (remaining >= capacity * 0.5) {
        capacityStatus = 'green';
      } else if (remaining > 0) {
        capacityStatus = 'yellow';
      } else {
        capacityStatus = 'red';
      }
      dataset[iso] = {
        bookings: dayDisplayBookings.length, // Display count for User
        bookingsList: dayDisplayBookings,    // Display details for User
        absences: dayAbsences.length,
        availableGroomers,
        capacity,
        remaining,
        capacityStatus
      };
    }
  }

  return dataset;
}

function getDayCapacityStatus(date, bookingCount = 0, absenceCount = 0) {
  const blackout = getCalendarBlackout(date);
  if (blackout) {
    return {
      availableGroomers: 0,
      capacity: 0,
      remaining: 0,
      capacityStatus: 'blackout',
      blackout
    };
  }
  const groomers = getGroomers();
  const totalGroomers = groomers.length || DEFAULT_GROOMERS.length;
  const availableGroomers = Math.max(totalGroomers - absenceCount, 1);
  const capacity = availableGroomers * GROOMER_DAILY_LIMIT;
  const remaining = Math.max(capacity - bookingCount, 0);
  let capacityStatus = 'green';
  if (bookingCount === 0) {
    capacityStatus = 'green';
  } else if (remaining >= capacity * 0.5) {
    capacityStatus = 'green'; // More than 50% available
  } else if (remaining > 0) {
    capacityStatus = 'yellow'; // Less than 50% but still available
  } else {
    capacityStatus = 'red'; // Fully booked
  }
  return { availableGroomers, capacity, remaining, capacityStatus };
}

function isGroomerAbsent(groomerId, date) {
  if (!groomerId || !date) return false;
  if (isCalendarBlackout(date)) return true;
  return getStaffAbsences().some(absence =>
    absence.groomerId === groomerId &&
    absence.date === date &&
    !['rejected', 'cancelledByStaff'].includes(absence.status)
  );
}

async function getActiveGroomers(date) {
  const groomers = await getGroomers();
  return groomers.filter(groomer => !isGroomerAbsent(groomer.id, date));
}

async function groomerHasCapacity(groomerId, date) {
  if (!groomerId || !date) return false;
  if (isGroomerAbsent(groomerId, date)) return false;
  const groomer = await getGroomerById(groomerId);
  const limit = groomer?.maxDailyBookings || GROOMER_DAILY_LIMIT;
  const bookings = await getBookings();
  const groomerBookings = bookings.filter(booking =>
    booking.groomerId === groomerId &&
    booking.date === date &&
    !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(booking.status)
  );
  return groomerBookings.length < limit;
}

async function groomerSlotAvailable(groomerId, date, time) {
  if (!groomerId || !date || !time) return false;
  if (isCalendarBlackout(date)) return false;
  const bookings = await getBookings();
  return !bookings.some(booking =>
    booking.groomerId === groomerId &&
    booking.date === date &&
    booking.time === time &&
    !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(booking.status)
  );
}

async function getAvailableGroomers(date) {
  if (!date || isCalendarBlackout(date)) return [];
  const activeGroomers = await getActiveGroomers(date);
  const availableGroomers = [];
  for (const groomer of activeGroomers) {
    if (await groomerHasCapacity(groomer.id, date)) {
      availableGroomers.push(groomer);
    }
  }
  return availableGroomers;
}

async function getGroomerDailyLoad(groomerId, date) {
  if (!groomerId || !date) return 0;
  const bookings = await getBookings();
  return bookings.filter(booking =>
    booking.groomerId === groomerId &&
    booking.date === date &&
    !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes((booking.status || '').toString())
  ).length;
}

async function linkStaffToGroomer(user) {
  if (!user) return null;
  if (user.groomerId) return user.groomerId;
  const groomers = await getGroomers();
  let assigned = groomers.find(g => g.staffId === user.id);
  if (!assigned) {
    assigned = groomers.find(g => !g.staffId) || groomers[0];
    if (assigned) {
      assigned.staffId = user.id;
      await saveGroomers(groomers);
    }
  }
  if (assigned) {
    user.groomerId = assigned.id;
    const users = await getUsers();
    const updatedUsers = users.map(u => u.id === user.id ? { ...u, groomerId: assigned.id } : u);
    await saveUsers(updatedUsers);
    await syncCurrentUser(user.id);
    return assigned.id;
  }
  return null;
}

// Initialize on page load
// Initialization is handled after auth state is determined below.
// Removed the immediate DOMContentLoaded call to avoid racing with Firebase Auth.
console.log('Initialization deferred until auth state is resolved');

// Ensure initializeData runs after auth is resolved and redirect user to dashboard on login
(async function setupAuthInit() {
  if (typeof onAuthStateChanged === 'function') {
    let seen = false;
    onAuthStateChanged(async (user) => {
      try {
        await initializeData();
      } catch (e) {
        console.warn('initializeData after auth failed', e);
      }
      // On first authenticated arrival, redirect to dashboard ONLY if on login page
      // Don't redirect from booking or booking-success pages - let them complete their flow
      if (user && !seen) {
        seen = true;
        const p = window.location.pathname.toLowerCase();
        // Only redirect from login page, NOT from booking pages
        if (p.endsWith('login.html')) {
          window.location.href = 'customer-dashboard.html';
        }
      }
    });
  } else {
    // Fallback when no auth helper is available
    initializeData().catch(e => console.warn('initializeData failed', e));
  }
})();

window.getGroomers = getGroomers;
window.getGroomerById = getGroomerById;
window.getAvailableGroomers = getAvailableGroomers;
window.groomerHasCapacity = groomerHasCapacity;
window.groomerSlotAvailable = groomerSlotAvailable;
window.getGroomerDailyLoad = getGroomerDailyLoad;
window.linkStaffToGroomer = linkStaffToGroomer;
window.validatePhoneNumber = validatePhoneNumber;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.escapeHtml = escapeHtml;
window.formatCurrency = formatCurrency;
window.computeBookingCost = computeBookingCost;
window.getSingleServicePrice = getSingleServicePrice;
window.SINGLE_SERVICE_PRICING = SINGLE_SERVICE_PRICING;
window.changePasswordForCurrentUser = changePasswordForCurrentUser;
window.BOOKING_FEE = BOOKING_FEE;
window.renderCommunityReviewFeed = renderCommunityReviewFeed;
window.openGalleryZoom = openGalleryZoom;

// Mobile drawer functionality
function initMobileDrawer() {
  const menuToggle = document.querySelector('.menu-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  const overlay = document.querySelector('.mobile-drawer-overlay');
  const drawerClose = document.querySelector('.mobile-drawer-close');

  if (!menuToggle || !drawer || !overlay) return;

  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  menuToggle.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Close drawer when clicking a link
  const drawerLinks = drawer.querySelectorAll('a');
  drawerLinks.forEach(link => {
    link.addEventListener('click', () => {
      setTimeout(closeDrawer, 100);
    });
  });
}

// Initialize drawer on page load
document.addEventListener('DOMContentLoaded', function () {
  initMobileDrawer();
  // Update navigation based on login status
  updateNavigationForUser();
});

/**
 * Update navigation links based on user login status and role
 * Shows Dashboard link (role-based) and Logout when logged in
 * Shows Login when not logged in
 */
async function updateNavigationForUser() {
  try {
    let user = null;
    if (typeof getCurrentUser === 'function') {
      user = await getCurrentUser();
    }

    const navLinks = document.querySelector('.nav-links');
    const mobileDrawerLinks = document.querySelector('.mobile-drawer-links');

    if (!navLinks && !mobileDrawerLinks) return;

    // Determine dashboard URL based on role
    let dashboardUrl = 'customer-dashboard.html';
    let dashboardLabel = 'Dashboard';
    
    if (user) {
      const role = (user.role || '').toLowerCase();
      if (role === 'admin') {
        dashboardUrl = 'admin-dashboard.html';
        dashboardLabel = 'Admin Dashboard';
      } else if (role === 'groomer' || role === 'groomers' || role === 'staff') {
        dashboardUrl = 'groomer-dashboard.html';
        dashboardLabel = 'Groomer Dashboard';
      } else {
        dashboardUrl = 'customer-dashboard.html';
        dashboardLabel = 'My Dashboard';
      }
    }

    // Update desktop nav
    if (navLinks) {
      const loginLink = navLinks.querySelector('a[href="login.html"]');
      const existingDashboardLink = navLinks.querySelector('a[href*="dashboard.html"]');
      const existingLogoutLink = navLinks.querySelector('a[onclick*="logout"]');

      if (user) {
        // User is logged in - show Dashboard and Logout
        if (loginLink) {
          loginLink.href = dashboardUrl;
          loginLink.textContent = dashboardLabel;
        }
        // Add logout if not exists
        if (!existingLogoutLink && loginLink) {
          const logoutLi = document.createElement('li');
          logoutLi.innerHTML = '<a href="#" onclick="logout(event)">Logout</a>';
          loginLink.parentElement.insertAdjacentElement('afterend', logoutLi);
        }
      } else {
        // User not logged in - show Login
        if (existingDashboardLink && existingDashboardLink.href.includes('dashboard')) {
          existingDashboardLink.href = 'login.html';
          existingDashboardLink.textContent = 'Login';
        }
      }
    }

    // Update mobile drawer nav
    if (mobileDrawerLinks) {
      const mobileLoginLink = mobileDrawerLinks.querySelector('a[href="login.html"]');
      const mobileExistingDashboardLink = mobileDrawerLinks.querySelector('a[href*="dashboard.html"]');
      const mobileExistingLogoutLink = mobileDrawerLinks.querySelector('a[onclick*="logout"]');

      if (user) {
        // User is logged in - show Dashboard and Logout
        if (mobileLoginLink) {
          mobileLoginLink.href = dashboardUrl;
          mobileLoginLink.textContent = dashboardLabel;
        }
        // Add logout if not exists
        if (!mobileExistingLogoutLink && mobileLoginLink) {
          const logoutLi = document.createElement('li');
          logoutLi.innerHTML = '<a href="#" onclick="logout(event)">Logout</a>';
          mobileLoginLink.parentElement.insertAdjacentElement('afterend', logoutLi);
        }
      } else {
        // User not logged in - show Login
        if (mobileExistingDashboardLink && mobileExistingDashboardLink.href.includes('dashboard')) {
          mobileExistingDashboardLink.href = 'login.html';
          mobileExistingDashboardLink.textContent = 'Login';
        }
      }
    }
  } catch (e) {
    console.warn('updateNavigationForUser failed:', e);
  }
}
window.updateNavigationForUser = updateNavigationForUser;
window.getCustomerProfile = getCustomerProfile;
window.saveCustomerProfile = saveCustomerProfile;
window.getCustomerWarningInfo = getCustomerWarningInfo;
window.incrementCustomerWarning = incrementCustomerWarning;
window.banCustomer = banCustomer;
window.liftCustomerBan = liftCustomerBan;
window.getCalendarBlackouts = getCalendarBlackouts;
window.addCalendarBlackout = addCalendarBlackout;
window.removeCalendarBlackout = removeCalendarBlackout;
window.isCalendarBlackout = isCalendarBlackout;
window.getCalendarBlackout = getCalendarBlackout;
window.getPublicReviewEntries = getPublicReviewEntries;
window.getBookingDisplayCode = getBookingDisplayCode;
window.generateBookingCode = generateBookingCode;
window.getStaffAbsences = getStaffAbsences;

// Render warning panel for customers (if present on the page)
async function renderWarningPanel() {
  try {
    const panel = document.getElementById('warningPanel');
    if (!panel) return;
    // Force display block to ensure visibility
    panel.style.display = 'block';

    // Default info
    let info = { warnings: 0 };

    // Try to get user data
    let user = null;
    try {
      if (typeof getCurrentUser === 'function') user = await getCurrentUser();
    } catch (e) { console.warn('User fetch failed', e); }

    // If we have a user, fetch real warning info
    if (user && typeof getCustomerWarningInfo === 'function') {
      try {
        const res = await getCustomerWarningInfo(user.id);
        if (res) info = res;
      } catch (e) { console.warn('Warning info fetch failed', e); }
    } else if (!user) {
      // Fallback for demo/dev if no user logged in? 
      // Or keep 0.
      console.warn('No user logged in for Warning Panel');
    }
    try {
      if (user && typeof getCustomerWarningInfo === 'function') {
        const result = await getCustomerWarningInfo(user.id);
        if (result) info = result;
      }
    } catch (e) {
      console.warn('renderWarningPanel: getCustomerWarningInfo failed', e);
      info = { warnings: 0 };
    }

    const warnings = Number(info.warnings || 0);
    const progressPercent = Math.min((warnings / WARNING_HARD_LIMIT) * 100, 100);

    panel.innerHTML = `
      <h3 style="margin-bottom:0.5rem;">⚠️ Safety Record</h3>
      <p style="color:var(--gray-600); font-size:0.9rem;">Three warnings trigger close monitoring. Five warnings = automatic ban.</p>
      <div class="progress-bar" style="background:var(--gray-200); border-radius:6px; height:10px; overflow:hidden; margin:0.4rem 0;">
        <div class="progress-fill" style="width:${progressPercent}%; background: ${warnings >= WARNING_THRESHOLD ? '#f59e0b' : '#10b981'}; height:100%; transition: width 300ms ease;"></div>
      </div>
      <p style="font-size:0.95rem; font-weight:700; color:${warnings >= WARNING_THRESHOLD ? '#b45309' : 'var(--gray-900)'}; margin:0.35rem 0;">
        ${warnings}/5 warnings${info.isBanned ? ' · Currently banned' : ''}
      </p>
      <div style="margin-top:0.5rem; display:flex; gap:0.5rem; align-items:center;">
        <button id="requestLiftBtn" class="btn btn-primary btn-sm" style="padding:0.45rem 0.6rem;">Request Lift</button>
        <button id="viewWarningHistoryBtn" class="btn btn-outline btn-sm" style="padding:0.45rem 0.6rem;">View Warning History</button>
      </div>
      <div class="lift-ban-note" style="font-size:0.85rem; color:var(--gray-700); margin-top:0.75rem;">
        <strong>How to request a ban uplift:</strong>
        <ol style="margin:0.25rem 0 0 1.2rem; padding:0;">
          <li>Pay the <strong>₱500 uplift fee</strong> in-store or via the accepted payment method.</li>
          <li>Share proof of payment via admin chat or email <a href="mailto:hello@bestbuddies.pet">hello@bestbuddies.pet</a>.</li>
          <li>Wait for confirmation (1-2 business hours) while the admin reviews your case.</li>
        </ol>
      </div>
    `;

    // Add small badge in sidebar navigation to show warning count
    try {
      const navLink = document.querySelector('.sidebar-menu a[data-view="overview"]');
      if (navLink) {
        // remove existing badge if any
        const existing = navLink.querySelector('.warning-badge');
        if (existing) existing.remove();
        const badge = document.createElement('span');
        badge.className = 'warning-badge';
        badge.style.cssText = 'display:inline-block; margin-left:0.5rem; background:' + (warnings >= WARNING_THRESHOLD ? '#ffedd5' : '#ecfdf5') + '; color:' + (warnings >= WARNING_THRESHOLD ? '#92400e' : '#065f46') + '; padding:0.15rem 0.45rem; border-radius:12px; font-size:0.75rem; font-weight:700;';
        badge.textContent = warnings + '/5';
        navLink.appendChild(badge);
      }
    } catch (e) {
      console.warn('Could not update sidebar warning badge', e);
    }

    // Wire up Request Lift and View History buttons
    setTimeout(() => {
      const reqBtn = document.getElementById('requestLiftBtn');
      const histBtn = document.getElementById('viewWarningHistoryBtn');
      if (reqBtn) {
        reqBtn.addEventListener('click', async () => {
          // If not banned, suggest contacting admin for review
          if (!info.isBanned) {
            customAlert.show('No Ban Active', `Your account is not currently banned. If you received a warning and want clarification, contact us at ${STORE_INFO.email} or call ${STORE_INFO.phone}`, 'info');
            return;
          }
          // If user exists, open email with prefilled subject and body
          try {
            const user = await (typeof getCurrentUser === 'function' ? getCurrentUser() : Promise.resolve(null));
            const body = encodeURIComponent(`Hello Admin,%0A%0AI am requesting a ban uplift.%0AUser ID: ${user?.id || 'unknown'}%0AEmail: ${user?.email || ''}%0AI have paid the ₱500 uplift fee and attached proof.%0A%0AThank you.`);
            window.location.href = `mailto:hello@bestbuddies.pet?subject=Ban%20Uplift%20Request&body=${body}`;
          } catch (e) {
            window.location.href = 'mailto:hello@bestbuddies.pet?subject=Ban%20Uplift%20Request';
          }
        });
      }
      if (histBtn) {
        histBtn.addEventListener('click', async () => {
          // try to fetch and show warning history
          try {
            const user = await (typeof getCurrentUser === 'function' ? getCurrentUser() : Promise.resolve(null));
            if (!user) {
              customAlert.warning('Not logged in', 'Please log in to view your warning history.');
              return;
            }
            const infoFull = await (typeof getCustomerWarningInfo === 'function' ? getCustomerWarningInfo(user.id) : Promise.resolve(null));
            const entries = infoFull?.entries || [];
            if (!entries.length) {
              customAlert.show('No Warnings', 'You have no recorded warning history.', 'info');
              return;
            }
            const list = entries.map(e => `${new Date(e.date).toLocaleString()} · ${e.reason || 'Warning'}`).join('\n');
            customAlert.show('Warning History', `<pre style="white-space: pre-wrap;">${list}</pre>`, 'info');
          } catch (e) {
            console.warn('Failed loading warning history', e);
            customAlert.error('Error', 'Could not load warning history. Please contact admin.');
          }
        });
      }
    }, 100);
  } catch (err) {
    console.error('renderWarningPanel unexpected error', err);
  }
}

window.renderWarningPanel = renderWarningPanel;

// Render team availability calendar into a target container (uses same mega calendar view)
async function renderTeamAvailability(containerId = 'customerTeamCalendar') {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;
    let bookings = [];
    let absences = [];
    try {
      if (typeof getBookings === 'function') bookings = await getBookings();
    } catch (e) {
      console.warn('renderTeamAvailability: getBookings failed', e);
      bookings = Array.isArray(getBookingsSync) ? getBookingsSync() : [];
    }
    try {
      if (typeof getStaffAbsences === 'function') absences = await getStaffAbsences();
    } catch (e) {
      console.warn('renderTeamAvailability: getStaffAbsences failed', e);
      absences = [];
    }

    // Build dataset and render mega calendar (reuses existing shared renderer)
    const dataset = buildCalendarDataset(bookings, absences);
    renderMegaCalendar(containerId, dataset);
  } catch (err) {
    console.error('renderTeamAvailability unexpected error', err);
  }
}

window.renderTeamAvailability = renderTeamAvailability;

// Uplift modal handler: open modal, submit request (stores to localStorage or tries create request via Firebase)
function openUpliftModal() {
  const modal = document.getElementById('upliftModal');
  if (!modal) return;
  modal.style.display = 'flex';
}

function closeUpliftModal() {
  const modal = document.getElementById('upliftModal');
  if (!modal) return;
  modal.style.display = 'none';
  const proof = document.getElementById('upliftProofInput');
  const note = document.getElementById('upliftNote');
  if (proof) proof.value = null;
  if (note) note.value = '';
  const fb = document.getElementById('upliftFeedback'); if (fb) { fb.style.display = 'none'; fb.textContent = ''; }
}

async function submitUpliftRequest() {
  const proofInput = document.getElementById('upliftProofInput');
  const noteEl = document.getElementById('upliftNote');
  const feedback = document.getElementById('upliftFeedback');
  if (!proofInput || !feedback) return;
  feedback.style.display = 'none';

  // Validate
  if (!proofInput.files || proofInput.files.length === 0) {
    feedback.style.display = 'block';
    feedback.style.color = 'var(--danger, #d32f2f)';
    feedback.textContent = 'Please attach a proof of payment file.';
    return;
  }

  const file = proofInput.files[0];
  // Limit size to 5MB
  if (file.size > 5 * 1024 * 1024) {
    feedback.style.display = 'block';
    feedback.style.color = 'var(--danger, #d32f2f)';
    feedback.textContent = 'File too large — max 5MB.';
    return;
  }

  // Read file as data URL for localStorage fallback
  const reader = new FileReader();
  reader.onload = async function (e) {
    const dataUrl = e.target.result;
    // Build request payload
    let user = null;
    try { user = await getCurrentUser(); } catch (e) { user = null; }
    const payload = {
      id: 'uplift-' + Date.now(),
      userId: user?.id || null,
      email: user?.email || null,
      submittedAt: Date.now(),
      note: (noteEl && noteEl.value) ? noteEl.value.trim() : '',
      proof: dataUrl,
      status: 'pending'
    };

    // Try to save to Firebase under 'upliftRequests' if DB exists
    try {
      if (typeof saveUpliftRequest === 'function') {
        await saveUpliftRequest(payload);
        feedback.style.display = 'block';
        feedback.style.color = 'var(--success-600, #16a34a)';
        feedback.textContent = 'Request submitted — admin will review shortly.';
        setTimeout(closeUpliftModal, 1400);
        return;
      }
    } catch (e) {
      console.warn('saveUpliftRequest failed, falling back to localStorage', e);
    }

    // Fallback: persist to localStorage list
    try {
      const existing = JSON.parse(localStorage.getItem('upliftRequests') || '[]');
      existing.push(payload);
      localStorage.setItem('upliftRequests', JSON.stringify(existing));
      feedback.style.display = 'block';
      feedback.style.color = 'var(--success-600, #16a34a)';
      feedback.textContent = 'Request saved locally. Admin will review when available.';
      setTimeout(closeUpliftModal, 1200);
      return;
    } catch (e) {
      console.error('Could not save uplift request', e);
      feedback.style.display = 'block';
      feedback.style.color = 'var(--danger, #d32f2f)';
      feedback.textContent = `Could not submit request. Please contact us at ${STORE_INFO.email} or call ${STORE_INFO.phone}`;
    }
  };
  reader.readAsDataURL(file);
}

// Wire modal buttons (safe to call multiple times)
function initUpliftModalHandlers() {
  const openBtns = document.querySelectorAll('#requestLiftBtn');
  openBtns.forEach(b => b.addEventListener('click', openUpliftModal));
  const cancel = document.getElementById('cancelUpliftBtn');
  if (cancel) cancel.addEventListener('click', closeUpliftModal);
  const submit = document.getElementById('submitUpliftBtn');
  if (submit) submit.addEventListener('click', submitUpliftRequest);
}

// Initialize modal handlers on DOM ready
document.addEventListener('DOMContentLoaded', function () {
  initUpliftModalHandlers();
});

/* ============================================
   Lightbox Functionality (Global)
   ============================================ */

function initLightbox() {
  const lightboxLinks = document.querySelectorAll('.lightbox-link');
  const lightbox = document.getElementById('lightbox');

  if (!lightbox) return;

  lightboxLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const imageSrc = this.getAttribute('href');
      openLightbox(imageSrc);
    });
  });

  // Close lightbox when clicking background
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  // Close lightbox with escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeLightbox();
    }
  });
}

function openLightbox(imageSrc) {
  console.log('[openLightbox] Opening lightbox with image:', imageSrc);
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');

  if (!lightbox || !lightboxImage) {
    console.warn('[openLightbox] Lightbox elements not found!');
    return;
  }

  lightboxImage.src = imageSrc;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Add click handler to close on background click
  lightbox.onclick = function(e) {
    if (e.target === lightbox || e.target === lightboxImage) {
      closeLightbox();
    }
  };
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');

  if (!lightbox) return;

  lightbox.classList.remove('active');
  document.body.style.overflow = 'auto';
}

window.initLightbox = initLightbox;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;

// Initialize lightbox on DOM ready
document.addEventListener('DOMContentLoaded', initLightbox);

// Render warning panel on DOM ready if present
document.addEventListener('DOMContentLoaded', function () {
  if (typeof renderWarningPanel === 'function') {
    renderWarningPanel().catch(err => console.warn('renderWarningPanel failed on DOM ready', err));
  }
  // Render team availability calendar on pages that include the container
  if (typeof renderTeamAvailability === 'function') {
    renderTeamAvailability('customerTeamCalendar').catch(err => console.warn('renderTeamAvailability DOM ready failed', err));
  }
});

// Fallback synchronous getters used by UI code that expects immediate arrays
function getBookingsSync() {
  const stored = localStorage.getItem('bookings');
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('getBookingsSync parse error:', e);
    return [];
  }
}

function getGroomersSync() {
  const stored = localStorage.getItem('groomers');
  if (!stored) return DEFAULT_GROOMERS.slice();
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : DEFAULT_GROOMERS.slice();
  } catch (e) {
    console.error('getGroomersSync parse error:', e);
    return DEFAULT_GROOMERS.slice();
  }
}

function getUsersSync() {
  const stored = localStorage.getItem('users');
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('getUsersSync parse error:', e);
    return [];
  }
}

// Note: saveBookings is already defined above, no need to redefine it

// Simple auth guard used by pages that call requireLogin()
async function requireLogin(redirectTo = 'login.html') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectTo;
    throw new Error('login-required');
  }
  return user;
}

// // Simple catalog of reference cuts (replace image paths with your assets)
// const PREFERRED_CUTS = [
//   { id: 'puppy',   label: 'Puppy Cut',   image: 'img/cuts/puppy.jpg' },
//   { id: 'teddy',   label: 'Teddy Bear Cut', image: 'img/cuts/teddy.jpg' },
//   { id: 'lion',    label: 'Lion Cut',    image: 'img/cuts/lion.jpg' },
//   { id: 'summer',  label: 'Summer Cut',  image: 'img/cuts/summer.jpg' },
//   { id: 'kennel',  label: 'Kennel Cut',  image: 'img/cuts/kennel.jpg' },
//   { id: 'show',    label: 'Show Cut',    image: 'img/cuts/show.jpg' }
// ];

// // Render the visual pick-list into #preferredCuts
// function renderPreferredCuts(containerId = 'preferredCuts', selectedId = '') {
//   const container = document.getElementById(containerId);
//   if (!container) return;
//   container.innerHTML = '';
//   PREFERRED_CUTS.forEach(cut => {
//     const card = document.createElement('div');
//     card.className = 'preferred-cut-card';
//     card.style.cursor = 'pointer';
//     card.style.border = cut.id === selectedId ? '3px solid #4CAF50' : '1px solid #ddd';
//     card.style.padding = '0.5rem';
//     card.style.borderRadius = '8px';
//     card.style.width = '120px';
//     card.style.textAlign = 'center';
//     card.innerHTML = `
//       <img src="${cut.image}" alt="${cut.label}" style="width:100%; height:80px; object-fit:cover; border-radius:6px;">
//       <div style="margin-top:0.5rem; font-size:0.95rem;">${cut.label}</div>
//     `;
//     card.dataset.cutId = cut.id;
//     card.onclick = () => selectPreferredCut(cut.id);
//     container.appendChild(card);
//   });
//   // set hidden input value
//   const input = document.getElementById('preferredCutInput');
//   if (input) input.value = selectedId || '';
// }

// // UI selection handler: set input, highlight, and optionally save to profile
// async function selectPreferredCut(cutId) {
//   const prev = document.querySelectorAll('#preferredCuts .preferred-cut-card');
//   prev.forEach(n => n.style.border = '1px solid #ddd');
//   const selected = document.querySelector(`#preferredCuts .preferred-cut-card[data-cut-id="${cutId}"]`);
//   if (selected) selected.style.border = '3px solid #4CAF50';
//   const input = document.getElementById('preferredCutInput');
//   if (input) input.value = cutId || '';

//   // if user checked "save details", persist to profile
//   const saveBox = document.getElementById('savePreferredCut');
//   if (saveBox && saveBox.checked) {
//     await savePreferredCutToProfile(cutId);
//   }
// }

// // Save preferred cut to current user's profile (firebase or localStorage fallback)
// async function savePreferredCutToProfile(cutId) {
//   try {
//     const user = await (typeof getCurrentUser === 'function' ? getCurrentUser() : Promise.resolve(null));
//     if (!user) {
//       // local fallback: save to customerProfiles keyed by email or local id
//       const profilesRaw = localStorage.getItem(CUSTOMER_PROFILE_KEY) || '{}';
//       const profiles = JSON.parse(profilesRaw || '{}');
//       const key = 'guest';
//       profiles[key] = profiles[key] || {};
//       profiles[key].preferredCut = cutId;
//       localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(profiles));
//       return;
//     }
//     // if firebase saveUsers exists, update the user record and persist
//     if (typeof getUsers === 'function' && typeof saveUsers === 'function') {
//       const users = await getUsers().catch(() => []);
//       const idx = users.findIndex(u => u.id === user.id);
//       if (idx >= 0) {
//         users[idx].preferredCut = cutId;
//       } else {
//         users.push({ id: user.id, email: user.email, name: user.name, preferredCut: cutId });
//       }
//       await saveUsers(users);
//     } else {
//       // fallback: attach to currentUser and localStorage
//       user.preferredCut = cutId;
//       setCurrentUser(user);
//       localStorage.setItem('currentUser', JSON.stringify(user));
//     }
//   } catch (e) {
//     console.warn('savePreferredCutToProfile failed:', e);
//   }
// }

// // Prefill picker from profile or localStorage; call on page load
// async function populatePreferredCutFromProfile() {
//   try {
//     // check current user then profiles fallback
//     const user = await (typeof getCurrentUser === 'function' ? getCurrentUser() : Promise.resolve(null));
//     let preferred = '';
//     if (user && user.preferredCut) preferred = user.preferredCut;
//     else {
//       const profilesRaw = localStorage.getItem(CUSTOMER_PROFILE_KEY);
//       if (profilesRaw) {
//         const profiles = JSON.parse(profilesRaw || '{}');
//         const key = 'guest';
//         preferred = (profiles[key] && profiles[key].preferredCut) || '';
//       }
//     }
//     renderPreferredCuts('preferredCuts', preferred);
//   } catch (e) {
//     console.warn('populatePreferredCutFromProfile failed:', e);
//     renderPreferredCuts('preferredCuts', '');
//   }
// }

// Hook up on DOM ready (booking page)
// document.addEventListener('DOMContentLoaded', function() {
//   // If booking form exists, initialize picker and wire submit to include preferredCut
//   if (document.getElementById('preferredCuts')) {
//     populatePreferredCutFromProfile();
//   }

//   const bookingForm = document.getElementById('bookingForm');
//   if (bookingForm) {
//     bookingForm.addEventListener('submit', async function(e) {
//       // ensure preferredCut is read into the form data (hidden input already set by select)
//       // let existing handler continue — do nothing here if form already handles creating booking.
//       // If you create booking in JS, make sure to include:
//       // booking.preferredCut = document.getElementById('preferredCutInput')?.value || '';
//     }, { passive: false });
//   }
// });

/* ============================================
   Featured Cuts Management (Admin)
   ============================================ */

// Mark a booking as featured
async function markAsFeatured(bookingId) {
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      console.error('Booking not found:', bookingId);
      return false;
    }

    booking.isFeatured = true;
    booking.featuredDate = new Date().toISOString();
    await saveBookings(bookings);

    console.log(`[Featured] ✅ Marked booking ${bookingId} as featured`);
    return true;
  } catch (error) {
    console.error('[Featured] ❌ Error marking booking as featured:', error);
    return false;
  }
}

// Unmark a booking from featured
async function unmarkAsFeatured(bookingId) {
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      console.error('Booking not found:', bookingId);
      return false;
    }

    booking.isFeatured = false;
    await saveBookings(bookings);

    console.log(`[Featured] ✅ Unmarked booking ${bookingId} from featured`);
    return true;
  } catch (error) {
    console.error('[Featured] ❌ Error unmarking booking:', error);
    return false;
  }
}

// Get featured bookings (with images)
async function getFeaturedBookings(limit = 4) {
  try {
    const bookings = await getBookings();

    const featured = bookings
      .filter(b => b.isFeatured && b.beforeImage && b.afterImage)
      .sort((a, b) => {
        // Sort by featured date (newest first), then by booking date
        const dateA = new Date(a.featuredDate || a.date || a.id);
        const dateB = new Date(b.featuredDate || b.date || b.id);
        return dateB - dateA;
      })
      .slice(0, limit);

    console.log(`[Featured] Fetched ${featured.length} featured bookings from ${bookings.length} total bookings`);
    return featured;
  } catch (error) {
    console.warn('[Featured] Using fallback data due to access restrictions');
    
    // Return sample featured data for demo purposes when Firebase access is restricted
    return [
      {
        id: 'featured-demo-1',
        customerName: 'Happy Customer',
        petName: 'Buddy',
        packageName: 'Full Package',
        beforeImage: 'assets/before.jpg',
        afterImage: 'assets/after.jpg',
        isFeatured: true,
        date: '2024-12-15'
      },
      {
        id: 'featured-demo-2', 
        customerName: 'Satisfied Owner',
        petName: 'Luna',
        packageName: 'Styling Package',
        beforeImage: 'assets/before2.jpg',
        afterImage: 'assets/after2.jpg',
        isFeatured: true,
        date: '2024-12-10'
      }
    ];
  }
}

// Delete images from a booking (keep booking record)
async function deleteBookingImages(bookingId) {
  try {
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      console.error('Booking not found:', bookingId);
      return false;
    }

    booking.beforeImage = '';
    booking.afterImage = '';

    // If it was featured, unfeature it too
    if (booking.isFeatured) {
      booking.isFeatured = false;
    }

    await saveBookings(bookings);

    console.log(`[Featured] ✅ Deleted images from booking ${bookingId}`);
    return true;
  } catch (error) {
    console.error('[Featured] ❌ Error deleting images:', error);
    return false;
  }
}

// Get featured entries for display (same format as public review entries)
async function getFeaturedReviewEntries(limit = 4) {
  try {
    const bookings = await getFeaturedBookings(limit);

    const entries = bookings.map(booking => {
      let serviceDescription = booking.packageName || 'Custom Service';
      if (booking.packageId === 'single-service' && booking.singleServices?.length) {
        const services = booking.singleServices.map(id => SINGLE_SERVICE_PRICING?.[id]?.label || id).join(', ');
        serviceDescription = `Single Services: ${services}`;
      }

      return {
        id: booking.id,
        shortId: getBookingDisplayCode(booking),
        petName: booking.petName,
        packageName: booking.packageName,
        serviceDescription: serviceDescription,
        bookingNotes: booking.bookingNotes || '',
        groomingNotes: booking.groomingNotes || '',
        review: booking.review || '',
        rating: booking.rating || 0,
        beforeImage: booking.beforeImage,
        afterImage: booking.afterImage,
        date: booking.date,
        customerName: booking.customerName || 'Customer',
        groomerName: booking.groomerName || 'Professional Groomer',
        isFeatured: booking.isFeatured
      };
    });

    return entries;
  } catch (error) {
    console.error('[Featured] ❌ Error getting featured review entries:', error);
    return [];
  }
}

// Make functions globally available
window.markAsFeatured = markAsFeatured;
window.unmarkAsFeatured = unmarkAsFeatured;
window.getFeaturedBookings = getFeaturedBookings;
window.deleteBookingImages = deleteBookingImages;
window.getFeaturedReviewEntries = getFeaturedReviewEntries;

// Render featured cuts gallery on public pages
async function renderFeaturedCutsGallery(targetId = 'homeFeaturedFeed', limit = 4) {
  const container = document.getElementById(targetId);
  if (!container || typeof getFeaturedReviewEntries !== 'function') return;

  try {
    const entries = await getFeaturedReviewEntries(limit);

    if (!entries.length) {
      container.innerHTML = '<p class="empty-state" style="margin:0;">No featured cuts yet. Check back soon!</p>';
      return;
    }

    container.innerHTML = entries.map(entry => `
      <article class="review-card">
        <div class="review-card-gallery" onclick="openGalleryZoom('${entry.beforeImage}', '${entry.afterImage}', '${escapeHtml(entry.petName)}');" style="cursor: pointer;">
          <img src="${entry.beforeImage}" alt="Before ${escapeHtml(entry.petName)}">
          <img src="${entry.afterImage}" alt="After ${escapeHtml(entry.petName)}">
        </div>
        <div class="review-card-content">
          <h4 style="margin-bottom:0.35rem;">${escapeHtml(entry.petName)}</h4>
          <p style="font-size:0.85rem; color:var(--gray-600); margin-bottom:0.5rem;">
            ${formatDate(entry.date)} · <strong style="color: #000; font-weight: 700;">${escapeHtml(entry.packageName || 'Custom package')}</strong>
          </p>
          ${(() => {
        const notesText = entry.bookingNotes || '';
        if (!notesText || !notesText.trim()) return '';
        const cutNames = ['Puppy Cut', 'Teddy Bear Cut', 'Lion Cut', 'Summer Cut', 'Kennel Cut', 'Show Cut'];
        const notesLower = notesText.toLowerCase().trim();
        const preferredCut = cutNames.find(cut => notesLower.includes(cut.toLowerCase()));
        if (preferredCut) {
          return `<p style="font-size:0.85rem; background: #e8f5e9; padding: 0.5rem; border-left: 3px solid #2e7d32; margin: 0.5rem 0; font-weight: 500;"><strong>✂️ Preferred Cut:</strong> <span style="font-weight: 700; color: #2e7d32;">${escapeHtml(preferredCut)}</span></p>`;
        }
        return '';
      })()}
          <p style="font-size:0.9rem; color:var(--gray-700);">
            ${entry.review ? `"${escapeHtml(entry.review)}"` : 'Stunning transformation!'}
          </p>
          <div class="review-card-meta">
            <div>Code ${escapeHtml(entry.shortId)} · ${escapeHtml(entry.customerName)}</div>
            <div style="margin-top: 0.5rem; font-size: 0.85rem; background: #f0f0f0; padding: 0.5rem; border-radius: 0.25rem; font-weight: 600; color: #000;">✂️ Groomed by ${escapeHtml(entry.groomerName)}</div>
          </div>
        </div>
      </article>
    `).join('');
  } catch (error) {
    console.error('[Featured Gallery] Error rendering:', error);
    container.innerHTML = '<p class="empty-state" style="margin:0; color:#d32f2f;">Error loading featured cuts.</p>';
  }
}

window.renderFeaturedCutsGallery = renderFeaturedCutsGallery;

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function () {
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileDrawer = document.querySelector('.mobile-drawer');
  const mobileDrawerOverlay = document.querySelector('.mobile-drawer-overlay');
  const mobileDrawerClose = document.querySelector('.mobile-drawer-close');

  function openMenu() {
    if (mobileDrawer) mobileDrawer.classList.add('open');
    if (mobileDrawerOverlay) mobileDrawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    if (mobileDrawer) mobileDrawer.classList.remove('open');
    if (mobileDrawerOverlay) mobileDrawerOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (menuToggle) menuToggle.addEventListener('click', openMenu);
  if (mobileDrawerClose) mobileDrawerClose.addEventListener('click', closeMenu);
  if (mobileDrawerOverlay) mobileDrawerOverlay.addEventListener('click', closeMenu);
});

// ============================================
// Public Calendar Logic (Slots Left Design)
// ============================================

async function renderPublicCalendar(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Parse options - supports both old boolean arg and new options object
  const isSummaryMode = typeof options === 'boolean' ? options : (options.isSummaryMode || false);
  const onDateSelect = options.onDateSelect || null; // Callback for direct selection (booking mode)
  const selectedDate = options.selectedDate || null; // Currently selected date
  const showBookingDetails = options.showBookedList !== false; // Show modal with details (dashboard mode)

  // Initialize date state if not exists
  if (!container.__publicDate) {
    container.__publicDate = new Date();
  }

  const displayDate = container.__publicDate;
  const monthName = displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Fetch Data
  const bookings = await getBookings();
  const groomers = await getGroomers();
  const blackouts = getCalendarBlackouts(); // sync

  // Calculate daily capacity
  // Total capacity = Sum of maxDailyBookings for all active groomers
  // Default is 3 per groomer if not specified
  const totalDailyCapacity = groomers.reduce((sum, g) => sum + (g.maxDailyBookings || 3), 0);

  const firstDay = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
  const lastDay = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);
  const startWeekday = firstDay.getDay();

  // Navigation Header
  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
       <button class="btn btn-outline" style="min-width:32px; border-radius:50%; width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center;" onclick="changePublicCalendarMonth('${containerId}', -1)">←</button>
       <h4 style="margin:0; font-size:1.25rem; font-weight:700;">${monthName}</h4>
       <button class="btn btn-outline" style="min-width:32px; border-radius:50%; width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center;" onclick="changePublicCalendarMonth('${containerId}', 1)">→</button>
    </div>
    
    <div class="public-calendar-grid">
      ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div style="text-align:center; font-weight:600; color:var(--gray-500); padding-bottom:0.5rem;">${d}</div>`).join('')}
  `;

  // Empty cells
  for (let i = 0; i < startWeekday; i++) {
    html += `<div></div>`;
  }

  const todayStr = toLocalISO(new Date());

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateObj = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
    const isoDate = toLocalISO(dateObj);

    // Determine Status
    const dayBookings = bookings.filter(b => b.date === isoDate && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status));
    const bookedCount = dayBookings.length;

    let slotsLeft = Math.max(0, totalDailyCapacity - bookedCount);

    // FIX: If today, subtract capacity of past time slots
    if (isoDate === todayStr) {
      const timeSlots = window.STANDARD_TIME_SLOTS || ['9am-12pm', '12pm-3pm', '3pm-6pm'];
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Estimate capacity per slot (e.g., 15 total / 3 slots = 5 per slot)
      const capacityPerSlot = Math.floor(totalDailyCapacity / timeSlots.length);

      let pastSlotsCapacity = 0;
      let pastBookingsCount = 0;

      timeSlots.forEach(slot => {
        // Check if slot is past (use start time + 30 mins grace period)
        const startTimeStr = slot.split('-')[0].trim();
        let startHour = parseInt(startTimeStr);
        const isPM = startTimeStr.toLowerCase().includes('pm');
        if (isPM && startHour !== 12) startHour += 12;
        else if (!isPM && startHour === 12) startHour = 0;

        const isPast = currentHour > startHour || (currentHour === startHour && currentMinute > 30);

        if (isPast) {
          pastSlotsCapacity += capacityPerSlot;
          // Count bookings that were for this past slot
          const bookingsForSlot = dayBookings.filter(b => b.time === slot).length;
          pastBookingsCount += bookingsForSlot;
        }
      });

      // Remaining Future Capacity - Future Bookings
      const futureCapacity = totalDailyCapacity - pastSlotsCapacity;
      const futureBookings = bookedCount - pastBookingsCount;
      slotsLeft = Math.max(0, futureCapacity - futureBookings);
    }
    const isBlackout = blackouts.some(b => b.date === isoDate);
    const isPast = isoDate < todayStr;
    const isSelected = selectedDate === isoDate;

    let boxClass = 'open';
    let titleText = `${day}`;
    let subText = `${slotsLeft} slots left`;
    let counterHtml = bookedCount > 0 ? `<div class="booking-counter">${bookedCount}</div>` : '';

    // Determine click action based on mode
    let clickAction = '';
    if (!isPast && !isBlackout) {
      if (onDateSelect) {
        // Booking mode: direct callback
        // Store callback globally so onclick can access it
        window.__publicCalendarCallback = onDateSelect;
        if (slotsLeft > 0) {
          clickAction = `onclick="window.__publicCalendarCallback && window.__publicCalendarCallback('${isoDate}')"`;
        }
      } else if (showBookingDetails) {
        // Dashboard mode: show modal with details
        clickAction = `onclick="openPublicCalendarModal('${isoDate}')"`;
      }
    }

    // Override for specific states
    if (isPast || isBlackout) {
      boxClass = 'closed';
      subText = isBlackout ? 'Closed' : 'Not available';
      counterHtml = '';
      clickAction = '';
      if (isBlackout) subText = 'Closed';
    } else if (slotsLeft === 0) {
      boxClass = 'full';
      subText = 'Fully booked';
      // In booking mode, don't allow clicking fully booked days
      if (onDateSelect) clickAction = '';
    } else if (slotsLeft <= 5) {
      // Filling fast will be handled by inline style below
    }

    // Inline styles for states not in CSS to match image exactly
    let styleOverride = '';
    if (boxClass === 'full') {
      styleOverride = 'background:#ffebee; border-color:#ffcdd2; color:#c62828;';
    }
    if (!isPast && !isBlackout && slotsLeft <= 5 && slotsLeft > 0) {
      // Filling fast (Yellow/Orange)
      styleOverride = 'background:#fff3e0; border-color:#ffe0b2; color:#e65100;';
    }

    // Add selection highlight
    if (isSelected && !isPast && !isBlackout && slotsLeft > 0) {
      styleOverride += ' box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.4); border-width:2px;';
    }

    html += `
        <div class="public-calendar-day ${boxClass}" ${clickAction} style="${styleOverride}">
           <div style="font-weight:700; font-size:1.1rem; margin-bottom:auto;">${day}</div>
           <div style="font-size:0.65rem; font-weight:600; line-height:1.2; text-transform:uppercase; letter-spacing:0.02em;">
              ${subText}
           </div>
           ${!isPast && !isBlackout && bookedCount > 0 ? `
             <div style="position:absolute; bottom:8px; right:8px;">
               ${counterHtml}
             </div>
           ` : ''}
        </div>
      `;
  }

  html += `</div>`;

  // Legend
  if (!isSummaryMode) {
    html += `
         <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:1rem; justify-content:center;">
            <span class="badge" style="background:#e8f5e9; color:#2e7d32; border:1px solid #c8e6c9; font-size:0.75rem;">Open</span>
            <span class="badge" style="background:#fff3e0; color:#e65100; border:1px solid #ffe0b2; font-size:0.75rem;">Filling fast</span>
            <span class="badge" style="background:#ffebee; color:#c62828; border:1px solid #ffcdd2; font-size:0.75rem;">Fully booked</span>
            <span class="badge" style="background:#f5f5f5; color:#9e9e9e; border:1px solid #e0e0e0; font-size:0.75rem;">Closed</span>
         </div>
      `;
  }

  container.innerHTML = html;
}

function changePublicCalendarMonth(containerId, offset) {
  const container = document.getElementById(containerId);
  if (container && container.__publicDate) {
    container.__publicDate.setMonth(container.__publicDate.getMonth() + offset);
    renderPublicCalendar(containerId);
  }
}

async function openPublicCalendarModal(date, isCustomerView = false) {
  const bookings = await getBookings();

  // Filter bookings based on context
  let dayBookings;
  if (isCustomerView) {
    // Customer view: show only own bookings
    const user = await getCurrentUser();
    if (user) {
      dayBookings = bookings.filter(b =>
        b.date === date &&
        b.userId === user.id &&
        !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status)
      );
    } else {
      dayBookings = [];
    }
  } else {
    // Admin/public view: show all bookings
    dayBookings = bookings.filter(b => b.date === date && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status));
  }

  // Anonymize/Format for privacy: "9am - DogName (OwnerFirst)"
  dayBookings.sort((a, b) => {
    // simple sort
    return a.time.localeCompare(b.time);
  });

  let content = `
       <div style="text-align:center;">
          <h2 style="margin-top:0; margin-bottom:0.5rem;">📅 ${formatDate(date)}</h2>
          <p style="color:var(--gray-600); margin-bottom:1.5rem;">${dayBookings.length} booking(s) scheduled</p>
       </div>
    `;

  if (dayBookings.length === 0) {
    content += `<p style="text-align:center; padding:2rem; background:var(--gray-50); border-radius:8px;">No bookings yet. Be the first!</p>`;
  } else {
    content += `<div style="display:flex; flex-direction:column; gap:0.75rem; max-height:400px; overflow-y:auto;">`;
    dayBookings.forEach(b => {
      const ownerFirst = b.customerName ? b.customerName.split(' ')[0] : 'Customer';
      content += `
               <div style="padding:1rem; border:1px solid var(--gray-200); border-radius:var(--radius-sm); display:flex; align-items:center; gap:1rem; background:var(--white);">
                  <div style="width:10px; height:10px; background:var(--primary-color); border-radius:50%; flex-shrink:0;"></div>
                  <div>
                     <div style="font-weight:700; font-size:1rem; margin-bottom:0.1rem;">${b.time} — ${escapeHtml(b.petName)}</div>
                     <div style="font-size:0.85rem; color:var(--gray-600);">Owner: ${escapeHtml(ownerFirst)}</div>
                  </div>
               </div>
            `;
    });
    content += `</div>`;
  }

  content += `
       <div style="margin-top:2rem; text-align:center;">
          <button class="btn btn-outline" onclick="closeModal()" style="min-width:120px;">Close</button>
          ${typeof window.onPublicCalendarDateSelect === 'function' ?
      `<button class="btn btn-primary" onclick="window.onPublicCalendarDateSelect('${date}'); closeModal();" style="min-width:120px; margin-left:1rem;">Select Date</button>`
      : ''}
       </div>
    `;

  if (typeof showModal === 'function') {
    showModal(content);
  } else {
    alert("System Error: Modal not available. \n" + content.replace(/<[^>]*>/g, ' '));
  }
}

// Expose
window.renderPublicCalendar = renderPublicCalendar;
window.changePublicCalendarMonth = changePublicCalendarMonth;
window.openPublicCalendarModal = openPublicCalendarModal;