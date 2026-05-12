import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { DeviceService } from './device.service';
import { AttendanceScheduler } from './attendance.scheduler';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [ScheduleModule.forRoot(), AuthModule],
    controllers: [AttendanceController],
    providers: [AttendanceService, DeviceService, AttendanceScheduler],
    exports: [AttendanceService, DeviceService],
})
export class AttendanceModule { }
