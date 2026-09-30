# EEG Wearable Platform — REST & WebSocket API Specification

**Project Title**: *Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning*  
**Architecture Role**: Go Gin API Gateway & Business Logic Core  
**Base URL**: `http://localhost:8080/api`  
**WebSocket URL**: `ws://localhost:8080/ws/eeg`  

---

## 1. System Architecture & Future Integration Contracts

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHYSICAL BIOSENSING LAYER                       │
│  [Dry Forehead Electrode (FP1) + Ear Reference (A1)]                  │
│                               │ (µV Analog Signal)                     │
│                               ▼                                        │
│                 [NeuroSky TGAM1 ASIC Chip]                             │
│                  - 512 Hz Sampling Rate                                │
│                  - 0.5–50 Hz Bandpass / 50 Hz Notch                    │
│                               │ (UART 57600 baud)                      │
│                               ▼                                        │
│                   [ESP32 Micro-controller]                             │
│                  - Packet Serialization                                │
│                  - Wi-Fi 802.11 b/g/n Telemetry                        │
└───────────────────────────────┬────────────────────────────────────────┘
                                │ TCP / WebSocket Stream
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        GO BACKEND GATEWAY LAYER                        │
│                           (Port :8080)                                 │
│  ├── REST API Gateway & JWT Authentication Handler                      │
│  ├── WebSocket Broadcast Hub (/ws/eeg)                                 │
│  ├── Session & Device Lifecycle Orchestrator                           │
│  └── Time-Series Feature Extraction Dispatcher                         │
└───┬───────────────────────────┬────────────────────────────────────┬───┘
    │ (SQL via lib/pq)          │ (Internal HTTP Post)               │ (JSON Push)
    ▼                           ▼                                    ▼
┌──────────────┐    ┌───────────────────────────┐    ┌─────────────────────────┐
│  PostgreSQL  │    │  Future Python ML Service │    │  Next.js 16 Web Client  │
│  Database    │    │  (FastAPI / Scikit-Learn) │    │  (Port :3000)           │
│  - users     │    │  - SVM (RBF Kernel)       │    │  - App Router           │
│  - devices   │    │  - Random Forest          │    │  - Live Canvas Waveform │
│  - sessions  │    │  - XGBoost Classifier     │    │  - Band Power Spectrum  │
│  - samples   │    └───────────┬───────────────┘    │  - Session Archive      │
│  - features  │                │ Classification Res │  - Device Diagnostics   │
│  - ml_preds  │                ▼                    └─────────────────────────┘
│  - insights  │        [Go Gateway Broadcast]                                   
└──────────────┘                │                                                
                                └────────────────────────────────────────────────┘
```

> **Strict Architectural Rule:**  
> The Frontend NEVER communicates directly with PostgreSQL, ESP32, or future ML microservices. All interactions route through the Go Backend API Gateway.

---

## 2. Standard Response Envelope

All API endpoints return JSON conforming to the following consistent structure:

```json
{
  "success": true,
  "message": "Optional status message",
  "data": {},
  "error": ""
}
```

---

## 3. Authentication Endpoints

### 3.1 Register User
- **Method**: `POST`
- **Path**: `/api/auth/register`
- **Auth Required**: No

**Request Body:**
```json
{
  "name": "Dr. Renaldi Simamora",
  "email": "researcher@biomedical.ac.id",
  "password": "SecurePassword123",
  "institution": "Dept. of Electrical Engineering"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr-01...",
      "name": "Dr. Renaldi Simamora",
      "email": "researcher@biomedical.ac.id",
      "role": "researcher",
      "institution": "Dept. of Electrical Engineering",
      "createdAt": "2026-09-30T10:00:00Z",
      "updatedAt": "2026-09-30T10:00:00Z"
    }
  }
}
```

---

### 3.2 Login User
- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Auth Required**: No

**Request Body:**
```json
{
  "email": "researcher@biomedical.ac.id",
  "password": "SecurePassword123"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr-01...",
      "name": "Dr. Renaldi Simamora",
      "email": "researcher@biomedical.ac.id",
      "role": "researcher",
      "institution": "Dept. of Electrical Engineering"
    }
  }
}
```

---

### 3.3 Get Authenticated Profile
- **Method**: `GET`
- **Path**: `/api/auth/me`
- **Auth Required**: Yes (`Bearer <token>`)

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "usr-01...",
    "name": "Dr. Renaldi Simamora",
    "email": "researcher@biomedical.ac.id",
    "role": "researcher",
    "institution": "Dept. of Electrical Engineering"
  }
}
```

---

## 4. User Endpoints

### 4.1 Update Profile
- **Method**: `PUT`
- **Path**: `/api/users/me`
- **Auth Required**: Yes

**Request Body:**
```json
{
  "name": "Dr. Renaldi Simamora, M.T.",
  "institution": "Biomedical Signal Processing Laboratory"
}
```

---

## 5. Device Management Endpoints

