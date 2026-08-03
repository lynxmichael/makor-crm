import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import {
  Controller,
  UseGuards,
} from '@nestjs/common';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {}
