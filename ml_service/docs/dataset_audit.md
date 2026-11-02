# LAPORAN AUDIT DATASET DAN EVALUASI METODOLOGIS MACHINE LEARNING
## Proyek Tugas Akhir: Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning

- **Penyusun**: Senior Machine Learning Engineer & Research Assistant (Tugas Akhir Renaldi)
- **Status Dokumen**: Laporan Audit Resmi Tahap 1 (Pre-Training Phase)
- **Tanggal Audit**: 2 November 2026
- **Lokasi Dataset**: `ml_service/data/merged_eeg_datas_50_subjects.csv`
- **Metrik Komputasional**: `ml_service/docs/dataset_audit_metrics.json`
- **Data Provenance / Flagging**: `ml_service/reports/row_flags.csv` (2.970 baris teranotasi)

---

## 1. IDENTITAS DAN SUMBER DATASET

| Parameter | Informasi Resmi | Catatan Verifikasi |
| :--- | :--- | :--- |
| **Nama File** | `merged_eeg_datas_50_subjects.csv` | Ukuran file: 19.029.871 bytes (~19,03 MB) |
| **Sumber / Repositori** | Mendeley Data | Chittagong University of Engineering and Technology (CUET), Bangladesh |
| **Identifier Digital (DOI)**| `10.17632/gy4sbnn389.1` | Tercatat pada rujukan Mendeley Data (Versi 1, 2025) |
| **Lisensi** | Creative Commons Attribution 4.0 International (CC BY 4.0) | Penggunaan akademik & modifikasi diizinkan dengan atribusi |
| **Kanal EEG** | Kanal Tunggal Monopolar (FP1 - Prefrontal Kiri) | Elektroda dahi, referensi di telinga/mastoid |
| **Perangkat Sumber** | NeuroSky MindWave Mobile | Menggunakan ASIC NeuroSky TGAM1 yang setara dengan modul prototipe hardware |

---

## 2. TABEL KOMPARASI: INFORMASI AWAL VS HASIL AUDIT EMPIRIS AKTUAL

Sebelum melakukan modifikasi kode atau perancangan model, dilakukan audit komputasional menyeluruh berbasis script Python (`audit_dataset.py`). Ditemukan beberapa diskrepansi signifikan antara informasi awal dan fakta empiris dataset:

| Aspek | Informasi Identifikasi Awal | Fakta Empiris Audit Aktual | Konsekuensi & Keputusan Metodologis |
| :--- | :--- | :--- | :--- |
| **Jumlah Subjek** | 50 subjek | **51 subjek unik** (`student_id` bernilai unik 51) | 50 subjek menyelesaikan 3 task secara lengkap. Tepat **1 subjek** (`student_id = 1911019`) hanya memiliki data Task 1 (61 detik). |
| **Nilai Target `task_id`** | `0`, `0.5`, `1` | Berupa string integer: `'1'`, `'2'`, `'3'` | Jangan mengasumsikan nilai float `0, 0.5, 1`. Label task adalah kategori nominal 1 (Resting), 2 (Medium Math), 3 (Hard Math). |
| **Panjang Sampel Raw EEG** | Diindikasikan 512 Hz konstan per detik | **Bervariasi secara ekstrem** (468 s.d. 1.536 sampel per detik) | Hanya 5.481 baris (66,4%) yang memiliki tepat 512 sampel. Terjadi packet buffering/jitter pada serial logger Mendeley. Resampling / validasi panjang sinyal wajib dilakukan jika mengolah raw waveform. |
| **Target Bawaan `neuro_dominan_rhythm`** | Dianggap potensi target klasifikasi | **99,66% identik dengan `argmax` relative power** | **Tautologi murni / Circular labeling!** Jika digunakan, model hanya meniru fungsi argmax. Target ini **RESMI DITOLAK**. |
| **Duplikasi Data** | Belum diidentifikasi | Teridentifikasi **574 baris duplikat identik** | Duplikat terjadi akibat sensor freeze/buffer replay. Wajib diflag agar tidak mengotori fold evaluasi. |
| **Kualitas Kontak Sensor** | Belum diidentifikasi | **237 baris** memiliki sinyal buruk (`poor_signal > 0`), 157 di antaranya saturasi total (`poor_signal = 200`) | Baris dengan kontak buruk ditandai pada `row_flags.csv` untuk dieksklusikan dari subset training. |
| **Missing Values** | Belum diidentifikasi | **0 missing values** (100% lengkap di 23 kolom) | Tidak memerlukan imputasi nilai hilang. |

