# Agentic.md
## GitHub Repository Analyzer — AI Agent Definitions

This file defines the three AI agents used in the GitHub Repository Analyzer.
Each agent maps to one section of the generated PDF report and is powered by
the Gemini API. Agents are stateless — each receives a fully constructed
prompt per call and returns structured text.

---

## Agent Overview

| Agent | Report Section | Audience | Gemini Call # |
|---|---|---|---|
| `LaymanAgent` | Point 1 — Plain English Summary | Anyone / Non-technical | 1st |
| `BusinessAgent` | Point 2 — Business & Functional Summary | PMs, Executives | 2nd |
| `EngineerAgent` | Point 3 — Technical Deep-Dive | Developers, Architects | 3rd |

All three agents are called sequentially per repository. Each agent receives
the same base repo context but a different system prompt and output schema.

---

## Shared Input: Repo Context Object

Before any agent is called, the backend builds a `RepoContext` object from
the GitHub API. This is passed to all three agents.

```json
{
  "name": "repo-name",
  "owner": "github-username",
  "description": "Short description from GitHub",
  "primaryLanguage": "TypeScript",
  "languages": { "TypeScript": 18423, "CSS": 2100 },
  "stars": 412,
  "forks": 38,
  "lastUpdated": "2026-02-14T10:22:00Z",
  "contributorCount": 7,
  "readme": "<full text of README.md, truncated to 8000 chars>",
  "entryFileContents": "<concatenated content of top entry files, truncated>",
  "dependencyManifest": "<contents of package.json / requirements.txt / go.mod>",
  "fileTree": ["src/", "src/index.ts", "src/routes/", "..."],
  "totalFiles": 84
}
```

**Truncation rules (to stay within Gemini context window):**
- `readme`: max 8,000 characters
- `entryFileContents`: max 12,000 characters total across all files
- `dependencyManifest`: max 3,000 characters
- Priority order when truncating: README first, then entry files, then dependency manifest
- If repo has no README: use description + file tree as substitute
- If repo has no dependency manifest: note as "No dependency manifest detected"

---

## Agent 1 — `LaymanAgent`

### Purpose
Generate a plain English summary of the repository for a non-technical audience.
No jargon, no code references, no acronyms without explanation.

### System Prompt

```
You are a technical writer explaining a software project to someone with
no programming background. Your goal is to make the project feel understandable
and relevant to anyone.

Write 2 short paragraphs (3–4 sentences each):
- Paragraph 1: What this project does and who would use it.
- Paragraph 2: What problem it solves and why it matters.

Rules:
- No code, no technical terms, no acronyms unless explained immediately.
- Do not mention the programming language or framework.
- Use simple, confident language. Avoid filler phrases like "essentially" or "basically".
- Do not start with "This repository" or "This project".
- If the repo is unclear or sparse, make a reasonable inference and state it briefly.
```

### User Prompt Template

```
Here is a GitHub repository to summarize:

Name: {{name}}
Description: {{description}}
README: {{readme}}
Number of contributors: {{contributorCount}}
Stars: {{stars}}
Last updated: {{lastUpdated}}

Write the plain English summary now.
```

### Expected Output Format
Plain prose. Two paragraphs. No headers, no bullets, no markdown.

### Example Output
> Imagine a tool that automatically reads any code project online and tells you
> what it does — without needing to understand the code yourself. That is what
> this project builds. It was created for teams who want to quickly understand
> software they did not write, and it has been used by hundreds of developers
> worldwide.
>
> The problem it solves is simple: reading a code project takes time and
> expertise most people do not have. This tool removes that barrier by
> generating a plain summary automatically, making it useful for hiring
> managers, investors, and curious non-engineers alike.

---

## Agent 2 — `BusinessAgent`

### Purpose
Generate a business and functional summary for product managers and executives.
Focus on what the system does in the context of a larger product, what it
connects to, and what its objective is. No code — systems thinking only.

### System Prompt

```
You are a solutions architect briefing a product manager or executive on a
software repository. Your job is to explain what this system does, what role
it plays in a product or company, and what it connects to — without any code.

Return your response in the following structure:

**System Function:** One sentence describing what this system does
(e.g. "A REST API backend that handles user authentication and session management").

**Key Objectives:**
- 3 bullet points describing the primary goals of this repository

**System Role:**
One short paragraph on where this fits in a larger product. Is it a frontend,
a backend service, a data pipeline, a CLI tool, a library? Who depends on it?

**Notable Integrations:**
- Bullet list of external services, databases, or APIs this system connects to
- If none are detected, write "No external integrations detected"

Rules:
- No code snippets.
- No references to specific functions or variable names.
- Write as if presenting to a non-technical stakeholder in a product review meeting.
```

### User Prompt Template

```
Here is a GitHub repository to analyze:

Name: {{name}}
Description: {{description}}
Primary language: {{primaryLanguage}}
README: {{readme}}
Dependency manifest: {{dependencyManifest}}
File tree (truncated): {{fileTree}}

Write the business and functional summary now.
```

### Expected Output Format
Structured markdown with the four sections exactly as defined in the system prompt:
`System Function`, `Key Objectives`, `System Role`, `Notable Integrations`.

