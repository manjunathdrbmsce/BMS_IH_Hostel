import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionsGuard, Reflector],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockContext = (user?: { permissions: string[] }): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('should allow when no permissions required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ permissions: [] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow when user has all required permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER_CREATE', 'USER_READ']);
    const context = createMockContext({ permissions: ['USER_CREATE', 'USER_READ', 'USER_DELETE'] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny when user lacks a required permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER_CREATE', 'USER_DELETE']);
    const context = createMockContext({ permissions: ['USER_CREATE'] });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
