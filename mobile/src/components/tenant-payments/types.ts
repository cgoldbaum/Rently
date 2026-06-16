export type Payment = {
  id: string;
  period: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  dueDate: string;
  paidDate?: string;
  status: string;
  method?: string;
  cashNote?: string;
};

export type UpcomingPayment = {
  id: string;
  month: string;
  dueDate: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  hasAdjustment: boolean;
  adjustmentPct: number | null;
};

export type Contract = {
  currency?: 'ARS' | 'USD';
  ownerPaymentInfo: {
    alias: string;
    cbu: string;
    email: string;
    whatsapp: string;
    ownerName: string;
  };
} | null;
