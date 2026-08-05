# Maquette — passe 5, à appliquer

> Spécification arrêtée le 31 juillet 2026. À exécuter d'un seul tenant à la reprise.
> **Fichier de départ : la version validée par le DG** — 212 Ko, 2 543 lignes, passes 0 à 4.
> **Aucune retouche de couleur, typographie, espacement ou mise en page.**

---

## Constat de départ

Le fichier validé contient les passes 0 à 4 : design marine et orange, écran de connexion avec 2FA, graphiques SVG, cinq tableaux de bord par rôle, six modules refaits, notifications, parcours d'affaire, visite guidée. **La couche de design ne doit pas être touchée.**

La passe 5 précédemment injectée dans le dépôt est à refaire proprement : elle ajoutait les trois modules **en fin de menu**, après le groupe « Démonstration », sans rubrique. C'est la régression visuelle à corriger.

---

## 1. Barre latérale — placement exact

Structure actuelle du menu, à préserver :

```
▸ Pilotage            dashboard
▸ Ventes              pipeline · leads · customers
▸ Commercial          campaigns · deals-chain · agenda · senderid · documents · invoices · messaging
▸ Pilotage & contrôle reports · audit
▸ Système             products · settings
```

Insertions :

| Module | Rubrique | Position précise |
|---|---|---|
| **Notes de frais** | Commercial | juste après `agenda` |
| **Équipe** | Pilotage & contrôle | juste avant `reports` |
| **Ressources** | **nouvelle rubrique « Formation »** | insérée **entre** « Pilotage & contrôle » et « Système » |

Les modules `notifications` et `journey` restent où ils sont aujourd'hui.

---

## 2. Rôle Manager → Finance

Remplacer partout : sélecteur de rôle, boutons de l'écran de connexion, `data-roles`, matrice de permissions, tableau de bord, salutations, journal d'audit, tableau des rôles dans Paramètres.

Ajustements de périmètre décidés :

- **Sender ID** : retirer Finance. Devient `superadmin,adminventes` — l'Admin ventes crée et suit, le Super Admin approuve.
- **Audit** : Super Admin uniquement.
- **Bons de commande** : Finance consulte, ne crée pas.

---

## 3. Noms des utilisateurs

| Rôle | Nom | Initiales |
|---|---|---|
| Super Admin | Michael Koffi | MK |
| Admin ventes | Eulalie | EU |
| Superviseur commercial | Stéphane | ST |
| Commercial | Sery | SE |
| Finance | Diby Cader | DC |

Dans les jeux de données, remplacer **Fatou Kane par Sery** et **Ibrahima Diallo par Stéphane**, pour que le commercial connecté voie bien son propre portefeuille. Conserver Moussa Koné et Aïcha Traoré comme autres commerciaux.

---

## 4. Trois modules à ajouter

**Ressources** — bibliothèque de formation. Neuf contenus, catégories, obligatoires signalés, progression par ressource. Ouverture d'une fiche, puis questionnaire à choix multiples de cinq questions, rejouable sans pénalité, réponses consultables. Le Super Admin voit en plus la file des propositions en attente de validation.

**Équipe** — les quatre commerciaux en cartes. Fiche détaillée : chiffre d'affaires, frais, contribution nette, note sur 100 en anneau, détail des quatre axes pondérés, commentaires avec bouton Répondre. Visible du Super Admin, du Superviseur et de l'Admin ventes.

**Notes de frais** — liste avec statuts et circuit brouillon → soumis → validé → remboursé. **Les actions changent selon le rôle** : le Superviseur valide ou refuse, Finance rembourse, le Commercial voit « en attente ». Pas de justificatif obligatoire, pas de budget mensuel.

---

## 5. Évaluation dans le tableau de bord du commercial

Ajouter en bas du tableau de bord Commercial : la note sur 100, le détail des quatre axes avec leur pondération, les commentaires reçus, et la progression de formation avec un lien vers le module Ressources.

Pondération : Résultat 40 % · Activité 25 % · Qualité du pipeline 20 % · Formation 15 %. Mention que le Super Admin peut la régler dans le Paramétrage.

---

## 6. Anomalies à corriger — sans impact visuel

| Anomalie | Correction |
|---|---|
| Visite guidée bloquée sur l'écran de connexion | La barre `#tour` est sous `#login`. Passer son `z-index` au-dessus de 9999. |
| Cloche de notification non cliquable | Rendre `.bell` cliquable, ouvre le module Notifications. |
| Avatar non cliquable | Menu au clic, avec une entrée « Changer la photo ». |
| Pagination des prospects inerte | Les boutons 2, 3, 4 doivent changer les lignes affichées. |
| Fenêtre de signature trop grande | Limiter à `max-height:86vh` avec défilement interne. |
| Cachet électronique absent | L'ajouter à côté de la signature dans la fenêtre. |
| Boutons inertes du pipeline et de l'agenda | Réorganiser les étapes, Nouveau deal, Ajouter une étape, Nouveau rendez-vous, filtres. |

**Ne pas traiter** : les filtres du tableau de bord, qui seront refaits avec les nouvelles périodes (jour, semaine, mois, trimestre, semestre, période libre, année) — c'est un chantier distinct.

---

## 7. Vérification avant livraison

- Contrôle de syntaxe de chaque bloc `<script>`
- Zéro occurrence de « manager »
- La couche `makor-modern` est identique à l'original
- Test des cinq rôles : le menu, le tableau de bord et les actions des Notes de frais changent bien
