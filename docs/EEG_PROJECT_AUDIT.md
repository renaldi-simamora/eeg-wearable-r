# LAPORAN AUDIT TEKNIS MENYELURUH (READ-ONLY)
## Proyek: Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning

**Tanggal Audit**: 09 November 2026  
**Auditor**: Senior Embedded Systems Engineer, EEG Signal Processing Engineer, Backend & Security Auditor  
**Sifat Dokumen**: READ-ONLY AUDIT (Tidak ada kode atau konfigurasi yang diubah)  
**Dokumen Referensi Proyek**:
- Hardware: NeuroSky TGAM R2.9A, ESP32 DevKit V1, OLED SSD1306
- Backend: Go 1.22+ (Gin Framework, Gorilla WebSocket, PostgreSQL)
- ML Service: Python 3.10+ (FastAPI, Scikit-Learn, NumPy, Joblib)
- Frontend: Next.js 14 (App Router, TypeScript, TanStack Query, HTML5 Canvas)

---

## A. RINGKASAN KONDISI PROYEK

Sistem IoT Wearable EEG ini dirancang untuk melakukan akuisisi biosinyal gelombang otak secara non-invasif pada elektroda dahi (FP1), mentransmisikannya ke cloud gateway, menyimpannya ke database relasional, memvisualisasikannya secara real-time pada dashboard web, dan melakukan inferensi klasifikasi pola kognitif menggunakan Machine Learning.

### Status Integrasi Aktual Antar-Komponen:
1. **Frontend (Next.js + TypeScript)**:
   - **Kondisi**: Arsitektur UI, layout, routing, dan komponen grafik telah selesai dibangun dengan standar estetika tinggi.
   - **Konektivitas**: Kode pemanggilan API backend (`apiClient`) dan koneksi WebSocket (`/ws/eeg`) sudah diimplementasikan. Namun, seluruh service memiliki mekanisme **silent fallback ke mock/dummy data**: jika backend tidak aktif atau permintaan jaringan gagal, antarmuka otomatis menampilkan data dummy dan simulasi gelombang sintetis tanpa memunculkan error fatal di UI.
2. **Backend (Go Gin + PostgreSQL)**:
   - **Kondisi**: Sudah beroperasi secara fungsional. Seluruh test suite unit/integrasi (`go test ./...`) lulus 100%.
   - **Konektivitas**: Menyediakan RESTful API lengkap untuk autentikasi user, CRUD perangkat, manajemen sesi, penyerapan batch data IoT hardware, serta komunikasi HTTP client ke Python ML service.
3. **Database (PostgreSQL)**:
   - **Kondisi**: Skema 7 tabel inti telah didefinisikan dengan 5 file migrasi SQL. Memiliki fallback in-memory store jika database offline.
   - **Keterbatasan**: Tabel `eeg_samples` menyimpan setiap sampel 512 Hz sebagai baris relasional individual tanpa partisi time-series. Pengambilan data riwayat dibatasi `LIMIT 500`.
4. **Machine Learning Service (Python FastAPI)**:
   - **Kondisi**: Microservice mandiri pada port 5000 dengan model terlatih (SVM, Random Forest, Logistic Regression) dan dataset 50 subjek. Endpoint `/health`, `/models`, dan `/predict` sudah aktif dan terintegrasi dengan backend Go.
5. **Firmware ESP32 (C++ / Arduino)**:
   - **Kondisi**: Kode pada repository (`firmware/esp32_tgam1/esp32_tgam1.ino`) telah memiliki parser ThinkGear UART dan pengiriman batch HTTP POST ke `/api/v1/eeg/...`. Namun, arsitekturnya masih monolitik (blocking) pada satu core dan belum mengintegrasikan filter digital Biquad serta UI multi-page dari rancangan standalone.

---

## B. HASIL AUDIT FRONTEND

