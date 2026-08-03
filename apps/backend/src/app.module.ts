import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolePermissionsModule } from './role-permissions/role-permissions.module';
import { DepartmentsModule } from './departments/departments.module';
import { SettingsModule } from './settings/settings.module';
import { CustomersModule } from './customers/customers.module';
import { ContactsModule } from './contacts/contacts.module';
import { LeadsModule } from './leads/leads.module';
import { PipelineStagesModule } from './pipeline-stages/pipeline-stages.module';
import { DealsModule } from './deals/deals.module';
import { ActivitiesModule } from './activities/activities.module';
import { ProductsModule } from './products/products.module';
import { QuotesModule } from './quotes/quotes.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { ContractsModule } from './contracts/contracts.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { RechargesModule } from './recharges/recharges.module';
import { SenderIdModule } from './sender-id/sender-id.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { DocumentsModule } from './documents/documents.module';
import { ObjectivesModule } from './objectives/objectives.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportingModule } from './reporting/reporting.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { CommonModule } from './common/common.module';
import { CommentsModule } from './comments/comments.module';
import { MessagesModule } from './messages/messages.module';
import { AiModule } from './ai/ai.module';
import { ResourcesModule } from './resources/resources.module';
import { FilesModule } from './files/files.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { SignaturesModule } from './signatures/signatures.module';
import { CommissionsModule } from './commissions/commissions.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ScoringModule } from './scoring/scoring.module';
import { CommunicationsModule } from './communications/communications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    // Limite globale par défaut (protection anti-bruteforce / anti-abus,
    // complémentaire au verrouillage de compte déjà géré par AuthService) —
    // des limites plus strictes sont appliquées par endpoint via @Throttle().
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),

    PrismaModule,
    QueueModule,
    CommonModule,
    CommentsModule,
    MessagesModule,
    AiModule,
    ResourcesModule,
    FilesModule,
    ApiKeysModule,
    SignaturesModule,
    CommissionsModule,
    WorkflowsModule,
    ScoringModule,
    CommunicationsModule,

    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    RolePermissionsModule,
    DepartmentsModule,
    SettingsModule,

    CustomersModule,
    ContactsModule,
    LeadsModule,
    PipelineStagesModule,
    DealsModule,
    ActivitiesModule,

    ProductsModule,
    QuotesModule,
    PurchaseOrdersModule,
    ContractsModule,
    InvoicesModule,
    PaymentsModule,
    RechargesModule,
    SenderIdModule,

    CampaignsModule,
    DocumentsModule,
    ObjectivesModule,

    DashboardModule,
    ReportingModule,
    SearchModule,

    NotificationsModule,
    RealtimeModule,
    AuditModule,
    MailModule,

    HealthModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
