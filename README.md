# EEG Wearable Platform — IoT Biosignal Monitoring & Machine Learning Gateway

> **Academic Engineering Research Project**  
> **Judul Penelitian**: *Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning*  
> **Fakultas / Program Studi**: Teknik Elektro & Rekayasa Biomedis / Ilmu Komputer  
> **Versi Rilis**: `v1.0.0-academic` | **Status**: Active Development & Hardware Integration Stage  

---

[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016%20App%20Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Go 1.22](https://img.shields.io/badge/Backend-Go%201.22%20Gin-00ADD8?style=for-the-badge&logo=go)](https://go.dev/)
[![PostgreSQL 15](https://img.shields.io/badge/Database-PostgreSQL%2015-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![WebSockets](https://img.shields.io/badge/RealTime-Gorilla%20WebSocket-orange?style=for-the-badge)](https://github.com/gorilla/websocket)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20Dark%20Luxury-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Academic%20MIT-emerald?style=for-the-badge)](LICENSE)

---

## 📑 Daftar Isi (Table of Contents)

1. [Ringkasan Eksekutif & Latar Belakang Riset](#1-ringkasan-eksekutif--latar-belakang-riset)
2. [Arsitektur Sistem (End-to-End Architecture)](#2-arsitektur-sistem-end-to-end-architecture)
3. [Rancang Bangun & Spesifikasi Perangkat Keras (Hardware IoT)](#3-rancang-bangun--spesifikasi-perangkat-keras-hardware-iot)
4. [Karakteristik & Pita Frekuensi Gelombang Otak (EEG Bands)](#4-karakteristik--pita-frekuensi-gelombang-otak-eeg-bands)
5. [Teknologi & Tech Stack Lengkap](#5-teknologi--tech-stack-lengkap)
6. [Struktur Direktori & Rincian Modul Proyek](#6-struktur-direktori--rincian-modul-proyek)
7. [Panduan Instalasi & Menjalankan Proyek](#7-panduan-instalasi--menjalankan-proyek)
   - [7.1 Prasyarat Sistem](#71-prasyarat-sistem)
   - [7.2 Konfigurasi Environment (.env)](#72-konfigurasi-environment-env)
   - [7.3 Menjalankan Backend (Go API Gateway)](#73-menjalankan-backend-go-api-gateway)
   - [7.4 Menjalankan Frontend (Next.js Web App)](#74-menjalankan-frontend-nextjs-web-app)
   - [7.5 Shortcut Menjalankan Proyek via Root package.json](#75-shortcut-menjalankan-proyek-via-root-packagejson)
   - [7.6 Menjalankan dengan Docker & Docker Compose](#76-menjalankan-dengan-docker--docker-compose)
8. [Akun Peneliti Bawaan (Demo Credentials)](#8-akun-peneliti-bawaan-demo-credentials)
9. [Panduan Navigasi & Fitur Antarmuka Pengguna (Web UI)](#9-panduan-navigasi--fitur-antarmuka-pengguna-web-ui)
10. [Spesifikasi API Gateway & WebSocket](#10-spesifikasi-api-gateway--websocket)
11. [Skema Database & Entitas Relasional (PostgreSQL)](#11-skema-database--entitas-relasional-postgresql)
12. [Pipeline Integrasi Machine Learning (ML Contracts)](#12-pipeline-integrasi-machine-learning-ml-contracts)
13. [Panduan Troubleshooting & FAQ](#13-panduan-troubleshooting--faq)
14. [Roadmap Pengembangan Sistem](#14-roadmap-pengembangan-sistem)
15. [Lisensi & Etika Penelitian](#15-lisensi--etika-penelitian)

---

## 1. Ringkasan Eksekutif & Latar Belakang Riset

**Elektroensefalografi (EEG)** konvensional berbasis laboratorium medis umumnya menggunakan perangkat multichannel stasioner berbiaya tinggi dengan elektroda gel basah (*wet electrodes*) yang memerlukan persiapan kompleks, pemasangan rumit, dan mobilitas subjek yang sangat terbatas.

Platform ini dikembangkan sebagai solusi terintegrasi untuk menjembatani **perangkat biosensing EEG wearable berbiaya terjangkau (wearable low-cost EEG)** dengan arsitektur komputasi modern. Platform ini mengintegrasikan:
1. **IoT Edge Acquisition Layer**: Mengakuisisi sinyal biopotensial otak pada elektroda dahi FP1 dengan modul ASIC TGAM1 dan mikrokontroler ESP32 secara nirkabel melalui protokol Wi-Fi.
2. **Central Go API Gateway Layer**: Gerbang backend berbasis bahasa pemrograman Go (Gin Framework) berkinerja tinggi, menyediakan autentikasi JWT terenkripsi, sinkronisasi WebSocket streaming 50–512 Hz, manajemen siklus sesi akuisisi, dan orkestrasi database.
3. **Database & Time-Series Persistence Layer**: Penyimpanan data terstruktur PostgreSQL untuk raw voltage sinyal EEG, fitur ekstraksi daya spektral (Power Spectral Density / PSD), log sesi, inventaris perangkat, dan hasil prediksi machine learning.
4. **Modern Web Presentation Layer**: Antarmuka berbasis Next.js 16 (App Router) dengan tema *Dark Luxury Glassmorphism*, visualisasi osciloscope real-time 60 FPS berbasis HTML5 Canvas, grafik distribusi spektral gelombang otak, dan panel kontrol hardware.
5. **Future-Ready ML Classifier Pipeline**: Kontrak terstandarisasi untuk klasifikasi pola gelombang otak (Fokus, Rileks, Drowsy, Kognisi Aktif) menggunakan algoritma Support Vector Machine (SVM), Random Forest, dan XGBoost.

---

## 2. Arsitektur Sistem (End-to-End Architecture)

Arsitektur platform dirancang dengan prinsip pemisahan tanggung jawab (*separation of concerns*) yang ketat. Frontend tidak pernah berkomunikasi langsung dengan mikrokontroler ESP32 maupun database mentah, melainkan selalu melalui Go API Gateway.

```mermaid
flowchart TB
    subgraph HardwareLayer ["1. PHYSICAL BIOSENSING & IOT EDGE LAYER"]
        Electrode["Elektroda Kering Dahi (FP1)\n+ Earclip Reference/GND (A1)"] -->|"µV Analog Biopotential"| TGAM1["NeuroSky TGAM1 ASIC Chip\n- 512 Hz Raw ADC Sampling\n- 0.5–50 Hz Bandpass Filter\n- 50 Hz Hardware Notch Filter"]
        TGAM1 -->|"UART Serial @ 57600 Baud"| ESP32["Mikrokontroler ESP-WROOM-32\n- Paketisasi Data Telemetri\n- Ring Buffer Management\n- Wi-Fi 802.11 b/g/n Telemetry"]
    end

    ESP32 -->|"TCP / HTTP POST / WebSocket"| GoServer

    subgraph BackendLayer ["2. GO BACKEND API GATEWAY (:8080)"]
        GoServer["Gin HTTP Router & API Gateway"]
        AuthMid["JWT & Bcrypt Auth Middleware"]
        WSHub["Gorilla WebSocket Streaming Hub\n(/ws/eeg)"]
        SessionMgr["Session & Device Manager"]
        FeatureEngine["Spectral Feature Extractor (FFT/PSD)"]
        FallbackStore["Graceful In-Memory Fallback Store\n(Auto-active if DB is offline)"]
    end

    GoServer --- AuthMid
    GoServer --- WSHub
    GoServer --- SessionMgr
    GoServer --- FeatureEngine
    GoServer --- FallbackStore

    subgraph DataStorageLayer ["3. STORAGE & ML CLASSIFICATION"]
        PostgresDB[("PostgreSQL 15 Database\n- users, devices, sessions\n- eeg_samples, brainwave_features\n- ml_predictions, ai_insights")]
        MLService["Future ML Inference Service\n(Python FastAPI / Scikit-Learn)\n- SVM (RBF Kernel)\n- Random Forest Classifier\n- XGBoost Gradient Booster"]
    end

    SessionMgr <-->|"SQL Query via lib/pq"| PostgresDB
    FeatureEngine -->|"Feature Vector (PSD, Band Power)"| MLService
    MLService -->|"Predicted Class & Confidence"| SessionMgr

    subgraph FrontendLayer ["4. PRESENTATION WEB APPLICATION (:3000)"]
        NextClient["Next.js 16 App Router (React 19 + TypeScript)"]
        CanvasOscilloscope["High-FPS HTML5 Canvas Oscilloscope\n(60 FPS Raw Waveform Render)"]
        SpectralCharts["Frequency Bands Energy Spectrum\n(Delta, Theta, Alpha, Beta, Gamma)"]
        DeviceDiagnostics["Hardware Registry & Diagnostics Panel"]
        AuthDashboard["Institutional Researcher Portal"]
    end

    WSHub -->|"WebSocket Stream (JSON Frame)"| NextClient
    NextClient <-->|"REST API Requests (/api/*)"| GoServer
    NextClient --- CanvasOscilloscope
    NextClient --- SpectralCharts
    NextClient --- DeviceDiagnostics
    NextClient --- AuthDashboard
```

---

## 3. Rancang Bangun & Spesifikasi Perangkat Keras (Hardware IoT)

Platform ini mengintegrasikan komponen perangkat keras medis-elektronik yang dirancang untuk kenyamanan pemakaian kepala (*headband wearable*):

| Komponen | Spesifikasi Teknis | Fungsi dalam Riset |
| :--- | :--- | :--- |
| **Sensor Front-End** | NeuroSky TGAM1 (ThinkGear ASIC Module) | Penguat biopotensial mikrovolt (µV), konversi analog-ke-digital (ADC) 512 Hz, filter analog terintegrasi. |
| **Elektroda Aktif** | Sintered Ag/AgCl atau Gold-Plated Dry Electrode | Ditempatkan pada lokasi **FP1 (Frontal Pole 1)** sesuai *10–20 International System*. Tanpa memerlukan gel konduktif basah. |
| **Elektroda Referensi & Ground** | Dual-contact Earclip Electrode (A1 / Mastoid) | Referensi beda potensial dan eliminasi derau interferensi tubuh (*Common Mode Rejection*). |
| **Unit Pemroses (MCU)** | ESP-WROOM-32 (Dual-Core Tensilica Xtensa 240 MHz) | Membaca paket data UART dari pin TX TGAM1, mengurai *ThinkGear Packet*, mengelola buffer transmisi, dan mengirim data via Wi-Fi. |
| **Protokol Serial Sensor** | UART Asynchronous (57,600 baud, 8-N-1) | Jalur data kabel langsung antara TGAM1 dan GPIO pin RX ESP32. |
| **Transmisi Jaringan** | Wi-Fi 802.11 b/g/n (2.4 GHz) | Pengiriman data nirkabel berbasis soket TCP / HTTP REST / WebSocket ke Backend Gateway. |
| **Catu Daya (Power Unit)** | Baterai Lithium-Polymer 3.7V 500–1000 mAh | Daya mandiri yang aman bagi subjek tanpa kontak tegangan listrik bolak-balik (AC). |
| **Regulator Tegangan** | Low-Dropout (LDO) 3.3V Low-Noise Voltage Regulator | Menjamin tegangan 3.3V bersih bebas riak (*ripple-free*) untuk mencegah artefak daya pada sinyal EEG. |
| **Pengisi Daya (Charger)** | Modul Pengisi Baterai TP4056 dengan Proteksi | Pengisian ulang daya Li-Po via USB-C dengan proteksi overcharge dan overdischarge. |

### Diagram Pinout Wiring (ESP32 ke TGAM1)

```
  ┌─────────────────────────┐                 ┌─────────────────────────┐
  │   NeuroSky TGAM1 ASIC   │                 │     ESP32 Dev Module    │
  │                         │                 │                         │
  │               [ VCC ] ──┼─────────────────┼── [ 3V3 Out ]           │
  │               [ GND ] ──┼─────────────────┼── [ GND ]               │
  │                [ TX ] ──┼─────────────────┼── [ GPIO 16 (RX2) ]     │
  │                [ RX ] ──┼── (Optional) ───┼── [ GPIO 17 (TX2) ]     │
  │                         │                 │                         │
  │       [ FP1 Sensor ] ───┼── Dry Electrode │                         │
  │      [ Ref Earclip ] ───┼── Ear Reference │                         │
  │      [ Gnd Earclip ] ───┼── Ear Ground    │                         │
  └─────────────────────────┘                 └─────────────────────────┘
```

---

## 4. Karakteristik & Pita Frekuensi Gelombang Otak (EEG Bands)

Sinyal EEG diurai ke dalam 5 pita spektrum utama (*frequency bands*) menggunakan transformasi Fourier (Fast Fourier Transform / FFT) atau estimasi daya spektral Welch PSD:

```
Amplitudo (µV)
   ▲
   │        DELTA                THETA               ALPHA                BETA                GAMMA
   │     (0.5 - 4 Hz)          (4 - 8 Hz)         (8 - 13 Hz)          (13 - 30 Hz)        (30 - 50 Hz)
   │     Deep Sleep           Mengantuk/Rileks      Tenang/Fokus        Kognisi Aktif       Konsentrasi Tinggi
   │     ────────────         ────────────────    ────────────────     ─────────────       ──────────────────
   │        /\                    /\  /\              /\/\/\/\           /\/\/\/\/\/\         /\/\/\/\/\/\/\/\
   │       /  \                  /  \/  \            /        \         /            \       /                \
───┴──────┴────┴────────────────┴────────┴──────────┴──────────┴───────┴──────────────┴─────┴──────────────────┴──▶ Frekuensi (Hz)
```

| Pita Gelombang | Rentang Frekuensi | Amplitudo Tipikal | Kondisi Mental / Status Psikofisiologis | Pemanfaatan dalam Model ML |
| :--- | :--- | :--- | :--- | :--- |
| **Delta ($\delta$)** | 0.5 – 4.0 Hz | 20 – 200 µV | Tidur lelap (*slow-wave deep sleep*), pemulihan fisik, penurunan kesadaran. | Deteksi kelelahan ekstrem, *microsleep*, atau artefak kedipan mata. |
| **Theta ($\theta$)** | 4.0 – 8.0 Hz | 10 – 50 µV | Kondisi mengantuk (*drowsiness*), meditasi mendalam, proses memori emosional. | Indikator penurunan konsentrasi (*fatigue/sleepiness detection*). |
| **Alpha ($\alpha$)** | 8.0 – 13.0 Hz | 20 – 100 µV | Relaksasi terjaga, mata tertutup santai, kesiapan kognitif tanpa ketegangan mental. | Menghitung rasio keterlibatan kognitif (*Engagement Ratio*: $\beta / (\alpha + \theta)$). |
| **Beta ($\beta$)** | 13.0 – 30.0 Hz | 5 – 20 µV | Berpikir aktif, fokus pemecahan masalah, konsentrasi, respon motorik. | Parameter utama klasifikasi *Active Focus* vs *Passive State*. |
| **Gamma ($\gamma$)** | 30.0 – 50.0 Hz | 2 – 10 µV | Pengolahan informasi kompleks, atensi puncak, integrasi multimodalitas sensorik. | Deteksi beban kognitif tinggi (*high cognitive load*). |

---

## 5. Teknologi & Tech Stack Lengkap

### Frontend Stack (Web Client)
- **Framework**: [Next.js 16](https://nextjs.org/) dengan App Router Architecture
- **Bahasa Pemrograman**: [TypeScript 5](https://www.typescriptlang.org/) dengan tipe data ketat
- **Library UI**: React 19, Tailwind CSS kustom (*Luxury Dark Theme*), Lucide React Icons
- **Visualisasi Biosinyal**:
  - **HTML5 Canvas Oscilloscope**: Rendering gelombang EEG mikrovolt secara real-time 60 FPS dengan buffer peredam flicker (*anti-aliased glow trace*).
  - **Recharts & Custom SVG**: Grafik distribusi spektral energi gelombang otak per detik.
- **Manajemen Formulir & Validasi**: React Hook Form dipadukan dengan skema validasi [Zod](https://zod.dev/).
- **Data Fetching & Cache**: [TanStack React Query v5](https://tanstack.com/query) untuk polling telemetri otomatis dan invalidasi cache mutasi data.

### Backend Stack (API Gateway)
- **Bahasa Pemrograman**: [Go (Golang) v1.22](https://go.dev/) untuk performa konkurensi goroutine tinggi dan konsumsi memori rendah.
- **Web Framework**: [Gin Web Framework](https://github.com/gin-gonic/gin) dengan router HTTP ultra-cepat.
- **Real-Time Engine**: [Gorilla WebSocket](https://github.com/gorilla/websocket) dengan sistem pub/sub client broadcast hub.
- **Keamanan & Autentikasi**:
  - JSON Web Tokens (JWT) dengan algoritma enkripsi tanda tangan HMAC-SHA256 (`github.com/golang-jwt/jwt/v5`).
  - Hashing kata sandi berbasis salt adaptif menggunakan `golang.org/x/crypto/bcrypt`.
  - CORS Middleware terkonfigurasi dengan validasi domain asal.
- **Driver Database**: `github.com/lib/pq` untuk koneksi PostgreSQL murni.
- **Graceful Fault-Tolerant Store**: Jika PostgreSQL lokal belum berjalan, backend otomatis mengaktifkan *In-Memory Synchronized Store* lengkap dengan *seeded mock devices* agar riset tetap bisa dijalankan tanpa hambatan teknis.

### Database & Infrastruktur
- **Database Utama**: [PostgreSQL 15](https://www.postgresql.org/) dengan skema tabel terindeks untuk data deret waktu (*time-series*).
- **Kontainerisasi**: Docker Engine & Docker Compose untuk orkestrasi otomatis satu perintah (*multi-container setup*).

---

## 6. Struktur Direktori & Rincian Modul Proyek

Berikut adalah hierarki lengkap dari seluruh file dan folder dalam repositori:

```
eeg-wearable-r/
├── README.md                      # Dokumentasi komprehensif proyek (File ini)
├── docker-compose.yml             # Orkestrasi Docker untuk PostgreSQL, Backend, & Frontend
├── package.json                   # Shortcut eksekusi perintah root (npm scripts)
├── docs/
│   └── api.md                     # Spesifikasi lengkap REST API & protokol WebSocket
│
├── backend/                       # Layanan Backend API Gateway (Golang)
│   ├── .env                       # File konfigurasi lokal backend
│   ├── .env.example               # Contoh template variabel lingkungan backend
│   ├── Dockerfile                 # Multi-stage Docker build untuk Go server
│   ├── go.mod                     # Manajemen dependensi Go module
│   ├── go.sum                     # Checksum dependensi Go
│   ├── server.exe                 # Binary Go yang sudah dikompilasi (Siap jalan di Windows)
│   ├── cmd/
│   │   └── server/
│   │       └── main.go            # Entry point utama aplikasi Go
│   ├── config/
│   │   └── config.go              # Loader environment variables (Port, DB URL, JWT)
│   ├── internal/                  # Paket privat logika internal server
│   │   ├── analysis/              # Handler & logika model klasifikasi ML
│   │   ├── auth/                  # Layanan registrasi, login, & token JWT
│   │   ├── dashboard/             # Agregasi data metrik & kartu ringkasan dashboard
│   │   ├── database/              # Abstraksi store (PostgreSQL & In-Memory Fallback)
│   │   │   ├── init.go            # Inisialisasi koneksi database
│   │   │   ├── memory.go          # Implementasi mock in-memory ter-seeding
│   │   │   ├── postgres.go        # Implementasi query SQL PostgreSQL murni
│   │   │   └── store.go           # Interface kontrak Store
│   │   ├── devices/               # Manajemen inventaris perangkat IoT EEG
│   │   ├── eeg/                   # Penyimpanan sinyal mentah & ekstraksi band power
│   │   ├── middleware/            # JWT Auth, CORS, & Logger Middleware
│   │   ├── sessions/              # Manajemen siklus sesi akuisisi (Start, Stop, Summary)
│   │   ├── users/                 # Profil akun peneliti & institusi
│   │   └── websocket/             # WebSocket Hub untuk broadcast streaming sinyal EEG
│   ├── migrations/
│   │   └── 000001_init_schema.sql # Skema DDL pembuatan tabel dan indeks PostgreSQL
│   ├── models/
│   │   └── models.go              # Definisi struct data model Go & DTO
│   └── routes/
│       └── routes.go              # Registrasi rute endpoint HTTP & WebSocket Gin
│
└── frontend/                      # Aplikasi Web Antarmuka Pengguna (Next.js 16)
    ├── .env.example               # Template environment URL API & WebSocket
    ├── .env.local                 # Konfigurasi endpoint frontend aktif
    ├── Dockerfile                 # Konfigurasi kontainerisasi Next.js
    ├── next.config.ts             # Konfigurasi Next.js Compiler & Transpilation
    ├── package.json               # Dependensi modul Node.js & pustaka visualisasi
    ├── postcss.config.mjs         # Plugin PostCSS untuk Tailwind
    ├── tsconfig.json              # Konfigurasi TypeScript & path aliases (@/*)
    ├── public/                    # Aset statis publik (favicon, logo, icons)
    └── src/
        ├── app/                   # Rute halaman Next.js (App Router)
        │   ├── layout.tsx         # Root Layout, font Geist, metadata, AuthProvider
        │   ├── globals.css        # Variabel warna kustom & utility glassmorphism
        │   ├── page.tsx           # Academic Landing Page (Dark luxury & interactive)
        │   ├── login/page.tsx     # Halaman Login institusional 2-kolom
        │   ├── register/page.tsx  # Halaman Onboarding peneliti baru
        │   ├── dashboard/page.tsx # Pusat kontrol & ringkasan operasional riset
        │   ├── live/page.tsx      # Real-time oscilloscope monitor (Canvas 60 FPS)
        │   ├── sessions/          # Riwayat data akuisisi sinyal
        │   │   ├── page.tsx       # Arsip tabel sesi dengan pencarian & filter
        │   │   └── [id]/page.tsx  # Detail inspeksi sesi: voltase mentah & spektrum
        │   ├── devices/page.tsx   # Inventaris hardware wearable, sinyal, baterai
        │   ├── analysis/page.tsx  # Evaluasi model Machine Learning (SVM, RF, XGB)
        │   ├── settings/page.tsx  # Pengaturan profil peneliti, telemetri, timer
        │   └── about/page.tsx     # Latar belakang saintifik & metodologi riset
        ├── components/            # Komponen antarmuka yang dapat digunakan kembali
        │   ├── ui/                # Atoms: Button, Card, Badge, Input, Modal
        │   ├── dashboard/         # Molecules: SummaryCard, LiveEEGPreview, Tables
        │   └── eeg/               # Biosignal Components: Waveform, Bands, MLCard
        ├── providers/
        │   └── AuthProvider.tsx   # React Context untuk status autentikasi global
        ├── services/              # Modul klien HTTP (Axios / Fetch Wrappers)
        │   ├── api.ts             # Axios instance dengan injector Bearer Token
        │   ├── auth.service.ts    # Panggilan API autentikasi
        │   ├── dashboard.service.ts
        │   ├── device.service.ts
        │   └── session.service.ts
        └── types/
            └── index.ts           # Deklarasi tipe TypeScript untuk User, Session, Device
```

---

## 7. Panduan Instalasi & Menjalankan Proyek

Sistem ini dirancang sangat fleksibel dan dapat dijalankan secara lokal di Windows, macOS, Linux, ataupun menggunakan kontainer Docker.

### 7.1 Prasyarat Sistem
- **Node.js**: Versi `v18.17.0` atau yang lebih baru (disarankan LTS v20+).
- **npm**: Versi `v9.0.0` atau lebih tinggi.
- **Go**: Versi `1.21+` (Hanya diperlukan jika ingin mengompilasi ulang source code Go). Jika menggunakan binary bawaan Windows `backend/server.exe`, instalasi Go tidak diwajibkan.
- **PostgreSQL**: Versi 14 atau 15 (Opsional: backend memiliki memori fallback otomatis jika PostgreSQL belum terinstal).

---

### 7.2 Konfigurasi Environment (.env)

#### A. Konfigurasi Backend (`backend/.env`)
Salin file template pada folder backend:
```bash
cd backend
copy .env.example .env     # Windows Command Prompt / PowerShell
# atau: cp .env.example .env (Linux / macOS)
```
Isi default konfigurasi:
```env
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/eeg_db?sslmode=disable
JWT_SECRET=eeg-platform-secure-jwt-academic-secret-key-32chars
CORS_ORIGIN=http://localhost:3000
```

#### B. Konfigurasi Frontend (`frontend/.env.local`)
Salin file template pada folder frontend:
```bash
cd frontend
copy .env.example .env.local    # Windows
# atau: cp .env.example .env.local (Linux / macOS)
```
Isi konfigurasi:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws/eeg
```

---

### 7.3 Menjalankan Backend (Go API Gateway)

> [!IMPORTANT]
> **Penting Mengenai Backend**: Backend dibangun menggunakan bahasa pemrograman **Go (Golang)**, **BUKAN Node.js**. Jangan menjalankan perintah `npm run dev` di dalam folder `backend`. Gunakan salah satu dari 2 opsi di bawah ini:

#### Opsi 1: Menjalankan Pre-Compiled Binary (Paling Cepat untuk Windows)
Tanpa perlu instalasi compiler Go di sistem komputer:
```powershell
cd c:\Users\Renaldi\Documents\eeg-wearable-r\backend
.\server.exe
```

#### Opsi 2: Menjalankan dari Source Code (Jika Go Terinstal)
```bash
cd c:\Users\Renaldi\Documents\eeg-wearable-r\backend
go run ./cmd/server
```

**Output Terminal yang Berhasil:**
```text
=================================================================
  EEG Wearable Platform - Go Backend API Gateway
  Academic Project: Rancang Bangun Perangkat IoT Wearable Berbasis EEG
=================================================================
[DATABASE] Connecting to PostgreSQL at postgres://postgres:postgres@localhost:5432/eeg_db?sslmode=disable...
[DATABASE] Note: Initializing in-memory fallback data store with seeded research devices.
[GIN-debug] GET    /health
[GIN-debug] GET    /ws/eeg
[GIN-debug] POST   /api/auth/login
[GIN-debug] GET    /api/devices
[SERVER] Starting HTTP & WebSocket server on :8080
```
Backend kini aktif dan melayani koneksi di **`http://localhost:8080`**.

---

### 7.4 Menjalankan Frontend (Next.js Web App)

Buka jendela terminal baru:
```bash
cd c:\Users\Renaldi\Documents\eeg-wearable-r\frontend
npm install
npm run dev
```

**Output Terminal yang Berhasil:**
```text
▲ Next.js 16.3.7 (Turbopack)
- Local:        http://localhost:3000
- Environments: .env.local
✓ Ready in 1400ms
```

Buka peramban (browser) dan akses alamat:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### 7.5 Shortcut Menjalankan Proyek via Root `package.json`

Untuk kenyamanan alur kerja pengembangan, file `package.json` pada direktori root telah dikonfigurasi dengan perintah praktis:

| Perintah Terminal | Tindakan yang Dijalankan |
| :--- | :--- |
| `npm run dev` | Menjalankan server frontend Next.js di port 3000. |
| `npm run dev:frontend` | Membuka direktori `frontend` dan menjalankan Next.js. |
| `npm run build:frontend` | Melakukan kompilasi bundel produksi untuk frontend Next.js. |
| `npm run start:backend` | Menjalankan server executable backend Go (`backend/server.exe`). |
| `npm run dev:backend` | Mengompilasi dan menjalankan source code Go (`go run ./cmd/server`). |

---

### 7.6 Menjalankan dengan Docker & Docker Compose

Jika komputer Anda telah terpasang **Docker Desktop**, Anda dapat mengaktifkan seluruh ekosistem (Database PostgreSQL, Go Gateway, dan Next.js) dengan satu perintah:

```bash
docker compose up --build
```

Layanan yang otomatis aktif:
- **PostgreSQL Database**: `localhost:5432` (User: `postgres`, Password: `postgrespassword`, DB: `eeg_db`)
- **Backend API Gateway**: `http://localhost:8080`
- **Frontend Web Dashboard**: `http://localhost:3000`

Untuk menghentikan kontainer:
```bash
docker compose down
```

---

## 8. Akun Peneliti Bawaan (Demo Credentials)

Untuk memfasilitasi pengujian cepat tanpa harus mengonfigurasi database fisik terlebih dahulu, sistem telah dilengkapi dengan profil akun peneliti bawaan:

| Parameter | Kredensial Pengujian |
| :--- | :--- |
| **Email Peneliti** | `researcher@biomedical.ac.id` |
| **Kata Sandi** | `password123` |
| **Nama Peneliti** | Dr. Renaldi Simamora |
| **Institusi** | Dept. of Electrical & Biomedical Engineering |
| **Peran (Role)** | `researcher` (Full Access) |

> [!TIP]
> Antarmuka login web pada rute `/login` memiliki tombol pintas **"Quick Fill Demo Account"** yang secara otomatis mengisikan kredensial di atas untuk mempercepat pengujian.

---

## 9. Panduan Navigasi & Fitur Antarmuka Pengguna (Web UI)

Antarmuka web dirancang dengan estetika **Dark Luxury Modern**, tipografi modern, kartu kaca (*glassmorphism*), dan mikro-interaksi responsif.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STRUKTUR NAVIGASI UTAMA                         │
├───────────────────┬────────────────────────────────────────────────────┤
│ RUTE PUBLIK       │ - [ / ] : Academic Landing Page & Visualizer       │
│                   │ - [ /about ] : Landasan Teori & Metodologi Sinyal  │
│                   │ - [ /login ] : Masuk Sistem Peneliti               │
│                   │ - [ /register ] : Pendaftaran Peneliti Baru        │
├───────────────────┼────────────────────────────────────────────────────┤
│ RUTE RISET &      │ - [ /dashboard ] : Panel Kontrol Utama Riset       │
│ PENGENDALIAN      │ - [ /live ] : Real-Time Canvas Oscilloscope        │
│ (AUTHENTICATED)   │ - [ /sessions ] : Arsip & Riwayat Perekaman Data   │
│                   │ - [ /sessions/:id ] : Analisis Sesi Mendalam       │
│                   │ - [ /devices ] : Registry Hardware & Baterai       │
│                   │ - [ /analysis ] : Evaluasi Model Machine Learning  │
│                   │ - [ /settings ] : Profil & Parameter Telemetri     │
└───────────────────┴────────────────────────────────────────────────────┘
```

### 1. Landing Page (`/`)
- **Interactive Hero**: Dilengkapi simulasi visualisasi gelombang EEG multi-pita dinamis, status koneksi telemetri, dan floating metrics.
- **Hardware Architecture Section**: Penjelasan komprehensif alur kerja dari elektroda FP1, chip TGAM1, mikrokontroler ESP32, hingga server.
- **Live Band Power Visualizer**: Equalizer interaktif yang menunjukkan proporsi energi Delta, Theta, Alpha, Beta, dan Gamma.
- **Sticky Floating Action Bar**: Navigasi persisten yang tetap berada di atas layar saat pengguna menggulir ke bawah (*smooth auto-stick navigation*).

### 2. Dashboard Kontrol (`/dashboard`)
- **Key Performance Indicators (KPI)**:
  - Total Sesi Akuisisi yang tersimpan.
  - Perangkat Aktif & Indikator Kualitas Sinyal ($0-100\%$).
  - Rata-rata Kepatuhan Impedansi Sensor.
  - Status Kesiapan Model Machine Learning.
- **Real-Time Mini Waveform Preview**: Pratinjau langsung sinyal voltase yang sedang berlangsung.
- **Recent Sessions Table**: Ringkasan sesi rekaman terakhir beserta durasi, subjek, dan kualitas sinyal rata-rata.
- **Hardware Status Card**: Pemantauan baterai, versi firmware, dan *last-seen heartbeat* perangkat.

### 3. Live Oscilloscope Monitor (`/live`)
- **High-FPS HTML5 Canvas Monitor**: Menampilkan aliran data tegangan mentah ($\mu\text{V}$) dengan kecepatan render 60 FPS, sumbu waktu dinamis, dan efek *phosphor-glow*.
- **Stream Controls**: Tombol *Pause / Resume Stream*, *Record Session*, dan penanda *Event Marker*.
- **Signal Quality Gauge**: Indikator visual real-time apakah elektroda kering telah terpasang dengan baik pada dahi tanpa noise impedansi kontak.

### 4. Manajemen Sesi Akuisisi (`/sessions` & `/sessions/[id]`)
- **Session Archive**: Daftar seluruh rekaman sinyal dengan filter tanggal, pencarian nama subjek, dan status rekaman (*completed*, *running*, *interrupted*).
- **Session Detail Inspector**:
  - Rekonstruksi grafik sinyal EEG penuh dari awal hingga akhir sesi.
  - Grafik spektrum daya FFT per pita gelombang.
  - Ekspor data mentah ke format CSV / JSON untuk analisis lanjutan di MATLAB atau Python NumPy.

### 5. Manajemen Perangkat Wearable (`/devices`)
- **Device Registry**: Inventaris semua perangkat keras EEG (contoh: `TGAM1 Wearable Headset Alpha`).
- **Telemetry Indicators**: Tingkat daya baterai Li-Po dalam persentase, kekuatan sinyal Wi-Fi (RSSI), dan versi firmware ESP32.
- **Hardware Spec Modal**: Dialog rincian spesifikasi mikrokontroler, baud rate UART, dan penempatan elektroda.

### 6. Analisis Machine Learning (`/analysis`)
- **Candidate Models Evaluation**:
  - **Support Vector Machine (SVM)** dengan RBF Kernel.
  - **Random Forest Classifier** (100 Decision Trees).
  - **XGBoost Classifier** (Extreme Gradient Boosting).
- **Evaluation Metrics**: Visualisasi akurasi validasi silang (*cross-validation accuracy*), skor F1, *precision*, *recall*, dan matriks konfusi (*confusion matrix*).

### 7. Pengaturan Sistem (`/settings`)
- **Researcher Profile**: Nama peneliti, email, dan institusi akademik afiliasi.
- **Telemetry Preferences**: Penyesuaian interval broadcast WebSocket (50 Hz hingga 512 Hz).
- **Session Configuration**: Pengaturan durasi standar perekaman otomatis (misal: 15 menit per sesi).

---

## 10. Spesifikasi API Gateway & WebSocket

Backend Go menyediakan RESTful API dan saluran streaming WebSocket yang terstandardisasi. Dokumentasi mendalam dapat dilihat pada [`docs/api.md`](docs/api.md).

### Format Respon Standar (Standard JSON Envelope)
Setiap respon HTTP selalu dibungkus dalam format yang konsisten:
```json
{
  "success": true,
  "message": "Operasi berhasil diselesaikan",
  "data": { ... },
  "error": ""
}
```

### Ringkasan Endpoint REST API Utama

| Metode | Jalur Endpoint | Akses | Deskripsi & Fungsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Publik | Health-check status server backend Go |
| `POST` | `/api/auth/register` | Publik | Mendaftarkan akun peneliti baru |
| `POST` | `/api/auth/login` | Publik | Otentikasi dan penerbitan Bearer JWT Token |
| `POST` | `/api/auth/logout` | Publik | Pembatalan status sesi otentikasi |
| `GET` | `/api/auth/me` | Protected | Mengambil rincian akun peneliti yang sedang login |
| `GET` | `/api/devices` | Protected | Mengambil daftar seluruh perangkat EEG terdaftar |
| `POST` | `/api/devices` | Protected | Mendaftarkan unit perangkat hardware baru |
| `GET` | `/api/devices/:id` | Protected | Rincian telemetri dan status perangkat tertentu |
| `GET` | `/api/sessions` | Protected | Mengambil riwayat sesi perekaman sinyal |
| `POST` | `/api/sessions` | Protected | Memulai sesi perekaman baru (`status: running`) |
| `POST` | `/api/sessions/:id/stop` | Protected | Menghentikan sesi perekaman dan menghitung durasi |
| `GET` | `/api/eeg/:sessionId` | Protected | Mengambil data titik voltase sinyal EEG per sesi |
| `POST` | `/api/eeg/data` | Protected | Mengunggah paket sampel sinyal dari mikrokontroler |
| `GET` | `/api/dashboard/summary` | Protected | Agregasi data metrik untuk kartu KPI dashboard |
| `GET` | `/api/models` | Publik | Daftar model Machine Learning dan status kesiapannya |
| `GET` | `/api/analysis/:sessionId` | Protected | Hasil ekstraksi fitur spektral & inferensi ML sesi |

### Protokol Streaming WebSocket (`/ws/eeg`)

Koneksi streaming dua arah untuk penyaluran sinyal mentah berkecepatan tinggi:
- **WebSocket URL**: `ws://localhost:8080/ws/eeg`
- **Format Paket Data (JSON Real-Time Frame)**:
```json
{
  "session_id": "ses-001",
  "device_id": "dev-001",
  "timestamp": 1727712345000,
  "raw_eeg": -12.45,
  "signal_quality": 96,
  "bands": {
    "delta": 24.5,
    "theta": 18.2,
    "alpha": 35.8,
    "beta": 15.1,
    "gamma": 6.4
  },
  "heartbeat": {
    "battery": 88,
    "rssi": -62
  }
}
```

---

## 11. Skema Database & Entitas Relasional (PostgreSQL)

Skema database PostgreSQL dirancang secara modular dan dioptimalkan dengan indeks performa untuk pencarian deret waktu (*time-series indexing*).

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : "melakukan"
    DEVICES ||--o{ SESSIONS : "digunakan_pada"
    SESSIONS ||--o{ EEG_SAMPLES : "memiliki_titik"
    SESSIONS ||--o{ BRAINWAVE_FEATURES : "menghasilkan_fitur"
    SESSIONS ||--o{ ML_PREDICTIONS : "memiliki_prediksi"
    SESSIONS ||--o{ AI_INSIGHTS : "memperoleh"

    USERS {
        varchar id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar role
        varchar institution
        timestamp created_at
    }

    DEVICES {
        varchar id PK
        varchar device_code UK
        varchar name
        varchar status
        int battery_level
        int signal_quality
        varchar firmware_version
        timestamp last_seen
    }

    SESSIONS {
        varchar id PK
        varchar user_id FK
        varchar device_id FK
        timestamp started_at
        timestamp ended_at
        int duration
        varchar status
    }

    EEG_SAMPLES {
        varchar id PK
        varchar session_id FK
        bigint timestamp
        double raw_eeg
        int signal_quality
    }

    BRAINWAVE_FEATURES {
        varchar id PK
        varchar session_id FK
        bigint timestamp
        double delta
        double theta
        double alpha
        double beta
        double gamma
    }

    ML_PREDICTIONS {
        varchar id PK
        varchar session_id FK
        bigint timestamp
        varchar model_name
        varchar model_version
        varchar predicted_class
        double confidence
    }

    AI_INSIGHTS {
        varchar id PK
        varchar session_id FK
        varchar title
        text summary
    }
```

### Rincian Tabel Database (`migrations/000001_init_schema.sql`):
1. **`users`**: Menyimpan kredensial peneliti, hash kata sandi Bcrypt, email unik, dan nama departemen / institusi.
2. **`devices`**: Menyimpan registrasi unit hardware wearable TGAM1, status koneksi (*connected*, *disconnected*, *warning*), dan telemetri baterai.
3. **`sessions`**: Mencatat setiap sesi eksperimen biosinyal yang diawali dan diakhiri oleh peneliti.
4. **`eeg_samples`**: Tabel penyimpanan titik data tegangan sinyal mentah ($\mu\text{V}$) dan kualitas kontak elektroda.
5. **`brainwave_features`**: Hasil ekstraksi daya spektral 5 pita gelombang otak per jendela waktu (*windowing*).
6. **`ml_predictions`**: Hasil inferensi kelas keadaan mental (contoh: *Focused*, *Relaxed*, *Drowsy*) beserta tingkat kepercayaan (*confidence score*).
7. **`ai_insights`**: Catatan interpretasi otomatis mengenai variasi spektrum yang diobservasi selama sesi.

---

## 12. Pipeline Integrasi Machine Learning (ML Contracts)

Arsitektur sistem telah disiapkan untuk integrasi mulus dengan modul pemrosesan sinyal dan microservice Machine Learning (Python FastAPI):

```
[Raw Voltage Trace (µV)] 
          │
          ▼
[Preprocessing & Filtering]
  - 50 Hz Notch Filter (Eliminasi Derau Jala-Jala Listrik PLN)
  - 0.5–50 Hz 4th Order Butterworth Bandpass Filter
          │
          ▼
[Signal Windowing]
  - Jendela geser 2 detik (2-second sliding window) dengan 50% overlap (1024 sampel @ 512 Hz)
          │
          ▼
[Feature Extraction (Spectral & Temporal)]
  - Fast Fourier Transform (FFT) / Welch Power Spectral Density (PSD)
  - Logarithmic Band Power: Delta, Theta, Alpha, Beta, Gamma
  - Ratios: Theta/Beta Ratio (TBR), Engagement Index: Beta / (Alpha + Theta)
  - Spectral Entropy & Signal Standard Deviation
          │
          ▼
[Candidate ML Classifiers]
  ├── Support Vector Machine (SVM) — Hyperplane optimal dengan RBF Kernel
  ├── Random Forest Classifier — Ensemble 100 pohon keputusan
  └── XGBoost Classifier — Gradient boosting berkinerja tinggi
          │
          ▼
[Classification Output]
  - Kelas: Focused (Fokus) | Relaxed (Rileks) | Drowsy (Mengantuk) | Active Cognitive
  - Probabilitas / Confidence Level (0.00 – 1.00)
```

---

## 13. Panduan Troubleshooting & FAQ

### T1: Mengapa saat menjalankan `npm run dev` di folder `backend`, terjadi error port atau server tertutup?
**Jawaban**: Backend dibangun menggunakan **Go (Golang)**, bukan aplikasi Node.js. Perintah `npm run dev` pada root repositori sebenarnya diarahkan untuk menyalakan frontend (`cd frontend && npm run dev`).  
Untuk menjalankan backend, masuk ke folder `backend` dan jalankan executable:
```powershell
cd backend
.\server.exe
```

---

### T2: Muncul pesan error "Port 3000 is in use by process <PID>, using available port 3001 instead"?
**Jawaban**: Ada proses server Next.js sebelumnya yang masih aktif di latar belakang. Anda dapat menghentikan proses tersebut di Windows Command Prompt / PowerShell dengan perintah:
```powershell
taskkill /PID <PID_TERSEBUT> /F
# Contoh jika PID adalah 3352:
taskkill /PID 3352 /F
```
Setelah itu, jalankan kembali `npm run dev` di dalam folder `frontend`.

---

### T3: Muncul log "[DATABASE] PostgreSQL is not reachable: password authentication failed"?
**Jawaban**: Ini adalah perilaku normal jika layanan PostgreSQL lokal Anda belum aktif atau menggunakan password yang berbeda dari konfigurasi default.  
Sistem secara cerdas beralih ke **In-Memory Synchronized Store** dengan perangkat demo bawaan sehingga Anda tetap dapat menjalankan, menguji, dan mendemokan seluruh fitur antarmuka web tanpa hambatan instalasi database.

---

### T4: Bagaimana cara menghubungkan hardware ESP32 fisik ke backend ini?
**Jawaban**:
1. Pastikan komputer backend dan ESP32 berada dalam jaringan Wi-Fi lokal yang sama.
2. Pada firmware ESP32 (Arduino C++ / ESP-IDF), arahkan target alamat IP ke IP LAN komputer Anda (contoh: `http://192.168.1.100:8080/api/eeg/data` atau WebSocket `ws://192.168.1.100:8080/ws/eeg`).
3. Kirimkan paket data serial dari TGAM1 secara berkala sesuai format JSON kontrak pada [Seksi 10](#10-spesifikasi-api-gateway--websocket).

---

## 14. Roadmap Pengembangan Sistem

- [x] **Fase 1: Fondasi Arsitektur & Antarmuka Pengguna (Selesai)**
  - Desain & implementasi Dark Luxury UI Next.js 16.
  - Komponen Canvas Oscilloscope 60 FPS untuk rendering voltase.
  - Go Gin Backend Gateway dengan autentikasi JWT dan Gorilla WebSocket Hub.
  - In-Memory Fallback Store & skema migrasi database PostgreSQL.
- [ ] **Fase 2: Integrasi Firmware ESP32 & Perakitan Hardware Wearable (Sedang Berjalan)**
  - Pembuatan casing headband 3D printed yang ergonomis untuk penempatan modul TGAM1 dan elektroda kering FP1.
  - Pengujian stabilitas transmisi Wi-Fi ESP32 pada sampling rate 512 Hz tanpa packet loss.
  - Kalibrasi impedansi kontak elektroda telinga (*reference ground*).
- [ ] **Fase 3: Pelatihan & Penerapan Model Machine Learning (Tahap Berikutnya)**
  - Pengambilan dataset sinyal dari sejumlah subjek uji sukarelawan dengan protokol eksperimen standar.
  - Pelatihan model klasifikasi multi-kelas (SVM, Random Forest, XGBoost) menggunakan library Python Scikit-Learn.
  - Penerapan microservice inferensi real-time berbasis Python FastAPI yang terhubung langsung ke Go Gateway.

---

## 15. Lisensi & Etika Penelitian

Proyek ini dikembangkan di bawah naungan penelitian rekayasa biomedis dan teknologi informasi. Kode sumber didistribusikan di bawah lisensi:

**MIT Academic Research License**  
Hak Cipta © 2026 Tim Peneliti EEG Wearable Platform.

> **Pernyataan Etika & Keamanan Hayati (Bioethics Disclaimer):**  
> Perangkat dan perangkat lunak ini dirancang khusus untuk keperluan studi akademik, riset rekayasa, dan evaluasi ilmiah. Perangkat ini **BUKAN** merupakan perangkat medis klinis bersertifikasi (*Not an FDA/CE approved diagnostic medical device*) dan tidak ditujukan untuk diagnosa mandiri penyakit neurologis atau penanganan medis darurat.

---

*Disusun dengan dedikasi untuk kemajuan teknologi Brain-Computer Interface (BCI) dan Rekayasa Biomedis Indonesia.*
