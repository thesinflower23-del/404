/* ============================================
   BestBuddies Pet Grooming - Booking Flow
   ============================================ */

let bookingData = {
  petType: null,
  packageId: null,
  groomerId: null,
  groomerName: '',
  date: null,
  time: null,
  ownerName: '',
  contactNumber: '',
  ownerAddress: '',
  petName: '',
  petBreed: '',
  petAge: '',
  petWeight: '',
  medicalNotes: '',
  vaccinationNotes: '',
  vaccinationProofImage: null, // Base64 image of vaccination proof
  addOns: [],
  bookingNotes: '',
  saveProfile: true,
  singleServices: [],
  referenceCut: null
};

let currentStep = 1;
const totalSteps = 5;
const SINGLE_SERVICE_PACKAGE_ID = 'single-service';
const SINGLE_SERVICE_OPTIONS = window.SINGLE_SERVICE_PRICING || {};

// Prevent duplicate submissions with cooldown
let isSubmittingBooking = false;
let lastSubmitTime = 0;
const SUBMIT_COOLDOWN_MS = 3000; // 3 second cooldown

// Prevent rapid navigation clicks
let lastNavigationTime = 0;
const NAVIGATION_COOLDOWN_MS = 500; // 0.5 second cooldown for navigation

// Debounce updateSummary to prevent flickering during typing
let updateSummaryTimeout = null;
function debouncedUpdateSummary(delay = 300) {
  clearTimeout(updateSummaryTimeout);
  updateSummaryTimeout = setTimeout(() => {
    updateSummary();
  }, delay);
}

// Check if this is a reschedule operation
let isRescheduleMode = false;
let rescheduleData = null;

// Populate form fields with reschedule data
function populateRescheduleForm() {
  if (!isRescheduleMode || !rescheduleData) return;
  
  console.log('Populating form with reschedule data:', rescheduleData);
  
  // Set pet type first (needed for package filtering)
  if (rescheduleData.petType && typeof selectPetType === 'function') {
    selectPetType(rescheduleData.petType);
  }
  
  // Select package
  if (rescheduleData.packageId && typeof selectPackage === 'function') {
    selectPackage(rescheduleData.packageId);
  }
  
  // Populate customer information
  const ownerNameInput = document.getElementById('ownerName');
  if (ownerNameInput && rescheduleData.customerName) {
    ownerNameInput.value = rescheduleData.customerName;
  }
  
  const contactNumberInput = document.getElementById('contactNumber');
  if (contactNumberInput && rescheduleData.customerPhone) {
    contactNumberInput.value = rescheduleData.customerPhone;
  }
  
  const ownerAddressInput = document.getElementById('ownerAddress');
  if (ownerAddressInput && rescheduleData.customerAddress) {
    ownerAddressInput.value = rescheduleData.customerAddress;
  }
  
  // Populate pet information
  const petNameInput = document.getElementById('petName');
  if (petNameInput && rescheduleData.petName) {
    petNameInput.value = rescheduleData.petName;
  }
  
  const petBreedInput = document.getElementById('petBreed');
  if (petBreedInput && rescheduleData.petBreed) {
    petBreedInput.value = rescheduleData.petBreed;
  }
  
  const petAgeSelect = document.getElementById('petAge');
  if (petAgeSelect && rescheduleData.petAge) {
    petAgeSelect.value = rescheduleData.petAge;
  }
  
  // Populate pet weight (radio buttons)
  if (rescheduleData.petWeight) {
    const weightRadio = document.querySelector(`input[name="petWeight"][value="${rescheduleData.petWeight}"]`);
    if (weightRadio) {
      weightRadio.checked = true;
    }
  }
  
  // Populate medical notes
  const medicalNotesInput = document.getElementById('medicalNotes');
  if (medicalNotesInput && rescheduleData.medicalNotes) {
    medicalNotesInput.value = rescheduleData.medicalNotes;
  }
  
  const bookingNotesInput = document.getElementById('bookingNotes');
  if (bookingNotesInput && rescheduleData.specialInstructions) {
    bookingNotesInput.value = rescheduleData.specialInstructions;
  }
  
  // Explicitly update bookingData with all reschedule information
  bookingData.ownerName = rescheduleData.customerName || '';
  bookingData.contactNumber = rescheduleData.customerPhone || '';
  bookingData.ownerAddress = rescheduleData.customerAddress || '';
  bookingData.petName = rescheduleData.petName || '';
  bookingData.petBreed = rescheduleData.petBreed || '';
  bookingData.petAge = rescheduleData.petAge || '';
  bookingData.petWeight = rescheduleData.petWeight || '';
  bookingData.medicalNotes = rescheduleData.medicalNotes || '';
  bookingData.bookingNotes = rescheduleData.specialInstructions || '';
  
  console.log('Form populated with reschedule data');
  
  // Sync form data to bookingData
  if (typeof syncFormToBookingData === 'function') {
    syncFormToBookingData();
  }
  
  // Update the booking summary with reschedule data
  console.log('Updating summary with bookingData:', bookingData);
  if (typeof updateSummary === 'function') {
    updateSummary();
  }
  
  // Enable next button
  if (typeof enableNextButton === 'function') {
    enableNextButton();
  }
  
  // Force update the UI elements
  setTimeout(() => {
    if (typeof updateSummary === 'function') {
      updateSummary();
    }
  }, 200);
}

// Initialize reschedule mode if coming from admin
function initializeRescheduleMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  
  if (mode === 'reschedule') {
    const storedData = sessionStorage.getItem('rescheduleData');
    if (storedData) {
      try {
        rescheduleData = JSON.parse(storedData);
        isRescheduleMode = true;
        
        // Pre-fill booking data with existing information
        bookingData = {
          ...bookingData,
          ownerName: rescheduleData.customerName || '',
          contactNumber: rescheduleData.customerPhone || '',
          ownerAddress: rescheduleData.customerAddress || '',
          petName: rescheduleData.petName || '',
          petType: rescheduleData.petType || null,
          petBreed: rescheduleData.petBreed || '',
          petAge: rescheduleData.petAge || '',
          petWeight: rescheduleData.petWeight || '',
          packageId: rescheduleData.packageId || null,
          addOns: rescheduleData.addOns || [],
          medicalNotes: rescheduleData.medicalNotes || '',
          bookingNotes: rescheduleData.specialInstructions || '',
          groomerId: rescheduleData.currentGroomerId || null
        };
        
        // Set to jump to Schedule step (step 4) - reschedule only changes date/time
        currentStep = 4;
        
        // Update page title and header
        document.title = 'Reschedule Booking - BestBuddies Pet Grooming';
        const headerTitle = document.querySelector('.hero h1');
        if (headerTitle) {
          headerTitle.textContent = `Reschedule ${rescheduleData.petName}'s Appointment`;
        }
        
        const headerSubtitle = document.querySelector('.hero p');
        if (headerSubtitle) {
          headerSubtitle.textContent = `Update the date, time, or service for ${rescheduleData.petName}'s grooming appointment.`;
        }
        
        // Pre-fill form fields with reschedule data
        // This will be called after initBooking completes
        
        console.log('Reschedule mode initialized:', rescheduleData);
      } catch (e) {
        console.error('Failed to parse reschedule data:', e);
        isRescheduleMode = false;
      }
    }
  }
}

function normalizeWeightValue(value = '') {
  return value.replace(/-/g, 'â€“');
}

// Convert age string to months for validation
function getAgeInMonths(ageStr) {
  if (!ageStr) return 999; // Default to high number if not set
  const lower = ageStr.toLowerCase();
  if (lower.includes('month')) {
    const match = lower.match(/\d+/);
    return match ? parseInt(match[0], 10) : 999;
  }
  if (lower.includes('year')) {
    const match = lower.match(/\d+/);
    return match ? parseInt(match[0], 10) * 12 : 999;
  }
  if (lower.includes('less')) return 0; // "Less than 1 month"
  return 999;
}

// Filter age options based on package selection
function updateAgeDropdownOptions() {
  const petAgeSelect = document.getElementById('petAge');
  if (!petAgeSelect) return;

  const currentValue = petAgeSelect.value;
  const allOptions = [
    { value: '', text: 'Select age...' },
    { value: 'Less than 1 month', text: 'Less than 1 month' },
    { value: '1 month', text: '1 month' },
    { value: '2 months', text: '2 months' },
    { value: '3 months', text: '3 months' },
    { value: '4 months', text: '4 months' },
    { value: '5 months', text: '5 months' },
    { value: '6 months', text: '6 months' },
    { value: '7 months', text: '7 months' },
    { value: '8 months', text: '8 months' },
    { value: '9 months', text: '9 months' },
    { value: '10 months', text: '10 months' },
    { value: '11 months', text: '11 months' },
    { value: '1 year', text: '1 year' },
    { value: '2 years', text: '2 years' },
    { value: '3 years', text: '3 years' },
    { value: '4 years', text: '4 years' },
    { value: '5 years', text: '5 years' },
    { value: '6 years', text: '6 years' },
    { value: '7 years', text: '7 years' },
    { value: '8 years', text: '8 years' },
    { value: '9 years', text: '9 years' },
    { value: '10 years', text: '10 years' },
    { value: '11 years', text: '11 years' },
    { value: '12 years', text: '12 years' },
    { value: '13 years', text: '13 years' },
    { value: '14 years', text: '14 years' },
    { value: '15 years', text: '15 years' },
    { value: '16+ years', text: '16+ years' }
  ];

  // Age filtering rules:
  // - Single service: 1 month and above (exclude "Less than 1 month" - too young)
  // - Other packages: 6 months and above
  let visibleOptions = allOptions;
  console.log('[updateAgeDropdownOptions] Current packageId:', bookingData.packageId);
  console.log('[updateAgeDropdownOptions] SINGLE_SERVICE_PACKAGE_ID:', SINGLE_SERVICE_PACKAGE_ID);
  
  if (bookingData.packageId === SINGLE_SERVICE_PACKAGE_ID) {
    console.log('[updateAgeDropdownOptions] Filtering ages for single service - showing 1+ months only');
    visibleOptions = allOptions.filter(opt => {
      if (!opt.value) return true; // Keep "Select age..." option
      // Exclude "Less than 1 month" for single service (too young)
      if (opt.value === 'Less than 1 month') {
        console.log(`[updateAgeDropdownOptions] Excluding "Less than 1 month" for single service`);
        return false;
      }
      return true;
    });
  } else if (bookingData.packageId && bookingData.packageId !== SINGLE_SERVICE_PACKAGE_ID) {
    console.log('[updateAgeDropdownOptions] Filtering ages for full package - showing 6+ months only');
    visibleOptions = allOptions.filter(opt => {
      if (!opt.value) return true; // Keep "Select age..." option
      const ageInMonths = getAgeInMonths(opt.value);
      console.log(`[updateAgeDropdownOptions] Age "${opt.value}" = ${ageInMonths} months, include: ${ageInMonths >= 6}`);
      return ageInMonths >= 6;
    });
  } else {
    console.log('[updateAgeDropdownOptions] Showing all ages (no package selected)');
  }

  // Rebuild the select options
  petAgeSelect.innerHTML = '';
  visibleOptions.forEach(opt => {
    const optElement = document.createElement('option');
    optElement.value = opt.value;
    optElement.textContent = opt.text;
    petAgeSelect.appendChild(optElement);
  });

  // Restore previous selection if it's still valid
  if (currentValue && visibleOptions.some(opt => opt.value === currentValue)) {
    petAgeSelect.value = currentValue;
  } else {
    petAgeSelect.value = '';
  }
}

// Initialize booking page
async function initBooking() {
  console.log('[initBooking] Starting booking page initialization...');
  
  // ============================================
  // 🧹 CLEAR OLD BOOKING DATA
  // Clear lastBooking from sessionStorage when starting a new booking
  // This prevents old booking data from showing on booking-success page
  // ============================================
  sessionStorage.removeItem('lastBooking');
  console.log('[initBooking] Cleared old lastBooking from sessionStorage');
  
  // Show loading screen for booking initialization
  showBookingFormLoader('#bookingPage');
  
  // Initialize reschedule mode first
  initializeRescheduleMode();
  
  try {
    // ensure packages resolved before any computeBookingCost / updateSummary calls
    if (typeof ensurePackagesLoaded === 'function') {
      await ensurePackagesLoaded();
      console.log('[initBooking] Packages loaded successfully');
    } else if (typeof getPackages === 'function') {
      // fallback: await getPackages if it returns a Promise
      const pk = getPackages();
      if (pk && typeof pk.then === 'function') await pk;
      console.log('[initBooking] Packages loaded via getPackages fallback');
    }

    // Check for package pre-selection from URL (from index.html Book Now buttons)
    const urlParams = new URLSearchParams(window.location.search);
    const preSelectedPackage = urlParams.get('package');
    if (preSelectedPackage) {
      console.log('[initBooking] Pre-selecting package from URL:', preSelectedPackage);
      bookingData.packageId = preSelectedPackage;
      
      // For single-service package, we need to ensure the configurator shows
      // even if pet type is not selected yet (single-service works for both dogs and cats)
      if (preSelectedPackage === SINGLE_SERVICE_PACKAGE_ID) {
        console.log('[initBooking] Single-service package detected from URL');
      }
    }

    // Restore booking data and step from sessionStorage if returning from auth
    const savedBookingData = sessionStorage.getItem('bookingData');
    const savedStep = sessionStorage.getItem('bookingStep');

    // NEW: check for edit/cancel markers placed by customer dashboard
    const editingBookingId = sessionStorage.getItem('editingBookingId');
    const bookingCancelId = sessionStorage.getItem('bookingCancelId');

    let targetStep = 1; // Default to step 1

    if (savedBookingData) {
      try {
        const restored = JSON.parse(savedBookingData);
        // Merge restored data with current bookingData
        bookingData = { ...bookingData, ...restored };
        sessionStorage.removeItem('bookingData');
      } catch (e) {
        console.error('Failed to restore booking data:', e);
      }
    }

    // If an edit marker exists, prefer that and jump to review step
    if (editingBookingId) {
      bookingData.editingBookingId = editingBookingId;
      targetStep = 5;
      // preserve merged bookingData for restore and remove marker
      sessionStorage.removeItem('editingBookingId');
    }

    // If a cancel marker exists, set cancel id and jump to review step
    if (bookingCancelId) {
      bookingData.bookingCancelId = bookingCancelId;
      targetStep = 5;
      sessionStorage.removeItem('bookingCancelId');
    }
    
    // If in reschedule mode, jump to Schedule step (step 4) - only change date/time
    if (isRescheduleMode) {
      targetStep = 4;
    }

    // Restore form fields from bookingData so the UI is prefilled
    try {
      restoreBookingFormData(bookingData);
    } catch (e) {
      console.warn('restoreBookingFormData failed', e);
    }

    if (savedStep) {
      try {
        // savedStep overrides default unless edit/cancel already set targetStep
        if (!editingBookingId && !bookingCancelId) {
          targetStep = parseInt(savedStep, 10);
        }
        sessionStorage.removeItem('bookingStep');
      } catch (e) {
        console.error('Failed to restore booking step:', e);
      }
    }

    // Get current user (don't fail if this errors - allow browsing without login)
    let user = null;
    try {
      if (typeof getCurrentUser === 'function') {
        user = await getCurrentUser();
      }
    } catch (error) {
      console.warn('Could not get current user (user may not be logged in):', error);
      // Continue without user - allow browsing
    }

    // Pre-fill owner details with account info if logged in 
    // BUT NOT when editing existing booking or in reschedule mode
    const ownerNameInput = document.getElementById('ownerName');
    const contactNumberInput = document.getElementById('contactNumber');
    const ownerAddressInput = document.getElementById('ownerAddress');

    // Check if we're editing an existing booking BEFORE overwriting with user data
    const hasEditingData = editingBookingId || bookingData.editingBookingId;

    if (user && !isRescheduleMode && !hasEditingData) {
      if (ownerNameInput && !bookingData.ownerName) {
        ownerNameInput.value = user.name || '';
        bookingData.ownerName = user.name || '';
      }

      // Auto-fill phone number if available in profile
      if (contactNumberInput && user.phone && !bookingData.contactNumber) {
        contactNumberInput.value = user.phone;
        bookingData.contactNumber = user.phone;
      }

    } else if (hasEditingData) {
      // When editing, use the booking data that was restored from sessionStorage
      console.log('[initBooking] Editing mode - using existing booking data, not user profile');
    }

    // Initialize to target step (restored or default step 1)
    showStep(targetStep);

    // Setup calendar time picker
    setupCalendarTimePicker();

    // Setup event listeners
    setupBookingListeners();

    // Attempt to load saved profile silently if logged in
    // BUT NOT when editing an existing booking - we want to keep the booking's data
    const isEditingExistingBooking = bookingData.editingBookingId || sessionStorage.getItem('editingBookingId');
    
    if (user) {
      try {
        const warningInfo = await getCustomerWarningInfo(user.id);
        if (warningInfo?.isBanned) {
          await customAlert.error('Account Banned', 'Your account is temporarily banned. Please check your customer dashboard for instructions on how to lift the ban.');
          redirect('customer-dashboard.html');
          return;
        }
        
        // Only load profile if NOT editing an existing booking
        if (!isEditingExistingBooking && !isRescheduleMode) {
          const savedProfile = await getCustomerProfile(user.id);
          if (savedProfile) {
            applyProfileToForm(savedProfile);
          }
        } else {
          console.log('[initBooking] Skipping profile load - editing existing booking');
        }

        // Check if user clicked "Use Saved Details" from dashboard
        // But NOT when editing an existing booking
        const autoLoad = sessionStorage.getItem('autoLoadProfile');
        if (autoLoad === 'true' && !isEditingExistingBooking) {
          sessionStorage.removeItem('autoLoadProfile'); // Clear flag
          // Trigger auto profile load which will jump to step 3
          await handleAutoProfileLoad();
        } else if (autoLoad === 'true') {
          sessionStorage.removeItem('autoLoadProfile'); // Clear flag anyway
        }
      } catch (error) {
        console.warn('Could not load user profile:', error);
        // Continue without profile
      }
    }

    // Load packages (after listeners are set up)
    loadPackages();
    
    // Apply pre-selected package from URL if any
    if (preSelectedPackage && bookingData.packageId === preSelectedPackage) {
      setTimeout(() => {
        // Select the package card in UI
        document.querySelectorAll('.package-card').forEach(card => {
          if (card.dataset.packageId === preSelectedPackage) {
            card.classList.add('selected');
            console.log('[initBooking] Pre-selected package card:', preSelectedPackage);
          } else {
            card.classList.remove('selected');
          }
        });
        updateSummary();
        
        // For single-service, also render the configurator after package card is selected
        if (preSelectedPackage === SINGLE_SERVICE_PACKAGE_ID) {
          renderSingleServiceConfigurator();
        }
      }, 100); // Small delay to ensure DOM is ready
    }
    
    renderSingleServiceConfigurator();
    updateReferenceCutsVisibility();
    
    // Enable/disable next button based on current step
    enableNextButton();
    
    // Populate reschedule form if in reschedule mode
    if (isRescheduleMode) {
      setTimeout(() => {
        populateRescheduleForm();
      }, 100); // Small delay to ensure DOM is ready
    }
  } catch (error) {
    console.error('Error initializing booking:', error);
    // Don't show alert for permission errors - user might not be logged in yet
    if (error.message && error.message.includes('Permission denied')) {
      console.warn('Permission denied - user may need to update Firebase security rules.');
      // Continue anyway - might work with localStorage fallback
    } else {
      customAlert.error('Loading Error', 'Error loading booking page. Please refresh and try again.');
    }
  } finally {
    // Always hide the loading screen when initialization is complete
    hideBookingFormLoader('#bookingPage');
  }
}

