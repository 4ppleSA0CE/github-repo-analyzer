# CLAUDE.md
## GitHub Repository Analyzer — Coding Agent Instructions

This file is read by Claude Code when working in this repository.
Follow every instruction here exactly. These are not suggestions — they define
the production standard for this codebase.

---

## Project Overview

A full-stack web app that accepts GitHub repository URLs, analyzes them using
the GitHub API and Gemini AI, and generates a downloadable PDF report with
three audience-specific sections. Built to be deployed live on Vercel + Railway.

**Frontend:** Next.js 14 (App Router) + Tailwind CSS → Vercel
**Backend:** Node.js 20 + Express + TypeScript → Railway
**AI:** Google Gemini API (`@google/generative-ai`)
**GitHub:** Octokit REST client
**PDF:** Puppeteer (HTML-to-PDF) + pdf-lib (merging)
**Queue:** In-memory async queue (Railway-safe, no Redis required for MVP)

---

## Monorepo Structure

```
/
├── frontend/                  # Next.js app
│   ├── app/
│   │   ├── page.tsx           # Home — input UI
│   │   ├── analyzing/
│   │   │   └── page.tsx       # Progress tracking
│   │   └── results/
│   │       └── page.tsx       # Download results
│   ├── components/
│   │   ├── UrlInput.tsx
│   │   ├── FileUpload.tsx
│   │   ├── ProgressTable.tsx
│   │   └── ReportCard.tsx
│   ├── lib/
│   │   └── api.ts             # Typed fetch wrappers to backend
│   ├── types/
│   │   └── index.ts           # Shared frontend types
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── index.ts           # Express entry point
│   │   ├── routes/
│   │   │   ├── analyze.ts     # POST /api/analyze
│   │   │   ├── status.ts      # GET /api/status/:jobId
│   │   │   └── report.ts      # GET /api/report/:repoId and /combined/:jobId
│   │   ├── services/
│   │   │   ├── github.ts      # GitHub API client
│   │   │   ├── gemini.ts      # Gemini API client + 3 agent prompts
│   │   │   └── pdfGenerator.ts # Puppeteer PDF generation
│   │   ├── queue/
│   │   │   └── jobQueue.ts    # In-memory async job queue
│   │   ├── types/
│   │   │   └── index.ts       # All shared backend types
│   │   └── utils/
│   │       ├── truncate.ts    # Context window truncation helpers
│   │       └── errors.ts      # Typed error classes
│   ├── tsconfig.json
│   └── package.json
│
├── AGENTS.md
└── README.md
```

---

## TypeScript Rules

### Always use strict TypeScript. No exceptions.

```json
// tsconfig.json (both frontend and backend)
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Never use `any`. Ever.
```typescript
// ❌ WRONG
const data: any = response.data;
function process(input: any) {}

// ✅ CORRECT
const data: RepoContext = response.data;
function process(input: RepoContext): AnalysisResult {}
```

### Always type function return values explicitly.
```typescript
// ❌ WRONG
async function fetchRepo(url: string) {
  return await octokit.request(...);
}

// ✅ CORRECT
async function fetchRepo(url: string): Promise<RepoContext> {
  return await octokit.request(...);
}
```

### Define all shared types in `types/index.ts`. Never inline complex types.
```typescript
// types/index.ts
export interface RepoContext {
  name: string;
  owner: string;
  description: string | null;
  primaryLanguage: string;
  languages: Record<string, number>;
  stars: number;
  forks: number;
  lastUpdated: string;
  contributorCount: number;
  readme: string;
  entryFileContents: string;
  dependencyManifest: string;
  fileTree: string[];
  totalFiles: number;
}

export interface AnalysisResult {
  repoUrl: string;
  repoContext: RepoContext;
  laymanSummary: string;
  businessSummary: string;
  engineerSummary: string;
  generatedAt: string;
}

export type JobStatus = "queued" | "fetching" | "analyzing" | "done" | "error";

export interface RepoJob {
  repoUrl: string;
  status: JobStatus;
  result?: AnalysisResult;
  error?: string;
}

export interface AnalysisJob {
  jobId: string;
  repos: RepoJob[];
  createdAt: string;
  completedAt?: string;
}
```

---

## Error Handling Rules

### Never throw raw strings. Always use typed error classes.

```typescript
// utils/errors.ts
export class GitHubFetchError extends Error {
  constructor(
    public readonly repoUrl: string,
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "GitHubFetchError";
  }
}

