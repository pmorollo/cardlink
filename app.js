/* ============================================
   CardLink — Application Logic
   ============================================ */

// ============================================
// State
// ============================================
let currentTheme = 'midnight';
let cardData = {};

// ============================================
// Navigation / Routing
// ============================================
function navigateTo(route) {
  if (route === 'home') {
    window.location.hash = '';
  } else if (route === 'builder') {
    window.location.hash = '#builder';
  }
  // card route is handled via #card/BASE64
}

function handleRoute() {
  const hash = window.location.hash;
  const views = document.querySelectorAll('.view');
  const navbar = document.getElementById('navbar');
  const bgAnimated = document.getElementById('bgAnimated');

  views.forEach(v => v.classList.remove('active'));

  if (hash.startsWith('#card/')) {
    // Card view
    const data = hash.substring(6);
    try {
      cardData = JSON.parse(decodeURIComponent(atob(data)));
      showCardView(cardData);
      document.getElementById('card-view').classList.add('active');
      navbar.style.display = 'none';
      bgAnimated.style.display = 'none';
      document.title = `${cardData.n || 'Cartão'} — CardLink`;
    } catch (e) {
      console.error('Invalid card data:', e);
      navigateTo('home');
    }
  } else if (hash === '#builder') {
    document.getElementById('builder-view').classList.add('active');
    navbar.style.display = '';
    bgAnimated.style.display = '';
    document.title = 'Criar Cartão — CardLink';
    loadDraft();
    updatePreview();
  } else {
    document.getElementById('landing-view').classList.add('active');
    navbar.style.display = '';
    bgAnimated.style.display = '';
    document.title = 'CardLink — Cartão de Visita Digital';
  }

  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', () => {
  handleRoute();
  setupFormListeners();
  initIntersectionObserver();
});

// ============================================
// Form Handling
// ============================================
function getFormData() {
  const data = {};
  document.querySelectorAll('[data-field]').forEach(input => {
    const key = input.dataset.field;
    const value = input.value.trim();
    if (value) {
      data[key] = value;
    }
  });
  data.th = currentTheme;
  return data;
}

function setFormData(data) {
  if (!data) return;
  document.querySelectorAll('[data-field]').forEach(input => {
    const key = input.dataset.field;
    if (data[key]) {
      input.value = data[key];
    }
  });
  if (data.th) {
    selectTheme(data.th);
  }
}

function setupFormListeners() {
  document.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('input', () => {
      updatePreview();
      autoSaveDraft();
    });
  });
}

// Auto-save debounce
let autoSaveTimeout;
function autoSaveDraft() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    const data = getFormData();
    localStorage.setItem('cardlink_draft', JSON.stringify(data));
  }, 500);
}

function saveDraft() {
  const data = getFormData();
  localStorage.setItem('cardlink_draft', JSON.stringify(data));
  showToast('💾', 'Rascunho salvo!');
}

function loadDraft() {
  try {
    const saved = localStorage.getItem('cardlink_draft');
    if (saved) {
      const data = JSON.parse(saved);
      setFormData(data);
    }
  } catch (e) {
    console.error('Error loading draft:', e);
  }
}

// ============================================
// Theme Selection
// ============================================
function selectTheme(theme) {
  currentTheme = theme;
  
  // Update swatches
  document.querySelectorAll('.theme-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.theme === theme);
  });

  // Update preview
  const previewCard = document.getElementById('preview-card');
  if (previewCard) {
    previewCard.setAttribute('data-theme', theme);
  }

  updatePreview();
}