### 5.1 List All Devices
- **Method**: `GET`
- **Path**: `/api/devices`
- **Auth Required**: Yes

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "dev-001",
      "deviceCode": "EEG-001",
      "name": "TGAM1 Wearable Headset Alpha",
      "status": "connected",
      "batteryLevel": 88,
      "signalQuality": 94,
      "firmwareVersion": "v1.2.0-esp32",
      "lastSeen": "2026-09-30T10:00:00Z"
    }
  ]
}
```

---

### 5.2 Register Device
- **Method**: `POST`
- **Path**: `/api/devices`
- **Auth Required**: Yes

**Request Body:**
```json
{
  "deviceCode": "EEG-004",
  "name": "TGAM1 Wearable Headset Delta",
  "firmwareVersion": "v1.2.0-esp32"
}
```

---

### 5.3 Update Device State
- **Method**: `PUT`
- **Path**: `/api/devices/:id`
- **Auth Required**: Yes

**Request Body:**
```json
{
  "status": "connected",
  "signalQuality": 96,
  "batteryLevel": 85
}
```

---

### 5.4 Delete Device
- **Method**: `DELETE`
- **Path**: `/api/devices/:id`
- **Auth Required**: Yes

---

## 6. Session Management Endpoints

### 6.1 List Sessions
- **Method**: `GET`
- **Path**: `/api/sessions`
- **Auth Required**: Yes

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ses-001",
      "userId": "usr-01",
      "deviceId": "dev-001",
      "deviceName": "TGAM1 Wearable Headset Alpha",
      "deviceCode": "EEG-001",
      "startedAt": "2026-09-30T09:15:00Z",
      "endedAt": "2026-09-30T09:30:00Z",
      "duration": 900,
      "status": "completed",
      "signalQuality": 94
    }
  ]
}
```

---

### 6.2 Start New Recording Session
- **Method**: `POST`
- **Path**: `/api/sessions`
- **Auth Required**: Yes

**Request Body:**
```json
{
  "deviceId": "dev-001"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Session started successfully",
  "data": {
    "id": "ses-new-uuid",
    "userId": "usr-01",
    "deviceId": "dev-001",
    "startedAt": "2026-09-30T10:00:00Z",
    "duration": 0,
    "status": "running"
  }
}
```

---

### 6.3 Stop Active Session
- **Method**: `POST`
- **Path**: `/api/sessions/:id/stop`
- **Auth Required**: Yes

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Session stopped successfully",
  "data": {
    "id": "ses-new-uuid",
    "endedAt": "2026-09-30T10:15:00Z",
    "duration": 900,
    "status": "completed"
  }
}
```

---

## 7. EEG Data Endpoints

### 7.1 Get Session Raw EEG & Features
- **Method**: `GET`
- **Path**: `/api/eeg/:sessionId`
- **Auth Required**: Yes

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "sessionId": "ses-001",
    "samples": [
      {
        "id": "smp-001",
        "sessionId": "ses-001",
        "timestamp": 1790757000000,
        "rawEEG": 14.28,
        "signalQuality": 94
      }
    ],
    "latestFeature": {
      "delta": 16.5,
      "theta": 22.1,
      "alpha": 38.4,
      "beta": 16.8,
      "gamma": 6.2
    }
  }
}
```

---

### 7.2 Push EEG Data Batch (IoT / Firmware Ingestion)
- **Method**: `POST`
- **Path**: `/api/eeg/data`
- **Auth Required**: Yes (or Device API Token)

**Request Body:**
```json
{
  "sessionId": "ses-001",
  "samples": [
    {
      "timestamp": 1790757000000,
      "rawEEG": 18.5,
      "signalQuality": 94
    }
  ],
  "features": {
    "delta": 16.5,
    "theta": 22.1,
    "alpha": 38.4,
    "beta": 16.8,
    "gamma": 6.2
  }
}
```

---

## 8. Dashboard & Analysis Endpoints

### 8.1 Dashboard Summary
- **Method**: `GET`
- **Path**: `/api/dashboard/summary`
- **Auth Required**: Yes

---

### 8.2 Get Model Architectures
- **Method**: `GET`
- **Path**: `/api/models`
- **Auth Required**: No

Returns model cards for SVM, Random Forest, and XGBoost with evaluation placeholders.

---

### 8.3 Get Analysis for Session
- **Method**: `GET`
- **Path**: `/api/analysis/:sessionId`
- **Auth Required**: Yes

Returns:
- `notice`: *"Machine-learning results will be available after the ML service is integrated."*
- `predictions`: Array of `ml_predictions` table rows.

---

## 9. WebSocket Streaming API

- **Protocol**: `ws://` / `wss://`
- **Endpoint**: `/ws/eeg` or `/api/ws/eeg`
- **Packet Format (`Text/JSON`)**:
```json
{
  "type": "eeg_sample",
  "timestamp": 1790757000000,
  "rawEEG": 24.18,
  "signalQuality": 95,
  "delta": 16.2,
  "theta": 22.4,
  "alpha": 38.1,
  "beta": 16.9,
  "gamma": 6.1,
  "deviceStatus": "connected",
  "isSimulation": true
}
```
