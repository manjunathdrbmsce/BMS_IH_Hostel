import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

const SUPER_ADMIN_PERMISSION_DEFINITIONS = [
  { name: 'AUTH_LOGIN', module: 'auth', description: 'Login and access Super Admin dashboard', defaultEnabled: true, locked: true },
  { name: 'DASHBOARD_VIEW_GLOBAL', module: 'dashboard', description: 'View all dashboard stats', defaultEnabled: true },
  { name: 'USER_CREATE', module: 'users', description: 'Add users with any role', defaultEnabled: true },
  { name: 'USER_EXPORT', module: 'users', description: 'Export users', defaultEnabled: true },
  { name: 'ROLE_ASSIGN', module: 'roles', description: 'Assign and manage roles', defaultEnabled: true },
  { name: 'BUILDING_MANAGE', module: 'buildings', description: 'Create buildings and view status/stats', defaultEnabled: true },
  { name: 'HOSTEL_MANAGE', module: 'hostels', description: 'Create hostels and view hostel stats', defaultEnabled: true },
  { name: 'WARDEN_ASSIGN', module: 'hostels', description: 'Assign warden to hostel', defaultEnabled: true },
  { name: 'ROOM_MANAGE', module: 'rooms', description: 'View room stats and update room status', defaultEnabled: true },
  { name: 'POLICY_MANAGE', module: 'policies', description: 'Create building policy and view active policies', defaultEnabled: true },
  { name: 'STUDENT_PROFILE_MANAGE', module: 'students', description: 'Create student profile and view student stats', defaultEnabled: true },
  { name: 'ALLOTMENT_MANAGE', module: 'allotments', description: 'Assign, transfer, and vacate beds', defaultEnabled: true },
  { name: 'REGISTRATION_VIEW', module: 'registration', description: 'View registration status and stats', defaultEnabled: true },
  { name: 'REGISTRATION_DRAFT_EDIT', module: 'registration', description: 'Edit student draft application', defaultEnabled: false },
  { name: 'LEAVE_STATS_VIEW', module: 'leave', description: 'View leave dashboard stats', defaultEnabled: true },
  { name: 'LEAVE_PARENT_OVERRIDE', module: 'leave', description: 'Override parent approval', defaultEnabled: false },
  { name: 'LEAVE_ADMIN_DECIDE', module: 'leave', description: 'Final approve/reject leave', defaultEnabled: true },
  { name: 'GATE_MANAGE', module: 'gate', description: 'View stats, log entry, and issue gate pass', defaultEnabled: true },
  { name: 'ATTENDANCE_STATS_VIEW', module: 'attendance', description: 'View attendance stats', defaultEnabled: true },
  { name: 'ROLL_CALL_CREATE', module: 'attendance', description: 'Start roll call for selected hostel', defaultEnabled: true },
  { name: 'ROLL_CALL_MANAGE', module: 'attendance', description: 'View and cancel roll-call session', defaultEnabled: true },
  { name: 'VIOLATION_MANAGE', module: 'violations', description: 'View stats and resolve violation', defaultEnabled: true },
  { name: 'COMPLAINT_MANAGE', module: 'complaints', description: 'View stats and resolve complaints', defaultEnabled: true },
  { name: 'COMPLAINT_CREATE_ON_BEHALF', module: 'complaints', description: 'File complaint on behalf of student', defaultEnabled: false },
  { name: 'NOTICE_MANAGE', module: 'notices', description: 'Publish and deactivate notices', defaultEnabled: true },
] as const;

class UpdateSuperAdminPermissionDto {
  @IsString()
  permission!: string;

  @IsBoolean()
  enabled!: boolean;
}

@ApiTags('roles-responsibilities')
@Controller('roles-responsibilities/super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class SuperAdminPermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Get Super Admin feature permissions' })
  @ApiResponse({ status: 200, description: 'Super Admin permissions returned' })
  async getPermissions() {
    const { role, permissions } = await this.ensureSuperAdminPermissions();
    const enabled = new Set(
      role.rolePermissions.map((rolePermission) => rolePermission.permission.name),
    );

    return {
      success: true,
      data: permissions.map((permission) => ({
        ...permission,
        enabled: enabled.has(permission.name),
      })),
    };
  }

  @Patch()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Enable or disable one Super Admin permission' })
  @ApiResponse({ status: 200, description: 'Super Admin permission updated' })
  async updatePermission(@Body() dto: UpdateSuperAdminPermissionDto) {
    const definition = SUPER_ADMIN_PERMISSION_DEFINITIONS.find(
      (item) => item.name === dto.permission,
    );

    if (!definition) {
      return {
        success: false,
        message: 'Unknown Super Admin permission',
      };
    }

    const { role, permissionMap } = await this.ensureSuperAdminPermissions();
    const permissionId = permissionMap.get(dto.permission)!;

    if ('locked' in definition && definition.locked) {
      return this.getPermissions();
    }

    if (dto.enabled) {
      await this.prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    } else {
      await this.prisma.rolePermission.deleteMany({
        where: { roleId: role.id, permissionId },
      });
    }

    return this.getPermissions();
  }

  private async ensureSuperAdminPermissions() {
    const role = await this.prisma.role.findUnique({
      where: { name: 'SUPER_ADMIN' },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new Error('SUPER_ADMIN role not found');
    }

    const permissionMap = new Map<string, string>();

    for (const definition of SUPER_ADMIN_PERMISSION_DEFINITIONS) {
      const existingPermission = await this.prisma.permission.findUnique({
        where: { name: definition.name },
        select: { id: true },
      });

      const permission = await this.prisma.permission.upsert({
        where: { name: definition.name },
        update: {
          module: definition.module,
          description: definition.description,
        },
        create: {
          name: definition.name,
          module: definition.module,
          description: definition.description,
        },
      });
      permissionMap.set(permission.name, permission.id);

      const existing = role.rolePermissions.some(
        (rolePermission) => rolePermission.permissionId === permission.id,
      );

      const shouldAssignDefault =
        definition.defaultEnabled && !existing && (!existingPermission || ('locked' in definition && definition.locked));

      if (shouldAssignDefault) {
        await this.prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
    }

    const refreshedRole = await this.prisma.role.findUniqueOrThrow({
      where: { name: 'SUPER_ADMIN' },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    return {
      role: refreshedRole,
      permissionMap,
      permissions: SUPER_ADMIN_PERMISSION_DEFINITIONS,
    };
  }
}
