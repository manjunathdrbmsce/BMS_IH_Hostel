import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockPrismaService = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwtService = {
  signAsync: jest.fn(),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test-secret-key-that-is-long-enough',
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
    };
    return config[key] || defaultValue;
  }),
};

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
};

// ---------------------------------------------------------------------------
// Test User Fixture
// ---------------------------------------------------------------------------
const testPasswordHash = bcrypt.hashSync('Admin@123456', 10);

const testUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@bms.local',
  mobile: null,
  usn: null,
  passwordHash: testPasswordHash,
  firstName: 'Super',
  lastName: 'Admin',
  status: UserStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  userRoles: [
    {
      id: 'ur-1',
      role: {
        id: 'role-1',
        name: 'SUPER_ADMIN',
        displayName: 'Super Admin',
        rolePermissions: [
          {
            permission: { name: 'USER_CREATE' },
          },
          {
            permission: { name: 'USER_READ' },
          },
        ],
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------
  describe('login', () => {
    const loginDto = { identifier: 'admin@bms.local', password: 'Admin@123456' };
    const meta = { ipAddress: '127.0.0.1', userAgent: 'test-agent' };

    it('should return tokens and user profile on valid credentials', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(testUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await authService.login(loginDto, meta);

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
      expect(result.user.email).toBe('admin@bms.local');
      expect(result.user.roles).toContain('SUPER_ADMIN');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN' }),
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(authService.login(loginDto, meta)).rejects.toThrow(UnauthorizedException);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED' }),
      );
    });

    it('should throw ForbiddenException when account is not active', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...testUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(authService.login(loginDto, meta)).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(testUser);

      await expect(
        authService.login({ identifier: 'admin@bms.local', password: 'WrongPassword1!' }, meta),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------
  describe('logout', () => {
    it('should revoke all refresh tokens for the user', async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await authService.logout('user-id-1', { ipAddress: '127.0.0.1' });

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGOUT', userId: 'user-id-1' }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Get Profile
  // -------------------------------------------------------------------------
  describe('getProfile', () => {
    it('should return the user profile with roles and permissions', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(testUser);

      const profile = await authService.getProfile(testUser.id);

      expect(profile.email).toBe('admin@bms.local');
      expect(profile.roles).toContain('SUPER_ADMIN');
      expect(profile.permissions).toContain('USER_CREATE');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // Validate User
  // -------------------------------------------------------------------------
  describe('validateUserById', () => {
    it('should return user validation data for active user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(testUser);

      const result = await authService.validateUserById(testUser.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(testUser.id);
      expect(result!.roles).toContain('SUPER_ADMIN');
    });

    it('should return null for inactive user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...testUser,
        status: UserStatus.INACTIVE,
      });

      const result = await authService.validateUserById(testUser.id);
      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await authService.validateUserById('nonexistent');
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Hash Password
  // -------------------------------------------------------------------------
  describe('hashPassword', () => {
    it('should return a bcrypt hash', async () => {
      const hash = await authService.hashPassword('TestPassword@1');

      expect(hash).toBeDefined();
      expect(hash).not.toBe('TestPassword@1');
      expect(await bcrypt.compare('TestPassword@1', hash)).toBe(true);
    });
  });
});
