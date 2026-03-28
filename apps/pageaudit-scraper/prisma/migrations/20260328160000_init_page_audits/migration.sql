-- CreateTable
CREATE TABLE "page_audits" (
    "id" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "page_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_audits_source_url_idx" ON "page_audits"("source_url");

-- CreateIndex
CREATE INDEX "page_audits_created_at_idx" ON "page_audits"("created_at" DESC);