---

## 3. STRUKTUR DATA DAN KAMUS KOLOM (23 KOLOM)

Audit memastikan dataset memiliki tepat **8.249 baris** dan **23 kolom**:

```
+----------------------------------------------------------------------------------------------------+
|                                      KAMUS KOLOM DATASET AKTUAL                                    |
+----+-------------------------------+--------------+------------------------------------------------+
| No | Nama Kolom                    | Tipe Data    | Deskripsi Fungsional & Status                  |
+----+-------------------------------+--------------+------------------------------------------------+
| 0  | task_id                       | String/Int   | Kondisi eksperimen ('1', '2', '3') -> KANDIDAT |
| 1  | student_id                    | Integer      | ID unik partisipan (Grouping Key CV, BUKAN X)  |
| 2  | neuro_delta                   | Float (ASIC) | Daya pita Delta mentah chip (0.5–4 Hz) 24-bit  |
| 3  | neuro_theta                   | Float (ASIC) | Daya pita Theta mentah chip (4–8 Hz) 24-bit    |
| 4  | neuro_loAlpha                 | Float (ASIC) | Daya pita Low Alpha mentah chip (8–10 Hz)      |
| 5  | neuro_hiAlpha                 | Float (ASIC) | Daya pita High Alpha mentah chip (10–13 Hz)    |
| 6  | neuro_loBeta                  | Float (ASIC) | Daya pita Low Beta mentah chip (13–18 Hz)      |
| 7  | neuro_hiBeta                  | Float (ASIC) | Daya pita High Beta mentah chip (18–30 Hz)     |
| 8  | neuro_loGamma                 | Float (ASIC) | Daya pita Low Gamma mentah chip (30–40 Hz)     |
| 9  | neuro_midGamma                | Float (ASIC) | Daya pita Mid Gamma mentah chip (40–50 Hz)     |
| 10 | neuro_attention               | Integer      | Nilai algoritma proprietary eSense (0-100)     |
| 11 | neuro_meditation              | Integer      | Nilai algoritma proprietary eSense (0-100)     |
| 12 | neuro_poor_signal_strength    | Integer      | Kualitas kontak (0=Baik, 200=Lepas/No Contact) |
| 13 | neuro_raw_eeg                 | JSON Array   | Deret tegangan ADC mentah domain waktu         |
| 14 | neuro_relative_delta          | Float (%)    | Persentase daya Delta relatif (0–100%)         |
| 15 | neuro_relative_theta          | Float (%)    | Persentase daya Theta relatif (0–100%)         |
| 16 | neuro_relative_alpha          | Float (%)    | Persentase daya Alpha relatif (0–100%)         |
| 17 | neuro_relative_beta           | Float (%)    | Persentase daya Beta relatif (0–100%)          |
| 18 | neuro_relative_gamma          | Float (%)    | Persentase daya Gamma relatif (0–100%)         |
| 19 | neuro_dominan_rhythm          | String       | Label dominan bawaan (DITOLAK: Tautologi)      |
| 20 | workload_score                | Float        | Skor evaluasi kognitif subjektif (DILARANG: Lk)|
| 21 | is_correct                     | Integer      | Akurasi jawaban matematika kuis (DILARANG: Lk) |
| 22 | created_at                     | String (Time)| Timestamp logging software bridge (DILARANG:Lk)|
+----+-------------------------------+--------------+------------------------------------------------+
```

---

## 4. DISTRIBUSI DATA DAN STATISTIK DESKRIPTIF

