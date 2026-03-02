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
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @AuditAction('USER_CREATE', 'users')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Duplicate user' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    const user = await this.usersService.create(dto, currentUserId);
    return { success: true, data: user };
  }

  @Get()
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @ApiOperation({ summary: 'List users with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Users list' })
  async findAll(@Query() query: ListUsersQueryDto) {
    const result = await this.usersService.findMany(query);
    return { success: true, ...result };
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    return { success: true, data: user };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
  @AuditAction('USER_UPDATE', 'users')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(id, dto);
    return { success: true, data: user };
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @AuditAction('USER_DELETE', 'users')
  @ApiOperation({ summary: 'Deactivate user (soft delete)' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.usersService.delete(id);
    return { success: true, ...result };
  }
}
