import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

import { CommissionsController } from './commissions.controller';
import { CommissionsService } from './commissions.service';
import { WithdrawalsService } from './withdrawals.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CommissionsController],
  providers: [CommissionsService, WithdrawalsService],
  exports: [CommissionsService, WithdrawalsService],
})
export class CommissionsModule {}
