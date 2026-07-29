# Cahier des charges — CRM MAKOR Group Telecom

> **Version 3.0 — Juillet 2026** · Vente, Campagnes & Reporting Multi-produits
> Document confidentiel, usage interne. Converti depuis `CDC CRM MAKOR v3.docx` pour lecture par Claude Code.

## Sommaire

1. Présentation du projet

2. Architecture technique

3. Gestion des utilisateurs, rôles et permissions

4. Spécifications fonctionnelles (V1)

5. Modules V2 / Backlog

6. Modèle de données

7. Rôles et permissions

8. Exigences non fonctionnelles

9. Indicateurs clés (KPIs)

10. Planning indicatif de réalisation

11. Livrables attendus

12. Hypothèses et contraintes

13. Glossaire

## 1. Présentation du projet

### 1.1 Contexte et objectifs

MAKOR Group Telecom souhaite doter son équipe commerciale d'un CRM permettant de piloter l'ensemble du cycle de vente de ses produits de messagerie et de communication (SMS Marketing, OTP, API SMS, WhatsApp, Voice, Sender ID), de la prospection jusqu'à la facturation, tout en assurant le pilotage technique de l'envoi des campagnes et un reporting détaillé par produit, pays et secteur d'activité.

- Centraliser le suivi commercial de la prospection à l'encaissement
- Élargir le pilotage à l'ensemble du catalogue produits, au-delà du seul SMS
- Permettre la création, la programmation et l'envoi technique des campagnes, avec suivi de livraison
- Fournir un reporting fiable sur les volumes, marges et chiffre d'affaires
- Automatiser devis, bons de commande et contrats
- Offrir à chaque profil une vue adaptée à son niveau de responsabilité
- Assurer la traçabilité complète des actions sensibles (audit)

### 1.2 Périmètre du projet

La V1 couvre : gestion des utilisateurs et rôles, tableaux de bord par profil, gestion des clients/prospects/opportunités, catalogue produits et paramètres, pipeline commercial, campagnes (création, envoi technique et suivi), devis et bons de commande, contrats, facturation et encaissements, sender ID, agenda, documents (GED), notifications multi-canal, reporting et audit.

Sont volontairement écartés de la V1 et repoussés en backlog (section 5) : signature électronique, gestion des commissions, moteur de workflow, API partenaires, centre de communication unifié, intelligence commerciale.

### 1.3 Utilisateurs

- Super Admin : administration globale de la plateforme et tableau de bord consolidé de l'activité
- Admin ventes : pilotage des ventes ; reporting détaillé sur les volumes, marges et la qualité du pipeline
- Superviseur : supervision de l'équipe commerciale et suivi d'activité par période
- Commercial : gestion opérationnelle du pipeline, des devis, commandes, contrats, de l'agenda et des documents
- Manager : gestion de la facturation client et des encaissements

## 2. Architecture technique

### 2.1 Stack technologique

| Couche                  | Technologie retenue                           | Justification                                                                    |
| ----------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| Frontend                | React + TypeScript + Tailwind CSS + shadcn/ui | Typage fort, cohérence visuelle, composants accessibles                          |
| Backend                 | NestJS (Node.js/TypeScript) + Prisma          | Architecture modulaire, typage partagé avec le frontend, ORM type-safe           |
| Base de données         | PostgreSQL                                    | Robuste, adapté à un modèle relationnel riche (pipeline, campagnes, facturation) |
| Cache & files d'attente | Redis                                         | File d'envoi des campagnes, extractions de reporting, traitements asynchrones    |
| Temps réel              | Socket.IO                                     | Notifications instantanées : statut de campagne, bon de commande signé           |
| Conteneurisation        | Docker                                        | Environnements reproductibles (développement, recette, production)               |
| Authentification        | JWT + 2FA                                     | Sécurisation des accès, double authentification pour les comptes sensibles       |

### 2.2 Intégration passerelle SMS / WhatsApp

