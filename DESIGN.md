# DESIGN.md — Identité visuelle du CRM MAKOR

Charte de référence pour toute décision d'apparence. Ce document fait autorité : en cas de contradiction avec un composant existant, c'est le composant qui doit être corrigé.

---

## 1. Intention

Un CRM télécom qui manipule des volumes, des marges et des taux de délivrabilité. L'interface doit être **dense sans être écrasante**, **lisible en un coup d'œil**, et rester crédible devant un directeur commercial comme devant un opérateur qui surveille une campagne en cours.

Le langage visuel emprunte au vocabulaire du signal : un flux qui passe ou qui ne passe pas, une intensité, une anomalie. D'où les noms des jetons de couleur — `wire`, `pulse`, `signal` — qui doivent être compris comme des rôles, pas comme des teintes.

**Trois principes :**

1. **La donnée d'abord.** Le chrome de l'interface s'efface, les chiffres portent la couleur.
2. **Une seule couleur d'action.** `wire` marque l'action principale. Si tout est teal, plus rien ne l'est.
3. **La couleur a un sens.** Un vert veut dire « ça va », un rouge veut dire « ça ne va pas ». Jamais de couleur décorative.

---

## 2. Jetons de couleur

> ⚠️ **SECTION PÉRIMÉE — voir D14 dans `CLAUDE.md`.**
> La palette ci-dessous (teal `#0e7c86`, corail `#ff6b4a`) **n'a jamais été validée par personne**. Le
> directeur général et les équipes commerciales ont validé le 30/07/2026 une identité **marine
> `#001B2E`/`#00304F` et orange `#F39304`**, portée par `design/makor-crm-maquette.html`.
> **N'appliquez aucun jeton de cette section à du code neuf.** Elle est conservée pour mémoire, le temps
> que §2 et `src/index.css` soient réécrits depuis la maquette — chantier ouvert, non fait.

Déclarés dans `src/index.css` sous `@theme`. **Ce sont les seules couleurs autorisées.**

| Jeton      | Valeur    | Rôle                                                                                                                               |
| ---------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ink`      | `#12141c` | Texte principal, fonds sombres (écran de connexion)                                                                                |
| `paper`    | `#f5f6f4` | Fond d'application                                                                                                                 |
| `surface`  | `#ffffff` | Cartes, modales, tableaux                                                                                                          |
| `line`     | `#e3e5e1` | Bordures, séparateurs                                                                                                              |
| `slate`    | `#5b6472` | Texte secondaire, libellés, métadonnées                                                                                            |
| `wire`     | `#0e7c86` | **Couleur d'action principale** : boutons primaires, liens, état actif, focus                                                      |
| `wire-dim` | `#0b646c` | Survol de `wire`                                                                                                                   |
| `pulse`    | `#ff6b4a` | Accent vif — réservé aux moments d'emphase rares (mise en avant, badge « nouveau »). Ne jamais l'utiliser pour un bouton d'action. |
| `signal`   | `#1e9e6b` | Statut positif : livré, signé, encaissé, variation à la hausse                                                                     |
| `amber`    | `#e8a23d` | Statut d'attente : en cours, en attente de signature, échéance proche                                                              |
| `alert`    | `#e0433a` | Statut négatif : échec, anomalie, retard, suppression                                                                              |

### Règles d'usage

- **Interdiction stricte des couleurs en dur.** Pas de `#0e7c86`, pas de `bg-teal-600`, pas de `text-gray-500`, pas de `bg-[#...]` dans un composant. Uniquement `bg-wire`, `text-slate`, `border-line`, etc.
- **Fonds teintés :** toujours par opacité du jeton (`bg-signal/10`, `border-signal/20`), jamais par une nuance inventée.
- **Ratio d'occupation cible :** environ 90 % neutre (`paper`, `surface`, `ink`, `slate`, `line`), 8 % `wire`, 2 % couleurs de statut. Si une page paraît bariolée, c'est que des couleurs de statut ont été utilisées comme décoration.
- **`pulse` est rare.** Une occurrence par écran au maximum, et souvent zéro.

### À produire

Le thème actuel ne couvre que le mode clair. Deux extensions sont nécessaires :

