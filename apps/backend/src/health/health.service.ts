import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  HealthIndicatorService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';

import Redis from 'ioredis';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Vérifie les dépendances critiques de l'application : base de données
 * (obligatoire au démarrage) et Redis (file d'attente des campagnes,
 * §2.1 du CDC). Utilisé par l'orchestrateur (Docker / Kubernetes) pour
 * les sondes readiness/liveness.
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly config: ConfigService,
  ) {}

  checkDatabase() {
    return this.prismaIndicator.pingCheck('database', this.prisma, {
      timeout: 3000,
    });
  }

  async checkRedis() {
    const indicator = this.healthIndicatorService.check('redis');

    const redis = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
    });

    try {
      await redis.connect();
      await redis.ping();
      return indicator.up();
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    } finally {
      redis.disconnect();
    }
  }
}
