import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Logger,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';
import { existsSync, createReadStream, statSync } from 'fs';
import { basename, extname, join } from 'path';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

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
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get(':name')
  @ApiOperation({ summary: 'Télécharger un fichier déposé (authentification requise)' })
  download(
    @Param('name') name: string,
    @Res() res: Response,
    @Query('download') download?: string,
    @Req() request?: any,
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

    // Consultation enregistrée ici plutôt que depuis l'interface : c'est le
    // seul point de passage obligé. Un appel côté client pourrait être omis,
    // rejoué, ou contourné en visitant l'URL directement.
    void this.track(safe, download === '1', request);

    createReadStream(path).pipe(res);
  }

  /**
   * Journalise l'accès, si le fichier correspond à un document de la GED.
   *
   * Les pièces jointes de messagerie et les ressources partagent le même
   * dossier sans être des documents : l'absence de correspondance n'est donc
   * pas une anomalie, on ne journalise rien.
   *
   * L'écriture ne bloque pas le flux : un échec de suivi ne doit pas empêcher
   * la lecture du fichier.
   */
  private async track(
    fileName: string,
    isDownload: boolean,
    request: { user?: { id?: string }; ip?: string; headers: Record<string, unknown> },
  ): Promise<void> {
    try {
      const document = await this.prisma.document.findFirst({
        where: { fileName },
        select: { id: true },
      });

      if (!document) return;

      await this.prisma.documentEvent.create({
        data: {
          documentId: document.id,
          // Trois types pour trois gestes : le client destinataire n'a pas de
          // session, ses accès sont donc les seuls sans `userId` — c'est ce
          // qui alimente `firstClientAccessAt`. Un agent qui ouvre l'aperçu
          // depuis le CRM est compté en PREVIEWED, un accès sans session en
          // VIEWED.
          type: isDownload
            ? 'DOWNLOADED'
            : request.user?.id
              ? 'PREVIEWED'
              : 'VIEWED',
          userId: request.user?.id ?? null,
          ipAddress: request.ip ?? null,
          userAgent: String(request.headers['user-agent'] ?? ''),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Suivi de consultation impossible pour ${fileName} : ${
          error instanceof Error ? error.message : 'erreur inconnue'
        }`,
      );
    }
  }
}
