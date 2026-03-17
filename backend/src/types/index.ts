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
  repoId: string;
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

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

