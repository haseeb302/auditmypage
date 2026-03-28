/**
 * Single canonical form for audits and DB lookup: `https://host` or `https://host/path?query`.
 * - Adds https:// when the user omits a scheme (does nothing if http:// or https:// is present).
 * - Upgrades http:// to https://.
 * - Lowercases hostname; strips hash; omits trailing `/` on the root path only.
 */
export function normalizeAuditUrl(raw: string): string | null {
  try {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const withScheme =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;

    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;

    const hostLower = u.hostname.toLowerCase();
    const hostWithPort = u.port ? `${hostLower}:${u.port}` : hostLower;

    u.protocol = "https:";
    u.username = "";
    u.password = "";
    u.hash = "";

    const pathAndQuery =
      u.pathname === "/" && u.search === ""
        ? ""
        : `${u.pathname}${u.search}`;

    return `https://${hostWithPort}${pathAndQuery}`;
  } catch {
    return null;
  }
}
