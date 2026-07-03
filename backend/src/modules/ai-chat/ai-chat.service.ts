import prisma from '../../lib/prisma';
import { getGroq, GROQ_MODEL as MODEL } from '../../lib/groq';

const MAX_HISTORY = 20;

export async function buildOwnerContext(userId: string): Promise<string> {
  const [user, properties] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.property.findMany({
      where: { userId },
      include: {
        contract: {
          include: {
            tenants: true,
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
      APARTMENT: 'departamento', HOUSE: 'casa', COMMERCIAL: 'local comercial', PH: 'PH', GARAGE: 'cochera', DUPLEX: 'dúplex',
    };
    for (const p of properties) {
      lines.push(`- ${p.name ?? p.address} (${typeMap[p.type] ?? p.type}, ${statusMap[p.status] ?? p.status})`);
      if (p.contract) {
        const c = p.contract;
        lines.push(`  Alquiler: $${c.currentAmount} ${c.currency}/mes, vence ${c.endDate.toISOString().slice(0, 10)}`);
        for (const t of c.tenants) lines.push(`  Inquilino: ${t.name} (${t.email})`);
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
  const tenant = await prisma.tenant.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
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
      tenants: true,
      payments: { orderBy: { dueDate: 'desc' }, take: 6 },
    },
  });
  if (!contract) return '';

  const p = contract.property;
  const lines = [
    `Contrato seleccionado:`,
    `Propiedad: ${p.name ?? p.address}`,
    `Propietario: ${p.user.name}`,
    `Inquilino: ${contract.tenants.map((t) => t.name).join(', ') || 'N/A'}`,
    `Monto: $${contract.currentAmount} ${contract.currency}/mes`,
    `Vence: ${contract.endDate.toISOString().slice(0, 10)}`,
  ];

  const pending = contract.payments.filter(py => py.status !== 'PAID');
  if (pending.length > 0) {
    lines.push(`Pagos pendientes: ${pending.map(py => `${py.period} (${py.status})`).join(', ')}`);
  }

  return lines.join('\n');
}

// Guía de uso de la app: describe la navegación real y los pasos para cada
// acción, para que la IA pueda explicarle al usuario CÓMO usar Rently.
const OWNER_APP_GUIDE = `Guía de uso de Rently para propietarios (web y app):

Navegación (barra lateral izquierda en la web; pestañas en la parte inferior en la app móvil): Inicio, Propiedades, Pagos, Reclamos, Ajustes, Chat, Asistente IA, Rendimiento, Reportes. La configuración de la cuenta se abre tocando tu nombre/avatar (abajo a la izquierda en web).

Acciones frecuentes y cómo hacerlas:
- Cargar una propiedad: entrá a "Propiedades" → botón "Nueva Propiedad" (o "+ Nueva") → completá la dirección y los datos → "Crear Propiedad". Necesitás un plan activo.
- Agregar un inquilino y crear el contrato: entrá a la propiedad desde "Propiedades" → en la vista general (Overview) usá "Agregar" (inquilino) y "Crear contrato". Podés adjuntar el PDF del contrato con "Cargar PDF" (la IA detecta datos automáticamente).
- Registrar un cobro: entrá a la propiedad → sección Pagos → "Registrar cobro"; o desde "Pagos" del menú marcá un período como pagado con "Marcar pagado". Podés descargar el comprobante con "Descargar PDF".
- Gestionar reclamos: entrá a "Reclamos" → abrí el reclamo y usá "Marcar en curso" o "Marcar como resuelto" (podés registrar la resolución con un comentario).
- Ajustar el alquiler: entrá a "Ajustes" (o la pestaña Ajustes dentro de la propiedad) → "Nuevo monto"; se calcula según el índice del contrato (ej: ICL/IPC).
- Chatear con el inquilino: entrá a "Chat".
- Ver métricas e informes: "Rendimiento" y "Reportes".
- Editar o eliminar una propiedad: entrá a la propiedad → "Editar" o "Eliminar".`;

const TENANT_APP_GUIDE = `Guía de uso de Rently para inquilinos (web y app):

Navegación (barra lateral izquierda en la web; pestañas en la parte inferior en la app móvil): Inicio, Contrato, Pagos, Reclamos, Expensas, Chat, Asistente IA. La configuración de la cuenta se abre tocando tu nombre/avatar (abajo a la izquierda en web).

Acciones frecuentes y cómo hacerlas:
- Pagar el alquiler: entrá a "Pagos" → botón "Pagar ahora" en el período pendiente → elegí el método: "Pagar con Mercado Pago", "Pagar por transferencia" (informás la transferencia) o efectivo (coordinás con el propietario y él lo marca como pagado).
- Reportar un problema / hacer un reclamo: entrá a "Reclamos" → "+ Nuevo reclamo" (o "+ Reportar un problema") → describí el problema → enviar. El propietario te va a contactar.
- Cargar la factura de expensas: entrá a "Expensas" → "+ Subir factura".
- Ver o descargar tu contrato: entrá a "Contrato" → "Ver / Descargar".
- Chatear con el propietario: entrá a "Chat".`;

function buildAppGuide(role: string): string {
  return role === 'OWNER' ? OWNER_APP_GUIDE : TENANT_APP_GUIDE;
}

function buildSystemPrompt(role: string, context: string, pageContext?: string): string {
  const roleLabel = role === 'OWNER' ? 'propietarios' : 'inquilinos';
  const pageLine = pageContext
    ? `\nEn este momento el usuario está viendo la pantalla: "${pageContext}". Si su pregunta es ambigua, asumí que se refiere a lo que está viendo en esa pantalla.\n`
    : '';
  return `Sos el asistente de IA de Rently, una plataforma de gestión de alquileres en Argentina. Tu misión es ayudar a ${roleLabel} con dos cosas: (1) consultas sobre sus propiedades, contratos, pagos, reclamos y temas de alquileres, y (2) cómo usar la plataforma Rently (dónde tocar y qué pasos seguir para hacer lo que necesitan).

Datos actuales del usuario:
${context}
${pageLine}
${buildAppGuide(role)}

Comportamiento:
- Respondé en español argentino, de forma clara y amable.
- Usá el contexto del usuario para dar respuestas personalizadas (referenciá sus propiedades, fechas y montos reales).
- Cuando el usuario pregunte cómo hacer algo en la app (ej: "cómo registro un pago", "dónde reporto un problema", "cómo cargo una propiedad"), usá la guía de uso de arriba y respondé con pasos numerados, nombrando los botones y las secciones tal como aparecen en pantalla. Sé preciso: no inventes botones ni pantallas que no estén en la guía.
- Si la acción que pide no existe en la guía o no está disponible para su rol, decilo con claridad y sugerí la alternativa más cercana (por ejemplo, coordinar por Chat).
- Si algo no está en el contexto (ej: valores de mercado actuales), aclaralo.
- Para temas legales complejos, sugerí consultar con un profesional.
- Sé conciso pero completo. Usá listas y pasos numerados cuando sea útil.`;
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
  userContent: string,
  pageContext?: string
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

  const systemPrompt = buildSystemPrompt(userRole, contextText, pageContext);

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
