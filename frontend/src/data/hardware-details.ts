export interface PinoutItem {
  pin: string;
  connectedTo: string;
  name: string;
  func: string;
  signalType?: string;
}

export interface SpecItem {
  label: string;
  value: string;
  desc?: string;
}

export interface HardwareDetailData {
  id: "tgam1" | "esp32" | "electrodes";
  badge: string;
  title: string;
  subtitle: string;
  cardImage: string;
  cardDescription: string;
  overview: {
    heroImage: string;
    imageCaption: string;
    roleSummary: string;
    detailedDescription: string[];
    specs: SpecItem[];
    keyFeatures: { title: string; desc: string }[];
    signalChainSteps?: { stage: string; desc: string }[];
    voltageFormula?: {
      formula: string;
      explanation: string;
    };
  };
  pinout: {
    schematicImage: string;
    schematicCaption: string;
    circuitSummary: string;
    interfacePoints: { title: string; desc: string }[];
    pinoutTable: PinoutItem[];
    groundPowerNotice?: string;
    verificationNotes?: string[];
  };
  firmware: {
    title: string;
    summary: string;
    isFullFirmware?: boolean;
    code: string;
    codeFilename: string;
    architectureExplanation: { step: string; desc: string }[];
    bandProcessingExplanation?: { band: string; freq: string; formula: string }[];
    verificationItems?: string[];
  };
}

export const FULL_ESP32_FIRMWARE_INO = `/*
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
    Serial.printf("[WIFI] Terhubung. IP ESP32: %s\\n", WiFi.localIP().toString().c_str());
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
    Serial.printf("[HTTP] Gagal inisialisasi koneksi ke: %s\\n", fullUrl.c_str());
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
    Serial.printf("[HTTP POST OK] %s (Status: %d)\\n", path.c_str(), httpCode);
  } else {
    Serial.printf("[HTTP POST FAIL] %s (Code: %d, Error: %s)\\n",
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
  Serial.printf("[SESI DIMULAI] ID: %s\\n", sessionId.c_str());
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
  Serial.printf("[BATCH TERKIRIM] %u sampel | Total: %lu\\n",
                (unsigned int)sampleCount, (unsigned long)totalSamples);

  sampleCount = 0;
  telemetry.bandPowerUpdated = false;
  return true;
}

void finishSession(const char* reason) {
  if (!sessionActive) return;

  sessionActive = false;
  Serial.printf("[SESI BERAKHIR] Alasan: %s. Mengirim batch tersisa...\\n", reason);

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
  Serial.printf("Session ID      : %s\\n", sessionId.c_str());
  Serial.printf("Durasi          : %lu detik\\n", (unsigned long)(millis() - sessionStartedAt) / 1000);
  Serial.printf("Total Sampel    : %lu\\n", (unsigned long)totalSamples);
  Serial.printf("Paket Valid     : %lu\\n", (unsigned long)validPackets);
  Serial.printf("Paket Invalid   : %lu\\n", (unsigned long)invalidPackets);
  Serial.printf("Status Backend  : %s\\n", finishOK ? "SUKSES" : "GAGAL");
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
    display.printf("%d\\n", telemetry.signalQuality);
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

  Serial.println(F("\\n=============================================="));
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
  Serial.printf("[UART2] Listening TGAM1 pada GPIO%d @ %u baud.\\n", TGAM_RX_PIN, TGAM_BAUD);

  // Inisialisasi Wi-Fi
  connectWiFi();

  // Transisi ke mode Standby jika inisialisasi selesai
  currentUIState = UI_READY;
  updateOLED();

  Serial.println(F("\\nSistem Siap Digunakan."));
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
}`;

export const TGAM1_PARSER_FIRMWARE_SNIPPET = `// ======================================================================================
// THINKGEAR PROTOCOL PARSER & BAND POWER RECONSTRUCTION (C++ / ARDUINO)
// Modul: NeuroSky TGAM1 ASIC (57,600 Baud, 8-N-1, Output: 512 SPS Raw + 8 ASIC Bands)
// ======================================================================================

#define TGAM_SYNC_BYTE 0xAA

enum ParserState {
  WAIT_SYNC_1,
  WAIT_SYNC_2,
  READ_LENGTH,
  READ_PAYLOAD,
  READ_CHECKSUM
};

ParserState parserState = WAIT_SYNC_1;
uint8_t payloadLength = 0;
uint8_t payloadIndex  = 0;
uint8_t payload[169];
uint8_t payloadSum    = 0;

// Konversi nilai mentah 16-bit 2's complement ADC ke mikrovolt (uV)
// Formula resmi NeuroSky: V = (RawADC * (1.8 V / 4096) / 2000) * 1,000,000 uV
inline float rawAdcToMicrovolts(int16_t raw) {
  return ((float)raw * (1.8f / 4096.0f) / 2000.0f) * 1000000.0f;
}

// 8 Sub-Band ASIC TGAM1
struct TGAMBandPower {
  uint32_t delta;      // 0.5 - 2.75 Hz
  uint32_t theta;      // 3.5 - 6.75 Hz
  uint32_t lowAlpha;   // 7.5 - 9.25 Hz
  uint32_t highAlpha;  // 10.0 - 11.75 Hz
  uint32_t lowBeta;    // 13.0 - 16.75 Hz
  uint32_t highBeta;   // 17.5 - 29.75 Hz
  uint32_t lowGamma;   // 31.0 - 39.75 Hz
  uint32_t midGamma;   // 41.0 - 49.75 Hz

  // 5 Canonical EEG Bands yang digunakan untuk Machine Learning & Analisis
  uint32_t getDelta() const { return delta; }
  uint32_t getTheta() const { return theta; }
  uint32_t getAlpha() const { return lowAlpha + highAlpha; } // Penggabungan Alpha
  uint32_t getBeta()  const { return lowBeta + highBeta; }   // Penggabungan Beta
  uint32_t getGamma() const { return lowGamma + midGamma; }  // Penggabungan Gamma
} bandPower;

void processPayload() {
  uint8_t i = 0;
  while (i < payloadLength) {
    uint8_t code = payload[i++];

    // Lewati byte perpanjangan (0x55)
    while (code == 0x55 && i < payloadLength) {
      code = payload[i++];
    }

    if (code >= 0x80) {
      // Kode multi-byte
      if (i >= payloadLength) break;
      uint8_t valueLength = payload[i++];
      if (i + valueLength > payloadLength) break;

      if (code == 0x80 && valueLength == 2) {
        // [0x80] 16-bit Signed Raw Wave (512 Hz streaming)
        int16_t rawADC = (int16_t)(((uint16_t)payload[i] << 8) | (uint16_t)payload[i + 1]);
        float microvolts = rawAdcToMicrovolts(rawADC);
        onRawEEGReceived(rawADC, microvolts);
      } else if (code == 0x83 && valueLength == 24) {
        // [0x83] ASIC EEG Power (8 sub-band x 3 bytes unsigned big-endian)
        auto read3Bytes = [&](uint8_t offset) -> uint32_t {
          return ((uint32_t)payload[offset] << 16) |
                 ((uint32_t)payload[offset + 1] << 8) |
                 ((uint32_t)payload[offset + 2]);
        };
        bandPower.delta     = read3Bytes(i + 0);
        bandPower.theta     = read3Bytes(i + 3);
        bandPower.lowAlpha  = read3Bytes(i + 6);
        bandPower.highAlpha = read3Bytes(i + 9);
        bandPower.lowBeta   = read3Bytes(i + 12);
        bandPower.highBeta  = read3Bytes(i + 15);
        bandPower.lowGamma  = read3Bytes(i + 18);
        bandPower.midGamma  = read3Bytes(i + 21);
        onBandPowerUpdated(bandPower);
      }
      i += valueLength;
    } else {
      // Kode byte tunggal
      if (i < payloadLength) {
        uint8_t val = payload[i++];
        if (code == 0x02) {
          // [0x02] Poor Signal Quality (0 = kontak sempurna; 200 = lepas kontak)
          onSignalQualityChanged(val);
        }
      }
    }
  }
}

void readTGAMSerial(HardwareSerial &serialPort) {
  while (serialPort.available() > 0) {
    uint8_t b = (uint8_t)serialPort.read();
    switch (parserState) {
      case WAIT_SYNC_1:
        if (b == TGAM_SYNC_BYTE) parserState = WAIT_SYNC_2;
        break;
      case WAIT_SYNC_2:
        parserState = (b == TGAM_SYNC_BYTE) ? READ_LENGTH : WAIT_SYNC_1;
        break;
      case READ_LENGTH:
        if (b > 0 && b <= sizeof(payload)) {
          payloadLength = b;
          payloadIndex = 0;
          payloadSum = 0;
          parserState = READ_PAYLOAD;
        } else {
          parserState = WAIT_SYNC_1;
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
        uint8_t expectedChecksum = 0xFF - payloadSum;
        if (b == expectedChecksum) {
          processPayload();
        }
        parserState = WAIT_SYNC_1;
        break;
      }
    }
  }
}`;

