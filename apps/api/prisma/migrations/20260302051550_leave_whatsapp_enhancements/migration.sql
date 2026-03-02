-- AlterEnum
ALTER TYPE "LeaveStatus" ADD VALUE 'PARENT_REJECTED';

-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'WHATSAPP';

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "proof_url" VARCHAR(500);

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "leave_request_id" UUID;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