### 1. Struktur Folder dan Arsitektur
- **Framework**: Next.js 14 dengan **App Router** (`frontend/src/app`).
- **Penyusunan Kode**:
  - `frontend/src/app/`: Berisi routing halaman (`dashboard`, `live`, `sessions`, `sessions/[id]`, `analysis`, `devices`, `hardware/[id]`, `login`, `register`, `settings`, `about`).
  - `frontend/src/services/`: Service layer pembungkus API (`api.ts`, `auth.service.ts`, `dashboard.service.ts`, `device.service.ts`, `eeg.service.ts`, `session.service.ts`, `analysis.service.ts`).
  - `frontend/src/lib/mock/`: Kumpulan data dummy (`analysis.ts`, `dashboard.ts`, `devices.ts`, `eeg.ts`, `sessions.ts`).
  - `frontend/src/hooks/`: Hook kustom `useEEGStream.ts` (mengelola siklus hidup koneksi WebSocket, buffering, dan simulasi browser).
  - `frontend/src/providers/`: Context provider untuk otentikasi (`AuthProvider.tsx`) dan data fetching (`QueryProvider.tsx` menggunakan TanStack React Query).

### 2. Audit Halaman Aplikasi
* **Halaman Dashboard (`frontend/src/app/dashboard/page.tsx`)**:
  - Memanggil `dashboardService.getSummary()` via React Query.
  - Menampilkan ringkasan metrik: perangkat aktif, signal quality, durasi rata-rata, grafik band power, dan tabel sesi terbaru.
  - **Sumber Data**: Berusaha memanggil `GET /api/dashboard/summary`. Jika backend tidak merespons, fungsi menangkap error dan mengembalikan objek `mockDashboardSummary` ([`frontend/src/services/dashboard.service.ts#L8-L12`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/services/dashboard.service.ts#L8-L12)).
* **Halaman Live EEG (`frontend/src/app/live/page.tsx`)**:
  - Menggunakan hook `useEEGStream`.
  - Menyediakan visualisasi gelombang biosinyal kontinu, spektrum daya frekuensi, kontrol sesi (Start, Pause, Stop), dan pemilihan target frekuensi (Alpha, Beta, dll.).
  - **Sumber Data**: Berusaha membuka koneksi WebSocket ke `ws://localhost:8080/ws/eeg`. Jika WebSocket gagal terhubung atau terputus, hook langsung beralih ke mode `connectionMode: "client_simulation"` yang menghasilkan deret sinusoidal sintetis biologis di browser ([`frontend/src/hooks/useEEGStream.ts#L503-L519`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/hooks/useEEGStream.ts#L503-L519)).
* **Halaman Sessions (`frontend/src/app/sessions/page.tsx`)**:
  - Memanggil `sessionService.getSessions()`.
  - Dilengkapi fitur pencarian teks, filter perangkat, filter status sesi, dan pengurutan tanggal/durasi.
  - **Sumber Data**: Berusaha memanggil `GET /api/sessions`. Jika gagal, fallback mengembalikan array `mockSessions` ([`frontend/src/services/session.service.ts#L13-L17`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/services/session.service.ts#L13-L17)).
* **Halaman Session Detail (`frontend/src/app/sessions/[id]/page.tsx`)**:
  - Mengambil data melalui `sessionService.getSessionById(id)`, `eegService.getEEGData(id)`, dan `analysisService.getAnalysis(id)`.
  - Menampilkan grafik waveform statis, sebaran daya band, parameter protokol riset, dan kartu hasil inferensi ML.
  - **Sumber Data**: Jika backend tidak mengembalikan data, sistem menggenerasi metadata dan profil gelombang sintetis berdasarkan substring ID sesi ([`frontend/src/services/session.service.ts#L42-L74`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/services/session.service.ts#L42-L74)).
* **Halaman Analysis (`frontend/src/app/analysis/page.tsx`)**:
  - Memanggil `analysisService.getModels()`.
  - Menampilkan arsitektur pipeline ML, kartu model (SVM, RF, LR), metrik evaluasi (akurasi, presisi, recall, F1), dan formulasi vektor input.
  - **Sumber Data**: Memanggil `GET /api/models`. Jika gagal, fallback ke `mockModelCards` ([`frontend/src/services/analysis.service.ts#L14-L20`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/services/analysis.service.ts#L14-L20)).
* **Halaman Devices (`frontend/src/app/devices/page.tsx`)**:
  - Memanggil `deviceService.getDevices()`.
  - Menampilkan daftar modul hardware, status koneksi, baterai, versi firmware, dan modal registrasi perangkat baru.
  - **Sumber Data**: Mengambil data dari `GET /api/devices`, kemudian menggabungkannya dengan perangkat yang ada pada `mockDevices` ([`frontend/src/services/device.service.ts#L21-L30`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/services/device.service.ts#L21-L30)).
* **Halaman Login & Settings (`frontend/src/app/login/page.tsx`, `settings/page.tsx`)**:
  - Login menggunakan validasi schema Zod dan integrasi Google OAuth. Jika backend offline, tersedia demo mode yang otomatis login sebagai mock user `admin@gmail.com` ([`frontend/src/services/auth.service.ts#L83-L100`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/services/auth.service.ts#L83-L100)).
  - Settings menyediakan form pembaruan profil peneliti dan konfigurasi monitoring.

### 3. Komponen Visualisasi Grafik EEG
- **`WaveformChart.tsx`**: Diimplementasikan menggunakan **HTML5 Canvas 2D API murni** dengan penanganan *Device Pixel Ratio (DPR)* untuk layar retina. Menggambar grid tegangan klinik ($\pm 40\ \mu\text{V}$) dan garis sinyal dengan performa render tinggi tanpa lag DOM ([`frontend/src/components/eeg/WaveformChart.tsx#L27-L100`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/components/eeg/WaveformChart.tsx#L27-L100)).
- **`FrequencyBandsChart.tsx`**: Merender diagram batang dan persentase spektral 5 kelompok frekuensi (Delta, Theta, Alpha, Beta, Gamma) beserta deteksi gelombang dominan secara matematis.

### 4. API Client & Transport
- **Base URL**: Dikonfigurasi di [`frontend/src/config/index.ts`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/config/index.ts):
  - REST API: `process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"`
  - WebSocket: `process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws/eeg"`
- **Otentikasi Client**: Menyematkan token Bearer dari `localStorage` atau cookie pada header `Authorization` ([`frontend/src/services/api.ts#L29-L31`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/services/api.ts#L29-L31)).
- **Mekanisme Polling / Stream**: Polling reaktif dikelola oleh React Query, sedangkan streaming live data real-time ditangani oleh WebSocket di `useEEGStream.ts`.

---

## C. HASIL AUDIT BACKEND GO GIN

### 1. Struktur Folder Backend
- `backend/cmd/server/main.go`: Titik masuk server, inisialisasi database, WebSocket Hub, dan router Gin.
- `backend/config/config.go`: Pemuat variabel lingkungan (`PORT`, `DATABASE_URL`, `JWT_SECRET`, `DEVICE_API_KEY`, dll.).
- `backend/internal/`:
  - `auth/`: Handler, service registrasi, login, Google OAuth, verifikasi password bcrypt.
  - `devices/`: Handler dan service pengelolaan perangkat EEG.
  - `sessions/`: Handler pengelolaan sesi dan pembentukan laporan sesi.
  - `eeg/`: Penyerapan sampel biopotensial dari hardware ESP32 dan broadcast WebSocket.
  - `analysis/`: Handler komunikasi inferensi ke Python ML microservice.
  - `dashboard/`: Agregasi metrik dan ringkasan platform.
  - `database/`: Abstraksi layer data (`Store`), implementasi PostgreSQL (`PostgresStore`), dan in-memory store (`MemoryStore`).
  - `middleware/`: Logger, CORS, JWT Auth, Hardware Device Auth.
  - `websocket/`: Hub WebSocket broadcast thread-safe.
- `backend/models/models.go`: Struktur DTO, entitas database, dan kontrak payload.
- `backend/routes/routes.go`: Konfigurasi routing Gin engine.

### 2. Verifikasi Middleware & Autentikasi
- **JWT User Authentication (`AuthMiddleware`)**: Memvalidasi header `Authorization: Bearer <token>`, mengurai klaim `userID`, `email`, dan `role`. Masa berlaku token adalah 7 hari ([`backend/internal/middleware/auth.go#L28`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/middleware/auth.go#L28)).
- **Hardware Device Authentication (`HardwareDeviceAuthMiddleware`)**: Wajib menyertakan header `X-Device-API-Key` atau `X-API-Key`. Token JWT user ditolak secara tegas pada endpoint hardware ini ([`backend/internal/middleware/auth.go#L86-L118`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/middleware/auth.go#L86-L118)).
- **CORS Middleware (`CORSMiddleware`)**: Memiliki celah refleksi Origin (lihat Bagian G).

### 3. Implementasi WebSocket Hub
- Berlokasi di [`backend/internal/websocket/hub.go`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/websocket/hub.go).
- Menggunakan `gorilla/websocket` dengan `sync.RWMutex` untuk konkurensi multi-client.
- Menyediakan generator simulasi biologis bawaan di server jika client meminta data mode simulasi.
- **Keterbatasan Temuan**: Saat data hardware nyata masuk melalui `IngestDeviceBatch`, backend hanya mem-broadcast **1 titik sampel terakhir** dari batch (`latestSample := eegSamples[sampleCount-1]`), bukan seluruh 100–200 sampel ([`backend/internal/eeg/handler.go#L471-L486`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/eeg/handler.go#L471-L486)).

---

## D. HASIL AUDIT DATABASE POSTGRESQL

### 1. Skema dan Entitas Tabel
Skema database didefinisikan pada 5 file migrasi di `backend/migrations/`:
1. `users`: Menyimpan identitas peneliti, email unik, dan password hash bcrypt.
2. `devices`: Menyimpan kode perangkat, status, level baterai, firmware, dan signal quality (nullable).
3. `sessions`: Menyimpan relasi user, perangkat, status, durasi, target band (`ALPHA`, dll.), dan metadata.
4. `eeg_samples`: Menyimpan data mentah biopotensial ($\mu\text{V}$), timestamp (BIGINT epoch ms), dan signal quality.
5. `brainwave_features`: Menyimpan fitur ekstraksi 5 band power (Delta, Theta, Alpha, Beta, Gamma).
6. `ml_predictions`: Menyimpan riwayat hasil inferensi machine learning per sesi.
7. `ai_insights`: Menyimpan ringkasan analisis naratif berbasis kecerdasan buatan.

### 2. Integritas Relasi dan Timestamp
- Relasi menggunakan Foreign Key eksplisit dengan integritas referensial: `ON DELETE CASCADE` untuk data sampel/fitur/prediksi terhadap sesi induknya, dan `ON DELETE RESTRICT` pada penghapusan perangkat aktif.
- Seluruh tabel relasional menggunakan tipe data `TIMESTAMP WITH TIME ZONE` untuk pencatatan audit.

### 3. Evaluasi Skalabilitas Data Besar (High-Volume Ingestion)
- **Temuan Kritis**:
  - Pada sampling rate 512 Hz, satu sesi berdurasi 5 menit menghasilkan $153.600$ baris data, dan 1 jam menghasilkan $1.843.200$ baris.
  - Tabel `eeg_samples` saat ini bertipe relasional murni dengan Primary Key string `VARCHAR(36)` berbentuk `SessionID-s{Index}`.
  - **Belum ada partisi tabel** (`PARTITION BY RANGE (timestamp)` atau ekstensi TimescaleDB hypertable). Tanpa partisi, indeks B-Tree akan mengalami degradasi performa (*index bloat*) saat volume sampel mencapai puluhan juta baris.
  - Handler `GetEEGSamples` pada [`backend/internal/database/postgres.go#L365`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/database/postgres.go#L365) menerapkan `LIMIT 500`. Hal ini menyebabkan frontend hanya dapat memuat kurang dari 1 detik data riwayat ($500 / 512\text{ Hz} \approx 0.97\text{ detik}$) saat membuka sesi yang telah selesai.

---

## E. HASIL AUDIT PYTHON ML SERVICE

### 1. Arsitektur dan Framework
- **Framework**: **FastAPI** + **Uvicorn** + **Pydantic v2** pada file [`ml_service/app.py`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/ml_service/app.py).
- **Machine Learning**: Scikit-Learn (`StandardScaler`, `SVC`, `RandomForestClassifier`, `LogisticRegression`), NumPy, Joblib.

### 2. Model & Dataset
- **Model Tersedia**: Disimpan dalam direktori `ml_service/models/`:
  - `svm_model.joblib`: Support Vector Machine dengan RBF Kernel dan calibrated probabilities.
  - `rf_model.joblib`: Random Forest Classifier (100 estimators).
  - `lr_model.joblib`: Multinomial Logistic Regression baseline.
  - `scaler.joblib`: Objek normalisasi `StandardScaler`.
  - `metadata.json`: Metrik evaluasi 5-fold cross-validation.
- **Dataset Latih**: `ml_service/data/merged_eeg_datas_50_subjects.csv` (data biosinyal normatif dari 50 subjek penelitian).

### 3. Endpoint Inferensi
- `GET /health`: Pemeriksaan ketersediaan service dan status model yang dimuat.
- `GET /models`: Menampilkan spesifikasi teknis dan metrik akurasi model.
- `POST /predict`: Menerima vektor daya 5 frekuensi (Delta, Theta, Alpha, Beta, Gamma) atau array sampel mentah, melakukan normalisasi persentase relatif 100%, scaling, dan mengembalikan kelas prediksi beserta probabilitas keyakinan (*confidence score*).

### 4. Status Integrasi ke Backend
- **Telah Terintegrasi Penuh**: Backend Go memanggil `POST http://localhost:5000/predict` via fungsi `ClassifySession()` ([`backend/internal/analysis/handler.go#L81`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/analysis/handler.go#L81)). Jika service Python mati, backend memberikan respon deskriptif bahwa service ML sedang offline.

---

## F. KESIAPAN INTEGRASI ESP32 + TGAM1

| Parameter Integrasi | Ketersediaan di Backend | Status & Detail Implementasi |
| :--- | :---: | :--- |
| **Registrasi Perangkat** | **TERSEDIA** | Didukung otomatis via `POST /api/v1/eeg/sessions/start`. Jika `device_id` belum terdaftar, backend langsung membuat record perangkat baru. |
| **Autentikasi Perangkat** | **TERSEDIA** | Dilindungi oleh `HardwareDeviceAuthMiddleware` menggunakan header `X-Device-API-Key`. |
| **Pembuatan Sesi EEG** | **TERSEDIA** | Endpoint `/api/v1/eeg/sessions/start` membuat sesi berstatus `running` dan menetapkan target band. |
| **Penerimaan Raw EEG** | **TERSEDIA** | Endpoint `/api/v1/eeg/samples` menerima array `int16` mentah ADC, mengonversinya ke $\mu\text{V}$, dan menyimpannya ke database. |
| **Penyimpanan Band Power** | **TERSEDIA** | Menerima 8 sub-band ASIC power TGAM1 dan menormalkannya ke tabel `brainwave_features`. |
| **Penyimpanan Attention & Meditation** | **BELUM TERSEDIA** | Byte Attention (`0x04`) dan Meditation (`0x05`) **belum didefinisikan** pada DTO request `DeviceBatchSamplesRequest` maupun kolom database. |
| **Streaming Real-Time ke Web** | **TERSEDIA SEBAGIAN** | Backend mem-broadcast ke WebSocket, tetapi hanya mengambil **1 sampel terakhir** per batch HTTP, bukan 512 Hz utuh. |
| **Deteksi Disconnect Otomatis** | **BELUM TERSEDIA** | Timestamp `last_seen` diperbarui saat batch masuk, tetapi tidak ada background worker yang mengubah status perangkat menjadi `disconnected` jika pengiriman berhenti. |
| **Penanganan Data Tidak Valid / Lead-off** | **PERLU PERBAIKAN** | Sampel saat elektroda lepas (`signal_quality = 200`) tetap disimpan tanpa flag invalid. Endpoint `sessions/finish` selalu mengubah status sesi menjadi `'completed'` di database meskipun ESP32 melaporkan `'incomplete'`. |

---

## G. TEMUAN KEAMANAN (SECURITY AUDIT)

1. **Insecure Direct Object Reference (IDOR) pada Data Sesi Peneliti**:
   - **Lokasi**: [`backend/internal/sessions/handler.go#L420-L435`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/sessions/handler.go#L420-L435) dan [`backend/internal/eeg/handler.go#L528-L543`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/eeg/handler.go#L528-L543).
   - **Deskripsi**: Fungsi `GetByID` pada sesi dan `GetEEGData` pada biosinyal hanya memeriksa apakah pemanggil memiliki token JWT yang valid, tetapi **tidak memverifikasi apakah `ses.UserID` cocok dengan `currentUserID`**. Akibatnya, setiap pengguna yang login dapat mengakses rekaman data gelombang otak milik pengguna lain hanya dengan mengetahui ID sesi.
2. **CORS Permissive Origin Reflection**:
   - **Lokasi**: [`backend/internal/middleware/cors.go#L11-L20`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/middleware/cors.go#L11-L20).
   - **Deskripsi**: Middleware membaca header `Origin` dari client dan langsung merefleksikannya ke header `Access-Control-Allow-Origin: origin` bersamaan dengan `Access-Control-Allow-Credentials: true`. Hal ini memungkinkan situs web berbahaya dari domain lain membaca respon API pengguna jika korban mengunjungi situs tersebut.
3. **Masa Berlaku JWT Token Tanpa Revokasi**:
   - **Lokasi**: [`backend/internal/middleware/auth.go#L28`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/middleware/auth.go#L28).
   - **Deskripsi**: Token JWT berlaku selama 7 hari tanpa mekanisme refresh token, blacklist, atau invalidasi saat logout. Token yang tersimpan di `localStorage` rentan terhadap pencurian via XSS.
4. **Fallback Default Secrets pada Kode Sumber**:
   - **Lokasi**: [`backend/config/config.go#L35, L52`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/config/config.go#L35).
   - **Deskripsi**: Terdapat string default fallback untuk `JWT_SECRET` dan `DEVICE_API_KEY` jika file `.env` tidak ditemukan. Pada deployment produksi, server harus menolak berjalan (*fatal exit*) jika variabel lingkungan rahasia tersebut belum disetel.

---

## H. DAFTAR ENDPOINT API YANG TERSEDIA

| Method | Path | Fungsi / Deskripsi | Status Implementasi | Format Request & Response Utama |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/health`, `/api/health` | Pemeriksaan kesehatan layanan backend | **Berfungsi** | Respon: `{status: "healthy", service: "..."}` |
| `GET` | `/ws/eeg`, `/api/ws/eeg` | WebSocket handshake streaming biosinyal | **Berfungsi** | Protokol: WebSocket RFC 6455; JSON packet stream |
| `POST` | `/api/auth/register` | Pendaftaran akun peneliti baru | **Berfungsi** | Req: `{name, email, password, institution}`<br>Res: `{token, user}` |
| `POST` | `/api/auth/login` | Otentikasi dan login user | **Berfungsi** | Req: `{email, password}`<br>Res: `{token, user}` |
| `POST` | `/api/auth/google` | Login via Google OAuth2 | **Berfungsi** | Req: `{idToken}`<br>Res: `{token, user}` |
| `POST` | `/api/auth/logout` | Logout sesi pengguna | **Berfungsi** | Respon status HTTP 200 |
| `GET` | `/api/auth/me` | Mengambil profil user saat ini | **Berfungsi** | Header: `Bearer <token>`; Res: `{data: User}` |
| `GET` | `/api/models` | Mengambil daftar model ML yang tersedia | **Berfungsi** | Menghubungi Python `/models` atau fallback metadata |
| `GET` | `/api/devices` | Mengambil seluruh perangkat terdaftar | **Berfungsi** | Respon: `[{id, deviceCode, name, status, ...}]` |
| `POST` | `/api/devices` | Menambahkan perangkat wearable baru | **Berfungsi** | Req: `{deviceCode, name, firmwareVersion}` |
| `GET` | `/api/devices/:id` | Detail perangkat berdasarkan ID | **Berfungsi** | Respon: `{id, deviceCode, status, ...}` |
| `PUT` | `/api/devices/:id` | Memperbarui nama, status, atau baterai | **Berfungsi** | Req: `{name, status, batteryLevel, signalQuality}` |
| `DELETE`| `/api/devices/:id` | Menghapus perangkat dari database | **Berfungsi** | Respon HTTP 200 (jika tidak ada relasi aktif) |
| `GET` | `/api/sessions` | Mengambil daftar sesi milik user | **Berfungsi** | Query param: opsional; Res: `[{id, status, ...}]` |
| `POST` | `/api/sessions` | Membuat sesi baru dari web dashboard | **Berfungsi** | Req: `{deviceId, targetBand, participantName}` |
| `GET` | `/api/sessions/:id` | Mengambil detail metadata sesi | **Berfungsi (Ada IDOR)** | Respon: `{id, duration, status, targetBand, ...}` |
| `PUT` | `/api/sessions/:id` | Memperbarui catatan/judul sesi | **Berfungsi** | Req: `{participantName, title, notes}` |
| `POST` | `/api/sessions/:id/stop`| Menghentikan sesi dari web dashboard | **Berfungsi** | Menghitung durasi akhir dan set status `'completed'` |
| `GET` | `/api/sessions/:id/report`| Menghasilkan laporan analitik akademik | **Berfungsi** | Respon: statistik sinyal, dominant band, ML prediction |
| `GET` | `/api/eeg/:sessionId` | Mengambil histori sampel mentah EEG | **Terbatas (Limit 500)**| Query PostgreSQL dengan `LIMIT 500` sampel |
| `POST` | `/api/eeg/data` | Ingestion alternatif via user/device | **Berfungsi** | Req: `{sessionId, samples: [], features}` |
| `GET` | `/api/analysis/:sessionId`| Mengambil hasil inferensi ML sesi | **Berfungsi** | Respon: `{status, predictions: [], insights: []}` |
| `POST` | `/api/analysis/:sessionId/classify`| Menjalankan klasifikasi manual via ML | **Berfungsi** | Memanggil Python `POST /predict` dan persist ke DB |
| `GET` | `/api/dashboard/summary` | Ringkasan metrik untuk dashboard | **Berfungsi** | Menghitung agregasi device, sesi, dan band power |
| `POST` | `/api/v1/eeg/sessions/start`<br>`/v1/eeg/sessions/start` | Registrasi awal sesi oleh ESP32 | **Berfungsi** | Header: `X-Device-API-Key`<br>Req: `{session_id, device_id, target_band}` |
| `POST` | `/api/v1/eeg/samples`<br>`/v1/eeg/samples` | Pengiriman batch sampel biosinyal ESP32 | **Berfungsi** | Req: `{session_id, start_index, samples: [int16], band_power: {...}}` |
| `POST` | `/api/v1/eeg/sessions/finish`<br>`/v1/eeg/sessions/finish` | Terminasi sesi perekaman oleh ESP32 | **Perlu Penyempurnaan**| Req: `{session_id, duration_seconds, valid_packets, ...}` (metrik paket belum disimpan ke DB) |

---

## I. DAFTAR MASALAH BERDASARKAN PRIORITAS

### 1. CRITICAL (Harus Segera Ditangani)
1. **Otorisasi Data Sesi (IDOR)**: Endpoint `GET /api/sessions/:id`, `GET /api/sessions/:id/report`, dan `GET /api/eeg/:sessionId` tidak memverifikasi kepemilikan sesi terhadap `userID` pada token JWT. Siapapun yang login dapat mengakses seluruh data biometrik pengguna lain.
2. **CORS Origin Reflection**: Refleksi Origin bebas pada `backend/internal/middleware/cors.go` bersamaan dengan `Access-Control-Allow-Credentials: true` melanggar spesifikasi keamanan CORS dan mengekspos API terhadap serangan Cross-Origin Data Leakage.

### 2. HIGH (Mempengaruhi Kualitas Data & Fungsionalitas Inti)
1. **Limitasi Sampel Histori 500 Titik**: Query `GetEEGSamples` dibatasi `LIMIT 500`, sehingga pengguna tidak dapat melihat grafik lengkap untuk rekaman sesi berdurasi lebih dari 1 detik.
2. **WebSocket Broadcast Terdesimasi Ekstrem**: Fungsi `IngestDeviceBatch` hanya meneruskan 1 titik sampel per batch HTTP ke WebSocket, sehingga visualisasi live di frontend mengalami patah (*stutter*) jika tidak menggunakan simulator client.
3. **Skalabilitas Tabel Relasional Sampel**: Penyimpanan sampel 512 Hz ke tabel relasional tunggal tanpa partisi atau chunking akan menimbulkan masalah performa serius saat akumulasi data melampaui jutaan baris.

### 3. MEDIUM (Kesesuaian Spesifikasi & Konsistensi State)
1. **Penyimpanan Metrik Akhir Sesi Belum Lengkap**: Backend mengabaikan field `total_samples`, `valid_packets`, `invalid_packets`, dan `status` dari payload `sessions/finish` ESP32, serta belum memiliki kolom untuk `dropped_samples`.
2. **Ketiadaan Data Attention & Meditation**: ThinkGear ASIC menyediakan nilai Attention dan Meditation, namun DTO dan skema database backend belum memfasilitasi penyimpanan kedua metrik penting ini.
3. **Deteksi Status Perangkat Offline**: Belum ada mekanisme timeout berbasis waktu untuk mengubah status perangkat menjadi `disconnected` jika koneksi Wi-Fi ESP32 terputus secara tiba-tiba.

### 4. LOW (Peningkatan Kualitas Kode & UX)
1. **Silent Fallback Frontend Menyamarkan Kegagalan**: Mekanisme fallback otomatis ke mock data di frontend membuat pengembang sulit membedakan apakah aplikasi sedang membaca backend nyata atau data tiruan saat pengujian.
2. **Masa Berlaku Token JWT**: Token berumur 7 hari tanpa refresh token atau rotasi rahasia.

---

## J. REKOMENDASI URUTAN PENGERJAAN

1. **Tahap 1: Penguatan Keamanan & Otorisasi Backend**
   - Tambahkan validasi kepemilikan data: pastikan `ses.UserID == currentUserID` pada handler `GetByID`, `GetReport`, dan `GetEEGData`.
   - Perbaiki CORS middleware agar hanya mengizinkan origin terdaftar (`http://localhost:3000` atau domain resmi) saat kredensial diaktifkan.
2. **Tahap 2: Penyempurnaan Kontrak Ingestion IoT & Database**
   - Tambahkan field `dropped_samples`, `attention`, dan `meditation` pada DTO backend dan tabel database.
   - Perbarui handler `FinishDeviceSession` agar mencatat jumlah sampel valid, invalid, dan status terminasi nyata ke database.
   - Hapus `LIMIT 500` statis pada `GetEEGSamples` dan gantikan dengan query pagination atau desimasi waktu (*time-bucket downsampling*) untuk grafik web.
3. **Tahap 3: Implementasi Firmware ESP32 Dual-Core FreeRTOS**
   - Implementasikan arsitektur pipeline terpisah: Core 1 untuk akuisisi UART TGAM1 (Priority 10) + DSP Biquad + OLED, dan Core 0 untuk Network HTTP POST + Wi-Fi (Priority 2).
   - Terapkan FreeRTOS Queue 2048 item dan Staged Batch Retry Mechanism untuk meminimalkan drop data saat jitter Wi-Fi.
4. **Tahap 4: Penyesuaian Frontend WebSocket & Indikator Data Nyata**
   - Perbarui backend agar mem-broadcast paket sampel secara batch atau burst ke WebSocket.
   - Tambahkan indikator visual eksplisit pada frontend yang membedakan apakah data yang ditampilkan adalah data live dari hardware TGAM1, data database historis, atau data simulasi browser.

---

## K. DAFTAR FILE PENTING YANG PERLU DIPERIKSA LEBIH LANJUT

1. **Backend**:
   - [`backend/internal/eeg/handler.go`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/eeg/handler.go): Logika penyerapan sampel, broadcast WebSocket, dan konversi ADC $\mu\text{V}$.
   - [`backend/internal/sessions/handler.go`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/sessions/handler.go): Validasi otorisasi sesi dan pembuatan laporan analitik.
   - [`backend/internal/database/postgres.go`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/database/postgres.go): Query `SaveEEGSamples` dan `GetEEGSamples` (evaluasi `LIMIT 500`).
   - [`backend/internal/middleware/cors.go`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/internal/middleware/cors.go): Logika header CORS.
   - [`backend/models/models.go`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/backend/models/models.go): Definisi DTO payload hardware IoT.
2. **Frontend**:
   - [`frontend/src/hooks/useEEGStream.ts`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/hooks/useEEGStream.ts): Logika penerimaan WebSocket dan generator simulasi fallback.
   - [`frontend/src/services/session.service.ts`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/services/session.service.ts): Penanganan mock fallback pada detail sesi.
   - [`frontend/src/components/eeg/WaveformChart.tsx`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/frontend/src/components/eeg/WaveformChart.tsx): Rendering canvas real-time.
3. **Machine Learning Service**:
   - [`ml_service/app.py`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/ml_service/app.py): Pipeline inferensi FastAPI dan normalisasi fitur.
4. **Firmware**:
   - [`firmware/esp32_tgam1/esp32_tgam1.ino`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/firmware/esp32_tgam1/esp32_tgam1.ino): Implementasi parsing ThinkGear UART dan arsitektur pengiriman batch HTTP.

