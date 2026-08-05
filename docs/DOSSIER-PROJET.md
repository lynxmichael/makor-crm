# Dossier de projet — CRM MAKOR Group Telecom

> **Document de référence.** Il sert de mémo de présentation, de support de réponse aux questions, et de source unique pour la présentation PowerPoint.
> Mis à jour à chaque fin de séance. Dernière mise à jour : **31 juillet 2026**.

---

## 1. Le projet en une phrase

Un CRM interne qui suit chaque affaire de la prospection à l'encaissement, tout en pilotant l'envoi technique des campagnes — pour que MAKOR sache à tout moment ce qui a été vendu, à qui, pour quelle marge, et si les messages sont bien arrivés.

---

## 2. Pourquoi ce projet

Aujourd'hui l'information est éclatée. Le pipeline commercial vit dans des tableurs, les campagnes dans les outils techniques, la facturation ailleurs encore. Personne ne peut répondre en une minute à trois questions pourtant simples :

- **Combien avons-nous vendu ce mois-ci, par produit et par pays ?**
- **Où en est l'affaire Wave Mobile Money, et qui doit faire quoi ensuite ?**
- **Pourquoi le client Ecobank n'a-t-il pas payé sa facture de juin ?**

Ce que le CRM apporte, et qu'aucun outil du marché ne fera : **il relie la vente à l'exécution technique**. Quand la délivrabilité chute chez un opérateur, le commercial concerné le voit avant que son client ne l'appelle.

---

## 3. Les cinq rôles

| Rôle | Qui | Ce qu'il fait dans l'application |
|---|---|---|
| **Super Admin** | Le Directeur général | Vue consolidée de toute l'activité · Paramétrage complet · Rôles et permissions · Validation des contenus de formation · Approbation des Sender ID · Journal d'audit |
| **Admin ventes** | Administration des ventes | Volumes et marges par client, secteur et pays · Qualité du pipeline · Création et suivi des Sender ID · Commentaires sur les pipelines des commerciaux |
| **Superviseur commercial** | Encadrement de l'équipe | Activité de chaque commercial · Validation des notes de frais · Évaluations · Commentaires |
| **Commercial** | Plusieurs comptes | Son portefeuille, son pipeline, son agenda, ses devis et bons de commande · Sa formation · Sa propre évaluation |
| **Finance** | Comptabilité | Factures, encaissements, recouvrement · Remboursement des frais validés · Consultation des bons de commande |

**Principe fondateur :** chaque écran, chaque menu, chaque bouton dépend du rôle. Un commercial ne voit jamais les chiffres d'un autre commercial.

---

## 4. Le fil rouge — une affaire de bout en bout

C'est le meilleur angle pour expliquer l'application. Prenons Wave Mobile Money.

| Étape | Qui | Ce qui se passe |
|---|---|---|
| **Prospect qualifié** | Commercial | Secteur, décideur, source d'acquisition |
| **Rendez-vous** | Commercial | Planifié dans l'agenda, compte rendu envoyé au client après |
| **Opportunité** | Commercial | Valeur estimée, produit, probabilité — entre dans le pipeline |
| **Devis** | Commercial | Généré depuis le catalogue, texte commercial rédigé avec l'aide de l'IA puis relu |
| **Bon de commande** | Commercial | Le devis accepté devient bon de commande, envoyé et signé |
| **Contrat** | Commercial | Généré depuis le bon de commande signé, signé électroniquement |
| **Facture** | Finance | Émise, envoyée, suivie |
| **Encaissement** | Finance | Règlement rapproché de la facture |

À chaque étape, l'information se reporte automatiquement. **Aucune ressaisie.**

---

## 5. Les modules

### Commercial
**Clients** — fiche 360°, historique complet, timeline des interactions.
**Prospects** — qualification, conversion en opportunité sans ressaisie.
**Pipeline** — six étapes, glisser-déposer, avec refus visible si un prérequis manque.
**Devis, bons de commande, contrats** — la chaîne complète, avec génération PDF et envoi.
**Agenda** — rendez-vous, relances, comptes rendus automatiques.

### Technique
**Campagnes** — création, programmation, envoi via la passerelle, suivi de délivrabilité par opérateur, **détection automatique des anomalies**.
**Sender ID** — demande pré-remplie depuis la fiche client, suivi jusqu'à validation par l'opérateur.

### Finance
**Facturation et encaissements** — émission, relance, rapprochement, recouvrement.
**Notes de frais** — saisie par le commercial, validation par le superviseur, remboursement par Finance.

