import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';

import { PipelineStagesService } from './pipeline-stages.service';
import {
  CreatePipelineStageDto,
  QueryPipelineStagesDto,
  RemovePipelineStageDto,
  ReorderPipelineStagesDto,
  UpdatePipelineStageDto,
} from './dto/pipeline-stage.dto';

/**
 * `JwtAuthGuard` et `RolesGuard` sont globaux depuis l'étape 1 (D16) : la
 * lecture demande une session, l'écriture demande le Super Admin — la
 * configuration du pipeline est une décision d'administration (CDC §7).
 */
@ApiTags('Pipeline Stages')
@ApiBearerAuth()
@Controller('pipeline-stages')
export class PipelineStagesController {
  constructor(private readonly pipelineStagesService: PipelineStagesService) {}

  @Get()
  @ApiOperation({ summary: 'Étapes du pipeline, dans l’ordre d’affichage' })
  findAll(@Query() query: QueryPipelineStagesDto) {
    return this.pipelineStagesService.findAll(query.includeArchived ?? false);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pipelineStagesService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  create(@Body() dto: CreatePipelineStageDto, @Req() req: Request) {
    return this.pipelineStagesService.create(dto, this.userId(req));
  }

  /**
   * Déclaré avant `PATCH :id`, sinon « reorder » serait capturé comme un
   * identifiant d'étape.
   */
  @Patch('reorder')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Réécrit l’ordre complet du pipeline actif' })
  reorder(@Body() dto: ReorderPipelineStagesDto, @Req() req: Request) {
    return this.pipelineStagesService.reorder(dto, this.userId(req));
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePipelineStageDto,
    @Req() req: Request,
  ) {
    return this.pipelineStagesService.update(id, dto, this.userId(req));
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary:
      'Retire une étape — les opportunités partent vers destinationStageId',
  })
  remove(
    @Param('id') id: string,
    @Query() query: RemovePipelineStageDto,
    @Req() req: Request,
  ) {
    return this.pipelineStagesService.remove(
      id,
      query.destinationStageId,
      this.userId(req),
    );
  }

  private userId(req: Request): string | undefined {
    return req.user?.id;
  }
}
