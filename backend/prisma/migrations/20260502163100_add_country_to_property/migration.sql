-- AddColumn country to Property
ALTER TABLE "Property" ADD COLUMN "country" TEXT DEFAULT 'CL';

-- Create constraint to ensure only supported countries
ALTER TABLE "Property" ADD CONSTRAINT "Property_country_check" CHECK ("country" IN ('CL', 'CO', 'UY'));
