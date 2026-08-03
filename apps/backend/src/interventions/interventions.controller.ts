import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import {
  Controller,
  UseGuards,
} from '@nestjs/common';

@Controller('interventions')
@UseGuards(JwtAuthGuard)
export class InterventionsController {}