### A. Distribusi Kondisi Eksperimen (`task_id`)
- **Task 1 (Resting Baseline / Closed-eye Relaxation)**: 2.757 detik (33,42%)
- **Task 2 (Medium Mathematical Task)**: 2.359 detik (28,60%)
- **Task 3 (Hard Mathematical Task)**: 3.133 detik (37,98%)
- **Total Sampel**: 8.249 baris (8.249 detik ~ 137,5 menit total rekaman).
- *Analisis*: Keseimbangan kelas antar-task tergolong sangat wajar untuk eksperimen kognitif terstruktur (rasio kelas terkecil:terbesar = 1 : 1,33).

### B. Cakupan Partisipan (`student_id`)
- Jumlah subjek: 51 orang.
- **50 subjek** memiliki data lengkap untuk ketiga task (Task 1, 2, dan 3).
- **1 subjek** (`student_id = 1911019`) hanya memiliki Task 1 (61 detik).
- Durasi perekaman per subjek:
  - Minimum: 61 detik (Subjek 1911019)
  - Median: 156 detik (~2,6 menit)
  - Rata-rata: 161,7 detik
  - Maksimum: 540 detik (9 menit)

### C. Ringkasan Statistik Fitur Relatif Spektral (`neuro_relative_*`)

| Fitur Band Relatif | Mean (%) | Std Dev (%) | Min (%) | Median (%) | Max (%) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `neuro_relative_delta` | 2,79 | 1,38 | 1,53 | 2,62 | 99,99 (Outlier) |
| `neuro_relative_theta` | 14,26 | 9,30 | 0,00 | 14,08 | 96,00 |
| `neuro_relative_alpha` | 27,66 | 10,32 | 0,00 | 27,67 | 69,80 |
| `neuro_relative_beta` | 27,56 | 10,33 | 0,00 | 27,78 | 71,27 |
| `neuro_relative_gamma` | 27,73 | 10,30 | 0,00 | 27,88 | 74,07 |

*Observasi Ilmiah*:
1. Rata-rata daya relatif Alpha, Beta, dan Gamma berada di kisaran ~27%, menunjukkan modulasi energi spektral yang dinamis pada elektroda frontal FP1 saat pengerjaan tugas kognitif.
2. Terdapat nilai ekstrem pada `neuro_relative_delta` sebesar 99,99% yang bertepatan dengan hilangnya kontak elektroda (`poor_signal_strength = 200`), membuktikan pentingnya filter kualitas sinyal.

---

## 5. AUDIT MUTU DATA & LIMA TEMUAN ANOMALI KRITIS

### Anomali 1: Tautologi Fatal (*Circular Labeling*) pada `neuro_dominan_rhythm`
- Pengujian komputasional menunjukkan **8.221 dari 8.249 baris (99,66%)** memiliki nilai `neuro_dominan_rhythm` yang identik dengan indeks nilai maksimum dari kelima kolom relative band power:
  $$\text{neuro\_dominan\_rhythm} \equiv \arg\max_{b \in \{\delta, \theta, \alpha, \beta, \gamma\}} (\text{neuro\_relative\_}b)$$
- **Bahaya Ilmiah**: Jika seorang peneliti melatih SVM dengan fitur relative band power untuk memprediksi `neuro_dominan_rhythm`, model SVM tidak belajar pola biologis gelombang otak, melainkan **hanya meniru fungsi matematika $\arg\max$**. Akurasi 99% yang dihasilkan adalah ilusi metodologis (*pseudo-accuracy*).
- **Keputusan**: `neuro_dominan_rhythm` **DITOLAK SECARA MUTLAK** sebagai target klasifikasi.

### Anomali 2: Fluktuasi Panjang Deret Raw Time-Series (`neuro_raw_eeg`)
- Panjang array raw time-series per baris (1 detik) tidak konstan:
  - 512 sampel: 5.481 baris (66,4%)
  - 1.024 sampel: 276 baris (akumulasi 2 detik dalam 1 paket)
  - 1.536 sampel: 432 baris (akumulasi 3 detik dalam 1 paket)
  - 468 - 511 sampel: 2.060 baris (fluktuasi jitter transmisi)
- **Implikasi**: Logger dataset Mendeley mengalami latency serial/Bluetooth. Oleh karena itu, ekstraksi FFT mentah langsung tanpa penanganan panjang sinyal akan menghasilkan resolusi frekuensi ($\Delta f$) yang tidak seragam antar-baris. Pendekatan ekstraksi fitur harus memprioritaskan fitur spektral ASIC bawaan yang konsisten atau melakukan standardisasi window 512 sampel.

