# GitHub Repository Analyzer

A full-stack web application that analyzes GitHub repositories using the **GitHub API** and **Google Gemini AI**, then generates a polished, downloadable **PDF report** with three audience-specific sections—one for non-technical readers, one for business stakeholders, and one for engineers.

> Paste any GitHub URL → get a multi-layered report in under a minute.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Configuration Reference](#configuration-reference)
- [API Endpoints](#api-endpoints)
- [Common Development Tasks](#common-development-tasks)
- [Deployment](#deployment)

---

## How It Works

1. **Input** — Paste one or more GitHub repository URLs (or upload a `.txt` / `.csv` file) into the web UI. Optionally provide a GitHub Personal Access Token for private repos.
2. **Fetch** — The backend uses the GitHub REST API (via [Octokit](https://github.com/octokit/octokit.js)) to pull repo metadata, the full file tree, README, dependency manifests, and source code.
3. **Analyze** — Three parallel Gemini AI prompts generate audience-tailored summaries:
   - **Plain English Summary** — For anyone; no jargon.
   - **Business / Functional Summary** — For product managers and executives.
   - **Technical Deep-Dive** — For engineers and architects.
4. **Generate** — Puppeteer renders a styled HTML template into a professional PDF. Batch jobs produce individual + combined PDF reports.
5. **Download** — The frontend polls for completion and presents download links.

---

## Architecture Overview

```
┌──────────────────────────────────────────┐
│            Frontend (Next.js 16)          │
│  • URL input / CSV upload                 │
│  • Progress tracking with status polling  │
│  • PDF download                           │
│  Deployed: Vercel                         │
└──────────────────┬───────────────────────┘
                   │  REST API
┌──────────────────▼───────────────────────┐
│         Backend (Express + TypeScript)    │
│  • GitHub API client (Octokit)            │
│  • Gemini AI client (3 agents)            │
│  • Puppeteer PDF generation               │
│  • In-memory async job queue              │
│  Deployed: Railway                        │
└────────────┬───────────┬─────────────────┘
             │           │
    ┌────────▼───┐  ┌────▼──────────┐
    │ GitHub API │  │  Gemini API   │
    │ (repo data)│  │ (AI analysis) │
    └────────────┘  └───────────────┘
```

**Key design decisions:**

- **In-memory job queue** — No Redis or database required. Jobs are stored in a `Map` with a 1-hour TTL. Repos within a batch are processed sequentially to respect Gemini rate limits; the three AI agents run in parallel per repo.
- **Source-code-aware analysis** — The backend reads *all* source files (up to a configurable character limit), not just READMEs, so Gemini can provide factual analysis instead of guesswork.
- **Typed API envelope** — Every backend response uses a consistent `{ success, data }` / `{ success, error }` wrapper.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend | Node.js 20, Express 4, TypeScript 5 (strict mode) |
| AI | Google Gemini (`@google/generative-ai`) — configurable model |
| GitHub | Octokit REST client |
| PDF | Puppeteer (HTML → PDF), pdf-lib (merging) |
| Rate Limiting | express-rate-limit (10 req/min on `/api/analyze`) |

---

## Repository Structure

```
/
├── frontend/                     # Next.js app
│   ├── app/
│   │   ├── page.tsx              # Home — URL input UI
│   │   ├── analyzing/page.tsx    # Progress tracking page
│   │   └── results/page.tsx      # Report download page
│   ├── components/
│   │   ├── UrlInput.tsx          # Textarea for pasting URLs
│   │   ├── FileUpload.tsx        # .txt/.csv upload component
│   │   ├── ProgressTable.tsx     # Per-repo status table
│   │   ├── ReportCard.tsx        # Individual repo result card
│   │   ├── AppShell.tsx          # App-level layout wrapper
│   │   └── ui/                   # Reusable UI primitives
│   ├── lib/api.ts                # Typed fetch wrappers to backend
│   ├── types/index.ts            # Shared frontend types
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express entry point + middleware
│   │   ├── config.ts             # Typed env var config
│   │   ├── routes/
│   │   │   ├── analyze.ts        # POST /api/analyze
│   │   │   ├── status.ts         # GET  /api/status/:jobId
│   │   │   └── report.ts         # GET  /api/report/:repoId & /combined/:jobId
│   │   ├── services/
│   │   │   ├── github.ts         # GitHub API client + file fetching
│   │   │   ├── gemini.ts         # Gemini AI — 3 audience-specific agents
│   │   │   └── pdfGenerator.ts   # Puppeteer HTML-to-PDF rendering
│   │   ├── queue/
│   │   │   └── jobQueue.ts       # In-memory async job queue
│   │   ├── types/index.ts        # Shared backend types
│   │   └── utils/                # Helpers: truncation, errors, logger, etc.
│   ├── .env.example              # Backend env template
│   ├── tsconfig.json
│   └── package.json
│
├── PRD_GitHub_Repo_Analyzer.md   # Product requirements document
├── CLAUDE.md                     # AI coding agent instructions
└── README.md                     # ← You are here
```

---

## Getting Started

### Prerequisites

- **Node.js ≥ 20**
- **npm** (comes with Node.js)
- A **Google Gemini API key** ([get one here](https://aistudio.google.com/apikey))
- *(Optional)* A **GitHub Personal Access Token** for analyzing private repos — requires the `repo` scope

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/github-repo-analyzer.git
cd github-repo-analyzer
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and set your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the backend dev server:

```bash
npm run dev
# → Listening on http://localhost:3001
```

### 3. Set up the frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Verify `frontend/.env.local` points to the backend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Start the frontend dev server:

```bash
npm run dev
# → Listening on http://localhost:3000
```

### 4. Open the app

Navigate to [http://localhost:3000](http://localhost:3000), paste a GitHub URL, and click **Generate reports**.

---

## Configuration Reference

### Backend — `backend/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | **Yes** | — | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-3.1-pro-preview` | Gemini model to use for analysis |
| `GEMINI_TIMEOUT_MS` | No | `90000` | Timeout per Gemini API call (ms) |
| `GITHUB_TOKEN` | No | — | Default GitHub token for private repos |
| `PORT` | No | `3001` | Backend server port |
| `MAX_BATCH_SIZE` | No | `25` | Max repos per analysis job |
| `MAX_CONCURRENT_JOBS` | No | `3` | Max simultaneous jobs (returns 429 if exceeded) |
| `MAX_FILE_CHARS` | No | `250000` | Max characters of source code sent to Gemini |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin (set to your frontend URL) |

### Frontend — `frontend/.env.local`

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Yes** | `http://localhost:3001` | Backend API base URL |

---

## API Endpoints

All responses use a typed envelope: `{ success: true, data: T }` or `{ success: false, error: { code, message } }`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyze` | Submit repo URLs for analysis. Body: `{ repoUrls: string[], githubToken?: string }`. Returns `{ jobId }`. |
| `GET` | `/api/status/:jobId` | Poll job progress. Returns the full `AnalysisJob` with per-repo status. |
| `GET` | `/api/report/:repoId` | Download the PDF report for a single repo. |
| `GET` | `/api/report/combined/:jobId` | Download the combined PDF for all repos in a job. |
| `GET` | `/api/health` | Health check. Returns `{ ok: true }`. |

**Job status lifecycle:** `queued` → `fetching` → `analyzing` → `done` | `error`

---

## Common Development Tasks

### Run both frontend and backend

Open two terminals:

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### Type-check the backend

```bash
cd backend
npm run typecheck    # runs tsc --noEmit
```

### Build for production

```bash
# Backend
cd backend
npm run build        # compiles to dist/
npm start            # runs dist/index.js

# Frontend
cd frontend
npm run build        # Next.js production build
npm start            # starts production server
```

### Lint the frontend

```bash
cd frontend
npm run lint
```

### Test a PDF report locally

1. Start both servers (see above).
2. Open `http://localhost:3000`.
3. Paste a GitHub URL (e.g., `https://github.com/expressjs/express`).
4. Click **Generate reports** and wait for completion.
5. Download the PDF from the results page.

### Analyze private repositories

Provide a GitHub Personal Access Token with the `repo` scope either:
- **Per-request** — Enter it in the "GitHub token" field in the UI (never stored; used transiently).
- **Server-wide default** — Set `GITHUB_TOKEN` in `backend/.env`.

---

## Deployment

### Frontend → Vercel

1. Connect the repository to Vercel.
2. Set the root directory to `frontend`.
3. Add the environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```
4. Deploy — pushes to `main` auto-deploy.

### Backend → Railway

1. Connect the repository to Railway.
2. Set the root directory to `backend`.
3. Add environment variables:
   ```
   GEMINI_API_KEY=your_key
   CORS_ORIGIN=https://your-frontend.vercel.app
   NODE_ENV=production
   ```
4. Railway auto-detects Node.js and provides a public HTTPS URL.

> **Note:** Puppeteer requires `--no-sandbox` to run on Railway, which is already configured in the codebase.

---

## License

ISC