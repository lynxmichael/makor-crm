import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PipelineStagesModule } from '../pipeline-stages/pipeline-stages.module';
import { AuditModule } from '../audit/audit.module';

import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';

@Module({
  imports: [PrismaModule, PipelineStagesModule, AuditModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
