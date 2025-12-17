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

// Prevent duplicate submissions
let isSubmittingBooking = false;

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

  // For single service: show all ages (including 5 months and below)
  // For other packages: show only 6 months and above
  let visibleOptions = allOptions;
  console.log('[updateAgeDropdownOptions] Current packageId:', bookingData.packageId);
  console.log('[updateAgeDropdownOptions] SINGLE_SERVICE_PACKAGE_ID:', SINGLE_SERVICE_PACKAGE_ID);
  
  if (bookingData.packageId && bookingData.packageId !== SINGLE_SERVICE_PACKAGE_ID) {
    console.log('[updateAgeDropdownOptions] Filtering ages for full package - showing 6+ months only');
    visibleOptions = allOptions.filter(opt => {
      if (!opt.value) return true; // Keep "Select age..." option
      const ageInMonths = getAgeInMonths(opt.value);
      console.log(`[updateAgeDropdownOptions] Age "${opt.value}" = ${ageInMonths} months, include: ${ageInMonths >= 6}`);
      return ageInMonths >= 6;
    });
  } else {
    console.log('[updateAgeDropdownOptions] Showing all ages (single service or no package selected)');
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

    // Pre-fill owner details with account info if logged in (but not in reschedule mode)
    const ownerNameInput = document.getElementById('ownerName');
    const contactNumberInput = document.getElementById('contactNumber');
    const ownerAddressInput = document.getElementById('ownerAddress');

    if (user && !isRescheduleMode) {
      if (ownerNameInput) {
        ownerNameInput.value = user.name || '';
        bookingData.ownerName = user.name || '';
      }

      // Auto-fill phone number if available in profile
      if (contactNumberInput && user.phone) {
        contactNumberInput.value = user.phone;
        bookingData.contactNumber = user.phone;
      }

    }

    // Initialize to target step (restored or default step 1)
    showStep(targetStep);

    // Setup calendar time picker
    setupCalendarTimePicker();

    // Setup event listeners
    setupBookingListeners();

    // Attempt to load saved profile silently if logged in
    if (user) {
      try {
        const warningInfo = await getCustomerWarningInfo(user.id);
        if (warningInfo?.isBanned) {
          await customAlert.error('Account Banned', 'Your account is temporarily banned. Please check your customer dashboard for instructions on how to lift the ban.');
          redirect('customer-dashboard.html');
          return;
        }
        const savedProfile = await getCustomerProfile(user.id);
        if (savedProfile) {
          applyProfileToForm(savedProfile);
        }

        // Check if user clicked "Use Saved Details" from dashboard
        const autoLoad = sessionStorage.getItem('autoLoadProfile');
        if (autoLoad === 'true') {
          sessionStorage.removeItem('autoLoadProfile'); // Clear flag
          // Trigger auto profile load which will jump to step 3
          await handleAutoProfileLoad();
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
      console.warn('Permission denied - user may need to update Firebase security rules. See FIX_BOOKING_PERMISSION_ERROR.md');
      // Continue anyway - might work with localStorage fallback
    } else {
      customAlert.error('Loading Error', 'Error loading booking page. Please refresh and try again.');
    }
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
    const user = await getCurrentUser();
    if (!user) {
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      customAlert.warning('Not Logged In', 'Please log in first to load your profile.');
      return;
    }

    // Get profile from last booking
    const allBookings = await getBookings();
    const userBookings = Array.isArray(allBookings) ? allBookings.filter(b => b.userId === user.id) : [];

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
      vaccinations: lastBooking.vaccinationNotes
      // Note: addOns are NOT copied from previous bookings - customer must select them each time
    };

    // Load profile details to current step forms
    applyProfileToForm(profile);

    // Auto-fill pet type and package from last booking (but don't change steps)
    bookingData.petType = lastBooking.petType;
    bookingData.packageId = lastBooking.packageId;

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
      } else {
        card.classList.remove('selected');
      }
    });

    // Stay on current step - don't jump to step 3
    // Only update the summary and enable next button if applicable
    updateSummary();
    enableSubmitButton();

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
    const user = await getCurrentUser();
    if (!user) {
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      customAlert.warning('Not Logged In', 'Please log in first to load your profile.');
      return;
    }

    // Get profile from last booking
    const allBookings = await getBookings();
    const userBookings = Array.isArray(allBookings) ? allBookings.filter(b => b.userId === user.id) : [];

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
      vaccinations: lastBooking.vaccinationNotes
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

    // Jump directly to step 5 (Details) for dashboard auto-load
    showStep(5);

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
  const user = await getCurrentUser();
  if (!user) {
    customAlert.warning('Not Logged In', 'Please log in first to book an appointment.');
    return;
  }

  // Get profile from last booking
  const allBookings = await getBookings();
  const userBookings = Array.isArray(allBookings) ? allBookings.filter(b => b.userId === user.id) : [];

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
    vaccinations: lastBooking.vaccinationNotes
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

  // Select the weight radio button
  if (profile.weight) {
    const weightRadios = document.querySelectorAll('input[name="petWeight"]');
    weightRadios.forEach(radio => {
      if (radio.value === profile.weight) {
        radio.checked = true;
      }
    });
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
  
  // Update next button state based on current step
  enableNextButton();
  
  // Update submit button state if on final step
  if (step === totalSteps) {
    enableSubmitButton();
  }
}

