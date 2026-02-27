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
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto, ApproveLeaveDto, RejectLeaveDto, ListLeaveQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('leave')
@Controller('leave')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT')
  @AuditAction('LEAVE_CREATE', 'leave')
  @ApiOperation({ summary: 'Create a leave request' })
  @ApiResponse({ status: 201, description: 'Leave request created' })
  async create(@Body() dto: CreateLeaveRequestDto) {
    const leave = await this.leaveService.create(dto);
    return { success: true, data: leave };
  }

  @Get()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT', 'PARENT')
  @ApiOperation({ summary: 'List leave requests with filters' })
  @ApiResponse({ status: 200, description: 'Leave requests list' })
  async findAll(@Query() query: ListLeaveQueryDto, @CurrentUser() user: any) {
    // Students & parents can only see their own leave requests
    const isStudent = user.roles?.includes('STUDENT');
    const isParent = user.roles?.includes('PARENT');
    if (isStudent || isParent) {
      query.studentId = user.id;
    }
    const result = await this.leaveService.findMany(query);
    return { success: true, ...result };
  }

  @Get('stats')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @ApiOperation({ summary: 'Get leave request statistics' })
  @ApiResponse({ status: 200, description: 'Leave stats' })
  async getStats() {
    const stats = await this.leaveService.getStats();
    return { success: true, data: stats };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT', 'PARENT')
  @ApiOperation({ summary: 'Get leave request by ID' })
  @ApiResponse({ status: 200, description: 'Leave request details' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const leave = await this.leaveService.findById(id);
    // Students & parents can only view their own leave requests
    const isStudent = user.roles?.includes('STUDENT');
    const isParent = user.roles?.includes('PARENT');
    if ((isStudent || isParent) && leave.studentId !== user.id) {
      throw new NotFoundException('Leave request not found');
    }
    return { success: true, data: leave };
  }

  @Post(':id/parent-approve')
  @Roles('SUPER_ADMIN', 'PARENT')
  @AuditAction('LEAVE_PARENT_APPROVE', 'leave')
  @ApiOperation({ summary: 'Parent approves a leave request' })
  @ApiResponse({ status: 200, description: 'Leave request approved by parent' })
  async parentApprove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const leave = await this.leaveService.parentApprove(id, user.id);
    return { success: true, data: leave };
  }

  @Post(':id/warden-approve')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('LEAVE_WARDEN_APPROVE', 'leave')
  @ApiOperation({ summary: 'Warden approves a leave request' })
  @ApiResponse({ status: 200, description: 'Leave request approved by warden' })
  async wardenApprove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const leave = await this.leaveService.wardenApprove(id, user.id);
    return { success: true, data: leave };
  }

  @Post(':id/reject')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('LEAVE_REJECT', 'leave')
  @ApiOperation({ summary: 'Reject a leave request' })
  @ApiResponse({ status: 200, description: 'Leave request rejected' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectLeaveDto,
    @CurrentUser() user: any,
  ) {
    const leave = await this.leaveService.reject(id, user.id, dto.rejectionReason);
    return { success: true, data: leave };
  }

  @Post(':id/cancel')
  @Roles('SUPER_ADMIN', 'STUDENT')
  @AuditAction('LEAVE_CANCEL', 'leave')
  @ApiOperation({ summary: 'Cancel a leave request' })
  @ApiResponse({ status: 200, description: 'Leave request cancelled' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const leave = await this.leaveService.cancel(id, user.id);
    return { success: true, data: leave };
  }
}
