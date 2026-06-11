# ÉduFin — Plateforme de simulation CELI
## Guide de déploiement complet pour l'enseignant

---

## 📋 Vue d'ensemble

**ÉduFin** est une plateforme pédagogique de simulation boursière conçue pour les élèves de
secondaire 5 en éducation financière. Elle combine :

- **5 modules pédagogiques** (capsules + quiz) verrouillés séquentiellement
- **Simulation CELI** avec vrais cours boursiers (différés 15 min)
- **Console enseignant** complète (gestion des élèves, dates, banque de questions, fonds)
- **Base de données Firebase** (gratuit jusqu'à 50 000 lectures/jour)
- **Hébergement Vercel** (gratuit, sans limite de bande passante raisonnable)

---

## 🚀 Déploiement en 4 étapes (~20 minutes)

### ÉTAPE 1 — Préparer ton dépôt GitHub

1. Connecte-toi sur **github.com** (compte `jay-finances`)
2. Clique le **+** en haut à droite → **New repository**
3. Nom du dépôt : `edufin-celi`
4. Coche **Public** (requis pour le déploiement gratuit)
5. Clique **Create repository**
6. Sur la page suivante, clique **uploading an existing file**
7. Glisse-dépose **tous les fichiers et dossiers** du projet :
   ```
   edufin-celi/
   ├── api/
   │   └── quotes.js
   ├── public/
   │   ├── css/
   │   │   └── main.css
   │   ├── js/
   │   │   ├── firebase-init.js
   │   │   ├── login.js
   │   │   ├── utils.js
   │   │   ├── student-dashboard.js
   │   │   ├── module.js
   │   │   ├── modules-page.js
   │   │   ├── market.js
   │   │   ├── portfolio.js
   │   │   └── teacher-dashboard.js
   │   ├── pages/
   │   │   ├── student-dashboard.html
   │   │   ├── modules.html
   │   │   ├── module.html
   │   │   ├── market.html
   │   │   ├── portfolio.html
   │   │   └── teacher-dashboard.html
   │   ├── index.html
   │   └── setup.html
   └── vercel.json
   ```
8. Clique **Commit changes**

---

### ÉTAPE 2 — Déployer sur Vercel

1. Va sur **vercel.com**
2. Clique **Continue with GitHub** → autorise l'accès
3. Clique **Add New Project**
4. Trouve ton dépôt `edufin-celi` → clique **Import**
5. **Ne change rien** aux paramètres par défaut
6. Clique **Deploy**
7. Attends 1-2 minutes → Vercel te donne une URL du type :
   ```
   https://edufin-celi.vercel.app
   ```
   **C'est l'adresse de ta plateforme!** 🎉

> **Astuce :** Tu peux personnaliser l'URL dans les paramètres Vercel → Settings → Domains.
> Par exemple : `finances-esrdl.vercel.app`

---

### ÉTAPE 3 — Configurer Firebase (règles de sécurité)

1. Va sur **console.firebase.google.com**
2. Ouvre ton projet `edufin-esrdl-jlebel`
3. Dans le menu gauche → **Firestore Database** → onglet **Règles**
4. Remplace tout le contenu par ces règles de sécurité :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Seuls les utilisateurs connectés peuvent lire/écrire leur propre profil
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Sous-collections (progress, transactions)
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Les enseignants peuvent lire tous les profils élèves
    match /users/{userId} {
      allow read: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }

    // Config modules : lecture pour tous, écriture pour enseignants
    match /config/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }

    // Banque de questions : lecture pour tous, écriture pour enseignants
    match /questions/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
  }
}
```

5. Clique **Publier**

---

### ÉTAPE 4 — Initialiser la plateforme (une seule fois!)

1. Va sur ton URL Vercel + `/setup.html` :
   ```
   https://edufin-celi.vercel.app/setup.html
   ```
2. Remplis le formulaire avec **tes informations d'enseignant** :
   - Nom : `Jean Lebel` (ou ton nom réel)
   - Courriel : ton courriel professionnel
   - Mot de passe : choisis un mot de passe sécurisé (8+ caractères)
3. Clique **Initialiser la plateforme**
4. Attends que toutes les étapes soient cochées ✓
5. **Important :** Renomme ou supprime `setup.html` après utilisation
   (dans GitHub → fichier → icône crayon → renomme en `setup-done.html`)

---

## 👩‍🏫 Utilisation quotidienne

### Connexion enseignant
1. Va sur ton URL Vercel
2. Clique l'onglet **Enseignant**
3. Entre ton courriel et mot de passe
4. Tu accèdes à la **Console enseignant**

### Ajouter un élève
1. Console enseignant → **Élèves**
2. Clique **+ Ajouter un élève**
3. Remplis : nom complet, courriel scolaire, mot de passe initial
4. L'élève peut maintenant se connecter via l'onglet **Je suis élève**

> **Conseil :** Utilise un format standard pour les mots de passe initiaux,
> par exemple `Edufin2025!` que les élèves changeront à leur première connexion.

### Configurer les dates de déverrouillage
1. Console enseignant → **Modules & dates**
2. Pour chaque module, clique le champ de date
3. Sélectionne la date à partir de laquelle le module devient accessible
4. Modifie aussi la récompense si désiré
5. Clique **Enregistrer les dates**

**Exemple de calendrier suggéré (basé sur tes cycles de 9 jours) :**
| Module | Date suggérée | Récompense |
|--------|--------------|-----------|
| Ch. 1 — Consommation | Semaine 2 du cours | 250 $ |
| Ch. 2 — Rôle de l'État | Semaine 4 | 250 $ |
| Ch. 3 — Le crédit | Semaine 6 | 300 $ |
| Ch. 4 — Le budget | Semaine 8 | 300 $ |
| Ch. 5 — L'épargne | Semaine 10-11 | 500 $ |

### Ajouter des fonds manuellement
Deux façons :
1. **Tableau des élèves** → bouton 💰 sur la ligne de l'élève
2. **Menu gauche** → bouton "Ajouter des fonds"

Exemples d'utilisation :
- Participation en classe (+25 $)
- Travail remis (+100 $)
- Lecture d'actualité financière partagée (+50 $)
- Prix pour le meilleur portefeuille du mois (+200 $)

### Gérer la banque de questions
1. Console enseignant → **Banque de questions**
2. Les 50 questions par défaut (10 par chapitre) sont déjà chargées
3. Pour en ajouter : **+ Nouvelle question**
4. Pour modifier : bouton ✏️
5. Pour supprimer : bouton 🗑️

**Intégrer l'actualité financière :**
- Lis un article de La Presse (Nicolas Bérubé, etc.)
- Crée une question basée sur l'actualité
- Ajoute la source dans le champ "Source"
- Les nouvelles questions s'intègrent automatiquement aux prochains quiz

---

## 📊 Suivre la progression des élèves

Dans la console → **Élèves**, tu vois pour chaque élève :
- ✅ Modules complétés (points colorés)
- 📅 Date de dernière connexion
- 💰 Solde CELI actuel
- 📈 Score moyen aux quiz

Dans → **Transactions CELI** : l'historique complet de tous les fonds crédités.

---

## 🔄 Mettre à jour la plateforme

Pour modifier du contenu ou corriger un problème :
1. Modifie le fichier sur **github.com** (bouton crayon ✏️)
2. Clique **Commit changes**
3. Vercel redéploie automatiquement en ~1 minute

---

## 🛠️ Résolution de problèmes courants

**L'élève ne voit pas ses modules :**
→ Vérifie que les dates de déverrouillage sont dans le passé (Console → Modules & dates)

**Les cours boursiers ne s'affichent pas :**
→ L'API Yahoo Finance est parfois instable. La plateforme utilise automatiquement des prix simulés en repli. Les transactions fonctionnent quand même.

**Un élève a oublié son mot de passe :**
→ Console Firebase → Authentication → trouve l'email → menu ⋮ → Réinitialiser le mot de passe

**Ajouter un deuxième enseignant :**
→ Aller dans setup.html avant de le supprimer, ou contacter Claude pour un script de création.

---

## 📱 Accès mobile

La plateforme est responsive. Les élèves peuvent y accéder depuis leur téléphone ou tablette. L'URL est la même.

---

## 🔒 Sécurité

- Les mots de passe sont chiffrés par Firebase (standard industriel)
- Les données sont stockées sur des serveurs Google (Firebase)
- Les cours boursiers sont des données publiques différées
- Aucune transaction financière réelle n'a lieu

---

## 📞 Support

Pour toute question technique ou modification de la plateforme,
consulte Claude (claude.ai) avec ce message :

> "J'utilise la plateforme ÉduFin (edufin-celi sur GitHub, jay-finances).
> J'ai besoin d'aide pour [décrire le problème]."

---

*ÉduFin — Plateforme développée avec Claude (Anthropic) pour l'enseignement
des finances personnelles au secondaire. Québec, 2025.*