1. **Mode sombre.** `next-themes` est installé et un `ThemeProvider` est prévu (fichier vide). Définir une variante `.dark` avec `ink`/`paper`/`surface` inversés et les couleurs de statut désaturées pour rester lisibles sur fond sombre.
2. **Pont vers shadcn/ui.** Si les composants shadcn sont conservés, mapper les variables qu'ils attendent sur les jetons MAKOR :

```css
@theme {
  --color-background: var(--color-paper);
  --color-foreground: var(--color-ink);
  --color-card: var(--color-surface);
  --color-primary: var(--color-wire);
  --color-muted-foreground: var(--color-slate);
  --color-border: var(--color-line);
  --color-destructive: var(--color-alert);
  --color-sidebar: var(--color-ink);
  --radius: 0.75rem;
  /* …compléter selon les classes réellement utilisées */
}
```

Sans ce pont, les composants shadcn restent sans style. **C'est la décision structurante à trancher en premier** (voir §7).

---

## 3. Typographie

> ⚠️ **CHOIX DES FAMILLES PÉRIMÉ — voir D14 dans `CLAUDE.md`.**
> La maquette validée le 30/07 utilise **Manrope** (titres) et **Inter** (UI et texte), pas Space
> Grotesk + IBM Plex. Les familles du tableau ci-dessous sont donc à remplacer lors de la réécriture
> de §2/§3 et de `src/index.css`.
> **Ce qui reste valide dans cette section :** l'échelle de tailles, les rôles typographiques et la
> règle des chiffres tabulaires — ils ne dépendent pas des familles choisies. Seule la police monospace
> reste à arbitrer, la maquette se contentant de `monospace` générique.

Trois familles, chargées depuis Google Fonts dans `index.html`.

| Famille           | Jeton                | Usage                                                                                                                                                  |
| ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Space Grotesk** | `font-display`       | Titres `h1`–`h4`, valeurs de KPI, titres de carte. Poids 500 à 700.                                                                                    |
| **IBM Plex Sans** | police par défaut    | Tout le corps de l'interface : libellés, tableaux, boutons, paragraphes. Poids 400 à 600.                                                              |
| **IBM Plex Mono** | `.font-mono-tabular` | **Toute donnée chiffrée alignée en colonne** : montants FCFA, volumes, taux, références (`BC-2026-0142`). Active `font-variant-numeric: tabular-nums`. |

### Échelle

| Rôle               | Taille | Classes                                                   |
| ------------------ | ------ | --------------------------------------------------------- |
| Valeur de KPI      | 30 px  | `font-display text-3xl font-semibold`                     |
| Titre de page      | 24 px  | `font-display text-2xl font-semibold`                     |
| Titre de carte     | 14 px  | `font-display text-sm font-semibold tracking-wide`        |
| Corps / cellule    | 14 px  | `text-sm`                                                 |
| Libellé de section | 12 px  | `text-xs font-medium uppercase tracking-wider text-slate` |
| Métadonnée         | 12 px  | `text-xs text-slate`                                      |

**Règle :** un montant, un volume ou un taux affiché dans un tableau ou une carte porte **toujours** `.font-mono-tabular`. Sans cela les colonnes de chiffres ne s'alignent pas et la lecture comparative est perdue — ce qui est l'usage principal de ce CRM.

### Nettoyage

`@fontsource-variable/geist` est installé mais aucune police Geist n'est déclarée dans le thème. À retirer des dépendances.

---

## 4. Formats métier

L'identité visuelle passe autant par la cohérence des formats que par les couleurs. Centraliser ces formatteurs dans `src/lib/format.ts`.

| Donnée             | Format                          | Exemple                                    |
| ------------------ | ------------------------------- | ------------------------------------------ |
| Montant FCFA       | espace insécable, sans décimale | `1 250 000 FCFA`                           |
| Volume de messages | espace insécable                | `184 500 messages`                         |
| Taux               | une décimale                    | `97,4 %`                                   |
| Variation          | signe explicite + couleur       | `+12,3 %` en `signal`, `−4,1 %` en `alert` |
| Date               | `date-fns`, locale `fr`         | `14 juil. 2026`                            |
| Date + heure       |                                 | `14 juil. 2026 à 09:32`                    |
| Référence          | monospace, majuscules           | `BC-2026-0142`                             |
| Téléphone          | groupé par 2                    | `+225 07 22 45 61 09`                      |

