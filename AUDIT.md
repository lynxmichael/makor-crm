# AUDIT — CRM MAKOR Group Telecom

> Audit réalisé le 29 juillet 2026 sur la branche `main`, commit `720c942`.
> Référentiel : `CDC-CRM-MAKOR-v3.md` (source de vérité fonctionnelle) et `DESIGN.md` (charte visuelle).

**Réserve de méthode.** `apps/backend/node_modules` est absent et son installation n'a pas été autorisée. Les causes de rupture de compilation du backend sont donc établies **par analyse statique et n'ont pas été vérifiées par un build réel**. Toute affirmation concernant la compilation backend porte la mention *(non compilé)*. Le frontend, lui, a bien été compilé et linté : ses résultats sont réels.

---

## 1. Synthèse

Le diagnostic consigné dans `CLAUDE.md` et `apps/backend/CLAUDE.md` est faux. Le backend **n'est pas** un CRM générique hors sujet : `prisma/schema.prisma` déclare 35 modèles couvrant **les 15 entités de la §6 du CDC sans exception**, et `app.module.ts:66-103` monte 32 modules tous alignés sur le cahier des charges. `warehouses`, `tickets`, `subscriptions`, `offers`, `companies`, `company`, `devices`, `interventions` existent bien sur disque mais **ne sont importés nulle part** — 972 lignes de scaffolding mort, soit 8,2 % du backend, jamais montées ni routées.

Le vrai déséquilibre est backend/frontend. Le backend est substantiel (11 785 lignes, 200 endpoints, JWT + 2FA TOTP, BullMQ, Socket.IO, Swagger, 16 migrations, 42 fichiers de test). Le frontend est une maquette : zéro appel API, zéro authentification, zéro notion de rôle, 11 pages sur 16 générées par une fabrique de placeholders.

Deux ruptures graves, non documentées jusqu'ici : le **build frontend échoue** (`tsconfig.app.json:3`, TS 6.0.3 refuse `baseUrl`), et **cinq contrôleurs backend montés sont totalement dépourvus d'authentification** — dont `/audit` et `/roles`, en écriture et en suppression.

**Trois décisions à prendre en premier :** (1) supprimer ou conserver les 8 dossiers orphelins ; (2) trancher primitives maison contre shadcn/ui, prérequis à tout travail d'apparence (`DESIGN.md` §7) ; (3) arbitrer les mentions `(ia)` / `(claudeia)` des §4.6 à §4.9 du CDC, non spécifiées.

---

## 2. Matrice de cohérence

### 2.1 Les 15 entités du CDC §6

| Entité / Module | Exigé par le CDC | Présent backend | Présent frontend | Verdict |
| --- | --- | --- | --- | --- |
| Client | §6, §4.2 | `Customer` `schema.prisma:212` + `Contact` `:258` — CRUD `customers.controller.ts`, `contacts.controller.ts` | `ClientsPage.tsx` — vraie page, données `data/mock.ts` | **BACKEND SEUL** |
| Prospect | §6, §4.3 | `Lead` `schema.prisma:308` + enums `LeadStatus` `:284`, `LeadSource` `:294` — CRUD `leads.controller.ts` | Placeholder `placeholders.tsx:30` | **BACKEND SEUL** |
| Opportunité | §6, §4.4 | `Deal` `schema.prisma:370` — `deals.controller.ts` (board, move-stage) | `PipelinePage.tsx` — vraie page, drag & drop sur mock | **BACKEND SEUL** |
| Produit | §6, §4.5 | `Product` `:490` + `ProductPricing` `:517` (tarif/marge par pays et secteur) | Aucune page produit | **BACKEND SEUL** |
| Campagne | §6, §4.7 | `Campaign` `:908` + `CampaignRecipient` `:956` + `campaigns.processor.ts` | `CampaignsPage.tsx` — vraie page, mock | **BACKEND SEUL** |
| Devis | §6, §4.8 | `Quote` `:548` + `QuoteItem` `:585` — PDF, send, accept, reject | Placeholder `placeholders.tsx:65` | **BACKEND SEUL** |
| Bon de commande | §6, §4.8 | `PurchaseOrder` `:614` + `PurchaseOrderItem` `:649` — from-quote, PDF, sign | Placeholder `placeholders.tsx:93` | **BACKEND SEUL** |
| Contrat | §6, §4.9 | `Contract` `:675` — from-purchase-order, PDF, mark-signed | Placeholder `placeholders.tsx:130` | **BACKEND SEUL** |
| Facture | §6, §4.10 | `Invoice` `:719` + `InvoiceItem` `:750` — PDF, pay, cancel | Placeholder `placeholders.tsx:156` | **BACKEND SEUL** |
| Encaissement | §6, §4.10 | `Payment` `:795` + `PaymentMethod` `:770` (11 modes dont Wave, Orange Money, MTN MoMo) | Placeholder `placeholders.tsx:182` | **BACKEND SEUL** |
| Demande Sender ID | §6, §4.11 | `SenderIdRequest` `:863` — approve, reject | Placeholder `placeholders.tsx:217` | **BACKEND SEUL** |
| Rendez-vous | §6, §4.12 | `Activity` `:445`, type `MEETING`, champ `reportSentAt`, endpoint `send-report` | Placeholder `placeholders.tsx:243`, tableau plat sans calendrier | **BACKEND SEUL** |
| Document | §6, §4.13 | `Document` `:1000` — upload multipart, rattachement client/deal/quote/contract | Placeholder `placeholders.tsx:268`, aucun téléversement réel | **BACKEND SEUL** |
| Utilisateur interne | §6, §3 | `User` `:123` + `Role` `:71` + `Permission` `:84` + `RolePermission` `:96` | Type `Role` déclaré `types/index.ts:17` mais **importé nulle part** | **BACKEND SEUL** |
| Journal d'audit | §6, §4.16 | `AuditLog` `:1111` + `AuditAction` `:1101` | Placeholder `placeholders.tsx:291`, tableau figé | **BACKEND SEUL** |

**15 entités sur 15 présentes côté backend. Zéro MANQUANT. Zéro FRONTEND SEUL.** Le verdict est uniforme et c'est le résultat central de cet audit : tout ce que le CDC demande de modéliser existe déjà en base, et rien de cela n'est consommé par l'interface.

