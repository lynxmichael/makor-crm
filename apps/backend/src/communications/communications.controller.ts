import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CommunicationsService } from './communications.service';

@ApiTags('Communications')
@ApiBearerAuth()
@Controller('communications')
@UseGuards(JwtAuthGuard)
export class CommunicationsController {
  constructor(private readonly communications: CommunicationsService) {}

  @Get('customers/:customerId/timeline')
  @ApiOperation({
    summary:
      'Fil unifié des échanges avec un client — hors e-mails entrants, non encore captés',
  })
  timeline(@Param('customerId') customerId: string, @Query('limit') limit?: string) {
    return this.communications.customerTimeline(customerId, limit ? Number(limit) : 100);
  }
}
