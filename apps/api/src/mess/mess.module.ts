import { Module } from '@nestjs/common';
import { MessController } from './mess.controller';
import { MessScanController } from './mess-scan.controller';
import { MessRebateController } from './mess-rebate.controller';
import { MessService } from './mess.service';
import { MessScanService } from './mess-scan.service';
import { MessRebateService } from './mess-rebate.service';

@Module({
  controllers: [MessController, MessScanController, MessRebateController],
  providers: [MessService, MessScanService, MessRebateService],
  exports: [MessRebateService],
})
export class MessModule {}
