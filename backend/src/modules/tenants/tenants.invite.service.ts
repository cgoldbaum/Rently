import { assertTenantOwner } from './tenants.guard';

export async function resendLink(tenantId: string, userId: string) {
  const tenant = await assertTenantOwner(tenantId, userId);

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/public/portal/${tenant.linkToken}`;
  return { link };
}
