/* ============================================
   Dynamic Grooming Cuts Reference System
   ============================================ */

// Grooming cuts data with pet type filtering
// Using existing images from assets folder
const GROOMING_CUTS = [
  // Dog Cuts - using assets/1.jpg to assets/6.jpg
  {
    id: 'puppy-cut',
    name: 'Puppy Cut',
    description: 'Short, even length all over. Perfect for active dogs and easy maintenance.',
    image: 'assets/1.jpg',
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
    petTypes: ['dog']
  },
  {
    id: 'teddy-bear',
    name: 'Teddy Bear Cut',
    description: 'Rounded face with fluffy body. Adorable and cuddly appearance.',
    image: 'assets/2.jpg',
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
    petTypes: ['dog']
  },
  {
    id: 'dog-lion-cut',
    name: 'Lion Cut',
    description: 'Short body with full mane around head and chest. Regal and distinctive.',
    image: 'assets/3.jpg',
    borderColor: '#FF5722',
    backgroundColor: '#FFEBEE',
    petTypes: ['dog']
  },
  {
    id: 'summer-cut',
    name: 'Summer Cut',
    description: 'Very short all over for hot weather. Keeps your dog cool and comfortable.',
    image: 'assets/4.jpg',
    borderColor: '#03A9F4',
    backgroundColor: '#E1F5FE',
    petTypes: ['dog']
  },
  {
    id: 'kennel-cut',
    name: 'Kennel Cut',
    description: 'Practical short cut for easy care. Ideal for working dogs or low maintenance.',
    image: 'assets/5.jpg',
    borderColor: '#607D8B',
    backgroundColor: '#ECEFF1',
    petTypes: ['dog']
  },
  {
    id: 'show-cut',
    name: 'Show Cut',
    description: 'Breed-specific styling for competitions. Professional and elegant appearance.',
    image: 'assets/6.jpg',
    borderColor: '#9C27B0',
    backgroundColor: '#F3E5F5',
    petTypes: ['dog']
  },
  
  // Cat Cuts
  {
    id: 'belly-shave',
    name: 'Belly Shave',
    description: 'Shaved belly area for hygiene and comfort. Reduces matting in sensitive areas.',
    image: 'assets/cuts/bellyshave.png',
    borderColor: '#E91E63',
    backgroundColor: '#FCE4EC',
    petTypes: ['cat']
  },
  {
    id: 'hygiene-cut',
    name: 'Hygiene Cut',
    description: 'Sanitary trim around private areas. Essential for cleanliness and health.',
    image: 'assets/cuts/hygncut.png',
    borderColor: '#00BCD4',
    backgroundColor: '#E0F2F1',
    petTypes: ['cat']
  },
  {
    id: 'cat-lion-cut',
    name: 'Lion Cut',
    description: 'Short body with full head mane and tail tuft. Reduces shedding and matting.',
    image: 'assets/cuts/lioncut.png',
    borderColor: '#FFC107',
    backgroundColor: '#FFFDE7',
    petTypes: ['cat']
  }
];

/**
 * Render grooming cuts filtered by pet type
 * @param {string} petType - 'dog' or 'cat'
 */
function renderGroomingCuts(petType) {
  console.log(`[renderGroomingCuts] Rendering cuts for: ${petType}`);
  
  const container = document.getElementById('groomingCutsCarousel');
  if (!container) {
    console.warn('[renderGroomingCuts] Container #groomingCutsCarousel not found');
    return;
  }

  // Filter cuts by pet type
  const filteredCuts = GROOMING_CUTS.filter(cut => 
    cut.petTypes.includes(petType.toLowerCase())
  );

  if (filteredCuts.length === 0) {
    container.innerHTML = `
      <div class="no-cuts-message">
        <p>No grooming cuts available for ${petType}s at the moment.</p>
      </div>
    `;
    return;
  }

  // Generate HTML for cuts
  const cutsHTML = filteredCuts.map(cut => `
    <div class="grooming-cut-card" 
         data-cut-id="${cut.id}" 
         data-pet-type="${petType}"
         style="--border-color: ${cut.borderColor}; --bg-color: ${cut.backgroundColor};">
      
      <div class="cut-image-container">
        <img src="${cut.image}" 
             alt="${cut.name}" 
             class="cut-image lightbox-trigger"
             data-lightbox-src="${cut.image}"
             data-lightbox-title="${cut.name}"
             data-lightbox-description="${cut.description}"
             loading="lazy"
             onerror="this.style.display='none';">
        <div class="cut-overlay">
          <i class="fas fa-search-plus"></i>
        </div>
      </div>
      
      <div class="cut-info">
        <h4 class="cut-name">${cut.name}</h4>
        <p class="cut-description">${cut.description}</p>
        
        <button class="cut-select-btn" 
                onclick="selectGroomingCut('${cut.id}', '${cut.name}')">
          <i class="fas fa-check"></i>
          Select This Cut
        </button>
      </div>
    </div>
  `).join('');

  // Update container
  container.innerHTML = `
    <div class="cuts-header">
      <h3><i class="fas fa-scissors"></i> ${petType.charAt(0).toUpperCase() + petType.slice(1)} Grooming Styles</h3>
      <p>Choose a reference style for your ${petType}'s grooming session</p>
    </div>
    <div class="cuts-carousel">
      ${cutsHTML}
    </div>
  `;

  // Initialize lightbox after rendering
  if (typeof initLightbox === 'function') {
    initLightbox();
    console.log('[renderGroomingCuts] Lightbox initialized');
  } else {
    console.warn('[renderGroomingCuts] initLightbox function not available');
  }

  // Add scroll behavior for carousel
  initCutsCarousel();
}

