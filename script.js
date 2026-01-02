// --- DOM ELEMENTS ---
const galleryContainer = document.getElementById('galleryContainer');
const modal = document.getElementById('ff-modal');
const modalImg = document.getElementById('modal-img-full');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const closeModalBtn = document.querySelector('.close-modal');
const dossierImages = './projets/';

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. D'abord on configure le site via admin.json
    await loadAdminConfig();
    // 2. Ensuite on charge les projets
    await loadProjects();
    // 3. Enfin on lance les effets visuels
    initVisuals();
});

// --- CHARGEMENT CONFIG ADMIN ---
async function loadAdminConfig() {
    try {
        const response = await fetch('./admin.json');
        const config = await response.json();

        // 1. Meta & Titre
        document.title = config.meta.title;

        // 2. Logo
        const logoDiv = document.getElementById('nav-logo');
        logoDiv.innerHTML = `${config.branding.logoText}<span>${config.branding.logoSuffix}</span>`;

        // 3. Hero Section
        document.getElementById('hero-title').textContent = config.hero.title;
        document.getElementById('hero-subtitle').textContent = config.hero.subtitle;
        document.getElementById('hero-cta').textContent = config.hero.ctaText;

        // 4. About Section
        document.getElementById('about-title').textContent = config.about.title;
        document.getElementById('about-desc').textContent = config.about.description;
        
        // Stats dynamiques
        const statsList = document.getElementById('about-stats');
        config.about.stats.forEach(stat => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${stat.value}</strong> ${stat.label}`;
            statsList.appendChild(li);
        });

        // 5. Réseaux Sociaux & Footer
        document.getElementById('link-etsy').href = config.socials.etsyUrl;
        document.getElementById('link-insta').href = config.socials.instagramUrl;
        document.getElementById('link-tiktok').href = config.socials.tiktokUrl;
        document.getElementById('link-discord').href = config.socials.discordUrl;
        document.getElementById('footer-text').textContent = config.footer.text;

    } catch (e) {
        console.error("Erreur chargement admin.json", e);
    }
}

// --- CHARGEMENT PROJETS ---
async function loadProjects() {
    try {
        const response = await fetch('./projets.json');
        const projets = await response.json();
        
        galleryContainer.innerHTML = ''; 

        projets.forEach((projet, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.style.transitionDelay = `${index * 0.1}s`; // Effet cascade
            
            card.innerHTML = `
                <div class="card-image">
                    <img src="${dossierImages}${projet.fichier}" alt="${projet.titre}" loading="lazy">
                    <div class="card-info" style="position:absolute; bottom:0; width:100%; background:rgba(0,0,0,0.8);">
                        <h3>${projet.titre}</h3>
                    </div>
                </div>
            `;
            
            // Clic pour ouvrir le modal
            card.addEventListener('click', () => openModal(projet));
            galleryContainer.appendChild(card);
        });

        observeElements();

    } catch (e) {
        galleryContainer.innerHTML = "<p>Erreur chargement galerie.</p>";
    }
}

// --- LOGIQUE MODAL ---
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
    setTimeout(() => {
        modal.classList.remove('active');
        modal.classList.remove('closing');
        modalImg.src = "";
        document.body.style.overflow = 'auto';
    }, 100); // Doit matcher l'animation CSS
}

closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if(e.key === "Escape") closeModal(); });

// --- SYSTEMES VISUELS (Particules & Scroll) ---
function initVisuals() {
    initParticles();
}

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

// Canvas Particules Simplifié
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
    // Liens constellations
    particles.forEach((a, i) => {
        for(let j=i; j<particles.length; j++){
            let dx = a.x - particles[j].x;
            let dy = a.y - particles[j].y;
            let dist = dx*dx + dy*dy;
            if(dist < 10000) {
                ctx.strokeStyle = `rgba(0,210,255,${0.1 - dist/100000})`;
                ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke();
            }
        }
    });
    requestAnimationFrame(animateParticles);
}
