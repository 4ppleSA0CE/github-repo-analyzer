"use client";

import { useMemo, useState } from "react";

export interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
}

function isValidRepoUrl(url: string): boolean {
  return /github\.com\/[^/]+\/[^/]+/i.test(url);
}

export function UrlInput({ value, onChange }: UrlInputProps) {
  const [touched, setTouched] = useState(false);

  const urls = useMemo(() => {
    return value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [value]);

  const invalidCount = useMemo(() => urls.filter((u) => !isValidRepoUrl(u)).length, [urls]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-900">GitHub repo URLs</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={"https://github.com/vercel/next.js\nhttps://github.com/octokit/octokit.js"}
        className="min-h-[160px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400"
      />
      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span>{urls.length} repo(s)</span>
        {touched && invalidCount > 0 ? (
          <span className="text-red-600">{invalidCount} invalid URL(s)</span>
        ) : null}
      </div>
    </div>
  );
}

