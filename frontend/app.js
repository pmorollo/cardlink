/* ============================================
   CardLink — Application Logic (API Version)
   ============================================ */

const API = window.location.origin + '/api';

let authToken = localStorage.getItem('cardlink_token') || null;
let currentUser = null;
let currentTheme = 'midnight';
let editingCardId = null;

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
// Navigation / Routing
// ============================================
function navigateTo(route) {
  if (route === 'home') window.location.hash = '';
  else if (route === 'auth') window.location.hash = '#auth';
  else if (route === 'dashboard') window.location.hash = '#dashboard';
  else if (route === 'builder') window.location.hash = '#builder';
  else if (route === 'contacts') window.location.hash = '#contacts';
}

function handleRoute() {
  const hash = window.location.hash;
  const views = document.querySelectorAll('.view');
  const navbar = document.getElementById('navbar');
  const bgAnimated = document.getElementById('bgAnimated');
  const navCta = document.getElementById('nav-cta');

  views.forEach(v => v.classList.remove('active'));

  if (hash.startsWith('#card/')) {
    const slug = hash.substring(6);
    loadPublicCard(slug);
    document.getElementById('card-view').classList.add('active');
    navbar.style.display = 'none';
    bgAnimated.style.display = 'none';
  } else if (hash === '#auth') {
    if (!authToken) {
      document.getElementById('auth-view').classList.add('active');
    } else {
      navigateTo('dashboard');
      return;
    }
    navbar.style.display = '';
    bgAnimated.style.display = '';
    updateNavAuth();
  } else if (hash === '#dashboard') {
    if (!authToken) { navigateTo('auth'); return; }
    document.getElementById('dashboard-view').classList.add('active');
    navbar.style.display = '';
    bgAnimated.style.display = '';
    loadDashboard();
    updateNavAuth();
  } else if (hash === '#builder') {
    if (!authToken) { navigateTo('auth'); return; }
    document.getElementById('builder-view').classList.add('active');
    navbar.style.display = '';
    bgAnimated.style.display = '';
    updateNavAuth();
  } else if (hash === '#contacts') {
    if (!authToken) { navigateTo('auth'); return; }
    document.getElementById('contacts-view').classList.add('active');
    navbar.style.display = '';
    bgAnimated.style.display = '';
    updateNavAuth();
  } else {
    document.getElementById('landing-view').classList.add('active');
    navbar.style.display = '';
    bgAnimated.style.display = '';
    document.title = 'CardLink — Cartão de Visita Digital';
    updateNavAuth();
  }

  window.scrollTo(0, 0);
}

function updateNavAuth() {
  const navCta = document.getElementById('nav-cta');
  if (authToken && currentUser) {
    navCta.innerHTML = `
      <span style="color:var(--text-secondary);font-size:0.85rem;" class="hide-mobile">Olá, ${escapeHtml(currentUser.name)}</span>
      <button class="btn btn-secondary btn-sm" onclick="handleLogout()">Sair</button>
      <button class="btn btn-primary" onclick="navigateTo('dashboard')">Dashboard</button>
    `;
  } else {
    navCta.innerHTML = `
      <button class="btn btn-primary" onclick="navigateTo('auth')">
        ✨ <span class="hide-mobile">Criar Meu Cartão</span><span class="show-mobile" style="display:none;">Criar</span>
      </button>
    `;
  }
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', async () => {
  if (authToken) {
    try {
      currentUser = await api('/auth/me');
    } catch {
      authToken = null;
      localStorage.removeItem('cardlink_token');
    }
  }
  handleRoute();
  initIntersectionObserver();
});

// ============================================
// Auth
// ============================================
function toggleAuthForm(form) {
  document.getElementById('login-form').style.display = form === 'login' ? '' : 'none';
  document.getElementById('register-form').style.display = form === 'register' ? '' : 'none';
}

async function handleLogin() {
  const whatsapp = '+55' + document.getElementById('login-whatsapp').value.trim().replace(/\D/g, '');
  const password = document.getElementById('login-password').value;

  if (!whatsapp || whatsapp === '+55') {
    showToast('⚠️', 'Preencha o WhatsApp e a senha');
    return;
  }

  if (!password) {
    showToast('⚠️', 'Preencha a senha');
    return;
  }

  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ whatsapp, password })
    });
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('cardlink_token', data.token);
    showToast('✅', 'Login realizado com sucesso!');
    navigateTo('dashboard');
  } catch (err) {
    showToast('❌', err.message);
  }
}

async function handleRegister() {
  const name = document.getElementById('register-name').value.trim();
  const whatsapp = '+55' + document.getElementById('register-whatsapp').value.trim().replace(/\D/g, '');
  const password = document.getElementById('register-password').value;

  if (!name) {
    showToast('⚠️', 'Preencha o nome');
    return;
  }

  if (!whatsapp || whatsapp === '+55') {
    showToast('⚠️', 'Preencha o WhatsApp');
    return;
  }

  if (!password || password.length < 6) {
    showToast('⚠️', 'Senha deve ter pelo menos 6 caracteres');
    return;
  }

  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, whatsapp, password })
    });
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('cardlink_token', data.token);
    showToast('✅', 'Conta criada com sucesso!');
    navigateTo('dashboard');
  } catch (err) {
    showToast('❌', err.message);
  }
}

function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('cardlink_token');
  showToast('👋', 'Você saiu da conta');
  navigateTo('home');
}

