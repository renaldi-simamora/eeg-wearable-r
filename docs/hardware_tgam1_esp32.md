# Hardware Integration Guide: NeuroSky TGAM1 + ESP32

**Academic Engineering Project**: *Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning*

---

## 1. Hardware Overview & Physical Signal Chain

```
[ Dry Frontal Electrode (FP1) ] + [ Ear Reference / Ground (A1) ]
                  │ (Analog Biosignal Trace, ~5–100 µV)
                  ▼
      [ NeuroSky TGAM1 ASIC Chip ]
       - Low-Noise Preamplifier (PGA)
       - 12-bit Analog-to-Digital Converter (ADC) @ 512 Hz
       - Bandpass Filter: 0.5 Hz – 50 Hz (-3dB)
       - Hardware Notch Filter: 50 Hz (Mains power line rejection)
                  │ (UART 57,600 baud, 8-N-1)
                  ▼
         [ ESP32 Microcontroller ]
       - ThinkGear Packet Protocol Parser
       - Timestamp & Telemetry Framing
       - Wi-Fi 802.11 b/g/n Telemetry Transmission
                  │ (HTTP POST / WebSocket)
                  ▼
         [ Go Backend Gateway ]
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
  [ PostgreSQL ]     [ Python ML Service ]
```

---

## 2. Wiring & Pinout Specification

| TGAM1 Pin | TGAM1 Function | ESP32 Pin | Description |
|:---|:---|:---|:---|
| **VCC** | Power Input | **3V3** | 3.3V DC Regulated Power Rail |
| **GND** | Ground | **GND** | System Common Ground |
| **TX** | Serial Out | **GPIO 16 (RX2)** | Hardware UART2 Receive pin |
| **T** | Test Mode | *Unconnected* | Leave floating for normal operation |
| **B** | Reset / Baud | *Unconnected* | Default 57,600 baud mode |

### Electrode Placement (International 10-20 System)
- **Active Electrode**: Positioned at **FP1** (Frontal Pole 1, left forehead, ~2.5 cm above the eyebrow).
- **Reference & Ground**: Dual-contact earclip placed on the **A1** (Left Earlobe).

---

## 3. ThinkGear Packet Protocol Specification

The TGAM1 outputs serial byte streams structured as ThinkGear packets:

| Byte Index | Byte Value | Description |
|:---|:---|:---|
| `0` | `0xAA` | Synchronization Byte 1 |
| `1` | `0xAA` | Synchronization Byte 2 |
| `2` | `[0x00 - 0xAA]` | Payload Length (Number of bytes in payload, max 169) |
| `3 ... N+2` | `Data Bytes` | Payload (Series of Code-Length-Value tuples) |
| `N+3` | `Checksum` | `(~(Sum of Payload Bytes)) & 0xFF` |

### Key Data Codes Parsed
- `0x02` — **Poor Signal Quality**: Range `0` (clean contact) to `200` (electrode off skin).
- `0x80` — **Raw Wave Data**: 2 bytes, 16-bit 2's complement signed integer (-32768 to 32767).
- `0x83` — **ASIC EEG Power**: 24 bytes (8 frequency bands, 3 bytes unsigned big-endian each):
  1. Delta (`0.5 - 2.75 Hz`)
  2. Theta (`3.5 - 6.75 Hz`)
  3. Low Alpha (`7.5 - 9.25 Hz`)
  4. High Alpha (`10.0 - 11.75 Hz`)
  5. Low Beta (`13.0 - 16.75 Hz`)
  6. High Beta (`17.5 - 29.75 Hz`)
  7. Low Gamma (`31.0 - 39.75 Hz`)
  8. Mid Gamma (`41.0 - 49.75 Hz`)

---

## 4. Voltage Conversion Formula

The raw 16-bit signed integer values emitted by TGAM1 are converted to physical voltage in microvolts ($\mu\text{V}$) using:

$$\text{Voltage } (\mu\text{V}) = \frac{\text{RawADC} \times \frac{1.8\text{ V}}{4096}}{2000} \times 10^6$$

Where:
- $1.8\text{ V}$ is the internal ADC reference voltage.
- $4096$ is the 12-bit ADC quantization resolution.
- $2000$ is the internal instrument gain stage.

---

## 5. Academic Limitations & Ethics Notice

1. **Academic/Research Prototype**: This hardware design is intended exclusively for engineering research and academic pattern classification.
2. **Not a Medical Device**: It is **not** FDA/CE cleared, is **not** clinical-grade, and must **never** be used for clinical diagnosis, neurological disorder detection, or treatment monitoring.
3. **Single Channel Boundary**: Single-channel FP1 cannot localize deep cerebral activity or measure localized motor, somatosensory, or occipital visual potentials.