### Anomali 3: Duplikasi Data Identik (574 Baris)
- Teridentifikasi 574 baris rekaman yang identik persis pada seluruh nilai fiturnya. Hal ini terjadi saat transmisi nirkabel MindWave mengalami timeout dan driver logging mengulang paket data sebelumnya.
- **Tindakan**: Baris-baris ini telah ditandai pada `ml_service/reports/row_flags.csv` dengan flag `DUPLICATE_RECORD`.

### Anomali 4: Kontak Buruk & Saturasi ADC (237 Baris)
- Sebanyak 157 baris memiliki `poor_signal_strength = 200` (elektroda tidak menempel pada kulit), dan 80 baris lainnya memiliki kontak parsial (`poor_signal > 0`).
- Pada kondisi ini, nilai raw ADC sering kali membeku pada level batas minimum ($-2048$), yang menghasilkan distorsi spektral artifisial.
- **Tindakan**: Ditandai pada `row_flags.csv` dengan flag `POOR_SIGNAL_*` dan `ADC_SATURATION_NEG2048`.

### Anomali 5: Partisipan Tidak Lengkap (Subjek 1911019)
- Subjek `1911019` hanya terekam pada Task 1 (61 baris) dan tidak memiliki data Task 2 maupun Task 3.
- Mengikutsertakan subjek ini pada model multiclass tanpa penanganan khusus akan menyebabkan ketidakseimbangan per subjek.

---

## 6. ANALISIS RISIKO DATA LEAKAGE & KOLOM TERLARANG

Untuk menjamin integritas akademik Tugas Akhir di hadapan Dosen Penguji, kolom dataset diklasifikasikan secara ketat:

```
+----------------------------------------------------------------------------------------------------+
|                                    MATRIKS PERIZINAN PENGGUNAAN KOLOM                              |
+------------------------------+------------------------------------+--------------------------------+
| Nama Kolom                   | Status dalam Pipeline ML           | Alasan Akademik & Metodologis  |
+------------------------------+------------------------------------+--------------------------------+
| neuro_delta, neuro_theta,    | DIIZINKAN (Input Features)         | Parameter spektral fisiologis  |
| neuro_lo/hiAlpha, lo/hiBeta, |                                    | langsung dari sensor hardware  |
| neuro_lo/midGamma            |                                    | ASIC ThinkGear TGAM1.          |
+------------------------------+------------------------------------+--------------------------------+
| neuro_relative_delta, theta, | DIIZINKAN (Input Features)         | Representasi daya relatif      |
| alpha, beta, gamma           |                                    | normalisasi spektrum (0-100%). |
+------------------------------+------------------------------------+--------------------------------+
| student_id                   | HANYA UNTUK GROUPING CV            | Mencegah kebocoran data antar- |
|                              | (DILARANG JADI FITUR INPUT X)      | subjek (Subject Leakage).      |
+------------------------------+------------------------------------+--------------------------------+
| neuro_poor_signal_strength   | HANYA UNTUK FILTERING DATA         | Digunakan menyaring data kotor |
|                              | (DILARANG JADI FITUR INPUT X)      | sebelum pelatihan.             |
+------------------------------+------------------------------------+--------------------------------+
| neuro_dominan_rhythm         | DILARANG MUTLAK                    | Tautologi murni dari argmax.   |
+------------------------------+------------------------------------+--------------------------------+
| workload_score               | DILARANG MUTLAK                    | Target kuesioner eksternal.    |
+------------------------------+------------------------------------+--------------------------------+
| is_correct                   | DILARANG MUTLAK                    | Hasil tes matematika subjek.   |
+------------------------------+------------------------------------+--------------------------------+
| created_at                   | DILARANG MUTLAK                    | Kebocoran urutan waktu rekaman.|
+------------------------------+------------------------------------+--------------------------------+
| MAX30102 (BPM / SpO2)        | DILARANG (Sesuai Batasan Masalah)  | Fokus TA adalah biosinyal EEG. |
+------------------------------+------------------------------------+--------------------------------+
```

