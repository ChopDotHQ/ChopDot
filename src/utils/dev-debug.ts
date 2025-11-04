/*
  Development debug helpers: installs global error handlers and console markers
  to help pinpoint runtime issues in the browser console.
*/

type DevDebugOptions = { enabled?: boolean };

export function installDevDebug(opts: DevDebugOptions = {}): void {
  if (!opts.enabled) return;
  const PREFIX = '[CHOPDOT-DEBUG]';

  // Tag console errors/warnings with a prefix while preserving originals
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...args) => origError(PREFIX, ...args);
  console.warn = (...args) => origWarn(PREFIX, ...args);

  // Global error handlers
  window.addEventListener('error', (ev) => {
    origError(`${PREFIX} window.error`, {
      message: ev.message,
      filename: (ev as any).filename,
      lineno: (ev as any).lineno,
      colno: (ev as any).colno,
      error: (ev as any).error?.stack ?? (ev as any).error,
    });
  });
  window.addEventListener('unhandledrejection', (ev) => {
    origError(`${PREFIX} unhandledrejection`, ev.reason);
  });

  // Mark fetch/WebSocket attempts
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    try {
      const res = await origFetch(...args as [RequestInfo, RequestInit?]);
      if (!res.ok) {
        origWarn(`${PREFIX} fetch non-OK`, args[0], res.status, res.statusText);
      }
      return res;
    } catch (e) {
      origError(`${PREFIX} fetch error`, args[0], e);
      throw e;
    }
  };
  const OrigWS = window.WebSocket;
  (window as any).WebSocket = function(url: string, protocols?: string | string[]) {
    origWarn(`${PREFIX} WebSocket open`, url, protocols);
    const ws = new OrigWS(url, protocols as any);
    ws.addEventListener('error', (e) => origError(`${PREFIX} WebSocket error`, url, e));
    ws.addEventListener('close', (e) => origWarn(`${PREFIX} WebSocket close`, url, { code: e.code, reason: e.reason }));
    return ws as any;
  } as any;

  // Mark environment & version hints
  try {
    origWarn(`${PREFIX} env`, {
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      prod: import.meta.env.PROD,
    });
  } catch {}

  // Drop a breadcrumb in the DOM for screenshots
  try {
    const el = document.createElement('meta');
    el.name = 'x-chopdot-debug';
    el.content = new Date().toISOString();
    document.head.appendChild(el);
  } catch {}
}


