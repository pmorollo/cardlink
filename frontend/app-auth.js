// ============================================
// Auth Forms & Alerts Helper
// ============================================
const REGISTER_VERIFICATION_STORAGE_KEY = 'cardlink.registerVerification.v1';
let currentRegisterTicket = null;
const AUTH_CODE_COOLDOWN_MS = 30 * 1000;
const AUTH_CODE_COOLDOWN_KEYS = {
  register: 'cardlink.registerResendAt.v1',
  forgot: 'cardlink.forgotResendAt.v1'
};
const authCooldownTimers = {};

function getAuthCooldownRemaining(kind) {
  try {
    const until = Number(sessionStorage.getItem(AUTH_CODE_COOLDOWN_KEYS[kind]) || 0);
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  } catch (_) {
    return 0;
  }
}

function setAuthCooldown(kind, seconds = 30) {
  try {
    sessionStorage.setItem(AUTH_CODE_COOLDOWN_KEYS[kind], String(Date.now() + (seconds * 1000)));
  } catch (_) {}
}

function updateAuthResendButton(kind) {
  const buttonId = kind === 'register' ? 'btn-register-resend' : 'btn-forgot-resend';
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  const render = () => {
    const remaining = getAuthCooldownRemaining(kind);
    if (remaining > 0) {
      btn.disabled = true;
      btn.textContent = `Reenviar em ${remaining}s`;
      return true;
    }
    btn.disabled = false;
    btn.textContent = 'Reenviar código';
    return false;
  };

  if (authCooldownTimers[kind]) clearInterval(authCooldownTimers[kind]);
  if (render()) {
    authCooldownTimers[kind] = setInterval(() => {
      if (!render()) {
        clearInterval(authCooldownTimers[kind]);
        authCooldownTimers[kind] = null;
      }
    }, 1000);
  }
}

function enforceAuthCooldown(kind, formId) {
  const remaining = getAuthCooldownRemaining(kind);
  if (remaining <= 0) return false;
  showAuthAlert(formId, 'info', `Aguarde ${remaining} segundo(s) para solicitar outro código.`);
  updateAuthResendButton(kind);
  return true;
}

function setAuthButtonLabel(button, label) {
  if (!button) return;
  button.textContent = label;
}


