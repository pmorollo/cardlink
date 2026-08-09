/* ============================================
   CardLink — Application Logic (Clean Rewrite v19)
   ============================================ */

const API = window.location.origin + '/api';

let authToken = localStorage.getItem('cardlink_token') || null;
let currentUser = null;
let currentTheme = 'midnight';
let editingCardId = null;
let currentUserCardId = null;
let activeSettingsSection = 'profile';
let settingsLoadInProgress = false;

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

function getPrimaryPublicUrl(slug) {
  const resolvedSlug = slug || (window.location.hash.startsWith('#card/') ? window.location.hash.substring(6) : '');
  return resolvedSlug ? `${window.location.origin}/site/${resolvedSlug}` : window.location.href;
}

function shareCard(slug) {
  const cardLink = getPrimaryPublicUrl(slug);
  if (navigator.share) {
    navigator.share({ title: 'Minha página profissional', url: cardLink }).catch(() => copyToClipboard(cardLink));
  } else {
    copyToClipboard(cardLink);
  }
}

function copyCardLink() { copyToClipboard(getPrimaryPublicUrl()); }

// ============================================
// Navigation / Routing
// ============================================
function navigateTo(route) {
  const map = { home: '', auth: '#auth', dashboard: '#dashboard', settings: '#settings', builder: '#settings', contacts: '#contacts', account: '#account', admin: '#admin' };
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
  } else if (hash === '#settings' || hash === '#builder') {
    if (!authToken) { navigateTo('auth'); return; }
    if (hash === '#builder') {
      window.location.hash = '#settings';
      return;
    }
    document.getElementById('builder-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    updateNavAuth();
    showSettingsSection(activeSettingsSection);
    if (currentUserCardId && editingCardId !== currentUserCardId && !settingsLoadInProgress) {
      editCard(currentUserCardId);
    }
  } else if (hash === '#contacts') {
    if (!authToken) { navigateTo('auth'); return; }
    document.getElementById('contacts-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    updateNavAuth();
  } else if (hash === '#account') {
    if (!authToken) { navigateTo('auth'); return; }
    document.getElementById('account-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    updateNavAuth();
    loadAccountView();
  } else if (hash === '#admin') {
    if (!authToken) { navigateTo('auth'); return; }
    if (!currentUser || !currentUser.is_admin) { navigateTo('dashboard'); return; }
    document.getElementById('admin-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    updateNavAuth();
    loadAdminDashboard();
  } else if (hash === '#/terms') {
    document.getElementById('terms-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    updateNavAuth();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (hash === '#/privacy') {
    document.getElementById('privacy-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    updateNavAuth();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    openPageSettings();
  } else {
    navigateTo('auth');
    toggleAuthForm('register');
  }
}

function openPageSettings(section = 'profile') {
  activeSettingsSection = section;
  if (currentUserCardId) {
    navigateTo('settings');
  } else {
    createNewCard();
  }
}

function toggleUserMenu(event) {
  if (event) event.stopPropagation();
  document.getElementById('user-menu')?.classList.toggle('open');
}

function closeUserMenu() {
  document.getElementById('user-menu')?.classList.remove('open');
}

document.addEventListener('click', closeUserMenu);

function updateNavAuth() {
  const navCta = document.getElementById('nav-cta');
  if (!navCta) return;
  if (authToken && currentUser) {
    const initials = (currentUser.name || 'U').split(' ').map(part => part[0]).join('').substring(0, 2).toUpperCase();
    navCta.innerHTML = `
      <div class="user-menu" id="user-menu" onclick="event.stopPropagation()">
        <button class="user-menu-trigger" type="button" onclick="toggleUserMenu(event)" aria-label="Abrir menu da conta">
          <span class="user-menu-avatar">${initials}</span>
          <span class="user-menu-name">${escapeHtml(currentUser.name)}</span>
          <span class="user-menu-chevron">⌄</span>
        </button>
        <div class="user-menu-dropdown">
          ${currentUser.is_admin ? `<button type="button" onclick="navigateTo('admin');closeUserMenu()" style="font-weight:bold;color:var(--purple);border-bottom:1.5px dashed var(--border-subtle);"><span style="display:flex;align-items:center;gap:6px;">👑 Painel Admin</span></button>` : ''}
          <button type="button" onclick="navigateTo('dashboard');closeUserMenu()"><span>Visão geral</span></button>
          <button type="button" onclick="openPageSettings();closeUserMenu()"><span>Configurações da página</span></button>
          ${currentUserCardId ? `<button type="button" onclick="viewContacts(${currentUserCardId}, 'Minha página');closeUserMenu()"><span>Contatos recebidos</span></button>` : ''}
          <button type="button" onclick="navigateTo('account');closeUserMenu()"><span>Minha conta</span></button>
          <div class="user-menu-divider"></div>
          <button type="button" class="danger" onclick="handleLogout()"><span>Sair</span></button>
        </div>
      </div>
    `;
  } else {
    navCta.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="navigateTo('auth'); toggleAuthForm('login');">🔑 Entrar</button>
      <button class="btn btn-primary btn-sm" onclick="navigateTo('auth'); toggleAuthForm('register');">✨ Criar Conta</button>
    `;
  }
}

// Captura vendedor/afiliado indicador da URL e salva na sessão
function captureReferral() {
  const urlParams = new URLSearchParams(window.location.search);
  let ref = urlParams.get('ref');
  
  if (!ref && window.location.hash.includes('?')) {
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
    ref = hashParams.get('ref');
  }
  
  if (ref) {
    sessionStorage.setItem('cardlink_ref', ref.trim().substring(0, 100));
  }
}

// ============================================
// App Init
// ============================================
window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', async () => {
  captureReferral();
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
      localStorage.removeItem('cardlink_token');
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
  const forgotForm = document.getElementById('forgot-form');

  if (loginForm) loginForm.style.display = form === 'login' ? '' : 'none';
  if (registerForm) registerForm.style.display = form === 'register' ? '' : 'none';
  if (forgotForm) forgotForm.style.display = form === 'forgot' ? '' : 'none';
}

async function handleLogin() {
  const emailEl = document.getElementById('login-email');
  const passwordEl = document.getElementById('login-password');
  if (!emailEl || !passwordEl) { showToast('❌', 'Formulário não encontrado'); return; }

  const email = emailEl.value.trim().toLowerCase();
  const password = passwordEl.value;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.includes('..')) { showToast('⚠️', 'Preencha um e-mail válido!'); return; }
  if (!password) { showToast('⚠️', 'Preencha a sua senha!'); return; }

  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('cardlink_token', data.token);
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name) { showToast('⚠️', 'Preencha o seu nome!'); return; }
  if (!email || !emailRegex.test(email) || email.includes('..')) { showToast('⚠️', 'Preencha um e-mail válido!'); return; }
  if (!password || password.length < 8) { showToast('⚠️', 'Senha deve ter pelo menos 8 caracteres'); return; }

  const termsCheckbox = document.getElementById('register-terms');
  if (termsCheckbox && !termsCheckbox.checked) {
    showToast('⚠️', 'Você precisa concordar com os Termos de Uso e a Política de Privacidade!');
    return;
  }

  try {
    const referred_by = sessionStorage.getItem('cardlink_ref') || null;
    const data = await api('/auth/register', { 
      method: 'POST', 
      body: JSON.stringify({ name, email, password, referred_by }) 
    });
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('cardlink_token', data.token);
    showToast('✅', 'Conta criada com sucesso!');
    currentUserCardId = null;
    createNewCard();
  } catch (err) {
    if (err.message && err.message.includes('cadastrado')) {
      showToast('⚠️', 'E-mail já cadastrado! Redirecionando para login...');
      const loginEmail = document.getElementById('login-email');
      if (loginEmail) loginEmail.value = email;
      toggleAuthForm('login');
    } else {
      showToast('❌', err.message);
    }
  }
}

async function handleForgotPassword() {
  const email = document.getElementById('forgot-email')?.value.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.includes('..')) {
    showToast('⚠️', 'Informe um e-mail válido!');
    return;
  }

  showToast('⏳', 'Gerando código de recuperação...');
  try {
    const res = await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
    if (!res) return;
    const step1 = document.getElementById('forgot-step-1');
    const step2 = document.getElementById('forgot-step-2');
    const banner = document.getElementById('forgot-code-banner');

    // O código é devolvido somente em desenvolvimento; em produção ele é
    // entregue por e-mail/SMS e aparece apenas no console do servidor.
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
    if (banner && res.code) {
      banner.innerHTML = `🔑 Código de Recuperação Gerado:<br><strong style="font-size:1.4rem;letter-spacing:4px;color:var(--accent);">${res.code}</strong>`;
    } else if (banner) {
      banner.innerHTML = `📩 ${res.message || 'Verifique seu e-mail / console do administrador para obter o código.'}`;
    }
    showToast('✅', res.message || 'Código gerado! Digite o código e a nova senha.');
  } catch (err) {
    showToast('❌', err.message);
  }
}

async function handleResetPassword() {
  const email = document.getElementById('forgot-email')?.value.trim().toLowerCase();
  const code = document.getElementById('forgot-code')?.value.trim();
  const newPassword = document.getElementById('forgot-new-password')?.value;

  if (!email || !code || !newPassword) {
    showToast('⚠️', 'Preencha o e-mail, código e a nova senha!');
    return;
  }

  if (newPassword.length < 8) {
    showToast('⚠️', 'Nova senha deve ter pelo menos 8 caracteres!');
    return;
  }

  showToast('⏳', 'Redefinindo senha...');
  try {
    const res = await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) });
    showToast('✅', res.message || 'Senha redefinida!');
    const loginEmail = document.getElementById('login-email');
    if (loginEmail) loginEmail.value = email;
    toggleAuthForm('login');
  } catch (err) {
    showToast('❌', err.message);
  }
}


function handleLogout() {
  authToken = null;
  currentUser = null;
  currentUserCardId = null;
  localStorage.removeItem('cardlink_token');
  showToast('👋', 'Você saiu da conta');
  navigateTo('home');
}

function showSettingsSection(section) {
  let targetSection = section || 'profile';
  
  // Feature gating logic
  const proSections = ['services', 'gallery', 'testimonials', 'assistant'];
  const isPro = currentUser && (currentUser.plan === 'pro' || currentUser.is_admin);
  
  if (proSections.includes(targetSection) && !isPro) {
    const lockTitles = {
      services: 'Vitrine de Produtos & Serviços',
      gallery: 'Galeria de Fotos & Portfólio',
      testimonials: 'Carrossel de Avaliações',
      assistant: 'Assistente de Conteúdo com IA'
    };
    
    const lockDescs = {
      services: 'Exiba seus produtos ou serviços com fotos, preços e descrições estruturadas. Seus clientes poderão fazer pedidos diretamente pelo WhatsApp!',
      gallery: 'Crie uma vitrine visual do seu trabalho, portfólio de projetos, fotos de antes/depois ou do seu espaço físico.',
      testimonials: 'Aumente sua credibilidade exibindo depoimentos e avaliações reais de clientes satisfeitos diretamente na sua página.',
      assistant: 'Use inteligência artificial avançada para criar biografias, títulos e textos persuasivos otimizados para vendas com um único clique.'
    };
    
    const titleEl = document.getElementById('pro-lock-title');
    const descEl = document.getElementById('pro-lock-desc');
    if (titleEl) titleEl.textContent = lockTitles[targetSection] || 'Recurso Premium PRO';
    if (descEl) descEl.textContent = lockDescs[targetSection] || 'Faça o upgrade para o plano PRO para liberar este recurso.';
    
    targetSection = 'pro-lock';
  }

  activeSettingsSection = targetSection;
  document.querySelectorAll('[data-settings-section]').forEach(el => {
    el.classList.toggle('active', el.dataset.settingsSection === activeSettingsSection);
  });
  document.querySelectorAll('[data-settings-target]').forEach(button => {
    button.classList.toggle('active', button.dataset.settingsTarget === section);
  });
  document.querySelector('.builder-form-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function openProPaymentModal() {
  const modal = document.getElementById('pro-payment-modal');
  if (modal) modal.style.display = 'flex';
}

function closeProPaymentModal() {
  const modal = document.getElementById('pro-payment-modal');
  if (modal) modal.style.display = 'none';
}

function redirectToCheckout() {
  const email = currentUser ? encodeURIComponent(currentUser.email) : '';
  const userId = currentUser ? currentUser.id : '';
  const checkoutBase = 'https://cakto.com.br/checkout/cardlink-pro';
  const checkoutUrl = `${checkoutBase}?email=${email}&external_id=${userId}`;
  window.open(checkoutUrl, '_blank');
}

function loadAccountView() {
  if (!currentUser) return;
  setFieldValue('account-name', currentUser.name || '');
  setFieldValue('account-email', currentUser.email || '');
  setFieldValue('account-current-password', '');
  setFieldValue('account-new-password', '');
}

async function saveAccountProfile() {
  const name = document.getElementById('account-name')?.value.trim();
  const email = document.getElementById('account-email')?.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !email) {
    showToast('⚠️', 'Informe seu nome e e-mail');
    return;
  }
  if (!emailRegex.test(email) || email.includes('..')) {
    showToast('⚠️', 'Informe um e-mail válido');
    return;
  }
  try {
    currentUser = await api('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, email })
    });
    updateNavAuth();
    showToast('✅', 'Dados da conta atualizados');
  } catch (err) {
    showToast('❌', err.message);
  }
}

async function changeAccountPassword() {
  const currentPassword = document.getElementById('account-current-password')?.value || '';
  const newPassword = document.getElementById('account-new-password')?.value || '';
  if (!currentPassword || newPassword.length < 8) {
    showToast('⚠️', 'Informe a senha atual e uma nova senha com 8 caracteres');
    return;
  }
  try {
    await api('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    setFieldValue('account-current-password', '');
    setFieldValue('account-new-password', '');
    showToast('✅', 'Senha atualizada com sucesso');
  } catch (err) {
    showToast('❌', err.message);
  }
}

// ============================================
// Dashboard
// ============================================
function getPageCompletion(card) {
  const checks = [
    card.name, card.title, card.photo_url, card.description,
    card.whatsapp || card.phone, card.email,
    card.products && card.products.length,
    card.gallery && card.gallery.length
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

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
            Configure sua página profissional para compartilhar com clientes e contatos.
          </p>
          <button class="btn btn-primary btn-lg" onclick="createNewCard()">Configurar minha página</button>
        </div>`;
      updateNavAuth();
      return;
    }

    const card = data.card;
    currentUserCardId = card.id;
    updateNavAuth();

    const stats = data.stats;
    const initials = (card.name || 'C').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const cardLink = window.location.origin + '/site/' + card.slug;
    const recentContacts = stats.recentContacts || [];
    const completion = getPageCompletion(card);

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    let pwaBannerHtml = '';
    
    if (isMobile && !isStandalone) {
      pwaBannerHtml = `
        <div id="pwa-install-banner" class="form-section" style="display:flex;background:linear-gradient(135deg, rgba(124,58,237,0.08), rgba(59,130,246,0.08));border:1.5px solid var(--border-subtle);border-radius:var(--radius-lg);padding:16px;margin-bottom:var(--space-lg);text-align:left;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;width:100%;">
          <div style="flex:1;min-width:250px;">
            <div style="font-weight:700;color:var(--text-primary);font-size:0.95rem;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
              <span>📲</span> Fixar CardLink no seu Celular
            </div>
            <p style="font-size:0.8rem;color:var(--text-secondary);line-height:1.4;margin:0;">
              Adicione o CardLink à sua tela de início para abrir seu painel instantaneamente como um aplicativo real.
            </p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="window.triggerPwaInstall()" style="padding:8px 16px;font-size:0.82rem;font-weight:bold;flex-shrink:0;">
            Instalar App
          </button>
        </div>
      `;
    }

    content.innerHTML = `
      <div class="dashboard-header">
        <div>
          <h1 class="builder-title">Minha <span class="text-gradient">Página</span></h1>
          <p class="builder-subtitle">Olá, ${escapeHtml(userName)}. Aqui está o resumo da sua página profissional.</p>
        </div>
      </div>

      ${pwaBannerHtml}

      <div class="page-status-card">
        <div>
          <span class="page-status-label">Situação da página</span>
          <strong>${completion >= 75 ? 'Publicada e bem configurada' : 'Publicada, mas ainda pode ser completada'}</strong>
          <p>${completion}% das informações essenciais preenchidas</p>
        </div>
        <div class="page-status-progress" aria-label="${completion}% concluído"><span style="width:${completion}%"></span></div>
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
          <div class="stat-label">Página profissional</div>
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
            <a class="btn btn-primary btn-sm" href="/site/${escapeHtml(card.slug)}" target="_blank" rel="noopener">Abrir página</a>
            <button class="btn btn-outline btn-sm" onclick="copyToClipboard('${escapeHtml(cardLink)}')">Copiar link</button>
          </div>
        </div>

        <div class="dash-card-mini-preview" id="dash-mini-preview"></div>

        <div class="dash-card-actions-bar">
          <button class="btn btn-secondary btn-sm" onclick="shareCard('${escapeHtml(card.slug)}')">Compartilhar</button>
          <button class="btn btn-secondary btn-sm" onclick="viewContacts(${card.id}, '${escapeHtml(card.name)}')">Contatos recebidos (${stats.contacts})</button>
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

      <div class="dash-card-full" style="margin-top:var(--space-xl);padding:var(--space-lg);background:var(--bg-surface);border:1px solid var(--border-subtle);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <h3 style="font-family:var(--font-display);font-weight:700;margin-bottom:4px;">💬 Central de Ajuda & Suporte</h3>
            <p style="color:var(--text-secondary);font-size:0.85rem;">Teve algum problema ou tem alguma dúvida sobre seu site? Fale conosco.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="openSupportModal()">Enviar dúvida</button>
        </div>
      </div>
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
    activeSettingsSection = 'profile';
    navigateTo('settings');
    showSettingsSection('profile');
  }
}

async function editCard(id) {
  settingsLoadInProgress = true;
  navigateTo('settings');
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
  } finally {
    settingsLoadInProgress = false;
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
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

  try {
    if (editingCardId) {
      await api('/cards/' + editingCardId, { method: 'PUT', body: JSON.stringify(data) });
      showToast('✅', 'Configurações atualizadas!');
    } else {
      const card = await api('/cards', { method: 'POST', body: JSON.stringify(data) });
      currentUserCardId = card.id;
      editingCardId = card.id;
      showToast('✅', 'Página criada com sucesso!');
    }
    navigateTo('dashboard');
  } catch (err) {
    showToast('❌', err.message || 'Erro ao salvar');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Salvar alterações'; }
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
    if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(getPrimaryPublicUrl(card.slug))}&bgcolor=ffffff&color=000000`;

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

    const dashBtn = document.getElementById('dashboard-card-btn');
    if (dashBtn) {
      dashBtn.style.display = authToken && currentUserCardId === card.id ? '' : 'none';
    }

    const ownerBar = document.getElementById('card-owner-bar');
    if (ownerBar) {
      ownerBar.style.display = authToken && currentUserCardId === card.id ? 'flex' : 'none';
    }

    // O visitante é direcionado ao WhatsApp; não há chat de IA público.
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

  // Ajuste inteligente para diferenciação entre Cartão Comercial (Negócio) e Cartão Pessoal
  const mainTitle = business ? business : name;
  const subTitle = business 
    ? (name && name !== 'Seu Nome' ? (title ? `${name} — ${title}` : name) : title)
    : title;

  const initialsName = business || name;
  const initials = (initialsName.split(' ').map(w => w[0]).join('').substring(0, 2) || 'C').toUpperCase();
  const avatarContent = photo
    ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(mainTitle)}" onerror="this.parentElement.textContent='${initials}'">`
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
        <!-- Honeypot (anti-spam) -->
        <input type="text" id="contact-website" style="display:none !important;" tabindex="-1" autocomplete="off" placeholder="Website">
        
        <input class="form-input" type="text" id="contact-name" placeholder="Seu nome *" style="margin-bottom:8px;width:100%;">
        <input class="form-input" type="email" id="contact-email" placeholder="Seu email" style="margin-bottom:8px;width:100%;">
        <input class="form-input" type="tel" id="contact-phone" placeholder="Seu WhatsApp / Telefone" style="margin-bottom:8px;width:100%;">
        <textarea class="form-input" id="contact-message" placeholder="Sua mensagem..." rows="3" style="margin-bottom:12px;width:100%;"></textarea>
        <button class="btn btn-primary" style="width:100%;" onclick="submitContactForm('${escapeHtml(data.slug)}')">
          📤 Enviar Mensagem
        </button>
      </div>`;
  }

  // Construção do novo layout premium baseado no mockup Barbearia Estilo & Cia
  let messageHtml = '';
  if (message) {
    messageHtml = `
      <div class="card-message" style="background:rgba(251,191,36,0.06);border:1.5px dashed rgba(251,191,36,0.2);border-radius:var(--radius-lg);padding:14px;margin: 15px 0 20px;display:flex;align-items:center;gap:12px;text-align:left;max-width:100%;">
        <span style="font-size:1.8rem;line-height:1;">🎁</span>
        <div>
          <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#fbbf24;font-weight:bold;margin-bottom:2px;">Destaque / Promoção</div>
          <div style="font-size:0.9rem;color:var(--text-primary);line-height:1.4;">${escapeHtml(message)}</div>
        </div>
      </div>
    `;
  }

  let ctaButtonsHtml = '';
  if (whatsapp) {
    ctaButtonsHtml = `
      <div style="display:flex;gap:12px;margin:15px 0;width:100%;">
        <a href="https://wa.me/${cleanWhatsapp(whatsapp)}" target="_blank" rel="noopener" class="btn btn-primary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;font-size:0.95rem;font-weight:bold;text-decoration:none;">
          <span>💬</span> WhatsApp
        </a>
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('contactFormSection')?.scrollIntoView({behavior:'smooth'})" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;font-size:0.95rem;font-weight:bold;background:none;border:1.5px solid var(--border-subtle);color:var(--text-primary);">
          <span>📩</span> Cadastrar-se
        </button>
      </div>
    `;
  }

  let infoGridHtml = '';
  if (phone || email || address || instagram) {
    infoGridHtml = `
      <div style="margin:24px 0 12px;text-align:left;width:100%;">
        <h3 style="font-family:var(--font-display);font-size:1.05rem;font-weight:700;color:var(--text-primary);margin-bottom:12px;">Informações</h3>
        <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:10px;">
          ${phone ? `
            <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:12px;display:flex;flex-direction:column;gap:4px;">
              <span style="font-size:1.15rem;">📞</span>
              <span style="font-size:0.75rem;font-weight:bold;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.02em;">Telefone</span>
              <a href="tel:${escapeHtml(phone)}" style="font-size:0.85rem;color:var(--text-primary);text-decoration:none;font-weight:500;word-break:break-all;">${escapeHtml(phone)}</a>
            </div>
          ` : ''}
          ${email ? `
            <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:12px;display:flex;flex-direction:column;gap:4px;">
              <span style="font-size:1.15rem;">📧</span>
              <span style="font-size:0.75rem;font-weight:bold;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.02em;">E-mail</span>
              <a href="mailto:${escapeHtml(email)}" style="font-size:0.85rem;color:var(--text-primary);text-decoration:none;font-weight:500;word-break:break-all;">${escapeHtml(email)}</a>
            </div>
          ` : ''}
          ${instagram ? `
            <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:12px;display:flex;flex-direction:column;gap:4px;">
              <span style="font-size:1.15rem;">📷</span>
              <span style="font-size:0.75rem;font-weight:bold;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.02em;">Instagram</span>
              <a href="https://instagram.com/${instagram.startsWith('@') ? instagram.substring(1) : instagram}" target="_blank" rel="noopener" style="font-size:0.85rem;color:var(--text-primary);text-decoration:none;font-weight:500;word-break:break-all;">${escapeHtml(instagram)}</a>
            </div>
          ` : ''}
          ${address ? `
            <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:12px;display:flex;flex-direction:column;gap:4px;grid-column:span 2;">
              <span style="font-size:1.15rem;">📍</span>
              <span style="font-size:0.75rem;font-weight:bold;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.02em;">Endereço</span>
              <a href="https://www.google.com/maps/search/${encodeURIComponent(address)}" target="_blank" rel="noopener" style="font-size:0.85rem;color:var(--text-primary);text-decoration:none;font-weight:500;line-height:1.4;">${escapeHtml(address)}</a>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  return `
    <div class="card-container" data-theme="${theme}">
      <div class="card-cover" style="height:120px;background:linear-gradient(135deg, var(--primary-subtle), var(--primary));position:relative;overflow:hidden;">
        <div class="card-cover-brand" style="position:absolute;top:15px;left:20px;font-size:0.8rem;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;opacity:0.8;color:var(--text-primary);">
          CardLink
        </div>
      </div>
      
      <!-- Profile Header (Avatar Left, Title Right) -->
      <div style="display:flex;align-items:center;gap:16px;padding:0 20px;margin-top:-40px;position:relative;z-index:10;text-align:left;">
        <div class="card-avatar" style="width:80px;height:80px;border-radius:50%;border:3px solid var(--bg-surface);box-shadow:var(--shadow-md);overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--bg-card);font-size:1.8rem;font-weight:bold;flex-shrink:0;">
          ${avatarContent}
        </div>
        <div style="display:flex;flex-direction:column;justify-content:center;padding-top:15px;">
          <h1 class="card-name" style="margin:0;font-size:1.35rem;line-height:1.2;font-weight:800;color:var(--text-primary);${!business ? 'font-family: Georgia, Garamond, serif; font-style: italic; font-weight: 700; letter-spacing: -0.02em;' : ''}">${escapeHtml(mainTitle)}</h1>
          ${subTitle ? `<div class="card-title" style="margin:3px 0 0;font-size:0.88rem;color:var(--text-secondary);font-weight:500;">${escapeHtml(subTitle)}</div>` : ''}
        </div>
      </div>

      <div class="card-body" style="padding-top:15px;">
        ${description ? `<p class="card-description" style="text-align:left;margin:10px 0 15px;font-size:0.9rem;line-height:1.6;color:var(--text-secondary);">${escapeHtml(description)}</p>` : ''}
        ${messageHtml}
        ${ctaButtonsHtml}
        ${whatsappGroup ? `<a href="${escapeHtml(whatsappGroup)}" target="_blank" rel="noopener" class="btn btn-whatsapp-group" style="width:100%;margin-bottom:15px;display:flex;align-items:center;justify-content:center;gap:8px;">👥 Grupo do WhatsApp</a>` : ''}
        ${socialButtons ? `<div class="card-social-grid" style="margin-bottom:20px;">${socialButtons}</div>` : ''}
        ${infoGridHtml}
        ${address ? `<div class="card-map-card" style="margin-top:16px;"><div class="card-map-label">📍 Como chegar</div><a href="https://www.google.com/maps/search/${encodeURIComponent(address)}" target="_blank" rel="noopener" class="card-map-preview">Toque para abrir no Google Maps</a></div>` : ''}
        ${siteToggleButton}
        ${siteExpandedContent}
        ${contactForm}
      </div>
      <div class="card-footer" style="margin-top:20px;">Feito com 💜 por <a href="${window.location.origin}">CardLink</a></div>
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
  const website = document.getElementById('contact-website')?.value;

  if (!name) { showToast('⚠️', 'Preencha seu nome!'); return; }

  // Honeypot anti-spam check
  if (website && website.trim() !== '') {
    // Silently block spambots and pretend success
    const formSection = document.getElementById('contactFormSection');
    if (formSection) formSection.innerHTML = `
      <div class="form-success">
        <div class="check-icon">✅</div>
        <h4>Mensagem Enviada!</h4>
        <p>Seus dados foram registrados com sucesso.</p>
      </div>`;
    showToast('✅', 'Mensagem enviada com sucesso!');
    return;
  }

  try {
    await api('/public/' + slug + '/contact', { method: 'POST', body: JSON.stringify({ name, email, phone, message, website }) });
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

  if (btn) { btn.disabled = true; btn.textContent = 'Preparando sugestões...'; }
  showToast('⏳', 'Preparando sugestões de conteúdo...');

  try {
    const res = await api('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ profession, skill, mode: 'full' })
    });

    const summary = [res.title, res.description, ...(res.products || []).map(p => p.name)].filter(Boolean).join('\n\n');
    const approved = window.confirm(`Sugestão do Assistente de conteúdo:\n\n${summary}\n\nDeseja aplicar estas sugestões à sua página?`);
    if (!approved) {
      showToast('ℹ️', 'Sugestões descartadas. Nenhuma informação foi alterada.');
      return;
    }

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
    showToast('✨', 'Sugestões aplicadas. Revise antes de salvar.');
  } catch (err) {
    showToast('❌', 'Erro na IA: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Gerar sugestões de conteúdo'; }
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

    if (res.improvedText && window.confirm(`Texto sugerido:\n\n${res.improvedText}\n\nDeseja substituir o texto atual?`)) {
      input.value = res.improvedText;
      updatePreview();
      showToast('✨', 'Texto melhorado com sucesso!');
    }
  } catch (err) {
    showToast('❌', 'Erro ao melhorar texto: ' + err.message);
  }
}

// ─── ADMIN & SUPPORT FUNCTIONS ───────────────────────────────────────────

let adminUsersList = [];

async function loadAdminDashboard() {
  try {
    // 1. Fetch Stats
    const stats = await api('/admin/stats');
    document.getElementById('admin-metric-users').textContent = stats.totalUsers || 0;
    document.getElementById('admin-metric-cards').textContent = stats.totalCards || 0;
    document.getElementById('admin-metric-views').textContent = stats.totalViews || 0;
    document.getElementById('admin-metric-contacts').textContent = stats.totalContacts || 0;

    // 2. Fetch Users
    adminUsersList = await api('/admin/users');
    renderAdminUsers(adminUsersList);

    // 3. Fetch Support Tickets
    const tickets = await api('/admin/support');
    renderAdminSupport(tickets);

  } catch (err) {
    showToast('❌', 'Erro ao carregar painel admin: ' + err.message);
  }
}

function switchAdminSubSection(section) {
  document.querySelectorAll('.admin-section').forEach(el => el.style.display = 'none');
  document.getElementById(`admin-section-${section}`).style.display = 'block';

  document.querySelectorAll('#admin-tab-users, #admin-tab-support').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`admin-tab-${section}`).classList.add('active');
}

function renderAdminUsers(users) {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:var(--space-lg);color:var(--text-secondary);">Nenhum usuário cadastrado</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const isPro = u.plan === 'pro';
    const date = new Date(u.created_at).toLocaleDateString('pt-BR');
    const pageLink = u.card ? `/site/${u.card.slug}` : '';
    
    return `
      <tr style="border-bottom:1px solid var(--border-subtle);font-size:0.9rem;">
        <td style="padding:12px 8px;">
          <strong style="color:var(--text-primary);display:block;">${escapeHtml(u.name)}</strong>
          <span style="color:var(--text-muted);font-size:0.8rem;">${escapeHtml(u.email)} ${u.whatsapp ? '· ' + escapeHtml(u.whatsapp) : ''}</span>
        </td>
        <td style="padding:12px 8px;">
          ${u.card ? `
            <a href="${pageLink}" target="_blank" style="color:var(--purple);text-decoration:none;font-weight:500;">/${escapeHtml(u.card.slug)}</a>
            <span style="color:var(--text-muted);font-size:0.8rem;display:block;">👁️ ${u.card.views_count} views</span>
          ` : '<span style="color:var(--text-muted);">Sem página</span>'}
        </td>
        <td style="padding:12px 8px;">
          <span class="badge ${isPro ? 'badge-pro' : 'badge-free'}" style="padding:4px 8px;border-radius:6px;font-size:0.75rem;font-weight:bold;${isPro ? 'background:rgba(124,58,237,0.15);color:var(--purple);' : 'background:var(--bg-secondary);color:var(--text-secondary);'}">
            ${isPro ? '⚡ PRO' : 'FREE'}
          </span>
        </td>
        <td style="padding:12px 8px;text-align:right;white-space:nowrap;">
          <button class="btn btn-sm ${isPro ? 'btn-outline' : 'btn-primary'}" onclick="toggleUserPlan(${u.id}, '${u.plan}')" style="padding:5px 10px;font-size:0.75rem;">
            ${isPro ? 'Downgrade' : 'Upgrade PRO'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function toggleUserPlan(userId, currentPlan) {
  const newPlan = currentPlan === 'pro' ? 'free' : 'pro';
  if (!confirm(`Deseja alterar o plano deste usuário para ${newPlan.toUpperCase()}?`)) return;

  try {
    await api(`/admin/users/${userId}/plan`, {
      method: 'POST',
      body: JSON.stringify({ plan: newPlan })
    });
    showToast('✅', `Plano alterado para ${newPlan.toUpperCase()}`);
    loadAdminDashboard();
  } catch (err) {
    showToast('❌', 'Erro ao alterar plano: ' + err.message);
  }
}

function filterAdminUsers() {
  const queryText = document.getElementById('admin-user-search')?.value.toLowerCase().trim() || '';
  if (!queryText) {
    renderAdminUsers(adminUsersList);
    return;
  }

  const filtered = adminUsersList.filter(u => {
    return u.name.toLowerCase().includes(queryText) || u.email.toLowerCase().includes(queryText);
  });
  renderAdminUsers(filtered);
}

function renderAdminSupport(tickets) {
  const listEl = document.getElementById('admin-support-list');
  if (!listEl) return;

  if (tickets.length === 0) {
    listEl.innerHTML = `<p style="color:var(--text-secondary);text-align:center;padding:var(--space-lg);">Nenhum chamado pendente</p>`;
    return;
  }

  listEl.innerHTML = tickets.map(t => {
    const date = new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const user = t.user || {};
    const waLink = user.whatsapp ? `https://wa.me/${cleanWhatsapp(user.whatsapp)}` : '';
    
    return `
      <div class="dash-card-full" style="padding:var(--space-md);background:var(--bg-primary);border-color:var(--border-subtle);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-sm);flex-wrap:wrap;gap:8px;">
          <div>
            <strong style="color:var(--text-primary);font-size:1rem;">📌 ${escapeHtml(t.subject)}</strong>
            <span style="color:var(--text-muted);font-size:0.8rem;display:block;">Por: ${escapeHtml(user.name || 'Desconhecido')} (${escapeHtml(user.email || '-')}) · ${date}</span>
          </div>
          <span class="badge" style="padding:4px 8px;border-radius:6px;font-size:0.75rem;font-weight:bold;background:rgba(234,179,8,0.15);color:rgb(202,138,4);">
            ${t.status.toUpperCase()}
          </span>
        </div>
        <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:var(--space-md);background:var(--bg-surface);padding:10px;border-radius:8px;border:1px solid var(--border-subtle);">${escapeHtml(t.message)}</p>
        
        <div style="display:flex;gap:var(--space-sm);">
          ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">💬 Responder no WhatsApp</a>` : ''}
          <a href="mailto:${escapeHtml(user.email)}" class="btn btn-outline btn-sm">📧 Enviar E-mail</a>
        </div>
      </div>
    `;
  }).join('');
}

// ─── CLIENT SUPPORT ACTIONS ──────────────────────────────────────────

function openSupportModal() {
  const modal = document.getElementById('support-modal');
  if (modal) {
    modal.style.display = 'flex';
    setFieldValue('support-subject', '');
    setFieldValue('support-message', '');
  }
}

function closeSupportModal() {
  const modal = document.getElementById('support-modal');
  if (modal) modal.style.display = 'none';
}

async function submitSupportTicket() {
  const subject = document.getElementById('support-subject')?.value.trim();
  const message = document.getElementById('support-message')?.value.trim();

  if (!message) {
    showToast('⚠️', 'Escreva uma mensagem detalhando seu problema!');
    return;
  }

  try {
    await api('/support', {
      method: 'POST',
      body: JSON.stringify({ subject, message })
    });
    showToast('✅', 'Chamado de suporte enviado com sucesso!');
    closeSupportModal();
  } catch (err) {
    showToast('❌', 'Erro ao enviar chamado: ' + err.message);
  }
}

// ============================================
