/*
 * ======================================================================================
 * PROYEK RISET AKADEMIK: EEG WEARABLE IOT GATEWAY
 * Perangkat: ESP32 DevKit V1 + NeuroSky TGAM1 (R2.9 / R2.4A) + OLED SSD1306 + Push Button
 * Deskripsi: Gateway akuisisi biosinyal EEG real-time via UART ThinkGear, visualisasi OLED,
 *            dan transmisi telemetri Wi-Fi HTTP POST ke Go Backend Gateway.
 * 
 * CATATAN STATUS INTEGRASI HARDWARE:
 * [VERIFIKASI LAB DIPERLUKAN]
 * 1. Alamat I2C Layar OLED: Standar 0x3C (beberapa modul tiruan menggunakan 0x3D).
 * 2. Pull-up Tombol GPIO 18: Menggunakan internal INPUT_PULLUP (logika active-low).
 *    Jika kabel tombol panjang (>15cm), disarankan menambahkan resistor pull-up eksternal 10k ke 3V3.
 * 3. Kapasitor decoupling: Pasang kapasitor 100nF paralel 10uF di antara VCC dan GND TGAM1
 *    untuk meredam ripple switching catu daya ESP32 saat Wi-Fi transmit burst.
 * ======================================================================================
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ======================================================================================
// 1. KONFIGURASI JARINGAN, BACKEND, API KEY, DAN DEVICE ID
// ======================================================================================
const char* WIFI_SSID         = "LAB_EEG_WIFI";       // Ganti dengan SSID Wi-Fi lab/riset
const char* WIFI_PASSWORD     = "research_pass_2026"; // Ganti dengan sandi Wi-Fi
const char* BACKEND_BASE_URL  = "http://192.168.1.4:8080"; // Host Go Backend API Gateway
const char* DEVICE_ID         = "esp32-eeg-gateway-01";
const char* DEVICE_API_KEY    = "eeg-device-secret-key-academic-2026";

// Parameter buffer & transmisi
constexpr uint32_t MAX_SESSION_MS    = 2UL * 60UL * 60UL * 1000UL; // Maksimum sesi: 2 jam
constexpr uint32_t BATCH_INTERVAL_MS = 1000;                       // Interval kirim batch: 1 detik
constexpr size_t   MAX_BATCH_SAMPLES = 1024;                       // Kapasitas buffer sampel per batch (512 Hz ~ 512 sampel/detik)

// ======================================================================================
// 2. KONFIGURASI PIN DAN UART2 TGAM1
// ======================================================================================
constexpr int      TGAM_RX_PIN = 16;     // Terhubung ke Pin TXD Modul TGAM1
constexpr int      TGAM_TX_PIN = 17;     // Terhubung ke Pin RXD Modul TGAM1 (Konfigurasi/Opsional)
constexpr uint32_t TGAM_BAUD   = 57600;  // Default hardware baud rate NeuroSky TGAM1

HardwareSerial TGAMSerial(2);

// ======================================================================================
// 3. KONFIGURASI OLED I2C 128x64 (SSD1306)
// ======================================================================================
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define OLED_I2C_ADDR 0x3C // Perlu verifikasi hardware jika modul menggunakan 0x3D

constexpr int I2C_SDA_PIN = 21;
constexpr int I2C_SCL_PIN = 22;

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool oledAvailable = false;

// State mesin tampilan OLED UI
enum UIState {
  UI_BOOT,
  UI_READY,
  UI_LIVE,
  UI_SUMMARY,
  UI_ERROR
};

UIState currentUIState = UI_BOOT;

// ======================================================================================
// 4. KONFIGURASI TOMBOL START/STOP (GPIO 18)
// ======================================================================================
constexpr int BTN_START_STOP_PIN = 18; // Pushbutton ke GND dengan internal pull-up
constexpr uint32_t DEBOUNCE_DELAY_MS = 250;

uint32_t lastButtonPressTime = 0;
int lastButtonState = HIGH;

// ======================================================================================
// 5. STRUKTUR DATA EEG DAN BAND POWER
// ======================================================================================
struct TGAMEEGBandPower {
  uint32_t delta;      // 0.5 - 2.75 Hz
  uint32_t theta;      // 3.5 - 6.75 Hz
  uint32_t lowAlpha;   // 7.5 - 9.25 Hz
  uint32_t highAlpha;  // 10.0 - 11.75 Hz
  uint32_t lowBeta;    // 13.0 - 16.75 Hz
  uint32_t highBeta;   // 17.5 - 29.75 Hz
  uint32_t lowGamma;   // 31.0 - 39.75 Hz
  uint32_t midGamma;   // 41.0 - 49.75 Hz

  // Nilai agregasi 5 band standar klinis/penelitian
  uint32_t aggAlpha() const { return lowAlpha + highAlpha; }
  uint32_t aggBeta()  const { return lowBeta + highBeta; }
  uint32_t aggGamma() const { return lowGamma + midGamma; }
};

struct DeviceTelemetry {
  uint8_t signalQuality = 200; // 0 = sinyal sempurna, 200 = elektroda lepas (lead off)
  int16_t latestRaw = 0;       // Nilai mentah ADC 16-bit (-32768 s.d. 32767)
  float   latestMicrovolts = 0.0f; // Hasil konversi ke microvolt (uV)
  TGAMEEGBandPower bandPower;  // 8 sub-band ASIC power
  bool bandPowerUpdated = false;
};

DeviceTelemetry telemetry;

// Buffer penyimpan sampel Raw EEG per detik
int16_t sampleBuffer[MAX_BATCH_SAMPLES];
size_t  sampleCount = 0;

// Variabel status sesi
bool sessionActive   = false;
bool sessionError    = false;
String sessionId     = "";
uint32_t sessionStartedAt = 0;
uint32_t lastBatchAt      = 0;
uint32_t totalSamples     = 0;
uint32_t validPackets     = 0;
uint32_t invalidPackets   = 0;
uint32_t nextSampleIndex  = 0;

// Forward declarations
void startSession();
void finishSession(const char* reason);
bool sendBatch();
void updateOLED();

// ======================================================================================
// 6. THINKGEAR PACKET PARSER STATE MACHINE
// ======================================================================================
enum ParserState {
  WAIT_SYNC_1,
  WAIT_SYNC_2,
  READ_LENGTH,
  READ_PAYLOAD,
  READ_CHECKSUM
};

ParserState parserState = WAIT_SYNC_1;
uint8_t payloadLength   = 0;
uint8_t payloadIndex    = 0;
uint8_t payload[169];
uint8_t payloadSum      = 0;

void resetParser() {
  parserState   = WAIT_SYNC_1;
  payloadLength = 0;
  payloadIndex  = 0;
  payloadSum    = 0;
}

// Konversi nilai ADC mentah ke Microvolt (uV) sesuai spesifikasi NeuroSky TGAM1
// Formula: V = (RawADC * (1.8 V / 4096) / 2000) * 1,000,000 uV
inline float rawAdcToMicrovolts(int16_t raw) {
  return ((float)raw * (1.8f / 4096.0f) / 2000.0f) * 1000000.0f;
}

// ======================================================================================
// 7. PEMBACAAN RAW EEG DAN ASIC EEG POWER
// ======================================================================================
void onRawEEG(int16_t rawValue) {
  telemetry.latestRaw = rawValue;
  telemetry.latestMicrovolts = rawAdcToMicrovolts(rawValue);

  if (!sessionActive || sessionError) return;

  if (sampleCount < MAX_BATCH_SAMPLES) {
    sampleBuffer[sampleCount++] = rawValue;
    totalSamples++;
  } else {
    sessionError = true;
    Serial.println(F("[ERROR] Buffer Raw EEG meluap! Menghentikan sesi aktif."));
  }
}

void processPayload() {
  uint8_t i = 0;

  while (i < payloadLength) {
    uint8_t code = payload[i++];

    // Lewati byte perpanjangan parser (0x55)
    while (code == 0x55 && i < payloadLength) {
      code = payload[i++];
    }

    if (code >= 0x80) {
      // Kode multi-byte (Extended Code)
      if (i >= payloadLength) break;
      uint8_t valueLength = payload[i++];
      if (i + valueLength > payloadLength) break;

      if (code == 0x80 && valueLength == 2) {
        // 0x80: RAW Wave Value (16-bit 2's complement big-endian @ 512 Hz)
        int16_t rawValue = (int16_t)(((uint16_t)payload[i] << 8) | (uint16_t)payload[i + 1]);
        onRawEEG(rawValue);
      } else if (code == 0x83 && valueLength == 24) {
        // 0x83: ASIC EEG Power (8 sub-band, masing-masing 3 byte unsigned big-endian)
        auto parseBand = [&](uint8_t offset) -> uint32_t {
          return ((uint32_t)payload[offset] << 16) |
                 ((uint32_t)payload[offset + 1] << 8) |
                 ((uint32_t)payload[offset + 2]);
        };

        telemetry.bandPower.delta     = parseBand(i + 0);
        telemetry.bandPower.theta     = parseBand(i + 3);
        telemetry.bandPower.lowAlpha  = parseBand(i + 6);
        telemetry.bandPower.highAlpha = parseBand(i + 9);
        telemetry.bandPower.lowBeta   = parseBand(i + 12);
        telemetry.bandPower.highBeta  = parseBand(i + 15);
        telemetry.bandPower.lowGamma  = parseBand(i + 18);
        telemetry.bandPower.midGamma  = parseBand(i + 21);
        telemetry.bandPowerUpdated    = true;
      }

      i += valueLength;
    } else {
      // Kode nilai byte tunggal (Single-byte Code)
      if (i < payloadLength) {
        uint8_t val = payload[i++];
        if (code == 0x02) {
          // 0x02: Poor Signal Quality (0 = kontak sempurna; 200 = elektroda lepas)
          telemetry.signalQuality = val;
        }
      }
    }
  }
}

void readTGAM() {
  while (TGAMSerial.available() > 0) {
    uint8_t b = (uint8_t)TGAMSerial.read();

    switch (parserState) {
      case WAIT_SYNC_1:
        if (b == 0xAA) parserState = WAIT_SYNC_2;
        break;

      case WAIT_SYNC_2:
        parserState = (b == 0xAA) ? READ_LENGTH : WAIT_SYNC_1;
        break;

      case READ_LENGTH:
        if (b > 0 && b <= sizeof(payload)) {
          payloadLength = b;
          payloadIndex  = 0;
          payloadSum    = 0;
          parserState   = READ_PAYLOAD;
        } else {
          resetParser();
        }
        break;

      case READ_PAYLOAD:
        payload[payloadIndex++] = b;
        payloadSum += b;
        if (payloadIndex >= payloadLength) {
          parserState = READ_CHECKSUM;
        }
        break;

      case READ_CHECKSUM: {
        // Validasi Checksum ThinkGear: (~sum) & 0xFF
        uint8_t expected = 0xFF - payloadSum;
        if (b == expected) {
          validPackets++;
          processPayload();
        } else {
          invalidPackets++;
        }
        resetParser();
        break;
      }
    }
  }
}

// ======================================================================================
// 8. KONEKSI WI-FI DAN PENGIRIMAN DATA HTTP POST
// ======================================================================================
bool connectWiFi(uint32_t timeoutMs = 15000) {
  if (WiFi.status() == WL_CONNECTED) return true;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
    readTGAM();
    delay(10);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WIFI] Terhubung. IP ESP32: %s\n", WiFi.localIP().toString().c_str());
    return true;
  }

  Serial.println(F("[WIFI] Koneksi gagal (Timeout)."));
  return false;
}

bool postJson(const String& path, JsonDocument& doc) {
  if (!connectWiFi()) return false;

  HTTPClient http;
  String fullUrl = String(BACKEND_BASE_URL) + path;

  if (!http.begin(fullUrl)) {
    Serial.printf("[HTTP] Gagal inisialisasi koneksi ke: %s\n", fullUrl.c_str());
    return false;
  }

  http.setConnectTimeout(8000);
  http.setTimeout(12000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-API-Key", DEVICE_API_KEY);
  http.addHeader("X-Device-ID", DEVICE_ID);

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  bool success = (httpCode >= 200 && httpCode < 300);

  if (success) {
    Serial.printf("[HTTP POST OK] %s (Status: %d)\n", path.c_str(), httpCode);
  } else {
    Serial.printf("[HTTP POST FAIL] %s (Code: %d, Error: %s)\n",
                  path.c_str(), httpCode, http.errorToString(httpCode).c_str());
  }

  http.end();
  return success;
}

// ======================================================================================
// 9. PENGELOLAAN SESI START / STOP
// ======================================================================================
String makeSessionId() {
  char buf[64];
  snprintf(buf, sizeof(buf), "eeg-%08lx-%lu",
           (unsigned long)(ESP.getEfuseMac() & 0xFFFFFFFF),
           (unsigned long)millis());
  return String(buf);
}

bool registerSession() {
  JsonDocument doc;
  doc["session_id"]           = sessionId;
  doc["device_id"]            = DEVICE_ID;
  doc["max_duration_seconds"] = 7200;
  doc["format"]               = "thinkgear_raw_eeg";
  doc["sampling_rate_hz"]     = 512;
  doc["channel_count"]        = 1;
  doc["lead_location"]        = "FP1";
  doc["status"]               = "started";

  return postJson("/api/v1/eeg/sessions/start", doc);
}

void startSession() {
  if (sessionActive) {
    Serial.println(F("[SESI] Sesi sudah berjalan aktif."));
    return;
  }

  if (!connectWiFi()) {
    Serial.println(F("[SESI] Batal: Wi-Fi tidak terhubung."));
    currentUIState = UI_ERROR;
    updateOLED();
    return;
  }

  sessionId        = makeSessionId();
  sampleCount      = 0;
  totalSamples     = 0;
  validPackets     = 0;
  invalidPackets   = 0;
  nextSampleIndex  = 0;
  sessionError     = false;

  if (!registerSession()) {
    Serial.println(F("[SESI] Gagal mendaftarkan sesi ke Go Backend."));
    currentUIState = UI_ERROR;
    updateOLED();
    return;
  }

  sessionStartedAt = millis();
  lastBatchAt      = sessionStartedAt;
  sessionActive    = true;
  currentUIState   = UI_LIVE;

  Serial.println(F("========================================"));
  Serial.printf("[SESI DIMULAI] ID: %s\n", sessionId.c_str());
  Serial.println(F("Tekan tombol GPIO 18 atau kirim 'X' untuk menghentikan."));
  Serial.println(F("========================================"));
}

bool sendBatch() {
  if (sampleCount == 0) return true;

  JsonDocument doc;
  doc["session_id"]     = sessionId;
  doc["device_id"]      = DEVICE_ID;
  doc["start_index"]    = nextSampleIndex;
  doc["format"]         = "thinkgear_raw_eeg";
  doc["sample_count"]   = sampleCount;
  doc["signal_quality"] = telemetry.signalQuality;

  // Sertakan agregasi band power bila tersedia
  if (telemetry.bandPowerUpdated) {
    JsonObject bp = doc["band_power"].to<JsonObject>();
    bp["delta"] = telemetry.bandPower.delta;
    bp["theta"] = telemetry.bandPower.theta;
    bp["alpha"] = telemetry.bandPower.aggAlpha();
    bp["beta"]  = telemetry.bandPower.aggBeta();
    bp["gamma"] = telemetry.bandPower.aggGamma();
  }

  JsonArray samples = doc["samples"].to<JsonArray>();
  for (size_t i = 0; i < sampleCount; i++) {
    samples.add(sampleBuffer[i]);
  }

  if (!postJson("/api/v1/eeg/samples", doc)) {
    Serial.println(F("[BATCH] Gagal mengunggah batch sampel ke backend."));
    return false;
  }

  nextSampleIndex += sampleCount;
  Serial.printf("[BATCH TERKIRIM] %u sampel | Total: %lu\n",
                (unsigned int)sampleCount, (unsigned long)totalSamples);

  sampleCount = 0;
  telemetry.bandPowerUpdated = false;
  return true;
}

void finishSession(const char* reason) {
  if (!sessionActive) return;

  sessionActive = false;
  Serial.printf("[SESI BERAKHIR] Alasan: %s. Mengirim batch tersisa...\n", reason);

  bool batchOK = sendBatch();

  JsonDocument doc;
  doc["session_id"]       = sessionId;
  doc["device_id"]        = DEVICE_ID;
  doc["duration_seconds"] = (millis() - sessionStartedAt) / 1000;
  doc["total_samples"]    = totalSamples;
  doc["valid_packets"]    = validPackets;
  doc["invalid_packets"]  = invalidPackets;
  doc["status"]           = (batchOK && !sessionError) ? "completed" : "incomplete";
  doc["reason"]           = reason;

  bool finishOK = postJson("/api/v1/eeg/sessions/finish", doc);

  currentUIState = UI_SUMMARY;
  updateOLED();

  Serial.println(F("========== RINGKASAN AKHIR SESI =========="));
  Serial.printf("Session ID      : %s\n", sessionId.c_str());
  Serial.printf("Durasi          : %lu detik\n", (unsigned long)(millis() - sessionStartedAt) / 1000);
  Serial.printf("Total Sampel    : %lu\n", (unsigned long)totalSamples);
  Serial.printf("Paket Valid     : %lu\n", (unsigned long)validPackets);
  Serial.printf("Paket Invalid   : %lu\n", (unsigned long)invalidPackets);
  Serial.printf("Status Backend  : %s\n", finishOK ? "SUKSES" : "GAGAL");
  Serial.println(F("=========================================="));
}

// ======================================================================================
// 10. OLED UI (BOOT, READY, LIVE, SUMMARY)
// ======================================================================================
void renderBootScreen() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(F("NEUROPULSE EEG NODE"));
  display.drawFastHLine(0, 10, 128, SSD1306_WHITE);

  display.setCursor(0, 16);
  display.println(F("Inisialisasi Sistem:"));
  display.setCursor(0, 28);
  display.print(F("WiFi: "));
  display.println(WiFi.status() == WL_CONNECTED ? F("Connected") : F("Connecting..."));
  display.setCursor(0, 40);
  display.print(F("TGAM: "));
  display.println(F("UART2 @ 57600"));
  display.setCursor(0, 52);
  display.println(F("Tekan BTN18 utk Siap"));
  display.display();
}

void renderReadyScreen() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(F("EEG NODE: STANDBY"));
  display.drawFastHLine(0, 10, 128, SSD1306_WHITE);

  display.setCursor(0, 16);
  display.print(F("IP: "));
  display.println(WiFi.localIP().toString());

  display.setCursor(0, 28);
  display.print(F("Signal Q: "));
  if (telemetry.signalQuality == 0) {
    display.println(F("BAGUS (0)"));
  } else if (telemetry.signalQuality == 200) {
    display.println(F("LEPAS (200)"));
  } else {
    display.printf("%d\n", telemetry.signalQuality);
  }

  display.setCursor(0, 42);
  display.println(F("[TEKAN TOMBOL BTN18]"));
  display.setCursor(0, 53);
  display.println(F("Mulai Perekaman Sesi"));
  display.display();
}

void renderLiveScreen() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  
  // Header status
  display.setCursor(0, 0);
  display.print(F("REC: "));
  uint32_t sec = (millis() - sessionStartedAt) / 1000;
  display.printf("%02u:%02u", (unsigned int)(sec / 60), (unsigned int)(sec % 60));

  display.setCursor(72, 0);
  display.printf("SQ:%3d", telemetry.signalQuality);
  display.drawFastHLine(0, 9, 128, SSD1306_WHITE);

  // Data sinyal live
  display.setCursor(0, 14);
  display.printf("RawADC: %6d", telemetry.latestRaw);
  display.setCursor(0, 26);
  display.printf("Biopot: %6.1f uV", telemetry.latestMicrovolts);

  // Band Power Agregasi (Alpha / Beta)
  display.setCursor(0, 38);
  display.printf("A:%4lu  B:%4lu", 
                 (unsigned long)telemetry.bandPower.aggAlpha(), 
                 (unsigned long)telemetry.bandPower.aggBeta());

  // Indikator sampel dan instruksi stop
  display.setCursor(0, 51);
  display.printf("Sampel: %lu", (unsigned long)totalSamples);
  display.setCursor(86, 51);
  display.println(F("[STOP]"));

  display.display();
}

void renderSummaryScreen() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(F("SESI TELAH SELESAI"));
  display.drawFastHLine(0, 10, 128, SSD1306_WHITE);

  display.setCursor(0, 16);
  display.printf("Sampel : %lu", (unsigned long)totalSamples);
  display.setCursor(0, 28);
  display.printf("Valid  : %lu", (unsigned long)validPackets);
  display.setCursor(0, 40);
  display.printf("Invalid: %lu", (unsigned long)invalidPackets);

  display.setCursor(0, 53);
  display.println(F("Tekan BTN18: Standby"));
  display.display();
}

void updateOLED() {
  if (!oledAvailable) return;

  switch (currentUIState) {
    case UI_BOOT:    renderBootScreen();    break;
    case UI_READY:   renderReadyScreen();   break;
    case UI_LIVE:    renderLiveScreen();    break;
    case UI_SUMMARY: renderSummaryScreen(); break;
    case UI_ERROR:
      display.clearDisplay();
      display.setCursor(0, 10);
      display.println(F("ERROR SISTEM!"));
      display.setCursor(0, 26);
      display.println(F("Periksa Jaringan WiFi"));
      display.setCursor(0, 38);
      display.println(F("& Sambungan TGAM1"));
      display.display();
      break;
  }
}

// ======================================================================================
// 11. FUNGSI SETUP() DAN LOOP()
// ======================================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println(F("\n=============================================="));
  Serial.println(F(" EEG WEARABLE GATEWAY - ESP32 + TGAM1 R2.9 "));
  Serial.println(F("=============================================="));

  // Inisialisasi Tombol START/STOP
  pinMode(BTN_START_STOP_PIN, INPUT_PULLUP);

  // Inisialisasi Bus I2C & Layar OLED SSD1306
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDR)) {
    oledAvailable = true;
    display.clearDisplay();
    display.display();
    Serial.println(F("[OLED] Inisialisasi I2C SSD1306 128x64 Berhasil."));
  } else {
    Serial.println(F("[OLED] Gagal mendeteksi layar SSD1306 pada 0x3C! Mode headless aktif."));
  }

  // Tampilkan layar boot awal
  currentUIState = UI_BOOT;
  updateOLED();

  // Inisialisasi UART2 Hardware untuk TGAM1
  TGAMSerial.begin(TGAM_BAUD, SERIAL_8N1, TGAM_RX_PIN, TGAM_TX_PIN);
  Serial.printf("[UART2] Listening TGAM1 pada GPIO%d @ %u baud.\n", TGAM_RX_PIN, TGAM_BAUD);

  // Inisialisasi Wi-Fi
  connectWiFi();

  // Transisi ke mode Standby jika inisialisasi selesai
  currentUIState = UI_READY;
  updateOLED();

  Serial.println(F("\nSistem Siap Digunakan."));
  Serial.println(F("Kontrol:"));
  Serial.println(F(" - Tekan tombol GPIO 18 untuk Start/Stop"));
  Serial.println(F(" - Ketik 'S' pada Serial Monitor untuk Mulai Sesi"));
  Serial.println(F(" - Ketik 'X' pada Serial Monitor untuk Selesai Sesi"));
}

void loop() {
  // 1. Baca byte stream dari modul biosinyal TGAM1
  readTGAM();

  // 2. Baca interupsi tombol fisik GPIO 18 (dengan debouncing)
  int reading = digitalRead(BTN_START_STOP_PIN);
  if (reading == LOW && lastButtonState == HIGH) {
    if (millis() - lastButtonPressTime > DEBOUNCE_DELAY_MS) {
      lastButtonPressTime = millis();
      if (!sessionActive) {
        if (currentUIState == UI_SUMMARY) {
          currentUIState = UI_READY;
          updateOLED();
        } else {
          startSession();
        }
      } else {
        finishSession("button_pressed");
      }
    }
  }
  lastButtonState = reading;

  // 3. Tangani perintah manual melalui Serial Monitor
  while (Serial.available() > 0) {
    char cmd = (char)Serial.read();
    if (cmd == 'S' || cmd == 's') {
      startSession();
    } else if (cmd == 'X' || cmd == 'x') {
      finishSession("serial_command");
    }
  }

  // 4. Manajemen sesi rekaman aktif
  if (sessionActive) {
    uint32_t elapsed = millis() - sessionStartedAt;

    // Evaluasi durasi batas maksimum sesi (2 jam)
    if (elapsed >= MAX_SESSION_MS) {
      finishSession("max_duration_timeout");
      return;
    }

    // Evaluasi interval pengiriman batch sampel (setiap 1000 ms)
    if (millis() - lastBatchAt >= BATCH_INTERVAL_MS) {
      readTGAM(); // Kuras serial buffer sebelum operasi jaringan

      if (!sendBatch()) {
        sessionError = true;
        finishSession("http_upload_failed");
        return;
      }
      lastBatchAt = millis();
    }
  }

  // 5. Perbarui tampilan layar OLED secara berkala (setiap 200 ms)
  static uint32_t lastOledUpdate = 0;
  if (millis() - lastOledUpdate >= 200) {
    lastOledUpdate = millis();
    updateOLED();
  }

  delay(1);
}
