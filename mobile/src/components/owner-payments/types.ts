export type Payment = {
  id: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  period: string;
  dueDate: string;
  paidDate?: string;
  status: string;
  method?: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentCount?: number;
  contract: {
    property: { name?: string; address: string };
    tenants?: { name: string }[];
  };
};
