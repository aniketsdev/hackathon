export type Severity = "Critical" | "High" | "Medium" | "Low";

export type FindingCategory =
  | "secret"
  | "phi_logging"
  | "missing_auth"
  | "unsafe_sql"
  | "insecure_cookie"
  | "unsafe_cors";

export type SourceFile = {
  path: string;
  content: string;
};

export type Finding = {
  ruleId: string;
  title: string;
  severity: Severity;
  category: FindingCategory;
  file: string;
  line: number;
  evidence: string;
  impact: string;
  fix: string;
  masked: boolean;
};

export type AIAnalysisStatus = "not_configured" | "skipped" | "completed" | "failed";

export type AIAnalysisResult = {
  status: AIAnalysisStatus;
  summary?: string;
  complianceContext?: string;
  suggestedRemediation?: string;
  errorMessage?: string;
};

export type FindingCounts = Record<string, number>;

export type RiskReport = {
  score: number;
  summary: string;
  findingCounts: FindingCounts;
  findings: Finding[];
  aiAnalysis?: AIAnalysisResult;
  prComment: string;
  disclaimer: string;
};

export type ScanRequestInput = {
  files?: SourceFile[];
  code?: string;
  path?: string;
  localPath?: string;
  enableAiAnalysis?: boolean;
};
