import { BN } from '@polkadot/util';

export const PLANCK = new BN(10).pow(new BN(12)); // 10^12 on Westend/Polkadot

export function dotToPlanck(dot: string): BN {
  const [i, f = ''] = dot.split('.');
  const frac = (f + '000000000000').slice(0, 12);
  const whole = new BN(i || '0').mul(PLANCK);
  const fractional = new BN(frac);
  return whole.add(fractional);
}

export function planckToDot(p: BN | string): string {
  const bn = BN.isBN(p as any) ? (p as BN) : new BN(p);
  const i = bn.div(PLANCK).toString();
  const f = bn.mod(PLANCK).toString().padStart(12, '0').replace(/0+$/,'');
  return f ? `${i}.${f}` : i;
}


