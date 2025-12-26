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
  apiKey: "AIzaSyC61GEWq7wYpJ7nu6Fod_3bOBRtM4UpwTA",
  authDomain: "bestbuddiespetshop-93c00.firebaseapp.com",
  databaseURL: "https://bestbuddiespetshop-93c00-default-rtdb.firebaseio.com",
  projectId: "bestbuddiespetshop-93c00",
  storageBucket: "bestbuddiespetshop-93c00.firebasestorage.app",
  messagingSenderId: "723356352172",
  appId: "1:723356352172:web:33e087a9b9e59714576909",
  measurementId: "G-52Z5H37LC0"
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
