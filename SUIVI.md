# SUIVI.md — Journal de bord

Une section par séance, la plus récente en haut. À compléter en fin de chaque séance.

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
5. **Trois fichiers suivis par git sont supprimés du disque** sans avoir été commités : `apps/backend/README.md`, `apps/frontend/DESIGN.md`, `apps/frontend/README.md`. Suppressions antérieures à cette séance, à arbitrer.
6. **D4 — pipelines par commercial :** suppose une évolution du schéma Prisma. `PipelineStage` est aujourd'hui une table globale sans propriétaire ; il faut un rattachement à un utilisateur, un champ `canonicalStage` obligatoire, la migration et la reprise des `DealStageHistory`.
7. **D6 — validation de configuration :** « clé d'API validée au démarrage » suppose de créer ce mécanisme. `ConfigModule.forRoot()` n'a aujourd'hui **aucun** `validationSchema` : aucune variable d'environnement n'est vérifiée.

### Prochain chantier

**Chantier 1 du plan d'action (`AUDIT.md` §8, vague Fondations) — fermer les cinq contrôleurs ouverts.**

Poser un `APP_GUARD` d'authentification global avec un décorateur `@Public()` pour les exceptions légitimes (`/auth/login`, `/health`, webhook de statut de campagne), et vérifier les cinq contrôleurs concernés. Effort estimé : **S** (moins d'une journée). Aucune dépendance — c'est une faille active, rien ne justifie d'attendre.

Enchaîner ensuite sur les chantiers 2 et 3 (suppression des 8 dossiers orphelins, puis `npm install` + build de confirmation), qui lèvent la réserve de méthode de l'audit et débloquent toute vérification backend ultérieure.
