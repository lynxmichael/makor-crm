# SUIVI.md — Journal de bord

Une section par séance, la plus récente en haut. À compléter en fin de chaque séance.

---

## 10 août 2026 — Le travail des 6 au 9 août est commité, le pipeline passe sur l'API

### Point de départ : quatre jours de travail ni commités ni consignés

La séance s'ouvre sur un arbre portant **84 changements non commités**, tous dans `apps/backend/`,
et un journal qui s'arrêtait au 5 août. Trois chantiers s'y trouvaient mêlés, désormais séparés en
trois commits.

- **D24 — le pipeline devient administrable depuis l'écran.** `canonicalStage` obligatoire sur
  chaque étape, `PipelineStage.order` qui perd son unicité (réordonner N colonnes se fait par N
  `UPDATE` dans une transaction, qu'une contrainte d'unicité rendrait impossible), et l'archivage :
  `DealStageHistory.toStageId` étant en `onDelete: Restrict`, une étape déjà traversée ne peut pas
  être effacée sans détruire l'historique qui porte le calcul des délais moyens du CDC §4.6. Une
  étape jamais traversée est supprimée, une étape traversée est archivée.
- **La correction du 500 sur `GET /customers`**, défaut signalé le 05/08 et laissé hors périmètre
  par D13 — que D17 a rendu à cette branche. C'est **uniquement** une migration SQL, écrite
  idempotente : `schema.prisma` décrivait déjà l'état cible, la dérive n'existait qu'en base.
- **Une passe de typage strict sur 78 fichiers**, avec `src/types/express.d.ts` qui donne à
  `Express.User` sa forme réelle — le rôle lu par `RolesGuard` est enfin vérifié par le compilateur.

### Fait — le lint backend, terminé

La passe de typage était inachevée : `npm run lint` sortait sur **11 erreurs et 4 avertissements**.
Corrigées. Trois ne sont pas cosmétiques :

- **`campaigns.service.ts` portait une formule fausse.** `delivered` valait
  `DELIVERED + SENT − FAILED` et n'était utilisé nulle part, pendant que `deliveryRate` recalculait
  la bonne valeur en double.
- **`reporting.utils.ts` pouvait livrer « [object Object] » à un client.** `String()` appliqué à un
  `unknown` ne signale rien. Nouveau `toDisplayString()` : nombre, date et `Decimal` traités
  explicitement, le reste en JSON.
- **Trois `client.join()` de `realtime.gateway.ts`** dont la promesse n'était ni attendue ni
  marquée : sans adaptateur Redis l'appel est synchrone, mais le jour où il y en a un, un rejet
  passait à la trappe.

