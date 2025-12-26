# Booking System Updates

Use this document to update the booking system. Check if each feature already exists - if yes, skip it. If not, implement it.

---

## 1. Edit Booking - Keep Existing Booking Data

**Problem:** When user clicks "Edit" on an existing booking, the form loads profile data instead of the booking's actual data.

**Solution:** Skip profile loading and user auto-fill when editing existing booking.

### File: `js/booking.js`

**Find the code that auto-fills user info (around `initBooking` function):**

```javascript
if (user && !isRescheduleMode) {
  if (ownerNameInput) {
    ownerNameInput.value = user.name || '';
    bookingData.ownerName = user.name || '';
  }
  // ... phone auto-fill
}
```

**Replace with:**

```javascript
// Check if we're editing an existing booking BEFORE overwriting with user data
const hasEditingData = editingBookingId || bookingData.editingBookingId;

if (user && !isRescheduleMode && !hasEditingData) {
  if (ownerNameInput && !bookingData.ownerName) {
    ownerNameInput.value = user.name || '';
    bookingData.ownerName = user.name || '';
  }
  if (contactNumberInput && user.phone && !bookingData.contactNumber) {
    contactNumberInput.value = user.phone;
    bookingData.contactNumber = user.phone;
  }
} else if (hasEditingData) {
  console.log('[initBooking] Editing mode - using existing booking data, not user profile');
}
```

**Find the code that loads saved profile:**

```javascript
const savedProfile = await getCustomerProfile(user.id);
if (savedProfile) {
  applyProfileToForm(savedProfile);
}
```

**Replace with:**

```javascript
const isEditingExistingBooking = bookingData.editingBookingId || sessionStorage.getItem('editingBookingId');

// Only load profile if NOT editing an existing booking
if (!isEditingExistingBooking && !isRescheduleMode) {
  const savedProfile = await getCustomerProfile(user.id);
  if (savedProfile) {
    applyProfileToForm(savedProfile);
  }
} else {
  console.log('[initBooking] Skipping profile load - editing existing booking');
}

// Also skip autoLoadProfile when editing
const autoLoad = sessionStorage.getItem('autoLoadProfile');
if (autoLoad === 'true' && !isEditingExistingBooking) {
  sessionStorage.removeItem('autoLoadProfile');
  await handleAutoProfileLoad();
} else if (autoLoad === 'true') {
  sessionStorage.removeItem('autoLoadProfile'); // Clear flag anyway
}
```

---

## 2. Duplicate Booking Detection - Show Alert & Go to Calendar

**Problem:** When duplicate booking detected, user doesn't know what to do.

**Solution:** Show clear alert with pet name/date/time, then go back to calendar step (step 4) so user can pick different date.

**Rule:**
- Same pet + same date + same time = BLOCKED (duplicate)
- Same pet + different date = ALLOWED (advance booking OK)

### File: `js/booking.js`

**Find the duplicate detection code in `submitBooking` function:**

```javascript
if (isDuplicate) {
  // ... existing code
}
```

**Replace with:**

```javascript
if (isDuplicate) {
  console.warn('[submitBooking] Duplicate booking detected, skipping creation');
  
  if (typeof completeSubmissionFailed === 'function' && submissionToken) {
    completeSubmissionFailed(submissionToken, 'Duplicate booking detected');
  }
  
  if (typeof hideLoadingOverlay === 'function') hideLoadingOverlay();
  
  // Show warning with clear message about what's duplicate
  await customAlert.warning(
    'Duplicate Booking', 
    `You already have a pending booking for "${booking.petName}" on ${booking.date} at ${booking.time}.\n\nPlease select a different date.`
  );
  
  // Reset submission flag so user can try again
  isSubmittingBooking = false;
  
  // Go back to calendar/schedule step (step 4) so user can pick different date
  showStep(4);
  
  return;
}
```

---

## 3. Fix Redirect to booking-success.html

**Problem:** After booking, user goes to dashboard instead of booking-success.html.

**Solution:** 
1. Remove forced redirect from `createBooking()` in firebase-db.js
2. Export `redirect` function globally in main.js