---

## 7. FAKTOR PEMBAUR FISIOLOGIS (*CONFOUNDING FACTORS*)

Salah satu aspek penting yang sering diuji oleh dosen penguji pada sidang kolokium adalah kemampuan mahasiswa membedakan antara respon kognitif murni dan artefak fisiologis:

### A. Fenomena *Berger Effect* (Mata Tertutup vs Mata Terbuka)
- **Dasar Teori**: Pada kondisi mata tertutup (*closed eyes*), ritme Alpha ($8-13\text{ Hz}$) mengalami sinkronisasi kortikal yang sangat kuat (*Alpha synchronization*). Begitu mata dibuka (*open eyes*), terjadi desinkronisasi atau pemblokiran Alpha (*Alpha desynchronization / blocking*).
- **Kondisi Dataset**:
  - Task 1 dilakukan dalam kondisi **Mata Tertutup** (relaksasi 60 detik).
  - Task 2 dan Task 3 dilakukan dalam kondisi **Mata Terbuka** (membaca soal di layar).
- **Risiko Metodologis**: Perbedaan spektral yang dipelajari model SVM antara Task 1 dan Task 2/3 berpotensi besar merefleksikan pembukaan kelopak mata (*Berger Effect*) dan artefak ocular (kedipan mata di dahi FP1), bukan semata-mata "beban berpikir matematika".
- **Pertanggungjawaban Ilmiah untuk Kolokium**:
  Mahasiswa **wajib secara transparan menyampaikan batasan ini**: model mengklasifikasikan *kondisi eksperimen terstruktur multivariat*, bukan "mengukur kecerdasan atau beban kognitif murni tanpa pembaur".

### B. Variabilitas Antar-Subjek (*Inter-Subject Variability*)
- Struktur tengkorak, ketebalan tulang kepala, dan impedansi kulit setiap manusia sangat berbeda, menyebabkan amplitudo mutlak ($\mu\text{V}$) bervariasi drastis antar-individu.
- **Mitigasi Wajib**:
  1. Menggunakan fitur **relative band power** (persentase) agar terskala secara dinamis terhadap total energi spektral masing-masing individu.
  2. Menggunakan strategi validasi **GroupKFold** (berbasis `student_id`), di mana data dari subjek yang sama tidak boleh muncul sekaligus di training set dan test set.

---

## 8. EVALUASI DAN PERBANDINGAN KANDIDAT TARGET KLASIFIKASI

Berdasarkan struktur data aktual, terdapat dua alternatif target klasifikasi yang dapat dipertanggungjawabkan secara akademik:

```
+----------------------------------------------------------------------------------------------------+
|                         PERBANDINGAN KANDIDAT TARGET KLASIFIKASI UNTUK KOLOKIUM                    |
+------------------------------+------------------------------------+--------------------------------+
| Parameter Evaluasi           | Alternatif A: Binary Classification| Alternatif B: Three-Class      |
|                              | (Resting vs Mental Workload)       | (Resting vs Medium vs Hard)    |
+------------------------------+------------------------------------+--------------------------------+
| Definisi Kelas               | Kelas 0: Task 1 (Resting Baseline) | Kelas 0: Task 1 (Resting Base) |
|                              | Kelas 1: Task 2 & 3 (Mental Math)  | Kelas 1: Task 2 (Medium Math)  |
|                              |                                    | Kelas 2: Task 3 (Hard Math)    |
+------------------------------+------------------------------------+--------------------------------+
| Jumlah Sampel                | Kelas 0: 2.757 (33,4%)             | Kelas 0: 2.757 (33,4%)         |
|                              | Kelas 1: 5.492 (66,6%)             | Kelas 1: 2.359 (28,6%)         |
|                              |                                    | Kelas 2: 3.133 (38,0%)         |
+------------------------------+------------------------------------+--------------------------------+
| Keseimbangan Kelas           | Agak timpang (1 : 2)               | Lebih seimbang (~1 : 1 : 1,3)  |
|                              | Butuh class_weight='balanced'      | Lebih natural bagi balanced CV |
+------------------------------+------------------------------------+--------------------------------+
| Kompleksitas Model SVM       | Rendah (1 Hyperplane pemisah)      | Sedang (One-vs-One / OvR)      |
+------------------------------+------------------------------------+--------------------------------+
| Separabilitas Fisiologis     | **Sangat Tinggi** (Perbedaan pola  | **Rendah pada Task 2 vs 3**    |
|                              | relaksasi vs aktivitas berpikir    | Perbedaan spektral antara soal |
|                              | sangat kontras secara spektral)    | matematika sedang dan sulit    |
|                              |                                    | pada 1 kanal FP1 sangat halus. |
+------------------------------+------------------------------------+--------------------------------+
| Kemudahan Menjelaskan        | **Sangat Mudah & Kokoh**:          | Lebih rentan pertanyaan kritis |
| di Sidang Kolokium           | "Sistem membedakan kondisi istirahat| mengenai mengapa Task 2 dan 3 |
|                              | vs kondisi berpikir aktif."        | saling tertukar/bingung.       |
+------------------------------+------------------------------------+--------------------------------+
| Kesesuaian Judul TA          | Sangat Sesuai (Klasifikasi pola    | Sangat Sesuai (Klasifikasi pola|
|                              | kondisi mental rileks vs aktif).   | bertingkat kondisi kognitif).  |
+------------------------------+------------------------------------+--------------------------------+
```

