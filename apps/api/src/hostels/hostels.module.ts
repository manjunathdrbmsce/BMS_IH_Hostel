import { Module } from '@nestjs/common';
import { HostelsController } from './hostels.controller';
import { HostelsService } from './hostels.service';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [HostelsController, RoomsController],
  providers: [HostelsService, RoomsService],
  exports: [HostelsService, RoomsService],
})
export class HostelsModule {}
