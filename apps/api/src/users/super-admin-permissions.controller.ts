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

const HOSTEL_ADMIN_PERMISSION_DEFINITIONS = [
  { name: 'USER_CREATE', module: 'users', description: 'Create users for hostel operations', defaultEnabled: true },
  { name: 'USER_READ', module: 'users', description: 'View user details', defaultEnabled: true },
  { name: 'USER_UPDATE', module: 'users', description: 'Update user details', defaultEnabled: true },
  { name: 'USER_LIST', module: 'users', description: 'List users', defaultEnabled: true },
  { name: 'ROLE_ASSIGN', module: 'roles', description: 'Assign roles to users', defaultEnabled: true },
  { name: 'ROLE_REVOKE', module: 'roles', description: 'Revoke roles from users', defaultEnabled: true },
  { name: 'HOSTEL_MANAGE', module: 'hostels', description: 'Manage hostels and hostel dashboard stats', defaultEnabled: true },
  { name: 'ROOM_MANAGE', module: 'rooms', description: 'Manage rooms, beds, and room status', defaultEnabled: true },
  { name: 'ALLOTMENT_MANAGE', module: 'allotments', description: 'Assign, transfer, and vacate student beds', defaultEnabled: true },
  { name: 'FINANCE_MANAGE', module: 'finance', description: 'Manage hostel finance workflows', defaultEnabled: true },
  { name: 'PAYMENT_VIEW', module: 'finance', description: 'View student payment records', defaultEnabled: true },
  { name: 'LEAVE_APPROVE', module: 'leave', description: 'Approve or reject leave requests', defaultEnabled: true },
  { name: 'MESS_MANAGE', module: 'mess', description: 'Manage mess operations', defaultEnabled: true },
  { name: 'COMPLAINT_MANAGE', module: 'complaints', description: 'View, update, and resolve complaints', defaultEnabled: true },
  { name: 'NOTICE_PUBLISH', module: 'notices', description: 'Publish hostel notices', defaultEnabled: true },
  { name: 'REPORT_VIEW', module: 'reports', description: 'View reports and dashboard analytics', defaultEnabled: true },
  { name: 'AUDIT_VIEW', module: 'audit', description: 'View audit logs', defaultEnabled: true },
] as const;

const ROLE_PERMISSION_DEFINITIONS = {
  SUPER_ADMIN: SUPER_ADMIN_PERMISSION_DEFINITIONS,
  HOSTEL_ADMIN: HOSTEL_ADMIN_PERMISSION_DEFINITIONS,
} as const;

type ConfigurableRole = keyof typeof ROLE_PERMISSION_DEFINITIONS;

class UpdateRolePermissionDto {
  @IsString()
  permission!: string;

  @IsBoolean()
  enabled!: boolean;
}

@ApiTags('roles-responsibilities')
@Controller('roles-responsibilities')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class SuperAdminPermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('super-admin')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Get Super Admin feature permissions' })
  @ApiResponse({ status: 200, description: 'Super Admin permissions returned' })
  async getSuperAdminPermissions() {
    return this.getPermissionsForRole('SUPER_ADMIN');
  }

  @Patch('super-admin')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Enable or disable one Super Admin permission' })
  @ApiResponse({ status: 200, description: 'Super Admin permission updated' })
  async updateSuperAdminPermission(@Body() dto: UpdateRolePermissionDto) {
    return this.updatePermissionForRole('SUPER_ADMIN', dto);
  }

  @Get('hostel-admin')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Get Hostel Admin feature permissions' })
  @ApiResponse({ status: 200, description: 'Hostel Admin permissions returned' })
  async getHostelAdminPermissions() {
    return this.getPermissionsForRole('HOSTEL_ADMIN');
  }

  @Patch('hostel-admin')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Enable or disable one Hostel Admin permission' })
  @ApiResponse({ status: 200, description: 'Hostel Admin permission updated' })
  async updateHostelAdminPermission(@Body() dto: UpdateRolePermissionDto) {
    return this.updatePermissionForRole('HOSTEL_ADMIN', dto);
  }

  private async getPermissionsForRole(roleName: ConfigurableRole) {
    const { role, permissions } = await this.ensureRolePermissions(roleName);
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

  private async updatePermissionForRole(roleName: ConfigurableRole, dto: UpdateRolePermissionDto) {
    const definitions = ROLE_PERMISSION_DEFINITIONS[roleName];
    const definition = definitions.find(
      (item) => item.name === dto.permission,
    );

    if (!definition) {
      return {
        success: false,
        message: `Unknown ${this.roleLabel(roleName)} permission`,
      };
    }

    const { role, permissionMap } = await this.ensureRolePermissions(roleName);
    const permissionId = permissionMap.get(dto.permission)!;

    if ('locked' in definition && definition.locked) {
      return this.getPermissionsForRole(roleName);
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

    return this.getPermissionsForRole(roleName);
  }

  private async ensureRolePermissions(roleName: ConfigurableRole) {
    const definitions = ROLE_PERMISSION_DEFINITIONS[roleName];
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new Error(`${roleName} role not found`);
    }

    const permissionMap = new Map<string, string>();

    for (const definition of definitions) {
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
      where: { name: roleName },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    return {
      role: refreshedRole,
      permissionMap,
      permissions: definitions,
    };
  }

  private roleLabel(roleName: ConfigurableRole) {
    return roleName === 'SUPER_ADMIN' ? 'Super Admin' : 'Hostel Admin';
  }
}
