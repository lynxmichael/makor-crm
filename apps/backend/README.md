# CRM MAKOR Group Telecom — Backend

API backend du CRM interne de MAKOR Group Telecom : gestion des
clients/prospects, pipeline commercial personnalisé, devis / bons de
commande / contrats / factures / encaissements, campagnes SMS/WhatsApp,
Sender ID, reporting, et administration (utilisateurs, rôles,
permissions, paramètres système).

Construit avec [NestJS](https://nestjs.com), [Prisma](https://prisma.io)
(PostgreSQL), [BullMQ](https://docs.bullmq.io) (Redis) et Socket.IO.

## Stack technique

| Domaine | Choix |
| --- | --- |
| Framework | NestJS 11 (TypeScript) |
| Base de données | PostgreSQL, via Prisma ORM |
| File d'attente asynchrone | Redis + BullMQ (envoi de campagnes, exports) |
| Temps réel | Socket.IO (statut de campagne, notifications live) |
| Authentification | JWT (access + refresh token en base), 2FA TOTP |
| Emails | Nodemailer via `@nestjs-modules/mailer` |
| PDF | PDFKit (devis, BC, contrats, factures, rapports) |
| Excel / CSV | ExcelJS + writer CSV maison |
| Documentation API | Swagger (`/docs`) |

## Démarrage

### 1. Prérequis

- Node.js 20+
- Docker (Postgres + Redis + pgAdmin fournis par le `docker-compose.yml`
  à la racine du dépôt, au-dessus de ce dossier `backend/`)

### 2. Infrastructure (Postgres, Redis, pgAdmin)

Depuis la racine du dépôt (pas depuis `backend/`) :

```bash
docker compose up -d
```

Expose Postgres sur le port hôte `5433` (utilisateur `makor`, base
`makor_crm`), Redis sur `6379`, et pgAdmin sur `http://localhost:5051`
(admin@makor.com). `.env.example` est déjà aligné sur ces valeurs.

### 3. Installation

```bash
npm install
cp .env.example .env
# Ajuster .env si vos ports/identifiants Docker diffèrent de docker-compose.yml
```

`npm install` régénère automatiquement le client Prisma (`postinstall`).

### 4. Base de données

```bash
npx prisma migrate dev --name init   # crée les tables à partir du schéma
npm run seed                          # rôles, permissions, pipeline,
                                       # référentiels, comptes de démo
```

Voir `prisma/migrations/README.md` pour le contexte de cette étape.

### 5. Lancer le serveur

```bash
npm run start:dev     # développement, rechargement à chaud
npm run start:prod    # production (après npm run build)
```

L'API est servie sous le préfixe `/api/v1`. Documentation interactive :
`http://localhost:3000/docs`. Sonde de supervision : `GET /api/v1/health`
(vérifie la base de données et Redis).

## Comptes de démonstration (après `npm run seed`)

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Super Admin | admin@makor.ci | valeur de `SEED_DEFAULT_PASSWORD` (`.env`) |
| Admin ventes | ventes@makor.ci | idem |
| Superviseur | superviseur@makor.ci | idem |
| Commercial | commercial@makor.ci | idem |
| Manager | manager@makor.ci | idem |

À changer immédiatement en dehors d'un environnement de démonstration.

## Organisation des modules (`src/`)

- **Sécurité & administration** : `auth`, `users`, `roles`,
  `permissions`, `role-permissions`, `departments`, `settings`, `audit`
- **Commercial** : `customers`, `contacts`, `leads`, `pipeline-stages`,
  `deals`, `activities`, `products`
- **Cycle de vente** : `quotes` (devis), `purchase-orders` (bons de
  commande), `contracts`, `invoices`, `payments`, `recharges`
  (rechargements / solde prépayé)
- **Marketing & communication** : `campaigns` (SMS/WhatsApp/email),
  `sender-id`, `notifications`, `documents` (GED)
- **Pilotage** : `dashboard`, `objectives`, `reporting` (exports
  CSV/Excel/PDF), `search` (recherche globale)
- **Infrastructure transverse** : `common` (PDF, passerelle SMS/WhatsApp
  abstraite), `queue` (Redis/BullMQ), `realtime` (Socket.IO), `mail`,
  `prisma`, `health`

## Brancher un vrai prestataire SMS / WhatsApp

Toute la logique métier (campagnes, notifications) passe par
l'interface `SmsWhatsappGateway` (`src/common/gateway/`). Par défaut,
`MockGatewayAdapter` simule l'envoi. Pour brancher un prestataire réel :

1. Créer une classe implémentant `SmsWhatsappGateway`.
2. La fournir au jeton `SMS_WHATSAPP_GATEWAY` dans `common.module.ts`
   (remplacer `useClass: MockGatewayAdapter`).

Aucun autre fichier n'a besoin d'être modifié.

## Tests

```bash
npm run test        # unitaires
npm run test:e2e     # end-to-end (nécessite une base et un Redis de test)
npm run test:cov     # couverture
```

## Scripts utiles

| Script | Effet |
| --- | --- |
| `npm run build` | Compile en `dist/` |
| `npm run lint` | ESLint (correction automatique) |
| `npm run format` | Prettier |
| `npm run seed` | Charge les données de référence |
