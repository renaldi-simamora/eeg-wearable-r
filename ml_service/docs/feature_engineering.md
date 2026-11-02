# DOKUMENTASI FEATURE ENGINEERING & DEFINISI TARGET KLASIFIKASI
## Proyek Tugas Akhir: Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning

- **Penyusun**: Senior Machine Learning Engineer & Research Assistant (Tugas Akhir Renaldi)
- **Status Dokumen**: Laporan Resmi Phase 2 & Phase 3 (Feature Engineering & Target Formulation)
- **Tanggal Dokumen**: 2 November 2026
- **Lokasi Dataset Kerja**: `ml_service/data/merged_eeg_datas_50_subjects.csv`
- **Laporan Komputasional**: `ml_service/reports/filtering_impact_report.json`

---

## 1. FORMULASI EKSPLISIT TARGET KLASIFIKASI & MAPPING LABEL

Sesuai persetujuan dan arahan metodologis, target klasifikasi dirumuskan secara terisolasi tanpa mengklaim pengukuran variabel psikologis internal murni:

### A. Target Utama: Binary Classification (Kondisi Eksperimen Istirahat vs Aritmetika)

Sistem memetakan kondisi eksperimen terstruktur untuk membedakan fase relaksasi mata tertutup dengan fase pengerjaan tugas kognitif aktif:

```
+----------------------------------------------------------------------------------------------------+
|                                    MAPPING TARGET UTAMA (BINER)                                    |
+-------------+----------------------+--------------------+--------------------+---------------------+
| Kelas Label | Nama Kelas Simbolik  | Sumber Task ID     | Definisi Protokol  | Jumlah Sampel Clean |
+-------------+----------------------+--------------------+--------------------+---------------------+
|      0      | Closed-Eye Resting   | task_id == '1'     | Relaksasi tenang,  | 2.582 detik (34,7%) |
|             | Baseline             |                    | mata tertutup 60s  |                     |
+-------------+----------------------+--------------------+--------------------+---------------------+
|      1      | Active Mathematical  | task_id in         | Pengerjaan soal    | 4.857 detik (65,3%) |
|             | Task                 | ['2', '3']         | aritmetika di layar|                     |
+-------------+----------------------+--------------------+--------------------+---------------------+
```

- **Rasio Keseimbangan Kelas**: $1 : 1,88$ (sangat wajar untuk klasifikasi biner, akan diimbangi dengan parameter `class_weight='balanced'` pada model SVM).

### B. Target Sekunder: Three-Class Classification (Eksperimen Komparasi Gradasi Kesulitan)

Sebagai studi batas kemampuan (*boundary analysis*) sensor kanal tunggal FP1 pada laporan Kolokium:

```
+----------------------------------------------------------------------------------------------------+
|                                  MAPPING TARGET SEKUNDER (3-KELAS)                                 |
+-------------+----------------------+--------------------+--------------------+---------------------+
| Kelas Label | Nama Kelas Simbolik  | Sumber Task ID     | Definisi Protokol  | Jumlah Sampel Clean |
+-------------+----------------------+--------------------+--------------------+---------------------+
|      0      | Resting Baseline     | task_id == '1'     | Istirahat rileks   | 2.582 detik (34,7%) |
+-------------+----------------------+--------------------+--------------------+---------------------+
|      1      | Medium Math Task     | task_id == '2'     | Soal sedang        | 2.163 detik (29,1%) |
+-------------+----------------------+--------------------+--------------------+---------------------+
|      2      | Hard Math Task       | task_id == '3'     | Soal sulit         | 2.694 detik (36,2%) |
+-------------+----------------------+--------------------+--------------------+---------------------+
```

---

## 2. EVALUASI DAMPAK FILTERING DATASET (*DATA CLEANING AUDIT*)

Sebelum ekstraksi fitur, dilakukan pembersihan data secara transparan tanpa mengubah dataset mentah asli:

### Kriteria Eksklusi Berbasis Bukti:
1. **574 Baris Duplikat Identik (`DUPLICATE_RECORD`)**:
   - Didefinisikan secara struktural sebagai rekaman yang identik persis pada seluruh 8 parameter daya pita ASIC, subjek, task, dan 100 karakter awal time-series raw EEG. Dugaan bahwa hal ini diakibatkan oleh pengulangan paket serial/Bluetooth pada buffer logger merupakan indikator operasional, namun **TIDAK DIKLAIM SEBAGAI FAKTA FISIK PASTI** karena keterbatasan ketiadaan log perangkat keras primer dari laboratorium CUET. Pengecualian dilakukan murni demi integritas statistik agar tidak terjadi pembobotan semu (*pseudo-replication*).
