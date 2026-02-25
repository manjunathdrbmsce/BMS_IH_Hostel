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
import { GateService } from './gate.service';
import {
  CreateGateEntryDto,
  CreateGatePassDto,
  UpdateGatePassDto,
  ListGateEntriesQueryDto,
  ListGatePassesQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('gate')
@Controller('gate')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class GateController {
  constructor(private readonly gateService: GateService) {}

  // ---- Entry/Exit ----

  @Post('entries')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'SECURITY_GUARD')
  @AuditAction('GATE_ENTRY', 'gate')
  @ApiOperation({ summary: 'Log a gate entry/exit' })
  @ApiResponse({ status: 201, description: 'Gate entry created' })
  async createEntry(@Body() dto: CreateGateEntryDto, @CurrentUser() user: any) {
    const entry = await this.gateService.createEntry(dto, user.id);
    return { success: true, data: entry };
  }

  @Get('entries')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'SECURITY_GUARD')
  @ApiOperation({ summary: 'List gate entries with filters' })
  @ApiResponse({ status: 200, description: 'Gate entries list' })
  async findEntries(@Query() query: ListGateEntriesQueryDto) {
    const result = await this.gateService.findEntries(query);
    return { success: true, ...result };
  }

  @Get('entries/:id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'SECURITY_GUARD')
  @ApiOperation({ summary: 'Get gate entry by ID' })
  @ApiResponse({ status: 200, description: 'Gate entry details' })
  async findEntry(@Param('id', ParseUUIDPipe) id: string) {
    const entry = await this.gateService.findEntryById(id);
    return { success: true, data: entry };
  }

  // ---- Gate Passes ----

  @Post('passes')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN')
  @AuditAction('GATE_PASS_CREATE', 'gate')
  @ApiOperation({ summary: 'Create a gate pass' })
  @ApiResponse({ status: 201, description: 'Gate pass created' })
  async createPass(@Body() dto: CreateGatePassDto, @CurrentUser() user: any) {
    const pass = await this.gateService.createPass(dto, user.id);
    return { success: true, data: pass };
  }

  @Get('passes')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'SECURITY_GUARD')
  @ApiOperation({ summary: 'List gate passes with filters' })
  @ApiResponse({ status: 200, description: 'Gate passes list' })
  async findPasses(@Query() query: ListGatePassesQueryDto) {
    const result = await this.gateService.findPasses(query);
    return { success: true, ...result };
  }

  @Get('passes/:id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'DEPUTY_WARDEN', 'SECURITY_GUARD')
  @ApiOperation({ summary: 'Get gate pass by ID' })
  @ApiResponse({ status: 200, description: 'Gate pass details' })
  async findPass(@Param('id', ParseUUIDPipe) id: string) {
    const pass = await this.gateService.findPassById(id);
    return { success: true, data: pass };
  }

  @Patch('passes/:id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'SECURITY_GUARD')
  @AuditAction('GATE_PASS_UPDATE', 'gate')
  @ApiOperation({ summary: 'Update gate pass status' })
  @ApiResponse({ status: 200, description: 'Gate pass updated' })
  async updatePass(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGatePassDto,
  ) {
    const pass = await this.gateService.updatePass(id, dto);
    return { success: true, data: pass };
  }

  // ---- Stats ----

  @Get('stats')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN', 'SECURITY_GUARD')
  @ApiOperation({ summary: 'Get gate statistics' })
  @ApiResponse({ status: 200, description: 'Gate stats' })
  async getStats() {
    const stats = await this.gateService.getStats();
    return { success: true, data: stats };
  }
}
