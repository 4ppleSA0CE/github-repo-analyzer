import { Octokit } from "octokit";
import { config } from "../config.js";
import type { RepoContext } from "../types/index.js";
import { truncateToChars, coalesceText } from "../utils/truncate.js";
import { GitHubFetchError, InvalidRepoUrlError } from "../utils/errors.js";

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
  if (!match?.[1] || !match?.[2]) {
    throw new InvalidRepoUrlError(url);
  }
  return { owner: match[1], repo: match[2] };
}

function makeOctokit(token?: string): Octokit {
  if (token) {
    return new Octokit({ auth: token });
  }
  return new Octokit();
}

async function requestOrThrow<T>(
  octokit: Octokit,
  route: string,
  params: Record<string, unknown>,
  repoUrl: string
): Promise<T> {
  try {
    const resp = await octokit.request(route, params);
    return resp.data as T;
  } catch (err) {
    const statusCode = typeof (err as { status?: unknown }).status === "number" ? (err as { status: number }).status : 500;
    const message = err instanceof Error ? err.message : "GitHub request failed";
    throw new GitHubFetchError(repoUrl, statusCode, message);
  }
}

async function fetchReadme(
  octokit: Octokit,
  owner: string,
  repo: string,
  repoUrl: string
): Promise<string> {
  type ReadmeResponse = { content?: string; encoding?: string };
  const data = await requestOrThrow<ReadmeResponse>(
    octokit,
    "GET /repos/{owner}/{repo}/readme",
    { owner, repo },
    repoUrl
  );

  const content = data.content;
  const encoding = data.encoding;
  if (!content || encoding !== "base64") return "";
  const decoded = Buffer.from(content, "base64").toString("utf8");
  return truncateToChars(decoded, Math.min(config.maxFileChars, 8000));
}

async function fetchDependencyManifest(
  octokit: Octokit,
  owner: string,
  repo: string,
  repoUrl: string
): Promise<string> {
  const candidates = ["package.json", "requirements.txt", "go.mod", "pyproject.toml"];
  for (const path of candidates) {
    try {
      type ContentResp = { content?: string; encoding?: string };
      const data = await requestOrThrow<ContentResp>(
        octokit,
        "GET /repos/{owner}/{repo}/contents/{path}",
        { owner, repo, path },
        repoUrl
      );
      if (data.content && data.encoding === "base64") {
        const decoded = Buffer.from(data.content, "base64").toString("utf8");
        return truncateToChars(decoded, 3000);
      }
    } catch {
      // Try next candidate
    }
  }
  return "No dependency manifest detected";
}

const SAFE_SOURCE_CONTEXT_CHARS = Math.min(config.maxFileChars, 40000);

const IGNORED_PATH_SUBSTRINGS: readonly string[] = [
  "node_modules/",
  "dist/",
  "build/",
  ".next/",
  "out/",
  "coverage/",
  ".git/",
  "vendor/",
  "deps/",
  "third_party/",
  "target/",
  "bin/",
  "obj/",
  "__pycache__/",
  "venv/",
];

const LANGUAGE_EXTENSIONS: Readonly<Record<string, readonly string[]>> = {
  TypeScript: [".ts", ".tsx"],
  JavaScript: [".js", ".jsx"],
  Python: [".py"],
  Go: [".go"],
  "C#": [".cs"],
  Java: [".java"],
  Kotlin: [".kt", ".kts"],
  Ruby: [".rb"],
  PHP: [".php"],
};

const FALLBACK_EXTENSIONS: readonly string[] = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".java",
  ".kt",
  ".kts",
  ".rb",
  ".php",
  ".cs",
];

function shouldIgnorePath(path: string): boolean {
  for (const ignored of IGNORED_PATH_SUBSTRINGS) {
    if (path.includes(ignored)) {
      return true;
    }
  }
  return false;
}

function getExtensionsForLanguages(languages: Record<string, number>): string[] {
  const ordered = Object.entries(languages).sort(([, a], [, b]) => b - a);
  const seenExts = new Set<string>();

  for (const [language] of ordered) {
    const exts = LANGUAGE_EXTENSIONS[language];
    if (!exts) {
      // eslint-disable-next-line no-continue
      continue;
    }
    for (const ext of exts) {
      if (!seenExts.has(ext)) {
        seenExts.add(ext);
      }
    }
  }

  if (seenExts.size === 0) {
    for (const ext of FALLBACK_EXTENSIONS) {
      seenExts.add(ext);
    }
  }

  return Array.from(seenExts);
}

function scorePath(path: string): number {
  let score = 0;

  if (path.startsWith("src/")) {
    score += 5;
  }
  if (path.startsWith("lib/") || path.startsWith("app/")) {
    score += 4;
  }
  if (path.includes("/services/") || path.includes("/server/") || path.includes("/api/")) {
    score += 3;
  }

  const lower = path.toLowerCase();
  if (
    lower.endsWith("index.ts") ||
    lower.endsWith("index.js") ||
    lower.endsWith("main.ts") ||
    lower.endsWith("main.js")
  ) {
    score += 4;
  }
  if (
    lower.includes("controller") ||
    lower.includes("service") ||
    lower.includes("handler") ||
    lower.includes("router")
  ) {
    score += 2;
  }

  const depth = path.split("/").length;
  score += Math.max(0, 4 - depth);

  return score;
}

