// --- DASHBOARD FLUX MONITOR ---

// --- PASSWORD PROTECTION ---
const DASHBOARD_AUTH_KEY = 'yukaze_dashboard_auth';
const DASHBOARD_PASSWORD_HASH = '8a5e3f9d2c1b4e7a'; // Simple obfuscation

function checkAuth() {
    const auth = sessionStorage.getItem(DASHBOARD_AUTH_KEY);
    return auth === DASHBOARD_PASSWORD_HASH;
}

function initLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    const form = document.getElementById('login-form');
    const passwordInput = document.getElementById('password-input');
    const errorMessage = document.getElementById('error-message');

    if (checkAuth()) {
        unlockDashboard();
        return;
    }

    // Lock the dashboard
    document.body.classList.add('dashboard-locked');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = passwordInput.value;

        if (password === 'florianlegoat') {
            sessionStorage.setItem(DASHBOARD_AUTH_KEY, DASHBOARD_PASSWORD_HASH);
            unlockDashboard();
        } else {
            errorMessage.textContent = 'Mot de passe incorrect';
            passwordInput.value = '';
            passwordInput.focus();

            // Shake animation
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 500);
        }
    });

    passwordInput.focus();
}

function unlockDashboard() {
    const overlay = document.getElementById('login-overlay');
    document.body.classList.remove('dashboard-locked');
    overlay.classList.add('hidden');

    // Initialize dashboard after unlock
    renderDashboard();
    initParticles();
}

const STORAGE_KEY = 'yukaze_flux_data';

// Get flux data from localStorage
function getFluxData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : getDefaultData();
}

function getDefaultData() {
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
}

// Clear all flux data
function clearFluxData() {
    if (confirm('Voulez-vous vraiment réinitialiser toutes les données de flux ?')) {
        localStorage.removeItem(STORAGE_KEY);
        renderDashboard();
    }
}

