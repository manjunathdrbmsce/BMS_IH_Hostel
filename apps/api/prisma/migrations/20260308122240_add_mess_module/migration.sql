-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER');

-- CreateEnum
CREATE TYPE "MessType" AS ENUM ('VEG', 'NON_VEG');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "MealScanStatus" AS ENUM ('SCANNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RebateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CREDITED');

-- CreateEnum
CREATE TYPE "MenuStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "is_anonymous" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "mess_menus" (
    "id" UUID NOT NULL,
    "hostel_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "mess_type" "MessType" NOT NULL,
    "status" "MenuStatus" NOT NULL DEFAULT 'DRAFT',
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_by_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mess_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_menu_items" (
    "id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "day" "DayOfWeek" NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "items" TEXT NOT NULL,
    "special_note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mess_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_scans" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "hostel_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanned_by_id" UUID NOT NULL,
    "status" "MealScanStatus" NOT NULL DEFAULT 'SCANNED',
    "is_guest" BOOLEAN NOT NULL DEFAULT false,
    "guest_name" VARCHAR(200),
    "guest_count" INTEGER NOT NULL DEFAULT 1,
    "notes" VARCHAR(500),
    "device_fingerprint" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_feedback" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "hostel_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_rebates" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "hostel_id" UUID NOT NULL,
    "from_date" DATE NOT NULL,
    "to_date" DATE NOT NULL,
    "total_meals" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION,
    "status" "RebateStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "leave_id" UUID,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mess_rebates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mess_menus_hostel_id_idx" ON "mess_menus"("hostel_id");

-- CreateIndex
CREATE INDEX "mess_menus_status_idx" ON "mess_menus"("status");

-- CreateIndex
CREATE INDEX "mess_menus_effective_from_idx" ON "mess_menus"("effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "uq_active_menu" ON "mess_menus"("hostel_id", "mess_type", "status");

-- CreateIndex
CREATE INDEX "mess_menu_items_menu_id_idx" ON "mess_menu_items"("menu_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_menu_day_meal" ON "mess_menu_items"("menu_id", "day", "meal_type");

-- CreateIndex
CREATE INDEX "meal_scans_student_id_idx" ON "meal_scans"("student_id");

-- CreateIndex
CREATE INDEX "meal_scans_hostel_id_idx" ON "meal_scans"("hostel_id");

-- CreateIndex
CREATE INDEX "meal_scans_date_idx" ON "meal_scans"("date");

-- CreateIndex
CREATE INDEX "meal_scans_meal_type_idx" ON "meal_scans"("meal_type");

-- CreateIndex
CREATE INDEX "meal_scans_scanned_at_idx" ON "meal_scans"("scanned_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_student_meal_per_day" ON "meal_scans"("student_id", "date", "meal_type");

-- CreateIndex
CREATE INDEX "meal_feedback_hostel_id_idx" ON "meal_feedback"("hostel_id");

-- CreateIndex
CREATE INDEX "meal_feedback_date_idx" ON "meal_feedback"("date");

-- CreateIndex
CREATE INDEX "meal_feedback_rating_idx" ON "meal_feedback"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "uq_feedback_per_meal" ON "meal_feedback"("student_id", "date", "meal_type");

-- CreateIndex
CREATE INDEX "mess_rebates_student_id_idx" ON "mess_rebates"("student_id");

-- CreateIndex
CREATE INDEX "mess_rebates_hostel_id_idx" ON "mess_rebates"("hostel_id");

-- CreateIndex
CREATE INDEX "mess_rebates_status_idx" ON "mess_rebates"("status");

-- CreateIndex
CREATE INDEX "mess_rebates_from_date_to_date_idx" ON "mess_rebates"("from_date", "to_date");

-- AddForeignKey
ALTER TABLE "mess_menus" ADD CONSTRAINT "mess_menus_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_menus" ADD CONSTRAINT "mess_menus_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_menu_items" ADD CONSTRAINT "mess_menu_items_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "mess_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_scans" ADD CONSTRAINT "meal_scans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_scans" ADD CONSTRAINT "meal_scans_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_scans" ADD CONSTRAINT "meal_scans_scanned_by_id_fkey" FOREIGN KEY ("scanned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_feedback" ADD CONSTRAINT "meal_feedback_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_feedback" ADD CONSTRAINT "meal_feedback_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_rebates" ADD CONSTRAINT "mess_rebates_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_rebates" ADD CONSTRAINT "mess_rebates_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_rebates" ADD CONSTRAINT "mess_rebates_leave_id_fkey" FOREIGN KEY ("leave_id") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_rebates" ADD CONSTRAINT "mess_rebates_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
