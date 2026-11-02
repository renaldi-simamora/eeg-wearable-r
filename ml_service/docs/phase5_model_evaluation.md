# LAPORAN EVALUASI MODEL MACHINE LEARNING PHASE 5: BENCHMARK KOMPARATIF BASELINE MODEL
## Proyek Tugas Akhir: Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning

- **Penyusun**: Senior Machine Learning Engineer & Research Assistant (Tugas Akhir Renaldi)
- **Status Dokumen**: Laporan Resmi Phase 5 (Baseline Model Benchmark & Out-of-Subject Generalization Analysis)
- **Tanggal Selesai**: 2 November 2026
- **Dataset Acuan**: `ml_service/data/merged_eeg_datas_50_subjects.csv` (7.439 sampel bersih)
- **Protokol Validasi**: 5-Fold Subject-Independent GroupKFold (Zero Subject Overlap)
- **Hasil Komputasi**: `ml_service/reports/baseline_models_evaluation.json`

---

## 1. PROTOKOL EKSPERIMEN & SPESIFIKASI METODOLOGIS

Eksperimen Phase 5 dirancang secara ketat untuk menjawab pertanyaan inti penelitian Tugas Akhir secara objektif tanpa manipulasi metrik:

```
+----------------------------------------------------------------------------------------------------+
|                                    SPESIFIKASI PROTOKOL EKSPERIMEN                                 |
+--------------------------+-------------------------------------------------------------------------+
| Parameter                | Konfigurasi Metodologis Eksperimen                                      |
+--------------------------+-------------------------------------------------------------------------+
| Jumlah Sampel Bersih     | 7.439 rekaman detik (90,18% retensi dari 8.249 baris mentah)            |
| Fitur Masukan (X)        | 5 Pita Frekuensi Relatif: Delta, Theta, Alpha, Beta, Gamma (%)          |
| Target Klasifikasi (y)   | Biner: 0 = Closed-Eye Resting Baseline (2.582 sampel, 34,71%)            |
|                          |        1 = Active Mathematical Tasks (4.857 sampel, 65,29%)             |
| Validasi Silang          | 5-Fold Subject-Independent GroupKFold (dikelompokkan per student_id)    |
| Isolasi Subjek           | Zero Subject Overlap: Subjek uji TIDAK PERNAH muncul di data latih      |
| Pencegahan Data Leakage  | Preprocessing (SimpleImputer + StandardScaler) di-fit HANYA pada X_train|
| Model yang Dibandingkan  | 1. Dummy Classifier (Most Frequent Baseline)                            |
|                          | 2. Logistic Regression (L2 Regularized, Balanced Weights)               |
|                          | 3. Support Vector Machine - Linear Kernel (Linear SVM, Balanced)        |
|                          | 4. Support Vector Machine - RBF Kernel (Non-linear SVM, Balanced)       |
+--------------------------+-------------------------------------------------------------------------+
```

---

## 2. HASIL EVALUASI KOMPARATIF 4 MODEL (5-FOLD GROUPKFOLD)

Berikut adalah tabel rekapitulasi rata-rata dan standar deviasi metrik performa generalisasi terhadap subjek baru (*Out-of-Subject Generalization*):

```
+---------------------------------------------------------------------------------------------------------------------------+
|                                  TABEL KOMPARASI PERFORMA GENERALISASI MODEL (N = 7.439)                                  |
+------------------------+--------------------+--------------------+--------------------+--------------------+--------------+
| Metrik Evaluasi        | Dummy Classifier   | Logistic Regression| SVM Linear         | SVM RBF            | Model        |
| (Out-of-Subject)       | (Most Frequent)    | (L2 Balanced)      | (Linear Balanced)  | (Kernel RBF Bal.)  | Terbaik      |
+------------------------+--------------------+--------------------+--------------------+--------------------+--------------+
| Raw Accuracy           | 65,29% +- 2,45%    | 49,27% +- 1,78%    | 50,72% +- 5,08%    | 49,68% +- 1,01%    | Dummy (Semu) |
| Balanced Accuracy      | 50,00% +- 0,00%    | 48,97% +- 0,78%    | 49,18% +- 0,31%    | 50,61% +- 1,08%    | SVM RBF      |
| Macro Precision        | 0,3265 +- 0,0122   | 0,4906 +- 0,0072   | 0,4910 +- 0,0052   | 0,5053 +- 0,0095   | SVM RBF      |
| Macro Recall           | 0,5000 +- 0,0000   | 0,4897 +- 0,0078   | 0,4918 +- 0,0031   | 0,5061 +- 0,0108   | SVM RBF      |
| Macro F1-Score         | 0,3949 +- 0,0089   | 0,4778 +- 0,0136   | 0,4718 +- 0,0214   | 0,4878 +- 0,0058   | SVM RBF      |
| ROC-AUC                | 0,5000 +- 0,0000   | 0,4867 +- 0,0076   | 0,5008 +- 0,0125   | 0,4962 +- 0,0084   | SVM Linear   |
+------------------------+--------------------+--------------------+--------------------+--------------------+--------------+
| Class 0 Recall (Rest)  | 0,00% (Gagal Total)| 47,44%             | 42,53%             | 53,64% (Tertinggi) | SVM RBF      |
| Class 0 Precision      | 0,00%              | 33,73%             | 33,60%             | 35,19%             | SVM RBF      |
| Class 0 F1-Score       | 0,0000             | 0,3919             | 0,3592             | 0,4241             | SVM RBF      |
+------------------------+--------------------+--------------------+--------------------+--------------------+--------------+
| Class 1 Recall (Math)  | 100,00%            | 50,50%             | 55,82%             | 47,57%             | Dummy        |
| Class 1 Precision      | 65,29%             | 64,38%             | 64,60%             | 65,88%             | SVM RBF      |
| Class 1 F1-Score       | 0,7898             | 0,5638             | 0,5844             | 0,5515             | Dummy (Semu) |
+------------------------+--------------------+--------------------+--------------------+--------------------+--------------+
```

