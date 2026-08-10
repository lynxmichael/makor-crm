import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { CAMPAIGNS_QUEUE } from '../queue/queue.module';
import { SMS_WHATSAPP_GATEWAY } from '../common/gateway/gateway-adapter.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

import { CampaignsService } from './campaigns.service';

describe('CampaignsService', () => {
  let service: CampaignsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: {} },
        {
          provide: getQueueToken(CAMPAIGNS_QUEUE),
          useValue: { add: jest.fn() },
        },
        { provide: SMS_WHATSAPP_GATEWAY, useValue: { send: jest.fn() } },
        { provide: NotificationsService, useValue: {} },
        { provide: AuditService, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
