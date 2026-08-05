-- D16 — le cinquième rôle est renommé MANAGER → FINANCE.
--
-- `Role.name` est une colonne texte, pas un type énuméré : le renommage ne
-- touche pas au schéma, seulement à la donnée. Les utilisateurs restent
-- rattachés par `roleId`, aucune réaffectation n'est nécessaire.
--
-- Idempotente : sans ligne MANAGER (base neuve issue du seed), elle ne fait
-- rien.
UPDATE "Role" SET name = 'FINANCE', description = 'Facturation, encaissements et recouvrement' WHERE name = 'MANAGER';

-- Compte de démonstration correspondant, aligné sur prisma/seed.ts.
UPDATE "User" SET email = 'finance@makor.ci' WHERE email = 'manager@makor.ci';
