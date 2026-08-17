import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { DocumentEventType } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { diskStorage } from 'multer';

import { extname } from 'path';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { DocumentsService } from './documents.service';

import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) {}

  @Post('upload')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL', 'MANAGER')
  @ApiOperation({ summary: 'Déposer un document (GED)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',

        filename(req, file, cb) {
          const unique = Date.now() +
            '-' +
            Math.round(Math.random() * 1000000);

          cb(null, unique + extname(file.originalname));
        },
      }),

      limits: {
        // 20 Mo — cohérent avec les pièces jointes commerciales usuelles
        fileSize: 20 * 1024 * 1024,
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: { id: string },
  ) {
    // Le déposant est celui qui est authentifié, quoi qu'annonce le corps.
    return this.documentsService.upload(file, { ...dto, uploadedById: user.id });
  }

  @Get()
  @ApiOperation({ summary: 'Liste des documents, filtrable par fiche liée' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('customerId') customerId?: string,
    @Query('dealId') dealId?: string,
    @Query('quoteId') quoteId?: string,
    @Query('contractId') contractId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.documentsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      type,
      customerId,
      dealId,
      quoteId,
      contractId,
      scopeToUserId: user?.role?.name === 'COMMERCIAL' ? user.id : undefined,
    });
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Statistiques de consultation d’un document' })
  stats(@Param('id') id: string) {
    return this.documentsService.stats(id);
  }

  @Post(':id/track')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL', 'MANAGER')
  @ApiOperation({ summary: 'Enregistrer une consultation, un téléchargement ou un envoi' })
  track(
    @Param('id') id: string,
    @Body() body: { type: DocumentEventType },
    @CurrentUser() user: { id: string },
    @Req() request: { ip?: string; headers: Record<string, unknown> },
  ) {
    return this.documentsService.trackEvent(id, body.type, {
      userId: user?.id,
      ipAddress: request.ip,
      userAgent: String(request.headers['user-agent'] ?? ''),
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL', 'MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL', 'MANAGER')
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
