import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { DirectoryService } from './directory.service';
import { DirectoryImportService } from './directory-import.service';
import { CreateDirectoryEntryDto } from './dto/create-entry.dto';

/**
 * Annuaire unifié — contacts clients et prospects (demande du 05/08/2026).
 *
 * Accessible à tout agent connecté, conformément à la demande : c'est un
 * répertoire partagé, pas un portefeuille. Chacun peut donc y retrouver un
 * interlocuteur même s'il n'en a pas la charge.
 */
@ApiTags('Annuaire')
@ApiBearerAuth()
@Controller('directory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
export class DirectoryController {
  constructor(
    private readonly directory: DirectoryService,
    private readonly importer: DirectoryImportService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Contacts et prospects, filtrables par pays' })
  findAll(
    @Query('search') search?: string,
    @Query('country') country?: string,
    @Query('kind') kind?: 'CONTACT' | 'LEAD',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.directory.findAll({
      search,
      country,
      kind,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('countries')
  @ApiOperation({ summary: 'Pays représentés, avec le nombre d’entrées' })
  countries() {
    return this.directory.countries();
  }

  @Post()
  @ApiOperation({ summary: 'Créer un contact ou un prospect depuis l’annuaire' })
  create(@Body() dto: CreateDirectoryEntryDto, @CurrentUser() user: { id: string }) {
    // L'auteur devient chargé du contact : sans affectation, la fiche
    // n'apparaît dans le portefeuille de personne.
    return this.directory.create(dto, user.id);
  }

  @Delete(':kind/:id')
  @ApiOperation({ summary: 'Supprimer une entrée de l’annuaire' })
  remove(@Param('kind') kind: 'CONTACT' | 'LEAD', @Param('id') id: string) {
    return this.directory.remove(kind, id);
  }

  @Post('import')
  @ApiOperation({
    summary:
      'Importer un fichier .xlsx ou .csv — prospects par défaut, contacts si customerId est fourni',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      // En mémoire : le fichier est lu puis jeté, rien à conserver sur disque.
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  import(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { customerId?: string; assignedToId?: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.importer.importFile(
      file,
      { customerId: body.customerId, assignedToId: body.assignedToId },
      user.id,
    );
  }
}
