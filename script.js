// --- FLUX TRACKING SYSTEM ---
const FluxTracker = {
    STORAGE_KEY: 'yukaze_flux_data',
    SESSION_ID_KEY: 'yukaze_session_id',
    syncTimeout: null,

    getSessionId() {
        let sessionId = localStorage.getItem(this.SESSION_ID_KEY);
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(this.SESSION_ID_KEY, sessionId);
        }
        return sessionId;
    },

    getData() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : this.getDefaultData();
    },

    getDefaultData() {
        return {
            visits: 0,
            sessions: 0,
            firstVisit: null,
            lastVisit: null,
            interactions: 0,
            galleryViews: 0,
            musicPlays: 0,
            projectViews: {},
            sectionViews: {
                hero: 0,
                gallery: 0,
                shop: 0,
                about: 0,
                contact: 0
            },
            socialClicks: {
                etsy: 0,
                insta: 0,
                tiktok: 0,
                discord: 0
            },
            events: []
        };
    },

    saveData(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        this.scheduleSyncToDatabase();
    },

    // Debounced sync to database to avoid too many API calls
    scheduleSyncToDatabase() {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }
        this.syncTimeout = setTimeout(() => {
            this.syncToDatabase();
        }, 2000); // Wait 2 seconds after last change before syncing
    },

    async syncToDatabase() {
        try {
            const data = this.getData();
            data.sessionId = this.getSessionId();

            const response = await fetch('/api/flux/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                console.warn('Failed to sync flux data to database');
            }
        } catch (error) {
            console.warn('Error syncing flux data to database:', error);
        }
    },

    logEvent(type, details = {}) {
        const data = this.getData();
        const event = {
            type,
            details,
            timestamp: new Date().toISOString()
        };
        data.events.unshift(event);
        // Keep only last 100 events
        if (data.events.length > 100) {
            data.events = data.events.slice(0, 100);
        }
        data.interactions++;
        this.saveData(data);
    },

    trackVisit() {
        const data = this.getData();
        const now = new Date().toISOString();

        if (!data.firstVisit) {
            data.firstVisit = now;
        }

        // Check if this is a new session (more than 30 minutes since last visit)
        const lastVisitTime = data.lastVisit ? new Date(data.lastVisit).getTime() : 0;
        const currentTime = new Date().getTime();
        if (currentTime - lastVisitTime > 30 * 60 * 1000) {
            data.sessions++;
        }

        data.visits++;
        data.lastVisit = now;
        this.saveData(data);
        this.logEvent('page_visit', { page: 'index' });
    },

    trackGalleryView(projectTitle) {
        const data = this.getData();
        data.galleryViews++;
        if (!data.projectViews[projectTitle]) {
            data.projectViews[projectTitle] = 0;
        }
        data.projectViews[projectTitle]++;
        this.saveData(data);
        this.logEvent('gallery_view', { project: projectTitle });
    },

    trackSectionView(section) {
        const data = this.getData();
        if (data.sectionViews[section] !== undefined) {
            data.sectionViews[section]++;
            this.saveData(data);
            this.logEvent('section_view', { section });
        }
    },

    trackMusicPlay() {
        const data = this.getData();
        data.musicPlays++;
        this.saveData(data);
        this.logEvent('music_play', {});
    },

    trackSocialClick(platform) {
        const data = this.getData();
        if (data.socialClicks[platform] !== undefined) {
            data.socialClicks[platform]++;
            this.saveData(data);
            this.logEvent('social_click', { platform });
        }
    }
};

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

    // 0. Track page visit
    FluxTracker.trackVisit();

    // 1. Charger la config
    await loadAdminConfig();

    // 2. Charger les projets
    await loadProjects();

    // 3. Activer le bouton "Entrer" (Correction du bug de clic)
    activateStartButton();

    // 4. Track social link clicks
    setupSocialTracking();

    // 5. Track section views with IntersectionObserver
    setupSectionTracking();
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

        // Creator Section
        if(config.creator) {
            const creatorTitle = document.getElementById('creator-title');
            const creatorImage = document.getElementById('creator-image');
            const creatorIntro = document.getElementById('creator-intro');
            const creatorMission = document.getElementById('creator-mission');
            const creatorSpecialtiesTitle = document.getElementById('creator-specialties-title');
            const creatorSpecialties = document.getElementById('creator-specialties');
            const creatorConclusion = document.getElementById('creator-conclusion');

            if(creatorTitle) creatorTitle.innerHTML = `${config.creator.title} <span class="crystal-icon">♦</span>`;
            if(creatorImage) {
                creatorImage.src = config.creator.image;
                creatorImage.alt = config.creator.imageAlt;
            }
            if(creatorIntro) creatorIntro.textContent = config.creator.intro;
            if(creatorMission) creatorMission.innerHTML = `<strong>${config.creator.mission.split(',')[0]},</strong>${config.creator.mission.split(',').slice(1).join(',')}`;
            if(creatorSpecialtiesTitle) creatorSpecialtiesTitle.textContent = config.creator.specialtiesTitle;
            if(creatorSpecialties) {
                creatorSpecialties.innerHTML = '';
                config.creator.specialties.forEach(specialty => {
                    const li = document.createElement('li');
                    li.innerHTML = `<span class="specialty-icon">♦</span> <strong>${specialty.title}</strong> : ${specialty.description}`;
                    creatorSpecialties.appendChild(li);
                });
            }
            if(creatorConclusion) creatorConclusion.textContent = config.creator.conclusion;
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
            FluxTracker.trackMusicPlay();
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

    FluxTracker.trackGalleryView(projet.titre);

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

// --- FLUX TRACKING SETUP ---
function setupSocialTracking() {
    const socialLinks = {
        'link-etsy': 'etsy',
        'link-insta': 'insta',
        'link-tiktok': 'tiktok',
        'link-discord': 'discord'
    };

    Object.entries(socialLinks).forEach(([id, platform]) => {
        const link = document.getElementById(id);
        if (link) {
            link.addEventListener('click', () => {
                FluxTracker.trackSocialClick(platform);
            });
        }
    });
}

function setupSectionTracking() {
    const sections = ['hero', 'gallery', 'shop', 'about', 'contact'];
    const trackedSections = new Set();

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !trackedSections.has(entry.target.id)) {
                trackedSections.add(entry.target.id);
                FluxTracker.trackSectionView(entry.target.id);
            }
        });
    }, { threshold: 0.3 });

    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            observer.observe(section);
        }
    });
}

