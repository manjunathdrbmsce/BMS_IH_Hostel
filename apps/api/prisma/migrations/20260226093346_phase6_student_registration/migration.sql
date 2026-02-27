-- CreateEnum
CREATE TYPE "AdmissionMode" AS ENUM ('CET', 'COMEDK', 'MANAGEMENT', 'NRI', 'NRI_SPONSORED', 'PIO', 'FOREIGN_NATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_PENDING', 'APPROVED', 'ALLOTTED', 'REJECTED', 'CANCELLED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('HOSTEL_FEE', 'MESS_FEE', 'CAUTION_DEPOSIT', 'OTHER');

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "admission_mode" "AdmissionMode",
ADD COLUMN     "category" VARCHAR(30),
ADD COLUMN     "communication_address" TEXT,
ADD COLUMN     "father_email" VARCHAR(255),
ADD COLUMN     "father_landline" VARCHAR(20),
ADD COLUMN     "father_mobile" VARCHAR(20),
ADD COLUMN     "father_name" VARCHAR(200),
ADD COLUMN     "father_occupation" VARCHAR(200),
ADD COLUMN     "local_guardian_address" TEXT,
ADD COLUMN     "local_guardian_email" VARCHAR(255),
ADD COLUMN     "local_guardian_landline" VARCHAR(20),
ADD COLUMN     "local_guardian_mobile" VARCHAR(20),
ADD COLUMN     "local_guardian_name" VARCHAR(200),
ADD COLUMN     "mother_email" VARCHAR(255),
ADD COLUMN     "mother_landline" VARCHAR(20),
ADD COLUMN     "mother_mobile" VARCHAR(20),
ADD COLUMN     "mother_name" VARCHAR(200),
ADD COLUMN     "mother_occupation" VARCHAR(200),
ADD COLUMN     "mother_tongue" VARCHAR(50),
ADD COLUMN     "nationality" VARCHAR(50),
ADD COLUMN     "passport_no" VARCHAR(50),
ADD COLUMN     "photo_url" VARCHAR(500),
ADD COLUMN     "puc_percentage" DOUBLE PRECISION,
ADD COLUMN     "religion" VARCHAR(50),
ADD COLUMN     "residential_permit" TEXT,
ADD COLUMN     "visa_details" TEXT;

-- CreateTable
CREATE TABLE "hostel_registrations" (
    "id" UUID NOT NULL,
    "application_no" VARCHAR(20) NOT NULL,
    "student_id" UUID NOT NULL,
    "academic_year" VARCHAR(9) NOT NULL,
    "hostel_id" UUID,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'DRAFT',
    "student_snapshot" JSONB,
    "room_type_preference" VARCHAR(20),
    "mess_type" VARCHAR(10),
    "previous_hostel_history" TEXT,
    "hostelite_declaration_accepted" BOOLEAN NOT NULL DEFAULT false,
    "hostelite_declaration_at" TIMESTAMP(3),
    "anti_ragging_student_accepted" BOOLEAN NOT NULL DEFAULT false,
    "anti_ragging_student_at" TIMESTAMP(3),
    "anti_ragging_parent_accepted" BOOLEAN NOT NULL DEFAULT false,
    "anti_ragging_parent_at" TIMESTAMP(3),
    "hostel_agreement_accepted" BOOLEAN NOT NULL DEFAULT false,
    "hostel_agreement_at" TIMESTAMP(3),
    "ragging_prevention_accepted" BOOLEAN NOT NULL DEFAULT false,
    "ragging_prevention_at" TIMESTAMP(3),
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "rejection_reason" TEXT,
    "hostel_id_no" VARCHAR(30),
    "mess_roll_no" VARCHAR(30),
    "date_of_occupation" DATE,
    "submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hostel_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_fees" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "fee_type" "FeeType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "receipt_no" VARCHAR(50),
    "paid_at" DATE,
    "recorded_by_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_fees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hostel_registrations_application_no_key" ON "hostel_registrations"("application_no");

-- CreateIndex
CREATE INDEX "hostel_registrations_student_id_idx" ON "hostel_registrations"("student_id");

-- CreateIndex
CREATE INDEX "hostel_registrations_status_idx" ON "hostel_registrations"("status");

-- CreateIndex
CREATE INDEX "hostel_registrations_academic_year_idx" ON "hostel_registrations"("academic_year");

-- CreateIndex
CREATE INDEX "hostel_registrations_application_no_idx" ON "hostel_registrations"("application_no");

-- CreateIndex
CREATE INDEX "registration_fees_registration_id_idx" ON "registration_fees"("registration_id");

-- CreateIndex
CREATE INDEX "registration_fees_fee_type_idx" ON "registration_fees"("fee_type");

-- AddForeignKey
ALTER TABLE "hostel_registrations" ADD CONSTRAINT "hostel_registrations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_registrations" ADD CONSTRAINT "hostel_registrations_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_registrations" ADD CONSTRAINT "hostel_registrations_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_fees" ADD CONSTRAINT "registration_fees_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "hostel_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_fees" ADD CONSTRAINT "registration_fees_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
