# CLAUDE.md — Backend CRM MAKOR

> **Emplacement : `makor-crm\apps\backend\CLAUDE.md`**
> Complète le `CLAUDE.md` de la racine, ne le remplace pas.
>
> Ce fichier a été rédigé à partir des seules sorties de build. Il devra être complété après l'audit — notamment les sections Organisation et Conventions.

---

## Stack attendue (cahier des charges §2.1)

| Couche                   | Technologie                                                  |
| ------------------------ | ------------------------------------------------------------ |
| Framework                | NestJS (Node.js / TypeScript)                                |
| ORM                      | Prisma                                                       |
| Base de données          | PostgreSQL                                                   |
| Cache et files d'attente | Redis — file d'envoi des campagnes, extractions de reporting |
| Temps réel               | Socket.IO — statut de campagne, bon de commande signé        |
| Authentification         | JWT + 2FA pour Super Admin, Admin ventes et Manager          |
| Documentation API        | Swagger / OpenAPI                                            |
| Conteneurisation         | Docker                                                       |

## Commandes

```bash
npm run build          # nest build (inclut la vérification TypeScript)
npx prisma generate    # régénère le client Prisma depuis schema.prisma
npx prisma migrate dev # applique et crée une migration
npx prisma studio      # explorateur de base de données
```

**Règle absolue :** après toute modification de `prisma/schema.prisma`, lancer `npx prisma generate`. Sans cela le client Prisma reste désynchronisé et le build échoue en cascade.

---

## État réel — build cassé

`npm run build` échoue avec une cinquantaine d'erreurs TypeScript, qui se ramènent à **trois causes**.

### Cause 1 — client Prisma désynchronisé du schéma (majorité des erreurs)

Symptômes : `Property 'company' | 'offer' | 'subscription' | 'ticket' | 'warehouse' does not exist on type 'PrismaService'`, `Module '@prisma/client' has no exported member 'SubscriptionStatus' | 'TicketPriority' | 'TicketStatus'`, `'Prisma' has no exported member named 'WarehouseWhereInput'. Did you mean 'RoleWhereInput'?`.

Le client généré connaît `Role` mais ignore `Warehouse`, `Company`, `Offer`, `Subscription`, `Ticket`. L'enum `InvoiceStatus` ne contient que `DRAFT`, `SENT`, `PAID`, `CANCELLED` alors que le code attend en plus `VIEWED`, `PARTIALLY_PAID`, `OVERDUE`, `REFUNDED`.

Première tentative : `npx prisma generate`. Si les erreurs persistent, ces modèles ne sont pas dans `schema.prisma` — le code a été écrit avant le schéma.

### Cause 2 — cascade de la précédente

`create-subscription.dto.ts` et `create-ticket.dto.ts` échouent à importer leurs enums depuis `@prisma/client`. Les `UpdateXDto` qui en dérivent via `PartialType()` deviennent alors vides, d'où toutes les erreurs `Property 'startDate' | 'customerId' | 'offerId' | 'assignedToId' does not exist`. Ces erreurs disparaîtront d'elles-mêmes une fois la cause 1 corrigée.

### Cause 3 — trois erreurs de code indépendantes

| Fichier                                          | Ligne | Problème                                                                    |
| ------------------------------------------------ | ----- | --------------------------------------------------------------------------- |
| `src/invoices/services/invoice-pdf.service.ts`   | 20    | Retourne un `string` là où `Promise<string>` est déclaré — `async` manquant |
| `src/invoices/services/invoice-email.service.ts` | 9     | Fonction typée `Promise<void>` sans corps ni valeur de retour               |
| `src/warehouses/warehouses.service.ts`           | 28    | `QueryWarehouseDto` introuvable — non créé ou non importé                   |

---

## ⚠️ Écart de périmètre avec le cahier des charges

Modules présents dans le code : `companies`, `offers`, `subscriptions`, `tickets`, `warehouses`, `invoices`.

**`warehouses` (entrepôts), `tickets` (support) et `subscriptions` (abonnements) ne figurent nulle part dans le cahier des charges.**

Entités exigées par le CDC et apparemment absentes : Prospect, **Opportunité**, **Campagne**, **Devis**, **Bon de commande**, **Contrat**, **Encaissement**, **Demande Sender ID**, **Rendez-vous**, **Document**, **Journal d'audit**.

Le backend semble dériver d'un modèle générique de CRM/ERP, pas de ce cahier des charges. **Corriger le build n'a de valeur que si ce périmètre est confirmé.** Ne pas ajouter de fonctionnalité tant que la question n'est pas arbitrée avec le porteur du projet.

---

## Exigences non fonctionnelles à respecter

Rappel des sections 2.4 et 8 du cahier des charges :

- **Sécurité** — HTTPS partout, JWT avec expiration et renouvellement, 2FA sur les comptes sensibles, permissions par rôle **et par module**, clés d'API dédiées et révocables pour la passerelle SMS/WhatsApp, journal d'audit des actions critiques.
- **Performance** — moins de 2 secondes sur les actions courantes ; campagnes et extractions de reporting traitées en asynchrone via file Redis.
- **Robustesse** — disponibilité 99,5 % en heures ouvrées, reprise automatique de l'envoi en cas d'échec passerelle, sauvegardes quotidiennes avec restauration testée.
- **Passerelle SMS/WhatsApp** — couche d'abstraction (adaptateur) permettant de changer de prestataire sans impacter le reste ; réception des statuts de livraison par webhook ; calcul du taux de délivrabilité ; détection d'anomalies.
