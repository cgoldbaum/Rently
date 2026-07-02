export type Tenant = { id: string; name: string; email: string; phone?: string };

export type Contract = {
  id: string;
  startDate: string;
  endDate: string;
  initialAmount: number;
  currentAmount: number;
  currency?: 'ARS' | 'USD';
  paymentDay: number;
  indexType: string;
  adjustFrequency: number;
  nextAdjustDate?: string;
  tenants?: Tenant[];
};

export type PropertyUnit = { id: string; name?: string | null; address: string; type: string; status: string };

export type Property = {
  id: string;
  name?: string;
  address: string;
  country?: string;
  type: string;
  surface: number;
  status: string;
  description?: string;
  antiquity?: number;
  contract?: Contract;
  openClaims: number;
  parentProperty?: { id: string; name?: string | null; address: string } | null;
  units?: PropertyUnit[];
};

export type Claim = {
  id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
};

export type Payment = {
  id: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  period: string;
  dueDate: string;
  status: string;
  method?: string;
};

export type Adjustment = {
  id: string;
  indexType: string;
  previousAmount: number;
  newAmount: number;
  variation: number;
  appliedAt: string;
  notified: boolean;
};

export type ContractDoc = { fileUrl: string; fileName?: string; uploadedAt: string } | null;

export type ExpenseReceipt = {
  id: string;
  period: string;
  fileUrl: string;
  fileName: string | null;
  uploadedAt: string;
};

export type TabKey =
  | 'overview'
  | 'contract'
  | 'tenant'
  | 'payments'
  | 'claims'
  | 'adjustments'
  | 'photos'
  | 'expensas'
  | 'portals';
