"use client";

import { useMemo, useState } from "react";

import { Textarea } from "./ui/Textarea";

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

  const error = touched && invalidCount > 0 ? `${invalidCount} invalid URL(s)` : undefined;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--app-fg)]">GitHub repository URLs</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={"https://github.com/vercel/next.js\nhttps://github.com/octokit/octokit.js"}
        error={error}
        className="min-h-[160px]"
      />
      <div className="flex items-center justify-between text-xs text-[var(--app-muted)]">
        <span>{urls.length} repo(s)</span>
        <span>One per line</span>
      </div>
    </div>
  );
}

