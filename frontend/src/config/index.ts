export const config = {
  appName: "EEG Wearable Platform",
  appSubtitle: "IoT EEG Monitoring & Machine Learning",
  projectTitle:
    "Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws/eeg",
  isProduction: process.env.NODE_ENV === "production",
};
