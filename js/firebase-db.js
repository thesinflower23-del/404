/* ============================================
   BestBuddies Pet Grooming - Firebase Database Helpers
   ============================================ */

import { ref, set, get, push, update, remove, onValue, off } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// Get Firebase services
function getDatabase() {
  return window.firebaseDatabase;
}

function getAuth() {
  return window.firebaseAuth;
}

// ============================================
// Authentication Helpers
// ============================================

// Get current user from Firebase Auth and Database
async function getCurrentUser() {
  try {
    const auth = getAuth();
    if (!auth) {
      // Fallback to localStorage
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    }

    const user = auth.currentUser;
    if (!user) {
      // Fallback to localStorage
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    }

    // Get user profile from Firebase Database with timeout
    const db = getDatabase();
    if (db) {
      try {
        const userRef = ref(db, `users/${user.uid}`);
        
        // Add timeout to Firebase call
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Firebase timeout')), 5000);
        });
        
        const snapshot = await Promise.race([
          get(userRef),
          timeoutPromise
        ]);

        if (snapshot.exists()) {
          const userProfile = snapshot.val();
          userProfile.id = user.uid;

          // Debug: Log what we got from Firebase
          console.log('User profile from Firebase:', userProfile);
          console.log('User name from Firebase:', userProfile.name);

          // Cache in localStorage
          setCurrentUser(userProfile);
          return userProfile;
        } else {
          console.warn('User profile not found in Firebase for UID:', user.uid);
        }
      } catch (firebaseError) {
        console.warn('Firebase user fetch failed, using fallback:', firebaseError.message);
        
        // Check localStorage cache first
        const cachedProfile = localStorage.getItem(`firebase_user_${user.uid}`);
        if (cachedProfile) {
          console.log('Using cached user profile');
          return JSON.parse(cachedProfile);
        }
      }
    }

    // Check localStorage cache
    const cachedProfile = localStorage.getItem(`firebase_user_${user.uid}`);
    if (cachedProfile) {
      return JSON.parse(cachedProfile);
    }

    // Return basic user info if profile doesn't exist yet
    const basicUser = {
      id: user.uid,
      email: user.email,
      name: user.displayName || user.email?.split('@')[0] || 'Customer',
      role: 'customer'
    };
    
    // Cache the basic user info
    setCurrentUser(basicUser);
    return basicUser;
    
  } catch (error) {
    console.error('Error getting current user:', error);
    
    // Fallback to localStorage
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      console.log('Using localStorage fallback user');
      return JSON.parse(userStr);
    }
    
    // Last resort: return null (will trigger login redirect)
    return null;
  }
}

// Set current user
function setCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
  if (user.id) {
    localStorage.setItem(`firebase_user_${user.id}`, JSON.stringify(user));
  }
}

// Clear current user
function clearCurrentUser() {
  localStorage.removeItem('currentUser');
  const auth = getAuth();
  if (auth && auth.currentUser) {
    localStorage.removeItem(`firebase_user_${auth.currentUser.uid}`);
  }
}

// ============================================
// Database Helpers - Users
// ============================================

// Cache for users to prevent repeated Firebase calls
let usersCache = null;
let usersCacheTime = 0;
const USERS_CACHE_DURATION = 60000; // 1 minute cache
let usersPermissionDenied = false; // Track if permission was denied

