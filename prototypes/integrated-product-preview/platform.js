function detectHost() {
  const query = new URLSearchParams(window.location.search);
  const forced = query.get('host');
  if (forced) return forced;
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('polkadot')) return 'polkadot-host';
  return 'browser';
}

export const host = detectHost();

export const capabilities = Object.freeze({
  identity: host === 'polkadot-host' ? 'host' : 'simulated',
  signing: host === 'polkadot-host' ? 'host' : 'simulated',
  qr: 'simulated',
  share: navigator.share ? 'browser' : 'simulated',
  notifications: 'simulated',
  persistence: 'localStorage',
});

export function hostLabel() {
  if (host === 'polkadot-desktop') return 'Polkadot Desktop preview';
  if (host === 'polkadot-web') return 'Polkadot Web preview';
  if (host === 'polkadot-mobile') return 'Polkadot Mobile preview';
  if (host === 'polkadot-host') return 'Polkadot Host preview';
  return 'Browser preview';
}

export async function requestSignature(payload = {}) {
  return {
    mode: capabilities.signing,
    status: 'simulated-approved',
    payloadDigest: btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).slice(0, 18),
    signedAt: new Date().toISOString(),
  };
}

export async function scanQr() {
  return {
    mode: capabilities.qr,
    type: 'group-invite',
    value: 'chopdot://group/ski-weekend/invite/demo',
  };
}

export async function share(payload) {
  if (navigator.share) {
    try {
      await navigator.share(payload);
      return { mode: 'browser', status: 'shared' };
    } catch {
      return { mode: 'browser', status: 'cancelled' };
    }
  }
  return { mode: 'simulated', status: 'copied' };
}

export async function notify(title, body) {
  return { mode: 'simulated', title, body, delivered: true };
}
