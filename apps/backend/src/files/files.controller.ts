import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';
import { existsSync, createReadStream } from 'fs';
import { basename, join } from 'path';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Service des fichiers déposés, derrière authentification.
 *
 * Remplace le montage statique de `/uploads`, qui exposait contrats, factures
 * et pièces jointes internes à quiconque connaissait — ou devinait — le nom du
 * fichier. Les noms étant construits sur un horodatage, l'espace de recherche
 * était étroit : ce n'était pas un secret, seulement une obscurité.
 */
@ApiTags('Fichiers')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  private readonly root = join(process.cwd(), 'uploads');

  @Get(':name')
  @ApiOperation({ summary: 'Télécharger un fichier déposé (authentification requise)' })
  download(@Param('name') name: string, @Res() res: Response) {
    // `basename` neutralise toute tentative de remontée d'arborescence :
    // « ../../.env » se réduit à « .env », qui n'existe pas dans /uploads.
    const safe = basename(name);

    if (safe !== name) {
      throw new ForbiddenException('Nom de fichier invalide.');
    }

    const path = join(this.root, safe);

    if (!existsSync(path)) {
      throw new NotFoundException('Fichier introuvable.');
    }

    createReadStream(path).pipe(res);
  }
}
