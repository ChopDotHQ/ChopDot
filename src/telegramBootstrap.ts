export function loadTelegramWebAppScript() {
  if (typeof window === 'undefined') {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const isTelegramLaunch =
    /Telegram/i.test(window.navigator.userAgent) ||
    params.has('tgWebAppData') ||
    params.has('tgWebAppStartParam') ||
    params.has('startapp');

  if (!isTelegramLaunch || document.querySelector('script[data-chopdot-telegram-webapp]')) {
    return;
  }

  const script = document.createElement('script');
  script.dataset.chopdotTelegramWebapp = 'true';
  script.src = 'https://telegram.org/js/telegram-web-app.js?62';
  script.onload = () => window.dispatchEvent(new Event('chopdot:telegram-ready'));
  document.head.appendChild(script);
}