async function getUsers() {
  // If permission was already denied, use localStorage directly
  if (usersPermissionDenied) {
    const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
    return localUsers;
  }
  
  // Return cached data if still valid
  if (usersCache && (Date.now() - usersCacheTime) < USERS_CACHE_DURATION) {
    return usersCache;
  }
  
  // Prefer an externally-provided implementation
  if (typeof window.getUsersImpl === 'function') {
    try {
      const users = await window.getUsersImpl();
      usersCache = users;
      usersCacheTime = Date.now();
      return users;
    } catch (e) {
      // Silent fallthrough
    }
  }

  // Try Realtime Database (preferred for this project)
  try {
    const db = getDatabase();
    if (db) {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        return Object.keys(usersData).map(key => ({ id: key, ...usersData[key] }));
      }
      return [];
    }
  } catch (e) {
    // Handle permission errors silently
    if (e && (e.code === 'PERMISSION_DENIED' || (e.message && e.message.toLowerCase().includes('permission')))) {
      // Set flag to prevent repeated Firebase calls
      usersPermissionDenied = true;
      
      // Return local users if available
      const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
      usersCache = localUsers;
      usersCacheTime = Date.now();
      return localUsers;
    }
    // otherwise fallthrough to try Firestore/localStorage
  }

  // Try Firestore (legacy / optional) — guard if Firestore 'db' exists
  try {
    if (typeof db !== 'undefined' && typeof db.collection === 'function') {
      const snapshot = await db.collection('users').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (e) {
    console.warn('Error getting users from Firestore:', e);
    // return empty array on permission denied or other errors
    return [];
  }

  // LocalStorage fallback for offline / development
  try {
    const stored = localStorage.getItem('users');
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.warn('Error reading users from localStorage:', e);
  }

  return [];
}

async function saveUsers(users) {
  try {
    const db = getDatabase();
    // If DB not available or we've detected write denial, use localStorage only
    if (!db || window.firebaseWriteDenied) {
      localStorage.setItem('users', JSON.stringify(users));
      return;
    }

    const usersRef = ref(db, 'users');
    const usersObj = {};
    users.forEach(user => {
      usersObj[user.id] = user;
    });

    await set(usersRef, usersObj);
    // Also save to localStorage as backup
    localStorage.setItem('users', JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users:', error);
    // If permission denied, mark a flag to avoid future Firebase write attempts
    if (error && (error.code === 'PERMISSION_DENIED' || (error.message && error.message.toLowerCase().includes('permission')))) {
      console.warn('Firebase write permission denied — using localStorage fallback for writes.');
      window.firebaseWriteDenied = true;
    }
    // Ensure we still persist to localStorage
    try { localStorage.setItem('users', JSON.stringify(users)); } catch (e) { /* ignore */ }
  }
}

// ============================================
// Database Helpers - Bookings
// ============================================

// Cache for bookings to prevent repeated Firebase calls
let bookingsCache = null;
let bookingsCacheTime = 0;
const BOOKINGS_CACHE_DURATION = 30000; // 30 seconds cache
let bookingsPermissionDenied = false; // Track if permission was denied

// Function to update bookings cache from real-time listener
function updateBookingsCache(bookings) {
  bookingsCache = bookings;
  bookingsCacheTime = Date.now();
  // Try to save to localStorage but don't fail if quota exceeded
  try {
    localStorage.setItem('bookings', JSON.stringify(bookings));
  } catch (e) {
    console.warn('[firebase-db] localStorage quota exceeded, using memory cache only');
    // Clear old bookings data to free up space
    try {
      localStorage.removeItem('bookings');
    } catch (clearError) {
      // Ignore
    }
  }
}
window.updateBookingsCache = updateBookingsCache;

async function getBookings() {
  // If permission was already denied, use localStorage directly
  if (bookingsPermissionDenied) {
    return JSON.parse(localStorage.getItem('bookings') || '[]');
  }
  
  // Return cached data if still valid AND not empty (empty cache might be stale)
  if (bookingsCache && bookingsCache.length > 0 && (Date.now() - bookingsCacheTime) < BOOKINGS_CACHE_DURATION) {
    return bookingsCache;
  }
  
  try {
    const db = getDatabase();
    if (!db) {
      console.log('[getBookings] No database, using localStorage');
      return JSON.parse(localStorage.getItem('bookings') || '[]');
    }

    const bookingsRef = ref(db, 'bookings');
    const snapshot = await get(bookingsRef);

    if (snapshot.exists()) {
      const bookingsData = snapshot.val();
      const bookings = Object.keys(bookingsData).map(key => ({
        id: key,
        ...bookingsData[key]
      }));
      
      // Cache the result in memory
      bookingsCache = bookings;
      bookingsCacheTime = Date.now();
      
      // Try to save to localStorage but don't fail if quota exceeded
      try {
        localStorage.setItem('bookings', JSON.stringify(bookings));
      } catch (e) {
        console.warn('[getBookings] localStorage quota exceeded, using memory cache only');
      }
      
      return bookings;
    }

    console.log('[getBookings] No bookings in Firebase snapshot');
    return [];
  } catch (error) {
    console.error('[getBookings] Error:', error.message);
    
    // Handle permission errors silently
    if (error.message && error.message.includes('Permission denied')) {
      bookingsPermissionDenied = true;
    }
    
    // If we have memory cache, use it even if expired
    if (bookingsCache && bookingsCache.length > 0) {
      console.log('[getBookings] Using memory cache fallback:', bookingsCache.length, 'bookings');
      return bookingsCache;
    }
    
    // Last resort: try localStorage
    try {
      const localBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      console.log('[getBookings] Using localStorage fallback:', localBookings.length, 'bookings');
      return localBookings;
    } catch (e) {
      return [];
    }
  }
}

async function saveBookings(bookings) {
  try {
    const db = getDatabase();
    if (!db) throw new Error('Firebase Database not initialized');

    const bookingsRef = ref(db, 'bookings');
    const bookingsObj = {};
    bookings.forEach(booking => {
      // Sanitize NaN values before saving
      if (booking.totalPrice !== undefined && isNaN(booking.totalPrice)) {
        console.warn(`Sanitizing NaN totalPrice for booking ${booking.id}`);
        booking.totalPrice = booking.cost?.subtotal || 0;
      }
      if (booking.cost?.subtotal !== undefined && isNaN(booking.cost.subtotal)) {
        console.warn(`Sanitizing NaN subtotal for booking ${booking.id}`);
        booking.cost.subtotal = 0;
      }
      if (booking.cost?.balanceOnVisit !== undefined && isNaN(booking.cost.balanceOnVisit)) {
        console.warn(`Sanitizing NaN balanceOnVisit for booking ${booking.id}`);
        booking.cost.balanceOnVisit = 0;
      }
      bookingsObj[booking.id] = booking;
    });
    // Write each booking as a child so the security rules for $bookingId apply
    const writePromises = Object.keys(bookingsObj).map(id => {
      const childRef = ref(db, 'bookings/' + id);
      return set(childRef, bookingsObj[id]);
    });
    try {
      await Promise.all(writePromises);
      console.log('[saveBookings] Successfully saved', bookings.length, 'bookings to Firebase');
      
      // Invalidate cache so next getBookings fetches fresh data
      bookingsCache = null;
      bookingsCacheTime = 0;
    } catch (e) {
      // If any child write failed due to permissions, try writing root (may still fail)
      console.warn('Per-child booking writes failed, attempting root set', e);
      try {
        await set(bookingsRef, bookingsObj);
        // Invalidate cache on success
        bookingsCache = null;
        bookingsCacheTime = 0;
      } catch (rootErr) {
        // Mark write denial if applicable and rethrow so caller can handle
        if (rootErr && (rootErr.code === 'PERMISSION_DENIED' || (rootErr.message && rootErr.message.toLowerCase().includes('permission')))) {
          console.warn('Firebase write permission denied when saving bookings.');
          window.firebaseWriteDenied = true;
        }
        throw rootErr;
      }
    }
  } catch (error) {
    console.error('Error saving bookings:', error);
    if (error && (error.code === 'PERMISSION_DENIED' || (error.message && error.message.toLowerCase().includes('permission')))) {
      console.warn('Firebase write permission denied when saving bookings.');
      window.firebaseWriteDenied = true;
    }
    // Do NOT persist bookings to localStorage - require Firebase persistence
    throw error;
  }
}

async function createBooking(booking) {
  try {
    const db = getDatabase();
    if (!db) throw new Error('Firebase Database not initialized');
    const bookingsRef = ref(db, 'bookings/' + booking.id);
    try {
      await set(bookingsRef, booking);
    } catch (err) {
      if (err && (err.code === 'PERMISSION_DENIED' || (err.message && err.message.toLowerCase().includes('permission')))) {
        console.warn('Firebase write permission denied when creating booking.');
        window.firebaseWriteDenied = true;
      }
      // Rethrow so caller can handle (no localStorage fallback)
      throw err;
    }

    // Notify UI
    try { window.dispatchEvent(new CustomEvent('booking:created', { detail: booking })); } catch (e) { }

    // Don't redirect here - let the calling code (booking.js) handle the redirect
    // This allows proper flow to booking-success.html
    console.log('[createBooking] Booking created successfully:', booking.id);
    return booking;
  } catch (e) {
    console.error('createBooking failed', e);
    // best-effort notify
    try { window.dispatchEvent(new CustomEvent('booking:created', { detail: booking })); } catch (e) { }
    throw e;
  }
}

// Update a single booking in Firebase (for customer updates like proof of payment)
async function updateBooking(booking) {
  try {
    const db = getDatabase();
    if (!db) throw new Error('Firebase Database not initialized');
    
    if (!booking || !booking.id) {
      throw new Error('Invalid booking: missing id');
    }
    
    // Sanitize NaN values before saving
    if (booking.totalPrice !== undefined && isNaN(booking.totalPrice)) {
      console.warn(`Sanitizing NaN totalPrice for booking ${booking.id}`);
      booking.totalPrice = booking.cost?.subtotal || 0;
    }
    if (booking.cost?.subtotal !== undefined && isNaN(booking.cost.subtotal)) {
      console.warn(`Sanitizing NaN subtotal for booking ${booking.id}`);
      booking.cost.subtotal = 0;
    }
    if (booking.cost?.balanceOnVisit !== undefined && isNaN(booking.cost.balanceOnVisit)) {
      console.warn(`Sanitizing NaN balanceOnVisit for booking ${booking.id}`);
      booking.cost.balanceOnVisit = 0;
    }
    
    const bookingRef = ref(db, 'bookings/' + booking.id);
    await set(bookingRef, booking);
    
    console.log('[updateBooking] Successfully updated booking:', booking.id);
    
    // Invalidate cache so next getBookings fetches fresh data
    bookingsCache = null;
    bookingsCacheTime = 0;
    
    // Notify UI
    try { 
      window.dispatchEvent(new CustomEvent('booking:updated', { detail: booking })); 
    } catch (e) { }
    
    return booking;
  } catch (error) {
    console.error('[updateBooking] Error updating booking:', error);
    if (error && (error.code === 'PERMISSION_DENIED' || (error.message && error.message.toLowerCase().includes('permission')))) {
      console.warn('Firebase write permission denied when updating booking.');
      window.firebaseWriteDenied = true;
    }
    throw error;
  }
}

// Save an uplift request with optional proof (dataURL). Uploads proof to Firebase Storage (if available)
async function saveUpliftRequest(request) {
  try {
    const db = getDatabase();
    // If storage is available, try to upload proof and replace dataURL with a download URL
    if (typeof window !== 'undefined' && typeof getStorage === 'function' && request.proof && request.proof.startsWith('data:')) {
      try {
        const storage = getStorage();
        const fileName = `${request.id || 'uplift'}-${Date.now()}`;
        const path = `upliftRequests/${request.userId || 'anonymous'}/${fileName}`;
        const sRef = storageRef(storage, path);
        // uploadString supports data_url
        await uploadString(sRef, request.proof, 'data_url');
        const url = await getDownloadURL(sRef);
        request.proofUrl = url;
        // don't store the full dataURL in DB
        delete request.proof;
      } catch (e) {
        console.warn('Failed to upload uplift proof to Firebase Storage, continuing to save request record', e);
      }
    }

    if (!db) {
      // Fallback to localStorage if no DB
      const existing = JSON.parse(localStorage.getItem('upliftRequests') || '[]');
      existing.push(request);
      localStorage.setItem('upliftRequests', JSON.stringify(existing));
      return request;
    }

    // Save to Realtime Database under 'upliftRequests/{id}'
    const id = request.id || `uplift-${Date.now()}`;
    const upliftRef = ref(db, `upliftRequests/${id}`);
    await set(upliftRef, request);
    return request;
  } catch (err) {
    console.error('Error saving uplift request:', err);
    // rethrow so callers can handle
    throw err;
  }
}

// Get all uplift requests (Realtime DB preferred, fallback to localStorage)
async function getUpliftRequests() {
  try {
    const db = getDatabase();
    if (!db) {
      return JSON.parse(localStorage.getItem('upliftRequests') || '[]');
    }

    const upliftRef = ref(db, 'upliftRequests');
    const snapshot = await get(upliftRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map(k => ({ id: k, ...data[k] }));
    }
    return [];
  } catch (err) {
    console.error('Error getting uplift requests:', err);
    return JSON.parse(localStorage.getItem('upliftRequests') || '[]');
  }
}

// Update an uplift request record (merge fields). Falls back to localStorage when DB unavailable.
async function updateUpliftRequest(id, updates) {
  try {
    const db = getDatabase();
    if (!db) {
      const existing = JSON.parse(localStorage.getItem('upliftRequests') || '[]');
      const idx = existing.findIndex(r => r.id === id);
      if (idx !== -1) {
        existing[idx] = { ...existing[idx], ...updates };
        localStorage.setItem('upliftRequests', JSON.stringify(existing));
        return existing[idx];
      }
      return null;
    }

    const upliftRef = ref(db, `upliftRequests/${id}`);
    const snapshot = await get(upliftRef);
    const current = snapshot.exists() ? snapshot.val() : {};
    const merged = { ...current, ...updates };
    await set(upliftRef, merged);
    return merged;
  } catch (err) {
    console.error('Error updating uplift request:', err);
    throw err;
  }
}

window.getUpliftRequests = getUpliftRequests;
window.updateUpliftRequest = updateUpliftRequest;

// ============================================
// Database Helpers - Packages
// ============================================

async function getPackages() {
  try {
    const db = getDatabase();
    if (!db) {
      return JSON.parse(localStorage.getItem('packages') || '[]');
    }

    const packagesRef = ref(db, 'packages');
    const snapshot = await get(packagesRef);

    if (snapshot.exists()) {
      const packagesData = snapshot.val();
      return Object.keys(packagesData).map(key => ({
        id: key,
        ...packagesData[key]
      }));
    }

    return [];
  } catch (error) {
    console.error('Error getting packages:', error);
    return JSON.parse(localStorage.getItem('packages') || '[]');
  }
}

async function savePackages(packages) {
  try {
    const db = getDatabase();
    if (!db || window.firebaseWriteDenied) {
      const packagesObj = {};
      packages.forEach(p => packagesObj[p.id] = p);
      localStorage.setItem('packages', JSON.stringify(packagesObj));
      return;
    }

    const packagesRef = ref(db, 'packages');
    const packagesObj = {};
    packages.forEach(pkg => {
      packagesObj[pkg.id] = pkg;
    });

    await set(packagesRef, packagesObj);
    localStorage.setItem('packages', JSON.stringify(packagesObj));
  } catch (error) {
    console.error('Error saving packages:', error);
    if (error && (error.code === 'PERMISSION_DENIED' || (error.message && error.message.toLowerCase().includes('permission')))) {
      console.warn('Firebase write permission denied — using localStorage fallback for packages.');
      window.firebaseWriteDenied = true;
    }
    const packagesObj = {};
    packages.forEach(p => packagesObj[p.id] = p);
    try { localStorage.setItem('packages', JSON.stringify(packagesObj)); } catch (e) { /* ignore */ }
  }
}

// ============================================
// Database Helpers - Groomers
// ============================================

// Default groomers fallback when no data available
const DEFAULT_GROOMERS = [
  { id: 'groomer-1', name: 'Groomer 1', maxDailyBookings: 5, isActive: true },
  { id: 'groomer-2', name: 'Groomer 2', maxDailyBookings: 5, isActive: true },
  { id: 'groomer-3', name: 'Groomer 3', maxDailyBookings: 5, isActive: true }
];

// Cache for groomers
let groomersCache = null;
let groomersCacheTime = 0;
const GROOMERS_CACHE_DURATION = 60000; // 1 minute
let groomersPermissionDenied = false;

async function getGroomers() {
  // If permission was already denied, use localStorage directly
  if (groomersPermissionDenied) {
    const localGroomers = JSON.parse(localStorage.getItem('groomers') || 'null');
    return localGroomers && localGroomers.length > 0 ? localGroomers : DEFAULT_GROOMERS;
  }
  
  // Return cached data if still valid
  if (groomersCache && groomersCache.length > 0 && (Date.now() - groomersCacheTime) < GROOMERS_CACHE_DURATION) {
    return groomersCache;
  }
  
  try {
    const db = getDatabase();
    if (!db) {
      const localGroomers = JSON.parse(localStorage.getItem('groomers') || 'null');
      return localGroomers && localGroomers.length > 0 ? localGroomers : DEFAULT_GROOMERS;
    }

    const groomersRef = ref(db, 'groomers');
    const snapshot = await get(groomersRef);

    if (snapshot.exists()) {
      const groomersData = snapshot.val();
      const groomers = Object.keys(groomersData).map(key => ({
        id: key,
        ...groomersData[key]
      }));
      
      // Cache the result
      groomersCache = groomers;
      groomersCacheTime = Date.now();
      localStorage.setItem('groomers', JSON.stringify(groomers));
      
      return groomers;
    }

    // No data in Firebase, use defaults
    return DEFAULT_GROOMERS;
  } catch (error) {
    // Handle permission errors silently
    if (error.message && error.message.includes('Permission denied')) {
      groomersPermissionDenied = true;
    }
    
    const localGroomers = JSON.parse(localStorage.getItem('groomers') || 'null');
    const result = localGroomers && localGroomers.length > 0 ? localGroomers : DEFAULT_GROOMERS;
    groomersCache = result;
    groomersCacheTime = Date.now();
    return result;
  }
}

async function saveGroomers(groomers) {
  try {
    const db = getDatabase();
    if (!db || window.firebaseWriteDenied) {
      localStorage.setItem('groomers', JSON.stringify(groomers));
      return;
    }

    const groomersRef = ref(db, 'groomers');
    const groomersObj = {};
    groomers.forEach(groomer => {
      groomersObj[groomer.id] = groomer;
    });

    await set(groomersRef, groomersObj);
    localStorage.setItem('groomers', JSON.stringify(groomers));
  } catch (error) {
    console.error('Error saving groomers:', error);
    if (error && (error.code === 'PERMISSION_DENIED' || (error.message && error.message.toLowerCase().includes('permission')))) {
      console.warn('Firebase write permission denied — using localStorage fallback for groomers.');
      window.firebaseWriteDenied = true;
    }
    try { localStorage.setItem('groomers', JSON.stringify(groomers)); } catch (e) { /* ignore */ }
  }
}

// ============================================
// Make functions globally available
// ============================================

window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.clearCurrentUser = clearCurrentUser;
window.getUsers = getUsers;
window.saveUsers = saveUsers;
window.getBookings = getBookings;
window.saveBookings = saveBookings;
window.createBooking = createBooking;
window.updateBooking = updateBooking;
window.getPackages = getPackages;
window.savePackages = savePackages;
window.getGroomers = getGroomers;
window.saveUpliftRequest = saveUpliftRequest;
window.saveGroomers = saveGroomers;

// Aliases for auto-cancel system in main.js
window.firebaseGetBookings = getBookings;
window.firebaseSaveBookings = saveBookings;

// ============================================
// Real-time Listeners for Auto-Refresh
// ============================================

/**
 * Setup real-time listener for packages (add-ons)
 * Automatically refreshes the add-ons table when data changes
 */
function setupPackagesListener(callback) {
  try {
    const db = getDatabase();
    if (!db) {
      console.warn('Database not available for real-time listener');
      return null;
    }

    const packagesRef = ref(db, 'packages');
    
    // Listen for changes
    const unsubscribe = onValue(packagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const packagesData = snapshot.val();
        const packagesArray = Array.isArray(packagesData) 
          ? packagesData 
          : Object.values(packagesData || {});
        
        console.log('[Real-time] Packages updated:', packagesArray.length);
        
        // Call the callback with updated data
        if (typeof callback === 'function') {
          callback(packagesArray);
        }
      } else {
        console.log('[Real-time] No packages data');
        if (typeof callback === 'function') {
          callback([]);
        }
      }
    }, (error) => {
      console.error('[Real-time] Error listening to packages:', error);
    });

    // Return unsubscribe function
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up packages listener:', error);
    return null;
  }
}

