/* CardLink bootstrap: configuração pública e PWA sem scripts inline. */
window.CARD_LINK = window.CARD_LINK || {
  monthlyCheckoutUrl: 'https://pay.cakto.com.br/kawb7xd_1032085',
  annualCheckoutUrl: 'https://pay.cakto.com.br/5g7f23g'
};

let deferredPrompt = null;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredPrompt = event;
  if (!isStandalone) {
    const btn = document.getElementById('install-card-btn');
    if (btn) btn.style.display = '';
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'flex';
  }
});

window.triggerPwaInstall = function triggerPwaInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choice => {
      if (choice.outcome === 'accepted') {
        deferredPrompt = null;
        document.getElementById('install-card-btn')?.style.setProperty('display', 'none');
        document.getElementById('pwa-install-banner')?.style.setProperty('display', 'none');
      }
    });
  } else if (isIOS) {
    window.showToast?.('📲', 'iPhone: Toque em "Compartilhar" no Safari e escolha "Adicionar à Tela de Início"');
  } else {
    window.showToast?.('📲', 'Instalação: Toque no menu do navegador e escolha "Instalar App" ou "Adicionar à Tela Inicial"');
  }
};

window.installFromCard = function installFromCard() {
  window.triggerPwaInstall();
};

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document.getElementById('install-card-btn')?.style.setProperty('display', 'none');
  document.getElementById('pwa-install-banner')?.style.setProperty('display', 'none');
});

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(error => {
      console.warn('Service Worker não pôde ser registrado:', error.message);
    });
  }
});
