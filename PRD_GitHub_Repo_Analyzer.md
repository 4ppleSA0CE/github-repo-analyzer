# Product Requirements Document
## GitHub Repository Analyzer

---

**Document Version:** 1.0  
**Date:** March 17, 2026  
**Status:** Draft  
**Author:** [Your Name]

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Users](#4-target-users)
5. [Core Features](#5-core-features)
6. [Output Specification — The 3-Point Report](#6-output-specification--the-3-point-report)
7. [Technical Architecture](#7-technical-architecture)
8. [API & Integrations](#8-api--integrations)
9. [Frontend Spec](#9-frontend-spec)
10. [Backend Spec](#10-backend-spec)
11. [Deployment](#11-deployment)
12. [Feature Requirements Table](#12-feature-requirements-table)
13. [Milestones & Phases](#13-milestones--phases)
14. [Open Questions](#14-open-questions)
15. [Out of Scope](#15-out-of-scope)

---

## 1. Overview

**GitHub Repository Analyzer** is a web application that accepts one or more GitHub repository URLs as input and generates a structured, downloadable PDF report with three distinct sections — each written for a different audience. The tool leverages the Gemini AI API to perform code comprehension and summarization, and the GitHub API to extract repository metadata, file structures, key functions, and dependency graphs.

The output is designed to serve everyone from non-technical recruiters to senior engineers — with language tailored to each audience level baked into the same report.

---

## 2. Problem Statement

When evaluating a GitHub repository — whether for hiring, due diligence, onboarding, or architecture review — different stakeholders need fundamentally different views of the same codebase:

- A **recruiter** needs to know what the project does in plain English.
- A **product manager or executive** needs to understand the business value and system function.
- An **engineer** needs to understand the architecture, key APIs, data flows, and dependencies.

Currently, none of these audiences have a fast, automated way to get the right level of detail. Reading a repo takes time, requires technical context, and produces inconsistent mental models across teams.

This tool solves that by generating a single, multi-layered report automatically from any GitHub URL.

---

## 3. Goals & Success Metrics

### Goals

- Accept up to 20+ GitHub repo URLs in a single batch (via paste or CSV upload)
- Analyze each repo using the GitHub API and Gemini AI
- Generate a clean, professional 3-section PDF report per repo, and optionally a combined report
- Deploy to Vercel (frontend) + Railway (backend) so the employer can test a live URL

### Success Metrics

| Metric | Target |
|---|---|
| Report generated per repo | < 60 seconds |
| Repos supported per batch | 20+ |
| Report download format | PDF |
| Deployment availability | Live public URL on Vercel/Railway |
| Supported repo types | Public + Private (via token) |

---

## 4. Target Users

### Persona 1 — The Recruiter / Non-Technical Reviewer
- Wants to know: "What does this project do?"
- Reads: Point 1 of the report (plain English summary)
- Pain: Can't read code, has no context, needs it fast

### Persona 2 — The Product Manager / Executive
- Wants to know: "What business function does this serve?"
- Reads: Point 2 of the report (functional/business summary)
- Pain: Understands systems at a high level but not implementation details

### Persona 3 — The Engineer / Technical Reviewer
- Wants to know: "What are the key APIs, data flows, and architectural decisions?"
- Reads: Point 3 of the report (technical deep-dive)
- Pain: Would need to manually trace calls, read docs, and grep through files

---

## 5. Core Features

### F1 — Input: URL Entry
- Text input that accepts one or more GitHub repository URLs (paste in, newline-separated)
- Optional GitHub Personal Access Token field for private repo access
- Real-time URL validation (must be valid github.com repo URLs)

### F2 — Input: CSV/File Upload
- Upload a `.txt` or `.csv` file containing a list of GitHub URLs (one per line)
- Parse and display a list of repos to be analyzed before processing begins
- Support batch sizes of 20+ repos

### F3 — Repo Access (GitHub API)
- Fetch repo metadata: name, description, language, stars, forks, last updated
- Fetch directory tree and file list
- Read key files: `README.md`, `package.json` / `requirements.txt` / `go.mod`, entry points
- Authenticate with GitHub token when provided (for private repos)

### F4 — AI Analysis (Gemini API)
- Send repo content to Gemini with structured prompts per report section
- Generate three distinct analyses (see Section 6)
- Handle rate limits and large repos gracefully (chunked file reading)

### F5 — Report Generation
- Generate a styled PDF report per repo
- Option to download all as a combined multi-repo PDF
- Option to download individual repo reports separately
- Reports are available immediately after analysis completes

### F6 — Progress & Status UI
- Show per-repo progress bar during batch analysis
- Display status: Queued → Fetching → Analyzing → Done / Error
- Allow user to cancel mid-batch

### F7 — Error Handling
- Graceful failure for invalid URLs, rate-limited repos, or AI timeouts
- Show partial results if some repos in a batch succeed and some fail
- Display specific error reason per repo

---

## 6. Output Specification — The 3-Point Report

Each PDF report contains exactly three sections. The same report serves all audiences — the sections are clearly labeled so each reader knows which section is for them.

---

### Point 1 — Plain English Summary *(For Anyone)*

**Depth:** Shallow. No technical jargon.  
**Audience:** Recruiters, non-technical reviewers, general public.  
**Length:** 1–2 paragraphs.  
**Content must include:**
- What this project does, in one sentence
- Who would use it and why
- What problem it solves
- Any notable achievements (stars, contributors, activity level)

**Example prompt to Gemini:**
> "Explain this GitHub repository in 1–2 paragraphs as if you're explaining it to someone with no technical background. Focus on what it does, who uses it, and why it matters."

---

### Point 2 — Business / Functional Summary *(For PMs & Executives)*

**Depth:** Medium. System-level thinking, no code.  
**Audience:** Product managers, business stakeholders, executives.  
**Length:** 3–5 bullet points or short paragraphs.  
**Content must include:**
- The high-level function of the system (e.g. "UI Dashboard", "Data Pipeline", "Auth Service")
- Key roles of the system in a larger product context
- Notable integrations or dependencies at a product level (e.g. "connects to Stripe, Postgres, and a REST API")
- Key objective of the repository

**Example prompt to Gemini:**
> "Describe the function of this repository as you would to a product manager. What does it do in the context of a larger system? What integrations does it have? What is its primary objective?"

---

### Point 3 — Technical Deep-Dive *(For Engineers)*

**Depth:** Full technical detail.  
**Audience:** Developers, architects, technical reviewers.  
**Content must include:**
- Identified tech stack and languages
- All key APIs exposed or consumed (endpoints, methods if detectable)
- Key functions and modules with a one-line description of each
- External service connections (databases, third-party APIs, message queues, etc.)
- Dependency list (from package.json / requirements.txt / go.mod / etc.)
- Suggested architecture diagram description (textual)

**Example prompt to Gemini:**
> "Provide a technical summary of this repository for a senior engineer. List all key APIs, external connections, important functions, the tech stack, and the dependency list."

---

## 7. Technical Architecture

```
┌──────────────────────────────────────┐
│            Frontend (Next.js)         │
│  - URL input / CSV upload             │
│  - Progress tracking UI               │
│  - Report download (PDF)              │
│  Deployed: Vercel                     │
└──────────────────┬───────────────────┘
                   │ REST API calls
┌──────────────────▼───────────────────┐
│            Backend (Node.js/Express)  │
│  - GitHub API integration             │
│  - Gemini API integration             │
│  - PDF generation (Puppeteer + pdf-lib)│
│  - Batch job queue                    │
│  Deployed: Railway                    │
└────────────┬───────────┬─────────────┘
             │           │
    ┌─────────▼──┐  ┌────▼──────────┐
    │ GitHub API │  │  Gemini API   │
    │ (repo data)│  │ (AI analysis) │
    └────────────┘  └───────────────┘
```

---

## 8. API & Integrations

### 8.1 GitHub REST API

| Endpoint | Purpose |
|---|---|
| `GET /repos/{owner}/{repo}` | Repo metadata |
| `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` | Full file tree |
| `GET /repos/{owner}/{repo}/contents/{path}` | Read file contents |
| `GET /repos/{owner}/{repo}/languages` | Language breakdown |
| `GET /repos/{owner}/{repo}/contributors` | Contributor list |

- Auth: `Authorization: Bearer {GITHUB_TOKEN}` (optional, for private repos)
- Rate limit: 60 req/hr unauthenticated, 5,000 req/hr authenticated
- Strategy for large repos: only read top-level files + `README`, `package.json`, entry points

### 8.2 Gemini API

| Parameter | Value |
|---|---|
| Model | `gemini-1.5-pro` (or `gemini-2.0-flash` for speed) |
| Input | Repo file contents + structured prompt |
| Output | Structured text per section |
| Auth | `GEMINI_API_KEY` env var |

- Three separate API calls per repo (one per report section)
- Chunking strategy: if repo content exceeds context window, prioritize README + entry files + dependency manifests

### 8.3 PDF Generation

- Library: **Puppeteer** (HTML-to-PDF) using an inline-styled HTML template
- Combined report: merge individual repo PDFs using `pdf-lib`
- Note: Programmatic PDF libraries (e.g. PDFKit) are out of scope for MVP — Puppeteer is required for consistent styling.

---

## 9. Frontend Spec

### Pages

#### `/` — Home / Input Page
- Header with product name and tagline
- Two input methods (tabs): "Paste URLs" and "Upload File"
- Optional GitHub Token field (password input, stored in session only — never sent to logs)
- "Analyze" CTA button
- Recent analyses list (session-scoped)

#### `/analyzing` — Progress Page
- Table of repos being processed
- Per-repo status badge: Queued / Fetching / Analyzing / Done / Error
- Live progress bar
- Cancel button
- Auto-redirects to results when batch completes

#### `/results` — Results Page
- List of completed reports
- Per-repo: "Download PDF" button
- "Download All (Combined PDF)" button
- "Start New Analysis" button
- Error summary for failed repos

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **State:** React state / Context (no auth needed, session-only)
- **HTTP:** Typed API client wrappers in `frontend/lib/api.ts` (no direct `fetch` usage in components)

---

## 10. Backend Spec

### Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyze` | Start analysis job for one or more repos |
| `GET` | `/api/status/:jobId` | Poll job status and per-repo progress |
| `GET` | `/api/report/:repoId` | Download generated PDF for a single repo |
| `GET` | `/api/report/combined/:jobId` | Download combined PDF for entire batch |
| `DELETE` | `/api/job/:jobId` | Cancel a running job |

### Job Queue Strategy
- Use an **in-memory async queue** for batch processing (Railway-safe, no Redis required for MVP)
- Process repos **sequentially within a job** to avoid Gemini rate limits
- Enforce **max concurrent jobs: 3** (reject with HTTP 429 when exceeded)
- Each job stores: status, repo list, per-repo results, errors

### Environment Variables

```env
GITHUB_TOKEN=          # Optional default token
GEMINI_API_KEY=        # Required
PORT=3001
MAX_BATCH_SIZE=25
MAX_FILE_CHARS=50000   # Truncate large files before sending to Gemini
CORS_ORIGIN=http://localhost:3000   # Set to Vercel URL in production
MAX_CONCURRENT_JOBS=3
```

### Tech Stack
- **Runtime:** Node.js 20
- **Framework:** Express.js
- **PDF:** Puppeteer + pdf-lib
- **Queue:** In-memory async queue (no Redis for MVP)
- **Deployment:** Railway

---

## 11. Deployment

### Frontend — Vercel

```bash
# vercel.json
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://your-railway-app.railway.app"
  }
}
```

- Deploy via GitHub integration (push to `main` = auto-deploy)
- Custom domain optional
- Environment variables set in Vercel dashboard

### Backend — Railway

```bash
# Dockerfile or railway.toml
# Railway auto-detects Node.js
# Set env vars in Railway dashboard:
#   GEMINI_API_KEY
#   GITHUB_TOKEN (optional default)
#   CORS_ORIGIN (Vercel URL)
```

- Railway provides a public HTTPS URL automatically
- Set `CORS_ORIGIN` to your Vercel frontend URL

### Repository Structure

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

## 12. Feature Requirements Table

| Feature | Description | Priority | Phase |
|---|---|---|---|
| URL paste input | Accept newline-separated GitHub URLs | P0 | MVP |
| CSV/file upload | Upload .txt/.csv of URLs | P0 | MVP |
| Public repo analysis | Analyze without token | P0 | MVP |
| Private repo support | Optional GitHub token input | P0 | MVP |
| Point 1 — Plain English | AI-generated layperson summary | P0 | MVP |
| Point 2 — Business summary | AI-generated PM/exec summary | P0 | MVP |
| Point 3 — Technical deep-dive | AI-generated engineer summary | P0 | MVP |
| PDF report download | Per-repo PDF download | P0 | MVP |
| Combined PDF | Merge all repos into one PDF | P1 | MVP |
| Batch processing (20+) | Process up to 25 repos per job | P0 | MVP |
| Progress UI | Live per-repo status tracking | P1 | MVP |
| Vercel + Railway deploy | Live public deployment | P0 | MVP |
| Error handling | Graceful failure per repo | P1 | MVP |
| Cancel job | Stop a running batch | P2 | v1.1 |
| Repo history | Session history of past analyses | P2 | v1.1 |
| Rate limit handling | Retry logic for GitHub/Gemini limits | P1 | MVP |

**Priority Key:** P0 = Must have / P1 = Should have / P2 = Nice to have

---

## 13. Milestones & Phases

### Phase 1 — MVP (Week 1–2)
- [ ] Backend scaffolding (Express + routes)
- [ ] GitHub API integration (fetch repo metadata + files)
- [ ] Gemini API integration (3 prompts → 3 sections)
- [ ] Basic PDF generation (Puppeteer)
- [ ] Frontend: URL input + upload + results page
- [ ] Vercel + Railway deployment

### Phase 2 — Polish (Week 3)
- [ ] Progress UI with live status polling
- [ ] Combined multi-repo PDF
- [ ] Error states and partial batch results
- [ ] Rate limit retry logic
- [ ] Styling and report visual polish

### Phase 3 — Nice-to-haves (Post-submission)
- [ ] Session history
- [ ] Cancel job
- [ ] Architecture diagram generation (Mermaid)
- [ ] Repo comparison view

---

## 14. Open Questions

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | GitHub token handling (MVP): token is provided client-side per request to `POST /api/analyze`, used transiently for GitHub API calls, never stored or logged. | Engineering | Decided |
| 2 | What happens if a repo has no README and no dependency manifest? Fallback strategy for Gemini? | Engineering | Open |
| 3 | Should we support GitLab / Bitbucket URLs in the future? | Product | Out of scope for v1 |
| 4 | Is there a maximum report length per repo (PDF page count)? | Design | Open |
| 5 | Should the combined PDF have a cover page + table of contents? | Design | Open |

---

## 15. Out of Scope (v1.0)

- User authentication / accounts
- Saved reports / persistent storage
- GitLab or Bitbucket support
- Real-time collaboration / sharing report links
- CI/CD pipeline analysis
- Code quality scoring or linting results
- Side-by-side repo comparison UI

---

*End of PRD v1.0*
