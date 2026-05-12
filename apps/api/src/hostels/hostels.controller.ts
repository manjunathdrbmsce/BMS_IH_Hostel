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
import { HostelsService } from './hostels.service';
import { CreateHostelDto, UpdateHostelDto, ListHostelsQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessScopeService } from '../auth/access-scope.service';

@ApiTags('hostels')
@Controller('hostels')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class HostelsController {
  constructor(
    private readonly hostelsService: HostelsService,
    private readonly accessScopeService: AccessScopeService,
  ) {}

  @Post()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  @AuditAction('HOSTEL_CREATE', 'hostels')
  @ApiOperation({ summary: 'Create a new hostel' })
  @ApiResponse({ status: 201, description: 'Hostel created' })
  @ApiResponse({ status: 409, description: 'Duplicate hostel code' })
  async create(@Body() dto: CreateHostelDto) {
    const hostel = await this.hostelsService.create(dto);
    return { success: true, data: hostel };
  }

  @Get()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT')
  @ApiOperation({ summary: 'List hostels with pagination' })
  @ApiResponse({ status: 200, description: 'Hostels list' })
  async findAll(@Query() query: ListHostelsQueryDto, @CurrentUser() user: any) {
    const scope = await this.accessScopeService.getAccessibleHostelIds(user);
    const result = await this.hostelsService.findMany(query, scope);
    return { success: true, ...result };
  }

  @Get('stats')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'Get hostel statistics' })
  @ApiResponse({ status: 200, description: 'Hostel stats' })
  async getStats(@CurrentUser() user: any) {
    const scope = await this.accessScopeService.getAccessibleHostelIds(user);
    const stats = await this.hostelsService.getStats(scope);
    return { success: true, data: stats };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'Get hostel by ID' })
  @ApiResponse({ status: 200, description: 'Hostel details' })
  @ApiResponse({ status: 404, description: 'Hostel not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const scope = await this.accessScopeService.getAccessibleHostelIds(user);
    const hostel = await this.hostelsService.findById(id, scope);
    return { success: true, data: hostel };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  @AuditAction('HOSTEL_UPDATE', 'hostels')
  @ApiOperation({ summary: 'Update hostel' })
  @ApiResponse({ status: 200, description: 'Hostel updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHostelDto,
  ) {
    const hostel = await this.hostelsService.update(id, dto);
    return { success: true, data: hostel };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @AuditAction('HOSTEL_DELETE', 'hostels')
  @ApiOperation({ summary: 'Deactivate hostel' })
  @ApiResponse({ status: 200, description: 'Hostel deactivated' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.hostelsService.delete(id);
    return { success: true, ...result };
  }
}
