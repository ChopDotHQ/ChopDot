// ESM shim to ensure a default export for eventemitter3 in Vite
// Works whether underlying package exposes default or CJS exports
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as EE from 'eventemitter3';
const EventEmitter: any = (EE as any).default ?? (EE as any);
export { EventEmitter };
export default EventEmitter;