// ============================================
// Dashboard (1 card per user)
// ============================================
async function loadDashboard() {
  const content = document.getElementById('dashboard-content');

  try {
    const data = await api('/cards/stats/summary');

    if (!data.hasCard) {
      content.innerHTML = `
        <div style="text-align:center;padding:var(--space-4xl) 0;">
          <div style="font-size:4rem;margin-bottom:var(--space-lg);">💳</div>
          <h1 style="font-family:var(--font-display);font-weight:800;font-size:1.8rem;margin-bottom:var(--space-sm);">
            Bem-vindo, <span class="text-gradient">${escapeHtml(currentUser.name)}</span>!
          </h1>
          <p style="color:var(--text-secondary);font-size:1.1rem;margin-bottom:var(--space-2xl);max-width:400px;margin-left:auto;margin-right:auto;">
            Crie seu cartão de visita digital para compartilhar com seus contatos.
          </p>
          <button class="btn btn-primary btn-lg" onclick="createNewCard()">✨ Criar Meu Cartão</button>
        </div>`;
      return;
    }

    const card = data.card;
    const stats = data.stats;
    const initials = card.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const cardLink = window.location.origin + '/#card/' + card.slug;
    const recentContacts = stats.recentContacts || [];

    content.innerHTML = `
      <div class="dashboard-header">
        <div>
          <h1 class="builder-title">Meu <span class="text-gradient">Cartão</span></h1>
          <p class="builder-subtitle">Olá, ${escapeHtml(currentUser.name)}! Gerencie seu cartão digital.</p>
        </div>
      </div>

      <!-- Stats -->
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
        <div class="stat-card">
          <div class="stat-icon">🔗</div>
          <div class="stat-value" style="font-size:0.9rem;">/${escapeHtml(card.slug)}</div>
          <div class="stat-label">Seu Link</div>
        </div>
      </div>

      <!-- Card Preview + Actions -->
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
            <button class="btn btn-outline btn-sm" onclick="copyToClipboard('${escapeHtml(cardLink)}')">📋 Copiar Link</button>
          </div>
        </div>

        <div class="dash-card-mini-preview" id="dash-mini-preview"></div>

        <div class="dash-card-actions-bar">
          <button class="btn btn-secondary btn-sm" onclick="shareCard('${escapeHtml(card.slug)}')">📤 Compartilhar</button>
          <button class="btn btn-secondary btn-sm" onclick="viewContacts(${card.id}, '${escapeHtml(card.name)}')">📩 Ver Contatos (${stats.contacts})</button>
          <button class="btn btn-outline btn-sm" style="color:#ef4444;border-color:rgba(239,68,68,0.3);" onclick="deleteCard(${card.id})">🗑️ Excluir</button>
        </div>
      </div>

      <!-- Recent Contacts -->
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
          ${stats.contacts > 5 ? `
            <div style="text-align:center;margin-top:var(--space-md);">
              <button class="btn btn-secondary btn-sm" onclick="viewContacts(${card.id}, '${escapeHtml(card.name)}')">Ver todos os contatos →</button>
            </div>
          ` : ''}
        </div>
      ` : ''}
    `;

    // Render mini card preview
    const miniPreview = document.getElementById('dash-mini-preview');
    if (miniPreview) {
      miniPreview.innerHTML = `<div style="max-width:320px;margin:0 auto;">${renderCard(card, true)}</div>`;
    }

  } catch (err) {
    content.innerHTML = `<p style="color:#ef4444;text-align:center;padding:var(--space-xl);">Erro ao carregar: ${err.message}</p>`;
  }
}

function createNewCard() {
  editingCardId = null;
  document.getElementById('field-name').value = '';
  document.getElementById('field-business').value = '';
  document.getElementById('field-title').value = '';
  document.getElementById('field-photo').value = '';
  document.getElementById('field-description').value = '';
  document.getElementById('field-phone').value = '';
  document.getElementById('field-email').value = '';
  document.getElementById('field-address').value = '';
  document.getElementById('field-whatsapp').value = '';
  document.getElementById('field-whatsapp-group').value = '';
  document.getElementById('field-instagram').value = '';
  document.getElementById('field-facebook').value = '';
  document.getElementById('field-linkedin').value = '';
  document.getElementById('field-tiktok').value = '';
  document.getElementById('field-youtube').value = '';
  document.getElementById('field-twitter').value = '';
  const photoImg = document.getElementById('photo-preview-img');
  const photoPlaceholder = document.getElementById('photo-placeholder');
  if (photoImg) photoImg.style.display = 'none';
  if (photoPlaceholder) photoPlaceholder.style.display = '';
  selectTheme('midnight');
  updatePreview();
  navigateTo('builder');
}

async function editCard(id) {
  try {
    const card = await api('/cards/' + id);
    editingCardId = id;

    document.getElementById('field-name').value = card.name || '';
    document.getElementById('field-business').value = card.business || '';
    document.getElementById('field-title').value = card.title || '';
    document.getElementById('field-photo').value = card.photo_url || '';
    document.getElementById('field-description').value = card.description || '';
    document.getElementById('field-phone').value = card.phone || '';
    document.getElementById('field-email').value = card.email || '';
    document.getElementById('field-address').value = card.address || '';
    document.getElementById('field-whatsapp').value = card.whatsapp || '';
    document.getElementById('field-whatsapp-group').value = card.whatsapp_group || '';
    document.getElementById('field-instagram').value = card.instagram || '';
    document.getElementById('field-facebook').value = card.facebook || '';
    document.getElementById('field-linkedin').value = card.linkedin || '';
    document.getElementById('field-tiktok').value = card.tiktok || '';
    document.getElementById('field-youtube').value = card.youtube || '';
    document.getElementById('field-twitter').value = card.twitter || '';

    const photoImg = document.getElementById('photo-preview-img');
    const photoPlaceholder = document.getElementById('photo-placeholder');
    if (card.photo_url) {
      photoImg.src = card.photo_url;
      photoImg.style.display = '';
      photoPlaceholder.style.display = 'none';
    } else {
      photoImg.style.display = 'none';
      photoPlaceholder.style.display = '';
    }

    selectTheme(card.theme || 'midnight');
    updatePreview();
    navigateTo('builder');
  } catch (err) {
    showToast('❌', err.message);
  }
}

async function deleteCard(id) {
  if (!confirm('Tem certeza que deseja excluir este cartão?')) return;
  try {
    await api('/cards/' + id, { method: 'DELETE' });
    showToast('✅', 'Cartão excluído!');
    loadDashboard();
  } catch (err) {
    showToast('❌', err.message);
  }
}

// ============================================
// Builder — Save
// ============================================
function getFormData() {
  const data = {};
  document.querySelectorAll('[data-field]').forEach(input => {
    const value = input.value.trim();
    if (value) data[input.dataset.field] = value;
  });
  data.theme = currentTheme;
  return data;
}

async function saveCard() {
  const data = getFormData();
  if (!data.name) {
    showToast('⚠️', 'Preencha pelo menos o nome!');
    document.getElementById('field-name').focus();
    return;
  }

  try {
    if (editingCardId) {
      await api('/cards/' + editingCardId, { method: 'PUT', body: JSON.stringify(data) });
      showToast('✅', 'Cartão atualizado!');
    } else {
      await api('/cards', { method: 'POST', body: JSON.stringify(data) });
      showToast('✅', 'Cartão criado com sucesso!');
    }
    navigateTo('dashboard');
  } catch (err) {
    showToast('❌', err.message);
  }
}

// ============================================
// Theme Selection
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
// Preview (Live)
// ============================================
function updatePreview() {
  const data = getFormData();
  const previewEl = document.getElementById('preview-card');
  if (previewEl) {
    previewEl.innerHTML = renderCard(data, true);
    previewEl.setAttribute('data-theme', currentTheme);
  }
}

// Listen for input changes to update preview
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('input', updatePreview);
  });
});

// ============================================
// Public Card View
// ============================================
async function loadPublicCard(slug) {
  const rendered = document.getElementById('rendered-card');
  rendered.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:var(--space-3xl);">Carregando cartão...</p>';

  try {
    const card = await api('/public/' + slug);
    const fullpage = document.getElementById('cardFullpage');
    fullpage.setAttribute('data-theme', card.theme || 'midnight');
    document.title = `${card.name} — CardLink`;

    rendered.innerHTML = renderCard(card, false);

    const qrImg = document.getElementById('qrCodeImg');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(window.location.href)}&bgcolor=ffffff&color=000000`;

    const existingFab = document.querySelector('.fab-whatsapp');
    if (existingFab) existingFab.remove();
    if (card.whatsapp) {
      const fab = document.createElement('a');
      fab.className = 'fab-whatsapp';
      fab.href = `https://wa.me/${card.whatsapp}`;
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
      } else if (authToken && !currentUser) {
        try {
          currentUser = await api('/auth/me');
          if (card.user_id === currentUser.id) {
            editBtn.style.display = '';
            editBtn.setAttribute('onclick', `editCard(${card.id})`);
            dashBtn.style.display = '';
          }
        } catch(e) {}
      } else {
        editBtn.style.display = 'none';
        dashBtn.style.display = 'none';
      }
    }
  } catch (err) {
    rendered.innerHTML = '<p style="text-align:center;color:#ef4444;padding:var(--space-3xl);">Cartão não encontrado</p>';
  }
}

