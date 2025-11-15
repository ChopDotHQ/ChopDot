declare module 'vitest' {
  export const describe: (name: string, fn: () => void) => void;
  export const it: (name: string, fn: () => void) => void;
  export const expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toBeTruthy: () => void;
    toBeFalsy: () => void;
  };
  export const beforeEach: (fn: () => void) => void;
  export const afterEach: (fn: () => void) => void;
}

declare module '@automerge/automerge' {
  export type Doc<T> = T;
  export type Heads = string[];
  export type ChangeFn<T> = (doc: T) => void;

  export function from<T>(initial: T): Doc<T>;
  export function change<T>(doc: Doc<T>, message: string, fn: ChangeFn<T>): Doc<T>;
  export function save<T>(doc: Doc<T>): Uint8Array;
  export function load<T>(binary: Uint8Array): Doc<T>;
  export function init<T>(): Doc<T>;
  export function getChanges<T>(from: Doc<T>, to: Doc<T>): Uint8Array[];
  export function applyChanges<T>(doc: Doc<T>, changes: Uint8Array[]): [Doc<T>];
  export function merge<T>(doc1: Doc<T>, doc2: Doc<T>): Doc<T>;
  export function getHeads<T>(doc: Doc<T>): Heads;
  export function getHistory<T>(doc: Doc<T>): { change: unknown }[];
}

declare module 'pako' {
  export function gzip(data: Uint8Array): Uint8Array;
  export function ungzip(data: Uint8Array): Uint8Array;
}
