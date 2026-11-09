#include <Arduino.h>
#include <HardwareSerial.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <math.h>
#include <string.h>
#include <time.h>

// =====================================================
// 1. USER CONFIGURATION
// =====================================================

// Isi sesuai jaringan Wi-Fi yang digunakan komputer/backend.
const char* WIFI_SSID = "Lexy's House";
const char* WIFI_PASSWORD = "*gaga1234_";

// IP komputer dari ipconfig: IPv4 Wi-Fi = 192.168.1.4
const char* BACKEND_BASE_URL = "http://192.168.1.4:8080";

// Samakan API key ini dengan DEVICE_API_KEY pada backend.
const char* DEVICE_API_KEY = "eeg-device-secret-key-academic-2026";
const char* DEVICE_ID = "esp32-eeg-gateway-01";

// Endpoint sesuai routes.go backend.
const char* STATUS_PATH = "/api/v1/eeg/device/status";
const char* SAMPLES_PATH = "/api/v1/eeg/samples";
const char* FINISH_PATH = "/api/v1/eeg/sessions/finish";

// =====================================================
// 2. HARDWARE CONFIGURATION
// =====================================================

constexpr int8_t OLED_SDA_PIN = 21;
constexpr int8_t OLED_SCL_PIN = 22;
constexpr uint8_t OLED_ADDRESS = 0x3C;
constexpr int8_t OLED_RESET = -1;
constexpr uint8_t SCREEN_WIDTH = 128;
constexpr uint8_t SCREEN_HEIGHT = 64;

Adafruit_SSD1306 display(
  SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET
);

constexpr int8_t TGAM_RX_PIN = 26;
constexpr int8_t TGAM_TX_PIN = 27;
constexpr uint32_t TGAM_BAUD = 57600;
HardwareSerial TGAM(2);

// Push button for manual Start/Stop and Results reset
constexpr int8_t BTN_START_STOP_PIN = 18;
constexpr uint32_t BTN_DEBOUNCE_MS = 250;
uint32_t lastBtnPressAt = 0;
int lastBtnState = HIGH;

// Nilai ini masih harus diverifikasi terhadap konfigurasi TGAM aktual.
constexpr float SAMPLE_RATE_HZ = 512.0f;

// =====================================================
// 3. SYSTEM / NETWORK CONFIGURATION
// =====================================================

constexpr bool SINGLE_ELECTRODE_TEST_MODE = true;

constexpr uint32_t SENSOR_TIMEOUT_MS = 2500;
constexpr uint32_t QUALITY_TIMEOUT_MS = 2500;
constexpr uint32_t POWER_TIMEOUT_MS = 2500;
constexpr uint32_t SERIAL_REPORT_MS = 1000;
constexpr uint32_t OLED_REFRESH_MS = 250;
constexpr uint32_t BOOT_MS = 2500;

constexpr uint32_t WIFI_RETRY_MS = 10000;
constexpr uint32_t STATUS_POLL_MS = 2500; // Polling status backend setiap 2-3 detik (2.5s) saat sesi aktif
constexpr uint32_t BATCH_SEND_INTERVAL_MS = 500;
constexpr uint32_t HTTP_TIMEOUT_MS = 1800;

// Batas keselamatan lokal. Website/backend tetap menjadi pengendali utama.
constexpr uint32_t SESSION_LIMIT_MS = 5UL * 60UL * 1000UL;

// Buffer menampung raw EEG int16. Batch dikirim bertahap.
constexpr uint16_t SAMPLE_BUFFER_CAPACITY = 512;
constexpr uint16_t SAMPLE_BATCH_SIZE = 128;

// =====================================================
// 4. SIGNAL PROCESSING CONFIGURATION
// =====================================================

constexpr uint8_t BAND_COUNT = 5;
constexpr uint8_t FILTER_COUNT = 8;
constexpr uint32_t PEAK_REFRACTORY_MS = 1000;
constexpr float PEAK_THRESHOLD_MULTIPLIER = 2.5f;
constexpr float RMS_ALPHA = 0.002f;
constexpr float MIN_PEAK_AMPLITUDE = 20.0f;

enum Stage : uint8_t { BOOT, READY, LIVE, STOPPING, RESULTS };
Stage stage = BOOT;

// Stage aliases for UI state naming
constexpr Stage UI_BOOT = BOOT;
constexpr Stage UI_READY = READY;
constexpr Stage UI_LIVE = LIVE;
constexpr Stage UI_STOPPING = STOPPING;
constexpr Stage UI_RESULTS = RESULTS;
constexpr Stage UI_SUMMARY = RESULTS;

uint32_t stageStart = 0;
uint32_t sessionStartAt = 0;
uint32_t sessionDurationMs = 0;
uint32_t lastSerialReportAt = 0;
uint32_t lastOLEDRefreshAt = 0;
uint32_t lastOLEDPageAt = 0;
uint8_t oledPage = 0;
bool showStartIntro = false;
uint32_t startIntroAt = 0;
int16_t waveformSamples[128] = {0};
uint8_t waveformWriteIndex = 0;

bool ntpStarted = false;
uint8_t finalQuality = 255;          // 255 = N/A
constexpr int16_t WAVE_RANGE = 512;  // skala tampilan waveform (ubah jika terlalu kecil/besar)

// Forward declarations
void updateOLED();
void drawStoppingScreen();
void enterResults(uint32_t now);
void triggerStop(const char *reason);
void sendFinishRequest(uint32_t now);
bool uploadOneBatch();

// =====================================================
// 5. NETWORK / BACKEND STATE
// =====================================================

bool wifiConnected = false;
bool backendReachable = false;
bool backendFinishConfirmed = false;
bool stopRequested = false;
bool finishRequestPending = false;
String stopReason = "website_stop";
uint8_t finishAttempts = 0;

uint32_t lastWiFiAttemptAt = 0;
uint32_t lastStatusPollAt = 0;
uint32_t lastBatchSendAt = 0;
uint32_t lastFinishAttemptAt = 0;

String activeSessionId = "";
String lastBackendMessage = "";

uint32_t uploadedSampleCount = 0;
uint32_t nextSampleIndex = 0;
uint32_t droppedSampleCount = 0;
uint32_t batchFailureCount = 0;

// Ring buffer for raw EEG samples.
int16_t sampleBuffer[SAMPLE_BUFFER_CAPACITY];
uint16_t sampleHead = 0;
uint16_t sampleTail = 0;
uint16_t sampleCount = 0;

// =====================================================
// 6. TGAM SENSOR STATE
// =====================================================

bool sensorConnected = false;
bool previousSensorConnected = false;

uint32_t lastValidPacketAt = 0;
uint32_t lastQualityAt = 0;
uint32_t lastRawPacketAt = 0;
uint32_t lastPowerPacketAt = 0;
uint32_t lastAttentionPacketAt = 0;
uint32_t lastMeditationPacketAt = 0;

uint8_t signalQuality = 200;
int16_t rawEEG = 0;
uint8_t attentionValue = 0;
uint8_t meditationValue = 0;

bool hasRawEEG = false;
bool hasBandPower = false;
bool hasAttention = false;
bool hasMeditation = false;

// =====================================================
// 7. DATA COUNTERS
// =====================================================

