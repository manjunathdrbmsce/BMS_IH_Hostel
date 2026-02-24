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
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto, UpdateBuildingDto, ListBuildingsQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';

@ApiTags('buildings')
@Controller('buildings')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  @AuditAction('BUILDING_CREATE', 'buildings')
  @ApiOperation({ summary: 'Create a new building' })
  @ApiResponse({ status: 201, description: 'Building created' })
  @ApiResponse({ status: 409, description: 'Duplicate building code' })
  async create(@Body() dto: CreateBuildingDto) {
    const building = await this.buildingsService.create(dto);
    return { success: true, data: building };
  }

  @Get()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'List buildings with pagination' })
  @ApiResponse({ status: 200, description: 'Buildings list' })
  async findAll(@Query() query: ListBuildingsQueryDto) {
    const result = await this.buildingsService.findMany(query);
    return { success: true, ...result };
  }

  @Get('stats')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @ApiOperation({ summary: 'Get building statistics' })
  @ApiResponse({ status: 200, description: 'Building stats' })
  async getStats() {
    const stats = await this.buildingsService.getStats();
    return { success: true, data: stats };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'Get building by ID' })
  @ApiResponse({ status: 200, description: 'Building details' })
  @ApiResponse({ status: 404, description: 'Building not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const building = await this.buildingsService.findById(id);
    return { success: true, data: building };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  @AuditAction('BUILDING_UPDATE', 'buildings')
  @ApiOperation({ summary: 'Update building' })
  @ApiResponse({ status: 200, description: 'Building updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBuildingDto,
  ) {
    const building = await this.buildingsService.update(id, dto);
    return { success: true, data: building };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @AuditAction('BUILDING_DELETE', 'buildings')
  @ApiOperation({ summary: 'Deactivate building' })
  @ApiResponse({ status: 200, description: 'Building deactivated' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.buildingsService.delete(id);
    return { success: true, ...result };
  }
}