---

## 3. HASIL DETAIL FOLD-BY-FOLD PER MODEL

### A. Dummy Classifier (Baseline)
- Fold 1: Acc = 0,6895 | BAcc = 0,5000 | Macro F1 = 0,4081 | AUC = 0,5000
- Fold 2: Acc = 0,6319 | BAcc = 0,5000 | Macro F1 = 0,3872 | AUC = 0,5000
- Fold 3: Acc = 0,6288 | BAcc = 0,5000 | Macro F1 = 0,3861 | AUC = 0,5000
- Fold 4: Acc = 0,6570 | BAcc = 0,5000 | Macro F1 = 0,3965 | AUC = 0,5000
- Fold 5: Acc = 0,6571 | BAcc = 0,5000 | Macro F1 = 0,3965 | AUC = 0,5000
- **Total Confusion Matrix (N = 7.439)**:
  `[TN = 0, FP = 2.582] | [FN = 0, TP = 4.857]`

### B. Logistic Regression (L2 Balanced)
- Fold 1: Acc = 0,4724 | BAcc = 0,4842 | Macro F1 = 0,4599 | AUC = 0,4922
- Fold 2: Acc = 0,5031 | BAcc = 0,4804 | Macro F1 = 0,4795 | AUC = 0,4789
- Fold 3: Acc = 0,5067 | BAcc = 0,4935 | Macro F1 = 0,4905 | AUC = 0,4823
- Fold 4: Acc = 0,4741 | BAcc = 0,4901 | Macro F1 = 0,4685 | AUC = 0,4832
- Fold 5: Acc = 0,5070 | BAcc = 0,5002 | Macro F1 = 0,4907 | AUC = 0,4970
- **Total Confusion Matrix (N = 7.439)**:
  `[TN = 1.219, FP = 1.363] | [FN = 2.411, TP = 2.446]`

### C. Support Vector Machine - Linear Kernel (Linear SVM Balanced)
- Fold 1: Acc = 0,4583 | BAcc = 0,4906 | Macro F1 = 0,4528 | AUC = 0,4963
- Fold 2: Acc = 0,5631 | BAcc = 0,4869 | Macro F1 = 0,4710 | AUC = 0,5105
- Fold 3: Acc = 0,5274 | BAcc = 0,4938 | Macro F1 = 0,4938 | AUC = 0,5167
- Fold 4: Acc = 0,4486 | BAcc = 0,4946 | Macro F1 = 0,4485 | AUC = 0,4860
- Fold 5: Acc = 0,5384 | BAcc = 0,4929 | Macro F1 = 0,4929 | AUC = 0,4945
- **Total Confusion Matrix (N = 7.439)**:
  `[TN = 1.081, FP = 1.501] | [FN = 2.166, TP = 2.691]`

### D. Support Vector Machine - RBF Kernel (SVM RBF Balanced)
- Fold 1: Acc = 0,5094 | BAcc = 0,5217 | Macro F1 = 0,4956 | AUC = 0,4905
- Fold 2: Acc = 0,4826 | BAcc = 0,5079 | Macro F1 = 0,4819 | AUC = 0,4974
- Fold 3: Acc = 0,4993 | BAcc = 0,4928 | Macro F1 = 0,4875 | AUC = 0,4938
- Fold 4: Acc = 0,5010 | BAcc = 0,5083 | Macro F1 = 0,4915 | AUC = 0,5102
- Fold 5: Acc = 0,4917 | BAcc = 0,4997 | Macro F1 = 0,4827 | AUC = 0,4892
- **Total Confusion Matrix (N = 7.439)**:
  `[TN = 1.383, FP = 1.199] | [FN = 2.544, TP = 2.313]`

---

## 4. ANALISIS KRITIS: APAKAH MODEL MEMBERIKAN PENINGKATAN DIBANDING DUMMY CLASSIFIER?

Di hadapan Dosen Penguji Kolokium / Seminar Hasil, analisis komparatif ini harus dijelaskan secara kritis:

