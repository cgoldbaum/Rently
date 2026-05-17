-- CreateTable
CREATE TABLE "PortalListing" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "portal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "listingUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalListing_propertyId_portal_key" ON "PortalListing"("propertyId", "portal");

-- AddForeignKey
ALTER TABLE "PortalListing" ADD CONSTRAINT "PortalListing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