### 2.2 Modules backend hors du tableau des entités

| Module | Exigé par le CDC | Présent backend | Présent frontend | Verdict |
| --- | --- | --- | --- | --- |
| `auth` | §2.4, §3 | 10 endpoints, JWT + 2FA TOTP + refresh rotatif | `LoginPage.tsx` sans aucune vérification | BACKEND SEUL |
| `dashboard` | §4.1 | 5 endpoints, un par rôle (`dashboard.controller.ts:43-104`) | `DashboardPage.tsx`, vue unique non différenciée | BACKEND SEUL |
| `reporting` | §4.15 | 6 endpoints, export CSV/XLSX/PDF (`reporting.service.ts:51-60`) | `ReportsPage.tsx`, export CSV client sur données figées | BACKEND SEUL |
| `objectives` | §4.1 (quotas) | `Objective` `:1039` + endpoint `progress` | Absent | BACKEND SEUL |
| `search` | §4.17 | `GET /search` couvrant 7 entités | Recherche `Topbar.tsx` sur mock | BACKEND SEUL |
| `notifications` | §4.14 | `Notification` `:1079`, canaux IN_APP/EMAIL/SMS/WHATSAPP | Absent | BACKEND SEUL |
| `realtime` | §2.1 (Socket.IO) | `realtime.gateway.ts`, auth JWT à la connexion | Absent | BACKEND SEUL |
| `queue` | §2.1, §8.1 (Redis) | BullMQ, files `campaigns` et `reporting` | — | ALIGNÉ (infra) |
| `settings` | §4.5 | 14 endpoints (secteurs, pays, devises, TVA) | Placeholder | BACKEND SEUL |
| `recharges` | Hors CDC | `Recharge` `:832`, solde prépayé client | Absent | **HORS PÉRIMÈTRE** (mais cohérent métier télécom) |
| `mail`, `health`, `common`, `prisma` | §2.3, §11 | Support technique | — | ALIGNÉ (infra) |
| `companies` | Non | CRUD sur `prisma.company` — **modèle inexistant** | Non | **HORS PÉRIMÈTRE — mort** |
| `company` | Non | Doublon quasi identique de `companies` | Non | **HORS PÉRIMÈTRE — mort** |
| `offers` | Non | CRUD sur `prisma.offer` — modèle inexistant | Non | **HORS PÉRIMÈTRE — mort** |
| `subscriptions` | Non | CRUD sur `prisma.subscription` ; importe `SubscriptionStatus` inexistant | Non | **HORS PÉRIMÈTRE — mort** |
| `tickets` | Non | CRUD sur `prisma.ticket` ; importe `TicketPriority`/`TicketStatus` inexistants | Non | **HORS PÉRIMÈTRE — mort** |
| `warehouses` | Non | Contrôleur et service **classes vides** | Non | **HORS PÉRIMÈTRE — mort** |
| `devices` | Non | Classes vides | Non | **HORS PÉRIMÈTRE — mort** |
| `interventions` | Non | Classes vides | Non | **HORS PÉRIMÈTRE — mort** |

### 2.3 Ampleur de l'écart, chiffrée

| Mesure | Valeur |
| --- | --- |
| Entités du CDC §6 absentes du backend | **0 sur 15** |
| Modules backend hors CDC | **8** (`companies`, `company`, `offers`, `subscriptions`, `tickets`, `warehouses`, `devices`, `interventions`) — plus `recharges`, hors CDC mais métier cohérent |
| Dont réellement montés dans `app.module.ts` | **0 sur 8** |
| Volume du code hors périmètre | **972 lignes sur 11 785**, soit **8,2 %** |
| Backend réutilisable en l'état | **91,8 %** (10 813 lignes) |
| Entités du CDC exposées dans l'interface | **0 sur 15** |
| Pages frontend réelles | **5 sur 16** (Dashboard, Clients, Pipeline, Campagnes, Rapports) |
| Frontend réutilisable | Jetons `@theme`, 8 primitives maison (299 lignes), 5 pages comme référence visuelle. **Aucune logique applicative.** |

Deux corrections aux documents de référence : les entités que `apps/backend/CLAUDE.md:68` déclare « apparemment absentes » sont **toutes présentes** ; les modules hors périmètre qu'il désigne sont **tous morts**, donc sans effet sur l'application en fonctionnement.

---

## 3. Couverture fonctionnelle — les 17 modules du CDC

États : **Absent** · **Amorcé** · **Partiel** · **Conforme**. Effort : **S** (< 1 j) · **M** (1 à 3 j) · **L** (> 3 j).
Règle appliquée strictement : une page affichant des données figées sans interaction câblée est **Absent**.

