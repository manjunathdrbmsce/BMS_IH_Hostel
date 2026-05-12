import { Module } from '@nestjs/common';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { MessModule } from '../mess/mess.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [WhatsAppModule, NotificationsModule, AttendanceModule, MessModule, AuthModule],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule { }
