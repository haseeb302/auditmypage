import { z } from "zod";
import { normalizeAuditUrl } from "./normalizeAuditUrl";

/** Shared POST body validation for `/api/scrape` and `/api/audit`. */
export const UrlBodySchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .transform((val) => normalizeAuditUrl(val))
    .refine((val): val is string => val !== null, {
      message: "Must be a valid http or https URL",
    })
    .refine((val) => {
      const hostname = new URL(val).hostname;
      const blocked = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "::1",
        "169.254.",
        "10.",
        "192.168.",
        "172.16.",
      ];
      return !blocked.some(
        (prefix) => hostname === prefix || hostname.startsWith(prefix),
      );
    }, "URL points to a private or reserved address"),
});