// --- SHOP CAROUSEL ---
const shopTrack = document.getElementById('shopTrack');
const shopPrevBtn = document.getElementById('shopPrev');
const shopNextBtn = document.getElementById('shopNext');
const carouselDots = document.getElementById('carouselDots');

// Shop Modal Elements
const shopModal = document.getElementById('shop-modal');
const shopModalImg = document.getElementById('shop-modal-img');
const shopModalTitle = document.getElementById('shop-modal-title');
const shopModalDesc = document.getElementById('shop-modal-desc');
const shopModalPrice = document.getElementById('shop-modal-price');
const shopModalEtsyBtn = document.getElementById('shop-modal-etsy-btn');
const closeShopModalBtn = document.querySelector('.close-shop-modal');

let shopItems = [];
let currentSlide = 0;
let itemsPerView = 3;

async function loadShopItems() {
    if (!shopTrack) return;

    try {
        // Try to fetch from API first (database), fallback to local JSON
        let items;
        try {
            const apiResponse = await fetch('/api/shop');
            if (apiResponse.ok) {
                items = await apiResponse.json();
            } else {
                throw new Error('API not available');
            }
        } catch (apiError) {
            // Fallback to local JSON file
            const response = await fetch('./shop.json');
            items = await response.json();
        }

        shopItems = items;
        renderShopCarousel();
        updateCarouselDots();
        setupCarouselControls();

    } catch (e) {
        console.error("Erreur chargement boutique", e);
        if (shopTrack) {
            shopTrack.innerHTML = "<p class='shop-error'>Erreur de chargement de la boutique.</p>";
        }
    }
}

function getItemsPerView() {
    if (window.innerWidth < 600) return 1;
    if (window.innerWidth < 900) return 2;
    return 3;
}

