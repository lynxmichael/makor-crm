# Migrations — à régénérer

Ce dossier a été volontairement vidé lors de l'audit du backend
(juillet 2026) : le schéma Prisma a été profondément restructuré
(suppression des modules hors périmètre — tickets, interventions,
inventaire, entrepôts, abonnements, offres, entité `Company`
multi-tenant — et ajout des entités manquantes du cahier des charges :
paramètres système, pipeline personnalisé, bons de commande, Sender ID,
rechargements, objectifs, destinataires de campagne, etc.).

Recréer les anciennes migrations une par une à la main aurait été plus
fragile que repartir d'un état propre — le projet n'a pas encore de
données de production à préserver.

## Marche à suivre

```bash
# 1. Installer les dépendances (si ce n'est pas déjà fait)
npm install

# 2. Générer le client Prisma à partir du nouveau schéma
npx prisma generate

# 3. Créer la migration initiale et l'appliquer sur votre base locale
npx prisma migrate dev --name init

# 4. Charger les données de référence (rôles, permissions, pipeline,
#    secteurs/pays/devises, catalogue produits, comptes de démonstration)
npm run seed
```

En production / staging, remplacer l'étape 3 par :

```bash
npx prisma migrate deploy
```

qui applique les migrations sans prompt interactif ni tentative de
`db push`.
