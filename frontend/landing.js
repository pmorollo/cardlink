/* ============================================
   CardLink — Landing Page Logic (landing.js)
   ============================================ */

const API = window.location.origin + '/api';

// Slug from URL path: /site/:slug
const slug = window.location.pathname.split('/site/')[1]?.split('/')[0] || '';

// Check if owner is viewing (has session token)
const ownerToken = localStorage.getItem('cardlink_token') || null;

let cardData = null;
let galleryAutoPlay = null;
let galleryScrollTimer = null;

// ============================================
// Placeholder Data Banks
// ============================================
const PLACEHOLDER_GALLERY = [
  'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80',
];

const PLACEHOLDER_TESTIMONIALS = [
  { name: 'Mariana Souza', stars: 5, comment: 'Atendimento incrível! Superou todas as minhas expectativas. Profissional dedicado e muito competente. Recomendo sem hesitar.' },
  { name: 'Carlos Oliveira', stars: 5, comment: 'Serviço de altíssima qualidade. Pontual, atencioso e entregou exatamente o que foi prometido. Com certeza voltarei!' },
  { name: 'Ana Beatriz Lima', stars: 5, comment: 'Fiquei impressionada com o nível de profissionalismo. Resultado perfeito e atendimento humanizado. Nota 10!' },
];

// ============================================
// Utils
// ============================================
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function cleanPhone(num) { return (num || '').replace(/\D/g, ''); }

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function removePublicSection(id) {
  document.getElementById(id)?.remove();
  document.querySelectorAll(`a[href="#${id}"]`).forEach(link => {
    const item = link.closest('li');
    if (item) item.remove(); else link.remove();
  });
}

const WHATSAPP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a9.7 9.7 0 0 0-8.4 14.6L2 22l5.5-1.5A9.8 9.8 0 1 0 12 2Zm0 17.8a8 8 0 0 1-4.1-1.1l-.3-.2-3.2.9.9-3.1-.2-.3A8 8 0 1 1 12 19.8Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.3 0-.5.1-.6l.5-.6c.1-.2.1-.4 0-.6l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.2.2 1.8 2.8 4.5 3.8 1.7.7 2.8.8 3.8.5.6-.2 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.2-.1-.4-.2-.6-.3Z"/></svg>';

function escapeVCard(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function saveContact() {
  if (!cardData) return;

  const d = cardData;
  const whatsapp = cleanPhone(d.whatsapp);
  const phone = cleanPhone(d.phone);
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCard(d.name || d.business || 'Contato')}`,
    d.business ? `ORG:${escapeVCard(d.business)}` : '',
    d.title ? `TITLE:${escapeVCard(d.title)}` : '',
    whatsapp ? `TEL;TYPE=CELL:${whatsapp}` : '',
    phone && phone !== whatsapp ? `TEL;TYPE=WORK,VOICE:${phone}` : '',
    d.email ? `EMAIL;TYPE=INTERNET:${escapeVCard(d.email)}` : '',
    d.address ? `ADR;TYPE=WORK:;;${escapeVCard(d.address)};;;;` : '',
    `URL:${window.location.origin}/site/${encodeURIComponent(d.slug || slug)}`,
    'END:VCARD'
  ].filter(Boolean);

  const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = (d.name || d.business || 'contato')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '') || 'contato';

  link.href = url;
  link.download = `${filename}.vcf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  const button = document.getElementById('save-contact-btn');
  if (button) {
    const original = button.innerHTML;
    button.innerHTML = '✅ Contato pronto para salvar';
    window.setTimeout(() => { button.innerHTML = original; }, 2500);
  }
  toast('✅', 'Contato gerado. Confirme para adicioná-lo à agenda.');
}