// ============================================
// Card Rendering
// ============================================
function renderCard(data, isPreview = false) {
  const name = data.n || 'Seu Nome';
  const business = data.b || '';
  const title = data.t || '';
  const phone = data.p || '';
  const whatsapp = data.w || '';
  const email = data.e || '';
  const address = data.a || '';
  const description = data.d || '';
  const photo = data.ph || '';
  const instagram = data.ig || '';
  const facebook = data.fb || '';
  const linkedin = data.li || '';
  const tiktok = data.tk || '';
  const youtube = data.yt || '';
  const twitter = data.tw || '';
  const whatsappGroup = data.wg || '';
  const theme = data.th || 'midnight';

  // Avatar content
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const avatarContent = photo 
    ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" onerror="this.parentElement.textContent='${initials}'">`
    : initials;

  // Contact buttons
  let contactButtons = '';
  if (phone) {
    contactButtons += `
      <a href="tel:${escapeHtml(phone)}" class="card-contact-btn">
        <span class="icon">📞</span>
        <span>Ligar</span>
      </a>`;
  }
  if (email) {
    contactButtons += `
      <a href="mailto:${escapeHtml(email)}" class="card-contact-btn">
        <span class="icon">📧</span>
        <span>Email</span>
      </a>`;
  }
  if (whatsapp) {
    contactButtons += `
      <a href="https://wa.me/${escapeHtml(whatsapp)}" target="_blank" rel="noopener" class="card-contact-btn">
        <span class="icon">💬</span>
        <span>WhatsApp</span>
      </a>`;
  }
  if (address) {
    contactButtons += `
      <a href="https://www.google.com/maps/search/${encodeURIComponent(address)}" target="_blank" rel="noopener" class="card-contact-btn">
        <span class="icon">📍</span>
        <span>Mapa</span>
      </a>`;
  }

  // Social buttons
  let socialButtons = '';
  const socials = [
    { key: instagram, icon: '📷', label: 'Instagram', url: (v) => v.startsWith('@') ? `https://instagram.com/${v.substring(1)}` : v.includes('instagram.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://instagram.com/${v}` },
    { key: facebook, icon: '📘', label: 'Facebook', url: (v) => v.includes('facebook.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://facebook.com/${v}` },
    { key: linkedin, icon: '💼', label: 'LinkedIn', url: (v) => v.includes('linkedin.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://linkedin.com/in/${v}` },
    { key: tiktok, icon: '🎵', label: 'TikTok', url: (v) => v.startsWith('@') ? `https://tiktok.com/${v}` : v.includes('tiktok.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://tiktok.com/@${v}` },
    { key: youtube, icon: '▶️', label: 'YouTube', url: (v) => v.includes('youtube.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://youtube.com/@${v}` },
    { key: twitter, icon: '✖️', label: 'X', url: (v) => v.startsWith('@') ? `https://x.com/${v.substring(1)}` : v.includes('x.com') || v.includes('twitter.com') ? (v.startsWith('http') ? v : `https://${v}`) : `https://x.com/${v}` },
  ];

  socials.forEach(s => {
    if (s.key) {
      socialButtons += `
        <a href="${s.url(s.key)}" target="_blank" rel="noopener" class="card-social-btn" title="${s.label}">
          ${s.icon}
        </a>`;
    }
  });

  // WhatsApp section
  let whatsappSection = '';
  if (whatsapp || whatsappGroup) {
    whatsappSection = '<div class="card-whatsapp-section">';
    if (whatsapp) {
      whatsappSection += `
        <a href="https://wa.me/${escapeHtml(whatsapp)}" target="_blank" rel="noopener" class="btn btn-whatsapp">
          💬 Conversar no WhatsApp
        </a>`;
    }
    if (whatsappGroup) {
      whatsappSection += `
        <a href="${escapeHtml(whatsappGroup)}" target="_blank" rel="noopener" class="btn btn-whatsapp-group">
          👥 Entrar no Grupo WhatsApp
        </a>`;
    }
    whatsappSection += '</div>';
  }

  // Address display
  let addressHtml = '';
  if (address) {
    addressHtml = `
      <a href="https://www.google.com/maps/search/${encodeURIComponent(address)}" target="_blank" rel="noopener" class="card-address">
        📍 ${escapeHtml(address)}
      </a>`;
  }

  // Contact form (only in non-preview mode)
  let contactForm = '';
  if (!isPreview) {
    contactForm = `
      <div class="card-divider"></div>
      <div class="card-form" id="contactFormSection">
        <h3>📩 Envie uma Mensagem</h3>
        <input class="form-input" type="text" id="contact-name" placeholder="Seu nome" required>
        <input class="form-input" type="email" id="contact-email" placeholder="Seu email">
        <input class="form-input" type="tel" id="contact-phone" placeholder="Seu telefone">
        <textarea class="form-input" id="contact-message" placeholder="Sua mensagem..." rows="3"></textarea>
        <button class="btn btn-primary" onclick="submitContactForm('${escapeHtml(whatsapp)}')">
          📤 Enviar Mensagem
        </button>
      </div>`;
  }

  return `
    <div class="card-container" data-theme="${theme}">
      <div class="card-cover">
        <div class="cover-pattern"></div>
      </div>
      <div class="card-avatar-wrapper">
        <div class="card-avatar">${avatarContent}</div>
      </div>
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
      <div class="card-footer">
        Feito com 💜 <a href="${window.location.origin + window.location.pathname}" onclick="event.preventDefault(); navigateTo('home');">CardLink</a>
      </div>
    </div>`;
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

// ============================================
// Generate Card
// ============================================
function generateCard() {
  const data = getFormData();
  
  if (!data.n) {
    showToast('⚠️', 'Preencha pelo menos o nome!');
    document.getElementById('field-name').focus();
    return;
  }

  // Encode data to URL
  try {
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    window.location.hash = `#card/${encoded}`;
  } catch (e) {
    console.error('Error encoding card data:', e);
    showToast('❌', 'Erro ao gerar cartão. Tente novamente.');
  }
}

// ============================================
// Show Card (Full Page)
// ============================================
function showCardView(data) {
  const theme = data.th || 'midnight';
  
  // Set fullpage background
  const fullpage = document.getElementById('cardFullpage');
  fullpage.setAttribute('data-theme', theme);
  
  // Render the card
  const renderedCard = document.getElementById('rendered-card');
  renderedCard.innerHTML = renderCard(data, false);

  // Generate QR Code
  const currentUrl = window.location.href;
  const qrImg = document.getElementById('qrCodeImg');
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(currentUrl)}&bgcolor=ffffff&color=000000`;

  // Floating WhatsApp button
  const existingFab = document.querySelector('.fab-whatsapp');
  if (existingFab) existingFab.remove();

  if (data.w) {
    const fab = document.createElement('a');
    fab.className = 'fab-whatsapp';
    fab.href = `https://wa.me/${data.w}`;
    fab.target = '_blank';
    fab.rel = 'noopener';
    fab.innerHTML = '💬';
    fab.title = 'Conversar no WhatsApp';
    document.body.appendChild(fab);
  }

  // Save contacts to localStorage for the card owner
  saveCardContact(data);
}

// ============================================
// Contact Form
// ============================================
function submitContactForm(ownerWhatsapp) {
  const name = document.getElementById('contact-name').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const phone = document.getElementById('contact-phone').value.trim();
  const message = document.getElementById('contact-message').value.trim();

  if (!name) {
    showToast('⚠️', 'Preencha seu nome!');
    document.getElementById('contact-name').focus();
    return;
  }

  // Save contact to localStorage (for card owner when they check)
  const contacts = JSON.parse(localStorage.getItem('cardlink_contacts') || '[]');
  contacts.push({
    name,
    email,
    phone,
    message,
    date: new Date().toISOString()
  });
  localStorage.setItem('cardlink_contacts', JSON.stringify(contacts));

  // If owner has WhatsApp, offer to send via WhatsApp too
  if (ownerWhatsapp) {
    const waMessage = `Olá! Sou ${name}.${email ? ' Email: ' + email : ''}${phone ? ' Tel: ' + phone : ''}${message ? '\n\n' + message : ''}`;
    const waUrl = `https://wa.me/${ownerWhatsapp}?text=${encodeURIComponent(waMessage)}`;
    
    // Show success with WhatsApp option
    const formSection = document.getElementById('contactFormSection');
    formSection.innerHTML = `
      <div class="form-success">
        <div class="check-icon">✅</div>
        <h4>Mensagem Enviada!</h4>
        <p>Seus dados foram registrados com sucesso.</p>
        <a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-whatsapp" style="margin-top:16px;">
          💬 Enviar também por WhatsApp
        </a>
      </div>`;
  } else {
    // Show simple success
    const formSection = document.getElementById('contactFormSection');
    formSection.innerHTML = `
      <div class="form-success">
        <div class="check-icon">✅</div>
        <h4>Mensagem Enviada!</h4>
        <p>Seus dados foram registrados com sucesso.</p>
      </div>`;
  }

  showToast('✅', 'Mensagem enviada com sucesso!');
}

// ============================================
// Card Contacts Storage
// ============================================
function saveCardContact(data) {
  // Save the card data so the owner can access contacts later
  if (data.n) {
    localStorage.setItem('cardlink_current_card', JSON.stringify(data));
  }
}

// ============================================
// Share / Copy
// ============================================
function copyCardLink() {
  const url = window.location.href;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('✅', 'Link copiado para a área de transferência!');
    }).catch(() => {
      fallbackCopy(url);
    });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('✅', 'Link copiado!');
  } catch (e) {
    showToast('❌', 'Não foi possível copiar o link.');
  }
  document.body.removeChild(textarea);
}

function shareCard() {
  const url = window.location.href;
  const title = cardData.n ? `Cartão de ${cardData.n}` : 'Meu Cartão Digital';
  const text = cardData.b 
    ? `Confira o cartão digital de ${cardData.n} — ${cardData.b}`
    : `Confira o cartão digital de ${cardData.n || 'contato'}`;

  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else {
    copyCardLink();
  }
}

// ============================================
// Toast Notifications
// ============================================
let toastTimeout;
function showToast(icon, message) {
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toast-icon');
  const toastMessage = document.getElementById('toast-message');

  toastIcon.textContent = icon;
  toastMessage.textContent = message;

  clearTimeout(toastTimeout);
  toast.classList.add('show');

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ============================================
// Intersection Observer (Scroll Animations)
// ============================================
function initIntersectionObserver() {
  const observer = new IntersectionObserver((entries) => {
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
// Utility Functions
// ============================================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
