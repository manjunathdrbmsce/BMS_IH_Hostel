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
import { RoomsService } from './rooms.service';
import {
  CreateRoomDto,
  UpdateRoomDto,
  ListRoomsQueryDto,
  BulkCreateRoomsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';

@ApiTags('hostels')
@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  @AuditAction('ROOM_CREATE', 'rooms')
  @ApiOperation({ summary: 'Create a new room with auto-generated beds' })
  @ApiResponse({ status: 201, description: 'Room created' })
  async create(@Body() dto: CreateRoomDto) {
    const room = await this.roomsService.create(dto);
    return { success: true, data: room };
  }

  @Post('bulk')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  @AuditAction('ROOM_BULK_CREATE', 'rooms')
  @ApiOperation({ summary: 'Bulk create rooms across floors' })
  @ApiResponse({ status: 201, description: 'Rooms created' })
  async bulkCreate(@Body() dto: BulkCreateRoomsDto) {
    const result = await this.roomsService.bulkCreate(dto);
    return { success: true, ...result };
  }

  @Get()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'List rooms for a hostel' })
  @ApiResponse({ status: 200, description: 'Rooms list' })
  async findAll(@Query() query: ListRoomsQueryDto) {
    const result = await this.roomsService.findMany(query);
    return { success: true, ...result };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @ApiOperation({ summary: 'Get room by ID with bed details' })
  @ApiResponse({ status: 200, description: 'Room details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const room = await this.roomsService.findById(id);
    return { success: true, data: room };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  @AuditAction('ROOM_UPDATE', 'rooms')
  @ApiOperation({ summary: 'Update room details' })
  @ApiResponse({ status: 200, description: 'Room updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    const room = await this.roomsService.update(id, dto);
    return { success: true, data: room };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  @AuditAction('ROOM_DELETE', 'rooms')
  @ApiOperation({ summary: 'Close room' })
  @ApiResponse({ status: 200, description: 'Room closed' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.roomsService.delete(id);
    return { success: true, ...result };
  }
}
