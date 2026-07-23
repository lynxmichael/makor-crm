import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("overview")
  @ApiOperation({
    summary: "Vue générale"
  })
  overview() {
    return this.dashboardService.overview();
  }

  @Get("sales")
  @ApiOperation({
    summary: "Statistiques ventes"
  })
  sales() {
    return this.dashboardService.sales();
  }

  @Get("crm")
  @ApiOperation({
    summary: "Statistiques CRM"
  })
  crm() {
    return this.dashboardService.crm();
  }

  @Get("finance")
  @ApiOperation({
    summary: "Statistiques financières"
  })
  finance() {
    return this.dashboardService.finance();
  }
}
