import Groq from 'groq-sdk';
import prisma from '../../lib/prisma';

function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('GROQ_API_KEY no está configurada. El chat IA no está disponible.'), { code: 'GROQ_NOT_CONFIGURED', status: 503 });
  }
  return new Groq({ apiKey });
}
const MODEL = 'llama-3.3-70b-versatile';
const MAX_HISTORY = 20;

async function buildOwnerContext(userId: string): Promise<string> {
  const [user, properties] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.property.findMany({
      where: { userId },
      include: {
        contract: {
          include: {
            tenant: true,
            payments: {
              where: { status: { in: ['PENDING', 'LATE'] } },
              orderBy: { dueDate: 'asc' },
              take: 5,
            },
          },
        },
      },
    }),
  ]);

  const lines: string[] = [`Propietario: ${user?.name}`];

  if (properties.length === 0) {
    lines.push('Sin propiedades registradas aún.');
  } else {
    lines.push(`Propiedades (${properties.length} en total):`);
    const statusMap: Record<string, string> = {
      VACANT: 'vacía', OCCUPIED: 'ocupada', IN_ARREARS: 'con deuda', EXPIRING_SOON: 'por vencer',
    };
    const typeMap: Record<string, string> = {
      APARTMENT: 'departamento', HOUSE: 'casa', COMMERCIAL: 'local comercial', PH: 'PH',
    };
    for (const p of properties) {
      lines.push(`- ${p.name ?? p.address} (${typeMap[p.type] ?? p.type}, ${statusMap[p.status] ?? p.status})`);
      if (p.contract) {
        const c = p.contract;
        lines.push(`  Alquiler: $${c.currentAmount} ${c.currency}/mes, vence ${c.endDate.toISOString().slice(0, 10)}`);
        if (c.tenant) lines.push(`  Inquilino: ${c.tenant.name} (${c.tenant.email})`);
        if (c.payments.length > 0) {
          lines.push(`  Pagos pendientes: ${c.payments.map(py => `${py.period} (${py.status === 'LATE' ? 'ATRASADO' : 'pendiente'})`).join(', ')}`);
        }
      }
    }
  }

  const openClaims = await prisma.claim.count({
    where: { tenant: { contract: { property: { userId } } }, status: { not: 'RESOLVED' } },
  });
  if (openClaims > 0) lines.push(`Reclamos abiertos: ${openClaims}`);

  return lines.join('\n');
}

async function buildTenantContext(userId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { userId },
    include: {
      contract: {
        include: {
          property: { include: { user: { select: { name: true } } } },
          payments: { orderBy: { dueDate: 'desc' }, take: 8 },
        },
      },
      claims: { where: { status: { not: 'RESOLVED' } }, orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  if (!tenant?.contract) return 'Inquilino sin contrato activo vinculado.';

  const c = tenant.contract;
  const p = c.property;
  const daysLeft = Math.ceil((c.endDate.getTime() - Date.now()) / 86400000);

  const lines = [
    `Inquilino: ${tenant.name}`,
    `Propiedad: ${p.name ?? p.address} (${p.type})`,
    `Propietario: ${p.user.name}`,
    `Alquiler: $${c.currentAmount} ${c.currency}/mes, día de pago: ${c.paymentDay}`,
    `Contrato: desde ${c.startDate.toISOString().slice(0, 10)} hasta ${c.endDate.toISOString().slice(0, 10)} (${daysLeft} días restantes)`,
  ];

  const pending = c.payments.filter(py => py.status === 'PENDING' || py.status === 'LATE');
  const paid = c.payments.filter(py => py.status === 'PAID');
  if (pending.length > 0) {
    lines.push(`Pagos pendientes: ${pending.map(py => `${py.period} (${py.status === 'LATE' ? 'ATRASADO' : 'pendiente'})`).join(', ')}`);
  }
  if (paid.length > 0) {
    lines.push(`Últimos pagados: ${paid.slice(0, 3).map(py => py.period).join(', ')}`);
  }
  if (tenant.claims.length > 0) {
    lines.push(`Reclamos activos: ${tenant.claims.map(cl => `${cl.title ?? cl.category} (${cl.status})`).join(', ')}`);
  }

  return lines.join('\n');
}

async function buildContractContext(contractId: string): Promise<string> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      property: { include: { user: { select: { name: true } } } },
      tenant: true,
      payments: { orderBy: { dueDate: 'desc' }, take: 6 },
    },
  });
  if (!contract) return '';

  const p = contract.property;
  const lines = [
    `Contrato seleccionado:`,
    `Propiedad: ${p.name ?? p.address}`,
    `Propietario: ${p.user.name}`,
    `Inquilino: ${contract.tenant?.name ?? 'N/A'}`,
    `Monto: $${contract.currentAmount} ${contract.currency}/mes`,
    `Vence: ${contract.endDate.toISOString().slice(0, 10)}`,
  ];

  const pending = contract.payments.filter(py => py.status !== 'PAID');
  if (pending.length > 0) {
    lines.push(`Pagos pendientes: ${pending.map(py => `${py.period} (${py.status})`).join(', ')}`);
  }

  return lines.join('\n');
}

