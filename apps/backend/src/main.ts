import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.use(
    helmet({
      // Le frontend (SPA) est servi depuis une autre origine que l'API :
      // sans cela, les documents de /uploads seraient bloqués par le
      // Cross-Origin-Resource-Policy par défaut de Helmet.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // Les fichiers déposés (GED, pièces jointes de messagerie, ressources) NE
  // SONT PLUS servis en statique : contrats, factures et documents internes
  // étaient accessibles par simple URL, sans authentification. Les noms de
  // fichiers sont horodatés, donc devinables — ce n'était pas un secret.
  //
  // Ils passent désormais par GET /api/v1/files/:name, derrière JwtAuthGuard.

  app.enableCors({
    // getOrThrow plutôt que get : une variable oubliée fait échouer le
    // démarrage plutôt que d'ouvrir silencieusement l'API à toutes les origines.
    origin: config.getOrThrow<string>('FRONTEND_URL'),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
    }),
  );
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MAKOR CRM API')
    .setDescription('Enterprise CRM API')
    .setVersion('1.0')
    .addBearerAuth()
    // Les partenaires s'authentifient par clé, pas par JWT (CDC §5).
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // La documentation publie toute la surface d'API et les schémas de DTO :
  // utile en développement, inutile et bavard en production.
  if (config.get<string>('NODE_ENV') !== 'production') {
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(config.get('PORT') || 3000);

  console.log(`🚀 Server running on http://localhost:${config.get('PORT')}`);

  console.log(`📚 Swagger: http://localhost:${config.get('PORT')}/docs`);
}

bootstrap();
