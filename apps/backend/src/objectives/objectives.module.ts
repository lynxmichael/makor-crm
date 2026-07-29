import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { ObjectivesController } from './objectives.controller';
import { ObjectivesService } from './objectives.service';

@Module({
  imports: [PrismaModule],

  controllers: [ObjectivesController],

  providers: [ObjectivesService],

  exports: [ObjectivesService],
})
export class ObjectivesModule {}
