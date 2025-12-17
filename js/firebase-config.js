/* ============================================
   BestBuddies Pet Grooming - Firebase Configuration
   Updated to user-provided project config while preserving auth/database exports
   ============================================ */

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// User-provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBFIRv4kufQt_cAJ0nLTV2No_zsSOFFq_w",
  authDomain: "bestbuddiespetshop.firebaseapp.com",
  projectId: "bestbuddiespetshop",
  storageBucket: "bestbuddiespetshop.firebasestorage.app",
  messagingSenderId: "954635072456",
  appId: "1:954635072456:web:696796ead82c6dc04546fd",
  measurementId: "G-GSV3XX38CG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
let database;
try {
  database = getDatabase(app);
} catch (e) {
  console.warn('Realtime Database not configured for this project or getDatabase failed:', e);
  database = null;
}

// Make Firebase services globally available
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDatabase = database;
window.firebaseAnalytics = analytics;

console.log('Firebase initialized with updated config');
