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
import { MessRebateService } from './mess-rebate.service';
import { CreateRebateDto, QueryRebatesDto, ReviewRebateDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { hasRole } from '../auth/helpers';

@ApiTags('mess')
@Controller('mess')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class MessRebateController {
  constructor(private readonly messRebateService: MessRebateService) {}

  @Post('rebates')
  @Roles('STUDENT')
  @AuditAction('REBATE_CREATE', 'mess')
  @ApiOperation({ summary: 'Request mess rebate' })
  @ApiResponse({ status: 201, description: 'Rebate request created' })
  async createRebate(@Body() dto: CreateRebateDto, @CurrentUser() user: any) {
    const rebate = await this.messRebateService.createRebate(dto, user.id);
    return { success: true, data: rebate };
  }

  @Get('rebates')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'WARDEN', 'STUDENT')
  @ApiOperation({ summary: 'List rebates (students see own, admins see all)' })
  @ApiResponse({ status: 200, description: 'Rebates list' })
  async findRebates(@Query() query: QueryRebatesDto, @CurrentUser() user: any) {
    // Students can only see their own rebates
    if (hasRole(user, 'STUDENT')) {
      query.studentId = user.id;
    }
    const result = await this.messRebateService.findRebates(query);
    return { success: true, ...result };
  }

  @Get('rebates/:id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'WARDEN', 'STUDENT')
  @ApiOperation({ summary: 'Get rebate details' })
  @ApiResponse({ status: 200, description: 'Rebate details' })
  async findRebate(@Param('id', ParseUUIDPipe) id: string) {
    const rebate = await this.messRebateService.findRebateById(id);
    return { success: true, data: rebate };
  }

  @Post('rebates/:id/approve')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('REBATE_APPROVE', 'mess')
  @ApiOperation({ summary: 'Approve rebate (set amount)' })
  @ApiResponse({ status: 200, description: 'Rebate approved' })
  async approveRebate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewRebateDto,
    @CurrentUser() user: any,
  ) {
    const rebate = await this.messRebateService.approveRebate(id, dto, user.id);
    return { success: true, data: rebate };
  }

  @Post('rebates/:id/reject')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @AuditAction('REBATE_REJECT', 'mess')
  @ApiOperation({ summary: 'Reject rebate (with reason)' })
  @ApiResponse({ status: 200, description: 'Rebate rejected' })
  async rejectRebate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewRebateDto,
    @CurrentUser() user: any,
  ) {
    const rebate = await this.messRebateService.rejectRebate(id, dto, user.id);
    return { success: true, data: rebate };
  }
}
