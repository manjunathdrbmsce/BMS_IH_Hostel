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
import { AttendanceService } from './attendance.service';
import { DeviceService } from './device.service';
import {
    CreateSessionDto,
    MarkAttendanceDto,
    RegisterDeviceDto,
    RequestDeviceChangeDto,
    ListAttendanceQueryDto,
    StudentAttendanceQueryDto,
    ListDeviceRequestsQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class AttendanceController {
    constructor(
        private readonly attendanceService: AttendanceService,
        private readonly deviceService: DeviceService,
    ) { }

    // =========================================================================
    // Session Management (Warden/Admin)
    // =========================================================================

    @Post('session')
    @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
    @AuditAction('ATTENDANCE_SESSION_CREATE', 'attendance')
    @ApiOperation({ summary: 'Start an attendance roll-call session' })
    @ApiResponse({ status: 201, description: 'Session created with rotating QR' })
    async createSession(@Body() dto: CreateSessionDto, @CurrentUser() user: any) {
        const session = await this.attendanceService.createSession(dto, user.id);
        return { success: true, data: session };
    }

    @Get('session/:id/qr')
    @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
    @ApiOperation({ summary: 'Get current rotating QR token for a session' })
    @ApiResponse({ status: 200, description: 'Current QR token + countdown' })
    async getSessionQR(@Param('id', ParseUUIDPipe) id: string) {
        const qr = await this.attendanceService.getSessionQR(id);
        return { success: true, data: qr };
    }

    @Get('session/:id/live')
    @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
    @ApiOperation({ summary: 'Get live session stats and present student list' })
    @ApiResponse({ status: 200, description: 'Live session data' })
    async getSessionLive(@Param('id', ParseUUIDPipe) id: string) {
        const data = await this.attendanceService.getSessionLive(id);
        return { success: true, data };
    }

    @Post('session/:id/cancel')
    @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
    @AuditAction('ATTENDANCE_SESSION_CANCEL', 'attendance')
    @ApiOperation({ summary: 'Cancel an active session' })
    @ApiResponse({ status: 200, description: 'Session cancelled' })
    async cancelSession(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
    ) {
        return this.attendanceService.cancelSession(id, user.id);
    }

    // =========================================================================
    // Active Sessions (Student — for manual entry dropdown)
    // =========================================================================

    @Get('sessions/active')
    @Roles('STUDENT', 'SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
    @ApiOperation({ summary: 'List currently active sessions with names' })
    @ApiResponse({ status: 200, description: 'Active sessions with hostel names' })
    async getActiveSessions() {
        const sessions = await this.attendanceService.getActiveSessions();
        return { success: true, data: sessions };
    }

    // =========================================================================
    // Mark Attendance (Student)
    // =========================================================================

    @Post('mark')
    @Roles('STUDENT')
    @AuditAction('ATTENDANCE_MARK', 'attendance')
    @ApiOperation({ summary: 'Student marks attendance by scanning QR' })
    @ApiResponse({ status: 201, description: 'Attendance marked successfully' })
    @ApiResponse({ status: 400, description: 'Validation failed (device/GPS/token)' })
    async markAttendance(@Body() dto: MarkAttendanceDto, @CurrentUser() user: any) {
        return this.attendanceService.markAttendance(dto, user.id);
    }

    // =========================================================================
    // Attendance Records (Admin/Warden Queries)
    // =========================================================================

    @Get('daily')
    @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
    @ApiOperation({ summary: 'Get daily attendance records with filters' })
    @ApiResponse({ status: 200, description: 'Paginated daily attendance records' })
    async getDailyAttendance(@Query() query: ListAttendanceQueryDto) {
        const result = await this.attendanceService.getDailyAttendance(query);
        return { success: true, data: result.data, meta: result.meta };
    }

    @Get('presence')
    @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'SECURITY_GUARD')
    @ApiOperation({ summary: 'Real-time presence board (in-hostel/out/on-leave counts)' })
    @ApiResponse({ status: 200, description: 'Presence board data' })
    async getPresenceBoard(@Query('hostelId') hostelId?: string) {
        const data = await this.attendanceService.getPresenceBoard(hostelId);
        return { success: true, data };
    }

    @Get('summary/:hostelId')
    @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
    @ApiOperation({ summary: 'Hostel attendance summary for a date' })
    @ApiResponse({ status: 200, description: 'Hostel attendance summary' })
    async getHostelSummary(
        @Param('hostelId', ParseUUIDPipe) hostelId: string,
        @Query('date') date?: string,
    ) {
        const data = await this.attendanceService.getHostelSummary(hostelId, date);
        return { success: true, data };
    }

    @Get('student/:id')
    @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'STUDENT', 'PARENT')
    @ApiOperation({ summary: 'Get student attendance history with stats' })
    @ApiResponse({ status: 200, description: 'Student attendance + calendar data' })
    async getStudentAttendance(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: StudentAttendanceQueryDto,
    ) {
        const data = await this.attendanceService.getStudentAttendance(id, query);
        return { success: true, data };
    }

    @Get('my')
    @Roles('STUDENT')
    @ApiOperation({ summary: 'Get own attendance history + calendar' })
    @ApiResponse({ status: 200, description: 'Own attendance with stats' })
    async getMyAttendance(
        @CurrentUser() user: any,
        @Query() query: StudentAttendanceQueryDto,
    ) {
        const data = await this.attendanceService.getStudentAttendance(user.id, query);
        return { success: true, data };
    }

    // =========================================================================
    // Device Management
    // =========================================================================

    @Post('device/register')
    @Roles('STUDENT')
    @AuditAction('DEVICE_REGISTER', 'attendance')
    @ApiOperation({ summary: 'Register device (first-time auto-bind)' })
    @ApiResponse({ status: 201, description: 'Device registered' })
    async registerDevice(@Body() dto: RegisterDeviceDto, @CurrentUser() user: any) {
        const device = await this.deviceService.registerDevice(user.id, dto);
        return { success: true, data: device };
    }

    @Get('device/my')
    @Roles('STUDENT')
    @ApiOperation({ summary: 'Get my registered device' })
    @ApiResponse({ status: 200, description: 'Active device info' })
    async getMyDevice(@CurrentUser() user: any) {
        const device = await this.deviceService.getActiveDevice(user.id);
        return { success: true, data: device };
    }

    @Post('device/request-change')
    @Roles('STUDENT')
    @AuditAction('DEVICE_CHANGE_REQUEST', 'attendance')
    @ApiOperation({ summary: 'Request device re-bind (requires warden approval)' })
    @ApiResponse({ status: 201, description: 'Device change request created' })
    async requestDeviceChange(
        @Body() dto: RequestDeviceChangeDto,
        @CurrentUser() user: any,
    ) {
        const request = await this.deviceService.requestDeviceChange(user.id, dto);
        return { success: true, data: request };
    }

    @Get('device/pending')
    @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
    @ApiOperation({ summary: 'List pending device change requests' })
    @ApiResponse({ status: 200, description: 'Paginated device change requests' })
    async getPendingDeviceRequests(@Query() query: ListDeviceRequestsQueryDto) {
        const result = await this.deviceService.getPendingRequests(query);
        return { success: true, data: result.data, meta: result.meta };
    }

    @Post('device/:id/approve')
    @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
    @AuditAction('DEVICE_CHANGE_APPROVE', 'attendance')
    @ApiOperation({ summary: 'Approve device re-bind request' })
    @ApiResponse({ status: 200, description: 'Device change approved, new device bound' })
    async approveDeviceChange(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
    ) {
        const result = await this.deviceService.approveDeviceChange(id, user.id);
        return { success: true, data: result };
    }

    @Post('device/:id/reject')
    @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
    @AuditAction('DEVICE_CHANGE_REJECT', 'attendance')
    @ApiOperation({ summary: 'Reject device re-bind request' })
    @ApiResponse({ status: 200, description: 'Device change request rejected' })
    async rejectDeviceChange(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: any,
    ) {
        const result = await this.deviceService.rejectDeviceChange(id, user.id);
        return { success: true, data: result };
    }
}