### Pilotage
**Tableaux de bord** — cinq vues distinctes, une par rôle, avec filtres par période, produit, pays et secteur.
**Reporting** — volumes, chiffre d'affaires, marges. Exports PDF, Excel et CSV.
**Équipe** — la liste des commerciaux, la fiche de chacun, les commentaires.
**Audit** — journal inaltérable des actions sensibles, réservé au Super Admin.

### Nouveaux modules décidés le 31 juillet
**Ressources** — documents et vidéos de formation. Visible de tous, contenu filtré selon le rôle. Seul le Super Admin publie ; les autres proposent, il valide.
**Paramétrage** — le poste de pilotage du Super Admin : rôles et permissions, produits, services, pays, activation des fonctionnalités.
**Évaluation des commerciaux** — une note sur quatre axes, visible du commercial concerné, de son superviseur et de l'Admin ventes.

---

## 6. Les trois nouveautés, expliquées

### Les ressources de formation

**Ce que c'est :** une bibliothèque de contenus — techniques de vente, closing, connaissance produit, réglementation, procédures internes. En PDF et en vidéo.

**Comment ça marche :** le Super Admin publie. Tout autre utilisateur peut proposer un contenu ; il part en attente, le Super Admin valide ou rejette avec un motif.

**Ce qui est obligatoire :** le Super Admin désigne les contenus incontournables — fonctionnement de l'entreprise, services, produits, pays desservis.

**Comment on sait que c'est acquis :** l'utilisateur déclare avoir terminé, **puis** répond à un questionnaire à choix multiples. Les réponses restent consultables. Le questionnaire comporte assez de questions pour vérifier une compréhension réelle, jusqu'au niveau expert.

**L'esprit :** court, concret, agréable. Des cas MAKOR filmés plutôt que de la théorie achetée. Un questionnaire rejouable sans pénalité — on vérifie la compréhension, on ne fait pas passer un examen.

### L'évaluation des commerciaux

Une note sur 100, calculée sur quatre axes :

| Axe | Poids | Ce qu'on mesure |
|---|---|---|
| Résultat | 40 % | Chiffre d'affaires réalisé sur objectif |
| Activité | 25 % | Rendez-vous, propositions, comptes rendus |
| Qualité du pipeline | 20 % | Taux de conversion, délai de conclusion, opportunités bloquées |
| Formation | 15 % | Part du contenu obligatoire achevé |

**Les poids sont réglables par le Super Admin.** Ils disent ce que l'entreprise valorise.

**Le commercial voit sa note et son détail. Jamais celle des autres.** Le superviseur et l'Admin ventes voient l'ensemble.

### Les notes de frais

Le commercial saisit ses frais engagés — déplacement, carburant, restauration client, échantillons, communications — en les rattachant à un client ou une opportunité.

**Circuit :** brouillon → soumis → validé par le superviseur → remboursé par Finance.

**Pas de justificatif photo obligatoire** : dans le contexte ivoirien, un reçu de taxi n'existe pas. **Pas de budget mensuel** par commercial.

**L'indicateur qui compte :** la contribution nette — le chiffre d'affaires généré moins les frais engagés. Visible du superviseur, de l'Admin ventes et du Super Admin.

---

## 7. Où en est réellement le projet

**À dire honnêtement, sans le dramatiser ni l'enjoliver.**

**Ce qui existe :** un backend substantiel — 35 modèles de données, 200 points d'entrée, authentification à deux facteurs, files d'attente, temps réel, documentation d'API. Et une maquette complète des dix-huit écrans, validée par la direction le 30 juillet.

**Ce qui n'existe pas :** l'interface n'est pas encore reliée au backend. Les deux moitiés fonctionnent séparément et ne se parlent pas encore.

**Ce qui est en cours :** la sécurisation — plusieurs points d'entrée doivent être fermés avant toute mise en ligne. C'est le chantier prioritaire.

**Formulation recommandée en réunion :** *« La maquette que vous voyez est validée. Le moteur existe. Ce qu'il reste à faire, c'est brancher l'un sur l'autre et sécuriser l'ensemble avant de vous le confier. »*

---

## 8. Ce qui est décidé

