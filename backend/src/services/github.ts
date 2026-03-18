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

const SAFE_SOURCE_CONTEXT_CHARS = Math.min(config.maxFileChars, 200000);

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
  ".vercel/",
  ".cache/",
];

/** Extensions that are never useful source context (binary, generated, assets). */
const SKIPPED_EXTENSIONS: readonly string[] = [
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".avif",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".map", ".lock",
  ".pdf", ".zip", ".tar", ".gz", ".bz2",
  ".mp3", ".mp4", ".wav", ".ogg", ".webm",
  ".min.js", ".min.css",
  ".d.ts",
];

function shouldIgnorePath(path: string): boolean {
  for (const ignored of IGNORED_PATH_SUBSTRINGS) {
    if (path.includes(ignored)) {
      return true;
    }
  }
  return false;
}

function shouldSkipExtension(path: string): boolean {
  const lower = path.toLowerCase();
  for (const ext of SKIPPED_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      return true;
    }
  }
  return false;
}

function getSourcePaths(fileTree: string[]): string[] {
  return fileTree.filter((path) => {
    if (shouldIgnorePath(path)) return false;
    if (shouldSkipExtension(path)) return false;
    return true;
  });
}

async function fetchAllSourceFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  repoUrl: string,
  fileTree: string[]
): Promise<{ content: string; filesRead: number; filesSkipped: number }> {
  const sourcePaths = getSourcePaths(fileTree);
  const parts: string[] = [];
  let remaining = SAFE_SOURCE_CONTEXT_CHARS;
  let filesRead = 0;
  let filesSkipped = fileTree.length - sourcePaths.length;

  for (const path of sourcePaths) {
    if (remaining <= 0) {
      filesSkipped += 1;
      continue;
    }
    try {
      type ContentResp = { content?: string; encoding?: string; size?: number };
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
        filesRead += 1;
      } else {
        filesSkipped += 1;
      }
    } catch {
      filesSkipped += 1;
    }
  }

  return {
    content: truncateToChars(parts.join(""), SAFE_SOURCE_CONTEXT_CHARS),
    filesRead,
    filesSkipped,
  };
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
  type TreeResponse = { tree: TreeItem[]; truncated?: boolean };
  const tree = await requestOrThrow<TreeResponse>(
    octokit,
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    { owner, repo, tree_sha: branch.commit.sha, recursive: "1" },
    repoUrl
  );

  const blobItems = tree.tree.filter((t) => t.type === "blob");
  const paths = blobItems
    .map((t) => t.path)
    .filter((p): p is string => typeof p === "string");

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

  const { content: entryFileContents, filesRead, filesSkipped } = await fetchAllSourceFiles(
    octokit,
    owner,
    repo,
    repoUrl,
    fileTree
  ).catch(() => ({ content: "", filesRead: 0, filesSkipped: fileTree.length }));

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
    entryFileContents: truncateToChars(entryFileContents, SAFE_SOURCE_CONTEXT_CHARS),
    dependencyManifest: truncateToChars(dependencyManifest, 3000),
    fileTree,
    totalFiles,
    filesRead,
    filesSkipped,
  };
}

