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
import { NoticesService } from './notices.service';
import { CreateNoticeDto, UpdateNoticeDto, ListNoticesQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('notices')
@Controller('notices')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('NOTICE_PUBLISH', 'notices')
  @ApiOperation({ summary: 'Publish a new notice' })
  @ApiResponse({ status: 201, description: 'Notice published' })
  async create(@Body() dto: CreateNoticeDto, @CurrentUser() user: any) {
    const notice = await this.noticesService.create(dto, user.id);
    return { success: true, data: notice };
  }

  @Get()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT', 'PARENT')
  @ApiOperation({ summary: 'List notices with filters' })
  @ApiResponse({ status: 200, description: 'Notices list' })
  async findAll(@Query() query: ListNoticesQueryDto) {
    const result = await this.noticesService.findMany(query);
    return { success: true, ...result };
  }

  @Get('stats')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @ApiOperation({ summary: 'Get notice statistics' })
  @ApiResponse({ status: 200, description: 'Notice stats' })
  async getStats() {
    const stats = await this.noticesService.getStats();
    return { success: true, data: stats };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT', 'PARENT')
  @ApiOperation({ summary: 'Get notice by ID' })
  @ApiResponse({ status: 200, description: 'Notice details' })
  @ApiResponse({ status: 404, description: 'Notice not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const notice = await this.noticesService.findById(id);
    return { success: true, data: notice };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('NOTICE_UPDATE', 'notices')
  @ApiOperation({ summary: 'Update a notice' })
  @ApiResponse({ status: 200, description: 'Notice updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoticeDto,
  ) {
    const notice = await this.noticesService.update(id, dto);
    return { success: true, data: notice };
  }

  @Post(':id/read')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT', 'PARENT')
  @ApiOperation({ summary: 'Mark a notice as read' })
  @ApiResponse({ status: 200, description: 'Notice marked as read' })
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.noticesService.markRead(id, user.id);
    return { success: true, data: result };
  }
}
