import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { RolesController } from './roles.controller';
import { SuperAdminPermissionsController } from './super-admin-permissions.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, RolesController, SuperAdminPermissionsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
