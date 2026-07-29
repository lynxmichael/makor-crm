# CLAUDE.md — Frontend CRM MAKOR

> **Emplacement : `makor-crm\apps\frontend\CLAUDE.md`**
> Complète le `CLAUDE.md` de la racine, ne le remplace pas.

---

## Stack

| Couche          | Technologie                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Framework       | React 19 + TypeScript strict                                                                                              |
| Build           | Vite 8                                                                                                                    |
| Styles          | Tailwind CSS v4, configuration **CSS-first** via `@theme` dans `src/index.css` — il n'y a **pas** de `tailwind.config.js` |
| Composants      | shadcn/ui (style `base-nova`) + `@base-ui/react`                                                                          |
| Routage         | react-router-dom v7                                                                                                       |
| Données serveur | TanStack Query v5 + axios                                                                                                 |
| État client     | Zustand                                                                                                                   |
| Formulaires     | react-hook-form + zod (`@hookform/resolvers`)                                                                             |
| Animations      | framer-motion                                                                                                             |
| Graphiques      | recharts                                                                                                                  |
| Icônes          | lucide-react **exclusivement**                                                                                            |
| Toasts          | sonner                                                                                                                    |
| Thème           | next-themes                                                                                                               |

## Commandes

```bash
npm run dev       # serveur de développement
npm run build     # tsc -b && vite build
npm run lint      # eslint
npm run preview   # prévisualisation du build
```

**`npm run build` doit passer avant de considérer une tâche terminée** — il inclut la vérification TypeScript.

Alias d'import : `@/` → `src/`. Toujours des imports absolus, jamais de `../../../`.

## Organisation

```
src/
  assets/       logos MAKOR
  components/
    shared/     composants métier réutilisables
    ui/         primitives de design system
  config/       constantes, variables d'environnement, navigation
  data/         jeux de données de démonstration (à remplacer par l'API)
  features/     un dossier par domaine métier
  hooks/        hooks partagés
  layouts/      AppLayout, AuthLayout, BlankLayout, DashboardLayout
  lib/          utilitaires (cn, formatteurs)
  providers/    QueryProvider, AuthProvider, ThemeProvider
  routes/       AppRouter, ProtectedRoute, PublicRoute
  services/     clients API par domaine
  store/        stores Zustand
  types/        types partagés
```

Un module métier = un dossier dans `features/` avec sa page, ses composants et ses hooks. Ce qui sert à plus d'un module remonte dans `components/shared/`.

## Conventions

- Composants fonctionnels, props typées par `interface`, export nommé (défaut réservé à `App.tsx`).
- `PascalCase.tsx` pour les composants, `kebab-case.ts` pour hooks et utilitaires.
- `cn()` (`@/lib/utils`) pour toute composition de classes conditionnelles.
- **Icônes : `lucide-react` uniquement.** `react-icons` est présent dans les dépendances mais ne doit pas être utilisé.
- **Formulaires : `react-hook-form` + `zod`** via `zodResolver`. Pas de gestion d'état de formulaire avec `useState`.
- **Réseau : tout appel passe par un service de `src/services/`**, consommé via un hook TanStack Query. Aucun `axios` ni `fetch` direct dans un composant.
- **Aucun `any`.** Utiliser `unknown` et affiner.

## Formats métier

Formatteurs centralisés dans `src/lib/format.ts` :

| Donnée    | Format                                             |
| --------- | -------------------------------------------------- |
| Montant   | `1 250 000 FCFA` (espace insécable, sans décimale) |
| Taux      | `97,4 %` (virgule décimale)                        |
| Date      | `date-fns` locale `fr` → `14 juil. 2026`           |
| Référence | monospace majuscules → `BC-2026-0142`              |

Jamais de format anglo-saxon (`1,250,000` ou `97.4%`).

## Identité visuelle

**`DESIGN.md` à la racine du monorepo fait autorité.** Le lire avant toute modification d'apparence.

- **Aucune couleur en dur.** Ni `#0e7c86`, ni `bg-teal-600`, ni `text-gray-500`, ni `bg-[#...]`. Uniquement les jetons `@theme` : `wire`, `pulse`, `signal`, `alert`, `amber`, `ink`, `paper`, `surface`, `slate`, `line`.
- `font-display` pour les titres et valeurs de KPI ; `.font-mono-tabular` pour **toute donnée chiffrée en colonne**.
- Chaque vue liste doit traiter **quatre états** : chargement (squelettes), vide (message + action), erreur (message français + réessayer), contenu.
- Accessibilité : contraste AA, `focus-visible` partout, `aria-label` sur les boutons à icône seule, navigation clavier complète.
- Responsive obligatoire (exigence §8.4 du CDC). En dessous de `md`, les tableaux basculent en cartes empilées.

---

## État réel du code — à connaître avant d'intervenir

Le dossier est une **maquette haute fidélité**, pas une application fonctionnelle.

1. **18 fichiers sont vides** (0 octet) : tout `routes/`, `services/`, `store/`, `providers/`, `config/`, et 3 des 4 `layouts/`. Le squelette existe en nom seulement.
2. **`src/providers/ueryProvider.tsx`** — faute de frappe, à renommer `QueryProvider.tsx`.
3. **Aucune authentification.** `LoginPage` enchaîne les écrans sans rien vérifier puis redirige vers `/`. Aucune route protégée, pas de JWT, pas de 2FA, aucune notion de rôle. Le CDC exige JWT + 2FA pour Super Admin, Admin ventes et Manager (§2.4).
4. **Aucun appel API.** Tout vient de `src/data/mock.ts` et `src/data/reporting-juillet-2026.ts`.
5. **12 dépendances installées et jamais importées** : `axios`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `jwt-decode`, `date-fns`, `react-helmet-async`, `react-error-boundary`, `react-hot-toast`, `react-icons`, `react-intersection-observer`, `react-use`, `@fontsource-variable/geist`.
6. **Conflit de design system.** `src/index.css` définit un thème custom (`wire`, `ink`, `paper`…) mais **aucune des variables attendues par shadcn/ui** (`--background`, `--foreground`, `--primary`, `--muted-foreground`, `--sidebar`, `--radius`). Les composants `avatar`, `dialog`, `dropdown-menu`, `sheet`, `sidebar` et `navigation-menu` les référencent et sont donc sans style. Six ne sont importés nulle part : environ 1 500 lignes de code mort.
7. **11 des 16 modules sont des placeholders** générés par la fabrique `page()` dans `features/shared/placeholders.tsx` — tous rendent le même `ModuleListPage` générique sur données figées.
8. **Aucun test, aucune CI.** `README.md` est encore le template Vite par défaut.

Deux systèmes de composants cohabitent : les primitives maison (`Button`, `Card`, `Badge`, `Table` — cohérentes avec le thème, réellement utilisées) et les composants shadcn (non stylés, majoritairement morts). **Trancher entre les deux est un prérequis** à tout travail d'identité visuelle. Voir §7 de `DESIGN.md`.