| Réf. | Décision |
|---|---|
| **D3** | Messagerie interne repoussée après la première version |
| **D4** | Plusieurs pipelines, affectés par commercial, avec correspondance vers les six étapes de référence |
| **D5** | Glisser-déposer conditionné : le refus est visible, avec sa raison |
| **D6** | Rédaction assistée par IA des devis et contrats. Texte éditable, marqué brouillon, jamais envoyé sans validation humaine |
| **D9** | Sender ID : l'Admin ventes crée et suit, le Super Admin approuve. Jamais d'approbation automatique |
| **D10** | shadcn/ui comme socle de composants |
| **D13** | Répartition du travail avec le collaborateur |
| **D14** | Palette marine et orange validée par la direction |
| **D15** | La maquette HTML fait référence écran par écran |
| **D16** | Le rôle Manager devient **Finance**. Il consulte les bons de commande sans les créer |
| **D17** | Le Super Admin peut créer de nouveaux rôles |
| **D18** | Formation validée par déclaration **puis** questionnaire à choix multiples |
| **D19** | Vidéos hébergées chez un prestataire avec restriction de domaine ; PDF sur le serveur MAKOR |
| **D20** | Pondération 40/25/20/15, réglable par le Super Admin |
| **D21** | Notes de frais sans justificatif obligatoire ni budget mensuel |
| **D22** | Signature électronique via un prestataire agréé ARTCI — révise D7 |

---

## 9. Les questions qu'on vous posera, et quoi répondre

### « Est-ce que ça va me faire perdre du temps ? »

Non — l'inverse. Le devis se génère depuis le catalogue au lieu d'être retapé. Le bon de commande naît du devis accepté. Le contrat naît du bon de commande. Ce que vous saisissez une fois ne se ressaisit jamais.

### « Mon chef va-t-il voir tout ce que je fais ? »

Il voit votre activité commerciale — rendez-vous, propositions, ventes — comme aujourd'hui, mais à jour. Il ne voit pas vos échanges privés. Et vous voyez exactement la même chose que lui vous concernant : votre évaluation vous est visible, avec son détail.

### « Qu'est-ce qui se passe si je n'ai pas de réseau ? »

C'est une vraie limite aujourd'hui, et nous la traitons. La consultation hors ligne est prévue ; la saisie nécessitera une connexion dans un premier temps.

### « Pourquoi une note ? On va être classés ? »

Il n'y a pas de classement public. Vous voyez votre note, pas celle des autres. Elle sert à voir votre progression dans le temps et à identifier où vous accompagner — pas à comparer des secteurs qui ne sont pas comparables.

### « La formation, c'est encore du travail en plus ? »

Des formats courts, entre deux rendez-vous. Un questionnaire qu'on peut refaire autant de fois qu'on veut, sans pénalité. Et du contenu MAKOR — vos collègues qui expliquent des cas réels, pas un cours acheté sur étagère.

### « Quand est-ce que ça sort ? »

Réponse honnête : le calendrier dépend de trois décisions qui ne sont pas encore prises — le prestataire d'envoi SMS, le prestataire de signature électronique, et l'hébergement. Nous les posons aujourd'hui pour pouvoir vous donner une date la prochaine fois.

### « Et si l'outil tombe en panne ? »

Sauvegardes quotidiennes avec restauration testée, et objectif de disponibilité de 99,5 % en heures ouvrées. Ce sont des exigences inscrites au cahier des charges, pas des intentions.

### « Nos données clients sont-elles en sécurité ? »

C'est notre chantier prioritaire avant toute mise en ligne. Nous avons identifié les points à corriger et nous les traitons en premier — avant d'ajouter la moindre fonctionnalité. Rien ne sera mis en production sans que ce soit réglé.

---

## 10. Ce qu'on attend des participants

À dire en fin de réunion :

1. **Regardez votre écran et dites-nous ce qui manque.** Un indicateur absent, une action qui n'y est pas, un mot mal choisi.
2. **Signalez ce qui ne correspond pas à votre façon de travailler.** Il est infiniment moins coûteux de le corriger maintenant que dans six mois.
3. **Volontaires pour la formation.** Nous cherchons des commerciaux prêts à être filmés dix minutes sur un cas qu'ils ont gagné.

---

## 11. Références

| Document | Contenu |
|---|---|
| `CDC-CRM-MAKOR-v3.md` | Cahier des charges — à faire évoluer en v4 |
| `design/makor-crm-maquette.html` | Maquette complète, 18 modules |
| `docs/QUESTIONS-OUVERTES.md` | Décisions en attente, qui décide, pour quand |
| `CLAUDE.md` | Contexte technique et décisions actées |
| `SUIVI.md` | Journal de bord des séances |
