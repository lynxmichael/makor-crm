import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PipelineStagesController } from './pipeline-stages.controller';
import { PipelineStagesService } from './pipeline-stages.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PipelineStagesController],
  providers: [PipelineStagesService],
  exports: [PipelineStagesService],
})
export class PipelineStagesModule {}