function getStoredRegisterVerification() {
  try {
    const raw = sessionStorage.getItem(REGISTER_VERIFICATION_STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    if (!stored?.ticket || !stored?.expiresAt || Date.now() >= stored.expiresAt) {
      sessionStorage.removeItem(REGISTER_VERIFICATION_STORAGE_KEY);
      return null;
    }
    return stored;
  } catch (_) {
    return null;
  }
}

function storeRegisterVerification(ticket, email) {
  currentRegisterTicket = ticket || null;
  if (!ticket) return;
  try {
    sessionStorage.setItem(REGISTER_VERIFICATION_STORAGE_KEY, JSON.stringify({
      ticket,
      email: String(email || '').trim().toLowerCase(),
      expiresAt: Date.now() + (15 * 60 * 1000)
    }));
  } catch (_) {
    // O cadastro continua funcionando mesmo se sessionStorage estiver indisponível.
  }
}

function clearRegisterVerification() {
  currentRegisterTicket = null;
  try { sessionStorage.removeItem(REGISTER_VERIFICATION_STORAGE_KEY); } catch (_) {}
}


function showAuthAlert(formId, type, message) {
  const alertEl = document.getElementById(`${formId}-alert`);
  if (alertEl) {
    alertEl.className = `auth-alert ${type}`;
    const icon = type === 'error' ? '❌' : (type === 'success' ? '✅' : 'ℹ️');
    alertEl.innerHTML = `<span>${icon}</span><div>${escapeHtml(message)}</div>`;
    alertEl.style.display = 'flex';
  }
  showToast(type === 'error' ? '❌' : (type === 'success' ? '✅' : 'ℹ️'), message);
}

function clearAuthAlerts() {
  document.querySelectorAll('.auth-alert').forEach(el => {
    el.style.display = 'none';
    el.innerHTML = '';
    el.className = 'auth-alert';
  });
}

function toggleAuthForm(form) {
  clearAuthAlerts();
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const activationForm = document.getElementById('activation-form');
  const forgotForm = document.getElementById('forgot-form');
  const verifyEmailForm = document.getElementById('verify-email-form');
  const tabRegister = document.getElementById('tab-auth-register');
  const tabLogin = document.getElementById('tab-auth-login');
  const authTabs = document.querySelector('.auth-tabs');

  if (authTabs) {
    authTabs.style.display = (form === 'register' || form === 'login') ? 'flex' : 'none';
  }

  if (tabRegister && tabLogin) {
    if (form === 'register') {
      tabRegister.style.background = 'linear-gradient(135deg,var(--accent),#9333ea)';
      tabRegister.style.color = '#fff';
      tabRegister.style.fontWeight = '700';
      tabLogin.style.background = 'transparent';
      tabLogin.style.color = 'var(--text-secondary)';
      tabLogin.style.fontWeight = '600';
    } else if (form === 'login') {
      tabLogin.style.background = 'linear-gradient(135deg,var(--accent),#9333ea)';
      tabLogin.style.color = '#fff';
      tabLogin.style.fontWeight = '700';
      tabRegister.style.background = 'transparent';
      tabRegister.style.color = 'var(--text-secondary)';
      tabRegister.style.fontWeight = '600';
    }
  }

  if (loginForm) loginForm.style.display = form === 'login' ? '' : 'none';
  if (registerForm) {
    registerForm.style.display = form === 'register' ? '' : 'none';
    if (form === 'register') {
      const step1 = document.getElementById('register-step-1');
      const step2 = document.getElementById('register-step-2');
      const storedVerification = getStoredRegisterVerification();
      if (storedVerification) {
        currentRegisterTicket = storedVerification.ticket;
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
        const sentEmailEl = document.getElementById('register-sent-email');
        if (sentEmailEl && storedVerification.email) sentEmailEl.textContent = storedVerification.email;
        updateAuthResendButton('register');
      } else {
        currentRegisterTicket = null;
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';
        const existingEmail = (document.getElementById('login-email')?.value || '').trim();
        const regEmail = document.getElementById('register-email');
        if (regEmail && !regEmail.value && existingEmail) regEmail.value = existingEmail;
      }
    }
  }
  if (activationForm) activationForm.style.display = form === 'activate' ? '' : 'none';
  if (verifyEmailForm) verifyEmailForm.style.display = form === 'verify-email' ? '' : 'none';
  if (forgotForm) {
    forgotForm.style.display = form === 'forgot' ? '' : 'none';
    if (form === 'forgot') {
      const step1 = document.getElementById('forgot-step-1');
      const step2 = document.getElementById('forgot-step-2');
      if (step1) step1.style.display = 'block';
      if (step2) step2.style.display = 'none';
      
      const existingEmail = (document.getElementById('login-email')?.value || document.getElementById('register-email')?.value || '').trim();
      const emailInput = document.getElementById('forgot-email');
      const codeInput = document.getElementById('forgot-code');
      const passInput = document.getElementById('forgot-new-password');
      if (emailInput && existingEmail) emailInput.value = existingEmail;
      if (codeInput) codeInput.value = '';
      if (passInput) passInput.value = '';
    }
  }
}

function beginFreeRegistration() {
  clearRegisterVerification();
  const step1 = document.getElementById('register-step-1');
  const step2 = document.getElementById('register-step-2');
  if (step1) step1.style.display = 'block';
  if (step2) step2.style.display = 'none';

  const codeEl = document.getElementById('register-code');
  if (codeEl) codeEl.value = '';

  navigateTo('auth');
  toggleAuthForm('register');
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));

  const nameEl = document.getElementById('register-name');
  if (nameEl) window.setTimeout(() => nameEl.focus(), 80);
}

