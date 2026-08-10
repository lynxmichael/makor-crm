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

  // Documents déposés via la GED (CDC §4.13) — servis en dehors du
  // préfixe /api/v1, à l'extérieur de tout guard applicatif : le lien
  // renvoyé par l'API n'est exploitable que par qui le connaît déjà.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  app.enableCors({
    origin: config.get('FRONTEND_URL'),
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
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, document);

  await app.listen(config.get('PORT') || 3000);

  console.log(`🚀 Server running on http://localhost:${config.get('PORT')}`);

  console.log(`📚 Swagger: http://localhost:${config.get('PORT')}/docs`);
}

void bootstrap();
