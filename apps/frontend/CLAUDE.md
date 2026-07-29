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
npm run build     # tsc -b && vite build  ← ÉCHOUE actuellement, voir ci-dessous
npm run lint      # eslint                ← 3 erreurs, toutes dans du code mort
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
  config/       constantes, variables d'environnement, navigation   ← vides
  data/         jeux de données de démonstration (à remplacer par l'API)
  features/     un dossier par domaine métier
  hooks/        hooks partagés
  layouts/      AppLayout (seul non vide)
  lib/          utilitaires (cn, formatteurs)
  providers/    QueryProvider, AuthProvider, ThemeProvider           ← vides
  routes/       AppRouter, ProtectedRoute, PublicRoute               ← vides
  services/     clients API par domaine                              ← vides
  store/        stores Zustand                                       ← vides
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

## État réel du code — à connaître avant d'intervenir

Le dossier est une **maquette haute fidélité**, pas une application fonctionnelle.

1. **`npm run build` échoue.** Erreur unique : `tsconfig.app.json(3,5): error TS5101` — TypeScript 6.0.3 refuse `baseUrl`. La compilation s'arrête **avant tout type-check** ; `vite build` n'est jamais atteint. Correctif : supprimer `baseUrl` (`paths` fonctionne seul en `moduleResolution: bundler`) ou ajouter `"ignoreDeprecations": "6.0"`.
2. **`strict` n'est pas activé** dans `tsconfig.app.json` — à corriger en même temps que le point 1, le coût est nul (zéro `any` aujourd'hui).
3. **`npm run lint` échoue** — 3 erreurs, **toutes dans du code mort** : `ui/navigation-menu.tsx:166`, `ui/sidebar.tsx:722`, `hooks/use-mobile.ts:14`. Supprimer le code mort les résout.
4. **18 fichiers sont vides** (0 octet) : tout `routes/`, `services/`, `store/`, `providers/`, `config/`, et 3 des 4 `layouts/`. **C'est le goulot d'étranglement du projet** — tout module fonctionnel en dépend.
5. **`src/providers/ueryProvider.tsx`** — faute de frappe, à renommer `QueryProvider.tsx`.
6. **Aucune authentification.** `LoginPage.tsx:13-21` : les champs ne sont reliés à aucun état, **aucune valeur n'est lue**, le code OTP n'est comparé à rien. Aucune route protégée, pas de JWT, aucune notion de rôle — le rôle affiché dans `Topbar.tsx:192-193` est écrit en dur.
7. **Aucun appel API.** Tout vient de `src/data/mock.ts` et `src/data/reporting-juillet-2026.ts`.
8. **Code mort : 1 705 lignes sur 2 004** dans `components/ui/`. Plus `src/App.css` (185 l., gabarit Vite) et `src/data/mock.ts:340-519` (~180 l.), importés nulle part.
9. **15 dépendances jamais importées** — dont `axios`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `jwt-decode`, `date-fns`, `react-error-boundary`. Ce sont précisément celles nécessaires pour brancher l'API : installées en prévision, jamais utilisées.
10. **11 des 16 modules sont des placeholders** générés par la fabrique `page()` dans `features/shared/placeholders.tsx` — tous rendent le même `ModuleListPage` sur données figées. Seules 5 pages sont réelles : Dashboard, Clients, Pipeline, Campagnes, Rapports.
11. **Aucun test, aucune CI.**

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

- **D5 — Drag & drop conditionné :** le refus d'une transition de pipeline **doit être visible à l'écran avec sa raison**. `PipelinePage.tsx:54-65` accepte aujourd'hui toutes les transitions, sans condition ni retour visuel.
- **D6 — Rédaction IA :** le texte généré s'affiche dans un **champ éditable explicitement marqué comme brouillon**. Aucun bouton d'envoi client ne doit être atteignable sans validation humaine explicite.
- **D9 — Sender ID :** les actions « approuver » et « rejeter » sont réservées au Super Admin. Le Manager crée et consulte sans pouvoir d'approbation — le bouton ne doit pas lui être affiché.
- **D3 — Messagerie interne repoussée en V2 :** ne pas construire d'écran de messagerie. En V1, seul l'envoi de document par email depuis une fiche.