`eslint.config.mjs` reçoit `ignoreRestSiblings` : l'omission par reste — `const { password, ...safe }
= user` — est la façon dont un secret est retiré d'une entité avant d'être renvoyée. C'est une liste
d'exclusion volontaire, pas un oubli.

### Fait — le pipeline commercial sur données réelles (lot A)

L'écran tournait sur `mockOpportunities`, avec des étapes — `prospection`, `business_case`,
`closing`, `go_live` — **qui ne correspondaient à aucune des six étapes du CDC §4.6**. Il affichait
un pipeline inventé pour la démonstration. En face, `GET /deals/board` et
`PATCH /deals/:id/move-stage` existaient et n'étaient appelés par personne.

Nouveau `services/pipeline.ts` (types transcrits du backend, pas devinés, comme `dashboard.ts`),
`PipelinePage.tsx` réécrit, plus `NewDealModal`, `DealDetailModal` et un module `probability`
partagé.

**D5 est appliquée deux fois.** En amont : une colonne exigeant un bon de commande signé porte un
cadenas, avant toute tentative. En aval : le refus du backend, déjà rédigé en français, s'affiche
tel quel dans un bandeau `role="alert"`, et la carte revient à sa colonne. Le déplacement est
optimiste, mais une carte restée déplacée après un refus ferait croire à une réussite.

**L'alternative clavier au glisser-déposer existe enfin** — exigée par `DESIGN.md`, absente depuis
le début : deux flèches par carte, atteintes à la tabulation, avec l'étape visée dans l'`aria-label`.

Les quatre états de vue sont traités via `AsyncBoundary`. L'écriture est conditionnée par la matrice
§7 : en Superviseur ou Admin ventes, le tableau est en lecture seule et le dit.

### Vérifié

`npx tsc --noEmit`, `npm run lint` et `nest build` du backend : verts. `npm run build` et
`npm run lint` du frontend : verts.

**Ce qui ne l'est pas :** les trois migrations du jour **n'ont jamais tourné sur une base**, la
suite de tests backend n'a pas été lancée, et le parcours navigateur n'a toujours pas été passé —
il l'était déjà en suspens depuis le 05/08.

### En suspens

1. **La documentation est en retard sur le code, et le registre des décisions est incohérent.**
   `D23` est citée dans la table de `CLAUDE.md` sans être définie nulle part ; `D24` n'existe que
   dans les commentaires du code ; et surtout **`D17` désigne deux décisions différentes** — « deux
   applications distinctes » dans `CLAUDE.md`, « le Super Admin peut créer de nouveaux rôles » dans
   `docs/DOSSIER-PROJET.md`, qui numérote D17 à D22 pour son propre compte. À trancher avant la
   prochaine réunion : c'est le registre d'arbitrage du projet.
2. **Lot B du pipeline non fait** — l'administration des colonnes par le Super Admin. Les cinq
   endpoints existent et ne sont appelés par personne.
3. **`components/shared/OpportunityQualificationModal.tsx` n'est plus référencé** (290 lignes). Non
   supprimé, volontairement : il est bâti sur la grille de qualification, la check-list de mise en
   service et les règlements, dont **aucun champ n'existe dans le modèle `Deal`**. Il redeviendra
   utile le jour où le modèle les portera.
4. **La création d'opportunité ne rattache pas à un client.** Le select aurait supposé
   `GET /customers`, dont la correction n'a pas encore tourné sur une base réelle.
5. Inchangé : **D2** (retrait de `Recharges`), **D11** (prestataire SMS), **D6** (validation de la
   configuration au démarrage), et l'arbitrage laissé ouvert par **D12** sur
   `Company`/`Offer`/`Subscription`/`Ticket`/`Warehouse`.

### Prochain chantier

**Appliquer les trois migrations sur une base réelle et passer le parcours navigateur.** Rien de
ce qui a été livré ce jour n'a été vu fonctionner ; le contrôle par le build ne dit pas si
`GET /customers` répond ni si le Kanban affiche les bonnes colonnes. Ensuite seulement, le lot B.

---

## 5 août 2026 — Étape 1 : la faille est fermée, les fondations sont posées

### Fait

**Chantier A — l'API est verrouillée.** Le défaut est inversé : `JwtAuthGuard` puis `RolesGuard` sont
enregistrés en `APP_GUARD` dans `app.module.ts`, dans cet ordre (le premier renseigne `request.user`,
dont le second a besoin). Toute route est authentifiée sans rien déclarer ; l'ouverture passe par le
nouveau `@Public()` (`auth/decorators/public.decorator.ts`). Les cinq contrôleurs découverts par
l'audit du 29/07 — `audit`, `roles`, `permissions`, `role-permissions`, `departments` — portent
`@Roles('SUPER_ADMIN')`.

**Deux routes auraient été cassées par la bascule, repérées avant :**

- **`POST /campaigns/webhook/delivery-status`** — le callback de la passerelle SMS/WhatsApp
  (CDC §2.2). Le prestataire n'a pas de session ; il s'authentifie par le secret partagé
  `X-Webhook-Secret`. Un commentaire du code disait déjà « route volontairement hors JwtAuthGuard » :
  elle a reçu `@Public()`.
- **`GET /api/v1/`** — la bannière d'API, premier point interrogé pour vérifier qu'un déploiement
  répond.

`RolesGuard` a reçu un garde-fou : devenu global, il s'exécutait aussi sur les routes publiques où
`request.user` est `undefined`, et `roles.includes(user.role.name)` y aurait levé un `TypeError`. Il
rend maintenant un refus.

**Chantier B — `MANAGER` → `FINANCE` (D16).** Bien moins coûteux que redouté : `Role.name` est une
colonne texte, pas un enum Prisma. Une migration de données
(`20260805094500_rename_manager_role_to_finance`), `prisma/seed.ts` en trois points, et cinq fichiers
TypeScript. La route `/dashboard/manager` garde son chemin. Le compte de démonstration devient
`finance@makor.ci`. `purchase_orders` a été ajouté aux modules de ce rôle, conformément à **D8**.

**Chantier C — le build frontend était cassé, il est réparé.** Pas la panne documentée (`baseUrl`,
résolue le 30/07) mais une nouvelle, introduite dans l'arbre de travail : `index.css` déclarait ses
jetons dans `@theme` **sans l'espace de noms `--color-*`**, si bien que Tailwind v4 ne générait aucune
utilitaire — `Cannot apply unknown utility class 'bg-paper'`. `index.css` est réécrit depuis le second
bloc `:root` de la maquette (D14) : jetons dans le bon espace de noms, ombres, courbe d'animation et
classes de composants (`sidebar-surface`, `navitem`, `topbar`, `card`, `kpi`, `btn`, `field`) portées
telles quelles. **Deux jetons de la palette abandonnée ont été retirés** — `--accent: #0E7C86` (teal)
et `--pulse: #FF6B4A` (corail). `--bg` est corrigé de `#F5F6FB` à `#F4F6FB`, valeur de la maquette.
`index.html` charge Manrope + Inter à la place de Space Grotesk + IBM Plex.

