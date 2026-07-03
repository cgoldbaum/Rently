import { getGroq, GROQ_MODEL } from '../../lib/groq';
import { buildOwnerContext } from '../ai-chat/ai-chat.service';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'departamento', HOUSE: 'casa', COMMERCIAL: 'local comercial',
  PH: 'PH', GARAGE: 'cochera', DUPLEX: 'dúplex',
};

// Redacta un reclamo formal a partir de las notas sueltas del inquilino.
// No inventa datos: solo reformula y ordena lo que el inquilino escribió.
export async function draftClaim(input: { title?: string; notes: string }): Promise<string> {
  const { title, notes } = input;

  const systemPrompt = `Sos un asistente que ayuda a inquilinos en Argentina a redactar reclamos claros para su propietario a través de la plataforma Rently.

A partir de las notas del inquilino, devolvé UNA descripción de reclamo lista para enviar. Reglas:
- Escribí en español argentino, en primera persona (el inquilino), de forma respetuosa y clara.
- Sé concreto: describí el problema, dónde está y desde cuándo si el inquilino lo mencionó.
- NO inventes datos que el inquilino no haya dado (fechas, montos, ubicaciones exactas). Si falta info, redactá igual sin inventar.
- 2 a 4 oraciones. Sin saludos ni firma. Sin encabezados ni comillas. Devolvé solo el texto del reclamo.`;

  const userPrompt = [
    title ? `Título del reclamo: ${title}` : null,
    `Notas del inquilino: ${notes}`,
  ].filter(Boolean).join('\n');

  const completion = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 400,
    temperature: 0.6,
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}

// Genera una descripción de aviso para publicar la propiedad, a partir de sus
// datos. No inventa comodidades (pileta, cochera, etc.) que no estén en los datos.
export async function propertyDescription(input: {
  type: string;
  surface?: number;
  antiquity?: number;
  name?: string;
  address?: string;
}): Promise<string> {
  const typeLabel = PROPERTY_TYPE_LABELS[input.type] ?? input.type;

  const facts = [
    `Tipo: ${typeLabel}`,
    input.name ? `Nombre: ${input.name}` : null,
    input.address ? `Dirección: ${input.address}` : null,
    input.surface ? `Superficie: ${input.surface} m²` : null,
    input.antiquity != null ? `Antigüedad: ${input.antiquity} años` : null,
  ].filter(Boolean).join('\n');

  const systemPrompt = `Sos un asistente que redacta descripciones de avisos para propiedades en alquiler en Argentina, para la plataforma Rently.

A partir de los datos de la propiedad, escribí una descripción atractiva para publicar. Reglas:
- Español argentino, tono profesional y atractivo pero sin exagerar.
- 2 a 4 oraciones.
- Usá SOLO los datos provistos. NO inventes comodidades, ambientes ni servicios (pileta, balcón, cochera, luminosidad, cantidad de ambientes) que no figuren en los datos.
- Podés mencionar de forma general la ubicación y el tipo de propiedad.
- Sin encabezados, sin comillas, sin viñetas. Devolvé solo el texto.`;

  const completion = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Datos de la propiedad:\n${facts}` },
    ],
    max_tokens: 400,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}

// Sugiere una respuesta del propietario a un reclamo del inquilino.
export async function suggestClaimReply(input: { title?: string; description: string }): Promise<string> {
  const systemPrompt = `Sos un asistente que ayuda a un propietario en Argentina a responder un reclamo de su inquilino a través de la plataforma Rently.

A partir del reclamo, escribí una respuesta lista para enviar. Reglas:
- Español argentino, en primera persona (el propietario), tono profesional, empático y resolutivo.
- Reconocé el problema, indicá el próximo paso concreto (ej: coordinar una visita, enviar un técnico, plazo estimado) sin comprometerte a datos que no tenés.
- NO inventes fechas, montos ni nombres específicos. Si hace falta coordinar, proponelo de forma abierta.
- 2 a 4 oraciones. Sin encabezados, sin firma, sin comillas. Devolvé solo el texto.`;

  const userPrompt = [
    input.title ? `Título del reclamo: ${input.title}` : null,
    `Reclamo del inquilino: ${input.description}`,
  ].filter(Boolean).join('\n');

  const completion = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 400,
    temperature: 0.6,
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}

// Convierte notas sueltas en un mensaje claro y cordial para el chat entre
// propietario e inquilino. No inventa datos que el usuario no haya puesto.
export async function draftMessage(input: { notes: string }): Promise<string> {
  const systemPrompt = `Sos un asistente que ayuda a redactar mensajes para el chat entre propietario e inquilino en la plataforma Rently (Argentina).

A partir de las notas del usuario, devolvé un mensaje listo para enviar. Reglas:
- Español argentino, tono cordial y claro.
- Respetá la intención de las notas; NO inventes datos (fechas, montos, direcciones) que no estén.
- 1 a 3 oraciones. Sin encabezados ni firma, sin comillas. Devolvé solo el mensaje.`;

  const completion = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Notas: ${input.notes}` },
    ],
    max_tokens: 300,
    temperature: 0.6,
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}

// Explica en lenguaje simple un ajuste de alquiler (índice + variación).
export async function explainAdjustment(input: {
  previousAmount: number;
  newAmount: number;
  percentage: number;
  indexType: string;
  currency?: string;
}): Promise<string> {
  const { previousAmount, newAmount, percentage, indexType, currency = 'USD' } = input;
  const diff = newAmount - previousAmount;

  const systemPrompt = `Sos el asistente de IA de Rently. Explicás en palabras simples un ajuste de alquiler a un usuario que no es experto.

Reglas:
- Español argentino, claro y cercano, sin tecnicismos innecesarios.
- Explicá qué es el índice usado y qué significa la variación aplicada al monto.
- Usá SOLO los números provistos, no inventes otros.
- 2 a 3 oraciones. Sin encabezados ni comillas. Devolvé solo el texto.`;

  const facts = [
    `Índice: ${indexType}`,
    `Variación aplicada: ${percentage.toFixed(2)}%`,
    `Monto anterior: ${currency} ${previousAmount}`,
    `Monto nuevo: ${currency} ${newAmount}`,
    `Diferencia: ${currency} ${diff}`,
  ].join('\n');

  const completion = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Datos del ajuste:\n${facts}` },
    ],
    max_tokens: 350,
    temperature: 0.5,
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}

// Resumen en lenguaje natural del estado del mes para el propietario.
// Reutiliza el contexto que ya arma el chatbot (propiedades, pagos, reclamos).
export async function monthlySummary(userId: string): Promise<string> {
  const context = await buildOwnerContext(userId);

  const systemPrompt = `Sos el asistente de IA de Rently. A partir de los datos del propietario, escribí un resumen breve y claro del estado actual de sus alquileres.

Reglas:
- Español argentino, tono cercano y directo.
- 2 a 4 oraciones (o una lista corta si hay varios puntos).
- Destacá lo accionable: pagos pendientes o atrasados, propiedades vacías, contratos por vencer, reclamos abiertos.
- Si todo está en orden, decilo de forma positiva.
- Usá SOLO los datos provistos, no inventes cifras.`;

  const completion = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Datos del propietario:\n${context}` },
    ],
    max_tokens: 500,
    temperature: 0.6,
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}
