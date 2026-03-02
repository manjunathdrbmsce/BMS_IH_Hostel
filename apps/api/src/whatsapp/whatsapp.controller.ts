import {
    Controller,
    Post,
    Get,
    Req,
    Res,
    Logger,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { LeaveStatus } from '@prisma/client';

/**
 * Webhook controller for receiving inbound WhatsApp replies from parents.
 * This is called by Twilio when a parent sends a reply.
 *
 * Flow:
 * 1. Parent receives leave approval request via WhatsApp
 * 2. Parent replies YES or NO
 * 3. Twilio forwards the reply to this webhook
 * 4. We match the reply to a pending leave request by the parent's phone number
 * 5. We approve or reject the leave accordingly
 */
@ApiTags('webhooks')
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
    private readonly logger = new Logger(WhatsAppWebhookController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly whatsappService: WhatsAppService,
        private readonly config: ConfigService,
    ) { }

    /**
     * GET — Twilio/Meta webhook verification endpoint.
     */
    @Get()
    @ApiExcludeEndpoint()
    verify(@Req() req: Request, @Res() res: Response) {
        const token = req.query['hub.verify_token'] || req.query['verify_token'];
        const challenge = req.query['hub.challenge'];
        const expectedToken = this.config.get<string>('TWILIO_WEBHOOK_VERIFY_TOKEN');

        if (token === expectedToken) {
            this.logger.log('Webhook verification successful');
            return res.status(200).send(challenge || 'OK');
        }

        this.logger.warn('Webhook verification failed — invalid token');
        return res.status(403).send('Forbidden');
    }

    /**
     * POST — Receive inbound WhatsApp messages from Twilio.
     * Twilio sends form-urlencoded data with fields like:
     *   From: whatsapp:+919876543210
     *   Body: YES
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'WhatsApp inbound webhook (Twilio)' })
    async handleInbound(@Req() req: Request, @Res() res: Response) {
        try {
            const body = req.body;
            const from = body.From || body.from || '';
            const messageBody = (body.Body || body.body || '').trim().toUpperCase();

            this.logger.log(`WhatsApp inbound from ${from}: "${messageBody}"`);

            if (!from || !messageBody) {
                return res.status(200).send('<Response></Response>');
            }

            // Extract phone number (remove 'whatsapp:' prefix)
            const phoneNumber = from.replace('whatsapp:', '').trim();

            // Find the parent user by mobile number
            const parentUser = await this.prisma.user.findFirst({
                where: {
                    mobile: { in: [phoneNumber, phoneNumber.replace('+91', '')] },
                    userRoles: {
                        some: {
                            role: { name: 'PARENT' },
                            revokedAt: null,
                        },
                    },
                },
            });

            if (!parentUser) {
                this.logger.warn(`No parent user found for phone: ${phoneNumber}`);
                await this.whatsappService.sendMessage(
                    from,
                    '❌ Your phone number is not registered as a parent in the BMS Hostel system.',
                );
                return res.status(200).send('<Response></Response>');
            }

            // Find student(s) linked to this parent via GuardianLink
            const guardianLinks = await this.prisma.guardianLink.findMany({
                where: { guardianId: parentUser.id },
                select: { studentId: true },
            });

            if (guardianLinks.length === 0) {
                await this.whatsappService.sendMessage(
                    from,
                    '❌ No student linked to your account.',
                );
                return res.status(200).send('<Response></Response>');
            }

            const studentIds = guardianLinks.map((gl) => gl.studentId);

            // Find pending leave request for any of the linked students
            const pendingLeave = await this.prisma.leaveRequest.findFirst({
                where: {
                    studentId: { in: studentIds },
                    status: LeaveStatus.PENDING,
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    student: {
                        select: { firstName: true, lastName: true },
                    },
                },
            });

            if (!pendingLeave) {
                await this.whatsappService.sendMessage(
                    from,
                    'ℹ️ No pending leave request found for your ward.',
                );
                return res.status(200).send('<Response></Response>');
            }

            // Process YES or NO
            if (messageBody === 'YES' || messageBody === 'Y' || messageBody === 'APPROVE') {
                await this.prisma.leaveRequest.update({
                    where: { id: pendingLeave.id },
                    data: {
                        status: LeaveStatus.PARENT_APPROVED,
                        parentApprovalAt: new Date(),
                        parentId: parentUser.id,
                    },
                });

                const studentName = `${pendingLeave.student.firstName} ${pendingLeave.student.lastName}`;
                await this.whatsappService.sendMessage(
                    from,
                    `✅ You have *approved* the leave request for *${studentName}*.\n\nThe warden will now review it for final approval.`,
                );

                this.logger.log(
                    `Parent ${parentUser.id} approved leave ${pendingLeave.id} via WhatsApp`,
                );
            } else if (messageBody === 'NO' || messageBody === 'N' || messageBody === 'REJECT') {
                await this.prisma.leaveRequest.update({
                    where: { id: pendingLeave.id },
                    data: {
                        status: LeaveStatus.PARENT_REJECTED,
                        parentId: parentUser.id,
                    },
                });

                const studentName = `${pendingLeave.student.firstName} ${pendingLeave.student.lastName}`;
                await this.whatsappService.sendMessage(
                    from,
                    `❌ You have *rejected* the leave request for *${studentName}*.\n\nThe student has been notified.`,
                );

                this.logger.log(
                    `Parent ${parentUser.id} rejected leave ${pendingLeave.id} via WhatsApp`,
                );
            } else {
                await this.whatsappService.sendMessage(
                    from,
                    `🤔 Sorry, I didn't understand "${messageBody}".\n\nPlease reply *YES* to approve or *NO* to reject the leave request.`,
                );
            }

            // Return TwiML empty response
            return res.status(200).send('<Response></Response>');
        } catch (err: any) {
            this.logger.error(`Webhook error: ${err.message}`, err.stack);
            return res.status(200).send('<Response></Response>');
        }
    }
}