**Chantiers D à F — le frontend appelle vraiment l'API.** Client axios avec renouvellement partagé du
jeton (une seule demande de refresh même quand trois requêtes se heurtent au même 401), store Zustand
persisté, connexion à deux écrans avec `react-hook-form` + `zod`, `ProtectedRoute` qui vérifie la
session **et** le rôle, 18 modules de navigation filtrés, matrice de droits, et cinq tableaux de bord
distincts branchés sur leurs endpoints existants.

**Trois fichiers supprimés, signalés :** `features/auth/TwoFactorPage.tsx` (le parcours 2FA vit
désormais dans `LoginPage`), `providers/AuthProvider.tsx` (remplacé par le store Zustand),
`providers/ueryProvider.tsx` (coquille, vide, remplacé par `QueryProvider.tsx`).

### Vérifié — API réelle, Postgres 5433 et Redis démarrés

- `nest build` backend : vert. `npm run build` et `npm run lint` frontend : verts.
- `prisma migrate deploy` : la 20ᵉ migration (`rename_manager_role_to_finance`) s'applique.
- `npm run seed` : les cinq comptes sont créés, dont **`FINANCE finance@makor.ci`**.

**La faille est fermée, mesurée route par route.** Sans jeton : `audit`, `roles`,
`role-permissions`, `departments`, `users`, `customers`, `invoices` rendent **401**, y compris
`DELETE /audit/:id`. `health` rend 200.

| Route | SUPER_ADMIN | COMMERCIAL | FINANCE | SUPERVISEUR |
| --- | --- | --- | --- | --- |
| `audit`, `roles`, `role-permissions`, `departments` | 200 | **403** | **403** | **403** |
| `dashboard/super-admin` | 200 | 403 | 403 | 403 |
| `dashboard/manager` | 200 | 403 | **200** | 403 |
| `dashboard/my-portfolio` | 200 | 200 | 200 | 200 |

`dashboard/manager` accessible au rôle `FINANCE` : le renommage fonctionne de bout en bout.
`twoFactorSetupRequired` vaut `true` pour SUPER_ADMIN, ADMIN_VENTES et FINANCE, `false` pour les deux
autres — conforme à `TWO_FACTOR_MANDATORY_ROLES`. **Les cinq endpoints de tableau de bord rendent 200.**

### Deux corrections à l'audit du 29/07, établies à l'exécution

1. **`PermissionsController` n'a jamais été exposé.** `permissions.module.ts` ne déclare que
   `providers: [PermissionsService]` — **aucun tableau `controllers`**. La route `/permissions` rend
   404 et n'a jamais existé. L'audit annonçait « cinq contrôleurs montés sans authentification » :
   **ils étaient quatre**, le cinquième étant un fichier de contrôleur mort. Le `@Roles()` qu'il a reçu
   est correct mais inerte tant qu'il n'est pas monté.
2. **`AppController` n'est pas monté non plus** — `app.module.ts` n'a aucun tableau `controllers`. La
   racine `/api/v1` rend 404. Le `@Public()` qui y a été posé est sans effet aujourd'hui, et juste le
   jour où le contrôleur sera monté.

### Défauts constatés hors périmètre — signalés, non corrigés (D13)

1. **`GET /customers` rend 500 : dérive entre le schéma Prisma et la base.** La migration
   `20260729103405_init` **supprime** `Customer.companyId` ; la migration
   `20260729152741_add_company_offer_subscription_ticket_warehouse` réintroduit `companyId` dans
   `schema.prisma` (l. 127, 204) mais **son SQL ne recrée la colonne ni sur `Customer`, ni sur `Lead`,
   ni sur `Campaign`**. Colonnes réelles de `Customer` vérifiées en base : `companyId` est absente.
   Seul `/customers` est touché — `leads`, `campaigns`, `deals`, `quotes`, `invoices`, `products`,
   `contacts`, `activities` et les cinq tableaux de bord rendent 200. **Directement lié à la question
   laissée ouverte par D12** : que fait-on de `Company`/`Offer`/`Subscription`/`Ticket`/`Warehouse` ?
