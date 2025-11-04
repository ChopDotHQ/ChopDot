// Shim to adapt CJS bytes export from @polkadot/wasm-crypto-wasm for Vite ESM
// We import the CJS module as a default and then re-export the named fields.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import bytesCjs from '/node_modules/@polkadot/wasm-crypto-wasm/cjs/bytes.js';

// In Vite, CJS interop usually places exports on the default object
const mod: any = (bytesCjs as any) || {};
export const bytes: string = mod.bytes as string;
export const lenIn: number = mod.lenIn as number;
export const lenOut: number = mod.lenOut as number;


