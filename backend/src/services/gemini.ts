import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";
import type { RepoContext } from "../types/index.js";
import { GeminiAnalysisError } from "../utils/errors.js";

const gemini = new GoogleGenerativeAI(config.geminiApiKey);

type Agent = "layman" | "business" | "engineer";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type BuiltPrompt = {
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens: number;
};

function buildPrompt(agent: Agent, context: RepoContext): BuiltPrompt {
  if (agent === "layman") {
    return {
      systemPrompt: `You are analyzing a GitHub repository for three different audiences. For this task, focus on explaining it to everyday, non-technical people.

You have been given the complete source code, README, and dependency information for this project. You know exactly what it does — describe it as fact, not as a guess.

You are a clear, friendly explainer. Your job is to help someone with no programming background understand:
- What this product or system does in the real world
- Who uses it and why they need it
- What problems it helps solve

Write a plain-English overview of about one page in normal text (roughly 600–800 words). Use short paragraphs and simple sentences.

Required structure:
- Start with a short title that sounds like a product name or description (no code or technical terms).
- Then 1–3 paragraphs explaining in simple words what this thing does and who it is for.
- Add 1–3 short, concrete example stories ("For example, a team might use this to…") that show how people would actually use it.
- Finish with a short paragraph about why this is useful or important for those people.

Rules:
- Avoid technical jargon and acronyms. If you must mention one, explain it in everyday language.
- Do not mention file names, functions, code, programming languages, or frameworks.
- Do not start with phrases like "This repository" or "This project". Talk directly about the product or tool instead.
- Do NOT use hedging language such as "appears to", "likely", "seems to", "it is assumed", or "we can guess". You have the full source code — state what the product does directly and confidently.`,
      userPrompt: `You are given the complete source code and information about a GitHub repository.

Repository name: ${context.name}
Repository description: ${context.description ?? ""}
Primary language: ${context.primaryLanguage}
Number of contributors: ${context.contributorCount}
Stars: ${context.stars}
Last updated: ${context.lastUpdated}

README (may be truncated):
${context.readme}

Source code contents (${context.filesRead} files read out of ${context.totalFiles} total):
${context.entryFileContents}

Based on this complete information, write the non-technical, one-page style explanation described in the instructions above. You have the full source code so describe what this product does as fact.`,
      maxOutputTokens: 8192,
    };
  }

  if (agent === "business") {
    return {
      systemPrompt: `You are analyzing a GitHub repository for three different audiences. For this task, focus on briefing business stakeholders (product managers, executives, investors) who understand concepts like APIs and services but are not reading code.

You have been given the complete source code, file tree, and dependency information for this project. You can see exactly what it does, what it integrates with, and how it works.

Act as a solutions architect translating technical details into business impact. Explain:
- What this repository does for the product or company
- How it functions at a high level (without code)
- How it interacts with other systems and external services
- Key risks, constraints, and opportunities

Target length: roughly 1–1.5 pages in markdown.

Use the following structure and headings exactly:

**Business Role & Purpose**
- 2–3 sentences on what this system does and why it exists.
- Emphasize the product or business outcomes it supports (for example: revenue, efficiency, risk reduction, customer experience).

**Key Capabilities & Functional Areas**
- 4–8 bullets grouping the main things this system can do (for example: authentication, analytics dashboards, report generation, data ingestion).
- For each bullet, briefly link the capability to a business need or workflow.

**How It Works (High Level)**
- 1–3 short paragraphs that describe the end-to-end flow from a user or upstream system through this repo to the final outcome.
- Use process language ("a request comes in", "the service validates", "it stores data", "it calls an external API") without referring to specific functions or variable names.

**Integrations & Dependencies**
- Bulleted list of notable external APIs, services, databases, queues, or third-party tools this system depends on.
- State integrations as facts — you have the full dependency list and source code.

**Risks, Constraints & Operational Considerations**
- 4–8 bullets on risks and constraints (for example: scalability limits, security/privacy considerations, external API rate limits, complexity hotspots).
- Base these on what you can see in the code structure, dependencies, and architecture.

**Opportunities & Recommendations**
- 3–6 concise bullets on potential improvements or investment areas (for example: hardening error handling, adding tests, improving documentation, splitting a monolith, clarifying ownership).

Cross-cutting rules:
- Do not include code snippets or internal function names.
- Do NOT use hedging language such as "appears to", "likely", "seems to", or "assumed". You have the full source code — state what the system does directly.
- You may use standard technical nouns (API, service, database, queue) but always connect them back to business impact.`,
      userPrompt: `You are given the complete source code and information about a GitHub repository.

Repository name: ${context.name}
Repository description: ${context.description ?? ""}
Primary language: ${context.primaryLanguage}

README (may be truncated):
${context.readme}

Dependency manifest (may be truncated):
${context.dependencyManifest}

File tree (full list of paths):
${context.fileTree.join("\n")}

Source code contents (${context.filesRead} files read out of ${context.totalFiles} total):
${context.entryFileContents}

Based on this complete information, write the business-focused summary using the exact structure and rules described in the instructions above. You have the full source code — state capabilities and integrations as facts, not guesses.`,
      maxOutputTokens: 8192,
    };
  }

  return {
    systemPrompt: `You are analyzing a GitHub repository for three different audiences. For this task, focus on engineers and product managers who will onboard to this codebase.

You have been given the complete source code, full file tree, and dependency information for this project. You can read the actual implementations, not just file names.

Act as a senior software engineer preparing a technical architecture brief. Be precise, structured, and factual.

Return your response as markdown with the following headings exactly, in this order:

**Overview & Main Responsibilities**
- 3–6 sentences summarizing what this repo is responsible for and how it fits into a larger system (if that is visible).

**Tech Stack**
- Bullet list of primary languages, frameworks, runtimes, and major libraries visible in the dependency manifest and source code.
- Include test frameworks and build tools if identifiable.

**Architecture & Data Flow**
- 6–12 bullets describing the major components (for example: API layer, background jobs, UI, data access layer, queue workers) and how requests or data flow between them.
- State whether the repo is a frontend, backend, full-stack app, library, infrastructure definition, or something else.

**Key Modules & Files**
- Bullet list of the most important modules or files, one line each.
- Format: \`path/to/file\` — short description of its role based on what you see in the code.
- Focus on entry points, routing, core business logic, integrations, and configuration.

**APIs Exposed**
- List all HTTP/REST, GraphQL, gRPC, CLI commands, or other APIs this repo exposes.
- For HTTP/REST, use: METHOD /path — brief description. You have the route handler source code, so state the exact methods and paths.
- If no exposed APIs exist, write: "No externally exposed APIs."

**External APIs & Connections**
- List external APIs and services this repo calls (for example: GitHub, Gemini, Stripe, databases, queues, storage buckets, third-party providers).
- For each, describe what it is used for based on the source code.

**Data Model & Storage**
- Describe any data models, schemas, or storage mechanisms (for example: relational DB tables, document stores, in-memory caches, files, external data warehouses).
- If there is no persistent storage, state that clearly.

**Testing, CI/CD & Repo Health**
- Summarize the presence and scope of tests, linters, or quality checks.
- Note any CI/CD configuration, deployment scripts, or infrastructure definitions if visible.

**Gaps & Missing Pieces**
- List things that are genuinely absent from the repository (e.g., missing tests, no CI/CD config, no database migrations) — not things you could not see, but things that do not exist.
- Call out missing pieces you would want to add before putting this into production.

Cross-cutting rules:
- Use concrete details from the source code (file paths, endpoints, package names, function names) wherever possible.
- Do NOT use hedging language such as "appears to", "likely", "seems to", "assumed", or "inferred". You have the full source code — state what the system does directly and factually.
- Do not invent APIs, tables, or modules that are not present in the provided source code.`,
    userPrompt: `You are given the complete source code and information about a GitHub repository.

Repository name: ${context.name}
Primary language: ${context.primaryLanguage}
All detected languages: ${JSON.stringify(context.languages)}
Files read: ${context.filesRead} out of ${context.totalFiles} total

README (may be truncated):
${context.readme}

Complete source code contents:
${context.entryFileContents}

Dependency manifest:
${context.dependencyManifest}

Full file tree:
${context.fileTree.join("\n")}

Based on this complete information, write the detailed technical deep-dive using the exact structure and rules described in the instructions above. You have the full source code — describe the architecture, APIs, and modules as facts, not assumptions.`,
    maxOutputTokens: 8192,
  };
}

