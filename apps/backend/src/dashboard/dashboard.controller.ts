import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { DashboardService, DashboardFilters } from './dashboard.service';

/**
 * Un tableau de bord par profil (CDC §4.1) : chaque endpoint ne fait
 * autorité que sur le périmètre autorisé au rôle qui l'appelle. Filtres
 * communs par période / pays / secteur / produit.
 */
@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  private filters(
    from?: string,
    to?: string,
    country?: string,
    sector?: string,
    productId?: string,
  ): DashboardFilters {
    return { from, to, country, sector, productId };
  }

  @Get('super-admin')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Tableau de bord consolidé (Super Admin)',
  })
  superAdmin(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('country') country?: string,
    @Query('sector') sector?: string,
    @Query('productId') productId?: string,
  ) {
    return this.dashboardService.superAdmin(
      this.filters(from, to, country, sector, productId),
    );
  }

  @Get('sales-admin')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES')
  @ApiOperation({
    summary: 'Volumes, marges, CA et qualité du pipeline (Admin ventes)',
  })
  salesAdmin(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('country') country?: string,
    @Query('sector') sector?: string,
    @Query('productId') productId?: string,
  ) {
    return this.dashboardService.salesAdmin(
      this.filters(from, to, country, sector, productId),
    );
  }

  @Get('supervisor')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN_VENTES', 'SUPERVISEUR')
  @ApiOperation({
    summary: 'Statistiques par commercial (Superviseur)',
  })
  supervisor(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.dashboardService.supervisor(
      this.filters(from, to),
      departmentId,
    );
  }

  @Get('my-portfolio')
  @ApiOperation({
    summary: 'Portefeuille, pipeline et agenda du commercial connecté',
  })
  myPortfolio(@CurrentUser() user: { id: string }) {
    return this.dashboardService.myPortfolio(user.id);
  }

  // Le chemin reste `manager` : le renommage du rôle en FINANCE (D16) ne
  // justifie pas une rupture d'API.
  @Get('manager')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'FINANCE')
  @ApiOperation({
    summary: 'Factures envoyées et encaissements (Finance)',
  })
  manager(@Query('from') from?: string, @Query('to') to?: string) {
    return this.dashboardService.manager(this.filters(from, to));
  }
}
