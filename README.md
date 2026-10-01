# EEG Wearable Platform — IoT Biosignal Monitoring & Machine Learning Gateway

> **Academic Engineering Research Project**  
> **Judul Penelitian**: *Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning*  
> **Fakultas / Program Studi**: Teknik Elektro & Rekayasa Biomedis / Ilmu Komputer  
> **Versi Rilis**: `v1.2.0-academic` | **Status**: Active Development & Hardware Integration Stage  

---

[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016%20App%20Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/UI-React%2019-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Go 1.22](https://img.shields.io/badge/Backend-Go%201.22%20Gin-00ADD8?style=for-the-badge&logo=go)](https://go.dev/)
[![PostgreSQL 17](https://img.shields.io/badge/Database-PostgreSQL%2017-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Google OAuth](https://img.shields.io/badge/Auth-Google%20OAuth%202.0-EA4335?style=for-the-badge&logo=google)](https://cloud.google.com/)
[![WebSockets](https://img.shields.io/badge/RealTime-Gorilla%20WebSocket-orange?style=for-the-badge)](https://github.com/gorilla/websocket)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20v4%20Biomedical%20Dark-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Academic%20MIT-emerald?style=for-the-badge)](LICENSE)

---

## 📑 Daftar Isi (Table of Contents)

1. [Ringkasan Eksekutif & Latar Belakang Riset](#1-ringkasan-eksekutif--latar-belakang-riset)
2. [Arsitektur Sistem (End-to-End Architecture)](#2-arsitektur-sistem-end-to-end-architecture)
3. [Rancang Bangun & Spesifikasi Perangkat Keras (Hardware IoT)](#3-rancang-bangun--spesifikasi-perangkat-keras-hardware-iot)
   - [3.1 Daftar Komponen Hardware](#31-daftar-komponen-hardware)
   - [3.2 Diagram Pinout & Wiring (ESP32 ke TGAM1)](#32-diagram-pinout--wiring-esp32-ke-tgam1)
   - [3.3 Contoh Source Code Firmware ESP32 (Arduino C++)](#33-contoh-source-code-firmware-esp32-arduino-c)
4. [Karakteristik & Pita Frekuensi Gelombang Otak (EEG Bands)](#4-karakteristik--pita-frekuensi-gelombang-otak-eeg-bands)
5. [Teknologi & Tech Stack Lengkap](#5-teknologi--tech-stack-lengkap)
6. [Struktur Direktori & Rincian Modul Proyek](#6-struktur-direktori--rincian-modul-proyek)
7. [Panduan Instalasi & Menjalankan Proyek](#7-panduan-instalasi--menjalankan-proyek)
   - [7.1 Prasyarat Sistem](#71-prasyarat-sistem)
   - [7.2 Konfigurasi Database PostgreSQL (Lokal / pgAdmin)](#72-konfigurasi-database-postgresql-lokal--pgadmin)
   - [7.3 Konfigurasi Environment Variables (.env)](#73-konfigurasi-environment-variables-env)
   - [7.4 Menjalankan Backend (Go API Gateway)](#74-menjalankan-backend-go-api-gateway)
   - [7.5 Menjalankan Frontend (Next.js Web App)](#75-menjalankan-frontend-nextjs-web-app)
   - [7.6 Shortcut Eksekusi via Root package.json](#76-shortcut-eksekusi-via-root-packagejson)
   - [7.7 Menjalankan via Docker & Docker Compose](#77-menjalankan-via-docker--docker-compose)
8. [Panduan Integrasi Google OAuth 2.0 (Google Cloud Platform)](#8-panduan-integrasi-google-oauth-20-google-cloud-platform)
9. [Sistem Otentikasi & Proteksi Route (Server-Side Middleware)](#9-sistem-otentikasi--proteksi-route-server-side-middleware)
10. [State Machine & Alur Sesi Akuisisi Live EEG](#10-state-machine--alur-sesi-akuisisi-live-eeg)
11. [Akun Peneliti Bawaan (Demo Credentials)](#11-akun-peneliti-bawaan-demo-credentials)
12. [Panduan Navigasi & Fitur Antarmuka Pengguna (Web UI)](#12-panduan-navigasi--fitur-antarmuka-pengguna-web-ui)
13. [Spesifikasi API Gateway & WebSocket Protocol](#13-spesifikasi-api-gateway--websocket-protocol)
    - [13.1 Endpoint REST API](#131-endpoint-rest-api)
    - [13.2 Protokol Streaming WebSocket (/ws/eeg)](#132-protokol-streaming-websocket-wseeg)
    - [13.3 Contoh Pengujian Endpoint via cURL](#133-contoh-pengujian-endpoint-via-curl)
14. [Skema Database & Entitas Relasional (PostgreSQL)](#14-skema-database--entitas-relasional-postgresql)
15. [Pipeline Integrasi Machine Learning (ML Contracts)](#15-pipeline-integrasi-machine-learning-ml-contracts)
16. [Panduan Troubleshooting & FAQ Terperinci](#16-panduan-troubleshooting--faq-terperinci)
17. [Roadmap Pengembangan Sistem](#17-roadmap-pengembangan-sistem)
18. [Lisensi & Etika Penelitian Biomedis](#18-lisensi--etika-penelitian-biomedis)

---

## 1. Ringkasan Eksekutif & Latar Belakang Riset

**Elektroensefalografi (EEG)** konvensional berbasis laboratorium medis umumnya menggunakan instrumen *multichannel* stasioner berbiaya puluhan hingga ratusan juta rupiah dengan elektroda pasta/gel basah (*wet electrodes*). Prosedur ini membutuhkan persiapan subjek yang lama, penataan pasta konduktif yang rentan mengering, serta membatasi mobilitas subjek di luar ruang uji terlindung (*Faraday cage*).

Platform **EEG Wearable** ini dikembangkan sebagai solusi terintegrasi untuk menjembatani **perangkat biosensing EEG wearable berbiaya terjangkau (wearable low-cost EEG)** dengan arsitektur web modern dan komputasi cerdas. Sistem ini mencakup 5 pilar utama:
1. **IoT Edge Acquisition Layer**: Mengakuisisi sinyal biopotensial otak pada elektroda dahi FP1 dengan modul ASIC TGAM1 dan mikrokontroler ESP32 secara nirkabel melalui protokol Wi-Fi 802.11 b/g/n.
2. **Central Go API Gateway Layer**: Gerbang backend berbasis bahasa pemrograman Go (Gin Web Framework) berkinerja tinggi, menyediakan autentikasi JWT terenkripsi, integrasi Google OAuth 2.0 resmi, sinkronisasi WebSocket streaming 50–512 Hz, manajemen siklus sesi akuisisi, dan orkestrasi database.
3. **Database & Time-Series Persistence Layer**: Penyimpanan data terstruktur PostgreSQL 17 untuk raw voltage sinyal EEG, fitur ekstraksi daya spektral (Power Spectral Density / PSD), log sesi, inventaris perangkat, dan hasil prediksi machine learning.
4. **Modern Web Presentation Layer**: Antarmuka berbasis Next.js 16 (App Router) dengan tema *Dark Biomedical Glassmorphism*, visualisasi osiloskop real-time 60 FPS berbasis HTML5 Canvas, grafik distribusi spektral gelombang otak, panel kontrol hardware, serta pemisahan layout otentikasi split-screen modern.
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
        AuthMid["JWT & Google OAuth Middleware"]
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
        PostgresDB[("PostgreSQL 17 Database\n- users, devices, sessions\n- eeg_samples, brainwave_features\n- ml_predictions, ai_insights")]
        GoogleOAuthSvc["Google Identity Services API\n(OAuth 2.0 Tokeninfo Verification)"]
        MLService["Future ML Inference Service\n(Python FastAPI / Scikit-Learn)\n- SVM (RBF Kernel)\n- Random Forest Classifier\n- XGBoost Gradient Booster"]
    end

    AuthMid <-->|"Verify ID Token"| GoogleOAuthSvc
    SessionMgr <-->|"SQL Query via lib/pq"| PostgresDB
    FeatureEngine -->|"Feature Vector (PSD, Band Power)"| MLService
    MLService -->|"Predicted Class & Confidence"| SessionMgr

    subgraph FrontendLayer ["4. PRESENTATION WEB APPLICATION (:3000)"]
        NextMiddleware["Edge/Server Auth Middleware (middleware.ts)\n- Strict HTTP 307 Redirects\n- eeg_auth_token Cookie Sync"]
        NextClient["Next.js 16 App Router (React 19 + TypeScript)"]
        CanvasOscilloscope["High-FPS HTML5 Canvas Oscilloscope\n(60 FPS Raw Waveform Render)"]
        SpectralCharts["Frequency Bands Energy Spectrum\n(Delta, Theta, Alpha, Beta, Gamma)"]
        DeviceDiagnostics["Hardware Registry & Diagnostics Panel"]
        AuthSplitScreen["Dedicated 2-Side Auth Layout (AuthShell)\n+ Google Sign-In One-Tap"]
    end

    NextMiddleware --> NextClient
    WSHub -->|"WebSocket Stream (JSON Frame)"| NextClient
    NextClient <-->|"REST API Requests (/api/*)"| GoServer
    NextClient --- CanvasOscilloscope
    NextClient --- SpectralCharts
    NextClient --- DeviceDiagnostics
    NextClient --- AuthSplitScreen
```

---

## 3. Rancang Bangun & Spesifikasi Perangkat Keras (Hardware IoT)

### 3.1 Daftar Komponen Hardware

| Komponen | Spesifikasi Teknis | Fungsi dalam Riset |
| :--- | :--- | :--- |
| **Sensor Front-End** | NeuroSky TGAM1 (ThinkGear ASIC Module) | Penguat biopotensial mikrovolt (µV), konversi analog-ke-digital (ADC) 512 Hz, filter analog terintegrasi. |
| **Elektroda Aktif** | Sintered Ag/AgCl atau Gold-Plated Dry Electrode | Ditempatkan pada lokasi **FP1 (Frontal Pole 1)** sesuai *10–20 International System*. Tanpa memerlukan gel basah. |
| **Elektroda Referensi & Ground** | Dual-contact Earclip Electrode (A1 / Mastoid) | Referensi beda potensial dan eliminasi derau interferensi tubuh (*Common Mode Rejection*). |
| **Unit Pemroses (MCU)** | ESP-WROOM-32 (Dual-Core Tensilica Xtensa 240 MHz) | Membaca paket data UART dari pin TX TGAM1, mengurai paket data, mengelola buffer, dan mengirim via Wi-Fi. |
| **Protokol Serial Sensor** | UART Asynchronous (57,600 baud, 8-N-1) | Jalur data kabel langsung antara TGAM1 dan GPIO pin RX ESP32. |
| **Transmisi Jaringan** | Wi-Fi 802.11 b/g/n (2.4 GHz) | Pengiriman data nirkabel berbasis soket TCP / HTTP REST / WebSocket ke Backend Gateway. |
| **Catu Daya (Power Unit)** | Baterai Lithium-Polymer 3.7V 500–1000 mAh | Daya mandiri yang aman bagi subjek tanpa kontak tegangan listrik bolak-balik (AC 220V). |
| **Regulator Tegangan** | Low-Dropout (LDO) 3.3V Low-Noise (ME6211 / AMS1117) | Menjamin tegangan 3.3V bersih bebas riak (*ripple-free*) untuk mencegah artefak daya pada sinyal EEG. |
| **Pengisi Daya (Charger)** | Modul TP4056 USB-C dengan Proteksi Baterai | Pengisian ulang daya Li-Po via USB-C dengan proteksi overcharge (4.2V) dan overdischarge (2.5V). |

---

### 3.2 Diagram Pinout & Wiring (ESP32 ke TGAM1)

```text
  ┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
  │       NeuroSky TGAM1 ASIC       │                 │        ESP32 DevKit V1          │
  │                                 │                 │                                 │
  │                       [ VCC ] ──┼─────────────────┼── [ 3V3 Out ]                   │
  │                       [ GND ] ──┼─────────────────┼── [ GND ]                       │
  │                        [ TX ] ──┼─────────────────┼── [ GPIO 16 (RX2) ]             │
  │                        [ RX ] ──┼── (Optional) ───┼── [ GPIO 17 (TX2) ]             │
  │                                 │                 │                                 │
  │       [ FP1 Active Lead ] ──────┼── Dahi Kiri     │                                 │
  │       [ Ref Earclip Lead ] ─────┼── Daun Telinga  │                                 │
  │       [ Gnd Earclip Lead ] ─────┼── Daun Telinga  │                                 │
  └─────────────────────────────────┘                 └─────────────────────────────────┘
```

> [!CAUTION]
> **Peringatan Tegangan**: Sensor TGAM1 bekerja pada tegangan kerja **3.3V DC**. Jangan menghubungkan pin VCC TGAM1 ke pin `5V` atau `VIN` ESP32 karena dapat merusak komponen ASIC sensor secara permanen.

---

### 3.3 Contoh Source Code Firmware ESP32 (Arduino C++)

Berikut adalah referensi implementasi firmware ESP32 untuk membaca paket serial dari modul TGAM1 dan mengirimkannya ke Backend Gateway:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Konfigurasi Wi-Fi & Gateway API
const char* WIFI_SSID     = "NAMA_WIFI_LABORATORIUM";
const char* WIFI_PASSWORD = "PASSWORD_WIFI";
const char* API_ENDPOINT  = "http://192.168.1.100:8080/api/eeg/data";

// Serial 2 untuk komunikasi TGAM1 (GPIO 16 = RX, GPIO 17 = TX)
HardwareSerial TGAM_Serial(2);

// Variabel Penampung Data Biosinyal
int rawEEG = 0;
int poorSignalQuality = 200; // 0 = Sinyal Sempurna, 200 = Elektroda Lepas
float deltaPower = 0.0, thetaPower = 0.0, alphaPower = 0.0, betaPower = 0.0, gammaPower = 0.0;

void setup() {
  Serial.begin(115200);
  TGAM_Serial.begin(57600, SERIAL_8N1, 16, 17);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Menghubungkan ke Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Terhubung! IP: " + WiFi.localIP().toString());
}

// Fungsi Parsing Paket Data ThinkGear TGAM1 (Sync Bytes: 0xAA 0xAA)
void readTGAMPacket() {
  if (TGAM_Serial.available() >= 3) {
    if (TGAM_Serial.read() == 0xAA && TGAM_Serial.peek() == 0xAA) {
      TGAM_Serial.read(); // Konsumsi sync byte kedua
      uint8_t payloadLength = TGAM_Serial.read();
      if (payloadLength > 169) return; // Ukuran payload tidak valid

      uint8_t payload[payloadLength];
      uint8_t checksum = 0;
      for (int i = 0; i < payloadLength; i++) {
        payload[i] = TGAM_Serial.read();
        checksum += payload[i];
      }
      checksum = ~checksum & 0xFF;
      uint8_t receivedChecksum = TGAM_Serial.read();

      if (checksum == receivedChecksum) {
        // Parsing Payload Kode ThinkGear
        for (int i = 0; i < payloadLength; i++) {
          switch (payload[i]) {
            case 0x02: // Poor Signal Quality (0 - 200)
              poorSignalQuality = payload[++i];
              break;
            case 0x80: // Raw 16-bit 512 Hz Wave Value
              i++; // Lewati length (2 bytes)
              rawEEG = (payload[i] << 8) | payload[i+1];
              if (rawEEG >= 32768) rawEEG -= 65536;
              i++;
              break;
          }
        }
      }
    }
  }
}

void loop() {
  readTGAMPacket();

  // Kirim telemetri periodik ke Go Gateway
  static unsigned long lastSend = 0;
  if (millis() - lastSend >= 100) { // Frekuensi pengiriman 10 Hz
    lastSend = millis();
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(API_ENDPOINT);
      http.addHeader("Content-Type", "application/json");

      StaticJsonDocument<256> doc;
      doc["session_id"] = "SESSION_UUID_DARI_WEB";
      doc["device_id"]  = "ESP32-EEG-W01";
      doc["raw_eeg"]    = rawEEG;
      doc["signal_quality"] = (poorSignalQuality == 0) ? 100 : (200 - poorSignalQuality) / 2;

      String requestBody;
      serializeJson(doc, requestBody);
      int httpCode = http.POST(requestBody);
      http.end();
    }
  }
}
```

---

## 4. Karakteristik & Pita Frekuensi Gelombang Otak (EEG Bands)

Sinyal EEG diurai ke dalam 5 pita spektrum utama (*frequency bands*) menggunakan transformasi Fourier (Fast Fourier Transform / FFT) atau estimasi daya spektral Welch PSD:

```text
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
- **Framework**: [Next.js 16](https://nextjs.org/) dengan arsitektur App Router & Server Components
- **Bahasa Pemrograman**: [TypeScript 5](https://www.typescriptlang.org/) dengan *strict mode*
- **Library UI**: React 19, Tailwind CSS v4 (*Biomedical Dark Theme*), Lucide React Icons
- **Otentikasi**: `@react-oauth/google` untuk integrasi Google Sign-In tombol resmi
- **Visualisasi Biosinyal**:
  - **HTML5 Canvas Oscilloscope**: Rendering gelombang EEG mikrovolt secara real-time 60 FPS dengan buffer peredam flicker (*anti-aliased glow trace*).
  - **Recharts & Custom SVG**: Visualisasi daya spektral energi gelombang otak per detik.
- **Manajemen Formulir & Validasi**: React Hook Form dipadukan dengan skema validasi [Zod](https://zod.dev/).
- **Data Fetching & Cache**: [TanStack React Query v5](https://tanstack.com/query) untuk polling telemetri otomatis dan invalidasi cache mutasi data.

### Backend Stack (API Gateway)
- **Bahasa Pemrograman**: [Go (Golang) v1.22+](https://go.dev/) untuk performa konkurensi goroutine tinggi dan konsumsi memori rendah.
- **Web Framework**: [Gin Web Framework](https://github.com/gin-gonic/gin) dengan router HTTP ultra-cepat.
- **Real-Time Engine**: [Gorilla WebSocket](https://github.com/gorilla/websocket) dengan sistem pub/sub client broadcast hub.
- **Keamanan & Autentikasi**:
  - Verifikasi Google OAuth 2.0 ID Token langsung ke server tokeninfo resmi Google.
  - JSON Web Tokens (JWT) dengan algoritma enkripsi tanda tangan HMAC-SHA256 (`github.com/golang-jwt/jwt/v5`).
  - Hashing kata sandi berbasis salt adaptif menggunakan `golang.org/x/crypto/bcrypt`.
  - CORS Middleware terkonfigurasi dengan validasi domain asal (`http://localhost:3000`).
- **Driver Database**: `github.com/lib/pq` untuk koneksi PostgreSQL murni.
- **Graceful Fault-Tolerant Store**: Jika PostgreSQL lokal belum berjalan, backend otomatis mengaktifkan *In-Memory Synchronized Store* lengkap dengan *seeded mock devices* agar riset tetap bisa dijalankan tanpa hambatan teknis.

### Database & Infrastruktur
- **Database Utama**: [PostgreSQL 17](https://www.postgresql.org/) dengan skema tabel terindeks untuk data deret waktu (*time-series*).
- **Kontainerisasi**: Docker Engine & Docker Compose untuk orkestrasi otomatis satu perintah (*multi-container setup*).

---

## 6. Struktur Direktori & Rincian Modul Proyek

Berikut adalah hierarki lengkap dari seluruh file dan folder dalam repositori:

```text
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
│   │   └── config.go              # Loader environment variables (Port, DB URL, JWT, Google ID)
│   ├── internal/                  # Paket privat logika internal server
│   │   ├── analysis/              # Handler & logika model klasifikasi ML
│   │   ├── auth/                  # Layanan registrasi, login, JWT & Google OAuth verification
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
    ├── .env.local                 # Konfigurasi endpoint frontend & Google Client ID aktif
    ├── Dockerfile                 # Konfigurasi kontainerisasi Next.js
    ├── next.config.ts             # Konfigurasi Next.js Compiler & Transpilation
    ├── package.json               # Dependensi modul Node.js & pustaka visualisasi
    ├── postcss.config.mjs         # Plugin PostCSS untuk Tailwind
    ├── tsconfig.json              # Konfigurasi TypeScript & path aliases (@/*)
    ├── public/                    # Aset statis publik (favicon, logo, icons)
    └── src/
        ├── middleware.ts          # Edge/Server Route Protection Middleware (HTTP 307 Redirects)
        ├── app/                   # Rute halaman Next.js (App Router)
        │   ├── layout.tsx         # Root Layout, font Geist, metadata, AuthProvider
        │   ├── globals.css        # Variabel warna kustom & utility glassmorphism
        │   ├── page.tsx           # Academic Landing Page (Interactive Hero, dock, & equalizer)
        │   ├── login/page.tsx     # Halaman Login split-screen dengan Google OAuth & redirect handling
        │   ├── register/page.tsx  # Halaman Registrasi peneliti dengan password strength meter
        │   ├── dashboard/page.tsx # Pusat kontrol & ringkasan operasional riset (Standby default)
        │   ├── live/page.tsx      # Real-time oscilloscope monitor dengan explicit state machine
        │   ├── sessions/          # Riwayat data akuisisi sinyal
        │   │   ├── page.tsx       # Arsip tabel sesi dengan pencarian & filter
        │   │   └── [id]/page.tsx  # Detail inspeksi sesi: voltase mentah & spektrum
        │   ├── devices/page.tsx   # Inventaris hardware wearable, sinyal, baterai
        │   ├── analysis/page.tsx  # Evaluasi model Machine Learning (SVM, RF, XGB)
        │   ├── settings/page.tsx  # Pengaturan profil peneliti, telemetri, timer
        │   └── about/page.tsx     # Latar belakang saintifik & metodologi riset
        ├── components/            # Komponen antarmuka yang dapat digunakan kembali
        │   ├── ui/                # Atoms: Button, Card, Badge, Input, Modal, Select, StatusIndicator
        │   ├── layout/            # Layouts: AppShell (Dashboard layout), AuthShell (Auth 2-side layout), Navbar, Footer
        │   ├── dashboard/         # Molecules: SummaryCard, LiveEEGPreview (Standby), RecentSessionsTable
        │   └── eeg/               # Biosignal Components: WaveformChart (Standby overlay), FrequencyBandsChart, MLPredictionCard
        ├── hooks/
        │   └── useEEGStream.ts    # Custom hook dengan explicit session state machine (READY -> ACQUIRING -> etc.)
        ├── providers/
        │   └── AuthProvider.tsx   # React Context untuk status autentikasi global & cookie synchronization
        ├── services/              # Modul klien HTTP (Fetch Wrappers dengan Auto-Bearer)
        │   ├── api.ts             # Central client dengan 401 auto-logout handler
        │   ├── auth.service.ts    # Registrasi, Login, Google OAuth, & Cookie helper
        │   ├── dashboard.service.ts
        │   ├── device.service.ts
        │   └── session.service.ts
        └── types/
            └── index.ts           # Deklarasi tipe TypeScript untuk User, Session, Device, EEG
```

---

## 7. Panduan Instalasi & Menjalankan Proyek

Sistem ini dirancang sangat fleksibel dan dapat dijalankan secara lokal di Windows, macOS, Linux, ataupun menggunakan kontainer Docker.

### 7.1 Prasyarat Sistem
- **Node.js**: Versi `v18.17.0` atau yang lebih baru (disarankan LTS v20+).
- **npm**: Versi `v9.0.0` atau lebih tinggi.
- **Go**: Versi `1.22+` (Hanya diperlukan jika ingin mengompilasi ulang source code Go). Jika menggunakan binary bawaan Windows `backend/server.exe`, instalasi Go tidak diwajibkan.
- **PostgreSQL**: Versi 14, 15, atau 17 (Sudah terpasang di komputer lokal).

---

### 7.2 Konfigurasi Database PostgreSQL (Lokal / pgAdmin)

Backend secara otomatis mengaplikasikan skema migrasi SQL (`backend/migrations/000001_init_schema.sql`) saat pertama kali terhubung ke database. Anda hanya perlu memastikan database kosong bernama `eeg_db` telah dibuat di PostgreSQL:

#### Opsi A: Membuat Database via pgAdmin 4
1. Buka aplikasi **pgAdmin 4**.
2. Masukkan master password PostgreSQL Anda.
3. Klik kanan pada folder **Databases** → Pilih **Create** → **Database...**.
4. Masukkan Database name: `eeg_db`.
5. Klik tombol **Save**.

#### Opsi B: Membuat Database via Command Line (psql)
```sql
psql -U postgres
CREATE DATABASE eeg_db;
\q
```

> [!NOTE]
> **Fakta Penting Seputar pgAdmin**: Menutup aplikasi pgAdmin **TIDAK AKAN** mematikan database Anda. PostgreSQL berjalan sebagai layanan latar belakang Windows (**Windows Service: postgresql-x64-17**) pada port `5432`. pgAdmin hanyalah viewer visual, sehingga Anda aman menutup pgAdmin kapan saja saat aplikasi web sedang berjalan.

---

### 7.3 Konfigurasi Environment Variables (.env)

#### A. Konfigurasi Backend (`backend/.env`)
Salin file template pada folder backend:
```bash
cd backend
copy .env.example .env     # Windows Command Prompt / PowerShell
# atau: cp .env.example .env (Linux / macOS)
```
Sesuaikan isi file `backend/.env`:
```env
PORT=8080
DATABASE_URL=postgres://postgres:password_postgres_anda@localhost:5432/eeg_db?sslmode=disable
JWT_SECRET=eeg-platform-secure-jwt-academic-secret-key-32chars
CORS_ORIGIN=http://localhost:3000
GOOGLE_CLIENT_ID=524835681476-cnvohi484a5tk54koattq2sd4rbl3u9f.apps.googleusercontent.com
```
*(Ganti `password_postgres_anda` dengan kata sandi akun postgres lokal Anda)*.

#### B. Konfigurasi Frontend (`frontend/.env.local`)
Salin file template pada folder frontend:
```bash
cd frontend
copy .env.example .env.local    # Windows
# atau: cp .env.example .env.local (Linux / macOS)
```
Sesuaikan isi file `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws/eeg
NEXT_PUBLIC_GOOGLE_CLIENT_ID=524835681476-cnvohi484a5tk54koattq2sd4rbl3u9f.apps.googleusercontent.com
```

---

### 7.4 Menjalankan Backend (Go API Gateway)

> [!IMPORTANT]
> Backend dibangun menggunakan bahasa pemrograman **Go (Golang)**, **BUKAN Node.js**. Jangan menjalankan perintah `npm run dev` di dalam folder `backend`. Gunakan salah satu opsi di bawah ini:

#### Opsi 1: Menjalankan Pre-Compiled Binary (Paling Cepat untuk Windows)
```powershell
cd backend
.\server.exe
```

#### Opsi 2: Menjalankan dari Source Code (Jika Go Terinstal)
```bash
cd backend
go run ./cmd/server
```

**Output Terminal Backend yang Berhasil:**
```text
=================================================================
  EEG Wearable Platform - Go Backend API Gateway
  Academic Project: Rancang Bangun Perangkat IoT Wearable Berbasis EEG
=================================================================
[DATABASE] Connecting to PostgreSQL at postgres://postgres:***@localhost:5432/eeg_db?sslmode=disable...
[DATABASE] Successfully connected to PostgreSQL database.
[DATABASE] Schema migrations applied successfully.
[GIN-debug] GET    /health
[GIN-debug] GET    /ws/eeg
[GIN-debug] POST   /api/auth/register
[GIN-debug] POST   /api/auth/login
[GIN-debug] POST   /api/auth/google
[GIN-debug] POST   /api/auth/logout
[GIN-debug] GET    /api/devices
[SERVER] Starting HTTP & WebSocket server on :8080
```
Backend kini aktif melayani koneksi di **`http://localhost:8080`**.

---

### 7.5 Menjalankan Frontend (Next.js Web App)

Buka jendela terminal baru:
```bash
cd frontend
npm install
npm run dev
```

**Output Terminal Frontend yang Berhasil:**
```text
▲ Next.js 16.3.7 (Turbopack)
- Local:        http://localhost:3000
- Environments: .env.local
✓ Ready in 1.4s
```

Buka peramban (browser) dan akses alamat:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### 7.6 Shortcut Eksekusi via Root `package.json`

Pada direktori root repositori, telah tersedia skrip pintas:

| Perintah Terminal | Tindakan yang Dijalankan |
| :--- | :--- |
| `npm run dev` | Menjalankan server frontend Next.js di port 3000. |
| `npm run dev:frontend` | Berpindah ke folder `frontend` dan menjalankan Next.js dev server. |
| `npm run build:frontend` | Melakukan kompilasi bundel produksi frontend Next.js. |
| `npm run start:backend` | Menjalankan server executable backend Go (`backend/server.exe`). |
| `npm run dev:backend` | Mengompilasi dan mengeksekusi kode Go dari source (`go run ./cmd/server`). |

---

### 7.7 Menjalankan via Docker & Docker Compose

Bila di komputer Anda telah terpasang **Docker Desktop**, Anda dapat menjalankan PostgreSQL, Go Backend, dan Next.js secara simultan dengan satu perintah:

```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend Gateway: `http://localhost:8080`
- Database: `localhost:5432`

---

## 8. Panduan Integrasi Google OAuth 2.0 (Google Cloud Platform)

Platform ini mendukung otentikasi resmi satu ketukan (**Sign in with Google**) yang terintegrasi langsung dengan database PostgreSQL melalui endpoint backend `POST /api/auth/google`.

```mermaid
sequenceDiagram
    autonumber
    actor User as Peneliti (Browser)
    participant FE as Next.js 16 Web Client
    participant Google as Google Identity Services
    participant BE as Go Backend API Gateway
    participant DB as PostgreSQL Database

    User->>FE: Klik tombol "Sign in with Google"
    FE->>Google: Membuka Google One-Tap / Popup
    User->>Google: Memilih Akun Google & Memberi Izin
    Google-->>FE: Mengembalikan ID Token (JWT Google)
    FE->>BE: POST /api/auth/google { id_token }
    BE->>Google: Verifikasi token ke oauth2.googleapis.com/tokeninfo
    Google-->>BE: Profil Pengguna (email, name, sub)
    BE->>DB: Query / Upsert User berdasarkan email
    DB-->>BE: Data Entitas User
    BE-->>FE: Token JWT Sesi Akademik & User Object
    FE->>User: Set Cookie eeg_auth_token & Redirect ke Dashboard
```

### Langkah Konfigurasi Google Cloud Console:
1. **Buat / Pilih Project**:
   - Masuk ke [Google Cloud Console](https://console.cloud.google.com/).
   - Buat project baru bernama `EEG Wearable Platform` (atau nama pilihan Anda).
2. **Setup Branding (Layar Persetujuan OAuth)**:
   - Masuk ke **Google Auth Platform** → **Branding**.
   - Isi **App name**: `EEG Wearable Platform`.
   - Isi **User support email** & **Developer contact information** dengan alamat email Anda.
   - Klik **Save**.
3. **Tambahkan Test Users (Audience)**:
   - Selama aplikasi berstatus *Testing*, masuk ke menu **Audience** (Test users).
   - Klik **+ Add Users** dan masukkan alamat email Gmail yang akan digunakan untuk pengujian login.
4. **Buat OAuth Client ID**:
   - Masuk ke menu **Clients** → klik **+ Create Client**.
   - Pilih Application type: **Web application**.
   - Masukkan **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `http://localhost`
   - Masukkan **Authorized redirect URIs**:
     - `http://localhost:3000`
   - Klik **Create**. Salin **Client ID** yang muncul.
5. **Pasang Client ID ke Proyek**:
   - Masukkan ke `frontend/.env.local`: `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<CLIENT_ID_ANDA>`
   - Masukkan ke `backend/.env`: `GOOGLE_CLIENT_ID=<CLIENT_ID_ANDA>`
   - Restart server backend & frontend.

---

## 9. Sistem Otentikasi & Proteksi Route (Server-Side Middleware)

Sistem mengadopsi prinsip **Zero Trust Architecture** untuk rute aplikasi internal.

### Karakteristik Proteksi:
1. **Edge/Server Middleware ([`src/middleware.ts`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/middleware.ts))**:
   - Memeriksa HTTP Cookie `eeg_auth_token` di tingkat server Next.js sebelum halaman dirender ke klien.
   - **Akses Langsung Tanpa Login**: Jika pengguna yang belum login membuka `/dashboard`, `/live`, `/sessions`, `/analysis`, `/devices`, atau `/settings`, server langsung mengembalikan respon **HTTP 307 Temporary Redirect** ke `/login?redirect=<url_asal>`. Konten dasbor tidak akan pernah sempat muncul di browser (*no content flash*).
   - **Pengguna Sudah Login**: Jika pengguna yang telah memiliki token aktif membuka `/login` atau `/register`, server otomatis mengalihkannya ke `/dashboard`.
2. **Preservasi URL Asal (`?redirect=...`)**:
   - Jika pengguna awalnya mencoba mengakses `/sessions/123` lalu diarahkan ke login, setelah login berhasil mereka akan diarahkan langsung ke `/sessions/123`, bukan dipaksa kembali ke dasbor.
3. **Dedicated Split-Screen Auth UI ([`AuthShell.tsx`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/components/layout/AuthShell.tsx))**:
   - Halaman login dan register menggunakan layout terpisah dengan sisi kiri visual branding teknologi biosinyal EEG dan sisi kanan formulir kredensial.
   - Layout otentikasi tidak memuat header atau sidebar teknis dasbor.
4. **Log Out Menyeluruh (Left Sidebar Button)**:
   - Tombol **Sign Out** tersedia langsung di bagian bawah sidebar kiri (desktop dan drawer mobile).
   - Mengklik Sign Out akan:
     1. Menghapus cookie `eeg_auth_token` secara tuntas (`max-age=0` & tanggal kedaluwarsa lampau).
     2. Menghapus seluruh data sesi pada `localStorage` dan `sessionStorage`.
     3. Mengarahkan kembali ke **Landing Page publik (`/`)** dengan *hard navigation* sehingga seluruh state in-memory bersih kembali.

---

## 10. State Machine & Alur Sesi Akuisisi Live EEG

Halaman Live EEG (`/live`) dirancang dengan **Finite State Machine (FSM)** yang tegas dan aman untuk mencegah akuisisi data berjalan liar tanpa kehendak peneliti.

### State Machine Diagram:

```text
    ┌──────────────┐
    │    READY     │ ◀─── (Buka /live pertama kali, duration 00:00, waveform standby)
    └──────┬───────┘
           │ [Klik "Start Session"]
           ▼
    ┌──────────────┐
    │   STARTING   │ (Inisialisasi sesi DB & handshake WebSocket / simulasi)
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐   [Klik "Pause"]    ┌──────────────┐
    │  ACQUIRING   │ ──────────────────▶ │    PAUSED    │ (Waveform beku, timer berhenti)
    │ (Stream on)  │ ◀────────────────── │ (Standby)    │
    └──────┬───────┘   [Klik "Resume"]   └──────┬───────┘
           │                                    │
           │ [Klik "Stop Session"]              │ [Klik "Stop Session"]
           ▼                                    ▼
    ┌──────────────┐                     ┌──────────────┐
    │   STOPPING   │ ──────────────────▶ │  COMPLETED   │ (Tampil ringkasan sesi)
    └──────────────┘                     └──────┬───────┘
                                                │ [Klik "Start New Session"]
                                                └─────────▶ Kembali ke READY
```

### Aturan Alur Kerja:
1. **Keadaan Awal (`READY`)**:
   - Membuka halaman `/live` **TIDAK PERNAH** otomatis memulai akuisisi data, tidak menyalakan timer, tidak membuat rekaman di database, dan tidak menjalankan osiloskop.
   - Kanvas osiloskop berada dalam mode standby dengan overlay: *"Ready to start EEG acquisition. Press Start Session to begin recording."*
   - Status perangkat bertuliskan `Ready`, dan badge bertuliskan `Demo / Simulation — Ready`.
2. **Memulai Sesi (`Start Session`)**:
   - Peneliti memilih perangkat target dan menekan tombol **Start Session**.
   - Sistem memvalidasi perangkat, membuat record sesi di database via API, mengaktifkan streaming telemetri, menjalankan timer sesi dari `00:00`, dan menampilkan badge merah berkedip `ACQUIRING...`.
3. **Jeda Sesi (`Pause` & `Resume`)**:
   - Menekan **Pause** membekukan rendering sinyal dengan indikator `PAUSED • STREAM FROZEN` dan menghentikan pertambahan durasi.
   - Menekan **Resume** melanjutkan kembali perekaman data dan timer secara mulus.
4. **Mengakhiri Sesi (`Stop Session`)**:
   - Menekan **Stop Session** memfinalisasi sesi di database, menghitung total durasi rekaman dan rata-rata kualitas sinyal, serta menghentikan pemancar sinyal.
   - Status berubah menjadi `COMPLETED` dan menampilkan **Session Summary Card** dengan tombol **View Session Details** dan **Start New Session**.
5. **Transparansi Mode Simulasi vs Real Hardware**:
   - Data simulasi lokal selalu diberi label eksplisit `Demo / Simulation` dan perangkat diberi label `(Demo Device)`.
   - Sistem tidak pernah memalsukan status bahwa ada perangkat keras fisik yang terhubung jika yang berjalan adalah sinyal simulasi.

---

## 11. Akun Peneliti Bawaan (Demo Credentials)

Untuk memfasilitasi pengujian cepat tanpa Google OAuth atau registrasi mandiri:

| Parameter | Kredensial Pengujian |
| :--- | :--- |
| **Email Peneliti** | `researcher@biomedical.ac.id` |
| **Kata Sandi** | `password123` |
| **Nama Peneliti** | Dr. Renaldi Simamora |
| **Institusi** | Dept. of Electrical & Biomedical Engineering |
| **Peran (Role)** | `researcher` (Full Access) |

---

## 12. Panduan Navigasi & Fitur Antarmuka Pengguna (Web UI)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        STRUKTUR NAVIGASI UTAMA                         │
├───────────────────┬────────────────────────────────────────────────────┤
│ RUTE PUBLIK       │ - [ / ] : Academic Landing Page & Visualizer       │
│                   │ - [ /about ] : Landasan Teori & Metodologi Sinyal  │
│                   │ - [ /login ] : Masuk Sistem (Email & Google OAuth) │
│                   │ - [ /register ] : Pendaftaran Akun Peneliti Baru   │
├───────────────────┼────────────────────────────────────────────────────┤
│ RUTE RISET        │ - [ /dashboard ] : Panel Kontrol Utama Riset       │
│ (TERPROTEKSI      │ - [ /live ] : Real-Time Canvas Oscilloscope (FSM)  │
│ SERVER-SIDE)      │ - [ /sessions ] : Arsip & Riwayat Perekaman Data   │
│                   │ - [ /sessions/:id ] : Analisis Sesi Mendalam       │
│                   │ - [ /devices ] : Registry Hardware & Baterai       │
│                   │ - [ /analysis ] : Evaluasi Model Machine Learning  │
│                   │ - [ /settings ] : Profil & Parameter Telemetri     │
└───────────────────┴────────────────────────────────────────────────────┘
```

### Rincian Fitur Per Halaman:
1. **Landing Page (`/`)**:
   - Memperkenalkan topik penelitian, spesifikasi elektroda kering FP1, arsitektur cloud, dan diagram alur sinyal.
   - Dilengkapi visualisasi osiloskop interaktif langsung di hero section.
2. **Dashboard (`/dashboard`)**:
   - Menampilkan ringkasan metrik utama: Total Sesi Riset, Durasi Perekaman Kumulatif, Rata-rata Kualitas Sinyal Elektroda, dan Status Hardware Aktif.
   - Menyediakan tabel sesi rekaman terbaru dan grafik tren harian.
3. **Live Oscilloscope Monitor (`/live`)**:
   - Osiloskop real-time 60 FPS berbasis HTML5 Canvas dengan kontrol start/pause/stop sesi.
   - Menampilkan visualisasi spektrum daya gelombang otak (Delta, Theta, Alpha, Beta, Gamma) dan kartu inferensi mental state.
4. **Data Sessions (`/sessions` & `/sessions/[id]`)**:
   - Riwayat seluruh sesi yang pernah direkam oleh peneliti.
   - Halaman detail sesi menyediakan pemutaran ulang sinyal voltase mentah, distribusi frekuensi rata-rata, durasi total, dan metrik kualitas kontak sensor.
5. **Hardware Devices (`/devices`)**:
   - Manajemen inventaris perangkat headset EEG wearable.
   - Menampilkan status konektivitas, kapasitas baterai (%), versi firmware, dan waktu terakhir terlihat (*last seen*).
6. **Machine Learning Analysis (`/analysis`)**:
   - Panel evaluasi model klasifikasi gelombang otak.
   - Menampilkan perbandingan akurasi, presisi, recall, dan F1-Score antara model SVM (RBF Kernel), Random Forest, dan XGBoost.
7. **Researcher Settings (`/settings`)**:
   - Pengaturan profil pengguna, institusi riset, preferensi sampling rate osiloskop, batas ambang alarm kualitas sinyal, dan durasi auto-stop sesi.

---

## 13. Spesifikasi API Gateway & WebSocket Protocol

### 13.1 Endpoint REST API

| Metode | Jalur Endpoint | Akses | Deskripsi & Fungsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Publik | Health-check status server backend Go |
| `POST` | `/api/auth/register` | Publik | Mendaftarkan akun peneliti baru |
| `POST` | `/api/auth/login` | Publik | Otentikasi email/password dan penerbitan JWT |
| `POST` | `/api/auth/google` | Publik | Verifikasi Google OAuth ID Token & login instan |
| `POST` | `/api/auth/logout` | Publik | Pembatalan status sesi otentikasi |
| `GET` | `/api/auth/me` | Protected | Mengambil rincian akun peneliti yang sedang login |
| `GET` | `/api/users/me` | Protected | Mengambil rincian profil pengguna aktif |
| `PUT` | `/api/users/me` | Protected | Memperbarui nama dan institusi pengguna |
| `GET` | `/api/devices` | Protected | Mengambil daftar seluruh perangkat EEG terdaftar |
| `POST` | `/api/devices` | Protected | Mendaftarkan unit perangkat hardware baru |
| `GET` | `/api/devices/:id` | Protected | Rincian telemetri dan status perangkat tertentu |
| `PUT` | `/api/devices/:id` | Protected | Memperbarui nama/status perangkat |
| `DELETE`| `/api/devices/:id` | Protected | Menghapus perangkat dari database |
| `GET` | `/api/sessions` | Protected | Mengambil riwayat sesi perekaman sinyal |
| `POST` | `/api/sessions` | Protected | Memulai sesi perekaman baru (`status: running`) |
| `GET` | `/api/sessions/:id` | Protected | Mengambil detail spesifik sesi perekaman |
| `POST` | `/api/sessions/:id/stop` | Protected | Menghentikan sesi perekaman dan menghitung durasi |
| `GET` | `/api/eeg/:sessionId` | Protected | Mengambil data titik voltase sinyal EEG per sesi |
| `POST` | `/api/eeg/data` | Protected | Mengunggah paket sampel sinyal dari mikrokontroler |
| `GET` | `/api/dashboard/summary` | Protected | Agregasi data metrik untuk kartu KPI dashboard |
| `GET` | `/api/models` | Publik | Daftar model Machine Learning dan status kesiapannya |
| `GET` | `/api/analysis/:sessionId` | Protected | Hasil ekstraksi fitur spektral & inferensi ML sesi |

---

### 13.2 Protokol Streaming WebSocket (`/ws/eeg`)

- **WebSocket Endpoint**: `ws://localhost:8080/ws/eeg`
- Format paket data streaming (JSON Frame):
```json
{
  "session_id": "ses-001",
  "device_id": "dev-001",
  "timestamp": 1727712345000,
  "raw_eeg": -12.45,
  "signal_quality": 96,
  "delta": 24.5,
  "theta": 18.2,
  "alpha": 35.8,
  "beta": 15.1,
  "gamma": 6.4
}
```

---

### 13.3 Contoh Pengujian Endpoint via cURL

#### 1. Uji Health Check Backend:
```bash
curl -X GET http://localhost:8080/health
```
Respon:
```json
{"project":"Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning","service":"EEG Wearable Backend","status":"healthy"}
```

#### 2. Uji Login Peneliti:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"researcher@biomedical.ac.id\",\"password\":\"password123\"}"
```

#### 3. Uji Pengambilan Daftar Perangkat (Dengan Bearer Token):
```bash
curl -X GET http://localhost:8080/api/devices \
  -H "Authorization: Bearer <TOKEN_JWT_DARI_LOGIN>"
```

---

## 14. Skema Database & Entitas Relasional (PostgreSQL)

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
        timestamp updated_at
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
        timestamp created_at
        timestamp updated_at
    }

    SESSIONS {
        varchar id PK
        varchar user_id FK
        varchar device_id FK
        timestamp started_at
        timestamp ended_at
        int duration
        varchar status
        timestamp created_at
    }

    EEG_SAMPLES {
        varchar id PK
        varchar session_id FK
        bigint timestamp
        double raw_eeg
        int signal_quality
        timestamp created_at
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
        timestamp created_at
    }

    ML_PREDICTIONS {
        varchar id PK
        varchar session_id FK
        bigint timestamp
        varchar model_name
        varchar model_version
        varchar predicted_class
        double confidence
        timestamp created_at
    }

    AI_INSIGHTS {
        varchar id PK
        varchar session_id FK
        varchar title
        text summary
        timestamp created_at
    }
```

---

## 15. Pipeline Integrasi Machine Learning (ML Contracts)

```text
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

## 16. Panduan Troubleshooting & FAQ Terperinci

### T1: Apakah menutup pgAdmin akan menghentikan database atau membuat backend error?
**Jawaban**: **TIDAK berpengaruh sama sekali.** pgAdmin hanyalah aplikasi *Graphical User Interface (GUI)* untuk melihat isi tabel secara visual. Mesin database PostgreSQL yang sesungguhnya berjalan sebagai **Windows Background Service (`postgresql-x64-17`)** pada port `5432`. Backend Go terhubung langsung ke port tersebut, sehingga menutup pgAdmin tidak akan mengganggu backend atau website sedikitpun.

---

### T2: Mengapa saat klik "Login dengan Google" muncul nama project lama di jendela popup?
**Jawaban**: Nama aplikasi yang muncul pada jendela popup Google ("Lanjutkan ke ...") diambil dari pengaturan **Google Auth Platform** → **Branding** (Layar Persetujuan OAuth) di Google Cloud Console. Cukup buka tab **Branding**, ubah kolom **App name** menjadi `EEG Wearable Platform`, lalu simpan.

---

### T3: Muncul error "OAuth access is restricted to the test users listed on your OAuth consent screen"?
**Jawaban**: Saat aplikasi Google Cloud berstatus *Testing*, Google membatasi login hanya untuk email yang didaftarkan. Masuk ke **Google Auth Platform** → **Audience** → **Test users**, lalu klik **+ Add Users** dan masukkan alamat email Google Anda.

---

### T4: Bagaimana cara mematikan proses backend jika port 8080 sudah terpakai (Port Already in Use)?
**Jawaban**: Jalankan perintah berikut di PowerShell untuk menghentikan proses backend lama yang mengunci port 8080:
```powershell
Stop-Process -Name "server" -Force
```
Jika nama binary berbeda, temukan ID Proses (PID) dengan:
```powershell
netstat -ano | findstr :8080
```
Lalu matikan proses tersebut menggunakan PID yang ditemukan:
```powershell
taskkill /F /PID <NOMOR_PID>
```

---

### T5: Bagaimana cara mengompilasi ulang backend setelah melakukan perubahan pada file Go?
**Jawaban**:
1. Hentikan server yang sedang berjalan:
   ```powershell
   Stop-Process -Name "server" -Force
   ```
2. Jalankan perintah kompilasi:
   ```powershell
   cd backend
   go build -o server.exe .\cmd\server\main.go
   ```
3. Jalankan kembali binary hasil kompilasi:
   ```powershell
   .\server.exe
   ```

---

### T6: Mengapa saat saya membuka `/dashboard` langsung dialihkan ke `/login`?
**Jawaban**: Ini adalah fitur keamanan **Server-Side Route Protection (`src/middleware.ts`)**. Halaman dasbor, live, sesi, analisis, perangkat, dan pengaturan dilindungi oleh middleware. Anda harus login terlebih dahulu (menggunakan akun demo atau Google Sign-In) untuk mendapatkan cookie otentikasi `eeg_auth_token`.

---

## 17. Roadmap Pengembangan Sistem

- [x] **Fase 1: Fondasi Arsitektur & Antarmuka Pengguna (Selesai)**
  - Desain & implementasi Dark Biomedical UI Next.js 16.
  - Komponen Canvas Oscilloscope 60 FPS untuk rendering voltase mentah.
  - Go Gin Backend Gateway dengan autentikasi JWT dan Gorilla WebSocket Hub.
  - Integrasi resmi Google OAuth 2.0 (Google Identity Services).
  - Server-side route protection Next.js Middleware (`src/middleware.ts`).
  - Explicit Live EEG Session State Machine (`READY`, `STARTING`, `ACQUIRING`, `PAUSED`, `STOPPING`, `COMPLETED`).
- [ ] **Fase 2: Integrasi Firmware ESP32 & Perakitan Hardware Wearable (Sedang Berjalan)**
  - Pembuatan casing headband 3D printed yang ergonomis untuk penempatan modul TGAM1 dan elektroda kering FP1.
  - Pengujian stabilitas transmisi Wi-Fi ESP32 pada sampling rate 512 Hz tanpa packet loss.
  - Kalibrasi impedansi kontak elektroda telinga (*reference ground*).
- [ ] **Fase 3: Pelatihan & Penerapan Model Machine Learning (Tahap Berikutnya)**
  - Pengambilan dataset sinyal dari sejumlah subjek uji sukarelawan dengan protokol eksperimen standar.
  - Pelatihan model klasifikasi multi-kelas (SVM, Random Forest, XGBoost) menggunakan library Python Scikit-Learn.
  - Penerapan microservice inferensi real-time berbasis Python FastAPI yang terhubung langsung ke Go Gateway.

---

## 18. Lisensi & Etika Penelitian Biomedis

Proyek ini dikembangkan di bawah naungan penelitian rekayasa biomedis dan teknologi informasi. Kode sumber didistribusikan di bawah lisensi:

**MIT Academic Research License**  
Hak Cipta © 2026 Tim Peneliti EEG Wearable Platform.

> **Pernyataan Etika & Keamanan Hayati (Bioethics Disclaimer):**  
> Perangkat dan perangkat lunak ini dirancang khusus untuk keperluan studi akademik, riset rekayasa, dan evaluasi ilmiah. Perangkat ini **BUKAN** merupakan perangkat medis klinis bersertifikasi (*Not an FDA/CE approved diagnostic medical device*) dan tidak ditujukan untuk diagnosa mandiri penyakit neurologis atau penanganan medis darurat.

---

*Disusun dengan dedikasi untuk kemajuan teknologi Brain-Computer Interface (BCI) dan Rekayasa Biomedis Indonesia.*
