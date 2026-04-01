"use client";

import { useRouter } from "next/navigation";
import { AuditResultsPage } from "@/app/components/AuditResultsPage";
import { NavBar } from "@/app/components/NavBar";
import { APP_CSS } from "@/app/design-system/theme";
import type { AuditResult } from "@/app/types";

export function AuditShareClient({
  audit,
  id,
}: {
  audit: AuditResult;
  id: string;
}) {
  const router = useRouter();

  function goHome() {
    router.push("/");
  }

  function goTryFree() {
    router.push("/?focus=url");
  }

  return (
    <>
      <style>{APP_CSS}</style>
      <NavBar onHome={goHome} onTryFree={goTryFree} />
      <AuditResultsPage audit={audit} onBack={goHome} id={id} />
    </>
  );
}
