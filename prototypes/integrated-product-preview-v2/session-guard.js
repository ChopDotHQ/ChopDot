// Prototype route/write guard only; this is not production authentication.
export function assertLocalSession(s){if(['signed-out','expired'].includes(s.gateD?.session.status)||s.gateD?.account.status==='deleted'){const e=new Error('Sign in through Entry. Your shared records are preserved.');e.code='SESSION';throw e;}}
export function routeLocalSession(s){try{assertLocalSession(s);return true;}catch{if(parent!==window)parent.postMessage({type:'chopdot-gate-d-entry'},location.origin);else location.replace('../index.html?entry=signin');return false;}}
