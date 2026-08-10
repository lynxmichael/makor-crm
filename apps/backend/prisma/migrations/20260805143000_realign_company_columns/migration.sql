-- Réaligne la base sur le schéma : les colonnes de rattachement à Company.
--
-- Origine de la dérive : la migration 20260729103405_init supprime
-- `Customer.companyId`, et la migration 20260729152741_add_company_… qui
-- réintroduit le modèle `Company` dans schema.prisma ne recrée jamais les
-- colonnes correspondantes en SQL. Consequence : `GET /customers` rendait 500
-- (`column Customer.companyId does not exist`) des que le service incluait la
-- relation `company`.
--
-- `User.companyId` et `User_companyId_idx` existent dans la base de
-- developpement sans figurer dans l'historique des migrations : ils y ont ete
-- poses hors migration (`db push`). D'ou les garde-fous d'idempotence — cette
-- migration doit passer aussi bien sur la base actuelle que sur une base neuve.
--
-- `Offer` est vide, l'ajout d'une colonne NOT NULL y est sans risque.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "companyId" TEXT NOT NULL;
ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "productId" TEXT;

-- Index non declare par le schema, laisse par le `db push` : on l'enleve pour
-- que la base corresponde exactement au modele.
DROP INDEX IF EXISTS "User_companyId_idx";

CREATE INDEX IF NOT EXISTS "Offer_companyId_idx" ON "Offer"("companyId");
CREATE INDEX IF NOT EXISTS "Offer_productId_idx" ON "Offer"("productId");

-- PostgreSQL n'a pas d'ADD CONSTRAINT IF NOT EXISTS : on teste la presence.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_companyId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Customer_companyId_fkey') THEN
    ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Offer_companyId_fkey') THEN
    ALTER TABLE "Offer" ADD CONSTRAINT "Offer_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Offer_productId_fkey') THEN
    ALTER TABLE "Offer" ADD CONSTRAINT "Offer_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
