import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RegistrationService } from './registration.service';
import {
  CreateRegistrationDto,
  SaveDraftDto,
  SubmitRegistrationDto,
  ReviewRegistrationDto,
  AllotRegistrationDto,
  RecordFeeDto,
  ListRegistrationsQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';

@ApiTags('registration')
@Controller('registration')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) { }

  // =========================================================================
  // Student Endpoints
  // =========================================================================

  @Post()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'STUDENT')
  @AuditAction('REGISTRATION_CREATE', 'registration')
  @ApiOperation({ summary: 'Start a new hostel registration (draft)' })
  @ApiResponse({ status: 201, description: 'Registration draft created' })
  @ApiResponse({ status: 409, description: 'Active registration already exists' })
  async startRegistration(
    @Body() dto: CreateRegistrationDto,
    @CurrentUser('id') userId: string,
  ) {
    const registration = await this.registrationService.startRegistration(userId, dto);
    return { success: true, data: registration };
  }

  @Patch(':id/draft')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'STUDENT')
  @AuditAction('REGISTRATION_SAVE_DRAFT', 'registration')
  @ApiOperation({ summary: 'Save draft progress for a registration' })
  @ApiResponse({ status: 200, description: 'Draft saved' })
  @ApiResponse({ status: 403, description: 'Not your registration' })
  async saveDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveDraftDto,
    @CurrentUser('id') userId: string,
  ) {
    const registration = await this.registrationService.saveDraft(id, userId, dto);
    return { success: true, data: registration };
  }

  @Post(':id/submit')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'STUDENT')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @AuditAction('REGISTRATION_SUBMIT', 'registration')
  @ApiOperation({ summary: 'Submit a completed registration' })
  @ApiResponse({ status: 200, description: 'Registration submitted' })
  @ApiResponse({ status: 400, description: 'Not all declarations accepted' })
  async submitRegistration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitRegistrationDto,
    @CurrentUser('id') userId: string,
  ) {
    const registration = await this.registrationService.submitRegistration(id, userId, dto);
    return { success: true, data: registration };
  }

  @Post(':id/cancel')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'STUDENT')
  @AuditAction('REGISTRATION_CANCEL', 'registration')
  @ApiOperation({ summary: 'Cancel a registration' })
  @ApiResponse({ status: 200, description: 'Registration cancelled' })
  async cancelRegistration(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    const registration = await this.registrationService.cancelRegistration(id, userId);
    return { success: true, data: registration };
  }

  @Get('my')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Get my registrations' })
  @ApiResponse({ status: 200, description: 'Student registrations' })
  async getMyRegistrations(@CurrentUser('id') userId: string) {
    const registrations = await this.registrationService.findMyRegistrations(userId);
    return { success: true, data: registrations };
  }

  // =========================================================================
  // Admin Endpoints
  // =========================================================================

  @Get()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'ACCOUNTS_OFFICER')
  @ApiOperation({ summary: 'List all registrations with filters' })
  @ApiResponse({ status: 200, description: 'Registrations list' })
  async findAll(@Query() query: ListRegistrationsQueryDto) {
    const result = await this.registrationService.findMany(query);
    return { success: true, ...result };
  }

  @Get('stats')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'Get registration statistics' })
  @ApiResponse({ status: 200, description: 'Registration stats' })
  async getStats(@Query('academicYear') academicYear?: string) {
    const stats = await this.registrationService.getStats(academicYear);
    return { success: true, data: stats };
  }

  @Get('by-application/:applicationNo')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'Get registration by application number' })
  @ApiResponse({ status: 200, description: 'Registration details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findByApplicationNo(@Param('applicationNo') applicationNo: string) {
    const registration = await this.registrationService.findByApplicationNo(applicationNo);
    return { success: true, data: registration };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT', 'ACCOUNTS_OFFICER')
  @ApiOperation({ summary: 'Get registration by ID' })
  @ApiResponse({ status: 200, description: 'Registration details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const registration = await this.registrationService.findById(id);
    return { success: true, data: registration };
  }

  @Post(':id/review')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @AuditAction('REGISTRATION_REVIEW', 'registration')
  @ApiOperation({ summary: 'Review a submitted registration (approve/reject)' })
  @ApiResponse({ status: 200, description: 'Registration reviewed' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async reviewRegistration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewRegistrationDto,
    @CurrentUser('id') userId: string,
  ) {
    const registration = await this.registrationService.reviewRegistration(id, userId, dto);
    return { success: true, data: registration };
  }

  @Post(':id/allot')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('REGISTRATION_ALLOT', 'registration')
  @ApiOperation({ summary: 'Allot room/bed to approved registration' })
  @ApiResponse({ status: 200, description: 'Registration allotted' })
  @ApiResponse({ status: 400, description: 'Not in APPROVED status' })
  @ApiResponse({ status: 409, description: 'Bed not vacant' })
  async allotRegistration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AllotRegistrationDto,
    @CurrentUser('id') userId: string,
  ) {
    const registration = await this.registrationService.allotRegistration(id, userId, dto);
    return { success: true, data: registration };
  }

  @Post(':id/fee')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'ACCOUNTS_OFFICER')
  @AuditAction('REGISTRATION_FEE_RECORD', 'registration')
  @ApiOperation({ summary: 'Record a fee payment for a registration' })
  @ApiResponse({ status: 201, description: 'Fee recorded' })
  async recordFee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordFeeDto,
    @CurrentUser('id') userId: string,
  ) {
    // Ensure registrationId in DTO matches route param
    dto.registrationId = id;
    const fee = await this.registrationService.recordFee(userId, dto);
    return { success: true, data: fee };
  }
}
