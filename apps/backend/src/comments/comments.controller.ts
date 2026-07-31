import {
  Body,
  Controller,
  Delete,
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

import { CommentsService } from './comments.service';

import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { FilterCommentDto } from './dto/filter-comment.dto';

/**
 * `JwtStrategy.validate` renvoie l'utilisateur complet, donc `role` est un
 * objet et non une chaîne. On l'aplatit ici plutôt que dans le service, qui
 * n'a besoin que du nom du rôle.
 */
type RequestUser = { id: string; role?: { name: string } };

const flatten = (user: RequestUser) => ({
  id: user.id,
  role: user.role?.name ?? '',
});

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Fil de commentaires d’une entité (entityId omis pour les portées globales comme DASHBOARD)',
  })
  findAll(@Query() filter: FilterCommentDto) {
    return this.commentsService.findAll(filter);
  }

  @Get('count')
  @ApiOperation({ summary: 'Nombre de commentaires, pour les pastilles d’onglet' })
  count(
    @Query('entityType') entityType: CommentEntity,
    @Query('entityId') entityId?: string,
  ) {
    return this.commentsService.countFor(entityType, entityId);
  }

  @Post()
  @ApiOperation({ summary: 'Publier un commentaire ou une réponse' })
  create(@Body() dto: CreateCommentDto, @CurrentUser() user: RequestUser) {
    return this.commentsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier son propre commentaire' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.commentsService.update(id, dto, flatten(user));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer son propre commentaire (ou modération Super Admin)' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.commentsService.remove(id, flatten(user));
  }
}
