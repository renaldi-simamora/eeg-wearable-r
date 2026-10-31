"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Maximize2, ChevronLeft, ChevronRight, X, Eye } from "lucide-react";

interface Device3DImage {
  id: string;
  src: string;
  title: string;
  caption: string;
}

const DEVICE_3D_IMAGES: Device3DImage[] = [
  {
    id: "3d-1",
    src: "/images/3d_1.png",
    title: "Tampilan 3D 1",
    caption: "Model 3D purwarupa perangkat IoT Wearable EEG — visualisasi fisik 1.",
  },
  {
    id: "3d-2",
    src: "/images/3d_2.png",
    title: "Tampilan 3D 2",
    caption: "Model 3D purwarupa perangkat IoT Wearable EEG — visualisasi fisik 2.",
  },
  {
    id: "3d-3",
    src: "/images/3d_3.png",
    title: "Tampilan 3D 3",
    caption: "Model 3D purwarupa perangkat IoT Wearable EEG — visualisasi fisik 3.",
  },
];

export function Device3DGallery() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const activeImage = DEVICE_3D_IMAGES[activeIndex];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? DEVICE_3D_IMAGES.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev === DEVICE_3D_IMAGES.length - 1 ? 0 : prev + 1));
  };

  return (
    <section
      id="visual-3d"
      className="scroll-mt-24 sm:scroll-mt-28 bg-[#FAF9F6] rounded-[32px] sm:rounded-[36px] border border-[rgba(40,40,30,0.06)] p-6 sm:p-10 lg:p-12 shadow-[0_16px_40px_-20px_rgba(50,48,38,0.08)] space-y-8"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.14em] uppercase text-[#77776E]">
            <span>DESAIN FISIK &amp; MODEL 3D</span>
            <span className="w-12 h-px bg-[#77776E]/30" />
          </div>
          <h2 className="font-serif font-medium text-3xl sm:text-4xl leading-tight text-[#1E201D] tracking-[-0.01em]">
            Visualisasi 3D Perangkat
          </h2>
          <p className="text-xs sm:text-sm text-[#6E7168] leading-relaxed">
            Representasi desain fisik purwarupa IoT Wearable EEG sebelum proses realisasi perangkat.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-end">
          <span className="text-xs font-mono text-stone-500">
            {activeIndex + 1} / {DEVICE_3D_IMAGES.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              aria-label="Gambar Sebelumnya"
              className="p-2 rounded-full bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 transition-colors cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Gambar Berikutnya"
              className="p-2 rounded-full bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 transition-colors cursor-pointer shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Gallery Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Main Showcase Visual (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-white rounded-[26px] p-4 sm:p-6 border border-[rgba(40,40,30,0.08)] shadow-xs">
          <div
            onClick={() => setLightboxOpen(true)}
            className="group relative aspect-[16/10] sm:aspect-[16/10] w-full rounded-2xl overflow-hidden bg-[#F5F3ED] border border-stone-200/80 cursor-pointer flex items-center justify-center"
          >
            <Image
              src={activeImage.src}
              alt={activeImage.title}
              fill
              className="object-contain p-4 sm:p-6 transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 1024px) 100vw, 750px"
              priority
            />

            {/* Badge Indicator Top-Left */}
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-[rgba(40,40,30,0.08)] text-[11px] font-mono font-semibold text-[#1E201D] shadow-2xs">
              {activeImage.title}
            </div>

            {/* Hover Overlay with Zoom Icon */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-mono backdrop-blur-xs">
              <Maximize2 className="w-4 h-4 text-[#A8BE93]" />
              <span>Klik untuk Perbesar Gambar 3D</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-stone-100 mt-4">
            <div>
              <span className="text-xs font-semibold text-[#1E201D] block">
                {activeImage.title}
              </span>
              <p className="text-[11px] text-[#77776E] mt-0.5">
                {activeImage.caption}
              </p>
            </div>

            <button
              onClick={() => setLightboxOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E8ECDF] hover:bg-[#D9DEC8] text-[#58684C] text-xs font-semibold font-mono transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Lihat Ukuran Penuh</span>
            </button>
          </div>
        </div>

        {/* Companion Thumbnails Column (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#77776E] block">
              Pilihan Perspektif Desain
            </span>
            <p className="text-xs text-stone-500">
              Pilih sudut pandang visualisasi 3D perangkat untuk memeriksa rancangan fisik purwarupa.
            </p>
          </div>

          <div className="flex flex-col gap-3 flex-1 justify-center">
            {DEVICE_3D_IMAGES.map((img, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <div
                  key={img.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`group flex items-center gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white border-[#5F6E52] ring-2 ring-[#5F6E52]/20 shadow-xs"
                      : "bg-white/80 hover:bg-white border-stone-200/80 hover:border-stone-300"
                  }`}
                >
                  <div className="relative w-20 h-16 rounded-xl overflow-hidden bg-[#F5F3ED] border border-stone-200 shrink-0">
                    <Image
                      src={img.src}
                      alt={img.title}
                      fill
                      className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                      sizes="80px"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold block truncate ${
                        isSelected ? "text-[#3D4C32]" : "text-[#1E201D]"
                      }`}>
                        {img.title}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#5F6E52]" />
                      )}
                    </div>
                    <span className="text-[11px] text-[#77776E] block font-mono mt-0.5">
                      Visualisasi #{idx + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-100/80 border border-stone-200/80 text-[11px] text-stone-600 leading-relaxed font-sans">
            Desain fisik 3D menjadi acuan peletakan modul biosensing TGAM1, mikrokontroler gateway ESP32, dan routing kabel 3 elektroda snap.
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-6 flex flex-col items-center justify-center animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl max-h-[85vh] aspect-[16/10] bg-[#0A0C10] rounded-3xl overflow-hidden border border-stone-700 shadow-2xl p-4 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeImage.src}
              alt={activeImage.title}
              fill
              className="object-contain p-4"
              sizes="100vw"
              priority
            />

            {/* Close Button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer backdrop-blur-xs"
              aria-label="Tutup Tampilan Penuh"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prev & Next Floating Buttons */}
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer border border-white/10"
              aria-label="Sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer border border-white/10"
              aria-label="Berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Caption Bar Bottom */}
            <div className="absolute bottom-4 left-4 right-4 px-4 py-2.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 text-white text-xs font-mono flex items-center justify-between">
              <span>{activeImage.title} — {activeImage.caption}</span>
              <span className="text-stone-400 text-[11px]">
                {activeIndex + 1} dari {DEVICE_3D_IMAGES.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

