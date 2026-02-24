import {
  Controller,
  Get,
  Post,
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
import { AllotmentsService } from './allotments.service';
import {
  AssignBedDto,
  TransferBedDto,
  VacateBedDto,
  ListAssignmentsQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';

@ApiTags('allotments')
@Controller('allotments')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class AllotmentsController {
  constructor(private readonly allotmentsService: AllotmentsService) {}

  @Post('assign')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('BED_ASSIGN', 'allotments')
  @ApiOperation({ summary: 'Assign a student to a bed' })
  @ApiResponse({ status: 201, description: 'Bed assigned' })
  @ApiResponse({ status: 409, description: 'Bed not vacant or student already assigned' })
  async assign(
    @Body() dto: AssignBedDto,
    @CurrentUser('id') userId: string,
  ) {
    const assignment = await this.allotmentsService.assign(dto, userId);
    return { success: true, data: assignment };
  }

  @Post('transfer')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('BED_TRANSFER', 'allotments')
  @ApiOperation({ summary: 'Transfer student to a different bed' })
  @ApiResponse({ status: 200, description: 'Student transferred' })
  async transfer(
    @Body() dto: TransferBedDto,
    @CurrentUser('id') userId: string,
  ) {
    const assignment = await this.allotmentsService.transfer(dto, userId);
    return { success: true, data: assignment };
  }

  @Post('vacate')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('BED_VACATE', 'allotments')
  @ApiOperation({ summary: 'Vacate student from current bed' })
  @ApiResponse({ status: 200, description: 'Bed vacated' })
  async vacate(
    @Body() dto: VacateBedDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.allotmentsService.vacate(dto, userId);
    return { success: true, ...result };
  }

  @Get()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'List bed assignments' })
  @ApiResponse({ status: 200, description: 'Assignments list' })
  async findAll(@Query() query: ListAssignmentsQueryDto) {
    const result = await this.allotmentsService.findMany(query);
    return { success: true, ...result };
  }

  @Get('stats')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @ApiOperation({ summary: 'Get allotment statistics' })
  @ApiResponse({ status: 200, description: 'Allotment stats' })
  async getStats() {
    const stats = await this.allotmentsService.getStats();
    return { success: true, data: stats };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'Get assignment by ID' })
  @ApiResponse({ status: 200, description: 'Assignment details' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const assignment = await this.allotmentsService.findById(id);
    return { success: true, data: assignment };
  }
}