/**
 * Setup real-time listener for bookings
 * Automatically refreshes booking tables when data changes
 */
function setupBookingsListener(callback) {
  try {
    const db = getDatabase();
    if (!db) {
      console.warn('Database not available for real-time listener');
      return null;
    }

    const bookingsRef = ref(db, 'bookings');
    
    // Listen for changes
    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const bookingsData = snapshot.val();
        // Convert to array with IDs preserved
        const bookingsArray = Object.keys(bookingsData).map(key => ({
          id: key,
          ...bookingsData[key]
        }));
        
        // Update the global cache so getBookings() returns fresh data
        updateBookingsCache(bookingsArray);
        
        // Call the callback with updated data
        if (typeof callback === 'function') {
          callback(bookingsArray);
        }
      } else {
        console.log('[Real-time] No bookings data');
        updateBookingsCache([]);
        if (typeof callback === 'function') {
          callback([]);
        }
      }
    }, (error) => {
      console.error('[Real-time] Error listening to bookings:', error);
    });

    // Return unsubscribe function
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up bookings listener:', error);
    return null;
  }
}

/**
 * Remove/cleanup a real-time listener
 */
function removeListener(unsubscribe) {
  if (typeof unsubscribe === 'function') {
    unsubscribe();
    console.log('[Real-time] Listener removed');
  }
}

