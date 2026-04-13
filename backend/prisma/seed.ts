import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Owner user ─────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('demo1234', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'demo@rently.app' },
    update: {},
    create: {
      email: 'demo@rently.app',
      passwordHash,
      name: 'Carlos García',
      phone: '+54 11 4567-8901',
      verified: true,
    },
  });
  console.log('✓ Owner:', owner.email);

  // ── Properties ────────────────────────────────────────────
  const prop1 = await prisma.property.upsert({
    where: { id: 'prop-demo-1' },
    update: {},
    create: {
      id: 'prop-demo-1',
      userId: owner.id,
      name: 'Depto 3A - Palermo',
      address: 'Thames 1842, CABA',
      type: 'APARTMENT',
      surface: 52,
      antiquity: 12,
      condition: 'GOOD',
      status: 'OCCUPIED',
    },
  });

  const prop2 = await prisma.property.upsert({
    where: { id: 'prop-demo-2' },
    update: {},
    create: {
      id: 'prop-demo-2',
      userId: owner.id,
      name: 'Casa Villa Urquiza',
      address: 'Triunvirato 4580, CABA',
      type: 'HOUSE',
      surface: 180,
      antiquity: 30,
      condition: 'REGULAR',
      status: 'OCCUPIED',
    },
  });

  const prop3 = await prisma.property.upsert({
    where: { id: 'prop-demo-3' },
    update: {},
    create: {
      id: 'prop-demo-3',
      userId: owner.id,
      name: 'PH San Telmo',
      address: 'Defensa 722, CABA',
      type: 'PH',
      surface: 75,
      antiquity: 45,
      condition: 'NEEDS_WORK',
      status: 'VACANT',
    },
  });

  const prop4 = await prisma.property.upsert({
    where: { id: 'prop-demo-4' },
    update: {},
    create: {
      id: 'prop-demo-4',
      userId: owner.id,
      name: 'Local Comercial Caballito',
      address: 'Avellaneda 123, CABA',
      type: 'COMMERCIAL',
      surface: 38,
      antiquity: 20,
      condition: 'GOOD',
      status: 'EXPIRING_SOON',
    },
  });

  console.log('✓ Properties: 4 created');

  // ── Contracts ─────────────────────────────────────────────
  const now = new Date();
  const addMonths = (d: Date, m: number) => new Date(d.getFullYear(), d.getMonth() + m, d.getDate());

  const contract1 = await prisma.contract.upsert({
    where: { id: 'contract-demo-1' },
    update: {},
    create: {
      id: 'contract-demo-1',
      propertyId: prop1.id,
      startDate: addMonths(now, -14),
      endDate: addMonths(now, 10),
      initialAmount: 450,
      currentAmount: 530,
      paymentDay: 5,
      indexType: 'ICL',
      adjustFrequency: 4,
      nextAdjustDate: addMonths(now, 2),
    },
  });

  const contract2 = await prisma.contract.upsert({
    where: { id: 'contract-demo-2' },
    update: {},
    create: {
      id: 'contract-demo-2',
      propertyId: prop2.id,
      startDate: addMonths(now, -22),
      endDate: addMonths(now, 2),
      initialAmount: 700,
      currentAmount: 890,
      paymentDay: 1,
      indexType: 'IPC',
      adjustFrequency: 3,
      nextAdjustDate: addMonths(now, 1),
    },
  });

  const contract4 = await prisma.contract.upsert({
    where: { id: 'contract-demo-4' },
    update: {},
    create: {
      id: 'contract-demo-4',
      propertyId: prop4.id,
      startDate: addMonths(now, -22),
      endDate: addMonths(now, 1),
      initialAmount: 600,
      currentAmount: 750,
      paymentDay: 10,
      indexType: 'ICL',
      adjustFrequency: 3,
      nextAdjustDate: addMonths(now, 1),
    },
  });

  console.log('✓ Contracts: 3 created');

  // ── Tenants ───────────────────────────────────────────────
  const tenant1 = await prisma.tenant.upsert({
    where: { id: 'tenant-demo-1' },
    update: {},
    create: {
      id: 'tenant-demo-1',
      contractId: contract1.id,
      name: 'Lucía Fernández',
      email: 'lucia.fernandez@gmail.com',
      phone: '+54 11 2345-6789',
      linkToken: 'demo-token-lucia-1234',
    },
  });

  const tenant2 = await prisma.tenant.upsert({
    where: { id: 'tenant-demo-2' },
    update: {},
    create: {
      id: 'tenant-demo-2',
      contractId: contract2.id,
      name: 'Martín Rodríguez',
      email: 'mrodriguez@hotmail.com',
      phone: '+54 11 9876-5432',
      linkToken: 'demo-token-martin-5678',
    },
  });

  const tenant4 = await prisma.tenant.upsert({
    where: { id: 'tenant-demo-4' },
    update: {},
    create: {
      id: 'tenant-demo-4',
      contractId: contract4.id,
      name: 'Paula Sánchez',
      email: 'psanchez@empresa.com',
      phone: '+54 11 3344-5566',
      linkToken: 'demo-token-paula-9999',
    },
  });

  console.log('✓ Tenants: 3 created');

  // ── Payments ──────────────────────────────────────────────
  const makeDate = (y: number, m: number, d: number) => new Date(y, m - 1, d);
  const yr = now.getFullYear();
  const mo = now.getMonth() + 1;

  // Contrato 1 - Lucía (últimos 4 meses PAID, este mes PENDING)
  const payments1 = [
    { period: `${yr}-${String(mo - 4).padStart(2,'0')}`, status: 'PAID' as const, paidDate: makeDate(yr, mo - 4, 6), method: 'Transferencia' },
    { period: `${yr}-${String(mo - 3).padStart(2,'0')}`, status: 'PAID' as const, paidDate: makeDate(yr, mo - 3, 4), method: 'Transferencia' },
    { period: `${yr}-${String(mo - 2).padStart(2,'0')}`, status: 'PAID' as const, paidDate: makeDate(yr, mo - 2, 5), method: 'Transferencia' },
    { period: `${yr}-${String(mo - 1).padStart(2,'0')}`, status: 'PAID' as const, paidDate: makeDate(yr, mo - 1, 5), method: 'Efectivo' },
    { period: `${yr}-${String(mo).padStart(2,'0')}`, status: 'PENDING' as const, paidDate: null, method: null },
  ];

  for (const p of payments1) {
    await prisma.payment.upsert({
      where: { id: `pay-1-${p.period}` },
      update: {},
      create: {
        id: `pay-1-${p.period}`,
        contractId: contract1.id,
        amount: 530,
        period: p.period,
        dueDate: makeDate(yr, mo, 5),
        paidDate: p.paidDate,
        status: p.status,
        method: p.method ?? undefined,
      },
    });
  }

  // Contrato 2 - Martín (1 LATE, 3 PAID, este mes PENDING)
  const payments2 = [
    { period: `${yr}-${String(mo - 4).padStart(2,'0')}`, status: 'LATE' as const, paidDate: null, method: null },
    { period: `${yr}-${String(mo - 3).padStart(2,'0')}`, status: 'PAID' as const, paidDate: makeDate(yr, mo - 3, 3), method: 'Transferencia' },
    { period: `${yr}-${String(mo - 2).padStart(2,'0')}`, status: 'PAID' as const, paidDate: makeDate(yr, mo - 2, 2), method: 'Transferencia' },
    { period: `${yr}-${String(mo - 1).padStart(2,'0')}`, status: 'PAID' as const, paidDate: makeDate(yr, mo - 1, 1), method: 'Transferencia' },
    { period: `${yr}-${String(mo).padStart(2,'0')}`, status: 'PENDING' as const, paidDate: null, method: null },
  ];

  for (const p of payments2) {
    await prisma.payment.upsert({
      where: { id: `pay-2-${p.period}` },
      update: {},
      create: {
        id: `pay-2-${p.period}`,
        contractId: contract2.id,
        amount: 890,
        period: p.period,
        dueDate: makeDate(yr, mo, 1),
        paidDate: p.paidDate,
        status: p.status,
        method: p.method ?? undefined,
      },
    });
  }

  console.log('✓ Payments created');

  // ── Claims ────────────────────────────────────────────────
  const claim1 = await prisma.claim.upsert({
    where: { id: 'claim-demo-1' },
    update: {},
    create: {
      id: 'claim-demo-1',
      tenantId: tenant1.id,
      category: 'PLUMBING',
      description: 'Pérdida de agua en la canilla del baño principal. El goteo es constante hace más de una semana.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    },
  });

  await prisma.claimHistory.upsert({
    where: { id: 'ch-demo-1' },
    update: {},
    create: {
      id: 'ch-demo-1',
      claimId: claim1.id,
      oldStatus: 'OPEN',
      newStatus: 'IN_PROGRESS',
      comment: 'Contactado plomero. Turno confirmado para el miércoles.',
      changedAt: addMonths(now, -1),
    },
  });

  const claim2 = await prisma.claim.upsert({
    where: { id: 'claim-demo-2' },
    update: {},
    create: {
      id: 'claim-demo-2',
      tenantId: tenant1.id,
      category: 'ELECTRICITY',
      description: 'El tomacorriente del cuarto de estudio chisporrotea al enchufar cualquier dispositivo. Es peligroso.',
      status: 'OPEN',
      priority: 'HIGH',
    },
  });

  const claim3 = await prisma.claim.upsert({
    where: { id: 'claim-demo-3' },
    update: {},
    create: {
      id: 'claim-demo-3',
      tenantId: tenant2.id,
      category: 'STRUCTURE',
      description: 'Humedad visible en la pared del comedor, cerca del techo. Manchas que van creciendo.',
      status: 'OPEN',
      priority: 'MEDIUM',
    },
  });

  const claim4 = await prisma.claim.upsert({
    where: { id: 'claim-demo-4' },
    update: {},
    create: {
      id: 'claim-demo-4',
      tenantId: tenant2.id,
      category: 'OTHER',
      description: 'La puerta del balcón no cierra bien, entra frío y ruido. Necesita ajuste en bisagras.',
      status: 'RESOLVED',
      priority: 'LOW',
    },
  });

  await prisma.claimHistory.upsert({
    where: { id: 'ch-demo-2' },
    update: {},
    create: {
      id: 'ch-demo-2',
      claimId: claim4.id,
      oldStatus: 'OPEN',
      newStatus: 'IN_PROGRESS',
      comment: 'Programada visita técnica.',
      changedAt: addMonths(now, -2),
    },
  });

  await prisma.claimHistory.upsert({
    where: { id: 'ch-demo-3' },
    update: {},
    create: {
      id: 'ch-demo-3',
      claimId: claim4.id,
      oldStatus: 'IN_PROGRESS',
      newStatus: 'RESOLVED',
      comment: 'Reparado. Bisagras ajustadas y burletes reemplazados.',
      changedAt: addMonths(now, -1),
    },
  });

  console.log('✓ Claims: 4 created');

  // ── Adjustment history ────────────────────────────────────
  await prisma.adjustmentHistory.upsert({
    where: { id: 'adj-demo-1' },
    update: {},
    create: {
      id: 'adj-demo-1',
      contractId: contract1.id,
      indexType: 'ICL',
      previousAmount: 490,
      newAmount: 530,
      variation: 8.16,
      appliedAt: addMonths(now, -2),
      notified: true,
    },
  });

  await prisma.adjustmentHistory.upsert({
    where: { id: 'adj-demo-2' },
    update: {},
    create: {
      id: 'adj-demo-2',
      contractId: contract1.id,
      indexType: 'ICL',
      previousAmount: 450,
      newAmount: 490,
      variation: 8.89,
      appliedAt: addMonths(now, -6),
      notified: true,
    },
  });

  await prisma.adjustmentHistory.upsert({
    where: { id: 'adj-demo-3' },
    update: {},
    create: {
      id: 'adj-demo-3',
      contractId: contract2.id,
      indexType: 'IPC',
      previousAmount: 810,
      newAmount: 890,
      variation: 9.88,
      appliedAt: addMonths(now, -3),
      notified: true,
    },
  });

  console.log('✓ Adjustment history: 3 entries');
  console.log('');
  console.log('✅ Seed completo!');
  console.log('   Login: demo@rently.app / demo1234');
  console.log('   Portal inquilino 1: /public/portal/demo-token-lucia-1234');
  console.log('   Portal inquilino 2: /public/portal/demo-token-martin-5678');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
