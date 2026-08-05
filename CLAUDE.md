# CLAUDE.md — Monorepo CRM MAKOR Group Telecom

> **Emplacement : à la racine du monorepo** → `makor-crm\CLAUDE.md`

Contexte permanent du projet. Chargé automatiquement au démarrage de chaque session lancée depuis la racine.

---

## Le projet

CRM interne de **MAKOR Group Telecom** (Afrique de l'Ouest), destiné à piloter le cycle de vente complet des produits de messagerie — **SMS Marketing, OTP, API SMS, WhatsApp, Voice, Sender ID** — de la prospection à l'encaissement, avec pilotage technique des campagnes et reporting multi-produits.

- **Devise de référence :** Franc CFA (FCFA). Multi-devises prévu via le module Paramètres.
- **Langue de l'interface et des données :** français (`fr-FR`).

## Documents de référence

| Fichier                   | Rôle                                                                            |
| ------------------------- | ------------------------------------------------------------------------------- |
| `CDC-CRM-MAKOR-v3.md`     | **Cahier des charges — source de vérité fonctionnelle.** Ne jamais le modifier. |
| `design/makor-crm-maquette.html` | **Maquette HTML validée par le DG et les commerciaux le 30/07/2026. Spécification écran par écran du frontend (D15).** Fait autorité sur l'apparence — palette, typographie, densité, parcours. |
| `DESIGN.md`               | Charte d'identité visuelle. **§2 et §3 périmés depuis D14** — la maquette prime sur eux.  |
| `AUDIT.md`                | État des lieux au 29/07/2026 : matrice de cohérence, couverture, plan d'action  |
| `SUIVI.md`                | Journal de bord des séances. À compléter à chaque fin de séance.                |
| `docs/DOSSIER-PROJET.md`  | **Mémo de présentation** : le projet, les rôles, les modules, l'état réel, les questions qu'on posera et quoi répondre. Source unique de la présentation du **7 août 2026**. |
| `docs/QUESTIONS-OUVERTES.md` | **Registre des décisions en attente** — chaque question, qui décide, pour quand, où elle en est. À relire avant toute réunion. |
| `docs/MAQUETTE-PASSE-5.md` | Spécification d'exécution de la passe 5 de la maquette. **Appliquée à moitié** — voir D23. |
| `apps/frontend/CLAUDE.md` | Conventions et état du frontend                                                 |
| `apps/backend/CLAUDE.md`  | Conventions et état du backend                                                  |

**Règle d'arbitrage :** en cas de contradiction entre le code et le cahier des charges, c'est le cahier des charges qui a raison — sauf décision explicite consignée dans la section « Décisions actées » ci-dessous, qui prime alors sur les deux.

## Structure

```
makor-crm/
├── CLAUDE.md · CDC-CRM-MAKOR-v3.md · DESIGN.md · AUDIT.md · SUIVI.md
├── docs/                         Dossier de projet, questions ouvertes, spécifications de passe
├── design/
│   └── makor-crm-maquette.html   Maquette validée — spécification du frontend (D15)
└── apps/
    ├── frontend/             React 19 + Vite + Tailwind v4 + shadcn/ui   → poste Kouassi (D13)
    └── backend/              NestJS + Prisma + PostgreSQL                → poste lynxmichael (D13)
```

## Rôles utilisateurs

Cinq rôles, matrice de permissions en **section 7 du CDC**, tableaux de bord distincts en **section 4.1**.

| Rôle             | Portée                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------- |
| **Super Admin**  | Administration globale, tableau de bord consolidé, audit, pipelines personnalisés       |
| **Admin ventes** | Reporting : volumes et marges FCFA par client et secteur, qualité du pipeline           |
| **Superviseur**  | Supervision de l'équipe : RDV, propositions par canal, ventes par produit et commercial |
| **Commercial**   | Son portefeuille, son pipeline, son agenda                                              |
| **Manager**      | Facturation, encaissements, bons de commande, sender ID                                 |

Valeurs en base (`prisma/seed.ts`) : `SUPER_ADMIN`, `ADMIN_VENTES`, `SUPERVISEUR`, `COMMERCIAL`, `MANAGER`.

Toute vue, tout menu, toute action et tout endpoint doivent être conditionnés par le rôle.

## Pipeline commercial

Étapes canoniques du CDC : `Prospect → RDV → Proposition → Bon de commande → Contrat → Vente`

**Plusieurs pipelines coexistent, affectés par commercial** (décision D1). Chaque étape porte un `canonicalStage` obligatoire pointant vers l'une des 6 étapes ci-dessus : le commercial voit son pipeline, tout le reporting agrège sur `canonicalStage`.

## Entités métier

Client · Prospect · Opportunité · Produit · Campagne · Devis · Bon de commande · Contrat · Facture · Encaissement · Demande Sender ID · Rendez-vous · Document · Utilisateur interne · Journal d'audit

Détail des attributs en **section 6 du CDC**. **Les 15 sont modélisées dans `prisma/schema.prisma`** — voir §2 de `AUDIT.md` pour la correspondance entité ↔ modèle.

---

## État réel du projet (audit du 29/07/2026)

Le backend couvre le cahier des charges : 35 modèles Prisma, 32 modules montés, JWT + 2FA TOTP, BullMQ, Socket.IO, Swagger, 16 migrations. Le frontend est une **maquette** : aucun appel API, aucune authentification, aucune notion de rôle, 11 pages sur 16 générées par une fabrique de placeholders.

Une rupture ouverte, détaillée dans `AUDIT.md` §4 :

1. **Cinq contrôleurs backend montés sans authentification** — `audit`, `roles`, `permissions`, `role-permissions`, `departments`. Le journal d'audit est public et effaçable. Priorité absolue, **et depuis D13 c'est un chantier du poste backend**.
2. ~~**Le build frontend échoue** — `tsconfig.app.json:3`, TypeScript 6 refuse `baseUrl`.~~
   **Résolu le 30/07** (chantiers 4 et 5 d'`AUDIT.md` §8) : `baseUrl` retiré, `strict: true` déclaré
   explicitement, 2117 lignes de code mort supprimées. `npm run build` du frontend est vert.

Le plan d'action priorisé est en **§8 de `AUDIT.md`** (29 chantiers, trois vagues). S'y référer avant d'ouvrir un chantier.

---

## Décisions actées — 29 juillet 2026

Arbitrages rendus par le porteur du projet. **Ils priment sur le CDC en cas de contradiction.**

### Périmètre

- **D1 — Suppression des 8 dossiers orphelins** du backend : `companies`, `company`, `offers`, `subscriptions`, `tickets`, `warehouses`, `devices`, `interventions`. 972 lignes, jamais montées, seule cause de la rupture de compilation.
  > ⚠️ **D1 est SUSPENDU par D12 (30/07/2026) — sa prémisse est fausse sur la ligne principale. Ne rien supprimer.**
- **D2 — Le module `Recharges` sort du périmètre V1.** Contrairement aux 8 dossiers morts, il est monté et fonctionnel : son retrait exige une migration Prisma destructive et touche l'envoi de campagne. **Chantier distinct — ne rien supprimer sans arbitrage sur les données.** Impact détaillé dans `apps/backend/CLAUDE.md`.
- **D3 — Messagerie interne repoussée en V2.** En V1, seul l'envoi de document par email depuis une fiche, déjà couvert par `MailService`. Annule et remplace les exigences REQ-4.1-42 à 45 du CDC.

### Pipeline

- **D4 — Plusieurs pipelines coexistants, affectés par commercial**, chaque étape portant un `canonicalStage` obligatoire (les 6 étapes du CDC). Le reporting agrège sur `canonicalStage`, pour préserver la comparabilité entre commerciaux et le calcul des délais moyens.
- **D5 — Drag & drop conditionné :** interdire le passage à une étape tant que son prérequis documentaire n'est pas satisfait. **Le refus doit être visible à l'écran, avec sa raison** — pas un simple blocage silencieux.

### Intelligence artificielle

- **D6 — Rédaction assistée par IA du texte commercial des devis et contrats, via l'API Claude.** Le texte généré arrive dans un champ **éditable, marqué comme brouillon**. **Aucun envoi client sans validation humaine explicite.** Clé d'API en variable d'environnement, validée au démarrage. Périmètre strict : rédaction de texte — ni calcul de prix, ni suggestion de lignes.

### Documents et signature

- **D7 — V1 : PDF signé manuellement puis téléversé**, via `PurchaseOrder.signedDocumentPath`. Pas d'apposition électronique de cachet ni de signature — périmètre V2 selon CDC §5. Tranche la contradiction interne du CDC entre §4.8/§4.9 et §5.

### Rôles

- **D8 — Le Manager peut créer des bons de commande.** **La matrice §7 du CDC est erronée sur ce point** (elle lui donne « Lecture » sur le domaine Pipeline/Devis/BC/Contrats) ; §4.1 fait foi. Correction consignée ici, le CDC n'est pas modifié.
- **D9 — Sender ID**, domaine absent de la matrice §7 du CDC :

  | Rôle | Droits |
  | --- | --- |
  | Super Admin | Crée, consulte tout, approuve, rejette |
  | Manager | Crée, consulte tout — **sans pouvoir d'approbation** |
  | Commercial | Crée pour ses clients, consulte les siennes |
  | Superviseur · Admin ventes | Lecture seule sur tout |

  « Remplissage automatique » = **pré-remplir la demande depuis la fiche client** (raison sociale, pays, secteur, contact). **Jamais d'approbation automatique.**

### Design system

- **D10 — Option B de `DESIGN.md` §7 : shadcn/ui devient le socle de composants.** Pont de variables CSS à déclarer, mappant les jetons MAKOR sur les variables shadcn, plus la variante mode sombre. `SignalMeter` et `KpiCard` restent maison. Les autres primitives migrent progressivement. **L'identité visuelle vient du thème, pas de composants écrits à la main.** Détail dans `apps/frontend/CLAUDE.md`.

### Passerelle SMS/WhatsApp

- **D11 — Prestataire non arrêté**, décision commerciale en cours. Pistes : **DEXCHANGE SMS** et connexion directe **Orange Côte d'Ivoire** pour le SMS, **360dialog** pour WhatsApp. L'adaptateur mock reste en place. **Ne faire aucune hypothèse sur l'API d'un prestataire tant que le choix n'est pas confirmé.**

---

## Décisions actées — 30 juillet 2026

### D12 — L'audit du 29/07 a été mené sur un arbre divergent. D1 est suspendu.

`git fetch` du 30/07 a révélé que `origin/main` avait **4 commits** que l'arbre local n'avait pas
(`b04fc84` 24/07, `372888a` 27/07, `e80837c` 29/07 09:22, `d1c1555` 29/07 17:24), pour une base
commune remontant à `96f8927` du 23/07. L'audit a donc décrit un arbre qui **n'est pas la ligne
principale du projet**. Divergence réelle : 53 fichiers.

**Ce que cela invalide :**

- **D1 est suspendu.** Sa justification — « ces dossiers référencent des modèles Prisma inexistants,
  donc ils sont morts » — est **vraie en local et fausse sur `origin/main`**, où le schéma contient
  `model Company` (l.1052), `Offer` (1084), `Subscription` (1123), `Ticket` (1160), `Warehouse` (1186),
  avec une migration dédiée `20260729152741_add_company_offer_subscription_ticket_warehouse` et un
  module `src/inventory/` absent de l'arbre local. **19 migrations sur la ligne principale contre 16
  en local.** Ce n'est pas du code mort : c'est une extension inventaire/ticketing en cours.
  **Ne rien supprimer.** Un nouvel audit sur la ligne principale doit précéder tout arbitrage.
- **Les « trois erreurs fausses » signalées dans `apps/backend/CLAUDE.md` ne sont pas fausses.**
  `invoices/services/invoice-email.service.ts`, `invoices/services/invoice-pdf.service.ts` et
  `warehouses/dto/query-warehouse.dto.ts` (`QueryWarehouseDto`) **existent sur `origin/main`**. La
  version antérieure du fichier décrivait la ligne principale ; c'est la correction du 29/07 qui
  décrivait un arbre divergent.
- Tout décompte de lignes, d'entités et de fichiers dans `AUDIT.md` est à reprendre sur la ligne
  principale avant d'être cité comme référence.

**Ce qui reste valide, vérifié sur `origin/main` :** la faille de sécurité est identique sur les deux
branches — seul `ThrottlerGuard` en `APP_GUARD`, pas de `public.decorator.ts`, et **aucun `UseGuards`**
sur les cinq contrôleurs `audit`/`roles`/`permissions`/`role-permissions`/`departments`. Le chantier
de fermeture de ces contrôleurs reste la priorité et **ne dépend pas de la réconciliation.**
`tsconfig.app.json` étant identique des deux côtés, le build frontend est cassé sur les deux aussi.

**Méthode retenue :** la documentation est livrée sur la branche `docs/audit-et-arbitrages`, construite
**depuis `origin/main`** et ne contenant que des `.md`. `origin/main` n'est pas réécrit — les 4 commits
distants sont préservés. La réconciliation du code est un chantier distinct, qui suppose de trancher
le sort des modèles `Company`/`Offer`/`Subscription`/`Ticket`/`Warehouse`.

**Règle qui en découle :** commencer toute séance par un `git fetch`, avant de lire l'état du dépôt.

> **Précision du 31/07 — `src/inventory/` n'est pas une extension active.** Vérifié sur la ligne
> principale : le dossier existe, mais **`app.module.ts` ne contient aucune occurrence d'`Inventory`**.
> Il n'est pas monté. C'est du **code mort au même titre que les 8 dossiers de D1**, pas un chantier en
> cours. Ce qui ne change rien à la conclusion de D12 — **ne rien supprimer** tant que le sort
> fonctionnel des modèles `Company`/`Offer`/`Subscription`/`Ticket`/`Warehouse` n'est pas tranché — mais
> retire l'argument « développement en cours » de la balance.
>
> **Décompte corrigé : 19 migrations, pas 21.** Le dossier `prisma/migrations/` contient 21 entrées,
> dont `README.md` et `migration_lock.toml`. Les 19 migrations sont **identiques à `origin/main`**
> (`git diff origin/main -- apps/backend/prisma/migrations` est vide). Le « 19 contre 16 » de D12 reste
> donc exact.

---

## Décisions actées — 31 juillet 2026

### D13 — Répartition du travail entre deux postes

Accord du 30/07 avec **lynxmichael**, propriétaire du dépôt.

| Périmètre | Poste |
| --- | --- |
| `apps/backend/` — y compris `apps/backend/CLAUDE.md` et `prisma/` | **lynxmichael** |
| `apps/frontend/`, `design/` | **Kouassi** |
| Documentation racine (`CLAUDE.md`, `AUDIT.md`, `SUIVI.md`, `DESIGN.md`) | partagée |

**Personne ne modifie le dossier de l'autre.** Un défaut constaté hors de son périmètre se **signale**,
il ne se corrige pas.

**Conséquence directe sur le plan d'action (`AUDIT.md` §8) :** les chantiers **1** (fermer les cinq
contrôleurs ouverts), **3** (`npm install` + build backend de référence) et **7** (`@Roles()` sur les
24 contrôleurs) passent chez lynxmichael. Le chantier 1 reste la priorité absolue du projet — il n'est
simplement plus tenu par ce poste. Le chantier 8 (socle frontend) en dépend toujours : le frontend ne
peut pas conditionner ses menus par rôle si l'API ne le fait pas.

**Méthode de collaboration :**

- Branches préfixées **`kouassi/`** pour ce poste.
- **Pull request systématique.** Jamais de push direct sur `main`.
- **`git fetch` en début de séance**, avant toute lecture de l'état du dépôt (règle déjà posée par D12).

### D14 — Palette et typographie validées par la direction

Le **directeur général et les équipes commerciales ont validé le 30/07** l'identité visuelle portée par
la maquette `design/makor-crm-maquette.html`.

| | Retenu (D14) | Remplacé |
| --- | --- | --- |
| Fond de barre latérale | `#001B2E`, dégradé vers `#00304F` | — |
| Couleur d'action | **orange `#F39304`** (`--primary-dark:#D97D00`, `--primary-soft:#FFF4E2`) | teal `#0e7c86` / corail `#ff6b4a` |
| Fond d'application | `#F4F6FB`, surfaces `#FFFFFF`, bordures `#E8EBF4` | `#f5f6f4` / `#e3e5e1` |
| Rayons | `--radius:16px`, `--radius-sm:11px` | — |
| Typographie | **Manrope** (titres) + **Inter** (UI et texte) | Space Grotesk + IBM Plex Sans/Mono |

**La palette teal/corail de `DESIGN.md` n'a jamais été validée par personne.** Elle est abandonnée.

**Décision étendue à la typographie** : la maquette est validée dans son ensemble, il n'y aurait aucun
sens à en retenir les couleurs et à en écarter les polices.

**Source de vérité : le second bloc `:root` de la maquette.** Le fichier en contient deux ; le premier
est écrasé par le second (il déclare notamment `--sidebar:#00263F`, remplacé par `#001B2E`). Ne jamais
relever une valeur dans le premier bloc.

**Conséquences :**

- `DESIGN.md` **§2 et §3 sont périmés** — ils restent lisibles pour mémoire, marqués comme tels.
- **`DESIGN.md` §2/§3 et `apps/frontend/src/index.css` sont à réécrire** depuis la maquette. C'est un
  **chantier distinct, non réalisé le 31/07** : 26 fichiers du frontend consomment les jetons actuels
  (`slate` 70×, `ink` 48×, `line` 32×, `wire` 25×), la réécriture doit trancher au passage si l'on
  conserve les noms de jetons en changeant leurs valeurs ou si l'on renomme.
- **Le chantier 6 d'`AUDIT.md` §8 (pont de variables CSS shadcn) est SUSPENDU** jusqu'à cette
  réécriture : le pont doit être posé sur les jetons définitifs, pas sur ceux qu'on abandonne.

### D15 — La maquette HTML est la spécification du frontend

`design/makor-crm-maquette.html` **fait référence écran par écran** pour l'implémentation React. Elle
contient :

- **15 modules** en barre latérale, chacun portant ses rôles autorisés en `data-roles` — la navigation
  conditionnée par rôle exigée par le CDC §7 y est déjà résolue, module par module ;
- l'**écran de connexion avec 2FA** ;
- les **cinq tableaux de bord par rôle** du CDC §4.1 ;
- une **vue détail client**, des graphiques **SVG sans aucune dépendance**, un parcours de bout en bout
  et une visite guidée.

Elle est **cohérente avec les décisions déjà actées** : « Messagerie » y est badgée **V2**, conforme à D3.

En cas d'écart entre la maquette et `DESIGN.md`, **la maquette l'emporte** — elle est validée, pas lui.
En cas d'écart entre la maquette et le CDC sur une **règle métier**, le CDC l'emporte : la maquette fait
autorité sur la forme, pas sur le fond.

---

## Décisions actées — 5 août 2026

### D16 — Étape 1 : D13 levée pour le backend, et le cinquième rôle devient `FINANCE`

Deux arbitrages rendus à l'ouverture de l'étape 1 (fondations).

**1. D13 est levée pour ce chantier.** `apps/backend/` entre dans le périmètre du poste Kouassi, le
temps de fermer la faille d'authentification et d'appliquer le renommage de rôle. La clause de D13 sur
la méthode reste entière : branches `kouassi/`, **pull request systématique, jamais de push direct sur
`main`**. La levée est ponctuelle et bornée à ces deux chantiers — le reste d'`apps/backend/` demeure
le périmètre de lynxmichael, **à qui il faut signaler ce recouvrement avant d'ouvrir la PR.**

**2. Le cinquième rôle s'appelle `FINANCE`**, en base comme dans l'interface. Le CDC §7 l'appelle
« Manager » ; la maquette validée par la direction dit « Finance », plus fidèle au périmètre réel
(facturation, encaissements, recouvrement). `Role.name` étant une **colonne texte et non un enum
Prisma**, le renommage n'a coûté qu'une migration de données —
`20260805094500_rename_manager_role_to_finance` — et cinq fichiers TypeScript. La route
`GET /dashboard/manager` **garde son chemin** : renommer le rôle ne justifie pas une rupture d'API.

**Ce que l'étape 1 a livré**

- **La faille est fermée.** `JwtAuthGuard` et `RolesGuard` sont enregistrés en `APP_GUARD`
  (`app.module.ts`) : **toute route est authentifiée par défaut**, l'ouverture passe par le nouveau
  décorateur `@Public()`. Les cinq contrôleurs découverts — `audit`, `roles`, `permissions`,
  `role-permissions`, `departments` — portent désormais `@Roles('SUPER_ADMIN')`.
- **Quatre routes légitimement anonymes** ont été ouvertes explicitement : les endpoints de
  `auth` (login, 2FA, refresh, logout, mot de passe oublié), `health`, la racine d'API, et
  **`POST /campaigns/webhook/delivery-status`** — la passerelle SMS n'a pas de session utilisateur,
  elle s'authentifie par le secret partagé `X-Webhook-Secret` (CDC §2.2).
- **`RolesGuard` a reçu un garde-fou** : devenu global, il s'exécute aussi là où `request.user` est
  absent. Il rend un refus, plus une erreur 500.
- Frontend : jetons de la maquette, authentification réelle à deux écrans, RBAC sur la navigation et
  les actions, cinq tableaux de bord distincts branchés sur leurs endpoints.

**Vérifié en exécution**, base et API démarrées : sans jeton, les contrôleurs sensibles rendent 401
(y compris `DELETE /audit/:id`) ; avec un jeton Commercial, Superviseur ou Finance, ils rendent 403 ;
avec un jeton Super Admin, 200. `dashboard/manager` répond au rôle `FINANCE`. Détail des mesures dans
`SUIVI.md`.

**Deux corrections à l'audit du 29/07 :**

- **Les contrôleurs ouverts étaient quatre, pas cinq.** `permissions.module.ts` ne déclare aucun
  tableau `controllers` : `PermissionsController` n'a jamais été monté et `/permissions` rend 404.
- **`AppController` n'est pas monté non plus** — `app.module.ts` n'a pas de tableau `controllers`.

**Correction de décompte :** la maquette porte **18 modules** en barre latérale, pas 15 comme
l'indiquait D15 — quinze déclarés en HTML plus trois injectés par la passe 5 (Ressources, Équipe,
Notes de frais).