uint32_t rawPacketCount = 0;
uint32_t processedRawCount = 0;
uint32_t rejectedRawCount = 0;
uint32_t rawBoundaryCount = 0;
uint32_t validPacketCount = 0;
uint32_t invalidPacketCount = 0;

// =====================================================
// 8. EEG POWER DATA
// =====================================================

uint32_t eegPower[8] = {0};
uint8_t bandPercent[BAND_COUNT] = {0};

const char *const BAND_NAMES[BAND_COUNT] = {
  "DELTA", "THETA", "ALPHA", "BETA", "GAMMA"
};

// =====================================================
// 9. FILTER FREQUENCIES
// =====================================================

const float FILTER_LOW_HZ[FILTER_COUNT] = {
  0.5f, 3.5f, 7.5f, 10.0f, 13.0f, 18.0f, 31.0f, 41.0f
};

const float FILTER_HIGH_HZ[FILTER_COUNT] = {
  2.75f, 6.75f, 9.25f, 11.75f, 16.75f, 29.75f, 39.75f, 49.75f
};

struct BiquadBandPass {
  float b0 = 0, b1 = 0, b2 = 0;
  float a1 = 0, a2 = 0;
  float x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  void configure(float lowHz, float highHz, float sampleRate) {
    const float center = sqrtf(lowHz * highHz);
    const float bandwidth = highHz - lowHz;
    const float q = center / bandwidth;
    const float omega = 2.0f * PI * center / sampleRate;
    const float sn = sinf(omega);
    const float cs = cosf(omega);
    const float alpha = sn / (2.0f * q);
    const float a0 = 1.0f + alpha;

    b0 = alpha / a0;
    b1 = 0.0f;
    b2 = -alpha / a0;
    a1 = (-2.0f * cs) / a0;
    a2 = (1.0f - alpha) / a0;
    reset();
  }

  float process(float input) {
    const float output =
      b0 * input + b1 * x1 + b2 * x2 -
      a1 * y1 - a2 * y2;

    x2 = x1; x1 = input;
    y2 = y1; y1 = output;
    return output;
  }

  void reset() {
    x1 = x2 = y1 = y2 = 0.0f;
  }
};

BiquadBandPass bandFilters[FILTER_COUNT];
float filteredBands[BAND_COUNT] = {0};

// =====================================================
// 10. SESSION STATISTICS
// =====================================================

uint64_t sessionBandSum[BAND_COUNT] = {0};
uint32_t sessionPowerSamples = 0;
uint32_t sessionRawSamples = 0;
uint8_t averageBandPercent[BAND_COUNT] = {0};

float bandRms[BAND_COUNT] = {0};
float previousAbs[BAND_COUNT] = {0};
uint32_t bandPeakCount[BAND_COUNT] = {0};
uint32_t lastPeakAt[BAND_COUNT] = {0};

// =====================================================
// 11. THINKGEAR PARSER STATE
// =====================================================

uint8_t parserState = 0;
uint8_t payloadLength = 0;
uint8_t payloadIndex = 0;
uint8_t payloadChecksum = 0;
uint8_t payload[169];

// =====================================================
// 12. SENSOR FRESHNESS
// =====================================================

bool tgamIsFresh(uint32_t now) {
  return lastValidPacketAt != 0 &&
         (now - lastValidPacketAt) <= SENSOR_TIMEOUT_MS;
}

bool qualityDataIsFresh(uint32_t now) {
  return lastQualityAt != 0 &&
         (now - lastQualityAt) <= QUALITY_TIMEOUT_MS;
}

bool rawDataIsFresh(uint32_t now) {
  return hasRawEEG && lastRawPacketAt != 0 &&
         (now - lastRawPacketAt) <= SENSOR_TIMEOUT_MS;
}

bool powerDataIsFresh(uint32_t now) {
  return hasBandPower && lastPowerPacketAt != 0 &&
         (now - lastPowerPacketAt) <= POWER_TIMEOUT_MS;
}

bool attentionDataIsFresh(uint32_t now) {
  return hasAttention && lastAttentionPacketAt != 0 &&
         (now - lastAttentionPacketAt) <= SENSOR_TIMEOUT_MS;
}

bool meditationDataIsFresh(uint32_t now) {
  return hasMeditation && lastMeditationPacketAt != 0 &&
         (now - lastMeditationPacketAt) <= SENSOR_TIMEOUT_MS;
}

const char *qualityText() {
  if (!sensorConnected) return "DISCONNECTED";
  if (!qualityDataIsFresh(millis())) return "QUALITY STALE";
  if (signalQuality >= 200) return "NO SIGNAL";
  if (signalQuality == 0) return "QUALITY GOOD";
  return "QUALITY NOISY";
}

const char *processingModeText() {
  return SINGLE_ELECTRODE_TEST_MODE
    ? "EXPERIMENTAL / UNVALIDATED"
    : "QUALITY GATED";
}

// =====================================================
// 13. HTTP HELPERS
// =====================================================

String makeURL(const char *path) {
  String base(BACKEND_BASE_URL);
  while (base.endsWith("/")) base.remove(base.length() - 1);
  return base + path;
}

void addDeviceHeaders(HTTPClient &http) {
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-API-Key", DEVICE_API_KEY);
  http.addHeader("X-Device-ID", DEVICE_ID);
}

bool isConfigured() {
  return strlen(WIFI_SSID) > 0 &&
         strcmp(WIFI_SSID, "NAMA_WIFI_KAMU") != 0 &&
         strlen(DEVICE_API_KEY) > 0 &&
         strcmp(DEVICE_API_KEY, "ISI_DEVICE_API_KEY") != 0;
}

// =====================================================
// 14. WIFI MANAGEMENT
// =====================================================

