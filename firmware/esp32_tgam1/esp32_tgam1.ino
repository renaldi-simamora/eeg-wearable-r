#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==================================================
// KONFIGURASI
// ==================================================

const char* WIFI_SSID     = "NAMA_WIFI";
const char* WIFI_PASSWORD = "PASSWORD_WIFI";

const char* BACKEND_API_URL = "http://192.168.1.4:8080/api/eeg/data";
const char* DEVICE_API_KEY = "eeg-device-secret-key-academic-2026";

constexpr int TGAM_RX_PIN = 16;
constexpr int TGAM_TX_PIN = 17;
constexpr uint32_t TGAM_BAUD = 57600;

constexpr uint32_t MAX_SESSION_MS = 2UL * 60UL * 60UL * 1000UL;
constexpr uint32_t BATCH_INTERVAL_MS = 1000;
constexpr size_t MAX_BATCH_SAMPLES = 4096;

HardwareSerial TGAMSerial(2);
WiFiClientSecure secureClient;

bool sessionActive = false;
bool sessionError = false;

String sessionId;
uint32_t sessionStartedAt = 0;
uint32_t lastBatchAt = 0;
uint32_t totalSamples = 0;
uint32_t validPackets = 0;
uint32_t invalidPackets = 0;
uint32_t nextSampleIndex = 0;

int16_t sampleBuffer[MAX_BATCH_SAMPLES];
size_t sampleCount = 0;

// ==================================================
// PARSER THINKGEAR
// ==================================================

enum ParserState {
  WAIT_SYNC_1,
  WAIT_SYNC_2,
  READ_LENGTH,
  READ_PAYLOAD,
  READ_CHECKSUM
};

ParserState parserState = WAIT_SYNC_1;

uint8_t payloadLength = 0;
uint8_t payloadIndex = 0;
uint8_t payload[169];
uint8_t payloadSum = 0;

void resetParser() {
  parserState = WAIT_SYNC_1;
  payloadLength = 0;
  payloadIndex = 0;
  payloadSum = 0;
}

void onRawEEG(int16_t value) {
  if (!sessionActive || sessionError) return;

  if (sampleCount < MAX_BATCH_SAMPLES) {
    sampleBuffer[sampleCount++] = value;
    totalSamples++;
  } else {
    // Jangan lanjutkan diam-diam jika buffer penuh.
    sessionError = true;
    Serial.println("ERROR: buffer penuh; sesi dihentikan.");
  }
}