2. **`npm run start:prod` est cassé** : le script lance `node dist/main`, mais `prisma.config.ts` à la
   racine du projet remonte le `rootDir` et `nest build` émet dans **`dist/src/main.js`**. Contourné
   ici en lançant directement le bon chemin.

### En suspens

1. **Le parcours navigateur n'a pas été passé** — les extensions de pilotage de Chrome ne sont pas
   installées. À faire à la main : `npm run dev` côté frontend, connexion des cinq comptes, contrôle
   que la barre latérale change bien de contenu, que `/audit` saisi à la main en Commercial redirige,
   et comparaison visuelle avec la maquette.
2. **Signaler le recouvrement à lynxmichael avant la PR.** D16 lève D13 pour deux chantiers backend ;
   il ne le sait pas encore. Lui signaler aussi les deux défauts ci-dessus.
3. **Le décompte de D15 est corrigé : 18 modules, pas 15.** Quinze en HTML, trois injectés en passe 5.
4. **La maquette reste plus riche que l'implémentation** sur les graphiques SVG et la vue détail
   client — étapes 2 à 4.

### Constat de fin de séance — deux frontends existent en parallèle

**`origin/main` porte un frontend complet écrit par lynxmichael**, alors que D13 attribuait
`apps/frontend/` au poste Kouassi. Son commit `4af5427` s'intitule « version finale de l'application ».

Mesuré, pas supposé : **82 fichiers sous `apps/frontend/src/` existent sur `origin/main` et pas sur
cette branche** — le jeu shadcn complet en minuscules (`button.tsx`, `dialog.tsx`, `sheet.tsx`,
`sidebar.tsx`, `sonner.tsx`…), les modules Clés d'API, Commissions, Évaluation, Assistant IA,
`TwoFactorSetupPage`, `ForgotPasswordPage`, les modales d'édition campagne / facture / client, et les
services `api.ts` (241 l.), `collab.ts`, `realtime.ts`, `resources.ts`. Sa navigation est elle aussi
conditionnée par rôle.

**Un `git merge origin/main` produit 32 fichiers en conflit**, dont tout le socle : `LoginPage`,
`api.ts`, `auth.ts`, `auth.store.ts`, `QueryProvider`, `index.css`, `AppLayout`, `main.tsx`, `App.tsx`,
`Sidebar`, `Topbar`. Le renommage de casse `Button.tsx` → `button.tsx` y compte pour deux fichiers.
**Le merge a été tenté puis annulé** (`git merge --abort`) : rien n'a été résolu, l'arbre est propre.

Où cette branche est supérieure :

| | cette branche | `origin/main` |
| --- | --- | --- |
| Garde d'authentification | global, **fermé par défaut**, `@Public()` explicite | contrôleur par contrôleur |
| Tableaux de bord | **cinq, un par rôle** (CDC §4.1), sur les cinq endpoints | un seul `DashboardPage` |
| Cinquième rôle | `FINANCE`, migration incluse | `MANAGER` |

Où `origin/main` l'est : 82 fichiers de modules métier, et un socle shadcn abouti (D10).

À ne pas perdre au moment de réconcilier : **lynxmichael a ajouté la pagination sur `/audit`**
(`@Query('page')`, `@Query('limit')`), absente de cette branche. Les quatre autres contrôleurs
n'ont aucune différence fonctionnelle entre les deux versions — seulement le modèle de garde.

**Arbitrage rendu le jour même — D17 : il n'y aura pas de réconciliation.** Ce ne sont plus deux
périmètres d'une même application, ce sont **deux applications distinctes**. `kouassi/frontend-build`
porte l'application complète de ce poste, frontend et backend ; `main` porte celle de lynxmichael.
**Aucun merge, aucun cherry-pick, aucune reprise d'un côté vers l'autre.** D13 est annulée.

Le tableau comparatif ci-dessus n'a donc plus vocation à départager quoi que ce soit : il reste comme
trace de ce qui a été mesuré le 05/08. Un écart entre les deux applications n'est pas un défaut.

Les cinq commits de la séance restent **locaux** : `origin/kouassi/frontend-build` est encore à
`9afca0d`, rien n'a été poussé. `apps/backend/package-lock.json` est laissé hors commit — c'est un
artefact de `npm install` (élagage de `bcrypt`, `passport-local`, `uuid`, sans changement de
`package.json`) et c'est un fichier du périmètre backend.

### Prochain chantier

**Suspendu à l'arbitrage ci-dessus.** Si cette branche est retenue, l'étape 2 est le Pipeline : Kanban
avec drag & drop, et blocage d'un déplacement dont le prérequis documentaire n'est pas satisfait,
**avec la raison affichée à l'écran** (D5). Suppose l'évolution de schéma décrite en D4 : rattachement
des étapes à un commercial et champ `canonicalStage` obligatoire.

