-- D24, suite : une étape supprimée depuis l'écran ne peut pas toujours être
-- effacée de la base.
--
-- `DealStageHistory.toStageId` est declare en `onDelete: Restrict` : toute
-- etape deja traversee par une opportunite est referencee par l'historique,
-- et c'est cet historique qui porte le calcul des delais moyens par etape
-- exige au CDC §4.6. L'effacer pour faire place a une suppression reviendrait
-- a fausser le reporting retroactivement.
--
-- D'ou la regle retenue : une etape jamais traversee est reellement supprimee,
-- une etape deja traversee est archivee. Archivee, elle disparait du Kanban,
-- des listes et du choix d'etape par defaut ; ses lignes d'historique restent
-- intactes et lisibles.
--
-- Aucune etape existante n'est archivee par cette migration.

ALTER TABLE "PipelineStage" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "PipelineStage_isArchived_idx" ON "PipelineStage"("isArchived");
