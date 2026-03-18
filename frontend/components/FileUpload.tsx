"use client";

import { useRef } from "react";

export interface FileUploadProps {
  onUrls: (urls: string[]) => void;
}

function parseUrlsFromText(text: string): string[] {
  return text
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function FileUpload({ onUrls }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handlePick = (): void => {
    inputRef.current?.click();
  };

  const handleFile = (file: File): void => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      onUrls(parseUrlsFromText(text));
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-[var(--app-fg)]">Upload a file</label>
      <button
        type="button"
        onClick={handlePick}
        className="group flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-[var(--app-border)] px-4 py-10 text-sm text-[var(--app-muted)] transition-all duration-200 hover:border-[var(--accent)]/35 hover:bg-[var(--accent-subtle)] hover:text-[var(--app-fg)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:-translate-y-0.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Drop a .txt or .csv — one URL per line
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