---

## 31 juillet 2026 — Répartition du travail, palette validée, maquette versionnée

### Fait

**Point d'ouverture de séance, `git fetch` d'abord** (règle D12) : rien de nouveau sur le distant,
`origin/main` toujours sur `d1c1555`.

**Trois corrections factuelles.**

1. **19 migrations, pas 21.** `ls prisma/migrations` renvoie 21 entrées, dont `README.md` et
   `migration_lock.toml`. Et ces 19 sont **identiques à `origin/main`** —
   `git diff origin/main -- apps/backend/prisma/migrations` est vide.
2. **`src/inventory/` n'est pas monté.** Le dossier existe, mais **`app.module.ts` ne contient aucune
   occurrence d'`Inventory`**. C'est du **code mort au même titre que les 8 dossiers de D1**, pas une
   extension inventaire/ticketing en cours. La conclusion de D12 ne bouge pas — **ne rien supprimer**
   tant que le sort des modèles `Company`/`Offer`/`Subscription`/`Ticket`/`Warehouse` n'est pas
   tranché — mais l'argument « développement actif » tombe.
3. **La réconciliation code local ↔ `origin/main` est de fait faite.** `kouassi/frontend-build` descend
   de `d1c1555` avec `docs/audit-et-arbitrages` mergé par-dessus : le backend présent **est** celui de
   la ligne principale. Ce n'est plus un point bloquant. Corrigé dans l'entrée du 30/07 ci-dessous.

**Trois décisions consignées dans `CLAUDE.md`** — D13 (répartition du travail avec lynxmichael),
D14 (palette et typographie validées par le DG), D15 (la maquette devient la spécification du frontend).
Voir la section « Décisions actées — 31 juillet 2026 ».

**`DESIGN.md` aligné.** §7 n'est plus une question ouverte : l'option B est retenue (D10), le titre et
la conclusion sont réécrits, et la mise en œuvre est signalée comme suspendue par D14. §2 et §3 portent
un bandeau **périmé** renvoyant à D14 — pour que personne n'applique de bonne foi une palette teal que
personne n'a validée. Constat au passage : les **dix** composants shadcn décrits en §7 ont été supprimés
au chantier 5 ; appliquer l'option B revient désormais à réintroduire shadcn sur des jetons propres,
plus simple que la refonte décrite à l'origine.

**`design/makor-crm-maquette.html` versionnée** (218 Ko), jusqu'ici non suivie par git.

### En suspens

1. **Réécrire `DESIGN.md` §2/§3 et `apps/frontend/src/index.css`** depuis le second bloc `:root` de la
   maquette. **C'est le prochain chantier de ce poste.** Il faudra trancher au passage : conserver les
   noms de jetons (`wire`, `pulse`, `paper`…) en changeant leurs valeurs, ou renommer — **26 fichiers
   les consomment** (`slate` 70×, `ink` 48×, `line` 32×, `wire` 25×, `paper` 22×, `alert` 15×).
2. **Le chantier 6 (pont de variables shadcn) est suspendu** jusque-là — poser le pont sur des jetons
   qu'on abandonne serait à refaire.
3. **`AUDIT.md` reste à reprendre :** §9 pose toujours les dix questions comme ouvertes alors que D1 à
   D15 y répondent en partie, et tous ses décomptes portent sur l'arbre divergent du 29/07.
4. **`apps/backend/CLAUDE.md` porte des affirmations corrigées depuis** (les « trois erreurs fausses »
   de D12, et la qualification de `src/inventory/`). **D13 m'interdit d'y toucher** — à signaler à
   lynxmichael.
5. Inchangé : **D2** (retrait de `Recharges`), **D11** (prestataire SMS), **D4** (pipelines par
   commercial), **D6** (validation de la configuration au démarrage).

### Prochain chantier

**Réécriture des jetons de design** — `DESIGN.md` §2/§3 puis `src/index.css`, depuis la maquette
validée. Il débloque le chantier 6, qui débloque toute la vague 2 côté frontend.

Côté backend, la fermeture des cinq contrôleurs reste la priorité absolue du projet, **mais elle est
passée chez lynxmichael (D13)**.

---

## 30 juillet 2026 (suite) — Build frontend débloqué, maquette produite et validée

### Fait