export class GeminiAnalysisError extends Error {
  constructor(
    public readonly agent: "layman" | "business" | "engineer",
    public readonly attempt: number,
    message: string
  ) {
    super(message);
    this.name = "GeminiAnalysisError";
  }
}

export class InvalidRepoUrlError extends Error {
  constructor(public readonly url: string) {
    super(`Invalid GitHub repository URL: ${url}`);
    this.name = "InvalidRepoUrlError";
  }
}
```

### Every async function must handle its own errors — never let them bubble to Express unhandled.

```typescript
// ✅ CORRECT — errors are caught, typed, and returned
async function analyzeRepo(repoUrl: string): Promise<AnalysisResult | AppError> {
  try {
    const context = await fetchRepoContext(repoUrl);
    const result = await runAllAgents(context);
    return result;
  } catch (err) {
    if (err instanceof GitHubFetchError) {
      return { type: "error", code: "GITHUB_FETCH_FAILED", message: err.message };
    }
    return { type: "error", code: "UNKNOWN", message: "Unexpected error during analysis" };
  }
}
```

### All Express routes must use a typed async wrapper.

```typescript
// utils/asyncRoute.ts
import { Request, Response, NextFunction } from "express";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncRoute(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

// Usage in routes:
router.post("/analyze", asyncRoute(async (req, res) => {
  // handler body
}));
```

---

## API Response Format

Every backend endpoint must return a consistent response envelope.
Never return raw data without this wrapper.

```typescript
// Typed response envelope
interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Helper
function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data } satisfies ApiSuccess<T>);
}

function sendError(res: Response, code: string, message: string, status = 400): void {
  res.status(status).json({ success: false, error: { code, message } } satisfies ApiError);
}
```

---

## Service Layer Rules

### `github.ts` — GitHub API Client

```typescript
// Rules:
// 1. Always validate URL format before calling GitHub
// 2. Parse owner/repo from URL — never trust raw user input as a path param
// 3. Authenticate with token when provided, fall back to unauthenticated
// 4. Respect rate limits — check X-RateLimit-Remaining header
// 5. Truncate all content before returning (use truncate.ts helpers)

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (!match?.[1] || !match?.[2]) {
    throw new InvalidRepoUrlError(url);
  }
  return { owner: match[1], repo: match[2] };
}
```

### `gemini.ts` — AI Agent Client

```typescript
// Rules:
// 1. Three named functions: runLaymanAgent, runBusinessAgent, runEngineerAgent
// 2. Each function accepts RepoContext and returns Promise<string>
// 3. Temperature: 0.3 for all agents (factual consistency)
// 4. Retry once on timeout (5s delay), then throw GeminiAnalysisError
// 5. Never log prompt contents — they may contain private repo code
// 6. Validate that response is non-empty before returning

export async function runLaymanAgent(context: RepoContext): Promise<string> {}
export async function runBusinessAgent(context: RepoContext): Promise<string> {}
export async function runEngineerAgent(context: RepoContext): Promise<string> {}
```

### `pdfGenerator.ts` — PDF Service

```typescript
// Rules:
// 1. Accept AnalysisResult and return Buffer (PDF bytes)
// 2. Use an HTML template string — keep styles inline (Puppeteer doesn't load external CSS)
// 3. Report must have: cover section, 3 clearly labelled content sections, page numbers
// 4. Use a clean, professional font (system-ui or Arial)
// 5. Launch Puppeteer with --no-sandbox for Railway compatibility:
//    puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
// 6. Always close the browser in a finally block

export async function generateRepoPdf(result: AnalysisResult): Promise<Buffer> {}
export async function combinePdfs(buffers: Buffer[]): Promise<Buffer> {}
```

---

## Queue Rules (`jobQueue.ts`)

```typescript
// In-memory queue rules:
// 1. Jobs are stored in a Map<string, AnalysisJob>
// 2. jobId is a UUID (use crypto.randomUUID())
// 3. Process repos sequentially within a job (not parallel) to avoid Gemini rate limits
// 4. Max concurrent jobs: 3 (reject with 429 if exceeded)
// 5. Jobs expire from memory after 1 hour
// 6. Never block the event loop — all processing is async

const jobs = new Map<string, AnalysisJob>();

