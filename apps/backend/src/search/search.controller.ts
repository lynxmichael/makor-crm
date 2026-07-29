import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Recherche globale (clients, prospects, opportunités, devis, contrats, factures, documents)' })
  search(@Query('q') q: string, @Query('limit') limit = 5) {
    return this.searchService.globalSearch(q, Number(limit));
  }
}