export const ELECTRODES_FIRMWARE_SNIPPET = `// ======================================================================================
// TRANSDUKSI SINYAL ELEKTRODA SNAP (FP1, REF, GND) PADA FIRMWARE GATEWAY
// Catatan: Elektroda adalah transduser biopotensial pasif tanpa prosesor on-board.
// Seluruh akuisisi dilakukan melalui AFE diferensial TGAM1 dan diproses oleh ESP32.
// ======================================================================================

// Karakteristik & Kalibrasi Sinyal Biopotensial Elektroda Snap Tempel
struct ElectrodeSignalChannel {
  const char* activeLead       = "FP1 (Frontal Pole 1 - Dahi Anterior Kiri)";
  const char* referenceLead    = "REF (Mastoid Tulang Telinga / Dahi Lateral)";
  const char* groundLead       = "GND (Common Ground Kulit Netral)";
  float       adcVrefVolts     = 1.8f;      // Tegangan referensi ADC internal TGAM1
  float       adcResolution    = 4096.0f;   // 12-bit ADC Quantization Levels
  float       instrumentGain   = 2000.0f;   // Gain penguat diferensial analog
  uint32_t    samplingRateHz   = 512;       // Laju akuisisi sampel per detik
};

const ElectrodeSignalChannel electrodeConfig;

// Konversi nilai integer ADC mentah ke tegangan mikrovolt aktual di kulit
// Formula: V (uV) = [ (RawADC * (Vref / Resolution)) / Gain ] * 10^6
float convertRawAdcToMicrovolts(int16_t rawAdc) {
  float stepSizeVolts = electrodeConfig.adcVrefVolts / electrodeConfig.adcResolution;
  float inputSignalVolts = ((float)rawAdc * stepSizeVolts) / electrodeConfig.instrumentGain;
  return inputSignalVolts * 1000000.0f; // Konversi Volt ke Microvolt (uV)
}

// Penanganan Kualitas Kontak Elektroda (ThinkGear Code 0x02 Poor Signal Quality)
// Rentang nilai 0 (sempurna) hingga 200 (lepas / lead-off total)
struct ElectrodeContactStatus {
  uint8_t rawQualityCode;
  bool isLeadAttached;
  const char* description;
};

ElectrodeContactStatus evaluateElectrodeContact(uint8_t qualityCode) {
  ElectrodeContactStatus status;
  status.rawQualityCode = qualityCode;

  if (qualityCode == 0) {
    status.isLeadAttached = true;
    status.description = "Kontak Sempurna (Impedansi Rendah < 5 kOhm)";
  } else if (qualityCode < 50) {
    status.isLeadAttached = true;
    status.description = "Kontak Baik (Sinyal EEG Valid)";
  } else if (qualityCode < 100) {
    status.isLeadAttached = true;
    status.description = "Kontak Cukup (Terdapat Derau Ringan)";
  } else if (qualityCode < 200) {
    status.isLeadAttached = true;
    status.description = "Kontak Kurang (Impedansi Kontak Tinggi)";
  } else {
    // Nilai 200 menandakan elektroda tidak menempel pada kulit
    status.isLeadAttached = false;
    status.description = "LEAD-OFF: Elektroda Terlepas dari Kulit!";
  }

  return status;
}

// Callback saat sampel raw EEG 512 Hz diterima dari modul TGAM1
void onRawEEG(int16_t rawAdcValue) {
  float microvolts = convertRawAdcToMicrovolts(rawAdcValue);

  // Verifikasi rentang fisiologis normal gelombang EEG dahi (-200 uV s.d. +200 uV)
  // Sinyal di luar rentang ini biasanya merupakan artefak kedipan mata (EOG) atau gerak otot (EMG)
  bool isWithinPhysiologicalRange = (microvolts >= -350.0f && microvolts <= 350.0f);

  bufferSampleForBatch(rawAdcValue, microvolts, isWithinPhysiologicalRange);
}`;

