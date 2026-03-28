export type Severity = "critical" | "warning" | "suggestion";

export type Finding = {
  severity: Severity;
  issue: string;
  fix: string;
};

export type AuditDimension = {
  key: string;
  label: string;
  score: number;
  summary: string;
  findings: Finding[];
};

export type AuditResult = {
  url: string;
  score: number;
  scanned_at: string;
  dimensions: AuditDimension[];
};

export type Feature = {
  icon: string;
  name: string;
  desc: string;
};