function selectSamplePaths(
  languages: Record<string, number>,
  fileTree: string[]
): string[] {
  const extensions = getExtensionsForLanguages(languages);

  const filtered = fileTree.filter((path) => {
    if (shouldIgnorePath(path)) {
      return false;
    }
    return extensions.some((ext) => path.endsWith(ext));
  });

  const scored = filtered
    .map((path) => ({ path, score: scorePath(path) }))
    .sort((a, b) => b.score - a.score);

  const maxFiles = 40;
  return scored.slice(0, maxFiles).map((item) => item.path);
}

async function fetchSampledSourceFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  repoUrl: string,
  languages: Record<string, number>,
  fileTree: string[]
): Promise<string> {
  const samplePaths = selectSamplePaths(languages, fileTree);
  const parts: string[] = [];
  let remaining = SAFE_SOURCE_CONTEXT_CHARS;

  for (const path of samplePaths) {
    if (remaining <= 0) {
      break;
    }
    try {
      type ContentResp = { content?: string; encoding?: string };
      const data = await requestOrThrow<ContentResp>(
        octokit,
        "GET /repos/{owner}/{repo}/contents/{path}",
        { owner, repo, path },
        repoUrl
      );
      if (data.content && data.encoding === "base64") {
        const decoded = Buffer.from(data.content, "base64").toString("utf8");
        const chunk = truncateToChars(decoded, Math.min(remaining, config.maxFileChars));
        parts.push(`\n\n--- ${path} ---\n${chunk}`);
        remaining -= chunk.length;
      }
    } catch {
      // Ignore individual file failures and continue sampling others
    }
  }

  return truncateToChars(parts.join(""), SAFE_SOURCE_CONTEXT_CHARS);
}

async function fetchFileTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  repoUrl: string
): Promise<{ fileTree: string[]; totalFiles: number }> {
  type RepoResponse = { default_branch: string };
  const repoMeta = await requestOrThrow<RepoResponse>(
    octokit,
    "GET /repos/{owner}/{repo}",
    { owner, repo },
    repoUrl
  );

  type BranchResponse = { commit: { sha: string } };
  const branch = await requestOrThrow<BranchResponse>(
    octokit,
    "GET /repos/{owner}/{repo}/branches/{branch}",
    { owner, repo, branch: repoMeta.default_branch },
    repoUrl
  );

  type TreeItem = { path?: string; type?: string };
  type TreeResponse = { tree: TreeItem[] };
  const tree = await requestOrThrow<TreeResponse>(
    octokit,
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    { owner, repo, tree_sha: branch.commit.sha, recursive: "1" },
    repoUrl
  );

  const blobItems = tree.tree.filter((t) => t.type === "blob");
  const paths = blobItems
    .map((t) => t.path)
    .filter((p): p is string => typeof p === "string")
    .slice(0, 500);

  const totalFiles = blobItems.length;
  return { fileTree: paths, totalFiles };
}

export async function fetchRepoContext(repoUrl: string, githubToken?: string): Promise<RepoContext> {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const token = githubToken ?? config.githubToken;
  const octokit = makeOctokit(token);

  type RepoResponse = {
    name: string;
    owner: { login: string };
    description: string | null;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
  };

  const repoMeta = await requestOrThrow<RepoResponse>(
    octokit,
    "GET /repos/{owner}/{repo}",
    { owner, repo },
    repoUrl
  );

  type LanguagesResponse = Record<string, number>;
  const languages = await requestOrThrow<LanguagesResponse>(
    octokit,
    "GET /repos/{owner}/{repo}/languages",
    { owner, repo },
    repoUrl
  );

  type ContributorsResponse = Array<unknown>;
  const contributors = await requestOrThrow<ContributorsResponse>(
    octokit,
    "GET /repos/{owner}/{repo}/contributors",
    { owner, repo, per_page: 1, anon: "true" },
    repoUrl
  );
  const contributorCount = Array.isArray(contributors) ? contributors.length : 0;

  const [{ fileTree, totalFiles }, readme, dependencyManifest] = await Promise.all([
    fetchFileTree(octokit, owner, repo, repoUrl),
    fetchReadme(octokit, owner, repo, repoUrl).catch(() => ""),
    fetchDependencyManifest(octokit, owner, repo, repoUrl).catch(() => "No dependency manifest detected"),
  ]);

  const entryFileContents = await fetchSampledSourceFiles(
    octokit,
    owner,
    repo,
    repoUrl,
    languages,
    fileTree
  ).catch(() => "");

  const description = repoMeta.description;
  const readmeFinal =
    readme.trim().length > 0
      ? readme
      : coalesceText(description, "") +
        (fileTree.length > 0 ? `\n\nFile tree (truncated):\n${fileTree.join("\n")}` : "");

  return {
    name: repoMeta.name,
    owner: repoMeta.owner.login,
    description,
    primaryLanguage: repoMeta.language ?? "Unknown",
    languages,
    stars: repoMeta.stargazers_count,
    forks: repoMeta.forks_count,
    lastUpdated: repoMeta.updated_at,
    contributorCount,
    readme: truncateToChars(readmeFinal, Math.min(config.maxFileChars, 8000)),
    entryFileContents: truncateToChars(entryFileContents, 12000),
    dependencyManifest: truncateToChars(dependencyManifest, 3000),
    fileTree,
    totalFiles,
  };
}