export const HARDWARE_DETAILS: Record<"tgam1" | "esp32" | "electrodes", HardwareDetailData> = {
  tgam1: {
    id: "tgam1",
    badge: "TGAM1 ASIC R2.9 / R2.4A · 512 Hz",
    title: "Analog Front-End ASIC TGAM1",
    subtitle: "Preamplifier Biosinyal Diferensial, ADC 12-bit Terintegrasi, & Output ThinkGear UART 57,600 Baud",
    cardImage: "/images/tgam1_module.jpg",
    cardDescription:
      "Pemrosesan biosinyal diferensial dengan filter bandpass analog bawaan dan integrasi UART 57,600 Baud.",
    overview: {
      heroImage: "/images/tgam1_module.jpg",
      imageCaption: "Foto Aktual Modul NeuroSky TGAM1 (Board TGAM1_R2.4A / R2.9) dengan IC Biosensing ASIC, Filter Analog, dan Header Pin.",
      roleSummary:
        "Modul TGAM1 bertindak sebagai inti pemroses biosinyal analog (Analog Front-End) yang mengisolasi, menguatkan, menyaring interferensi jala-jala listrik PLN, dan mendigitalkan fluktuasi biopotensial mikrovolt gelombang otak manusia secara akurat sebelum diteruskan ke mikrokontroler telemetri.",
      detailedDescription: [
        "Modul NeuroSky TGAM1 mengintegrasikan seluruh rangkaian penguat biopotensial presisi tinggi ke dalam satu modul kompak berukuran 27.9 mm × 15.2 mm. Sinyal biopotensial dari dahi manusia memiliki amplitudo sangat rendah berkisar antara 0.5 µV hingga 100 µV yang sangat rentan terdistorsi oleh derau elektromagnetik lingkungan.",
        "Untuk mengatasi tantangan derau tersebut, TGAM1 dilengkapi Programmable Gain Amplifier (PGA) dengan gain instrumen 2000x, filter bandpass analog bawaan 0.5 Hz – 50 Hz (-3 dB), serta hardware notch filter 50 Hz / 60 Hz untuk menolak dengung listrik frekuensi jala-jala PLN tanpa membebani komputasi mikroprosesor eksternal.",
        "Konverter analog-ke-digital (ADC) 12-bit internal melakukan sampling sinyal secara kontinu pada laju 512 SPS (Samples Per Second). Data hasil konversi dipaketkan ke dalam protokol serial biner ThinkGear standar dan ditransmisikan keluar melalui pin TXD UART secara non-blocking pada kecepatan 57,600 baud (8-N-1).",
        "Keluaran data yang dimanfaatkan oleh sistem mencakup nilai mentah gelombang EEG (Raw Wave Data 16-bit 2's complement @ 512 Hz), status kualitas kontak elektroda (Poor Signal Quality 0–200), serta spektrum daya 8 sub-band ASIC EEG Power (Delta, Theta, Low/High Alpha, Low/High Beta, Low/Mid Gamma)."
      ],
      specs: [
        { label: "Arsitektur ASIC", value: "NeuroSky TGAM1 Core", desc: "Monolithic CMOS Biosensing ASIC" },
        { label: "Sampling Rate ADC", value: "512 SPS (Hz)", desc: "12-bit analog-to-digital converter" },
        { label: "Baud Rate Serial", value: "57,600 Baud", desc: "8 data bits, no parity, 1 stop bit (8-N-1)" },
        { label: "Penyaring Analog", value: "Bandpass 0.5–50 Hz", desc: "Notch 50 Hz / 60 Hz mains rejection" },
        { label: "Sensitivitas Tegangan", value: "0.5 µV – 100 µV", desc: "Tegangan referensi ADC internal 1.8V" },
        { label: "Penguatan (Gain)", value: "2000x", desc: "Low-noise differential instrument amplifier" },
        { label: "Tegangan Kerja", value: "2.7V – 3.6V DC", desc: "Nominal 3.3V DC ultra-low noise rail" },
        { label: "Konsumsi Arus", value: "~15 mA", desc: "Sangat efisien untuk perangkat wearable baterai" }
      ],
      keyFeatures: [
        {
          title: "Pemrosesan Analog Terintegrasi",
          desc: "Penguat diferensial dengan CMRR tinggi (>100 dB) membatalkan tegangan interferensi bersama yang ada di kulit kepala."
        },
        {
          title: "Hardware Notch Filter 50 Hz",
          desc: "Meredam dengung induksi elektromagnetik kabel listrik AC ruangan secara instan pada domain analog."
        },
        {
          title: "Komunikasi UART Non-Blocking",
          desc: "Mengirimkan frame data serial terstruktur dengan checksum deterministik ke host gateway tanpa jeda polling."
        },
        {
          title: "Pemantauan Kualitas Kontak Real-time",
          desc: "Memberikan feedback impedansi kontak elektroda (nilai 0–200) untuk mendeteksi lead-off secara seketika."
        }
      ],
      signalChainSteps: [
        { stage: "1. Biosensing Dahi (FP1)", desc: "Fluktuasi ionik mikrovolt (5–100 µV) ditangkap oleh elektroda snap aktif FP1 terhadap referensi REF." },
        { stage: "2. Preamplifier & Notch 50Hz", desc: "Sinyal diperkuat 2000x dan derau listrik 50Hz diredam oleh filter analog internal TGAM1." },
        { stage: "3. Digitalisasi ADC 512 SPS", desc: "ADC 12-bit mengonversi gelombang mikrovolt menjadi data kuantisasi biner 16-bit 2's complement." },
        { stage: "4. Framing ThinkGear UART", desc: "Paket serial ThinkGear dipancarkan via pin TXD pada 57600 baud menuju ESP32 GPIO 16 (RX2)." }
      ],
      voltageFormula: {
        formula: "Voltage (µV) = [ (RawADC × (1.8 V / 4096)) / 2000 ] × 10^6",
        explanation: "Nilai mentah 16-bit 2's complement dari kode 0x80 dikalikan dengan step kuantisasi ADC (1.8V / 4096), dibagi faktor penguatan analog 2000x, lalu dikalikan 1,000,000 untuk menghasilkan magnitudo biopotensial dalam satuan mikrovolt (µV)."
      }
    },
    pinout: {
      schematicImage: "/images/tgam1_pinout_schematic.png",
      schematicCaption: "Diagram Skematik & Tata Letak Pin Board NeuroSky TGAM1 (Header P1 Elektroda, Header P5 Komunikasi, Test Points TP1-TP12, IC U1 & U2).",
      circuitSummary:
        "Modul TGAM1 memiliki dua antarmuka header utama: Header P1 (5-pin) di sisi sensor biosinyal untuk elektroda biopotensial, dan Header P5 (4-pin) di sisi telemetri untuk catu daya 3.3V serta komunikasi data serial UART ke ESP32.",
      interfacePoints: [
        {
          title: "Jalur Komunikasi & Catu Daya (Header P5 ke ESP32)",
          desc: "Pin TXD TGAM1 dihubungkan ke GPIO 16 (RX2) ESP32 untuk transmisi data ThinkGear. Pin RXD terhubung ke GPIO 17 (TX2) ESP32. Pin VCC menerima 3.3V DC teregulasi dari ESP32, dan pin GND terhubung ke ground bersama."
        },
        {
          title: "Jalur Elektroda Biopotensial (Header P1)",
          desc: "Pin EEG menerima sinyal dari elektroda snap aktif FP1 di dahi anterior. Pin REF menerima sinyal dari elektroda snap referensi di mastoid/dahi. Pin GND terhubung ke elektroda snap ground penekan derau tubuh."
        },
        {
          title: "Pin Konfigurasi Mode (B & T)",
          desc: "Pad 'B' (Baud rate selector) dibiarkan open/floating agar modul beroperasi pada default 57,600 baud. Pad 'T' (Test mode) dibiarkan open untuk mode operasional normal biosinyal."
        }
      ],
      pinoutTable: [
        { pin: "Header P5 - Pin 1 (TXD)", connectedTo: "ESP32 GPIO 16 (RX2)", name: "UART Serial Out", func: "Mengirimkan frame biner protokol ThinkGear @ 57,600 Baud", signalType: "Digital Output" },
        { pin: "Header P5 - Pin 2 (RXD)", connectedTo: "ESP32 GPIO 17 (TX2)", name: "UART Serial In", func: "Jalur konfigurasi register modul ASIC (default standby / idle)", signalType: "Digital Input" },
        { pin: "Header P5 - Pin 3 (VCC)", connectedTo: "ESP32 3V3 Pin", name: "Catu Daya 3.3V", func: "Input tegangan teregulasi ultra-low noise 3.3V DC (arus ~15 mA)", signalType: "Power Input" },
        { pin: "Header P5 - Pin 4 (GND)", connectedTo: "ESP32 GND Pin", name: "System Ground", func: "Titik ground referensi bersama modul dan mikrokontroler", signalType: "Power Ground" },
        { pin: "Header P1 - Pin 1 (EEG)", connectedTo: "Lead Snap FP1", name: "Active Biosignal In", func: "Input elektroda snap aktif dahi anterior kiri FP1 (0.5–100 µV)", signalType: "Analog Input" },
        { pin: "Header P1 - Pin 2 (REF)", connectedTo: "Lead Snap REF", name: "Reference Biosignal", func: "Input elektroda snap referensi biopotensial (Mastoid/Dahi)", signalType: "Analog Ref" },
        { pin: "Header P1 - Pin 3 (GND)", connectedTo: "Lead Snap GND", name: "Common Body Ground", func: "Input elektroda snap ground kulit untuk meredam common-mode noise", signalType: "Analog Ground" },
        { pin: "Pad Konfigurasi 'B'", connectedTo: "Floating (Tidak Terhubung)", name: "Baud Select Strap", func: "Open = 57,600 Baud; Dihubungkan GND = 1,200 Baud (Default: Open)", signalType: "Configuration" },
        { pin: "Pad Konfigurasi 'T'", connectedTo: "Floating (Tidak Terhubung)", name: "Diagnostic Test Mode", func: "Open = Operasional Normal; Digunakan saat kalibrasi pabrik ASIC", signalType: "Configuration" }
      ],
      groundPowerNotice:
        "PENTING: Catu daya TGAM1 wajib bersumber dari rel 3.3V yang memiliki riak (ripple) sangat rendah (<10 mVpp). Jika regulator ESP32 menghasilkan derau akibat lonjakan transmisi Wi-Fi, wajib dipasang kapasitor decoupling 100 nF paralel 10 µF sedekat mungkin dengan pin VCC dan GND TGAM1.",
      verificationNotes: [
        "Verifikasi fisik kontinuitas solder header P1 dan P5 modul TGAM_R2.4A / R2.9 sebelum menghubungkan catu daya.",
        "Pastikan tegangan catu daya tidak melampaui 3.6V DC untuk mencegah kerusakan permanen pada IC ASIC U1."
      ]
    },
    firmware: {
      title: "ThinkGear Packet Parser & Band Power Aggregator",
      summary:
        "Algoritma finite state machine deterministik untuk mengurai frame serial ThinkGear 57,600 baud, memvalidasi checksum CRC, mengekstrak nilai Raw EEG 512 Hz, serta merekonstruksi 8 sub-band ASIC menjadi 5 band gelombang otak kanonikal (Delta, Theta, Alpha, Beta, Gamma).",
      code: TGAM1_PARSER_FIRMWARE_SNIPPET,
      codeFilename: "TGAM1_ThinkGear_Parser.cpp",
      architectureExplanation: [
        { step: "State Machine Byte Sinkronisasi", desc: "Mendeteksi dua byte header 0xAA 0xAA secara berurutan untuk menjamin penjajaran frame serial." },
        { step: "Validasi Panjang Payload", desc: "Membaca payloadLength (maks 169 byte). Jika panjang tidak valid, parser langsung reset ke WAIT_SYNC_1." },
        { step: "Kompilasi Checksum Deterministik", desc: "Menghitung expectedChecksum = 0xFF - payloadSum. Paket hanya diproses jika checksum cocok dengan byte verifikasi." },
        { step: "Ekstraksi Raw Wave 16-bit (0x80)", desc: "Membaca 2 byte signed integer big-endian pada frekuensi 512 Hz dan mengonversinya ke mikrovolt aktual." },
        { step: "Ekstraksi Poor Signal Quality (0x02)", desc: "Membaca tingkat impedansi kontak elektroda dari 0 (sempurna) hingga 200 (elektroda terlepas dari kulit)." },
        { step: "Ekstraksi ASIC EEG Power (0x83)", desc: "Membaca 24 byte yang berisi 8 sub-band ASIC (masing-masing 3 byte big-endian) lalu mengagregasikannya ke dalam 5 kelompok frekuensi." }
      ],
      bandProcessingExplanation: [
        { band: "Delta (δ)", freq: "0.5 – 2.75 Hz", formula: "Diambil langsung dari sub-band ASIC 1 (3 byte pertama)" },
        { band: "Theta (θ)", freq: "3.5 – 6.75 Hz", formula: "Diambil langsung dari sub-band ASIC 2 (3 byte kedua)" },
        { band: "Alpha (α)", freq: "7.5 – 11.75 Hz", formula: "Agregasi Low Alpha (7.5–9.25 Hz) + High Alpha (10.0–11.75 Hz)" },
        { band: "Beta (β)", freq: "13.0 – 29.75 Hz", formula: "Agregasi Low Beta (13.0–16.75 Hz) + High Beta (17.5–29.75 Hz)" },
        { band: "Gamma (γ)", freq: "31.0 – 49.75 Hz", formula: "Agregasi Low Gamma (31.0–39.75 Hz) + Mid Gamma (41.0–49.75 Hz)" }
      ],
      verificationItems: [
        "Verifikasi bahwa serial port ESP32 diinisialisasi dengan baud rate tepat 57600 (SERIAL_8N1).",
        "Penanganan byte perpanjangan parser 0x55 wajib disertakan agar sinkronisasi multi-byte ThinkGear tidak mengalami byte drift."
      ]
    }
  },
  esp32: {
    id: "esp32",
    badge: "ESP32 Wi-Fi Node Gateway",
    title: "Node Gateway Nirkabel ESP32",
    subtitle: "Mikrokontroler Xtensa Dual-Core 240MHz, Telemetri Wi-Fi HTTP POST, Layar OLED I2C 128x64, & Tombol Sesi Mandiri",
    cardImage: "/images/hardware_esp32_bench.jpg",
    cardDescription:
      "Mikrokontroler dual-core berdaya rendah mempaketkan data biner EEG ke cloud WebSocket secara instan.",
    overview: {
      heroImage: "/images/hardware_esp32_bench.jpg",
      imageCaption: "Unit ESP32 DevKit V1 pada Protoboard Laboratorium Terintegrasi dengan Bus I2C OLED SSD1306, Tombol START/STOP GPIO18, dan Header UART2 TGAM1.",
      roleSummary:
        "ESP32 DevKit V1 bertindak sebagai gateway telemetri IoT edge dan pengendali utama purwarupa. Mikrokontroler ini mengelola akuisisi serial TGAM1 secara real-time, menyajikan antarmuka visual OLED tanpa membutuhkan laptop, memproses interupsi tombol fisik, dan mentransmisikan batch sampel EEG terenkripsi ke backend via Wi-Fi.",
      detailedDescription: [
        "ESP32 ditenagai oleh prosesor Xtensa 32-bit dual-core LX6 berkecepatan 240 MHz dengan 520 KB SRAM internal. Keunggulan arsitektur dual-core ini memungkinkan pembagian beban kerja secara optimal: Core 1 menangani akuisisi biner serial UART2 TGAM1 berkecepatan tinggi tanpa kehilangan sampel, sedangkan Core 0 menangani protokol jaringan Wi-Fi 802.11 b/g/n dan antarmuka I2C OLED.",
        "Komunikasi UART antara ESP32 dan TGAM1 diimplementasikan menggunakan peripheral HardwareSerial(2) dengan pin GPIO 16 (RX2) dan GPIO 17 (TX2) pada baud rate 57,600. Firmware menguras buffer penerimaan (ring buffer) secara deterministik dan melakukan validasi integritas checksum sebelum memasukkan data ke buffer transmisi.",
        "Komunikasi nirkabel dengan backend Go API Gateway menggunakan protokol Wi-Fi Station Mode. Firmware mengumpulkan sampel Raw EEG dalam batch interval 1000 ms (sekitar 512 sampel/detik) dan mengirimkannya via HTTP POST JSON ke endpoint '/api/v1/eeg/samples' lengkap dengan header autentikasi X-Device-API-Key dan X-Device-ID.",
        "Layar OLED I2C 128×64 (SSD1306) memberikan visualisasi status komprehensif tanpa memerlukan sambungan Serial Monitor ke laptop. Terdapat 4 mode tampilan UI: BOOT (inisialisasi hardware & jaringan), READY (standby siap merekam & indikator kontak sinyal), LIVE (penghitung waktu sesi, Raw ADC, microvolt uV, band Alpha/Beta, dan jumlah sampel), serta SUMMARY (ringkasan total sampel dan validitas paket setelah sesi dihentikan).",
        "Tombol START/STOP pada GPIO 18 dengan internal pull-up dan software debouncing 250 ms memungkinkan subjek penelitian atau operator untuk memulai dan menyelesaikan sesi perekaman biosinyal secara mandiri hanya dengan satu sentuhan."
      ],
      specs: [
        { label: "Mikrokontroler", value: "ESP32 DevKit V1", desc: "Dual-Core Xtensa 32-bit LX6 @ 240 MHz" },
        { label: "Konektivitas Nirkabel", value: "Wi-Fi 802.11 b/g/n", desc: "Station mode terhubung ke router lab/hotspot" },
        { label: "Protokol Telemetri", value: "HTTP POST / REST", desc: "Batch JSON interval 1 detik berlatensi sub-20ms" },
        { label: "Antarmuka TGAM1", value: "HardwareSerial 2", desc: "GPIO 16 (RX2) & GPIO 17 (TX2) @ 57,600 baud" },
        { label: "Display Antarmuka", value: "OLED SSD1306 128×64", desc: "I2C Bus: GPIO 21 (SDA) & GPIO 22 (SCL) @ 0x3C" },
        { label: "Kendali Sesi Fisik", value: "Push Button GPIO 18", desc: "Active-low dengan internal pull-up & 250ms debounce" },
        { label: "Kapasitas Buffer Batch", value: "1024 Sampel Raw", desc: "Buffer memori internal SRAM aman dari overflow" },
        { label: "Batas Durasi Maksimum", value: "2 Jam / Sesi", desc: "Pengaman timeout otomatis untuk integritas riset" }
      ],
      keyFeatures: [
        {
          title: "Sistem Gateway Mandiri (Standalone)",
          desc: "Pengguna dapat mengoperasikan perangkat, memantau kontak sinyal di layar OLED, dan mengontrol sesi rekaman tanpa perlu terhubung kabel ke PC."
        },
        {
          title: "Batching Sampel Deterministik",
          desc: "Sampel 512 Hz dikelompokkan per 1000 ms sebelum dipancarkan melalui Wi-Fi, menghemat daya baterai dan meminimalkan overhead jaringan."
        },
        {
          title: "UI OLED Status 4 Tahap",
          desc: "Visualisasi dinamis BOOT, READY, LIVE (waktu, mikrovolt, band Alpha/Beta), dan SUMMARY memberikan transparansi operasional total."
        },
        {
          title: "Pemulihan & Validasi Sesi Terstruktur",
          desc: "Setiap sesi memiliki UUID unik (eeg-{mac}-{timestamp}) dan divalidasi ke backend dengan status completed atau incomplete."
        }
      ]
    },
    pinout: {
      schematicImage: "/images/skema_rangkaian_eeg.png",
      schematicCaption: "Skema Rangkaian Aktual Gateway ESP32: Hubungan Pin UART2 TGAM1 (GPIO 16/17), Bus I2C Layar OLED SSD1306 (GPIO 21/22), Tombol START/STOP (GPIO 18), dan Bus Catu Daya Bersama.",
      circuitSummary:
        "Rangkaian aktual menghubungkan ESP32 DevKit V1 dengan tiga periferal utama: modul biosinyal TGAM1 pada port serial UART2, display OLED 0.96 inci SSD1306 pada bus I2C, dan tombol tekan taktil pada GPIO 18. Seluruh periferal berbagi rel catu daya 3.3V dan rel ground bersama.",
      interfacePoints: [
        {
          title: "Jalur Port Serial TGAM1 (UART2)",
          desc: "Pin TXD TGAM1 dihubungkan ke GPIO 16 (RX2) ESP32. Pin RXD TGAM1 dihubungkan ke GPIO 17 (TX2) ESP32. Komunikasi berjalan pada 57,600 baud 8-N-1."
        },
        {
          title: "Jalur Bus I2C Layar OLED SSD1306 (128×64)",
          desc: "Pin SDA OLED dihubungkan ke GPIO 21 ESP32. Pin SCL OLED dihubungkan ke GPIO 22 ESP32. Alamat I2C terkonfigurasi ke 0x3C."
        },
        {
          title: "Jalur Input Tombol START/STOP",
          desc: "Salah satu kaki pushbutton dihubungkan ke GPIO 18 ESP32 dan kaki lainnya ke ground (GND). Menggunakan mode INPUT_PULLUP internal ESP32."
        },
        {
          title: "Rel Catu Daya 3.3V & Ground Bersama (Common Ground)",
          desc: "Pin 3V3 ESP32 menyuplai daya ke VCC TGAM1 dan VCC OLED. Pin GND seluruh modul disatukan dalam satu bus ground bersama untuk menjamin kesamaan level tegangan acuan."
        }
      ],
      pinoutTable: [
        { pin: "GPIO 16 (RX2)", connectedTo: "TGAM1 Header P5 Pin 1 (TXD)", name: "TGAM1 Data In", func: "Menerima byte stream protokol ThinkGear 57600 baud dari modul TGAM1", signalType: "Digital Input" },
        { pin: "GPIO 17 (TX2)", connectedTo: "TGAM1 Header P5 Pin 2 (RXD)", name: "TGAM1 Data Out", func: "Jalur transmisi UART ke TGAM1 untuk konfigurasi register/baud rate", signalType: "Digital Output" },
        { pin: "GPIO 21 (SDA)", connectedTo: "OLED Pin SDA", name: "I2C Serial Data", func: "Jalur data dua arah untuk rendering grafis dan teks layar status OLED", signalType: "I2C Data" },
        { pin: "GPIO 22 (SCL)", connectedTo: "OLED Pin SCL", name: "I2C Serial Clock", func: "Jalur sinyal detak sinkronisasi transfer data bus I2C (standar 400 kHz)", signalType: "I2C Clock" },
        { pin: "GPIO 18", connectedTo: "Push Button Terminal A", name: "Start/Stop Trigger", func: "Input kontrol sesi manual; kaki tombol lainnya ke GND (Active-Low)", signalType: "Digital In (Pull-up)" },
        { pin: "3V3 Pin", connectedTo: "VCC TGAM1 & VCC OLED", name: "Regulated 3.3V Rail", func: "Suplai daya teregulasi on-board LDO ESP32 untuk sensor dan display", signalType: "Power Output" },
        { pin: "GND Pin", connectedTo: "GND TGAM1, OLED, & Button", name: "Common System Ground", func: "Bus ground bersama titik acuan 0V sistem telemetri dan biosinyal", signalType: "Power Ground" }
      ],
      groundPowerNotice:
        "CATATAN TEKNIS PENTING CATU DAYA: Modul TGAM1 sangat sensitif terhadap lonjakan arus saat modul radio Wi-Fi ESP32 memancarkan paket RF (burst current hingga ~240 mA). Pasang kapasitor bypass/decoupling (100nF keramik + 10uF tantalum/elektrolit) tepat pada pin catu daya TGAM1 untuk mencegah noise catu daya bocor ke kanal biopotensial.",
      verificationNotes: [
        "[VERIFIKASI LAB 1] Alamat I2C Layar OLED: Default firmware menggunakan 0x3C. Sebagian modul display OLED 0.96 inci di pasaran dikonfigurasi ke 0x3D. Jalankan I2C scanner jika layar tidak menyala saat boot.",
        "[VERIFIKASI LAB 2] Tombol Fisik GPIO 18: Menggunakan internal INPUT_PULLUP (~45 kΩ). Jika kabel tombol panjang (>15 cm) dan melintas dekat antena Wi-Fi, disarankan memasang resistor pull-up eksternal 10 kΩ ke 3V3 untuk mencegah pemicuan palsu akibat interferensi gelombang radio.",
        "[VERIFIKASI LAB 3] Endpoint Backend: Pastikan alamat BACKEND_BASE_URL (http://192.168.1.4:8080) dapat dijangkau oleh ESP32 pada subnet Wi-Fi lokal yang sama."
      ]
    },
    firmware: {
      title: "Full Arduino Source Code (.INO) — ESP32 EEG Gateway",
      summary:
        "SOURCE CODE UTUH DAN LENGKAP firmware Arduino C++ (.ino) untuk ESP32 DevKit V1 tanpa pemotongan teks (...). Berisi seluruh 11 subsistem terintegrasi: konfigurasi jaringan & API, UART2 TGAM1, display I2C OLED SSD1306, tombol START/STOP GPIO18, struktur data band power, ThinkGear parser state machine, pembacaan raw 512Hz, pengiriman HTTP POST, pengelolaan sesi rekaman, antarmuka OLED UI, serta fungsi setup() dan loop().",
      isFullFirmware: true,
      code: FULL_ESP32_FIRMWARE_INO,
      codeFilename: "esp32_tgam1.ino",
      architectureExplanation: [
        { step: "1. Konfigurasi Jaringan & Kredensial", desc: "Konfigurasi SSID Wi-Fi, sandi, URL backend Go Gateway, Device ID, dan API Key otentikasi header." },
        { step: "2. Inisialisasi UART2 Hardware (GPIO 16/17)", desc: "Konfigurasi HardwareSerial(2) pada laju 57,600 baud 8-N-1 untuk membaca frame stream dari TGAM1." },
        { step: "3. Konfigurasi OLED I2C 128x64 (SSD1306)", desc: "Driver grafis Adafruit_SSD1306 pada pin SDA GPIO21 dan SCL GPIO22 dengan alamat 0x3C." },
        { step: "4. Input Tombol Fisik START/STOP (GPIO 18)", desc: "Pin digital INPUT_PULLUP dengan debounce timer 250 ms untuk memicu start/stop sesi tanpa komputer." },
        { step: "5. Struktur Data EEG & 8 Sub-Band", desc: "Penyimpan variabel biopotensial real-time, microvolt, dan agregasi 8 sub-band ASIC menjadi 5 band kanonikal." },
        { step: "6. ThinkGear Packet Parser", desc: "State machine 5-langkah (Sync 1, Sync 2, Length, Payload, Checksum) untuk menjamin validitas integritas data." },
        { step: "7. Ekstraksi Raw Wave & Power", desc: "Penguraian nilai kode 0x80 (Raw 16-bit 512 Hz), kode 0x02 (Signal Quality), dan kode 0x83 (ASIC EEG Power 24-byte)." },
        { step: "8. Transmisi HTTP POST Batching", desc: "Pengiriman batch sampel Raw EEG setiap interval 1000 ms via HTTP POST berformat JSON ke Go Backend." },
        { step: "9. Pengelolaan Siklus Sesi (Start/Finish)", desc: "Registrasi sesi baru ke '/api/v1/eeg/sessions/start' dan penutupan formal di '/api/v1/eeg/sessions/finish'." },
        { step: "10. OLED UI State Machine", desc: "Rendering antarmuka visual responsif: BOOT, READY, LIVE (timer, raw, uV, band power, count), dan SUMMARY sesi." },
        { step: "11. Eksekusi setup() dan loop()", desc: "Inisialisasi perangkat keras secara berurutan dan loop eksekusi non-blocking dengan delay presisi 1 ms." }
      ],
      verificationItems: [
        "Verifikasi alamat I2C layar OLED (0x3C vs 0x3D) dengan utilitas I2C Scanner jika layar tidak terdeteksi saat boot.",
        "Verifikasi ketahanan debouncing tombol GPIO 18 pada lingkungan elektromagnetik bising.",
        "Verifikasi konektivitas Wi-Fi dan router firewall terhadap port HTTP backend (port 8080)."
      ]
    }
  },
  electrodes: {
    id: "electrodes",
    badge: "3-Lead Snap FP1 + Ref/Gnd (Tempel)",
    title: "Konfigurasi 3 Elektroda EEG Snap",
    subtitle: "Desain 3 Kabel Kancing Snap Biomedis Tempel Langsung Murni Tanpa Headband dan Tanpa Earclip",
    cardImage: "/images/eeg_snap_leads.jpg",
    cardDescription:
      "Desain 3 kabel elektroda snap yang ditempel langsung (FP1 aktif, referensi, dan ground) murni dengan patch perekat tanpa klip maupun headband.",
    overview: {
      heroImage: "/images/eeg_snap_leads.jpg",
      imageCaption: "Foto Aktual Set 3 Kabel Lead Elektroda Snap Standar Biomedis dengan Ujung Kancing Snap Button Tempel Tanpa Headband Maupun Klip Penjepit Telinga.",
      roleSummary:
        "Sistem biosensing ini menggunakan konfigurasi minimalis tiga kabel elektroda kancing snap biokompatibel yang ditempelkan langsung ke kulit subjek menggunakan bantalan perekat konduktif (adhesive snap pads). Pendekatan ini murni bebas dari rangka headband yang kaku dan bebas dari penjepit telinga (earclip) tradisional yang sering menimbulkan rasa sakit pada pemakaian berulang.",
      detailedDescription: [
        "Dalam sistem penempatan elektroda internasional 10-20 (International 10-20 System), lokasi FP1 (Frontal Pole 1) terletak pada area dahi anterior kiri, sekitar 2.5 cm di atas lekukan alis mata. Posisi ini sangat ideal untuk menangkap aktivitas korteks prefrontal yang berkaitan erat dengan atensi, konsentrasi, kondisi relaksasi, dan beban kognitif.",
        "Rancangan purwarupa ini secara khusus meninggalkan penggunaan rangka headband elastis yang menekan tengkorak serta earclip pegas yang sering menimbulkan rasa nyeri dan iskemia lokal pada daun telinga. Sebagai gantinya, sistem menggunakan 3 kabel lead berujung kancing snap standar medis (3.5 mm / 4.0 mm) yang dipasangkan pada patch elektroda tempel Ag/AgCl hydrogel disposable atau silicone adhesive pad.",
        "Tiga elektroda tersebut memiliki peran fisiologis yang sangat spesifik: Elektroda Aktif (FP1) ditempelkan pada dahi anterior kiri; Elektroda Referensi (REF) ditempelkan pada tulang mastoid di belakang telinga (atau dahi lateral) sebagai acuan nol diferensial; dan Elektroda Ground (GND) ditempelkan pada permukaan kulit netral sebagai isolasi penekan derau derau bersama (Common Mode Rejection).",
        "Setiap kabel elektroda menggunakan konduktor kawat tembaga bebas oksigen berpelindung isolasi silikon medis fleksibel (shielded low-noise lead wire) yang meminimalkan interferensi gerak (motion artifact) dan induksi medan elektromagnetik frekuensi tinggi di lingkungan sekitar."
      ],
      specs: [
        { label: "Standar Posisi Anatomi", value: "International 10-20 (FP1)", desc: "Dahi anterior kiri (~2.5 cm atas alis)" },
        { label: "Jumlah Kanal & Lead", value: "1 Kanal Bipolar Diferensial (3 Lead)", desc: "1x Aktif (FP1), 1x Referensi (REF), 1x Ground (GND)" },
        { label: "Tipe Sambungan", value: "Standard Snap Button 3.5mm/4mm", desc: "Kancing snap kompatibel patch medis Ag/AgCl" },
        { label: "Metode Retensi Kepala", value: "100% Patch Tempel Adhesif", desc: "Murni tanpa headband dan tanpa klip telinga" },
        { label: "Impedansi Kontak Kulit", value: "< 5.0 kΩ (Target Riset)", desc: "Stabil dengan lapisan konduktif hydrogel" },
        { label: "Tipe Kabel Biosinyal", value: "Shielded Low-Noise Flexible Lead", desc: "Pelindung derau EMI dan motion artifact" },
        { label: "Bahan Kontak Sensor", value: "Perak/Klorida Perak (Ag/AgCl)", desc: "Potensial setengah-sel stabil dan biokompatibel" },
        { label: "Amplitudo Sinyal", value: "5 µV – 100 µV P-P", desc: "Sinyal biopotensial murni dari korteks prefrontal" }
      ],
      keyFeatures: [
        {
          title: "Kenyamanan Tanpa Tekanan Mekanis",
          desc: "Bebas dari rasa sakit akibat jepitan daun telinga atau tekanan lingkar kepala headband kaku, ideal untuk perekaman durasi panjang."
        },
        {
          title: "Impedansi Kontak Rendah & Stabil",
          desc: "Adhesive pad dengan gel elektrolit menjaga resistansi kontak kulit di bawah 5 kΩ sehingga sinyal tidak mudah melayang (baseline drift)."
        },
        {
          title: "Kabel Fleksibel Berperisai (Shielded)",
          desc: "Insulasi pelindung tembaga meredam kebocoran derau elektrostatik akibat gerakan kepala atau kabel yang bergoyang."
        },
        {
          title: "Penggantian Cepat & Higienis",
          desc: "Mekanisme kancing snap memudahkan penggantian bantalan perekat baru untuk setiap subjek penelitian dengan standar kebersihan biomedis."
        }
      ]
    },
    pinout: {
      schematicImage: "/images/tgam1_pinout_schematic.png",
      schematicCaption: "Skematik Sambungan 3 Lead Elektroda Snap (FP1, REF, GND) ke Header Sensor Biopotensial P1 Modul NeuroSky TGAM1.",
      circuitSummary:
        "Tiga kabel lead elektroda snap dihubungkan langsung ke header sensor P1 pada modul analog front-end TGAM1. Jalur ini menghantarkan biopotensial diferensial mikrovolt dari kulit subjek ke penguat instrumen internal TGAM1.",
      interfacePoints: [
        {
          title: "Jalur Lead Aktif FP1 (Header P1 Pin 1)",
          desc: "Membawa sinyal biopotensial dari dahi anterior kiri (FP1) ke terminal non-inverting penguat diferensial TGAM1."
        },
        {
          title: "Jalur Lead Referensi REF (Header P1 Pin 2)",
          desc: "Membawa tegangan pembanding referensi biologis dari mastoid (belakang telinga) ke terminal inverting penguat diferensial TGAM1."
        },
        {
          title: "Jalur Lead Ground GND (Header P1 Pin 3)",
          desc: "Membawa potensial ground kulit tubuh ke ground analog sensor TGAM1 untuk membuang tegangan mode bersama (common-mode noise)."
        },
        {
          title: "Konektor Kancing Snap & Kabel Berpelindung",
          desc: "Lead kancing snap terhubung kuat ke bantalan adhesif Ag/AgCl. Pelindung jalinan kawat (shield) kabel disatukan dengan ground sensor guna menangkal interferensi frekuensi radio."
        }
      ],
      pinoutTable: [
        { pin: "Lead FP1 (Kabel Aktif)", connectedTo: "TGAM1 Header P1 Pin 1 (EEG)", name: "Input Biopotensial Aktif", func: "Menangkap gelombang EEG prefrontal dahi anterior kiri (~5–100 µV)", signalType: "Analog Biosignal" },
        { pin: "Lead REF (Kabel Referensi)", connectedTo: "TGAM1 Header P1 Pin 2 (REF)", name: "Referensi Biopotensial Nol", func: "Titik acuan diferensial biologis di mastoid belakang telinga atau dahi", signalType: "Analog Reference" },
        { pin: "Lead GND (Kabel Ground)", connectedTo: "TGAM1 Header P1 Pin 3 (GND)", name: "Common Ground Kulit", func: "Menyerap dan membuang derau interferensi tubuh ke ground sensor", signalType: "Analog Ground" },
        { pin: "Snap Stud Connector", connectedTo: "Adhesive Patch Ag/AgCl", name: "Kancing Snap Standar 3.5mm", func: "Konektor mekanis pengunci elektroda perekat konduktif sekali pakai", signalType: "Mechanical Contact" },
        { pin: "Shield Wire (Jalinan)", connectedTo: "Ground Shield Sensor", name: "Pelindung Derau EMI", func: "Meredam kebisingan elektromagnetik lingkungan dan motion artifact", signalType: "Shielding Ground" }
      ],
      groundPowerNotice:
        "PENYIAPAN KULIT & IMPEDANSI: Sebelum menempelkan bantalan elektroda snap, bersihkan permukaan kulit dahi dan mastoid menggunakan alkohol swab 70% untuk menghilangkan minyak alami kulit dan sel mati. Hal ini krusial untuk menurunkan impedansi kontak kulit di bawah 5 kΩ demi rasio sinyal-terhadap-derau (SNR) yang optimal.",
      verificationNotes: [
        "Pastikan bantalan perekat snap melekat sempurna tanpa gelembung udara di antara gel konduktif dan kulit subjek.",
        "Pastikan tidak terjadi kontak listrik langsung antara lead FP1 dan lead REF untuk menghindari korsleting sinyal biopotensial."
      ]
    },
    firmware: {
      title: "Transduksi Biosinyal Elektroda & Evaluasi Kualitas Kontak (Firmware C++)",
      summary:
        "Elektroda bertindak sebagai transduser pasif tanpa prosesor on-board. Biopotensial mikrovolt yang ditangkap oleh elektroda snap dikuatkan oleh modul TGAM1, disampling 512 Hz oleh ADC, dan diproses oleh pipeline firmware ESP32. Firmware mengevaluasi kualitas kontak elektroda (kode 0x02) untuk mendeteksi kondisi lepas (lead-off) secara real-time.",
      code: ELECTRODES_FIRMWARE_SNIPPET,
      codeFilename: "Electrode_Signal_Interface.cpp",
      architectureExplanation: [
        { step: "Transduksi Biopotensial Pasif", desc: "Elektroda mengonversi arus ionik pada jaringan kulit menjadi arus elektronika mikrovolt tanpa memerlukan chip mikrokontroler di sisi elektroda." },
        { step: "Penguatan Diferensial Analog", desc: "Tegangan diferensial (V_FP1 - V_REF) dikuatkan 2000x oleh instrument amplifier TGAM1 dengan penolakan derau common-mode (CMRR > 100 dB)." },
        { step: "Formula Konversi Mikrovolt", desc: "Firmware gateway menghitung tegangan aktual di kulit: V(uV) = [ (RawADC × (1.8 V / 4096)) / 2000 ] × 10^6." },
        { step: "Deteksi Lead-Off Otomatis (0x02)", desc: "Firmware memantau byte kualitas kontak ThinkGear: nilai 0 menandakan impedansi sangat baik, sedangkan nilai 200 menandakan elektroda lepas total dari dahi." }
      ],
      bandProcessingExplanation: [
        { band: "Kualitas Kontak = 0", freq: "Sempurna", formula: "Kontak impedansi sangat rendah (< 5 kΩ), sinyal bersih siap untuk klasifikasi ML" },
        { band: "Kualitas Kontak 1–199", freq: "Derau Sedang", formula: "Terdapat sedikit resistansi atau artefak gerak; sistem memberi peringatan" },
        { band: "Kualitas Kontak = 200", freq: "Lead-Off (Lepas)", formula: "Satu atau lebih snap lead terlepas; sesi otomatis menandai paket tidak valid" }
      ],
      verificationItems: [
        "Verifikasi bahwa status kualitas sinyal 0x02 ditampilkan pada layar OLED ESP32 (SQ: 0 s.d. 200).",
        "Jika pembacaan raw bernilai saturasi (+32767 atau -32768), periksa apakah elektroda snap FP1 atau REF terlepas."
      ]
    }
  }
};