| Module | État backend | État frontend | Écart | Effort |
| --- | --- | --- | --- | --- |
| **4.1** Tableaux de bord | Partiel — 5 endpoints par rôle ; objectifs présents ; messagerie interne (REQ 4.1-42 à 45) absente | Amorcé — `DashboardPage.tsx` unique, aucun filtre, aucune différenciation par rôle | 5 tableaux de bord distincts à construire ; filtres période/pays/produit/secteur ; messagerie à spécifier | **L** |
| **4.2** Clients | Partiel — CRUD complet, pas d'endpoint timeline unifiée | Amorcé — recherche et fiche détail réelles, sur mock | Timeline §4.2, branchement API | **M** |
| **4.3** Prospects | Partiel — CRUD `leads`, conversion prospect→opportunité non exposée | Absent — placeholder | Endpoint de conversion sans ressaisie, page complète | **M** |
| **4.4** Opportunités | Conforme — `deals` avec board et `move-stage` | Amorcé — drag & drop fonctionnel mais sur état React local | Branchement API | **M** |
| **4.5** Produits & Paramètres | Conforme — `products` + `ProductPricing` (tarif/marge par pays et secteur) + 14 endpoints `settings` | Absent — placeholder | Deux pages complètes | **M** |
| **4.6** Pipeline commercial | Partiel — `PipelineStage` CRUD, `DealStageHistory`, champ `requiresSignedOrder:352` ; « pipeline personnalisé » et « drive and drop conditionné » non spécifiés | Amorcé — drag & drop sans aucune condition | Règles de transition à spécifier puis implémenter des deux côtés | **L** |
| **4.7** Campagnes | Partiel — file BullMQ, webhook, stats, temps réel ; **passerelle = mock** (`common/gateway/mock-gateway.adapter.ts`), aucun prestataire réel | Amorcé — création de campagne sur mock | Choix et intégration du prestataire ; suivi temps réel côté client | **L** |
| **4.8** Devis & Bons de commande | Conforme hors IA — PDF, envoi, accept/reject, `from-quote`, `sign` | Absent — 2 placeholders | 2 pages ; génération « avec ia » non spécifiée ; cachet électronique contredit la §5 | **M** |
| **4.9** Contrats | Conforme hors IA — `from-purchase-order`, PDF, envoi, `mark-signed` | Absent — placeholder | 1 page ; signature électronique repoussée en V2 par la §5 | **M** |
| **4.10** Facturation & Encaissements | Conforme — `invoices` (PDF, pay, cancel) + `payments` (validate, refund) | Absent — 2 placeholders | 2 pages, rapprochement facture/encaissement | **M** |
| **4.11** Sender ID | Conforme — CRUD + approve/reject | Absent — placeholder | 1 page ; « remplissage automatique » (REQ 4.1-38) non spécifié | **S** |
| **4.12** Agenda & rendez-vous | Partiel — `activities` + `send-report` ; rappels absents | Absent — tableau plat, aucun calendrier | Composant calendrier, rappels | **M** |
| **4.13** Documents (GED) | Conforme — upload multipart, rattachement multi-entités | Absent — placeholder sans téléversement réel | Page avec upload | **M** |
| **4.14** Notifications | Partiel — modèle + canaux + Socket.IO + mail ; SMS/WhatsApp dépendent de la passerelle mock | Absent | Centre de notifications, branchement WebSocket | **M** |
| **4.15** Reporting & Rapports | Conforme — 6 endpoints, export CSV/XLSX/PDF réels | Amorcé — page riche mais 100 % figée, export CSV local | Branchement API, filtres | **M** |
| **4.16** Audit | Partiel — modèle et endpoints présents mais **contrôleur sans aucun guard** | Absent — tableau figé | Sécuriser (Super Admin), page de consultation | **S** |
| **4.17** Recherche globale & Import/Export | Partiel — `GET /search` couvre 7 entités ; **import absent** | Amorcé — recherche `Topbar` sur mock | Import CSV clients/prospects, branchement recherche | **M** |

**Bilan :** backend Conforme sur 6 modules, Partiel sur 10, Absent sur 0. Frontend Absent sur 10, Amorcé sur 7, Conforme sur 0.

---

## 4. Rôles, permissions et sécurité

### 4.1 Ce qui existe et fonctionne

La chaîne d'authentification backend est sérieuse et dépasse ce que le CDC exige :

- **JWT** avec expiration configurable (`JWT_EXPIRES_IN`, défaut 15 min) et **refresh tokens rotatifs** stockés hachés en SHA-256 (`auth.service.ts:63-65`), révoqués à chaque renouvellement (`:304-311`).
- **2FA TOTP** complète via `otplib` : setup avec QR code, activation, désactivation, 8 codes de secours hachés (`auth.service.ts:401-488`). Les rôles soumis à obligation sont déclarés `auth.service.ts:34` — `SUPER_ADMIN`, `ADMIN_VENTES`, `MANAGER`, exactement les trois exigés par le CDC §2.4.
- **argon2** pour les mots de passe, verrouillage après 5 tentatives pendant 15 minutes (`auth.service.ts:27-28`).
- Les **5 rôles du CDC** sont créés au seed (`prisma/seed.ts:10-16`) : `SUPER_ADMIN`, `ADMIN_VENTES`, `SUPERVISEUR`, `COMMERCIAL`, `MANAGER`.
- `ThrottlerGuard` en garde globale (`app.module.ts:106-111`), `helmet`, `compression`.

### 4.2 Cinq contrôleurs montés sans aucune authentification

Sur 40 fichiers `*.controller.ts`, 14 n'ont pas de `@UseGuards`. Sept appartiennent aux dossiers orphelins et deux sont légitimes (`app.controller.ts`, `health.controller.ts`). **Restent cinq contrôleurs réellement montés et totalement ouverts :**

| Contrôleur | Endpoints exposés sans jeton |
| --- | --- |
| `audit/audit.controller.ts:13` | `POST /audit`, `GET /audit`, `GET /audit/:id`, **`DELETE /audit/:id`** |
| `roles/roles.controller.ts:16` | CRUD complet sur les rôles |
| `permissions/permissions.controller.ts` | CRUD complet sur les permissions |
| `role-permissions/role-permissions.controller.ts` | CRUD complet sur l'affectation des permissions |
| `departments/departments.controller.ts` | CRUD complet |

Conséquence directe : n'importe qui peut lire le journal d'audit, **en supprimer des entrées**, et se fabriquer des rôles et des permissions. Le CDC §4.16 réserve la consultation de l'audit au Super Admin ; le journal est ici à la fois public et effaçable, ce qui annule sa fonction probante. C'est le point le plus grave de cet audit.

Cause structurelle : il n'y a **pas de `APP_GUARD` d'authentification global** — seul `ThrottlerGuard` est global. Chaque contrôleur doit penser à déclarer `@UseGuards(JwtAuthGuard)`, et cinq ne l'ont pas fait.

### 4.3 La matrice §7 n'est appliquée qu'au tiers

- `@Roles()` n'est utilisé que sur **8 contrôleurs sur 32** montés : `dashboard`, `objectives`, `pipeline-stages`, `products`, `recharges`, `reporting`, `sender-id`, `settings`. Les 24 autres — dont `customers`, `leads`, `deals`, `quotes`, `purchase-orders`, `contracts`, `invoices`, `payments`, `campaigns`, `documents` — vérifient qu'un utilisateur est connecté, **jamais lequel**. Un Commercial peut appeler les endpoints de facturation que la §7 lui interdit (« Aucun »).
- `PermissionsGuard` (`auth/guards/permissions.guard.ts:12`) et son décorateur `@Permissions()` sont **implémentés et jamais utilisés** — zéro occurrence dans tout `src/`. Toute la mécanique `Permission` / `RolePermission` / seed des permissions par module est en base et inerte. C'est pourtant elle que le CDC §3 appelle « gestion fine des permissions par module ».
- Aucun filtrage par appartenance : rien ne garantit qu'un Commercial ne lise que son portefeuille (§7, « Lecture (soi) »).