**Deux défauts signalés hors périmètre, non corrigés (D13) :** `GET /customers` rend 500 — la
migration `init` supprime `Customer.companyId`, et la migration `add_company_…` la réintroduit dans
`schema.prisma` sans jamais la recréer en SQL, ni sur `Customer`, ni sur `Lead`, ni sur `Campaign`.
Et `npm run start:prod` pointe sur `dist/main` alors que `nest build` émet dans `dist/src/main.js`.

---

## Méthode de travail attendue

- **Explorer avant de modifier.** Lire les fichiers concernés et leurs dépendances avant toute proposition.
- **Proposer un plan pour toute tâche touchant plus de trois fichiers**, et attendre validation.
- **Un chantier à la fois.** Ne pas enchaîner plusieurs modules dans une même intervention.
- **Ne jamais supprimer un fichier sans le signaler**, même vide.
- **Ne pas installer de dépendance sans justification.**
- **Vérifier avec le build et le lint de l'application concernée** avant d'annoncer qu'une tâche est terminée.
- Sur une exigence du CDC encore ambiguë, **poser une question fermée plutôt qu'inventer une interprétation**.

## Consigner les décisions

Tout nouvel arbitrage s'ajoute à la section « Décisions actées » ci-dessus, numéroté à la suite. Chaque fin de séance se consigne dans `SUIVI.md`. C'est ce qui évite de réexpliquer la même chose à chaque session.