// Carousel prev/next wiring for cuts-carousel
(function setupCutsCarousel() {
  const wrapper = document.querySelector('.cuts-carousel-wrapper');
  if (!wrapper) return;
  const carousel = wrapper.querySelector('.cuts-carousel');
  const prev = wrapper.querySelector('.cuts-prev');
  const next = wrapper.querySelector('.cuts-next');
  if (!carousel) return;

  function scrollByCard(direction) {
    const card = carousel.querySelector('div');
    if (!card) return;
    const cardStyle = window.getComputedStyle(card);
    const cardWidth = card.getBoundingClientRect().width + parseInt(cardStyle.marginRight || 8);
    const amount = Math.round(cardWidth) * direction;
    carousel.scrollBy({ left: amount, behavior: 'smooth' });
  }

  prev && prev.addEventListener('click', function (e) {
    e.preventDefault();
    scrollByCard(-1);
  });
  next && next.addEventListener('click', function (e) {
    e.preventDefault();
    scrollByCard(1);
  });

  // Allow keyboard activation
  [prev, next].forEach(btn => {
    if (!btn) return;
    btn.setAttribute('tabindex', '0');
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
})();

// Setup event listeners
function setupBookingListeners() {
  // Check if already setup to avoid duplicates
  if (window.bookingListenersSetup) {
    console.log('[setupBookingListeners] Already setup, skipping');
    return;
  }
  
  console.log('[setupBookingListeners] Setting up legacy event listeners');
  
  // Pet type selection
  const petCards = document.querySelectorAll('.pet-type-card');
  console.log('[setupBookingListeners] Found', petCards.length, 'pet type cards');
  petCards.forEach(card => {
    console.log('[setupBookingListeners] Setting up listener for pet card:', card.dataset.petType);
    card.addEventListener('click', function () {
      const petType = this.dataset.petType;
      console.log('[PetTypeCard] Clicked pet type:', petType);
      selectPetType(petType);
      saveBookingDataToSession(); // Auto-save
    });
  });

  // Package selection
  const packageCards = document.querySelectorAll('.package-card');
  console.log('[setupBookingListeners] Found', packageCards.length, 'package cards');
  packageCards.forEach(card => {
    console.log('[setupBookingListeners] Setting up listener for package card:', card.dataset.packageId);
    card.addEventListener('click', function () {
      const packageId = this.dataset.packageId;
      console.log('[PackageCard] Clicked package card with ID:', packageId);
      selectPackage(packageId);
      saveBookingDataToSession(); // Auto-save
    });
  });

  // Form inputs - use centralized event system
  setupFormInputsWithStateSync();

  // Save Profile Toggle - show only for logged in users
  const saveProfileSection = document.getElementById('saveProfileSection');
  const saveProfileToggle = document.getElementById('saveProfileToggle');
  
  // Check if user is logged in and show/hide save profile section
  (async () => {
    try {
      const user = typeof getCurrentUser === 'function' ? await getCurrentUser() : null;
      if (user && saveProfileSection) {
        saveProfileSection.style.display = 'block';
        console.log('[SaveProfile] User logged in, showing save profile toggle');
      } else if (saveProfileSection) {
        saveProfileSection.style.display = 'none';
        console.log('[SaveProfile] User not logged in, hiding save profile toggle');
      }
    } catch (e) {
      console.warn('[SaveProfile] Could not check user status:', e);
    }
  })();
  
  // Setup save profile toggle listener
  if (saveProfileToggle) {
    bookingData.saveProfile = saveProfileToggle.checked;
    saveProfileToggle.addEventListener('change', () => {
      bookingData.saveProfile = saveProfileToggle.checked;
      console.log('[SaveProfile] Toggle changed:', bookingData.saveProfile);
      saveBookingDataToSession();
    });
  } else {
    // Default to true if toggle not found
    bookingData.saveProfile = true;
  }

  const loadProfileBtn = document.getElementById('loadProfileBtn');
  if (loadProfileBtn) {
    loadProfileBtn.addEventListener('click', handleProfileLoad);
  }
  const clearProfileBtn = document.getElementById('clearProfileBtn');
  if (clearProfileBtn) {
    clearProfileBtn.addEventListener('click', clearProfileForm);
  }

  // Navigation buttons
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', nextStep);
  }

  const prevBtn = document.getElementById('prevBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', prevStep);
  }

  const submitBtn = document.getElementById('submitBooking');
  if (submitBtn) {
    submitBtn.addEventListener('click', function (e) {
      submitBooking(e);
    });
  }
  
  // Mark as setup to avoid duplicates
  window.bookingListenersSetup = true;
  console.log('[setupBookingListeners] Legacy event listeners setup complete');
  
  // Add global function for debugging
  window.debugSubmitButton = function() {
    console.log('=== MANUAL SUBMIT BUTTON DEBUG ===');
    enableSubmitButton();
  };
  
  // Add global function for checking submit button state
  window.checkSubmitButton = function() {
    const submitBtn = document.getElementById('submitBooking');
    console.log('=== SUBMIT BUTTON STATE ===', {
      found: !!submitBtn,
      display: submitBtn?.style.display,
      disabled: submitBtn?.disabled,
      textContent: submitBtn?.textContent,
      currentStep: currentStep,
      totalSteps: totalSteps,
      isVisible: submitBtn?.style.display !== 'none'
    });
  };
}

/**
 * Setup form inputs with centralized event system
 * 
 * Replaces scattered bindInputToData() calls with unified event handling.
 * Ensures validation happens before state update.
 * Automatically syncs with bookingData and triggers UI updates.
 * 
 * Requirements: 2.3, 2.4, 5.1
 */
function setupFormInputsWithStateSync() {
  // Text inputs
  const textInputs = [
    'ownerName',
    'ownerAddress',
    'petName',
    'petBreed'
  ];
  
  textInputs.forEach(fieldId => {
    const input = document.getElementById(fieldId);
    if (input) {
      input.addEventListener('input', function () {
        // Update bookingData
        bookingData[fieldId] = this.value.trim();
        
        // Trigger UI updates (debounced to prevent flickering)
        debouncedUpdateSummary();
        enableNextButton();
        
        // Auto-save to session
        saveBookingDataToSession();
      });
    }
  });
  
  // Contact number with validation
  const contactInput = document.getElementById('contactNumber');
  if (contactInput) {
    contactInput.addEventListener('input', function () {
      let value = this.value.replace(/\s/g, '');
      
      // Remove +63 and check if it's 11 digits
      if (value.startsWith('+63')) {
        value = '0' + value.substring(3);
      }
      
      // VALIDATION BEFORE STATE UPDATE
      // Validate 11 digits
      if (value.length === 11 && /^0\d{10}$/.test(value)) {
        // Valid phone - update state
        bookingData.contactNumber = value;
        this.setCustomValidity('');
        
        // Trigger UI updates (debounced to prevent flickering)
        debouncedUpdateSummary();
        enableNextButton();
        
        // Auto-save to session
        saveBookingDataToSession();
      } else if (value.length > 0) {
        // Invalid phone - don't update state, show error
        this.setCustomValidity('Please enter a valid 11-digit phone number (e.g., 09662233605)');
        // Don't update bookingData or trigger updates for invalid input
      } else {
        // Empty input - clear validation
        this.setCustomValidity('');
        bookingData.contactNumber = '';
        
        // Trigger UI updates (debounced to prevent flickering)
        debouncedUpdateSummary();
        enableNextButton();
        
        // Auto-save to session
        saveBookingDataToSession();
      }
    });
  }
  
  // Pet age dropdown
  const petAgeSelect = document.getElementById('petAge');
  if (petAgeSelect) {
    petAgeSelect.addEventListener('change', function () {
      // Update bookingData
      bookingData.petAge = this.value;
      
      // Trigger UI updates (immediate for dropdown selections)
      updateSummary();
      enableNextButton();
      
      // Auto-save to session
      saveBookingDataToSession();
    });
  }
  
  // Weight selection (radio buttons)
  document.querySelectorAll('input[name="petWeight"]').forEach(radio => {
    radio.addEventListener('change', function () {
      if (this.checked) {
        // Update bookingData
        bookingData.petWeight = this.value;
        console.log('[Weight] Selected:', this.value);
        
        // Trigger UI updates
        updateSummary();
        enableNextButton();
        
        // Re-render single service configurator to update prices based on weight
        if (isSingleServicePackage()) {
          renderSingleServiceConfigurator();
        }
        updateSingleServicePriceLabels();
        
        // Auto-save to session
        saveBookingDataToSession();
      }
    });
  });
  
  // Vaccination status with mutual exclusion
  const vaccAntiRabies = document.getElementById('vaccAntiRabies');
  const vaccAntiParvo = document.getElementById('vaccAntiParvo');
  const vaccNotVaccinated = document.getElementById('vaccNotVaccinated');
  
  // Setup mutual exclusion for vaccination checkboxes
  if (vaccAntiRabies) {
    vaccAntiRabies.addEventListener('change', function() {
      if (this.checked && vaccNotVaccinated) {
        vaccNotVaccinated.checked = false;
        console.log('[Vaccination] Anti-Rabies selected, unchecking Not Vaccinated');
      }
      updateSummary();
      saveBookingDataToSession();
      enableSubmitButton();
    });
  }
  
  if (vaccAntiParvo) {
    vaccAntiParvo.addEventListener('change', function() {
      if (this.checked && vaccNotVaccinated) {
        vaccNotVaccinated.checked = false;
        console.log('[Vaccination] Anti-Parvo selected, unchecking Not Vaccinated');
      }
      updateSummary();
      saveBookingDataToSession();
      enableSubmitButton();
    });
  }
  
  if (vaccNotVaccinated) {
    vaccNotVaccinated.addEventListener('change', function() {
      if (this.checked) {
        if (vaccAntiRabies) vaccAntiRabies.checked = false;
        if (vaccAntiParvo) vaccAntiParvo.checked = false;
        console.log('[Vaccination] Not Vaccinated selected, unchecking all vaccines');
      }
      updateSummary();
      saveBookingDataToSession();
      enableSubmitButton();
    });
  }
  
  // Legacy vaccination status radio buttons (if present)
  document.querySelectorAll('input[name="vaccinationStatus"]').forEach(radio => {
    radio.addEventListener('change', function () {
      if (this.checked) {
        // Update bookingData
        bookingData.vaccinationStatus = this.value;
        
        // Show/hide vaccination details
        const detailsDiv = document.getElementById('vaccinationDetails');
        if (detailsDiv) {
          detailsDiv.style.display = this.value === 'vaccinated' ? 'block' : 'none';
        }
        
        // Trigger UI updates
        updateSummary();
        
        // Auto-save to session
        saveBookingDataToSession();
      }
    });
  });
  
  // Text areas
  const textAreas = [
    'medicalNotes',
    'vaccinationNotes',
    'bookingNotes'
  ];
  
  textAreas.forEach(fieldId => {
    const textarea = document.getElementById(fieldId);
    if (textarea) {
      textarea.addEventListener('input', function () {
        // Update bookingData
        bookingData[fieldId] = this.value.trim();
        
        // Trigger UI updates (debounced to prevent flickering)
        debouncedUpdateSummary();
        
        // Auto-save to session
        saveBookingDataToSession();
      });
    }
  });
}

async function handleProfileLoad() {
  // Show loading screen
  if (typeof showLoadingOverlay === 'function') {
    showLoadingOverlay('Loading your profile...');
  }

  try {
    // Get user with timeout
    const userTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('User fetch timeout')), 5000);
    });
    
    const user = await Promise.race([
      getCurrentUser(),
      userTimeout
    ]).catch(error => {
      console.warn('User fetch failed:', error.message);
      // Try localStorage fallback
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    });
    
    if (!user) {
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      customAlert.warning('Not Logged In', 'Please log in first to load your profile.');
      return;
    }

    // Get bookings with timeout
    const bookingsTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Bookings fetch timeout')), 5000);
    });
    
    let allBookings = [];
    try {
      allBookings = await Promise.race([
        getBookings(),
        bookingsTimeout
      ]);
    } catch (bookingsError) {
      console.warn('Bookings fetch failed:', bookingsError.message);
      // Try localStorage fallback
      const cachedBookings = localStorage.getItem('bookings');
      allBookings = cachedBookings ? JSON.parse(cachedBookings) : [];
    }
    
    const userBookings = Array.isArray(allBookings) ? allBookings.filter(b => b.userId === user.id || b.email === user.email) : [];

    if (userBookings.length === 0) {
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      customAlert.show('No Profile Found', 'No saved profile yet. Complete the form once and tick "Save details" to reuse.', 'warning');
      return;
    }

    // Get the most recent booking
    const lastBooking = userBookings[userBookings.length - 1];

    // Create profile object from last booking
    const profile = {
      ownerName: lastBooking.ownerName,
      contactNumber: lastBooking.contactNumber,
      address: lastBooking.ownerAddress,
      petName: lastBooking.petName,
      breed: lastBooking.petBreed,
      age: lastBooking.petAge,
      weight: lastBooking.petWeight,
      medical: lastBooking.medicalNotes,
      vaccinations: lastBooking.vaccinationNotes,
      // 🔧 ALL SERVICES PROFILE FIX: Include ALL services from last booking
      singleServices: lastBooking.singleServices || [],
      addOns: lastBooking.addOns || [],
      referenceCut: lastBooking.referenceCut || null,
      packageId: lastBooking.packageId || null,
      petType: lastBooking.petType || null
      // Note: Now copying ALL services from previous bookings for complete profile restoration
    };

    // Auto-fill pet type and package from last booking FIRST (before applyProfileToForm)
    bookingData.petType = lastBooking.petType;
    bookingData.packageId = lastBooking.packageId;
    
    // Load profile details to current step forms
    applyProfileToForm(profile);

    // Update UI to reflect selection (if elements exist on current step)
    document.querySelectorAll('.pet-type-card').forEach(card => {
      if (card.dataset.petType === lastBooking.petType) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    // Load packages if on package selection step
    if (currentStep === 2) {
      loadPackages();
    }
    
    document.querySelectorAll('.package-card').forEach(card => {
      if (card.dataset.packageId === lastBooking.packageId) {
        card.classList.add('selected');
        console.log('[Profile Load] Selected package card:', lastBooking.packageId);
      } else {
        card.classList.remove('selected');
      }
    });

    // Auto-accept policy since user already agreed before
    const policyCheckbox = document.getElementById('agreeToPolicy');
    if (policyCheckbox) {
      policyCheckbox.checked = true;
      policyCheckbox.disabled = false; // Enable it in case it was disabled
      console.log('[Profile Load] Policy auto-accepted');
    }
    
    // Mark policy as agreed in bookingData
    bookingData.policyAgreed = true;
    
    // 🔧 SMART STEP JUMPING: Jump to appropriate step based on package type
    if (lastBooking.packageId === SINGLE_SERVICE_PACKAGE_ID) {
      // For single service: jump to step 4 (Schedule) to show 30-minute intervals
      console.log('[Profile Load] Single service detected - jumping to step 4 (Schedule)');
      console.log('[Profile Load] bookingData.packageId BEFORE showStep:', bookingData.packageId);
      
      // CRITICAL: Ensure packageId is set to single-service before calendar setup
      bookingData.packageId = SINGLE_SERVICE_PACKAGE_ID;
      console.log('[Profile Load] bookingData.packageId AFTER force set:', bookingData.packageId);
      
      showStep(4);
      // Setup single service calendar with 30-minute intervals
      setTimeout(() => {
        // Double-check packageId is still correct
        console.log('[Profile Load] Setting up single service calendar, packageId:', bookingData.packageId);
        console.log('[Profile Load] isSingleServicePackage():', isSingleServicePackage());
        
        // Force set again in case something overwrote it
        bookingData.packageId = SINGLE_SERVICE_PACKAGE_ID;
        setupCalendarTimePicker();
      }, 200);
    } else if (lastBooking.packageId && lastBooking.packageId !== SINGLE_SERVICE_PACKAGE_ID) {
      // For full packages: jump to step 4 (Schedule) to show regular slots
      console.log('[Profile Load] Full package detected - jumping to step 4 (Schedule)');
      console.log('[Profile Load] bookingData.packageId BEFORE showStep:', bookingData.packageId);
      
      // CRITICAL: Ensure packageId is set to the full package before calendar setup
      bookingData.packageId = lastBooking.packageId;
      console.log('[Profile Load] bookingData.packageId AFTER force set:', bookingData.packageId);
      
      showStep(4);
      // Setup regular calendar
      setTimeout(() => {
        // Double-check packageId is still correct
        console.log('[Profile Load] Setting up full package calendar, packageId:', bookingData.packageId);
        console.log('[Profile Load] isSingleServicePackage():', isSingleServicePackage());
        
        // Force set again in case something overwrote it
        bookingData.packageId = lastBooking.packageId;
        // Force clear the calendar container first to ensure fresh render
        const calendarContainer = document.getElementById('calendarTimePicker');
        if (calendarContainer) {
          calendarContainer.innerHTML = '';
        }
        setupCalendarTimePicker();
      }, 100);
    } else {
      // No package selected: stay on current step
      console.log('[Profile Load] No package detected - staying on current step');
      updateSummary();
      enableSubmitButton();
    }

    // Hide loading screen
    if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
    
    customAlert.success('Profile Loaded!', 'Your saved details have been loaded successfully.');
    
  } catch (error) {
    console.error('Error loading profile:', error);
    if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
    customAlert.error('Load Failed', 'Could not load your profile. Please try again.');
  }
}

// Auto Profile Load - for "Use Saved Details" from dashboard (includes step jumping)
async function handleAutoProfileLoad() {
  // Show loading screen
  if (typeof showLoadingOverlay === 'function') {
    showLoadingOverlay('Loading your profile...');
  }

  try {
    // Get user with timeout
    const userTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('User fetch timeout')), 5000);
    });
    
    const user = await Promise.race([
      getCurrentUser(),
      userTimeout
    ]).catch(error => {
      console.warn('Auto profile - User fetch failed:', error.message);
      // Try localStorage fallback
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    });
    
    if (!user) {
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      customAlert.warning('Not Logged In', 'Please log in first to load your profile.');
      return;
    }

    // Get bookings with timeout
    const bookingsTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Bookings fetch timeout')), 5000);
    });
    
    let allBookings = [];
    try {
      allBookings = await Promise.race([
        getBookings(),
        bookingsTimeout
      ]);
    } catch (bookingsError) {
      console.warn('Auto profile - Bookings fetch failed:', bookingsError.message);
      // Try localStorage fallback
      const cachedBookings = localStorage.getItem('bookings');
      allBookings = cachedBookings ? JSON.parse(cachedBookings) : [];
    }
    
    const userBookings = Array.isArray(allBookings) ? allBookings.filter(b => b.userId === user.id || b.email === user.email) : [];

    if (userBookings.length === 0) {
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      customAlert.show('No Profile Found', 'No saved profile yet. Complete the form once and tick "Save details" to reuse.', 'warning');
      return;
    }

    // Get the most recent booking
    const lastBooking = userBookings[userBookings.length - 1];

    // Create profile object from last booking
    const profile = {
      ownerName: lastBooking.ownerName,
      contactNumber: lastBooking.contactNumber,
      address: lastBooking.ownerAddress,
      petName: lastBooking.petName,
      breed: lastBooking.petBreed,
      age: lastBooking.petAge,
      weight: lastBooking.petWeight,
      medical: lastBooking.medicalNotes,
      vaccinations: lastBooking.vaccinationNotes,
      // 🔧 ALL SERVICES PROFILE FIX: Include ALL services from last booking
      singleServices: lastBooking.singleServices || [],
      addOns: lastBooking.addOns || [],
      referenceCut: lastBooking.referenceCut || null,
      packageId: lastBooking.packageId || null,
      petType: lastBooking.petType || null
    };

    // Auto-fill pet type and package from last booking FIRST (before applyProfileToForm)
    bookingData.petType = lastBooking.petType;
    bookingData.packageId = lastBooking.packageId;
    
    // Load profile details
    applyProfileToForm(profile);

    // Update UI to reflect selection
    document.querySelectorAll('.pet-type-card').forEach(card => {
      if (card.dataset.petType === lastBooking.petType) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    loadPackages();
    document.querySelectorAll('.package-card').forEach(card => {
      if (card.dataset.packageId === lastBooking.packageId) {
        card.classList.add('selected');
        console.log('[Auto Profile Load] Selected package card:', lastBooking.packageId);
      } else {
        card.classList.remove('selected');
      }
    });

    // Auto-accept policy since user already agreed before
    const policyCheckbox = document.getElementById('agreeToPolicy');
    if (policyCheckbox) {
      policyCheckbox.checked = true;
      policyCheckbox.disabled = false; // Enable it in case it was disabled
      console.log('[Auto Profile Load] Policy auto-accepted');
    }
    
    // Mark policy as agreed in bookingData
    bookingData.policyAgreed = true;
    
    // 🔧 SMART STEP JUMPING: Jump to appropriate step based on package type
    if (lastBooking.packageId === SINGLE_SERVICE_PACKAGE_ID) {
      // For single service: jump to step 4 (Schedule) to show 30-minute intervals
      console.log('[Auto Profile Load] Single service detected - jumping to step 4 (Schedule)');
      console.log('[Auto Profile Load] bookingData.packageId BEFORE showStep:', bookingData.packageId);
      
      // CRITICAL: Ensure packageId is set to single-service before calendar setup
      bookingData.packageId = SINGLE_SERVICE_PACKAGE_ID;
      console.log('[Auto Profile Load] bookingData.packageId AFTER force set:', bookingData.packageId);
      
      showStep(4);
      // Setup single service calendar with 30-minute intervals
      setTimeout(() => {
        // Double-check packageId is still correct
        console.log('[Auto Profile Load] Setting up single service calendar, packageId:', bookingData.packageId);
        console.log('[Auto Profile Load] isSingleServicePackage():', isSingleServicePackage());
        
        // Force set again in case something overwrote it
        bookingData.packageId = SINGLE_SERVICE_PACKAGE_ID;
        setupCalendarTimePicker();
      }, 200);
    } else if (lastBooking.packageId && lastBooking.packageId !== SINGLE_SERVICE_PACKAGE_ID) {
      // For full packages: jump to step 4 (Schedule) to show regular slots
      console.log('[Auto Profile Load] Full package detected - jumping to step 4 (Schedule)');
      console.log('[Auto Profile Load] bookingData.packageId BEFORE showStep:', bookingData.packageId);
      
      // CRITICAL: Ensure packageId is set to the full package before calendar setup
      bookingData.packageId = lastBooking.packageId;
      console.log('[Auto Profile Load] bookingData.packageId AFTER force set:', bookingData.packageId);
      
      showStep(4);
      // Setup regular calendar
      setTimeout(() => {
        // Double-check packageId is still correct
        console.log('[Auto Profile Load] Setting up full package calendar, packageId:', bookingData.packageId);
        console.log('[Auto Profile Load] isSingleServicePackage():', isSingleServicePackage());
        
        // Force set again in case something overwrote it
        bookingData.packageId = lastBooking.packageId;
        setupCalendarTimePicker();
      }, 200);
    } else {
      // No package selected: jump to step 5 (Details) as fallback
      console.log('[Auto Profile Load] No package detected - jumping to step 5 (Details)');
      showStep(5);
    }

    updateSummary();

    // Hide loading screen with a small delay to ensure UI is ready
    setTimeout(() => {
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      customAlert.success('Profile Loaded!', 'Your saved details have been loaded. Please review and update your information as needed.');
    }, 500);
    
  } catch (error) {
    console.error('Error auto-loading profile:', error);
    if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
    customAlert.error('Load Failed', 'Could not load your profile. Please try again.');
  }
}