### 4.4 Frontend : rien du tout

- `LoginPage.tsx:13-16` — `handleCredentials` fait `preventDefault()` puis `setStep("otp")`. Les champs email et mot de passe ne sont reliés à aucun état, **aucune valeur n'est lue**.
- `LoginPage.tsx:18-21` — `handleOtp` fait `preventDefault()` puis `navigate("/")`. **Le code à 6 chiffres n'est comparé à rien.**
- `src/routes/` contient `AppRouter.tsx`, `ProtectedRoute.tsx`, `PublicRoute.tsx`, `index.tsx` : **les quatre font 0 octet**. Les routes sont déclarées à la main dans `App.tsx:29-47`, sans aucune garde.
- Le rôle affiché dans `Topbar.tsx:192-193` (« Aïcha Koné », « Admin ventes ») est écrit en dur.
- `Sidebar.tsx:36-73` : menu identique pour tous, aucun filtrage.
- Zéro occurrence de `permission`, `canAccess`, `isAdmin`. `jwt-decode` est installé et jamais importé.

### 4.5 Ce qui manque, précisément

1. `APP_GUARD` global d'authentification, avec décorateur `@Public()` pour les exceptions (`/auth/login`, `/health`, webhooks).
2. `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles()` sur les 5 contrôleurs ouverts et les 24 contrôleurs sans contrôle de rôle.
3. Branchement effectif de `PermissionsGuard`, ou suppression assumée de la mécanique `Permission`.
4. Filtrage par propriétaire pour le périmètre « Lecture (soi) » du Commercial.
5. Frontend : store d'authentification, stockage et rafraîchissement du jeton, `ProtectedRoute`, écran 2FA réel, navigation et actions conditionnées par rôle, 5 tableaux de bord distincts.
6. Alimentation systématique de `AuditLog` sur les actions sensibles (le modèle existe, son remplissage n'est pas généralisé).

---

## 5. Santé technique

### 5.1 Backend *(non compilé — analyse statique)*

**Cause racine unique.** `nest build` compile tout `src/` via `tsconfig`, **sans tenir compte de `app.module.ts`**. Les 8 dossiers orphelins sont donc typés alors qu'ils référencent des modèles et des enums qui n'existent pas dans `schema.prisma` :

| Fichier | Référence | Réalité |
| --- | --- | --- |
| `companies/companies.service.ts:15,21,33,51,60` | `prisma.company` | Modèle absent |
| `company/company.service.ts:13` | `prisma.company` | Modèle absent |
| `offers/offers.service.ts:13,43,54,73,102` | `prisma.offer` | Modèle absent |
| `subscriptions/subscriptions.service.ts:13,38,52,73,119` | `prisma.subscription` | Modèle absent |
| `subscriptions/dto/create-subscription.dto.ts:3` | `import { SubscriptionStatus }` | Enum absent |
| `tickets/tickets.service.ts:15,42,55,78,113` | `prisma.ticket` | Modèle absent |
| `tickets/dto/create-ticket.dto.ts:3` | `import { TicketPriority, TicketStatus }` | Enums absents |

**Cascade attendue.** Les `UpdateXDto` dérivés par `PartialType()` de DTO dont l'import d'enum a échoué deviennent vides, ce qui multiplie les erreurs « Property does not exist ». Ces erreurs sont des symptômes, pas des défauts.

**Correctif prévisible :** supprimer les 8 dossiers (972 lignes) devrait suffire. Aucune autre erreur n'est visible à la lecture. *À confirmer par un build réel.*

**Trois erreurs décrites dans `apps/backend/CLAUDE.md:53-58` ne correspondent plus au code :**
- `src/invoices/services/invoice-pdf.service.ts` — ce chemin n'existe pas. Le fichier réel est `src/invoices/invoice-pdf.service.ts`, et sa méthode `generate()` est déjà `async` et retourne `Promise<Buffer>`. Pas de défaut.
- `src/invoices/services/invoice-email.service.ts` — **ce fichier n'existe nulle part**. L'envoi passe par `mail.service.ts:30-53`.
- `QueryWarehouseDto` — **zéro occurrence dans tout `src/`**. `warehouses.service.ts` est une classe vide de 5 lignes.

Ce fichier de contexte doit être corrigé : il envoie sur trois fausses pistes.

**Autres points.** Trois fichiers vides : `auth/strategies/local.strategy.ts`, `mail/mail.controller.ts`, `users/dto/permissions.decorator.ts`. `ConfigModule` sans `validationSchema` — aucune variable d'environnement n'est validée au démarrage. Aucun DTO de sortie : les entités Prisma sont renvoyées telles quelles, y compris depuis `users` (à vérifier pour `password` et `twoFactorSecret`). 42 fichiers `*.spec.ts` existent mais leur exécution n'a pas été vérifiée.

**Ce qui est bien fait :** le schéma Prisma est riche et correctement relationné (`@@unique` sur `ProductPricing:532`, historique de pipeline dédié, relations nommées). La chaîne d'authentification est solide. L'adaptateur de passerelle est correctement abstrait derrière une interface (`common/gateway/gateway-adapter.interface.ts`) avec injection par token — changer de prestataire ne touchera qu'un fichier, exactement ce que demande le CDC §2.2.

### 5.2 Frontend *(compilé et linté — résultats réels)*

**`npm run build` échoue.** Une seule erreur, jamais documentée :

```
tsconfig.app.json(3,5): error TS5101: Option 'baseUrl' is deprecated and will
stop functioning in TypeScript 7.0. Specify compilerOption
'"ignoreDeprecations": "6.0"' to silence this error.
```

TypeScript installé : **6.0.3**. `tsconfig.app.json:3` déclare `"baseUrl": "."`. La compilation s'arrête là — **aucun fichier source n'est même type-checké**, et `vite build` n'est jamais atteint (`dist/` n'est pas créé). L'affirmation de `apps/frontend/CLAUDE.md:35` (« `npm run build` doit passer avant de considérer une tâche terminée ») décrit une exigence aujourd'hui non tenue. Correctif : supprimer `baseUrl` (`paths` fonctionne seul en `moduleResolution: bundler`) ou ajouter `"ignoreDeprecations": "6.0"`. Effort : **S**.

