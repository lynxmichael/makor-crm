import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

import { HealthService } from './health.service';
import { Public } from '../auth/decorators/public.decorator';

// La sonde doit rester joignable sans jeton : c'est elle que le
// superviseur d'infrastructure interroge, et un 401 y serait interprété
// comme un service en panne.
@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.healthService.checkDatabase(),
      () => this.healthService.checkRedis(),
    ]);
  }
}
