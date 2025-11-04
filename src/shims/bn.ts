// ESM wrapper around bn.js to provide a default export in Vite dev
// Some dependencies import `bn.js/lib/bn.js` as a default; this shim normalizes it.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as BNCommon from 'bn.js';
// bn.js is CJS; default may or may not exist depending on transform
const BN: any = (BNCommon as any).default ?? (BNCommon as any);
export default BN;