**Séparateur décimal :** virgule (convention francophone). **Jamais** de format anglo-saxon (`1,250,000` ou `97.4%`).

---

## 5. Espacement, rayons et élévation

- **Grille de 4 px.** Espacements autorisés : 4, 8, 12, 16, 20, 24, 32, 40, 48.
- **Rayons :** `rounded-lg` (8 px) pour les boutons, champs et badges rectangulaires · `rounded-xl` (12 px) pour les cartes · `rounded-2xl` (16 px) pour les modales et les grands panneaux · `rounded-full` pour les badges de statut et les avatars.
- **Élévation :** `shadow-sm` sur les cartes, `shadow-lg` sur les modales et menus flottants. Rien d'autre. Pas d'ombre colorée, pas de `shadow-2xl`.
- **Densité de tableau :** hauteur de ligne 44 px, padding horizontal 16 px, en-tête en `text-xs uppercase tracking-wider text-slate`.
- **Rythme de page :** padding 24 px sur poste de travail, 16 px sur mobile. Espacement de 24 px entre les blocs de premier niveau.

---

## 6. Composants — règles transverses

### Boutons

Quatre variantes, définies dans `components/ui/Button.tsx` :

| Variante              | Usage                              | Fréquence                  |
| --------------------- | ---------------------------------- | -------------------------- |
| `primary` (`bg-wire`) | Action principale                  | **Une seule par écran**    |
| `secondary`           | Actions courantes                  | Plusieurs                  |
| `ghost`               | Actions discrètes, barres d'outils | Plusieurs                  |
| `danger` (`bg-alert`) | Suppression, révocation            | Toujours avec confirmation |

Deux tailles : `sm` (32 px) pour les barres d'outils et les lignes de tableau, `md` (40 px) par défaut.

### Badges de statut

`components/ui/Badge.tsx`, tons `neutral` · `wire` · `signal` · `amber` · `alert`. Correspondances métier à respecter systématiquement :

| Domaine         | `signal` | `amber`       | `alert`          | `neutral` |
| --------------- | -------- | ------------- | ---------------- | --------- |
| Campagne        | Délivré  | En cours      | Échec / Anomalie | Brouillon |
| Bon de commande | Signé    | Envoyé        | Refusé           | Brouillon |
| Facture         | Payée    | En attente    | En retard        | Émise     |
| Opportunité     | Gagnée   | En cours      | Perdue           | Nouvelle  |
| Sender ID       | Validé   | En traitement | Rejeté           | Demandé   |

Un même statut doit avoir la même couleur partout dans l'application. Un tableau de correspondance centralisé (`src/lib/status.ts`) est préférable à des `className` dispersés.

### États d'écran

Chaque vue liste doit traiter explicitement **quatre états** — c'est souvent ce qui manque et ce qui fait « maquette » plutôt que « produit » :

1. **Chargement** — squelettes reprenant la forme du contenu final, pas un spinner centré.
2. **Vide** — icône `lucide` en `slate`, phrase explicative, bouton d'action primaire. Jamais un tableau vide sans message.
3. **Erreur** — message compréhensible en français, bouton « Réessayer ». Pas de trace technique affichée à l'utilisateur.
4. **Contenu.**

### Mouvement

`framer-motion` est en place et utilisé avec justesse sur l'écran de connexion. Règles :

- Durée 150 à 250 ms, `ease-out`.
- Animation d'**entrée** uniquement (opacité + petit déplacement vertical de 6 à 10 px). Pas d'animation de sortie sauf sur les modales.
- Respecter `prefers-reduced-motion` : désactiver les transformations, conserver les fondus.
- Aucune animation sur les données d'un tableau lors d'un tri ou d'un filtrage — c'est du bruit.

### Accessibilité — non négociable

