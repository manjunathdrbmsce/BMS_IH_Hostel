import { Module } from '@nestjs/common';
import { GateController } from './gate.controller';
import { GateService } from './gate.service';
import { ViolationsModule } from '../violations/violations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ViolationsModule, NotificationsModule, AttendanceModule, AuthModule],
  controllers: [GateController],
  providers: [GateService],
  exports: [GateService],
})
export class GateModule { }