void maintainWiFi(uint32_t now) {
  wifiConnected = (WiFi.status() == WL_CONNECTED);

  if (wifiConnected) return;
  if (now - lastWiFiAttemptAt < WIFI_RETRY_MS) return;

  lastWiFiAttemptAt = now;

  if (!isConfigured()) {
    Serial.println("[WIFI] Isi WIFI_SSID, WIFI_PASSWORD, dan DEVICE_API_KEY.");
    return;
  }

  Serial.println("[WIFI] Connecting...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// =====================================================
// 15. SAMPLE RING BUFFER
// =====================================================

bool enqueueSample(int16_t sample) {
  if (sampleCount >= SAMPLE_BUFFER_CAPACITY) {
    droppedSampleCount++;
    return false;
  }

  sampleBuffer[sampleHead] = sample;
  sampleHead = (sampleHead + 1) % SAMPLE_BUFFER_CAPACITY;
  sampleCount++;
  return true;
}

uint16_t copyPendingSamples(int16_t *destination, uint16_t maxCount) {
  uint16_t n = sampleCount < maxCount ? sampleCount : maxCount;
  uint16_t index = sampleTail;

  for (uint16_t i = 0; i < n; i++) {
    destination[i] = sampleBuffer[index];
    index = (index + 1) % SAMPLE_BUFFER_CAPACITY;
  }
  return n;
}

void removeUploadedSamples(uint16_t count) {
  if (count > sampleCount) count = sampleCount;
  sampleTail = (sampleTail + count) % SAMPLE_BUFFER_CAPACITY;
  sampleCount -= count;
}

// =====================================================
// 16. SESSION RESET / START / FINISH
// =====================================================

void resetSensorData() {
  hasRawEEG = false;
  hasBandPower = false;
  hasAttention = false;
  hasMeditation = false;

  signalQuality = 200;
  rawEEG = 0;
  attentionValue = 0;
  meditationValue = 0;

  lastQualityAt = 0;
  lastRawPacketAt = 0;
  lastPowerPacketAt = 0;
  lastAttentionPacketAt = 0;
  lastMeditationPacketAt = 0;

  memset(eegPower, 0, sizeof(eegPower));
  memset(bandPercent, 0, sizeof(bandPercent));

  for (uint8_t i = 0; i < FILTER_COUNT; i++) bandFilters[i].reset();
  memset(filteredBands, 0, sizeof(filteredBands));

  for (uint8_t i = 0; i < BAND_COUNT; i++) {
    bandRms[i] = 0;
    previousAbs[i] = 0;
  }
}

void resetSessionData() {
  memset(sessionBandSum, 0, sizeof(sessionBandSum));
  memset(averageBandPercent, 0, sizeof(averageBandPercent));
  memset(bandPeakCount, 0, sizeof(bandPeakCount));
  memset(lastPeakAt, 0, sizeof(lastPeakAt));
  memset(bandRms, 0, sizeof(bandRms));
  memset(previousAbs, 0, sizeof(previousAbs));

  sessionPowerSamples = 0;
  sessionRawSamples = 0;
  sessionDurationMs = 0;

  sampleHead = sampleTail = sampleCount = 0;
  uploadedSampleCount = 0;
  nextSampleIndex = 0;
  droppedSampleCount = 0;
  batchFailureCount = 0;

  validPacketCount = 0;
  invalidPacketCount = 0;
  backendFinishConfirmed = false;
  stopRequested = false;
  finishRequestPending = false;
}

void startSession(const String &backendSessionId, uint32_t now) {
  if (backendSessionId.length() == 0) {
    Serial.println("[SESSION] Refusing START: backend session_id is empty.");
    return;
  }

  if (stage == LIVE && activeSessionId == backendSessionId) return;
  if (stage == STOPPING) {
    Serial.println("[SESSION] Refusing START: currently stopping previous session.");
    return;
  }

  resetSessionData();

  for (uint8_t i = 0; i < FILTER_COUNT; i++) bandFilters[i].reset();
  memset(filteredBands, 0, sizeof(filteredBands));

  activeSessionId = backendSessionId;
  sessionStartAt = now;
  stageStart = now;
  stage = LIVE;
  showStartIntro = true;
  startIntroAt = now;
  oledPage = 0;
  lastOLEDPageAt = now;

  Serial.println();
  Serial.println("================================");
  Serial.println("[SESSION] START received from backend");
  Serial.print("[SESSION] ID: ");
  Serial.println(activeSessionId);
  Serial.println("[SESSION] SOURCE: TGAM R2.9A");
  Serial.println("[SESSION] MODE: EXPERIMENTAL");
  Serial.println("================================");
}

void triggerStop(const char *reason) {
  if (stage != LIVE && stage != STOPPING) return;
  if (stopRequested && stage == STOPPING) return;

  stopRequested = true;
  finishRequestPending = true;
  stopReason = (reason && strlen(reason) > 0) ? reason : "website_stop";
  stage = STOPPING;
  stageStart = millis();

  Serial.printf("[SESSION] STOP triggered: reason=%s session=%s\n",
                stopReason.c_str(), activeSessionId.c_str());
  updateOLED();
}

void calculateSessionAverages() {
  if (sessionPowerSamples == 0) return;

  for (uint8_t i = 0; i < BAND_COUNT; i++) {
    averageBandPercent[i] =
      (uint8_t)(sessionBandSum[i] / sessionPowerSamples);
  }
}

void enterResults(uint32_t now) {
  sessionDurationMs = now - sessionStartAt;
  finalQuality = qualityDataIsFresh(now) ? signalQuality : 255;
  calculateSessionAverages();
  stage = RESULTS;
  stageStart = now;
  oledPage = 0;
  lastOLEDPageAt = now;

  if (backendFinishConfirmed) {
    Serial.println("[SESSION] Backend confirmed finish.");
    Serial.println("[SESSION] RESULTS - backend finish confirmed.");
  } else {
    Serial.println("[SESSION] Backend finish failed or incomplete.");
    Serial.println("[SESSION] RESULTS - incomplete/error status.");
  }
  Serial.print("[RESULT] duration_ms=");
  Serial.println(sessionDurationMs);
  Serial.print("[RESULT] uploaded_samples=");
  Serial.println(uploadedSampleCount);
  Serial.print("[RESULT] dropped_samples=");
  Serial.println(droppedSampleCount);

  for (uint8_t i = 0; i < BAND_COUNT; i++) {
    Serial.print(BAND_NAMES[i]);
    Serial.print(" average=");
    if (sessionPowerSamples) {
      Serial.print(averageBandPercent[i]);
      Serial.print('%');
    } else {
      Serial.print("N/A");
    }
    Serial.print(" | peaks=");
    Serial.println(bandPeakCount[i]);
  }
}

// =====================================================
// 17. BACKEND STATUS POLLING
// =====================================================

void pollBackendStatus(uint32_t now) {
  if (!wifiConnected || !isConfigured()) return;
  if (now - lastStatusPollAt < STATUS_POLL_MS) return;
  // Polling hanya diizinkan pada stage READY (mencari START) atau LIVE (mencari STOP)
  if (stage != LIVE && stage != READY) return;

  lastStatusPollAt = now;

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);

  String url = makeURL(STATUS_PATH);
  if (!http.begin(url)) {
    backendReachable = false;
    Serial.println("[HTTP] Cannot initialize status request.");
    return;
  }

  addDeviceHeaders(http);
  if (activeSessionId.length() > 0) {
    http.addHeader("X-Current-Session-ID", activeSessionId);
  }
  if (qualityDataIsFresh(now)) {
    http.addHeader("X-Signal-Quality", String(signalQuality));
  }

  int code = http.GET();

  if (code <= 0) {
    backendReachable = false;
    Serial.printf("[HTTP] Status request failed: %s\n",
                  http.errorToString(code).c_str());
    http.end();
    return;
  }

  String response = http.getString();
  http.end();

  if (code < 200 || code >= 300) {
    backendReachable = false;
    Serial.printf("[HTTP] Status HTTP %d: %s\n", code, response.c_str());
    return;
  }

  StaticJsonDocument<1024> doc;
  DeserializationError err = deserializeJson(doc, response);

  if (err) {
    backendReachable = false;
    Serial.printf("[JSON] Status parse error: %s\n", err.c_str());
    return;
  }

  if (!doc["success"].as<bool>()) {
    backendReachable = false;
    Serial.println("[BACKEND] Status response success=false.");
    return;
  }

  backendReachable = true;

  JsonObject data = doc["data"].as<JsonObject>();
  const char *commandRaw = data["command"] | "IDLE";
  const char *sessionRaw = data["session_id"] | "";
  String command(commandRaw);
  String backendSessionId(sessionRaw);

  if (command == "START") {
    if (backendSessionId.length() == 0) {
      Serial.println("[BACKEND] START received without session_id.");
      return;
    }

    if (stage != LIVE && stage != STOPPING) {
      if (!sensorConnected) {
        Serial.println("[SESSION] START received, waiting for TGAM connection.");
        return;
      }
      startSession(backendSessionId, now);
    } else if (activeSessionId != backendSessionId) {
      Serial.println("[BACKEND] Different active session received; not switching mid-session.");
    }
  }
  else if (command == "STOP") {
    if (stage == LIVE) {
      if (backendSessionId.length() == 0 || backendSessionId == activeSessionId) {
        Serial.printf("[SESSION] STOP received from backend for session '%s'. Flushing samples...\n", activeSessionId.c_str());
        triggerStop("website_stop");
      } else {
        Serial.printf("[SESSION] Ignoring STOP for mismatched session: got '%s', active '%s'\n",
                      backendSessionId.c_str(), activeSessionId.c_str());
      }
    }
  }
  else if (command == "IDLE") {
    if (stage == READY) {
      // Normal idle state. No automatic session start.
    }
  }
}

// =====================================================
// 18. RAW SAMPLE UPLOAD
// =====================================================

bool uploadOneBatch() {
  if (!wifiConnected || !backendReachable) return false;
  if (activeSessionId.length() == 0 || sampleCount == 0) return false;

  int16_t batch[SAMPLE_BATCH_SIZE];
  uint16_t n = copyPendingSamples(batch, SAMPLE_BATCH_SIZE);
  if (n == 0) return false;

  StaticJsonDocument<4096> doc;
  doc["session_id"] = activeSessionId;
  doc["device_id"] = DEVICE_ID;
  doc["start_index"] = nextSampleIndex;
  doc["format"] = "raw_eeg";
  doc["sample_count"] = n;

  if (qualityDataIsFresh(millis())) {
    doc["signal_quality"] = signalQuality;
  }

  JsonArray samples = doc.createNestedArray("samples");
  for (uint16_t i = 0; i < n; i++) {
    samples.add(batch[i]);
  }

  // Kirim band power ASIC TGAM yang benar-benar diterima.
  // Jangan kirim persentase hasil normalisasi sebagai band_power.
  if (powerDataIsFresh(millis())) {
    JsonObject power = doc.createNestedObject("band_power");
    power["delta"] = eegPower[0];
    power["theta"] = eegPower[1];
    power["low_alpha"] = eegPower[2];
    power["high_alpha"] = eegPower[3];
    power["low_beta"] = eegPower[4];
    power["high_beta"] = eegPower[5];
    power["low_gamma"] = eegPower[6];
    power["mid_gamma"] = eegPower[7];
  }

  String body;
  serializeJson(doc, body);

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(makeURL(SAMPLES_PATH))) return false;

  addDeviceHeaders(http);
  int code = http.POST(body);
  String response = code > 0 ? http.getString() : "";
  http.end();

  if (code < 200 || code >= 300) {
    batchFailureCount++;
    Serial.printf("[UPLOAD] Batch failed HTTP=%d pending=%u response=%s\n",
                  code, sampleCount, response.c_str());
    return false;
  }

  StaticJsonDocument<1024> result;
  if (deserializeJson(result, response) != DeserializationError::Ok ||
      !result["success"].as<bool>()) {
    batchFailureCount++;
    Serial.println("[UPLOAD] Backend response invalid or success=false. Buffer retained.");
    return false;
  }

  // Hanya hapus sampel setelah backend mengonfirmasi HTTP 2xx + success=true.
  removeUploadedSamples(n);
  nextSampleIndex += n;
  uploadedSampleCount += n;

  Serial.printf("[UPLOAD] Success: %u samples, start_index=%lu, pending=%u\n",
                n, (unsigned long)(nextSampleIndex - n), sampleCount);
  return true;
}

