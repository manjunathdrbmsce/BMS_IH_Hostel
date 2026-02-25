import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HostelsModule } from './hostels/hostels.module';
import { BuildingsModule } from './buildings/buildings.module';
import { PoliciesModule } from './policies/policies.module';
import { StudentsModule } from './students/students.module';
import { AllotmentsModule } from './allotments/allotments.module';
import { LeaveModule } from './leave/leave.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { NoticesModule } from './notices/notices.module';
import { GateModule } from './gate/gate.module';
import { ViolationsModule } from './violations/violations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 30,
      },
    ]),

    // Core modules
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    HostelsModule,
    BuildingsModule,
    PoliciesModule,
    StudentsModule,
    AllotmentsModule,
    LeaveModule,
    ComplaintsModule,
    NoticesModule,
    GateModule,
    ViolationsModule,
    NotificationsModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