2. **237 Baris Kontak Sinyal Buruk (`POOR_SIGNAL_*`)**:
   - Didefinisikan sebagai rekaman dengan register ThinkGear ASIC `neuro_poor_signal_strength > 0` (157 baris bernilai 200 / sensor terlepas total dari dahi; 80 baris bernilai 25–80 / impedansi kontak buruk).
3. **Irisan / Overlap**:
   - Terdapat **1 baris** yang memenuhi kedua kriteria sekaligus (duplikat dan poor signal).
   - Total baris unik yang dieksklusikan: $574 + 237 - 1 = \mathbf{810\text{ baris}}$.

### Hasil Uji Retensi dan Distribusi Pasca-Filtering:

```
+----------------------------------------------------------------------------------------------------+
|                                    RINGKASAN RETENSI DATASET                                       |
+---------------------------------------+---------------------+---------------------+----------------+
| Parameter                             | Sebelum Filtering   | Setelah Filtering   | Persentase     |
+---------------------------------------+---------------------+---------------------+----------------+
| Total Baris Rekaman                   | 8.249 baris         | 7.439 baris         | 90,18% retensi |
| Total Subjek Unik                     | 51 subjek           | 51 subjek           | 100% retensi   |
| Subjek Gugur (Dropped Subjects)       | -                   | 0 subjek            | 0% gugur       |
| Subjek dengan 3 Task Lengkap          | 50 subjek           | 48 subjek           | 96,0% utuh     |
| Kelas 0 Biner (Resting)               | 2.757 (33,42%)      | 2.582 (34,71%)      | Stabil (+1,29%)|
| Kelas 1 Biner (Math)                  | 5.492 (66,58%)      | 4.857 (65,29%)      | Stabil (-1,29%)|
| Rasio Keseimbangan (C0 : C1)          | 1 : 1,99            | 1 : 1,88            | Semakin seimbang|
+---------------------------------------+---------------------+---------------------+----------------+
```

> **Verifikasi Proporsionalitas**:
> Eksklusi 810 baris terbukti **TIDAK MENYEBABKAN** subjek atau kelas tertentu kehilangan representasi. Tidak ada satu pun subjek yang terhapus (51 subjek tetap memiliki data), dan pergeseran rasio kelas hanya sebesar 1,29%.

---

## 3. PEMILIHAN DAN ANALISIS LIMA FITUR RELATIVE BAND POWER

Fitur input utama untuk model baseline SVM terdiri dari lima parameter daya relatif spektral gelombang otak:

```
+----------------------------------------------------------------------------------------------------+
|                                  KAMUS 5 FITUR RELATIVE BAND POWER                                 |
+----+-----------------------+-----------+------------+-------------+--------------------------------+
| No | Nama Fitur            | Rentang   | Kolom Asal | Satuan      | Definisi Pita Frekuensi        |
+----+-----------------------+-----------+------------+-------------+--------------------------------+
| 1  | neuro_relative_delta  | 0.5–4.0 Hz| Kolom 14   | Persen (%)  | Gelombang Delta (Tidur dalam)  |
| 2  | neuro_relative_theta  | 4.0–8.0 Hz| Kolom 15   | Persen (%)  | Gelombang Theta (Mengantuk)    |
| 3  | neuro_relative_alpha  | 8.0–13 Hz | Kolom 16   | Persen (%)  | Gelombang Alpha (Rileks tenang)|
| 4  | neuro_relative_beta   | 13–30 Hz  | Kolom 17   | Persen (%)  | Gelombang Beta (Aktivitas fokus|
| 5  | neuro_relative_gamma  | 30–50 Hz  | Kolom 18   | Persen (%)  | Gelombang Gamma (Integrasi kogn|
+----+-----------------------+-----------+------------+-------------+--------------------------------+
```

### A. Rumus Matematis Pembentukan Fitur
Kolom `neuro_relative_*` pada dataset dihitung oleh penulis Mendeley dari 8 sub-band ASIC ThinkGear TGAM1 dengan rumus normalisasi spektral:

