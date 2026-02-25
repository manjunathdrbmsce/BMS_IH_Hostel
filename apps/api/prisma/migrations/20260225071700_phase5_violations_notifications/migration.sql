-- CreateEnum
CREATE TYPE "ViolationType" AS ENUM ('LATE_ENTRY', 'OVERSTAY', 'EARLY_EXIT');

-- CreateEnum
CREATE TYPE "EscalationState" AS ENUM ('NONE', 'WARNED', 'ESCALATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationState" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH');

-- AlterTable
ALTER TABLE "building_policies" ADD COLUMN     "violation_window" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "gate_entries" ADD COLUMN     "policy_snapshot_id" UUID;

-- CreateTable
CREATE TABLE "policy_snapshots" (
    "id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "policy_version" INTEGER NOT NULL,
    "curfew_time_used" VARCHAR(5) NOT NULL,
    "tolerance_min_used" INTEGER NOT NULL,
    "leave_deadline_used" TIMESTAMP(3),
    "escalation_rule_min" INTEGER NOT NULL,
    "repeated_threshold" INTEGER NOT NULL,
    "violation_window" INTEGER NOT NULL,
    "notify_parent_on_exit" BOOLEAN NOT NULL,
    "notify_parent_on_entry" BOOLEAN NOT NULL,
    "notify_parent_on_late" BOOLEAN NOT NULL,
    "notify_warden_on_late" BOOLEAN NOT NULL,
    "snapshot_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violations" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "gate_entry_id" UUID NOT NULL,
    "policy_snapshot_id" UUID NOT NULL,
    "type" "ViolationType" NOT NULL,
    "requested_or_approved_time" TIMESTAMP(3) NOT NULL,
    "actual_time" TIMESTAMP(3) NOT NULL,
    "violated_by_minutes" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "repeated_count_snapshot" INTEGER NOT NULL,
    "escalation_state" "EscalationState" NOT NULL DEFAULT 'NONE',
    "notification_state" "NotificationState" NOT NULL DEFAULT 'PENDING',
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" UUID,
    "resolved_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "violation_id" UUID,
    "gate_entry_id" UUID,
    "state" "NotificationState" NOT NULL DEFAULT 'PENDING',
    "read_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "fail_reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "policy_snapshots_building_id_idx" ON "policy_snapshots"("building_id");

-- CreateIndex
CREATE INDEX "policy_snapshots_policy_id_idx" ON "policy_snapshots"("policy_id");

-- CreateIndex
CREATE INDEX "violations_student_id_idx" ON "violations"("student_id");

-- CreateIndex
CREATE INDEX "violations_type_idx" ON "violations"("type");

-- CreateIndex
CREATE INDEX "violations_escalation_state_idx" ON "violations"("escalation_state");

-- CreateIndex
CREATE INDEX "violations_created_at_idx" ON "violations"("created_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_read_at_idx" ON "notifications"("recipient_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_state_idx" ON "notifications"("state");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "gate_entries" ADD CONSTRAINT "gate_entries_policy_snapshot_id_fkey" FOREIGN KEY ("policy_snapshot_id") REFERENCES "policy_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_snapshots" ADD CONSTRAINT "policy_snapshots_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_snapshots" ADD CONSTRAINT "policy_snapshots_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "building_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_gate_entry_id_fkey" FOREIGN KEY ("gate_entry_id") REFERENCES "gate_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_policy_snapshot_id_fkey" FOREIGN KEY ("policy_snapshot_id") REFERENCES "policy_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_violation_id_fkey" FOREIGN KEY ("violation_id") REFERENCES "violations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_gate_entry_id_fkey" FOREIGN KEY ("gate_entry_id") REFERENCES "gate_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
