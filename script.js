/* =================================================================
   ZONE DE CONFIGURATION (AJOUTEZ VOS PROJETS ICI)
   =================================================================
   Astuce : Copiez-collez un bloc {} et changez juste le nom de l'image.
*/

const PROJETS = [
    {
        fichier: "projet1.jpg",      // Doit être exact (attention aux majuscules)
        titre: "Casque Cyberpunk",
        description: "PLA Silk Argent • Finition Brossée"
    },
    {
        fichier: "projet2.jpg",
        titre: "Épée Légendaire",
        description: "Assemblage 1m20 • Peinture Acrylique"
    },
    {
        fichier: "projet3.jpg",
        titre: "Totem Ancien",
        description: "Résine Wash & Cure • Effet Pierre"
    },
    // Exemple d'ajout :
    /*
    {
        fichier: "mon_image.png",
        titre: "Mon Nouveau Projet",
        description: "Matériau utilisé"
    },
    */
];

/* =================================================================
   MOTEUR DU SITE (NE PAS TOUCHER EN DESSOUS SI NON NÉCESSAIRE)
   ================================================================= */

const galleryContainer = document.getElementById('galleryContainer');
const dossierImages = './projets/';

// 1. Génération Automatique de la Galerie
function chargerGalerie() {
    if(!galleryContainer) return;
    galleryContainer.innerHTML = ''; // Nettoyage

    PROJETS.forEach((projet, index) => {
        // Création de l'élément HTML
        const card = document.createElement('div');
        card.classList.add('card');
        
        // Délai d'apparition en cascade (0.1s, 0.2s, 0.3s...)
        card.style.transitionDelay = `${index * 0.1}s`;

        card.innerHTML = `
            <div class="card-image">
                <img src="${dossierImages}${projet.fichier}" 
                     alt="${projet.titre}"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300/111/00d2ff?text=Image+Introuvable';">
            </div>
            <div class="card-info">
                <h3>${projet.titre}</h3>
                <p>${projet.description}</p>
            </div>
        `;
        galleryContainer.appendChild(card);
    });

    // Lancer la détection de scroll une fois les cartes créées
    observerScroll();
}

// 2. Animation au Scroll (Apparition des éléments)
function observerScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // On arrête d'observer une fois apparu pour économiser des ressources
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    // On observe les cartes et le panneau "À propos"
    document.querySelectorAll('.card, .scroll-reveal').forEach(el => {
        observer.observe(el);
    });
}

// 3. Particules Magiques (Background Canvas)
const canvas = document.getElementById('etherCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

class Particle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Si sort de l'écran, on le remet de l'autre côté
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.reset();
        }
    }
    draw() {
        ctx.fillStyle = `rgba(0, 210, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    const count = window.innerWidth < 768 ? 40 : 80; // Moins de particules sur mobile
    for(let i=0; i<count; i++) particles.push(new Particle());
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dessiner les particules
    particles.forEach(p => {
        p.update();
        p.draw();
    });

    // Dessiner les liens (Constellation)
    particles.forEach((a, index) => {
        for(let b = index; b < particles.length; b++) {
            let dx = a.x - particles[b].x;
            let dy = a.y - particles[b].y;
            let distance = dx*dx + dy*dy;
            
            // Si proches, on trace un trait
            if(distance < 15000) {
                ctx.strokeStyle = `rgba(0, 210, 255, ${0.1 - distance/150000})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(particles[b].x, particles[b].y);
                ctx.stroke();
            }
        }
    });

    requestAnimationFrame(animateParticles);
}

// Initialisation globale
window.addEventListener('resize', () => { initCanvas(); initParticles(); });
window.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initParticles();
    animateParticles();
    chargerGalerie(); // Charge les projets Yukaze3D
});
