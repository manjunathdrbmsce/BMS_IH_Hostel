import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceScheduler {
    private readonly logger = new Logger(AttendanceScheduler.name);

    constructor(
        private readonly attendanceService: AttendanceService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Runs every minute — finds active sessions past their expiresAt and
     * triggers expireSession() to mark remaining students ABSENT.
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleExpiredSessions() {
        const expiredSessions = await this.prisma.attendanceSession.findMany({
            where: {
                status: 'ACTIVE',
                expiresAt: { lte: new Date() },
            },
            select: { id: true, title: true },
        });

        if (expiredSessions.length === 0) return;

        this.logger.log(`Found ${expiredSessions.length} expired session(s) to process`);

        for (const session of expiredSessions) {
            try {
                await this.attendanceService.expireSession(session.id);
                this.logger.log(`✅ Expired session "${session.title}" (${session.id})`);
            } catch (err: any) {
                this.logger.error(`Failed to expire session ${session.id}: ${err?.message}`);
            }
        }
    }
}
