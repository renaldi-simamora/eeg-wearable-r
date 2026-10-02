/*
  ESP32 Firmware for NeuroSky TGAM1 Wearable EEG Biosensing
  Academic Research Project:
  "Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning"

  Hardware Connections:
  - TGAM1 VCC  -> ESP32 3V3 (3.3V Power Rail)
  - TGAM1 GND  -> ESP32 GND
  - TGAM1 TX   -> ESP32 GPIO 16 (Serial2 RX)
  - Forehead Electrode: Dry / Ag-AgCl at FP1 (International 10-20 system)
  - Earclip Electrode: Reference & Ground at A1 (Left Earlobe)

  Telemetry:
  - 512 Hz Raw ADC Sampling
  - ThinkGear ASIC Packet Parsing (Poor Signal Quality 0-200, 8-Band Spectral Power)
  - Wi-Fi HTTP / WebSocket Ingestion Gateway to Go API (/api/eeg/data)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Wi-Fi Configuration
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend API Endpoint
const char* BACKEND_API_URL = "http://192.168.1.100:8080/api/eeg/data";
const char* DEVICE_CODE     = "EEG-001";
const char* ACTIVE_SESSION_ID = "ses-active-research";

// Hardware Serial (UART2 on ESP32)
#define TGAM1_RX_PIN 16
#define TGAM1_TX_PIN 17
#define TGAM1_BAUDRATE 57600

// ThinkGear Packet Parser Constants
#define SYNC_BYTE 0xAA
#define CODE_POOR_SIGNAL 0x02
#define CODE_RAW_WAVE    0x80
#define CODE_ASIC_EEG    0x83

// Parser State Machine
enum ParserState {
  STATE_WAIT_SYNC1,
  STATE_WAIT_SYNC2,
  STATE_WAIT_PLENGTH,
  STATE_READ_PAYLOAD,
  STATE_WAIT_CHECKSUM
};

ParserState currentState = STATE_WAIT_SYNC1;
uint8_t payloadLength = 0;
uint8_t payloadBytes[256];
uint8_t payloadIndex = 0;
uint8_t checksumCalc = 0;

// Biosignal Telemetry Buffers
int currentSignalQuality = 0; // 0 = Good, 200 = No Contact
int16_t currentRawWave = 0;

struct BrainwaveBands {
  uint32_t delta;
  uint32_t theta;
  uint32_t lowAlpha;
  uint32_t highAlpha;
  uint32_t lowBeta;
  uint32_t highBeta;
  uint32_t lowGamma;
  uint32_t midGamma;
} currentBands;

// Sample batching for network transmission (50 Hz network packet rate)
const int BATCH_SIZE = 10;
int16_t sampleBatch[BATCH_SIZE];
int sampleBatchCount = 0;
unsigned long lastBatchSendTime = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("[ESP32] Initializing TGAM1 Wearable EEG IoT Node...");

  // Initialize TGAM1 Serial Port
  Serial2.begin(TGAM1_BAUDRATE, SERIAL_8N1, TGAM1_RX_PIN, TGAM1_TX_PIN);
  Serial.println("[ESP32] UART2 initialized for TGAM1 at 57600 baud.");

  // Connect to Wi-Fi
  connectWiFi();
}

void connectWiFi() {
  Serial.printf("[Wi-Fi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected successfully. IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[Wi-Fi] Warning: Connection pending. Data will buffer locally.");
  }
}

void loop() {
  // 1. Maintain Wi-Fi Connectivity
  if (WiFi.status() != WL_CONNECTED && millis() - lastBatchSendTime > 10000) {
    connectWiFi();
  }

  // 2. Read UART bytes from TGAM1
  while (Serial2.available() > 0) {
    uint8_t b = Serial2.read();
    parseThinkGearByte(b);
  }

  // 3. Transmit sample batch periodically (~every 50-100ms)
  if (sampleBatchCount >= BATCH_SIZE && millis() - lastBatchSendTime >= 60) {
    sendSampleBatch();
    sampleBatchCount = 0;
    lastBatchSendTime = millis();
  }
}

// ThinkGear Packet Parser State Machine
void parseThinkGearByte(uint8_t b) {
  switch (currentState) {
    case STATE_WAIT_SYNC1:
      if (b == SYNC_BYTE) currentState = STATE_WAIT_SYNC2;
      break;

    case STATE_WAIT_SYNC2:
      if (b == SYNC_BYTE) {
        currentState = STATE_WAIT_PLENGTH;
      } else {
        currentState = STATE_WAIT_SYNC1;
      }
      break;

    case STATE_WAIT_PLENGTH:
      if (b > 170) {
        // Packet length exceeds maximum payload
        currentState = STATE_WAIT_SYNC1;
      } else {
        payloadLength = b;
        payloadIndex = 0;
        checksumCalc = 0;
        currentState = STATE_READ_PAYLOAD;
      }
      break;

    case STATE_READ_PAYLOAD:
      payloadBytes[payloadIndex++] = b;
      checksumCalc += b;
      if (payloadIndex >= payloadLength) {
        currentState = STATE_WAIT_CHECKSUM;
      }
      break;

    case STATE_WAIT_CHECKSUM:
      checksumCalc = (~checksumCalc) & 0xFF;
      if (checksumCalc == b) {
        // Valid packet verified by checksum!
        processPayload(payloadBytes, payloadLength);
      } else {
        Serial.println("[Parser] Checksum mismatch error in TGAM1 packet.");
      }
      currentState = STATE_WAIT_SYNC1;
      break;
  }
}

// Process payload codes (ThinkGear standard protocol)
void processPayload(uint8_t* payload, uint8_t length) {
  uint8_t i = 0;
  while (i < length) {
    uint8_t code = payload[i++];

    if (code == CODE_POOR_SIGNAL) {
      currentSignalQuality = payload[i++];
    } else if (code == CODE_RAW_WAVE) {
      uint8_t vLength = payload[i++]; // Usually 2 bytes
      if (vLength == 2) {
        int16_t high = payload[i++];
        int16_t low = payload[i++];
        currentRawWave = (int16_t)((high << 8) | low);

        // Store sample in batch buffer
        if (sampleBatchCount < BATCH_SIZE) {
          sampleBatch[sampleBatchCount++] = currentRawWave;
        }
      }
    } else if (code == CODE_ASIC_EEG) {
      uint8_t vLength = payload[i++]; // 24 bytes (8 bands x 3 bytes each)
      if (vLength == 24) {
        currentBands.delta     = (payload[i] << 16) | (payload[i+1] << 8) | payload[i+2]; i += 3;
        currentBands.theta     = (payload[i] << 16) | (payload[i+1] << 8) | payload[i+2]; i += 3;
        currentBands.lowAlpha  = (payload[i] << 16) | (payload[i+1] << 8) | payload[i+2]; i += 3;
        currentBands.highAlpha = (payload[i] << 16) | (payload[i+1] << 8) | payload[i+2]; i += 3;
        currentBands.lowBeta   = (payload[i] << 16) | (payload[i+1] << 8) | payload[i+2]; i += 3;
        currentBands.highBeta  = (payload[i] << 16) | (payload[i+1] << 8) | payload[i+2]; i += 3;
        currentBands.lowGamma  = (payload[i] << 16) | (payload[i+1] << 8) | payload[i+2]; i += 3;
        currentBands.midGamma  = (payload[i] << 16) | (payload[i+1] << 8) | payload[i+2]; i += 3;
      }
    }
  }
}

// Format and send JSON payload to Go Backend API
void sendSampleBatch() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(BACKEND_API_URL);
  http.addHeader("Content-Type", "application/json");

  // Inverted percentage: 0 poor signal = 100% good; 200 = 0%
  int sigPercent = map(constrain(currentSignalQuality, 0, 200), 0, 200, 100, 0);

  // Compute total ASIC band power for relative normalization
  double alphaTotal = (double)(currentBands.lowAlpha + currentBands.highAlpha);
  double betaTotal  = (double)(currentBands.lowBeta + currentBands.highBeta);
  double gammaTotal = (double)(currentBands.lowGamma + currentBands.midGamma);
  double totalPower = (double)currentBands.delta + currentBands.theta + alphaTotal + betaTotal + gammaTotal;

  double relDelta = totalPower > 0 ? (currentBands.delta / totalPower) * 100.0 : 20.0;
  double relTheta = totalPower > 0 ? (currentBands.theta / totalPower) * 100.0 : 20.0;
  double relAlpha = totalPower > 0 ? (alphaTotal / totalPower) * 100.0 : 20.0;
  double relBeta  = totalPower > 0 ? (betaTotal / totalPower) * 100.0 : 20.0;
  double relGamma = totalPower > 0 ? (gammaTotal / totalPower) * 100.0 : 20.0;

  StaticJsonDocument<1024> doc;
  doc["sessionId"] = ACTIVE_SESSION_ID;

  JsonArray samplesArr = doc.createNestedArray("samples");
  unsigned long now = millis();
  for (int j = 0; j < sampleBatchCount; j++) {
    JsonObject sm = samplesArr.createNestedObject();
    sm["timestamp"] = now + j;
    // Conversion from TGAM1 ADC counts to microvolts (uV)
    // Scale factor: (ADC_val * (1.8 / 4096)) / 2000 * 1e6
    sm["rawEEG"] = round(((double)sampleBatch[j] * (1.8 / 4096.0) / 2000.0 * 1000000.0) * 100.0) / 100.0;
    sm["signalQuality"] = sigPercent;
  }

  JsonObject featObj = doc.createNestedObject("features");
  featObj["delta"] = round(relDelta * 10.0) / 10.0;
  featObj["theta"] = round(relTheta * 10.0) / 10.0;
  featObj["alpha"] = round(relAlpha * 10.0) / 10.0;
  featObj["beta"]  = round(relBeta * 10.0) / 10.0;
  featObj["gamma"] = round(relGamma * 10.0) / 10.0;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    // Transmission successful
  } else {
    Serial.printf("[HTTP] Ingestion error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}
