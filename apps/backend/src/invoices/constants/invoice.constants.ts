import { InvoiceStatus } from '@prisma/client';
export const INVOICE_STATUS = {
  DRAFT: InvoiceStatus.DRAFT,
  SENT: InvoiceStatus.SENT,
  PAID: InvoiceStatus.PAID,
  CANCELLED: InvoiceStatus.CANCELLED,
};

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE_INVOICE',
  UPDATE: 'UPDATE_INVOICE',
  DELETE: 'DELETE_INVOICE',
  RESTORE: 'RESTORE_INVOICE',
  SEND: 'SEND_INVOICE',
  DOWNLOAD: 'DOWNLOAD_INVOICE',
  PAYMENT: 'PAYMENT_INVOICE',
  REFUND: 'REFUND_INVOICE',
};

export const NOTIFICATION_MESSAGES = {
  CREATED: 'Nouvelle facture créée',
  UPDATED: 'Facture modifiée',
  PAID: 'Facture payée',
  CANCELLED: 'Facture annulée',
};
