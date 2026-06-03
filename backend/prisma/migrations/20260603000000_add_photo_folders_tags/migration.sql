-- CreateTable: PhotoFolder
CREATE TABLE "PhotoFolder" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PhotoTag
CREATE TABLE "PhotoTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PropertyPhotoTag
CREATE TABLE "PropertyPhotoTag" (
    "photoId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PropertyPhotoTag_pkey" PRIMARY KEY ("photoId", "tagId")
);

-- AlterTable: Add folderId to PropertyPhoto
ALTER TABLE "PropertyPhoto" ADD COLUMN "folderId" TEXT;

-- CreateIndex: Unique constraint on PhotoFolder (propertyId, name)
CREATE UNIQUE INDEX "PhotoFolder_propertyId_name_key" ON "PhotoFolder"("propertyId", "name");

-- CreateIndex: Unique constraint on PhotoTag name
CREATE UNIQUE INDEX "PhotoTag_name_key" ON "PhotoTag"("name");

-- AddForeignKey: PhotoFolder -> Property
ALTER TABLE "PhotoFolder" ADD CONSTRAINT "PhotoFolder_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PropertyPhotoTag -> PropertyPhoto
ALTER TABLE "PropertyPhotoTag" ADD CONSTRAINT "PropertyPhotoTag_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "PropertyPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PropertyPhotoTag -> PhotoTag
ALTER TABLE "PropertyPhotoTag" ADD CONSTRAINT "PropertyPhotoTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "PhotoTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PropertyPhoto -> PhotoFolder
ALTER TABLE "PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "PhotoFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