function backToRegisterStep1() {
  clearAuthAlerts();
  clearRegisterVerification();
  const step1 = document.getElementById('register-step-1');
  const step2 = document.getElementById('register-step-2');
  if (step1) step1.style.display = 'block';
  if (step2) step2.style.display = 'none';
  const codeEl = document.getElementById('register-code');
  if (codeEl) codeEl.value = '';
  const emailEl = document.getElementById('register-email');
  if (emailEl) emailEl.focus();
}

function backToForgotStep1() {
  clearAuthAlerts();
  const step1 = document.getElementById('forgot-step-1');
  const step2 = document.getElementById('forgot-step-2');
  if (step1) step1.style.display = 'block';
  if (step2) step2.style.display = 'none';
  const codeEl = document.getElementById('forgot-code');
  if (codeEl) codeEl.value = '';
  const emailEl = document.getElementById('forgot-email');
  emailEl?.focus();
}

async function handleDirectRegister() {
  clearAuthAlerts();
  const nameEl = document.getElementById('register-name');
  const emailEl = document.getElementById('register-email');
  const emailConfirmEl = document.getElementById('register-email-confirm');
  const passwordEl = document.getElementById('register-password');
  const whatsappEl = document.getElementById('register-whatsapp');
  const btnEl = document.getElementById('btn-register-direct');

  if (!nameEl || !emailEl || !passwordEl) {
    showAuthAlert('register', 'error', 'Formulário de cadastro não encontrado.');
    return;
  }

  const name = nameEl.value.trim();
  const email = emailEl.value.trim().toLowerCase();
  const emailConfirm = emailConfirmEl ? emailConfirmEl.value.trim().toLowerCase() : '';
  const password = passwordEl.value;
  const whatsapp = whatsappEl ? whatsappEl.value.trim() : '';

  if (!name) {
    showAuthAlert('register', 'error', 'Informe seu nome ou o nome do seu negócio.');
    nameEl.focus();
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.includes('..')) {
    showAuthAlert('register', 'error', 'Informe um endereço de e-mail válido.');
    emailEl.focus();
    return;
  }
  if (!emailConfirm || emailConfirm !== email) {
    showAuthAlert('register', 'error', 'Os dois campos de e-mail precisam ser iguais.');
    emailConfirmEl?.focus();
    return;
  }
  if (!password || password.length < 8) {
    showAuthAlert('register', 'error', 'A senha deve ter no mínimo 8 caracteres.');
    passwordEl.focus();
    return;
  }

  const originalBtnText = btnEl ? btnEl.innerHTML : '';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '⏳ Criando sua conta grátis...';
  }

  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, whatsapp })
    });

    authToken = 'session';
    currentUser = data.user;
    clearRegisterVerification();
    updateNavAuth();
    showToast('🎉', 'Conta criada com sucesso! Bem-vindo ao CardLink.');

    currentUserCardId = null;
    createNewCard();
  } catch (err) {
    showAuthAlert('register', 'error', err.message || 'Erro ao criar conta. Tente novamente.');
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = originalBtnText;
    }
  }
}

