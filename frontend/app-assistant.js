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
// Assistente de conteúdo — resposta textual para cópia manual
// ============================================
async function generateAssistantText() {
  const requestInput = document.getElementById('ai-request');
  const responseInput = document.getElementById('ai-response');
  const responsePanel = document.getElementById('ai-response-panel');
  const button = document.getElementById('ai-generate-btn');
  const request = requestInput?.value.trim() || '';

  if (!request) {
    showToast('⚠️', 'Descreva o texto que você precisa.');
    requestInput?.focus();
    return;
  }

  // Uma nova solicitação invalida a resposta anterior. Ocultá-la evita que um
  // erro do provedor faça o usuário confundir o texto antigo com o novo.
  if (responseInput) responseInput.value = '';
  if (responsePanel) responsePanel.hidden = true;

  if (button) {
    button.disabled = true;
    button.textContent = 'Gerando resposta...';
  }
  showToast('⏳', 'Preparando uma alternativa de texto...');

  try {
    const result = await api('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ request })
    });
    const text = typeof result.text === 'string' ? result.text.trim() : '';
    if (!text) throw new Error('O Assistente não retornou um texto.');

    if (responseInput) responseInput.value = text;
    if (responsePanel) responsePanel.hidden = false;
    responseInput?.focus();
    showToast('✨', 'Resposta pronta. Confira e copie se quiser utilizar.');
  } catch (err) {
    showToast('❌', err.message || 'Não foi possível gerar a resposta.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Gerar resposta';
    }
  }
}

function updateAssistantCounter() {
  const input = document.getElementById('ai-request');
  const counter = document.getElementById('ai-request-count');
  if (counter) counter.textContent = String(input?.value.length || 0);
}

async function pasteAssistantRequest() {
  const input = document.getElementById('ai-request');
  if (!input) return;
  input.focus();

  if (!navigator.clipboard?.readText) {
    showToast('📋', 'Toque e segure no campo e escolha Colar.');
    return;
  }

  try {
    const clipboardText = await navigator.clipboard.readText();
    if (!clipboardText) {
      showToast('⚠️', 'Não há texto disponível para colar.');
      return;
    }

    const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
    const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
    const available = input.maxLength - (input.value.length - (end - start));
    const textToInsert = clipboardText.slice(0, Math.max(0, available));
    input.setRangeText(textToInsert, start, end, 'end');
    updateAssistantCounter();
    showToast('✅', textToInsert.length < clipboardText.length
      ? 'Texto colado até o limite de 2.500 caracteres.'
      : 'Texto colado no Assistente.');
  } catch {
    input.focus();
    showToast('📋', 'No celular, toque e segure no campo e escolha Colar.');
  }
}

async function copyAssistantResponse() {
  const response = document.getElementById('ai-response');
  const text = response?.value || '';
  if (!text) {
    showToast('⚠️', 'Ainda não existe uma resposta para copiar.');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast('✅', 'Texto copiado. Cole no campo desejado.');
  } catch {
    response.focus();
    response.select();
    const copied = document.execCommand('copy');
    showToast(copied ? '✅' : '❌', copied ? 'Texto copiado. Cole no campo desejado.' : 'Não foi possível copiar o texto.');
  }
}

function clearAssistantResponse() {
  const response = document.getElementById('ai-response');
  const panel = document.getElementById('ai-response-panel');
  if (response) response.value = '';
  if (panel) panel.hidden = true;
  document.getElementById('ai-request')?.focus();
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
    document.getElementById('admin-metric-qr-scans').textContent = stats.totalQrScans || 0;
    document.getElementById('admin-metric-active-subscriptions').textContent = stats.activeSubscriptions || 0;
    document.getElementById('admin-metric-internal-tests').textContent = stats.internalTests || 0;

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
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:var(--space-lg);color:var(--text-secondary);">Nenhum usuário cadastrado</td></tr>`;
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
          <span class="badge" style="padding:4px 8px;border-radius:6px;font-size:0.75rem;font-weight:bold;${isPro ? 'background:rgba(124,58,237,0.15);color:var(--purple);' : 'background:rgba(239,68,68,0.1);color:#ef4444;'}">
            ${u.account_status === 'pending_activation' ? '⏳ Aguardando ativação' : (isPro ? '✅ Ativo' : '❌ Inativo')}
          </span>
        </td>
        <td style="padding:12px 8px;text-align:right;white-space:nowrap;">
          <span style="color:var(--text-secondary);font-size:0.8rem;">${u.is_test_account ? '🧪 Teste interno' : (u.subscription_source === 'cakto' ? '💳 Cakto' : escapeHtml(u.subscription_source || '—'))}</span>
        </td>
        <td style="padding:12px 8px;text-align:right;white-space:nowrap;">
          <button class="btn btn-outline btn-sm" type="button" onclick="openAdminMessageModal(${u.id})">Mensagem</button>
        </td>
      </tr>
    `;
  }).join('');
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

function openAdminMessageModal(userId) {
  const user = adminUsersList.find(u => Number(u.id) === Number(userId)) || {};
  setFieldValue('admin-message-user-id', String(userId));
  setFieldValue('admin-message-subject', 'Mensagem do CardLink');
  setFieldValue('admin-message-body', '');
  const recipient = document.getElementById('admin-message-recipient');
  if (recipient) recipient.textContent = `${user.name || 'Usuário'}${user.email ? ' · ' + user.email : ''}`;
  const modal = document.getElementById('admin-message-modal');
  if (modal) modal.style.display = 'flex';
}

function closeAdminMessageModal() {
  const modal = document.getElementById('admin-message-modal');
  if (modal) modal.style.display = 'none';
}

async function sendAdminMessage() {
  const userId = Number(document.getElementById('admin-message-user-id')?.value);
  const subject = document.getElementById('admin-message-subject')?.value.trim() || 'Mensagem do CardLink';
  const message = document.getElementById('admin-message-body')?.value.trim();
  if (!userId || !message) {
    showToast('⚠️', 'Escreva uma mensagem para o usuário');
    return;
  }
  try {
    await api(`/admin/users/${userId}/message`, {
      method: 'POST',
      body: JSON.stringify({ subject, message })
    });
    closeAdminMessageModal();
    showToast('✅', 'Mensagem enviada ao usuário');
  } catch (err) {
    showToast('❌', 'Erro ao enviar mensagem: ' + err.message);
  }
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
// Visualizador de PDF (Somente Leitura - Sem Opção de Download)
// ============================================
function openPdfViewerModal(pdfUrl, title = 'Documento PDF') {
  if (!pdfUrl) return;
  const modal = document.getElementById('pdf-viewer-modal');
  const frame = document.getElementById('pdf-viewer-frame');
  const titleEl = document.getElementById('pdf-viewer-title');
  if (titleEl) titleEl.textContent = title;
  if (frame) {
    // Parâmetros para suprimir barra de ferramentas e botões de download nativos do visualizador PDF
    const cleanUrl = pdfUrl.split('#')[0] + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH';
    frame.src = cleanUrl;
  }
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closePdfViewerModal() {
  const modal = document.getElementById('pdf-viewer-modal');
  const frame = document.getElementById('pdf-viewer-frame');
  if (frame) frame.src = '';
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Bloqueio de atalhos de impressão/salvar quando o modal de PDF estiver aberto
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('pdf-viewer-modal');
  if (modal && modal.style.display === 'flex') {
    if (e.key === 'Escape') {
      closePdfViewerModal();
    }
    if ((e.ctrlKey || e.metaKey) && ['p', 's', 'u'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
});
