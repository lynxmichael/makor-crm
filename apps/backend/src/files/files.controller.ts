import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';
import { existsSync, createReadStream, statSync } from 'fs';
import { basename, extname, join } from 'path';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Types servis en aperçu. Volontairement restreint : un fichier inconnu part
 * en `application/octet-stream`, donc en téléchargement. Déclarer un type
 * pour du HTML ou du SVG permettrait d'exécuter du script depuis notre
 * domaine, avec la session de l'utilisateur.
 */
const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
};

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
  download(
    @Param('name') name: string,
    @Res() res: Response,
    @Query('download') download?: string,
  ) {
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

    // Sans en-tête de type, le navigateur ne sait pas quoi faire du flux et
    // le télécharge systématiquement — impossible d'afficher un PDF ou une
    // image dans un onglet. Le type se déduit de l'extension.
    const mime = MIME_TYPES[extname(safe).toLowerCase()] ?? 'application/octet-stream';

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', statSync(path).size);

    // `inline` propose l'aperçu, `attachment` force l'enregistrement. Le
    // client choisit via ?download=1 — un même fichier doit pouvoir être
    // consulté puis conservé.
    res.setHeader(
      'Content-Disposition',
      `${download === '1' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(safe)}"`,
    );

    createReadStream(path).pipe(res);
  }
}
