// ESM shim for @polkadot/wasm-crypto-wasm/bundle.js so Vite can import without CJS named-export issues
import { base64Decode, unzlibSync } from '@polkadot/wasm-util';
import { bytes, lenIn, lenOut } from './polkadot-wasm-bytes';
export { packageInfo } from '@polkadot/wasm-crypto-wasm/packageInfo.js';

export const wasmBytes = /*#__PURE__*/ unzlibSync(
  base64Decode(bytes, new Uint8Array(lenIn)),
  new Uint8Array(lenOut)
);


