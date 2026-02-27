import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, StudentSignupDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
@UseInterceptors(AuditInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 attempts per minute
  @ApiOperation({ summary: 'Login with email/mobile/USN and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account not active' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(dto, {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post('signup')
  @Throttle({ default: { ttl: 60000, limit: 3 } }) // 3 signups per minute per IP
  @ApiOperation({ summary: 'Student self-registration' })
  @ApiResponse({ status: 201, description: 'Account created, auto-logged in' })
  @ApiResponse({ status: 409, description: 'Duplicate email/mobile/USN' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async signup(@Body() dto: StudentSignupDto, @Req() req: Request) {
    const result = await this.authService.signup(dto, {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const result = await this.authService.refresh(dto, {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout (revoke all refresh tokens)' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    await this.authService.logout(userId, {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getProfile(@CurrentUser('id') userId: string) {
    const profile = await this.authService.getProfile(userId);

    return {
      success: true,
      data: profile,
    };
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown'
    );
  }
}
