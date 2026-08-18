# SmartQueue 🏥
### Digital Hospital Appointment, Patient Token & Smart Queue Management System

SmartQueue is an intelligent, full-stack hospital queue management and patient token system built for high-concurrency clinical workflows. It minimizes patient waiting time, eliminates crowded waiting lobbies, and gives patients live transparency on their digital queue position.

---

## 🌟 The Problem
Traditional hospital OPDs suffer from:
- Long physical waiting lines and overcrowded reception lobbies.
- Anxiety and uncertainty about when a doctor will be available.
- Inflexible queue handling when medical emergencies arise.
- Lack of real-time synchronization between clinical consultation rooms and waiting patients.

## 💡 The Solution
SmartQueue transforms hospital operations into a seamless digital journey:
- **Sequential Digital Tokens:** Paperless digital token passes issued on mobile or lobby kiosks.
- **Smart Queue Prediction Engine:** Dynamic calculation of waiting times using active consultation speeds, patients ahead, and real-time operational delay metrics.
- **Real-Time WebSocket Sync:** Instant live screen updates when doctors click **"CALL NEXT"**, without page refreshes.
- **Controlled Priority & Emergency Intake:** Doctors and admins can prioritize critical cases with automatic queue reordering.
- **Multi-Role Dashboards:** Distinct portals for Patients, Doctors, and Hospital Administrators.

---

## 🚀 Key Features & USP

### 1. Smart Queue Prediction USP (Operational Formula)
Instead of static timestamps or arbitrary estimates, SmartQueue computes wait times dynamically:
```
estimated_wait = (patients_ahead * average_consultation_time) + current_delay
```
- Recalculates automatically upon every doctor action: *Call Next*, *Complete*, *No-Show*, or *Emergency Insertion*.
- Proactive alerts:
  - When 2 patients remain: *"Your appointment is approaching."*
  - When patient is next: *"🚨 YOU ARE NEXT - Please proceed to Room 204."*

### 2. Multi-Role Portals
- **Patient Portal:** Search hospitals/doctors, 5-step booking wizard, live token pass with QR code, real-time wait estimation, appointment history.
- **Doctor Clinical Console:** 1-Click "CALL NEXT", start/complete consultation, mark no-show, triage priority/emergency cases.
- **Admin Command Center:** KPI metrics (Patients Today, Average Wait Time, Active Doctors), department queue monitors, hospital and doctor CRUD management.

### 3. Hospital Lobby QR Kiosk
- Printable/displayable QR code kiosk page (`/qr-register`) for hospital receptions and entrance lobbies.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router 7, Lucide Icons, Axios, Socket.IO Client, Canvas Confetti, QRCode |
| **Backend** | Node.js, Express, TypeScript, Socket.IO, JWT, bcryptjs, PostgreSQL (`pg`) with automatic persistent failover |
| **Database** | PostgreSQL (Schema + Indexes + Seeder) |
| **Real-time** | WebSockets via Socket.IO |

---

## 🔑 Demo Accounts (Pre-Seeded)

The system comes pre-seeded with realistic healthcare data:

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `admin@smartqueue.com` | `Admin@123` | Hospital Chief Administrator |
| **Doctor** | `doctor@smartqueue.com` | `Doctor@123` | Dr. Ravi Kumar (General Medicine, Room 204) |
| **Patient** | `patient@smartqueue.com` | `Patient@123` | Ananya Sharma |

> **Tip:** The Login Page (`/login`) includes **1-Click Demo Login** buttons for instantaneous testing.

---

## 🧪 Hackathon Demonstration Scenario

To demonstrate the real-time queue engine across two browser windows:

1. **Browser 1 (Patient View):**
   - Log in with `patient@smartqueue.com` (or 1-Click Patient login).
   - Book an appointment for **Dr. Ravi Kumar** (General Medicine).
   - System generates Token **A-27** (Patients ahead: 6, Estimated wait: 30 min).

2. **Browser 2 (Doctor View):**
   - Log in with `doctor@smartqueue.com` (or 1-Click Doctor login).
   - Observe the live queue in Room 204: Token **A-21** currently in consultation, **A-22** to **A-27** waiting.
   - Click **CALL NEXT PATIENT**.

3. **Real-time Synchronization:**
   - **Browser 1 automatically updates in real-time without refreshing:**
     - Current Token becomes **A-22**
     - Patients Ahead drops to **5**
     - Estimated Wait updates to **25 min**
   - Advance the queue until Token **A-27** is next:
     - Patient screen displays the high-priority banner:
       > **🚨 YOU ARE NEXT - Please proceed to Room 204.**

---

## 📦 Installation & Setup Instructions

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- PostgreSQL (Optional; if unconfigured, the system automatically runs using its high-performance local store)

### 1. Clone & Install Dependencies
```bash
# From the root directory:
npm run install:all
```
*(Or manually: `cd backend && npm install`, then `cd frontend && npm install`)*

### 2. Seed Demo Data
```bash
npm run seed
```

### 3. Run Backend & Frontend

**Option A (Separate Terminals):**

- **Terminal 1 (Backend API & Socket Server):**
  ```bash
  cd backend
  npm run dev
  ```
  *Runs on `http://localhost:5000`*

- **Terminal 2 (Frontend React App):**
  ```bash
  cd frontend
  npm run dev
  ```
  *Runs on `http://localhost:5173`*

---

## 🔮 Future Enhancements
- Multilingual voice announcement assistant for waiting rooms.
- Production WhatsApp/SMS gateway integration (Twilio / Gupshup).
- ABDM (Ayushman Bharat Digital Mission) health ID linkage.
- Machine Learning historical wait-time models for hospital crowd predictions.
- Native Android & iOS mobile applications.
