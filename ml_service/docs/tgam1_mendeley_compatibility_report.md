# LAPORAN PEMERIKSAAN TEKNIS KOMPATIBILITAS FITUR EEG: DATASET MENDELEY DATA VS OUTPUT HARDWARE NEUROSKY TGAM1
## Proyek Tugas Akhir: Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning

- **Penyusun**: Senior Machine Learning Engineer, Embedded Hardware Specialist & Research Assistant
- **Status Dokumen**: Laporan Resmi Audit Kompatibilitas Biosinyal (Hardware & Dataset Compatibility Audit)
- **Tanggal Selesai**: 2 November 2026
- **Acuan Hardware**: [`docs/hardware_tgam1_esp32.md`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/docs/hardware_tgam1_esp32.md) & [`firmware/esp32_tgam1/esp32_tgam1.ino`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/firmware/esp32_tgam1/esp32_tgam1.ino)
- **Acuan Dataset**: Mendeley Data (CUET 2025, DOI: 10.17632/gy4sbnn389.1) via [`ml_service/data/merged_eeg_datas_50_subjects.csv`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/ml_service/data/merged_eeg_datas_50_subjects.csv)

---

## 1. PENDAHULUAN & TUJUAN AUDIT KOMPATIBILITAS

Tujuan utama audit teknis ini adalah memverifikasi secara matematis, fisis, dan arsitektural apakah fitur yang diekstraksi dari **dataset publik Mendeley Data** benar-benar kompatibel dengan **keluaran biosinyal perangkat keras EEG wearable (NeuroSky TGAM1 + ESP32)** yang sedang dibangun.

> [!IMPORTANT]
> **Prinsip Metodologis Utama**: Kita TIDAK BOLEH mengasumsikan bahwa data publik dan keluaran sensor TGAM1 identik secara otomatis tanpa pembuktian protokol paket, rentang frekuensi, satuan daya, dan formula normalisasi.

---

## 2. ASAL-USUL HARDWARE & KANAL ELEKTRODA

Secara arsitektur instrumentasi biomedis, kedua sumber data memiliki kesamaan fondasi sensor:
1. **Sensor Inti**:
   - **Dataset Mendeley**: Direkam menggunakan NeuroSky MindWave Mobile headset.
   - **Prototipe Tugas Akhir**: Menggunakan modul ASIC NeuroSky TGAM1 (ThinkGear-AM R2.8/R2.9) yang terhubung langsung via UART ke ESP32 DevKit V1.
   - *Fakta*: MindWave Mobile secara internal ditenagai oleh chip TGAM1 yang sama persis.
2. **Lokasi Kanal Elektroda (Sistem 10–20 Internasional)**:
   - Kedua sistem menggunakan elektroda tunggal pada posisi **FP1 (Frontal Pole 1)** di dahi kiri depan (~2,5 cm di atas alis).
   - Elektroda referensi (*REF*) dan ground (*GND*) dipasang pada area mastoid/daun telinga.
3. **Jenis Kontak**:
   - Menggunakan *dry electrode* (elektroda kering).

---

## 3. VERIFIKASI PROTOKOL SERIAL & FORMAT PAKET (THINKGEAR PROTOCOL)

Keluaran serial TGAM1 dikirimkan melalui UART (57.600 baud, 8-N-1) dalam struktur biner ThinkGear standar:

```
+------------+------------+----------------+--------------------------+------------+
| Sync 1     | Sync 2     | Payload Length | Payload Data (CLV List)  | Checksum   |
| (0xAA)     | (0xAA)     | (1 byte, <170) | [Code][Length][Value...] | (1 byte)   |
+------------+------------+----------------+--------------------------+------------+
```

### Data Codes yang Relevan:
1. **`0x02` — Poor Signal Quality (1 byte)**:
   - Nilai $0$: Kualitas sinyal kontak sempurna (*good signal*).
   - Nilai $1 - 199$: Derau kontak kulit tinggi / artefak pergerakan.
   - Nilai $200$: Elektroda lepas dari kulit (*lead-off*).
   - *Verifikasi Dataset*: Kolom `neuro_poor_signal_strength` pada Mendeley Data berasal langsung dari kode `0x02` ini. Filtering $0$ pada Phase 1 konsisten dengan sinyal bersih.
