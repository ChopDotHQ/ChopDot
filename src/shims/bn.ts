// ESM wrapper around bn.js to provide a default export in Vite dev
// Some dependencies import `bn.js/lib/bn.js` as a default; this shim normalizes it.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as BNCommon from '/node_modules/bn.js/lib/bn.js';
// bn.js is CJS; default may or may not exist depending on transform
const BN: any = (BNCommon as any).default ?? (BNCommon as any);
// Emit a marker so we see exactly when/if this shim is loaded
try { console.warn('[CHOPDOT-DEBUG] bn shim loaded', { hasDefault: !!(BNCommon as any).default }); } catch {}
export { BN };
export default BN;


