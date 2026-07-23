import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { InvoiceStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class DashboardService {

  constructor(private readonly prisma: PrismaService) {}

  async overview() {
      const [

      users,

      customers,

      leads,

      deals,

      products,

      invoices,

      contracts,

      quotes,

      payments,

      tickets,

    ] = await Promise.all([

      this.prisma.user.count(),

      this.prisma.customer.count(),

      this.prisma.lead.count(),

      this.prisma.deal.count(),

      this.prisma.product.count(),

      this.prisma.invoice.count(),

      this.prisma.contract.count(),

      this.prisma.quote.count(),

      this.prisma.payment.count(),

      this.prisma.ticket.count(),

    ]);

    return {

      users,

      customers,

      leads,

      deals,

      products,

      invoices,

      contracts,

      quotes,

      payments,

      tickets,

    };
  }

  async finance() {

    const paidInvoices =
      await this.prisma.invoice.findMany({

        where: {
          status: InvoiceStatus.PAID,
        },

      });

    const revenue =
      paidInvoices.reduce(

        (sum, invoice) =>
          sum + Number(invoice.total),

        0,

      );

    const payments =
      await this.prisma.payment.findMany({

        where: {
          status: PaymentStatus.SUCCESS,
        },

      });

    const received =
      payments.reduce(

        (sum, payment) =>
          sum + Number(payment.amount),

        0,

      );

    return {

      revenue,

      received,

      balance:
        revenue - received,

    };
  }

  async crm() {

    return {

      leads:
        await this.prisma.lead.count(),

      customers:
        await this.prisma.customer.count(),

      deals:
        await this.prisma.deal.count(),

      quotes:
        await this.prisma.quote.count(),

      contracts:
        await this.prisma.contract.count(),

    };

  }

  async sales() {

    const invoices =
      await this.prisma.invoice.findMany();

    const monthly = {};

    invoices.forEach(invoice => {

      const month = invoice.createdAt
        .toISOString()
        .substring(0,7);

      monthly[month] ??= 0;

      monthly[month] + 
      Number(invoice.total);

    });

    return monthly;
  }

}