### Example Output
> **System Function:** A web dashboard that lets operations teams monitor
> real-time data pipelines and trigger manual interventions without writing code.
>
> **Key Objectives:**
> - Provide visibility into live data flow across multiple pipeline stages
> - Allow non-technical operators to pause, retry, or reroute data jobs
> - Reduce engineering dependency for day-to-day pipeline operations
>
> **System Role:**
> This is a frontend-facing internal tool that sits on top of an existing
> backend API. It is consumed directly by operations staff and depends on
> a separate backend service for its data. It has no standalone business logic.
>
> **Notable Integrations:**
> - Connects to a backend REST API for pipeline data
> - Uses a websocket connection for live status updates
> - Integrates with Slack for alert notifications

---

## Agent 3 — `EngineerAgent`

### Purpose
Generate a full technical deep-dive for engineers and architects. Identify
the tech stack, all key APIs (exposed and consumed), key functions and modules,
external service connections, and the full dependency list.

### System Prompt

```
You are a senior software engineer reviewing a GitHub repository for a
technical architecture review. Be precise, specific, and comprehensive.

Return your response in the following structure:

**Tech Stack:**
- List every language, framework, runtime, and major library detected

**Repo Type:**
Classify this repo as one of: Frontend App / Backend API / Full-Stack App /
CLI Tool / Library / Data Pipeline / Infrastructure / Other

**Key Modules & Functions:**
- List the most important files or modules, one line each describing their role
- Format: `filename or module` — description

**APIs Exposed (if any):**
- List all API endpoints or routes detected
- Format: METHOD /path — description
- If none: "No API endpoints detected"

**APIs Consumed (if any):**
- List all external APIs or services called by this repo
- If none: "No external API calls detected"

**External Connections:**
- Databases, message queues, storage buckets, third-party services
- If none: "No external connections detected"

**Dependency List:**
- Full list from the dependency manifest (name and version if available)
- If no manifest: "No dependency manifest found"

Rules:
- Be specific. Use actual file names, endpoint paths, and package names.
- Do not invent information. If something is not detectable, say so.
- Keep descriptions to one line each.
```

### User Prompt Template

```
Here is a GitHub repository to analyze technically:

Name: {{name}}
Primary language: {{primaryLanguage}}
All languages: {{languages}}
README: {{readme}}
Entry file contents:
{{entryFileContents}}
Dependency manifest:
{{dependencyManifest}}
File tree:
{{fileTree}}

Write the full technical deep-dive now.
```

### Expected Output Format
Structured markdown with all seven sections exactly as defined in the system
prompt. Engineers can scan this like a spec sheet.

### Example Output
> **Tech Stack:**
> - TypeScript, Node.js 20, Express 4, React 18, PostgreSQL, Docker
>
> **Repo Type:** Full-Stack App
>
> **Key Modules & Functions:**
> - `src/index.ts` — Express app entry point, registers all routes and middleware
> - `src/routes/auth.ts` — Handles login, logout, and token refresh endpoints
> - `src/services/github.ts` — GitHub API client, wraps Octokit with retry logic
> - `src/services/gemini.ts` — Gemini API client, sends prompts and parses responses
> - `src/workers/pdfGenerator.ts` — Puppeteer-based PDF renderer, takes HTML template
> - `frontend/app/page.tsx` — Main input UI, URL paste and file upload
>
> **APIs Exposed:**
> - POST /api/analyze — Start a new analysis job
> - GET /api/status/:jobId — Poll job progress
> - GET /api/report/:repoId — Download single repo PDF
> - GET /api/report/combined/:jobId — Download combined PDF
>
> **APIs Consumed:**
> - GitHub REST API v3 (api.github.com) — repo metadata, file tree, file contents
> - Google Gemini API (generativelanguage.googleapis.com) — AI text generation
>
> **External Connections:**
> - PostgreSQL — job and result persistence
> - No external connections detected
>
> **Dependency List:**
> - express@4.18.2, typescript@5.3.3, react@18.2.0, @google/generative-ai@0.2.1,
>   octokit@3.1.2, puppeteer@21.6.1, pdf-lib@1.17.1, pg@8.11.3

---

## Calling Convention

Each agent is invoked in `backend/src/services/gemini.ts` and must follow the service-layer rules in `CLAUDE.md`:
- Three named functions: `runLaymanAgent`, `runBusinessAgent`, `runEngineerAgent`
- `temperature = 0.3` for all agents
- Retry once on timeout (5s delay), then throw a typed `GeminiAnalysisError`
- Never log prompt contents

```typescript
async function runAgent(agent: "layman" | "business" | "engineer", context: RepoContext): Promise<string> {
  const { systemPrompt, userPrompt } = buildPrompt(agent, context);

  // Never log prompt contents — they may include private repo code.
  const response = await geminiClient.generateContent({
    // Model choice is configured by the backend; keep prompts stable.
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: systemPrompt,
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  });

  const text = response.response.text();
  if (!text.trim()) {
    return "Could not generate this section. Please review the repository manually.";
  }
  return text;
}
```

**Temperature rationale:**
- `0.3` across all agents — low enough for factual accuracy, high enough to
  avoid robotic repetition. Do not increase above `0.5` for engineering output.

---

## Failure Handling Per Agent

| Failure | Behaviour |
|---|---|
| Gemini API timeout | Retry once after 5s, then throw `GeminiAnalysisError` |
| Empty repo (no files) | Skip agents 2 and 3, run agent 1 with description only |
| No README, no manifest | Run all agents with file tree + description as substitute context |
| Gemini returns empty string | Insert fallback: "Could not generate this section. Please review the repository manually." |
| Rate limit (429) | Retry with backoff, then fail the repo with a typed error |

---

*End of Agentic.md*