// =====================================================
// 19. BACKEND FINISH
// =====================================================

void sendFinishRequest(uint32_t now) {
  if (!finishRequestPending || !stopRequested) return;
  if ((stage != LIVE && stage != STOPPING) || activeSessionId.length() == 0) return;
  if (sampleCount > 0) return; // Semua batch harus terunggah dulu
  if (now - lastFinishAttemptAt < 1000) return;

  lastFinishAttemptAt = now;

  if (!wifiConnected || !backendReachable) {
    finishAttempts++;
    Serial.printf("[FINISH] Network offline (attempt %u/3)...\n", finishAttempts);
    if (finishAttempts >= 3 || (now - stageStart >= 8000)) {
      Serial.println("[FINISH] Network unreachable timeout. Moving to RESULTS with incomplete status.");
      finishAttempts = 0;
      backendFinishConfirmed = false;
      finishRequestPending = false;
      enterResults(now);
    }
    return;
  }

  uint32_t durationSeconds = (now - sessionStartAt) / 1000UL;

  StaticJsonDocument<768> doc;
  doc["session_id"] = activeSessionId;
  doc["device_id"] = DEVICE_ID;
  doc["duration_seconds"] = durationSeconds;
  doc["total_samples"] = uploadedSampleCount;
  doc["valid_packets"] = validPacketCount;
  doc["invalid_packets"] = invalidPacketCount;
  doc["status"] = "completed";
  doc["reason"] = stopReason;

  String body;
  serializeJson(doc, body);

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(makeURL(FINISH_PATH))) {
    finishAttempts++;
    if (finishAttempts >= 3) {
      Serial.println("[FINISH] Failed to begin HTTP request after 3 attempts. Finalizing with incomplete status.");
      finishAttempts = 0;
      backendFinishConfirmed = false;
      finishRequestPending = false;
      enterResults(now);
    }
    return;
  }

  addDeviceHeaders(http);
  int code = http.POST(body);
  String response = code > 0 ? http.getString() : "";
  http.end();

  if (code < 200 || code >= 300) {
    finishAttempts++;
    Serial.printf("[FINISH] Failed HTTP=%d (attempt %u/3): %s\n", code, finishAttempts, response.c_str());
    if (finishAttempts >= 3) {
      Serial.println("[FINISH] Max attempts reached. Finalizing with incomplete status.");
      finishAttempts = 0;
      backendFinishConfirmed = false;
      finishRequestPending = false;
      enterResults(now);
    }
    return;
  }

  StaticJsonDocument<1024> result;
  if (deserializeJson(result, response) != DeserializationError::Ok ||
      !result["success"].as<bool>()) {
    finishAttempts++;
    Serial.printf("[FINISH] Response not confirmed (attempt %u/3). Body=%s\n", finishAttempts, response.c_str());
    if (finishAttempts >= 3) {
      Serial.println("[FINISH] Max attempts reached. Finalizing with incomplete status.");
      finishAttempts = 0;
      backendFinishConfirmed = false;
      finishRequestPending = false;
      enterResults(now);
    }
    return;
  }

  backendFinishConfirmed = true;
  finishRequestPending = false;
  finishAttempts = 0;
  enterResults(now);
}

// =====================================================
// 20. SIGNAL PROCESSING
// =====================================================

