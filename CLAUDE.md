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
| `DESIGN.md`               | Charte d'identité visuelle. Fait autorité sur toute question d'apparence.       |
| `AUDIT.md`                | État des lieux au 29/07/2026 : matrice de cohérence, couverture, plan d'action  |
| `SUIVI.md`                | Journal de bord des séances. À compléter à chaque fin de séance.                |
| `apps/frontend/CLAUDE.md` | Conventions et état du frontend                                                 |
| `apps/backend/CLAUDE.md`  | Conventions et état du backend                                                  |

**Règle d'arbitrage :** en cas de contradiction entre le code et le cahier des charges, c'est le cahier des charges qui a raison — sauf décision explicite consignée dans la section « Décisions actées » ci-dessous, qui prime alors sur les deux.

## Structure

```
makor-crm/
├── CLAUDE.md · CDC-CRM-MAKOR-v3.md · DESIGN.md · AUDIT.md · SUIVI.md
└── apps/
    ├── frontend/             React 19 + Vite + Tailwind v4 + shadcn/ui
    └── backend/              NestJS + Prisma + PostgreSQL
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

Deux ruptures ouvertes, détaillées dans `AUDIT.md` §4 et §5 :

1. **Cinq contrôleurs backend montés sans authentification** — `audit`, `roles`, `permissions`, `role-permissions`, `departments`. Le journal d'audit est public et effaçable. À traiter en priorité absolue.
2. **Le build frontend échoue** — `tsconfig.app.json:3`, TypeScript 6 refuse `baseUrl`.

Le plan d'action priorisé est en **§8 de `AUDIT.md`** (29 chantiers, trois vagues). S'y référer avant d'ouvrir un chantier.

---

## Décisions actées — 29 juillet 2026

Arbitrages rendus par le porteur du projet. **Ils priment sur le CDC en cas de contradiction.**

### Périmètre

- **D1 — Suppression des 8 dossiers orphelins** du backend : `companies`, `company`, `offers`, `subscriptions`, `tickets`, `warehouses`, `devices`, `interventions`. 972 lignes, jamais montées, seule cause de la rupture de compilation.
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