// Quick Rebook - same as handleProfileLoad but for mobile quick access
async function handleQuickRebook() {
  // Get user with timeout
  const userTimeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('User fetch timeout')), 5000);
  });
  
  const user = await Promise.race([
    getCurrentUser(),
    userTimeout
  ]).catch(error => {
    console.warn('Quick rebook - User fetch failed:', error.message);
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  });
  
  if (!user) {
    customAlert.warning('Not Logged In', 'Please log in first to book an appointment.');
    return;
  }

  // Get bookings with timeout
  const bookingsTimeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Bookings fetch timeout')), 5000);
  });
  
  let allBookings = [];
  try {
    allBookings = await Promise.race([
      getBookings(),
      bookingsTimeout
    ]);
  } catch (bookingsError) {
    console.warn('Quick rebook - Bookings fetch failed:', bookingsError.message);
    const cachedBookings = localStorage.getItem('bookings');
    allBookings = cachedBookings ? JSON.parse(cachedBookings) : [];
  }
  
  const userBookings = Array.isArray(allBookings) ? allBookings.filter(b => b.userId === user.id || b.email === user.email) : [];

  if (userBookings.length === 0) {
    customAlert.show('No Profile Found', 'No saved profile yet. Complete the form once and tick "Save details" to reuse.', 'warning');
    return;
  }

  // Get the most recent booking
  const lastBooking = userBookings[userBookings.length - 1];

  // Create profile object from last booking
  const profile = {
    ownerName: lastBooking.ownerName,
    contactNumber: lastBooking.contactNumber,
    address: lastBooking.ownerAddress,
    petName: lastBooking.petName,
    breed: lastBooking.petBreed,
    age: lastBooking.petAge,
    weight: lastBooking.petWeight,
    medical: lastBooking.medicalNotes,
    vaccinations: lastBooking.vaccinationNotes,
    // 🔧 ALL SERVICES PROFILE FIX: Include ALL services from last booking
    singleServices: lastBooking.singleServices || [],
    addOns: lastBooking.addOns || [],
    referenceCut: lastBooking.referenceCut || null,
    packageId: lastBooking.packageId || null,
    petType: lastBooking.petType || null
  };

  // Load profile details
  applyProfileToForm(profile);

  // Auto-fill pet type and package from last booking
  bookingData.petType = lastBooking.petType;
  bookingData.packageId = lastBooking.packageId;

  // Update UI to reflect selection
  document.querySelectorAll('.pet-type-card').forEach(card => {
    if (card.dataset.petType === lastBooking.petType) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  loadPackages();
  document.querySelectorAll('.package-card').forEach(card => {
    if (card.dataset.packageId === lastBooking.packageId) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // Auto-accept policy since user already agreed before
  const policyCheckbox = document.getElementById('agreeToPolicy');
  if (policyCheckbox) {
    policyCheckbox.checked = true;
    policyCheckbox.disabled = false; // Enable it in case it was disabled
    console.log('[Quick Rebook] Policy auto-accepted');
  }
  
  // Mark policy as agreed in bookingData
  bookingData.policyAgreed = true;
  
  // Jump directly to step 3 (Schedule)
  showStep(3);
  setupCalendarTimePicker().catch(err => console.error('Error rendering calendar:', err));

  updateSummary();

  customAlert.success('Profile Loaded!', 'Your saved details have been loaded. Now select your preferred date and time.');
}

function applyProfileToForm(profile = {}) {
  const fieldMap = [
    ['ownerName', 'ownerName', 'ownerName'],
    ['contactNumber', 'contactNumber', 'contactNumber'],
    ['ownerAddress', 'address', 'ownerAddress'],
    ['petName', 'petName', 'petName'],
    ['petBreed', 'breed', 'petBreed'],
    ['petAge', 'age', 'petAge'],
    ['medicalNotes', 'medical', 'medicalNotes'],
    ['vaccinationNotes', 'vaccinations', 'vaccinationNotes']
  ];

  fieldMap.forEach(([elementId, profileKey, dataField]) => {
    const el = document.getElementById(elementId);
    if (el && typeof profile[profileKey] !== 'undefined' && profile[profileKey]) {
      el.value = profile[profileKey];
      bookingData[dataField] = profile[profileKey];
    }
  });

  bookingData.ownerName = profile.ownerName || bookingData.ownerName;
  bookingData.contactNumber = profile.contactNumber || bookingData.contactNumber;
  bookingData.ownerAddress = profile.address || bookingData.ownerAddress;
  bookingData.petName = profile.petName || bookingData.petName;
  bookingData.petBreed = profile.breed || '';
  bookingData.petAge = profile.age || '';
  bookingData.petWeight = normalizeWeightValue(profile.weight || '');
  bookingData.medicalNotes = profile.medical || '';
  bookingData.vaccinationNotes = profile.vaccinations || '';

  // 🔧 SINGLE SERVICE PROFILE FIX: Restore pet type and package selection
  if (profile.petType) {
    bookingData.petType = profile.petType;
    // Update pet type UI
    document.querySelectorAll('.pet-type-card').forEach(card => {
      if (card.dataset.petType === profile.petType) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  }

  if (profile.packageId) {
    bookingData.packageId = profile.packageId;
    // Update package UI
    document.querySelectorAll('.package-card').forEach(card => {
      if (card.dataset.packageId === profile.packageId) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  }

  // 🔧 ALL SERVICES PROFILE FIX: Restore ALL service selections
  if (profile.singleServices && Array.isArray(profile.singleServices)) {
    bookingData.singleServices = [...profile.singleServices];
    console.log('[Profile] Restoring single services:', bookingData.singleServices);
    
    // Update single service checkboxes in DOM
    setTimeout(() => {
      profile.singleServices.forEach(serviceId => {
        const checkbox = document.querySelector(`input[name="singleService"][value="${serviceId}"]`);
        if (checkbox) {
          checkbox.checked = true;
          console.log('[Profile] Restored single service checkbox:', serviceId);
        }
      });
      
      // Re-render single service configurator to show restored selections
      if (profile.packageId === SINGLE_SERVICE_PACKAGE_ID) {
        renderSingleServiceConfigurator();
      }
    }, 100);
  }

  // 🔧 ALL SERVICES PROFILE FIX: Restore add-ons selection
  if (profile.addOns && Array.isArray(profile.addOns)) {
    bookingData.addOns = [...profile.addOns];
    console.log('[Profile] Restoring add-ons:', bookingData.addOns);
    
    // Update add-on checkboxes in DOM
    setTimeout(() => {
      // Clear all add-on checkboxes first
      document.querySelectorAll('input[name="addOn"]').forEach(checkbox => {
        checkbox.checked = false;
      });
      
      // Check the restored add-ons
      profile.addOns.forEach(addonId => {
        const checkbox = document.querySelector(`input[name="addOn"][value="${addonId}"]`);
        if (checkbox) {
          checkbox.checked = true;
          console.log('[Profile] Restored add-on checkbox:', addonId);
        }
      });
    }, 100);
  }

  // 🔧 ALL SERVICES PROFILE FIX: Restore reference cut selection
  if (profile.referenceCut) {
    bookingData.referenceCut = profile.referenceCut;
    console.log('[Profile] Restoring reference cut:', bookingData.referenceCut);
    
    // Update reference cut selection in DOM
    setTimeout(() => {
      // Clear all reference cut selections first
      document.querySelectorAll('.cut-selector-btn').forEach(btn => {
        btn.style.background = '';
        btn.style.color = '';
      });
      
      // Select the restored reference cut
      const cutBtn = document.querySelector(`[data-cut="${profile.referenceCut}"]`);
      if (cutBtn) {
        cutBtn.style.background = '#4CAF50';
        cutBtn.style.color = 'white';
        console.log('[Profile] Restored reference cut button:', profile.referenceCut);
      }
    }, 100);
  }

  // Select the weight radio button
  if (profile.weight) {
    const weightRadios = document.querySelectorAll('input[name="petWeight"]');
    weightRadios.forEach(radio => {
      if (radio.value === profile.weight) {
        radio.checked = true;
      }
    });
  }

  // 🔧 PROFILE LOADING FIX: Auto-check policy checkbox when profile is loaded
  // This allows users to proceed immediately after loading a complete profile
  if (currentStep === 1) {
    const policyCheckbox = document.getElementById('agreeToPolicy');
    if (policyCheckbox && !policyCheckbox.disabled) {
      policyCheckbox.checked = true;
      console.log('[Profile] Auto-checked policy checkbox after profile load');
    }
  }

  updateSummary();
  enableNextButton();
  updateSingleServicePriceLabels();
}

function clearProfileForm() {
  const inputs = ['contactNumber', 'ownerAddress', 'petName', 'petBreed', 'petAge', 'petWeight'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      bookingData[id] = '';
    }
  });
  ['medicalNotes', 'vaccinationNotes', 'bookingNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      bookingData[id] = '';
    }
  });
  updateSummary();
}

// Show specific step
function showStep(step) {
  console.log('[showStep] Changing from step', currentStep, 'to step', step);
  currentStep = step;

  // Update step indicators
  document.querySelectorAll('.step').forEach((stepEl, index) => {
    const stepNum = index + 1;
    stepEl.classList.remove('active', 'completed');

    if (stepNum < step) {
      stepEl.classList.add('completed');
    } else if (stepNum === step) {
      stepEl.classList.add('active');
    }
  });

  // Show/hide step content
  document.querySelectorAll('.step-content').forEach((content, index) => {
    if (index + 1 === step) {
      content.classList.add('active');
      // Add inline styles for horizontal scroll on mobile
      content.style.overflowX = 'auto';
      content.style.webkitOverflowScrolling = 'touch';
      content.style.maxWidth = '100%';
      content.style.width = '100%';
      content.style.boxSizing = 'border-box';
    } else {
      content.classList.remove('active');
    }
  });

  // Show/hide navigation buttons
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBooking');

  if (prevBtn) {
    if (step > 1) {
      prevBtn.style.display = 'inline-block';
      prevBtn.classList.remove('hidden');
      prevBtn.classList.add('visible');
      prevBtn.removeAttribute('data-hidden');
    } else {
      prevBtn.style.display = 'none';
      prevBtn.classList.add('hidden');
      prevBtn.classList.remove('visible');
      prevBtn.setAttribute('data-hidden', 'true');
    }
  }

  if (nextBtn) {
    if (step < totalSteps) {
      nextBtn.style.display = 'inline-block';
      nextBtn.classList.remove('hidden');
      nextBtn.classList.add('visible');
      nextBtn.removeAttribute('data-hidden');
    } else {
      nextBtn.style.display = 'none';
      nextBtn.classList.add('hidden');
      nextBtn.classList.remove('visible');
      nextBtn.setAttribute('data-hidden', 'true');
    }
  }

  if (submitBtn) {
    if (step === totalSteps) {
      submitBtn.style.display = 'inline-block';
      submitBtn.classList.remove('hidden');
      submitBtn.classList.add('visible');
      submitBtn.removeAttribute('data-hidden');
    } else {
      submitBtn.style.display = 'none';
      submitBtn.classList.add('hidden');
      submitBtn.classList.remove('visible');
      submitBtn.setAttribute('data-hidden', 'true');
    }
  }

  updateSummary();
  
  // Render single service configurator if on step 3 and single service is selected
  if (step === 3 && isSingleServicePackage()) {
    renderSingleServiceConfigurator();
    updateReferenceCutsVisibility();
  }
  
  // 🔧 CALENDAR SETUP FIX: Setup calendar when navigating to step 4
  // This ensures correct calendar type shows based on current package selection
  if (step === 4) {
    console.log('[showStep] Navigating to step 4 - setting up calendar');
    console.log('[showStep] Current packageId:', bookingData.packageId);
    console.log('[showStep] isSingleServicePackage():', isSingleServicePackage());
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      setupCalendarTimePicker();
    }, 100);
  }
  
  // Update next button state based on current step
  enableNextButton();
  
  // Update submit button state if on final step
  if (step === totalSteps) {
    enableSubmitButton();
  }
}

// Next step
async function nextStep() {
  // Prevent rapid navigation clicks
  const now = Date.now();
  if ((now - lastNavigationTime) < NAVIGATION_COOLDOWN_MS) {
    console.log('[nextStep] Navigation cooldown active, ignoring request');
    return;
  }
  lastNavigationTime = now;
  
  console.log('[nextStep] Current step:', currentStep, 'packageId:', bookingData.packageId);
  console.log('[nextStep] About to validate step:', currentStep);
  
  // Validate current step
  if (!validateStep(currentStep)) {
    console.log('[nextStep] Validation failed for step:', currentStep);
    return;
  }
  
  console.log('[nextStep] Validation passed for step:', currentStep);

  // Save current form data to sessionStorage before moving to next step
  saveBookingDataToSession();

  // Gate: Skip to step 4 if packageId is already set after step 2
  // BUT: Don't skip for single service - user needs to select services in step 3
  if (currentStep === 2 && bookingData.packageId && bookingData.packageId !== SINGLE_SERVICE_PACKAGE_ID) {
    console.log('[nextStep] Skipping to step 4 because packageId is set (not single service)');
    showStep(4);
    return;
  }

  if (currentStep < totalSteps) {
    showStep(currentStep + 1);
  }
}

// Save current booking form data to sessionStorage
function saveBookingDataToSession() {
  // Collect all form data
  const formData = {
    petType: bookingData.petType,
    packageId: bookingData.packageId,
    ownerName: document.getElementById('ownerName')?.value || bookingData.ownerName,
    contactNumber: document.getElementById('contactNumber')?.value || bookingData.contactNumber,
    ownerAddress: document.getElementById('ownerAddress')?.value || bookingData.ownerAddress,
    petName: document.getElementById('petName')?.value || bookingData.petName,
    petBreed: document.getElementById('petBreed')?.value || bookingData.petBreed,
    petAge: document.getElementById('petAge')?.value || bookingData.petAge,
    petWeight: document.getElementById('petWeight')?.value || bookingData.petWeight,
    medicalNotes: document.getElementById('medicalNotes')?.value || bookingData.medicalNotes,
    vaccinationNotes: document.getElementById('vaccinationNotes')?.value || bookingData.vaccinationNotes,
    bookingNotes: document.getElementById('bookingNotes')?.value || bookingData.bookingNotes,
    addOns: bookingData.addOns || [],
    singleServices: bookingData.singleServices || [],
    saveProfile: bookingData.saveProfile !== false,
    referenceCut: bookingData.referenceCut || null,
    vaccinationProofImage: bookingData.vaccinationProofImage || null
  };

  // Merge with existing bookingData
  bookingData = { ...bookingData, ...formData };

  // Save to sessionStorage
  sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
}

// Previous step
function prevStep() {
  // Prevent rapid navigation clicks
  const now = Date.now();
  if ((now - lastNavigationTime) < NAVIGATION_COOLDOWN_MS) {
    console.log('[prevStep] Navigation cooldown active, ignoring request');
    return;
  }
  lastNavigationTime = now;
  
  // Clear submission lock when navigating back
  isSubmittingBooking = false;
  lastSubmitTime = 0;
  
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
}

// Track if validation alert is currently showing to prevent duplicates
let isValidationAlertShowing = false;

// Helper function to show validation alert and track state
function showValidationAlert(title, message) {
  if (isValidationAlertShowing) return;
  isValidationAlertShowing = true;
  customAlert.warning(title, message).then(() => {
    isValidationAlertShowing = false;
  });
}

// Validate step
function validateStep(step) {
  console.log('[validateStep] Validating step:', step, 'bookingData:', JSON.stringify(bookingData, null, 2));
  
  // Prevent multiple alerts from showing at once
  if (isValidationAlertShowing) {
    console.log('[validateStep] Alert already showing, skipping validation');
    return false;
  }
  
  // Sync form values to bookingData before validation (dual-source validation)
  console.log('[validateStep] Before sync - packageId:', bookingData.packageId);
  syncFormToBookingData();
  console.log('[validateStep] After sync - packageId:', bookingData.packageId);
  
  switch (step) {
    case 1:
      // Policy agreement step - skip in reschedule mode (already agreed before)
      if (isRescheduleMode) {
        break;
      }
      const policyCheckbox = document.getElementById('agreeToPolicy');
      if (!policyCheckbox || !policyCheckbox.checked) {
        console.log('[validateStep] Policy not agreed, but alert disabled for debugging');
        // showValidationAlert('Policy Agreement Required', 'Please scroll through and read our policy, then check the agreement box to continue.');
        // return false;
      }
      break;
    case 2:
      if (!bookingData.petType) {
        showValidationAlert('Missing Information', 'Please select a pet type');
        return false;
      }
      break;
    case 3:
      // Package validation (data already synced by syncFormToBookingData)
      console.log('[validateStep] Step 3 - Current packageId:', bookingData.packageId);
      console.log('[validateStep] Full bookingData:', JSON.stringify(bookingData, null, 2));
      
      // TEMPORARILY DISABLED - Package validation alert
      if (!bookingData.packageId) {
        console.log('[validateStep] No package selected, but alert disabled for debugging');
        // showValidationAlert('Missing Information', 'Please select a package');
        // return false;
      }
      
      console.log('[validateStep] Package validation passed:', bookingData.packageId);
      
      // Single service validation
      if (bookingData.packageId === SINGLE_SERVICE_PACKAGE_ID) {
        // Check DOM for selected single services if bookingData is empty
        if (bookingData.singleServices.length === 0) {
          const checkedServices = document.querySelectorAll('[data-single-service]:checked');
          checkedServices.forEach(input => {
            const serviceId = input.dataset.singleService;
            if (serviceId && !bookingData.singleServices.includes(serviceId)) {
              bookingData.singleServices.push(serviceId);
            }
          });
          console.log('[validateStep] Auto-detected single services from DOM:', bookingData.singleServices);
        }
        
        if (bookingData.singleServices.length === 0) {
          showValidationAlert('Missing Information', 'Select at least one single service option.');
          return false;
        }
      }
      break;
    case 4:
      // Groomer selection removed - admin will assign
      // Only require date and time
      if (!bookingData.date) {
        console.log('[validateStep] No date selected, but alert disabled for debugging');
        // showValidationAlert('Missing Information', 'Please select a date');
        // return false;
      }
      if (typeof isCalendarBlackout === 'function' && isCalendarBlackout(bookingData.date)) {
        console.log('[validateStep] Date is blackout, but alert disabled for debugging');
        // showValidationAlert('Date Unavailable', 'Selected date is closed. Please pick another day.');
        // return false;
      }
      if (!bookingData.time) {
        console.log('[validateStep] No time selected, but alert disabled for debugging');
        // showValidationAlert('Missing Information', 'Please select a time slot');
        // return false;
      }
      break;
    case 5:
      // Dual-source validation: check both bookingData and DOM
      const ownerNameValue = bookingData.ownerName?.trim() || document.getElementById('ownerName')?.value?.trim() || '';
      const contactNumberValue = bookingData.contactNumber?.trim() || document.getElementById('contactNumber')?.value?.trim() || '';
      const petNameValue = bookingData.petName?.trim() || document.getElementById('petName')?.value?.trim() || '';
      
      console.log('[validateStep] Step 5 values - ownerName:', ownerNameValue, 'contactNumber:', contactNumberValue, 'petName:', petNameValue);
      
      if (!ownerNameValue) {
        console.log('[validateStep] Owner name missing, but alert disabled for debugging');
        // showValidationAlert('Missing Information', 'Please enter the owner name');
        // return false;
      }
      if (!contactNumberValue) {
        console.log('[validateStep] Contact number missing, but alert disabled for debugging');
        // showValidationAlert('Missing Information', 'Please enter a contact number');
        // return false;
      }
      // Validate phone number format (11-digit Philippine number)
      const phone = contactNumberValue.replace(/\s/g, '');
      if (!/^(\+63|0)[0-9]{10}$/.test(phone)) {
        console.log('[validateStep] Invalid phone format, but alert disabled for debugging');
        // showValidationAlert('Invalid Input', 'Please enter a valid 11-digit phone number (e.g., 09662233605 or +63 9662233605)');
        // return false;
      }
      if (!petNameValue) {
        console.log('[validateStep] Pet name missing, but alert disabled for debugging');
        // showValidationAlert('Missing Information', "Please enter your pet's name");
        // return false;
      }
      
      // Strict vaccination validation with mutual exclusion
      const antiRabies = document.getElementById('vaccAntiRabies');
      const antiParvo = document.getElementById('vaccAntiParvo');
      const notVaccinated = document.getElementById('vaccNotVaccinated');
      
      const isVaccinated = antiRabies?.checked || antiParvo?.checked;
      const isNotVaccinated = notVaccinated?.checked;
      
      console.log('[validateStep] Vaccination status - antiRabies:', antiRabies?.checked, 'antiParvo:', antiParvo?.checked, 'notVaccinated:', notVaccinated?.checked);

      // Check for mutual exclusion violation
      if (isVaccinated && isNotVaccinated) {
        console.log('[validateStep] Vaccination mutual exclusion violation, but alert disabled for debugging');
        // showValidationAlert('Invalid Selection', 'You cannot select both vaccinated and not vaccinated. Please choose one option.');
        // return false;
      }
      
      // Check if not vaccinated is selected
      if (isNotVaccinated) {
        console.log('[validateStep] Pet not vaccinated, but alert disabled for debugging');
        // showValidationAlert('Vaccination Required', 'Your pet must be vaccinated to book an appointment. Please contact us once your pet has received the necessary vaccinations.');
        // return false;
      }
      
      // Check if no vaccination status is selected
      if (!isVaccinated && !isNotVaccinated) {
        console.log('[validateStep] No vaccination status selected, but alert disabled for debugging');
        // showValidationAlert('Vaccination Status Required', "Please confirm your pet's vaccination status. Select at least one vaccine or mark as not vaccinated.");
        // return false;
      }
      break;
  }
  return true;
}

// Sync form values to bookingData (dual-source validation helper)
function syncFormToBookingData() {
  const fields = ['ownerName', 'contactNumber', 'ownerAddress', 'petName', 'petBreed', 'petAge', 'medicalNotes', 'vaccinationNotes', 'bookingNotes'];
  
  fields.forEach(field => {
    const el = document.getElementById(field);
    if (el && el.value) {
      bookingData[field] = el.value.trim();
    }
  });
  
  // Sync weight from radio buttons
  const selectedWeight = document.querySelector('input[name="petWeight"]:checked');
  if (selectedWeight) {
    bookingData.petWeight = selectedWeight.value;
  }
  
  // Sync pet type from DOM
  const selectedPetCard = document.querySelector('.pet-type-card.selected');
  if (selectedPetCard && selectedPetCard.dataset.petType) {
    bookingData.petType = selectedPetCard.dataset.petType;
  }
  
  // Sync package selection from DOM
  const selectedPackageCard = document.querySelector('.package-card.selected');
  console.log('[syncFormToBookingData] Found selected package card:', selectedPackageCard);
  if (selectedPackageCard && selectedPackageCard.dataset.packageId) {
    bookingData.packageId = selectedPackageCard.dataset.packageId;
    console.log('[syncFormToBookingData] Synced packageId from DOM:', bookingData.packageId);
  } else {
    console.log('[syncFormToBookingData] No selected package card found or no packageId');
  }
  
  // Sync reference cut from selected button
  const selectedCutBtn = document.querySelector('.cut-selector-btn[style*="background: rgb(76, 175, 80)"], .cut-selector-btn[style*="#4CAF50"]');
  if (selectedCutBtn && selectedCutBtn.dataset.cut) {
    bookingData.referenceCut = selectedCutBtn.dataset.cut;
    console.log('[syncFormToBookingData] Synced referenceCut from DOM:', bookingData.referenceCut);
  }
  
  console.log('[syncFormToBookingData] Synced bookingData:', JSON.stringify(bookingData, null, 2));
}

// Select pet type
function selectPetType(petType) {
  const previousPetType = bookingData.petType;
  console.log('[selectPetType] Called with:', petType, 'Previous:', previousPetType);
  bookingData.petType = petType;

  // Update UI
  document.querySelectorAll('.pet-type-card').forEach(card => {
    if (card.dataset.petType === petType) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  // Clear package selection and reference cut only if type actually changed
  if (previousPetType && previousPetType !== petType) {
    console.log('[selectPetType] Pet type changed from', previousPetType, 'to', petType, '- clearing package and reference cut');
    bookingData.packageId = null;
    bookingData.referenceCut = null; // Clear reference cut when pet type changes
  }
  loadPackages();
  renderSingleServiceConfigurator();
  if (bookingData.petWeight) {
    const weightRadio = document.querySelector(`input[name="petWeight"][value="${bookingData.petWeight}"]`);
    if (weightRadio) {
      weightRadio.checked = true;
    }
  }

  // Dispatch event for other components (grooming cuts will update when step 5 is shown)
  window.dispatchEvent(new CustomEvent('petTypeSelected', {
    detail: { petType }
  }));

  updateSummary();
  enableNextButton();
  updateSingleServicePriceLabels();
}

// Load packages based on selected pet type
async function loadPackages() {
  console.log('[loadPackages] Called with petType:', bookingData.petType, 'packageId:', bookingData.packageId);
  
  // If single-service is pre-selected from URL but no pet type yet, still show packages
  // but filter to only show 'any' type packages (like single-service)
  const showAnyTypeOnly = !bookingData.petType && bookingData.packageId === SINGLE_SERVICE_PACKAGE_ID;
  
  if (!bookingData.petType && !showAnyTypeOnly) return;

  const packages = await getPackages();
  const filteredPackages = packages.filter(pkg => {
    if (pkg.type === 'addon') return false;
    // If showing any type only (single-service from URL without pet type), only show 'any' packages
    if (showAnyTypeOnly) return pkg.type === 'any';
    if (pkg.type === 'any') return true;
    return pkg.type === bookingData.petType;
  });

  const packagesContainer = document.getElementById('packagesContainer');
  if (!packagesContainer) return;

  packagesContainer.innerHTML = filteredPackages.map(pkg => {
    const isSelected = bookingData.packageId === pkg.id;
    const tiers = (pkg.tiers || []).map(tier => `<div><strong>${formatCurrency(tier.price)}</strong> · ${escapeHtml(tier.label)}</div>`).join('');
    const inclusions = (pkg.includes || []).map(item => `<div>${escapeHtml(item)}</div>`).join('');
    return `
      <div class="card card-selectable package-card ${isSelected ? 'selected' : ''}" 
           data-package-id="${pkg.id}">
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(pkg.name)}</h3>
          <p style="color: var(--gray-600); font-size:0.9rem;">Duration: ${pkg.duration} mins</p>
          <div class="package-includes" style="list-style: none; padding: 0; margin: 0.5rem 0;">${inclusions}</div>
          <div class="package-tiers" style="margin-top: 0.5rem;">
            <div style="list-style: none; padding: 0;">${tiers}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Re-attach event listeners
  document.querySelectorAll('.package-card').forEach(card => {
    card.addEventListener('click', function () {
      const packageId = this.dataset.packageId;
      console.log('[LoadPackages] Clicked package card with ID:', packageId);
      selectPackage(packageId);
    });
  });
}



function isSingleServicePackage() {
  return bookingData.packageId === SINGLE_SERVICE_PACKAGE_ID;
}

function renderSingleServiceConfigurator() {
  const wrapper = document.getElementById('singleServiceConfigurator');
  const optionsContainer = document.getElementById('singleServiceOptions');
  if (!wrapper || !optionsContainer) return;

  if (!isSingleServicePackage()) {
    wrapper.style.display = 'none';
    bookingData.singleServices = [];
    optionsContainer.innerHTML = '';
    return;
  }

  wrapper.style.display = 'block';
  
  // Show message if pet type not selected yet
  if (!bookingData.petType) {
    const petTypeMessage = document.getElementById('singleServicePetTypeMessage');
    if (!petTypeMessage) {
      // Insert message before options
      const messageDiv = document.createElement('div');
      messageDiv.id = 'singleServicePetTypeMessage';
      messageDiv.style.cssText = 'background: #fff3e0; border: 1px solid #ffcc80; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; text-align: center;';
      messageDiv.innerHTML = `
        <span style="font-size: 1.5rem;">🐾</span>
        <p style="margin: 0.5rem 0 0 0; color: #e65100; font-weight: 500;">Please select your pet type (Dog or Cat) above first to see accurate pricing.</p>
      `;
      optionsContainer.parentNode.insertBefore(messageDiv, optionsContainer);
    }
  } else {
    // Remove message if pet type is selected
    const petTypeMessage = document.getElementById('singleServicePetTypeMessage');
    if (petTypeMessage) {
      petTypeMessage.remove();
    }
  }
  
  const optionEntries = Object.values(SINGLE_SERVICE_OPTIONS);

  if (!optionEntries.length) {
    optionsContainer.innerHTML = '<p class="empty-state">Single services are not configured yet.</p>';
    return;
  }

  optionsContainer.innerHTML = optionEntries.map(option => {
    const checked = bookingData.singleServices.includes(option.id);
    // Get price based on weight selection - show total instead of range when weight is selected
    const tiers = option.tiers || {};
    const smallPrice = tiers.small?.price || 0;
    const largePrice = tiers.large?.price || 0;
    
    let priceDisplay = '';
    if (bookingData.petWeight) {
      // Weight is selected - show the specific price for that weight
      const category = getWeightCategoryForDisplay(bookingData.petWeight);
      const specificPrice = category === 'large' ? largePrice : smallPrice;
      priceDisplay = specificPrice ? `₱${specificPrice}` : '';
      console.log('[SingleService] Weight selected:', bookingData.petWeight, 'Category:', category, 'Price:', specificPrice);
    } else {
      // No weight selected - show price range
      priceDisplay = smallPrice && largePrice ? `₱${smallPrice} - ₱${largePrice}` : '';
    }
    
    return `
      <label class="addon-chip single-service-chip ${checked ? 'selected' : ''}" style="display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border: 2px solid ${checked ? 'var(--primary)' : 'var(--gray-300)'}; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s ease;">
        <input type="checkbox" ${checked ? 'checked' : ''} data-single-service="${option.id}" style="width: 1.25rem; height: 1.25rem;">
        <div style="flex: 1;">
          <div style="font-weight:600; font-size: 1rem;">${escapeHtml(option.label)}</div>
          <div style="font-size: 0.9rem; color: #2e7d32; font-weight: 600; margin-top: 0.25rem;">${priceDisplay}</div>
          <div class="price-hint" data-price-label="${option.id}" style="font-size:0.8rem; color: var(--gray-500); margin-top: 0.25rem;">
            ${bookingData.petWeight ? '' : '(Price varies by weight)'}
          </div>
        </div>
      </label>
    `;
  }).join('');

  optionsContainer.querySelectorAll('[data-single-service]').forEach(input => {
    input.addEventListener('change', () => {
      toggleSingleServiceOption(input.dataset.singleService, input.checked);
    });
  });

  updateSingleServicePriceLabels();
}

// Helper function to determine weight category for single service pricing
function getWeightCategoryForDisplay(weightLabel) {
  if (!weightLabel) return 'small';
  const lower = weightLabel.toLowerCase();
  // Extract numeric value from weight label
  const match = lower.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 'small';
  const numeric = parseFloat(match[1]);
  // 15kg and above is "large", below is "small"
  return numeric >= 15 ? 'large' : 'small';
}

function toggleSingleServiceOption(serviceId, enabled) {
  if (!serviceId) return;
  if (enabled) {
    if (!bookingData.singleServices.includes(serviceId)) {
      bookingData.singleServices.push(serviceId);
    }
  } else {
    bookingData.singleServices = bookingData.singleServices.filter(id => id !== serviceId);
  }
  updateSingleServicePriceLabels();
  updateReferenceCutsVisibility();
  updateSummary();
  enableNextButton();
}

// Show/hide reference cuts section based on selected single services
// Only Face Trim needs reference cuts - Nail Trim and Ear Clean don't need it
function updateReferenceCutsVisibility() {
  const referenceCutsSection = document.getElementById('referenceCutsSection');
  if (!referenceCutsSection) return;
  
  // Determine if we should show reference cuts
  let shouldShow = false;
  
  if (isSingleServicePackage()) {
    // Only show reference cuts if Face Trim is selected
    const hasFaceTrim = bookingData.singleServices.includes('face');
    shouldShow = hasFaceTrim;
  } else {
    // For regular packages, always show reference cuts
    shouldShow = true;
  }
  
  if (shouldShow) {
    // Render the correct cuts based on pet type
    renderReferenceCutsForPetType(bookingData.petType || 'dog');
    referenceCutsSection.style.display = 'block';
  } else {
    referenceCutsSection.style.display = 'none';
  }
}

// Render reference cuts based on pet type (dog or cat)
// Uses GROOMING_CUTS data from grooming-cuts.js
function renderReferenceCutsForPetType(petType) {
  console.log('[renderReferenceCutsForPetType] Called with petType:', petType);
  const referenceCutsSection = document.getElementById('referenceCutsSection');
  if (!referenceCutsSection) {
    console.warn('[renderReferenceCutsForPetType] referenceCutsSection not found!');
    return;
  }
  
  // Get cuts from GROOMING_CUTS (from grooming-cuts.js)
  let cuts = [];
  
  if (typeof window.GROOMING_CUTS !== 'undefined' && Array.isArray(window.GROOMING_CUTS)) {
    cuts = window.GROOMING_CUTS.filter(cut => 
      cut.petTypes && cut.petTypes.includes(petType.toLowerCase())
    );
    console.log('[renderReferenceCutsForPetType] Using GROOMING_CUTS from grooming-cuts.js:', cuts.length, 'cuts found');
  } else {
    console.warn('[renderReferenceCutsForPetType] GROOMING_CUTS not available from grooming-cuts.js');
  }
  
  // If no cuts found, show message
  if (cuts.length === 0) {
    referenceCutsSection.innerHTML = `
      <p style="font-size: 0.85rem; color: var(--gray-600); margin-bottom: 1rem; font-weight: 500;">
        💡 No grooming styles available for ${petType}s at the moment.
      </p>
    `;
    return;
  }
  
  const petTypeLabel = petType.charAt(0).toUpperCase() + petType.slice(1);
  
  const cutsHTML = cuts.map(cut => {
    const cutId = cut.id;
    const isSelected = bookingData.referenceCut === cutId;
    const shortDesc = cut.description.split('.')[0]; // Get first sentence for short description
    
    return `
      <div style="text-align: center; width: 140px; flex: 0 0 140px; scroll-snap-align: start;">
        <div style="width: 140px; height: 140px; background: ${cut.backgroundColor || '#f5f5f5'}; border-radius: 1rem; margin: 0 auto 0.6rem; display: flex; align-items: center; justify-content: center; border: 3px solid ${cut.borderColor || '#ccc'}; overflow: hidden; cursor: pointer;" onclick="event.preventDefault(); event.stopPropagation(); openLightbox('${cut.image}');">
          <img src="${cut.image}" alt="${cut.name}" style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;" onerror="this.style.display='none';">
        </div>
        <button type="button" class="cut-selector-btn ${isSelected ? 'selected' : ''}" data-cut="${cutId}"
          onclick="selectGroomingCut('${cutId}', event)"
          style="width: 140px; padding: 0.5rem; background: ${isSelected ? '#4CAF50' : '#e8e8e8'}; color: ${isSelected ? 'white' : '#333'}; border: 1px solid ${isSelected ? '#4CAF50' : '#ccc'}; border-radius: 0.4rem; cursor: pointer; font-weight: 600; transition: all 0.3s ease; font-size: 0.75rem; margin-bottom: 0.3rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${cut.name}
        </button>
        <p style="text-align: center; font-size: 0.65rem; color: var(--gray-600); margin: 0; width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${shortDesc}</p>
      </div>
    `;
  }).join('');
  
  referenceCutsSection.innerHTML = `
    <p style="font-size: 0.85rem; color: var(--gray-600); margin-bottom: 1rem; font-weight: 500;">
      💡 ${petTypeLabel} Grooming Styles - Browse popular styles below:
    </p>
    <div class="cuts-carousel-wrapper">
      <div class="cuts-carousel" style="display: flex; gap: 1rem; overflow-x: auto; padding: 0.5rem; scroll-snap-type: x mandatory;">
        ${cutsHTML}
      </div>
    </div>
  `;
  
  console.log('[renderReferenceCutsForPetType] Rendered', cuts.length, 'cuts for', petType, 'from grooming-cuts.js');
}

function updateSingleServicePriceLabels() {
  if (!isSingleServicePackage()) return;
  const optionsContainer = document.getElementById('singleServiceOptions');
  if (!optionsContainer) return;

  optionsContainer.querySelectorAll('[data-price-label]').forEach(label => {
    const serviceId = label.dataset.priceLabel;
    if (typeof getSingleServicePrice !== 'function') {
      label.textContent = '';
      return;
    }
    const info = getSingleServicePrice(serviceId, bookingData.petWeight || '');
    if (info.requiresWeight && !bookingData.petWeight) {
      label.textContent = '(Price varies by weight)';
      return;
    }
    if (info.price) {
      label.textContent = `Your price: ${formatCurrency(info.price)} (${info.category === 'large' ? '15kg+' : 'Up to 15kg'})`;
      label.style.color = '#1976d2';
      label.style.fontWeight = '500';
    } else {
      label.textContent = '';
    }
  });
}

// Select package
function selectPackage(packageId) {
  console.log('[selectPackage] Setting packageId to:', packageId);
  bookingData.packageId = packageId;
  if (packageId !== SINGLE_SERVICE_PACKAGE_ID) {
    bookingData.singleServices = [];
  }

  // Update age dropdown options based on package selection
  updateAgeDropdownOptions();

  // Update UI
  document.querySelectorAll('.package-card').forEach(card => {
    if (card.dataset.packageId === packageId) {
      card.classList.add('selected');
      console.log('[selectPackage] Added selected class to card:', packageId);
    } else {
      card.classList.remove('selected');
    }
  });

  updateSummary();
  enableNextButton();
  renderSingleServiceConfigurator();
  updateReferenceCutsVisibility();
  
  // 🔧 CALENDAR RE-RENDER FIX: Re-render calendar when package changes while on step 4
  // This ensures correct calendar type shows when user changes package after loading profile
  if (currentStep === 4) {
    console.log('[selectPackage] Package changed while on step 4 - re-rendering calendar');
    console.log('[selectPackage] New packageId:', packageId, 'isSingleService:', packageId === SINGLE_SERVICE_PACKAGE_ID);
    // Clear date/time selection since calendar type is changing
    bookingData.date = null;
    bookingData.time = null;
    // Re-render calendar with correct type
    setupCalendarTimePicker();
  }
}

// Setup calendar time picker
async function setupCalendarTimePicker() {
  const container = document.getElementById('calendarTimePicker');
  if (!container) return;

  // Clear previous content and setup structure
  container.innerHTML = `
    <div id="calendarWrapper" style="margin-bottom: 2rem; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; box-sizing: border-box; padding-bottom: 0.5rem;"></div>
    <div id="timeSlotsWrapper"></div>
    <div id="groomerAssignmentDisplay" style="text-align:center; display:none; margin-top:1rem; font-size:0.9rem; color:var(--gray-600);"></div>
  `;

  // Clear any previous groomer selection - admin will assign
  if (!bookingData.groomerDataPreserved) {
    bookingData.groomerId = null;
    bookingData.groomerName = '';
  }

  // Check if this is a single service booking - use different calendar
  console.log('[setupCalendarTimePicker] Checking package type - packageId:', bookingData.packageId);
  console.log('[setupCalendarTimePicker] SINGLE_SERVICE_PACKAGE_ID:', SINGLE_SERVICE_PACKAGE_ID);
  console.log('[setupCalendarTimePicker] isSingleServicePackage():', isSingleServicePackage());
  console.log('[setupCalendarTimePicker] packageId === SINGLE_SERVICE_PACKAGE_ID:', bookingData.packageId === SINGLE_SERVICE_PACKAGE_ID);
  
  if (isSingleServicePackage()) {
    console.log('[setupCalendarTimePicker] Rendering SINGLE SERVICE calendar');
    // Single service: clean calendar without slot indicators
    await renderSingleServiceCalendar('calendarWrapper', {
      onDateSelect: handleSingleServiceDateSelect,
      selectedDate: bookingData.date
    });
    
    // If we already have a date selected, render single service time slots
    if (bookingData.date) {
      if (typeof isCalendarBlackout === 'function' && isCalendarBlackout(bookingData.date)) {
        bookingData.date = null;
        bookingData.time = null;
      } else {
        renderSingleServiceTimeSlots(bookingData.date);
      }
    } else {
      document.getElementById('timeSlotsWrapper').innerHTML = '<p style="color:var(--gray-600); text-align:center; padding:2rem;">Select a date above to see available time slots.</p>';
    }
  } else {
    console.log('[setupCalendarTimePicker] Rendering FULL PACKAGE calendar');
    // Regular booking: calendar with slot indicators
    await renderPublicCalendar('calendarWrapper', {
      showBookedList: false,
      onDateSelect: handleDateSelect,
      selectedDate: bookingData.date
    });

    // If we already have a date selected (e.g. returning from auth), render time slots
    if (bookingData.date) {
      if (typeof isCalendarBlackout === 'function' && isCalendarBlackout(bookingData.date)) {
        bookingData.date = null;
        bookingData.time = null;
      } else {
        renderBookingTimeSlots(bookingData.date);
      }
    } else {
      document.getElementById('timeSlotsWrapper').innerHTML = '<p style="color:var(--gray-600); text-align:center; padding:2rem;">Select a date above to see available time slots.</p>';
    }
  }
}

// ============================================
// SINGLE SERVICE CALENDAR & TIME SLOTS
// ============================================

// Single Service Time Slots: 30-minute intervals from 9:30 AM to 5:00 PM
const SINGLE_SERVICE_TIME_SLOTS = [
  '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM',
  '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM'
];

// Single Service Capacity: 5 slots per time interval
const SINGLE_SERVICE_CAPACITY_PER_SLOT = 5;

// Check if a date is fully booked for single service (all time slots full)
async function isSingleServiceDateFullyBooked(date) {
  if (!date) return false;
  
  const bookings = await getBookings();
  
  // Count bookings per time slot for this date
  const bookingsPerSlot = {};
  SINGLE_SERVICE_TIME_SLOTS.forEach(slot => {
    bookingsPerSlot[slot] = 0;
  });
  
  // Count active single service bookings for this date
  bookings.forEach(b => {
    if (b.date === date && 
        b.packageId === SINGLE_SERVICE_PACKAGE_ID &&
        !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status) &&
        bookingsPerSlot.hasOwnProperty(b.time)) {
      bookingsPerSlot[b.time]++;
    }
  });
  
  // Check if ALL time slots are full
  const allSlotsFull = SINGLE_SERVICE_TIME_SLOTS.every(slot => 
    bookingsPerSlot[slot] >= SINGLE_SERVICE_CAPACITY_PER_SLOT
  );
  
  return allSlotsFull;
}

// Get total available slots for a date (for calendar display)
async function getSingleServiceTotalAvailableForDate(date) {
  if (!date) return SINGLE_SERVICE_TIME_SLOTS.length * SINGLE_SERVICE_CAPACITY_PER_SLOT;
  
  const bookings = await getBookings();
  
  // Count active single service bookings for this date
  const bookedCount = bookings.filter(b => 
    b.date === date && 
    b.packageId === SINGLE_SERVICE_PACKAGE_ID &&
    !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status)
  ).length;
  
  const totalCapacity = SINGLE_SERVICE_TIME_SLOTS.length * SINGLE_SERVICE_CAPACITY_PER_SLOT;
  return Math.max(0, totalCapacity - bookedCount);
}

// Render clean calendar for single service (with fully booked indicators)
async function renderSingleServiceCalendar(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const onDateSelect = options.onDateSelect || null;
  const selectedDate = options.selectedDate || null;

  // Initialize date state if not exists
  if (!container.__singleServiceDate) {
    container.__singleServiceDate = new Date();
  }

  const displayDate = container.__singleServiceDate;
  const monthName = displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Fetch blackouts
  const blackouts = typeof getCalendarBlackouts === 'function' ? getCalendarBlackouts() : [];

  const firstDay = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
  const lastDay = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);
  const startWeekday = firstDay.getDay();

  const todayStr = toLocalISO(new Date());

  // Pre-fetch all bookings once for efficiency
  const allBookings = await getBookings();
  
  // Build a map of booked counts per date
  const bookingsPerDate = {};
  allBookings.forEach(b => {
    if (b.packageId === SINGLE_SERVICE_PACKAGE_ID &&
        !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status)) {
      if (!bookingsPerDate[b.date]) {
        bookingsPerDate[b.date] = 0;
      }
      bookingsPerDate[b.date]++;
    }
  });
  
  // Total capacity per day = time slots * capacity per slot
  const totalDailyCapacity = SINGLE_SERVICE_TIME_SLOTS.length * SINGLE_SERVICE_CAPACITY_PER_SLOT;

  // Navigation Header
  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
       <button class="btn btn-outline" style="min-width:32px; border-radius:50%; width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center;" onclick="changeSingleServiceCalendarMonth('${containerId}', -1)">←</button>
       <h4 style="margin:0; font-size:1.25rem; font-weight:700;">${monthName}</h4>
       <button class="btn btn-outline" style="min-width:32px; border-radius:50%; width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center;" onclick="changeSingleServiceCalendarMonth('${containerId}', 1)">→</button>
    </div>
    
    <div class="public-calendar-grid">
      ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div style="text-align:center; font-weight:600; color:var(--gray-500); padding-bottom:0.5rem;">${d}</div>`).join('')}
  `;

  // Empty cells for days before the 1st
  for (let i = 0; i < startWeekday; i++) {
    html += `<div></div>`;
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateObj = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
    const isoDate = toLocalISO(dateObj);

    const isBlackout = blackouts.some(b => b.date === isoDate);
    const isPast = isoDate < todayStr;
    const isSelected = selectedDate === isoDate;
    
    // Check if fully booked
    const bookedCount = bookingsPerDate[isoDate] || 0;
    const isFullyBooked = bookedCount >= totalDailyCapacity;
    const availableSlots = totalDailyCapacity - bookedCount;
    
    const isAvailable = !isPast && !isBlackout && !isFullyBooked;

    // Store callback globally for onclick
    if (onDateSelect) {
      window.__singleServiceCalendarCallback = onDateSelect;
    }

    let clickAction = '';
    if (isAvailable && onDateSelect) {
      clickAction = `onclick="window.__singleServiceCalendarCallback && window.__singleServiceCalendarCallback('${isoDate}')"`;
    }

    // Styling based on availability
    let boxClass = isAvailable ? 'open' : 'closed';
    let styleOverride = '';
    let statusLabel = '';
    
    if (isPast) {
      styleOverride = 'background:#f5f5f5; border-color:#e0e0e0; color:#9e9e9e; cursor:not-allowed;';
      statusLabel = '<div style="font-size:0.6rem; text-transform:uppercase;">Past</div>';
    } else if (isBlackout) {
      styleOverride = 'background:#f5f5f5; border-color:#e0e0e0; color:#9e9e9e; cursor:not-allowed;';
      statusLabel = '<div style="font-size:0.6rem; text-transform:uppercase;">Closed</div>';
    } else if (isFullyBooked) {
      styleOverride = 'background:#ffebee; border-color:#ffcdd2; color:#c62828; cursor:not-allowed;';
      statusLabel = '<div style="font-size:0.6rem; text-transform:uppercase; font-weight:600;">Full</div>';
    } else if (availableSlots <= 20) {
      // Low availability warning (less than 25% capacity)
      styleOverride = 'background:#fff3e0; border-color:#ffcc80; color:#e65100; cursor:pointer;';
      statusLabel = `<div style="font-size:0.55rem; color:#e65100;">${availableSlots} left</div>`;
    } else {
      styleOverride = 'background:#e8f5e9; border-color:#c8e6c9; color:#2e7d32; cursor:pointer;';
    }

    // Selection highlight
    if (isSelected && isAvailable) {
      styleOverride += ' box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.4); border-width:2px;';
    }

    // Display with status label
    html += `
      <div class="public-calendar-day ${boxClass}" ${clickAction} style="${styleOverride}">
         <div style="font-weight:700; font-size:1.1rem; text-align:center;">${day}</div>
         ${statusLabel}
      </div>
    `;
  }

  html += `</div>`;

  // Legend for single service with fully booked indicator
  html += `
    <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:1rem; justify-content:center;">
       <span class="badge" style="background:#e8f5e9; color:#2e7d32; border:1px solid #c8e6c9; font-size:0.75rem;">Available</span>
       <span class="badge" style="background:#fff3e0; color:#e65100; border:1px solid #ffcc80; font-size:0.75rem;">Few Left</span>
       <span class="badge" style="background:#ffebee; color:#c62828; border:1px solid #ffcdd2; font-size:0.75rem;">Fully Booked</span>
       <span class="badge" style="background:#f5f5f5; color:#9e9e9e; border:1px solid #e0e0e0; font-size:0.75rem;">Not Available</span>
    </div>
    <p style="text-align:center; color:var(--gray-600); font-size:0.85rem; margin-top:0.75rem;">
      📅 Select a date to see available time slots
    </p>
  `;

  container.innerHTML = html;
}

// Change month for single service calendar
function changeSingleServiceCalendarMonth(containerId, offset) {
  const container = document.getElementById(containerId);
  if (container && container.__singleServiceDate) {
    container.__singleServiceDate.setMonth(container.__singleServiceDate.getMonth() + offset);
    renderSingleServiceCalendar(containerId, {
      onDateSelect: window.__singleServiceCalendarCallback,
      selectedDate: bookingData.date
    });
  }
}

// Handle date selection for single service
async function handleSingleServiceDateSelect(date) {
  bookingData.date = date;
  bookingData.time = null; // Reset time when date changes

  // Re-render calendar to update selection highlight
  await renderSingleServiceCalendar('calendarWrapper', {
    onDateSelect: handleSingleServiceDateSelect,
    selectedDate: date
  });

  updateSummary();
  enableNextButton();
  renderSingleServiceTimeSlots(date);

  // Smooth scroll to time slots
  const tsWrapper = document.getElementById('timeSlotsWrapper');
  if (tsWrapper) tsWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Get available slots for a single service time slot
async function getSingleServiceAvailableSlots(date, time) {
  if (!date || !time) return SINGLE_SERVICE_CAPACITY_PER_SLOT;
  
  // Fetch all single service bookings for this date and time
  const bookings = await getBookings();
  const singleServiceBookings = bookings.filter(b => 
    b.date === date && 
    b.time === time && 
    b.packageId === SINGLE_SERVICE_PACKAGE_ID &&
    !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status)
  );
  
  return Math.max(0, SINGLE_SERVICE_CAPACITY_PER_SLOT - singleServiceBookings.length);
}

// Parse single service time slot to 24-hour format for comparison
function parseSingleServiceTime(timeStr) {
  // Parse "9:30 AM" or "1:00 PM" format
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return { hour: 0, minute: 0 };
  
  let hour = parseInt(match[1]);
  const minute = parseInt(match[2]);
  const isPM = match[3].toUpperCase() === 'PM';
  
  if (isPM && hour !== 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;
  
  return { hour, minute };
}

// Render time slots for single service booking
async function renderSingleServiceTimeSlots(date) {
  const container = document.getElementById('timeSlotsWrapper');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center; padding:2rem;"><div class="spinner"></div> Checking availability...</div>';

  // Check blackout
  const blackout = typeof getCalendarBlackout === 'function' ? getCalendarBlackout(date) : null;
  if (blackout) {
    container.innerHTML = `<p style="color: var(--gray-600); text-align: center; padding: 1.5rem;">${escapeHtml(blackout.reason || 'This date is closed')} · Please pick another day.</p>`;
    return;
  }

  // Time validation: Check if selected date is today
  const selectedDate = new Date(date);
  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();

  // Helper function to check if a time slot is unavailable (past or within 30 minutes for single service)
  function isTimeSlotUnavailable(timeStr) {
    if (!isToday) return false;
    
    const { hour, minute } = parseSingleServiceTime(timeStr);
    
    // ============================================
    // 🕐 SCHEDULE CUTOFF LOGIC - SINGLE SERVICE
    // ============================================
    // Rule: Customer must book at least 30 minutes BEFORE the service time
    // Example: For 2:00 PM slot, cutoff is 1:30 PM
    //          If current time is 1:45 PM, slot is unavailable
    // ============================================
    
    // Calculate cutoff time (30 minutes before booking time for single service)
    let cutoffHour = hour;
    let cutoffMinute = minute - 30;
    
    // Handle minute wraparound (e.g., 2:15 - 30 min = 1:45)
    if (cutoffMinute < 0) {
      cutoffHour--;
      cutoffMinute += 60;
    }
    
    // Handle hour wraparound (e.g., 0:00 - 30 min = 23:30 previous day)
    if (cutoffHour < 0) {
      cutoffHour = 23;
    }
    
    // Slot is unavailable if current time >= cutoff time
    // This means we need 30 minutes advance notice for single service
    return currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute >= cutoffMinute);
  }

  const selectedTime = bookingData.time;

  // Build time slot HTML
  const timeSlotPromises = SINGLE_SERVICE_TIME_SLOTS.map(async time => {
    const isUnavailable = isTimeSlotUnavailable(time);
    let availableSlots = 0;
    
    if (!isUnavailable) {
      availableSlots = await getSingleServiceAvailableSlots(date, time);
    }
    
    const isSelected = selectedTime === time;
    const isAvailable = availableSlots > 0 && !isUnavailable;

    // Color coding based on availability
    let slotColor = 'var(--gray-700)';
    let bgColor = '';
    let statusText = '';
    
    if (isUnavailable) {
      slotColor = '#d32f2f';
      statusText = 'Not available';
    } else if (availableSlots === 0) {
      slotColor = 'var(--gray-500)';
      statusText = 'Full';
    } else if (availableSlots <= 2) {
      slotColor = '#e65100'; // Orange for low availability
      bgColor = 'background: #fff3e0;';
      statusText = `${availableSlots}/${SINGLE_SERVICE_CAPACITY_PER_SLOT} slots`;
    } else {
      slotColor = '#2e7d32'; // Green for good availability
      statusText = `${availableSlots}/${SINGLE_SERVICE_CAPACITY_PER_SLOT} slots`;
    }

    return `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; min-width: 80px;">
        <button type="button" 
                data-time="${time}"
                class="time-slot ${isSelected ? 'selected' : ''} ${isUnavailable ? 'past-slot' : ''}" 
                onclick="selectSingleServiceTime('${time}')"
                style="padding: 0.5rem 0.75rem; font-size: 0.85rem; ${bgColor}"
                ${!isAvailable ? 'disabled' : ''}>
          ${time}
        </button>
        <div style="font-size: 0.75rem; color: ${slotColor}; font-weight: ${isAvailable ? '600' : '400'};">
          ${statusText}
        </div>
      </div>
    `;
  });

  const timeSlotHTMLs = await Promise.all(timeSlotPromises);

  container.innerHTML = `
    <div class="time-slots-picker" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; box-sizing: border-box; padding-bottom: 0.5rem;">
      <h4 style="margin-bottom: 0.5rem; text-align:center;">Select Time for ${formatDate(date)}</h4>
      <p style="text-align:center; color:var(--gray-600); font-size:0.8rem; margin-bottom:1rem;">
        🕐 Single service slots (15-30 min each) · 5 slots per time
      </p>
      <div class="time-slots" style="display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center;">
        ${timeSlotHTMLs.join('')}
      </div>
    </div>
  `;
}

// Select time for single service
function selectSingleServiceTime(time) {
  bookingData.time = time;

  // Update UI
  document.querySelectorAll('.time-slot').forEach(slot => {
    if (slot.dataset.time === time) {
      slot.classList.add('selected');
    } else {
      slot.classList.remove('selected');
    }
  });

  updateSummary();
  enableNextButton();
}

// Expose single service functions globally
window.renderSingleServiceCalendar = renderSingleServiceCalendar;
window.changeSingleServiceCalendarMonth = changeSingleServiceCalendarMonth;
window.handleSingleServiceDateSelect = handleSingleServiceDateSelect;
window.renderSingleServiceTimeSlots = renderSingleServiceTimeSlots;
window.selectSingleServiceTime = selectSingleServiceTime;




async function handleDateSelect(date) {
  bookingData.date = date;
  bookingData.time = null; // Reset time when date changes

  // Re-render calendar to update selection highlight
  await renderPublicCalendar('calendarWrapper', {
    showBookedList: false,
    onDateSelect: handleDateSelect,
    selectedDate: date
  });

  updateSummary();
  enableNextButton();
  renderBookingTimeSlots(date);

  // Smooth scroll to time slots
  const tsWrapper = document.getElementById('timeSlotsWrapper');
  if (tsWrapper) tsWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Calculate available slots for a time slot across all groomers
async function getAvailableSlotsForTime(date, time) {
  if (!date || !time) return 0;
  if (typeof isCalendarBlackout === 'function' && isCalendarBlackout(date)) return 0;

  // Fetch groomers/active groomers once
  const groomersList = await getGroomers();
  const activeGroomers = typeof getActiveGroomers === 'function' ? await getActiveGroomers(date) : groomersList;

  // Use main.js helper if available
  if (typeof groomerSlotAvailable === 'function') {
    try {
      const checks = await Promise.all(activeGroomers.map(g => groomerSlotAvailable(g.id, date, time)));
      return checks.filter(Boolean).length;
    } catch (e) {
      console.warn('groomerSlotAvailable parallel checks failed', e);
    }
  }

  // Fallback: compute by counting bookings
  const bookings = await getBookings();
  const bookedIds = bookings.filter(b =>
    b.date === date && b.time === time && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status)
  ).map(b => b.groomerId).filter(Boolean);

  const available = activeGroomers.filter(g => !bookedIds.includes(g.id)).length;
  
  // IMPORTANT: Check if the date is almost fully booked
  // If total slots left for the day is very low, limit what we show per time slot
  const allDayBookings = bookings.filter(b => 
    b.date === date && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status)
  );
  const totalDailyCapacity = groomersList.reduce((sum, g) => sum + (g.maxDailyBookings || 3), 0);
  const totalSlotsLeft = Math.max(0, totalDailyCapacity - allDayBookings.length);
  
  // If only a few slots left for the entire day, don't show more than that
  return Math.min(available, totalSlotsLeft);
}

async function renderBookingTimeSlots(date) {
  const container = document.getElementById('timeSlotsWrapper');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center; padding:2rem;"><div class="spinner"></div> Checking availability...</div>';

  const timeSlots = window.STANDARD_TIME_SLOTS || ['9am-12pm', '12pm-3pm', '3pm-6pm'];
  const selectedTime = bookingData.time;

  // Check blackout
  const blackout = typeof getCalendarBlackout === 'function' ? getCalendarBlackout(date) : null;
  if (blackout) {
    container.innerHTML = `<p style="color: var(--gray-600); text-align: center; padding: 1.5rem;">${escapeHtml(blackout.reason || 'This date is closed')} · Please pick another day.</p>`;
    return;
  }

  // Time validation: Check if selected date is today
  const selectedDate = new Date(date);
  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();

  // ============================================
  // 🕐 SCHEDULE CUTOFF LOGIC - FULL PACKAGES
  // ============================================
  // Rule: Customer can book up to 30 minutes AFTER the slot STARTS
  // Example: For "12pm-3pm" slot (starts at 12pm), cutoff is 12:30pm
  //          If current time is 12:45pm, slot is unavailable
  //          If current time is 12:15pm, slot is still available
  // ============================================
  function isTimeSlotPast(timeSlot) {
    if (!isToday) return false; // Future dates are always available

    // Parse START time of the slot (e.g. "12pm-3pm" -> "12pm")
    // Logic: Users can book up until 30 minutes AFTER the slot STARTS.
    const parts = timeSlot.split('-');
    const startTimeStr = (parts[0] || parts[0]).trim(); // Get START time

    let startHour = parseInt(startTimeStr);
    const isPM = startTimeStr.toLowerCase().includes('pm');

    // Convert to 24-hour format
    if (isPM && startHour !== 12) {
      startHour += 12;
    } else if (!isPM && startHour === 12) {
      startHour = 0;
    }

    // Cutoff time is 30 minutes AFTER the slot starts
    // e.g. 12pm-3pm start -> cutoff 12:30pm (30 mins after 12pm)
    // e.g. 3pm-6pm start -> cutoff 3:30pm (30 mins after 3pm)
    // e.g. 9am-12pm start -> cutoff 9:30am (30 mins after 9am)
    
    let cutoffHour = startHour;
    let cutoffMinute = 30;

    // Check if current time is past the cutoff
    // If current time >= cutoff time, the slot is no longer available
    return currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute >= cutoffMinute);
  }

  // Calculate total daily capacity and remaining slots ONCE
  const groomers = await getGroomers();
  const bookings = await getBookings();
  const totalDailyCapacity = groomers.reduce((sum, g) => sum + (g.maxDailyBookings || 3), 0);
  const allDayBookings = bookings.filter(b => 
    b.date === date && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status)
  );
  let totalSlotsRemaining = Math.max(0, totalDailyCapacity - allDayBookings.length);

  const timeSlotPromises = timeSlots.map(async time => {
    const isPast = isTimeSlotPast(time);
    let availableSlots = 0;
    
    if (!isPast) {
      // Get groomer availability for this time slot
      const groomersList = await getGroomers();
      const activeGroomers = typeof getActiveGroomers === 'function' ? await getActiveGroomers(date) : groomersList;
      const bookedIds = bookings.filter(b =>
        b.date === date && b.time === time && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status)
      ).map(b => b.groomerId).filter(Boolean);
      const groomersAvailable = activeGroomers.filter(g => !bookedIds.includes(g.id)).length;
      
      // Show minimum of: groomers available OR total slots remaining
      availableSlots = Math.min(groomersAvailable, totalSlotsRemaining);
      
      // Reduce remaining slots for next time slot
      totalSlotsRemaining = Math.max(0, totalSlotsRemaining - availableSlots);
    }
    
    const isSelected = selectedTime === time;
    const isAvailable = availableSlots > 0 && !isPast;

    return `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
        <button type="button" 
                data-time="${time}"
                class="time-slot ${isSelected ? 'selected' : ''} ${isPast ? 'past-slot' : ''}" 
                onclick="selectTime('${time}')"
                ${!isAvailable ? 'disabled' : ''}>
          ${time}
        </button>
        <div style="font-size: 0.85rem; color: ${isAvailable ? 'var(--gray-700)' : (isPast ? '#d32f2f' : 'var(--gray-500)')}; font-weight: ${isAvailable ? '600' : '400'};">
          ${isPast ? 'Time Passed' : (isAvailable ? `${availableSlots} Slot${availableSlots !== 1 ? 's' : ''}` : 'Fully booked')}
        </div>
      </div>
    `;
  });

  const timeSlotHTMLs = await Promise.all(timeSlotPromises);

  container.innerHTML = `
    <div class="time-slots-picker" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; box-sizing: border-box; padding-bottom: 0.5rem;">
      <h4 style="margin-bottom: 1rem; text-align:center;">Select Time for ${formatDate(date)}</h4>
      <div class="time-slots" style="display: flex; gap: 1rem; width: max-content; min-width: 100%;">
        ${timeSlotHTMLs.join('')}
      </div>
    </div>
  `;
}
// Calendar time picker handles time slot updates

// Select time
function selectTime(time) {
  bookingData.time = time;

  // Update UI
  document.querySelectorAll('.time-slot').forEach(slot => {
    if (slot.dataset.time === time) {
      slot.classList.add('selected');
    } else {
      slot.classList.remove('selected');
    }
  });

  updateSummary();
  enableNextButton();
  
  // Auto-submit in reschedule mode when time is selected
  if (isRescheduleMode && bookingData.date && bookingData.time) {
    // Show confirmation before auto-submitting
    customAlert.confirm('Confirm Reschedule', `Reschedule to ${bookingData.date} at ${time}?`).then(confirmed => {
      if (confirmed) {
        autoSubmitReschedule();
      }
    });
  }
}

// Auto-submit reschedule without going through step 5
async function autoSubmitReschedule() {
  if (!isRescheduleMode || !rescheduleData) return;
  
  try {
    // Show loading
    if (typeof showLoadingOverlay === 'function') {
      showLoadingOverlay();
    }
    
    // Get the original booking and update it
    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === rescheduleData.originalBookingId);
    
    if (!booking) {
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      customAlert.error('Error', 'Original booking not found');
      return;
    }
    
    // Update only the date and time
    booking.date = bookingData.date;
    booking.time = bookingData.time;
    booking.status = 'confirmed'; // Auto-confirm since admin is doing the reschedule
    
    // Save the updated booking
    if (typeof updateBooking === 'function') {
      await updateBooking(booking);
    } else {
      await saveBookings(bookings);
    }
    
    // Log the reschedule action
    if (typeof logBookingHistory === 'function') {
      logBookingHistory({
        bookingId: booking.id,
        action: 'Rescheduled',
        message: `Rescheduled from ${rescheduleData.currentDate} ${rescheduleData.currentTime} to ${booking.date} ${booking.time}`,
        actor: 'Admin'
      });
    }
    
    // Clear reschedule data
    sessionStorage.removeItem('rescheduleData');
    
    // Hide loading
    if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
    
    // Show success and redirect back to admin
    await customAlert.success('Rescheduled!', `Booking moved to ${booking.date} at ${booking.time}`);
    window.location.href = 'admin-dashboard.html';
    
  } catch (error) {
    console.error('Reschedule error:', error);
    if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
    customAlert.error('Error', 'Failed to reschedule booking. Please try again.');
  }
}

// Update summary
async function updateSummary() {
  console.log('updateSummary called with bookingData:', bookingData);
  const summaryContainer = document.getElementById('bookingSummary');
  if (!summaryContainer) {
    console.log('No bookingSummary container found');
    return;
  }

  const packages = await getPackages();
  const selectedPackage = packages.find(p => p.id === bookingData.packageId);
  console.log('Selected package:', selectedPackage);

  const user = await getCurrentUser();
  const warningInfo = user ? await getCustomerWarningInfo(user.id) : { warnings: 0 };

  let summaryHTML = '<div class="summary-card"><h3 style="margin-bottom: 1rem;">Booking Summary</h3>';

  // Show warning count if user has warnings
  if (warningInfo && warningInfo.warnings > 0) {
    const warningText = warningInfo.isBanned ? ' - account on hold' : '';
    summaryHTML += `
      <div class="summary-alert" style="display: flex; align-items: center; gap: 0.5rem;">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span>${warningInfo.warnings}/5 warnings${warningText}.</span>
      </div>
    `;
  }
  
  if (bookingData.petType) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Pet Type:</span>
        <span class="summary-value">${escapeHtml(bookingData.petType.charAt(0).toUpperCase() + bookingData.petType.slice(1))}</span>
      </div>
    `;
  }

  if (selectedPackage) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Package:</span>
        <span class="summary-value">${escapeHtml(selectedPackage.name)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Duration:</span>
        <span class="summary-value">${selectedPackage.duration} min</span>
      </div>
    `;

    // Show includes
    if (selectedPackage.includes && selectedPackage.includes.length > 0) {
      summaryHTML += `
        <div class="summary-item">
          <span class="summary-label">Includes:</span>
          <div style="font-size: 0.85rem; color: var(--gray-700); line-height: 1.4;">
            ${selectedPackage.includes.map(item => `${escapeHtml(item)}`).join(', ')}
          </div>
        </div>
      `;
    }

    // Show price based on selected weight, or range if no weight selected
    if (selectedPackage.tiers && selectedPackage.tiers.length > 0) {
      let priceDisplay = '';
      
      if (bookingData.petWeight) {
        // Weight is selected - show the specific price for that weight
        const selectedTier = selectedPackage.tiers.find(t => t.label === bookingData.petWeight);
        if (selectedTier) {
          priceDisplay = formatCurrency(selectedTier.price);
        } else {
          // Fallback to range if weight doesn't match any tier
          const minPrice = Math.min(...selectedPackage.tiers.map(t => t.price));
          const maxPrice = Math.max(...selectedPackage.tiers.map(t => t.price));
          priceDisplay = `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`;
        }
      } else {
        // No weight selected - show price range
        const minPrice = Math.min(...selectedPackage.tiers.map(t => t.price));
        const maxPrice = Math.max(...selectedPackage.tiers.map(t => t.price));
        priceDisplay = `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`;
      }
      
      // Price range removed - total amount shown at bottom instead
    }
  }

  if (bookingData.date && bookingData.time) {

  }

  if (bookingData.date) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Date:</span>
        <span class="summary-value">${formatDate(bookingData.date)}</span>
      </div>
    `;
  }

  if (bookingData.time) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Time:</span>
        <span class="summary-value">${formatTime(bookingData.time)}</span>
      </div>
    `;
  }

  if (bookingData.ownerName) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Owner:</span>
        <span class="summary-value">${escapeHtml(bookingData.ownerName)}</span>
      </div>
    `;
  }

  if (bookingData.contactNumber) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Contact:</span>
        <span class="summary-value">${escapeHtml(bookingData.contactNumber)}</span>
      </div>
    `;
  }

  if (bookingData.petName) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Pet:</span>
        <span class="summary-value">${escapeHtml(bookingData.petName)}</span>
      </div>
    `;
  }

  if (bookingData.petWeight) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Weight:</span>
        <span class="summary-value">${escapeHtml(bookingData.petWeight)}</span>
      </div>
    `;
  }

  // ============================================
  // 🔧 REFERENCE CUT DISPLAY - Text only (no image for faster loading)
  // ============================================
  if (bookingData.referenceCut) {
    const cutId = bookingData.referenceCut;
    let cutDisplayName = cutId;
    
    // Convert ID to display name using getReferenceCutName
    cutDisplayName = typeof getReferenceCutName === 'function' 
      ? getReferenceCutName(cutId) 
      : (typeof window.getReferenceCutName === 'function' ? window.getReferenceCutName(cutId) : cutId);
    
    summaryHTML += `
      <div class="summary-item" style="flex-direction: column; align-items: flex-start;">
        <span class="summary-label">✂️ Reference Cut:</span>
        <div style="background: #e8f5e9; padding: 0.5rem 0.75rem; border-radius: 6px; border: 2px solid #4CAF50; margin-top: 0.25rem;">
          <span style="color: #2e7d32; font-weight: 600;">${escapeHtml(cutDisplayName)}</span>
        </div>
      </div>
    `;
  }

  if (bookingData.bookingNotes && bookingData.bookingNotes.trim()) {
    // Filter out the cut name from notes if it's already displayed above
    let notesToDisplay = bookingData.bookingNotes.trim();
    if (bookingData.referenceCut) {
      const cutId = bookingData.referenceCut;
      let cutDisplayName = cutId;
      // Get display name for filtering notes
      cutDisplayName = typeof getReferenceCutName === 'function' 
        ? getReferenceCutName(cutId) 
        : (typeof window.getReferenceCutName === 'function' ? window.getReferenceCutName(cutId) : cutId);
      // Remove the cut name from notes if it's the first line
      const lines = notesToDisplay.split('\n');
      if (lines[0].trim() === cutDisplayName) {
        lines.shift();
        notesToDisplay = lines.join('\n').trim();
      }
    }
    
    if (notesToDisplay) {
      summaryHTML += `
        <div class="summary-item" style="flex-direction: column; align-items: flex-start;">
          <span class="summary-label">📝 Special Notes:</span>
          <div style="background: #fff3e0; padding: 0.5rem 0.75rem; border-radius: 6px; border: 2px solid #ff9800; margin-top: 0.25rem;">
            <span style="color: #e65100; font-weight: 500;">${escapeHtml(notesToDisplay)}</span>
          </div>
        </div>
      `;
    }
  }

  const shouldComputeCost = bookingData.packageId
    ? (bookingData.packageId === SINGLE_SERVICE_PACKAGE_ID
      ? bookingData.singleServices.length > 0 && !!bookingData.petWeight
      : !!bookingData.petWeight)
    : false;

  // Compute cost if needed (async)
  let costEstimate = null;
  if (shouldComputeCost) {
    try {
      costEstimate = computeBookingCost(bookingData.packageId, bookingData.petWeight, bookingData.addOns, bookingData.singleServices);
    } catch (err) {
      console.error('Error computing cost:', err);
      costEstimate = null;
    }
  }

  if (isSingleServicePackage() && !bookingData.singleServices.length) {
    summaryHTML += `<p style="color: var(--warning-600); font-size: 0.85rem;">Please tick at least one single service option.</p>`;
  }

  if (costEstimate) {
    const addOnSummary = costEstimate.addOns.length
      ? costEstimate.addOns.map(addon => `${escapeHtml(addon.label)} (${formatCurrency(addon.price)})`).join(', ')
      : 'None';
    const isSingleSvc = isSingleServicePackage();
    const servicesTotal = costEstimate.services?.reduce((sum, s) => sum + (s.price || 0), 0) || 0;
    
    summaryHTML += `
      <div class="summary-divider" style="margin: 1rem 0; border-top: 1px solid var(--gray-200);"></div>
      ${isSingleSvc && costEstimate.services?.length ? `
        <div class="summary-item">
          <span class="summary-label">Selected Services:</span>
          <span class="summary-value">${costEstimate.services.map(service => escapeHtml(service.label)).join(', ')}</span>
        </div>
      ` : `
        <div class="summary-item">
          <span class="summary-label">Package (${escapeHtml(costEstimate.weightLabel)}):</span>
          <span class="summary-value">${formatCurrency(costEstimate.packagePrice)}</span>
        </div>
      `}
      <div class="summary-item">
        <span class="summary-label">Add-ons:</span>
        <span class="summary-value">${addOnSummary}</span>
      </div>
      <div class="summary-item" style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid var(--gray-300); font-weight: 600; color: var(--primary, #000);">
        <span class="summary-label">Total Amount:</span>
        <span class="summary-value">${formatCurrency(costEstimate.totalAmount || costEstimate.subtotal)}</span>
      </div>
      ${costEstimate.bookingFee ? `
      <div class="summary-item" style="margin-top: 0.5rem; padding: 0.5rem; background: #fff3e0; border-left: 3px solid #ff9800; color: #e65100;">
        <span class="summary-label">Booking Fee Discount:</span>
        <span class="summary-value">-${formatCurrency(costEstimate.bookingFee)}</span>
      </div>
      ` : ''}
      <div class="summary-item" style="margin-top: 0.5rem; padding-top: 0.5rem; font-weight: 700; color: var(--success-600); font-size: 1.1rem;">
        <span class="summary-label">Amount to Pay:</span>
        <span class="summary-value">${formatCurrency((costEstimate.totalAmount || costEstimate.subtotal) - costEstimate.bookingFee)}</span>
      </div>
    `;
    if (isSingleServicePackage() && (!bookingData.petWeight || costEstimate.services?.some(service => service.requiresWeight))) {
      summaryHTML += `
        <p style="color: var(--warning-600); font-size: 0.85rem; margin-top: 0.5rem;">
          Select the pet's weight to finalize the single-service pricing.
        </p>
      `;
    }
  } else if (bookingData.packageId) {
    summaryHTML += `
      <p style="color: var(--gray-500); font-size: 0.85rem; margin-top: 0.5rem;">
        Select a weight bracket to preview your estimated total.
      </p>
    `;
  }

  summaryHTML += '</div>';
  summaryContainer.innerHTML = summaryHTML;

  // Add booking fee explanation note after summary (only once)
  let explanationDiv = summaryContainer.parentElement.querySelector('[data-booking-fee-explanation]');
  if (!explanationDiv) {
    explanationDiv = document.createElement('div');
    explanationDiv.setAttribute('data-booking-fee-explanation', 'true');
    explanationDiv.style.cssText = 'margin-top: 1rem; padding: 0.75rem; background: var(--info-light, #e3f2fd); border-left: 3px solid var(--info, #2196f3); font-size: 0.85rem; color: var(--gray-700); line-height: 1.5;';
    explanationDiv.innerHTML = `💡 <strong>Booking Fee Explanation:</strong> The ${formatCurrency(100)} booking fee is included in the "Amount to Pay" above and will be deducted from your final bill upon arrival. This helps secure your appointment slot.`;
    summaryContainer.parentElement.insertBefore(explanationDiv, summaryContainer.nextSibling);
  }

  // Add Quick Rebook section below booking fee explanation (only on mobile)
  let quickRebookDiv = summaryContainer.parentElement.querySelector('[data-quick-rebook]');
  if (!quickRebookDiv) {
    quickRebookDiv = document.createElement('div');
    quickRebookDiv.setAttribute('data-quick-rebook', 'true');
    quickRebookDiv.style.cssText = 'margin-top: 1rem; padding: 1rem; background: linear-gradient(135deg, rgba(46, 125, 50, 0.08), rgba(76, 175, 80, 0.08)); border: 1px solid #c8e6c9; border-radius: var(--radius-sm); display: none;';
    quickRebookDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
        <span style="font-size: 1.2rem;">🚀</span>
        <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: #2e7d32;">Quick Rebook</h4>
      </div>
      <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem; color: var(--gray-700);">We saved your latest profile so you can book again without retyping the details.</p>
      <button class="btn btn-sm" style="width: 100%; background: #2e7d32; color: white; border: none; padding: 0.75rem; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600; font-size: 0.9rem;" onclick="handleQuickRebook()">Use Saved Details</button>
    `;
    summaryContainer.parentElement.insertBefore(quickRebookDiv, explanationDiv.nextSibling);
  }

  // Show Quick Rebook on mobile only
  if (quickRebookDiv) {
    const isMobile = window.innerWidth <= 768;
    quickRebookDiv.style.display = isMobile ? 'block' : 'none';
  }
}