**`npm run lint` échoue** — 3 erreurs, **toutes situées dans du code mort** :
- `components/ui/navigation-menu.tsx:166` et `components/ui/sidebar.tsx:722` — `react-refresh/only-export-components`
- `hooks/use-mobile.ts:14` — `react-hooks/set-state-in-effect`, `setState` synchrone dans un effet

`use-mobile.ts` n'est importé que par `sidebar.tsx`, lui-même jamais importé. Supprimer le code mort résout les 3 erreurs.

**Dette technique.**

| Constat | Mesure |
| --- | --- |
| Fichiers de 0 octet sous `src/` | **18** : tout `routes/` (4), tout `services/` (2), tout `store/` (3), tout `providers/` (3), tout `config/` (3), 3 layouts sur 4 |
| `providers/ueryProvider.tsx` | Faute de frappe pour `QueryProvider.tsx`, et vide |
| Code mort dans `components/ui/` | **1 705 lignes sur 2 004** (10 fichiers sur 18) |
| `src/App.css` | 185 lignes, gabarit Vite, importé nulle part |
| `src/data/mock.ts:340-519` | ~180 lignes de reporting dupliqué, importées nulle part |
| Dépendances à zéro import | **15** : `axios`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `@hookform/resolvers`, `jwt-decode`, `date-fns`, `react-helmet-async`, `react-error-boundary`, `react-hot-toast`, `react-icons`, `react-intersection-observer`, `react-use`, `@fontsource-variable/geist` |
| Dépendances utilisées seulement par du code mort | 3 : `@base-ui/react`, `class-variance-authority`, `next-themes` |
| `strict` TypeScript | **Absent de `tsconfig.app.json`** — contredit `apps/frontend/CLAUDE.md:12`. En contrepartie, **zéro `any`** dans tout `src/` |
| Tests, CI | **Aucun** des deux |

Les 12 premières dépendances de cette liste sont précisément celles qui seraient nécessaires pour brancher l'API — elles ont été installées en prévision, jamais utilisées.

---

## 6. Identité visuelle

Confrontation à `DESIGN.md`. Le constat est meilleur que redouté sur la couleur, plus sévère sur la structure.

**Couleurs en dur — 9 occurrences, 2 fichiers.** Bien moins que ce que laissait craindre le contexte :

| Fichier:ligne | Valeur | Jeton correspondant |
| --- | --- | --- |
| `DashboardPage.tsx:70,71` | `stopColor="#0e7c86"` | `wire` |
| `DashboardPage.tsx:74` | `stroke="#e3e5e1"` | `line` |
| `DashboardPage.tsx:75,76` | `fill: "#5b6472"` | `slate` |
| `DashboardPage.tsx:78` | `borderColor: "#e3e5e1"` | `line` |
| `DashboardPage.tsx:81` | `stroke="#0e7c86"` | `wire` |
| `ReportsPage.tsx:178` | `color="#0e7c86"` | `wire` |
| `ReportsPage.tsx:179` | `color="#e8a23d"` | `amber` |

Toutes concernent `recharts`, qui n'accepte pas les classes Tailwind. Toutes correspondent exactement à un jeton existant. **Zéro classe de palette Tailwind par défaut** (`bg-gray-*`, `bg-teal-*`…) et **zéro valeur arbitraire `bg-[#...]`** dans tout `src/` : sur ce point la discipline a été tenue. Correctif : lire les jetons via `getComputedStyle` ou exposer des constantes dérivées des variables CSS. Effort **S**.

**Conflit de design system — non tranché, et bloquant.** `src/index.css:9-25` déclare les 11 jetons MAKOR plus 3 familles de police. **Aucune** des variables attendues par shadcn/ui n'est déclarée : ni `--background`, ni `--foreground`, ni `--primary`, ni `--muted-foreground`, ni `--border`, ni `--sidebar`, ni `--radius`. Les 10 composants shadcn sont donc sans style — et comme ils sont aussi tous morts, le problème est aujourd'hui invisible. Il deviendra bloquant dès la première tentative d'utilisation. C'est la décision structurante de `DESIGN.md` §7, toujours ouverte.

**Typographie.** Les 3 familles sont déclarées. `font-display` est utilisé. En revanche `.font-mono-tabular` — que `DESIGN.md` §3 impose sur **toute** donnée chiffrée en colonne — n'est pas appliqué systématiquement, et les colonnes de montants ne s'alignent donc pas.

**Formats métier.** `src/lib/format.ts` **n'existe pas** ; les formatteurs sont dans `src/lib/utils.ts` (`formatCFA:9`, `formatDate:13`, `generateRef:31`, `exportRowsAsCsv:35`). Ils fonctionnent, mais sont contournés à deux endroits : `ReportsPage.tsx:29-35` redéfinit ses propres `fmtFcfa`/`fmtNum`, et les 11 placeholders écrivent les montants en chaîne littérale (`"12 300 000 FCFA"`, `placeholders.tsx:85`). `src/lib/status.ts`, recommandé par `DESIGN.md` §6, **n'existe pas** — les correspondances statut/couleur sont dispersées.

**Les quatre états d'écran.**

| État | Traitement |
| --- | --- |
| Chargement | **Aucun**. Le seul `Skeleton` n'est référencé que par du code mort. Cohérent avec l'absence d'appels réseau, mais tout est à écrire. |
| Vide | **Correct** — 5 occurrences réelles (`ModuleListPage.tsx:170`, `ClientsPage.tsx:183`, `PipelinePage.tsx:178`, `Topbar.tsx:82`, `OpportunityQualificationModal.tsx:203`) |
| Erreur | **Aucun**. Zéro message d'erreur, zéro bouton « Réessayer » dans tout `src/`. `react-error-boundary` est installé et jamais importé. |
| Contenu | Présent partout |