void processPayload() {
  uint8_t i = 0;

  while (i < payloadLength) {
    uint8_t code = payload[i++];

    while (code == 0x55 && i < payloadLength) {
      code = payload[i++];
    }

    if (code >= 0x80) {
      if (i >= payloadLength) break;

      uint8_t valueLength = payload[i++];

      if (i + valueLength > payloadLength) break;

      if (code == 0x80 && valueLength == 2) {
        int16_t value =
          (int16_t)(((uint16_t)payload[i] << 8) |
                    (uint16_t)payload[i + 1]);

        onRawEEG(value);
      }

      i += valueLength;
    } else {
      // Kode sederhana memiliki satu byte nilai.
      if (i < payloadLength) i++;
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
          payloadIndex = 0;
          payloadSum = 0;
          parserState = READ_PAYLOAD;
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

// ==================================================
// WIFI DAN HTTP
// ==================================================

bool connectWiFi(uint32_t timeoutMs = 20000) {
  if (WiFi.status() == WL_CONNECTED) return true;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint32_t start = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - start < timeoutMs) {
    readTGAM();
    delay(5);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi OK. IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println("Wi-Fi gagal.");
  return false;
}

bool postJson(const String& path, JsonDocument& doc) {
  if (!connectWiFi()) return false;

  // HANYA UNTUK UJI PROTOTIPE.
  // Produksi harus memvalidasi sertifikat TLS.
  secureClient.setInsecure();

  HTTPClient http;
  String url = String(BACKEND_URL) + path;

  if (!http.begin(secureClient, url)) return false;

  http.setConnectTimeout(10000);
  http.setTimeout(15000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-API-Key", DEVICE_API_KEY);

  String body;
  serializeJson(doc, body);

  int status = http.POST(body);

  if (status > 0) {
    Serial.printf("HTTP status: %d\n", status);
  } else {
    Serial.printf("HTTP error: %s\n",
                  HTTPClient::errorToString(status).c_str());
  }

  http.end();
  return status >= 200 && status < 300;
}

// ==================================================
// SESSION
// ==================================================

String makeSessionId() {
  char id[64];

  snprintf(id, sizeof(id), "eeg-%08lx-%lu",
           (unsigned long)(ESP.getEfuseMac() & 0xFFFFFFFF),
           (unsigned long)millis());

  return String(id);
}

bool registerSession() {
  JsonDocument doc;

  doc["session_id"] = sessionId;
  doc["device_id"] = "esp32-eeg-01";
  doc["max_duration_seconds"] = 7200;
  doc["format"] = "thinkgear_raw_eeg";
  doc["status"] = "started";

  return postJson("/api/v1/eeg/sessions/start", doc);
}

void startSession() {
  if (sessionActive) {
    Serial.println("Sesi sedang berjalan.");
    return;
  }

  if (!connectWiFi()) {
    Serial.println("Sesi tidak dimulai: Wi-Fi gagal.");
    return;
  }

  sessionId = makeSessionId();
  sampleCount = 0;
  totalSamples = 0;
  validPackets = 0;
  invalidPackets = 0;
  nextSampleIndex = 0;
  sessionError = false;

  // Daftarkan sesi sebelum mulai merekam.
  if (!registerSession()) {
    Serial.println("Gagal mendaftarkan sesi ke backend.");
    return;
  }

  sessionStartedAt = millis();
  lastBatchAt = sessionStartedAt;
  sessionActive = true;

  Serial.println("Sesi dimulai.");
  Serial.print("Session ID: ");
  Serial.println(sessionId);
  Serial.println("Ketik X untuk selesai; batas maksimum 2 jam.");
}

bool sendBatch() {
  if (sampleCount == 0) return true;

  JsonDocument doc;

  doc["session_id"] = sessionId;
  doc["device_id"] = "esp32-eeg-01";
  doc["start_index"] = nextSampleIndex;
  doc["format"] = "thinkgear_raw_eeg";
  doc["sample_count"] = sampleCount;

  JsonArray samples = doc["samples"].to<JsonArray>();

  for (size_t i = 0; i < sampleCount; i++) {
    samples.add(sampleBuffer[i]);
  }

  // Jangan menghapus batch jika gagal dikirim.
  if (!postJson("/api/v1/eeg/samples", doc)) {
    Serial.println("Pengiriman batch gagal.");
    return false;
  }

  nextSampleIndex += sampleCount;
  Serial.printf("Batch terkirim: %u sampel\n",
                (unsigned int)sampleCount);

  sampleCount = 0;
  return true;
}

void finishSession(const char* reason) {
  if (!sessionActive) return;

  // Berhenti merekam terlebih dahulu.
  sessionActive = false;

  Serial.println("Menyelesaikan sesi...");

  bool batchOK = sendBatch();

  JsonDocument doc;
  doc["session_id"] = sessionId;
  doc["device_id"] = "esp32-eeg-01";
  doc["duration_seconds"] =
      (millis() - sessionStartedAt) / 1000;
  doc["total_samples"] = totalSamples;
  doc["valid_packets"] = validPackets;
  doc["invalid_packets"] = invalidPackets;
  doc["status"] = (batchOK && !sessionError)
                    ? "completed" : "incomplete";
  doc["reason"] = reason;

  bool finishOK =
      postJson("/api/v1/eeg/sessions/finish", doc);

  Serial.println("===== RINGKASAN =====");
  Serial.printf("Session ID: %s\n", sessionId.c_str());
  Serial.printf("Sampel: %lu\n", (unsigned long)totalSamples);
  Serial.printf("Paket valid: %lu\n", (unsigned long)validPackets);
  Serial.printf("Paket invalid: %lu\n", (unsigned long)invalidPackets);
  Serial.printf("Status akhir terkirim: %s\n",
                finishOK ? "YA" : "TIDAK");

  if (!finishOK || !batchOK) {
    Serial.println("Perlu pemulihan data; periksa backend.");
  }
}

// ==================================================
// SETUP DAN LOOP
// ==================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  TGAMSerial.begin(
    TGAM_BAUD,
    SERIAL_8N1,
    TGAM_RX_PIN,
    TGAM_TX_PIN
  );

  Serial.println("\nESP32 + TGAM1 siap.");
  Serial.println("S = mulai sesi");
  Serial.println("X = selesai sesi");
  Serial.println("Durasi maksimum: 2 jam");

  connectWiFi();
}

void loop() {
  readTGAM();

  while (Serial.available() > 0) {
    char cmd = (char)Serial.read();

    if (cmd == 'S' || cmd == 's') {
      startSession();
    } else if (cmd == 'X' || cmd == 'x') {
      finishSession("manual");
    }
  }

  if (sessionActive) {
    uint32_t elapsed = millis() - sessionStartedAt;

    if (elapsed >= MAX_SESSION_MS) {
      finishSession("max_duration");
      return;
    }

    if (millis() - lastBatchAt >= BATCH_INTERVAL_MS) {
      // Drain serial sebelum operasi jaringan.
      readTGAM();

      if (!sendBatch()) {
        // Jangan lanjut merekam tanpa mekanisme retry
        // atau penyimpanan lokal yang andal.
        sessionError = true;
        finishSession("upload_error");
        return;
      }

      lastBatchAt = millis();
    }
  }

  delay(1);
}
