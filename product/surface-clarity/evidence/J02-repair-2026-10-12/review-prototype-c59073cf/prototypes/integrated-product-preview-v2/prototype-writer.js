// Local prototype storage has one writer tab. This is concurrency control, not authentication.
// A same-origin integrated child shares its host's lease; separate tabs must close the first tab.
const KEY = "chopdot.local-prototype-writer-v1";
let held = false;
export function hasPrototypeWriter() {
  if (held) return true;
  try {
    return (
      parent !== window &&
      parent.location.origin === location.origin &&
      parent.ChopDotPrototypeWriter?.held === true
    );
  } catch {
    return false;
  }
}
export async function acquirePrototypeWriter() {
  if (hasPrototypeWriter()) return;
  if (!navigator.locks)
    throw new Error(
      "This local prototype needs a browser with Web Locks. Open it through http://localhost.",
    );
  let settle;
  const ready = new Promise((resolve) => {
    settle = resolve;
  });
  let release;
  const lifetime = new Promise((resolve) => {
    release = resolve;
  });
  navigator.locks
    .request(KEY, { mode: "exclusive", ifAvailable: true }, async (lock) => {
      if (!lock) {
        settle(false);
        return;
      }
      held = true;
      Object.defineProperty(window, "ChopDotPrototypeWriter", {
        configurable: true,
        value: Object.freeze({
          get held() {
            return held;
          },
        }),
      });
      window.addEventListener(
        "pagehide",
        () => {
          held = false;
          release();
        },
        { once: true },
      );
      window.addEventListener("pageshow", (event) => {
        if (event.persisted) location.reload();
      });
      settle(true);
      await lifetime;
    })
    .catch(() => settle(false));
  if (!(await ready))
    throw new Error(
      "This prototype is already open in another tab. Close that tab, then reload here. Your data has not changed.",
    );
}
export function assertPrototypeWriter() {
  if (!hasPrototypeWriter())
    throw new Error(
      "The prototype writer lease is no longer held. Reload this page.",
    );
}
export async function requirePrototypeWriter() {
  try {
    await acquirePrototypeWriter();
  } catch (error) {
    const message = document.createElement("p");
    message.role = "alert";
    message.textContent = error.message;
    document.body.replaceChildren(message);
    throw error;
  }
}
