export interface InvoiceStats {
  totalInvoices: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  cancelled: number;

  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
}