Le pilotage technique des campagnes nécessite l'intégration d'un ou plusieurs prestataires tiers (agrégateur SMS, API WhatsApp Business). Le backend expose une couche d'abstraction (adaptateur) permettant de changer de prestataire sans impacter le reste de l'application.

- Envoi programmé et envoi immédiat des campagnes
- Réception des statuts de livraison par webhook (délivré, échoué, en attente)
- Calcul automatique du taux de délivrabilité par campagne
- Détection d'anomalies : pic d'échecs, volume anormal, blocage opérateur

### 2.3 Architecture globale

Architecture en conteneurs Docker : un service frontend (React), un service backend (NestJS exposant une API REST documentée via Swagger), une base PostgreSQL, un service Redis pour le cache et les files d'envoi, un canal WebSocket (Socket.IO) pour le temps réel, et un adaptateur vers la ou les passerelles SMS/WhatsApp.

- Environnements distincts : développement, recette (staging), production
- Sauvegardes automatiques quotidiennes de la base de données
- HTTPS obligatoire sur l'ensemble des échanges

### 2.4 Sécurité générale

- Authentification JWT avec expiration et renouvellement des sessions
- Double authentification (2FA) pour les comptes Super Admin, Admin ventes et Manager
- Gestion fine des droits d'accès par rôle et par module
- Clés d'API dédiées et révocables pour l'intégration de la passerelle SMS/WhatsApp
- Journal d'audit des actions critiques et plan de reprise d'activité

## 3. Gestion des utilisateurs, rôles et permissions

- Création, modification et désactivation des comptes utilisateurs internes
- Attribution d'un rôle unique par utilisateur : Super Admin, Admin ventes, Superviseur, Commercial, Manager
- Gestion fine des permissions par module (détail en section 7)
- Historique des connexions et des modifications de compte

## 4. Spécifications fonctionnelles (V1)

### 4.1 Tableaux de bord

- Super Admin : tableau de bord global consolidant les statistiques de tous les profils, filtres par période, pays, produit, secteur,dans le tableau de bord, le taux des transformations des commerciaux, la taille des opportinutés
- Admin ventes : volumes total en fcfa par clients et par secteur d’activité, marges en fcfa par client et par secteur d’activités,valeur des opportunités, chiffre d'affaires et qualité du pipeline, possibilité de laisser des commentaires sur le pipeline des commerciaux, délai moyen de conclusion des deals.
- Superviseur : statistiques par période (jour à année) et par commercial : RDV, nombre de propositions envoyés par canal (SMS, email, whatsapp), bons de commande (envoyés, signés) , Nombres de ventes réalises par produit et par commercial, Nombres de ventes du mois par commercial.
- Commercial : vue de son propre portefeuille, de son pipeline et de son agenda, nombre de visites, nombre de commande et taille des opportunités, statut de chaque client dans le pipeline.
- Manager : suivi des factures envoyées et des encaissements, génerer des bons de commande, remplir automatiquement le sender ID, agenda(to do list)
- Objectifs commerciaux : définition de quotas par commercial et suivi de la réalisation, visible par Superviseur et Admin ventes
- Envoie et recois de message et des documents entre eux par email sur la plateforme

### 4.2 Clients

- Fiche client 360° : entreprise, contacts, historique complet (opportunités, commandes, contrats, factures)
- Timeline unifiée : vue chronologique des interactions : RDV, propositions, commandes, échanges

### 4.3 Prospects

- Qualification : secteur d'activité, décideur, source d'acquisition
- Conversion : transformation d'un prospect en opportunité puis en client, sans ressaisie

### 4.4 Opportunités

- Suivi de deal : valeur estimée, probabilité de conclusion, produit concerné, commercial assigné
- Avancement : position dans le pipeline commercial (section 4.6)

### 4.5 Produits & Paramètres

- Catalogue produits : SMS Marketing, OTP, API SMS, WhatsApp, Voice, Sender ID
- Grille tarifaire : tarif et marge par produit, pays et secteur d'activité
- Paramètres système : secteurs d'activité, pays, taux de TVA, devises