void detectBandPeak(uint8_t band, float value) {
  const float amplitude = fabsf(value);

  bandRms[band] += RMS_ALPHA *
    (amplitude * amplitude - bandRms[band]);

  const float threshold = fmaxf(
    MIN_PEAK_AMPLITUDE,
    PEAK_THRESHOLD_MULTIPLIER * sqrtf(bandRms[band])
  );

  const uint32_t now = millis();
  const bool crossedThreshold =
    previousAbs[band] <= threshold && amplitude > threshold;

  if (stage == LIVE && crossedThreshold &&
      (now - lastPeakAt[band]) >= PEAK_REFRACTORY_MS) {
    bandPeakCount[band]++;
    lastPeakAt[band] = now;
  }

  previousAbs[band] = amplitude;
}

void processRawEEG(int16_t sample) {
  float subBand[FILTER_COUNT];

  for (uint8_t i = 0; i < FILTER_COUNT; i++) {
    subBand[i] = bandFilters[i].process((float)sample);
  }

  const float groupedBands[BAND_COUNT] = {
    subBand[0],
    subBand[1],
    subBand[2] + subBand[3],
    subBand[4] + subBand[5],
    subBand[6] + subBand[7]
  };

  for (uint8_t b = 0; b < BAND_COUNT; b++) {
    filteredBands[b] = groupedBands[b];
    detectBandPeak(b, groupedBands[b]);
  }

  processedRawCount++;
  if (stage == LIVE) sessionRawSamples++;
}

void calculateBandPercentages() {
  const uint64_t grouped[BAND_COUNT] = {
    eegPower[0],
    eegPower[1],
    (uint64_t)eegPower[2] + eegPower[3],
    (uint64_t)eegPower[4] + eegPower[5],
    (uint64_t)eegPower[6] + eegPower[7]
  };

  const uint64_t total =
    grouped[0] + grouped[1] + grouped[2] + grouped[3] + grouped[4];

  if (total == 0) {
    hasBandPower = false;
    return;
  }

  uint16_t sumRounded = 0;

  for (uint8_t i = 0; i < BAND_COUNT; i++) {
    bandPercent[i] = (uint8_t)(
      (grouped[i] * 100ULL + total / 2ULL) / total
    );
    sumRounded += bandPercent[i];
  }

  uint8_t largest = 0;
  for (uint8_t i = 1; i < BAND_COUNT; i++) {
    if (bandPercent[i] > bandPercent[largest]) largest = i;
  }

  int16_t corrected = (int16_t)bandPercent[largest] +
                      (100 - (int16_t)sumRounded);
  bandPercent[largest] = (uint8_t)constrain(corrected, 0, 100);

  hasBandPower = true;
  lastPowerPacketAt = millis();

  if (stage == LIVE) {
    for (uint8_t i = 0; i < BAND_COUNT; i++) {
      sessionBandSum[i] += bandPercent[i];
    }
    sessionPowerSamples++;
  }
}

// =====================================================
// 21. THINKGEAR PAYLOAD PARSER
// =====================================================

void parseThinkGearPayload(const uint8_t *data, uint8_t length) {
  uint16_t i = 0;

  while (i < length) {
    uint8_t code = data[i++];

    while (code == 0x55 && i < length) code = data[i++];

    if (code < 0x80) {
      if (i >= length) break;
      const uint8_t value = data[i++];

      if (code == 0x02) {
        signalQuality = value;
        lastQualityAt = millis();
      } else if (code == 0x04) {
        attentionValue = value;
        hasAttention = true;
        lastAttentionPacketAt = millis();
      } else if (code == 0x05) {
        meditationValue = value;
        hasMeditation = true;
        lastMeditationPacketAt = millis();
      }
      continue;
    }

    if (i >= length) break;
    const uint8_t valueLength = data[i++];

    if (valueLength == 0 ||
        (uint16_t)valueLength > (uint16_t)(length - i)) break;

    if (code == 0x80 && valueLength == 2) {
      const uint16_t rawUnsigned =
        ((uint16_t)data[i] << 8) | data[i + 1];

      rawEEG = (int16_t)rawUnsigned;
      hasRawEEG = true;
      lastRawPacketAt = millis();
      rawPacketCount++;
      waveformSamples[waveformWriteIndex] = rawEEG;
      waveformWriteIndex = (waveformWriteIndex + 1) % 128;

      if (rawEEG == -2048 || rawEEG == 2047) rawBoundaryCount++;

      if (stage == LIVE && !stopRequested) {
        if (SINGLE_ELECTRODE_TEST_MODE ||
            (qualityDataIsFresh(millis()) && signalQuality == 0)) {
          processRawEEG(rawEEG);
          enqueueSample(rawEEG);
        } else {
          rejectedRawCount++;
        }
      }
    }
    else if (code == 0x83 && valueLength == 24) {
      for (uint8_t p = 0; p < 8; p++) {
        const uint16_t offset = i + p * 3;
        eegPower[p] =
          ((uint32_t)data[offset] << 16) |
          ((uint32_t)data[offset + 1] << 8) |
          data[offset + 2];
      }
      calculateBandPercentages();
    }

    i += valueLength;
  }
}

void processTGAMByte(uint8_t value) {
  switch (parserState) {
    case 0:
      if (value == 0xAA) parserState = 1;
      break;

    case 1:
      parserState = (value == 0xAA) ? 2 : 0;
      break;

    case 2:
      if (value == 0xAA) {
        // Wait for packet length.
      } else if (value <= sizeof(payload)) {
        payloadLength = value;
        payloadIndex = 0;
        payloadChecksum = 0;
        parserState = payloadLength == 0 ? 4 : 3;
      } else {
        parserState = 0;
      }
      break;

    case 3:
      payload[payloadIndex++] = value;
      payloadChecksum += value;
      if (payloadIndex >= payloadLength) parserState = 4;
      break;

    case 4: {
      const uint8_t expected = (uint8_t)(~payloadChecksum);
      if (value == expected) {
        parseThinkGearPayload(payload, payloadLength);
        lastValidPacketAt = millis();
        validPacketCount++;
      } else {
        invalidPacketCount++;
      }
      parserState = 0;
      break;
    }

    default:
      parserState = 0;
      break;
  }
}

void readTGAM() {
  static uint32_t bytesReceived = 0;
  static uint32_t lastDebugAt = 0;

  while (TGAM.available() > 0) {
    processTGAMByte((uint8_t)TGAM.read());
    bytesReceived++;
  }

  const uint32_t now = millis();
  if (now - lastDebugAt >= 1000) {
    Serial.print("[UART DEBUG] bytes/sec=");
    Serial.println(bytesReceived);
    bytesReceived = 0;
    lastDebugAt = now;
  }
}

// =====================================================
// 22. OLED UI — NEURO EEG (128x64 MONOCHROME)
// =====================================================

static const char *const BAND_SHORT[BAND_COUNT] = {"Del", "The", "Alp", "Bet", "Gam"};

// ---------- Icon helpers ----------
void drawBatteryIcon(uint8_t x, uint8_t y) {
  display.drawRect(x, y, 13, 7, SSD1306_WHITE);
  display.fillRect(x + 13, y + 2, 2, 3, SSD1306_WHITE);
  display.drawLine(x + 3, y + 2, x + 9, y + 2, SSD1306_WHITE);
  display.drawLine(x + 3, y + 4, x + 9, y + 4, SSD1306_WHITE);
}

