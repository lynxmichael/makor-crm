# CLAUDE.md — Backend CRM MAKOR

> **Emplacement : `makor-crm\apps\backend\CLAUDE.md`**
> Complète le `CLAUDE.md` de la racine, ne le remplace pas. Les décisions actées y sont consignées (D1 à D11).

---

## Stack en place

| Couche                   | État                                                                   |
| ------------------------ | ---------------------------------------------------------------------- |
| Framework                | NestJS 11 — 32 modules montés dans `app.module.ts:66-103`              |
| ORM                      | Prisma 6 — 35 modèles, 20 enums, 16 migrations                         |
| Base de données          | PostgreSQL (`docker-compose.yml` à la racine : postgres, redis, pgadmin) |
| Cache et files d'attente | **BullMQ + ioredis** — `src/queue/queue.module.ts`, files `campaigns` et `reporting` |
| Temps réel               | **Socket.IO** — `src/realtime/realtime.gateway.ts`, auth JWT à la connexion |
| Authentification         | **JWT + refresh rotatif + 2FA TOTP** (`otplib`), argon2, verrouillage 5 tentatives |
| Documentation API        | **Swagger** — `src/main.ts:50-59`, exposé sur `/docs`                  |
| Passerelle SMS/WhatsApp  | Interface `src/common/gateway/gateway-adapter.interface.ts` + **implémentation mock** |
| Tests                    | 42 fichiers `*.spec.ts` — exécution non vérifiée                       |
| Docker                   | **Aucun `Dockerfile`** — seuls postgres/redis/pgadmin sont conteneurisés |

Préfixe global des routes : `api/v1` (`src/main.ts:40`).

## Commandes

```bash
npm install            # node_modules ABSENT du dépôt — requis avant tout
npx prisma generate    # régénère le client Prisma (aussi lancé en postinstall)
npm run build          # nest build (inclut la vérification TypeScript)
npm run seed           # tsx prisma/seed.ts — 5 rôles, permissions, pipeline, produits
npx prisma migrate dev # applique et crée une migration
```

**Règle absolue :** après toute modification de `prisma/schema.prisma`, lancer `npx prisma generate`. Sans cela le client reste désynchronisé et le build échoue en cascade.

---

## État réel — build non vérifié, cause racine identifiée

`node_modules` est absent : **aucun build n'a été exécuté lors de l'audit du 29/07/2026.** Ce qui suit relève de l'analyse statique.

### ⚠️ Ce diagnostic décrit un arbre divergent, pas la ligne principale (voir D12)

**Tout ce qui suit dans cette section a été établi sur un arbre local qui n'est pas `origin/main`.**
Sur la ligne principale, les modèles Prisma prétendus absents **existent** — `Company`, `Offer`,
`Subscription`, `Ticket`, `Warehouse` — avec leur migration
`20260729152741_add_company_offer_subscription_ticket_warehouse`, et un module `src/inventory/`
supplémentaire. **19 migrations contre 16 en local.**

**D1 est suspendu : ne supprimer aucun de ces 8 dossiers.** Le tableau ci-dessous est conservé comme
trace du raisonnement du 29/07, à re-vérifier sur la ligne principale avant toute action.

### Cause racine attendue sur l'arbre local du 29/07 : les 8 dossiers orphelins

`nest build` type-check **tout `src/`**, sans tenir compte de `app.module.ts`. Sur l'arbre local, ces 8 dossiers ne sont montés nulle part mais sont compilés, et référencent des modèles Prisma inexistants :

| Dossier | Référence fautive |
| --- | --- |
| `companies`, `company` | `prisma.company` — modèle absent |
| `offers` | `prisma.offer` — modèle absent |
| `subscriptions` | `prisma.subscription` + enum `SubscriptionStatus` — absents |
| `tickets` | `prisma.ticket` + enums `TicketPriority`, `TicketStatus` — absents |
| `warehouses`, `devices`, `interventions` | Contrôleurs et services : classes vides |

Les `UpdateXDto` dérivés par `PartialType()` de DTO dont l'import d'enum échoue deviennent vides — d'où une cascade d'erreurs « Property does not exist ». **Symptômes, pas défauts.**

~~**Correctif (décision D1) : supprimer les 8 dossiers, 972 lignes.**~~ **Annulé — D1 suspendu par D12.**
Lancer `npm install && npx prisma generate && npm run build` **sur la ligne principale** pour obtenir
le vrai état de compilation, avant tout diagnostic.

### Ces trois fichiers existent bel et bien — correction du 30/07

Le 29/07, cette section affirmait que trois défauts documentés ici « n'existent pas dans le code
actuel ». **C'était une conclusion tirée de l'arbre local divergent.** Les trois existent sur
`origin/main` :

- `src/invoices/services/invoice-pdf.service.ts` — **existe sur la ligne principale.** L'arbre local
  a un `src/invoices/invoice-pdf.service.ts` à plat : les deux structures coexistent dans le dépôt et
  la réconciliation devra choisir.
- `src/invoices/services/invoice-email.service.ts` — **existe sur la ligne principale.** L'arbre local
  ne l'a pas et fait passer l'envoi par `src/mail/mail.service.ts:30-53`.
- `QueryWarehouseDto` — **existe** : `src/warehouses/dto/query-warehouse.dto.ts` sur `origin/main`.

**À retenir :** ne pas conclure à l'inexistence d'un fichier sans avoir vérifié la branche distante.

---

