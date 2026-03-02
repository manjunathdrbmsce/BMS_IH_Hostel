import { Test, TestingModule } from '@nestjs/testing';
import { DeviceService } from './device.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

const mockPrisma: any = {
    studentDevice: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    },
    deviceChangeRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
};

describe('DeviceService', () => {
    let service: DeviceService;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();
        service = module.get<DeviceService>(DeviceService);
    });

    // Test 7: Device re-bind: request → approve → verify new device works
    describe('registerDevice', () => {
        it('should auto-bind on first use', async () => {
            mockPrisma.studentDevice.findFirst.mockResolvedValue(null); // no existing device
            mockPrisma.studentDevice.create.mockResolvedValue({
                id: 'dev-1', fingerprint: 'fp-123', isActive: true,
            });

            const result = await service.registerDevice('student-1', {
                fingerprint: 'fp-123',
                deviceName: 'iPhone 14',
                platform: 'iOS',
            });

            expect(result.id).toBe('dev-1');
            expect(mockPrisma.studentDevice.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ userId: 'student-1', fingerprint: 'fp-123' }),
                }),
            );
        });

        it('should reject if device already registered', async () => {
            mockPrisma.studentDevice.findFirst.mockResolvedValue({
                id: 'dev-1', fingerprint: 'fp-existing', isActive: true,
            });

            await expect(service.registerDevice('student-1', {
                fingerprint: 'fp-new',
                deviceName: 'Samsung Galaxy',
                platform: 'Android',
            })).rejects.toThrow(ConflictException);
        });
    });

    describe('requestDeviceChange + approveDeviceChange', () => {
        it('should allow student to request device change and warden to approve', async () => {
            // Step 1: Request
            // requestDeviceChange calls: 1) deviceChangeRequest.findFirst (pending check), 2) studentDevice.findFirst (fingerprint duplicate check)
            mockPrisma.studentDevice.findFirst.mockResolvedValue(null); // no fingerprint duplicate
            mockPrisma.deviceChangeRequest.findFirst.mockResolvedValue(null); // no pending request
            mockPrisma.deviceChangeRequest.create.mockResolvedValue({
                id: 'req-1', userId: 'student-1', status: 'PENDING',
                newFingerprint: 'fp-new',
            });

            const request = await service.requestDeviceChange('student-1', {
                newFingerprint: 'fp-new',
                newDeviceName: 'iPhone 15',
                newPlatform: 'iOS',
                reason: 'Lost old phone',
            });

            expect(request.status).toBe('PENDING');

            // Step 2: Approve
            mockPrisma.deviceChangeRequest.findUnique.mockResolvedValue({
                id: 'req-1', userId: 'student-1', status: 'PENDING',
                newFingerprint: 'fp-new', newDeviceName: 'iPhone 15', newPlatform: 'iOS',
            });
            mockPrisma.studentDevice.updateMany.mockResolvedValue({ count: 1 });
            mockPrisma.studentDevice.create.mockResolvedValue({
                id: 'dev-2', fingerprint: 'fp-new', isActive: true,
            });
            mockPrisma.deviceChangeRequest.update.mockResolvedValue({
                id: 'req-1', status: 'APPROVED',
            });

            const approved = await service.approveDeviceChange('req-1', 'warden-1');
            expect(approved.request.status).toBe('APPROVED');
            expect(approved.newDevice.fingerprint).toBe('fp-new');
        });
    });
});
