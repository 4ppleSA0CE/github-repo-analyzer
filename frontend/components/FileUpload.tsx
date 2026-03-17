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
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-900">Upload .txt or .csv</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePick}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50"
        >
          Choose file
        </button>
        <span className="text-xs text-zinc-600">One URL per line (or comma-separated)</span>
      </div>
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

