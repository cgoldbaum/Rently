import Groq from 'groq-sdk';
import { AppError } from './AppError';

// Cliente y modelo Groq compartidos por todas las funciones de IA (chat y acciones).
export const GROQ_MODEL = 'llama-3.3-70b-versatile';

export function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AppError('errors:aiChat.notConfigured', 503, 'GROQ_NOT_CONFIGURED');
  }
  // Usamos el fetch nativo de Node en lugar del node-fetch v2 interno del SDK,
  // que falla con "Premature close" al descomprimir respuestas gzip (bug conocido).
  return new Groq({ apiKey, fetch: globalThis.fetch as unknown as Groq['fetch'] });
}