// ============================================
// Card Rendering
// ============================================
function renderCard(data, isPreview = false) {
  const name = data.name || 'Seu Nome';
  const business = data.business || '';
  const title = data.title || '';
  const phone = data.phone || '';
  const whatsapp = data.whatsapp || '';
  const email = data.email || '';
  const address = data.address || '';
  const description = data.description || '';
  const photo = data.photo_url || '';
  const instagram = data.instagram || '';
  const facebook = data.facebook || '';
  const linkedin = data.linkedin || '';
  const tiktok = data.tiktok || '';
  const youtube = data.youtube || '';
  const twitter = data.twitter || '';
  const whatsappGroup = data.whatsapp_group || '';
  const theme = data.theme || 'midnight';

  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const avatarContent = photo
    ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" onerror="this.parentElement.textContent='${initials}'">`
    : initials;

  let contactButtons = '';
  if (phone) contactButtons += `<a href="tel:${escapeHtml(phone)}" class="card-contact-btn"><span class="icon">📞</span><span>Ligar</span></a>`;
  if (email) contactButtons += `<a href="mailto:${escapeHtml(email)}" class="card-contact-btn"><span class="icon">📧</span><span>Email</span></a>`;
  if (whatsapp) contactButtons += `<a href="https://wa.me/${escapeHtml(whatsapp)}" target="_blank" rel="noopener" class="card-contact-btn"><span class="icon">💬</span><span>WhatsApp</span></a>`;
  if (address) contactButtons += `<a href="https://www.google.com/maps/search/${encodeURIComponent(address)}" target="_blank" rel="noopener" class="card-contact-btn"><span class="icon">📍</span><span>Mapa</span></a>`;

  let socialButtons = '';
  const socials = [
    { key: instagram, icon: '📷', label: 'Instagram', url: v => v.startsWith('@') ? `https://instagram.com/${v.substring(1)}` : v.includes('instagram.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://instagram.com/${v}` },
    { key: facebook, icon: '📘', label: 'Facebook', url: v => v.includes('facebook.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://facebook.com/${v}` },
    { key: linkedin, icon: '💼', label: 'LinkedIn', url: v => v.includes('linkedin.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://linkedin.com/in/${v}` },
    { key: tiktok, icon: '🎵', label: 'TikTok', url: v => v.startsWith('@') ? `https://tiktok.com/${v}` : v.includes('tiktok.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://tiktok.com/@${v}` },
    { key: youtube, icon: '▶️', label: 'YouTube', url: v => v.includes('youtube.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://youtube.com/@${v}` },
    { key: twitter, icon: '✖️', label: 'X', url: v => v.startsWith('@') ? `https://x.com/${v.substring(1)}` : v.includes('x.com') || v.includes('twitter.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://x.com/${v}` },
  ];

  socials.forEach(s => {
    if (s.key) socialButtons += `<a href="${s.url(s.key)}" target="_blank" rel="noopener" class="card-social-btn" title="${s.label}">${s.icon}</a>`;
  });

  let whatsappSection = '';
  if (whatsapp || whatsappGroup) {
    whatsappSection = '<div class="card-whatsapp-section">';
    if (whatsapp) whatsappSection += `<a href="https://wa.me/${escapeHtml(whatsapp)}" target="_blank" rel="noopener" class="btn btn-whatsapp">💬 Conversar no WhatsApp</a>`;
    if (whatsappGroup) whatsappSection += `<a href="${escapeHtml(whatsappGroup)}" target="_blank" rel="noopener" class="btn btn-whatsapp-group">👥 Entrar no Grupo WhatsApp</a>`;
    whatsappSection += '</div>';
  }

  let addressHtml = '';
  if (address) addressHtml = `<a href="https://www.google.com/maps/search/${encodeURIComponent(address)}" target="_blank" rel="noopener" class="card-address">📍 ${escapeHtml(address)}</a>`;

  let contactForm = '';
  if (!isPreview) {
    const slug = data.slug || '';
    contactForm = `
      <div class="card-divider"></div>
      <div class="card-form" id="contactFormSection">
        <h3>📩 Envie uma Mensagem</h3>
        <input class="form-input" type="text" id="contact-name" placeholder="Seu nome" required>
        <input class="form-input" type="email" id="contact-email" placeholder="Seu email">
        <input class="form-input" type="tel" id="contact-phone" placeholder="Seu telefone">
        <textarea class="form-input" id="contact-message" placeholder="Sua mensagem..." rows="3"></textarea>
        <button class="btn btn-primary" onclick="submitContactForm('${escapeHtml(slug)}')">
          📤 Enviar Mensagem
        </button>
      </div>`;
  }

  return `
    <div class="card-container" data-theme="${theme}">
      <div class="card-cover"><div class="cover-pattern"></div></div>
      <div class="card-avatar-wrapper"><div class="card-avatar">${avatarContent}</div></div>
      <div class="card-body">
        <h1 class="card-name">${escapeHtml(name)}</h1>
        ${business ? `<div class="card-business">${escapeHtml(business)}</div>` : ''}
        ${title ? `<div class="card-title">${escapeHtml(title)}</div>` : ''}
        ${description ? `<p class="card-description">${escapeHtml(description)}</p>` : ''}
        ${contactButtons ? `<div class="card-contact-grid">${contactButtons}</div>` : ''}
        ${whatsappSection}
        ${socialButtons ? `<div class="card-social-grid">${socialButtons}</div>` : ''}
        ${addressHtml}
        ${contactForm}
      </div>
      <div class="card-footer">Feito com 💜 por <a href="${window.location.origin}">CardLink</a></div>
    </div>`;
}

// ============================================
// Contact Form
// ============================================
async function submitContactForm(slug) {
  const name = document.getElementById('contact-name').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const phone = document.getElementById('contact-phone').value.trim();
  const message = document.getElementById('contact-message').value.trim();

  if (!name) {
    showToast('⚠️', 'Preencha seu nome!');
    document.getElementById('contact-name').focus();
    return;
  }

  try {
    await api('/public/' + slug + '/contact', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, message })
    });

    const formSection = document.getElementById('contactFormSection');
    formSection.innerHTML = `
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
  document.getElementById('contacts-card-name').textContent = cardName;
  const list = document.getElementById('contacts-list');
  const count = document.getElementById('contacts-count');
  list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:var(--space-xl);">Carregando...</p>';
  navigateTo('contacts');

  try {
    const contacts = await api('/cards/' + cardId + '/contacts');
    count.textContent = `${contacts.length} contato${contacts.length !== 1 ? 's' : ''} recebido${contacts.length !== 1 ? 's' : ''}`;

    if (contacts.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:var(--space-3xl);">Nenhum contato recebido ainda.</p>';
      return;
    }

    list.innerHTML = contacts.map(c => {
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
    list.innerHTML = `<p style="color:#ef4444;text-align:center;padding:var(--space-xl);">Erro: ${err.message}</p>`;
  }
}

// ============================================
// Share / Copy
// ============================================
function copyCardLink() {
  copyToClipboard(window.location.href);
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('✅', 'Link copiado!');
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try { document.execCommand('copy'); showToast('✅', 'Link copiado!'); }
  catch (e) { showToast('❌', 'Não foi possível copiar.'); }
  document.body.removeChild(textarea);
}

function shareCard(slug) {
  const cardLink = window.location.origin + '/#card/' + slug;
  const title = 'Confira meu cartão de visita digital';
  if (navigator.share) {
    navigator.share({ title, url: cardLink }).catch(() => {});
  } else {
    copyToClipboard(cardLink);
  }
}

// ============================================
// Toast
// ============================================
let toastTimeout;
function showToast(icon, message) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-message').textContent = message;
  clearTimeout(toastTimeout);
  toast.classList.add('show');
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================
// Intersection Observer
// ============================================
function initIntersectionObserver() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-in').forEach(el => {
    el.style.animationPlayState = 'paused';
    observer.observe(el);
  });
}

// ============================================
// Photo Upload
// ============================================
async function handlePhotoUpload(input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('⚠️', 'Imagem muito grande (máx. 2MB)');
    return;
  }

  const photoImg = document.getElementById('photo-preview-img');
  const photoPlaceholder = document.getElementById('photo-placeholder');

  const localUrl = URL.createObjectURL(file);
  photoImg.src = localUrl;
  photoImg.style.display = '';
  photoPlaceholder.style.display = 'none';

  showToast('📤', 'Enviando imagem...');

  try {
    const formData = new FormData();
    formData.append('photo', file);

    const res = await fetch(API + '/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + authToken },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('field-photo').value = data.url;
    showToast('✅', 'Foto enviada com sucesso!');
    updatePreview();
  } catch (err) {
    showToast('❌', 'Erro ao enviar: ' + err.message);
    photoImg.style.display = 'none';
    photoPlaceholder.style.display = '';
  }
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