void drawWifiIcon(uint8_t x, uint8_t y, bool on) {
  for (uint8_t i = 0; i < 3; i++) {
    uint8_t h = 2 + i * 2;
    if (on) display.fillRect(x + i * 3, y + 7 - h, 2, h, SSD1306_WHITE);
    else    display.drawPixel(x + i * 3, y + 6, SSD1306_WHITE);
  }
}

void drawCheck(uint8_t x, uint8_t y) {          // 7x6
  display.drawLine(x, y + 3, x + 2, y + 5, SSD1306_WHITE);
  display.drawLine(x + 2, y + 5, x + 6, y + 1, SSD1306_WHITE);
}

void drawPowerIcon(uint8_t cx, uint8_t cy, uint8_t r) {
  display.drawCircle(cx, cy, r, SSD1306_WHITE);
  display.fillRect(cx - 2, cy - r - 1, 5, r - 1, SSD1306_BLACK);
  display.drawLine(cx, cy - r - 1, cx, cy, SSD1306_WHITE);
}

void drawBrainIcon(uint8_t x, uint8_t y) {      // ~12x10
  display.drawCircle(x + 3, y + 4, 3, SSD1306_WHITE);
  display.drawCircle(x + 8, y + 4, 3, SSD1306_WHITE);
  display.drawLine(x + 5, y + 1, x + 5, y + 9, SSD1306_WHITE);
  display.drawLine(x + 5, y + 9, x + 5, y + 10, SSD1306_WHITE);
}

// ---------- Common helpers ----------
void drawDuration(uint32_t durationMs) {
  uint32_t sec = durationMs / 1000;
  if (sec / 60 < 10) display.print('0');
  display.print(sec / 60);
  display.print(':');
  if (sec % 60 < 10) display.print('0');
  display.print(sec % 60);
}

void oledMessage(const char *a, const char *b, const char *c) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 5);  display.println(a);
  display.setCursor(0, 23); display.println(b);
  display.setCursor(0, 41); display.println(c);
  display.display();
}

void drawHeader(bool showWifi, bool showTime) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("NEURO EEG");

  if (showTime) {
    struct tm t;
    display.setCursor(62, 0);
    if (getLocalTime(&t, 0)) {
      char buf[6];
      snprintf(buf, sizeof(buf), "%02d:%02d", t.tm_hour, t.tm_min);
      display.print(buf);
    } else {
      display.print("--:--");
    }
  }
  if (showWifi) drawWifiIcon(96, 1, wifiConnected);
  drawBatteryIcon(109, 1);
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);
}

// Daftar band: label + bar + persen
void drawBandList(uint8_t topY, const uint8_t *v, bool valid, uint8_t barW) {
  const uint8_t barX = 20;
  for (uint8_t i = 0; i < BAND_COUNT; i++) {
    uint8_t y = topY + i * 8;
    display.setCursor(0, y);
    display.print(BAND_SHORT[i]);
    display.drawRect(barX, y, barW, 7, SSD1306_WHITE);
    display.setCursor(barX + barW + 3, y);
    if (valid) {
      uint8_t fillW = (uint16_t)v[i] * (barW - 2) / 100;
      if (fillW > 0) display.fillRect(barX + 1, y + 1, fillW, 5, SSD1306_WHITE);
      display.print(v[i]);
      display.print('%');
    } else {
      display.print("--");
    }
  }
}

void drawWaveform(int16_t x0, int16_t x1, int16_t cy, int16_t amp) {
  const int16_t w = x1 - x0;                       // maks 128
  display.drawLine(x0, cy, x1, cy, SSD1306_WHITE);
  const int16_t start = (waveformWriteIndex + 128 - w) % 128;

  int16_t prevY = 0;
  for (int16_t i = 0; i < w; i++) {
    int16_t s = waveformSamples[(start + i) % 128];
    s = constrain(s, -WAVE_RANGE, WAVE_RANGE - 1);
    int16_t y = cy - (int16_t)map(s, -WAVE_RANGE, WAVE_RANGE - 1, -amp, amp);
    if (i > 0) display.drawLine(x0 + i - 1, prevY, x0 + i, y, SSD1306_WHITE);
    prevY = y;
  }
}

// ---------- Screens ----------
void drawBootScreen(uint32_t now) {
  drawHeader(false, false);
  drawBrainIcon(4, 13);
  display.setCursor(24, 15);
  display.print("SYSTEM BOOT");

  uint8_t progress = (uint8_t)min(100UL, (now - stageStart) * 100UL / BOOT_MS);
  display.drawRect(4, 27, 88, 7, SSD1306_WHITE);
  display.fillRect(6, 29, (uint8_t)(84UL * progress / 100UL), 3, SSD1306_WHITE);
  display.setCursor(98, 27);
  display.print(progress);
  display.print('%');

  const char *names[3] = {"TGAM1", "WiFi", "Backend"};
  const bool ok[3] = {sensorConnected, wifiConnected, backendReachable};
  for (uint8_t i = 0; i < 3; i++) {
    uint8_t y = 37 + i * 9;
    if (ok[i]) drawCheck(4, y + 1);
    else       display.drawCircle(7, y + 3, 3, SSD1306_WHITE);
    display.setCursor(16, y);
    display.print(names[i]);
    display.setCursor(104, y);
    display.print(ok[i] ? "OK" : "...");
  }
  display.display();
}

void drawReadyScreen() {
  drawHeader(true, true);

  display.drawRoundRect(3, 13, 122, 28, 4, SSD1306_WHITE);
  drawPowerIcon(18, 28, 7);
  display.setTextSize(2);
  display.setCursor(34, 15);
  display.print("READY");
  display.setTextSize(1);
  display.setCursor(34, 32);
  display.print("Press START");

  display.drawLine(63, 45, 63, 62, SSD1306_WHITE);
  display.setCursor(8, 45);   display.print("WiFi");
  display.setCursor(8, 54);   display.print(wifiConnected ? "Connected" : "Offline");
  display.setCursor(70, 45);  display.print("Backend");
  display.setCursor(70, 54);  display.print(backendReachable ? "Connected" : "Offline");
  display.display();
}

void drawStartIntro() {
  drawHeader(true, false);
  display.drawRoundRect(5, 17, 118, 34, 5, SSD1306_WHITE);
  display.setCursor(25, 23);
  display.print("START SESSION");
  display.drawLine(20, 36, 108, 36, SSD1306_WHITE);
  display.setCursor(25, 41);
  display.print("Session Started");
  display.setCursor(0, 56);
  display.print("ID ");
  display.print(activeSessionId.substring(0, 12));
  display.display();
}

void drawStoppingScreen() {
  drawHeader(true, false);
  display.setTextSize(2);
  display.setCursor(17, 19);
  display.print("STOPPING");
  display.setTextSize(1);
  display.setCursor(5, 43);
  display.print("Flushing EEG data...");
  display.setCursor(5, 55);
  display.print("Pending: ");
  display.print(sampleCount);
  display.display();
}