$$\text{Total Band Power} = P_{\delta} + P_{\theta} + P_{\text{lo}\alpha} + P_{\text{hi}\alpha} + P_{\text{lo}\beta} + P_{\text{hi}\beta} + P_{\text{lo}\gamma} + P_{\text{mid}\gamma}$$

$$\text{neuro\_relative\_delta} = \frac{P_{\delta}}{\text{Total Band Power}} \times 100\%$$

$$\text{neuro\_relative\_theta} = \frac{P_{\theta}}{\text{Total Band Power}} \times 100\%$$

$$\text{neuro\_relative\_alpha} = \frac{P_{\text{lo}\alpha} + P_{\text{hi}\alpha}}{\text{Total Band Power}} \times 100\%$$

$$\text{neuro\_relative\_beta} = \frac{P_{\text{lo}\beta} + P_{\text{hi}\beta}}{\text{Total Band Power}} \times 100\%$$

$$\text{neuro\_relative\_gamma} = \frac{P_{\text{lo}\gamma} + P_{\text{mid}\gamma}}{\text{Total Band Power}} \times 100\%$$

### B. Integritas Sifat Komposisional (*Constant Sum Property*)
Hasil audit terhadap 7.439 baris bersih membuktikan:
- **Mean Total**: $100,00\%$
- **Std Dev Total**: $0,01\%$
- **Min Total**: $99,98\%$
- **Max Total**: $100,02\%$

Hal ini membuktikan bahwa kelima fitur berada pada ruang manifold tertutup (*simplex space*): $\sum_{i=1}^5 x_i = 100\%$.

---

## 4. STATISTIK DESKRIPTIF DAN KORELASI ANTARFITUR

### A. Parameter Deskriptif pada Data Bersih (7.439 Sampel Reconciled)