async function handleSendRegisterCode(options = {}) {
  clearAuthAlerts();
  const isResend = Boolean(options.resend);
  if (enforceAuthCooldown('register', 'register')) return;

  const nameEl = document.getElementById('register-name');
  const emailEl = document.getElementById('register-email');
  const passwordEl = document.getElementById('register-password');
  const whatsappEl = document.getElementById('register-whatsapp');
  const btnEl = document.getElementById(isResend ? 'btn-register-resend' : 'btn-register-send-code');

  if (!nameEl || !emailEl || !passwordEl) {
    showAuthAlert('register', 'error', 'Formulário de cadastro não encontrado.');
    return;
  }

  const name = nameEl.value.trim();
  const email = emailEl.value.trim().toLowerCase();
  const password = passwordEl.value;
  const whatsapp = whatsappEl ? whatsappEl.value.trim() : '';

  if (!name) {
    showAuthAlert('register', 'error', 'Informe seu nome ou o nome do seu negócio.');
    nameEl.focus();
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.includes('..')) {
    showAuthAlert('register', 'error', 'Informe um endereço de e-mail válido.');
    emailEl.focus();
    return;
  }

  if (!password || password.length < 8) {
    showAuthAlert('register', 'error', 'A senha deve ter no mínimo 8 caracteres.');
    passwordEl.focus();
    return;
  }

  if (btnEl) {
    btnEl.disabled = true;
    setAuthButtonLabel(btnEl, 'Enviando código...');
  }

  try {
    const data = await api('/auth/register/send-code', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, whatsapp })
    });

    storeRegisterVerification(data.verificationTicket, email);
    setAuthCooldown('register', Number(data.resendAfterSeconds || 30));

    const sentEmailEl = document.getElementById('register-sent-email');
    if (sentEmailEl) sentEmailEl.textContent = email;

    const statusEl = document.getElementById('register-code-status');
    if (statusEl) {
      statusEl.className = 'auth-code-status auth-code-status-success';
      statusEl.innerHTML = `
        <strong>${isResend ? 'Novo código enviado.' : 'Código enviado.'}</strong>
        <span>Enviamos 6 dígitos para <strong>${escapeHtml(email)}</strong>.</span>
        <span>${isResend ? 'Use somente o código mais recente. ' : ''}O código vale por 15 minutos.</span>
      `;
    }

    const devBanner = document.getElementById('register-dev-banner');
    if (devBanner) {
      if (data.code) {
        devBanner.style.display = 'block';
        devBanner.innerHTML = `<strong>Código para teste:</strong> <code style="font-size:1.1rem;font-weight:700;letter-spacing:2px;">${data.code}</code>`;
      } else {
        devBanner.style.display = 'none';
        devBanner.innerHTML = '';
      }
    }

    const step1 = document.getElementById('register-step-1');
    const step2 = document.getElementById('register-step-2');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';

    updateAuthResendButton('register');
    showAuthAlert('register', 'success', isResend
      ? 'Novo código enviado. Use apenas o código mais recente.'
      : 'Código enviado. Verifique seu e-mail.');

    const codeEl = document.getElementById('register-code');
    if (codeEl) {
      codeEl.value = '';
      codeEl.focus();
    }
  } catch (err) {
    showAuthAlert('register', 'error', err.message || 'Não foi possível enviar o código.');
  } finally {
    const sendBtn = document.getElementById('btn-register-send-code');
    if (sendBtn) {
      sendBtn.disabled = false;
      setAuthButtonLabel(sendBtn, 'Enviar código de confirmação');
    }
    if (isResend) updateAuthResendButton('register');
  }
}

async function handleVerifyAndRegister() {
  clearAuthAlerts();
  if (!currentRegisterTicket) {
    const storedVerification = getStoredRegisterVerification();
    if (storedVerification) currentRegisterTicket = storedVerification.ticket;
  }
  if (!currentRegisterTicket) {
    showAuthAlert('register', 'error', 'A confirmação expirou ou foi perdida. Solicite um novo código.');
    backToRegisterStep1();
    return;
  }

  const codeEl = document.getElementById('register-code');
  const code = (codeEl ? codeEl.value : '').trim();
  const btnEl = document.getElementById('btn-register-verify');

  if (!code || code.length < 6) {
    showAuthAlert('register', 'error', 'Digite o código de 6 dígitos enviado para seu e-mail.');
    if (codeEl) codeEl.focus();
    return;
  }

  if (btnEl) {
    btnEl.disabled = true;
    setAuthButtonLabel(btnEl, 'Confirmando...');
  }

  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ verificationTicket: currentRegisterTicket, code })
    });

    authToken = 'session';
    currentUser = data.user;
    clearRegisterVerification();
    updateNavAuth();
    showToast('🎉', 'E-mail confirmado com sucesso! Aproveite sua conta gratuita.');

    currentUserCardId = null;
    createNewCard();
  } catch (err) {
    showAuthAlert('register', 'error', err.message);
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      setAuthButtonLabel(btnEl, 'Confirmar e criar conta');
    }
  }
}

