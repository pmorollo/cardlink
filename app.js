/* ============================================
   CardLink — Application Logic (Clean Rewrite v19)
   ============================================ */

const API = window.location.origin + '/api';

let authToken = sessionStorage.getItem('cardlink_token') || null;
let currentUser = null;
let currentTheme = 'midnight';
let editingCardId = null;
let currentUserCardId = null;

// ============================================
// API Helper
// ============================================
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
  const res = await fetch(API + path, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

// ============================================
// Utility
// ============================================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function cleanWhatsapp(num) {
  if (!num) return '';
  return num.replace(/\D/g, '');
}

function setFieldValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

let toastTimeout;
function showToast(icon, message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-message').textContent = message;
  clearTimeout(toastTimeout);
  toast.classList.add('show');
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('✅', 'Link copiado!')).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); showToast('✅', 'Link copiado!'); }
  catch (e) { showToast('❌', 'Não foi possível copiar.'); }
  document.body.removeChild(ta);
}

function shareCard(slug) {
  const cardLink = slug ? window.location.origin + '/#card/' + slug : window.location.href;
  if (navigator.share) {
    navigator.share({ title: 'Meu cartão de visita digital', url: cardLink }).catch(() => copyToClipboard(cardLink));
  } else {
    copyToClipboard(cardLink);
  }
}

function copyCardLink() { copyToClipboard(window.location.href); }

// ============================================
// Navigation / Routing
// ============================================
function navigateTo(route) {
  const map = { home: '', auth: '#auth', dashboard: '#dashboard', builder: '#builder', contacts: '#contacts' };
  const target = map[route] !== undefined ? map[route] : '';
  if (window.location.hash === target || (target === '' && (window.location.hash === '' || window.location.hash === '#'))) {
    handleRoute();
  } else {
    window.location.hash = target;
  }
}

