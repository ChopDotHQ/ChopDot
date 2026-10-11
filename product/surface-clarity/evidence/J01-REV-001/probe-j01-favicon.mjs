import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [repo, preview, output] = process.argv.slice(2);
const { serve } = await import(pathToFileURL(repo + '/prototypes/integrated-product-preview-v2/gate-b/test-server.mjs'));
const checks = [];
for (const cleanIndex of [false, true]) {
  const host = await serve(preview, 0, { cleanIndex });
  try {
    for (const [path, expected] of [['/favicon.ico', 204], ['/favicon.ico?browser=probe', 204], ['/missing-j01-fixture.js', 404], ['/%2e%2e%2foutside', 403], ['/prototypes/integrated-product-preview-v2/index.html', cleanIndex ? 302 : 200]]) {
      const response = await fetch(host.base + path, { redirect: 'manual' });
      const body = await response.text();
      assert.equal(response.status, expected);
      if (expected === 204) { assert.equal(body, ''); assert.equal(response.headers.get('cache-control'), 'no-store'); }
      checks.push({cleanIndex,path,status:response.status,passed:true});
    }
  } finally { await host.close(); }
}
writeFileSync(output, JSON.stringify({status:'PASS',checks},null,2)+'\n');
console.log(JSON.stringify({status:'PASS',checks:checks.length}));
