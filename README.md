# LinkRelief - Disaster Management System

LinkRelief is a rapidly deployable disaster coordination platform designed to function in low-bandwidth and offline environments. It connects affected individuals with NGOs and rescue teams through a resilient, real-time interface.

## 📂 Project Structure

The project follows a monorepo-style structure:

- **`frontend/`**: The main user interface built with Next.js 14.
  - **`src/app`**: App Router pages (`/dashboard`, `/live-map`, etc.).
  - **`src/components`**: Reusable UI components (ReportCard, MapComponent).
  - **`src/hooks`**: Custom logic hooks (`useRelayLink`).
  - **`src/services`**: Standalone services (`RelayManager.ts`).
- **`backend/`**: A lightweight Node.js/Express server.
  - **`services/imageService.js`**: Handles image compression logic (<50KB).
  - **`server.js`**: API endpoints for image uploads and proxying.
- **`database/`**: Supabase configuration and schemas.
- **`legacy_backup/`**: Archived files from previous iterations.

## 🚀 Key Features

### 1. 3-Tap Rapid Reporting
- **Function**: Users can report incidents (Medical, Fire, Trapped) in just 3 taps.
- **Tech**: Captures GPS coordinates automatically; works offline.

### 2. Relay Link (Offline Sync)
- **Logic**: 
  - Detects network status (`navigator.onLine`).
  - If **Offline**: Queues reports in `localStorage` via `RelayManager.ts`.
  - If **Online**: Automatically flushes the queue to Supabase/Backend when connection is restored.
- **Benefit**: Ensures no data is lost during connectivity blackouts.

### 3. Realtime Live Map
- **UI**: Interactive map using MapLibre GL JS and OpenStreetMap tiles.
- **Data**: 
  - Fetches existing incidents on load.
  - Subscribes to Supabase Realtime to show new pins instantly as they happen.
- **Theme**: Adapts to Light (Postal) and Dark (Tactical) modes.

### 4. NGO Verification
- **Control**: Verified NGO admins can see incidents and click "Verify".
- **Backend**: Updates the `verified_status` in Supabase, changing the incident's visual indicator on the dashboard.

### 5. Smart Image Compression (ScaleDown)
- **Problem**: High-res photos clog weak networks.
- **Solution**: Backend service aggressively compresses uploads to under **50KB** before storage.

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React, Tailwind CSS (v4), Lucide Icons, MapLibre GL.
- **Backend**: Node.js, Express, Multer, Sharp (Image Processing).
- **Database**: Supabase (PostgreSQL + Realtime).
- **State/Theme**: `next-themes` for Dark/Light mode.

## ⚡ Setup & Run

### Prerequisites
- Node.js (v18+)
- Supabase Project Credentials

### 1. START BACKEND (Database & API)
This must be running first.
```bash
# In the root directory (d:/Gen AI for Genn Z/LinkRelief)
node server-root.js
```
*Runs at http://localhost:3001*

### 2. START FRONTEND (User Interface)
Open a **new terminal window**.
```bash
cd frontend
npm run dev
```
*Runs at http://localhost:3000*

## 🛠️ How to Demo: Relay Link (Offline Sync)

Experience the project's resilience by simulating a network failure:

1.  **Go Offline**: Open the dashboard at `http://localhost:3000`. Open **DevTools (F12)** -> **Network** tab -> Select **Offline**.
2.  **Trigger SOS**: Click a category (e.g., Fire) and pin a location on the map.
3.  **Queue View**: A toast notification will confirm: *"Offline: Report saved to Relay Link Queue"*.
4.  **Restore Signal**: Change DevTools back to **No throttling** (Online).
5.  **Auto-Sync**: The system will detect the signal and automatically flush the queue, sending your report to the responders.

## 🌍 Environment Variables

**Frontend (`frontend/.env.local`)**
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

**Backend (`backend/.env`)**
```
SUPABASE_URL=...
SUPABASE_KEY=...
PORT=3001
```

## 📸 Screenshots

| Feature | Visual |
| --- | --- |
| **Tactical Dashboard** | ![Dashboard](./assets/screenshots/tactical%20dashboard.png) |
| **Login & Access** | ![Login](./assets/screenshots/login%20page.png) |
| **Resource Exchange** | ![Inventory](./assets/screenshots/resource%20exchange.png) |
| **Admin Command** | ![Admin](./assets/screenshots/admin%20command.png) |

---
*Maintained by LinkRelief Open Source Team.*
