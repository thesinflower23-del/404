/* ============================================
   Cloudinary Image Upload Helper
   ============================================ */

// Cloudinary configuration (SECURE - No API key needed)
const CLOUDINARY_CONFIG = {
  cloudName: 'de9rkcilt', // Your Cloudinary cloud name
  uploadPreset: 'bestbuddies_unsigned', // Your unsigned preset
  folder: 'bestbuddies-petshop'
};

/**
 * Compress image before upload to reduce file size and improve performance
 * @param {File} file - Image file to compress
 * @param {number} quality - Compression quality (0.1 to 1.0)
 * @param {number} maxWidth - Maximum width in pixels
 * @returns {Promise<File>} - Compressed image file
 */
async function compressImage(file, quality = 0.8, maxWidth = 1200) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      // Set canvas size
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        const compressedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        console.log(`[compressImage] Original: ${(file.size / 1024).toFixed(1)}KB → Compressed: ${(compressedFile.size / 1024).toFixed(1)}KB`);
        resolve(compressedFile);
      }, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload image to Cloudinary with automatic compression
 * @param {File} imageFile - Image file to upload
 * @param {string} folder - Cloudinary folder (optional)
 * @returns {Promise<string>} - Cloudinary URL
 */
async function uploadImageToCloudinary(imageFile, folder = 'general') {
  console.log('[uploadImageToCloudinary] Starting upload...');
  
  try {
    // Compress image if it's larger than 500KB
    let fileToUpload = imageFile;
    if (imageFile.size > 500 * 1024) { // 500KB
      console.log('[uploadImageToCloudinary] Compressing large image...');
      fileToUpload = await compressImage(imageFile, 0.8, 1200);
    }
    
    // Create FormData for upload
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', `${CLOUDINARY_CONFIG.folder}/${folder}`);
    
    // Upload to Cloudinary with timeout
    const uploadPromise = fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout')), 30000); // 30 second timeout
    });
    
    const response = await Promise.race([uploadPromise, timeoutPromise]);
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('[uploadImageToCloudinary] Upload successful:', result.secure_url);
    return result.secure_url;
    
  } catch (error) {
    console.error('[uploadImageToCloudinary] Upload failed:', error);
    throw error;
  }
}

/**
 * Upload vaccination proof image
 * @param {File} imageFile - Vaccination proof image
 * @returns {Promise<string>} - Cloudinary URL
 */
async function uploadVaccinationProof(imageFile) {
  return await uploadImageToCloudinary(imageFile, 'vaccination-proofs');
}

/**
 * Upload grooming reference image
 * @param {File} imageFile - Grooming reference image  
 * @returns {Promise<string>} - Cloudinary URL
 */
async function uploadGroomingReference(imageFile) {
  return await uploadImageToCloudinary(imageFile, 'grooming-references');
}

/**
 * Upload profile picture
 * @param {File} imageFile - Profile picture
 * @returns {Promise<string>} - Cloudinary URL
 */
async function uploadProfilePicture(imageFile) {
  return await uploadImageToCloudinary(imageFile, 'profile-pictures');
}

/**
 * Upload before grooming image
 * @param {File} imageFile - Before grooming image
 * @returns {Promise<string>} - Cloudinary URL
 */
async function uploadBeforeImage(imageFile) {
  return await uploadImageToCloudinary(imageFile, 'grooming-before-after/before');
}

/**
 * Upload after grooming image
 * @param {File} imageFile - After grooming image
 * @returns {Promise<string>} - Cloudinary URL
 */
async function uploadAfterImage(imageFile) {
  return await uploadImageToCloudinary(imageFile, 'grooming-before-after/after');
}

/**
 * Upload payment QR code
 * @param {File} imageFile - Payment QR code image
 * @returns {Promise<string>} - Cloudinary URL
 */
async function uploadPaymentQR(imageFile) {
  return await uploadImageToCloudinary(imageFile, 'payment-qr-codes');
}

/**
 * Generate optimized Cloudinary URL
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized URL
 */
function getOptimizedImageUrl(publicId, options = {}) {
  const {
    width = 400,
    height = 400,
    crop = 'fill',
    quality = 'auto',
    format = 'auto'
  } = options;
  
  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/w_${width},h_${height},c_${crop},q_${quality},f_${format}/${publicId}`;
}

/**
 * Handle image upload with progress and error handling
 * @param {HTMLInputElement} fileInput - File input element
 * @param {string} folder - Upload folder
 * @param {Function} onProgress - Progress callback
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 */
async function handleImageUpload(fileInput, folder, onProgress, onSuccess, onError) {
  const file = fileInput.files[0];
  if (!file) {
    onError('No file selected');
    return;
  }
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    onError('Please select an image file');
    return;
  }
  
  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    onError('Image size must be less than 10MB');
    return;
  }
  
  try {
    onProgress('Uploading image...');
    
    const imageUrl = await uploadImageToCloudinary(file, folder);
    
    onProgress('Upload complete!');
    onSuccess(imageUrl);
    
  } catch (error) {
    console.error('[handleImageUpload] Error:', error);
    onError(`Upload failed: ${error.message}`);
  }
}

// Make functions globally available
window.uploadImageToCloudinary = uploadImageToCloudinary;
window.compressImage = compressImage;
window.uploadVaccinationProof = uploadVaccinationProof;
window.uploadGroomingReference = uploadGroomingReference;
window.uploadProfilePicture = uploadProfilePicture;
window.uploadBeforeImage = uploadBeforeImage;
window.uploadAfterImage = uploadAfterImage;
window.uploadPaymentQR = uploadPaymentQR;
window.getOptimizedImageUrl = getOptimizedImageUrl;
window.handleImageUpload = handleImageUpload;
window.CLOUDINARY_CONFIG = CLOUDINARY_CONFIG;

console.log('[cloudinary-helper.js] Cloudinary helper loaded');