### 4.6 Pipeline commercial(ia)

- Étapes : Prospect → RDV → Proposition → Bon de commande → Contrat → Vente
- Historique : traçabilité des changements de statut par deal
- Qualité du pipeline : délai moyen de conclusion par produit et par pays
- Avoir un pipeline personnalisé
- Création de pipeline personnalisé par le superadmin
- Drive and drop conditionné

### 4.7 Campagnes(ia)

- Création : définition d'une campagne : produit, cible, contenu, date d'envoi
- Programmation : envoi immédiat ou différé
- Envoi technique : diffusion via la passerelle SMS/WhatsApp intégrée
- Suivi : statuts de livraison en temps réel et détection des anomalies

### 4.8 Devis & Bons de commande(claudeia)

- Devis : génération d'une proposition chiffrée à partir du catalogue produits avec ia
- Transformation : conversion du devis accepté en bon de commande
- Bon de commande : génération PDF, envoi par email, suivi du statut (envoyé, signé), aposer de facon electronique le cachet et signature

### 4.9 Contrats(claudeia)

- Génération : création du contrat à partir du bon de commande signé avec ia
- Envoi : transmission du contrat au client par email directement depuis le CRM
- Signature electronique du client et envoie depuis le le crm par email

### 4.10 Facturation & Encaissements

- Factures : section dédiée aux factures envoyées aux clients (profil Manager)
- Encaissements : enregistrement des règlements reçus et rapprochement avec les factures

### 4.11 Sender ID

- Demande : génération d'un sender ID pour un partenaire
- Suivi : statut de traitement de la demande

### 4.12 Agenda & rendez-vous

- Calendrier : planification des rendez-vous commerciaux et rappels
- Compte rendu : envoi automatique du compte rendu de RDV par email au client

### 4.13 Documents (GED)

- Gestion électronique complète : contrats, devis, bons de commande, pièces jointes client
- Association : rattachement des documents aux fiches client, opportunité ou commande

### 4.14 Notifications

- Canaux : email, SMS, WhatsApp
- Alertes : anomalie de campagne, deal bloqué, dépassement de délai dans le pipeline

### 4.15 Reporting & Rapports

- Reporting : volumes, chiffre d'affaires et marges par produit, pays, secteur, client
- Export : formats PDF, Excel et CSV
- La taille moyenne deals
- Le taux de conversion
- La durée moyenne de cycle de vente
  Le détail des indicateurs par profil est présenté en section 9.

### 4.16 Audit

- Journal des actions : traçabilité des créations, modifications et suppressions sensibles
- Consultation : réservée au Super Admin

### 4.17 Recherche globale & Import/Export

- Recherche globale : recherche unifiée sur clients, prospects, opportunités, commandes et documents
- Import/Export : reprise des données existantes (clients, prospects) et export des données du CRM

## 5. Modules V2 / Backlog

Ces modules apportent une valeur réelle mais impliquent une dépendance externe ou une complexité plus lourde. Ils sont volontairement repoussés après la mise en production de la V1.

- Signature électronique : intégration d'un prestataire tiers ; l'envoi par email et le PDF suffisent en V1
- Gestion des commissions : logique de rémunération variable, à formaliser après un premier cycle de vente réel
- Moteur de workflow : automatisations configurables ; chantier à part une fois les processus V1 stabilisés
- API partenaires : nécessite une gouvernance dédiée (clés, quotas, documentation externe)
- Centre de communication unifié : boîte de réception unique email/SMS/WhatsApp ; chevauche le module Notifications de la V1
- Intelligence commerciale : scoring et prédictif ; nécessite un historique de données suffisant pour être pertinent

## 6. Modèle de données

Le tableau ci-dessous présente les entités principales du système. Ce modèle sera affiné et formalisé en schéma Prisma lors de la phase de conception détaillée.