// Next step
async function nextStep() {
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
  if (currentStep === 2 && bookingData.packageId) {
    console.log('[nextStep] Skipping to step 4 because packageId is set');
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

  // Clear package selection only if type actually changed
  if (previousPetType && previousPetType !== petType) {
    console.log('[selectPetType] Pet type changed from', previousPetType, 'to', petType, '- clearing package selection');
    bookingData.packageId = null;
  }
  loadPackages();
  renderSingleServiceConfigurator();
  if (bookingData.petWeight) {
    const weightRadio = document.querySelector(`input[name="petWeight"][value="${bookingData.petWeight}"]`);
    if (weightRadio) {
      weightRadio.checked = true;
    }
  }

  updateSummary();
  enableNextButton();
  updateSingleServicePriceLabels();
}

// Load packages based on selected pet type
async function loadPackages() {
  console.log('[loadPackages] Called with petType:', bookingData.petType, 'packageId:', bookingData.packageId);
  if (!bookingData.petType) return;

  const packages = await getPackages();
  const filteredPackages = packages.filter(pkg => {
    if (pkg.type === 'addon') return false;
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
  
  // If single service package is selected
  if (isSingleServicePackage()) {
    // Only show reference cuts if Face Trim is selected
    const hasFaceTrim = bookingData.singleServices.includes('face');
    referenceCutsSection.style.display = hasFaceTrim ? 'block' : 'none';
  } else {
    // For regular packages, always show reference cuts
    referenceCutsSection.style.display = 'block';
  }
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

  // Render the calendar
  // Use options for interactive mode
  await renderPublicCalendar('calendarWrapper', {
    showBookedList: false, // Don't show names on booking page
    onDateSelect: handleDateSelect,
    selectedDate: bookingData.date
  });

  // If we already have a date selected (e.g. returning from auth), render time slots
  if (bookingData.date) {
    if (typeof isCalendarBlackout === 'function' && isCalendarBlackout(bookingData.date)) {
      // Handle blackout case if pre-selected
      bookingData.date = null;
      bookingData.time = null;
    } else {
      renderBookingTimeSlots(bookingData.date);
    }
  } else {
    document.getElementById('timeSlotsWrapper').innerHTML = '<p style="color:var(--gray-600); text-align:center; padding:2rem;">Select a date above to see available time slots.</p>';
  }
}




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
    b.date === date && b.time === time && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(b.status)
  ).map(b => b.groomerId).filter(Boolean);

  const available = activeGroomers.filter(g => !bookedIds.includes(g.id)).length;
  
  // IMPORTANT: Check if the date is almost fully booked
  // If total slots left for the day is very low, limit what we show per time slot
  const allDayBookings = bookings.filter(b => 
    b.date === date && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(b.status)
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

  // Helper function to check if a time slot has passed
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
    b.date === date && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(b.status)
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
        b.date === date && b.time === time && !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes(b.status)
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

  if (warningInfo?.warnings) {
    summaryHTML += `
      <div class="summary-alert">
        âš ï¸ ${warningInfo.warnings}/5 warnings${warningInfo.isBanned ? ' Â· account on hold' : ''}.
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
      
      summaryHTML += `
        <div class="summary-item">
          <span class="summary-label">Price:</span>
          <span class="summary-value">${priceDisplay}</span>
        </div>
      `;
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

  if (bookingData.bookingNotes && bookingData.bookingNotes.trim()) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Special Notes:</span>
        <span class="summary-value" style="font-size: 0.9rem; line-height: 1.4;">${escapeHtml(bookingData.bookingNotes)}</span>
      </div>
    `;
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

  if (isSingleServicePackage()) {
    summaryHTML += `
      <div class="summary-item">
        <span class="summary-label">Selected Services:</span>
        <span class="summary-value">
          ${bookingData.singleServices.length ? bookingData.singleServices.map(id => escapeHtml(SINGLE_SERVICE_OPTIONS[id]?.label || id)).join(', ') : 'Choose at least one service'}
        </span>
      </div>
    `;
    if (!bookingData.singleServices.length) {
      summaryHTML += `<p style="color: var(--warning-600); font-size: 0.85rem;">Please tick at least one single service option.</p>`;
    }
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
          <span class="summary-label">Single Services:</span>
          <span class="summary-value">
            ${costEstimate.services.map(service => `${escapeHtml(service.label)} (${service.price ? formatCurrency(service.price) : 'Select weight'})`).join('<br>')}
          </span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Services Total:</span>
          <span class="summary-value">${formatCurrency(servicesTotal)}</span>
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

// Submit booking
async function submitBooking(event) {
  console.log('[submitBooking] Starting booking submission...');
  
  // Prevent duplicate submissions
  if (isSubmittingBooking) {
    console.log('[submitBooking] Already submitting, ignoring duplicate request');
    return;
  }
  
  isSubmittingBooking = true;
  const submitBtn = document.getElementById('submitBooking');
  
  try {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();

    // Show loading state on submit button
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      submitBtn.style.opacity = '0.7';
    }

    // Sync form data before validation
    syncFormToBookingData();
    console.log('[submitBooking] Form data synced, bookingData:', JSON.stringify(bookingData, null, 2));

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
      
      if (submitBtn) {
        submitBtn.disabled = false;
        
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

    // Show loading overlay
    if (typeof showLoadingOverlay === 'function') {
      showLoadingOverlay();
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
      vaccinationStatus: bookingData.vaccinationStatus || ''
      // Note: addOns are NOT saved in profile - they are booking-specific
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

    // Auto-assign groomer if none selected
    let assignedGroomerId = bookingData.groomerId || null;
    let assignedGroomerName = bookingData.groomerName || 'Assigned on site';
    if (!assignedGroomerId && typeof assignFairGroomer === 'function') {
      try {
        const g = await assignFairGroomer(bookingData.date, bookingData.time);
        if (g) { assignedGroomerId = g.id; assignedGroomerName = g.name || assignedGroomerName; }
      } catch (e) { console.warn('assignFairGroomer failed', e); }
    }

    // Create booking object (shared)
    const booking = {
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
      groomerId: assignedGroomerId,
      groomerName: assignedGroomerName,
      addOns: bookingData.addOns.slice(),
      bookingNotes: bookingData.bookingNotes,
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
      balanceOnVisit: costDetails?.balanceOnVisit || 0
    };

    // Handle reschedule mode
    if (isRescheduleMode && rescheduleData) {
      booking.id = rescheduleData.originalBookingId;
      booking.status = 'pending'; // Reset to pending for admin approval
      
      // Update the existing booking
      if (typeof updateBooking === 'function') {
        await updateBooking(booking);
      } else {
        // fallback local update
        const bookings = await getBookings();
        const idx = bookings.findIndex(b => b.id === rescheduleData.originalBookingId);
        if (idx >= 0) {
          bookings[idx] = booking;
          await saveBookings(bookings);
        }
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
      
      // Hide loading overlay
      if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
      
      // Show success and redirect back to admin
      await customAlert.success('Booking Rescheduled', `${booking.petName}'s appointment has been rescheduled successfully.`);
      window.location.href = 'admin-dashboard.html';
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
      
      redirect('booking-success.html');
      return;
    }

    // Existing create flow for new booking
    if (typeof createBooking === 'function') {
      await createBooking(booking);
    } else {
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

    // Store booking in session for success page
    sessionStorage.setItem('lastBooking', JSON.stringify(booking));

    // Check if booking came from admin walk-in and save source
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source');
    if (source === 'admin') {
      sessionStorage.setItem('bookingSource', 'admin');
    }

    // Redirect to success page
    redirect('booking-success.html');
  } catch (err) {
    console.error('submitBooking failed', err);
    
    // Reset submission flag on error
    isSubmittingBooking = false;
    
    // Restore submit button state on error
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Booking';
      submitBtn.style.opacity = '1';
    }
    
    // Hide loading overlay on error
    if (typeof hideLoadingOverlay === 'function') {
      hideLoadingOverlay();
    }
    alert('An error occurred while submitting the booking. See console for details.');
  } finally {
    // Always reset the flag when function completes
    isSubmittingBooking = false;
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

// Fair groomer assignment: choose groomer with fewest bookings for the requested slot
async function assignFairGroomer(date, time) {
  try {
    const groomers = (typeof getGroomers === 'function') ? await getGroomers() : (window.groomersList || []);
    if (!Array.isArray(groomers) || groomers.length === 0) return null;

    // Get all bookings
    const all = (typeof getBookings === 'function') ? await getBookings() : (JSON.parse(localStorage.getItem('bookings') || '[]'));

    // Compute bookings per groomer for the date AND for this specific time slot
    const groomerStats = groomers.map(g => {
      // Total bookings for the day
      const dailyCount = all.filter(b =>
        b.groomerId === g.id &&
        b.date === date &&
        !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes((b.status || '').toString())
      ).length;
      
      // Bookings for this specific time slot
      const timeSlotCount = all.filter(b =>
        b.groomerId === g.id &&
        b.date === date &&
        b.time === time &&
        !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes((b.status || '').toString())
      ).length;
      
      // Total historical bookings (all time) for ultimate fairness
      const totalHistoricalCount = all.filter(b =>
        b.groomerId === g.id &&
        !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin'].includes((b.status || '').toString())
      ).length;
      
      return { groomer: g, dailyCount, timeSlotCount, totalHistoricalCount };
    });

    // Filter to groomers who have capacity and the slot is free
    const candidates = [];
    for (const item of groomerStats) {
      const g = item.groomer;
      const hasCapacity = (typeof groomerHasCapacity === 'function') ? await groomerHasCapacity(g.id, date) : true;
      const slotFree = (typeof groomerSlotAvailable === 'function') ? await groomerSlotAvailable(g.id, date, time) : true;
      if (hasCapacity && slotFree) candidates.push(item);
    }

    if (candidates.length === 0) return null;

    // Sort by: 
    // 1. Fewest bookings for this time slot (primary)
    // 2. Fewest bookings for the day (secondary)  
    // 3. Fewest total historical bookings (tertiary - for ultimate fairness)
    // 4. Random selection if still tied (quaternary)
    candidates.sort((a, b) => {
      if (a.timeSlotCount !== b.timeSlotCount) {
        return a.timeSlotCount - b.timeSlotCount;
      }
      if (a.dailyCount !== b.dailyCount) {
        return a.dailyCount - b.dailyCount;
      }
      if (a.totalHistoricalCount !== b.totalHistoricalCount) {
        return a.totalHistoricalCount - b.totalHistoricalCount;
      }
      // If still tied, use random selection for true fairness
      return Math.random() - 0.5;
    });

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
// Initialize booking when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBooking);
} else {
  initBooking();
}

// Grooming cut selection function
function selectGroomingCut(cutName, ev) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  
  // Store in bookingData
  bookingData.referenceCut = cutName;
  console.log('[selectGroomingCut] Selected cut:', cutName);
  
  const notesField = document.getElementById('bookingNotes');
  if (notesField) {
    const currentNotes = notesField.value.trim();
    const cutPrefix = '';
    // Remove existing cut preference if any
    const lines = currentNotes.split('\\n').filter(line => !line.startsWith(cutPrefix));
    // Add new cut preference
    lines.unshift(cutPrefix + cutName);
    notesField.value = lines.join('\\n').trim();
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
    const selectedBtn = document.querySelector(`.cut-selector-btn[data-cut="${cutName}"]`);
    if (selectedBtn) {
      selectedBtn.style.background = '#4CAF50';
      selectedBtn.style.borderColor = '#4CAF50';
      selectedBtn.style.color = '#fff';
    }
  }
  
  // Update submit button state
  enableSubmitButton();
  saveBookingDataToSession();
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
function handleVaccinationImageUpload(input) {
  const file = input.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    customAlert.warning('Invalid File', 'Please select an image file (JPG, PNG, etc.)');
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    customAlert.warning('File Too Large', 'Please select an image smaller than 5MB');
    return;
  }

  // Convert to base64
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Image = e.target.result;
    bookingData.vaccinationProofImage = base64Image;
    
    // Show preview
    const preview = document.getElementById('vaccinationProofPreview');
    const img = document.getElementById('vaccinationProofImg');
    if (preview && img) {
      img.src = base64Image;
      preview.style.display = 'block';
    }
    
    console.log('[Vaccination] Image uploaded successfully');
    saveBookingDataToSession();
  };
  reader.readAsDataURL(file);
}

// Remove vaccination image
function removeVaccinationImage() {
  bookingData.vaccinationProofImage = null;
  
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

// ============================================
// Touch / Mouse Swipe Navigation (DISABLED)
// ============================================

/*
(function initSwipeNavigation() {
  let startX = 0;
  let startY = 0;
  const swipeThreshold = 100; // Increased threshold to prevent accidental swipes

  function handleStart(e) {
    // Don't start swipe if touching the calendar container (to allow calendar scrolling)
    if (e.target.closest('#calendarTimePicker') || e.target.closest('.mega-calendar')) {
      return;
    }

    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;
  }

  function handleEnd(e) {
    // If startX was never set (e.g. ignored target), do nothing
    if (startX === 0 && startY === 0) return;

    const point = e.changedTouches ? e.changedTouches[0] : e;
    const diffX = point.clientX - startX;
    const diffY = point.clientY - startY;

    // Reset start coords
    startX = 0;
    startY = 0;

    // Horizontal swipe detection (ignore if vertical scroll is dominant)
    // Also require a significant horizontal movement (threshold)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
      if (diffX > 0) {
        // Swipe Right -> Previous Step
        const prevBtn = document.getElementById('prevBtn');
        // Check if button exists and is not logically hidden (by our showStep logic)
        // We check data-hidden because we forced display:none !important in CSS
        if (prevBtn && !prevBtn.hasAttribute('data-hidden') && !prevBtn.disabled) {
          prevBtn.click();
        }
      } else {
        // Swipe Left -> Next Step
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn && !nextBtn.hasAttribute('data-hidden') && !nextBtn.disabled) {
          nextBtn.click();
        }
      }
    }
  }

  // Attach listeners to the touch container
  setTimeout(() => {
    const container = document.querySelector('.touch-container');
    if (container) {
      // Touch events
      container.addEventListener('touchstart', handleStart, { passive: true });
      container.addEventListener('touchend', handleEnd);

      // Mouse events for desktop drag support
      container.addEventListener('mousedown', handleStart);
      container.addEventListener('mouseup', handleEnd);
    } else {
      console.warn('Touch container not found for swipe navigation');
    }
  }, 500);
})();
*/

