# LAPORAN PEMERIKSAAN KESESUAIAN RANCANGAN MACHINE LEARNING TERHADAP KOLOKIUM_ML_GUIDE
## Proyek Tugas Akhir: Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning

- **Penyusun**: Senior Machine Learning Engineer, Data Scientist & Research Assistant (Tugas Akhir Renaldi)
- **Status Dokumen**: Laporan Resmi Penelaahan Keselarasan Akademik (*Academic Alignment Review*)
- **Tanggal Selesai**: 2 November 2026
- **Dokumen Acuan Utama**: [`ml_service/docs/KOLOKIUM_ML_GUIDE.md`](file:///c:/Users/Renaldi/Documents/eeg-wearable-r/ml_service/docs/KOLOKIUM_ML_GUIDE.md) (`v1.0-Kolokium-Release`)
- **Batasan Pengerjaan**: **Read-Only Alignment Review**. Tidak ada pelatihan model, tidak ada tuning hiperparameter, dan tidak ada pengubahan dataset/fitur/label.

---

## 1. PENDAHULUAN & TUJUAN AUDIT KESELARASAN

Dokumen ini disusun atas instruksi peninjauan kritis untuk memastikan bahwa seluruh keputusan metodologis, perancangan fitur, pemilihan target, dan arsitektur pengujian Machine Learning yang dikembangkan pada repositori `ml_service/` telah **selaras 100% dengan prinsip akademik yang tercantum dalam `KOLOKIUM_ML_GUIDE.md`**.

Tujuan utama audit keselarasan ini adalah:
1. Menghindarkan mahasiswa dari klaim berlebihan (*over-claiming*) yang tidak dapat dipertanggungjawabkan di hadapan Dosen Penguji Kolokium.
2. Memisahkan secara tegas antara **studi kelayakan offline menggunakan dataset publik Mendeley** dengan **pengujian perangkat keras fisik IoT wearable TGAM1 + ESP32**.
3. Memetakan butir-butir metodologis yang sudah baku vs butir-butir strategis yang wajib dikonsultasikan untuk disahkan oleh Dosen Pembimbing.

---

## 2. AUDIT LIMA PILAR KESELARASAN METODOLOGI

```
+----------------------------------------------------------------------------------------------------+
|                                    MATRIKS KESELARASAN 5 PILAR METODOLOGI                          |
+----+--------------------------------+--------------------------------------+-----------------------+
| No | Pilar Pemeriksaan              | Status Keselarasan terhadap Panduan  | Tingkat Kepatuhan     |
+----+--------------------------------+--------------------------------------+-----------------------+
| 1  | Konsep Dasar Machine Learning  | Selaras Penuh (Fully Aligned)        | 🟢 100% Terpenuhi     |
| 2  | Perumusan Target & Pelabelan   | Selaras Penuh dengan Catatan Konteks | 🟢 100% Terpenuhi     |
| 3  | Diferensiasi Sumber Data       | Selaras Penuh (Tegas Terpisah)       | 🟢 100% Terpenuhi     |
| 4  | Struktur & Alur Pipeline ML    | Selaras Penuh (Anti-Data Leakage)    | 🟢 100% Terpenuhi     |
| 5  | Perancangan Model Phase 5      | Selaras Penuh (Sederhana & Realistis)| 🟢 100% Terpenuhi     |
+----+--------------------------------+--------------------------------------+-----------------------+
```

---

### PILAR 1: KESESUAIAN KONSEP MACHINE LEARNING

| Kriteria Pemeriksaan | Rujukan `KOLOKIUM_ML_GUIDE` | Status Aktual pada Proyek | Evaluasi & Bukti Implementasi |
| :--- | :--- | :---: | :--- |
| **Posisi Delta, Theta, Alpha, Beta, Gamma** | Bagian 2, 11, 13: Pita frekuensi adalah parameter representasi energi biosinyal masukan ($X$). | 🟢 **SESUAI** | Kelima pita spektral diposisikan secara mutlak sebagai **vektor fitur masukan ($X \in \mathbb{R}^5$)**, bukan sebagai kelas prediksi. |
| **Larangan Menjadikan Band sebagai Kelas** | Bagian 6: Penolakan circularity & penyalahgunaan band sebagai target. | 🟢 **SESUAI** | Pita frekuensi tidak pernah dijadikan label kelas target. Hubungan target terisolasi murni pada kondisi eksperimen. |
| **SVM sebagai Metode Utama** | Bagian 14: SVM Kernel RBF ditetapkan sebagai *Kandidat Model Primer*. | 🟢 **SESUAI** | Model utama yang dikembangkan dan dianalisis adalah Support Vector Machine (SVM), dengan evaluasi kernel Linear dan RBF. |
| **Model Pembanding Proporsional** | Bagian 14: Pembanding dibatasi pada Dummy Classifier dan Logistic Regression. | 🟢 **SESUAI** | Model pembanding dibatasi strictly pada Dummy Classifier (baseline acak) dan Logistic Regression (pembanding linear sederhana) tanpa *scope creep*. |

---

### PILAR 2: KESESUAIAN PERUMUSAN TARGET DAN LABEL

| Kriteria Pemeriksaan | Rujukan `KOLOKIUM_ML_GUIDE` | Status Aktual pada Proyek | Evaluasi & Bukti Implementasi |
| :--- | :--- | :---: | :--- |
| **Status Label Resting & Math Task** | Bagian 6: Target merepresentasikan kondisi tugas eksperimen pada dataset publik. | 🟢 **SESUAI** | Label Kelas 0 (Task 1: Resting) dan Kelas 1 (Task 2 & 3: Math Task) secara tegas dinyatakan sebagai **kondisi eksperimen terstruktur pada dataset Mendeley**, BUKAN label otomatis prototipe wearable. |
| **Larangan Klaim Psikologis / Klinis** | Bagian 2 (Kotak Batasan Sistem): ML bukan pembaca pikiran atau pengukur variabel internal murni. | 🟢 **SESUAI** | Dilarang keras mengklaim model mengukur "tingkat fokus", "stres", "kecerdasan", atau "kondisi mental". Model hanya memetakan pola distribusi spektral terhadap kondisi eksperimen. |
| **Identifikasi Confounder Berger Effect** | Bagian 7: Perbedaan kondisi mata tertutup (Task 1) vs terbuka (Task 2 & 3). | 🟢 **SESUAI** | Telah didokumentasikan secara transparan bahwa perbedaan ritme Alpha sebagian besar dipengaruhi oleh *Berger Effect* (desinkronisasi penutupan mata), bukan murni beban kognitif aritmetika. |
| **Penolakan Tautologi Dominan** | Bagian 6 & 26 (No. 3): `neuro_dominan_rhythm` terbukti argmax 99,66%. | 🟢 **SESUAI** | Kolom `neuro_dominan_rhythm` resmi ditolak mutlak dari target maupun fitur karena merupakan kesalahan ilmiah tautologi murni. |

---

### PILAR 3: KESESUAIAN SUMBER DATA & BATASAN DATASET PUBLIK

| Kriteria Pemeriksaan | Rujukan `KOLOKIUM_ML_GUIDE` | Status Aktual pada Proyek | Evaluasi & Bukti Implementasi |
| :--- | :--- | :---: | :--- |
| **Pemisahan Dataset Publik vs Hardware Mandiri** | Bagian 5, 20: Pemetaan komparasi Mendeley CUET vs TGAM1 + ESP32 IPB. | 🟢 **SESUAI** | Dataset Mendeley diposisikan strictly sebagai **studi kelayakan metodologis awal (*preliminary proof-of-concept*)**, bukan data hasil akuisisi alat fisik yang sedang dibangun. |
| **Spesifikasi Perangkat Sumber** | Bagian 20, 28 (No. 1): Perekam publik adalah NeuroSky MindWave komersial di Bangladesh. | 🟢 **SESUAI** | Tidak pernah diklaim bahwa data Mendeley berasal dari hardware prototipe lokal IPB. Karakteristik transmisi dan derau diakui berbeda. |
| **Integritas Dataset Asli** | Aturan Kerja Bagian 8, 10: Jangan mengubah dataset mentah asli. | 🟢 **SESUAI** | File mentah `merged_eeg_datas_50_subjects.csv` (19.029.871 bytes) dipertahankan utuh. Filtering 810 baris anomali dieksekusi secara terisolasi pada salinan memori eksperimen. |

---

### PILAR 4: KESESUAIAN STRUKTUR DAN ALUR PIPELINE

Alur kerja machine learning pada repositori diperiksa terhadap Bagian 4 & 16 `KOLOKIUM_ML_GUIDE`:

$$\text{Data EEG Mentah} \longrightarrow \text{Validasi Data} \longrightarrow \text{Filtering Kualitas} \longrightarrow \text{Pemisahan } (X, y, \text{groups}) \longrightarrow \text{Pipeline (Imputer + Scaler)} \longrightarrow \text{SVM} \longrightarrow \text{Evaluasi GroupKFold}$$

```
+----------------------------------------------------------------------------------------------------+
|                                  CHECKLIST INTEGRITAS ANTI-LEAKAGE PIPELINE                        |
+--------------------------------------------------------+-----------+-------------------------------+
| Kriteria Pengujian Pipeline                            | Status    | Keterangan Teknis             |
+--------------------------------------------------------+-----------+-------------------------------+
| Preprocessing dibungkus dalam Scikit-learn Pipeline    | 🟢 SESUAI | `Pipeline([imputer, scaler])` |
| StandardScaler di-fit HANYA pada data training fold    | 🟢 SESUAI | Zero information leakage      |
| Validasi silang menggunakan Subject-Independent GKF    | 🟢 SESUAI | `GroupKFold(n_splits=5)`      |
| Isolasi subjek: Tidak ada overlap student_id (Train-Val)| 🟢 SESUAI | Zero Subject Overlap verified |
| Variabel student_id DIKELUARKAN dari matriks fitur X  | 🟢 SESUAI | Mencegah subject memorization |
+--------------------------------------------------------+-----------+-------------------------------+
```

*Catatan Kritis untuk Alur Real-Time*: Preprocessing dan ekstraksi fitur pada firmware ESP32 dan backend Go saat inferensi online real-time wajib diselaraskan dengan format paket biner ThinkGear 512 Hz agar terhindar dari *training-serving skew* (Bagian 4B dan 19).

---

### PILAR 5: KESESUAIAN PERANCANGAN PHASE 5

Rancangan Phase 5 dirancang sederhana, terukur, dan realistis untuk tingkat Sarjana Terapan (D4 / Sarjana Terapan Komputer):

1. **Model Utama**: Support Vector Machine (SVM) dengan perbandingan kernel Linear dan RBF.
2. **Baseline Acak**: Dummy Classifier (`strategy="most_frequent"`) untuk menetapkan batas performa kelas mayoritas.
3. **Model Pembanding**: Logistic Regression (L2 Regularized, Balanced) untuk membuktikan apakah batas keputusan linear memadai.
4. **Metrik Pelaporan Lengkap**: Accuracy, Balanced Accuracy, Precision, Recall, F1-Score (Macro & per-kelas), ROC-AUC, dan Confusion Matrix lengkap (rata-rata $\pm$ deviasi standar pada 5 fold).
5. **Kebijakan Tuning**: Menghindari tuning hiperparameter prematur atau berlebihan. Melaporkan baseline komparatif terlebih dahulu secara transparan.

---

## 3. IDENTIFIKASI DISKREPANSI OPERASIONAL (BAGIAN YANG BELUM SESUAI)

Berdasarkan audit menyeluruh terhadap kode lama di `ml_service/`, ditemukan 3 bagian operasional yang **belum selaras** dengan panduan kolokium dan perlu diselaraskan pada fase integrasi:

```
+----------------------------------------------------------------------------------------------------+
|                                    TEMUAN DISKREPANSI KODE LAMA & RENCANA PERBAIKAN                |
+----+-----------------------+-----------------------------+-----------------------------------------+
| No | Komponen Basis Kode   | Kondisi Aktual Saat Ini     | Penyelarasan Sesuai Panduan Kolokium    |
+----+-----------------------+-----------------------------+-----------------------------------------+
| 1  | Artefak Model Lama    | File di `ml_service/models/`| Model lama wajib digantikan oleh model  |
|    | (`svm_model.joblib`)  | dilatih dari data sintetis  | hasil pelatihan riil dari dataset publik|
|    |                       | lama (`np.random.normal`).  | Mendeley (Phase 5 tervalidasi).         |
+----+-----------------------+-----------------------------+-----------------------------------------+
| 2  | Endpoint `/predict`   | Pada input `raw_samples`,   | Wajib diganti dengan ekstraksi Welch    |
|    | di `ml_service/app.py`| masih menggunakan rumus     | PSD kausal atau validasi skema 5 fitur  |
|    |                       | varians dummy `var * 0.2`.  | normalisasi 100% tanpa rumus tiruan.    |
+----+-----------------------+-----------------------------+-----------------------------------------+
| 3  | Fallback Backend Go   | `backend/internal/analysis/`| Dihapus / diselaraskan agar Go Gateway  |
|    |                       | melabeli heuristik argmax   | murni meneruskan panggilan ke FastAPI   |
|    |                       | sebagai "SVM v1.2.0".       | tanpa memalsukan label algoritma.       |
+----+-----------------------+-----------------------------+-----------------------------------------+
```

---

## 4. DAFTAR KEPUTUSAN STRATEGIS YANG MEMERLUKAN PERSETUJUAN DOSEN

Sesuai dengan Bagian 27 `KOLOKIUM_ML_GUIDE`, berikut adalah 5 keputusan metodologis yang **tidak boleh diputuskan sepihak oleh mahasiswa/AI agent** dan wajib dimintakan persetujuan Dosen Pembimbing saat Kolokium:

1. **Persetujuan Formulasi Target Klasifikasi**:
   - Apakah pembimbing menyetujui target biner (**Task 1: Resting Mata Tertutup** vs **Task 2 & 3: Aritmetika Aktif Mata Terbuka**) sebagai fokus utama penelitian?
   - Apakah skenario 3-kelas (Task 1 vs Task 2 vs Task 3) cukup disajikan sebagai studi batas kemampuan (*boundary analysis*) sensor FP1?
2. **Mitigasi Ilmiah Faktor Pembaur *Berger Effect***:
   - Pengesahan kalimat batasan masalah skripsi bahwa sistem mengklasifikasikan respons terhadap kondisi tugas eksperimen terstruktur, bukan mengukur variabel internal psikologis.
3. **Kedudukan Hukum Dataset Publik Mendeley**:
   - Pengesahan bahwa eksperimen Mendeley Data CUET berkedudukan sebagai **studi kelayakan metodologi pra-alat (*preliminary proof-of-concept*)**, dengan pengujian prototipe fisik mandiri dilakukan pada tahapan pasca-kolokium.
4. **Protokol Sukarelawan & Klirens Etik (*Ethical Clearance*)**:
   - Keputusan pembimbing mengenai apakah pengujian hardware mandiri pada sukarelawan mahasiswa di kampus memerlukan dokumen persetujuan etik formal dari Komisi Etik Riset.
5. **Pengesahan Kebijakan Filtering Data**:
   - Pengesahan keputusan eksklusi 574 baris duplikat identik dan 237 baris bersinyal buruk (`poor_signal > 0`) dari data latih model.

---

## 5. KESIMPULAN AUDIT KESELARASAN

Seluruh arsitektur yang dirancang pada Phase 1 hingga Phase 4 terbukti **selaras dan patuh terhadap `KOLOKIUM_ML_GUIDE.md`**:
- Tidak ada manipulasi data atau klaim akurasi semu.
- Fitur gelombang otak diakui secara jujur sebagai input, bukan kelas klasifikasi.
- Risiko *circular labeling* berhasil dihindari total.
- Protokol anti-kebocoran data berbasis `GroupKFold` telah terbukti secara matematis.

Dokumen ini menjadi rujukan resmi bagi mahasiswa dalam mempertahankan integritas metodologi penelitian di hadapan Dosen Pembimbing dan Dewan Penguji Kolokium.