**Chantiers 4 et 5 d'`AUDIT.md` §8 exécutés.** Le build frontend ne tenait qu'à `baseUrl` dans
`tsconfig.app.json`, refusé par TypeScript 6 (TS5101) : retiré, et **`strict: true` déclaré
explicitement** dans la foulée — le coût était nul, le code ne contenait aucun `any`. Puis **2117 lignes
de code mort supprimées sur 21 fichiers** : les dix composants shadcn non stylés (`sidebar.tsx` à lui
seul en pesait 723), `App.css`, `use-mobile.ts`, et la moitié de `mock.ts`. Cinq primitives maison
renommées au passage en `PascalCase` pour uniformiser (`badge.tsx` → `Badge.tsx`, etc.).
Commits `4a707bf` et `9afca0d`.

**`npm run build` du frontend est vert** — 2775 modules, 4,4 s. Seule réserve, un avertissement de
taille : le bundle fait 830 Ko (250 Ko gzippé), au-dessus du seuil de 500 Ko. À traiter par découpage
en imports dynamiques quand le routage par rôle sera en place, pas avant.

**Maquette HTML complète produite, puis validée par le directeur général et les équipes commerciales.**
15 modules à navigation conditionnée par rôle (`data-roles` sur chaque entrée), écran de connexion avec
2FA, cinq tableaux de bord par rôle, vue détail client, graphiques SVG sans aucune dépendance, parcours
de bout en bout et visite guidée. Elle tranche l'identité visuelle — marine et orange — et elle est
cohérente avec les arbitrages déjà rendus : « Messagerie » y est badgée **V2**, conforme à D3.

**Accord de répartition du travail avec lynxmichael** : backend chez lui, frontend ici. Consigné en D13
le 31/07.

### En suspens

Repris et complété dans l'entrée du 31/07 ci-dessus.

---

## 30 juillet 2026 — Le dépôt distant avait quatre commits d'avance

### Fait

**Point de départ : un `git push`.** Il a échoué sur l'authentification (GCM avait un identifiant
périmé ; purgé via `git credential reject`, l'accès est rétabli). Le `git fetch` qui a suivi a tout
changé : **`origin/main` avait 4 commits que l'arbre local n'avait pas.**

**Divergence caractérisée.** Base commune `96f8927` (23/07 16:57). 3 commits en local, 4 sur le
distant, dont `d1c1555` « correction finale de backend » **poussé à 17h24 le 29/07, neuf minutes avant
le commit d'audit**. Les deux historiques s'entrelacent dans le temps : ce n'est pas un retard, ce sont
deux développements parallèles. **53 fichiers divergent réellement** (le gros du backend est identique).

**L'audit du 29/07 portait donc sur un arbre qui n'est pas la ligne principale.** Conséquences actées
en **D12** : D1 est **suspendu** (les modèles `Company`/`Offer`/`Subscription`/`Ticket`/`Warehouse`
existent sur `origin/main`, avec migration dédiée et un module `inventory/` en plus — 19 migrations
contre 16), et les « trois erreurs fausses » corrigées la veille dans `apps/backend/CLAUDE.md` **ne
sont pas fausses** : les trois fichiers existent sur le distant. Les deux fichiers sont corrigés.

**La faille de sécurité, elle, est confirmée sur les deux branches** — vérifié sur `origin/main` :
seul `ThrottlerGuard` en `APP_GUARD`, pas de `public.decorator.ts`, aucun `UseGuards` sur les cinq
contrôleurs. Le chantier de fermeture reste la priorité et ne dépend pas de la réconciliation.

**Documentation livrée sans toucher au code.** Branche `docs/audit-et-arbitrages` construite depuis
`origin/main`, les deux commits de doc reportés par `cherry-pick` (2 conflits résolus : `DESIGN.md` et
`apps/frontend/CLAUDE.md`, supprimés côté distant, la version documentaire est retenue).
**Diff vs `origin/main` : uniquement des `.md`.** `origin/main` n'est pas réécrit, les 4 commits
distants sont préservés — aucun `--force`.

**`apps/backend/README.md` restauré** depuis la ligne principale : sa suppression n'avait jamais été
arbitrée et c'est 133 lignes de contenu réel.

**Builds constatés :** backend impossible à compiler (`node_modules` absent, `'nest' n'est pas
reconnu`) ; frontend échoue sur `tsconfig.app.json:3` — `error TS5101` sur `baseUrl`, à l'identique de
ce qui était documenté, et **identique sur les deux branches** (le fichier ne diverge pas).

**Un verrou `.git/index.lock` périmé** (0 octet, ~1 h, aucun processus git) laissé par le push en
échec, supprimé.

### En suspens

