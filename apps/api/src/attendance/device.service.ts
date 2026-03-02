import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { Prisma, DeviceRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
    RegisterDeviceDto,
    RequestDeviceChangeDto,
    ListDeviceRequestsQueryDto,
} from './dto';

@Injectable()
export class DeviceService {
    private readonly logger = new Logger(DeviceService.name);

    constructor(private readonly prisma: PrismaService) { }

    // =========================================================================
    // Device Registration
    // =========================================================================

    /**
     * Register device on first use — auto-bind (no approval needed).
     * If student already has an active device, reject (they must request change).
     */
    async registerDevice(userId: string, dto: RegisterDeviceDto) {
        // Check if student already has an active device
        const existing = await this.prisma.studentDevice.findFirst({
            where: { userId, isActive: true },
        });

        if (existing) {
            throw new ConflictException(
                'You already have a registered device. Use "Request Device Change" to switch to a new device.',
            );
        }

        // Check if fingerprint is already bound to another user
        const duplicate = await this.prisma.studentDevice.findFirst({
            where: {
                fingerprint: dto.fingerprint,
                isActive: true,
                userId: { not: userId },
            },
        });
        if (duplicate) {
            throw new BadRequestException(
                'This device is already registered to another student. Each device can only be bound to one student.',
            );
        }

        const device = await this.prisma.studentDevice.create({
            data: {
                userId,
                fingerprint: dto.fingerprint,
                deviceName: dto.deviceName?.trim() || null,
                platform: dto.platform?.trim() || null,
                isActive: true,
            },
        });

        this.logger.log(
            `Device registered: user ${userId}, fingerprint ${dto.fingerprint.substring(0, 8)}...`,
        );

        return device;
    }

    /**
     * Get user's currently active device.
     */
    async getActiveDevice(userId: string) {
        const device = await this.prisma.studentDevice.findFirst({
            where: { userId, isActive: true },
        });

        return device || null;
    }

    // =========================================================================
    // Device Change Requests (Warden-Approved)
    // =========================================================================

    /**
     * Student requests device re-bind (lost/new phone).
     */
    async requestDeviceChange(userId: string, dto: RequestDeviceChangeDto) {
        // Check for pending request
        const pendingReq = await this.prisma.deviceChangeRequest.findFirst({
            where: { userId, status: 'PENDING' },
        });
        if (pendingReq) {
            throw new ConflictException(
                'You already have a pending device change request. Please wait for warden approval.',
            );
        }

        // Check new fingerprint is not already bound to another user
        const duplicate = await this.prisma.studentDevice.findFirst({
            where: {
                fingerprint: dto.newFingerprint,
                isActive: true,
                userId: { not: userId },
            },
        });
        if (duplicate) {
            throw new BadRequestException(
                'This new device is already registered to another student.',
            );
        }

        const request = await this.prisma.deviceChangeRequest.create({
            data: {
                userId,
                newFingerprint: dto.newFingerprint,
                newDeviceName: dto.newDeviceName?.trim() || null,
                newPlatform: dto.newPlatform?.trim() || null,
                reason: dto.reason?.trim() || null,
                status: DeviceRequestStatus.PENDING,
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, usn: true },
                },
            },
        });

        this.logger.log(`Device change request created: ${request.id} by user ${userId}`);

        return request;
    }

    /**
     * Warden approves device change → deactivate old device, bind new one.
     */
    async approveDeviceChange(requestId: string, reviewerId: string) {
        const request = await this.prisma.deviceChangeRequest.findUnique({
            where: { id: requestId },
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
        });
        if (!request) {
            throw new NotFoundException('Device change request not found');
        }
        if (request.status !== 'PENDING') {
            throw new BadRequestException('Request is no longer pending');
        }

        // Transaction: deactivate old, bind new, update request
        const result = await this.prisma.$transaction(async (tx) => {
            // 1. Deactivate all existing active devices for this user
            await tx.studentDevice.updateMany({
                where: { userId: request.userId, isActive: true },
                data: {
                    isActive: false,
                    deactivatedAt: new Date(),
                    deactivatedById: reviewerId,
                },
            });

            // 2. Register new device
            const newDevice = await tx.studentDevice.create({
                data: {
                    userId: request.userId,
                    fingerprint: request.newFingerprint,
                    deviceName: request.newDeviceName,
                    platform: request.newPlatform,
                    isActive: true,
                },
            });

            // 3. Update request status
            const updated = await tx.deviceChangeRequest.update({
                where: { id: requestId },
                data: {
                    status: DeviceRequestStatus.APPROVED,
                    reviewedById: reviewerId,
                    reviewedAt: new Date(),
                },
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, usn: true } },
                    reviewedBy: { select: { id: true, firstName: true, lastName: true } },
                },
            });

            return { request: updated, newDevice };
        });

        this.logger.log(
            `Device change approved: request ${requestId} by ${reviewerId} for user ${request.userId}`,
        );

        return result;
    }

    /**
     * Warden rejects device change request.
     */
    async rejectDeviceChange(requestId: string, reviewerId: string) {
        const request = await this.prisma.deviceChangeRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            throw new NotFoundException('Device change request not found');
        }
        if (request.status !== 'PENDING') {
            throw new BadRequestException('Request is no longer pending');
        }

        const updated = await this.prisma.deviceChangeRequest.update({
            where: { id: requestId },
            data: {
                status: DeviceRequestStatus.REJECTED,
                reviewedById: reviewerId,
                reviewedAt: new Date(),
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, usn: true } },
                reviewedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        this.logger.log(`Device change rejected: request ${requestId} by ${reviewerId}`);

        return updated;
    }

    /**
     * List pending (or all) device change requests for warden review.
     */
    async getPendingRequests(query: ListDeviceRequestsQueryDto) {
        const { page = 1, limit = 20, status } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.DeviceChangeRequestWhereInput = {};
        if (status) {
            where.status = status as DeviceRequestStatus;
        } else {
            where.status = 'PENDING'; // Default to pending
        }

        const [data, total] = await Promise.all([
            this.prisma.deviceChangeRequest.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            usn: true,
                            studentDevices: {
                                where: { isActive: true },
                                take: 1,
                                select: { deviceName: true, platform: true, fingerprint: true },
                            },
                        },
                    },
                    reviewedBy: {
                        select: { id: true, firstName: true, lastName: true },
                    },
                },
            }),
            this.prisma.deviceChangeRequest.count({ where }),
        ]);

        return {
            data,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
}
