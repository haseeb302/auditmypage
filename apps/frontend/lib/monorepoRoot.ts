import fs from "node:fs";
import path from "node:path";

function hasWorkspacesField(pkg: unknown): boolean {
  if (!pkg || typeof pkg !== "object") return false;
  const w = (pkg as { workspaces?: unknown }).workspaces;
  if (Array.isArray(w)) return w.length > 0;
  if (w && typeof w === "object" && w !== null && "packages" in w) return true;
  return false;
}

/** Walk up from `start` to the npm workspace root (has `workspaces` in package.json). */
export function resolveMonorepoRoot(start: string): string {
  let dir = path.resolve(start);
  for (let i = 0; i < 8; i++) {
    const pkgPath = path.join(dir, "package.json");
    try {
      const raw = fs.readFileSync(pkgPath, "utf8");
      const pkg = JSON.parse(raw) as unknown;
      if (hasWorkspacesField(pkg)) {
        return dir;
      }
    } catch {
      /* missing or invalid package.json */
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(start);
}