let toastTimer;
function toast(icon, msg) {
  const el = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-message').textContent = msg;
  clearTimeout(toastTimer);
  el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

function showHomeScreenGuide() {
  if (new URLSearchParams(window.location.search).get('fixar') !== '1') return;

  const guide = document.getElementById('home-screen-guide');
  const text = document.getElementById('home-screen-guide-text');
  if (!guide || !text) return;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  text.textContent = isIOS
    ? 'Este é o seu cartão. No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.'
    : 'Este é o seu cartão. Abra o menu do navegador e escolha “Adicionar à tela inicial”.';
  guide.style.display = 'flex';

  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('fixar');
  window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
}

function dismissHomeScreenGuide() {
  const guide = document.getElementById('home-screen-guide');
  if (guide) guide.style.display = 'none';
}

function makePlaceholderHint(containerId, label = 'Personalizar') {
  if (!ownerToken) return;
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<a class="placeholder-hint" href="${window.location.origin}/#builder" title="Editar no painel">✏️ ${label} no painel</a>`;
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ============================================
// Init
// ============================================
async function init() {
  if (!slug) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;color:#a1a1aa;">Site não encontrado.</div>';
    return;
  }

  try {
    cardData = await fetch(`${API}/public/${slug}`).then(r => {
      if (r.status === 402) throw new Error('payment_required');
      if (!r.ok) throw new Error('not_found');
      return r.json();
    });
  } catch (err) {
    if (err.message === 'payment_required') {
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;color:#ffffff;background:#0f172a;flex-direction:column;gap:16px;padding:20px;text-align:center;">
          <span style="font-size:4rem;margin-bottom:10px;">🔒</span>
          <h1 style="font-size:1.6rem;font-weight:800;margin:0;background:linear-gradient(135deg, #a78bfa, #60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Página Temporariamente Offline</h1>
          <p style="color:#94a3b8;font-size:0.95rem;max-width:400px;line-height:1.6;margin:0 0 10px;">
            Este cartão de visitas digital foi configurado pelo proprietário, mas a assinatura está pendente de ativação.
          </p>
          <p style="color:#64748b;font-size:0.8rem;margin:0;">
            Se você é o dono deste cartão, acesse o painel e realize a ativação para colocá-lo no ar!
          </p>
          <a href="/#auth" style="display:inline-block;margin-top:15px;padding:10px 20px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;font-size:0.85rem;font-weight:bold;box-shadow: 0 4px 12px rgba(124,58,237,0.2);">
            Acessar Painel CardLink
          </a>
        </div>
      `;
    } else {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;color:#a1a1aa;flex-direction:column;gap:16px;background:#0f172a;"><span style="font-size:3rem;">😕</span><p>Landing page não encontrada.</p></div>';
    }
    return;
  }

  applyTheme(cardData.theme || 'midnight');
  renderNav(cardData);
  renderHero(cardData);
  renderAbout(cardData);
  renderServices(cardData);
  renderGallery(cardData);
  renderTestimonials(cardData);
  renderSocial(cardData);
  renderContact(cardData);
  renderFooter(cardData);
  showHomeScreenGuide();


  document.title = `${cardData.name} — ${cardData.business || 'Site Profissional'}`;

  // Check if logged in user owns this landing page
  if (ownerToken) {
    try {
      const cardSummary = await fetch(`${API}/cards/stats/summary`, {
        headers: { 'Authorization': `Bearer ${ownerToken}` }
      }).then(r => r.ok ? r.json() : null);

      if (cardSummary && cardSummary.card && cardSummary.card.slug === slug) {
        const ownerBar = document.getElementById('card-owner-bar');
        if (ownerBar) {
          ownerBar.style.display = 'flex';
          document.body.classList.add('has-owner-bar');

          const syncOwnerBarOffset = () => {
            document.documentElement.style.setProperty('--owner-bar-height', `${ownerBar.offsetHeight}px`);
          };
          syncOwnerBarOffset();
          if ('ResizeObserver' in window) {
            new ResizeObserver(syncOwnerBarOffset).observe(ownerBar);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to verify card ownership:', e);
    }
  }

  initScrollAnimations();
  // Atendimento público acontece diretamente pelo WhatsApp.
}


// ============================================
// Theme
// ============================================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('hero').setAttribute('data-theme', theme);
}

// ============================================
// NAV
// ============================================
function renderNav(d) {
  const brandEl = document.getElementById('nav-business-name');
  if (brandEl) brandEl.textContent = d.business || d.name || 'CardLink';
  const brandMark = document.getElementById('nav-brand-mark');
  if (brandMark) brandMark.textContent = (d.business || d.name || 'C').trim().charAt(0).toUpperCase();

  const userPhoto = document.getElementById('nav-user-photo');
  if (userPhoto) {
    if (d.photo_url) {
      userPhoto.src = d.photo_url;
      userPhoto.style.display = 'block';
    } else {
      userPhoto.style.display = 'none';
    }
  }
}

// ============================================
// HERO
// ============================================
function renderHero(d) {
  const name = d.name || 'Profissional';
  const business = d.business || '';

  // O início destaca o negócio; nome e atividade ficam na seção de contato.
  const titleEl = document.getElementById('hero-title');
  if (titleEl) {
    titleEl.innerHTML = `<span class="lp-business-name">${esc(business || name)}</span>`;
  }

  // CTA Button
  const ctaBtn = document.getElementById('hero-cta-btn');
  if (ctaBtn) {
    if (d.whatsapp) {
      ctaBtn.href = `https://wa.me/${cleanPhone(d.whatsapp)}?text=${encodeURIComponent('Olá! Vim pelo seu CardLink.')}`;
      ctaBtn.target = '_blank';
      ctaBtn.rel = 'noopener';
      ctaBtn.className = 'btn btn-whatsapp-action btn-lg';
      ctaBtn.innerHTML = `${WHATSAPP_ICON}<span>Falar no WhatsApp</span>`;
    } else if (d.phone) {
      ctaBtn.href = `tel:${d.phone}`;
      ctaBtn.className = 'btn btn-primary btn-lg';
      ctaBtn.innerHTML = 'Ligar agora';
    } else {
      ctaBtn.href = '#contato';
      ctaBtn.className = 'btn btn-primary btn-lg';
      ctaBtn.innerHTML = 'Entrar em contato';
    }
  }

  const saveBtn = document.getElementById('save-contact-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveContact);
  }

  // Avatar
  const avatarEl = document.getElementById('hero-avatar');
  if (avatarEl) {
    const initialsName = business || name;
    const initialsLogo = (initialsName.split(' ').map(w => w[0]).join('').substring(0, 2) || 'C').toUpperCase();
    if (d.logo_url) {
      avatarEl.innerHTML = `<img src="${esc(d.logo_url)}" alt="${esc(name)}" onerror="this.parentElement.textContent='${initialsLogo}'">`;
    } else {
      avatarEl.textContent = initialsLogo;
    }
  }

}

// ============================================
// ABOUT
// ============================================
function renderAbout(d) {
  const name = d.name || 'Profissional';
  const business = typeof d.business === 'string' ? d.business.trim() : '';
  const description = typeof d.description === 'string' ? d.description.trim() : '';
  const isPlaceholder = !description;

  if (isPlaceholder && !ownerToken) {
    removePublicSection('sobre');
    return;
  }

  // A seção apresenta o negócio sem repetir nome ou atividade do profissional.
  const aboutTitle = document.getElementById('about-title');
  if (aboutTitle) aboutTitle.textContent = 'Apresentação';

  // O selo identifica apenas o negócio, sem repetir nome ou atividade.
  const badge = document.getElementById('about-badge');
  const badgeBusiness = document.getElementById('about-badge-business');
  if (badgeBusiness) badgeBusiness.textContent = business;
  if (badge) badge.style.display = business ? '' : 'none';

  // Use only an image supplied by the owner; never invent a stock image.
  const imgWrap = document.getElementById('about-image');
  const imageColumn = imgWrap?.closest('.lp-about-image-wrap');
  const aboutGrid = imgWrap?.closest('.lp-about-grid');
  const aboutImg = (d.gallery && d.gallery.length > 0)
    ? d.gallery[0]
    : (d.logo_url || d.photo_url || '');
  if (imgWrap && aboutImg) {
    imgWrap.innerHTML = `<img src="${esc(aboutImg)}" alt="${esc(name)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<div class=lp-about-image-placeholder><span style=font-size:5rem>👤</span></div>'">`;
  } else if (imgWrap && ownerToken) {
    imgWrap.innerHTML = '<div class="lp-about-image-placeholder"><span style="font-size:5rem">👤</span></div>';
  } else if (imageColumn) {
    imageColumn.style.display = 'none';
    aboutGrid?.classList.add('lp-about-grid-single');
  }

  // Description
  const descEl = document.getElementById('about-description');
  if (descEl) {
    descEl.textContent = description;
  }

  // Placeholder hint for owner
  if (isPlaceholder && ownerToken) makePlaceholderHint('about-placeholder-hint', 'Adicionar descrição');
}

// ============================================
// SERVICES
// ============================================
function renderServices(d) {
  const grid = document.getElementById('services-grid');
  if (!grid) return;

  const titleEl = document.getElementById('services-title');
  const descEl = document.getElementById('services-desc');
  const products = Array.isArray(d.products)
    ? d.products.filter(product => cleanText(product?.name))
    : [];
  const mode = d.services_mode || (products.length ? 'list' : 'image');
  const sectionTitle = d.services_title || (mode === 'image' ? 'Destaque' : 'Meus Serviços');
  const servicesImageUrl = cleanText(d.services_image_url);
  const hasImage = mode === 'image' && !!servicesImageUrl;
  const hasRealServices = mode === 'list' && products.length > 0;

  if (titleEl) titleEl.textContent = sectionTitle;
  if (descEl) {
    descEl.textContent = hasImage
      ? 'Confira as informações em destaque.'
      : 'Soluções pensadas para atender você com qualidade e atenção.';
  }

  if (hasImage) {
    grid.style.display = 'block';
    grid.innerHTML = `
      <div class="animate-in" style="max-width:920px;margin:0 auto;text-align:center;">
        <img src="${esc(servicesImageUrl)}" alt="${esc(sectionTitle)}"
          style="width:100%;height:auto;max-height:1200px;object-fit:contain;border-radius:18px;border:1px solid var(--border);background:var(--surface);box-shadow:var(--shadow-sm);"
          onerror="this.closest('#servicos')?.remove()">
      </div>`;
    return;
  }

  if (!hasRealServices) {
    removePublicSection('servicos');
    return;
  }

  grid.style.display = '';
  const services = products;

  grid.innerHTML = services.map((s, i) => {
    const waMsg = encodeURIComponent(`Olá! Tenho interesse no serviço: ${s.name}${s.price ? ' (R$ ' + s.price + ')' : ''}`);
    const waUrl = d.whatsapp ? `https://wa.me/${cleanPhone(d.whatsapp)}?text=${waMsg}` : '#contato';
    const serviceNumber = String(i + 1).padStart(2, '0');

    return `
      <div class="lp-service-card animate-in">
        ${s.photo_url
          ? `<img src="${esc(s.photo_url)}" class="lp-service-img" alt="${esc(s.name)}" onerror="this.style.display='none'">`
          : `<div class="lp-service-img-placeholder"><span>${serviceNumber}</span></div>`}
        <div class="lp-service-body">
          <div class="lp-service-name">${esc(s.name)}</div>
          ${s.description ? `<div class="lp-service-desc">${esc(s.description)}</div>` : ''}
          <div class="lp-service-footer">
            ${s.price ? `<div class="lp-service-price">R$ ${esc(s.price)}</div>` : '<div></div>'}
            <a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm">
              ${WHATSAPP_ICON}<span>Solicitar</span>
            </a>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ============================================
// GALLERY
// ============================================
function renderGallery(d) {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  const hasRealGallery = d.gallery && d.gallery.length > 0;
  if (!hasRealGallery && !ownerToken) {
    removePublicSection('galeria');
    return;
  }
  const photos = hasRealGallery ? d.gallery : PLACEHOLDER_GALLERY;
  const isPlaceholder = !hasRealGallery;

  if (isPlaceholder) makePlaceholderHint('gallery-placeholder-hint', 'Adicionar suas fotos reais');

  const visiblePhotos = photos.slice(0, 6);
  grid.innerHTML = `
    <div class="lp-gallery-carousel animate-in" tabindex="0" aria-label="Galeria de fotos">
      <div class="lp-gallery-track" id="gallery-track">
        ${visiblePhotos.map((url, i) => `
          <button class="lp-gallery-slide" type="button" data-image-src="${esc(url)}" onclick="openGalleryLightbox(this.dataset.imageSrc, 'Foto ${i + 1}')" aria-label="Ampliar foto ${i + 1}">
            <img src="${esc(url)}" alt="Foto ${i + 1}" loading="lazy" onerror="this.closest('.lp-gallery-slide').remove(); refreshGalleryCarousel()">
          </button>`).join('')}
      </div>
      ${visiblePhotos.length > 1 ? `
        <button class="lp-gallery-arrow lp-gallery-prev" type="button" onclick="moveGallery(-1, true)" aria-label="Foto anterior">‹</button>
        <button class="lp-gallery-arrow lp-gallery-next" type="button" onclick="moveGallery(1, true)" aria-label="Próxima foto">›</button>
        <div class="lp-gallery-dots" id="gallery-dots">
          ${visiblePhotos.map((_, i) => `<button type="button" class="lp-gallery-dot${i === 0 ? ' active' : ''}" onclick="goToGallerySlide(${i}, true)" aria-label="Ir para foto ${i + 1}"></button>`).join('')}
        </div>` : ''}
    </div>`;

  const track = document.getElementById('gallery-track');
  const carousel = grid.querySelector('.lp-gallery-carousel');
  track?.addEventListener('scroll', () => {
    window.clearTimeout(galleryScrollTimer);
    galleryScrollTimer = window.setTimeout(syncGalleryDots, 80);
  }, { passive: true });
  track?.addEventListener('pointerdown', stopGalleryAutoPlay, { once: true });
  carousel?.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveGallery(event.key === 'ArrowRight' ? 1 : -1, true);
    }
  });
  startGalleryAutoPlay();
}

function gallerySlides() {
  return Array.from(document.querySelectorAll('#gallery-track .lp-gallery-slide'));
}

function currentGalleryIndex() {
  const track = document.getElementById('gallery-track');
  if (!track || !track.clientWidth) return 0;
  return Math.min(gallerySlides().length - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth)));
}

function goToGallerySlide(index, interacted = false) {
  const track = document.getElementById('gallery-track');
  const slides = gallerySlides();
  if (!track || slides.length < 2) return;
  if (interacted) stopGalleryAutoPlay();
  const target = (index + slides.length) % slides.length;
  track.scrollTo({ left: target * track.clientWidth, behavior: 'smooth' });
  updateGalleryDots(target);
}

function moveGallery(direction, interacted = false) {
  goToGallerySlide(currentGalleryIndex() + direction, interacted);
}

function updateGalleryDots(index) {
  document.querySelectorAll('#gallery-dots .lp-gallery-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
    dot.setAttribute('aria-current', i === index ? 'true' : 'false');
  });
}

function syncGalleryDots() {
  updateGalleryDots(currentGalleryIndex());
}

function startGalleryAutoPlay() {
  stopGalleryAutoPlay();
  if (gallerySlides().length < 2) return;
  galleryAutoPlay = window.setInterval(() => moveGallery(1), 5000);
}

function stopGalleryAutoPlay() {
  if (galleryAutoPlay) window.clearInterval(galleryAutoPlay);
  galleryAutoPlay = null;
}

function refreshGalleryCarousel() {
  const slides = gallerySlides();
  if (!slides.length) {
    removePublicSection('galeria');
    stopGalleryAutoPlay();
    return;
  }
  if (slides.length === 1) {
    document.querySelectorAll('.lp-gallery-arrow, .lp-gallery-dots').forEach(el => el.remove());
    stopGalleryAutoPlay();
    return;
  }
  const dots = document.getElementById('gallery-dots');
  if (dots) dots.innerHTML = slides.map((_, i) => `<button type="button" class="lp-gallery-dot${i === 0 ? ' active' : ''}" onclick="goToGallerySlide(${i}, true)" aria-label="Ir para foto ${i + 1}"></button>`).join('');
  goToGallerySlide(0);
  startGalleryAutoPlay();
}

function openGalleryLightbox(url, alt) {
  let lightbox = document.getElementById('gallery-lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'gallery-lightbox';
    lightbox.className = 'gallery-lightbox';
    lightbox.innerHTML = '<button type="button" class="gallery-lightbox-close" aria-label="Fechar imagem">×</button><img>';
    lightbox.addEventListener('click', event => {
      if (event.target === lightbox || event.target.closest('.gallery-lightbox-close')) closeGalleryLightbox();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeGalleryLightbox(); });
    document.body.appendChild(lightbox);
  }
  const image = lightbox.querySelector('img');
  image.src = url;
  image.alt = alt || 'Foto ampliada';
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  lightbox.querySelector('.gallery-lightbox-close').focus();
}

function closeGalleryLightbox() {
  document.getElementById('gallery-lightbox')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ============================================
// TESTIMONIALS
// ============================================
function renderTestimonials(d) {
  const grid = document.getElementById('testimonials-grid');
  if (!grid) return;

  const hasReal = d.testimonials && d.testimonials.length > 0;
  if (!hasReal && !ownerToken) {
    removePublicSection('depoimentos');
    return;
  }
  const list = hasReal ? d.testimonials : PLACEHOLDER_TESTIMONIALS;
  const isPlaceholder = !hasReal;

  if (isPlaceholder) makePlaceholderHint('testimonials-placeholder-hint', 'Adicionar depoimentos reais');

  grid.innerHTML = list.map(t => {
    const n = Math.min(5, Math.max(1, t.stars || 5));
    const stars = '★'.repeat(n) + '☆'.repeat(5 - n);
    const initials = (t.name || 'C').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    return `
      <div class="lp-testimonial-card animate-in">
        <div class="lp-testimonial-quote">"</div>
        <p class="lp-testimonial-text">${esc(t.comment || 'Excelente atendimento! Muito profissional e dedicado.')}</p>
        <div class="lp-testimonial-author">
          <div class="lp-testimonial-avatar">${initials}</div>
          <div>
            <div class="lp-testimonial-name">${esc(t.name)}</div>
            <div class="lp-testimonial-stars">${stars}</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ============================================
// SOCIAL
// ============================================
function renderSocial(d) {
  const strip = document.getElementById('social-strip');
  const section = document.getElementById('redes');
  if (!strip) return;

  const socials = [];
  const instagram = cleanText(d.instagram);
  const facebook = cleanText(d.facebook);
  const linkedin = cleanText(d.linkedin);
  const tiktok = cleanText(d.tiktok);
  const youtube = cleanText(d.youtube);
  const twitter = cleanText(d.twitter);
  if (instagram) {
    const url = instagram.startsWith('@') ? `https://instagram.com/${instagram.substring(1)}` : instagram.includes('instagram.com') ? (instagram.startsWith('http') ? instagram : `https://${instagram}`) : `https://instagram.com/${instagram}`;
    socials.push({ url, icon: 'IG', label: 'Instagram' });
  }
  if (facebook) {
    const url = facebook.includes('facebook.com') ? (facebook.startsWith('http') ? facebook : `https://${facebook}`) : `https://facebook.com/${facebook}`;
    socials.push({ url, icon: 'f', label: 'Facebook' });
  }
  if (linkedin) {
    const url = linkedin.includes('linkedin.com') ? (linkedin.startsWith('http') ? linkedin : `https://${linkedin}`) : `https://linkedin.com/in/${linkedin}`;
    socials.push({ url, icon: 'in', label: 'LinkedIn' });
  }
  if (tiktok) {
    const url = tiktok.startsWith('@') ? `https://tiktok.com/${tiktok}` : `https://tiktok.com/@${tiktok}`;
    socials.push({ url, icon: 'TT', label: 'TikTok' });
  }
  if (youtube) {
    const url = youtube.includes('youtube.com') ? (youtube.startsWith('http') ? youtube : `https://${youtube}`) : `https://youtube.com/@${youtube}`;
    socials.push({ url, icon: 'YT', label: 'YouTube' });
  }
  if (twitter) {
    const url = twitter.startsWith('@') ? `https://x.com/${twitter.substring(1)}` : `https://x.com/${twitter}`;
    socials.push({ url, icon: 'X', label: 'X' });
  }

  if (socials.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  strip.innerHTML = socials.map(s => `
    <a href="${esc(s.url)}" target="_blank" rel="noopener" class="lp-social-btn">
      <span class="lp-social-mark">${s.icon}</span><span>${s.label}</span>
    </a>`).join('');
}

// ============================================
// CONTACT
// ============================================
function renderContact(d) {
  const links = document.getElementById('contact-links');
  if (!links) return;

  const contactTitle = document.getElementById('contact-title');
  if (contactTitle) {
    const name = d.name || 'Profissional';
    const role = typeof d.title === 'string' ? d.title.trim() : '';
    contactTitle.innerHTML = `
      <span class="lp-contact-name">${esc(name)}</span>
      ${role ? `<span class="lp-contact-role">${esc(role)}</span>` : ''}`;
  }

  const items = [];
  if (d.whatsapp) items.push({
    href: `https://wa.me/${cleanPhone(d.whatsapp)}?text=${encodeURIComponent('Olá! Vim pelo seu CardLink.')}`,
    icon: '💬', label: 'WhatsApp', value: d.whatsapp, target: '_blank'
  });
  if (d.phone) items.push({
    href: `tel:${d.phone}`,
    icon: '📞', label: 'Telefone', value: d.phone
  });
  if (d.email) items.push({
    href: `mailto:${d.email}`,
    icon: '📧', label: 'E-mail', value: d.email
  });
  if (d.address) items.push({
    href: `https://www.google.com/maps/search/${encodeURIComponent(d.address)}`,
    icon: '📍', label: 'Endereço', value: d.address, target: '_blank'
  });

  links.innerHTML = items.map(item => `
    <a href="${esc(item.href)}" ${item.target ? `target="${item.target}" rel="noopener"` : ''} class="lp-contact-link">
      <div class="lp-contact-link-icon">${item.icon}</div>
      <div>
        <div class="lp-contact-link-label">${item.label}</div>
        <div class="lp-contact-link-value">${esc(item.value)}</div>
      </div>
    </a>`).join('');
}

// ============================================
// FOOTER
// ============================================
function renderFooter(d) {
  const nameEl = document.getElementById('footer-name');
  if (nameEl) nameEl.textContent = d.business || d.name || 'CardLink';
  const footerMark = document.getElementById('footer-brand-mark');
  if (footerMark) footerMark.textContent = (d.business || d.name || 'C').trim().charAt(0).toUpperCase();

  const nav = document.getElementById('footer-nav');
  if (nav) {
    const items = [
      ['sobre', 'Sobre'], ['servicos', 'Serviços'], ['galeria', 'Galeria'], ['contato', 'Contato']
    ].filter(([id]) => document.getElementById(id));
    nav.innerHTML = items.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('');
  }
}



// ============================================
// Contact Form Submit
// ============================================
async function submitForm() {
  const name    = document.getElementById('cf-name')?.value.trim();
  const email   = document.getElementById('cf-email')?.value.trim();
  const phone   = document.getElementById('cf-phone')?.value.trim();
  const message = document.getElementById('cf-message')?.value.trim();

  if (!name) { toast('⚠️', 'Preencha seu nome!'); return; }

  try {
    const res = await fetch(`${API}/public/${slug}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, message })
    });
    if (!res.ok) throw new Error('Erro ao enviar');

    document.querySelector('.lp-contact-form').innerHTML = `
      <div style="text-align:center;padding:48px 0;">
        <div style="font-size:4rem;margin-bottom:16px;">✅</div>
        <h3 style="font-family:var(--font-display);font-size:1.6rem;margin-bottom:12px;">Mensagem Enviada!</h3>
        <p style="color:var(--text-secondary);">Em breve entraremos em contato. Obrigado!</p>
      </div>`;
    toast('✅', 'Mensagem enviada com sucesso!');
  } catch {
    toast('❌', 'Erro ao enviar. Tente novamente.');
  }
}

// ============================================
// Scroll Animations
// ============================================
function initScrollAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));
}

// ============================================
// Boot
// ============================================
document.addEventListener('DOMContentLoaded', init);

// ============================================
