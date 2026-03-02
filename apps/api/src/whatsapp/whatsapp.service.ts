import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * WhatsApp messaging service using Twilio.
 *
 * Sends interactive messages with YES/NO quick-reply buttons via the
 * Twilio Content API. Falls back to plain-text if template creation fails.
 *
 * In dev mode (no credentials), logs messages to console.
 */
@Injectable()
export class WhatsAppService implements OnModuleInit {
    private readonly logger = new Logger(WhatsAppService.name);
    private twilioClient: any = null;
    private readonly fromNumber: string;
    private readonly accountSid: string;
    private readonly authToken: string;
    private leaveApprovalContentSid: string | null = null;

    constructor(private readonly config: ConfigService) {
        this.accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID', '');
        this.authToken = this.config.get<string>('TWILIO_AUTH_TOKEN', '');
        this.fromNumber = this.config.get<string>(
            'TWILIO_WHATSAPP_FROM',
            'whatsapp:+14155238886',
        );

        if (this.accountSid && this.authToken && this.accountSid !== 'CHANGE_ME') {
            try {
                const Twilio = require('twilio');
                this.twilioClient = new Twilio(this.accountSid, this.authToken);
                this.logger.log('Twilio WhatsApp client initialized');
            } catch (err) {
                this.logger.warn('Twilio SDK not available — WhatsApp will log to console');
            }
        } else {
            this.logger.warn('Twilio credentials not configured — WhatsApp will log to console');
        }
    }

    /**
     * On startup, find or create the interactive Content Template for
     * leave approval with YES/NO quick-reply buttons.
     */
    async onModuleInit() {
        if (!this.twilioClient) return;

        try {
            this.leaveApprovalContentSid = await this.findOrCreateLeaveTemplate();
            if (this.leaveApprovalContentSid) {
                this.logger.log(
                    `Leave approval Content Template ready: ${this.leaveApprovalContentSid}`,
                );
            }
        } catch (err: any) {
            this.logger.warn(
                `Content Template setup failed (will fall back to plain text): ${err.message}`,
            );
        }
    }

    /**
     * Find existing or create a new Content Template with quick-reply buttons.
     */
    private async findOrCreateLeaveTemplate(): Promise<string | null> {
        const TEMPLATE_NAME = 'bms_leave_approval_v1';

        try {
            // Search for existing template by name
            const existing = await this.twilioClient.content.v1.contents.list({ limit: 100 });
            const found = existing.find((c: any) => c.friendlyName === TEMPLATE_NAME);

            if (found) {
                this.logger.log(`Found existing Content Template: ${found.sid}`);
                return found.sid;
            }

            // Create new template with quick-reply buttons
            const template = await this.twilioClient.content.v1.contents.create({
                friendlyName: TEMPLATE_NAME,
                language: 'en',
                variables: {
                    '1': 'studentName',
                    '2': 'leaveType',
                    '3': 'fromDate',
                    '4': 'toDate',
                    '5': 'hostelName',
                    '6': 'reason',
                },
                types: {
                    'twilio/quick-reply': {
                        body:
                            '🏫 *BMS Hostel — Leave Approval Request*\n\n' +
                            'Your ward *{{1}}* has applied for leave:\n\n' +
                            '📋 *Type:* {{2}}\n' +
                            '📅 *From:* {{3}}\n' +
                            '📅 *To:* {{4}}\n' +
                            '🏠 *Hostel:* {{5}}\n' +
                            '📝 *Reason:* {{6}}\n\n' +
                            'Please tap a button below to approve or reject:',
                        actions: [
                            { title: '✅ YES - Approve', id: 'approve_leave' },
                            { title: '❌ NO - Reject', id: 'reject_leave' },
                        ],
                    },
                },
            });

            this.logger.log(`Created Content Template: ${template.sid}`);

            // Submit for approval (auto-approved for sandbox)
            try {
                await this.twilioClient.content.v1
                    .contents(template.sid)
                    .approvalRequests()
                    .create({ name: TEMPLATE_NAME, category: 'UTILITY' });
                this.logger.log('Content Template submitted for approval');
            } catch (approvalErr: any) {
                this.logger.warn(`Template approval request note: ${approvalErr.message}`);
            }

            return template.sid;
        } catch (err: any) {
            this.logger.warn(`Content Template creation failed: ${err.message}`);
            return null;
        }
    }

