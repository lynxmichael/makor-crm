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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { ContactsService } from './contacts.service';

import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({
    summary: 'Créer un contact',
  })
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Liste des contacts',
  })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.contactsService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      customerId,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Détail d’un contact',
  })
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({
    summary: 'Modifier un contact',
  })
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR', 'COMMERCIAL')
  @ApiOperation({
    summary: 'Supprimer un contact',
  })
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
