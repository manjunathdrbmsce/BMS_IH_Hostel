import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StudentsService } from './students.service';
import {
  CreateStudentProfileDto,
  UpdateStudentProfileDto,
  ListStudentsQueryDto,
  CreateGuardianLinkDto,
  UpdateGuardianLinkDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';

@ApiTags('students')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // -----------------------------------------------------------------------
  // Student Profiles
  // -----------------------------------------------------------------------

  @Post('profiles')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('STUDENT_PROFILE_CREATE', 'students')
  @ApiOperation({ summary: 'Create student profile' })
  @ApiResponse({ status: 201, description: 'Student profile created' })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  async createProfile(@Body() dto: CreateStudentProfileDto) {
    const profile = await this.studentsService.createProfile(dto);
    return { success: true, data: profile };
  }

  @Get('profiles')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'List student profiles with pagination' })
  @ApiResponse({ status: 200, description: 'Students list' })
  async findAll(@Query() query: ListStudentsQueryDto) {
    const result = await this.studentsService.findMany(query);
    return { success: true, ...result };
  }

  @Get('profiles/:userId')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT')
  @ApiOperation({ summary: 'Get student profile by user ID' })
  @ApiResponse({ status: 200, description: 'Student profile details' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async findOne(@Param('userId', ParseUUIDPipe) userId: string) {
    const profile = await this.studentsService.findProfileByUserId(userId);
    return { success: true, data: profile };
  }

  @Patch('profiles/:userId')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('STUDENT_PROFILE_UPDATE', 'students')
  @ApiOperation({ summary: 'Update student profile' })
  @ApiResponse({ status: 200, description: 'Student profile updated' })
  async updateProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateStudentProfileDto,
  ) {
    const profile = await this.studentsService.updateProfile(userId, dto);
    return { success: true, data: profile };
  }

  // -----------------------------------------------------------------------
  // Guardian Links
  // -----------------------------------------------------------------------

  @Post('guardians')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('GUARDIAN_LINK_CREATE', 'students')
  @ApiOperation({ summary: 'Link guardian to student' })
  @ApiResponse({ status: 201, description: 'Guardian linked' })
  @ApiResponse({ status: 409, description: 'Link already exists' })
  async createGuardianLink(@Body() dto: CreateGuardianLinkDto) {
    const link = await this.studentsService.createGuardianLink(dto);
    return { success: true, data: link };
  }

  @Get('guardians/:studentId')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT', 'PARENT')
  @ApiOperation({ summary: 'Get guardians for a student' })
  @ApiResponse({ status: 200, description: 'Guardian list' })
  async getGuardians(@Param('studentId', ParseUUIDPipe) studentId: string) {
    const guardians = await this.studentsService.getGuardiansForStudent(studentId);
    return { success: true, data: guardians };
  }

  @Patch('guardians/:id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('GUARDIAN_LINK_UPDATE', 'students')
  @ApiOperation({ summary: 'Update guardian link' })
  @ApiResponse({ status: 200, description: 'Guardian link updated' })
  async updateGuardianLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGuardianLinkDto,
  ) {
    const link = await this.studentsService.updateGuardianLink(id, dto);
    return { success: true, data: link };
  }

  @Delete('guardians/:id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  @AuditAction('GUARDIAN_LINK_DELETE', 'students')
  @ApiOperation({ summary: 'Remove guardian link' })
  @ApiResponse({ status: 200, description: 'Guardian link removed' })
  async removeGuardianLink(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.studentsService.removeGuardianLink(id);
    return { success: true, ...result };
  }
}