    /**
     * Send a plain WhatsApp message.
     */
    async sendMessage(to: string, body: string): Promise<string> {
        const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        if (!this.twilioClient) {
            this.logger.log(`[WHATSAPP-DEV] To: ${whatsappTo}`);
            this.logger.log(`[WHATSAPP-DEV] Body: ${body}`);
            return 'DEV_LOG';
        }

        try {
            const message = await this.twilioClient.messages.create({
                from: this.fromNumber,
                to: whatsappTo,
                body,
            });
            this.logger.log(`WhatsApp sent to ${whatsappTo}, SID: ${message.sid}`);
            return message.sid;
        } catch (err: any) {
            this.logger.error(`WhatsApp send failed to ${whatsappTo}: ${err.message}`);
            throw err;
        }
    }

    /**
     * Send a leave approval request to a parent via WhatsApp.
     * Uses interactive quick-reply buttons if Content Template is available,
     * otherwise falls back to plain text.
     */
    async sendLeaveApprovalRequest(
        parentPhone: string,
        leaveDetails: {
            studentName: string;
            leaveType: string;
            fromDate: string;
            toDate: string;
            reason: string;
            hostelName: string;
        },
    ): Promise<string> {
        const whatsappTo = parentPhone.startsWith('whatsapp:')
            ? parentPhone
            : `whatsapp:${parentPhone}`;

        if (!this.twilioClient) {
            this.logger.log(`[WHATSAPP-DEV] To: ${whatsappTo}`);
            this.logger.log(`[WHATSAPP-DEV] Leave approval request for ${leaveDetails.studentName}`);
            return 'DEV_LOG';
        }

        // ── Try interactive buttons first ──
        if (this.leaveApprovalContentSid) {
            try {
                const message = await this.twilioClient.messages.create({
                    from: this.fromNumber,
                    to: whatsappTo,
                    contentSid: this.leaveApprovalContentSid,
                    contentVariables: JSON.stringify({
                        '1': leaveDetails.studentName,
                        '2': leaveDetails.leaveType,
                        '3': leaveDetails.fromDate,
                        '4': leaveDetails.toDate,
                        '5': leaveDetails.hostelName,
                        '6': leaveDetails.reason,
                    }),
                });
                this.logger.log(
                    `WhatsApp interactive message sent to ${whatsappTo}, SID: ${message.sid}`,
                );
                return message.sid;
            } catch (err: any) {
                this.logger.warn(
                    `Interactive message failed, falling back to plain text: ${err.message}`,
                );
                // Fall through to plain text
            }
        }

        // ── Fallback: plain text message ──
        const body =
            `🏫 *BMS Hostel — Leave Approval Request*\n\n` +
            `Your ward *${leaveDetails.studentName}* has applied for leave:\n\n` +
            `📋 *Type:* ${leaveDetails.leaveType}\n` +
            `📅 *From:* ${leaveDetails.fromDate}\n` +
            `📅 *To:* ${leaveDetails.toDate}\n` +
            `🏠 *Hostel:* ${leaveDetails.hostelName}\n` +
            `📝 *Reason:* ${leaveDetails.reason}\n\n` +
            `Please reply *YES* to approve or *NO* to reject this leave request.`;

        return this.sendMessage(parentPhone, body);
    }

    /**
     * Validate Twilio webhook signature for security.
     */
    validateWebhookSignature(
        signature: string,
        url: string,
        params: Record<string, string>,
    ): boolean {
        if (!this.twilioClient) {
            return true;
        }

        try {
            const Twilio = require('twilio');
            const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
            return Twilio.validateRequest(token, signature, url, params);
        } catch {
            return false;
        }
    }
}