**Accessibilité.** `focus-visible` sur les primitives réellement utilisées (13 occurrences), `aria-label` (9 occurrences), fermeture par `Échap` dans `Modal.tsx:18-20`. Manquent : le piège de focus et la restitution du focus dans les modales, et surtout **l'alternative clavier au drag & drop du pipeline**, exigée par `DESIGN.md` §6 — `PipelinePage.tsx:54-65` n'implémente que la souris.

**Responsive — la lacune la plus nette.** Points de rupture présents uniquement dans `DashboardPage.tsx:52,58,59` et `ReportsPage.tsx:158,177,182,187`. **Aucun `md:` ou `lg:` dans `ClientsPage.tsx`, `PipelinePage.tsx`, `CampaignsPage.tsx` ni `ModuleListPage.tsx`.** `components/ui/table.tsx:6` se contente d'un `overflow-x-auto` : la bascule tableau → cartes empilées sous `md`, exigée par `DESIGN.md` §6 et par le CDC §8.4, **n'existe nulle part**. L'application n'est pas utilisable sur mobile.

---

## 7. Scénarios et recommandation

**Note liminaire.** La commande d'audit demandait trois scénarios portant sur le remplacement du backend, au motif que son périmètre ne correspondrait pas au cahier des charges. Cette prémisse est infirmée par la §2 : le backend couvre les 15 entités du CDC, et les modules hors périmètre sont morts et représentent 8,2 % du code. Un scénario « repartir d'un backend conforme au CDC » reviendrait à réécrire 10 813 lignes conformes pour en supprimer 972 mortes — il n'a pas de justification factuelle, et le chiffrer sérieusement serait trompeur. Les trois scénarios ci-dessous portent donc sur la décision qui se pose réellement : **quel sort réserver au frontend**, le backend étant conservé et nettoyé dans les trois cas.

Base commune aux trois : suppression des 8 dossiers orphelins, correction du `tsconfig` frontend, fermeture des 5 contrôleurs ouverts. **≈ 1 semaine**, non négociable et préalable à tout.

### Scénario A — Frontend reconstruit intégralement

- **On garde :** le backend nettoyé, les jetons `@theme` de `index.css`, `DESIGN.md` comme spécification, les 5 pages réelles comme référence visuelle à réinterpréter.
- **On jette :** les 59 fichiers de `src/`, y compris les 8 primitives maison et les 5 pages.
- **Durée :** 16 à 20 semaines.
- **Risques :** on jette 299 lignes de primitives cohérentes et 5 pages qui portent déjà l'identité visuelle ; aucun livrable intermédiaire avant plusieurs semaines ; la maquette actuelle a une valeur de validation auprès de la direction, la perdre est un coût politique.

### Scénario B — Câblage progressif de la maquette existante

- **On garde :** tout le frontend actuel, y compris les 11 placeholders et la fabrique `page()`.
- **On jette :** uniquement `src/data/mock.ts` et `reporting-juillet-2026.ts`, remplacés par des appels API.
- **Durée :** 11 à 13 semaines.
- **Risques :** élevés. `ModuleListPage` est un composant générique piloté par configuration — il ne peut pas porter les écrans réels de Devis, Bon de commande ou Facturation, qui ont des lignes d'articles, des totaux, de la TVA, des transitions de statut. Le câbler revient à le réécrire onze fois. Surtout, ce scénario n'impose pas de reconstruire le socle : on brancherait des pages sur une application qui n'a ni store d'authentification, ni routes protégées, ni gestion de rôle. La dette se paierait plus tard, plus cher.

### Scénario C — Socle reconstruit, puis pages migrées une à une *(recommandé)*

- **On garde :** le backend nettoyé, les 8 primitives maison, les jetons, les 5 pages réelles (recâblées, pas réécrites), `DESIGN.md`.
- **On jette :** les 18 fichiers vides remplacés par de vraies implémentations, les 1 705 lignes mortes de `components/ui/`, les 15 dépendances inutilisées ou leur activation effective, la fabrique `placeholders.tsx` et ses 11 pages.
- **Déroulé :** on écrit d'abord ce qui n'existe pas et que tout le reste suppose — client axios avec intercepteurs, store d'authentification Zustand, `ProtectedRoute`, écran 2FA réel, navigation conditionnée par rôle, couche `services/` et hooks TanStack Query, quatre états d'écran systématisés. Puis on migre module par module, chacun livrable et démontrable.
- **Durée :** 13 à 15 semaines, dont 3 à 4 pour le socle.
- **Risques :** la décision `DESIGN.md` §7 doit être prise avant la première ligne de style, sinon le socle est à refaire. La passerelle SMS/WhatsApp reste un aléa externe non maîtrisé.

### Recommandation : scénario C

Trois raisons. D'abord, il est le seul à traiter le vrai problème : ce qui manque au frontend n'est pas des pages, c'est un socle — 18 fichiers vides dont tout dépend. B les laisse vides, A les réécrit mais jette aussi ce qui va bien. Ensuite, il préserve le seul actif réel de la maquette : une identité visuelle déjà crédible, portée par 8 primitives cohérentes et 5 pages. Enfin, il produit des livrables démontrables toutes les deux à trois semaines, ce qui compte face à une direction qui a déjà vu une maquette et attend un produit.

L'écart entre C (13-15 semaines) et B (11-13) est faible ; l'écart de dette est considérable. L'écart entre C et A (16-20) est réel et ne s'achète rien d'autre qu'une réécriture de ce qui fonctionne déjà.

Ordre de grandeur cohérent avec le planning indicatif du CDC §10 (23 semaines), dont environ 8 sont déjà acquises côté backend.

---

## 8. Plan d'action priorisé

### Vague 1 — Fondations