- Contraste AA (4,5:1 pour le texte courant). **`amber` sur fond blanc est en dessous du seuil** : à utiliser uniquement en fond teinté avec texte foncé, jamais en texte plein.
- `focus-visible` avec anneau `wire` sur tout élément interactif (déjà correct sur `Button`, à généraliser).
- `aria-label` obligatoire sur tout bouton à icône seule.
- Navigation clavier complète, y compris le drag & drop du pipeline qui doit avoir une alternative clavier.
- Modales : piège de focus, fermeture par `Échap`, restitution du focus à la fermeture.
- Ne jamais transmettre une information par la seule couleur : associer une icône ou un libellé au statut.

### Responsive

Exigence 8.4 du cahier des charges : poste de travail, tablette et mobile.

- Points de rupture Tailwind par défaut ; concevoir en priorité pour 1440 px (usage réel : bureau), puis dégrader.
- **Tableaux :** en dessous de `md`, basculer en cartes empilées. Un défilement horizontal sur un tableau de 8 colonnes est inutilisable au doigt.
- **Barre latérale :** repliable en icônes sur tablette, tiroir plein écran sur mobile.
- **Tableaux de bord :** grille de KPI en 4 colonnes sur bureau, 2 sur tablette, 1 sur mobile.

---

## 7. Décision structurante — tranchée (D10)

> **Arbitrage rendu le 29/07/2026 : c'est l'option B.** shadcn/ui devient le socle de composants.
> L'exposé ci-dessous est conservé comme justification, non comme question ouverte.
>
> **Mise en œuvre suspendue par D14 :** le pont de variables CSS doit être posé sur les jetons
> définitifs issus de la maquette validée, pas sur la palette teal/corail abandonnée. Le chantier 6
> d'`AUDIT.md` §8 reprend une fois §2 et §3 réécrits.

Le projet contient **deux systèmes de composants qui ne communiquent pas** :

- **Primitives maison** — `Button`, `Card`, `Badge`, `Table`, `Input`, `Field`, `Modal`, `SignalMeter`. Compactes, cohérentes avec le thème MAKOR, réellement utilisées.
- **Composants shadcn/ui** — `avatar`, `dialog`, `dropdown-menu`, `sheet`, `sidebar`, `navigation-menu`, `separator`, `skeleton`, `sonner`, `tooltip`. Ils référencent des variables CSS (`--background`, `--primary`, `--sidebar`…) qui **ne sont déclarées nulle part**. Six d'entre eux ne sont importés dans aucun fichier, soit environ 1 500 lignes de code mort.

Deux options :

**A — Tout ramener sur les primitives maison.** Supprimer les composants shadcn non utilisés, réimplémenter les 4 utilisés (`sheet`, `separator`, `skeleton`, `tooltip`) avec les jetons MAKOR. Résultat : cohérence totale, base légère. Coût : réécrire soi-même les comportements accessibles (piège de focus, gestion du clavier) que shadcn fournit déjà.

**B — Adopter shadcn/ui comme socle.** Déclarer le pont de variables (§2), migrer les primitives maison vers les conventions shadcn. Résultat : accessibilité et comportements robustes fournis, écosystème de composants disponible. Coût : refonte de tous les composants existants, et le style `base-nova` devra être fortement personnalisé pour ne pas ressembler à toutes les autres applications shadcn.

**Option retenue : B** (D10), parce que le cahier des charges impose explicitement « React + TypeScript + Tailwind CSS + shadcn/ui » (§2.1) et met en avant les « composants accessibles » comme justification du choix. L'identité visuelle vient alors du thème (jetons MAKOR, typographie, densité) et non de composants écrits à la main.

**État réel au 31/07 :** les **dix** composants shadcn cités plus haut ont été supprimés avec le reste du code mort frontend (chantier 5, 30/07). `src/components/ui/` ne contient plus que les primitives maison — `Badge`, `Button`, `Card`, `Field`, `Input`, `Modal`, `SignalMeter`, `Table`. Le constat des « deux systèmes qui ne communiquent pas » n'est donc plus d'actualité : appliquer l'option B consiste désormais à **réintroduire shadcn/ui sur des jetons propres**, ce qui est plus simple que la refonte décrite ci-dessus. `SignalMeter` et `KpiCard` restent maison, conformément à D10.