| Entité              | Description                                                       | Attributs clés                                        |
| ------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- |
| Client              | Entreprise cliente avec historique complet                        | Nom, secteur, coordonnées, historique                 |
| Prospect            | Contact commercial non encore qualifié en opportunité             | Nom, secteur, décideur, source                        |
| Opportunité         | Deal potentiel en cours de qualification commerciale              | Valeur estimée, probabilité, produit, commercial      |
| Produit             | Service commercialisé (SMS, OTP, API, WhatsApp, Voice, Sender ID) | Nom, type, tarif, pays                                |
| Campagne            | Envoi de messages programmé pour un client                        | Produit, cible, statut d'envoi, taux de livraison     |
| Devis               | Proposition commerciale chiffrée                                  | Référence, produit, montant, statut                   |
| Bon de commande     | Engagement d'achat formalisé                                      | Référence, valeur FCFA, statut (envoyé/signé)         |
| Contrat             | Contrat formalisé avec un client                                  | Référence, date de signature, bon de commande associé |
| Facture             | Facture émise au client                                           | Référence, montant, échéance, statut                  |
| Encaissement        | Règlement reçu d'un client                                        | Montant, date, mode, facture associée                 |
| Demande Sender ID   | Demande d'identifiant expéditeur                                  | Partenaire, statut                                    |
| Rendez-vous         | RDV planifié avec un prospect ou client                           | Date, commercial, compte rendu                        |
| Document            | Fichier associé à une fiche métier                                | Type, fichier, entité liée                            |
| Utilisateur interne | Collaborateur utilisant le CRM                                    | Nom, rôle                                             |
| Journal d'audit     | Trace des actions sensibles                                       | Utilisateur, action, entité, date                     |

## 7. Rôles et permissions

Les niveaux d'accès ci-dessous sont indicatifs et seront ajustés avec la direction lors du cadrage détaillé.

| Rôle         | Clients, Prospects & Opport. | Pipeline, Devis, BC & Contrats | Campagnes        | Facturation & Encaiss. | Reporting & Admin |
| ------------ | ---------------------------- | ------------------------------ | ---------------- | ---------------------- | ----------------- |
| Super Admin  | Total                        | Total                          | Total            | Total                  | Total             |
| Admin ventes | Lecture                      | Lecture                        | Lecture          | Aucun                  | Total             |
| Superviseur  | Lecture                      | Lecture                        | Lecture          | Aucun                  | Lecture/Écriture  |
| Commercial   | Lecture/Écriture             | Lecture/Écriture               | Lecture/Écriture | Aucun                  | Lecture (soi)     |
| Manager      | Lecture                      | Lecture                        | Aucun            | Total                  | Lecture           |

## 8. Exigences non fonctionnelles

### 8.1 Performance

- Temps de réponse inférieur à 2 secondes pour les actions courantes
- Traitement asynchrone des campagnes et des extractions de reporting via file d'attente Redis

### 8.2 Sécurité

- HTTPS obligatoire sur l'ensemble des échanges
- Authentification JWT et double authentification (2FA) pour les comptes sensibles
- Journal d'audit des actions critiques

### 8.3 Robustesse et disponibilité

- Disponibilité cible de 99,5 % en heures ouvrées
- Reprise automatique de l'envoi des campagnes en cas d'échec temporaire de la passerelle
- Sauvegardes automatiques quotidiennes avec procédure de restauration testée

### 8.4 Ergonomie

- Interface responsive : poste de travail, tablette et mobile
- Tableaux de bord lisibles en un coup d'œil, filtrables par période

### 8.5 Scalabilité et évolutivité

- Architecture modulaire permettant l'ajout de nouveaux produits ou canaux d'envoi
- Déploiement conteneurisé facilitant la montée en charge horizontale

## 9. Indicateurs clés (KPIs)

