import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentEntity } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { AiService } from './ai.service';
import { GenerateDto } from './dto/generate.dto';
import { AcceptGenerationDto } from './dto/accept-generation.dto';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('status')
  @ApiOperation({
    summary:
      'Disponibilité de la génération assistée — permet au frontend de masquer les actions plutôt que de les faire échouer',
  })
  status() {
    return this.aiService.status();
  }

  @Post('generate')
  @ApiOperation({ summary: 'Proposer un texte pour un devis ou un contrat' })
  generate(@Body() dto: GenerateDto, @CurrentUser() user: { id: string }) {
    return this.aiService.generate(dto, user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Propositions déjà faites sur une entité' })
  history(
    @Query('entityType') entityType: CommentEntity,
    @Query('entityId') entityId: string,
  ) {
    return this.aiService.history(entityType, entityId);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Marquer une proposition comme retenue ou écartée' })
  accept(@Param('id') id: string, @Body() dto: AcceptGenerationDto) {
    return this.aiService.markAccepted(id, dto.accepted ?? true);
  }
}
