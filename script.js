// --- DOM ELEMENTS ---
const galleryContainer = document.getElementById('galleryContainer');
const welcomeScreen = document.getElementById('welcome-screen');
const startBtn = document.getElementById('start-experience');
const audioPlayer = document.getElementById('bg-music');
const musicBtn = document.getElementById('music-control');
const musicIcon = musicBtn.querySelector('i');

// Modal Elements
const modal = document.getElementById('ff-modal');
const modalImg = document.getElementById('modal-img-full');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const closeModalBtn = document.querySelector('.close-modal');
const dossierImages = './projets/';

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadAdminConfig(); // Charger config & Musique
    await loadProjects();    // Charger galerie
    
    // NB: On lance les particules uniquement après le clic "Entrer" pour l'effet "Vibe"
});

// --- 1. CHARGEMENT CONFIG ADMIN ---
async function loadAdminConfig() {
    try {
        const response = await fetch('./admin.json');
        const config = await response.json();

        // Branding
        document.title = config.meta.title;
        document.getElementById('nav-logo').innerHTML = `${config.branding.logoText}<span>${config.branding.logoSuffix}</span>`;
        document.querySelector('.logo-welcome').innerHTML = `${config.branding.logoText}<span>${config.branding.logoSuffix}</span>`;

        // Hero & About
        document.getElementById('hero-title').textContent = config.hero.title;
        document.getElementById('hero-subtitle').textContent = config.hero.subtitle;
        document.getElementById('hero-cta').textContent = config.hero.ctaText;
        document.getElementById('about-title').textContent = config.about.title;
        document.getElementById('about-desc').textContent = config.about.description;
        
        // Stats
        const statsList = document.getElementById('about-stats');
        config.about.stats.forEach(stat => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${stat.value}</strong> ${stat.label}`;
            statsList.appendChild(li);
        });

        // Liens
        document.getElementById('link-etsy').href = config.socials.etsyUrl;
        document.getElementById('link-insta').href = config.socials.instagramUrl;
        document.getElementById('link-tiktok').href = config.socials.tiktokUrl;
        document.getElementById('link-discord').href = config.socials.discordUrl;
        document.getElementById('footer-text').textContent = config.footer.text;

        // AUDIO SETUP (Externe)
        if(config.audio) {
            audioPlayer.src = config.audio.source;
            audioPlayer.volume = config.audio.volume;
            startBtn.innerText = config.audio.btnText;
        }

    } catch (e) {
        console.error("Erreur admin.json", e);
    }
}

// --- 2. LOGIQUE D'ACTIVATION (START) ---
if(startBtn) {
    startBtn.addEventListener('click', () => {
        // A. Lancer audio
        audioPlayer.play().then(() => {
            musicBtn.classList.add('playing');
        }).catch(e => console.log("Erreur lecture:", e));

        // B. Cacher écran accueil
        welcomeScreen.classList.add('hidden');

        // C. Lancer particules
        initParticles();
    });
}

// --- 3. GESTION MUSIQUE FLOTTANTE ---
musicBtn.addEventListener('click', () => {
    if(audioPlayer.paused) {
        audioPlayer.play();
        musicBtn.classList.add('playing');
        musicIcon.classList.remove('fa-volume-mute');
        musicIcon.classList.add('fa-volume-up');
    } else {
        audioPlayer.pause();
        musicBtn.classList.remove('playing');
        musicIcon.classList.remove('fa-volume-up');
        musicIcon.classList.add('fa-volume-mute');
    }
});

// --- 4. CHARGEMENT GALERIE ---
async function loadProjects() {
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
        console.error("Erreur projets", e);
    }
}

// --- 5. LOGIQUE MODAL (Optimisée) ---
function openModal(projet) {
    modalImg.src = `${dossierImages}${projet.fichier}`;
    modalTitle.textContent = projet.titre;
    modalDesc.textContent = projet.description;
    
    modal.classList.remove('closing');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.add('closing');
    // Délai très court (0.1s) pour correspondre au CSS
    setTimeout(() => {
        modal.classList.remove('active');
        modal.classList.remove('closing');
        modalImg.src = "";
        document.body.style.overflow = 'auto';
    }, 100); 
}

closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if(e.key === "Escape") closeModal(); });

// --- 6. PARTICULES & SCROLL ---
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
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });

function initParticles() {
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
