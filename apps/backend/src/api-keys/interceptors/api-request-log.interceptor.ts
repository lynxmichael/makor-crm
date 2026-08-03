import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { PrismaService } from '../../prisma/prisma.service';

/**
 * Journalisation des appels partenaires.
 *
 * Distincte du journal d'audit, qui trace les actions humaines : ici le
 * volume est d'un autre ordre et les usages diffèrent — diagnostic
 * d'intégration, détection d'abus, rapprochement de facturation.
 *
 * L'écriture est délibérément hors du chemin de réponse : un incident sur
 * la table de journal ne doit jamais faire échouer l'envoi d'un partenaire.
 */
@Injectable()
export class ApiRequestLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startedAt = Date.now();

    const write = (status: number, errorCode?: string) => {
      const apiKeyId = request.apiKey?.id;
      if (!apiKeyId) return;

      void this.prisma.apiRequest
        .create({
          data: {
            apiKeyId,
            method: request.method,
            path: request.route?.path ?? request.url,
            status,
            durationMs: Date.now() - startedAt,
            ipAddress: request.ip ?? null,
            errorCode: errorCode ?? null,
          },
        })
        .catch(() => undefined);
    };

    return next.handle().pipe(
      tap(() => write(response.statusCode ?? 200)),
      catchError((error) => {
        write(error?.status ?? 500, error?.name);
        return throwError(() => error);
      }),
    );
  }
}
