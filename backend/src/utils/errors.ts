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

