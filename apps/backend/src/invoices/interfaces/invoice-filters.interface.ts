import { InvoiceStatus } from '@prisma/client';

export interface InvoiceFilters {
  page: number;
  limit: number;

  search?: string;

  customerId?: string;

  status?: InvoiceStatus;

  startDate?: Date;

  endDate?: Date;
}