/**
 * Initialize carousel scroll behavior
 */
function initCutsCarousel() {
  const carousel = document.querySelector('.cuts-carousel');
  if (!carousel) return;

  // Add scroll buttons if needed
  const scrollLeft = () => {
    carousel.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    carousel.scrollBy({ left: 200, behavior: 'smooth' });
  };

  // Store scroll functions for potential use
  carousel.scrollLeft = scrollLeft;
  carousel.scrollRight = scrollRight;
}

/**
 * Handle grooming cut selection
 * @param {string} cutId - Selected cut ID
 * @param {string} cutName - Selected cut name
 */
function selectGroomingCut(cutId, cutName) {
  console.log(`[selectGroomingCut] Selected: ${cutName} (${cutId})`);

  // Remove previous selections
  document.querySelectorAll('.grooming-cut-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Add selection to clicked card
  const selectedCard = document.querySelector(`[data-cut-id="${cutId}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }

  // Store selection in booking data
  if (typeof window.bookingData === 'object') {
    window.bookingData.selectedCut = {
      id: cutId,
      name: cutName
    };
  }

  // Update UI feedback
  showCutSelectionFeedback(cutName);

  // Trigger custom event for other components
  window.dispatchEvent(new CustomEvent('groomingCutSelected', {
    detail: { cutId, cutName }
  }));
}

/**
 * Show visual feedback for cut selection
 * @param {string} cutName - Selected cut name
 */
function showCutSelectionFeedback(cutName) {
  // Create or update selection indicator
  let indicator = document.getElementById('selectedCutIndicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'selectedCutIndicator';
    indicator.className = 'selected-cut-indicator';
    
    const container = document.getElementById('groomingCutsCarousel');
    if (container) {
      container.appendChild(indicator);
    }
  }

  indicator.innerHTML = `
    <div class="selection-content">
      <i class="fas fa-check-circle"></i>
      <span>Selected: <strong>${cutName}</strong></span>
      <button onclick="clearCutSelection()" class="clear-selection">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  indicator.style.display = 'block';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (indicator && indicator.style.display === 'block') {
      indicator.style.opacity = '0.7';
    }
  }, 3000);
}

/**
 * Clear grooming cut selection
 */
function clearCutSelection() {
  // Remove visual selection
  document.querySelectorAll('.grooming-cut-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Clear from booking data
  if (typeof window.bookingData === 'object' && window.bookingData.selectedCut) {
    delete window.bookingData.selectedCut;
  }

  // Hide selection indicator
  const indicator = document.getElementById('selectedCutIndicator');
  if (indicator) {
    indicator.style.display = 'none';
  }

  console.log('[clearCutSelection] Grooming cut selection cleared');
}

/**
 * Update grooming cuts when pet type changes
 * @param {string} petType - 'dog' or 'cat'
 */
function updateGroomingCutsForPetType(petType) {
  console.log(`[updateGroomingCutsForPetType] Updating for pet type: ${petType}`);
  
  // Clear previous selection
  clearCutSelection();
  
  // Render new cuts for selected pet type
  renderGroomingCuts(petType);
  
  // Show the cuts section if hidden
  const cutsSection = document.getElementById('groomingCutsCarousel');
  if (cutsSection) {
    cutsSection.style.display = 'block';
    
    // Smooth scroll to cuts section
    setTimeout(() => {
      cutsSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }, 100);
  }
}

/**
 * Get selected grooming cut
 * @returns {Object|null} Selected cut data or null
 */
function getSelectedGroomingCut() {
  return window.bookingData?.selectedCut || null;
}

/**
 * Initialize grooming cuts system
 */
function initGroomingCuts() {
  console.log('[initGroomingCuts] Initializing grooming cuts system');
  
  // Set up initial state
  const container = document.getElementById('groomingCutsCarousel');
  if (container) {
    container.innerHTML = `
      <div class="cuts-placeholder">
        <i class="fas fa-paw"></i>
        <p>Select your pet type above to see available grooming styles</p>
      </div>
    `;
  }

  // Listen for pet type changes
  window.addEventListener('petTypeSelected', (event) => {
    const petType = event.detail?.petType;
    if (petType) {
      updateGroomingCutsForPetType(petType);
    }
  });

  console.log('[initGroomingCuts] Grooming cuts system initialized');
}

// Make functions globally available
window.renderGroomingCuts = renderGroomingCuts;
window.selectGroomingCut = selectGroomingCut;
window.clearCutSelection = clearCutSelection;
window.updateGroomingCutsForPetType = updateGroomingCutsForPetType;
window.getSelectedGroomingCut = getSelectedGroomingCut;
window.initGroomingCuts = initGroomingCuts;
window.GROOMING_CUTS = GROOMING_CUTS;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initGroomingCuts);

console.log('[grooming-cuts.js] Grooming cuts system loaded');