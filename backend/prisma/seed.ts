import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('demo1234', 12);
  const now = new Date();
  const addMonths = (d: Date, m: number) => new Date(d.getFullYear(), d.getMonth() + m, d.getDate());
  const addDays   = (d: Date, n: number) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
  const makeDate = (y: number, m: number, d: number) => new Date(y, m - 1, d);
  const yr = now.getFullYear();
  const mo = now.getMonth() + 1;
  const monthName = (offset: number) =>
    new Date(yr, now.getMonth() + offset, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  // ── Usuarios ──────────────────────────────────────────────────
  const owner = await prisma.user.upsert({
    where: { email: 'demo@rently.app' },
    update: { role: 'OWNER' },
    create: {
      email: 'demo@rently.app',
      passwordHash,
      name: 'Carlos García',
      phone: '+54 11 4567-8901',
      verified: true,
      role: 'OWNER',
    },
  });
  console.log('✓ Propietario:', owner.email);

  const tenantUser = await prisma.user.upsert({
    where: { email: 'lucia@rently.app' },
    update: {},
    create: {
      email: 'lucia@rently.app',
      passwordHash,
      name: 'Lucía Fernández',
      phone: '+54 11 2345-6789',
      verified: true,
      role: 'TENANT',
    },
  });
  console.log('✓ Inquilina:', tenantUser.email);

  // ── Propiedades ───────────────────────────────────────────────
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
      country: 'AR',
      type: 'COMMERCIAL',
      surface: 38,
      antiquity: 20,
      condition: 'GOOD',
      status: 'EXPIRING_SOON',
    },
  });

  // ── Propiedades internacionales (para demo de índices por país) ──
  const propCL = await prisma.property.upsert({
    where: { id: 'prop-demo-cl' },
    update: {},
    create: {
      id: 'prop-demo-cl',
      userId: owner.id,
      name: 'Depto Providencia',
      address: 'Av. Providencia 1234, Santiago',
      country: 'CL',
      type: 'APARTMENT',
      surface: 65,
      antiquity: 8,
      condition: 'EXCELLENT',
      status: 'OCCUPIED',
    },
  });

  const propCO = await prisma.property.upsert({
    where: { id: 'prop-demo-co' },
    update: {},
    create: {
      id: 'prop-demo-co',
      userId: owner.id,
      name: 'Apto Chapinero',
      address: 'Calle 67 #8-31, Bogotá',
      country: 'CO',
      type: 'APARTMENT',
      surface: 58,
      antiquity: 5,
      condition: 'GOOD',
      status: 'OCCUPIED',
    },
  });

  const propUY = await prisma.property.upsert({
    where: { id: 'prop-demo-uy' },
    update: {},
    create: {
      id: 'prop-demo-uy',
      userId: owner.id,
      name: 'Apto Pocitos',
      address: 'Bulevar España 2540, Montevideo',
      country: 'UY',
      type: 'APARTMENT',
      surface: 72,
      antiquity: 15,
      condition: 'GOOD',
      status: 'OCCUPIED',
    },
  });
  console.log('✓ Propiedades: 7 (4 AR + CL + CO + UY)');

  // ── Contratos ─────────────────────────────────────────────────
  const contract1 = await prisma.contract.upsert({
    where: { id: 'contract-demo-1' },
    update: { nextAdjustDate: addDays(now, 15) },
    create: {
      id: 'contract-demo-1',
      propertyId: prop1.id,
      startDate: addMonths(now, -14),
      endDate: addMonths(now, 10),
      initialAmount: 450000,
      currentAmount: 530000,
      paymentDay: 5,
      indexType: 'ICL',
      adjustFrequency: 4,
      nextAdjustDate: addDays(now, 15),
    },
  });

  const contract2 = await prisma.contract.upsert({
    where: { id: 'contract-demo-2' },
    update: { endDate: addDays(now, 60) },
    create: {
      id: 'contract-demo-2',
      propertyId: prop2.id,
      startDate: addMonths(now, -22),
      endDate: addDays(now, 60),
      initialAmount: 700000,
      currentAmount: 890000,
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
      initialAmount: 600000,
      currentAmount: 750000,
      paymentDay: 10,
      indexType: 'ICL',
      adjustFrequency: 3,
      nextAdjustDate: addMonths(now, 1),
    },
  });

  const contractCL = await prisma.contract.upsert({
    where: { id: 'contract-demo-cl' },
    update: { nextAdjustDate: addDays(now, 8) },
    create: {
      id: 'contract-demo-cl',
      propertyId: propCL.id,
      startDate: addMonths(now, -10),
      endDate: addMonths(now, 14),
      initialAmount: 650000,
      currentAmount: 680000,
      currency: 'USD',
      paymentDay: 1,
      indexType: 'IPC',
      adjustFrequency: 6,
      nextAdjustDate: addDays(now, 8),
    },
  });

  const contractCO = await prisma.contract.upsert({
    where: { id: 'contract-demo-co' },
    update: { nextAdjustDate: addMonths(now, 2) },
    create: {
      id: 'contract-demo-co',
      propertyId: propCO.id,
      startDate: addMonths(now, -6),
      endDate: addMonths(now, 18),
      initialAmount: 2800000,
      currentAmount: 2900000,
      currency: 'USD',
      paymentDay: 5,
      indexType: 'IPC',
      adjustFrequency: 12,
      nextAdjustDate: addMonths(now, 2),
    },
  });

  const contractUY = await prisma.contract.upsert({
    where: { id: 'contract-demo-uy' },
    update: { nextAdjustDate: addMonths(now, 3) },
    create: {
      id: 'contract-demo-uy',
      propertyId: propUY.id,
      startDate: addMonths(now, -9),
      endDate: addMonths(now, 15),
      initialAmount: 28000,
      currentAmount: 30000,
      currency: 'USD',
      paymentDay: 10,
      indexType: 'IPC',
      adjustFrequency: 6,
      nextAdjustDate: addMonths(now, 3),
    },
  });
  console.log('✓ Contratos: 6 (3 AR + CL + CO + UY)');

  // ── Inquilinos ────────────────────────────────────────────────
  // Lucía vinculada a cuenta de usuario
  const tenant1 = await prisma.tenant.upsert({
    where: { id: 'tenant-demo-1' },
    update: { userId: tenantUser.id, email: 'lucia@rently.app' },
    create: {
      id: 'tenant-demo-1',
      contractId: contract1.id,
      name: 'Lucía Fernández',
      email: 'lucia@rently.app',
      phone: '+54 11 2345-6789',
      linkToken: 'demo-token-lucia-1234',
      userId: tenantUser.id,
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

  // Limpiar tenants con contractId conflictivo antes de upsert
  for (const [contractId, tenantId] of [
    [contract2.id, 'tenant-demo-2'],
    [contract4.id, 'tenant-demo-4'],
    [contractCL.id, 'tenant-demo-cl'],
    [contractCO.id, 'tenant-demo-co'],
    [contractUY.id, 'tenant-demo-uy'],
  ]) {
    await prisma.tenant.deleteMany({ where: { contractId, NOT: { id: tenantId } } });
  }

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
  await prisma.tenant.upsert({
    where: { id: 'tenant-demo-cl' },
    update: {},
    create: {
      id: 'tenant-demo-cl',
      contractId: contractCL.id,
      name: 'Valentina Torres',
      email: 'vtorres@gmail.com',
      phone: '+56 9 8765 4321',
      linkToken: 'demo-token-chile-cl01',
    },
  });

  await prisma.tenant.upsert({
    where: { id: 'tenant-demo-co' },
    update: {},
    create: {
      id: 'tenant-demo-co',
      contractId: contractCO.id,
      name: 'Andrés Mejía',
      email: 'amejia@outlook.com',
      phone: '+57 310 555 1234',
      linkToken: 'demo-token-colombia-co01',
    },
  });

  await prisma.tenant.upsert({
    where: { id: 'tenant-demo-uy' },
    update: {},
    create: {
      id: 'tenant-demo-uy',
      contractId: contractUY.id,
      name: 'Florencia da Silva',
      email: 'fdasilva@correo.com',
      phone: '+598 99 234 567',
      linkToken: 'demo-token-uruguay-uy01',
    },
  });
  console.log('✓ Inquilinos: 6 (3 AR + CL + CO + UY — Lucía vinculada a cuenta)');

  if (process.env.SEED_DEMO_PAYMENTS === 'true') {
    // ── Pagos demo ───────────────────────────────────────────────
    // Desactivados por defecto para que la tabla de cobros se alimente de contratos reales.
    const luciaPagos = [
      { id: `pay-1-m4`, period: monthName(-4), amount: 490000, dueDate: makeDate(yr, mo - 4, 5), status: 'PAID' as const, paidDate: makeDate(yr, mo - 4, 6), method: 'Transferencia', cashNote: null },
      { id: `pay-1-m3`, period: monthName(-3), amount: 530000, dueDate: makeDate(yr, mo - 3, 5), status: 'PAID' as const, paidDate: makeDate(yr, mo - 3, 4), method: 'Transferencia', cashNote: null },
      { id: `pay-1-m2`, period: monthName(-2), amount: 530000, dueDate: makeDate(yr, mo - 2, 5), status: 'PAID' as const, paidDate: makeDate(yr, mo - 2, 7), method: 'Transferencia', cashNote: null },
      { id: `pay-1-m1`, period: monthName(-1), amount: 530000, dueDate: makeDate(yr, mo - 1, 5), status: 'PAID' as const, paidDate: makeDate(yr, mo - 1, 5), method: 'Efectivo', cashNote: 'Entregué el sobre en mano al propietario' },
      { id: `pay-1-m0`, period: monthName(0), amount: 530000, dueDate: makeDate(yr, mo, 5), status: 'PENDING_CONFIRMATION' as const, paidDate: null, method: 'Efectivo', cashNote: 'Dejé el sobre con la encargada del edificio este mediodía' },
    ];

    for (const p of luciaPagos) {
      await prisma.payment.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          contractId: contract1.id,
          amount: p.amount,
          period: p.period,
          dueDate: p.dueDate,
          paidDate: p.paidDate ?? undefined,
          status: p.status,
          method: p.method ?? undefined,
          cashNote: p.cashNote ?? undefined,
        },
      });
    }

    await prisma.cashReceipt.upsert({
      where: { paymentId: 'pay-1-m1' },
      update: {},
      create: { paymentId: 'pay-1-m1', receiptNumber: 'REC-DEMO-001' },
    });

    const martinPagos = [
      { id: `pay-2-m4`, period: monthName(-4), status: 'LATE' as const,    paidDate: null,                    method: null },
      { id: `pay-2-m3`, period: monthName(-3), status: 'PAID' as const,    paidDate: makeDate(yr, mo - 3, 3), method: 'Transferencia' },
      { id: `pay-2-m2`, period: monthName(-2), status: 'PAID' as const,    paidDate: makeDate(yr, mo - 2, 2), method: 'Transferencia' },
      { id: `pay-2-m1`, period: monthName(-1), status: 'PAID' as const,    paidDate: makeDate(yr, mo - 1, 1), method: 'Transferencia' },
      { id: `pay-2-m0`, period: monthName(0),  status: 'PENDING' as const, paidDate: null,                    method: null },
    ];

    for (const p of martinPagos) {
      await prisma.payment.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          contractId: contract2.id,
          amount: 890000,
          period: p.period,
          dueDate: makeDate(yr, mo, 1),
          paidDate: p.paidDate ?? undefined,
          status: p.status,
          method: p.method ?? undefined,
        },
      });
    }
    console.log('✓ Pagos demo: 10 (+ 1 comprobante)');
  } else {
    console.log('✓ Pagos demo omitidos (usar SEED_DEMO_PAYMENTS=true para cargarlos)');
  }

  // ── Reclamos ──────────────────────────────────────────────────
  const claim1 = await prisma.claim.upsert({
    where: { id: 'claim-demo-1' },
    update: {},
    create: {
      id: 'claim-demo-1',
      tenantId: tenant1.id,
      title: 'Pérdida de agua en el baño',
      category: 'PLUMBING',
      description: 'Pérdida de agua en la canilla del baño principal. El goteo es constante hace más de una semana y está dañando el mueble bajo mesada.',
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
      comment: 'Contactado plomero. Turno confirmado para el miércoles entre 9 y 12hs.',
      changedAt: addMonths(now, -1),
    },
  });

  const claim2 = await prisma.claim.upsert({
    where: { id: 'claim-demo-2' },
    update: {},
    create: {
      id: 'claim-demo-2',
      tenantId: tenant1.id,
      title: 'Tomacorriente peligroso en el estudio',
      category: 'ELECTRICITY',
      description: 'El tomacorriente del cuarto de estudio chisporrotea al enchufar cualquier dispositivo. Es una situación peligrosa, especialmente con los chicos en casa.',
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
      title: 'Humedad en pared del comedor',
      category: 'STRUCTURE',
      description: 'Humedad visible en la pared del comedor, cerca del techo. Las manchas van creciendo con la lluvia.',
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
      title: 'Puerta del balcón no cierra',
      category: 'OTHER',
      description: 'La puerta del balcón no cierra bien, entra frío y ruido. Necesita ajuste en bisagras o burletes.',
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
      comment: 'Programada visita técnica para el lunes.',
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
      comment: 'Reparado. Bisagras ajustadas y burletes nuevos colocados.',
      changedAt: addMonths(now, -1),
    },
  });
  console.log('✓ Reclamos: 4');

  // ── Ajustes ───────────────────────────────────────────────────
  await prisma.adjustmentHistory.upsert({
    where: { id: 'adj-demo-1' },
    update: {},
    create: {
      id: 'adj-demo-1',
      contractId: contract1.id,
      indexType: 'ICL',
      previousAmount: 490000,
      newAmount: 530000,
      variation: 8.16,
      appliedAt: addMonths(now, -4),
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
      previousAmount: 450000,
      newAmount: 490000,
      variation: 8.89,
      appliedAt: addMonths(now, -8),
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
      previousAmount: 810000,
      newAmount: 890000,
      variation: 9.88,
      appliedAt: addMonths(now, -3),
      notified: true,
    },
  });
  // Ajuste histórico Chile (IPC Banco Central)
  await prisma.adjustmentHistory.upsert({
    where: { id: 'adj-demo-cl-1' },
    update: {},
    create: {
      id: 'adj-demo-cl-1',
      contractId: contractCL.id,
      indexType: 'IPC',
      previousAmount: 650000,
      newAmount: 680000,
      variation: 4.62,
      appliedAt: addMonths(now, -4),
      notified: true,
    },
  });

  // Ajuste histórico Colombia (IPC DANE)
  await prisma.adjustmentHistory.upsert({
    where: { id: 'adj-demo-co-1' },
    update: {},
    create: {
      id: 'adj-demo-co-1',
      contractId: contractCO.id,
      indexType: 'IPC',
      previousAmount: 2800000,
      newAmount: 2900000,
      variation: 3.57,
      appliedAt: addMonths(now, -6),
      notified: true,
    },
  });

  // Ajuste histórico Uruguay (IPC INE)
  await prisma.adjustmentHistory.upsert({
    where: { id: 'adj-demo-uy-1' },
    update: {},
    create: {
      id: 'adj-demo-uy-1',
      contractId: contractUY.id,
      indexType: 'IPC',
      previousAmount: 28000,
      newAmount: 30000,
      variation: 7.14,
      appliedAt: addMonths(now, -3),
      notified: true,
    },
  });
  console.log('✓ Historial de ajustes: 6 (3 AR + CL + CO + UY)');

  // ── Notificaciones para Lucía (inquilina) ─────────────────────
  const luciaNotifs = [
    {
      id: 'notif-lucia-1',
      userId: tenantUser.id,
      type: 'PAYMENT' as const,
      message: `Tu pago de ${monthName(-3)} fue confirmado por el propietario`,
      read: true,
      referenceId: 'pay-1-m3',
      createdAt: makeDate(yr, mo - 3, 6),
    },
    {
      id: 'notif-lucia-2',
      userId: tenantUser.id,
      type: 'CLAIM' as const,
      message: 'Tu reclamo "Pérdida de agua en el baño" fue actualizado: en curso',
      read: true,
      referenceId: claim1.id,
      createdAt: addMonths(now, -1),
    },
    {
      id: 'notif-lucia-3',
      userId: tenantUser.id,
      type: 'PAYMENT' as const,
      message: `Tu pago de ${monthName(-1)} fue confirmado por el propietario`,
      read: true,
      referenceId: 'pay-1-m1',
      createdAt: makeDate(yr, mo - 1, 6),
    },
    {
      id: 'notif-lucia-4',
      userId: tenantUser.id,
      type: 'ADJUSTMENT' as const,
      message: 'Se aplicó un ajuste ICL del 8.16% a tu contrato. Nuevo monto: $530.000',
      read: false,
      referenceId: 'adj-demo-1',
      createdAt: addMonths(now, -4),
    },
  ];

  for (const n of luciaNotifs) {
    await prisma.notification.upsert({
      where: { id: n.id },
      update: {},
      create: n,
    });
  }

  // Notificación al propietario sobre el pago pendiente de Lucía
  await prisma.notification.upsert({
    where: { id: 'notif-owner-1' },
    update: {},
    create: {
      id: 'notif-owner-1',
      userId: owner.id,
      type: 'PAYMENT',
      message: 'Lucía Fernández registró un pago en efectivo de $530.000 — pendiente de confirmación',
      read: false,
      referenceId: 'pay-1-m0',
      createdAt: now,
    },
  });

  // Alerta de ajuste próximo (15 días) — propietario
  await prisma.notification.upsert({
    where: { id: 'notif-owner-2' },
    update: { message: 'El ajuste automático de Depto 3A - Palermo se aplicará en 15 días (índice ICL). Monto actual: $530.000' },
    create: {
      id: 'notif-owner-2',
      userId: owner.id,
      type: 'ADJUSTMENT',
      message: 'El ajuste automático de Depto 3A - Palermo se aplicará en 15 días (índice ICL). Monto actual: $530.000',
      read: false,
      referenceId: contract1.id,
      createdAt: now,
    },
  });

  // Alerta de renovación próxima (60 días) — propietario
  await prisma.notification.upsert({
    where: { id: 'notif-owner-3' },
    update: { message: 'El contrato de Casa Villa Urquiza vence en 60 días. Considerá renovarlo o publicar la propiedad.' },
    create: {
      id: 'notif-owner-3',
      userId: owner.id,
      type: 'ADJUSTMENT',
      message: 'El contrato de Casa Villa Urquiza vence en 60 días. Considerá renovarlo o publicar la propiedad.',
      read: false,
      referenceId: contract2.id,
      createdAt: now,
    },
  });

  // Alerta de ajuste próximo (15 días) — Lucía (inquilina)
  await prisma.notification.upsert({
    where: { id: 'notif-lucia-5' },
    update: { message: 'Tu alquiler de Depto 3A - Palermo se ajustará el ' + addDays(now, 15).toLocaleDateString('es-AR') + ' según el índice ICL. Monto actual: $530.000' },
    create: {
      id: 'notif-lucia-5',
      userId: tenantUser.id,
      type: 'ADJUSTMENT',
      message: 'Tu alquiler de Depto 3A - Palermo se ajustará el ' + addDays(now, 15).toLocaleDateString('es-AR') + ' según el índice ICL. Monto actual: $530.000',
      read: false,
      referenceId: contract1.id,
      createdAt: now,
    },
  });
  console.log('✓ Notificaciones: 8 (5 para Lucía, 3 para el propietario)');

  console.log('');
  console.log('✅ Seed completo!');
  console.log('');
  console.log('  Propietario  →  demo@rently.app   /  demo1234');
  console.log('  Inquilina    →  lucia@rently.app  /  demo1234');
  console.log('');
  console.log('  Portal token:  /public/portal/demo-token-lucia-1234');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
