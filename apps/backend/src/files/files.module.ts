import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { FilesController } from './files.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FilesController],
})
export class FilesModule {}
