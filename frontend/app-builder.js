// ============================================
// Card CRUD
// ============================================
function createNewCard() {
  try {
    editingCardId = null;
    ['field-name','field-business','field-business-complement','field-title','field-photo','field-logo','field-description',
     'field-message','field-phone','field-email','field-address','field-whatsapp',
     'field-whatsapp-group','field-instagram','field-facebook','field-linkedin',
     'field-tiktok','field-youtube','field-twitter','field-site-button','field-gallery',
     'field-services-title','field-services-image'
    ].forEach(id => setFieldValue(id, ''));
    setFieldValue('field-services-mode', 'image');
    syncServicesImagePreview('');
    toggleServicesMode();

    const prodContainer = document.getElementById('builder-products-container');
    if (prodContainer) prodContainer.innerHTML = '';
    const testContainer = document.getElementById('builder-testimonials-container');
    if (testContainer) testContainer.innerHTML = '';
    loadGalleryFromUrls([]);

    const photoImg = document.getElementById('photo-preview-img');
    const photoPlaceholder = document.getElementById('photo-placeholder');
    if (photoImg) photoImg.style.display = 'none';
    if (photoPlaceholder) photoPlaceholder.style.display = '';

    const logoImg = document.getElementById('logo-preview-img');
    const logoPlaceholder = document.getElementById('logo-placeholder');
    if (logoImg) logoImg.style.display = 'none';
    if (logoPlaceholder) logoPlaceholder.style.display = '';

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
    setFieldValue('field-business-complement', card.business_complement || '');
    setFieldValue('field-title', card.title || '');
    setFieldValue('field-photo', card.photo_url || '');
    setFieldValue('field-logo', card.logo_url || '');
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
    const inferredServicesMode = card.services_mode || ((card.products || []).length ? 'list' : 'image');
    setFieldValue('field-services-mode', inferredServicesMode);
    setFieldValue('field-services-title', card.services_title || '');
    setFieldValue('field-services-image', card.services_image_url || '');
    syncServicesImagePreview(card.services_image_url || '');
    toggleServicesMode();
    setFieldValue('field-catalog-pdf-url', card.catalog_pdf_url || '');
    setFieldValue('field-catalog-pdf-title', card.catalog_pdf_title || '');
    syncCatalogPdfPreview(card.catalog_pdf_url || '', card.catalog_pdf_title || '');
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

    const logoImg = document.getElementById('logo-preview-img');
    const logoPlaceholder = document.getElementById('logo-placeholder');
    if (logoImg && logoPlaceholder) {
      if (card.logo_url) {
        logoImg.src = card.logo_url;
        logoImg.style.display = '';
        logoPlaceholder.style.display = 'none';
      } else {
        logoImg.style.display = 'none';
        logoPlaceholder.style.display = '';
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
  if (!confirm('Tem certeza que deseja excluir este site?')) return;
  try {
    await api('/cards/' + id, { method: 'DELETE' });
    currentUserCardId = null;
    showToast('✅', 'Site excluído!');
    navigateTo('dashboard');
  } catch (err) {
    showToast('❌', err.message);
  }
}

// ============================================
// Flexible Services / Menu / Price List
// ============================================
function toggleServicesMode() {
  const mode = document.getElementById('field-services-mode')?.value || 'image';
  const imageBuilder = document.getElementById('services-image-builder');
  const listBuilder = document.getElementById('services-list-builder');
  if (imageBuilder) imageBuilder.style.display = mode === 'image' ? '' : 'none';
  if (listBuilder) listBuilder.style.display = mode === 'list' ? '' : 'none';
}

function syncServicesImagePreview(url) {
  const preview = document.getElementById('services-image-preview');
  const placeholder = document.getElementById('services-image-placeholder');
  const removeBtn = document.getElementById('services-image-remove');
  if (!preview) return;
  if (url) {
    preview.src = url;
    preview.style.display = '';
    if (placeholder) placeholder.style.display = 'none';
    if (removeBtn) removeBtn.style.display = '';
  } else {
    preview.removeAttribute('src');
    preview.style.display = 'none';
    if (placeholder) placeholder.style.display = '';
    if (removeBtn) removeBtn.style.display = 'none';
  }
}

async function handleServicesImageUpload(input) {
  const file = input.files?.[0];
  if (!file) return;

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    showToast('⚠️', 'Use uma imagem JPG, PNG ou WebP.');
    input.value = '';
    return;
  }

  const localUrl = URL.createObjectURL(file);
  syncServicesImagePreview(localUrl);
  showToast('⏳', 'Otimizando e enviando sua imagem...');

  try {
    const url = await uploadFile(file);
    setFieldValue('field-services-image', url);
    syncServicesImagePreview(url);
    showToast('✅', 'Imagem em destaque enviada!');
    updatePreview();
  } catch (err) {
    syncServicesImagePreview(document.getElementById('field-services-image')?.value || '');
    showToast('❌', 'Erro: ' + err.message);
  } finally {
    URL.revokeObjectURL(localUrl);
    input.value = '';
  }
}

function clearServicesImage() {
  setFieldValue('field-services-image', '');
  syncServicesImagePreview('');
  updatePreview();
}

// ============================================
// Catálogo ou Documento do Negócio (PDF)
// ============================================
function syncCatalogPdfPreview(url, title = '') {
  const preview = document.getElementById('catalog-pdf-preview');
  const placeholder = document.getElementById('catalog-pdf-placeholder');
  const removeBtn = document.getElementById('catalog-pdf-remove');
  const filenameEl = document.getElementById('catalog-pdf-filename');
  if (!preview) return;
  if (url) {
    if (filenameEl) {
      filenameEl.textContent = title || url.split('/').pop() || 'Catálogo do Negócio.pdf';
    }
    preview.style.display = 'flex';
    if (placeholder) placeholder.style.display = 'none';
    if (removeBtn) removeBtn.style.display = '';
  } else {
    preview.style.display = 'none';
    if (placeholder) placeholder.style.display = '';
    if (removeBtn) removeBtn.style.display = 'none';
  }
}

function clearCatalogPdf() {
  setFieldValue('field-catalog-pdf-url', '');
  setFieldValue('field-catalog-pdf-title', '');
  syncCatalogPdfPreview('', '');
  updatePreview();
}

async function handleCatalogPdfUpload(input) {
  const file = input.files?.[0];
  if (!file) return;

  const isPro = currentUser && !currentUser.is_admin && currentUser.plan === 'pro';
  if (!isPro) {
    showToast('⭐', 'O upload de catálogo em PDF é exclusivo do Plano Pro. Assine por R$ 12,90/mês!');
    openProPaymentModal();
    input.value = '';
    return;
  }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    showToast('⚠️', 'Por favor, selecione um arquivo em formato PDF.');
    input.value = '';
    return;
  }

  showToast('⏳', 'Enviando documento PDF...');

  try {
    const url = await uploadFile(file);
    setFieldValue('field-catalog-pdf-url', url);
    const titleInput = document.getElementById('field-catalog-pdf-title');
    if (titleInput && !titleInput.value.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      setFieldValue('field-catalog-pdf-title', formattedName);
    }
    const currentTitle = document.getElementById('field-catalog-pdf-title')?.value || file.name;
    syncCatalogPdfPreview(url, currentTitle);
    showToast('✅', 'Catálogo em PDF enviado com sucesso!');
    updatePreview();
  } catch (err) {
    syncCatalogPdfPreview(document.getElementById('field-catalog-pdf-url')?.value || '', document.getElementById('field-catalog-pdf-title')?.value || '');
    showToast('❌', 'Erro ao enviar PDF: ' + err.message);
  } finally {
    input.value = '';
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
        <input class="form-input testimonial-name-input" type="text" placeholder="Digite o nome do cliente" value="${escapeHtml(data.name || '')}">
      </div>
      <div class="form-group" style="flex:1;">
        <label class="form-label">Estrelas (1-5)</label>
        <input class="form-input testimonial-stars-input" type="number" min="1" max="5" placeholder="Escolha de 1 a 5" value="${data.stars || ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Depoimento</label>
      <textarea class="form-input testimonial-comment-input" placeholder="Escreva a avaliação do cliente" rows="2">${escapeHtml(data.comment || '')}</textarea>
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
    const stars = Number(row.querySelector('.testimonial-stars-input')?.value || 0);
    const comment = row.querySelector('.testimonial-comment-input')?.value.trim();
    if (name && comment && stars >= 1 && stars <= 5) testimonials.push({ name, stars, comment });
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
  const isPro = currentUser && !currentUser.is_admin && currentUser.plan === 'pro';
  if (!isPro && (theme === 'sunset' || theme === 'forest')) {
    showToast('⭐', 'Os temas Sunset e Executivo são exclusivos do Plano Pro (R$ 12,90/mês). Faça o upgrade!');
    openProPaymentModal();
    return;
  }
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
  rendered.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:var(--space-3xl);">Carregando site...</p>';

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

    rendered.innerHTML = '<p style="text-align:center;color:#ef4444;padding:var(--space-3xl);">Site não encontrado</p>';
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
  const logo        = data.logo_url || '';
  const instagram   = typeof data.instagram === 'string' ? data.instagram.trim() : '';
  const facebook    = typeof data.facebook === 'string' ? data.facebook.trim() : '';
  const linkedin    = typeof data.linkedin === 'string' ? data.linkedin.trim() : '';
  const tiktok      = typeof data.tiktok === 'string' ? data.tiktok.trim() : '';
  const youtube     = typeof data.youtube === 'string' ? data.youtube.trim() : '';
  const twitter     = typeof data.twitter === 'string' ? data.twitter.trim() : '';
  const whatsappGroup = data.whatsapp_group || '';
  const theme       = data.theme || 'midnight';

  // Ajuste inteligente para diferenciação entre Cartão Comercial (Negócio) e Cartão Pessoal
  const mainTitle = business ? business : name;
  const subTitle = business 
    ? (name && name !== 'Seu Nome' ? (title ? `${name} — ${title}` : name) : title)
    : title;

  const initialsName = business || name;
  const initials = (initialsName.split(' ').map(w => w[0]).join('').substring(0, 2) || 'C').toUpperCase();
  const avatarContent = logo
    ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(mainTitle)}" onerror="this.parentElement.textContent='${initials}'">`
    : initials;

  let contactButtons = '';
  if (phone)    contactButtons += `<a href="tel:${escapeHtml(phone)}" class="card-contact-btn"><span class="icon">📞</span><span>Ligar</span></a>`;
  if (email)    contactButtons += `<a href="mailto:${escapeHtml(email)}" class="card-contact-btn"><span class="icon">📧</span><span>Email</span></a>`;
  if (whatsapp) contactButtons += `<a href="https://wa.me/${cleanWhatsapp(whatsapp)}?text=${encodeURIComponent('Olá! Vim pelo seu CardLink. ✅')}" target="_blank" rel="noopener" class="card-contact-btn"><span class="icon">💬</span><span>WhatsApp</span></a>`;
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
    if (whatsapp)      whatsappSection += `<a href="https://wa.me/${cleanWhatsapp(whatsapp)}?text=${encodeURIComponent('Olá! Vim pelo seu CardLink. ✅')}" target="_blank" rel="noopener" class="btn btn-whatsapp">💬 Conversar no WhatsApp</a>`;
    if (whatsappGroup) whatsappSection += `<a href="${escapeHtml(whatsappGroup)}" target="_blank" rel="noopener" class="btn btn-whatsapp-group">👥 Entrar no Grupo WhatsApp</a>`;
    whatsappSection += '</div>';
  }

  const addressHtml = address
    ? `<a href="https://www.google.com/maps/search/${encodeURIComponent(address)}" target="_blank" rel="noopener" class="card-address">📍 ${escapeHtml(address)}</a>`
    : '';

  // Site / Landing Page section
  const siteBtnText    = data.site_button_text || 'Ver mais informações';
  const validProducts  = Array.isArray(data.products)
    ? data.products.filter(product => typeof product?.name === 'string' && product.name.trim())
    : [];
  const servicesMode   = data.services_mode || (validProducts.length ? 'list' : 'image');
  const servicesTitle  = data.services_title || (servicesMode === 'image' ? 'Destaque' : 'Produtos & Serviços');
  const servicesImageUrl = typeof data.services_image_url === 'string' ? data.services_image_url.trim() : '';
  const catalogPdfUrl = typeof data.catalog_pdf_url === 'string' ? data.catalog_pdf_url.trim() : '';
  const catalogPdfTitle = (typeof data.catalog_pdf_title === 'string' && data.catalog_pdf_title.trim()) || 'Catálogo do Negócio';
  const hasCatalogPdf  = !!catalogPdfUrl;
  const hasServicesImage = servicesMode === 'image' && !!servicesImageUrl;
  const hasProducts    = servicesMode === 'list' && validProducts.length > 0;
  const hasGallery     = data.gallery     && data.gallery.length     > 0;
  const validTestimonials = Array.isArray(data.testimonials)
    ? data.testimonials.filter(t => {
        const testimonialName = typeof t?.name === 'string' ? t.name.trim() : '';
        const testimonialComment = typeof t?.comment === 'string' ? t.comment.trim() : '';
        const testimonialStars = Number(t?.stars);
        return testimonialName && testimonialComment && testimonialStars >= 1 && testimonialStars <= 5;
      })
    : [];
  const hasTestimonials= validTestimonials.length > 0;
  const hasSiteContent = hasServicesImage || hasProducts || hasGallery || hasTestimonials || hasCatalogPdf;

  let siteToggleButton = '';
  let siteExpandedContent = '';

  if (hasSiteContent) {
    siteToggleButton = `
      <button type="button" class="btn-site-toggle" onclick="toggleSiteSection()">
        📋 ${escapeHtml(siteBtnText)} ↓
      </button>`;

    let catalogPdfHtml = '';
    if (hasCatalogPdf) {
      catalogPdfHtml = `
        <div class="site-block-title">📑 Catálogo & Documentos</div>
        <div style="background:var(--bg-card);border:1.5px solid var(--border-subtle);border-radius:14px;padding:16px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div style="display:flex;align-items:center;gap:12px;overflow:hidden;text-align:left;">
            <span style="font-size:2.2rem;line-height:1;">📄</span>
            <div style="overflow:hidden;">
              <div style="font-size:0.95rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(catalogPdfTitle)}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">PDF Protegido • Modo Somente Leitura</div>
            </div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="openPdfViewerModal('${escapeHtml(catalogPdfUrl)}', '${escapeHtml(catalogPdfTitle)}')" style="flex-shrink:0;padding:8px 14px;font-weight:700;display:flex;align-items:center;gap:6px;">
            <span>👁️</span> Visualizar
          </button>
        </div>`;
    }

    let servicesImageHtml = '';
    if (hasServicesImage) {
      servicesImageHtml = `
        <div class="site-block-title">📋 ${escapeHtml(servicesTitle)}</div>
        <div style="width:100%;display:flex;justify-content:center;margin-bottom:20px;">
          <img src="${escapeHtml(servicesImageUrl)}" alt="${escapeHtml(servicesTitle)}" style="max-width:100%;height:auto;max-height:900px;object-fit:contain;border-radius:14px;border:1px solid var(--border-subtle);background:var(--bg-card);" onerror="this.style.display='none'">
        </div>`;
    }

    let productsHtml = '';
    if (hasProducts) {
      productsHtml = `<div class="site-block-title">🛍️ ${escapeHtml(servicesTitle)}</div><div class="products-grid">`;
      validProducts.forEach(p => {
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
      galleryHtml = `<div class="site-block-title">🖼️ Galeria & Portfólio</div><div class="gallery-carousel-compact">
        <div class="gallery-track-compact" onscroll="syncCompactGalleryCarousel(this)">`;
      data.gallery.forEach((itemUrl, index) => {
        const isPdf = typeof itemUrl === 'string' && itemUrl.toLowerCase().includes('.pdf');
        if (isPdf) {
          galleryHtml += `
            <button type="button" class="gallery-slide-compact gallery-slide-pdf" onclick="openPdfViewerModal('${escapeHtml(itemUrl)}', 'Documento ${index + 1}')" aria-label="Visualizar PDF ${index + 1}" style="background:var(--bg-card);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;text-align:center;gap:6px;border:1px solid var(--border-subtle);">
              <span style="font-size:2rem;line-height:1;">📄</span>
              <span style="font-size:0.75rem;font-weight:700;color:var(--text-primary);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:95%;">Documento ${index + 1}</span>
              <span style="font-size:0.68rem;font-weight:bold;color:var(--primary);background:rgba(124,58,237,0.12);padding:2px 8px;border-radius:6px;">👁️ Ver PDF</span>
            </button>`;
        } else {
          galleryHtml += `<button type="button" class="gallery-slide-compact" data-image-src="${escapeHtml(itemUrl)}" onclick="openCompactGalleryImage(this.dataset.imageSrc, 'Foto ${index + 1}')" aria-label="Ampliar foto ${index + 1}"><img src="${escapeHtml(itemUrl)}" alt="Foto ${index + 1}" onerror="refreshCompactGalleryCarousel(this.closest('.gallery-carousel-compact'), this.closest('.gallery-slide-compact'))"></button>`;
        }
      });
      galleryHtml += `</div>${data.gallery.length > 1 ? `
        <button type="button" class="gallery-arrow-compact gallery-prev-compact" onclick="moveCompactGallery(this, -1)" aria-label="Foto anterior">‹</button>
        <button type="button" class="gallery-arrow-compact gallery-next-compact" onclick="moveCompactGallery(this, 1)" aria-label="Próxima foto">›</button>
        <div class="gallery-dots-compact">${data.gallery.map((_, index) => `<span class="gallery-dot-compact${index === 0 ? ' active' : ''}"></span>`).join('')}</div>` : ''}</div>`;
    }

    let testimonialsHtml = '';
    if (hasTestimonials) {
      testimonialsHtml = `<div class="site-block-title">⭐ Avaliações de Clientes</div><div class="testimonials-grid">`;
      validTestimonials.forEach(t => {
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
        ${catalogPdfHtml}${servicesImageHtml}${productsHtml}${galleryHtml}${testimonialsHtml}
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
        <a href="https://wa.me/${cleanWhatsapp(whatsapp)}?text=${encodeURIComponent('Olá! Vim pelo seu CardLink. ✅')}" target="_blank" rel="noopener" class="btn btn-primary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;font-size:0.95rem;font-weight:bold;text-decoration:none;">
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
        ${photo ? `
          <div class="card-cover-user" style="position:absolute;top:15px;right:20px;width:46px;height:46px;border-radius:50%;border:2px solid rgba(255,255,255,0.8);box-shadow:var(--shadow-sm);overflow:hidden;z-index:12;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;">
            <img src="${escapeHtml(photo)}" style="width:100%;height:100%;object-fit:cover;" alt="Vendedor">
          </div>
        ` : ''}
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

function moveCompactGallery(button, direction) {
  const carousel = button.closest('.gallery-carousel-compact');
  const track = carousel?.querySelector('.gallery-track-compact');
  if (!track) return;
  track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' });
}

function syncCompactGalleryCarousel(track) {
  window.clearTimeout(track._galleryTimer);
  track._galleryTimer = window.setTimeout(() => {
    const index = track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0;
    track.closest('.gallery-carousel-compact')?.querySelectorAll('.gallery-dot-compact').forEach((dot, i) => dot.classList.toggle('active', i === index));
  }, 70);
}

function refreshCompactGalleryCarousel(carousel, failedSlide) {
  failedSlide?.remove();
  const slides = Array.from(carousel?.querySelectorAll('.gallery-slide-compact') || []);
  if (!slides.length) {
    carousel?.remove();
    return;
  }
  const dots = carousel.querySelector('.gallery-dots-compact');
  if (slides.length === 1) {
    carousel.querySelectorAll('.gallery-arrow-compact, .gallery-dots-compact').forEach(el => el.remove());
  } else if (dots) {
    dots.innerHTML = slides.map((_, index) => `<span class="gallery-dot-compact${index === 0 ? ' active' : ''}"></span>`).join('');
  }
  const track = carousel.querySelector('.gallery-track-compact');
  if (track) track.scrollLeft = 0;
}

function openCompactGalleryImage(url, alt) {
  let lightbox = document.getElementById('compact-gallery-lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'compact-gallery-lightbox';
    lightbox.className = 'compact-gallery-lightbox';
    lightbox.innerHTML = '<button type="button" aria-label="Fechar imagem">×</button><img>';
    lightbox.addEventListener('click', event => {
      if (event.target === lightbox || event.target.closest('button')) closeCompactGalleryImage();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeCompactGalleryImage(); });
    document.body.appendChild(lightbox);
  }
  const image = lightbox.querySelector('img');
  image.src = url;
  image.alt = alt || 'Foto ampliada';
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  lightbox.querySelector('button').focus();
}

function closeCompactGalleryImage() {
  document.getElementById('compact-gallery-lightbox')?.classList.remove('open');
  document.body.style.overflow = '';
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

