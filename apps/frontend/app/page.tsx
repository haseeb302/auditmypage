import { Suspense } from "react";
import { PageAuditApp } from "./components/PageAuditApp";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <PageAuditApp />
    </Suspense>
  );
}
