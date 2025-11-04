// ESM shim for @polkadot/wasm-crypto-wasm package entry
// Provides `wasmBytes` and `packageInfo` without relying on CJS named exports
import { base64Decode, unzlibSync } from '@polkadot/wasm-util';
import { bytes, lenIn, lenOut } from './polkadot-wasm-bytes';
export { packageInfo } from '@polkadot/wasm-crypto-wasm/packageInfo.js';

export const wasmBytes = /*#__PURE__*/ unzlibSync(
  base64Decode(bytes, new Uint8Array(lenIn)),
  new Uint8Array(lenOut)
);