// Format date for display
function formatDate(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format relative time
function formatRelativeTime(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
}

// Get event type label
function getEventLabel(type) {
    const labels = {
        'page_visit': 'Visite de page',
        'gallery_view': 'Vue galerie',
        'section_view': 'Vue section',
        'music_play': 'Musique jouée',
        'social_click': 'Clic social'
    };
    return labels[type] || type;
}

// Get event icon
function getEventIcon(type) {
    const icons = {
        'page_visit': 'fa-eye',
        'gallery_view': 'fa-image',
        'section_view': 'fa-scroll',
        'music_play': 'fa-music',
        'social_click': 'fa-share-alt'
    };
    return icons[type] || 'fa-circle';
}

// Render the main metrics cards
function renderMetrics(data) {
    document.getElementById('total-visits').textContent = data.visits;
    document.getElementById('total-interactions').textContent = data.interactions;
    document.getElementById('gallery-views').textContent = data.galleryViews;
    document.getElementById('music-plays').textContent = data.musicPlays;
}

// Render section chart
function renderSectionChart(data) {
    const container = document.getElementById('section-bars');
    const sections = data.sectionViews;
    const maxValue = Math.max(...Object.values(sections), 1);

    const sectionLabels = {
        hero: 'Le Portail',
        gallery: 'Artefacts',
        about: 'L\'Atelier',
        contact: 'Guilde'
    };

    container.innerHTML = Object.entries(sections).map(([key, value]) => {
        const percentage = (value / maxValue) * 100;
        return `
            <div class="bar-item">
                <span class="bar-label">${sectionLabels[key] || key}</span>
                <div class="bar-wrapper">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="bar-value">${value}</span>
            </div>
        `;
    }).join('');
}

// Render popular projects ranking
function renderPopularProjects(data) {
    const container = document.getElementById('popular-projects');
    const projects = Object.entries(data.projectViews)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (projects.length === 0) {
        container.innerHTML = '<li class="empty-state">Aucun artefact consulté</li>';
        return;
    }

    container.innerHTML = projects.map(([name, views], index) => `
        <li class="ranking-item">
            <span class="rank">#${index + 1}</span>
            <span class="project-name">${name}</span>
            <span class="view-count">${views} <i class="fas fa-eye"></i></span>
        </li>
    `).join('');
}

// Render activity timeline
function renderTimeline(data) {
    const container = document.getElementById('activity-timeline');
    const events = data.events.slice(0, 20);

    if (events.length === 0) {
        container.innerHTML = '<p class="empty-state">Aucune activité enregistrée</p>';
        return;
    }

    container.innerHTML = events.map(event => {
        let details = '';
        if (event.details) {
            if (event.details.project) details = event.details.project;
            else if (event.details.section) details = getSectionLabel(event.details.section);
            else if (event.details.platform) details = getPlatformLabel(event.details.platform);
            else if (event.details.page) details = 'Page principale';
        }

        return `
            <div class="timeline-item">
                <div class="timeline-icon"><i class="fas ${getEventIcon(event.type)}"></i></div>
                <div class="timeline-content">
                    <span class="event-type">${getEventLabel(event.type)}</span>
                    ${details ? `<span class="event-details">${details}</span>` : ''}
                </div>
                <span class="event-time">${formatRelativeTime(event.timestamp)}</span>
            </div>
        `;
    }).join('');
}

function getSectionLabel(section) {
    const labels = {
        hero: 'Le Portail',
        gallery: 'Artefacts',
        about: 'L\'Atelier',
        contact: 'Guilde'
    };
    return labels[section] || section;
}

function getPlatformLabel(platform) {
    const labels = {
        etsy: 'Etsy',
        insta: 'Instagram',
        tiktok: 'TikTok',
        discord: 'Discord'
    };
    return labels[platform] || platform;
}

// Render social stats
function renderSocialStats(data) {
    document.getElementById('clicks-etsy').textContent = data.socialClicks.etsy;
    document.getElementById('clicks-insta').textContent = data.socialClicks.insta;
    document.getElementById('clicks-tiktok').textContent = data.socialClicks.tiktok;
    document.getElementById('clicks-discord').textContent = data.socialClicks.discord;
}

// Render session info
function renderSessionInfo(data) {
    document.getElementById('first-visit').textContent = formatDate(data.firstVisit);
    document.getElementById('last-visit').textContent = formatDate(data.lastVisit);
    document.getElementById('total-sessions').textContent = data.sessions;
}

// Main render function
function renderDashboard() {
    const data = getFluxData();

    renderMetrics(data);
    renderSectionChart(data);
    renderPopularProjects(data);
    renderTimeline(data);
    renderSocialStats(data);
    renderSessionInfo(data);

    document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString('fr-FR');
}

// --- PARTICLES BACKGROUND ---
const canvas = document.getElementById('etherCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];

function resizeCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

function initParticles() {
    if (!canvas) return;
    resizeCanvas();
    particles = [];
    const count = window.innerWidth < 768 ? 20 : 40;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 2,
            opacity: Math.random() * 0.4
        });
    }
    animateParticles();
}

function animateParticles() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.fillStyle = `rgba(0, 210, 255, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    // Constellation lines
    particles.forEach((a, i) => {
        for (let j = i; j < particles.length; j++) {
            const dx = a.x - particles[j].x;
            const dy = a.y - particles[j].y;
            const dist = dx * dx + dy * dy;
            if (dist < 8000) {
                ctx.strokeStyle = `rgba(0,210,255,${0.08 - dist / 100000})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    });
    requestAnimationFrame(animateParticles);
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize login protection first
    initLoginOverlay();

    // Only init dashboard if already authenticated
    if (checkAuth()) {
        renderDashboard();
        initParticles();
    }

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', renderDashboard);

    // Clear button
    document.getElementById('clear-btn').addEventListener('click', clearFluxData);

    // Auto-refresh every 30 seconds
    setInterval(() => {
        if (checkAuth()) {
            renderDashboard();
        }
    }, 30000);
});

window.addEventListener('resize', () => {
    resizeCanvas();
    initParticles();
});
