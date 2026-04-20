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
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto, UpdateComplaintDto, AddCommentDto, ListComplaintsQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { hasRole } from '../auth/helpers';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('complaints')
@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class ComplaintsController {
  constructor(
    private readonly complaintsService: ComplaintsService,
    private readonly prisma: PrismaService,
  ) { }

  @Post()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'STUDENT')
  @AuditAction('COMPLAINT_CREATE', 'complaints')
  @ApiOperation({ summary: 'File a new complaint' })
  @ApiResponse({ status: 201, description: 'Complaint created' })
  async create(@Body() dto: CreateComplaintDto, @CurrentUser() user: any) {
    // Auto-populate studentId and hostelId for STUDENT role from their JWT + bed assignment
    if (hasRole(user, 'STUDENT')) {
      dto.studentId = dto.studentId || user.sub || user.id;

      if (!dto.hostelId) {
        const activeBed = await this.prisma.bedAssignment.findFirst({
          where: { studentId: dto.studentId, status: 'ACTIVE' },
          include: { bed: { include: { room: true } } },
        });
        if (!activeBed) {
          throw new BadRequestException('You do not have an active bed assignment. Only resident students can file complaints.');
        }
        dto.hostelId = activeBed.bed.room.hostelId;
      }
    } else {
      // Admin/Warden/Staff must provide both studentId and hostelId
      if (!dto.studentId || !dto.hostelId) {
        throw new BadRequestException('studentId and hostelId are required when filing on behalf of a student.');
      }
    }

    const complaint = await this.complaintsService.create(dto);
    return { success: true, data: complaint };
  }

  @Get()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'MAINTENANCE_STAFF', 'STUDENT')
  @ApiOperation({ summary: 'List complaints with filters' })
  @ApiResponse({ status: 200, description: 'Complaints list' })
  async findAll(@Query() query: ListComplaintsQueryDto, @CurrentUser() user: any) {
    // Students can only see their own complaints
    const isStudent = hasRole(user, 'STUDENT');
    if (isStudent) {
      query.studentId = user.id;
    }
    const result = await this.complaintsService.findMany(query);
    return { success: true, ...result };
  }

  @Get('stats')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @ApiOperation({ summary: 'Get complaint statistics' })
  @ApiResponse({ status: 200, description: 'Complaint stats' })
  async getStats() {
    const stats = await this.complaintsService.getStats();
    return { success: true, data: stats };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'MAINTENANCE_STAFF', 'STUDENT')
  @ApiOperation({ summary: 'Get complaint by ID' })
  @ApiResponse({ status: 200, description: 'Complaint details' })
  @ApiResponse({ status: 404, description: 'Complaint not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    const complaint = await this.complaintsService.findById(id);
    // Students can only view their own complaints
    const isStudent = hasRole(user, 'STUDENT');
    if (isStudent && complaint.studentId !== user.id) {
      throw new NotFoundException('Complaint not found');
    }
    return { success: true, data: complaint };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'MAINTENANCE_STAFF')
  @AuditAction('COMPLAINT_UPDATE', 'complaints')
  @ApiOperation({ summary: 'Update complaint (status, assignment, priority, resolution)' })
  @ApiResponse({ status: 200, description: 'Complaint updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateComplaintDto,
  ) {
    const complaint = await this.complaintsService.update(id, dto);
    return { success: true, data: complaint };
  }

  @Post(':id/comments')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'MAINTENANCE_STAFF', 'STUDENT')
  @AuditAction('COMPLAINT_COMMENT', 'complaints')
  @ApiOperation({ summary: 'Add a comment to a complaint' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: any,
  ) {
    const comment = await this.complaintsService.addComment(id, user.id, dto.message);
    return { success: true, data: comment };
  }
}
