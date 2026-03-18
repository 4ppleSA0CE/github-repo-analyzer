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
- If the actual purpose is unclear from the context, say what it appears to do based on names and descriptions, and clearly mark that as a guess (for example: "It appears to…"). Do not claim things as certain when they are not.`,
      userPrompt: `You are given information about a GitHub repository.

Repository name: ${context.name}
Repository description: ${context.description ?? ""}
Primary language: ${context.primaryLanguage}
Number of contributors: ${context.contributorCount}
Stars: ${context.stars}
Last updated: ${context.lastUpdated}

README (may be truncated):
${context.readme}

Based only on this information, write the non-technical, one-page style explanation described in the instructions above. If you are unsure about something, explain that you are making a reasonable guess rather than stating it as a fact.`,
      maxOutputTokens: 8192,
    };
  }

  if (agent === "business") {
    return {
      systemPrompt: `You are analyzing a GitHub repository for three different audiences. For this task, focus on briefing business stakeholders (product managers, executives, investors) who understand concepts like APIs and services but are not reading code.

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
- Bulleted list of notable external APIs, services, databases, queues, or third-party tools this system appears to depend on.
- If something is inferred only from names or configuration, say that it is an assumption.
- If no external integrations are visible, write: "No external integrations clearly detected from the provided context."

**Risks, Constraints & Operational Considerations**
- 4–8 bullets on likely risks and constraints (for example: scalability limits, security/privacy considerations, external API rate limits, complexity hotspots).
- Only mention items that you can reasonably infer from the code structure, README, dependencies, or architecture; do not fabricate specifics.

**Opportunities & Recommendations**
- 3–6 concise bullets on potential improvements or investment areas (for example: hardening error handling, adding tests, improving documentation, splitting a monolith, clarifying ownership).

Cross-cutting rules:
- Do not include code snippets or internal function names.
- If something is unknown, say so explicitly instead of guessing.
- You may use standard technical nouns (API, service, database, queue) but always connect them back to business impact.`,
      userPrompt: `You are given information about a GitHub repository.

Repository name: ${context.name}
Repository description: ${context.description ?? ""}
Primary language: ${context.primaryLanguage}

README (may be truncated):
${context.readme}

Dependency manifest (may be truncated):
${context.dependencyManifest}

File tree (truncated list of paths):
${context.fileTree.join("\n")}

Based only on this information, write the business-focused summary using the exact structure and rules described in the instructions above. If you are unsure about any business impact, clearly describe that it is uncertain rather than presenting it as a fact.`,
      maxOutputTokens: 8192,
    };
  }

  return {
    systemPrompt: `You are analyzing a GitHub repository for three different audiences. For this task, focus on engineers and product managers who will onboard to this codebase.

Act as a senior software engineer preparing a technical architecture brief. Be precise, structured, and explicit about what you know versus what you are inferring.

Return your response as markdown with the following headings exactly, in this order:

**Overview & Main Responsibilities**
- 3–6 sentences summarizing what this repo is responsible for and how it fits into a larger system (if that is visible).

**Tech Stack**
- Bullet list of primary languages, frameworks, runtimes, and major libraries you can see from the context.
- Include test frameworks and build tools if identifiable.

**Architecture & Data Flow**
- 6–12 bullets describing the major components (for example: API layer, background jobs, UI, data access layer, queue workers) and how requests or data flow between them.
- Mention whether the repo looks like a frontend, backend, full-stack app, library, infrastructure definition, or something else.

**Key Modules & Files**
- Bullet list of the most important modules or files, one line each.
- Format: \`path/to/file\` — short description of its role.
- Focus on entry points, routing, core business logic, integrations, and configuration.

**APIs Exposed**
- If the repo exposes HTTP/REST, GraphQL, gRPC, CLI commands, or other APIs, list them.
- For HTTP/REST, use: METHOD /path — brief description.
- If no exposed APIs are visible, write: "No externally exposed APIs detected from the provided context."

**External APIs & Connections**
- List external APIs and services this repo appears to call (for example: GitHub, Gemini, Stripe, databases, queues, storage buckets, third-party providers).
- For each, briefly describe what it is used for if that is visible; if inferred from naming only, mark it as an assumption.
- If none are visible, write: "No external API calls or connections clearly detected from the provided context."

**Data Model & Storage**
- Describe any obvious data models, schemas, or storage mechanisms (for example: relational DB tables, document stores, in-memory caches, files, external data warehouses).
- If you can’t see any storage details, explain what is unknown.

**Testing, CI/CD & Repo Health**
- Summarize the presence and apparent scope of tests, linters, or quality checks.
- Note any CI/CD configuration, deployment scripts, or infrastructure definitions if visible.

**Assumptions, Gaps & Unknowns**
- Explicitly list anything you had to infer from filenames or partial context.
- Call out missing pieces you would want to verify before making changes.

Cross-cutting rules:
- Use concrete details from the provided context (file paths, endpoints, package names) where possible.
- When you infer behavior or architecture from naming or structure, label it clearly as an assumption.
- Do not invent APIs, tables, or modules that are not supported by the provided information.`,
    userPrompt: `You are given information about a GitHub repository.

Repository name: ${context.name}
Primary language: ${context.primaryLanguage}
All detected languages: ${JSON.stringify(context.languages)}

README (may be truncated):
${context.readme}

Entry file contents (may be truncated):
${context.entryFileContents}

Dependency manifest (may be truncated):
${context.dependencyManifest}

File tree (truncated list of paths):
${context.fileTree.join("\n")}

Based only on this information, write the detailed technical deep-dive using the exact structure and rules described in the instructions above. When something is uncertain, state clearly that it is an assumption or unknown instead of presenting it as fact.`,
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