// Enable submit button if all required fields are complete
function enableSubmitButton() {
  const submitBtn = document.getElementById('submitBooking');
  if (!submitBtn) return;

  // Sync form data first
  syncFormToBookingData();
  
  // In reschedule mode, only require date and time to be changed
  if (isRescheduleMode) {
    const rescheduleValid = !!bookingData.date && !!bookingData.time;
    
    if (rescheduleValid) {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('disabled');
      submitBtn.textContent = 'Submit Reschedule';
      submitBtn.style.opacity = '1';
    } else {
      submitBtn.disabled = true;
      submitBtn.setAttribute('disabled', 'disabled');
      submitBtn.textContent = 'Select date and time';
      submitBtn.style.opacity = '0.5';
    }
    return;
  }
  
  // Check basic required fields
  const basicFieldsValid = 
    !!bookingData.petType &&
    !!bookingData.packageId &&
    !!bookingData.date &&
    !!bookingData.time &&
    !!bookingData.ownerName?.trim() &&
    !!bookingData.contactNumber?.trim() &&
    !!bookingData.petName?.trim();
  
  // Check vaccination status - at least one option must be selected (vaccine OR not vaccinated)
  const antiRabies = document.getElementById('vaccAntiRabies');
  const antiParvo = document.getElementById('vaccAntiParvo');
  const notVaccinated = document.getElementById('vaccNotVaccinated');
  
  console.log('[enableSubmitButton] Vaccination elements:', {
    antiRabies: antiRabies ? 'found' : 'not found',
    antiParvo: antiParvo ? 'found' : 'not found', 
    notVaccinated: notVaccinated ? 'found' : 'not found',
    antiRabiesChecked: antiRabies?.checked,
    antiParvoChecked: antiParvo?.checked,
    notVaccinatedChecked: notVaccinated?.checked
  });
  
  // Vaccination is valid if ANY checkbox is selected (vaccine or not vaccinated)
  const vaccinationValid = antiRabies?.checked || antiParvo?.checked || notVaccinated?.checked;
  
  // Check single services if single service package
  let singleServicesValid = true;
  if (bookingData.packageId === 'single-service') {
    singleServicesValid = bookingData.singleServices && bookingData.singleServices.length > 0;
  }
  
  // Check reference cut if Face Trim is selected (for single-service only)
  // Also check bookingData.referenceCut in case it was loaded from profile
  let referenceCutValid = true;
  if (bookingData.packageId === 'single-service' && 
      bookingData.singleServices && 
      bookingData.singleServices.includes('face')) {
    const referenceCutInputs = document.querySelectorAll('input[name="referenceCut"]:checked');
    referenceCutValid = referenceCutInputs.length > 0 || !!bookingData.referenceCut;
  }
  
  const isValid = basicFieldsValid && vaccinationValid && singleServicesValid && referenceCutValid;
  
  console.log('[enableSubmitButton] DETAILED VALIDATION:', {
    '=== BASIC FIELDS ===': '',
    petType: bookingData.petType || 'MISSING',
    packageId: bookingData.packageId || 'MISSING',
    date: bookingData.date || 'MISSING',
    time: bookingData.time || 'MISSING',
    ownerName: bookingData.ownerName?.trim() || 'MISSING',
    contactNumber: bookingData.contactNumber?.trim() || 'MISSING',
    petName: bookingData.petName?.trim() || 'MISSING',
    basicFieldsValid: basicFieldsValid,
    '=== VACCINATION ===': '',
    antiRabiesChecked: antiRabies?.checked || false,
    antiParvoChecked: antiParvo?.checked || false,
    notVaccinatedChecked: notVaccinated?.checked || false,
    vaccinationValid: vaccinationValid,
    '=== SINGLE SERVICES ===': '',
    isSingleService: bookingData.packageId === 'single-service',
    singleServices: bookingData.singleServices || [],
    singleServicesValid: singleServicesValid,
    '=== REFERENCE CUT ===': '',
    needsReferenceCut: bookingData.packageId === 'single-service' && bookingData.singleServices?.includes('face'),
    referenceCutInputsCount: document.querySelectorAll('input[name="referenceCut"]:checked').length,
    referenceCutValid: referenceCutValid,
    '=== FINAL RESULT ===': '',
    isValid: isValid
  });

  if (isValid) {
    submitBtn.disabled = false;
    submitBtn.removeAttribute('disabled');
    submitBtn.textContent = 'Submit Booking';
    submitBtn.style.opacity = '1';
  } else {
    submitBtn.disabled = true;
    submitBtn.setAttribute('disabled', 'disabled');
    
    // Show specific message based on what's missing
    let message = 'Complete all fields to submit';
    if (!basicFieldsValid) {
      message = 'Fill in all required information';
    } else if (!vaccinationValid) {
      message = 'Confirm vaccination status';
    } else if (!singleServicesValid) {
      message = 'Select at least one service';
    } else if (!referenceCutValid) {
      message = 'Select reference cut for Face Trim';
    }
    
    submitBtn.textContent = message;
    submitBtn.style.opacity = '0.6';
  }
}

