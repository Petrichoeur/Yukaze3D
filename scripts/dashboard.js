// --- DASHBOARD FLUX MONITOR ---

// --- PASSWORD PROTECTION ---
const DASHBOARD_AUTH_KEY = 'yukaze_dashboard_auth';
const DASHBOARD_AUTH_TOKEN = 'authenticated';

function checkAuth() {
    const auth = sessionStorage.getItem(DASHBOARD_AUTH_KEY);
    return auth === DASHBOARD_AUTH_TOKEN;
}

async function verifyPassword(password) {
    try {
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const result = await response.json();
        return result.success === true;
    } catch (error) {
        console.error('Authentication error:', error);
        return false;
    }
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = passwordInput.value;
        const submitBtn = form.querySelector('button[type="submit"]');

        // Disable form while verifying
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verification...';
        errorMessage.textContent = '';

        const isValid = await verifyPassword(password);

        if (isValid) {
            sessionStorage.setItem(DASHBOARD_AUTH_KEY, DASHBOARD_AUTH_TOKEN);
            unlockDashboard();
        } else {
            errorMessage.textContent = 'Mot de passe incorrect';
            passwordInput.value = '';
            passwordInput.focus();

            // Shake animation
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 500);
        }

        // Re-enable form
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-unlock"></i> Acceder';
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

// Data source toggle (localStorage vs database)
let useDatabase = true;

// Get flux data from localStorage (fallback)
function getFluxDataLocal() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : getDefaultData();
}

// Get flux data from database API (aggregated across all sessions)
async function getFluxDataFromDatabase() {
    try {
        const response = await fetch('/api/flux/aggregate');
        if (response.ok) {
            const data = await response.json();
            // Ensure all required fields exist with defaults
            return {
                visits: data.visits || 0,
                sessions: data.sessions || 0,
                firstVisit: data.firstVisit,
                lastVisit: data.lastVisit,
                interactions: data.interactions || 0,
                galleryViews: data.galleryViews || 0,
                musicPlays: data.musicPlays || 0,
                uniqueVisitors: data.uniqueVisitors || 0,
                projectViews: data.projectViews || {},
                sectionViews: data.sectionViews || { hero: 0, gallery: 0, shop: 0, about: 0, contact: 0 },
                socialClicks: data.socialClicks || { etsy: 0, insta: 0, tiktok: 0, discord: 0 },
                events: data.events || []
            };
        }
        throw new Error('API not available');
    } catch (error) {
        console.warn('Failed to fetch from database, using localStorage:', error);
        useDatabase = false;
        return getFluxDataLocal();
    }
}

