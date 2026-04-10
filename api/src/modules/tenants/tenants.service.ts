import prisma from '../../lib/prisma';
import { CreateTenantInput } from './tenants.schema';

export async function createTenant(contractId: string, input: CreateTenantInput) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) {
    throw Object.assign(new Error('Contract not found'), { code: 'NOT_FOUND', status: 404 });
  }

  const existing = await prisma.tenant.findUnique({ where: { contractId } });
  if (existing) {
    throw Object.assign(new Error('Tenant already exists for this contract'), { code: 'TENANT_EXISTS', status: 409 });
  }

  const tenant = await prisma.tenant.create({
    data: { ...input, contractId },
  });

  return tenant;
}

export async function getTenant(contractId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { contractId } });
  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { code: 'NOT_FOUND', status: 404 });
  }
  return tenant;
}

export async function resendLink(contractId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { contractId } });
  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { code: 'NOT_FOUND', status: 404 });
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/public/claims/${tenant.linkToken}`;
  return { link };
}

export async function getPublicLinkInfo(token: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { linkToken: token },
    include: {
      contract: {
        include: { property: true },
      },
    },
  });

  if (!tenant) {
    throw Object.assign(new Error('Invalid link'), { code: 'NOT_FOUND', status: 404 });
  }

  if (tenant.contract.endDate < new Date()) {
    throw Object.assign(new Error('Contract has expired'), { code: 'LINK_EXPIRED', status: 410 });
  }

  return {
    tenantName: tenant.name,
    propertyAddress: tenant.contract.property.address,
    contractEndDate: tenant.contract.endDate,
    linkToken: tenant.linkToken,
  };
}