// Enable next button if step is valid
function enableNextButton() {
  const nextBtn = document.getElementById('nextBtn');
  if (!nextBtn) return;

  let isValid = false;
  switch (currentStep) {
    case 1:
      // Policy agreement step - check if checkbox is checked (skip in reschedule mode)
      if (isRescheduleMode) {
        isValid = true;
        break;
      }
      const policyCheckbox = document.getElementById('agreeToPolicy');
      isValid = policyCheckbox && policyCheckbox.checked;
      break;
    case 2:
      isValid = !!bookingData.petType;
      break;
    case 3:
      isValid = !!bookingData.packageId;
      if (isValid && bookingData.packageId === SINGLE_SERVICE_PACKAGE_ID) {
        isValid = bookingData.singleServices.length > 0;
      }
      break;
    case 4:
      isValid = !!bookingData.date && !!bookingData.time;
      break;
    case 5:
      isValid = !!bookingData.ownerName.trim() && !!bookingData.contactNumber.trim() && !!bookingData.petName.trim();
      break;
  }

  if (isValid) {
    nextBtn.disabled = false;
    nextBtn.removeAttribute('disabled');
  } else {
    nextBtn.disabled = true;
    nextBtn.setAttribute('disabled', 'disabled');
  }
}

// Start cooldown countdown on submit button
function startSubmitButtonCooldown(submitBtn) {
  if (!submitBtn) return;
  
  let timeLeft = SUBMIT_COOLDOWN_MS / 1000; // Convert to seconds
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.5';
  
  const countdownInterval = setInterval(() => {
    timeLeft--;
    
    if (timeLeft > 0) {
      submitBtn.textContent = `Please wait ${timeLeft}s...`;
    } else {
      clearInterval(countdownInterval);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Booking';
      submitBtn.style.opacity = '1';
    }
  }, 1000);
}

