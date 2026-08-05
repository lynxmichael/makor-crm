import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

// Bannière de l'API : nom, lien vers la documentation et vers la sonde.
// Aucune donnée métier, et c'est le premier point d'entrée qu'on interroge
// pour vérifier qu'un déploiement répond.
@ApiTags('Root')
@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getInfo() {
    return this.appService.getInfo();
  }
}
