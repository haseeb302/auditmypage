"use client";

import { useRouter } from "next/navigation";
import { AuditResultsPage } from "@/app/pageaudit/components/AuditResultsPage";
import { NavBar } from "@/app/pageaudit/components/NavBar";
import { APP_CSS } from "@/app/pageaudit/design-system/theme";
import type { AuditResult } from "@/app/pageaudit/types";

export function AuditShareClient({ audit }: { audit: AuditResult }) {
  const router = useRouter();

  function goHome() {
    router.push("/");
  }

  return (
    <>
      <style>{APP_CSS}</style>
      <NavBar onHome={goHome} />
      <AuditResultsPage audit={audit} onBack={goHome} />
    </>
  );
}
