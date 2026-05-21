-- Separate actual parent approval from admin parent-approval override.
ALTER TABLE "leave_requests"
  ADD COLUMN "parent_override_by_id" UUID,
  ADD COLUMN "parent_override_at" TIMESTAMP(3),
  ADD COLUMN "parent_override_reason" TEXT;

CREATE INDEX "leave_requests_parent_override_by_id_idx" ON "leave_requests"("parent_override_by_id");

ALTER TABLE "leave_requests"
  ADD CONSTRAINT "leave_requests_parent_override_by_id_fkey"
  FOREIGN KEY ("parent_override_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
