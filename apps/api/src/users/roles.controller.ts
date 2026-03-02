import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    UseGuards,
    UseInterceptors,
    ParseUUIDPipe,
    ForbiddenException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { AuditAction } from '../audit/audit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';

/**
 * Role management API — assign/revoke roles for users.
 * Only SUPER_ADMIN and HOSTEL_ADMIN can manage roles.
 */
@ApiTags('users')
@Controller('users/:userId/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@UseInterceptors(AuditInterceptor)
export class RolesController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
    @ApiOperation({ summary: 'List roles for a user' })
    @ApiResponse({ status: 200, description: 'User roles returned' })
    async listRoles(@Param('userId', ParseUUIDPipe) userId: string) {
        const roles = await this.prisma.userRole.findMany({
            where: { userId, revokedAt: null },
            include: { role: true },
            orderBy: { grantedAt: 'desc' },
        });

        return {
            success: true,
            data: roles.map((ur) => ({
                id: ur.id,
                roleName: ur.role.name,
                displayName: ur.role.displayName,
                hostelId: ur.hostelId,
                grantedAt: ur.grantedAt,
                grantedBy: ur.grantedBy,
            })),
        };
    }

    @Post()
    @Roles('SUPER_ADMIN', 'HOSTEL_ADMIN')
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @AuditAction('ROLE_ASSIGN', 'users')
    @ApiOperation({ summary: 'Assign a role to a user' })
    @ApiResponse({ status: 201, description: 'Role assigned' })
    @ApiResponse({ status: 404, description: 'User or role not found' })
    @ApiResponse({ status: 409, description: 'Role already assigned' })
    async assignRole(
        @Param('userId', ParseUUIDPipe) userId: string,
        @Body() dto: AssignRoleDto,
        @CurrentUser('id') grantedBy: string,
    ) {
        // Verify user exists
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new ForbiddenException('User not found');
        }

        // Find role
        const role = await this.prisma.role.findFirst({
            where: { name: dto.roleName },
        });
        if (!role) {
            throw new ForbiddenException(`Role "${dto.roleName}" not found`);
        }

        // Check for existing active assignment
        const existing = await this.prisma.userRole.findFirst({
            where: {
                userId,
                roleId: role.id,
                revokedAt: null,
            },
        });
        if (existing) {
            throw new ForbiddenException(`Role "${dto.roleName}" is already assigned to this user`);
        }

        const userRole = await this.prisma.userRole.create({
            data: {
                userId,
                roleId: role.id,
                hostelId: dto.hostelId || null,
                grantedBy,
            },
            include: { role: true },
        });

        return {
            success: true,
            data: {
                id: userRole.id,
                roleName: userRole.role.name,
                displayName: userRole.role.displayName,
                hostelId: userRole.hostelId,
                grantedAt: userRole.grantedAt,
                grantedBy: userRole.grantedBy,
            },
        };
    }

    @Delete(':roleAssignmentId')
    @Roles('SUPER_ADMIN')
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @AuditAction('ROLE_REVOKE', 'users')
    @ApiOperation({ summary: 'Revoke a role from a user' })
    @ApiResponse({ status: 200, description: 'Role revoked' })
    @ApiResponse({ status: 403, description: 'Cannot remove last SUPER_ADMIN' })
    @ApiResponse({ status: 404, description: 'Role assignment not found' })
    async revokeRole(
        @Param('userId', ParseUUIDPipe) userId: string,
        @Param('roleAssignmentId', ParseUUIDPipe) roleAssignmentId: string,
    ) {
        const assignment = await this.prisma.userRole.findFirst({
            where: { id: roleAssignmentId, userId, revokedAt: null },
            include: { role: true },
        });

        if (!assignment) {
            throw new ForbiddenException('Role assignment not found or already revoked');
        }

        // Safety: prevent removing the last SUPER_ADMIN
        if (assignment.role.name === 'SUPER_ADMIN') {
            const superAdminCount = await this.prisma.userRole.count({
                where: {
                    role: { name: 'SUPER_ADMIN' },
                    revokedAt: null,
                },
            });

            if (superAdminCount <= 1) {
                throw new ForbiddenException(
                    'Cannot revoke the last SUPER_ADMIN role. Assign SUPER_ADMIN to another user first.',
                );
            }
        }

        await this.prisma.userRole.update({
            where: { id: roleAssignmentId },
            data: { revokedAt: new Date() },
        });

        return {
            success: true,
            message: `Role "${assignment.role.name}" revoked from user`,
        };
    }
}