// Make available globally
window.setupPackagesListener = setupPackagesListener;
window.setupBookingsListener = setupBookingsListener;
window.removeListener = removeListener;

// ============================================
// Payment Settings Functions
// ============================================

/**
 * Get payment settings from Firebase
 */
async function getPaymentSettings() {
  console.log('[getPaymentSettings] Fetching payment settings...');
  try {
    const db = getDatabase();
    if (!db) {
      console.log('[getPaymentSettings] No database, using localStorage');
      // Fallback to localStorage
      const settings = localStorage.getItem('paymentSettings');
      console.log('[getPaymentSettings] localStorage settings:', settings);
      return settings ? JSON.parse(settings) : null;
    }

    const settingsRef = ref(db, 'settings/payment');
    const snapshot = await get(settingsRef);

    if (snapshot.exists()) {
      const settings = snapshot.val();
      console.log('[getPaymentSettings] Firebase settings found:', settings);
      // Cache in localStorage
      localStorage.setItem('paymentSettings', JSON.stringify(settings));
      return settings;
    }

    console.log('[getPaymentSettings] No settings in Firebase, checking localStorage');
    // Try localStorage as fallback
    const localSettings = localStorage.getItem('paymentSettings');
    if (localSettings) {
      console.log('[getPaymentSettings] Found in localStorage:', localSettings);
      return JSON.parse(localSettings);
    }

    return null;
  } catch (error) {
    console.error('[getPaymentSettings] Error:', error);
    // Fallback to localStorage
    const settings = localStorage.getItem('paymentSettings');
    console.log('[getPaymentSettings] Error fallback, localStorage:', settings);
    return settings ? JSON.parse(settings) : null;
  }
}

