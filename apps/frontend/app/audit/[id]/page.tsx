import { notFound } from "next/navigation";
import { fetchPublishedAudit } from "@/app/lib/fetchPublishedAudit";
import { AuditShareClient } from "./AuditShareClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AuditByIdPage({ params }: PageProps) {
  const { id } = await params;
  const audit = await fetchPublishedAudit(id);
  if (!audit) {
    notFound();
  }
  return <AuditShareClient audit={audit} />;
}
