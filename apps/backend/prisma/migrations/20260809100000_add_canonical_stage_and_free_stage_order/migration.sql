-- D24 : le pipeline devient administrable depuis l'écran (renommer, supprimer,
-- réordonner, créer une colonne). Deux conséquences en base.
--
-- 1. `canonicalStage` devient obligatoire sur chaque étape. C'est précisément
--    parce que les libellés deviennent libres qu'il faut un rattachement stable
--    aux étapes du CDC §4.6 : sans lui, renommer « Closing » casserait toute
--    comparaison de reporting dans le temps.
--
-- 2. `PipelineStage.order` perd son unicité. Réordonner N colonnes se fait par
--    N `UPDATE` dans une transaction ; une contrainte d'unicité serait violée
--    en cours de route, à chaque étape intermédiaire. L'ordre n'a pas besoin
--    d'être unique en base, seulement déterministe à l'affichage.
--
-- La migration ne supprime aucune étape ni aucune opportunité.

CREATE TYPE "CanonicalStage" AS ENUM (
  'PROSPECT',
  'RDV',
  'PROPOSITION',
  'BON_DE_COMMANDE',
  'CONTRAT',
  'VENTE',
  'PERDU'
);

-- Ajoutée nullable, renseignée, puis verrouillée : une base existante porte
-- déjà des étapes, on ne peut pas poser NOT NULL d'emblée.
ALTER TABLE "PipelineStage" ADD COLUMN "canonicalStage" "CanonicalStage";

UPDATE "PipelineStage" SET "canonicalStage" = CASE "name"
  WHEN 'Prospection'         THEN 'PROSPECT'::"CanonicalStage"
  WHEN 'RDV planifié'        THEN 'RDV'::"CanonicalStage"
  WHEN 'Proposition envoyée' THEN 'PROPOSITION'::"CanonicalStage"
  WHEN 'Bon de commande'     THEN 'BON_DE_COMMANDE'::"CanonicalStage"
  WHEN 'Négociation'         THEN 'CONTRAT'::"CanonicalStage"
  WHEN 'Vente gagnée'        THEN 'VENTE'::"CanonicalStage"
  WHEN 'Perdu'               THEN 'PERDU'::"CanonicalStage"
END
WHERE "canonicalStage" IS NULL;

-- Filet pour toute étape créée à la main hors du seed : rattachée à la première
-- étape du CDC, à corriger depuis l'écran d'administration.
UPDATE "PipelineStage" SET "canonicalStage" = 'PROSPECT'::"CanonicalStage"
WHERE "canonicalStage" IS NULL;

ALTER TABLE "PipelineStage" ALTER COLUMN "canonicalStage" SET NOT NULL;

-- L'unicité de `order` saute avant tout réordonnancement, sinon les UPDATE
-- ci-dessous se heurtent aux valeurs qu'ils sont en train de libérer.
DROP INDEX IF EXISTS "PipelineStage_order_key";

-- Alignement sur les étapes de la maquette validée par la direction (Q6,
-- tranchée le 09/08) : Prospection, Business Case, Bon de commande,
-- Négociation, Closing, plus une étape terminale « Perdu ».
UPDATE "PipelineStage" SET "name" = 'Business Case', "order" = 2 WHERE "name" = 'Proposition envoyée';
UPDATE "PipelineStage" SET "name" = 'Closing', "order" = 5, "isClosedWon" = true, "requiresSignedOrder" = true WHERE "name" = 'Vente gagnée';
UPDATE "PipelineStage" SET "order" = 1 WHERE "name" = 'Prospection';
UPDATE "PipelineStage" SET "order" = 3 WHERE "name" = 'Bon de commande';
UPDATE "PipelineStage" SET "order" = 4 WHERE "name" = 'Négociation';
UPDATE "PipelineStage" SET "order" = 6, "isClosedLost" = true WHERE "name" = 'Perdu';

-- « RDV planifié » n'existe pas dans la liste cible, mais la supprimer ici
-- déplacerait ses opportunités sans que personne ne l'ait demandé. Elle est
-- repoussée en fin de pipeline, visible, pour être retirée à la main depuis
-- l'écran d'administration — qui demande explicitement l'étape de destination.
UPDATE "PipelineStage" SET "order" = 7 WHERE "name" = 'RDV planifié';

CREATE INDEX "PipelineStage_order_idx" ON "PipelineStage"("order");
CREATE INDEX "PipelineStage_canonicalStage_idx" ON "PipelineStage"("canonicalStage");

-- Sans ces deux index, tout reporting de délai moyen par étape balaie
-- l'intégralité de l'historique.
CREATE INDEX "DealStageHistory_toStageId_idx" ON "DealStageHistory"("toStageId");
CREATE INDEX "DealStageHistory_createdAt_idx" ON "DealStageHistory"("createdAt");
