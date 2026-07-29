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
| `apps/frontend/CLAUDE.md` | Conventions et état du frontend                                                 |
| `apps/backend/CLAUDE.md`  | Conventions et état du backend                                                  |

**Règle d'arbitrage :** en cas de contradiction entre le code et le cahier des charges, c'est le cahier des charges qui a raison — sauf décision explicite consignée dans ce fichier.

## Structure

```
makor-crm/
├── CLAUDE.md                 ce fichier
├── CDC-CRM-MAKOR-v3.md       cahier des charges
├── DESIGN.md                 charte visuelle
└── apps/
    ├── frontend/             React 19 + Vite + Tailwind v4 + shadcn/ui
    └── backend/              NestJS + Prisma + PostgreSQL
```

## Rôles utilisateurs

Cinq rôles, avec une matrice de permissions en **section 7 du cahier des charges** et des tableaux de bord distincts en **section 4.1**.

| Rôle             | Portée                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------- |
| **Super Admin**  | Administration globale, tableau de bord consolidé, audit, pipelines personnalisés       |
| **Admin ventes** | Reporting : volumes et marges FCFA par client et secteur, qualité du pipeline           |
| **Superviseur**  | Supervision de l'équipe : RDV, propositions par canal, ventes par produit et commercial |
| **Commercial**   | Son portefeuille, son pipeline, son agenda                                              |
| **Manager**      | Facturation, encaissements, bons de commande, sender ID                                 |

Toute vue, tout menu, toute action et tout endpoint doivent être conditionnés par le rôle.

## Pipeline commercial

`Prospect → RDV → Proposition → Bon de commande → Contrat → Vente`

Personnalisable par le Super Admin. Le drag & drop doit refuser visuellement les transitions non autorisées.

## Entités métier attendues

Client · Prospect · Opportunité · Produit · Campagne · Devis · Bon de commande · Contrat · Facture · Encaissement · Demande Sender ID · Rendez-vous · Document · Utilisateur interne · Journal d'audit

Détail des attributs en **section 6 du cahier des charges**.

---

## ⚠️ Écart majeur connu

Le backend expose des modules **`warehouses`** (entrepôts), **`tickets`** (support), **`subscriptions`** et **`offers`** qui **ne figurent nulle part dans le cahier des charges**. À l'inverse, les entités centrales du CDC — Opportunité, Campagne, Devis, Bon de commande, Contrat, Encaissement, Sender ID, Journal d'audit — semblent absentes.

Le backend paraît dériver d'un modèle générique de CRM/ERP plutôt que de ce cahier des charges.

**Cet écart doit être arbitré avant tout développement.** Ne pas construire de fonctionnalité par-dessus tant que la question n'est pas tranchée. En cas de doute sur une entité, demander plutôt que supposer.

---

## Méthode de travail attendue

- **Explorer avant de modifier.** Lire les fichiers concernés et leurs dépendances avant toute proposition.
- **Proposer un plan pour toute tâche touchant plus de trois fichiers**, et attendre validation.
- **Un chantier à la fois.** Ne pas enchaîner plusieurs modules dans une même intervention.
- **Ne jamais supprimer un fichier sans le signaler**, même vide.
- **Ne pas installer de dépendance sans justification.**
- **Vérifier avec le build et le lint de l'application concernée** avant d'annoncer qu'une tâche est terminée.
- Quand une exigence du cahier des charges est ambiguë — « pipeline personnalisé », « drive and drop conditionné », les mentions d'IA en §4.6 à §4.9, « envoi et réception de messages entre utilisateurs » en §4.1 — **poser une question fermée plutôt qu'inventer une interprétation**.

## Consigner les décisions

Quand un arbitrage est rendu (périmètre du backend, choix de design system, convention de nommage), l'ajouter à ce fichier. C'est ce qui évite de réexpliquer la même chose à chaque session.