/**
 * Save payment settings to Firebase
 */
async function savePaymentSettings(settings) {
  console.log('[savePaymentSettings] Saving settings:', settings);
  try {
    const db = getDatabase();
    if (!db) {
      console.log('[savePaymentSettings] No database, using localStorage only');
      // Fallback to localStorage
      localStorage.setItem('paymentSettings', JSON.stringify(settings));
      return true;
    }

    const settingsRef = ref(db, 'settings/payment');
    await set(settingsRef, settings);

    // Also cache in localStorage
    localStorage.setItem('paymentSettings', JSON.stringify(settings));

    console.log('[savePaymentSettings] Settings saved successfully to Firebase and localStorage');
    return true;
  } catch (error) {
    console.error('[savePaymentSettings] Error:', error);
    // Fallback to localStorage
    localStorage.setItem('paymentSettings', JSON.stringify(settings));
    console.log('[savePaymentSettings] Saved to localStorage as fallback');
    return true;
  }
}

// Make payment settings functions globally available
// Note: Don't set window.savePaymentSettings here - that's handled by admin.js for form submission
window.getPaymentSettings = getPaymentSettings;
window.firebaseGetPaymentSettings = getPaymentSettings;
window.firebaseSavePaymentSettings = savePaymentSettings;

// Export for module use
export {
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
  getUsers,
  saveUsers,
  getBookings,
  saveBookings,
  createBooking,
  getPackages,
  savePackages,
  getGroomers,
  saveGroomers,
  setupPackagesListener,
  setupBookingsListener,
  removeListener,
  getPaymentSettings,
  savePaymentSettings
};