function handleRoute() {
  const hash = window.location.hash;
  const views = document.querySelectorAll('.view');
  const navbar = document.getElementById('navbar');
  const bgAnimated = document.getElementById('bgAnimated');

  views.forEach(v => v.classList.remove('active'));

  if (hash.startsWith('#card/')) {
    const slug = hash.substring(6);
    loadPublicCard(slug);
    document.getElementById('card-view').classList.add('active');
    if (navbar) navbar.style.display = 'none';
    if (bgAnimated) bgAnimated.style.display = 'none';
  } else if (hash === '#auth') {
    if (!authToken) {
      document.getElementById('auth-view').classList.add('active');
    } else {
      navigateTo('dashboard');
      return;
    }
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    updateNavAuth();
  } else if (hash === '#dashboard') {
    if (!authToken) { navigateTo('auth'); return; }
    document.getElementById('dashboard-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    loadDashboard();
    updateNavAuth();
  } else if (hash === '#builder') {
    if (!authToken) { navigateTo('auth'); return; }
    document.getElementById('builder-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    updateNavAuth();
  } else if (hash === '#contacts') {
    if (!authToken) { navigateTo('auth'); return; }
    document.getElementById('contacts-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    updateNavAuth();
  } else {
    if (authToken) {
      document.getElementById('dashboard-view').classList.add('active');
      if (navbar) navbar.style.display = '';
      if (bgAnimated) bgAnimated.style.display = '';
      loadDashboard();
      updateNavAuth();
      return;
    }
    document.getElementById('landing-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    document.title = 'CardLink — Cartão de Visita Digital';
    updateNavAuth();
  }

  window.scrollTo(0, 0);
}

// ============================================
// Navbar CTA
// ============================================
function handleHeroCta() {
  if (authToken) {
    openMyCardEditor();
  } else {
    navigateTo('auth');
    toggleAuthForm('register');
  }
}

function openMyCardEditor() {
  if (currentUserCardId) {
    editCard(currentUserCardId);
  } else {
    createNewCard();
  }
}

function updateNavAuth() {
  const navCta = document.getElementById('nav-cta');
  if (!navCta) return;
  if (authToken && currentUser) {
    const editBtnText = currentUserCardId ? '✏️ Editar Cartão' : '✨ Criar Cartão';
    navCta.innerHTML = `
      <span style="color:var(--text-secondary);font-size:0.85rem;" class="hide-mobile">Olá, ${escapeHtml(currentUser.name)}</span>
      <button class="btn btn-primary btn-sm" onclick="openMyCardEditor()">${editBtnText}</button>
      <button class="btn btn-secondary btn-sm" onclick="navigateTo('dashboard')">📊 Painel</button>
      <button class="btn btn-secondary btn-sm" onclick="handleLogout()">Sair</button>
    `;
  } else {
    navCta.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="navigateTo('auth'); toggleAuthForm('login');">🔑 Entrar</button>
      <button class="btn btn-primary btn-sm" onclick="navigateTo('auth'); toggleAuthForm('register');">✨ Criar Conta</button>
    `;
  }
}

// ============================================
// App Init
// ============================================
window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', async () => {
  if (authToken) {
    try {
      currentUser = await api('/auth/me');
      const summary = await api('/cards/stats/summary');
      if (summary && summary.hasCard && summary.card) {
        currentUserCardId = summary.card.id;
      }
    } catch (e) {
      authToken = null;
      currentUser = null;
      sessionStorage.removeItem('cardlink_token');
    }
  }
  handleRoute();
  initIntersectionObserver();

  document.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('input', updatePreview);
  });
});

// ============================================
// Auth Forms
// ============================================
function toggleAuthForm(form) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  if (loginForm) loginForm.style.display = form === 'login' ? '' : 'none';
  if (registerForm) registerForm.style.display = form === 'register' ? '' : 'none';
}

async function handleLogin() {
  const emailEl = document.getElementById('login-email');
  const passwordEl = document.getElementById('login-password');
  if (!emailEl || !passwordEl) { showToast('❌', 'Formulário não encontrado'); return; }

  const email = emailEl.value.trim().toLowerCase();
  const password = passwordEl.value;

  if (!email || !email.includes('@')) { showToast('⚠️', 'Preencha um e-mail válido!'); return; }
  if (!password) { showToast('⚠️', 'Preencha a sua senha!'); return; }

  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    authToken = data.token;
    currentUser = data.user;
    sessionStorage.setItem('cardlink_token', data.token);
    showToast('✅', 'Login realizado!');

    const summary = await api('/cards/stats/summary').catch(() => ({ hasCard: false }));
    if (summary && summary.hasCard && summary.card) {
      currentUserCardId = summary.card.id;
      editCard(summary.card.id);
    } else {
      currentUserCardId = null;
      createNewCard();
    }
  } catch (err) {
    showToast('❌', err.message);
  }
}

async function handleRegister() {
  const nameEl = document.getElementById('register-name');
  const emailEl = document.getElementById('register-email');
  const passwordEl = document.getElementById('register-password');
  if (!nameEl || !emailEl || !passwordEl) { showToast('❌', 'Formulário não encontrado'); return; }

  const name = nameEl.value.trim();
  const email = emailEl.value.trim().toLowerCase();
  const password = passwordEl.value;

  if (!name) { showToast('⚠️', 'Preencha o seu nome!'); return; }
  if (!email || !email.includes('@')) { showToast('⚠️', 'Preencha um e-mail válido!'); return; }
  if (!password || password.length < 8) { showToast('⚠️', 'Senha deve ter pelo menos 8 caracteres'); return; }

  try {
    const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    authToken = data.token;
    currentUser = data.user;
    sessionStorage.setItem('cardlink_token', data.token);
    showToast('✅', 'Conta criada com sucesso!');
    currentUserCardId = null;
    createNewCard();
  } catch (err) {
    showToast('❌', err.message);
  }
}

function handleLogout() {
  authToken = null;
  currentUser = null;
  currentUserCardId = null;
  sessionStorage.removeItem('cardlink_token');
  showToast('👋', 'Você saiu da conta');
  navigateTo('home');
}

// ============================================
// Dashboard
// ============================================
async function loadDashboard() {
  const content = document.getElementById('dashboard-content');
  if (!content) return;

  try {
    if (!currentUser && authToken) {
      currentUser = await api('/auth/me');
    }

    const userName = currentUser ? currentUser.name : 'Usuário';
    const data = await api('/cards/stats/summary');

    if (!data.hasCard) {
      currentUserCardId = null;
      content.innerHTML = `
        <div style="text-align:center;padding:var(--space-4xl) 0;">
          <div style="font-size:4rem;margin-bottom:var(--space-lg);">💳</div>
          <h1 style="font-family:var(--font-display);font-weight:800;font-size:1.8rem;margin-bottom:var(--space-sm);">
            Bem-vindo, <span class="text-gradient">${escapeHtml(userName)}</span>!
          </h1>
          <p style="color:var(--text-secondary);font-size:1.1rem;margin-bottom:var(--space-2xl);max-width:400px;margin-left:auto;margin-right:auto;">
            Crie seu cartão de visita digital para compartilhar com seus contatos.
          </p>
          <button class="btn btn-primary btn-lg" onclick="createNewCard()">✨ Cartão</button>
        </div>`;
      updateNavAuth();
      return;
    }

    const card = data.card;
    currentUserCardId = card.id;
    updateNavAuth();

    const stats = data.stats;
    const initials = (card.name || 'C').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const cardLink = window.location.origin + '/#card/' + card.slug;
    const recentContacts = stats.recentContacts || [];

    content.innerHTML = `
      <div class="dashboard-header">
        <div>
          <h1 class="builder-title">Meu <span class="text-gradient">Cartão</span></h1>
          <p class="builder-subtitle">Olá, ${escapeHtml(userName)}! Gerencie seu cartão digital.</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👁️</div>
          <div class="stat-value">${stats.views}</div>
          <div class="stat-label">Visualizações</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📩</div>
          <div class="stat-value">${stats.contacts}</div>
          <div class="stat-label">Contatos Recebidos</div>
        </div>
        <div class="stat-card" onclick="window.open('/site/${escapeHtml(card.slug)}', '_blank')" style="cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor=''">
          <div class="stat-icon">🌐</div>
          <div class="stat-value" style="font-size:1rem;">Ver</div>
          <div class="stat-label">Landing Page</div>
        </div>
      </div>

      <div class="dash-card-full">
        <div class="dash-card-full-header">
          <div class="dash-card-avatar" style="width:56px;height:56px;font-size:1.4rem;">
            ${card.photo_url ? `<img src="${escapeHtml(card.photo_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='${initials}'">` : initials}
          </div>
          <div style="flex:1;">
            <div class="dash-card-name" style="font-size:1.2rem;">${escapeHtml(card.name)}</div>
            <div class="dash-card-slug">${card.title ? escapeHtml(card.title) + ' · ' : ''}${card.business ? escapeHtml(card.business) : 'Cartão Digital'}</div>
          </div>
          <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" onclick="editCard(${card.id})">✏️ Editar</button>
            <a class="btn btn-primary btn-sm" href="/site/${escapeHtml(card.slug)}" target="_blank" rel="noopener">🌐 Landing Page</a>
            <button class="btn btn-outline btn-sm" onclick="copyToClipboard('${escapeHtml(cardLink)}')">📋 Copiar Link</button>
          </div>
        </div>

        <div class="dash-card-mini-preview" id="dash-mini-preview"></div>

        <div class="dash-card-actions-bar">
          <button class="btn btn-secondary btn-sm" onclick="shareCard('${escapeHtml(card.slug)}')">📤 Compartilhar</button>
          <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${window.location.origin}/site/${escapeHtml(card.slug)}')">🌐 Copiar Link Landing</button>
          <button class="btn btn-secondary btn-sm" onclick="viewContacts(${card.id}, '${escapeHtml(card.name)}')">📩 Contatos (${stats.contacts})</button>
          <button class="btn btn-outline btn-sm" style="color:#ef4444;border-color:rgba(239,68,68,0.3);" onclick="deleteCard(${card.id})">🗑️ Excluir</button>
        </div>
      </div>

      ${recentContacts.length > 0 ? `
        <div style="margin-top:var(--space-xl);">
          <h3 style="font-family:var(--font-display);font-weight:700;margin-bottom:var(--space-md);">📩 Últimos Contatos</h3>
          <div class="contacts-list">
            ${recentContacts.map(c => {
              const date = new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
              return `
                <div class="contact-item">
                  <div class="contact-item-header">
                    <div class="contact-item-name">${escapeHtml(c.name)}</div>
                    <div class="contact-item-date">${date}</div>
                  </div>
                  <div class="contact-item-details">
                    ${c.email ? `<span>📧 ${escapeHtml(c.email)}</span>` : ''}
                    ${c.phone ? `<span>📞 ${escapeHtml(c.phone)}</span>` : ''}
                  </div>
                  ${c.message ? `<div class="contact-item-message">${escapeHtml(c.message)}</div>` : ''}
                </div>`;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;

    const miniPreview = document.getElementById('dash-mini-preview');
    if (miniPreview) {
      miniPreview.innerHTML = `<div style="max-width:320px;margin:0 auto;">${renderCard(card, true)}</div>`;
    }

  } catch (err) {
    content.innerHTML = `<p style="color:#ef4444;text-align:center;padding:var(--space-xl);">Erro ao carregar: ${err.message}</p>`;
  }
}

// ============================================
// Card CRUD
// ============================================
function createNewCard() {
  try {
    editingCardId = null;
    ['field-name','field-business','field-title','field-photo','field-description',
     'field-message','field-phone','field-email','field-address','field-whatsapp',
     'field-whatsapp-group','field-instagram','field-facebook','field-linkedin',
     'field-tiktok','field-youtube','field-twitter','field-site-button','field-gallery'
    ].forEach(id => setFieldValue(id, ''));

    const prodContainer = document.getElementById('builder-products-container');
    if (prodContainer) prodContainer.innerHTML = '';
    const testContainer = document.getElementById('builder-testimonials-container');
    if (testContainer) testContainer.innerHTML = '';
    loadGalleryFromUrls([]);

    const photoImg = document.getElementById('photo-preview-img');
    const photoPlaceholder = document.getElementById('photo-placeholder');
    if (photoImg) photoImg.style.display = 'none';
    if (photoPlaceholder) photoPlaceholder.style.display = '';

    selectTheme('midnight');
    updatePreview();
  } catch (err) {
    console.error('createNewCard error:', err);
  } finally {
    navigateTo('builder');
  }
}

async function editCard(id) {
  navigateTo('builder');
  try {
    const card = await api('/cards/' + id);
    editingCardId = id;

    setFieldValue('field-name', card.name || '');
    setFieldValue('field-business', card.business || '');
    setFieldValue('field-title', card.title || '');
    setFieldValue('field-photo', card.photo_url || '');
    setFieldValue('field-description', card.description || '');
    setFieldValue('field-message', card.message || '');
    setFieldValue('field-phone', card.phone || '');
    setFieldValue('field-email', card.email || '');
    setFieldValue('field-address', card.address || '');
    setFieldValue('field-whatsapp', card.whatsapp || '');
    setFieldValue('field-whatsapp-group', card.whatsapp_group || '');
    setFieldValue('field-instagram', card.instagram || '');
    setFieldValue('field-facebook', card.facebook || '');
    setFieldValue('field-linkedin', card.linkedin || '');
    setFieldValue('field-tiktok', card.tiktok || '');
    setFieldValue('field-youtube', card.youtube || '');
    setFieldValue('field-twitter', card.twitter || '');
    setFieldValue('field-site-button', card.site_button_text || '');
    setFieldValue('field-gallery', (card.gallery || []).join('\n'));
    loadGalleryFromUrls(card.gallery || []);

    const prodContainer = document.getElementById('builder-products-container');
    if (prodContainer) {
      prodContainer.innerHTML = '';
      (card.products || []).forEach(p => addProductRow(p));
    }
    const testContainer = document.getElementById('builder-testimonials-container');
    if (testContainer) {
      testContainer.innerHTML = '';
      (card.testimonials || []).forEach(t => addTestimonialRow(t));
    }

    const photoImg = document.getElementById('photo-preview-img');
    const photoPlaceholder = document.getElementById('photo-placeholder');
    if (photoImg && photoPlaceholder) {
      if (card.photo_url) {
        photoImg.src = card.photo_url;
        photoImg.style.display = '';
        photoPlaceholder.style.display = 'none';
      } else {
        photoImg.style.display = 'none';
        photoPlaceholder.style.display = '';
      }
    }

    selectTheme(card.theme || 'midnight');
    updatePreview();
  } catch (err) {
    console.error('editCard error:', err);
    showToast('❌', err.message);
  }
}

async function deleteCard(id) {
  if (!confirm('Tem certeza que deseja excluir este cartão?')) return;
  try {
    await api('/cards/' + id, { method: 'DELETE' });
    currentUserCardId = null;
    showToast('✅', 'Cartão excluído!');
    navigateTo('dashboard');
  } catch (err) {
    showToast('❌', err.message);
  }
}

// ============================================
// Dynamic Builder Rows
// ============================================
let productCounter = 0;
function addProductRow(data = {}) {
  const container = document.getElementById('builder-products-container');
  if (!container) return;
  const id = ++productCounter;
  const div = document.createElement('div');
  div.className = 'builder-item-row';
  div.id = `product-row-${id}`;
  div.innerHTML = `
    <button type="button" class="btn-remove-item" onclick="document.getElementById('product-row-${id}').remove(); updatePreview();">✕ Remover</button>
    <div class="form-row">
      <div class="form-group" style="flex:2;">
        <label class="form-label">Nome do Produto/Serviço</label>
        <input class="form-input product-name-input" type="text" placeholder="Ex: Corte de Cabelo" value="${escapeHtml(data.name || '')}">
      </div>
      <div class="form-group" style="flex:1;">
        <label class="form-label">Preço (R$)</label>
        <input class="form-input product-price-input" type="text" placeholder="Ex: 45,00" value="${escapeHtml(data.price || '')}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Foto do Produto</label>
      <div style="display:flex;align-items:center;gap:12px;">
        ${data.photo_url
          ? `<img id="product-photo-preview-${id}" src="${escapeHtml(data.photo_url)}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0;">`
          : `<img id="product-photo-preview-${id}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0;display:none;">`}
        <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('product-file-${id}').click()">
          📷 Escolher Foto
        </button>
        <input type="file" id="product-file-${id}" accept="image/*" style="display:none;"
          onchange="handleProductPhotoUpload(this, ${id})">
        <input type="hidden" class="product-photo-input" id="product-photo-url-${id}" value="${escapeHtml(data.photo_url || '')}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrição Curta</label>
      <input class="form-input product-desc-input" type="text" placeholder="Breve descrição" value="${escapeHtml(data.description || '')}">
    </div>
  `;
  container.appendChild(div);
  div.querySelectorAll('input:not([type=file]):not([type=hidden])').forEach(inp => inp.addEventListener('input', updatePreview));
  updatePreview();
}


let testimonialCounter = 0;
function addTestimonialRow(data = {}) {
  const container = document.getElementById('builder-testimonials-container');
  if (!container) return;
  const id = ++testimonialCounter;
  const div = document.createElement('div');
  div.className = 'builder-item-row';
  div.id = `testimonial-row-${id}`;
  div.innerHTML = `
    <button type="button" class="btn-remove-item" onclick="document.getElementById('testimonial-row-${id}').remove(); updatePreview();">✕ Remover</button>
    <div class="form-row">
      <div class="form-group" style="flex:2;">
        <label class="form-label">Nome do Cliente</label>
        <input class="form-input testimonial-name-input" type="text" placeholder="Ex: Maria Santos" value="${escapeHtml(data.name || '')}">
      </div>
      <div class="form-group" style="flex:1;">
        <label class="form-label">Estrelas (1-5)</label>
        <input class="form-input testimonial-stars-input" type="number" min="1" max="5" placeholder="5" value="${data.stars || 5}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Depoimento</label>
      <textarea class="form-input testimonial-comment-input" placeholder="Ex: Excelente atendimento!" rows="2">${escapeHtml(data.comment || '')}</textarea>
    </div>
  `;
  container.appendChild(div);
  div.querySelectorAll('input, textarea').forEach(inp => inp.addEventListener('input', updatePreview));
  updatePreview();
}

// ============================================
// Builder — Get Form Data
// ============================================
function getFormData() {
  const data = {};
  document.querySelectorAll('[data-field]').forEach(input => {
    const value = input.value.trim();
    if (value) data[input.dataset.field] = value;
  });
  data.theme = currentTheme;

  const products = [];
  document.querySelectorAll('#builder-products-container .builder-item-row').forEach(row => {
    const name = row.querySelector('.product-name-input')?.value.trim();
    const price = row.querySelector('.product-price-input')?.value.trim();
    const photo_url = row.querySelector('.product-photo-input')?.value.trim();
    const description = row.querySelector('.product-desc-input')?.value.trim();
    if (name) products.push({ name, price, photo_url, description });
  });
  data.products = products;

  const galleryVal = document.getElementById('field-gallery')?.value || '';
  data.gallery = galleryVal.split('\n').map(u => u.trim()).filter(u => u.length > 0);

  const testimonials = [];
  document.querySelectorAll('#builder-testimonials-container .builder-item-row').forEach(row => {
    const name = row.querySelector('.testimonial-name-input')?.value.trim();
    const stars = Number(row.querySelector('.testimonial-stars-input')?.value || 5);
    const comment = row.querySelector('.testimonial-comment-input')?.value.trim();
    if (name) testimonials.push({ name, stars, comment });
  });
  data.testimonials = testimonials;

  return data;
}

async function saveCard() {
  const data = getFormData();
  if (!data.name) {
    showToast('⚠️', 'Preencha pelo menos o nome!');
    document.getElementById('field-name').focus();
    return;
  }

  const btn = document.getElementById('generate-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Salvando...'; }

  try {
    if (editingCardId) {
      await api('/cards/' + editingCardId, { method: 'PUT', body: JSON.stringify(data) });
      showToast('✅', 'Cartão atualizado!');
    } else {
      const card = await api('/cards', { method: 'POST', body: JSON.stringify(data) });
      currentUserCardId = card.id;
      editingCardId = card.id;
      showToast('✅', 'Cartão criado com sucesso!');
    }
    navigateTo('dashboard');
  } catch (err) {
    showToast('❌', err.message || 'Erro ao salvar');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Salvar Cartão'; }
  }
}

// ============================================
// Theme
// ============================================
function selectTheme(theme) {
  currentTheme = theme;
  document.querySelectorAll('.theme-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.theme === theme);
  });
  const previewCard = document.getElementById('preview-card');
  if (previewCard) previewCard.setAttribute('data-theme', theme);
  updatePreview();
}

// ============================================
// Live Preview
// ============================================
function updatePreview() {
  const previewEl = document.getElementById('preview-card');
  if (previewEl) {
    const data = getFormData();
    previewEl.innerHTML = renderCard(data, true);
    previewEl.setAttribute('data-theme', currentTheme);
  }
}

// ============================================
// Public Card View
// ============================================
async function loadPublicCard(slug) {
  const rendered = document.getElementById('rendered-card');
  if (!rendered) return;
  rendered.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:var(--space-3xl);">Carregando cartão...</p>';

  try {
    const card = await api('/public/' + slug);
    const fullpage = document.getElementById('cardFullpage');
    if (fullpage) fullpage.setAttribute('data-theme', card.theme || 'midnight');
    document.title = `${card.name} — CardLink`;

    rendered.innerHTML = renderCard(card, false);

    const qrImg = document.getElementById('qrCodeImg');
    if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(window.location.href)}&bgcolor=ffffff&color=000000`;

    const existingFab = document.querySelector('.fab-whatsapp');
    if (existingFab) existingFab.remove();
    if (card.whatsapp) {
      const fab = document.createElement('a');
      fab.className = 'fab-whatsapp';
      fab.href = `https://wa.me/${cleanWhatsapp(card.whatsapp)}`;
      fab.target = '_blank';
      fab.rel = 'noopener';
      fab.innerHTML = '💬';
      fab.title = 'Conversar no WhatsApp';
      document.body.appendChild(fab);
    }

    const editBtn = document.getElementById('edit-card-btn');
    const dashBtn = document.getElementById('dashboard-card-btn');
    if (editBtn && dashBtn) {
      if (authToken && currentUser && card.user_id === currentUser.id) {
        editBtn.style.display = '';
        editBtn.setAttribute('onclick', `editCard(${card.id})`);
        dashBtn.style.display = '';
      } else {
        editBtn.style.display = 'none';
        dashBtn.style.display = 'none';
      }
    }

    initAiChatWidget(slug, card.name || 'Profissional');
  } catch (err) {

    rendered.innerHTML = '<p style="text-align:center;color:#ef4444;padding:var(--space-3xl);">Cartão não encontrado</p>';
  }
}

// ============================================
// Card Render
// ============================================
function renderCard(data, isPreview) {
  const name        = data.name || 'Seu Nome';
  const business    = data.business || '';
  const title       = data.title || '';
  const phone       = data.phone || '';
  const whatsapp    = data.whatsapp || '';
  const email       = data.email || '';
  const address     = data.address || '';
  const description = data.description || '';
  const message     = data.message || '';
  const photo       = data.photo_url || '';
  const instagram   = data.instagram || '';
  const facebook    = data.facebook || '';
  const linkedin    = data.linkedin || '';
  const tiktok      = data.tiktok || '';
  const youtube     = data.youtube || '';
  const twitter     = data.twitter || '';
  const whatsappGroup = data.whatsapp_group || '';
  const theme       = data.theme || 'midnight';

  const initials = (name.split(' ').map(w => w[0]).join('').substring(0, 2) || 'C').toUpperCase();
  const avatarContent = photo
    ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" onerror="this.parentElement.textContent='${initials}'">`
    : initials;

  let contactButtons = '';
  if (phone)    contactButtons += `<a href="tel:${escapeHtml(phone)}" class="card-contact-btn"><span class="icon">📞</span><span>Ligar</span></a>`;
  if (email)    contactButtons += `<a href="mailto:${escapeHtml(email)}" class="card-contact-btn"><span class="icon">📧</span><span>Email</span></a>`;
  if (whatsapp) contactButtons += `<a href="https://wa.me/${cleanWhatsapp(whatsapp)}" target="_blank" rel="noopener" class="card-contact-btn"><span class="icon">💬</span><span>WhatsApp</span></a>`;
  if (address)  contactButtons += `<a href="https://www.google.com/maps/search/${encodeURIComponent(address)}" target="_blank" rel="noopener" class="card-contact-btn"><span class="icon">📍</span><span>Mapa</span></a>`;

  const socials = [
    { key: instagram, icon: '📷', label: 'Instagram', url: v => v.startsWith('@') ? `https://instagram.com/${v.substring(1)}` : v.includes('instagram.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://instagram.com/${v}` },
    { key: facebook,  icon: '📘', label: 'Facebook',  url: v => v.includes('facebook.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://facebook.com/${v}` },
    { key: linkedin,  icon: '💼', label: 'LinkedIn',  url: v => v.includes('linkedin.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://linkedin.com/in/${v}` },
    { key: tiktok,    icon: '🎵', label: 'TikTok',    url: v => v.startsWith('@') ? `https://tiktok.com/${v}` : v.includes('tiktok.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://tiktok.com/@${v}` },
    { key: youtube,   icon: '▶️', label: 'YouTube',   url: v => v.includes('youtube.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://youtube.com/@${v}` },
    { key: twitter,   icon: '✖️', label: 'X',         url: v => v.startsWith('@') ? `https://x.com/${v.substring(1)}` : v.includes('x.com') || v.includes('twitter.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://x.com/${v}` },
  ];
  let socialButtons = '';
  socials.forEach(s => { if (s.key) socialButtons += `<a href="${s.url(s.key)}" target="_blank" rel="noopener" class="card-social-btn" title="${s.label}">${s.icon}</a>`; });

  let whatsappSection = '';
  if (whatsapp || whatsappGroup) {
    whatsappSection = '<div class="card-whatsapp-section">';
    if (whatsapp)      whatsappSection += `<a href="https://wa.me/${cleanWhatsapp(whatsapp)}" target="_blank" rel="noopener" class="btn btn-whatsapp">💬 Conversar no WhatsApp</a>`;
    if (whatsappGroup) whatsappSection += `<a href="${escapeHtml(whatsappGroup)}" target="_blank" rel="noopener" class="btn btn-whatsapp-group">👥 Entrar no Grupo WhatsApp</a>`;
    whatsappSection += '</div>';
  }

  const addressHtml = address
    ? `<a href="https://www.google.com/maps/search/${encodeURIComponent(address)}" target="_blank" rel="noopener" class="card-address">📍 ${escapeHtml(address)}</a>`
    : '';

  // Site / Landing Page section
  const siteBtnText    = data.site_button_text || 'Ver mais informações';
  const hasProducts    = data.products    && data.products.length    > 0;
  const hasGallery     = data.gallery     && data.gallery.length     > 0;
  const hasTestimonials= data.testimonials&& data.testimonials.length> 0;
  const hasSiteContent = hasProducts || hasGallery || hasTestimonials;

  let siteToggleButton = '';
  let siteExpandedContent = '';

  if (hasSiteContent) {
    siteToggleButton = `
      <button type="button" class="btn-site-toggle" onclick="toggleSiteSection()">
        📋 ${escapeHtml(siteBtnText)} ↓
      </button>`;

    let productsHtml = '';
    if (hasProducts) {
      productsHtml = `<div class="site-block-title">🛍️ Produtos & Serviços</div><div class="products-grid">`;
      data.products.forEach(p => {
        const waMsg = encodeURIComponent(`Olá! Gostaria de encomendar: ${p.name}${p.price ? ' (R$ ' + p.price + ')' : ''}`);
        const waUrl = whatsapp ? `https://wa.me/${cleanWhatsapp(whatsapp)}?text=${waMsg}` : '#';
        productsHtml += `
          <div class="product-card">
            ${p.photo_url ? `<img src="${escapeHtml(p.photo_url)}" class="product-img" alt="${escapeHtml(p.name)}" onerror="this.style.display='none'">` : ''}
            <div class="product-info">
              <div class="product-name">${escapeHtml(p.name)}</div>
              ${p.description ? `<div class="product-desc">${escapeHtml(p.description)}</div>` : ''}
              ${p.price ? `<div class="product-price">R$ ${escapeHtml(p.price)}</div>` : ''}
              ${whatsapp ? `<a href="${waUrl}" target="_blank" rel="noopener" class="btn-product-order">🛒 Encomendar</a>` : ''}
            </div>
          </div>`;
      });
      productsHtml += '</div>';
    }

    let galleryHtml = '';
    if (hasGallery) {
      galleryHtml = `<div class="site-block-title">🖼️ Galeria de Fotos</div><div class="gallery-grid">`;
      data.gallery.forEach(imgUrl => { galleryHtml += `<img src="${escapeHtml(imgUrl)}" class="gallery-img" alt="Foto" onerror="this.style.display='none'">`; });
      galleryHtml += '</div>';
    }

    let testimonialsHtml = '';
    if (hasTestimonials) {
      testimonialsHtml = `<div class="site-block-title">⭐ Avaliações de Clientes</div><div class="testimonials-grid">`;
      data.testimonials.forEach(t => {
        const n = Math.min(5, Math.max(1, t.stars || 5));
        const stars = '★'.repeat(n) + '☆'.repeat(5 - n);
        testimonialsHtml += `
          <div class="testimonial-card">
            <div class="testimonial-header">
              <div class="testimonial-author">${escapeHtml(t.name)}</div>
              <div class="testimonial-stars">${stars}</div>
            </div>
            ${t.comment ? `<div class="testimonial-comment">"${escapeHtml(t.comment)}"</div>` : ''}
          </div>`;
      });
      testimonialsHtml += '</div>';
    }

    siteExpandedContent = `
      <div class="site-expanded-section" id="site-expanded-section" style="${isPreview ? '' : 'display:none;'}">
        ${productsHtml}${galleryHtml}${testimonialsHtml}
      </div>`;
  }

  // Contact Form (public only)
  let contactForm = '';
  if (!isPreview && data.slug) {
    contactForm = `
      <div style="margin: 24px 0 16px; border-top: 1px solid rgba(255,255,255,0.1);"></div>
      <div class="card-form" id="contactFormSection" style="text-align:left;">
        <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:12px;text-align:center;color:var(--text-primary);">📩 Envie uma Mensagem</h3>
        <input class="form-input" type="text" id="contact-name" placeholder="Seu nome *" style="margin-bottom:8px;width:100%;">
        <input class="form-input" type="email" id="contact-email" placeholder="Seu email" style="margin-bottom:8px;width:100%;">
        <input class="form-input" type="tel" id="contact-phone" placeholder="Seu WhatsApp / Telefone" style="margin-bottom:8px;width:100%;">
        <textarea class="form-input" id="contact-message" placeholder="Sua mensagem..." rows="3" style="margin-bottom:12px;width:100%;"></textarea>
        <button class="btn btn-primary" style="width:100%;" onclick="submitContactForm('${escapeHtml(data.slug)}')">
          📤 Enviar Mensagem
        </button>
      </div>`;
  }

  return `
    <div class="card-container" data-theme="${theme}">
      <div class="card-cover">
        <div class="card-cover-brand">
          <div class="card-cover-logo">💳</div>
          ${business ? `<div class="card-cover-subtitle">${escapeHtml(business)}</div>` : ''}
        </div>
      </div>
      <div class="card-avatar-wrapper">
        <div class="card-avatar-icon">✨</div>
        <div class="card-avatar">${avatarContent}</div>
      </div>
      <div class="card-body">
        <div class="card-greeting">Olá! Eu sou</div>
        <h1 class="card-name">${escapeHtml(name)}</h1>
        ${title       ? `<div class="card-title">${escapeHtml(title)}</div>`             : ''}
        ${description ? `<p class="card-description">${escapeHtml(description)}</p>`     : ''}
        ${message     ? `<p class="card-message">${escapeHtml(message)}</p>`             : ''}
        ${contactButtons  ? `<div class="card-contact-grid">${contactButtons}</div>`      : ''}
        ${whatsappSection}
        ${socialButtons   ? `<div class="card-social-grid">${socialButtons}</div>`        : ''}
        ${addressHtml}
        ${address ? `<div class="card-map-card" style="margin-top:16px;"><div class="card-map-label">📍 Como chegar</div><a href="https://www.google.com/maps/search/${encodeURIComponent(address)}" target="_blank" rel="noopener" class="card-map-preview">Toque para abrir no Google Maps</a></div>` : ''}
        ${siteToggleButton}
        ${siteExpandedContent}
        ${contactForm}
      </div>
      <div class="card-footer">Feito com 💜 por <a href="${window.location.origin}">CardLink</a></div>
    </div>`;
}

function toggleSiteSection() {
  const section = document.getElementById('site-expanded-section');
  if (!section) return;
  const hidden = section.style.display === 'none';
  section.style.display = hidden ? 'block' : 'none';
  if (hidden) section.scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// Contact Form Submit
// ============================================
async function submitContactForm(slug) {
  const name    = document.getElementById('contact-name')?.value.trim();
  const email   = document.getElementById('contact-email')?.value.trim();
  const phone   = document.getElementById('contact-phone')?.value.trim();
  const message = document.getElementById('contact-message')?.value.trim();

  if (!name) { showToast('⚠️', 'Preencha seu nome!'); return; }

  try {
    await api('/public/' + slug + '/contact', { method: 'POST', body: JSON.stringify({ name, email, phone, message }) });
    const formSection = document.getElementById('contactFormSection');
    if (formSection) formSection.innerHTML = `
      <div class="form-success">
        <div class="check-icon">✅</div>
        <h4>Mensagem Enviada!</h4>
        <p>Seus dados foram registrados com sucesso.</p>
      </div>`;
    showToast('✅', 'Mensagem enviada com sucesso!');
  } catch (err) {
    showToast('❌', err.message);
  }
}

// ============================================
// Contacts View
// ============================================
async function viewContacts(cardId, cardName) {
  const nameEl = document.getElementById('contacts-card-name');
  const list   = document.getElementById('contacts-list');
  const count  = document.getElementById('contacts-count');
  if (nameEl) nameEl.textContent = cardName;
  if (list)   list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:var(--space-xl);">Carregando...</p>';
  navigateTo('contacts');

  try {
    const contacts = await api('/cards/' + cardId + '/contacts');
    if (count) count.textContent = `${contacts.length} contato${contacts.length !== 1 ? 's' : ''} recebido${contacts.length !== 1 ? 's' : ''}`;

    if (contacts.length === 0) {
      if (list) list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:var(--space-3xl);">Nenhum contato recebido ainda.</p>';
      return;
    }

    if (list) list.innerHTML = contacts.map(c => {
      const date = new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="contact-item">
          <div class="contact-item-header">
            <div class="contact-item-name">${escapeHtml(c.name)}</div>
            <div class="contact-item-date">${date}</div>
          </div>
          <div class="contact-item-details">
            ${c.email ? `<span>📧 ${escapeHtml(c.email)}</span>` : ''}
            ${c.phone ? `<span>📞 ${escapeHtml(c.phone)}</span>` : ''}
          </div>
          ${c.message ? `<div class="contact-item-message">${escapeHtml(c.message)}</div>` : ''}
        </div>`;
    }).join('');
  } catch (err) {
    if (list) list.innerHTML = `<p style="color:#ef4444;text-align:center;padding:var(--space-xl);">Erro: ${err.message}</p>`;
  }
}

// ============================================
// Image Resize (Canvas API — no library needed)
// ============================================
function resizeImage(file, maxDim = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Reduce if bigger than maxDim
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else { width = Math.round(width * maxDim / height); height = maxDim; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Falha ao processar imagem')); return; }
        resolve(new File([blob], 'foto.webp', { type: 'image/webp' }));
      }, 'image/webp', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
    img.src = url;
  });
}

async function uploadFile(file) {
  const resized = await resizeImage(file);
  const formData = new FormData();
  formData.append('photo', resized);
  const res = await fetch(API + '/upload', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + authToken },
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
  return data.url;
}

// ============================================
// Profile Photo Upload
// ============================================
async function handlePhotoUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const photoImg = document.getElementById('photo-preview-img');
  const photoPlaceholder = document.getElementById('photo-placeholder');

  // Show local preview immediately
  const localUrl = URL.createObjectURL(file);
  if (photoImg) { photoImg.src = localUrl; photoImg.style.display = ''; }
  if (photoPlaceholder) photoPlaceholder.style.display = 'none';
  showToast('⏳', 'Redimensionando e enviando...');

  try {
    const url = await uploadFile(file);
    document.getElementById('field-photo').value = url;
    showToast('✅', 'Foto enviada!');
    updatePreview();
  } catch (err) {
    showToast('❌', 'Erro: ' + err.message);
    if (photoImg) photoImg.style.display = 'none';
    if (photoPlaceholder) photoPlaceholder.style.display = '';
  }
}

// ============================================
// Product Photo Upload (per row)
// ============================================
async function handleProductPhotoUpload(input, rowId) {
  const file = input.files[0];
  if (!file) return;
  const preview = document.getElementById(`product-photo-preview-${rowId}`);
  const urlInput = document.getElementById(`product-photo-url-${rowId}`);

  if (preview) { preview.src = URL.createObjectURL(file); preview.style.display = ''; }
  showToast('⏳', 'Enviando foto do produto...');

  try {
    const url = await uploadFile(file);
    if (urlInput) urlInput.value = url;
    showToast('✅', 'Foto enviada!');
    updatePreview();
  } catch (err) {
    showToast('❌', 'Erro: ' + err.message);
  }
}

// ============================================
// Gallery Upload
// ============================================
let galleryUrls = [];

function syncGalleryField() {
  const hidden = document.getElementById('field-gallery');
  if (hidden) hidden.value = galleryUrls.join('\n');
  updatePreview();
}

function addGallerySlot(existingUrl = '') {
  const grid = document.getElementById('gallery-upload-grid');
  if (!grid) return;
  const idx = galleryUrls.length;
  galleryUrls.push(existingUrl);

  const slot = document.createElement('div');
  slot.id = `gallery-slot-${idx}`;
  slot.style.cssText = 'position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;background:var(--bg-card);border:1.5px dashed var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;';

  const hasImg = !!existingUrl;
  slot.innerHTML = `
    <input type="file" accept="image/*" style="display:none;" id="gallery-file-${idx}"
      onchange="handleGalleryPhotoUpload(this, ${idx})">
    ${hasImg
      ? `<img src="${escapeHtml(existingUrl)}" style="width:100%;height:100%;object-fit:cover;" id="gallery-img-${idx}">`
      : `<div id="gallery-placeholder-${idx}" style="text-align:center;color:var(--text-muted);font-size:0.78rem;padding:8px;">
           <div style="font-size:1.8rem;margin-bottom:4px;">📷</div>Adicionar
         </div>`}
    <button type="button" onclick="removeGallerySlot(${idx})"
      style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);border:none;color:#fff;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:0.7rem;display:flex;align-items:center;justify-content:center;">✕</button>
  `;

  slot.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') document.getElementById(`gallery-file-${idx}`).click();
  });

  grid.appendChild(slot);
  syncGalleryField();
}

async function handleGalleryPhotoUpload(input, idx) {
  const file = input.files[0];
  if (!file) return;

  const imgEl = document.getElementById(`gallery-img-${idx}`);
  const placeholder = document.getElementById(`gallery-placeholder-${idx}`);
  const slot = document.getElementById(`gallery-slot-${idx}`);

  // Local preview
  const localUrl = URL.createObjectURL(file);
  if (imgEl) {
    imgEl.src = localUrl;
  } else if (slot) {
    const newImg = document.createElement('img');
    newImg.id = `gallery-img-${idx}`;
    newImg.src = localUrl;
    newImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    if (placeholder) placeholder.style.display = 'none';
    slot.insertBefore(newImg, slot.firstChild);
  }
  showToast('⏳', 'Enviando foto...');

  try {
    const url = await uploadFile(file);
    galleryUrls[idx] = url;
    syncGalleryField();
    showToast('✅', 'Foto adicionada à galeria!');
  } catch (err) {
    showToast('❌', 'Erro: ' + err.message);
  }
}

function removeGallerySlot(idx) {
  const slot = document.getElementById(`gallery-slot-${idx}`);
  if (slot) slot.remove();
  galleryUrls[idx] = '';
  syncGalleryField();
}

function loadGalleryFromUrls(urls) {
  galleryUrls = [];
  const grid = document.getElementById('gallery-upload-grid');
  if (grid) grid.innerHTML = '';
  (urls || []).forEach(url => addGallerySlot(url));
}


// ============================================
// Intersection Observer
// ============================================
function initIntersectionObserver() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.style.animationPlayState = 'running'; observer.unobserve(entry.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.animate-in').forEach(el => { el.style.animationPlayState = 'paused'; observer.observe(el); });
}

// ============================================
// AI Generation (NVIDIA API & Skill Tones)
// ============================================
async function generateWithAI() {
  const profInput = document.getElementById('ai-profession');
  const skillSelect = document.getElementById('ai-skill');
  const btn = document.getElementById('ai-generate-btn');

  const profession = profInput?.value.trim();
  const skill = skillSelect?.value || 'vendedora';

  if (!profession) {
    showToast('⚠️', 'Digite sua profissão ou negócio!');
    if (profInput) profInput.focus();
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '🤖 IA gerando conteúdo...'; }
  showToast('⏳', 'IA gerando seu cartão e site...');

  try {
    const res = await api('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ profession, skill, mode: 'full' })
    });

    if (res.title) setFieldValue('field-title', res.title);
    if (res.description) setFieldValue('field-description', res.description);
    if (res.message) setFieldValue('field-message', res.message);
    if (res.site_button_text) setFieldValue('field-site-button', res.site_button_text);

    // Products / Services
    if (res.products && Array.isArray(res.products) && res.products.length > 0) {
      const prodContainer = document.getElementById('builder-products-container');
      if (prodContainer) {
        prodContainer.innerHTML = '';
        res.products.forEach(p => addProductRow(p));
      }
    }

    updatePreview();
    showToast('✨', 'Cartão e site preenchidos pela IA!');
  } catch (err) {
    showToast('❌', 'Erro na IA: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✨ Preencher Cartão & Site com IA'; }
  }
}

async function improveFieldWithAI(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  const currentText = input.value.trim();
  const profession = document.getElementById('ai-profession')?.value.trim() || document.getElementById('field-title')?.value.trim() || 'Profissional';
  const skill = document.getElementById('ai-skill')?.value || 'vendedora';

  if (!currentText) {
    showToast('⚠️', 'Digite algum texto no campo antes de melhorar!');
    input.focus();
    return;
  }

  showToast('⏳', 'Melhorando texto com IA...');

  try {
    const res = await api('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ profession, skill, mode: 'improve', textToImprove: currentText })
    });

    if (res.improvedText) {
      input.value = res.improvedText;
      updatePreview();
      showToast('✨', 'Texto melhorado com sucesso!');
    }
  } catch (err) {
    showToast('❌', 'Erro ao melhorar texto: ' + err.message);
  }
}

// ============================================
// Public AI Assistant Chat Widget
// ============================================
let chatHistory = [];
let currentSlugForChat = '';

function initAiChatWidget(slug, name) {
  currentSlugForChat = slug;
  chatHistory = [];
  if (document.getElementById('ai-chat-widget')) return;

  const container = document.createElement('div');
  container.id = 'ai-chat-widget';
  container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;font-family:system-ui,-apple-system,sans-serif;';

  container.innerHTML = `
    <button id="ai-chat-toggle-btn" onclick="toggleAiChatWindow()" style="background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:#fff;border:none;padding:12px 18px;border-radius:30px;font-weight:600;font-size:0.9rem;box-shadow:0 8px 24px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;gap:8px;transition:transform 0.2s;">
      <span>🤖</span> Chat com IA
    </button>
    <div id="ai-chat-window" style="display:none;position:absolute;bottom:60px;right:0;width:320px;max-width:calc(100vw - 32px);height:430px;background:rgba(15,23,42,0.96);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.15);border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.5);flex-direction:column;overflow:hidden;">
      <div style="background:linear-gradient(135deg,rgba(139,92,246,0.3),rgba(6,182,212,0.3));padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="display:flex;align-items:center;gap:8px;color:#fff;font-weight:600;font-size:0.9rem;">
          <span>🤖</span> Atendente de ${escapeHtml(name)}
        </div>
        <button onclick="toggleAiChatWindow()" style="background:none;border:none;color:#94a3b8;font-size:1.1rem;cursor:pointer;">✕</button>
      </div>
      <div id="ai-chat-messages" style="flex:1;padding:12px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;font-size:0.85rem;color:#e2e8f0;">
        <div style="background:rgba(255,255,255,0.08);padding:10px 12px;border-radius:12px 12px 12px 2px;max-width:85%;align-self:flex-start;line-height:1.4;">
          Olá! Sou o atendente virtual de ${escapeHtml(name)}. Como posso te ajudar hoje? 😊
        </div>
      </div>
      <div style="padding:10px;border-top:1px solid rgba(255,255,255,0.1);display:flex;gap:6px;background:rgba(0,0,0,0.2);">
        <input type="text" id="ai-chat-input" placeholder="Tire uma dúvida..." style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:8px 12px;color:#fff;font-size:0.85rem;outline:none;" onkeypress="if(event.key==='Enter') sendAiChatMessage()">
        <button onclick="sendAiChatMessage()" style="background:#8b5cf6;color:#fff;border:none;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.9rem;">➤</button>
      </div>
    </div>`;

  document.body.appendChild(container);
}

function toggleAiChatWindow() {
  const win = document.getElementById('ai-chat-window');
  if (!win) return;
  const isHidden = win.style.display === 'none';
  win.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) {
    const input = document.getElementById('ai-chat-input');
    if (input) input.focus();
  }
}

async function sendAiChatMessage() {
  const input = document.getElementById('ai-chat-input');
  const msgs = document.getElementById('ai-chat-messages');
  if (!input || !msgs) return;
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  const userBubble = document.createElement('div');
  userBubble.style.cssText = 'background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:#fff;padding:10px 12px;border-radius:12px 12px 2px 12px;max-width:85%;align-self:flex-end;line-height:1.4;word-break:break-word;';
  userBubble.textContent = text;
  msgs.appendChild(userBubble);
  msgs.scrollTop = msgs.scrollHeight;

  const typing = document.createElement('div');
  typing.id = 'ai-chat-typing';
  typing.style.cssText = 'background:rgba(255,255,255,0.08);padding:10px 12px;border-radius:12px 12px 12px 2px;max-width:85%;align-self:flex-start;color:#94a3b8;font-style:italic;';
  typing.textContent = '🤖 Digitando...';
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;

  try {
    const res = await fetch(`${API}/ai/public/${currentSlugForChat}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: chatHistory })
    });
    const data = await res.json();
    typing.remove();

    const replyText = data.reply || 'Como posso te ajudar hoje?';
    chatHistory.push({ sender: 'user', text });
    chatHistory.push({ sender: 'assistant', text: replyText });

    const aiBubble = document.createElement('div');
    aiBubble.style.cssText = 'background:rgba(255,255,255,0.08);padding:10px 12px;border-radius:12px 12px 12px 2px;max-width:85%;align-self:flex-start;line-height:1.4;word-break:break-word;white-space:pre-wrap;';
    aiBubble.textContent = replyText;
    msgs.appendChild(aiBubble);
    msgs.scrollTop = msgs.scrollHeight;
  } catch (err) {
    if (typing) typing.remove();
    const errBubble = document.createElement('div');
    errBubble.style.cssText = 'background:rgba(239,68,68,0.2);color:#fca5a5;padding:8px 12px;border-radius:8px;align-self:center;font-size:0.8rem;';
    errBubble.textContent = 'Erro ao enviar mensagem. Tente novamente.';
    msgs.appendChild(errBubble);
    msgs.scrollTop = msgs.scrollHeight;
  }
}