2. **`0x80` — Raw Wave Data (2 bytes, 16-bit 2's complement signed integer)**:
   - Dipancarkan pada frekuensi sampling 512 Hz.
   - *Verifikasi Dataset*: Kolom `neuro_raw_eeg` pada Mendeley Data berisi larik 512 integer yang dipancarkan oleh kode `0x80` per detik.
3. **`0x83` — ASIC EEG Power (24 bytes payload)**:
   - Dipancarkan tepat 1 kali per detik (1 Hz).
   - Terdiri dari **8 sub-band ASIC power**, masing-masing dikodekan sebagai **3-byte unsigned integer (big-endian, 24-bit)**:
     $$\text{Value} = (\text{byte}_0 \ll 16) \mid (\text{byte}_1 \ll 8) \mid \text{byte}_2$$
     Rentang nilai teoritis: $0$ hingga $2^{24}-1 = 16.777.215$.

---

## 4. PERBANDINGAN 8 SUB-BAND FREKUENSI & SATUAN UKUR

Terdapat perbedaan penting antara **definisi pita frekuensi klinis standar (textbook)** dengan **definisi perangkat keras ThinkGear ASIC**:

```
+-------------------------------------------------------------------------------------------------------------------------+
|                                    PERBANDINGAN DEFINISI SUB-BAND FREKUENSI                                             |
+----+-------------------+-----------------------+-----------------------------+------------------------------------------+
| No | Sub-band ASIC     | Frekuensi ASIC TGAM1  | Definisi Standar Textbook   | Catatan Rekayasa Perangkat Keras         |
+----+-------------------+-----------------------+-----------------------------+------------------------------------------+
| 1  | Delta             | 0,5 - 2,75 Hz         | 0,5 - 4,0 Hz                | Batas atas terpotong pada 2,75 Hz        |
| -  | (Guard gap)       | 2,75 - 3,50 Hz        | -                           | Celah filter analog ASIC                 |
| 2  | Theta             | 3,5 - 6,75 Hz         | 4,0 - 8,0 Hz                | Sedikit lebih sempit dari standar klinis |
| -  | (Guard gap)       | 6,75 - 7,50 Hz        | -                           | Celah pemisah filter                     |
| 3  | Low Alpha         | 7,5 - 9,25 Hz         | 8,0 - 10,0 Hz               | Sub-band alpha bawah                     |
| -  | (Guard gap)       | 9,25 - 10,00 Hz       | -                           | Celah pemisah filter                     |
| 4  | High Alpha        | 10,0 - 11,75 Hz       | 10,0 - 13,0 Hz              | Sub-band alpha atas                      |
| -  | (Guard gap)       | 11,75 - 13,00 Hz      | -                           | Celah pemisah filter                     |
| 5  | Low Beta          | 13,0 - 16,75 Hz       | 13,0 - 20,0 Hz              | Sub-band beta bawah                      |
| -  | (Guard gap)       | 16,75 - 17,50 Hz      | -                           | Celah pemisah filter                     |
| 6  | High Beta         | 17,5 - 29,75 Hz       | 20,0 - 30,0 Hz              | Sub-band beta atas                       |
| -  | (Guard gap)       | 29,75 - 31,00 Hz      | -                           | Celah pemisah filter                     |
| 7  | Low Gamma         | 31,0 - 39,75 Hz       | 30,0 - 40,0 Hz              | Sub-band gamma bawah                     |
| -  | (Guard gap)       | 39,75 - 41,00 Hz      | -                           | Celah pemisah filter                     |
| 8  | Mid Gamma         | 41,0 - 49,75 Hz       | 40,0 - 50,0 Hz              | Dihentikan sebelum notch powerline 50 Hz |
+----+-------------------+-----------------------+-----------------------------+------------------------------------------+
```

### Satuan Ukur (Units):
- **Bukan Microvolt ($\mu\text{V}$)**: Nilai 8 sub-band ASIC ini **BUKAN** amplitudo tegangan dalam $\mu\text{V}$, melainkan **daya spektral relatif internal ASIC (dimensionless arbitrary power units)** yang proporsional terhadap magnitudo kuadrat spektrum FFT internal chip TGAM1 ($\propto \mu\text{V}^2/\text{Hz}$).
- Tegangan fisik $\mu\text{V}$ hanya dapat dihitung dari sinyal mentah kode `0x80` melalui rumus:
  $$\text{Tegangan } (\mu\text{V}) = \frac{\text{RawADC} \times \frac{1,8\text{ V}}{4096}}{2000} \times 10^6$$

---

## 5. RUMUS PEMETAAN 8 SUB-BAND MENJADI 5 RELATIVE BAND POWER

Berdasarkan audit data baris pertama Mendeley Data:
$$\text{Delta}=1.572.864, \quad \text{Theta}=11.665.664, \quad \text{LoAlpha}=15.269.888, \quad \text{HiAlpha}=11.272.192$$
$$\text{LoBeta}=8.192.000, \quad \text{HiBeta}=6.356.992, \quad \text{LoGamma}=14.090.240, \quad \text{MidGamma}=11.404.037$$

Total daya spektral 8 pita:
$$P_{\text{total}} = \sum_{k=1}^8 P_k = 79.823.877$$

Rumus agregasi dan normalisasi menjadi 5 fitur standar:

$$\text{Total Power} = P_{\text{delta}} + P_{\text{theta}} + P_{\text{loAlpha}} + P_{\text{hiAlpha}} + P_{\text{loBeta}} + P_{\text{hiBeta}} + P_{\text{loGamma}} + P_{\text{midGamma}}$$

1. **Relative Delta (%)**:
   $$\text{neuro\_relative\_delta} = \frac{P_{\text{delta}}}{P_{\text{total}}} \times 100 = \frac{1.572.864}{79.823.877} \times 100 = 1,97\%$$

2. **Relative Theta (%)**:
   $$\text{neuro\_relative\_theta} = \frac{P_{\text{theta}}}{P_{\text{total}}} \times 100 = \frac{11.665.664}{79.823.877} \times 100 = 14,61\%$$

3. **Relative Alpha (%)**:
   $$\text{neuro\_relative\_alpha} = \frac{P_{\text{loAlpha}} + P_{\text{hiAlpha}}}{P_{\text{total}}} \times 100 = \frac{15.269.888 + 11.272.192}{79.823.877} \times 100 = 33,25\%$$

4. **Relative Beta (%)**:
   $$\text{neuro\_relative\_beta} = \frac{P_{\text{loBeta}} + P_{\text{hiBeta}}}{P_{\text{total}}} \times 100 = \frac{8.192.000 + 6.356.992}{79.823.877} \times 100 = 18,23\%$$

5. **Relative Gamma (%)**:
   $$\text{neuro\_relative\_gamma} = \frac{P_{\text{loGamma}} + P_{\text{midGamma}}}{P_{\text{total}}} \times 100 = \frac{14.090.240 + 11.404.037}{79.823.877} \times 100 = 31,94\%$$

Hasil perhitungan di atas **tepat identik 100%** dengan kolom `neuro_relative_delta`, `neuro_relative_theta`, `neuro_relative_alpha`, `neuro_relative_beta`, dan `neuro_relative_gamma` pada file dataset Mendeley.

---

## 6. TEMUAN KESENJANGAN & KEBUTUHAN ADAPTASI FIRMWARE / BACKEND

Dari audit kode firmware ESP32 aktual ([`esp32_tgam1.ino`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/firmware/esp32_tgam1/esp32_tgam1.ino)), ditemukan kesenjangan implementasi berikut:

1. **Format Transmisi ESP32 Saat Ini**:
   Pada fungsi `sendBatch()` baris 417–424, ESP32 menjumlahkan:
   - `alpha = lowAlpha + highAlpha` (integer)
   - `beta  = lowBeta + highBeta` (integer)
   - `gamma = lowGamma + midGamma` (integer)
   Namun ESP32 mengirimkan nilai integer daya mentah (belum dibagi dengan $P_{\text{total}}$).
2. **Kebutuhan Adaptasi**:
   Agar kompatibel dengan model machine learning SVM yang telah dilatih:
   - Lapisan Gateway (ESP32 atau Go Backend) **wajib menghitung persentase relatif ($P / P_{\text{total}} \times 100$)** sebelum meneruskan vektor 5 dimensi ke layanan inferensi Python `ml_service`.
   - Vektor inferensi real-time harus berupa larik 5 elemen:
     $$\mathbf{x} = [\text{delta}\%, \text{theta}\%, \text{alpha}\%, \text{beta}\%, \text{gamma}\%]$$
3. **Penyaringan Sinyal Kualitas Buruk**:
   Firmware ESP32 atau Backend harus membuang paket pembacaan saat `signal_quality > 0`, persis seperti tahap preprocessing eksklusi pada Phase 1.

---

## 7. KETERBATASAN FISIOLOGIS: CLOSED-EYES VS OPEN-EYES (BERGER EFFECT)

Dokumentasi penelitian Kolokium harus mencatat batasan fisiologis ini secara jujur:
- **Kondisi Resting (Task 1)**: Subjek diinstruksikan menutup mata (*eyes-closed relaxation*).
- **Kondisi Mathematical Task (Task 2 & 3)**: Subjek diinstruksikan membuka mata dan melihat layar untuk membaca dan menyelesaikan soal aritmatika (*eyes-open problem solving*).
- **Implikasi Fisiologis (*Berger Effect* / *Alpha Attenuation*)**:
  Membuka mata secara alami memicu desinkronisasi ritme alfa (*alpha blocking*), sedangkan kedipan mata (*eye-blinks*) dan gerakan otot dahi (*frontalis electromyogram / EMG*) dapat menyusup ke elektroda dahi FP1 pada pita frekuensi Delta dan Beta/Gamma.
- **Batasan Klaim Ilmiah**:
  Oleh karena itu, model klasifikasi ini **TIDAK BOLEH diklaim sebagai pengukur tingkat konsentrasi atau fokus secara murni**. Model ini secara objektif adalah **klasifikator pola spektral elektroensefalogram frontal terhadap kondisi eksperimen spesifik (Resting mata tertutup vs Pengerjaan Soal mata terbuka)**.

