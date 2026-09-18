// ============================================
// Contacts View
// ============================================
async function viewContacts(cardId, cardName) {
  const isProUser = currentUser && !currentUser.is_admin && currentUser.plan === 'pro' &&
    (currentUser.subscription_status || 'active') === 'active' && (currentUser.account_status || 'active') === 'active';
  if (!isProUser) {
    showToast('⭐', 'Mensagens e captura de leads estão disponíveis no Plano Pro.');
    openProPaymentModal();
    return;
  }
  const nameEl = document.getElementById('contacts-card-name');
  const list   = document.getElementById('contacts-list');
  const count  = document.getElementById('contacts-count');
  if (nameEl) nameEl.textContent = cardName;
  if (list)   list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:var(--space-xl);">Carregando...</p>';
  navigateTo('contacts');

  try {
    const contacts = await api('/cards/' + cardId + '/contacts');
    if (count) count.textContent = `${contacts.length} mensagem${contacts.length !== 1 ? 's' : ''} recebida${contacts.length !== 1 ? 's' : ''}`;

    if (contacts.length === 0) {
      if (list) list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:var(--space-3xl);">Nenhuma mensagem recebida ainda.</p>';
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
          <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-md);justify-content:flex-end;">
            ${c.phone ? `
              <a href="https://wa.me/${cleanWhatsapp(c.phone)}?text=${encodeURIComponent(`Olá, ${c.name}! Recebi sua mensagem pelo meu site CardLink. Como posso ajudar?`)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;font-size:0.75rem;background:#25d366;color:#ffffff;border:none;">
                💬 Responder via WhatsApp
              </a>
            ` : ''}
            ${c.email ? `
              <a href="mailto:${escapeHtml(c.email)}?subject=${encodeURIComponent('Retorno de Mensagem - CardLink')}&body=${encodeURIComponent(`Olá, ${c.name}!`)}" class="btn btn-outline btn-sm" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;font-size:0.75rem;">
                📧 Responder por E-mail
              </a>
            ` : ''}
          </div>
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
  let fileToUpload = file;
  const isPdf = (file.type && file.type === 'application/pdf') || (file.name && file.name.toLowerCase().endsWith('.pdf'));
  if (!isPdf) {
    try {
      fileToUpload = await resizeImage(file);
    } catch (e) {
      console.warn('Não foi possível redimensionar imagem, enviando arquivo original:', e.message);
      fileToUpload = file;
    }
  }

  const formData = new FormData();
  formData.append('photo', fileToUpload);
  const res = await fetch(API + '/upload', {
    method: 'POST',
    credentials: 'same-origin',
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

async function handleLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const logoImg = document.getElementById('logo-preview-img');
  const logoPlaceholder = document.getElementById('logo-placeholder');

  // Show local preview immediately
  const localUrl = URL.createObjectURL(file);
  if (logoImg) { logoImg.src = localUrl; logoImg.style.display = ''; }
  if (logoPlaceholder) logoPlaceholder.style.display = 'none';
  showToast('⏳', 'Redimensionando e enviando...');

  try {
    const url = await uploadFile(file);
    document.getElementById('field-logo').value = url;
    showToast('✅', 'Logo enviado!');
    updatePreview();
  } catch (err) {
    showToast('❌', 'Erro: ' + err.message);
    if (logoImg) logoImg.style.display = 'none';
    if (logoPlaceholder) logoPlaceholder.style.display = '';
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

  const isPro = currentUser && !currentUser.is_admin && currentUser.plan === 'pro';
  const maxSlots = isPro ? 10 : 4;
  if (!existingUrl && galleryUrls.length >= maxSlots) {
    if (!isPro) {
      showToast('⭐', 'O Plano Gratuito permite até 4 fotos. Assine o Pro para até 10 fotos!');
      openProPaymentModal();
    } else {
      showToast('⚠️', 'Limite máximo de 10 fotos atingido.');
    }
    return;
  }

  const idx = galleryUrls.length;
  galleryUrls.push(existingUrl);

  const slot = document.createElement('div');
  slot.id = `gallery-slot-${idx}`;
  slot.style.cssText = 'position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;background:var(--bg-card);border:1.5px dashed var(--border-subtle);cursor:pointer;display:flex;align-items:center;justify-content:center;';

  const hasItem = !!existingUrl;
  const isPdf = typeof existingUrl === 'string' && existingUrl.toLowerCase().includes('.pdf');

  let contentHtml = '';
  if (!hasItem) {
    contentHtml = `
      <div id="gallery-placeholder-${idx}" style="text-align:center;color:var(--text-muted);font-size:0.75rem;padding:8px;">
        <div style="font-size:1.8rem;margin-bottom:4px;">📷/📄</div>+ Foto ou PDF
      </div>`;
  } else if (isPdf) {
    contentHtml = `
      <div id="gallery-pdf-box-${idx}" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;padding:8px;background:var(--bg-surface);text-align:center;">
        <span style="font-size:1.8rem;line-height:1;">📄</span>
        <span style="font-size:0.72rem;font-weight:700;color:var(--primary);margin-top:4px;">PDF</span>
        <span style="font-size:0.65rem;color:var(--text-muted);margin-top:2px;">Visualização</span>
      </div>`;
  } else {
    contentHtml = `<img src="${escapeHtml(existingUrl)}" style="width:100%;height:100%;object-fit:cover;" id="gallery-img-${idx}">`;
  }

  slot.innerHTML = `
    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style="display:none;" id="gallery-file-${idx}"
      onchange="handleGalleryPhotoUpload(this, ${idx})">
    ${contentHtml}
    <button type="button" onclick="removeGallerySlot(${idx})"
      style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.65);border:none;color:#fff;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:0.7rem;display:flex;align-items:center;justify-content:center;z-index:2;">✕</button>
  `;

  slot.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') {
      if (isPdf && existingUrl) {
        openPdfViewerModal(existingUrl, `Documento ${idx + 1}`);
      } else {
        document.getElementById(`gallery-file-${idx}`).click();
      }
    }
  });

  grid.appendChild(slot);
  syncGalleryField();
}

async function handleGalleryPhotoUpload(input, idx) {
  const file = input.files[0];
  if (!file) return;

  const isPro = currentUser && !currentUser.is_admin && currentUser.plan === 'pro';
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf && !isPro) {
    showToast('⭐', 'O upload de PDF na galeria é exclusivo do Plano Pro.');
    openProPaymentModal();
    input.value = '';
    return;
  }

  const slot = document.getElementById(`gallery-slot-${idx}`);

  if (slot) {
    if (isPdf) {
      slot.innerHTML = `
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style="display:none;" id="gallery-file-${idx}" onchange="handleGalleryPhotoUpload(this, ${idx})">
        <div id="gallery-pdf-box-${idx}" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;padding:8px;background:var(--bg-surface);text-align:center;">
          <span style="font-size:1.8rem;line-height:1;">📄</span>
          <span style="font-size:0.72rem;font-weight:700;color:var(--primary);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90%;">${escapeHtml(file.name)}</span>
          <span style="font-size:0.65rem;color:var(--text-muted);margin-top:2px;">Enviando...</span>
        </div>
        <button type="button" onclick="removeGallerySlot(${idx})" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.65);border:none;color:#fff;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:0.7rem;display:flex;align-items:center;justify-content:center;z-index:2;">✕</button>
      `;
    } else {
      const localUrl = URL.createObjectURL(file);
      slot.innerHTML = `
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style="display:none;" id="gallery-file-${idx}" onchange="handleGalleryPhotoUpload(this, ${idx})">
        <img src="${localUrl}" style="width:100%;height:100%;object-fit:cover;" id="gallery-img-${idx}">
        <button type="button" onclick="removeGallerySlot(${idx})" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.65);border:none;color:#fff;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:0.7rem;display:flex;align-items:center;justify-content:center;z-index:2;">✕</button>
      `;
    }
  }

  showToast('⏳', isPdf ? 'Enviando documento PDF...' : 'Enviando foto...');

  try {
    const url = await uploadFile(file);
    galleryUrls[idx] = url;
    syncGalleryField();
    showToast('✅', isPdf ? 'Documento PDF adicionado à galeria!' : 'Foto adicionada à galeria!');
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


