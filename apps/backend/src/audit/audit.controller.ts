import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { Roles } from '../auth/decorators/roles.decorator';

// Le journal d'audit (CDC §4.16) n'appartient qu'au Super Admin. Ce
// contrôleur était monté sans aucun garde : `DELETE /audit/:id` permettait
// à un anonyme d'effacer la trace de ses propres actions.
@ApiTags('Audit')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post()
  create(@Body() dto: CreateAuditLogDto) {
    return this.auditService.create(dto);
  }

  @Get()
  findAll() {
    return this.auditService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.auditService.remove(id);
  }
}