| # | Chantier | Application | Pourquoi maintenant | Dépend de | Effort |
| --- | --- | --- | --- | --- | --- |
| 1 | Fermer les 5 contrôleurs ouverts (`audit`, `roles`, `permissions`, `role-permissions`, `departments`) ; poser un `APP_GUARD` global + `@Public()` | backend | Faille active : le journal d'audit est public et effaçable, les rôles créables par quiconque. Rien ne justifie d'attendre. | — | **S** |
| 2 | Supprimer les 8 dossiers orphelins (972 lignes) | backend | Cause racine unique de la rupture de compilation. Rien ne peut être vérifié tant que le build ne passe pas. | Décision Q5 (§9) | **S** |
| 3 | `npm install` + `npx prisma generate` + `npm run build`, confirmer le retour au vert | backend | Valide le chantier 2 et lève la réserve de méthode de cet audit. | 2 | **S** |
| 4 | Corriger `tsconfig.app.json:3` (`baseUrl`), activer `strict` | frontend | Le build échoue avant tout type-check. Activer `strict` maintenant coûte peu — zéro `any` dans le code actuel. | — | **S** |
| 5 | Supprimer le code mort frontend : 10 composants `ui/`, `use-mobile.ts`, `App.css`, `mock.ts:340-519` | frontend | Résout les 3 erreurs de lint et vide le terrain avant la décision 6. | 4 | **S** |
| 6 | **Trancher `DESIGN.md` §7** — primitives maison ou shadcn/ui — et poser le pont de variables CSS | frontend | Conditionne chaque composant écrit ensuite. Trancher après aurait un coût de reprise sur tout. | 5 | **M** |
| 7 | Appliquer `@Roles()` sur les 24 contrôleurs non protégés, conformément à la matrice §7 ; brancher ou retirer `PermissionsGuard` | backend | Le frontend va conditionner ses menus par rôle : il lui faut une API qui applique les mêmes règles, sinon le contrôle est cosmétique. | 1, 3 | **M** |
| 8 | Socle frontend : client axios + intercepteurs, store auth Zustand, `ProtectedRoute`, écran 2FA réel, `services/`, hooks TanStack Query | frontend | Les 18 fichiers vides sont la dépendance de tout module fonctionnel. C'est le goulot d'étranglement du projet. | 4, 6, 7 | **L** |
| 9 | Navigation et actions conditionnées par rôle ; 5 tableaux de bord distincts branchés sur `/dashboard/*` | frontend | Les 5 endpoints par rôle existent déjà côté backend et ne sont consommés par personne. | 8 | **L** |

### Vague 2 — Couverture fonctionnelle V1

Ordre choisi pour suivre le cycle de vente du CDC §4.6 : chaque module consomme les données du précédent, et le brancher dans le désordre obligerait à des jeux d'essai artificiels.

| # | Chantier | Application | Pourquoi maintenant | Dépend de | Effort |
| --- | --- | --- | --- | --- | --- |
| 10 | Brancher Clients et Prospects sur l'API ; ajouter la timeline §4.2 et la conversion prospect→opportunité §4.3 | les deux | Entrée du pipeline. Deux pages déjà amorcées, coût de bascule faible. | 8 | **M** |
| 11 | Brancher Pipeline et Opportunités ; règles de transition conditionnées | frontend | Le drag & drop existe déjà, il lui manque l'API et les conditions. | 10, Q1+Q2 (§9) | **M** |
| 12 | Produits & Paramètres (catalogue, grille tarifaire, secteurs/pays/devises/TVA) | frontend | Devis et campagnes en dépendent : sans catalogue tarifé, rien n'est chiffrable. | 8 | **M** |
| 13 | Devis → Bons de commande → Contrats, avec PDF et envoi | frontend | Cœur du cycle de vente. Backend conforme, il ne manque que l'interface. | 11, 12, Q3 (§9) | **L** |
| 14 | Facturation et Encaissements, rapprochement | frontend | Périmètre exclusif du Manager, aujourd'hui sans aucune interface. | 13 | **M** |
| 15 | Campagnes : interface complète, suivi temps réel via Socket.IO | frontend | Le backend diffuse déjà `campaign:updated` et `campaign:anomaly` dans le vide. | 12 | **L** |
| 16 | **Choisir le prestataire SMS/WhatsApp et remplacer le mock** | backend | Seule dépendance externe du projet, et la plus longue à contractualiser. À lancer en parallèle dès la vague 1. | Décision commerciale | **L** |
| 17 | Agenda et rendez-vous : calendrier réel, rappels, compte rendu | frontend | Alimente les indicateurs Superviseur et Commercial du §4.1. | 10 | **M** |
| 18 | Documents (GED) avec téléversement réel | frontend | Backend conforme ; rattachement aux fiches déjà modélisé. | 13 | **M** |
| 19 | Sender ID, Audit (réservé Super Admin), Notifications | frontend | Trois modules courts, backend prêt. | 8, 1 | **M** |
| 20 | Reporting branché sur l'API, exports CSV/XLSX/PDF serveur | frontend | Les 6 endpoints et les exports existent déjà ; la page affiche des chiffres figés. | 14 | **M** |
| 21 | Recherche globale branchée + **import CSV clients/prospects** (seul manque backend de la §4.17) | les deux | L'import conditionne la reprise de données, donc la mise en production. | 10 | **M** |

### Vague 3 — Finition

| # | Chantier | Application | Pourquoi maintenant | Dépend de | Effort |
| --- | --- | --- | --- | --- | --- |
| 22 | Responsive : bascule tableau → cartes sous `md` sur toutes les vues liste | frontend | Exigence §8.4 du CDC, aujourd'hui non tenue. À faire une fois les pages stabilisées. | Vague 2 | **L** |
| 23 | Quatre états d'écran systématisés : squelettes et états d'erreur avec « Réessayer » | frontend | L'état « erreur » n'existe nulle part. Écrire les squelettes avant que les pages soient figées serait à refaire. | Vague 2 | **M** |
| 24 | Accessibilité : piège de focus des modales, alternative clavier au drag & drop, `aria-label` généralisés | frontend | `DESIGN.md` §6 : non négociable. | 22 | **M** |
| 25 | Mode sombre (`DESIGN.md` §2) | frontend | `next-themes` installé, `ThemeProvider` vide. Cosmétique, donc en dernier. | 6 | **M** |
| 26 | Tests frontend et CI sur les deux applications | les deux | Zéro test frontend aujourd'hui ; les 42 specs backend ne sont pas exécutées automatiquement. | Vague 2 | **L** |
| 27 | `Dockerfile` backend et frontend ; `docker-compose.yml` ne couvre que postgres/redis/pgadmin | les deux | Livrable §11 du CDC. Requis pour la recette et la production. | 26 | **M** |
| 28 | Livrables §11 : diagrammes UML, manuel utilisateur par profil, doc d'intégration passerelle | — | Contractuels. Rédigeables une fois le produit stabilisé. | 27 | **L** |
| 29 | Sauvegardes quotidiennes + restauration testée, HTTPS, supervision 99,5 % | infra | Exigences §8.2 et §8.3, conditions de mise en production. | 27 | **M** |

