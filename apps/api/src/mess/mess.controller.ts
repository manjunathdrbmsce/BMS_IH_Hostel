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
import { MessService } from './mess.service';
import { CreateMenuDto, UpdateMenuDto, QueryMenuDto, QueryStatsDto, QueryReportDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('mess')
@Controller('mess')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class MessController {
  constructor(private readonly messService: MessService) {}

  // =========================================================================
  // Menu CRUD
  // =========================================================================

  @Post('menus')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER')
  @AuditAction('MENU_CREATE', 'mess')
  @ApiOperation({ summary: 'Create a new weekly menu' })
  @ApiResponse({ status: 201, description: 'Menu created' })
  async createMenu(@Body() dto: CreateMenuDto, @CurrentUser() user: any) {
    const menu = await this.messService.createMenu(dto, user.id);
    return { success: true, data: menu };
  }

  @Get('menus')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'WARDEN')
  @ApiOperation({ summary: 'List menus with filters' })
  @ApiResponse({ status: 200, description: 'Menus list' })
  async findMenus(@Query() query: QueryMenuDto) {
    const result = await this.messService.findMenus(query);
    return { success: true, ...result };
  }

  @Get('menus/:id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'WARDEN')
  @ApiOperation({ summary: 'Get menu by ID with all items' })
  @ApiResponse({ status: 200, description: 'Menu details' })
  async findMenu(@Param('id', ParseUUIDPipe) id: string) {
    const menu = await this.messService.findMenuById(id);
    return { success: true, data: menu };
  }

  @Patch('menus/:id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER')
  @AuditAction('MENU_UPDATE', 'mess')
  @ApiOperation({ summary: 'Update menu and/or items' })
  @ApiResponse({ status: 200, description: 'Menu updated' })
  async updateMenu(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuDto,
  ) {
    const menu = await this.messService.updateMenu(id, dto);
    return { success: true, data: menu };
  }

  @Post('menus/:id/activate')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER')
  @AuditAction('MENU_ACTIVATE', 'mess')
  @ApiOperation({ summary: 'Activate menu (deactivates previous active menu)' })
  @ApiResponse({ status: 200, description: 'Menu activated' })
  async activateMenu(@Param('id', ParseUUIDPipe) id: string) {
    const menu = await this.messService.activateMenu(id);
    return { success: true, data: menu };
  }

  @Post('menus/:id/archive')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER')
  @AuditAction('MENU_ARCHIVE', 'mess')
  @ApiOperation({ summary: 'Archive menu' })
  @ApiResponse({ status: 200, description: 'Menu archived' })
  async archiveMenu(@Param('id', ParseUUIDPipe) id: string) {
    const menu = await this.messService.archiveMenu(id);
    return { success: true, data: menu };
  }

  // =========================================================================
  // Today & Week Menu (any authenticated user)
  // =========================================================================

  @Get('today')
  @Roles(
    'SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN',
    'MESS_MANAGER', 'MESS_STAFF', 'STUDENT', 'PARENT',
  )
  @ApiOperation({ summary: "Get today's menu for a hostel" })
  @ApiResponse({ status: 200, description: "Today's menu" })
  async getTodayMenu(
    @Query('hostelId') hostelId: string,
    @Query('messType') messType?: string,
  ) {
    const data = await this.messService.getTodayMenu(hostelId, messType);
    return { success: true, data };
  }

  @Get('week')
  @Roles(
    'SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN',
    'MESS_MANAGER', 'MESS_STAFF', 'STUDENT', 'PARENT',
  )
  @ApiOperation({ summary: 'Get full week menu for a hostel' })
  @ApiResponse({ status: 200, description: 'Week menu' })
  async getWeekMenu(
    @Query('hostelId') hostelId: string,
    @Query('messType') messType?: string,
  ) {
    const data = await this.messService.getWeekMenu(hostelId, messType);
    return { success: true, data };
  }

  // =========================================================================
  // Stats & Reports
  // =========================================================================

  @Get('stats')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'WARDEN')
  @ApiOperation({ summary: 'Aggregate mess statistics' })
  @ApiResponse({ status: 200, description: 'Mess stats' })
  async getStats(@Query() query: QueryStatsDto) {
    const data = await this.messService.getStats(query);
    return { success: true, data };
  }

  @Get('reports/consumption')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER')
  @ApiOperation({ summary: 'Per-student consumption report' })
  @ApiResponse({ status: 200, description: 'Consumption report' })
  async getConsumptionReport(@Query() query: QueryReportDto) {
    const data = await this.messService.getConsumptionReport(query);
    return { success: true, data };
  }

  @Get('reports/feedback')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER')
  @ApiOperation({ summary: 'Feedback analytics report' })
  @ApiResponse({ status: 200, description: 'Feedback report' })
  async getFeedbackReport(@Query() query: QueryReportDto) {
    const data = await this.messService.getFeedbackReport(query);
    return { success: true, data };
  }
}
