/* ============================================
   CardLink — Application Logic (Clean Rewrite v19)
   ============================================ */

const API = window.location.origin + '/api';
const CARDLINK_SUPPORT_WHATSAPP = '5511994551249';

let authToken = null; // marcador de sessão; o JWT fica apenas no cookie HttpOnly
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
  const res = await fetch(API + path, { ...options, credentials: 'same-origin', headers: { ...headers, ...options.headers } });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Erro na requisição');
    err.status = res.status;
    err.code = data.code || '';
    throw err;
  }
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

function openCardLinkSupport(context = 'subscriber') {
  const message = context === 'prepurchase'
    ? 'Olá! Tenho uma dúvida sobre o CardLink antes de assinar.'
    : 'Olá! Sou assinante do CardLink e preciso de ajuda.';
  window.open(`https://wa.me/${CARDLINK_SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
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

function openCardHomeScreenSetup(slug) {
  const cardUrl = new URL(getPrimaryPublicUrl(slug));
  cardUrl.searchParams.set('fixar', '1');
  window.location.assign(cardUrl.toString());
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
  }

  const isCustomerActive = currentUser && !currentUser.is_admin && (currentUser.account_status || 'active') === 'active' && (currentUser.subscription_status || 'active') === 'active';
  const isProUser = currentUser && !currentUser.is_admin && currentUser.plan === 'pro' && currentUser.subscription_status === 'active' && currentUser.account_status === 'active';

  // Confirmação de novo e-mail pode ser aberta mesmo com outra sessão ativa.
  if (hash.startsWith('#verify-email')) {
    document.getElementById('auth-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    updateNavAuth();
    toggleAuthForm('verify-email');
    loadEmailVerificationFromHash();
    return;
  }

  // A conta administrativa é exclusiva para operar a plataforma: não possui cartão nem assinatura.
  const adminAllowedHashes = new Set(['#admin', '#account', '#/terms', '#/privacy']);
  if (authToken && currentUser?.is_admin && !hash.startsWith('#card/') && !adminAllowedHashes.has(hash)) {
    navigateTo('admin');
    return;
  }

  // Usuários com conta inativa ou suspensa ficam limitados à tela de reativação e páginas legais.
  if (authToken && currentUser && !currentUser.is_admin && !isCustomerActive && hash !== '#/terms' && hash !== '#/privacy') {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.getElementById('dashboard-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    updateNavAuth();

    document.getElementById('dashboard-content').innerHTML = `
      <div style="max-width:550px;margin:40px auto;padding:32px 24px;background:var(--surface);border:1.5px solid var(--border-subtle);border-radius:var(--radius-xl);text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.3);">
        <div style="font-size:3.5rem;margin-bottom:16px;">✨</div>
        <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:12px;color:var(--text-primary);">
          Assinatura <span class="text-gradient">CardLink</span>
        </h1>
        <p style="color:var(--text-secondary);font-size:0.95rem;line-height:1.6;margin-bottom:24px;">
          Olá, <strong>${escapeHtml(currentUser.name)}</strong>! Seu acesso está inativo no momento. Regularize ou ative sua assinatura para continuar usando todos os recursos.
        </p>

        <div style="background:rgba(139,92,246,0.08);border:1px dashed var(--accent);border-radius:var(--radius-md);padding:16px;margin-bottom:24px;text-align:left;">
          <div style="font-weight:700;color:var(--accent);margin-bottom:8px;font-size:0.9rem;">🚀 O que está incluído no CardLink:</div>
          <ul style="margin:0;padding-left:20px;font-size:0.85rem;color:var(--text-secondary);line-height:1.8;">
            <li>Editor do site com temas modernos</li>
            <li>Galeria de fotos e vitrine de produtos</li>
            <li>Captura de leads e contatos dos clientes</li>
            <li>QR Code exclusivo para balcão e redes sociais</li>
          </ul>
        </div>

        <a href="/checkout/cardlink-pro" class="btn btn-primary btn-lg" onclick="openProPaymentModal(); return false;" style="display:inline-block;width:100%;font-weight:bold;font-size:1rem;padding:14px;box-shadow:0 6px 20px rgba(124,58,237,0.3);margin-bottom:12px;text-decoration:none;">
          💳 Reativar Assinatura CardLink
        </a>

        <div style="display:flex;justify-content:center;gap:16px;margin-top:16px;font-size:0.85rem;">
          <button type="button" onclick="checkSubscriptionStatus()" style="background:none;border:none;color:var(--accent);cursor:pointer;text-decoration:underline;font-weight:600;">
            🔄 Já pagou? Atualizar Status
          </button>
          <span style="color:var(--text-muted);">|</span>
          <button type="button" onclick="handleLogout()" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;text-decoration:underline;">
            🚪 Sair da conta
          </button>
        </div>
      </div>
    `;
    return;
  }

  if (hash.startsWith('#activate')) {
    if (authToken) { navigateTo(currentUser?.is_admin ? 'admin' : 'dashboard'); return; }
    document.getElementById('auth-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    updateNavAuth();
    toggleAuthForm('activate');
    loadActivationFromHash();
  } else if (hash.startsWith('#auth') || hash.startsWith('#register')) {
    if (!authToken) {
      document.getElementById('auth-view').classList.add('active');
      if (hash.includes('login')) {
        toggleAuthForm('login');
      } else {
        toggleAuthForm('register');
      }
    } else {
      navigateTo(currentUser?.is_admin ? 'admin' : 'dashboard');
      return;
    }
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    updateNavAuth();
  } else if (hash === '#dashboard') {
    if (!authToken) { navigateTo('auth'); return; }
    if (currentUser?.is_admin) { navigateTo('admin'); return; }
    document.getElementById('dashboard-view').classList.add('active');
    if (navbar) navbar.style.display = '';
    if (bgAnimated) bgAnimated.style.display = '';
    loadDashboard();
    updateNavAuth();
  } else if (hash === '#settings' || hash === '#builder') {
    if (!authToken) { navigateTo('auth'); return; }
    if (currentUser?.is_admin) { navigateTo('admin'); return; }
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
    if (currentUser?.is_admin) { navigateTo('admin'); return; }
    if (!isProUser) { navigateTo('dashboard'); return; }

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
      if (currentUser?.is_admin) { navigateTo('admin'); return; }
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
    document.title = 'CardLink — Tudo o que seu cliente precisa ver antes de chamar você';
    updateNavAuth();
  }

}

async function checkSubscriptionStatus() {
  showToast('⏳', 'Verificando assinatura...');
  try {
    currentUser = await api('/auth/me');
    if (currentUser?.is_admin) {
      showToast('ℹ️', 'Conta administrativa: assinaturas são geridas no painel.');
      navigateTo('admin');
      return;
    }
    if (currentUser && !currentUser.is_admin && currentUser.plan === 'pro') {
      showToast('🎉', 'Assinatura CardLink confirmada! Redirecionando...');
      handleRoute();
    } else {
      showToast('⚠️', 'Assinatura ainda pendente. Se você pagou agora, aguarde alguns instantes.');
    }
  } catch (err) {
    showToast('❌', 'Erro ao verificar assinatura');
  }
}

// ============================================
// Navbar CTA
// ============================================
function handleHeroCta() {
  if (authToken && currentUser?.is_admin) {
    navigateTo('admin');
  } else if (authToken) {
    openPageSettings();
  } else {
    openProPaymentModal();
  }
}

function handlePricingCta(plan) {
  redirectToCheckout(plan || 'monthly');
}

function openPageSettings(section = 'profile') {
  if (currentUser?.is_admin) { navigateTo('admin'); return; }
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
    const isPro = currentUser.plan === 'pro' && !currentUser.is_admin;
    navCta.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        ${!currentUser.is_admin && !isPro ? `
          <button class="btn btn-primary btn-sm hide-mobile" onclick="openProPaymentModal()" style="background:linear-gradient(135deg,var(--accent),#9333ea);font-weight:700;font-size:0.8rem;padding:7px 12px;border-radius:8px;">
            ⭐ Assinar Pro (R$ 12,90)
          </button>
        ` : ''}
        <div class="user-menu" id="user-menu" onclick="event.stopPropagation()">
          <button class="user-menu-trigger" type="button" onclick="toggleUserMenu(event)" aria-label="Abrir menu da conta">
            <span class="user-menu-avatar">${initials}</span>
            <span class="user-menu-name">${escapeHtml(currentUser.name)}</span>
            <span class="user-menu-chevron">⌄</span>
          </button>
          <div class="user-menu-dropdown">
            ${currentUser.is_admin ? `
              <button type="button" onclick="navigateTo('admin');closeUserMenu()" style="font-weight:bold;color:var(--purple);"><span>👑 Painel Administrativo</span></button>
              <button type="button" onclick="navigateTo('account');closeUserMenu()"><span>Segurança da conta</span></button>
            ` : `
              ${!isPro ? `<button type="button" onclick="openProPaymentModal();closeUserMenu()" style="font-weight:bold;color:var(--accent);"><span>⭐ Fazer Upgrade para o Pro</span></button>` : ''}
              <button type="button" onclick="navigateTo('dashboard');closeUserMenu()"><span>Visão geral</span></button>
              <button type="button" onclick="openPageSettings();closeUserMenu()"><span>Configurações da página</span></button>
              ${currentUserCardId ? `<button type="button" onclick="viewContacts(${currentUserCardId}, 'Minha página');closeUserMenu()"><span>Contatos recebidos</span></button>` : ''}
              <button type="button" onclick="navigateTo('account');closeUserMenu()"><span>Minha conta</span></button>
            `}
            <div class="user-menu-divider"></div>
            <button type="button" class="danger" onclick="handleLogout()"><span>Sair</span></button>
          </div>
        </div>
      </div>
    `;
  } else {
    navCta.innerHTML = `
      <a href="#como-funciona" class="navbar-link hide-mobile">Como funciona</a>
      <a href="#demonstracao" class="navbar-link hide-mobile">Demonstração</a>
      <button class="navbar-login" onclick="navigateTo('auth'); toggleAuthForm('login');">Entrar na conta</button>
      <button class="btn btn-primary btn-sm navbar-subscribe" onclick="redirectToCheckout('monthly')">Assinar Pro — R$ 12,90</button>
    `;
  }
}



// ============================================
// App Init
// ============================================
async function loadCheckoutConfig() {
  try {
    const res = await fetch(API + '/payments/cakto-checkout-links');
    if (!res.ok) return;
    const config = await res.json();
    if (!window.CARD_LINK) window.CARD_LINK = {};
    if (config.monthlyCheckoutUrl) window.CARD_LINK.monthlyCheckoutUrl = config.monthlyCheckoutUrl;
    if (config.annualCheckoutUrl) window.CARD_LINK.annualCheckoutUrl = config.annualCheckoutUrl;
  } catch (error) {
    console.warn('Não foi possível atualizar os links de checkout:', error.message);
  }
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', async () => {
  await loadCheckoutConfig();
  try {
    currentUser = await api('/auth/me');
    authToken = 'session';
    if (!currentUser?.is_admin) {
      const summary = await api('/cards/stats/summary');
      if (summary && summary.hasCard && summary.card) {
        currentUserCardId = summary.card.id;
      }
    } else {
      currentUserCardId = null;
    }
  } catch (e) {
    authToken = null;
    currentUser = null;
  }
  handleRoute();
  initIntersectionObserver();

  document.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('input', updatePreview);
  });

  initSettingsNav();
});