void drawLivePage0(uint32_t now) {            // waveform + status
  drawHeader(true, false);

  // Tag LIVE (inverted)
  display.fillRect(0, 12, 27, 9, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setCursor(2, 13);
  display.print("LIVE");
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(33, 13);
  display.print("RAW EEG");
  display.setCursor(98, 13);
  drawDuration(now - sessionStartAt);

  display.setCursor(0, 33);
  display.print("Fp1");
  drawWaveform(20, 127, 36, 11);

  display.drawLine(0, 51, 127, 51, SSD1306_WHITE);
  display.setCursor(0, 55);
  display.print("WiFi:");
  display.print(wifiConnected ? "OK" : "--");
  display.print(" Backend:");
  display.print(backendReachable ? "OK" : "--");
  display.display();
}

void drawLivePage1(uint32_t now) {            // band power + attention/meditation
  drawHeader(true, false);
  display.setCursor(0, 13);
  display.print("BAND POWER (%)");
  drawBandList(24, bandPercent, powerDataIsFresh(now), 34);

  display.drawLine(77, 12, 77, 63, SSD1306_WHITE);

  display.setCursor(84, 13);
  display.print("ATT");
  display.setTextSize(2);
  display.setCursor(84, 22);
  if (attentionDataIsFresh(now)) display.print(attentionValue);
  else display.print("--");

  display.setTextSize(1);
  display.setCursor(84, 40);
  display.print("MED");
  display.setTextSize(2);
  display.setCursor(84, 49);
  if (meditationDataIsFresh(now)) display.print(meditationValue);
  else display.print("--");
  display.setTextSize(1);
  display.display();
}

void drawResultsPage0() {
  drawHeader(true, false);

  if (backendFinishConfirmed) {
    display.drawCircle(8, 17, 5, SSD1306_WHITE);
    drawCheck(5, 15);
    display.setCursor(18, 14);
    display.print("SESSION COMPLETE");
  } else {
    display.drawCircle(8, 17, 5, SSD1306_WHITE);
    display.setCursor(6, 14);
    display.print("!");
    display.setCursor(18, 14);
    display.print("INCOMPLETE / ERR");
  }
  display.drawLine(0, 24, 127, 24, SSD1306_WHITE);

  display.setCursor(0, 28);
  display.print("Duration");
  display.setCursor(98, 28);
  drawDuration(sessionDurationMs);

  display.setCursor(0, 39);
  display.print("Signal Quality");
  display.setCursor(92, 39);
  if (finalQuality == 255)      display.print("N/A");
  else if (finalQuality == 0)   display.print("GOOD");
  else if (finalQuality >= 200) display.print("NONE");
  else                          display.print("NOISY");

  display.drawLine(0, 49, 127, 49, SSD1306_WHITE);
  if (backendFinishConfirmed) {
    drawCheck(2, 54);
    display.setCursor(14, 54);
    display.print("Data Saved");
  } else {
    display.drawCircle(5, 57, 3, SSD1306_WHITE);
    display.setCursor(14, 54);
    display.print("Not confirmed");
  }
  display.setCursor(86, 54);
  display.print(uploadedSampleCount);
  display.display();
}

void drawResultsPage1() {
  drawHeader(true, false);
  display.setCursor(0, 13);
  display.print("BAND POWER (avg)");
  drawBandList(24, averageBandPercent, sessionPowerSamples > 0, 70);
  display.display();
}

// Panggil manual sebelum deep sleep / saat tombol power ditekan
void showPowerOff() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  drawPowerIcon(64, 18, 9);
  display.setTextSize(1);
  display.setCursor(37, 34);
  display.print("POWER OFF");
  display.drawLine(20, 46, 36, 46, SSD1306_WHITE);
  display.setCursor(42, 43);
  display.print("Goodbye");
  display.drawLine(92, 46, 108, 46, SSD1306_WHITE);
  display.setCursor(0, 56);
  display.print("NEURO EEG");
  drawBatteryIcon(109, 56);
  display.display();
}

// ---------- Dispatcher ----------
void updateOLED() {
  const uint32_t now = millis();
  if (now - lastOLEDRefreshAt < OLED_REFRESH_MS) return;
  lastOLEDRefreshAt = now;

  if (stage == BOOT)     { drawBootScreen(now); return; }
  if (stage == READY)    { drawReadyScreen();   return; }
  if (stage == STOPPING) { drawStoppingScreen(); return; }

  if (stage == LIVE) {
    if (showStartIntro) {
      if (now - startIntroAt < 1600) { drawStartIntro(); return; }
      showStartIntro = false;
      lastOLEDPageAt = now;
    }

    if (now - lastOLEDPageAt >= 3000) {
      oledPage = (oledPage + 1) % 2;
      lastOLEDPageAt = now;
    }
    if (oledPage == 0) drawLivePage0(now);
    else               drawLivePage1(now);
    return;
  }

  if (stage == RESULTS) {
    if (now - lastOLEDPageAt >= 3500) {
      oledPage = (oledPage + 1) % 2;
      lastOLEDPageAt = now;
    }
    if (oledPage == 0) drawResultsPage0();
    else               drawResultsPage1();
  }
}

// =====================================================
// 23. SERIAL REPORT
// =====================================================

void printLiveSummary(uint32_t now) {
  if (now - lastSerialReportAt < SERIAL_REPORT_MS) return;
  lastSerialReportAt = now;

  Serial.println("--------------------------------");
  Serial.println("[SOURCE] EEG ELECTRODE -> TGAM R2.9A -> ESP32");
  Serial.print("[MODE] "); Serial.println(processingModeText());
  Serial.print("[TGAM] "); Serial.println(sensorConnected ? "CONNECTED" : "WAITING");
  Serial.print("[QUALITY] "); Serial.print(signalQuality);
  Serial.print(" ("); Serial.print(qualityText()); Serial.println(")");

  Serial.print("[RAW EEG] ");
  if (rawDataIsFresh(now)) Serial.println(rawEEG);
  else Serial.println("N/A");

  Serial.print("[POWER] ");
  if (powerDataIsFresh(now)) {
    for (uint8_t i = 0; i < BAND_COUNT; i++) {
      if (i) Serial.print(" | ");
      Serial.print(BAND_NAMES[i]); Serial.print('=');
      Serial.print(bandPercent[i]); Serial.print('%');
    }
    Serial.println(" [UNVALIDATED]");
  } else {
    Serial.println("WAITING");
  }

  Serial.print("[ATTENTION] ");
  if (attentionDataIsFresh(now)) Serial.println(attentionValue);
  else Serial.println("N/A");

  Serial.print("[MEDITATION] ");
  if (meditationDataIsFresh(now)) Serial.println(meditationValue);
  else Serial.println("N/A");

  Serial.print("[NETWORK] WiFi=");
  Serial.print(wifiConnected ? "CONNECTED" : "OFFLINE");
  Serial.print(" Backend=");
  Serial.println(backendReachable ? "ONLINE" : "OFFLINE");

  Serial.print("[SESSION] ");
  if (stage == LIVE) Serial.println("LIVE");
  else if (stage == STOPPING) Serial.println("STOPPING");
  else if (stage == RESULTS) Serial.println("RESULTS");
  else if (stage == READY) Serial.println("READY");
  else Serial.println("BOOT");

  if (stage == LIVE || stage == STOPPING) {
    Serial.print("[SESSION ID] "); Serial.println(activeSessionId);
    Serial.print("[UPLOAD] pending="); Serial.print(sampleCount);
    Serial.print(" uploaded="); Serial.print(uploadedSampleCount);
    Serial.print(" dropped="); Serial.println(droppedSampleCount);
  }
}

