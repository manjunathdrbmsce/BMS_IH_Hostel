import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

interface SuperAdminPermissionRule {
  method: string;
  pattern: RegExp;
  permission: string;
}

const rules: SuperAdminPermissionRule[] = [
  { method: 'GET', pattern: /^\/users\/export$/, permission: 'USER_EXPORT' },
  { method: 'POST', pattern: /^\/users$/, permission: 'USER_CREATE' },
  { method: 'GET', pattern: /^\/dashboard(?:\/.*)?$/, permission: 'DASHBOARD_VIEW_GLOBAL' },
  { method: 'POST', pattern: /^\/buildings$/, permission: 'BUILDING_MANAGE' },
  { method: 'GET', pattern: /^\/buildings(?:\/.*)?$/, permission: 'BUILDING_MANAGE' },
  { method: 'POST', pattern: /^\/hostels$/, permission: 'HOSTEL_MANAGE' },
  { method: 'GET', pattern: /^\/hostels(?:\/.*)?$/, permission: 'HOSTEL_MANAGE' },
  { method: 'POST', pattern: /^\/rooms$/, permission: 'ROOM_MANAGE' },
  { method: 'PATCH', pattern: /^\/rooms\/[^/]+$/, permission: 'ROOM_MANAGE' },
  { method: 'POST', pattern: /^\/policies$/, permission: 'POLICY_MANAGE' },
  { method: 'GET', pattern: /^\/policies(?:\/.*)?$/, permission: 'POLICY_MANAGE' },
  { method: 'POST', pattern: /^\/students$/, permission: 'STUDENT_PROFILE_MANAGE' },
  { method: 'GET', pattern: /^\/students(?:\/.*)?$/, permission: 'STUDENT_PROFILE_MANAGE' },
  { method: 'POST', pattern: /^\/allotments\/(?:assign|transfer|vacate)$/, permission: 'ALLOTMENT_MANAGE' },
  { method: 'GET', pattern: /^\/allotments(?:\/.*)?$/, permission: 'ALLOTMENT_MANAGE' },
  { method: 'GET', pattern: /^\/registration(?:\/.*)?$/, permission: 'REGISTRATION_VIEW' },
  { method: 'POST', pattern: /^\/registration\/draft$/, permission: 'REGISTRATION_DRAFT_EDIT' },
  { method: 'GET', pattern: /^\/leave\/stats$/, permission: 'LEAVE_STATS_VIEW' },
  { method: 'POST', pattern: /^\/leave\/[^/]+\/parent-override$/, permission: 'LEAVE_PARENT_OVERRIDE' },
  { method: 'POST', pattern: /^\/leave\/[^/]+\/(?:warden-approve|reject)$/, permission: 'LEAVE_ADMIN_DECIDE' },
  { method: 'GET', pattern: /^\/gate(?:\/.*)?$/, permission: 'GATE_MANAGE' },
  { method: 'POST', pattern: /^\/gate(?:\/.*)?$/, permission: 'GATE_MANAGE' },
  { method: 'GET', pattern: /^\/attendance\/(?:daily|presence|summary\/.*)$/, permission: 'ATTENDANCE_STATS_VIEW' },
  { method: 'POST', pattern: /^\/attendance\/session$/, permission: 'ROLL_CALL_CREATE' },
  { method: 'GET', pattern: /^\/attendance\/session\/[^/]+\/(?:qr|live)$/, permission: 'ROLL_CALL_MANAGE' },
  { method: 'POST', pattern: /^\/attendance\/session\/[^/]+\/cancel$/, permission: 'ROLL_CALL_MANAGE' },
  { method: 'GET', pattern: /^\/violations(?:\/.*)?$/, permission: 'VIOLATION_MANAGE' },
  { method: 'POST', pattern: /^\/violations\/[^/]+\/resolve$/, permission: 'VIOLATION_MANAGE' },
  { method: 'GET', pattern: /^\/complaints(?:\/.*)?$/, permission: 'COMPLAINT_MANAGE' },
  { method: 'PATCH', pattern: /^\/complaints\/[^/]+$/, permission: 'COMPLAINT_MANAGE' },
  { method: 'POST', pattern: /^\/complaints$/, permission: 'COMPLAINT_CREATE_ON_BEHALF' },
  { method: 'POST', pattern: /^\/notices$/, permission: 'NOTICE_MANAGE' },
  { method: 'PATCH', pattern: /^\/notices\/[^/]+$/, permission: 'NOTICE_MANAGE' },
];

@Injectable()
export class SuperAdminPermissionEnforcementInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.roles?.includes('SUPER_ADMIN')) {
      return next.handle();
    }

    const path = this.normalizePath(request.originalUrl || request.url || '');
    const method = request.method;
    const rolePermissions = this.getRoleAssignmentPermissions(method, path, request.body);

    for (const permission of rolePermissions) {
      if (!user.permissions?.includes(permission)) {
        throw new ForbiddenException(`SUPER_ADMIN permission disabled: ${permission}`);
      }
    }

    const rule = rules.find((item) => item.method === method && item.pattern.test(path));

    if (rule && !user.permissions?.includes(rule.permission)) {
      throw new ForbiddenException(`SUPER_ADMIN permission disabled: ${rule.permission}`);
    }

    return next.handle();
  }

  private normalizePath(url: string) {
    const path = url.split('?')[0].replace(/^\/api\/v\d+/, '');
    return path || '/';
  }

  private getRoleAssignmentPermissions(
    method: string,
    path: string,
    body?: { roleName?: string; hostelId?: string; roles?: string[] },
  ) {
    if (method !== 'POST') {
      return [];
    }

    if (/^\/users\/[^/]+\/roles$/.test(path)) {
      return [
        'ROLE_ASSIGN',
        ...(body?.roleName === 'WARDEN' && body?.hostelId ? ['WARDEN_ASSIGN'] : []),
      ];
    }

    if (path === '/users' && Array.isArray(body?.roles) && body.roles.length > 0) {
      return [
        'ROLE_ASSIGN',
        ...(body.roles.includes('WARDEN') ? ['WARDEN_ASSIGN'] : []),
      ];
    }

    return [];
  }
}
