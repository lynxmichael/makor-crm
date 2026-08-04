import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SignableEntity } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { SignaturesService } from './signatures.service';
import { CreateSignatureRequestDto } from './dto/create-signature-request.dto';
import { SubmitSignatureDto, RefuseSignatureDto } from './dto/submit-signature.dto';

/** Administration des demandes — côté CRM, authentifié. */
@ApiTags('Signatures')
@ApiBearerAuth()
@Controller('signatures')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SignaturesController {
  constructor(private readonly signatures: SignaturesService) {}

  @Get()
  @ApiOperation({ summary: 'Demandes de signature, filtrables par pièce' })
  findAll(
    @Query('entityType') entityType?: SignableEntity,
    @Query('entityId') entityId?: string,
  ) {
    return this.signatures.findAll(entityType, entityId);
  }

  @Get(':id/proof')
  @ApiOperation({ summary: 'Certificat de preuve d’une signature' })
  proof(@Param('id') id: string) {
    return this.signatures.proof(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Envoyer un document à signer' })
  create(@Body() dto: CreateSignatureRequestDto, @CurrentUser() user: { id: string }) {
    return this.signatures.create(dto, user.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Annuler une demande en attente' })
  cancel(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.signatures.cancel(id, user.id);
  }
}

/**
 * Parcours du signataire — routes PUBLIQUES, volontairement hors de tout
 * guard : un client n'a pas de compte sur le CRM. L'accès est porté par le
 * jeton, long et aléatoire, transmis uniquement par e-mail.
 */
@ApiTags('Signature (public)')
@Controller('sign')
export class PublicSignatureController {
  constructor(private readonly signatures: SignaturesService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Ouvrir le document à signer' })
  open(@Param('token') token: string) {
    return this.signatures.openByToken(token);
  }

  @Get(':token/document')
  @ApiOperation({ summary: 'Télécharger le PDF présenté' })
  async document(@Param('token') token: string, @Res() res: Response) {
    const { buffer, name } = await this.signatures.documentByToken(token);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${name}.pdf"`);
    res.send(buffer);
  }

  @Post(':token')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Apposer sa signature' })
  sign(
    @Param('token') token: string,
    @Body() dto: SubmitSignatureDto,
    @Ip() ip: string,
    @Req() request: { headers: Record<string, string | undefined> },
  ) {
    return this.signatures.sign(token, dto, ip, request.headers['user-agent']);
  }

  @Post(':token/refuse')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({ summary: 'Refuser de signer, avec motif' })
  refuse(
    @Param('token') token: string,
    @Body() dto: RefuseSignatureDto,
    @Ip() ip: string,
  ) {
    return this.signatures.refuse(token, dto.reason, ip);
  }
}
