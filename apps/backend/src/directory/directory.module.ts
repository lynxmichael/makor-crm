import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

import { DirectoryController } from './directory.controller';
import { DirectoryService } from './directory.service';
import { DirectoryImportService } from './directory-import.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [DirectoryController],
  providers: [DirectoryService, DirectoryImportService],
  exports: [DirectoryService],
})
export class DirectoryModule {}
