-- AlterTable
ALTER TABLE "reports" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "reports_shareToken_key" ON "reports"("shareToken");

-- CreateIndex
CREATE INDEX "reports_shareToken_idx" ON "reports"("shareToken");
