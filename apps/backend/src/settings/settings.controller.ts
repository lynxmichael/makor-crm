import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { SettingsService } from './settings.service';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { CreateSectorDto, UpdateSectorDto } from './dto/sector.dto';
import { CreateCountryDto, UpdateCountryDto } from './dto/country.dto';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto';

/**
 * Module "Paramètres système" (CDC §4.5) : secteurs d'activité, pays,
 * devises et taux de TVA. Lecture ouverte à tout utilisateur connecté
 * (utilisée pour peupler les listes déroulantes du front), écriture
 * réservée au Super Admin.
 */
@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('organization')
  getOrganization() {
    return this.settingsService.getOrganizationSettings();
  }

  @Patch('organization')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  updateOrganization(@Body() dto: UpdateOrganizationSettingsDto) {
    return this.settingsService.updateOrganizationSettings(dto);
  }

  @Get('sectors')
  findAllSectors() {
    return this.settingsService.findAllSectors();
  }

  @Post('sectors')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  createSector(@Body() dto: CreateSectorDto) {
    return this.settingsService.createSector(dto);
  }

  @Patch('sectors/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  updateSector(@Param('id') id: string, @Body() dto: UpdateSectorDto) {
    return this.settingsService.updateSector(id, dto);
  }

  @Delete('sectors/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  removeSector(@Param('id') id: string) {
    return this.settingsService.removeSector(id);
  }

  @Get('countries')
  findAllCountries() {
    return this.settingsService.findAllCountries();
  }

  @Post('countries')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  createCountry(@Body() dto: CreateCountryDto) {
    return this.settingsService.createCountry(dto);
  }

  @Patch('countries/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  updateCountry(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.settingsService.updateCountry(id, dto);
  }

  @Delete('countries/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  removeCountry(@Param('id') id: string) {
    return this.settingsService.removeCountry(id);
  }

  @Get('currencies')
  findAllCurrencies() {
    return this.settingsService.findAllCurrencies();
  }

  @Post('currencies')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  createCurrency(@Body() dto: CreateCurrencyDto) {
    return this.settingsService.createCurrency(dto);
  }

  @Patch('currencies/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  updateCurrency(@Param('id') id: string, @Body() dto: UpdateCurrencyDto) {
    return this.settingsService.updateCurrency(id, dto);
  }

  @Delete('currencies/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  removeCurrency(@Param('id') id: string) {
    return this.settingsService.removeCurrency(id);
  }
}
