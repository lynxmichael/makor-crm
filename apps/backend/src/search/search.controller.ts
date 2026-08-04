import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Recherche globale (clients, prospects, opportunités, devis, contrats, factures, documents)' })
  search(
    @Query('q') q: string,
    @CurrentUser() user: any,
    @Query('limit') limit = 5,
  ) {
    // Sans ce périmètre, la recherche contournait le cloisonnement des
    // modules : taper un nom d'entreprise suffisait à voir le contrat d'un
    // collègue.
    const scope = user?.role?.name === 'COMMERCIAL' ? user.id : undefined;
    return this.searchService.globalSearch(q, Number(limit), scope);
  }
}
