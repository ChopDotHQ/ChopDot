import { signatureVerify } from '@polkadot/util-crypto';
import { web3FromAddress } from '@polkadot/extension-dapp';

function b64urlEncode(input: string): string {
  return btoa(unescape(encodeURIComponent(input))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}
function b64urlDecode(input: string): string {
  const s = input.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(s)));
}

export async function createInvite(potId: string, inviter: string, role: 'member' | 'viewer' = 'member') {
  const payload = { potId, inviter, role, ts: Date.now() };
  const msg = JSON.stringify(payload);
  const injector = await web3FromAddress(inviter);
  const sig = await injector.signer.signRaw!({ address: inviter, data: `0x${Buffer.from(msg).toString('hex')}`, type: 'bytes' });
  const packed = b64urlEncode(JSON.stringify({ payload, signature: sig.signature }));
  return packed;
}

export function parseInvite(token: string) {
  const json = b64urlDecode(token);
  return JSON.parse(json) as { payload: any; signature: string };
}

export function verifyInvite(payload: any, signature: string, inviter: string) {
  const msg = JSON.stringify(payload);
  const u8 = new Uint8Array(Buffer.from(msg, 'utf8'));
  const ok = signatureVerify(u8, signature, inviter);
  return ok.isValid;
}


