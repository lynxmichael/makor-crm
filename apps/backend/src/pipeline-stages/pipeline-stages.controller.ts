import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { PipelineStagesService } from './pipeline-stages.service';
import { CreatePipelineStageDto, UpdatePipelineStageDto } from './dto/pipeline-stage.dto';

@ApiTags('Pipeline Stages')
@ApiBearerAuth()
@Controller('pipeline-stages')
@UseGuards(JwtAuthGuard)
export class PipelineStagesController {
  constructor(private readonly pipelineStagesService: PipelineStagesService) {}

  @Get()
  findAll() {
    return this.pipelineStagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pipelineStagesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  create(@Body() dto: CreatePipelineStageDto) {
    return this.pipelineStagesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdatePipelineStageDto) {
    return this.pipelineStagesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.pipelineStagesService.remove(id);
  }
}