function buildSystemPrompt(role: string, context: string): string {
  const roleLabel = role === 'OWNER' ? 'propietarios' : 'inquilinos';
  return `Sos el asistente de IA de Rently, una plataforma de gestión de alquileres en Argentina. Tu misión es ayudar a ${roleLabel} con consultas sobre propiedades, contratos, pagos, reclamos y cualquier tema de alquileres.

Datos actuales del usuario:
${context}

Comportamiento:
- Respondé en español argentino, de forma clara y amable.
- Usá el contexto del usuario para dar respuestas personalizadas (referenciá sus propiedades, fechas y montos reales).
- Si algo no está en el contexto (ej: valores de mercado actuales), aclaralo.
- Para temas legales complejos, sugerí consultar con un profesional.
- Podés ayudar con: gestión de cobros, cómo manejar reclamos, avisos sobre vencimientos, ajustes de alquiler, conflictos comunes, etc.
- Sé conciso pero completo. Usá listas cuando sea útil.`;
}

export async function listSessions(userId: string) {
  return prisma.aiChatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      contractId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
}

export async function createSession(userId: string, title?: string, contractId?: string) {
  return prisma.aiChatSession.create({
    data: { userId, title: title ?? null, contractId: contractId ?? null },
  });
}

export async function getSession(userId: string, sessionId: string) {
  const session = await prisma.aiChatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session || session.userId !== userId) return null;
  return session;
}

export async function getOrCreateContractSession(userId: string, contractId: string) {
  const existing = await prisma.aiChatSession.findFirst({
    where: { userId, contractId },
    orderBy: { updatedAt: 'desc' },
  });
  if (existing) return existing;
  return prisma.aiChatSession.create({
    data: { userId, contractId, title: 'Consulta sobre contrato' },
  });
}

export async function deleteSession(userId: string, sessionId: string) {
  const session = await prisma.aiChatSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) return null;
  await prisma.aiChatSession.delete({ where: { id: sessionId } });
  return { ok: true };
}

export async function sendMessage(
  userId: string,
  userRole: string,
  sessionId: string,
  userContent: string
) {
  const session = await prisma.aiChatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: MAX_HISTORY } },
  });
  if (!session || session.userId !== userId) return null;

  // Build context based on role and optional contractId
  let contextText: string;
  if (session.contractId) {
    contextText = await buildContractContext(session.contractId);
  } else if (userRole === 'OWNER') {
    contextText = await buildOwnerContext(userId);
  } else {
    contextText = await buildTenantContext(userId);
  }

  const systemPrompt = buildSystemPrompt(userRole, contextText);

  const history = session.messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Save user message
  await prisma.aiChatMessage.create({
    data: { sessionId, role: 'user', content: userContent },
  });

  // Auto-title on first message
  if (session.messages.length === 0 && !session.title) {
    const title = userContent.length > 50 ? userContent.slice(0, 47) + '...' : userContent;
    await prisma.aiChatSession.update({ where: { id: sessionId }, data: { title } });
  }

  // Call Groq API
  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userContent },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  const assistantContent = completion.choices[0]?.message?.content ?? 'No pude generar una respuesta.';

  // Save assistant message and update session timestamp
  const [assistantMessage] = await prisma.$transaction([
    prisma.aiChatMessage.create({
      data: { sessionId, role: 'assistant', content: assistantContent },
    }),
    prisma.aiChatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return {
    userMessage: { role: 'user', content: userContent },
    assistantMessage: { id: assistantMessage.id, role: 'assistant', content: assistantContent },
  };
}
