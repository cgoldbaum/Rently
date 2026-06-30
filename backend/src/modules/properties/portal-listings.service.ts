import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';

/**
 * Simulated distribution to real-estate portals. Argentina's portals
 * (ZonaProp, ArgenProp, MercadoLibre) have no open public API, so publishing
 * is simulated: a listing record is created with a believable listing URL.
 */

export const PORTALS = ['ZONAPROP', 'ARGENPROP', 'MERCADOLIBRE'] as const;
type Portal = (typeof PORTALS)[number];

const PORTAL_BASE_URL: Record<Portal, string> = {
  ZONAPROP: 'https://www.zonaprop.com.ar/propiedades',
  ARGENPROP: 'https://www.argenprop.com/propiedad',
  MERCADOLIBRE: 'https://inmuebles.mercadolibre.com.ar/propiedad',
};

function notFound(msg = 'Not found') {
  return new AppError(msg, 404, 'NOT_FOUND');
}
function badRequest(msg: string) {
  return new AppError(msg, 400, 'BAD_REQUEST');
}

export async function listPortalListings(propertyId: string) {
  return prisma.portalListing.findMany({
    where: { propertyId },
    orderBy: { publishedAt: 'desc' },
  });
}

export async function publishToPortal(propertyId: string, portal: string) {
  if (!PORTALS.includes(portal as Portal)) throw badRequest('Portal no válido');

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw notFound('Propiedad no encontrada');

  const listingUrl = `${PORTAL_BASE_URL[portal as Portal]}/${propertyId}`;

  return prisma.portalListing.upsert({
    where: { propertyId_portal: { propertyId, portal } },
    update: { status: 'PUBLISHED', listingUrl, publishedAt: new Date() },
    create: { propertyId, portal, status: 'PUBLISHED', listingUrl },
  });
}

export async function unpublishFromPortal(propertyId: string, portal: string) {
  await prisma.portalListing.deleteMany({ where: { propertyId, portal } });
}