// ============================================
// 📝 SUBMIT BOOKING - AJAX-Style with Database-Backed Status
// ============================================
// Uses database-backed submission status to prevent duplicates
// Status flow: idle -> submitting -> success/failed -> idle
// Each submission has a unique token for tracking
// ============================================
async function submitBooking(event) {
  console.log('[submitBooking] Starting booking submission...');
  
  // Get user info for logging
  const user = await getCurrentUser().catch(() => null);
  const userId = user?.id || 'anonymous';
  
  // ============================================
  // 🛡️ DATABASE-BACKED DUPLICATE PREVENTION
  // ============================================
  // Check submission status from database (not just local variable)
  // This prevents duplicates even across page refreshes
  // ============================================
  const now = Date.now();
  const timeSinceLastSubmit = now - lastSubmitTime;
  
  // Log submission attempt
  if (typeof BookingSecurityLogger !== 'undefined') {
    BookingSecurityLogger.log('submission_attempt', {
      userId: userId,
      isSubmitting: isSubmittingBooking,
      timeSinceLastSubmit: timeSinceLastSubmit,
      cooldownRemaining: Math.max(0, SUBMIT_COOLDOWN_MS - timeSinceLastSubmit)
    });
  }
  
  // ============================================
  // CHECK 1: Local flag (fast check)
  // ============================================
  if (isSubmittingBooking) {
    console.log('[submitBooking] BLOCKED - Local flag: Already submitting');
    
    if (typeof BookingSecurityLogger !== 'undefined') {
      BookingSecurityLogger.log('blocked_already_submitting', {
        userId: userId,
        reason: 'Local flag: Concurrent submission attempt blocked'
      });
    }
    
    return;
  }
  
  // ============================================
  // CHECK 2: Database status (reliable check)
  // ============================================
  if (typeof canSubmit === 'function' && !canSubmit(userId)) {
    console.log('[submitBooking] BLOCKED - Database status: Submission in progress');
    
    const currentStatus = typeof getSubmissionStatus === 'function' ? getSubmissionStatus() : null;
    
    if (typeof BookingSecurityLogger !== 'undefined') {
      BookingSecurityLogger.log('blocked_database_status', {
        userId: userId,
        reason: 'Database status: Another submission in progress',
        currentStatus: currentStatus?.status,
        currentToken: currentStatus?.token
      });
    }
    
    const submitBtn = document.getElementById('submitBooking');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';
      submitBtn.style.opacity = '0.5';
    }
    return;
  }
  
  // ============================================
  // CHECK 3: Cooldown (rate limiting)
  // ============================================
  if (timeSinceLastSubmit < SUBMIT_COOLDOWN_MS) {
    const timeLeft = Math.ceil((SUBMIT_COOLDOWN_MS - timeSinceLastSubmit) / 1000);
    console.log('[submitBooking] BLOCKED - Cooldown active. Time left:', timeLeft, 'seconds');
    
    if (typeof BookingSecurityLogger !== 'undefined') {
      BookingSecurityLogger.log('blocked_cooldown', {
        userId: userId,
        timeLeft: timeLeft,
        timeSinceLastSubmit: timeSinceLastSubmit,
        cooldownMs: SUBMIT_COOLDOWN_MS
      });
    }
    
    const submitBtn = document.getElementById('submitBooking');
    if (submitBtn && timeLeft > 0) {
      submitBtn.disabled = true;
      submitBtn.textContent = `Please wait ${timeLeft}s...`;
      submitBtn.style.opacity = '0.5';
    }
    return;
  }
  
  // ============================================
  // ✅ START SUBMISSION - Lock in database
  // ============================================
  // Get submission token from database (atomic operation)
  // This ensures only one submission can proceed
  // ============================================
  let submissionToken = null;
  if (typeof startSubmission === 'function') {
    submissionToken = startSubmission(userId);
    if (!submissionToken) {
      console.log('[submitBooking] BLOCKED - Could not acquire submission lock');
      
      if (typeof BookingSecurityLogger !== 'undefined') {
        BookingSecurityLogger.log('blocked_lock_failed', {
          userId: userId,
          reason: 'Could not acquire submission lock from database'
        });
      }
      
      const submitBtn = document.getElementById('submitBooking');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Please wait...';
        submitBtn.style.opacity = '0.5';
        
        // Re-enable after 2 seconds
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Booking';
          submitBtn.style.opacity = '1';
        }, 2000);
      }
      return;
    }
  }
  
  // Set local flag
  isSubmittingBooking = true;
  lastSubmitTime = now;
  
  console.log('[submitBooking] Submission started with token:', submissionToken);
  
  // Log submission start
  if (typeof BookingSecurityLogger !== 'undefined') {
    BookingSecurityLogger.log('submission_started', {
      userId: userId,
      packageId: bookingData.packageId,
      petType: bookingData.petType,
      date: bookingData.date,
      time: bookingData.time
    });
  }
  const submitBtn = document.getElementById('submitBooking');
  
  // 🔧 REMOVED beforeunload listener - it was causing "Leave site?" warnings during normal submission
  // The loading overlay and button disabling already prevent accidental navigation
  // If we need to prevent navigation, we can add it back with a more reliable approach
  
  // Placeholder for compatibility with existing code that references these
  let isRedirecting = true; // Always true to skip any remaining beforeunload checks
  const preventNavigation = () => {}; // No-op function
  
  try {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();

    // ============================================
    // 🚀 NON-BLOCKING UI UPDATES
    // Update UI immediately, then process in background
    // ============================================
    
    // Show loading state on submit button (immediate)
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      submitBtn.style.opacity = '0.7';
      submitBtn.style.pointerEvents = 'none';
    }

    // Show loading overlay with progress (immediate)
    if (typeof showLoadingOverlay === 'function') {
      showLoadingOverlay('Preparing booking...');
    }

    // ============================================
    // 🔄 ASYNC VALIDATION (NON-BLOCKING)
    // Run validation in next tick to avoid blocking UI
    // ============================================
    await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI thread

    // Sync form data before validation
    syncFormToBookingData();
    console.log('[submitBooking] Form data synced');

    // Update loading message
    if (typeof showLoadingOverlay === 'function') {
      showLoadingOverlay('Validating information...');
    }

    // Comprehensive validation before submission
    const basicFieldsComplete = 
      !!bookingData.petType &&
      !!bookingData.packageId &&
      !!bookingData.date &&
      !!bookingData.time &&
      !!bookingData.ownerName?.trim() &&
      !!bookingData.contactNumber?.trim() &&
      !!bookingData.petName?.trim();
    
    // Check vaccination status - at least one option must be selected (vaccine OR not vaccinated)
    const antiRabies = document.getElementById('vaccAntiRabies');
    const antiParvo = document.getElementById('vaccAntiParvo');
    const notVaccinated = document.getElementById('vaccNotVaccinated');
    const vaccinationComplete = antiRabies?.checked || antiParvo?.checked || notVaccinated?.checked;
    
    // Check single services if single service package
    let singleServicesComplete = true;
    if (bookingData.packageId === 'single-service') {
      singleServicesComplete = bookingData.singleServices && bookingData.singleServices.length > 0;
    }
    
    // Check reference cut if Face Trim is selected (also check bookingData.referenceCut)
    let referenceCutComplete = true;
    if (bookingData.packageId === 'single-service' && 
        bookingData.singleServices && 
        bookingData.singleServices.includes('face')) {
      const referenceCutInputs = document.querySelectorAll('input[name="referenceCut"]:checked');
      referenceCutComplete = referenceCutInputs.length > 0 || !!bookingData.referenceCut;
    }
    
    const isComplete = basicFieldsComplete && vaccinationComplete && singleServicesComplete && referenceCutComplete;
    
    if (!isComplete) {
      console.log('[submitBooking] Form incomplete, cannot submit:', {
        basicFieldsComplete,
        vaccinationComplete,
        singleServicesComplete,
        referenceCutComplete
      });
      
      // Hide loading overlay
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.pointerEvents = 'auto';
        
        // Show specific message
        let message = 'Complete all fields to submit';
        if (!basicFieldsComplete) {
          message = 'Fill in all required information';
        } else if (!vaccinationComplete) {
          message = 'Confirm vaccination status';
        } else if (!singleServicesComplete) {
          message = 'Select at least one service';
        } else if (!referenceCutComplete) {
          message = 'Select reference cut for Face Trim';
        }
        
        submitBtn.textContent = message;
        submitBtn.style.opacity = '0.6';
      }
      return;
    }
    console.log('[submitBooking] Form validation passed');

    // Show loading overlay with enhanced message
    if (typeof showLoadingOverlay === 'function') {
      showLoadingOverlay('Validating booking information...');
    }

    // Ensure user is authenticated before creating booking
    console.log('[submitBooking] Checking authentication...');
    if (typeof getCurrentUser !== 'function') {
      console.error('[submitBooking] getCurrentUser function not available');
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Booking';
        submitBtn.style.opacity = '1';
      }
      customAlert.error('System Error', 'Error: Authentication system not loaded. Please refresh the page and try again.');
      return;
    }

    const user = await getCurrentUser();
    console.log('[submitBooking] Current user:', user ? 'authenticated' : 'not authenticated');
    
    if (!user) {
      console.log('[submitBooking] No user found, redirecting to signup');
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Booking';
        submitBtn.style.opacity = '1';
      }
      await customAlert.show('Login Required', 'Please create an account or log in to submit your booking.', 'warning');
      sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
      sessionStorage.setItem('bookingStep', '5');
      
      // Mark as redirecting to prevent leave site warning
      isRedirecting = true;
      window.removeEventListener('beforeunload', preventNavigation);
      
      if (typeof redirect === 'function') {
        redirect('signup.html?return=booking.html');
      } else {
        window.location.href = 'signup.html?return=booking.html';
      }
      return;
    }

    // Check ban/warnings (skip for admin walk-in mode)
    const bookingUrlParams = new URLSearchParams(window.location.search);
    const isAdminWalkIn = bookingUrlParams.get('source') === 'admin';
    const isAdmin = user.role === 'admin' || user.isAdmin;
    
    console.log('[submitBooking] Checking user warnings...', { isAdminWalkIn, isAdmin });
    
    if (!isAdminWalkIn || !isAdmin) {
      const warningInfo = await getCustomerWarningInfo(user.id);
      console.log('[submitBooking] Warning info:', warningInfo);
      if (warningInfo?.isBanned) {
        console.log('[submitBooking] User is banned, redirecting');
        if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Booking';
          submitBtn.style.opacity = '1';
        }
        
        // Redirect to appropriate dashboard
        const dashboardUrl = isAdmin ? 'admin-dashboard.html' : 'customer-dashboard.html';
        const dashboardName = isAdmin ? 'admin dashboard' : 'customer dashboard';
        
        await customAlert.error('Account Banned', `Your account is temporarily banned. Please check your ${dashboardName} for instructions on how to lift the ban.`);
        
        // Mark as redirecting to prevent leave site warning
        isRedirecting = true;
        window.removeEventListener('beforeunload', preventNavigation);
        
        redirect(dashboardUrl);
        return;
      }
    } else {
      console.log('[submitBooking] Skipping warning check for admin walk-in');
    }

    if (typeof isCalendarBlackout === 'function' && isCalendarBlackout(bookingData.date)) {
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      customAlert.warning('Date Unavailable', 'This date has been closed by the admin. Please choose another slot.');
      return;
    }

    // Validate that the selected date is not in the past
    const selectedDate = new Date(bookingData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      customAlert.warning('Invalid Date', 'Please select a date in the future. You cannot book appointments for past dates.');
      return;
    }

    console.log('[submitBooking] Loading packages and creating booking...');
    const packages = await getPackages();
    const selectedPackage = packages.find(p => p.id === bookingData.packageId);
    console.log('[submitBooking] Selected package:', selectedPackage);

    const profile = {
      ownerName: bookingData.ownerName.trim(),
      contactNumber: bookingData.contactNumber.trim(),
      address: bookingData.ownerAddress.trim(),
      petName: bookingData.petName.trim(),
      breed: bookingData.petBreed.trim(),
      age: bookingData.petAge.trim(),
      weight: bookingData.petWeight || '',
      medical: bookingData.medicalNotes.trim(),
      vaccinations: bookingData.vaccinationNotes.trim(),
      vaccinationStatus: bookingData.vaccinationStatus || '',
      // 🔧 ALL SERVICES PROFILE FIX: Include ALL service selections in saved profile
      singleServices: bookingData.singleServices || [],
      addOns: bookingData.addOns || [],
      referenceCut: bookingData.referenceCut || null,
      packageId: bookingData.packageId || null,
      petType: bookingData.petType || null
      // Note: Now saving ALL services (single services, add-ons, reference cuts) for complete profile restoration
    };

    if (bookingData.saveProfile) {
      await saveCustomerProfile(user.id, profile);
    }

    // Calculate cost details before creating booking
    let costDetails = {
      subtotal: 0,
      totalDueToday: 0,
      balanceOnVisit: 0,
      addOns: [],
      services: [],
      packagePrice: 0,
      weightLabel: bookingData.petWeight || ''
    };

    // Calculate package price based on pet weight
    if (selectedPackage && selectedPackage.tiers && bookingData.petWeight) {
      const tier = selectedPackage.tiers.find(t => t.label === bookingData.petWeight);
      if (tier) {
        costDetails.packagePrice = tier.price;
        costDetails.subtotal = tier.price;
      } else if (selectedPackage.tiers.length > 0) {
        // Default to first tier if weight not found
        costDetails.packagePrice = selectedPackage.tiers[0].price;
        costDetails.subtotal = selectedPackage.tiers[0].price;
      }
    }

    // Add single service costs if applicable
    if (bookingData.packageId === SINGLE_SERVICE_PACKAGE_ID && bookingData.singleServices.length > 0) {
      costDetails.subtotal = 0;
      costDetails.packagePrice = 0;
      bookingData.singleServices.forEach(serviceId => {
        if (typeof getSingleServicePrice === 'function') {
          const priceInfo = getSingleServicePrice(serviceId, bookingData.petWeight || '');
          if (priceInfo.price) {
            costDetails.subtotal += priceInfo.price;
            costDetails.services.push({
              serviceId: serviceId,
              label: window.SINGLE_SERVICE_PRICING?.[serviceId]?.label || serviceId,
              price: priceInfo.price
            });
          }
        }
      });
    }

    // Calculate booking fee and balance
    const bookingFee = 100; // Booking fee as per policy
    costDetails.bookingFee = bookingFee;
    costDetails.totalDueToday = bookingFee;
    costDetails.totalAmount = costDetails.subtotal; // Total amount before deduction
    costDetails.balanceOnVisit = Math.max(0, costDetails.subtotal - bookingFee);

    // Groomer assignment happens when admin starts service, not during booking creation
    let assignedGroomerId = null;
    let assignedGroomerName = 'To be assigned';

    // Create booking object (shared)
    let booking = {
      id: generateId(),
      shortId: generateBookingCode ? generateBookingCode() : undefined,
      userId: user.id,
      petName: profile.petName,
      petType: bookingData.petType,
      packageName: selectedPackage ? selectedPackage.name : '',
      packageId: bookingData.packageId,
      date: bookingData.date,
      time: bookingData.time,
      phone: profile.contactNumber,
      customerName: profile.ownerName,
      customerEmail: profile.ownerEmail || user.email || '', // Add email field
      customerPhone: profile.contactNumber, // Add customerPhone for validation
      groomerId: assignedGroomerId,
      groomerName: assignedGroomerName,
      addOns: bookingData.addOns.slice(),
      bookingNotes: bookingData.bookingNotes,
      referenceCut: bookingData.referenceCut || null, // Reference cut style selected
      singleServices: bookingData.singleServices.slice(),
      petWeight: bookingData.petWeight || '',
      profile,
      beforeImage: '',
      afterImage: '',
      vaccinationProofImage: bookingData.vaccinationProofImage || null,
      cancellationNote: '',
      status: 'pending',
      createdAt: Date.now(),
      cost: costDetails,
      totalPrice: costDetails?.subtotal || 0,
      bookingFeePaid: costDetails?.totalDueToday || 0,
      balanceOnVisit: costDetails?.balanceOnVisit || 0,
      // Payment fields - initialized as null for new bookings
      paymentChoice: null,
      proofOfPaymentImage: null,
      proofOfPaymentUploadedAt: null,
      countdownStartedAt: null
    };

    // Handle reschedule mode
    if (isRescheduleMode && rescheduleData) {
      booking.id = rescheduleData.originalBookingId;
      booking.status = 'pending'; // Reset to pending for admin approval
      
      // IMPORTANT: Preserve the original customer's userId (don't use admin's userId)
      // Get the original booking to preserve customer ownership
      const bookings = await getBookings();
      const originalBooking = bookings.find(b => b.id === rescheduleData.originalBookingId);
      if (originalBooking && originalBooking.userId) {
        booking.userId = originalBooking.userId; // Keep original customer's userId
      }
      
      // Update the existing booking
      if (typeof updateBooking === 'function') {
        await updateBooking(booking);
      } else {
        // fallback local update
        const allBookings = await getBookings();
        const idx = allBookings.findIndex(b => b.id === rescheduleData.originalBookingId);
        if (idx >= 0) {
          allBookings[idx] = booking;
          await saveBookings(allBookings);
        }
      }
      
      // Log the reschedule action
      if (typeof logBookingHistory === 'function') {
        const actor = rescheduleData.rescheduleBy === 'admin' ? 'Admin' : 'Customer';
        
        // Format dates and times for display
        const oldDateFormatted = typeof formatDate === 'function' ? formatDate(rescheduleData.currentDate) : rescheduleData.currentDate;
        const newDateFormatted = typeof formatDate === 'function' ? formatDate(booking.date) : booking.date;
        const oldTimeFormatted = rescheduleData.currentTime || '';
        const newTimeFormatted = booking.time || '';
        
        logBookingHistory({
          bookingId: booking.id,
          action: 'Rescheduled',
          message: `Rescheduled from ${oldDateFormatted} (${oldTimeFormatted}) to ${newDateFormatted} (${newTimeFormatted})`,
          actor: actor
        });
      }
      
      // Clear reschedule data
      sessionStorage.removeItem('rescheduleData');
      
      // Hide loading overlay
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      
      // Show success message
      await customAlert.success('Booking Rescheduled', `${booking.petName}'s appointment has been rescheduled successfully.`);
      
      // Determine where to redirect based on who initiated the reschedule
      const rescheduleBy = rescheduleData.rescheduleBy || 'customer';
      
      if (rescheduleBy === 'admin') {
        // Admin reschedule - redirect to admin dashboard
        isRedirecting = true;
        window.removeEventListener('beforeunload', preventNavigation);
        window.location.href = 'admin-dashboard.html';
      } else {
        // Customer reschedule - show step 4 (date/time) to confirm the new selection
        // Clear submission lock BEFORE navigating to step 4
        isSubmittingBooking = false;
        lastSubmitTime = 0;
        
        currentStep = 4;
        showStep(4);
        
        // Show confirmation message
        customAlert.success('Reschedule Confirmed', `Your appointment has been rescheduled to ${formatDate(booking.date)} at ${formatTime(booking.time)}`);
        
        // Clear reschedule mode
        isRescheduleMode = false;
        sessionStorage.removeItem('rescheduleData');
        sessionStorage.removeItem('mode');
      }
      return;
    }

    // NEW: if editing, update existing booking instead of creating new
    const editingId = bookingData.editingBookingId || sessionStorage.getItem('editingBookingId');
    if (editingId) {
      booking.id = editingId;
      // prefer app-provided updateBooking
      if (typeof updateBooking === 'function') {
        await updateBooking(booking);
      } else {
        // fallback local update
        const bookings = await getBookings();
        const idx = bookings.findIndex(b => b.id === editingId);
        if (idx >= 0) {
          bookings[idx] = booking;
        } else {
          bookings.push(booking);
        }
        await saveBookings(bookings);
      }

      logBookingHistory({
        bookingId: booking.id,
        action: 'updated',
        message: `${user.name} updated booking ${booking.shortId || booking.id}`,
        actor: 'customer'
      });

      // Clear editing marker
      delete bookingData.editingBookingId;
      sessionStorage.removeItem('editingBookingId');

      sessionStorage.setItem('lastBooking', JSON.stringify(booking));
      
      // Check if booking came from admin walk-in and save source
      const urlParams = new URLSearchParams(window.location.search);
      const source = urlParams.get('source');
      if (source === 'admin') {
        sessionStorage.setItem('bookingSource', 'admin');
      }
      
      // Mark as redirecting to prevent leave site warning
      isRedirecting = true;
      
      // Remove navigation prevention listener before redirect
      window.removeEventListener('beforeunload', preventNavigation);
      
      // Hide loading overlay
      if (typeof hideLoadingOverlay === 'function') {
        hideLoadingOverlay();
      }
      
      redirect('booking-success.html');
      return;
    }

    // Existing create flow for new booking
    // First, check if a duplicate booking already exists (for slow connections)
    const existingBookings = await getBookings();
    const isDuplicate = existingBookings.some(b => 
      b.userId === user.id &&
      b.date === booking.date &&
      b.time === booking.time &&
      b.petName === booking.petName &&
      b.packageId === booking.packageId &&
      b.status !== 'cancelled' &&
      b.status !== 'cancelledByCustomer' &&
      b.status !== 'cancelledByAdmin' &&
      // Check if created within last 5 minutes (to catch slow connection duplicates)
      (Date.now() - b.createdAt) < (5 * 60 * 1000)
    );
    
    if (isDuplicate) {
      console.warn('[submitBooking] Duplicate booking detected, skipping creation');
      
      // ============================================
      // 🔄 DUPLICATE DETECTED - Update database status
      // ============================================
      if (typeof completeSubmissionFailed === 'function' && submissionToken) {
        completeSubmissionFailed(submissionToken, 'Duplicate booking detected');
        console.log('[submitBooking] Database status updated: DUPLICATE');
      }
      
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      
      // Show warning with clear message about what's duplicate
      await customAlert.warning(
        'Duplicate Booking', 
        `You already have a pending booking for "${booking.petName}" on ${booking.date} at ${booking.time}.\n\nPlease select a different date.`
      );
      
      // Reset submission flag so user can try again with different date
      isSubmittingBooking = false;
      
      // Go back to calendar/schedule step (step 4) so user can pick different date
      showStep(4);
      
      return;
    }
    
    // No duplicate found, proceed with SECURE creation
    console.log('[submitBooking] Creating booking with server-side validation...');
    
    // Use secure server-side creation
    if (typeof createBookingWithValidation === 'function') {
      // Server-side creation with validation and atomic transactions
      console.log('[submitBooking] Calling createBookingWithValidation with:', booking);
      const createdBooking = await createBookingWithValidation(booking);
      booking = createdBooking; // Use server-generated booking
      console.log('[submitBooking] Booking created securely with ID:', booking.id);
    } else if (typeof createBookingSecure === 'function') {
      // Fallback to basic secure creation
      const createdBooking = await createBookingSecure(booking);
      booking = createdBooking;
      console.log('[submitBooking] Booking created with server ID:', booking.id);
    } else {
      // Legacy fallback (NOT RECOMMENDED for production)
      console.warn('[submitBooking] Using legacy booking creation - NOT SECURE!');
      const bookings = await getBookings();
      bookings.push(booking);
      await saveBookings(bookings);
    }

    // Log booking history
    logBookingHistory({
      bookingId: booking.id,
      action: 'created',
      message: `${user.name} booked ${selectedPackage ? selectedPackage.name : 'a service'} with ${booking.groomerName || 'GROOMER'} on ${formatDate(booking.date)} at ${formatTime(booking.time)}`,
      actor: 'customer'
    });

    // Decrement slot count for the booked date/time
    try {
      if (typeof adjustSlotCount === 'function') {
        await adjustSlotCount(booking.date, booking.time, -1);
        console.log('[submitBooking] Decremented slot for', booking.date, booking.time);
      }
    } catch (slotError) {
      console.warn('[submitBooking] Failed to decrement slot:', slotError);
    }

    // Clear old booking data first, then store new booking for success page
    sessionStorage.removeItem('lastBooking');
    // Add timestamp to ensure fresh data
    booking._savedAt = Date.now();
    sessionStorage.setItem('lastBooking', JSON.stringify(booking));
    console.log('[submitBooking] Saved NEW booking to sessionStorage:', {
      id: booking.id,
      petName: booking.petName,
      referenceCut: booking.referenceCut,
      bookingNotes: booking.bookingNotes,
      paymentChoice: booking.paymentChoice,
      _savedAt: booking._savedAt
    });

    // Check if booking came from admin walk-in and save source
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source');
    if (source === 'admin') {
      sessionStorage.setItem('bookingSource', 'admin');
    }

    // Start cooldown countdown before redirect
    if (submitBtn) {
      startSubmitButtonCooldown(submitBtn);
    }
    
    // Hide loading overlay before redirect
    if (typeof hideLoadingOverlay === 'function') {
      hideLoadingOverlay();
    }
    
    // ============================================
    // ✅ SUBMISSION SUCCESS - Update database status
    // ============================================
    // Mark submission as successful in database
    if (typeof completeSubmissionSuccess === 'function' && submissionToken) {
      completeSubmissionSuccess(submissionToken, booking.id);
      console.log('[submitBooking] Database status updated: SUCCESS');
    }
    
    // Log successful submission
    if (typeof BookingSecurityLogger !== 'undefined') {
      BookingSecurityLogger.log('submission_success', {
        userId: userId,
        bookingId: booking.id,
        submissionToken: submissionToken,
        packageId: bookingData.packageId,
        totalPrice: booking.totalPrice,
        submissionDuration: Date.now() - now
      });
    }
    
    // Mark as redirecting to prevent leave site warning
    isRedirecting = true;
    
    // Remove navigation prevention listener before redirect
    window.removeEventListener('beforeunload', preventNavigation);
    
    // Redirect to success page after a brief delay
    setTimeout(() => {
      redirect('booking-success.html');
    }, 300);
  } catch (err) {
    console.error('[submitBooking] DETAILED ERROR:', err);
    console.error('[submitBooking] Error message:', err.message);
    console.error('[submitBooking] Error stack:', err.stack);
    if (typeof booking !== 'undefined') {
      console.error('[submitBooking] Booking data that failed:', booking);
    }
    
    // ============================================
    // ❌ SUBMISSION ERROR - Update database status
    // ============================================
    // Mark submission as failed in database
    if (typeof completeSubmissionFailed === 'function' && submissionToken) {
      completeSubmissionFailed(submissionToken, err.message);
      console.log('[submitBooking] Database status updated: FAILED');
    }
    
    // Log submission error
    if (typeof BookingSecurityLogger !== 'undefined') {
      BookingSecurityLogger.log('submission_error', {
        userId: userId,
        submissionToken: submissionToken,
        error: err.message,
        errorStack: err.stack,
        submissionDuration: Date.now() - now
      });
    }
    
    // Reset submission flag on error but keep cooldown active
    isSubmittingBooking = false;
    
    // Start cooldown countdown on button
    if (submitBtn) {
      startSubmitButtonCooldown(submitBtn);
    }
    
    // Hide loading overlay on error
    if (typeof hideLoadingOverlay === 'function') {
      hideLoadingOverlay();
    }
    
    // Show user-friendly error message
    const errorMsg = err.message || 'Unknown error occurred';
    
    // Check if this is a duplicate detection but booking was actually created
    if (errorMsg.includes('duplicate') && errorMsg.includes('detected')) {
      // Booking might have been created - check and redirect if so
      console.log('[submitBooking] Duplicate detected - checking if booking was created...');
      if (typeof customAlert !== 'undefined' && typeof customAlert.success === 'function') {
        await customAlert.success('Booking Submitted', 'Your booking has been submitted. Redirecting...');
      }
      setTimeout(() => {
        redirect('booking-success.html');
      }, 1000);
      return;
    }
    
    if (typeof customAlert !== 'undefined' && typeof customAlert.error === 'function') {
      await customAlert.error('Booking Failed', `Error: ${errorMsg}\n\nPlease try again or contact support.`);
    } else {
      alert(`Booking failed: ${errorMsg}\n\nPlease try again.`);
    }
  } finally {
    // Always reset the local flag when function completes
    isSubmittingBooking = false;
    
    // Remove navigation prevention listener
    window.removeEventListener('beforeunload', preventNavigation);
  }
}
window.submitBooking = submitBooking;
window.selectTime = selectTime;
window.setupCalendarTimePicker = setupCalendarTimePicker;
window.handleQuickRebook = handleQuickRebook;