// =====================================================
// 24. HARDWARE BUTTON & SERIAL CONTROLS
// =====================================================

void handleButton(uint32_t now) {
  int reading = digitalRead(BTN_START_STOP_PIN);
  if (reading == LOW && lastBtnState == HIGH && (now - lastBtnPressAt > BTN_DEBOUNCE_MS)) {
    lastBtnPressAt = now;
    if (stage == LIVE) {
      Serial.println("[BUTTON] Stop requested via physical button (GPIO18).");
      triggerStop("button_stop");
    } else if (stage == RESULTS) {
      Serial.println("[BUTTON] Manual reset to READY via physical button.");
      stage = READY;
      stageStart = now;
      activeSessionId = "";
      stopRequested = false;
      finishRequestPending = false;
      resetSessionData();
      resetSensorData();
    }
  }
  lastBtnState = reading;
}

void handleSerialCommands(uint32_t now) {
  while (Serial.available() > 0) {
    char ch = (char)Serial.read();
    if (ch == 'X' || ch == 'x') {
      if (stage == LIVE) {
        Serial.println("[SERIAL] Stop command received ('X').");
        triggerStop("serial_stop");
      }
    } else if (ch == 'R' || ch == 'r') {
      if (stage == RESULTS) {
        Serial.println("[SERIAL] Reset command received ('R').");
        stage = READY;
        stageStart = now;
        activeSessionId = "";
        stopRequested = false;
        finishRequestPending = false;
        resetSessionData();
        resetSensorData();
      }
    }
  }
}

// =====================================================
// 25. SETUP
// =====================================================

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println();
  Serial.println("================================");
  Serial.println(" EEG WEARABLE SYSTEM");
  Serial.println(" TGAM R2.9A + ESP32");
  Serial.println(" WEBSITE CONTROLLED SESSION");
  Serial.println("================================");

  pinMode(BTN_START_STOP_PIN, INPUT_PULLUP);

  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("[OLED] Initialization FAILED");
  } else {
    Serial.println("[OLED] SSD1306 initialized");
    oledMessage("EEG WEARABLE", "Initializing...", "Please wait");
  }

  for (uint8_t i = 0; i < FILTER_COUNT; i++) {
    bandFilters[i].configure(
      FILTER_LOW_HZ[i], FILTER_HIGH_HZ[i], SAMPLE_RATE_HZ
    );
  }

  TGAM.begin(TGAM_BAUD, SERIAL_8N1, TGAM_RX_PIN, TGAM_TX_PIN);
  Serial.printf("[UART] TGAM UART2 RX=GPIO%d TX=GPIO%d BAUD=%lu\n",
                TGAM_RX_PIN, TGAM_TX_PIN, (unsigned long)TGAM_BAUD);

  Serial.println("[OLED WIRING] SDA=GPIO21 SCL=GPIO22 address=0x3C");
  Serial.println("[TGAM WIRING] TXD -> GPIO26 RX2; GND -> GND");
  Serial.printf("[BUTTON WIRING] Button -> GPIO%d (INPUT_PULLUP) & GND\n", BTN_START_STOP_PIN);
  Serial.println("[NOTICE] Raw EEG values remain raw ThinkGear values, not calibrated microvolts.");
  Serial.println("[NOTICE] No auto-start. Website/backend controls START and STOP.");

  WiFi.mode(WIFI_STA);
  lastWiFiAttemptAt = millis() - WIFI_RETRY_MS;
  maintainWiFi(millis());

  stageStart = millis();
  stage = BOOT;
  Serial.println("[STATE] BOOT");
}

// =====================================================
// 26. MAIN LOOP
// =====================================================

void loop() {
  // Prioritaskan pembacaan UART sebelum pekerjaan jaringan.
  readTGAM();

  uint32_t now = millis();

  // Tangani tombol fisik dan perintah Serial
  handleButton(now);
  handleSerialCommands(now);

  sensorConnected = tgamIsFresh(now);

  if (previousSensorConnected && !sensorConnected) {
    resetSensorData();
    Serial.println("[TGAM] UART CONNECTION LOST");
  } else if (!previousSensorConnected && sensorConnected) {
    Serial.println("[TGAM] UART CONNECTION RESTORED");
  }
  previousSensorConnected = sensorConnected;

  if (stage == BOOT && now - stageStart >= BOOT_MS) {
    stage = READY;
    stageStart = now;
    Serial.println("[STATE] READY - WAITING WEBSITE START");
  }

  maintainWiFi(now);
  wifiConnected = (WiFi.status() == WL_CONNECTED);

  // Sinkronisasi waktu (NTP) sekali setelah Wi-Fi tersambung.
  if (wifiConnected && !ntpStarted) {
    configTime(7 * 3600, 0, "pool.ntp.org", "time.google.com"); // WIB
    ntpStarted = true;
  }

  // Status polling menerima START/STOP dari website/backend (hanya saat READY atau LIVE)
  pollBackendStatus(now);

  // Upload batch berkala saat sesi LIVE normal
  if (stage == LIVE && sampleCount > 0 &&
      (sampleCount >= SAMPLE_BATCH_SIZE ||
       now - lastBatchSendAt >= BATCH_SEND_INTERVAL_MS)) {
    lastBatchSendAt = now;
    uploadOneBatch();
  }

  // Batas waktu lokal sebagai pengaman, bukan pengganti STOP dari website.
  if (stage == LIVE && !stopRequested &&
      now - sessionStartAt >= SESSION_LIMIT_MS) {
    Serial.println("[SESSION] Local 5-minute safety limit reached. Flushing data.");
    triggerStop("safety_timeout");
  }

  // Flushing dan finish request saat STOPPING
  if (stage == STOPPING && finishRequestPending) {
    if (sampleCount > 0) {
      if (now - lastBatchSendAt >= 150) {
        lastBatchSendAt = now;
        bool batchOk = uploadOneBatch();
        if (!batchOk) {
          batchFailureCount++;
          if (batchFailureCount >= 3) {
            Serial.printf("[STOPPING] Upload failed 3 times. Dropping remaining %u samples to proceed with finish.\n", sampleCount);
            sampleHead = sampleTail = sampleCount = 0;
          }
        }
      }
    } else {
      sendFinishRequest(now);
    }

    // Safety watchdog: jika proses STOPPING macet lebih dari 10 detik, paksa ke RESULTS
    if (now - stageStart >= 10000) {
      Serial.println("[STOPPING] 10s watchdog timeout reached. Forcing transition to RESULTS (incomplete).");
      backendFinishConfirmed = false;
      finishRequestPending = false;
      enterResults(now);
    }
  }

  // Auto-reset dari RESULTS ke READY setelah 7 detik
  if (stage == RESULTS && now - stageStart >= 7000) {
    stage = READY;
    stageStart = now;
    activeSessionId = "";
    stopRequested = false;
    finishRequestPending = false;
    resetSessionData();
    resetSensorData();
    Serial.println("[STATE] Auto-reset: RESULTS -> READY (Standby).");
  }

  printLiveSummary(now);
  updateOLED();

  delay(1);
}