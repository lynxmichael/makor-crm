import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { ResourcesService } from './resources.service';

import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { FilterResourceDto } from './dto/filter-resource.dto';

type RequestUser = { id: string; role?: { name: string } };

/** Seul le Super Admin voit et manipule les brouillons. */
const canSeeDrafts = (user: RequestUser) => user.role?.name === 'SUPER_ADMIN';

const UPLOAD = FileInterceptor('file', {
  storage: diskStorage({
    destination: './uploads',
    filename(_req, file, cb) {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1000000);
      cb(null, unique + extname(file.originalname));
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/**
 * Espace Ressources (demande du 31/07/2026) — formation et documentation.
 *
 * Lecture ouverte à tout agent authentifié : c'est le principe même de
 * l'espace. Écriture réservée au Super Admin, la garde de rôle étant posée
 * route par route plutôt que sur la classe.
 */
@ApiTags('Ressources')
@ApiBearerAuth()
@Controller('resources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'Ressources publiées, groupées par module' })
  findAll(@Query() filter: FilterResourceDto, @CurrentUser() user: RequestUser) {
    return this.resourcesService.findAll(filter, canSeeDrafts(user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une ressource' })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.resourcesService.findOne(id, canSeeDrafts(user));
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Comptabiliser une consultation' })
  registerView(@Param('id') id: string) {
    return this.resourcesService.registerView(id);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Publier une ressource' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(UPLOAD)
  create(
    @Body() dto: CreateResourceDto,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.resourcesService.create(
      dto,
      user.id,
      file ? { path: file.filename, name: file.originalname, size: file.size } : undefined,
    );
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Modifier une ressource' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(UPLOAD)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateResourceDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.resourcesService.update(
      id,
      dto,
      file ? { path: file.filename, name: file.originalname, size: file.size } : undefined,
    );
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Supprimer une ressource' })
  remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }
}