## Sécurité — cinq contrôleurs ouverts, priorité absolue

Il n'y a **pas d'`APP_GUARD` d'authentification global** : seul `ThrottlerGuard` est global (`app.module.ts:106-111`). Chaque contrôleur doit déclarer `@UseGuards(JwtAuthGuard)`, et cinq contrôleurs **montés** ne le font pas :

`audit` · `roles` · `permissions` · `role-permissions` · `departments`

Conséquence : `GET`/`POST`/**`DELETE /api/v1/audit/:id`** sont ouverts à tous, ainsi que le CRUD complet des rôles et permissions. **Le journal d'audit exigé par le CDC §4.16 est public et effaçable.**

Autres manques :

- `@Roles()` n'est utilisé que sur **8 contrôleurs sur 32**. Les 24 autres vérifient qu'un utilisateur est connecté, jamais lequel.
- `PermissionsGuard` (`src/auth/guards/permissions.guard.ts:12`) et `@Permissions()` sont **implémentés et jamais utilisés** — zéro occurrence. Toute la mécanique `Permission`/`RolePermission` est en base et inerte.
- Aucun filtrage par appartenance pour le périmètre « Lecture (soi) » du Commercial.
- Aucun DTO de sortie : les entités Prisma sont renvoyées telles quelles — **vérifier `password` et `twoFactorSecret` sur `users`**.
- `ConfigModule.forRoot()` sans `validationSchema` (`app.module.ts:46-48`) : **aucune variable d'environnement n'est validée au démarrage.**

Fichiers vides : `auth/strategies/local.strategy.ts`, `mail/mail.controller.ts`, `users/dto/permissions.decorator.ts`.

---

## Décisions actées à impact backend

Voir `CLAUDE.md` racine pour l'énoncé complet. Implications techniques ici :

### D1 — Suppression des 8 dossiers orphelins
Simple `rm` de 8 dossiers sous `src/`. Aucun n'est importé, aucune migration nécessaire.

### D2 — Retrait de `Recharges` : chantier distinct, 12 fichiers
**Ne rien supprimer sans arbitrage sur les données existantes.** Périmètre réel du retrait :

| Fichier | Ce qui est touché |
| --- | --- |
| `prisma/schema.prisma:832` | Modèle `Recharge` |
| `prisma/schema.prisma:232` | Champ `Customer.walletBalance` |
| `src/recharges/*` | Module, contrôleur (6 endpoints), service, 2 DTO |
| `src/app.module.ts:87` | Enregistrement du module |
| **`src/campaigns/campaigns.service.ts:422-433`** | **Chaque message accepté décrémente `walletBalance`** — le solde prépayé est câblé dans l'envoi de campagne |
| `src/reporting/reporting.service.ts:126,138` | Colonne « Solde prépayé » de l'export clients |
| `src/reporting/reporting.service.ts:223-241` | Export `recharges` |
| `src/reporting/reporting.controller.ts:73` | `GET /reporting/recharges` |
| `prisma/seed.ts` | Données de démonstration |

Une **migration Prisma destructive** (suppression de table + de colonne) est nécessaire.

### D4 / D5 — Pipelines par commercial et transitions conditionnées
`PipelineStage` (`schema.prisma:347`) est aujourd'hui une **table globale sans propriétaire**. La décision suppose :

- un rattachement des étapes à un utilisateur (ou un modèle `Pipeline` intermédiaire),
- un champ **`canonicalStage` obligatoire** — nouvel enum reprenant les 6 étapes du CDC,
- la migration correspondante et la reprise des `DealStageHistory` existants,
- l'agrégation de tout le reporting sur `canonicalStage`, jamais sur l'étape locale.

Le champ `requiresSignedOrder` (`schema.prisma:357`) est le point d'accroche pour D5. **Le refus de transition doit remonter une raison exploitable par le frontend**, pas un 403 nu.

### D6 — Rédaction IA via l'API Claude
- SDK officiel `@anthropic-ai/sdk`. Modèle par défaut : **`claude-opus-5`**.
- Clé en variable d'environnement `ANTHROPIC_API_KEY`, **validée au démarrage** — ce qui suppose de créer d'abord le `validationSchema` de `ConfigModule`, aujourd'hui absent.
- Le texte généré est persisté en **brouillon éditable**, jamais envoyé au client sans validation humaine explicite.
- Périmètre strict : rédaction du texte commercial des devis et contrats.

### D11 — Passerelle
L'adaptateur mock (`src/common/gateway/mock-gateway.adapter.ts`) reste en place. **Ne coder aucune hypothèse sur l'API d'un prestataire** tant que le choix DEXCHANGE / Orange CI / 360dialog n'est pas tranché. L'abstraction existante est correcte : changer de prestataire ne doit toucher qu'un fichier.

---

## Exigences non fonctionnelles à respecter

- **Sécurité** — HTTPS partout, JWT avec expiration et renouvellement, 2FA sur les comptes sensibles, permissions par rôle **et par module**, clés d'API dédiées et révocables, journal d'audit alimenté sur les actions critiques (le modèle `AuditLog` existe, son remplissage n'est pas généralisé).
- **Performance** — moins de 2 secondes sur les actions courantes ; campagnes et extractions de reporting en asynchrone via BullMQ.
- **Robustesse** — disponibilité 99,5 % en heures ouvrées, reprise automatique de l'envoi en cas d'échec passerelle, sauvegardes quotidiennes avec restauration testée.
