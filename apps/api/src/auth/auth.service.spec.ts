import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockTransaction = jest.fn();

const mockPrismaService = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: mockTransaction,
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
      expect(result.user.roles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'SUPER_ADMIN', displayName: 'Super Admin' }),
        ]),
      );
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
      expect(profile.roles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'SUPER_ADMIN', displayName: 'Super Admin' }),
        ]),
      );
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

  // -------------------------------------------------------------------------
  // Student Signup
  // -------------------------------------------------------------------------
  describe('signup', () => {
    const signupDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@bms.edu',
      mobile: '9876543210',
      password: 'Student@123',
    };
    const meta = { ipAddress: '127.0.0.1', userAgent: 'test-agent' };

    const mockStudentRole = { id: 'role-student', name: 'STUDENT', displayName: 'Student' };
    const mockCreatedUser = {
      id: '00000000-0000-0000-0000-000000000099',
      email: 'john.doe@bms.edu',
      mobile: '9876543210',
      usn: null,
      firstName: 'John',
      lastName: 'Doe',
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a student account and return tokens', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null); // no duplicate
      mockPrismaService.role.findUnique.mockResolvedValue(mockStudentRole);
      mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          user: { create: jest.fn().mockResolvedValue(mockCreatedUser) },
          userRole: { create: jest.fn().mockResolvedValue({}) },
        });
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('student-access-token')
        .mockResolvedValueOnce('student-refresh-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await authService.signup(signupDto, meta);

      expect(result.accessToken).toBe('student-access-token');
      expect(result.refreshToken).toBe('student-refresh-token');
      expect(result.user.email).toBe('john.doe@bms.edu');
      expect(result.user.firstName).toBe('John');
      expect(result.user.roles).toEqual([{ name: 'STUDENT', displayName: 'Student' }]);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STUDENT_SIGNUP' }),
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockCreatedUser,
        email: 'john.doe@bms.edu',
      });

      await expect(authService.signup(signupDto, meta)).rejects.toThrow(ConflictException);
      await expect(authService.signup(signupDto, meta)).rejects.toThrow(
        /email already exists/i,
      );
    });

    it('should throw ConflictException when mobile already exists', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockCreatedUser,
        email: 'other@bms.edu',
        mobile: '9876543210',
      });

      await expect(authService.signup(signupDto, meta)).rejects.toThrow(ConflictException);
    });

    it('should throw Error when STUDENT role is not configured', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(authService.signup(signupDto, meta)).rejects.toThrow(
        'STUDENT role not configured in the system',
      );
    });

    it('should accept optional USN field', async () => {
      const dtoWithUsn = { ...signupDto, usn: '1BM22CS001' };
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.role.findUnique.mockResolvedValue(mockStudentRole);
      mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          user: { create: jest.fn().mockResolvedValue({ ...mockCreatedUser, usn: '1BM22CS001' }) },
          userRole: { create: jest.fn().mockResolvedValue({}) },
        });
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-tok')
        .mockResolvedValueOnce('refresh-tok');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await authService.signup(dtoWithUsn, meta);
      expect(result.accessToken).toBe('access-tok');
      expect(result.user.roles[0].name).toBe('STUDENT');
    });
  });
});
