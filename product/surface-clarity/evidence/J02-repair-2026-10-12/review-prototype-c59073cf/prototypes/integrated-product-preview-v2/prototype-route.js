// Integrated local route continuity; no storage, identity or payment effects.
export function publishPrototypeRoute(type, hash = location.hash) {
  if (parent === window) return;
  try {
    if (parent.location.origin === location.origin && parent.ChopDotPrototypeRoute) {
      parent.ChopDotPrototypeRoute.publish(window, type, hash);
      return;
    }
  } catch { /* A standalone/cross-origin host uses the existing message protocol. */ }
  parent.postMessage({ type, hash }, location.origin);
}
