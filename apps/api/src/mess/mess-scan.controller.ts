import {
  Controller,
  Get,
  Post,
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
import { MessScanService } from './mess-scan.service';
import { ScanMealDto, ScanGuestDto, QueryScansDto, CreateFeedbackDto } from './dto';
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
export class MessScanController {
  constructor(private readonly messScanService: MessScanService) {}

  // =========================================================================
  // Meal Scanning
  // =========================================================================

  @Post('scan')
  @Roles('SUPER_ADMIN', 'MESS_MANAGER', 'MESS_STAFF')
  @AuditAction('MEAL_SCAN', 'mess')
  @ApiOperation({ summary: 'Scan student meal' })
  @ApiResponse({ status: 201, description: 'Meal scanned' })
  async scanMeal(@Body() dto: ScanMealDto, @CurrentUser() user: any) {
    const scan = await this.messScanService.scanMeal(dto, user.id);
    return { success: true, data: scan };
  }

  @Post('scan/guest')
  @Roles('SUPER_ADMIN', 'MESS_MANAGER')
  @AuditAction('GUEST_MEAL_SCAN', 'mess')
  @ApiOperation({ summary: 'Log guest meal' })
  @ApiResponse({ status: 201, description: 'Guest meal logged' })
  async scanGuestMeal(@Body() dto: ScanGuestDto, @CurrentUser() user: any) {
    const scan = await this.messScanService.scanGuestMeal(dto, user.id);
    return { success: true, data: scan };
  }

  @Get('scans')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'WARDEN')
  @ApiOperation({ summary: 'List meal scans with filters' })
  @ApiResponse({ status: 200, description: 'Scan list' })
  async findScans(@Query() query: QueryScansDto) {
    const result = await this.messScanService.findScans(query);
    return { success: true, ...result };
  }

  @Get('scans/live')
  @Roles('SUPER_ADMIN', 'MESS_MANAGER', 'MESS_STAFF')
  @ApiOperation({ summary: 'Live meal count for current meal slot' })
  @ApiResponse({ status: 200, description: 'Live counts' })
  async getLiveCounts(@Query('hostelId') hostelId?: string) {
    const data = await this.messScanService.getLiveCounts(hostelId);
    return { success: true, data };
  }

  @Delete('scans/:id')
  @Roles('SUPER_ADMIN', 'MESS_MANAGER')
  @AuditAction('MEAL_SCAN_CANCEL', 'mess')
  @ApiOperation({ summary: 'Cancel scan within grace period' })
  @ApiResponse({ status: 200, description: 'Scan cancelled' })
  async cancelScan(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.messScanService.cancelScan(id);
    return { success: true, data };
  }

  // =========================================================================
  // Student Self-Service
  // =========================================================================

  @Get('my/history')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Get own meal history' })
  @ApiResponse({ status: 200, description: 'Meal history' })
  async getMyHistory(@CurrentUser() user: any, @Query() query: QueryScansDto) {
    const result = await this.messScanService.getStudentHistory(user.id, query);
    return { success: true, ...result };
  }

  @Get('my/stats')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Get own monthly meal stats' })
  @ApiResponse({ status: 200, description: 'Meal stats' })
  async getMyStats(
    @CurrentUser() user: any,
    @Query('hostelId') hostelId?: string,
  ) {
    const data = await this.messScanService.getStudentStats(user.id, hostelId);
    return { success: true, data };
  }

  @Post('feedback')
  @Roles('STUDENT')
  @AuditAction('MEAL_FEEDBACK', 'mess')
  @ApiOperation({ summary: 'Submit meal feedback' })
  @ApiResponse({ status: 201, description: 'Feedback submitted' })
  async submitFeedback(@Body() dto: CreateFeedbackDto, @CurrentUser() user: any) {
    const feedback = await this.messScanService.submitFeedback(dto, user.id);
    return { success: true, data: feedback };
  }
}