async function handleLogin() {
  clearAuthAlerts();
  const emailEl = document.getElementById('login-email');
  const passwordEl = document.getElementById('login-password');
  const btnEl = document.getElementById('btn-login') || document.querySelector('#login-form .btn-primary');

  if (!emailEl || !passwordEl) {
    showAuthAlert('login', 'error', 'Formulário de login não encontrado.');
    return;
  }

  const email = emailEl.value.trim().toLowerCase();
  const password = passwordEl.value;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.includes('..')) {
    showAuthAlert('login', 'error', 'Preencha um endereço de e-mail válido.');
    emailEl.focus();
    return;
  }
  if (!password) {
    showAuthAlert('login', 'error', 'Digite a sua senha.');
    passwordEl.focus();
    return;
  }

  const originalBtnText = btnEl ? btnEl.innerHTML : '';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '⏳ Entrando...';
  }

  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    authToken = 'session';
    currentUser = data.user;
    updateNavAuth();
    showToast('✅', 'Login realizado com sucesso!');

    if (currentUser.is_admin) {
      currentUserCardId = null;
      navigateTo('admin');
      return;
    }

    const summary = await api('/cards/stats/summary').catch(() => ({ hasCard: false }));
    if (summary && summary.hasCard && summary.card) {
      currentUserCardId = summary.card.id;
      editCard(summary.card.id);
    } else {
      currentUserCardId = null;
      createNewCard();
    }
  } catch (err) {
    const errorMsg = err.message || (err.status === 401 ? 'E-mail ou senha incorretos' : 'Erro ao realizar login');
    showAuthAlert('login', 'error', errorMsg);
    if (passwordEl) {
      passwordEl.value = '';
      passwordEl.focus();
    }
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = originalBtnText;
    }
  }
}

function loadActivationFromHash() {
  const raw = window.location.hash.startsWith('#activate?') ? window.location.hash.substring('#activate?'.length) : '';
  const params = new URLSearchParams(raw);
  setFieldValue('activation-email', params.get('email') || '');
  setFieldValue('activation-token', params.get('token') || '');
}

async function handleActivateAccount() {
  clearAuthAlerts();
  const email = document.getElementById('activation-email')?.value.trim().toLowerCase();
  const token = document.getElementById('activation-token')?.value.trim();
  const password = document.getElementById('activation-password')?.value || '';
  const confirmPassword = document.getElementById('activation-password-confirm')?.value || '';

  if (!email || !token) { showAuthAlert('activation', 'error', 'Link de ativação inválido.'); return; }
  if (password.length < 8) { showAuthAlert('activation', 'error', 'A senha deve ter pelo menos 8 caracteres.'); return; }
  if (password !== confirmPassword) { showAuthAlert('activation', 'error', 'As senhas não coincidem.'); return; }

  try {
    const data = await api('/auth/activate', { method: 'POST', body: JSON.stringify({ email, token, password }) });
    authToken = 'session';
    currentUser = data.user;
    currentUserCardId = null;
    showToast('✅', 'Conta ativada. Bem-vindo ao CardLink!');
    navigateTo('dashboard');
  } catch (err) {
    showAuthAlert('activation', 'error', err.message);
  }
}

function loadEmailVerificationFromHash() {
  const raw = window.location.hash.startsWith('#verify-email?') ? window.location.hash.substring('#verify-email?'.length) : '';
  const params = new URLSearchParams(raw);
  setFieldValue('verify-email-address', params.get('email') || '');
  setFieldValue('verify-email-token', params.get('token') || '');
}

async function handleConfirmEmailChange() {
  clearAuthAlerts();
  const email = document.getElementById('verify-email-address')?.value.trim().toLowerCase();
  const token = document.getElementById('verify-email-token')?.value.trim();
  if (!email || !token) { showToast('❌', 'Link de confirmação inválido.'); return; }

  try {
    const result = await api('/auth/confirm-email-change', {
      method: 'POST',
      body: JSON.stringify({ email, token })
    });
    showToast('✅', result.message || 'E-mail confirmado com sucesso!');

    if (authToken) {
      try {
        currentUser = await api('/auth/me');
        updateNavAuth();
        navigateTo('account');
        return;
      } catch (e) {
        // Se a sessão não puder ser recarregada, segue para o login abaixo.
      }
    }

    const loginEmail = document.getElementById('login-email');
    if (loginEmail) loginEmail.value = result.email || email;
    window.location.hash = '#auth';
    toggleAuthForm('login');
  } catch (err) {
    showToast('❌', err.message);
  }
}