1. ~~**Réconciliation du code local ↔ `origin/main` : non faite, et c'est le point bloquant.**~~
   **Corrigé le 31/07 — elle est de fait faite, et n'a jamais été bloquante longtemps.** La branche
   `kouassi/frontend-build` descend de `d1c1555` avec `docs/audit-et-arbitrages` mergé par-dessus : le
   backend de l'arbre de travail **est** celui de la ligne principale (19 migrations identiques,
   `git diff origin/main` vide sur `prisma/migrations`). Il n'y a plus deux versions concurrentes.
   **Ce qui reste ouvert est un arbitrage fonctionnel, pas une opération git :** que fait-on des modèles
   `Company`/`Offer`/`Subscription`/`Ticket`/`Warehouse` et du dossier `inventory/`, qui ne figurent pas
   au CDC ? Précision du 31/07 : `inventory/` **n'est pas monté dans `app.module.ts`** — il dort, il ne
   gêne rien, et rien ne presse. Arbitrage à rendre avec lynxmichael, dont c'est désormais le périmètre
   (D13).
2. **Nouvel audit à mener sur la ligne principale.** Tous les décomptes d'`AUDIT.md` (lignes, entités,
   modules, migrations) portent sur l'arbre divergent et ne peuvent plus être cités comme référence.
3. **`AUDIT.md` §9 et `DESIGN.md` §7 toujours pas alignés** sur les arbitrages — inchangé depuis la
   veille, et désormais second par rapport au point 2.
4. **Point 5 de la séance du 29/07 : corrigé, voir plus bas.** Il reste à décider si les README
   déplacés à la racine doivent aussi être rétablis dans `apps/*/`.
5. Reste inchangé : **D2** (retrait de `Recharges`), **D11** (prestataire SMS), **D4** (pipelines par
   commercial), **D6** (validation de la configuration au démarrage).

### Prochain chantier

> **Corrigé le 31/07 — ce chantier n'est plus tenu par ce poste.** L'accord de répartition avec
> lynxmichael, consigné en **D13**, place tout `apps/backend/` chez lui : la fermeture des cinq
> contrôleurs, le `npm install` et le build backend de référence lui reviennent. **La priorité du projet
> ne change pas** — la faille reste la première chose à traiter, et le chantier 8 (socle frontend) en
> dépend toujours, puisqu'un menu conditionné par rôle ne vaut rien si l'API ne l'est pas.
> Le prochain chantier de ce poste est frontend : voir l'entrée du 31/07.

**Inchangé sur le fond, mais à exécuter sur la ligne principale :** fermer les cinq contrôleurs
ouverts (`APP_GUARD` global + `@Public()`). C'est le seul chantier qui ne dépend ni de la
réconciliation ni du nouvel audit, et la faille est confirmée des deux côtés.

Le plan validé le 30/07 prévoyait l'ordre **3 → 2 → 1** (`npm install`, puis suppression des dossiers
orphelins, puis le guard) pour que le correctif de sécurité soit validé par un build réel. **Le
chantier 2 disparaît avec la suspension de D1.** L'ordre devient : `npm install` sur la ligne
principale → build de référence → guard global.

---

## 29 juillet 2026 — Audit complet et arbitrages

### Fait

**Documentation remise d'aplomb.** Trois fichiers portaient un nom incorrect : le cahier des charges s'appelait `CDC-CR~1.MD` sur le disque (nom NTFS réel, pas un affichage 8.3) alors que toute la documentation référençait `CDC-CRM-MAKOR-v3.md` ; les deux `apps/*/CLAUDE.MD` avaient une extension en majuscules, sans effet sous Windows mais cassant l'auto-chargement sous Linux ou en CI. Renommés. Retiré au passage une ligne de gabarit devenue fausse dans les deux CLAUDE.md d'application.

**Audit complet produit dans `AUDIT.md`** — 9 sections, à partir de trois explorations parallèles (backend, frontend, cahier des charges).

**Le diagnostic de départ était faux.** `CLAUDE.md` et `apps/backend/CLAUDE.md` affirmaient que le backend dérivait d'un CRM générique et que les entités du CDC en étaient absentes. C'est l'inverse : `prisma/schema.prisma` couvre **les 15 entités de la §6 sans exception**, et `app.module.ts:66-103` monte 32 modules tous alignés sur le cahier des charges. Les 8 dossiers incriminés (`warehouses`, `tickets`, `subscriptions`, `offers`, `companies`, `company`, `devices`, `interventions`) ne sont **importés nulle part** : 972 lignes mortes sur 11 785, soit 8,2 %. Le backend est réutilisable à 91,8 %.

**Le vrai déséquilibre est backend / frontend :** 200 endpoints face à une interface qui n'en consomme aucun.

**Deux ruptures graves découvertes, non documentées jusque-là :**

