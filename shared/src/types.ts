export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'TENANT';
  tenantId?: string;
}
