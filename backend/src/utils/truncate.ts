export function truncateToChars(input: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  if (input.length <= maxChars) return input;
  return `${input.slice(0, Math.max(0, maxChars - 1))}…`;
}

export function coalesceText(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

