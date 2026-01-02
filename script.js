// --- DOM ELEMENTS ---
const galleryContainer = document.getElementById('galleryContainer');
const welcomeScreen = document.getElementById('welcome-screen');
const startBtn = document.getElementById('start-experience');
const audioPlayer = document.getElementById('bg-music');
const musicBtn = document.getElementById('music-control');
const musicIcon = musicBtn ? musicBtn.querySelector('i') : null;

// Modal Elements
const modal = document.getElementById('ff-modal');
const modalImg = document.getElementById('modal-img-full');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const closeModalBtn = document.querySelector('.close-modal');
const dossierImages = './projets/';

// --- INITIALISATION AU CHARGEMENT ---
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Charger la config
    await loadAdminConfig(); 
    
    // 2. Charger les projets
    await loadProjects();    

    // 3. Activer le bouton "Entrer" (Correction du bug de clic)
    activateStartButton();
});

// --- FONCTION D'ACTIVATION DU BOUTON START ---
function activateStartButton() {
    if(startBtn && welcomeScreen) {
        startBtn.addEventListener('click', () => {
            console.log("Bouton cliqué !"); // Pour vérifier dans la console

            // A. Essayer de lancer la musique
            if(audioPlayer) {
                const playPromise = audioPlayer.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        // Lecture réussie
                        if(musicBtn) musicBtn.classList.add('playing');
                    }).catch(error => {
                        console.warn("La musique n'a pas pu démarrer (bloqué par navigateur ou mauvais lien), mais on ouvre le site quand même.", error);
                    });
                }
            }

            // B. Cacher l'écran d'accueil (Quoi qu'il arrive)
            welcomeScreen.style.opacity = '0';
            welcomeScreen.style.visibility = 'hidden';
            welcomeScreen.style.pointerEvents = 'none'; // Empêche de recliquer dessus

            // C. Lancer les particules
            initParticles();
        });
    } else {
        console.error("Erreur critique : Le bouton start ou l'écran d'accueil est introuvable.");
    }
}

// --- CHARGEMENT CONFIG ADMIN ---
async function loadAdminConfig() {
    try {
        const response = await fetch('./admin.json');
        const config = await response.json();

        // Titres & Textes
        document.title = config.meta.title;
        if(document.getElementById('nav-logo')) document.getElementById('nav-logo').innerHTML = `${config.branding.logoText}<span>${config.branding.logoSuffix}</span>`;
        if(document.querySelector('.logo-welcome')) document.querySelector('.logo-welcome').innerHTML = `${config.branding.logoText}<span>${config.branding.logoSuffix}</span>`;
        
        document.getElementById('hero-title').textContent = config.hero.title;
        document.getElementById('hero-subtitle').textContent = config.hero.subtitle;
        document.getElementById('hero-cta').textContent = config.hero.ctaText;
        document.getElementById('about-title').textContent = config.about.title;
        document.getElementById('about-desc').textContent = config.about.description;

        // Stats
        const statsList = document.getElementById('about-stats');
        if(statsList) {
            statsList.innerHTML = ''; // Vide avant de remplir
            config.about.stats.forEach(stat => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${stat.value}</strong> ${stat.label}`;
                statsList.appendChild(li);
            });
        }

        // Liens Footer
        document.getElementById('link-etsy').href = config.socials.etsyUrl;
        document.getElementById('link-insta').href = config.socials.instagramUrl;
        document.getElementById('link-tiktok').href = config.socials.tiktokUrl;
        document.getElementById('link-discord').href = config.socials.discordUrl;
        document.getElementById('footer-text').textContent = config.footer.text;

        // Audio Setup
        if(config.audio && audioPlayer) {
            audioPlayer.src = config.audio.source;
            audioPlayer.volume = config.audio.volume;
            if(startBtn) startBtn.innerText = config.audio.btnText;
        }

    } catch (e) {
        console.error("Erreur chargement admin.json. Vérifiez la syntaxe du fichier.", e);
    }
}

// --- GESTION MUSIQUE FLOTTANTE ---
if(musicBtn) {
    musicBtn.addEventListener('click', () => {
        if(audioPlayer.paused) {
            audioPlayer.play();
            musicBtn.classList.add('playing');
            if(musicIcon) { musicIcon.classList.remove('fa-volume-mute'); musicIcon.classList.add('fa-volume-up'); }
        } else {
            audioPlayer.pause();
            musicBtn.classList.remove('playing');
            if(musicIcon) { musicIcon.classList.remove('fa-volume-up'); musicIcon.classList.add('fa-volume-mute'); }
        }
    });
}

// --- CHARGEMENT GALERIE ---
async function loadProjects() {
    if(!galleryContainer) return;
    try {
        const response = await fetch('./projets.json');
        const projets = await response.json();
        
        galleryContainer.innerHTML = ''; 

        projets.forEach((projet, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.style.transitionDelay = `${index * 0.1}s`; 
            
            card.innerHTML = `
                <div class="card-image">
                    <img src="${dossierImages}${projet.fichier}" alt="${projet.titre}" loading="lazy">
                    <div class="overlay"><i class="fas fa-expand"></i></div>
                </div>
                <div class="card-info">
                    <h3>${projet.titre}</h3>
                    <p>${projet.description}</p>
                </div>
            `;
            
            card.addEventListener('click', () => openModal(projet));
            galleryContainer.appendChild(card);
        });

        observeElements();

    } catch (e) {
        console.error("Erreur chargement projets.json", e);
        galleryContainer.innerHTML = "<p>Erreur de chargement de la galerie.</p>";
    }
}

// --- LOGIQUE MODAL ---
function openModal(projet) {
    if(!modal) return;
    modalImg.src = `${dossierImages}${projet.fichier}`;
    modalTitle.textContent = projet.titre;
    modalDesc.textContent = projet.description;
    
    modal.classList.remove('closing');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    if(!modal) return;
    modal.classList.add('closing');
    setTimeout(() => {
        modal.classList.remove('active');
        modal.classList.remove('closing');
        modalImg.src = "";
        document.body.style.overflow = 'auto';
    }, 100); 
}

if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if(modal) modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if(e.key === "Escape") closeModal(); });

// --- PARTICULES & SCROLL ---
function observeElements() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.card, .scroll-reveal').forEach(el => observer.observe(el));
}

const canvas = document.getElementById('etherCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];

function resizeCanvas(){ 
    if(canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
}
window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });

function initParticles() {
    if(!canvas) return;
    resizeCanvas();
    particles = [];
    const count = window.innerWidth < 768 ? 30 : 60;
    for(let i=0; i<count; i++) particles.push({
        x: Math.random()*canvas.width, y: Math.random()*canvas.height,
        vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5,
        size: Math.random()*2, opacity: Math.random()*0.5
    });
    animateParticles();
}

function animateParticles() {
    if(!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if(p.x<0) p.x=canvas.width; if(p.x>canvas.width) p.x=0;
        if(p.y<0) p.y=canvas.height; if(p.y>canvas.height) p.y=0;
        ctx.fillStyle = `rgba(0, 210, 255, ${p.opacity})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    });
    // Constellation
    particles.forEach((a, i) => {
        for(let j=i; j<particles.length; j++){
            let dx = a.x - particles[j].x; let dy = a.y - particles[j].y; let dist = dx*dx + dy*dy;
            if(dist < 10000) {
                ctx.strokeStyle = `rgba(0,210,255,${0.1 - dist/100000})`;
                ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke();
            }
        }
    });
    requestAnimationFrame(animateParticles);
}
