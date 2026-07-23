import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { CustomersModule } from './customers/customers.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { OffersModule } from './offers/offers.module';
import { TicketsModule } from './tickets/tickets.module';
import { PaymentsModule } from './payments/payments.module';
import { DevicesModule } from './devices/devices.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { InterventionsModule } from './interventions/interventions.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { DocumentsModule } from './documents/documents.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { CompanyModule } from './company/company.module';
import { CompaniesModule } from './companies/companies.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ProductsModule } from './products/products.module';
import { ContactsModule } from './contacts/contacts.module';
import { LeadsModule } from './leads/leads.module';
import { DealsModule } from './deals/deals.module';
import { ActivitiesModule } from './activities/activities.module';
import { QuotesModule } from './quotes/quotes.module';
import { ContractsModule } from './contracts/contracts.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,

    AuthModule,

    UsersModule,
    MailModule,

    RolesModule,

    PermissionsModule,

    CustomersModule,

    SubscriptionsModule,

    OffersModule,

    TicketsModule,

    PaymentsModule,

    DevicesModule,

    WarehousesModule,

    InterventionsModule,

    CampaignsModule,

    DocumentsModule,

    DashboardModule,

    NotificationsModule,

    AuditModule,

    HealthModule,
    CompanyModule,
    CompaniesModule,
    InvoicesModule,
    ProductsModule,
    ContactsModule,
    LeadsModule,
    DealsModule,
    ActivitiesModule,
    QuotesModule,
    ContractsModule,
  ],
})
export class AppModule {}
