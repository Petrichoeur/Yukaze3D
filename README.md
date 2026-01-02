# ⚔️ Yukaze3D - La Forge Numérique

> **Site Vitrine Immersif pour Impression & Peinture 3D**

Bienvenue dans la documentation de **Yukaze3D**. Ce projet est un site web portfolio moderne, réactif et dynamique, conçu avec une esthétique "High Fantasy / Magitech" (inspirée de l'univers Final Fantasy). Il permet de présenter des projets d'impression 3D et de peinture de figurines avec des effets visuels soignés.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## ✨ Fonctionnalités

* **Design Immersif :** Interface inspirée des RPG (Menus en verre "Glassmorphism", particules magiques, typographie Cinzel).
* **Architecture "Data-Driven" :** Tout le contenu (textes, liens, projets) est géré via des fichiers JSON externes. Aucune modification de code HTML requise pour les mises à jour courantes.
* **Galerie Dynamique :** Chargement automatique des projets depuis une liste.
* **Système de Modal (Lightbox) :** Affichage des images en grand avec animation d'apparition "Invocation" et fermeture instantanée optimisée.
* **Responsive :** Adapté aux mobiles, tablettes et ordinateurs.
* **Performance :** Vanilla JS (aucun framework lourd), animations CSS optimisées.

---

## 📂 Structure du Projet

Voici l'organisation requise des fichiers pour que le site fonctionne correctement :

```text
/Yukaze3D
│
├── index.html       # Structure principale (ne pas toucher sauf pour dev avancé)
├── style.css        # Styles visuels et animations
├── script.js        # Logique, chargement JSON et effets
├── admin.json       # ⚙️ Configuration globale du site (Titres, Réseaux, Textes)
├── projets.json     # 🖼️ Liste des projets à afficher dans la galerie
├── README.md        # Documentation
│
└── /projets/        # Dossier contenant vos images
    ├── projet1.jpg
    ├── casque_v2.png
    └── ...

🚀 Installation & Lancement (Local)
⚠️ Important : Comme ce site utilise des fichiers externes (.json) via la commande fetch, il ne fonctionnera pas si vous ouvrez simplement index.html en double-cliquant dessus (sécurité des navigateurs).
Méthode recommandée (VS Code)
 * Installez l'extension "Live Server" dans Visual Studio Code.
 * Faites un clic droit sur index.html.
 * Choisissez "Open with Live Server".
Méthode alternative (Python)
Si vous avez Python installé, ouvrez un terminal dans le dossier du projet et tapez :
python -m http.server

Puis ouvrez http://localhost:8000 dans votre navigateur.
⚙️ Configuration (Comment modifier le site ?)
Grâce à l'architecture du site, vous n'avez pas besoin de toucher au code pour modifier le contenu.
1. Modifier les textes et liens (admin.json)
Ouvrez admin.json pour changer le nom du site, les liens sociaux (Etsy, Instagram), ou les textes de présentation.
{
    "meta": { "title": "Mon Nouveau Nom | Forge" },
    "branding": { "logoText": "MON", "logoSuffix": "SITE" },
    "socials": {
        "etsyUrl": "[https://www.etsy.com/fr/shop/VOTRE_BOUTIQUE](https://www.etsy.com/fr/shop/VOTRE_BOUTIQUE)",
        "instagramUrl": "[https://instagram.com/votre_compte](https://instagram.com/votre_compte)"
    }
    // ...
}

2. Ajouter ou supprimer des projets (projets.json)
Pour ajouter une image à la galerie :
 * Placez votre image dans le dossier /projets.
 * Ouvrez projets.json.
 * Ajoutez un bloc en respectant la syntaxe (attention aux virgules !) :
<!-- end list -->
[
    {
        "fichier": "mon_image.jpg",
        "titre": "Nom du Projet",
        "description": "Description courte (Matériaux, taille...)"
    },
    {
        "fichier": "autre_projet.png",
        "titre": "Projet Suivant",
        "description": "..."
    } 
]

🌐 Hébergement Gratuit (Mise en ligne)
Puisque ce site est statique (HTML/CSS/JS), vous n'avez pas besoin de payer un serveur coûteux. Voici deux méthodes gratuites et professionnelles pour mettre votre boutique en ligne.
Méthode 1 : Netlify (Le plus simple - "Glisser-Déposer")
Idéal si vous ne voulez pas utiliser de lignes de commande.
 * Créez un compte gratuit sur Netlify.
 * Une fois connecté, allez dans l'onglet "Sites".
 * Prenez votre dossier Yukaze3D (celui qui contient index.html) sur votre ordinateur.
 * Glissez-déposez simplement le dossier entier dans la zone pointillée sur la page Netlify.
 * Attendez quelques secondes... C'est en ligne ! 🚀
 * Netlify vous donnera une URL (ex: yukaze-site.netlify.app) que vous pourrez personnaliser.
Méthode 2 : GitHub Pages (Le standard développeur)
Idéal si vous voulez gérer les versions de votre code.
 * Créez un compte sur GitHub et créez un Nouveau Repository (Public).
 * Téléversez tous vos fichiers (HTML, CSS, JS, JSON et le dossier projets).
 * Allez dans l'onglet Settings du repository > Menu Pages.
 * Sous "Build and deployment", sélectionnez la branche main et cliquez sur Save.
 * Attendez 1 à 2 minutes : GitHub vous donnera le lien de votre site.
📜 Crédits
 * Développement : Généré par IA (Gemini) pour Yukaze3D.
 * Police : Cinzel & Lato via Google Fonts.
 * Icônes : Font Awesome.
Que la forge soit avec vous ! 🔨

