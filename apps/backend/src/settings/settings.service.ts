import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { CreateSectorDto, UpdateSectorDto } from './dto/sector.dto';
import { CreateCountryDto, UpdateCountryDto } from './dto/country.dto';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Paramètres généraux de l'organisation (enregistrement unique) ---

  async getOrganizationSettings() {
    const existing = await this.prisma.organizationSettings.findFirst();

    if (existing) {
      return existing;
    }

    return this.prisma.organizationSettings.create({ data: {} });
  }

  async updateOrganizationSettings(dto: UpdateOrganizationSettingsDto) {
    const settings = await this.getOrganizationSettings();

    return this.prisma.organizationSettings.update({
      where: { id: settings.id },
      data: dto,
    });
  }

  /** Taux de TVA courant, utilisé par les modules Devis / BC / Factures. */
  async getVatRate(): Promise<number> {
    const settings = await this.getOrganizationSettings();
    return Number(settings.vatRate);
  }

  // --- Secteurs d'activité ---

  createSector(dto: CreateSectorDto) {
    return this.prisma.sector.create({ data: dto });
  }

  findAllSectors() {
    return this.prisma.sector.findMany({ orderBy: { name: 'asc' } });
  }

  async updateSector(id: string, dto: UpdateSectorDto) {
    await this.ensureSectorExists(id);
    return this.prisma.sector.update({ where: { id }, data: dto });
  }

  async removeSector(id: string) {
    await this.ensureSectorExists(id);
    return this.prisma.sector.delete({ where: { id } });
  }

  private async ensureSectorExists(id: string) {
    const sector = await this.prisma.sector.findUnique({ where: { id } });
    if (!sector) throw new NotFoundException('Secteur introuvable');
    return sector;
  }

  // --- Pays ---

  createCountry(dto: CreateCountryDto) {
    return this.prisma.country.create({
      data: { ...dto, code: dto.code.toUpperCase() },
    });
  }

  findAllCountries() {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' } });
  }

  async updateCountry(id: string, dto: UpdateCountryDto) {
    await this.ensureCountryExists(id);
    return this.prisma.country.update({
      where: { id },
      data: { ...dto, code: dto.code ? dto.code.toUpperCase() : undefined },
    });
  }

  async removeCountry(id: string) {
    await this.ensureCountryExists(id);
    return this.prisma.country.delete({ where: { id } });
  }

  private async ensureCountryExists(id: string) {
    const country = await this.prisma.country.findUnique({ where: { id } });
    if (!country) throw new NotFoundException('Pays introuvable');
    return country;
  }

  // --- Devises ---

  createCurrency(dto: CreateCurrencyDto) {
    return this.prisma.currency.create({
      data: { ...dto, code: dto.code.toUpperCase() },
    });
  }

  findAllCurrencies() {
    return this.prisma.currency.findMany({ orderBy: { code: 'asc' } });
  }

  async updateCurrency(id: string, dto: UpdateCurrencyDto) {
    await this.ensureCurrencyExists(id);
    return this.prisma.currency.update({ where: { id }, data: dto });
  }

  async removeCurrency(id: string) {
    await this.ensureCurrencyExists(id);
    return this.prisma.currency.delete({ where: { id } });
  }

  private async ensureCurrencyExists(id: string) {
    const currency = await this.prisma.currency.findUnique({ where: { id } });
    if (!currency) throw new NotFoundException('Devise introuvable');
    return currency;
  }
}