// Ensure packages are available before doing summary/validation
async function ensurePackagesLoaded() {
  try {
    let pk = [];
    if (typeof getPackages === 'function') {
      pk = await getPackages();
    } else if (typeof loadPackages === 'function') {
      // some apps use loadPackages() that returns or sets a global
      const res = await loadPackages();
      pk = Array.isArray(res) ? res : (window.packagesList || []);
    } else {
      pk = window.packagesList || [];
    }
    window.packagesList = Array.isArray(pk) ? pk : [];
    return window.packagesList;
  } catch (e) {
    console.warn('ensurePackagesLoaded failed', e);
    window.packagesList = window.packagesList || [];
    return window.packagesList;
  }
}

// ============================================
// ⚖️ FAIR GROOMER ASSIGNMENT ALGORITHM
// ============================================
// Automatically assigns the most fair groomer for a booking
// Uses multi-level sorting to ensure work is distributed evenly
// 
// Fairness Criteria (in priority order):
// 1. Day-before picks (least picked yesterday = highest priority)
// 2. Time slot availability (prefer groomers with free slot)
// 3. Daily workload (prefer groomers with fewer bookings today)
// 4. Total confirmed bookings (prefer groomers with less overall work)
// 5. Random selection (if still tied)
// ============================================
async function assignFairGroomer(date, time) {
  try {
    const groomers = (typeof getGroomers === 'function') ? await getGroomers() : (window.groomersList || []);
    if (!Array.isArray(groomers) || groomers.length === 0) return null;

    // Get all bookings
    const all = (typeof getBookings === 'function') ? await getBookings() : (JSON.parse(localStorage.getItem('bookings') || '[]'));
    
    // ============================================
    // 📋 STATUS HELPER FUNCTIONS
    // ============================================
    // Helper to check if booking is confirmed (not pending, not cancelled)
    const isConfirmedStatus = (status) => {
      const s = (status || '').toString().toLowerCase();
      return ['confirmed', 'completed', 'inprogress', 'in progress'].includes(s);
    };
    
    // Helper to check if booking is not cancelled
    const isNotCancelled = (status) => {
      const s = (status || '').toString().toLowerCase();
      return !['cancelled', 'cancelledbycustomer', 'cancelledbyadmin', 'cancelledbysystem'].includes(s);
    };
    
    // ============================================
    // 📅 CALCULATE DAY BEFORE BOOKING
    // ============================================
    // For fair rotation, we check who was picked YESTERDAY
    // Example: Booking on Dec 26 -> Check Dec 25's picks
    // Groomer with fewest picks yesterday gets priority today
    // This ensures daily rotation and prevents same groomer being picked repeatedly
    // ============================================
    const dateParts = date.split('-');
    const bookingDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    bookingDateObj.setDate(bookingDateObj.getDate() - 1);
    const dayBeforeBooking = `${bookingDateObj.getFullYear()}-${String(bookingDateObj.getMonth() + 1).padStart(2, '0')}-${String(bookingDateObj.getDate()).padStart(2, '0')}`;

    // ============================================
    // 📊 CALCULATE WORKLOAD STATS FOR EACH GROOMER
    // ============================================
    const groomerStats = groomers.map(g => {
      // ============================================
      // 📅 DAILY COUNT
      // ============================================
      // Total bookings for the requested date (exclude cancelled)
      // Used to check daily capacity and workload balance
      // ============================================
      const dailyCount = all.filter(b =>
        b.groomerId === g.id &&
        b.date === date &&
        isNotCancelled(b.status)
      ).length;
      
      // ============================================
      // 🕐 TIME SLOT COUNT
      // ============================================
      // Bookings for this specific time slot (exclude cancelled)
      // Used to check if groomer is already busy at this time
      // Prefer groomers with free slot at this time
      // ============================================
      const timeSlotCount = all.filter(b =>
        b.groomerId === g.id &&
        b.date === date &&
        b.time === time &&
        isNotCancelled(b.status)
      ).length;
      
      // ============================================
      // 📆 DAY BEFORE PICKS (PRIMARY FAIRNESS METRIC)
      // ============================================
      // Count CONFIRMED picks on day before booking
      // This is the PRIMARY fairness metric
      // Groomer with fewest picks yesterday gets priority today
      // Ensures daily rotation and prevents favoritism
      // ============================================
      const dayBeforePicks = all.filter(b =>
        b.groomerId === g.id &&
        b.date === dayBeforeBooking &&
        isConfirmedStatus(b.status)
      ).length;
      
      // ============================================
      // 🎯 TOTAL CONFIRMED BOOKINGS (LONG-TERM FAIRNESS)
      // ============================================
      // Count ALL confirmed bookings (all time)
      // Excludes pending and cancelled bookings
      // Used as tiebreaker for long-term fairness
      // Ensures work is distributed evenly over time
      // ============================================
      const totalConfirmedCount = all.filter(b =>
        b.groomerId === g.id &&
        isConfirmedStatus(b.status)
      ).length;
      
      return { groomer: g, dailyCount, timeSlotCount, dayBeforePicks, totalConfirmedCount };
    });

    // ============================================
    // ✅ FILTER AVAILABLE CANDIDATES
    // ============================================
    // Only include groomers who:
    // 1. Have capacity for the date (not at daily limit)
    // 2. Have free slot at the requested time
    // 3. Are not absent on the date
    // ============================================
    const candidates = [];
    for (const item of groomerStats) {
      const g = item.groomer;
      const hasCapacity = (typeof groomerHasCapacity === 'function') ? await groomerHasCapacity(g.id, date) : true;
      const slotFree = (typeof groomerSlotAvailable === 'function') ? await groomerSlotAvailable(g.id, date, time) : true;
      if (hasCapacity && slotFree) candidates.push(item);
    }

    if (candidates.length === 0) return null;

    // ============================================
    // 🔢 MULTI-LEVEL SORTING FOR FAIRNESS
    // ============================================
    // Sort candidates by multiple criteria (in priority order):
    // 
    // 1️⃣ PRIMARY: Day before picks (fewest = highest priority)
    //    - Ensures daily rotation
    //    - Prevents same groomer being picked repeatedly
    // 
    // 2️⃣ SECONDARY: Time slot count (fewest = higher priority)
    //    - Prefer groomers with free slot at this time
    //    - Avoids double-booking
    // 
    // 3️⃣ TERTIARY: Daily count (fewest = higher priority)
    //    - Balance workload for the day
    //    - Prevents one groomer from being overloaded
    // 
    // 4️⃣ QUATERNARY: Total confirmed bookings (fewest = higher priority)
    //    - Long-term fairness
    //    - Ensures even distribution over time
    // 
    // 5️⃣ QUINARY: Random selection
    //    - If still tied after all criteria
    //    - Ensures true randomness for ultimate fairness
    // ============================================
    candidates.sort((a, b) => {
      // 1️⃣ Primary: Day before booking's picks (least picked = 1st priority)
      if (a.dayBeforePicks !== b.dayBeforePicks) {
        return a.dayBeforePicks - b.dayBeforePicks;
      }
      // 2️⃣ Secondary: Time slot availability
      if (a.timeSlotCount !== b.timeSlotCount) {
        return a.timeSlotCount - b.timeSlotCount;
      }
      // 3️⃣ Tertiary: Daily workload
      if (a.dailyCount !== b.dailyCount) {
        return a.dailyCount - b.dailyCount;
      }
      // 4️⃣ Quaternary: Total confirmed bookings (long-term fairness)
      if (a.totalConfirmedCount !== b.totalConfirmedCount) {
        return a.totalConfirmedCount - b.totalConfirmedCount;
      }
      // 5️⃣ Quinary: Random selection if still tied
      return Math.random() - 0.5;
    });

    // Return the most fair groomer (first in sorted list)
    return candidates[0]?.groomer || null;
  } catch (e) {
    console.warn('assignFairGroomer error', e);
    return null;
  }
}