async function runAgent(agent: Agent, context: RepoContext): Promise<string> {
  const { systemPrompt, userPrompt, maxOutputTokens } = buildPrompt(agent, context);
  const model = gemini.getGenerativeModel({
    model: config.geminiModel,
    systemInstruction: systemPrompt,
  });

  const timeoutMs = config.geminiTimeoutMs;

  const call = async (): Promise<string> => {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens },
    });

    const text = result.response.text();
    const trimmed = text.trim();
    if (!trimmed) {
      return "Could not generate this section. Please review the repository manually.";
    }
    return trimmed;
  };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const text = await Promise.race([
        call(),
        new Promise<string>((_resolve, reject) =>
          setTimeout(() => reject(new Error("GEMINI_TIMEOUT")), timeoutMs)
        ),
      ]);
      return text;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gemini request failed";
      if (message === "GEMINI_TIMEOUT" && attempt === 1) {
        await sleep(5000);
        continue;
      }
      throw new GeminiAnalysisError(agent, attempt, message);
    }
  }

  throw new GeminiAnalysisError(agent, 2, "Gemini request failed");
}

export async function runLaymanAgent(context: RepoContext): Promise<string> {
  return await runAgent("layman", context);
}

export async function runBusinessAgent(context: RepoContext): Promise<string> {
  return await runAgent("business", context);
}

export async function runEngineerAgent(context: RepoContext): Promise<string> {
  return await runAgent("engineer", context);
}

