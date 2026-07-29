import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { RechargesController } from './recharges.controller';
import { RechargesService } from './recharges.service';

@Module({
  imports: [PrismaModule],

  controllers: [RechargesController],

  providers: [RechargesService],

  exports: [RechargesService],
})
export class RechargesModule {}
