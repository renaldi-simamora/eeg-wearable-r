"use client";

import React, { useState, useMemo } from "react";
import { Check, Copy, Maximize2, Minimize2, FileCode, ChevronDown, ChevronUp } from "lucide-react";

interface CodeViewerProps {
  code: string;
  filename?: string;
  language?: string;
  title?: string;
  maxHeight?: string;
  allowFullscreen?: boolean;
}

export function CodeViewer({
  code,
  filename = "firmware.ino",
  language = "C++ / Arduino",
  title,
  maxHeight = "460px",
  allowFullscreen = true,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const lines = useMemo(() => code.split("\n"), [code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Lightweight robust C++ syntax highlighter tokenization per line
  const renderHighlightedLine = (line: string) => {
    // Empty line
    if (!line) {
      return <span>&nbsp;</span>;
    }

    // Comment line: starts with // or * or /*
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      return <span className="text-stone-400 italic">{line}</span>;
    }

    // Preprocessor line: starts with #
    if (trimmed.startsWith("#")) {
      const parts = line.split(/(#\w+)/g);
      return (
        <span>
          {parts.map((p, idx) =>
            p.startsWith("#") ? (
              <span key={idx} className="text-amber-300 font-semibold">{p}</span>
            ) : (
              <span key={idx} className="text-stone-200">{p}</span>
            )
          )}
        </span>
      );
    }

    // General tokenization regex for C++
    const tokens = line.split(
      /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*.*?\*\/|\/\/.*|0x[0-9a-fA-F]+|\b(?:int|int8_t|int16_t|int32_t|uint8_t|uint16_t|uint32_t|size_t|bool|char|float|double|void|unsigned|long|const|constexpr|inline|static|auto|enum|struct|class|return|if|else|while|for|switch|case|break|default|continue|sizeof|new|delete|true|false|NULL|HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|SERIAL_8N1|WL_CONNECTED|WIFI_STA|SSD1306_WHITE|SSD1306_SWITCHCAPVCC)\b|\b(?:Serial|HardwareSerial|WiFi|WiFiClientSecure|HTTPClient|ArduinoJson|JsonDocument|JsonObject|JsonArray|Adafruit_SSD1306|Wire|ESP|millis|delay|pinMode|digitalRead|digitalWrite|snprintf|serializeJson)\b)/g
    );

    return (
      <span>
        {tokens.map((token, i) => {
          if (!token) return null;

          // Comments inside line
          if (token.startsWith("//") || token.startsWith("/*")) {
            return (
              <span key={i} className="text-stone-400 italic">
                {token}
              </span>
            );
          }

          // String literals
          if (
            (token.startsWith('"') && token.endsWith('"')) ||
            (token.startsWith("'") && token.endsWith("'"))
          ) {
            return (
              <span key={i} className="text-emerald-300">
                {token}
              </span>
            );
          }

          // Hex numbers
          if (token.startsWith("0x")) {
            return (
              <span key={i} className="text-orange-300 font-mono">
                {token}
              </span>
            );
          }

          // C++ Keywords & Types
          if (
            /^(int|int8_t|int16_t|int32_t|uint8_t|uint16_t|uint32_t|size_t|bool|char|float|double|void|unsigned|long|const|constexpr|inline|static|auto|enum|struct|class|sizeof|new|delete)$/.test(
              token
            )
          ) {
            return (
              <span key={i} className="text-sky-300 font-semibold">
                {token}
              </span>
            );
          }

          // Control flow keywords
          if (/^(return|if|else|while|for|switch|case|break|default|continue)$/.test(token)) {
            return (
              <span key={i} className="text-purple-300 font-semibold">
                {token}
              </span>
            );
          }

          // Constants & Booleans
          if (/^(true|false|NULL|HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|SERIAL_8N1|WL_CONNECTED|WIFI_STA|SSD1306_WHITE|SSD1306_SWITCHCAPVCC)$/.test(token)) {
            return (
              <span key={i} className="text-rose-300 font-medium">
                {token}
              </span>
            );
          }

          // Arduino / ESP32 Standard API Classes
          if (
            /^(Serial|HardwareSerial|WiFi|WiFiClientSecure|HTTPClient|ArduinoJson|JsonDocument|JsonObject|JsonArray|Adafruit_SSD1306|Wire|ESP|millis|delay|pinMode|digitalRead|digitalWrite|snprintf|serializeJson)$/.test(
              token
            )
          ) {
            return (
              <span key={i} className="text-yellow-200">
                {token}
              </span>
            );
          }

          // Default text / punctuation / operators
          return <span key={i} className="text-stone-200">{token}</span>;
        })}
      </span>
    );
  };

  const codeContainerStyle = isFullscreen
    ? "h-[calc(86vh-60px)]"
    : isExpanded
    ? "max-h-[800px]"
    : `max-h-[${maxHeight}]`;

  return (
    <>
      <div className="rounded-2xl overflow-hidden border border-stone-800 bg-[#0F1115] shadow-lg flex flex-col font-mono text-xs">
        {/* Code Bar Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#171A21] border-b border-stone-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="h-4 w-px bg-stone-700/80 mx-1" />
            <div className="flex items-center gap-1.5 text-stone-300">
              <FileCode className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-[12px] font-semibold text-stone-200 tracking-tight">
                {filename}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-stone-800 text-[10px] text-stone-400 font-sans font-medium">
                {language}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-500 font-sans hidden sm:inline">
              {lines.length} baris ({code.length.toLocaleString()} karakter)
            </span>

            {/* Expand / Collapse Button */}
            {!isFullscreen && lines.length > 30 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-[11px] text-stone-300 transition-colors cursor-pointer"
                title={isExpanded ? "Perkecil Area Kode" : "Perluas Area Kode"}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Perkecil</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Perluas</span>
                  </>
                )}
              </button>
            )}

            {/* Fullscreen Button */}
            {allowFullscreen && (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-[11px] text-stone-300 transition-colors cursor-pointer"
                title="Buka Tampilan Penuh"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Layar Penuh</span>
              </button>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-sans font-medium transition-all cursor-pointer ${
                copied
                  ? "bg-emerald-600/90 text-white shadow-xs"
                  : "bg-[#5F6E52] hover:bg-[#4E5C43] text-white shadow-xs"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-200" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {title && (
          <div className="px-4 py-2 bg-stone-900/60 border-b border-stone-800/50 text-[11px] text-stone-400 font-sans">
            {title}
          </div>
        )}

        {/* Code Content with Line Numbers */}
        <div
          className={`overflow-auto divide-y-0 text-[11.5px] leading-[1.65] font-mono selection:bg-[#5F6E52]/40 selection:text-white ${
            isFullscreen ? "h-[calc(86vh-70px)]" : isExpanded ? "max-h-[750px]" : "max-h-[440px]"
          }`}
        >
          <div className="flex min-w-full">
            {/* Line numbers column */}
            <div className="select-none py-3.5 px-3 bg-[#111317] border-r border-stone-800/80 text-stone-600 text-right font-mono min-w-[48px] text-[11px]">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code text column */}
            <div className="py-3.5 px-4 overflow-x-auto flex-1 font-mono whitespace-pre bg-[#0F1115]">
              {lines.map((line, i) => (
                <div key={i} className="hover:bg-stone-800/30 px-1 -mx-1 rounded-xs">
                  {renderHighlightedLine(line)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal View */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-4 sm:p-6 flex flex-col justify-center items-center animate-in fade-in duration-150">
          <div className="w-full max-w-6xl h-[90vh] bg-[#0F1115] rounded-3xl border border-stone-700 shadow-2xl flex flex-col overflow-hidden">
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#171A21] border-b border-stone-800">
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-[#5F6E52]" />
                <div>
                  <h3 className="text-sm font-semibold text-white font-mono">{filename}</h3>
                  <p className="text-[11px] text-stone-400 font-sans">
                    Tampilan Penuh Source Code C++ / Arduino • {lines.length} Baris
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans font-medium transition-all cursor-pointer ${
                    copied ? "bg-emerald-600 text-white" : "bg-[#5F6E52] hover:bg-[#4E5C43] text-white"
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "Tersalin!" : "Salin Kode Lengkap"}</span>
                </button>

                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
                  title="Tutup Tampilan Penuh"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Fullscreen Content */}
            <div className="flex-1 overflow-auto flex font-mono text-[12px] leading-[1.65]">
              <div className="select-none py-4 px-3 bg-[#111317] border-r border-stone-800 text-stone-600 text-right min-w-[56px] text-xs">
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <div className="py-4 px-5 overflow-x-auto flex-1 whitespace-pre bg-[#0F1115]">
                {lines.map((line, i) => (
                  <div key={i} className="hover:bg-stone-800/30 px-1 -mx-1 rounded-xs">
                    {renderHighlightedLine(line)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

