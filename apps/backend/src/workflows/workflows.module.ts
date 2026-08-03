import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowEngineService } from './workflow-engine.service';

@Module({
  imports: [PrismaModule, AuditModule, MailModule, NotificationsModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowEngineService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
