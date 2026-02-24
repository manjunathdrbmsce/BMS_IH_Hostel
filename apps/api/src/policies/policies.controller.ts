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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto, UpdatePolicyDto, ListPoliciesQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';

@ApiTags('policies')
@Controller('policies')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  @AuditAction('POLICY_CREATE', 'policies')
  @ApiOperation({ summary: 'Create a new policy version for a building' })
  @ApiResponse({ status: 201, description: 'Policy created' })
  async create(
    @Body() dto: CreatePolicyDto,
    @CurrentUser('id') userId: string,
  ) {
    const policy = await this.policiesService.create(dto, userId);
    return { success: true, data: policy };
  }

  @Get()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'List policies with pagination' })
  @ApiResponse({ status: 200, description: 'Policies list' })
  async findAll(@Query() query: ListPoliciesQueryDto) {
    const result = await this.policiesService.findMany(query);
    return { success: true, ...result };
  }

  @Get('building/:buildingId/active')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'Get active policy for a building' })
  @ApiResponse({ status: 200, description: 'Active policy' })
  async getActiveForBuilding(@Param('buildingId', ParseUUIDPipe) buildingId: string) {
    const policy = await this.policiesService.getActiveForBuilding(buildingId);
    return { success: true, data: policy };
  }

  @Get('building/:buildingId/history')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @ApiOperation({ summary: 'Get policy version history for a building' })
  @ApiResponse({ status: 200, description: 'Version history' })
  async getVersionHistory(@Param('buildingId', ParseUUIDPipe) buildingId: string) {
    const history = await this.policiesService.getVersionHistory(buildingId);
    return { success: true, data: history };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'Get policy by ID' })
  @ApiResponse({ status: 200, description: 'Policy details' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const policy = await this.policiesService.findById(id);
    return { success: true, data: policy };
  }

  @Patch('building/:buildingId/revise')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  @AuditAction('POLICY_REVISE', 'policies')
  @ApiOperation({ summary: 'Revise active policy (creates new version)' })
  @ApiResponse({ status: 200, description: 'New policy version created' })
  async revise(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Body() dto: UpdatePolicyDto,
    @CurrentUser('id') userId: string,
  ) {
    const policy = await this.policiesService.revise(buildingId, dto, userId);
    return { success: true, data: policy };
  }
}
