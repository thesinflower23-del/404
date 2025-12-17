# BestBuddies Pet Grooming Platform - Partner & Developer Guide

## 🚀 Executive Summary

**BestBuddies Pet Grooming Platform** is a comprehensive, cloud-native solution designed to modernize pet grooming operations. It replaces manual scheduling with a real-time, self-service booking engine and provides business owners with a powerful command center to manage staff, clients, and revenue.

This documentation is intended for **strategic partners, stakeholders, and developers** joining the project.

---

## 💎 Core Capabilities

### 1. Customer Self-Service Portal
A frictionless experience for pet owners to book services 24/7.
- **Smart Booking Engine**: Automatically filters available slots based on groomer schedules and service duration (e.g., a "Full Styled Cut" blocks 90 mins vs. 60 mins for a "Bath").
- **Tiered Pricing**: Dynamic pricing adjustments based on pet weight (e.g., `<5kg`, `5-8kg`, `30kg+`).
- **Profile Management**: Customers can save pet details (breed, allergies, vet info) limits repetitive data entry.

### 2. Operational Command Center (Admin Dashboard)
A single pane of glass for business operations (`admin-dashboard.html`).
- **Live Feed**: Real-time view of "Pending", "Confirmed", and "Cancelled" appointments.
- **Smart Scheduling**: Visual calendar to manage shop blackouts, staff days off, and daily capacity.
- **Customer CRM**: specialized tools to "Warn" or "Ban" problematic clients (e.g., no-shows or aggressive pets).
- **Revenue Analytics**: Instant visibility into booking volume and potential revenue.

### 3. Staff Management
- **Groomer Specific Schedules**: Assign specific bookings to specific groomers (Sam, Jom, Botchoy, etc.).
- **Workload Balancing**: prevailing logic prevents overbooking a single groomer.

---

## 🧠 Business Logic & Rules

### Pricing Architecture
The platform utilizes a weight-tiered pricing model defined in the database:
- **Tiers**: `≤ 5kg` | `5.1-8kg` | `8-15kg` | `15.1-30kg` | `≥ 30.1kg`
- **Packages**:
  - *Basic Full Package*: Bath, Dry, Cut, Hygiene.
  - *Styled Full Package*: Includes precise styling (higher cost).
  - *Bubble Bath*: Bath-focused service.
- **Add-ons**: Toothbrushing, De-matting (variable pricing), Medicated Washes.

### Policy Enforcement
- **Booking Fee**: A strictly enforced ₱100 booking fee (deductible) to reduce no-shows.
- **Health Protocol**: Mandatory "Health & Waiver" agreement before every booking (flea/tick checks, aggression policy).

---

## 🏗 Technical Architecture

The platform is built on a **Serverless / JAMstack** architecture for maximum reliability and zero maintenance overhead.

### Technology Stack
- **Frontend**: Native HTML5, CSS3, ES6+ JavaScript. No heavy frameworks (React/Vue) ensures lightning-fast load times on all devices.
- **Backend / Database**: Google Firebase Realtime Database.
  - *Why?* Provides millisecond-latency updates across all connected devices. When a customer books a slot, it instantly disappears for everyone else.
- **Authentication**: Firebase Auth (Email/Password) with role-based access control (Admin vs. Customer).

### Key Data Structures
- **`users/`**: Stores profile data and role (`admin` or `customer`).
- **`bookings/`**: The central ledger of all appointments. Contains state (`pending`, `confirmed`, `completed`), timestamps, and financial data.
- **`groomers/`**: Configuration for staff members (specialties, daily limits).

---

## ⚡ Getting Started (Onboarding)

### Prerequisites
1. **Web Server**: Any static host (VS Code Live Server, Apache, Nginx).
2. **Firebase Project**: A valid Firebase project configuration.

### Installation Steps

1. **Clone & Configure**:
   Ensure `js/firebase-config.js` is populated with valid API keys.

2. **Database Seeding (Critical)**:
   The system relies on "Package" and "Groomer" definitions to function.
   - Use the `FIREBASE_SETUP_INSTRUCTIONS.md` guide.
   - Upload `firebase-initial-data.json` to your Realtime Database to initialize the pricing tiers and staff list.

3. **Launch**:
   - **Customer Portal**: Open `index.html`.
   - **Admin Portal**: Open `login.html` (requires an account marked as `role: "admin"` in the database).

---

## 🔮 Roadmap & Future Opportunities

- **SMS Notifications**: Integration with Twilio for automated appointment reminders.
- **Payment Gateway**: Direct integration with GCash/PayMaya for handling the ₱100 booking fee online.
- **Loyalty Program**: distinct points system for returning customers (e.g., "10th Bath Free").

---

*For detailed code documentation, please refer to the inline comments within `js/booking.js` and `js/admin.js`.*