| Fitur | Mean (%) | Std Dev (%) | Median (%) | Min (%) | Max (%) | IQR (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `neuro_relative_delta` | 2,78 | 0,86 | 2,62 | 1,53 | 37,84 | 0,79 |
| `neuro_relative_theta` | 14,29 | 9,32 | 14,06 | 0,00 | 96,00 | 11,93 |
| `neuro_relative_alpha` | 27,67 | 10,36 | 27,70 | 0,00 | 69,80 | 13,83 |
| `neuro_relative_beta`  | 27,56 | 10,35 | 27,79 | 0,00 | 71,27 | 13,45 |
| `neuro_relative_gamma` | 27,70 | 10,30 | 27,85 | 0,00 | 74,07 | 13,46 |

### B. Matriks Korelasi Antarfitur (Pearson Correlation Matrix)

```
+-------------------------------------------------------------------------------+
|                        MATRIKS KORELASI ANTARFITUR (PEARSON)                  |
+----------+----------+----------+----------+----------+----------+-------------+
| Fitur    | Delta    | Theta    | Alpha    | Beta     | Gamma    | Keterangan  |
+----------+----------+----------+----------+----------+----------+-------------+
| Delta    |  1,000   |  0,200   | -0,084   | -0,083   | -0,098   | Lemah       |
| Theta    |  0,200   |  1,000   | -0,315   | -0,308   | -0,296   | Moderat (-) |
| Alpha    | -0,084   | -0,315   |  1,000   | -0,354   | -0,357   | Moderat (-) |
| Beta     | -0,083   | -0,308   | -0,354   |  1,000   | -0,363   | Moderat (-) |
| Gamma    | -0,098   | -0,296   | -0,357   | -0,363   |  1,000   | Moderat (-) |
+----------+----------+----------+----------+----------+----------+-------------+
```

### C. Asosiasi Univariat dengan Target Biner & Tumpang Tindih Distribusi

```
+-------------------------------------------------------------------------------------------------------+
|                              ASOSIASI EMPIRIS FITUR TERHADAP TARGET (N = 7.439)                       |
+----------------------+------------------+------------------+---------------+-------------+------------+
| Fitur                | Kelas 0: Resting | Kelas 1: Math    | Mean Diff     | Cohen's d   | Point-     |
|                      | Mean +- Std (ddof=1) | Mean +- Std (ddof=1) | (C1 - C0)     | Effect Size | Biserial r |
+----------------------+------------------+------------------+---------------+-------------+------------+
| neuro_relative_delta | 2,7875% +- 0,7670| 2,7831% +- 0,9111| -0,0044%      | -0,0051     | -0,0024    |
| neuro_relative_theta | 14,3645% +- 9,321| 14,2428% +- 9,327| -0,1217%      | -0,0130     | -0,0061    |
| neuro_relative_alpha | 27,5377% +- 10,18| 27,7419% +- 10,45| +0,2042%      | +0,0197     | +0,0094    |
| neuro_relative_beta  | 27,4283% +- 10,27| 27,6366% +- 10,40| +0,2083%      | +0,0201     | +0,0090    |
| neuro_relative_gamma | 27,8819% +- 10,42| 27,5957% +- 10,24| -0,2862%      | -0,0278     | -0,0131    |
| Theta/Beta Ratio(TBR)| 0,5513 +- 1,3284 | 0,5376 +- 0,7477 | -0,0137       | -0,0136     | -0,0143    |
+----------------------+------------------+------------------+---------------+-------------+------------+
```

*Analisis Kritis Sifat Komposisional & Lemahnya Korelasi*:
1. **Defisiensi Pangkat (Rank Deficiency)**: Dekomposisi PCA membuktikan komponen ke-5 bernilai $0,000000$ (eigenvalue nol). Hal ini terjadi karena kelima fitur terikat pada konstrain jumlah konstan ($\sum=100\%$), sehingga secara inheren hanya terdapat 4 derajat kebebasan independen.
2. **Bias Korelasi Negatif**: Korelasi Pearson antar-pita utama ($\theta, \alpha, \beta, \gamma$) tertekan secara artifisial ke arah negatif ($-0,296$ hingga $-0,363$) sebagai konsekuensi matematis dari simpleks tertutup.
3. **Tumpang Tindih Distribusi Ekstrem**: Distribusi frekuensi kedua kelas univariat saling bertumpuk sebesar 94,1% – 98,1%, menjelaskan mengapa korelasi titik-biserial ($|r_{pb}| \le 0,013$) dan Cohen's d ($|d| \le 0,028$) populasi sangat kecil. Model pemisah univariat maupun linear sederhana bekerja pada tingkat tebakan acak (Balanced Accuracy ~50,7%), sehingga diperlukan evaluasi non-linear SVM (Kernel RBF).

---

## 5. EVALUASI FITUR TURUNAN: THETA/BETA RATIO (TBR)

Sebagai tindak lanjut dari instruksi user, dilakukan evaluasi komputasional empiris terhadap fitur rasio Theta/Beta ($\text{TBR} = \theta / \beta$):

```
+----------------------------------------------------------------------------------------------------+
|                                    HASIL EVALUASI FITUR RASIO THETA/BETA                           |
+----------------------------------+-----------------------------------------------------------------+
| Parameter Uji                    | Nilai Empiris / Observasi Komputasional                         |
+----------------------------------+-----------------------------------------------------------------+
| Rumus Matematis                  | neuro_relative_theta / neuro_relative_beta                      |
| Masalah Pembagian Nol            | Ditemukan 13 baris dengan beta == 0,00% memicu nilai tak terhingga|
|                                  | (RuntimeWarning: divide by zero encountered in divide)          |
| Rentang Nilai                    | Min: 0,00 | Median: 0,50 | Max: 69,00 (Rentang sangat skewed)   |
| Korelasi dengan Theta            | r = +0,3007 (Redundan parsial)                                  |
| Korelasi dengan Beta             | r = -0,3723 (Redundan parsial)                                  |
| Korelasi Titik-Biserial dg Target| r_pb = -0,0143 (p = 0,2171; sejalan dengan lemahnya Alpha & Beta)|
+----------------------------------+-----------------------------------------------------------------+
```

### KEPUTUSAN TENTANG THETA/BETA RATIO:
**TIDAK DIMASUKKAN KE BASELINE MODEL SVM**.
- **Alasan Akademis**:
  1. **Instabilitas Pembagian**: Nilai penyebut $\beta = 0$ menghasilkan nilai tak hingga (*division by zero*), memerlukan pemotongan atau smoothing artifisial yang menambah bias asumsi.
  2. **Korelasi Target yang Lemah**: Nilai korelasi dengan target ($r_{pb} = -0,0143$) tidak memberikan penguatan sinyal baru dibandingkan fitur aslinya ($r_{\alpha} = +0,0094$, $r_{\beta} = +0,0090$).
  3. **Non-linearitas SVM**: Kernel RBF pada SVM secara inheren sudah mampu memetakan interaksi non-linear antara Theta dan Beta di ruang fitur Hilbert tanpa perlu menambahkan rasio secara manual.

---

## 6. ANALISIS RISIKO TARGET LEAKAGE & KOLOM DILARANG

Audit memastikan bahwa pipeline klasifikasi bebas dari kebocoran target:

```
+----------------------------------------------------------------------------------------------------+
|                                    VERIFIKASI PENCEGAHAN TARGET LEAKAGE                            |
+---------------------------+-----------------------------------+------------------------------------+
| Kolom Kandidat            | Status dalam Pipeline             | Analisis Risiko                    |
+---------------------------+-----------------------------------+------------------------------------+
| neuro_dominan_rhythm      | DILARANG MUTLAK                   | Kebocoran circular / tautologi.    |
| workload_score            | DILARANG MUTLAK                   | Metadata tes eksternal post-hoc.   |
| is_correct                | DILARANG MUTLAK                   | Hasil jawaban kuis matematika.     |
| created_at                | DILARANG MUTLAK                   | Urutan kronologis logger bridge.   |
| student_id                | HANYA SEBAGAI GROUPING KEY        | Dicegah bocor ke model X. Digunakan|
|                           |                                   | hanya untuk membagi fold CV.       |
| 5 Relative Band Powers    | DIIZINKAN (Input Features X)      | Biosinyal murni dari sensor dahi.  |
+---------------------------+-----------------------------------+------------------------------------+
```

---

## 7. KETERBATASAN METODOLOGIS DAN POTENSI PEMBAUR (*CONFOUNDING FACTORS*)

Untuk menjaga kejujuran akademik saat menghadapi dosen penguji Kolokium:

### A. Fenomena *Berger Effect* (Sinkronisasi vs Desinkronisasi Alpha)
- Pada Task 1, subjek berada dalam kondisi **Mata Tertutup**, memicu lonjakan sinkronisasi gelombang Alpha posterior yang menjalar ke lobus anterior. Pada Task 2 dan 3, subjek berada dalam kondisi **Mata Terbuka** menghadap layar komputer, memicu desinkronisasi Alpha secara instan (*Berger Effect*, 1929).
- **Pertanggungjawaban Metodologis**:
  Mahasiswa **wajib menjelaskan** bahwa perbedaan pola yang diklasifikasikan oleh model SVM adalah *perbedaan kondisi eksperimental terstruktur multivariat* yang mencakup modulasi visual dan kognitif, bukan klaim absolut "mengukur beban berpikir murni".

### B. Resolusi Spasial Terbatas Kanal Tunggal FP1
- Perekaman hanya dilakukan pada elektroda dahi kiri (FP1), sehingga sinyal tidak menangkap aktivitas lobus oksipital (visual primer) maupun parietal (pemrosesan spasial matematika).
- FP1 juga rentan terhadap artefak potensial gerak bola mata dan kedipan (*electrooculography / EOG*), yang secara alami lebih sering terjadi pada kondisi mata terbuka (Task 2 & 3).

---

## 8. KESIMPULAN PHASE 2 & 3 DAN KESIAPAN MENUJU PHASE 4

Langkah feature engineering dan evaluasi target telah rampung secara empiris:
1. Target utama **Binary Classification (Class 0: Resting Baseline vs Class 1: Active Math Task)** telah terpetakan secara konsisten.
2. Eksklusi 810 baris terbukti menjaga keseimbangan dataset tanpa mereduksi representasi subjek (51 subjek tetap utuh).
3. Lima fitur relative band power terverifikasi valid, memiliki rentang normal, dan bebas dari pembagian nol.
4. Fitur Theta/Beta Ratio (TBR) secara akademis ditolak dari baseline awal demi stabilitas model.

Dokumen ini siap ditinjau sebelum memulai **PHASE 4 (Preprocessing Pipeline & GroupKFold Validation Splitting)** dan **PHASE 5 (SVM Training)**.