**Dépendances critiques à surveiller :** le chantier 6 (design system) bloque 8, qui bloque toute la vague 2 — c'est le chemin critique. Le chantier 16 (prestataire SMS) est la seule dépendance externe : à lancer immédiatement, en parallèle, car son délai n'est pas maîtrisé. Le chantier 3 conditionne toute vérification backend ultérieure.

---

## 9. Questions ouvertes

Points impossibles à implémenter sans arbitrage. Questions fermées, réponse attendue par oui/non ou par choix.

**Q1 — Pipeline personnalisé (§4.6, REQ-4.6-10 et 4.6-11).** Le CDC dit à la fois « Avoir un pipeline personnalisé » et « Création de pipeline personnalisé par le superadmin ». Le modèle actuel (`PipelineStage:347`) ne connaît **qu'un seul jeu d'étapes global**.
> Faut-il **un seul pipeline configurable par le Super Admin** (ajout/renommage/réordonnancement des étapes, appliqué à tous), ou **plusieurs pipelines coexistants** affectés par produit, par équipe ou par commercial ? Si plusieurs : affectés selon quel critère ?

**Q2 — « Drive and drop conditionné » (§4.6).** Formulation illisible. Le champ `PipelineStage.requiresSignedOrder` (`schema.prisma:357`) suggère une intention.
> La condition à implémenter est-elle bien : **interdire le passage à une étape tant que son prérequis documentaire n'est pas satisfait** (par exemple, pas d'entrée en « Contrat » sans bon de commande signé) ? Oui / Non. Si non, quelle règle exacte ?

**Q3 — Mentions « (ia) » et « (claudeia) » (§4.6 à §4.9).** Elles apparaissent dans les titres de §4.6, §4.7, §4.8, §4.9, et dans « génération d'une proposition chiffrée … avec ia » (§4.8) et « création du contrat … avec ia » (§4.9). Aucune ne décrit un comportement.
> Ces mentions désignent-elles **une fonctionnalité d'IA à livrer en V1**, ou **une note de rédaction indiquant que la section était à compléter** ? Si fonctionnalité : la génération « avec ia » du devis consiste-t-elle à **rédiger le texte commercial**, à **suggérer les lignes et quantités depuis l'historique client**, ou à **proposer un prix** ? Une seule de ces trois réponses.

**Q4 — Messagerie interne (§4.1, REQ-4.1-42 à 45).** « Envoie et recois de message et des documents entre eux par email sur la plateforme ». Le CDC §5 repousse pourtant le « centre de communication unifié » en V2.
> S'agit-il d'une **messagerie interne entre utilisateurs du CRM**, stockée en base et notifiée par email ? Ou simplement de la **capacité d'envoyer un document par email depuis une fiche**, ce que `MailService` fait déjà ? La seconde lecture est couverte par l'existant.

**Q5 — Sort des 8 dossiers orphelins.** `companies`, `company`, `offers`, `subscriptions`, `tickets`, `warehouses`, `devices`, `interventions` — 972 lignes, non montées, référençant des modèles inexistants, seule cause de la rupture de compilation.
> **Confirmez-vous leur suppression pure et simple ?** Oui / Non. Si non, laquelle de ces fonctions (support client, abonnements, entrepôts, interventions) doit être ajoutée au périmètre, et sur quelle base — elle ne figure dans aucune section du CDC.

**Q6 — Recharges et solde prépayé.** Le modèle `Recharge` (`schema.prisma:832`) et le champ `Customer.walletBalance` (`schema.prisma:232`) implémentent un compte prépayé client. **Aucune section du CDC ne le mentionne.**
> Ce module fait-il partie du périmètre V1 (auquel cas il manque au CDC et devra apparaître dans l'interface), ou doit-il être retiré comme les 8 autres ?

**Q7 — Contradiction interne : signature électronique.** §4.8 exige « aposer de façon electronique le cachet et signature » sur le bon de commande et §4.9 « Signature electronique du client », alors que §5 repousse explicitement la signature électronique en V2 en précisant que « l'envoi par email et le PDF suffisent en V1 ».
> Pour la V1, retient-on **le PDF signé manuellement puis téléversé** (ce que fait déjà `PurchaseOrder.signedDocumentPath`, `schema.prisma:634`), ou **une apposition électronique de cachet et signature** ? La seconde relève du périmètre V2 selon la §5.

**Q8 — Contradiction interne : droits du Manager.** §4.1 attribue au Manager la capacité de « génerer des bons de commande », alors que la matrice §7 lui donne « Lecture » sur le domaine « Pipeline, Devis, BC & Contrats ».
> Le Manager peut-il **créer** des bons de commande ? Oui (et la matrice §7 doit être corrigée) / Non (et la §4.1 doit l'être).

**Q9 — Sender ID et matrice de permissions.** Le domaine « Sender ID » n'apparaît dans **aucune** des 5 colonnes de la matrice §7, alors que §4.1 confie au Manager son « remplissage automatique ».
> À quel domaine de la matrice §7 le Sender ID est-il rattaché, et quel est le niveau d'accès de chacun des 5 rôles ? Par ailleurs, que signifie « remplissage automatique » — **pré-remplir la demande depuis la fiche client**, ou **approuver automatiquement** ?

**Q10 — Passerelle SMS/WhatsApp.** L'adaptateur est correctement abstrait mais son unique implémentation est un mock qui simule 5 % d'échecs (`common/gateway/mock-gateway.adapter.ts`). Aucun SDK de prestataire n'est présent.
> Le prestataire est-il choisi ? Si oui, lequel — la documentation de son API est nécessaire pour chiffrer le chantier 16, qui est le plus long de la vague 2 et la seule dépendance externe du projet.

---

*Fin de l'audit. Aucun fichier du dépôt n'a été modifié pour le produire, hormis la création de ce document.*