async function handleForgotPassword(options = {}) {
  clearAuthAlerts();
  const isResend = Boolean(options.resend);
  if (enforceAuthCooldown('forgot', 'forgot')) return;

  const emailInput = document.getElementById('forgot-email');
  const email = emailInput?.value.trim().toLowerCase();
  const btnEl = document.getElementById(isResend ? 'btn-forgot-resend' : 'btn-forgot-send');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.includes('..')) {
    showAuthAlert('forgot', 'error', 'Informe um endereço de e-mail válido.');
    emailInput?.focus();
    return;
  }

  if (btnEl) {
    btnEl.disabled = true;
    setAuthButtonLabel(btnEl, 'Enviando código...');
  }

  try {
    const res = await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    setAuthCooldown('forgot', Number(res.resendAfterSeconds || 30));

    const step1 = document.getElementById('forgot-step-1');
    const step2 = document.getElementById('forgot-step-2');
    const banner = document.getElementById('forgot-code-banner');
    const targetEmailEl = document.getElementById('forgot-target-email');
    const statusEl = document.getElementById('forgot-code-status');

    if (targetEmailEl) targetEmailEl.textContent = email;
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';

    if (statusEl) {
      statusEl.className = 'auth-code-status auth-code-status-success';
      statusEl.innerHTML = `
        <strong>${isResend ? 'Nova solicitação enviada.' : 'Solicitação recebida.'}</strong>
        <span>Se <strong>${escapeHtml(email)}</strong> estiver cadastrado, enviaremos um código de 6 dígitos.</span>
        <span>${isResend ? 'Use somente o código mais recente. ' : ''}O código vale por 15 minutos.</span>
      `;
    }

    if (banner) {
      if (res.code) {
        banner.style.display = 'block';
        banner.innerHTML = `<strong>Código para teste:</strong><br><strong style="font-size:1.3rem;letter-spacing:4px;color:var(--accent);">${res.code}</strong>`;
      } else {
        banner.style.display = 'none';
        banner.innerHTML = '';
      }
    }

    updateAuthResendButton('forgot');
    showAuthAlert('forgot', 'success', 'Se o e-mail estiver cadastrado, o código foi enviado.');

    const codeEl = document.getElementById('forgot-code');
    if (codeEl) {
      codeEl.value = '';
      codeEl.focus();
    }
  } catch (err) {
    showAuthAlert('forgot', 'error', err.message || 'Não foi possível solicitar o código agora.');
  } finally {
    const sendBtn = document.getElementById('btn-forgot-send');
    if (sendBtn) {
      sendBtn.disabled = false;
      setAuthButtonLabel(sendBtn, 'Enviar código de recuperação');
    }
    if (isResend) updateAuthResendButton('forgot');
  }
}

async function handleResetPassword() {
  clearAuthAlerts();
  const email = (document.getElementById('forgot-target-email')?.textContent || document.getElementById('forgot-email')?.value || '').trim().toLowerCase();
  const codeEl = document.getElementById('forgot-code');
  const code = (codeEl?.value || '').trim();
  const passEl = document.getElementById('forgot-new-password');
  const newPassword = passEl?.value || '';
  const btnEl = document.getElementById('btn-forgot-reset');

  if (!email) {
    showAuthAlert('forgot', 'error', 'E-mail não identificado. Volte e informe seu e-mail.');
    return;
  }

  if (!code || code.length < 6) {
    showAuthAlert('forgot', 'error', 'Digite o código de 6 dígitos recebido.');
    if (codeEl) codeEl.focus();
    return;
  }

  if (newPassword.length < 8) {
    showAuthAlert('forgot', 'error', 'A nova senha deve ter no mínimo 8 caracteres.');
    if (passEl) passEl.focus();
    return;
  }

  if (btnEl) {
    btnEl.disabled = true;
    setAuthButtonLabel(btnEl, 'Salvando...');
  }

  try {
    const res = await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) });
    toggleAuthForm('login');
    const loginEmail = document.getElementById('login-email');
    if (loginEmail) loginEmail.value = email;
    showAuthAlert('login', 'success', res.message || 'Senha alterada com sucesso! Digite sua nova senha para entrar.');
  } catch (err) {
    showAuthAlert('forgot', 'error', err.message || 'Código inválido ou expirado. Tente novamente.');
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      setAuthButtonLabel(btnEl, 'Salvar nova senha');
    }
  }
}


