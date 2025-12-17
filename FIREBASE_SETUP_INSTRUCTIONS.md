# Firebase Setup Instructions

## ✅ Integration Complete!

Your application is now integrated with Firebase! Here's what you need to do:

## Step 1: Enable Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **testing-6398b**
3. Go to **Authentication** → **Sign-in method**
4. Click on **Email/Password**
5. Enable it and click **Save**

## Step 2: Create Realtime Database

1. In Firebase Console, go to **Realtime Database**
2. Click **Create Database**
3. Choose location (closest to your users)
4. Start in **Test Mode** (for now - we'll add security rules later)
5. Click **Enable**

## Step 3: Update Security Rules (Important!)

Go to **Realtime Database** → **Rules** and paste this:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'",
        ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'"
      }
    },
    "bookings": {
      "$bookingId": {
        ".read": "auth != null",
        ".write": "auth != null && (data.child('user_id').val() === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin')"
      }
    },
    "packages": {
      ".read": true,
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "groomers": {
      ".read": true,
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "customerProfiles": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin'",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

Click **Publish**

## Step 4: Initialize Default Data

You'll need to add initial data to Firebase. You can do this manually in the Firebase Console or use the migration script.

### Option A: Manual (Recommended for first time)

1. Go to **Realtime Database** → **Data**
2. Add these nodes:

**packages/** - Add your service packages
**groomers/** - Add your groomers
**users/** - Add admin user (after creating account)

### Option B: Use Migration Script

Create a migration script to copy localStorage data to Firebase (if you have existing data).

## Step 5: Test the Integration

1. **Test Signup:**
   - Go to `signup.html`
   - Create a new account
   - Check Firebase Console → Authentication → Users (should see new user)
   - Check Firebase Console → Realtime Database → users (should see user profile)

2. **Test Login:**
   - Go to `login.html`
   - Login with the account you created
   - Should redirect to customer dashboard

3. **Test Booking:**
   - Go to `booking.html`
   - Complete a booking
   - Check Firebase Console → Realtime Database → bookings (should see new booking)

## Files Created

- ✅ `js/firebase-config.js` - Firebase configuration
- ✅ `js/firebase-db.js` - Database helper functions
- ✅ Updated `js/auth.js` - Firebase Authentication
- ✅ Updated `js/main.js` - Async Firebase functions
- ✅ Updated `js/booking.js` - Async Firebase functions
- ✅ Updated all HTML files - Added Firebase scripts

## How It Works

1. **Authentication:** Uses Firebase Auth (secure, no passwords stored)
2. **Database:** Uses Firebase Realtime Database (real-time sync)
3. **Fallback:** If Firebase is unavailable, falls back to localStorage
4. **Data Sync:** Data syncs between Firebase and localStorage as backup

## Troubleshooting

### "Firebase not initialized"
- Check browser console (F12) for errors
- Make sure `js/firebase-config.js` loads first
- Verify Firebase config is correct

### "Permission denied"
- Update Security Rules (see Step 3)
- Make sure Authentication is enabled
- Check that user is logged in

### "Module not found"
- Make sure scripts use `type="module"`
- Check browser supports ES6 modules
- Verify all imports are correct

## Next Steps

1. ✅ Enable Authentication
2. ✅ Create Database
3. ✅ Set Security Rules
4. ⚠️ Initialize default data (packages, groomers)
5. ⚠️ Test all functionality

Your app is now ready to use Firebase! 🎉

