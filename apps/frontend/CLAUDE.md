# CLAUDE.md — Frontend CRM MAKOR

> **Emplacement : `makor-crm\apps\frontend\CLAUDE.md`**
> Complète le `CLAUDE.md` de la racine, ne le remplace pas. Les décisions actées y sont consignées (D1 à D11).

---

## Stack

| Couche          | Technologie                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Framework       | React 19 + TypeScript (**`strict` non activé** — voir plus bas)                                                            |
| Build           | Vite 8 · TypeScript **6.0.3**                                                                                             |
| Styles          | Tailwind CSS v4, configuration **CSS-first** via `@theme` dans `src/index.css` — il n'y a **pas** de `tailwind.config.js` |
| Composants      | **shadcn/ui (socle retenu — décision D10)** + `@base-ui/react`                                                             |
| Routage         | react-router-dom v7                                                                                                       |
| Données serveur | TanStack Query v5 + axios *(installés, pas encore utilisés)*                                                              |
| État client     | Zustand *(installé, pas encore utilisé)*                                                                                  |
| Formulaires     | react-hook-form + zod *(installés, pas encore utilisés)*                                                                  |
| Animations      | framer-motion                                                                                                             |
| Graphiques      | recharts                                                                                                                  |
| Icônes          | lucide-react **exclusivement**                                                                                            |

## Commandes

```bash
npm run dev       # serveur de développement
npm run build     # tsc -b && vite build  ← vert depuis le 05/08
npm run lint      # eslint                ← vert depuis le 05/08
npm run preview   # prévisualisation du build
```

Alias d'import : `@/` → `src/`. Toujours des imports absolus, jamais de `../../../`.

## Organisation

```
src/
  assets/       logos MAKOR
  components/
    shared/     composants métier réutilisables (KpiCard, Sidebar, Topbar…)
    ui/         primitives de design system
  config/       env, roles, navigation (18 modules), permissions
  data/         jeux de données de démonstration (à remplacer par l'API)
  features/     un dossier par domaine métier
  hooks/        hooks partagés
  layouts/      AppLayout (seul non vide)
  lib/          utilitaires (cn, formatteurs)
  providers/    QueryProvider (ThemeProvider encore vide)
  routes/       ProtectedRoute — session ET rôle
  services/     api (axios + refresh), auth, dashboard
  store/        auth.store.ts — session persistée (Zustand)
  types/        types partagés
```

Un module métier = un dossier dans `features/` avec sa page, ses composants et ses hooks. Ce qui sert à plus d'un module remonte dans `components/shared/`.

## Conventions