- Volumes : volume total de messages, volume par client, volume en FCFA par client
- Marge : marge en FCFA par client et par secteur d'activité
- Commandes : nombre et valeur des devis et bons de commande, taux de signature
- Pipeline : valeur des opportunités, délai moyen de conclusion par produit et par pays, statut de chaque client
- Activité commerciale : nombre de RDV, propositions par canal, ventes par produit et par commercial
- Facturation : factures envoyées, encaissements reçus, délai moyen de règlement
- Campagnes : taux de délivrabilité, nombre d'anomalies détectées, volume envoyé par campagne

## 10. Planning indicatif de réalisation

| Phase                                                    | Durée estimée | Livrables                                                     |
| -------------------------------------------------------- | ------------- | ------------------------------------------------------------- |
| Cadrage & conception détaillée                           | 2 semaines    | Spécifications détaillées, maquettes UI, schéma Prisma validé |
| Utilisateurs, Rôles, Tableaux de bord, Paramètres        | 2 semaines    | Modules fonctionnels en environnement de recette              |
| Clients, Prospects, Opportunités, Produits               | 3 semaines    | Modules fonctionnels en environnement de recette              |
| Pipeline, Devis, Bons de commande, Contrats              | 3 semaines    | Modules fonctionnels en environnement de recette              |
| Campagnes & intégration passerelle SMS/WhatsApp          | 4 semaines    | Envoi et suivi de campagnes opérationnels                     |
| Facturation, Encaissements, Sender ID, Agenda, Documents | 3 semaines    | Modules fonctionnels en environnement de recette              |
| Notifications, Reporting, Audit                          | 3 semaines    | Tableaux de bord et rapports par profil                       |
| Tests, recette & corrections                             | 2 semaines    | Rapport de tests, corrections des anomalies                   |
| Déploiement & formation                                  | 1 semaine     | Application en production, support de formation               |

Ce planning est indicatif et sera ajusté selon la disponibilité des ressources et les retours de validation à chaque étape.

## 11. Livrables attendus

- Code source complet (frontend et backend)
- Documentation API (Swagger / OpenAPI)
- Documentation d'intégration de la passerelle SMS/WhatsApp
- Diagrammes UML (cas d'utilisation, classes, séquence)
- Schéma de base de données (PostgreSQL / Prisma)
- Manuel utilisateur par profil
- Environnement de déploiement conteneurisé (Docker) avec guide de déploiement

## 12. Hypothèses et contraintes

- Le pipeline commercial retenu est : Prospect → RDV → Proposition → Bon de commande → Contrat → Vente — à confirmer
- L'intégration de la passerelle SMS/WhatsApp dépend du choix d'un ou plusieurs prestataires tiers, à valider
- Les modules Signature électronique, Commissions, Workflow, API partenaires, Centre de communication unifié et Intelligence commerciale sont repoussés en V2 (section 5)
- La devise de référence est le Franc CFA (FCFA), avec gestion multi-devises via le module Paramètres
- La reprise de données existantes, si nécessaire, sera cadrée dans une phase dédiée

## 13. Glossaire

| Terme                   | Définition                                                                     |
| ----------------------- | ------------------------------------------------------------------------------ |
| CRM                     | Customer Relationship Management — gestion de la relation client               |
| Pipeline commercial     | Ensemble des étapes suivies par un prospect jusqu'à la vente                   |
| Opportunité             | Deal potentiel qualifié, avec valeur estimée et probabilité de conclusion      |
| Sender ID               | Identifiant expéditeur affiché lors de l'envoi d'un SMS                        |
| Passerelle SMS/WhatsApp | Service tiers assurant l'envoi technique des messages                          |
| Webhook                 | Notification automatique envoyée par un service tiers lors d'un événement      |
| FCFA                    | Franc CFA — devise de référence du système                                     |
| KPI                     | Key Performance Indicator — indicateur clé de performance                      |
| JWT                     | JSON Web Token — standard de jeton pour l'authentification                     |
| 2FA                     | Authentification à deux facteurs                                               |
| GED                     | Gestion Électronique des Documents                                             |
| Swagger / OpenAPI       | Standard de documentation interactive des API REST                             |
| UML                     | Unified Modeling Language — langage de modélisation utilisé pour la conception |
