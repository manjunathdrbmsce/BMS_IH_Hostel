-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'ON_LEAVE', 'LATE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('GATE', 'QR_SCAN', 'ROLL_CALL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('IN_HOSTEL', 'OUT_CAMPUS', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "DeviceRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "bed_assignments" ADD COLUMN     "presence_status" "PresenceStatus" NOT NULL DEFAULT 'IN_HOSTEL';

-- CreateTable
CREATE TABLE "daily_attendance" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "first_in" TIMESTAMP(3),
    "last_out" TIMESTAMP(3),
    "last_in" TIMESTAMP(3),
    "is_on_leave" BOOLEAN NOT NULL DEFAULT false,
    "leave_id" UUID,
    "session_id" UUID,
    "marked_by" UUID,
    "source" "AttendanceSource" NOT NULL DEFAULT 'GATE',
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "device_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" UUID NOT NULL,
    "hostel_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "session_secret" VARCHAR(64) NOT NULL,
    "title" VARCHAR(200),
    "starts_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "gps_lat" DOUBLE PRECISION NOT NULL,
    "gps_lng" DOUBLE PRECISION NOT NULL,
    "gps_radius_m" INTEGER NOT NULL DEFAULT 150,
    "total_students" INTEGER NOT NULL DEFAULT 0,
    "present_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "fingerprint" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(200),
    "platform" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by_id" UUID,

    CONSTRAINT "student_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_change_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "new_fingerprint" VARCHAR(255) NOT NULL,
    "new_device_name" VARCHAR(200),
    "new_platform" VARCHAR(50),
    "reason" TEXT,
    "status" "DeviceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_attendance_date_idx" ON "daily_attendance"("date");

-- CreateIndex
CREATE INDEX "daily_attendance_status_idx" ON "daily_attendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "daily_attendance_student_id_date_key" ON "daily_attendance"("student_id", "date");

-- CreateIndex
CREATE INDEX "attendance_sessions_hostel_id_status_idx" ON "attendance_sessions"("hostel_id", "status");

-- CreateIndex
CREATE INDEX "attendance_sessions_expires_at_idx" ON "attendance_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "student_devices_user_id_is_active_idx" ON "student_devices"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "student_devices_fingerprint_idx" ON "student_devices"("fingerprint");

-- CreateIndex
CREATE INDEX "device_change_requests_user_id_status_idx" ON "device_change_requests"("user_id", "status");

-- AddForeignKey
ALTER TABLE "daily_attendance" ADD CONSTRAINT "daily_attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_attendance" ADD CONSTRAINT "daily_attendance_leave_id_fkey" FOREIGN KEY ("leave_id") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_attendance" ADD CONSTRAINT "daily_attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_attendance" ADD CONSTRAINT "daily_attendance_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_devices" ADD CONSTRAINT "student_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_devices" ADD CONSTRAINT "student_devices_deactivated_by_id_fkey" FOREIGN KEY ("deactivated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_change_requests" ADD CONSTRAINT "device_change_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_change_requests" ADD CONSTRAINT "device_change_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
