// ESM shim for @polkadot/wasm-crypto-wasm package entry
// Provides `wasmBytes` and `packageInfo` without relying on CJS named exports
import { base64Decode, unzlibSync } from '@polkadot/wasm-util';
import { bytes, lenIn, lenOut } from './polkadot-wasm-bytes';
// Provide a minimal packageInfo to satisfy detectPackage consumers in dev
export const packageInfo = { name: '@polkadot/wasm-crypto-wasm', version: '0.0.0' } as const;

export const wasmBytes = /*#__PURE__*/ unzlibSync(
  base64Decode(bytes, new Uint8Array(lenIn)),
  new Uint8Array(lenOut)
);


