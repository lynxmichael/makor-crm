# Questions ouvertes — CRM MAKOR

> Chaque question, qui décide, pour quand, où elle en est.
> Mis à jour dès qu'une question naît ou se referme. Dernière mise à jour : **31 juillet 2026**.
>
> **Statuts :** 🔴 bloquante · 🟠 à trancher bientôt · 🟡 peut attendre · ✅ tranchée

---

## À poser à la réunion du 7 août

### 🔴 Pour le Directeur général

**Q1 — Prestataire d'envoi SMS et WhatsApp.**
C'est la décision la plus longue à contractualiser et la seule dépendance externe du projet. Tant qu'elle n'est pas prise, l'envoi réel de campagnes reste simulé.
*Pistes : connexion directe Orange Côte d'Ivoire, agrégateur régional (DEXCHANGE), et un prestataire agréé Meta pour WhatsApp (360dialog).*
**À demander :** validez-vous qu'on lance les consultations ? Sous quel délai attendez-vous un choix ?

**Q2 — Signature électronique : quel niveau de valeur juridique ?**
Un tracé à l'écran avec un code de contrat n'a pas la force probante d'une signature manuscrite. Seul un certificat délivré par un prestataire agréé ARTCI l'a — loi ivoirienne N°2013-546 et article 22 du règlement UEMOA.
**À demander :** engageons-nous un prestataire agréé (Toosign, DKB Solutions), avec le coût par signature que cela représente ? Ou acceptons-nous une signature simple en première version, en assumant la charge de la preuve en cas de litige ?

**Q3 — Hébergement de l'application.**
Serveur MAKOR, hébergeur ivoirien, ou service cloud ? La réponse détermine les coûts récurrents, le délai de mise en ligne et le niveau de sécurité atteignable.
**À demander :** y a-t-il une contrainte de localisation des données ? Un budget mensuel d'infrastructure ?

**Q4 — Qui arbitre entre les deux versions de l'application ?**
Deux versions sont développées en parallèle. Il faut une date de convergence et une personne qui tranche.
**À demander :** qui décide, et pour quand ?

### 🟠 Pour les équipes commerciales

**Q5 — Quels indicateurs manquent à votre tableau de bord ?**
Montrer chaque écran de rôle et écouter. C'est le principal apport de cette réunion.

**Q6 — Quelles étapes de pipeline utilisez-vous réellement ?**
Les six étapes de référence sont-elles les bonnes ? Certains commerciaux ont-ils besoin d'étapes différentes ?

**Q7 — Quels contenus de formation vous manquent aujourd'hui ?**
Et qui accepterait d'être filmé dix minutes sur une affaire gagnée ?

**Q8 — Quelles catégories de frais engagez-vous vraiment ?**
La liste proposée — déplacement, carburant, restauration client, échantillons, communications — est-elle complète ?

### 🟠 Pour Finance

**Q9 — Quel format d'export comptable vous faut-il ?**
Le CRM doit alimenter votre outil comptable. Lequel utilisez-vous, et dans quel format ?

**Q10 — Quel est le circuit de remboursement des frais ?**
Virement, espèces, avec la paie ? À quelle fréquence ?

---

## En attente de décision — hors réunion

### 🔴 Réconciliation des deux versions

Deux versions complètes de l'application coexistent. La question du sort des modèles `Company`, `Offer`, `Subscription`, `Ticket`, `Warehouse` et du module `inventory` n'est pas tranchée : rien de tout cela ne figure au cahier des charges.
**Qui décide :** le porteur du projet, avec le collaborateur.
**Échéance :** avant tout développement backend supplémentaire.

### 🔴 Sécurisation avant mise en ligne

Plusieurs points d'entrée de l'API sont accessibles sans authentification, dont la suppression d'entrées du journal d'audit. Les secrets de double authentification sont stockés en clair.
**Qui décide :** technique — mais c'est un préalable non négociable à toute mise en production.
**Échéance :** avant la première mise en ligne, quelle qu'elle soit.

### 🟠 Intégration des emails

Première cause d'échec des CRM : les commerciaux continuent d'écrire depuis Outlook ou Gmail et l'outil ne voit jamais la moitié des échanges.
**Qui décide :** le porteur du projet.
**Échéance :** à arbitrer pour la version 1 ou 2.

### 🟠 Portail client

Permettre aux clients de consulter leurs campagnes, leur délivrabilité et leurs factures. Différenciateur commercial réel, mais qui change le niveau de risque — une faille exposerait les données d'un client à un autre.
**Qui décide :** le Directeur général.
**Échéance :** à cadrer après la mise en service interne.

### 🟡 Module Recharges

Le solde prépayé client est implémenté dans le code mais absent du cahier des charges.
**Qui décide :** le porteur du projet.
**Échéance :** avant la version 1.

### 🟡 Mise à jour du cahier des charges

Le document v3 ne reflète plus les décisions prises. Une v4 est nécessaire.
**Échéance :** après la réunion du 7 août, pour intégrer les retours.

---

## Tranchées récemment

| Réf. | Question | Décision | Date |
|---|---|---|---|
| ✅ | Rôle Manager | Devient **Finance**, consulte les bons de commande sans les créer | 31/07 |
| ✅ | Qui reprend le Sender ID | Admin ventes crée et suit, Super Admin approuve | 31/07 |
| ✅ | Création de nouveaux rôles | Autorisée au Super Admin | 31/07 |
| ✅ | Validation de la formation | Déclaration puis questionnaire à choix multiples | 31/07 |
| ✅ | Hébergement des vidéos | Prestataire avec restriction de domaine ; PDF sur serveur MAKOR | 31/07 |
| ✅ | Pondération de l'évaluation | 40/25/20/15, réglable par le Super Admin | 31/07 |
| ✅ | Justificatifs de frais | Non obligatoires — contexte ivoirien | 31/07 |
| ✅ | Budget de frais par commercial | Aucun | 31/07 |
| ✅ | Palette visuelle | Marine et orange, validée par la direction | 30/07 |
| ✅ | Socle de composants | shadcn/ui | 29/07 |