- **Cinq contrôleurs backend montés sans aucune authentification** — `audit`, `roles`, `permissions`, `role-permissions`, `departments`. Il n'y a pas d'`APP_GUARD` d'authentification global. `DELETE /api/v1/audit/:id` est ouvert à tous : le journal d'audit exigé par le CDC §4.16 est **public et effaçable**, ce qui lui retire toute valeur probante.
- **Le build frontend échoue** — `tsconfig.app.json:3`, TypeScript 6.0.3 refuse `baseUrl` (TS5101). La compilation s'arrête avant tout type-check. `npm run lint` échoue aussi : 3 erreurs, toutes dans du code mort.

**Onze arbitrages rendus et consignés** dans la section « Décisions actées » de `CLAUDE.md` (D1 à D11) : périmètre, pipeline, IA, signature, rôles, design system, passerelle. Les décisions à impact technique sont détaillées dans les CLAUDE.md d'application.

**Les trois CLAUDE.md mis à jour.** Retiré la section « Écart majeur connu » du fichier racine, devenue fausse et bloquante. Corrigé dans `apps/backend/CLAUDE.md` trois défauts qui y étaient décrits et qui n'existent pas dans le code (`invoice-email.service.ts` n'existe nulle part, `invoice-pdf.service.ts` est déjà `async`, `QueryWarehouseDto` n'apparaît dans aucun fichier).

### En suspens

1. **`AUDIT.md` §9 et `DESIGN.md` §7 n'ont pas été mis à jour** avec les arbitrages. Le §9 pose encore les dix questions comme ouvertes, et `DESIGN.md` §7 présente encore le choix de design system comme à trancher alors que l'option B est retenue (D10). Les décisions font foi dans `CLAUDE.md` ; ces deux fichiers restent à aligner. **Premier point à traiter.**
2. **Le build backend n'a jamais été exécuté** — `node_modules` est absent et son installation n'a pas été autorisée. La cause racine de la rupture de compilation (les 8 dossiers orphelins) est établie **par analyse statique uniquement**. C'est le chantier 3 du plan d'action qui lèvera cette réserve.
3. **D2 — retrait de `Recharges` :** documenté, rien supprimé. Touche 12 fichiers, dont `campaigns.service.ts:422-433` où le solde prépayé est câblé dans l'envoi de campagne. Exige une migration Prisma destructive et un arbitrage sur les données existantes.
4. **D11 — prestataire SMS/WhatsApp non arrêté.** DEXCHANGE SMS, Orange Côte d'Ivoire, 360dialog à l'étude. C'est la seule dépendance externe du projet et la plus longue à contractualiser : à lancer en parallèle, sans coder d'hypothèse sur l'API.
5. ~~**Trois fichiers suivis par git sont supprimés du disque** sans avoir été commités :
   `apps/backend/README.md`, `apps/frontend/DESIGN.md`, `apps/frontend/README.md`.~~
   **Corrigé le 30/07 — cet énoncé était faux.** Ces suppressions étaient **commitées** dans
   `15e1351` et l'arbre était propre. Il ne s'agissait pas d'un défaut d'hygiène git. Sur le fond :
   `apps/frontend/DESIGN.md` et `apps/frontend/README.md` sont des **renommages** vers la racine
   (contenu préservé à 100 %) ; seul `apps/backend/README.md` était une vraie suppression, et il a été
   **restauré** sur la branche `docs/audit-et-arbitrages`.
6. **D4 — pipelines par commercial :** suppose une évolution du schéma Prisma. `PipelineStage` est aujourd'hui une table globale sans propriétaire ; il faut un rattachement à un utilisateur, un champ `canonicalStage` obligatoire, la migration et la reprise des `DealStageHistory`.
7. **D6 — validation de configuration :** « clé d'API validée au démarrage » suppose de créer ce mécanisme. `ConfigModule.forRoot()` n'a aujourd'hui **aucun** `validationSchema` : aucune variable d'environnement n'est vérifiée.

### Prochain chantier

**Chantier 1 du plan d'action (`AUDIT.md` §8, vague Fondations) — fermer les cinq contrôleurs ouverts.**

Poser un `APP_GUARD` d'authentification global avec un décorateur `@Public()` pour les exceptions légitimes (`/auth/login`, `/health`, webhook de statut de campagne), et vérifier les cinq contrôleurs concernés. Effort estimé : **S** (moins d'une journée). Aucune dépendance — c'est une faille active, rien ne justifie d'attendre.

Enchaîner ensuite sur les chantiers 2 et 3 (suppression des 8 dossiers orphelins, puis `npm install` + build de confirmation), qui lèvent la réserve de méthode de l'audit et débloquent toute vérification backend ultérieure.