### REKOMENDASI KEPUTUSAN UNTUK MAHASISWA DAN DOSEN PEMBIMBING:

1. **Rekomendasi Target Utama: KANDIDAT A (Binary Classification: Resting vs Mental Math Task)**
   - **Alasan Akademis**:
     - Kanal tunggal FP1 memiliki resolusi spasial terbatas. Membedakan kondisi *Resting* (Alpha dominan / sinkronisasi korteks posterior) dengan *Active Math* (Beta/Gamma meningkat, Alpha supresi) memiliki dasar fisiologis neurologi yang sangat kuat dan mapan dalam literatur BCI (Brain-Computer Interface).
     - Memaksakan pemisahan antara Medium Math dan Hard Math pada satu elektroda dahi sangat rentan menghasilkan performa rendah (kebingungan klasifikasi di confusion matrix antara kelas 1 dan 2) karena respon kognitif terhadap tingkat kesulitan soal sangat subjektif bagi masing-masing mahasiswa.
2. **Opsi Pengembangan Sekunder: Evaluasi Eksploratif KANDIDAT B (Three-Class)**
   - Sebagai nilai tambah pada laporan Kolokium, kita dapat menyajikan hasil perbandingan: menunjukkan bahwa pembedaan kondisi istirahat vs aktif (Biner) berhasil dengan konsisten, sedangkan pembedaan beban tingkat kesulitan (3-Kelas) disajikan secara ilmiah sebagai studi batas kemampuan (*boundary analysis*) sensor kanal tunggal FP1.

---

## 9. KESIMPULAN AUDIT & CHECKLIST KESIAPAN MENUJU PHASE 2

Audit Tahap 1 telah berhasil mengungkap fakta empiris dataset Mendeley, membongkar tautologi *circular labeling* yang sebelumnya berisiko fatal, mengidentifikasi 574 baris duplikat, dan mengamankan pemisahan data berbasis 51 subjek.

### Status Output Tahap 1:
- [x] File dataset aktual ditemukan dan disalin ke `ml_service/data/merged_eeg_datas_50_subjects.csv` (19.03 MB).
- [x] Script audit komputasional selesai dieksekusi: `ml_service/audit_dataset.py`.
- [x] File metrik audit tersimpan lengkap: `ml_service/docs/dataset_audit_metrics.json`.
- [x] File data provenance / penanda mutu tersimpan: `ml_service/reports/row_flags.csv` (2.970 baris teranotasi).
- [x] Laporan audit komprehensif selesai disusun: `ml_service/docs/dataset_audit.md`.

Dokumen ini siap ditinjau oleh Mahasiswa dan siap dikonsultasikan kepada Dosen Pembimbing sebelum memulai implementasi Phase 2 (Preprocessing, GroupKFold Splitting, dan Training SVM).

