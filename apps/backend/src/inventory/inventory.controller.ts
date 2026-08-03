import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import {
  Controller,
  UseGuards,
} from '@nestjs/common';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {}
