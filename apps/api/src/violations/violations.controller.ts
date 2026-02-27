import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ViolationsService } from './violations.service';
import { ListViolationsQueryDto, ResolveViolationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('violations')
@Controller('violations')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class ViolationsController {
  constructor(private readonly violationsService: ViolationsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'List violations with filters' })
  @ApiResponse({ status: 200, description: 'Violations list' })
  async findMany(@Query() query: ListViolationsQueryDto) {
    const result = await this.violationsService.findMany(query);
    return { success: true, ...result };
  }

  @Get('stats')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @ApiOperation({ summary: 'Get violation statistics' })
  @ApiResponse({ status: 200, description: 'Violation stats' })
  async getStats() {
    const stats = await this.violationsService.getStats();
    return { success: true, data: stats };
  }

  @Get('my')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Get my violations (student-only)' })
  @ApiResponse({ status: 200, description: 'My violations' })
  async getMyViolations(
    @CurrentUser() user: any,
    @Query() query: ListViolationsQueryDto,
  ) {
    const result = await this.violationsService.getStudentViolations(
      user.id,
      query,
    );
    return { success: true, ...result };
  }

  @Get('student/:studentId')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT')
  @ApiOperation({ summary: 'Get violations for a specific student' })
  @ApiResponse({ status: 200, description: 'Student violations' })
  async getStudentViolations(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() query: ListViolationsQueryDto,
    @CurrentUser() user: any,
  ) {
    // Students can only view their own violations
    const isStudent = user.roles?.includes('STUDENT');
    if (isStudent && studentId !== user.id) {
      throw new NotFoundException('Violations not found');
    }
    const result = await this.violationsService.getStudentViolations(
      studentId,
      query,
    );
    return { success: true, ...result };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT')
  @ApiOperation({ summary: 'Get violation by ID' })
  @ApiResponse({ status: 200, description: 'Violation details' })
  async findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const violation = await this.violationsService.findById(id);
    // Students can only view their own violations
    const isStudent = user.roles?.includes('STUDENT');
    if (isStudent && violation.studentId !== user.id) {
      throw new NotFoundException('Violation not found');
    }
    return { success: true, data: violation };
  }

  @Patch(':id/resolve')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('VIOLATION_RESOLVE', 'violations')
  @ApiOperation({ summary: 'Resolve a violation' })
  @ApiResponse({ status: 200, description: 'Violation resolved' })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveViolationDto,
    @CurrentUser() user: any,
  ) {
    const violation = await this.violationsService.resolve(id, dto, user.id);
    return { success: true, data: violation };
  }
}
