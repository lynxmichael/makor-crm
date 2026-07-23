import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      users,
      customers,
      companies,
      products,
      offers,
      subscriptions,
      invoices,
      tickets,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.customer.count(),
      this.prisma.company.count(),
      this.prisma.product.count(),
      this.prisma.offer.count(),
      this.prisma.subscription.count(),
      this.prisma.invoice.count(),
      this.prisma.ticket.count(),
    ]);

    return {
      users,
      customers,
      companies,
      products,
      offers,
      subscriptions,
      invoices,
      tickets,
    };
  }
}