function renderShopCarousel() {
    if (!shopTrack || shopItems.length === 0) return;

    itemsPerView = getItemsPerView();

    shopTrack.innerHTML = '';

    shopItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.classList.add('shop-card');

        // Handle different image sources: API-uploaded images, URLs, or local files
        let imageSrc;
        if (item.fichier && item.fichier.startsWith('/api/images/')) {
            imageSrc = item.fichier;
        } else if (item.fichier && item.fichier.startsWith('http')) {
            imageSrc = item.fichier;
        } else {
            imageSrc = `${dossierImages}${item.fichier}`;
        }
        const etsyUrl = item.etsyUrl || item.etsy_url || '#';

        card.innerHTML = `
            <div class="shop-card-image" data-item-index="${index}">
                <img src="${imageSrc}" alt="${item.titre}" loading="lazy">
                <div class="shop-card-overlay"><i class="fas fa-expand"></i></div>
            </div>
            <div class="shop-card-info">
                <h3>${item.titre}</h3>
                <p>${item.description}</p>
                <div class="shop-card-footer">
                    <span class="shop-price">${item.prix}€</span>
                    <a href="${etsyUrl}" target="_blank" class="shop-buy-btn" onclick="event.stopPropagation(); FluxTracker.trackSocialClick('etsy')">
                        <i class="fab fa-etsy"></i> Acheter
                    </a>
                </div>
            </div>
        `;

        // Add click event to open shop modal when clicking on the image
        const imageContainer = card.querySelector('.shop-card-image');
        imageContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            openShopModal(item, imageSrc);
        });

        shopTrack.appendChild(card);
    });

    updateCarouselPosition();
}

function updateCarouselPosition() {
    if (!shopTrack) return;
    itemsPerView = getItemsPerView();
    const maxSlide = Math.max(0, shopItems.length - itemsPerView);
    if (currentSlide > maxSlide) currentSlide = maxSlide;

    const cardWidth = 100 / itemsPerView;
    const offset = currentSlide * cardWidth;
    shopTrack.style.transform = `translateX(-${offset}%)`;

    updateCarouselDots();
}

function updateCarouselDots() {
    if (!carouselDots) return;

    itemsPerView = getItemsPerView();
    const totalDots = Math.ceil(shopItems.length / itemsPerView);
    const currentDot = Math.floor(currentSlide / itemsPerView);

    carouselDots.innerHTML = '';

    for (let i = 0; i < totalDots; i++) {
        const dot = document.createElement('button');
        dot.classList.add('carousel-dot');
        if (i === currentDot) dot.classList.add('active');
        dot.addEventListener('click', () => {
            currentSlide = i * itemsPerView;
            updateCarouselPosition();
        });
        carouselDots.appendChild(dot);
    }
}

function setupCarouselControls() {
    if (shopPrevBtn) {
        shopPrevBtn.addEventListener('click', () => {
            if (currentSlide > 0) {
                currentSlide--;
                updateCarouselPosition();
            }
        });
    }

    if (shopNextBtn) {
        shopNextBtn.addEventListener('click', () => {
            itemsPerView = getItemsPerView();
            const maxSlide = Math.max(0, shopItems.length - itemsPerView);
            if (currentSlide < maxSlide) {
                currentSlide++;
                updateCarouselPosition();
            }
        });
    }
}

// Update carousel on window resize
window.addEventListener('resize', () => {
    if (shopItems.length > 0) {
        renderShopCarousel();
    }
});

// Load shop items on page load
document.addEventListener('DOMContentLoaded', () => {
    loadShopItems();
});

// --- SHOP MODAL FUNCTIONS ---
function openShopModal(item, imageSrc) {
    if (!shopModal) return;

    shopModalImg.src = imageSrc;
    shopModalTitle.textContent = item.titre;
    shopModalDesc.textContent = item.description;
    shopModalPrice.textContent = `${item.prix}€`;

    const etsyUrl = item.etsyUrl || item.etsy_url || '#';
    shopModalEtsyBtn.href = etsyUrl;

    // Track shop item view
    FluxTracker.logEvent('gallery_view', { project: `Shop: ${item.titre}` });

    shopModal.classList.remove('closing');
    shopModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeShopModal() {
    if (!shopModal) return;
    shopModal.classList.add('closing');
    setTimeout(() => {
        shopModal.classList.remove('active');
        shopModal.classList.remove('closing');
        shopModalImg.src = '';
        document.body.style.overflow = 'auto';
    }, 100);
}

// Shop modal event listeners
if (closeShopModalBtn) closeShopModalBtn.addEventListener('click', closeShopModal);
if (shopModal) shopModal.addEventListener('click', (e) => { if (e.target === shopModal) closeShopModal(); });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeShopModal();
    }
});
