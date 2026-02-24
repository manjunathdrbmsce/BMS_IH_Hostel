-- CreateEnum
CREATE TYPE "BuildingStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_CONSTRUCTION', 'UNDER_MAINTENANCE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'VACATED', 'TRANSFERRED', 'EXPIRED');

-- AlterTable
ALTER TABLE "hostels" ADD COLUMN     "building_id" UUID;

-- CreateTable
CREATE TABLE "buildings" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "location" VARCHAR(500),
    "address" VARCHAR(500),
    "contact_no" VARCHAR(20),
    "email" VARCHAR(255),
    "total_floors" INTEGER NOT NULL DEFAULT 1,
    "status" "BuildingStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "building_policies" (
    "id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "weekday_curfew" VARCHAR(5) NOT NULL DEFAULT '22:00',
    "weekend_curfew" VARCHAR(5) NOT NULL DEFAULT '23:00',
    "tolerance_min" INTEGER NOT NULL DEFAULT 15,
    "parent_approval_required" BOOLEAN NOT NULL DEFAULT true,
    "max_leave_days" INTEGER NOT NULL DEFAULT 7,
    "warden_escalation_min" INTEGER NOT NULL DEFAULT 30,
    "repeated_violation_threshold" INTEGER NOT NULL DEFAULT 3,
    "notify_parent_on_exit" BOOLEAN NOT NULL DEFAULT true,
    "notify_parent_on_entry" BOOLEAN NOT NULL DEFAULT true,
    "notify_parent_on_late" BOOLEAN NOT NULL DEFAULT true,
    "notify_warden_on_late" BOOLEAN NOT NULL DEFAULT true,
    "override_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "building_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date_of_birth" DATE,
    "blood_group" VARCHAR(5),
    "gender" VARCHAR(10),
    "department" VARCHAR(100),
    "course" VARCHAR(100),
    "year" INTEGER,
    "semester" INTEGER,
    "admission_date" DATE,
    "emergency_contact" VARCHAR(20),
    "permanent_address" TEXT,
    "medical_conditions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian_links" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "guardian_id" UUID NOT NULL,
    "relation" VARCHAR(50) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardian_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_assignments" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "bed_id" UUID NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vacated_at" TIMESTAMP(3),
    "assigned_by_id" UUID,
    "reason" VARCHAR(500),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bed_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buildings_code_key" ON "buildings"("code");

-- CreateIndex
CREATE INDEX "buildings_status_idx" ON "buildings"("status");

-- CreateIndex
CREATE INDEX "building_policies_building_id_is_active_idx" ON "building_policies"("building_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "building_policies_building_id_version_key" ON "building_policies"("building_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");

-- CreateIndex
CREATE INDEX "guardian_links_student_id_idx" ON "guardian_links"("student_id");

-- CreateIndex
CREATE INDEX "guardian_links_guardian_id_idx" ON "guardian_links"("guardian_id");

-- CreateIndex
CREATE UNIQUE INDEX "guardian_links_student_id_guardian_id_key" ON "guardian_links"("student_id", "guardian_id");

-- CreateIndex
CREATE INDEX "bed_assignments_student_id_idx" ON "bed_assignments"("student_id");

-- CreateIndex
CREATE INDEX "bed_assignments_bed_id_idx" ON "bed_assignments"("bed_id");

-- CreateIndex
CREATE INDEX "bed_assignments_status_idx" ON "bed_assignments"("status");

-- CreateIndex
CREATE INDEX "bed_assignments_assigned_at_idx" ON "bed_assignments"("assigned_at");

-- AddForeignKey
ALTER TABLE "hostels" ADD CONSTRAINT "hostels_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building_policies" ADD CONSTRAINT "building_policies_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bed_assignments" ADD CONSTRAINT "bed_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
