/* CardLink: marketing opcional, sem correspondência avançada ou dados de formulários. */
(() => {
  const PIXEL = '2584889765314185';
  const KEY = 'cardlink-marketing-consent-v1';
  let enabled = false, pageViewed = false, registrationSent = false;
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = value => { try { localStorage.setItem(KEY, value); } catch {} };
  function start() {
    if (!enabled) return;
    if (!window.fbq) {
      const q = window.fbq = function () { q.callMethod ? q.callMethod.apply(q, arguments) : q.queue.push(arguments); };
      q.push = q; q.loaded = true; q.version = '2.0'; q.queue = [];
      const script = document.createElement('script'); script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.append(script);
      q('consent', 'grant'); q('set', 'autoConfig', false, PIXEL); q('init', PIXEL);
    } else window.fbq('consent', 'grant');
    if (!pageViewed) { window.fbq('trackSingle', PIXEL, 'PageView'); pageViewed = true; }
  }
  const panel = document.createElement('section');
  panel.className = 'cardlink-consent'; panel.setAttribute('aria-label', 'Preferências de privacidade');
  const copy = document.createElement('p');
  copy.textContent = 'Podemos usar o Pixel da Meta para medir visitas e cadastros e melhorar nossos anúncios. É opcional: você pode usar o CardLink sem aceitar.';
  const accept = document.createElement('button'); accept.type = 'button'; accept.textContent = 'Aceitar medição de anúncios';
  const reject = document.createElement('button'); reject.type = 'button'; reject.textContent = 'Continuar sem aceitar';
  function choose(value) { enabled = value === 'granted'; save(value); panel.hidden = true; if (enabled) start(); else if (window.fbq) window.fbq('consent', 'revoke'); }
  accept.addEventListener('click', () => choose('granted')); reject.addEventListener('click', () => choose('denied'));
  const privacy = document.createElement('a'); privacy.href = '#/privacy'; privacy.textContent = 'Política de privacidade';
  panel.append(copy, accept, reject, privacy); document.body.append(panel);
  const preferences = document.createElement('button'); preferences.type = 'button'; preferences.className = 'cardlink-privacy-preferences'; preferences.textContent = 'Preferências de privacidade';
  preferences.addEventListener('click', () => { panel.hidden = false; }); document.body.append(preferences);
  window.CardLinkTracking = {
    registration() {
      // Chamado apenas após a API confirmar a criação, nunca em clique ou login.
      if (!enabled || registrationSent) return;
      registrationSent = true;
      window.fbq('trackSingle', PIXEL, 'CompleteRegistration', { content_name: 'Conta gratuita CardLink', status: true }, { eventID: crypto.randomUUID() });
    }
  };
  const choice = read(); panel.hidden = choice === 'granted' || choice === 'denied'; enabled = choice === 'granted'; if (enabled) start();
})();
