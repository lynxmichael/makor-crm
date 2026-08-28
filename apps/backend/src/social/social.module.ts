import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { SocialController } from './social.controller';
import { MetaWebhookController } from './meta-webhook.controller';
import { SocialService } from './social.service';

@Module({
  imports: [PrismaModule],
  controllers: [SocialController, MetaWebhookController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