// Adjust slot availability for a date/time by delta (delta can be negative)
async function adjustSlotCount(date, time, delta) {
  if (!date || !time) return;
  try {
    if (typeof updateSlotAvailability === 'function') {
      // app-specific API to alter slot availability
      await updateSlotAvailability(date, time, delta);
      return;
    }

    // LocalStorage fallback: store map keyed by "date@@time"
    const key = 'slotAvailability';
    const map = JSON.parse(localStorage.getItem(key) || '{}');
    const id = `${date}@@${time}`;
    const defaultSlots = 4; // change to your default slot-per-slot
    map[id] = (typeof map[id] === 'number' ? map[id] : defaultSlots) + delta;
    if (map[id] < 0) map[id] = 0;
    localStorage.setItem(key, JSON.stringify(map));
  } catch (e) {
    console.warn('adjustSlotCount failed', e);
  }
}
// Export adjustSlotCount globally for use in main.js auto-cancel
window.adjustSlotCount = adjustSlotCount;

// Initialize booking when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBooking);
} else {
  initBooking();
}

// ============================================
// 🔧 GROOMING CUT SELECTION - Database-backed with unique IDs
// ============================================
// Stores cut ID (e.g., 'cut-puppy') in bookingData.referenceCut
// Display name is looked up via getReferenceCutName() from main.js
// This ensures unique IDs in database for easy tracing and no duplicates
// ============================================
function selectGroomingCut(cutId, ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  
  // ============================================
  // 📝 STORE CUT ID (not name) in bookingData
  // ============================================
  // The cut ID (e.g., 'cut-puppy') is stored in the booking
  // Display name is retrieved via getReferenceCutName() when needed
  // ============================================
  bookingData.referenceCut = cutId;
  
  // Get display name for logging and notes field
  const cutName = typeof getReferenceCutName === 'function' 
    ? getReferenceCutName(cutId) 
    : (typeof window.getReferenceCutName === 'function' ? window.getReferenceCutName(cutId) : cutId);
  
  console.log('[selectGroomingCut] Selected cut ID:', cutId, '| Display name:', cutName);
  
  // ============================================
  // 📋 UPDATE BOOKING NOTES WITH CUT NAME (for display)
  // ============================================
  // The notes field shows the human-readable name
  // But the booking stores the cut ID for database tracking
  // ============================================
  const notesField = document.getElementById('bookingNotes');
  if (notesField) {
    const currentNotes = notesField.value.trim();
    // Remove existing cut preference if any (check both old names and new format)
    const cutNames = ['Puppy Cut', 'Teddy Bear Cut', 'Lion Cut', 'Summer Cut', 'Kennel Cut', 'Show Cut', 'Belly Shave', 'Hygiene Cut'];
    let lines = currentNotes.split('\n').filter(line => {
      const lineTrimmed = line.trim();
      // Remove lines that are just cut names
      return !cutNames.some(name => lineTrimmed === name);
    });
    // Add new cut preference (display name, not ID)
    if (cutName && cutName !== cutId) {
      lines.unshift(cutName);
    }
    notesField.value = lines.join('\n').trim();
    bookingData.bookingNotes = notesField.value;
  }
  
  // Visual feedback - reset all buttons first
  document.querySelectorAll('.cut-selector-btn').forEach(btn => {
    btn.style.background = '#e8e8e8';
    btn.style.borderColor = '#ccc';
    btn.style.color = '#333';
  });
  
  // Highlight selected button
  if (ev && ev.target) {
    ev.target.style.background = '#4CAF50';
    ev.target.style.borderColor = '#4CAF50';
    ev.target.style.color = '#fff';
  } else {
    // If called programmatically, find and highlight the button by data-cut attribute
    const selectedBtn = document.querySelector(`.cut-selector-btn[data-cut="${cutId}"]`);
    if (selectedBtn) {
      selectedBtn.style.background = '#4CAF50';
      selectedBtn.style.borderColor = '#4CAF50';
      selectedBtn.style.color = '#fff';
    }
  }
  
  // Update submit button state
  enableSubmitButton();
  saveBookingDataToSession();
  updateSummary(); // Update booking summary to show new reference cut
}
window.selectGroomingCut = selectGroomingCut;
window.updateReferenceCutsVisibility = updateReferenceCutsVisibility;

// Restore form data from bookingData object
function restoreBookingFormData(data) {
  if (!data) return;

  const fields = [
    'ownerName', 'contactNumber', 'ownerAddress',
    'petName', 'petBreed', 'petAge', 'medicalNotes',
    'vaccinationNotes', 'bookingNotes'
  ];

  fields.forEach(field => {
    const el = document.getElementById(field);
    if (el && data[field]) {
      el.value = data[field];
    }
  });

  if (data.petWeight) {
    const radio = document.querySelector(`input[name="petWeight"][value="${data.petWeight}"]`);
    if (radio) radio.checked = true;
  }

  // Restore reference cut visual state
  if (data.referenceCut) {
    console.log('[restoreBookingFormData] Restoring reference cut:', data.referenceCut);
    // Reset all buttons first
    document.querySelectorAll('.cut-selector-btn').forEach(btn => {
      btn.style.background = '#e8e8e8';
      btn.style.borderColor = '#ccc';
      btn.style.color = '#333';
    });
    // Highlight the selected one
    const selectedBtn = document.querySelector(`.cut-selector-btn[data-cut="${data.referenceCut}"]`);
    if (selectedBtn) {
      selectedBtn.style.background = '#4CAF50';
      selectedBtn.style.borderColor = '#4CAF50';
      selectedBtn.style.color = '#fff';
    }
  }
}

// ============================================
// Vaccination Proof Image Upload Functions
// ============================================

// Handle vaccination image upload
async function handleVaccinationImageUpload(input) {
  const file = input.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    customAlert.warning('Invalid File', 'Please select an image file (JPG, PNG, etc.)');
    return;
  }

  // Validate file size (max 10MB for Cloudinary)
  if (file.size > 10 * 1024 * 1024) {
    customAlert.warning('File Too Large', 'Please select an image smaller than 10MB');
    return;
  }

  try {
    // Show loading state
    showLoadingOverlay('Uploading vaccination proof...');
    
    // Upload to Cloudinary instead of base64
    const cloudinaryUrl = await uploadVaccinationProof(file);
    
    // Store Cloudinary URL instead of base64
    bookingData.vaccinationProofUrl = cloudinaryUrl;
    
    // Show preview using Cloudinary URL
    const preview = document.getElementById('vaccinationProofPreview');
    const img = document.getElementById('vaccinationProofImg');
    if (preview && img) {
      img.src = cloudinaryUrl;
      preview.style.display = 'block';
    }
    
    console.log('[Vaccination] Image uploaded to Cloudinary:', cloudinaryUrl);
    saveBookingDataToSession();
    
    hideLoadingOverlay();
    customAlert.success('Upload Complete', 'Vaccination proof uploaded successfully!');
    
  } catch (error) {
    console.error('[Vaccination] Upload failed:', error);
    hideLoadingOverlay();
    customAlert.error('Upload Failed', `Failed to upload image: ${error.message}`);
  }
}

// Remove vaccination image
function removeVaccinationImage() {
  bookingData.vaccinationProofUrl = null;
  
  const preview = document.getElementById('vaccinationProofPreview');
  const input = document.getElementById('vaccinationProofInput');
  
  if (preview) preview.style.display = 'none';
  if (input) input.value = '';
  
  console.log('[Vaccination] Image removed');
  saveBookingDataToSession();
}

// Open vaccination image in lightbox
function openVaccinationImageLightbox() {
  if (!bookingData.vaccinationProofImage) return;
  
  // Create lightbox overlay
  const lightbox = document.createElement('div');
  lightbox.id = 'vaccinationLightbox';
  lightbox.style.cssText = `
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
  
  const img = document.createElement('img');
  img.src = bookingData.vaccinationProofImage;
  img.style.cssText = `
    max-width: 90%;
    max-height: 90%;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: #fff;
    border: none;
    border-radius: 50%;
    font-size: 24px;
    cursor: pointer;
    color: #333;
  `;
  
  lightbox.appendChild(img);
  lightbox.appendChild(closeBtn);
  document.body.appendChild(lightbox);
  
  // Close on click
  lightbox.addEventListener('click', function() {
    document.body.removeChild(lightbox);
  });
}

// Make functions globally available
window.handleVaccinationImageUpload = handleVaccinationImageUpload;
window.removeVaccinationImage = removeVaccinationImage;
window.openVaccinationImageLightbox = openVaccinationImageLightbox;


