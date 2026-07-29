import { Module } from '@nestjs/common';

import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],

  controllers: [ActivitiesController],

  providers: [ActivitiesService],

  exports: [ActivitiesService],
})
export class ActivitiesModule {}
