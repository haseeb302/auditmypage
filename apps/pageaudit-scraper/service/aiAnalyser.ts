import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.js";
import type { PageData } from "../types/pageData";
import {
  AuditResultSchema,
  toAuditResult,
  type AuditResult,
} from "../lib/auditResultSchema";
import {
  AUDIT_SYSTEM_PROMPT,
  buildAuditUserMessage,
} from "../prompts/auditPrompt";

export async function analyseWithAI(
  pageData: PageData,
  pageUrl: string,
): Promise<AuditResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.parse({
    model,
    messages: [
      { role: "system", content: AUDIT_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildAuditUserMessage(pageUrl, pageData),
      },
    ],
    response_format: zodResponseFormat(AuditResultSchema, "page_audit_result"),
  });

  const message = completion.choices[0]?.message;
  if (message?.refusal) {
    throw new Error(`Model refused: ${message.refusal}`);
  }

  const parsed = message?.parsed;
  if (!parsed) {
    throw new Error(
      message?.content
        ? `No parsed output; raw: ${message.content.slice(0, 500)}`
        : "No parsed output from OpenAI",
    );
  }

  return toAuditResult(parsed, pageUrl);
}