- Composants fonctionnels, props typées par `interface`, export nommé (défaut réservé à `App.tsx`).
- `PascalCase.tsx` pour les composants, `kebab-case.ts` pour hooks et utilitaires.
- `cn()` (`@/lib/utils`) pour toute composition de classes conditionnelles.
- **Icônes : `lucide-react` uniquement.** `react-icons` est présent dans les dépendances mais ne doit pas être utilisé.
- **Formulaires : `react-hook-form` + `zod`** via `zodResolver`. Pas d'état de formulaire avec `useState`.
- **Réseau : tout appel passe par un service de `src/services/`**, consommé via un hook TanStack Query. Aucun `axios` ni `fetch` direct dans un composant.
- **Aucun `any`.** Utiliser `unknown` et affiner. *(Aujourd'hui respecté : zéro occurrence dans `src/`.)*

## Formats métier

Formatteurs dans **`src/lib/utils.ts`** — `src/lib/format.ts` n'existe pas malgré ce qu'indique `DESIGN.md` §4.

| Donnée    | Format                                             | Fonction              |
| --------- | -------------------------------------------------- | --------------------- |
| Montant   | `1 250 000 FCFA` (espace insécable, sans décimale) | `formatCFA` (l.9)     |
| Date      | `14 juil. 2026`                                    | `formatDate` (l.13)   |
| Référence | monospace majuscules → `BC-2026-0142`              | `generateRef` (l.31)  |
| Export    | CSV client                                         | `exportRowsAsCsv` (l.35) |

Jamais de format anglo-saxon (`1,250,000` ou `97.4%`). **Ne pas redéfinir de formatteur local** — `ReportsPage.tsx:29-35` le fait aujourd'hui, c'est à corriger.

---

## État réel du code — mis à jour le 5 août 2026 (étape 1)

Les fondations sont posées : l'application s'authentifie vraiment, connaît le rôle de l'utilisateur et
en tire les conséquences sur ce qu'elle affiche. Les écrans métier, eux, restent largement à écrire.

### Ce qui fonctionne

1. **`npm run build` et `npm run lint` sont verts.** `strict` est activé.
2. **Authentification réelle à deux écrans.** `LoginPage.tsx` — `react-hook-form` + `zod`, code à 6 chiffres, messages en français. Les jetons viennent de `POST /auth/login` et `POST /auth/login/2fa`.
3. **Couche réseau.** `services/api.ts` : axios, Bearer automatique, et **renouvellement partagé** sur 401 — plusieurs requêtes simultanées ne consomment qu'un seul refresh token, qui est à usage unique.
4. **Session persistée** dans `store/auth.store.ts` (Zustand + `persist`). `hooks/useAuth.ts` la lit ; les intercepteurs axios y accèdent hors de l'arbre React via `useAuthStore.getState()`.
5. **RBAC.** `config/roles.ts` (5 rôles, point de passage unique vers les noms de la base), `config/navigation.ts` (18 modules et leurs rôles, transcrits de la maquette), `config/permissions.ts` (matrice §7 du CDC), `hooks/usePermission.ts` et `components/shared/Can.tsx`.
6. **`ProtectedRoute` vérifie la session ET le rôle** : une URL saisie à la main sur un module interdit redirige vers le premier module autorisé.
7. **Cinq tableaux de bord distincts**, un composant par rôle dans `features/dashboard/`, chacun branché sur son endpoint (`/dashboard/super-admin`, `/sales-admin`, `/supervisor`, `/my-portfolio`, `/manager`).
8. **Jetons de la maquette** dans `index.css`, avec les classes de composants portées telles quelles.

### Ce qui reste

1. **Onze modules sur dix-huit sont des écrans d'attente.** Sept passent encore par la fabrique `page()` de `features/shared/placeholders.tsx` (données figées) ; quatre affichent honnêtement « module à venir » via `features/shared/ModulePlaceholder.tsx`. Seules 5 pages sont réelles : Dashboard, Clients, Pipeline, Campagnes, Rapports.
2. **Les écrans métier tirent encore de `src/data/mock.ts`** — y compris la recherche globale de `Topbar`. Seuls les tableaux de bord et l'authentification appellent l'API.
3. **Code mort dans `components/ui/`** — à reprendre au fil de la migration vers shadcn (D10).
4. **`providers/ThemeProvider.tsx` est toujours vide**, et le mode sombre n'est pas déclaré.
5. **Aucun test, aucune CI.**
6. **En dessous de `md`, les tableaux ne basculent pas en cartes.** L'application reste inutilisable sur mobile (CDC §8.4).

---

## Identité visuelle

**`DESIGN.md` à la racine fait autorité.** Le lire avant toute modification d'apparence.

### D10 — shadcn/ui est le socle (décision actée, 29/07/2026)

Option B de `DESIGN.md` §7 retenue. Conséquences :

- **Déclarer le pont de variables CSS** dans `src/index.css`, mappant les jetons MAKOR sur les variables attendues par shadcn : `--background`, `--foreground`, `--primary`, `--muted-foreground`, `--border`, `--sidebar`, `--radius`… **Aucune n'est déclarée aujourd'hui** : les 10 composants shadcn sont sans style.
- **Déclarer la variante mode sombre** en même temps (`next-themes` est installé, `ThemeProvider` est vide).
- **`SignalMeter` et `KpiCard` restent des composants maison.**
- Les autres primitives maison (`Button`, `Badge`, `Card`, `Table`, `Input`, `Field`, `Modal`) **migrent progressivement** vers les conventions shadcn.
- **L'identité visuelle vient du thème** — jetons MAKOR, Space Grotesk, densité — **pas de composants écrits à la main.**

C'est le prérequis à tout travail d'apparence : rien ne doit être stylé avant que le pont existe.

### Règles permanentes

- **Aucune couleur en dur.** Ni `#0e7c86`, ni `bg-teal-600`, ni `text-gray-500`, ni `bg-[#...]`. Uniquement les jetons `@theme` : `wire`, `pulse`, `signal`, `alert`, `amber`, `ink`, `paper`, `surface`, `slate`, `line`.
  *État : 9 occurrences restantes, toutes dans des props `recharts` qui n'acceptent pas les classes Tailwind — `DashboardPage.tsx:70-81`, `ReportsPage.tsx:178-179`. Zéro classe de palette Tailwind par défaut, zéro valeur arbitraire : la discipline est tenue partout ailleurs.*
- `font-display` pour les titres et valeurs de KPI ; `.font-mono-tabular` pour **toute donnée chiffrée en colonne** — aujourd'hui non appliqué systématiquement, les colonnes de montants ne s'alignent pas.
- Créer **`src/lib/status.ts`** pour centraliser les correspondances statut → couleur (`DESIGN.md` §6), aujourd'hui dispersées.
- Chaque vue liste doit traiter **quatre états** : chargement (squelettes), vide, erreur (message français + « Réessayer »), contenu. *État : « vide » correct à 5 endroits, « chargement » et **« erreur » inexistants partout**.*
- Accessibilité : contraste AA, `focus-visible` partout, `aria-label` sur les boutons à icône seule, navigation clavier complète — **y compris une alternative clavier au drag & drop du pipeline**, absente aujourd'hui.
- Responsive obligatoire (CDC §8.4). **En dessous de `md`, les tableaux basculent en cartes empilées** — n'existe nulle part aujourd'hui : `ui/table.tsx:6` se contente d'un `overflow-x-auto`, et `ClientsPage`, `PipelinePage`, `CampaignsPage`, `ModuleListPage` n'ont aucun point de rupture. L'application n'est pas utilisable sur mobile.

---

## Décisions actées à impact frontend

- **D5 — Drag & drop conditionné :** le refus d'une transition de pipeline **doit être visible à
  l'écran avec sa raison**. *Appliqué depuis le 10/08* — en amont, une colonne exigeant un bon de
  commande signé porte un cadenas ; en aval, le refus du backend s'affiche tel quel dans un bandeau
  `role="alert"` et la carte revient à sa colonne.
- **D24 — Le pipeline s'administre depuis l'écran.** *Appliqué le 11/08.* Les contrôles de colonne
  (créer, renommer, réordonner, retirer) vivent **sur la page Pipeline**, conformément à la maquette
  (l. 597 et 645) — pas d'écran ni de module dédié. L'écriture est réservée au `SUPER_ADMIN` ; les
  autres rôles ne voient pas le bouton. Le déplacement d'une colonne se fait **aux flèches**, seul
  écart assumé avec la maquette, qui dit « glissez les colonnes » : le geste est pris par les cartes,
  et l'alternative clavier est de toute façon exigée ci-dessus.
- **D6 — Rédaction IA :** le texte généré s'affiche dans un **champ éditable explicitement marqué comme brouillon**. Aucun bouton d'envoi client ne doit être atteignable sans validation humaine explicite.
- **D9 — Sender ID :** les actions « approuver » et « rejeter » sont réservées au Super Admin. Le Manager crée et consulte sans pouvoir d'approbation — le bouton ne doit pas lui être affiché.
- **D3 — Messagerie interne repoussée en V2 :** ne pas construire d'écran de messagerie. En V1, seul l'envoi de document par email depuis une fiche.