function handleLogout() {
  fetch(API + '/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
  authToken = null;
  currentUser = null;
  currentUserCardId = null;
  showToast('👋', 'Você saiu da conta');
  navigateTo('home');
}

function showSettingsSection(section) {
  let targetSection = section || 'profile';
  activeSettingsSection = targetSection;
  document.querySelectorAll('[data-settings-section]').forEach(el => {
    el.classList.toggle('active', el.dataset.settingsSection === activeSettingsSection);
  });
  document.querySelectorAll('[data-settings-target]').forEach(button => {
    button.classList.toggle('active', button.dataset.settingsTarget === targetSection);
  });
  const activeButton = document.querySelector(`[data-settings-target="${targetSection}"]`);
  activeButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  window.setTimeout(updateSettingsNavArrows, 260);
  document.querySelector('.builder-form-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollSettingsNav(direction) {
  const nav = document.getElementById('settings-nav');
  if (!nav) return;
  nav.scrollBy({ left: direction * Math.max(220, nav.clientWidth * 0.7), behavior: 'smooth' });
  window.setTimeout(updateSettingsNavArrows, 320);
}

function updateSettingsNavArrows() {
  const nav = document.getElementById('settings-nav');
  const previous = document.getElementById('settings-nav-prev');
  const next = document.getElementById('settings-nav-next');
  if (!nav || !previous || !next) return;
  const maxScroll = Math.max(0, nav.scrollWidth - nav.clientWidth);
  previous.disabled = nav.scrollLeft <= 2;
  next.disabled = nav.scrollLeft >= maxScroll - 2;
}

function initSettingsNav() {
  const nav = document.getElementById('settings-nav');
  if (!nav) return;
  nav.addEventListener('scroll', updateSettingsNavArrows, { passive: true });
  window.addEventListener('resize', updateSettingsNavArrows);
  window.requestAnimationFrame(updateSettingsNavArrows);
}

function closeProPaymentModal() {
  const modal = document.getElementById('pro-payment-modal');
  if (modal) modal.style.display = 'none';
}

let selectedProModalPlan = 'monthly';

function selectProModalPlan(plan) {
  selectedProModalPlan = plan;
  const m = document.getElementById('pro-plan-m');
  const a = document.getElementById('pro-plan-a');
  const btn = document.getElementById('pro-modal-checkout-btn');
  if (plan === 'annual') {
    if (a) { a.style.border = '2px solid var(--accent)'; a.style.background = 'rgba(139,92,246,0.12)'; }
    if (m) { m.style.border = '1.5px solid var(--border-subtle)'; m.style.background = ''; }
    if (btn) btn.textContent = '💳 Pagar R$ 99,00/ano na Cakto';
  } else {
    if (m) { m.style.border = '2px solid var(--accent)'; m.style.background = 'rgba(139,92,246,0.12)'; }
    if (a) { a.style.border = '1.5px solid var(--border-subtle)'; a.style.background = ''; }
    if (btn) btn.textContent = '💳 Pagar R$ 12,90/mês na Cakto';
  }
}

function redirectToProCheckout() {
  redirectToCheckout(selectedProModalPlan || 'monthly');
}

function openProPaymentModal() {
  selectProModalPlan('monthly');
  const modal = document.getElementById('pro-payment-modal');
  if (modal) modal.style.display = 'flex';
}

function redirectToCheckout(planOverride) {
  const plan = planOverride || 'monthly';
  const email = currentUser ? encodeURIComponent(currentUser.email) : '';
  const fallbackMonthly = 'https://pay.cakto.com.br/kawb7xd_1032085';
  const fallbackAnnual = 'https://pay.cakto.com.br/5g7f23g';
  let base = (plan === 'annual'
    ? (window.CARD_LINK?.annualCheckoutUrl || fallbackAnnual)
    : (window.CARD_LINK?.monthlyCheckoutUrl || fallbackMonthly));
  if (!base || base.startsWith('PREENCHER')) {
    base = plan === 'annual' ? fallbackAnnual : fallbackMonthly;
  }
  const sep = base.includes('?') ? '&' : '?';
  const finalUrl = email ? `${base}${sep}email=${email}` : base;
  window.location.href = finalUrl;
}

let currentQrCodeSlug = '';

function openQrCodeModal(slug) {
  const isProUser = currentUser && !currentUser.is_admin && currentUser.plan === 'pro' &&
    (currentUser.subscription_status || 'active') === 'active' && (currentUser.account_status || 'active') === 'active';
  if (!isProUser) {
    showToast('⭐', 'QR Code integrado e rastreamento estão disponíveis no Plano Pro.');
    openProPaymentModal();
    return;
  }
  currentQrCodeSlug = slug;
  const modal = document.getElementById('qr-code-modal');
  const modalImg = document.getElementById('qr-code-modal-img');
  const modalUrl = document.getElementById('qr-code-modal-url');

  if (modal && modalImg && modalUrl) {
    const url = window.location.origin + '/site/' + slug + '/qr';
    modalImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000`;
    modalUrl.textContent = url;
    modal.style.display = 'flex';
  }
}

function closeQrCodeModal() {
  const modal = document.getElementById('qr-code-modal');
  if (modal) modal.style.display = 'none';
}

function openUserManualModal() {
  const modal = document.getElementById('user-manual-modal');
  if (modal) modal.style.display = 'flex';
}

function closeUserManualModal() {
  const modal = document.getElementById('user-manual-modal');
  if (modal) modal.style.display = 'none';
}

function copyQrCodeLink() {
  if (!currentQrCodeSlug) return;
  const url = window.location.origin + '/site/' + currentQrCodeSlug + '/qr';
  navigator.clipboard.writeText(url)
    .then(() => showToast('📋', 'Link do QR Code copiado!'))
    .catch(() => showToast('❌', 'Erro ao copiar link'));
}

function loadAccountView() {
  if (!currentUser) return;
  setFieldValue('account-name', currentUser.name || '');
  setFieldValue('account-email', currentUser.email || '');
  setFieldValue('account-email-password', '');
  setFieldValue('account-current-password', '');
  setFieldValue('account-new-password', '');
  const status = document.getElementById('account-email-status');
  if (status) {
    if (currentUser.pending_email) {
      status.textContent = `Aguardando confirmação de ${currentUser.pending_email}. O e-mail atual continua válido.`;
    } else if (currentUser.email_verified_at || currentUser.is_admin) {
      status.textContent = '✓ E-mail confirmado';
    } else {
      status.textContent = 'E-mail ainda não confirmado';
    }
  }
}

async function saveAccountProfile() {
  const name = document.getElementById('account-name')?.value.trim();
  const email = document.getElementById('account-email')?.value.trim().toLowerCase();
  const currentPassword = document.getElementById('account-email-password')?.value || '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !email) {
    showToast('⚠️', 'Informe seu nome e e-mail');
    return;
  }
  if (!emailRegex.test(email) || email.includes('..')) {
    showToast('⚠️', 'Informe um e-mail válido');
    return;
  }
  const changingEmail = email !== String(currentUser?.email || '').toLowerCase();
  if (changingEmail && !currentPassword) {
    showToast('⚠️', 'Confirme sua senha atual para trocar o e-mail');
    return;
  }
  try {
    const profile = await api('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, email, currentPassword })
    });
    currentUser = { ...currentUser, ...profile };
    setFieldValue('account-email', currentUser.email || '');
    setFieldValue('account-email-password', '');
    loadAccountView();
    updateNavAuth();
    showToast('✅', profile.message || 'Dados da conta atualizados');
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

