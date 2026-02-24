import {
  Injectable,
  UnauthorizedException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto, RefreshTokenDto } from './dto';
import { UserStatus } from '@prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  type: 'access' | 'refresh';
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Authenticate user by email/mobile/USN + password.
   * Returns JWT access + refresh tokens.
   */
  async login(
    dto: LoginDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const { identifier, password } = dto;

    // Find user by email, mobile, or USN
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { mobile: identifier },
          { usn: identifier },
        ],
      },
      include: {
        userRoles: {
          where: { revokedAt: null },
          include: { role: true },
        },
      },
    });

    if (!user) {
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        resource: 'auth',
        details: { identifier, reason: 'user_not_found' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account status
    if (user.status !== UserStatus.ACTIVE) {
      await this.auditService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'auth',
        details: { reason: 'account_not_active', status: user.status },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}`);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.auditService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'auth',
        details: { reason: 'invalid_password' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.generateTokenPair(user.id, user.email, roles);

    // Store refresh token hash
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, this.SALT_ROUNDS);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        deviceInfo: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
        expiresAt: this.getRefreshTokenExpiry(),
      },
    });

    // Audit
    await this.auditService.log({
      userId: user.id,
      action: 'LOGIN',
      resource: 'auth',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        mobile: user.mobile,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        status: user.status,
      },
    };
  }

  /**
   * Refresh the access token using a valid refresh token.
   * Implements refresh token rotation for security.
   */
  async refresh(
    dto: RefreshTokenDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const { refreshToken } = dto;

    // Decode the refresh token to get the user id
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Find all active refresh tokens for this user
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    // Find matching token by comparing hashes
    let matchedTokenId: string | null = null;
    for (const storedToken of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, storedToken.tokenHash);
      if (isMatch) {
        matchedTokenId = storedToken.id;
        break;
      }
    }

    if (!matchedTokenId) {
      // Possible token reuse attack - revoke all tokens for this user
      this.logger.warn(`Refresh token reuse detected for user ${payload.sub}`);
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditService.log({
        userId: payload.sub,
        action: 'TOKEN_REFRESH',
        resource: 'auth',
        details: { reason: 'token_reuse_detected', allTokensRevoked: true },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Revoke the used refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: matchedTokenId },
      data: { revokedAt: new Date() },
    });

    // Fetch fresh roles
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          where: { revokedAt: null },
          include: { role: true },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.generateTokenPair(user.id, user.email, roles);

    // Store new refresh token
    const newRefreshTokenHash = await bcrypt.hash(tokens.refreshToken, this.SALT_ROUNDS);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newRefreshTokenHash,
        deviceInfo: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
        expiresAt: this.getRefreshTokenExpiry(),
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'TOKEN_REFRESH',
      resource: 'auth',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Logout - revoke all refresh tokens for the user.
   */
  async logout(
    userId: string,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.log({
      userId,
      action: 'LOGOUT',
      resource: 'auth',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  /**
   * Get current user profile.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { revokedAt: null },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.name),
        ),
      ),
    ];

    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
      status: user.status,
    };
  }

  /**
   * Validate a user by ID (used by JWT strategy).
   */
  async validateUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { revokedAt: null },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      roles: user.userRoles.map((ur) => ur.role.name),
      permissions: [
        ...new Set(
          user.userRoles.flatMap((ur) =>
            ur.role.rolePermissions.map((rp) => rp.permission.name),
          ),
        ),
      ],
    };
  }

  /**
   * Hash a password. Exported for use in seed scripts and user creation.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async generateTokenPair(
    userId: string,
    email: string,
    roles: string[],
  ): Promise<TokenPair> {
    const jti = uuidv4();

    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      roles,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: userId,
      email,
      roles,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m'),
        jwtid: jti,
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d'),
        jwtid: `${jti}-refresh`,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private getRefreshTokenExpiry(): Date {
    const expiry = this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d');
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }
}