export async function createJob(repoUrls: string[]): Promise<string> {}
export function getJob(jobId: string): AnalysisJob | undefined {}
export async function processJob(jobId: string): Promise<void> {}
```

---

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=3001
GEMINI_API_KEY=              # Required
GITHUB_TOKEN=                # Optional — default token for private repos
MAX_BATCH_SIZE=25
MAX_CONCURRENT_JOBS=3
MAX_FILE_CHARS=50000
CORS_ORIGIN=http://localhost:3000   # Set to Vercel URL in production
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001   # Set to Railway URL in production
```

### Never hardcode secrets. Never commit `.env` files.
### Always access env vars through a typed config module:

```typescript
// backend/src/config.ts
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env["PORT"] ?? "3001", 10),
  geminiApiKey: requireEnv("GEMINI_API_KEY"),
  githubToken: process.env["GITHUB_TOKEN"],
  maxBatchSize: parseInt(process.env["MAX_BATCH_SIZE"] ?? "25", 10),
  maxConcurrentJobs: parseInt(process.env["MAX_CONCURRENT_JOBS"] ?? "3", 10),
  maxFileChars: parseInt(process.env["MAX_FILE_CHARS"] ?? "50000", 10),
  corsOrigin: process.env["CORS_ORIGIN"] ?? "http://localhost:3000",
} as const;
```

---

## Frontend Rules

### Always use the typed API client in `lib/api.ts` — never call `fetch` directly in components.

```typescript
// lib/api.ts
export async function startAnalysis(
  repoUrls: string[],
  githubToken?: string
): Promise<{ jobId: string }> {}

export async function pollJobStatus(jobId: string): Promise<AnalysisJob> {}

export async function downloadReport(repoId: string): Promise<Blob> {}

export async function downloadCombinedReport(jobId: string): Promise<Blob> {}
```

### Component rules:
- All components are functional with typed props interfaces
- No component fetches data directly — use `lib/api.ts`
- Loading, error, and empty states must be handled in every component that fetches
- Use `"use client"` only when the component needs browser APIs or event handlers

### Status polling:
```typescript
// Poll every 2 seconds while job is in progress
// Stop polling when all repos reach "done" or "error"
// Use useEffect cleanup to cancel polling on unmount
```

---

## Security Rules

1. **Validate all GitHub URLs server-side** — use `parseRepoUrl()` before any API call
2. **Never log GitHub tokens** — strip from all log output
3. **Never log Gemini prompt content** — may contain private repo source code
4. **Cap file content size** before sending to Gemini — enforce `MAX_FILE_CHARS`
5. **Rate limit the `/api/analyze` endpoint** — max 10 requests per IP per minute
6. **Set CORS explicitly** — only allow the configured `CORS_ORIGIN`
7. **GitHub tokens are session-only** — never store in DB, never log, never expose in responses

```typescript
// CORS setup in index.ts
import cors from "cors";
app.use(cors({
  origin: config.corsOrigin,
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));
```

---

## Code Style Rules

- **No `var`** — use `const` by default, `let` only when reassignment is needed
- **No default exports in backend** — named exports only
- **Async/await only** — no `.then()` chains
- **No magic numbers** — use named constants from `config.ts`
- **No console.log in production paths** — use a lightweight logger:

```typescript
// utils/logger.ts
const isDev = process.env["NODE_ENV"] !== "production";

export const logger = {
  info: (msg: string, meta?: object) => console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg: string, meta?: object) => console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
  error: (msg: string, meta?: object) => console.error(JSON.stringify({ level: "error", msg, ...meta })),
  debug: (msg: string, meta?: object) => { if (isDev) console.log(JSON.stringify({ level: "debug", msg, ...meta })); },
};
```

- **Function length** — if a function exceeds ~40 lines, extract helpers
- **File length** — if a file exceeds ~200 lines, split into modules

---

## Deployment Checklist

Before pushing to Vercel / Railway, verify:

- [ ] All `process.env` accesses go through `config.ts`
- [ ] No `.env` files committed (check `.gitignore`)
- [ ] Puppeteer launched with `--no-sandbox` flag
- [ ] `CORS_ORIGIN` set to production Vercel URL in Railway env vars
- [ ] `NEXT_PUBLIC_API_URL` set to production Railway URL in Vercel env vars
- [ ] `NODE_ENV=production` set on Railway
- [ ] `tsconfig.json` has `"strict": true` in both frontend and backend
- [ ] No TypeScript errors (`tsc --noEmit` passes cleanly)
- [ ] PDF generation tested with a real repo before deploy

---

*End of CLAUDE.md*