### File: `js/firebase-db.js`

**Find `createBooking` function and remove any redirect code:**

```javascript
async function createBooking(booking) {
  try {
    const db = getDatabase();
    if (!db) throw new Error('Firebase Database not initialized');
    const bookingsRef = ref(db, 'bookings/' + booking.id);
    await set(bookingsRef, booking);

    // Notify UI
    try { window.dispatchEvent(new CustomEvent('booking:created', { detail: booking })); } catch (e) { }

    // DON'T redirect here - let the calling code (booking.js) handle the redirect
    console.log('[createBooking] Booking created successfully:', booking.id);
    return booking;
  } catch (e) {
    console.error('createBooking failed', e);
    try { window.dispatchEvent(new CustomEvent('booking:created', { detail: booking })); } catch (e) { }
    throw e;
  }
}
```

### File: `js/main.js`

**Find the `redirect` function and make sure it's exported globally:**

```javascript
function redirect(path) {
  window.location.href = path;
}
window.redirect = redirect;
```

---

## 4. Fix Transaction Duplicate Error

**Problem:** Firebase transaction runs twice, second run sees booking from first run and throws "duplicate detected" error even though booking was created.

**Solution:** When transaction doesn't commit, check if booking was actually created in previous attempt.

### File: `js/booking-server.js`

**Find the code after `runTransaction`:**

```javascript
if (!result.committed) {
  throw new Error('Booking creation failed - possible duplicate detected');
}
```

**Replace with:**

```javascript
if (!result.committed) {
  // Check if booking was actually created despite transaction not committing
  const snapshot = result.snapshot;
  if (snapshot && snapshot.val()) {
    const bookings = snapshot.val();
    const recentBooking = Object.values(bookings).find(b => 
      b.userId === user.id &&
      b.date === bookingData.date &&
      b.time === bookingData.time &&
      b.petName === bookingData.petName &&
      b.serverGenerated === true &&
      (Date.now() - b.createdAt) < 10000 // Created within last 10 seconds
    );
    
    if (recentBooking) {
      console.log('[createBookingSecure] Booking was created in previous transaction attempt:', recentBooking.id);
      return recentBooking;
    }
  }
  throw new Error('Booking creation failed - possible duplicate detected');
}
```

---

## 5. Fix customAlert.alert Error

**Problem:** `customAlert.alert is not a function` error when booking fails.

**Solution:** Use `customAlert.error` instead of `customAlert.alert`.

### File: `js/booking.js`

**Find in the catch block of `submitBooking`:**

```javascript
if (typeof customAlert !== 'undefined') {
  await customAlert.alert('Booking Failed', `Error: ${errorMsg}`);
}
```

**Replace with:**

```javascript
if (typeof customAlert !== 'undefined' && typeof customAlert.error === 'function') {
  await customAlert.error('Booking Failed', `Error: ${errorMsg}\n\nPlease try again or contact support.`);
} else {
  alert(`Booking failed: ${errorMsg}\n\nPlease try again.`);
}
```

---

## 6. Fix Cache Not Invalidating on Update

**Problem:** After editing booking, old data still shows because cache not cleared.

**Solution:** Invalidate bookings cache in `updateBooking()` function.

### File: `js/firebase-db.js`

**Find `updateBooking` function, after the `set()` call, add cache invalidation:**

```javascript
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
```

---

## Summary

| Feature | File | What to Check |
|---------|------|---------------|
| Edit booking keeps data | js/booking.js | `hasEditingData` or `isEditingExistingBooking` check exists |
| Duplicate shows alert + goes to calendar | js/booking.js | `showStep(4)` after duplicate warning |
| Redirect to booking-success | js/firebase-db.js | No `window.location.href` in createBooking |
| Redirect function exported | js/main.js | `window.redirect = redirect` exists |
| Transaction duplicate fix | js/booking-server.js | Check for `recentBooking` when `!result.committed` |
| customAlert.error | js/booking.js | Uses `customAlert.error` not `customAlert.alert` |
| Cache invalidation | js/firebase-db.js | `bookingsCache = null` in updateBooking |
