export type PolkadotHostFrameKind = 'products-devnet' | 'paseo' | 'local-test' | 'other';

export interface PolkadotHostFrameContext {
  embedded: boolean;
  referrerHost: string;
}

export function classifyPolkadotHostFrame({embedded, referrerHost}: PolkadotHostFrameContext): PolkadotHostFrameKind {
  if (!embedded) return 'other';
  const host = referrerHost.trim().toLowerCase().replace(/\.$/u, '');
  if (host === '127.0.0.1' || host === 'localhost') return 'local-test';
  if (hostMatchesDomain(host, 'dev-dot.li')) return 'products-devnet';
  if (hostMatchesDomain(host, 'paseo.li')) return 'paseo';
  return 'other';
}

export function isPolkadotProductHostFrame(context: PolkadotHostFrameContext): boolean {
  const kind = classifyPolkadotHostFrame(context);
  return kind === 'products-devnet' || kind === 'paseo';
}

export function isLocalPolkadotTestHostFrame(context: PolkadotHostFrameContext): boolean {
  return classifyPolkadotHostFrame(context) === 'local-test';
}

function hostMatchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}
