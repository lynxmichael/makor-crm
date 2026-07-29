import { Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],

  controllers: [PaymentsController],

  providers: [PaymentsService],

  exports: [PaymentsService],
})
export class PaymentsModule {}
