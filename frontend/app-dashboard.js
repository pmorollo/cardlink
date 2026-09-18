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

function renderAdminMessagesHtml(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return '';
  return `
    <div class="dash-card-full" style="margin-bottom:var(--space-lg);padding:var(--space-lg);background:linear-gradient(135deg, rgba(124,58,237,0.06), rgba(37,99,235,0.05));border:1px solid rgba(124,58,237,0.18);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
        <div>
          <h3 style="font-family:var(--font-display);font-weight:700;margin:0;">📣 Mensagens do CardLink</h3>
          <p style="color:var(--text-secondary);font-size:0.82rem;margin-top:4px;">Avisos enviados pela administração da plataforma.</p>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${messages.slice(0, 5).map(m => {
          const date = new Date(m.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
          const unread = !m.read_at;
          return `
            <div style="padding:12px 14px;border-radius:12px;background:var(--bg-surface);border:1px solid ${unread ? 'rgba(124,58,237,0.28)' : 'var(--border-subtle)'};">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                <div style="flex:1;min-width:220px;">
                  <strong style="display:block;color:var(--text-primary);font-size:0.92rem;">${unread ? '● ' : ''}${escapeHtml(m.subject || 'Mensagem do CardLink')}</strong>
                  <span style="color:var(--text-muted);font-size:0.74rem;">${date}</span>
                  <p style="color:var(--text-secondary);font-size:0.88rem;line-height:1.55;margin-top:7px;white-space:pre-wrap;">${escapeHtml(m.message || '')}</p>
                </div>
                ${unread ? `<button class="btn btn-outline btn-sm" onclick="markAdminMessageRead(${Number(m.id)})">Marcar como lida</button>` : '<span style="color:var(--text-muted);font-size:0.75rem;">✓ Lida</span>'}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

async function markAdminMessageRead(id) {
  try {
    await api(`/messages/${id}/read`, { method: 'POST' });
    await loadDashboard();
  } catch (err) {
    showToast('❌', 'Não foi possível marcar a mensagem: ' + err.message);
  }
}

async function loadDashboard() {
  const content = document.getElementById('dashboard-content');
  if (!content) return;

  try {
    if (!currentUser && authToken) {
      currentUser = await api('/auth/me');
    }

    const userName = currentUser ? currentUser.name : 'Usuário';
    const [data, platformMessages] = await Promise.all([
      api('/cards/stats/summary'),
      api('/messages').catch(() => [])
    ]);
    const platformMessagesHtml = renderAdminMessagesHtml(platformMessages);

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
        </div>
        ${platformMessagesHtml}`;
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
    const isProUser = currentUser && !currentUser.is_admin && currentUser.plan === 'pro' && (currentUser.subscription_status || 'active') === 'active' && (currentUser.account_status || 'active') === 'active';
    const isFreeUser = currentUser && !currentUser.is_admin && currentUser.plan === 'free' && (currentUser.account_status || 'active') === 'active';
    const isInactiveSubscription = currentUser && !currentUser.is_admin && !isFreeUser && (!currentUser.subscription_status || currentUser.subscription_status !== 'active' || currentUser.account_status !== 'active');
    
    let paywallBannerHtml = '';
    if (isInactiveSubscription) {
      paywallBannerHtml = `
        <div class="form-section" style="display:flex;background:linear-gradient(135deg, rgba(239,68,68,0.06), rgba(220,38,38,0.1));border:1.5px solid rgba(239,68,68,0.25);border-radius:var(--radius-lg);padding:16px;margin-bottom:var(--space-lg);text-align:left;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;width:100%;">
          <div style="flex:1;min-width:250px;">
            <div style="font-weight:700;color:#ef4444;font-size:0.95rem;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
              <span>❌</span> Assinatura inativa
            </div>
            <p style="font-size:0.8rem;color:var(--text-secondary);line-height:1.4;margin:0;">
              Seu acesso de cliente está inativo e o link público foi suspenso. Regularize ou reative a assinatura para voltar a utilizar o CardLink.
            </p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="openProPaymentModal()" style="padding:8px 16px;font-size:0.82rem;font-weight:bold;flex-shrink:0;background:#ef4444;border:none;color:#ffffff;box-shadow: 0 4px 12px rgba(239,68,68,0.2);">
            💳 Reativar assinatura
          </button>
        </div>
      `;
    } else if (isFreeUser) {
      paywallBannerHtml = `
        <div class="form-section" style="display:flex;background:linear-gradient(135deg, rgba(124,58,237,0.08), rgba(147,51,234,0.12));border:1.5px solid var(--accent);border-radius:var(--radius-lg);padding:14px 18px;margin-bottom:var(--space-lg);text-align:left;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;width:100%;">
          <div style="flex:1;min-width:250px;">
            <div style="font-weight:700;color:var(--accent);font-size:0.95rem;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
              <span>🎁</span> Você está usando o Plano Gratuito
            </div>
            <p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.4;margin:0;">
              Sua página está 100% online e pode ser compartilhada por link. O Pro libera QR Code integrado, mensagens/leads, Catálogo em PDF e galeria ampliada.
            </p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="openProPaymentModal()" style="padding:8px 16px;font-size:0.82rem;font-weight:bold;flex-shrink:0;background:linear-gradient(135deg,var(--accent),#9333ea);border:none;color:#ffffff;box-shadow:0 4px 12px rgba(124,58,237,0.3);">
            ⭐ Assinar Pro (R$ 12,90)
          </button>
        </div>
      `;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    let pwaBannerHtml = '';
    
    if (isMobile && !isStandalone) {
      pwaBannerHtml = `
        <div id="pwa-install-banner" class="form-section" style="display:flex;background:linear-gradient(135deg, rgba(124,58,237,0.08), rgba(59,130,246,0.08));border:1.5px solid var(--border-subtle);border-radius:var(--radius-lg);padding:16px;margin-bottom:var(--space-lg);text-align:left;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;width:100%;">
          <div style="flex:1;min-width:250px;">
            <div style="font-weight:700;color:var(--text-primary);font-size:0.95rem;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
              <span>📲</span> Fixar seu site na Tela de Início
            </div>
            <p style="font-size:0.8rem;color:var(--text-secondary);line-height:1.4;margin:0;">
              Crie um atalho que abre diretamente o site público que você criou.
            </p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="openCardHomeScreenSetup('${escapeHtml(card.slug)}')" style="padding:8px 16px;font-size:0.82rem;font-weight:bold;flex-shrink:0;">
            Fixar site
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

      ${platformMessagesHtml}
      ${paywallBannerHtml}
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
        ${isProUser ? `
          <div class="stat-card">
            <div class="stat-icon">📩</div>
            <div class="stat-value">${stats.contacts}</div>
            <div class="stat-label">Mensagens Recebidas</div>
          </div>
          <div class="stat-card" onclick="openQrCodeModal('${escapeHtml(card.slug)}')" style="cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;" onmouseover="this.style.borderColor='var(--purple)'" onmouseout="this.style.borderColor=''">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + '/site/' + card.slug + '/qr')}&bgcolor=ffffff&color=000000" style="width:48px;height:48px;border-radius:4px;margin-bottom:6px;border:1px solid var(--border-subtle);" alt="QR Code">
            <div class="stat-value" style="font-size:1.05rem;line-height:1;margin-bottom:3px;">${stats.qrScans || 0}</div>
            <div class="stat-label" style="font-size:0.72rem;font-weight:bold;color:var(--text-secondary);">QR escaneados · abrir código</div>
          </div>
        ` : `
          <div class="stat-card" onclick="openProPaymentModal()" style="cursor:pointer;">
            <div class="stat-icon">⭐</div>
            <div class="stat-value" style="font-size:0.95rem;">PRO</div>
            <div class="stat-label">Mensagens e QR Code</div>
          </div>
        `}
      </div>

      <div class="dash-card-full">
        <div class="dash-card-full-header">
          <div class="dash-card-avatar" style="width:56px;height:56px;font-size:1.4rem;">
            ${card.photo_url ? `<img src="${escapeHtml(card.photo_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='${initials}'">` : initials}
          </div>
          <div style="flex:1;">
            <div class="dash-card-name" style="font-size:1.2rem;">${escapeHtml(card.name)}</div>
            <div class="dash-card-slug">${card.title ? escapeHtml(card.title) + ' · ' : ''}${card.business ? escapeHtml(card.business) : 'Site profissional'}</div>
          </div>
          <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;">
            <a class="btn btn-primary btn-sm" href="/site/${escapeHtml(card.slug)}" target="_blank" rel="noopener">Abrir página</a>
            <button class="btn btn-outline btn-sm" onclick="copyToClipboard('${escapeHtml(cardLink)}')">Copiar link</button>
          </div>
        </div>

        <div class="dash-card-actions-bar">
          <button class="btn btn-secondary btn-sm" onclick="shareCard('${escapeHtml(card.slug)}')">Compartilhar</button>
          ${isProUser ? `<button class="btn btn-secondary btn-sm" onclick="viewContacts(${card.id}, '${escapeHtml(card.name)}')">Mensagens recebidas (${stats.contacts})</button>` : `<button class="btn btn-secondary btn-sm" onclick="openProPaymentModal()">⭐ Mensagens e leads — Pro</button>`}
        </div>
      </div>

      ${isProUser && recentContacts.length > 0 ? `
        <div style="margin-top:var(--space-xl);">
          <h3 style="font-family:var(--font-display);font-weight:700;margin-bottom:var(--space-md);">📩 Últimas Mensagens</h3>
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
                  <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-md);justify-content:flex-end;">
                    ${c.phone ? `
                      <a href="https://wa.me/${cleanWhatsapp(c.phone)}?text=${encodeURIComponent(`Olá, ${c.name}! Recebi sua mensagem pelo meu site CardLink. Como posso ajudar?`)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;font-size:0.75rem;background:#25d366;color:#ffffff;border:none;">
                        💬 Responder
                      </a>
                    ` : ''}
                    ${c.email ? `
                      <a href="mailto:${escapeHtml(c.email)}?subject=${encodeURIComponent('Retorno de Mensagem - CardLink')}&body=${encodeURIComponent(`Olá, ${c.name}!`)}" class="btn btn-outline btn-sm" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;font-size:0.75rem;">
                        📧 E-mail
                      </a>
                    ` : ''}
                  </div>
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
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="openCardLinkSupport('subscriber')" style="background:#25d366;border-color:#25d366;color:#fff;">💬 Falar no WhatsApp</button>
            <button class="btn btn-secondary btn-sm" onclick="openSupportModal()">Enviar chamado</button>
          </div>
        </div>
      </div>
    `;

  } catch (err) {
    content.innerHTML = `<p style="color:#ef4444;text-align:center;padding:var(--space-xl);">Erro ao carregar: ${err.message}</p>`;
  }
}

