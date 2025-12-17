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

    // Get user profile from Firebase Database
    const db = getDatabase();
    if (db) {
      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(userRef);

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
    }

    // Check localStorage cache
    const cachedProfile = localStorage.getItem(`firebase_user_${user.uid}`);
    if (cachedProfile) {
      return JSON.parse(cachedProfile);
    }

    // Return basic user info if profile doesn't exist yet
    return {
      id: user.uid,
      email: user.email,
      name: user.displayName || user.email,
      role: 'customer'
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    // Fallback to localStorage
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
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

async function getUsers() {
  // Prefer an externally-provided implementation
  if (typeof window.getUsersImpl === 'function') {
    try {
      return await window.getUsersImpl();
    } catch (e) {
      console.warn('getUsersImpl failed:', e);
      // fallthrough to other fallbacks
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
    console.warn('Error getting users from Realtime DB:', e);
    // If permission denied, return empty array so UI can continue with local fallbacks
    if (e && (e.code === 'PERMISSION_DENIED' || (e.message && e.message.toLowerCase().includes('permission')))) {
      return [];
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

async function getBookings() {
  try {
    const db = getDatabase();
    if (!db) {
      return JSON.parse(localStorage.getItem('bookings') || '[]');
    }

    const bookingsRef = ref(db, 'bookings');
    const snapshot = await get(bookingsRef);

    if (snapshot.exists()) {
      const bookingsData = snapshot.val();
      return Object.keys(bookingsData).map(key => ({
        id: key,
        ...bookingsData[key]
      }));
    }

    return [];
  } catch (error) {
    console.error('Error getting bookings:', error);
    // If permission denied, fall back to localStorage and show helpful message
    if (error.message && error.message.includes('Permission denied')) {
      console.warn('Permission denied reading bookings. Please update Firebase security rules to allow reading bookings. See FIX_BOOKING_PERMISSION_ERROR.md');
    }
    // Fallback to localStorage
    return JSON.parse(localStorage.getItem('bookings') || '[]');
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
    } catch (e) {
      // If any child write failed due to permissions, try writing root (may still fail)
      console.warn('Per-child booking writes failed, attempting root set', e);
      try {
        await set(bookingsRef, bookingsObj);
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

    // If booking flow page, navigate to customer dashboard
    const p = window.location.pathname.toLowerCase();
    if (p.endsWith('booking.html') || p.endsWith('booking-success.html')) {
      window.location.href = 'customer-dashboard.html';
    }
    return booking;
  } catch (e) {
    console.error('createBooking failed', e);
    // best-effort notify + redirect so user still reaches dashboard
    try { window.dispatchEvent(new CustomEvent('booking:created', { detail: booking })); } catch (e) { }
    const p = window.location.pathname.toLowerCase();
    if (p.endsWith('booking.html') || p.endsWith('booking-success.html')) {
      window.location.href = 'customer-dashboard.html';
    }
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

async function getGroomers() {
  try {
    const db = getDatabase();
    if (!db) {
      return JSON.parse(localStorage.getItem('groomers') || '[]');
    }

    const groomersRef = ref(db, 'groomers');
    const snapshot = await get(groomersRef);

    if (snapshot.exists()) {
      const groomersData = snapshot.val();
      return Object.keys(groomersData).map(key => ({
        id: key,
        ...groomersData[key]
      }));
    }

    return [];
  } catch (error) {
    console.error('Error getting groomers:', error);
    return JSON.parse(localStorage.getItem('groomers') || '[]');
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
  saveGroomers
};

