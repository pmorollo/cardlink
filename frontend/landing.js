/* ============================================
   CardLink — Landing Page Logic (landing.js)
   ============================================ */

const API = window.location.origin + '/api';

// Slug from URL path: /site/:slug
const slug = window.location.pathname.split('/site/')[1]?.split('/')[0] || '';

// Check if owner is viewing (has session token)
const ownerToken = sessionStorage.getItem('cardlink_token') || null;

let cardData = null;

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

// Smart service suggestions by profession keywords
const SERVICE_SUGGESTIONS = {
  'cabeleire': [
    { name: 'Corte de Cabelo', price: '60,00', description: 'Corte personalizado para o seu estilo', photo_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80' },
    { name: 'Coloração', price: '120,00', description: 'Transforme seu visual com coloração profissional', photo_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80' },
    { name: 'Escova Progressiva', price: '180,00', description: 'Alise e hidrate seus fios com técnica premium', photo_url: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400&q=80' },
  ],
  'designer': [
    { name: 'Identidade Visual', price: '800,00', description: 'Logo, paleta de cores e manual da marca completo', photo_url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&q=80' },
    { name: 'Social Media', price: '400,00', description: 'Criação de posts e stories profissionais por mês', photo_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80' },
    { name: 'Website Design', price: '1.500,00', description: 'Layout moderno e responsivo para o seu negócio', photo_url: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&q=80' },
  ],
  'nutri': [
    { name: 'Consulta Nutricional', price: '180,00', description: 'Avaliação completa e plano alimentar personalizado', photo_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80' },
    { name: 'Acompanhamento Mensal', price: '300,00', description: 'Retorno e ajustes do plano alimentar', photo_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80' },
    { name: 'Dieta Esportiva', price: '220,00', description: 'Plano nutricional focado em performance', photo_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80' },
  ],
  'advogad': [
    { name: 'Consulta Jurídica', price: '250,00', description: 'Orientação legal personalizada para sua situação', photo_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=80' },
    { name: 'Elaboração de Contratos', price: '500,00', description: 'Contratos seguros e personalizados', photo_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&q=80' },
    { name: 'Assessoria Jurídica', price: '800,00', description: 'Acompanhamento jurídico mensal', photo_url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&q=80' },
  ],
  'fotograf': [
    { name: 'Ensaio Fotográfico', price: '350,00', description: 'Sessão de fotos profissional com edição inclusa', photo_url: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&q=80' },
    { name: 'Fotografia de Eventos', price: '800,00', description: 'Cobertura completa do seu evento especial', photo_url: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=400&q=80' },
    { name: 'Fotos para E-commerce', price: '500,00', description: 'Imagens profissionais dos seus produtos', photo_url: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=80' },
  ],
};

const DEFAULT_SERVICES = [
  { name: 'Consultoria', price: '200,00', description: 'Atendimento personalizado para suas necessidades', photo_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80' },
  { name: 'Serviço Premium', price: '350,00', description: 'Solução completa com acompanhamento especializado', photo_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80' },
  { name: 'Pacote Completo', price: '600,00', description: 'Tudo que você precisa em um único pacote', photo_url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&q=80' },
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

let toastTimer;
function toast(icon, msg) {
  const el = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-message').textContent = msg;
  clearTimeout(toastTimer);
  el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

function makePlaceholderHint(containerId, label = 'Personalizar') {
  if (!ownerToken) return;
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<a class="placeholder-hint" href="${window.location.origin}/#builder" title="Editar no painel">✏️ ${label} no painel</a>`;
}

function getSmartServices(title, business) {
  const text = ((title || '') + ' ' + (business || '')).toLowerCase();
  for (const [key, services] of Object.entries(SERVICE_SUGGESTIONS)) {
    if (text.includes(key)) return services;
  }
  return DEFAULT_SERVICES;
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ============================================
// Init
// ============================================
async function init() {
  if (!slug) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;color:#a1a1aa;">Cartão não encontrado.</div>';
    return;
  }

  try {
    cardData = await fetch(`${API}/public/${slug}`).then(r => {
      if (!r.ok) throw new Error('not found');
      return r.json();
    });
  } catch {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;color:#a1a1aa;flex-direction:column;gap:16px;"><span style="font-size:3rem;">😕</span><p>Landing page não encontrada.</p></div>';
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
  renderFab(cardData);

  document.title = `${cardData.name} — ${cardData.business || 'Site Profissional'}`;

  initScrollAnimations();
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

  const ctaBtn = document.getElementById('nav-contact-btn');
  if (ctaBtn && d.whatsapp) {
    ctaBtn.href = `https://wa.me/${cleanPhone(d.whatsapp)}`;
    ctaBtn.target = '_blank';
    ctaBtn.rel = 'noopener';
    ctaBtn.innerHTML = '💬 WhatsApp';
  }
}

// ============================================
// HERO
// ============================================
function renderHero(d) {
  const name = d.name || 'Profissional';
  const business = d.business || '';
  const title = d.title || '';
  const initials = (name.split(' ').map(w => w[0]).join('').substring(0, 2) || 'P').toUpperCase();

  // Badge
  const badgeEl = document.getElementById('hero-badge-text');
  if (badgeEl) badgeEl.textContent = title || business || 'Profissional';

  // Title
  const titleEl = document.getElementById('hero-title');
  if (titleEl) titleEl.innerHTML = `Bem-vindo ao espaço de<br><span class="text-gradient">${esc(name)}</span>`;

  // Subtitle
  const subEl = document.getElementById('hero-subtitle');
  if (subEl) {
    subEl.textContent = d.description
      ? d.description.substring(0, 120)
      : `${title ? title + ' — ' : ''}${business ? business + '. ' : ''}Conheça meu trabalho e entre em contato!`;
  }

  // CTA Button
  const ctaBtn = document.getElementById('hero-cta-btn');
  if (ctaBtn) {
    if (d.whatsapp) {
      ctaBtn.href = `https://wa.me/${cleanPhone(d.whatsapp)}`;
      ctaBtn.target = '_blank';
      ctaBtn.rel = 'noopener';
      ctaBtn.innerHTML = '💬 Falar no WhatsApp';
    } else if (d.phone) {
      ctaBtn.href = `tel:${d.phone}`;
      ctaBtn.innerHTML = '📞 Ligar Agora';
    } else {
      ctaBtn.href = '#contato';
      ctaBtn.innerHTML = '📩 Entrar em Contato';
    }
  }

  // Avatar
  const avatarEl = document.getElementById('hero-avatar');
  if (avatarEl) {
    if (d.photo_url) {
      avatarEl.innerHTML = `<img src="${esc(d.photo_url)}" alt="${esc(name)}" onerror="this.parentElement.textContent='${initials}'">`;
    } else {
      avatarEl.textContent = initials;
    }
  }

  // Stats pills
  const statsEl = document.getElementById('hero-stats');
  if (statsEl) {
    const pills = [];
    if (d.phone || d.whatsapp) pills.push(`📞 <strong>Atendimento</strong>`);
    if (title) pills.push(`🎓 <strong>${esc(title)}</strong>`);
    if (business) pills.push(`🏢 <strong>${esc(business)}</strong>`);
    statsEl.innerHTML = pills.map(p => `<div class="lp-stat-pill">${p}</div>`).join('');
  }
}

// ============================================
// ABOUT
// ============================================
function renderAbout(d) {
  const name = d.name || 'Profissional';
  const title = d.title || '';
  const business = d.business || '';
  const isPlaceholder = !d.description;

  // Title
  const aboutTitle = document.getElementById('about-title');
  if (aboutTitle) aboutTitle.innerHTML = `Quem é <span class="text-gradient">${esc(name)}</span>?`;

  // About image: use professional stock photo so self photo isn't duplicated from Hero
  const imgWrap = document.getElementById('about-image');
  if (imgWrap) {
    const aboutImg = (d.gallery && d.gallery.length > 0)
      ? d.gallery[0]
      : 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80';
    imgWrap.innerHTML = `<img src="${esc(aboutImg)}" alt="${esc(name)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<div class=lp-about-image-placeholder><span style=font-size:5rem>👤</span></div>'">`;
  }

  // Badge
  const badgeValue = document.getElementById('about-badge-value');
  const badgeLabel = document.getElementById('about-badge-label');
  if (badgeValue) badgeValue.textContent = title ? title.split(' ')[0] : '⭐';
  if (badgeLabel) badgeLabel.textContent = business || 'Profissional';

  // Description
  const descEl = document.getElementById('about-description');
  if (descEl) {
    if (d.description) {
      descEl.textContent = d.description;
    } else {
      descEl.innerHTML = `<em style="color:var(--text-muted);">Olá! Sou ${esc(name)}${title ? ', ' + esc(title) : ''}${business ? ' em ' + esc(business) : ''}. Trabalho com dedicação e qualidade para oferecer o melhor atendimento. Estou aqui para ajudar você a alcançar seus objetivos!</em>`;
    }
  }

  // Highlights
  const highlightsEl = document.getElementById('about-highlights');
  if (highlightsEl) {
    const items = [];
    if (d.phone || d.whatsapp) items.push(['📞', 'Atendimento personalizado']);
    if (d.email) items.push(['📧', esc(d.email)]);
    if (d.address) items.push(['📍', esc(d.address)]);
    items.push(['⭐', 'Qualidade e comprometimento']);
    items.push(['🤝', 'Satisfação garantida']);
    highlightsEl.innerHTML = items.map(([icon, text]) => `
      <div class="lp-about-highlight">
        <div class="lp-about-highlight-icon">${icon}</div>
        <span>${text}</span>
      </div>`).join('');
  }

  // Placeholder hint for owner
  if (isPlaceholder) makePlaceholderHint('about-placeholder-hint', 'Adicionar descrição');
}

// ============================================
// SERVICES
// ============================================
function renderServices(d) {
  const grid = document.getElementById('services-grid');
  if (!grid) return;

  const hasRealServices = d.products && d.products.length > 0;
  const services = hasRealServices ? d.products : getSmartServices(d.title, d.business);
  const isPlaceholder = !hasRealServices;

  if (!hasRealServices) makePlaceholderHint('services-placeholder-hint', 'Adicionar seus serviços reais');

  grid.innerHTML = services.map((s, i) => {
    const waMsg = encodeURIComponent(`Olá! Tenho interesse no serviço: ${s.name}${s.price ? ' (R$ ' + s.price + ')' : ''}`);
    const waUrl = d.whatsapp ? `https://wa.me/${cleanPhone(d.whatsapp)}?text=${waMsg}` : '#contato';
    const emoji = ['🎯','✨','🚀','💡','🏆','🎨'][i % 6];

    return `
      <div class="lp-service-card animate-in">
        ${s.photo_url
          ? `<img src="${esc(s.photo_url)}" class="lp-service-img" alt="${esc(s.name)}" onerror="this.style.display='none'">`
          : `<div class="lp-service-img-placeholder">${emoji}</div>`}
        <div class="lp-service-body">
          <div class="lp-service-name">${esc(s.name)}</div>
          ${s.description ? `<div class="lp-service-desc">${esc(s.description)}</div>` : ''}
          <div class="lp-service-footer">
            ${s.price ? `<div class="lp-service-price">R$ ${esc(s.price)}</div>` : '<div></div>'}
            <a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm">
              🛒 Encomendar
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
  const photos = hasRealGallery ? d.gallery : PLACEHOLDER_GALLERY;
  const isPlaceholder = !hasRealGallery;

  if (isPlaceholder) makePlaceholderHint('gallery-placeholder-hint', 'Adicionar suas fotos reais');

  grid.innerHTML = photos.slice(0, 6).map((url, i) => `
    <div class="lp-gallery-item animate-in">
      <img src="${esc(url)}" alt="Foto ${i + 1}" loading="lazy" onerror="this.parentElement.style.display='none'">
      <div class="lp-gallery-overlay">🔍</div>
    </div>`).join('');
}

// ============================================
// TESTIMONIALS
// ============================================
function renderTestimonials(d) {
  const grid = document.getElementById('testimonials-grid');
  if (!grid) return;

  const hasReal = d.testimonials && d.testimonials.length > 0;
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
  if (d.instagram) {
    const url = d.instagram.startsWith('@') ? `https://instagram.com/${d.instagram.substring(1)}` : d.instagram.includes('instagram.com') ? (d.instagram.startsWith('http') ? d.instagram : `https://${d.instagram}`) : `https://instagram.com/${d.instagram}`;
    socials.push({ url, icon: '📷', label: 'Instagram' });
  }
  if (d.facebook) {
    const url = d.facebook.includes('facebook.com') ? (d.facebook.startsWith('http') ? d.facebook : `https://${d.facebook}`) : `https://facebook.com/${d.facebook}`;
    socials.push({ url, icon: '📘', label: 'Facebook' });
  }
  if (d.linkedin) {
    const url = d.linkedin.includes('linkedin.com') ? (d.linkedin.startsWith('http') ? d.linkedin : `https://${d.linkedin}`) : `https://linkedin.com/in/${d.linkedin}`;
    socials.push({ url, icon: '💼', label: 'LinkedIn' });
  }
  if (d.tiktok) {
    const url = d.tiktok.startsWith('@') ? `https://tiktok.com/${d.tiktok}` : `https://tiktok.com/@${d.tiktok}`;
    socials.push({ url, icon: '🎵', label: 'TikTok' });
  }
  if (d.youtube) {
    const url = d.youtube.includes('youtube.com') ? (d.youtube.startsWith('http') ? d.youtube : `https://${d.youtube}`) : `https://youtube.com/@${d.youtube}`;
    socials.push({ url, icon: '▶️', label: 'YouTube' });
  }
  if (d.twitter) {
    const url = d.twitter.startsWith('@') ? `https://x.com/${d.twitter.substring(1)}` : `https://x.com/${d.twitter}`;
    socials.push({ url, icon: '✖️', label: 'X (Twitter)' });
  }

  if (socials.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }

  strip.innerHTML = socials.map(s => `
    <a href="${esc(s.url)}" target="_blank" rel="noopener" class="lp-social-btn">
      ${s.icon} ${s.label}
    </a>`).join('');
}

// ============================================
// CONTACT
// ============================================
function renderContact(d) {
  const links = document.getElementById('contact-links');
  if (!links) return;

  const items = [];
  if (d.whatsapp) items.push({
    href: `https://wa.me/${cleanPhone(d.whatsapp)}`,
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

  const nav = document.getElementById('footer-nav');
  if (nav) {
    nav.innerHTML = `
      <a href="#sobre">Sobre</a>
      <a href="#servicos">Serviços</a>
      <a href="#galeria">Galeria</a>
      <a href="#contato">Contato</a>
    `;
  }
}

// ============================================
// WhatsApp FAB
// ============================================
function renderFab(d) {
  if (!d.whatsapp) return;
  const fab = document.createElement('a');
  fab.className = 'fab-whatsapp';
  fab.href = `https://wa.me/${cleanPhone(d.whatsapp)}`;
  fab.target = '_blank';
  fab.rel = 'noopener';
  fab.innerHTML = '💬';
  fab.title = 'WhatsApp';
  document.body.appendChild(fab);
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
