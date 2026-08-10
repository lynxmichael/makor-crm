import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { CAMPAIGNS_QUEUE } from '../queue/queue.module';
import { CampaignsService } from './campaigns.service';

/**
 * Worker BullMQ traitant l'envoi technique des campagnes en tâche de
 * fond (CDC §2.1, §8.1). `attempts`/`backoff` sont configurés côté
 * producteur (`CampaignsService.send`) pour la reprise automatique en
 * cas d'échec temporaire de la passerelle (CDC §8.3).
 */
@Processor(CAMPAIGNS_QUEUE)
export class CampaignsProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignsProcessor.name);

  constructor(private readonly campaignsService: CampaignsService) {
    super();
  }

  async process(job: Job<{ campaignId: string }>): Promise<void> {
    this.logger.log(
      `Traitement de la campagne ${job.data.campaignId} (job ${job.id})`,
    );
    await this.campaignsService.processCampaign(job.data.campaignId);
  }
}
