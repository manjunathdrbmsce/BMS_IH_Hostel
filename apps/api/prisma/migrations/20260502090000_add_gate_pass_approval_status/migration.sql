CREATE TYPE "GatePassApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "gate_passes"
ADD COLUMN "approval_status" "GatePassApprovalStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "gate_passes"
SET "approval_status" = CASE
  WHEN "approved_by_id" IS NOT NULL THEN 'APPROVED'::"GatePassApprovalStatus"
  ELSE 'PENDING'::"GatePassApprovalStatus"
END;

CREATE INDEX "gate_passes_approval_status_idx" ON "gate_passes"("approval_status");