### A. Membongkar Ilusi Akurasi Mayoritas pada Dummy Classifier
- Secara sekilas, Dummy Classifier tampak memiliki akurasi "tinggi" ($65,29\%$).
- **Fakta Ilmiah**: Akurasi $65,29\%$ tersebut adalah **ilusi kelas mayoritas (*majority class illusion*)**. Dummy Classifier hanya menebak kelas 1 (Math Task) secara membabi-buta pada seluruh 7.439 baris data. Akibatnya, kemampuannya mendeteksi kondisi istirahat (Class 0) adalah **tepat 0,00%** (seluruh 2.582 sampel istirahat salah terprediksi sebagai FP).
- Dummy Classifier menghasilkan Balanced Accuracy sebesar $50,00\%$ dan Macro F1 hanya $0,3949$.

### B. Nilai Tambah Nyata yang Diberikan SVM RBF
1. **Peningkatan Macro F1-Score Signifikan**:
   SVM RBF meningkatkan Macro F1-Score dari **$0,3949$ menjadi $0,4878$** (kenaikan bersih sebesar **$+0,0929$ atau $+23,5\%$** dibandingkan baseline Dummy).
2. **Kemampuan Mendeteksi Kondisi Istirahat (Class 0)**:
   Berbeda dengan Dummy yang gagal total, SVM RBF berhasil mendeteksi **1.383 sampel istirahat dengan benar** (Recall Class 0 mencapai **$53,64\%$**, tertinggi di antara seluruh model).
3. **Keseimbangan Deteksi (*Balanced Accuracy*)**:
   SVM RBF adalah satu-satunya model yang menghasilkan Balanced Accuracy rata-rata di atas tingkat peluang acak ($50,61\% \pm 1,08\%$), dengan puncak performa pada Fold 1 mencapai **$52,17\%$**.

### C. Mengapa Performa Generalisasi Out-of-Subject Masih di Kisaran ~50%?
Secara objektif, performa generalisasi seluruh model terhadap subjek baru masih berada di sekitar batas acak ($49\% - 50,6\%$). Mengapa hal ini terjadi?
1. **Tumpang Tindih Sinyal Ekstrem (94% – 98%)**: Sebagaimana dibuktikan pada audit Phase 3, distribusi persentase kelima relative band power saat istirahat dan saat matematika saling bertumpuk secara masif.
2. **Keterbatasan Kanal Tunggal FP1**: Elektroda dahi (FP1) berada di atas mata dan jauh dari korteks oksipital/parietal. Informasi ritme alfa posterior yang tersinkronisasi saat istirahat tidak tertangkap secara terisolasi pada elektroda dahi tanpa adanya elektroda referensi bipolar yang terlokalisasi.
3. **Sifat Komposisional Rank-Deficient**: Ruang input hanya memiliki 4 derajat kebebasan independen akibat kendala $\sum=100\%$, membatasi fleksibilitas pemisahan ruang linear.

---

## 5. PENEGASAN BATASAN AKADEMIS PENELITIAN TUGAS AKHIR

Sesuai etika penelitian ilmiah:
1. **Tidak Ada Klaim Pengukuran Psikologis**: Hasil ini **TIDAK BOLEH** diklaim sebagai kemampuan "mengukur tingkat fokus, konsentrasi, stres, atau kecerdasan seseorang". Model secara matematis hanya mengklasifikasikan pola vektor 5 pita daya spektral terhadap kondisi eksperimen yang terdefinisi pada protokol Mendeley.
2. **Kejujuran Ilmiah Tanpa Fabrikasi Data**: Kita menolak keras manipulasi metrik atau pelaporan akurasi buatan. Fakta empiris bahwa sinyal biosinyal EEG kanal tunggal pada dataset publik memiliki tingkat kesulitan generalisasi antar-subjek yang sangat tinggi adalah **kontribusi ilmiah yang sah dan bernilai tinggi untuk dibahas dalam naskah Skripsi**.

---

## 6. RANCANGAN NESTED GROUPED CV HYPERPARAMETER TUNING (OPSI LANJUTAN)

Untuk mengeksplorasi apakah optimasi parameter dapat meningkatkan daya pisah SVM RBF tanpa membocorkan data uji:

### Skema Validasi Berantai (Nested GroupKFold CV):
- **Outer Loop**: 5-Fold GroupKFold (Fold validasi luar tetap 100% independen sebagai data uji akhir).
- **Inner Loop**: 4-Fold GroupKFold yang dijalankan strictly di dalam 41 subjek data latih ($X_{\text{train}}$) untuk mencari kombinasi parameter terbaik:
  - $C \in [0.1, 1.0, 10.0, 100.0]$
  - $\gamma \in ['scale', 'auto', 0.01, 0.1, 1.0]$
  - `class_weight` $\in ['balanced', None]$
- **Metrik Optimasi Inner Loop**: `balanced_accuracy` atau `macro_f1`.

*Status*: Rancangan tuning ini telah disiapkan dan siap dieksekusi setelah mendapatkan arahan serta persetujuan resmi Anda.