// Get flux data (tries database first, falls back to localStorage)
async function getFluxData() {
    if (useDatabase) {
        return await getFluxDataFromDatabase();
    }
    return getFluxDataLocal();
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
        shop: 'Boutique',
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
async function renderDashboard() {
    const data = await getFluxData();

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

// --- SHOP MANAGEMENT ---
let shopItems = [];
const shopItemsGrid = document.getElementById('shop-items-grid');
const shopModal = document.getElementById('shop-modal');
const shopModalTitle = document.getElementById('shop-modal-title');
const shopItemForm = document.getElementById('shop-item-form');
const addShopItemBtn = document.getElementById('add-shop-item-btn');
const closeShopModalBtn = document.getElementById('close-shop-modal');
const cancelShopModalBtn = document.getElementById('cancel-shop-modal');

// Shop form fields
const shopItemId = document.getElementById('shop-item-id');
const shopItemTitre = document.getElementById('shop-item-titre');
const shopItemDescription = document.getElementById('shop-item-description');
const shopItemPrix = document.getElementById('shop-item-prix');
const shopItemFichier = document.getElementById('shop-item-fichier');
const shopItemEtsy = document.getElementById('shop-item-etsy');

// Image upload elements
const shopItemUpload = document.getElementById('shop-item-upload');
const uploadFileName = document.getElementById('upload-file-name');
const uploadProgress = document.getElementById('upload-progress');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removePreviewBtn = document.getElementById('remove-preview-btn');

// Track if we're currently uploading
let isUploading = false;

// Load shop items from API or local JSON
async function loadShopItems() {
    if (!shopItemsGrid) return;

    try {
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
            const response = await fetch('./config/shop.json');
            items = await response.json();
        }

        shopItems = items;
        renderShopItems();
    } catch (e) {
        console.error("Error loading shop items:", e);
        shopItemsGrid.innerHTML = '<p class="empty-state">Erreur de chargement des articles</p>';
    }
}

// Render shop items grid
function renderShopItems() {
    if (!shopItemsGrid) return;

    if (shopItems.length === 0) {
        shopItemsGrid.innerHTML = '<p class="empty-state">Aucun article dans la boutique</p>';
        return;
    }

    shopItemsGrid.innerHTML = shopItems.map(item => {
        // Handle different image sources: API-uploaded images, URLs, or local files
        let imageSrc;
        if (item.fichier && item.fichier.startsWith('/api/images/')) {
            imageSrc = item.fichier;
        } else if (item.fichier && item.fichier.startsWith('http')) {
            imageSrc = item.fichier;
        } else {
            imageSrc = `./impression_artefacts/${item.fichier}`;
        }
        const etsyUrl = item.etsyUrl || item.etsy_url || '';

        return `
            <div class="shop-item-card" data-id="${item.id}">
                <div class="shop-item-image">
                    <img src="${imageSrc}" alt="${item.titre}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%23111%22 width=%22100%22 height=%22100%22/><text fill=%22%23555%22 font-size=%2212%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>No image</text></svg>'">
                </div>
                <div class="shop-item-details">
                    <h4>${item.titre}</h4>
                    <p>${item.description || 'Pas de description'}</p>
                    <div class="shop-item-meta">
                        <span class="shop-item-price">${item.prix || '0.00'}€</span>
                        ${etsyUrl ? `<a href="${etsyUrl}" target="_blank" class="shop-item-etsy"><i class="fab fa-etsy"></i> Etsy</a>` : ''}
                    </div>
                    <div class="shop-item-actions">
                        <button class="edit-btn" onclick="openEditShopModal('${item.id}')">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="delete-btn" onclick="deleteShopItem('${item.id}')">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- IMAGE UPLOAD FUNCTIONALITY ---

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert('Type de fichier non supporte. Veuillez choisir une image JPEG, PNG, GIF ou WEBP.');
        resetFileUpload();
        return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('Le fichier est trop volumineux. Taille maximale: 5MB');
        resetFileUpload();
        return;
    }

    // Update filename display
    if (uploadFileName) {
        uploadFileName.textContent = file.name;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        if (imagePreview && imagePreviewContainer) {
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.add('visible');
        }
    };
    reader.readAsDataURL(file);

    // Auto-upload the image
    uploadImage(file);
}

// Upload image to server
async function uploadImage(file) {
    if (isUploading) return;
    isUploading = true;

    // Show progress
    if (uploadProgress) {
        uploadProgress.classList.add('active');
    }
    if (progressBar) {
        progressBar.style.width = '0%';
    }
    if (progressText) {
        progressText.textContent = 'Telechargement en cours...';
    }

    try {
        const formData = new FormData();
        formData.append('image', file);

        // Simulate progress (since fetch doesn't provide upload progress easily)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            if (progressBar) {
                progressBar.style.width = progress + '%';
            }
        }, 200);

        const response = await fetch('/api/images/upload', {
            method: 'POST',
            body: formData
        });

        clearInterval(progressInterval);

        if (response.ok) {
            const result = await response.json();

            // Complete the progress bar
            if (progressBar) {
                progressBar.style.width = '100%';
            }
            if (progressText) {
                progressText.textContent = 'Telecharge avec succes!';
                progressText.classList.add('success');
            }

            // Set the image URL in the fichier field
            if (shopItemFichier) {
                shopItemFichier.value = result.url;
            }

            // Hide progress after a short delay
            setTimeout(() => {
                if (uploadProgress) {
                    uploadProgress.classList.remove('active');
                }
                if (progressText) {
                    progressText.classList.remove('success');
                    progressText.textContent = 'Pret';
                }
            }, 2000);
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Echec du telechargement');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.classList.add('error');
        }
        if (progressText) {
            progressText.textContent = 'Erreur: ' + error.message;
            progressText.classList.add('error');
        }

        // Reset after showing error
        setTimeout(() => {
            resetFileUpload();
        }, 3000);
    } finally {
        isUploading = false;
    }
}

// Reset file upload UI
function resetFileUpload() {
    if (shopItemUpload) {
        shopItemUpload.value = '';
    }
    if (uploadFileName) {
        uploadFileName.textContent = 'Choisir un fichier';
    }
    if (uploadProgress) {
        uploadProgress.classList.remove('active');
    }
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.classList.remove('error');
    }
    if (progressText) {
        progressText.textContent = 'Pret';
        progressText.classList.remove('success', 'error');
    }
    if (imagePreviewContainer) {
        imagePreviewContainer.classList.remove('visible');
    }
    if (imagePreview) {
        imagePreview.src = '';
    }
}

// Remove image preview and clear upload
function removeImagePreview() {
    resetFileUpload();
    // Don't clear the fichier field if it was manually set to a URL
    // Only clear if it was set by the upload
    if (shopItemFichier && shopItemFichier.value.startsWith('/api/images/')) {
        shopItemFichier.value = '';
    }
}

// Open modal for adding new item
function openAddShopModal() {
    if (!shopModal) return;

    shopModalTitle.innerHTML = '<i class="fas fa-plus"></i> Ajouter un article';
    shopItemId.value = '';
    shopItemTitre.value = '';
    shopItemDescription.value = '';
    shopItemPrix.value = '';
    shopItemFichier.value = '';
    shopItemEtsy.value = '';

    // Reset file upload UI
    resetFileUpload();

    shopModal.classList.add('active');
}

// Open modal for editing existing item
function openEditShopModal(id) {
    if (!shopModal) return;

    const item = shopItems.find(i => String(i.id) === String(id));
    if (!item) return;

    shopModalTitle.innerHTML = '<i class="fas fa-edit"></i> Modifier l\'article';
    shopItemId.value = item.id;
    shopItemTitre.value = item.titre || '';
    shopItemDescription.value = item.description || '';
    shopItemPrix.value = item.prix || '';
    shopItemFichier.value = item.fichier || '';
    shopItemEtsy.value = item.etsyUrl || item.etsy_url || '';

    // Reset file upload UI but show current image if exists
    resetFileUpload();

    // Show preview of current image if it exists
    if (item.fichier && imagePreview && imagePreviewContainer) {
        let imageSrc;
        if (item.fichier.startsWith('/api/images/')) {
            imageSrc = item.fichier;
        } else if (item.fichier.startsWith('http')) {
            imageSrc = item.fichier;
        } else {
            imageSrc = `./impression_artefacts/${item.fichier}`;
        }
        imagePreview.src = imageSrc;
        imagePreviewContainer.classList.add('visible');
    }

    shopModal.classList.add('active');
}

// Close shop modal
function closeShopModal() {
    if (shopModal) {
        shopModal.classList.remove('active');
    }
}

// Save shop item (create or update)
async function saveShopItem(e) {
    e.preventDefault();

    const id = shopItemId.value;
    const itemData = {
        fichier: shopItemFichier.value,
        titre: shopItemTitre.value,
        description: shopItemDescription.value,
        prix: shopItemPrix.value,
        etsyUrl: shopItemEtsy.value
    };

    try {
        let response;
        if (id) {
            // Update existing item
            itemData.id = id;
            response = await fetch('/api/shop/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            });
        } else {
            // Create new item
            response = await fetch('/api/shop/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            });
        }

        if (response.ok) {
            closeShopModal();
            await loadShopItems();
            alert(id ? 'Article mis a jour avec succes!' : 'Article ajoute avec succes!');
        } else {
            const error = await response.json();
            alert('Erreur: ' + (error.error || 'Impossible de sauvegarder l\'article'));
        }
    } catch (error) {
        console.error('Error saving shop item:', error);
        // Fallback: update local JSON (for demo purposes when API is not available)
        if (id) {
            const index = shopItems.findIndex(i => String(i.id) === String(id));
            if (index !== -1) {
                shopItems[index] = { ...shopItems[index], ...itemData };
            }
        } else {
            itemData.id = String(Date.now());
            shopItems.push(itemData);
        }
        renderShopItems();
        closeShopModal();
        alert('Article sauvegarde localement (synchronisation avec la base de donnees non disponible)');
    }
}

// Delete shop item
async function deleteShopItem(id) {
    if (!confirm('Voulez-vous vraiment supprimer cet article ?')) return;

    try {
        const response = await fetch('/api/shop/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        if (response.ok) {
            await loadShopItems();
            alert('Article supprime avec succes!');
        } else {
            const error = await response.json();
            alert('Erreur: ' + (error.error || 'Impossible de supprimer l\'article'));
        }
    } catch (error) {
        console.error('Error deleting shop item:', error);
        // Fallback: remove from local array
        shopItems = shopItems.filter(i => String(i.id) !== String(id));
        renderShopItems();
        alert('Article supprime localement (synchronisation avec la base de donnees non disponible)');
    }
}

// Setup shop management event listeners
function initShopManagement() {
    if (addShopItemBtn) {
        addShopItemBtn.addEventListener('click', openAddShopModal);
    }

    if (closeShopModalBtn) {
        closeShopModalBtn.addEventListener('click', closeShopModal);
    }

    if (cancelShopModalBtn) {
        cancelShopModalBtn.addEventListener('click', closeShopModal);
    }

    if (shopItemForm) {
        shopItemForm.addEventListener('submit', saveShopItem);
    }

    if (shopModal) {
        shopModal.addEventListener('click', (e) => {
            if (e.target === shopModal) closeShopModal();
        });
    }

    // Image upload event listeners
    if (shopItemUpload) {
        shopItemUpload.addEventListener('change', handleFileSelect);
    }

    if (removePreviewBtn) {
        removePreviewBtn.addEventListener('click', removeImagePreview);
    }

    // Load shop items
    loadShopItems();
}

// Make functions available globally
window.openEditShopModal = openEditShopModal;
window.deleteShopItem = deleteShopItem;

// Initialize shop management when dashboard is ready
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        initShopManagement();
    }
});

// Also init shop management when dashboard is unlocked
const originalUnlockDashboard = unlockDashboard;
unlockDashboard = function() {
    originalUnlockDashboard();
    initShopManagement();
    initMusicSettings();
};

// --- MUSIC SETTINGS MANAGEMENT ---
let currentMusicSettings = {
    source_type: 'default',
    source_url: './config/theme.mp3',
    volume: 0.20,
    original_filename: 'theme.mp3'
};

// Music settings DOM elements
const musicUrlInput = document.getElementById('music-url-input');
const musicFileUpload = document.getElementById('music-file-upload');
const musicUploadFileName = document.getElementById('music-upload-file-name');
const musicUploadProgress = document.getElementById('music-upload-progress');
const musicProgressBar = document.getElementById('music-progress-bar');
const musicProgressText = document.getElementById('music-progress-text');
const musicVolumeSlider = document.getElementById('music-volume-slider');
const volumeValueDisplay = document.getElementById('volume-value-display');
const currentMusicName = document.getElementById('current-music-name');
const musicPreview = document.getElementById('music-preview');
const testMusicBtn = document.getElementById('test-music-btn');
const resetMusicBtn = document.getElementById('reset-music-btn');
const saveMusicSettingsBtn = document.getElementById('save-music-settings-btn');
const musicTabs = document.querySelectorAll('.music-tab');
const musicUrlTab = document.getElementById('music-url-tab');
const musicUploadTab = document.getElementById('music-upload-tab');

let isMusicUploading = false;

// Load music settings from API
async function loadMusicSettings() {
    try {
        const response = await fetch('/api/music/settings');
        if (response.ok) {
            currentMusicSettings = await response.json();
            updateMusicSettingsUI();
        }
    } catch (error) {
        console.warn('Failed to load music settings:', error);
    }
}

// Update UI with current settings
function updateMusicSettingsUI() {
    // Update current music display
    if (currentMusicName) {
        if (currentMusicSettings.is_default || currentMusicSettings.source_type === 'default') {
            currentMusicName.textContent = 'theme.mp3 (par defaut)';
        } else {
            currentMusicName.textContent = currentMusicSettings.original_filename || 'Personnalise';
        }
    }

    // Update volume slider
    if (musicVolumeSlider) {
        const volumePercent = Math.round(currentMusicSettings.volume * 100);
        musicVolumeSlider.value = volumePercent;
        if (volumeValueDisplay) {
            volumeValueDisplay.textContent = volumePercent + '%';
        }
    }

    // Update URL input if it's a URL type
    if (musicUrlInput && currentMusicSettings.source_type === 'url') {
        musicUrlInput.value = currentMusicSettings.source_url;
    }

    // Update preview
    if (musicPreview) {
        musicPreview.src = currentMusicSettings.source_url;
        musicPreview.volume = currentMusicSettings.volume;
    }
}

// Handle tab switching
function initMusicTabs() {
    musicTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Update tab buttons
            musicTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update tab content
            if (musicUrlTab) musicUrlTab.classList.remove('active');
            if (musicUploadTab) musicUploadTab.classList.remove('active');

            if (targetTab === 'url' && musicUrlTab) {
                musicUrlTab.classList.add('active');
            } else if (targetTab === 'upload' && musicUploadTab) {
                musicUploadTab.classList.add('active');
            }
        });
    });
}

// Handle volume slider change
function initVolumeSlider() {
    if (musicVolumeSlider) {
        musicVolumeSlider.addEventListener('input', (e) => {
            const volumePercent = parseInt(e.target.value);
            if (volumeValueDisplay) {
                volumeValueDisplay.textContent = volumePercent + '%';
            }

            // Update preview volume
            if (musicPreview) {
                musicPreview.volume = volumePercent / 100;
            }
        });
    }
}

// Handle music file upload
function handleMusicFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'];
    if (!allowedTypes.includes(file.type)) {
        alert('Type de fichier non supporte. Veuillez choisir un fichier MP3, WAV, OGG ou M4A.');
        resetMusicFileUpload();
        return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('Le fichier est trop volumineux. Taille maximale: 10MB');
        resetMusicFileUpload();
        return;
    }

    // Update filename display
    if (musicUploadFileName) {
        musicUploadFileName.textContent = file.name;
    }

    // Auto-upload the music
    uploadMusicFile(file);
}

// Upload music file to server
async function uploadMusicFile(file) {
    if (isMusicUploading) return;
    isMusicUploading = true;

    // Show progress
    if (musicUploadProgress) {
        musicUploadProgress.classList.add('active');
    }
    if (musicProgressBar) {
        musicProgressBar.style.width = '0%';
    }
    if (musicProgressText) {
        musicProgressText.textContent = 'Telechargement en cours...';
    }

    try {
        const formData = new FormData();
        formData.append('audio', file);

        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            if (musicProgressBar) {
                musicProgressBar.style.width = progress + '%';
            }
        }, 200);

        const response = await fetch('/api/music/upload', {
            method: 'POST',
            body: formData
        });

        clearInterval(progressInterval);

        if (response.ok) {
            const result = await response.json();

            // Complete the progress bar
            if (musicProgressBar) {
                musicProgressBar.style.width = '100%';
            }
            if (musicProgressText) {
                musicProgressText.textContent = 'Telecharge avec succes!';
                musicProgressText.classList.add('success');
            }

            // Update current settings (not saved yet)
            currentMusicSettings.source_type = 'uploaded';
            currentMusicSettings.source_url = result.url;
            currentMusicSettings.original_filename = result.originalName || file.name;

            // Update preview
            if (musicPreview) {
                musicPreview.src = result.url;
            }

            // Hide progress after a short delay
            setTimeout(() => {
                if (musicUploadProgress) {
                    musicUploadProgress.classList.remove('active');
                }
                if (musicProgressText) {
                    musicProgressText.classList.remove('success');
                    musicProgressText.textContent = 'Pret';
                }
            }, 2000);
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Echec du telechargement');
        }
    } catch (error) {
        console.error('Error uploading music:', error);
        if (musicProgressBar) {
            musicProgressBar.style.width = '100%';
            musicProgressBar.classList.add('error');
        }
        if (musicProgressText) {
            musicProgressText.textContent = 'Erreur: ' + error.message;
            musicProgressText.classList.add('error');
        }

        // Reset after showing error
        setTimeout(() => {
            resetMusicFileUpload();
        }, 3000);
    } finally {
        isMusicUploading = false;
    }
}

// Reset music file upload UI
function resetMusicFileUpload() {
    if (musicFileUpload) {
        musicFileUpload.value = '';
    }
    if (musicUploadFileName) {
        musicUploadFileName.textContent = 'Choisir un fichier';
    }
    if (musicUploadProgress) {
        musicUploadProgress.classList.remove('active');
    }
    if (musicProgressBar) {
        musicProgressBar.style.width = '0%';
        musicProgressBar.classList.remove('error');
    }
    if (musicProgressText) {
        musicProgressText.textContent = 'Pret';
        musicProgressText.classList.remove('success', 'error');
    }
}

// Test current music configuration
function testMusic() {
    if (!musicPreview) return;

    // Get current configuration
    const activeTab = document.querySelector('.music-tab.active');
    const tabType = activeTab ? activeTab.dataset.tab : 'url';

    let sourceUrl = currentMusicSettings.source_url;

    if (tabType === 'url' && musicUrlInput && musicUrlInput.value.trim()) {
        sourceUrl = musicUrlInput.value.trim();
    }

    // Update preview source
    musicPreview.src = sourceUrl;
    musicPreview.volume = (musicVolumeSlider ? musicVolumeSlider.value : 20) / 100;

    // Try to play
    const playPromise = musicPreview.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn('Could not play audio:', error);
            alert('Impossible de lire la musique. Verifiez que l\'URL est valide et accessible.');
        });
    }
}

// Reset to default music
function resetToDefaultMusic() {
    if (!confirm('Reinitialiser la musique vers theme.mp3 par defaut ?')) return;

    currentMusicSettings = {
        source_type: 'default',
        source_url: './config/theme.mp3',
        volume: currentMusicSettings.volume, // Keep current volume
        original_filename: 'theme.mp3'
    };

    // Clear inputs
    if (musicUrlInput) musicUrlInput.value = '';
    resetMusicFileUpload();

    // Update UI
    updateMusicSettingsUI();
}

// Save music settings to database
async function saveMusicSettings() {
    const activeTab = document.querySelector('.music-tab.active');
    const tabType = activeTab ? activeTab.dataset.tab : 'url';

    // Prepare settings based on active tab
    const settingsToSave = {
        volume: (musicVolumeSlider ? musicVolumeSlider.value : 20) / 100,
        source_type: currentMusicSettings.source_type,
        source_url: currentMusicSettings.source_url,
        original_filename: currentMusicSettings.original_filename
    };

    // If URL tab is active and has a value, use that
    if (tabType === 'url' && musicUrlInput && musicUrlInput.value.trim()) {
        settingsToSave.source_type = 'url';
        settingsToSave.source_url = musicUrlInput.value.trim();
        settingsToSave.original_filename = 'URL externe';
    }

    // If source is still default-like, mark it as default
    if (settingsToSave.source_url === './config/theme.mp3' || !settingsToSave.source_url) {
        settingsToSave.source_type = 'default';
        settingsToSave.source_url = './config/theme.mp3';
        settingsToSave.original_filename = 'theme.mp3';
    }

    try {
        const response = await fetch('/api/music/settings/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsToSave)
        });

        if (response.ok) {
            const result = await response.json();
            currentMusicSettings = result.settings;
            updateMusicSettingsUI();
            alert('Parametres audio enregistres avec succes!');
        } else {
            const error = await response.json();
            alert('Erreur: ' + (error.error || 'Impossible de sauvegarder les parametres'));
        }
    } catch (error) {
        console.error('Error saving music settings:', error);
        alert('Erreur de connexion. Verifiez votre connexion internet.');
    }
}

// Initialize music settings management
function initMusicSettings() {
    // Load current settings
    loadMusicSettings();

    // Initialize tabs
    initMusicTabs();

    // Initialize volume slider
    initVolumeSlider();

    // File upload handler
    if (musicFileUpload) {
        musicFileUpload.addEventListener('change', handleMusicFileSelect);
    }

    // Test button
    if (testMusicBtn) {
        testMusicBtn.addEventListener('click', testMusic);
    }

    // Reset button
    if (resetMusicBtn) {
        resetMusicBtn.addEventListener('click', resetToDefaultMusic);
    }

    // Save button
    if (saveMusicSettingsBtn) {
        saveMusicSettingsBtn.addEventListener('click', saveMusicSettings);
    }
}

// Initialize music settings when dashboard loads
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        initMusicSettings();
    }
});
