function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env["PORT"] ?? "3001", 10),
  geminiApiKey: requireEnv("GEMINI_API_KEY"),
  geminiModel: process.env["GEMINI_MODEL"] ?? "gemini-3.1-pro-preview",
  geminiTimeoutMs: parseInt(process.env["GEMINI_TIMEOUT_MS"] ?? "90000", 10),
  githubToken: process.env["GITHUB_TOKEN"],
  maxBatchSize: parseInt(process.env["MAX_BATCH_SIZE"] ?? "25", 10),
  maxConcurrentJobs: parseInt(process.env["MAX_CONCURRENT_JOBS"] ?? "3", 10),
  maxFileChars: parseInt(process.env["MAX_FILE_CHARS"] ?? "50000", 10),
  corsOrigin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
} as const;

