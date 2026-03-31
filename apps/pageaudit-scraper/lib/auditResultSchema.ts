import { z } from "zod";

export const FindingSchema = z.object({
  severity: z.enum(["critical", "warning", "suggestion"]),
  issue: z.string(),
  fix: z.string(),
});

const DimensionBlockSchema = z.object({
  label: z.string().min(1),
  score: z.number().min(0).max(100),
  summary: z.string(),
  findings: z.array(FindingSchema),
});

export const AuditResultSchema = z.object({
  url: z.string().min(1),
  score: z.number().min(0).max(100),
  scanned_at: z.string().min(1),
  dimensions: z.object({
    clarity: DimensionBlockSchema,
    cta: DimensionBlockSchema,
    trust: DimensionBlockSchema,
    value_prop: DimensionBlockSchema,
    structure: DimensionBlockSchema,
    mobile: DimensionBlockSchema,
  }),
});

export const DIMENSION_ORDER = [
  "clarity",
  "cta",
  "trust",
  "value_prop",
  "structure",
  "mobile",
] as const;

export type ParsedAuditResult = z.infer<typeof AuditResultSchema>;

export type AuditResult = {
  url: string;
  score: number;
  scanned_at: string;
  dimensions: Array<{
    key: string;
    label: string;
    score: number;
    summary: string;
    findings: Array<z.infer<typeof FindingSchema>>;
  }>;
};

export function toAuditResult(
  parsed: ParsedAuditResult,
  canonicalUrl: string,
): AuditResult {
  return {
    url: canonicalUrl,
    score: parsed.score,
    scanned_at: parsed.scanned_at,
    dimensions: DIMENSION_ORDER.map((key) => {
      const d = parsed.dimensions[key];
      return {
        key,
        label: d.label,
        score: d.score,
        summary: d.summary,
        findings: d.findings,
      };
    }),
  };
}
