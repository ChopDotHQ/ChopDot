#!/usr/bin/env node

import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const journeyRoot = path.resolve(here, '..');
const candidatePath = path.join(journeyRoot, 'v1-candidate.html');
const qaPath = path.join(here, 'review-qa-v1.mjs');

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(needle, first + needle.length) >= 0) throw new Error(`Ambiguous ${label}`);
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

let html = await readFile(candidatePath, 'utf8');

html = replaceOnce(
  html,
  '<div class="actions"><a class="btn primary" href="#action-review">Review this payment</a><a class="btn secondary" href="#handoff">Back to Settle Up</a><a class="btn text" href="#switch-account-review">Switch account or network</a></div>',
  '<div class="actions"><a class="btn primary" href="#action-review">Review this payment</a><a class="btn secondary" href="#handoff">Back to Settle Up</a><a class="btn text" href="#switch-account-review">Switch account or network</a><a class="btn text" href="#disconnect">Disconnect wallet</a></div>',
  'connected action block',
);

const availabilityMarkup = `
<section class="screen" id="disconnect" data-state="disconnect" aria-label="Wallet disconnected">
<header class="header"><div class="brand"><span class="mark" aria-hidden="true"></span>ChopDot</div><span class="badge">Prototype</span></header>
<main class="content">
<div><div class="eyebrow">Wallet & crypto</div><h1 class="hero">Wallet disconnected</h1><p class="sub">The connected wallet session ended locally. This changes execution capability only; it does not change the settlement or erase payment records.</p></div>
<div class="card context"><div class="context-head"><b>Settlement preserved</b><span>Session ended</span></div><div class="context-grid"><span>Pay</span><strong>Maya</strong><span>Amount</span><strong class="fact">12.50 DOT</strong><span>Required network</span><strong>Polkadot</strong><span>Wallet</span><strong>Disconnected</strong></div></div>
<div class="notice neutral">Saved Payment Methods, settlement history, source expenses, and balances were not deleted or changed. No payment was signed or sent by disconnecting.</div>
<div class="actions"><a class="btn primary" href="#disconnect-handoff">Return to Settle Up</a></div>
</main>
<footer class="footer"><nav class="tabbar" aria-label="Primary"><span class="tab"><span class="navdot">●</span>Pots</span><span class="tab"><span class="navdot">○</span>People</span><span class="add" aria-hidden="true">+</span><span class="tab"><span class="navdot">○</span>Activity</span><span class="tab active"><span class="navdot">●</span>You</span></nav></footer>
</section>

<section class="screen" id="disconnect-handoff" data-state="disconnect-handoff" aria-label="Settlement wallet disconnected">
<header class="header"><div class="brand"><span class="mark" aria-hidden="true"></span>ChopDot</div><span class="badge">Prototype</span></header>
<main class="content">
<div><div class="eyebrow">Settle Up</div><h1 class="hero">Wallet is disconnected</h1><p class="sub">Wallet & Crypto returned the session result without changing the payment. The same settlement can request a wallet again later if you choose to continue.</p></div>
<div class="card context"><div class="context-head"><b>Settlement preserved</b><span>Wallet disconnected</span></div><div class="context-grid"><span>Pay</span><strong>Maya</strong><span>Amount</span><strong class="fact">12.50 DOT</strong><span>Required network</span><strong>Polkadot</strong><span>Payment</span><strong>Not signed or sent</strong></div></div>
<div class="notice neutral">Disconnecting did not remove a saved receiving destination, settlement history, source expense, or balance. This returned state exposes no wallet execution route.</div>
<div class="actions"><span class="btn primary" aria-disabled="true">Returned to Settle Up · wallet disconnected</span></div>
</main>
<footer class="footer"><nav class="tabbar" aria-label="Primary"><span class="tab"><span class="navdot">●</span>Pots</span><span class="tab"><span class="navdot">○</span>People</span><span class="add" aria-hidden="true">+</span><span class="tab"><span class="navdot">○</span>Activity</span><span class="tab active"><span class="navdot">●</span>You</span></nav></footer>
</section>

<section class="screen" id="loading" data-state="loading" aria-label="Loading wallet state">
<header class="header"><div class="brand"><span class="mark" aria-hidden="true"></span>ChopDot</div><span class="badge">Prototype</span></header>
<main class="content">
<div class="card pending" role="status" aria-live="polite"><div class="spinner" aria-hidden="true"></div><b>Checking wallet state</b><p>ChopDot is reading the current wallet session. Until that read finishes, it does not assume an account, network, signature, submission, or finality result.</p></div>
<div class="card context"><div class="context-head"><b>Return context preserved</b><span>Settle Up</span></div><div class="context-grid"><span>Pay</span><strong>Maya</strong><span>Amount</span><strong class="fact">12.50 DOT</strong><span>Required network</span><strong>Polkadot</strong></div></div>
<div class="notice neutral">The shell stays available while wallet state loads. No connect, sign, submit, or payment action is available from this loading state.</div>
<div class="actions"><span class="btn primary" aria-disabled="true">Checking wallet state…</span><a class="btn secondary" href="#wallet-state-unavailable-handoff">Return to Settle Up</a></div>
</main>
<footer class="footer"><nav class="tabbar" aria-label="Primary"><span class="tab"><span class="navdot">●</span>Pots</span><span class="tab"><span class="navdot">○</span>People</span><span class="add" aria-hidden="true">+</span><span class="tab"><span class="navdot">○</span>Activity</span><span class="tab active"><span class="navdot">●</span>You</span></nav></footer>
</section>

<section class="screen" id="offline" data-state="offline" aria-label="Wallet unavailable offline">
<header class="header"><div class="brand"><span class="mark" aria-hidden="true"></span>ChopDot</div><span class="badge">Prototype</span></header>
<main class="content">
<div><div class="eyebrow">Connection unavailable</div><h1 class="hero">You’re offline</h1><p class="sub">ChopDot cannot safely refresh wallet or network state right now. The settlement stays exactly where you left it.</p></div>
<div class="card context"><div class="context-head"><b>Return context preserved</b><span>Settle Up</span></div><div class="context-grid"><span>Pay</span><strong>Maya</strong><span>Amount</span><strong class="fact">12.50 DOT</strong><span>Required network</span><strong>Polkadot</strong></div></div>
<div class="notice warning">Offline mode cannot connect, sign, or submit. No wallet state or network finality is inferred from cached or missing connectivity.</div>
<div class="actions"><a class="btn primary" href="#loading">Check wallet state</a><a class="btn secondary" href="#wallet-state-unavailable-handoff">Return to Settle Up</a></div>
</main>
<footer class="footer"><nav class="tabbar" aria-label="Primary"><span class="tab"><span class="navdot">●</span>Pots</span><span class="tab"><span class="navdot">○</span>People</span><span class="add" aria-hidden="true">+</span><span class="tab"><span class="navdot">○</span>Activity</span><span class="tab active"><span class="navdot">●</span>You</span></nav></footer>
</section>

<section class="screen" id="load-error" data-state="load-error" aria-label="Wallet state load error">
<header class="header"><div class="brand"><span class="mark" aria-hidden="true"></span>ChopDot</div><span class="badge">Prototype</span></header>
<main class="content">
<div><div class="eyebrow">Wallet unavailable</div><h1 class="hero">Wallet state could not be loaded</h1><p class="sub">The wallet provider or session read failed. ChopDot will not guess whether the wallet is connected, disconnected, or ready to act.</p></div>
<div class="card context"><div class="context-head"><b>Return context preserved</b><span>Settle Up</span></div><div class="context-grid"><span>Pay</span><strong>Maya</strong><span>Amount</span><strong class="fact">12.50 DOT</strong><span>Required network</span><strong>Polkadot</strong></div></div>
<div class="notice danger">No connected, disconnected, submitted, or finalized state is being inferred. Retry only re-reads wallet state; it cannot sign, submit, or move money.</div>
<div class="actions"><a class="btn primary" href="#loading">Try loading wallet again</a><a class="btn secondary" href="#wallet-state-unavailable-handoff">Return to Settle Up</a></div>
</main>
<footer class="footer"><nav class="tabbar" aria-label="Primary"><span class="tab"><span class="navdot">●</span>Pots</span><span class="tab"><span class="navdot">○</span>People</span><span class="add" aria-hidden="true">+</span><span class="tab"><span class="navdot">○</span>Activity</span><span class="tab active"><span class="navdot">●</span>You</span></nav></footer>
</section>

<section class="screen" id="wallet-state-unavailable-handoff" data-state="wallet-state-unavailable-handoff" aria-label="Settlement wallet state unavailable">
<header class="header"><div class="brand"><span class="mark" aria-hidden="true"></span>ChopDot</div><span class="badge">Prototype</span></header>
<main class="content">
<div><div class="eyebrow">Settle Up</div><h1 class="hero">Wallet status is unavailable</h1><p class="sub">Wallet & Crypto returned without inventing a session or network result. The settlement is unchanged and can stay open until wallet state can be read safely.</p></div>
<div class="card context"><div class="context-head"><b>Settlement preserved</b><span>Wallet unavailable</span></div><div class="context-grid"><span>Pay</span><strong>Maya</strong><span>Amount</span><strong class="fact">12.50 DOT</strong><span>Required network</span><strong>Polkadot</strong><span>Wallet</span><strong>Status unavailable</strong></div></div>
<div class="notice warning">No connected, disconnected, submitted, or finalized state is assumed here. There is no wallet execution route from this returned boundary.</div>
<div class="actions"><span class="btn primary" aria-disabled="true">Returned to Settle Up · wallet unavailable</span></div>
</main>
<footer class="footer"><nav class="tabbar" aria-label="Primary"><span class="tab"><span class="navdot">●</span>Pots</span><span class="tab"><span class="navdot">○</span>People</span><span class="add" aria-hidden="true">+</span><span class="tab"><span class="navdot">○</span>Activity</span><span class="tab active"><span class="navdot">●</span>You</span></nav></footer>
</section>
`;

html = replaceOnce(
  html,
  '\n</div></div>\n<aside class="labpanel">',
  `${availabilityMarkup}\n</div></div>\n<aside class="labpanel">`,
  'candidate state insertion point',
);

html = replaceOnce(
  html,
  '<p>V1 candidate · bounded Builder balance coverage</p>',
  '<p>V1 candidate · bounded Builder availability / recovery coverage</p>',
  'lab panel scope label',
);
html = replaceOnce(
  html,
  '<li>Insufficient transfer balance preserves the exact upstream amount/asset</li></ul>',
  '<li>Insufficient transfer balance preserves the exact upstream amount/asset</li><li>Disconnect ends only the wallet session and preserves saved/payment history</li><li>Offline blocks connect/sign/submit without inventing wallet or finality state</li><li>Loading preserves the shell and exact caller context without assuming wallet state</li><li>Load/provider error retries only a state read and returns safely without execution</li></ul>',
  'lab built list',
);
html = replaceOnce(
  html,
  '<div class="lablabel">Still to build</div><p>Disconnect, offline, loading, and load/provider-error states, plus fresh complete-candidate evidence.</p>',
  '<div class="lablabel">Still to build</div><p>Fresh complete-candidate evidence and independent review. No additional J21 scope is authorized in this head.</p>',
  'lab remaining scope',
);
html = replaceOnce(
  html,
  ' · <a href="#reverted">Failed</a></p></aside>',
  ' · <a href="#reverted">Failed</a> · <a href="#disconnect">Disconnect</a> · <a href="#offline">Offline</a> · <a href="#loading">Loading</a> · <a href="#load-error">Load error</a> · <a href="#wallet-state-unavailable-handoff">Unavailable return</a></p></aside>',
  'lab quick links',
);

await writeFile(candidatePath, html);

let qa = await readFile(qaPath, 'utf8');
qa = replaceOnce(
  qa,
  "  'connected',\n  'wrong-network',",
  "  'connected',\n  'disconnect',\n  'disconnect-handoff',\n  'loading',\n  'offline',\n  'load-error',\n  'wallet-state-unavailable-handoff',\n  'wrong-network',",
  'QA state inventory',
);
qa = replaceOnce(
  qa,
  "  'connected': ['Wallet connected', '5F3sa2…Demo9', 'Polkadot', 'not added to Payment Methods', 'not authorized or sent'],\n  'wrong-network':",
  "  'connected': ['Wallet connected', '5F3sa2…Demo9', 'Polkadot', 'not added to Payment Methods', 'not authorized or sent'],\n  'disconnect': ['Wallet disconnected', '12.50 DOT', 'Maya', 'Polkadot', 'Saved Payment Methods', 'settlement history', 'source expenses', 'balances', 'No payment was signed or sent'],\n  'disconnect-handoff': ['Settle Up', 'Wallet is disconnected', '12.50 DOT', 'Maya', 'Polkadot', 'Not signed or sent', 'did not remove a saved receiving destination'],\n  'loading': ['Checking wallet state', '12.50 DOT', 'Maya', 'Polkadot', 'does not assume an account, network, signature, submission, or finality result'],\n  'offline': ['You’re offline', '12.50 DOT', 'Maya', 'Polkadot', 'cannot connect, sign, or submit', 'No wallet state or network finality is inferred'],\n  'load-error': ['Wallet state could not be loaded', '12.50 DOT', 'Maya', 'Polkadot', 'No connected, disconnected, submitted, or finalized state is being inferred'],\n  'wallet-state-unavailable-handoff': ['Settle Up', 'Wallet status is unavailable', '12.50 DOT', 'Maya', 'Polkadot', 'No connected, disconnected, submitted, or finalized state is assumed'],\n  'wrong-network':",
  'QA availability semantics',
);
qa = replaceOnce(
  qa,
  "      if (state === 'connected') {\n        if (!metrics.anchors.includes('#switch-account-review')) errors.push(`${viewport.name}/${state}: connected wallet must enter explicit account-switch review before a switch prompt`);\n      }\n      if (state === 'wrong-network') {",
  "      if (state === 'connected') {\n        if (!metrics.anchors.includes('#switch-account-review')) errors.push(`${viewport.name}/${state}: connected wallet must enter explicit account-switch review before a switch prompt`);\n        if (!metrics.anchors.includes('#disconnect')) errors.push(`${viewport.name}/${state}: connected wallet must expose an explicit session disconnect`);\n      }\n      if (state === 'disconnect') {\n        if (metrics.anchors.length !== 1 || !metrics.anchors.includes('#disconnect-handoff')) errors.push(`${viewport.name}/${state}: disconnect must return only through the explicit disconnected handoff`);\n        for (const forbidden of ['#action-review', '#action-review-switched', '#signature-pending', '#signature-pending-switched', '#signed', '#submission-pending', '#finalized']) {\n          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: disconnect must not expose execution route ${forbidden}`);\n        }\n      }\n      if (state === 'disconnect-handoff') {\n        if (metrics.anchors.length !== 0) errors.push(`${viewport.name}/${state}: disconnected caller return must expose no wallet execution route`);\n        if (/Wallet setup was cancelled/iu.test(metrics.text)) errors.push(`${viewport.name}/${state}: disconnect must not be rewritten as cancellation`);\n      }\n      if (state === 'loading') {\n        if (metrics.anchors.length !== 1 || !metrics.anchors.includes('#wallet-state-unavailable-handoff')) errors.push(`${viewport.name}/${state}: loading must preserve only a safe caller return while state is unknown`);\n        for (const forbidden of ['#chooser', '#connect-pending', '#connected', '#action-review', '#signature-pending', '#signed', '#submission-pending', '#finalized']) {\n          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: loading must not invent/bypass wallet state through ${forbidden}`);\n        }\n      }\n      if (state === 'offline' || state === 'load-error') {\n        for (const required of ['#loading', '#wallet-state-unavailable-handoff']) {\n          if (!metrics.anchors.includes(required)) errors.push(`${viewport.name}/${state}: unavailable wallet state must preserve ${required}`);\n        }\n        for (const forbidden of ['#chooser', '#connect-pending', '#connected', '#action-review', '#action-review-switched', '#signature-pending', '#signature-pending-switched', '#signed', '#submission-pending', '#finalized']) {\n          if (metrics.anchors.includes(forbidden)) errors.push(`${viewport.name}/${state}: unavailable wallet state must not expose execution route ${forbidden}`);\n        }\n      }\n      if (state === 'wallet-state-unavailable-handoff') {\n        if (metrics.anchors.length !== 0) errors.push(`${viewport.name}/${state}: unavailable caller return must expose no wallet execution route`);\n        if (/Wallet connected|Network finality verified|Settlement complete/iu.test(metrics.text)) errors.push(`${viewport.name}/${state}: unavailable caller return fabricated wallet/finality success`);\n      }\n      if (state === 'wrong-network') {",
  'QA availability assertions',
);
qa = replaceOnce(
  qa,
  "    interactionResults.push({viewport: viewport.name, path: 'timeout-return-keeps-connect-blocked', finalHash: await page.evaluate(() => location.hash)});\n\n    const accountSwitchPath =",
  "    interactionResults.push({viewport: viewport.name, path: 'timeout-return-keeps-connect-blocked', finalHash: await page.evaluate(() => location.hash)});\n\n    const disconnectPath = ['#connected', '#disconnect', '#disconnect-handoff'];\n    await page.goto(`${pathToFileURL(candidatePath).href}${disconnectPath[0]}`, {waitUntil: 'load'});\n    for (const next of disconnectPath.slice(1)) {\n      const link = page.locator(`.screen:visible a[href=\"${next}\"]`).first();\n      if (!(await link.isVisible())) {\n        errors.push(`${viewport.name}: disconnect path cannot reach ${next}`);\n        break;\n      }\n      await link.click();\n      await page.waitForFunction(target => location.hash === target, next);\n    }\n    const disconnectedBypass = await page.locator('.screen:visible a[href=\"#connected\"], .screen:visible a[href=\"#action-review\"], .screen:visible a[href=\"#signature-pending\"], .screen:visible a[href=\"#signed\"], .screen:visible a[href=\"#submission-pending\"]').count();\n    if (disconnectedBypass !== 0) errors.push(`${viewport.name}: disconnected caller return exposes ${disconnectedBypass} execution bypass route(s)`);\n    interactionResults.push({viewport: viewport.name, path: 'disconnect-preserves-settlement-without-execution', finalHash: await page.evaluate(() => location.hash)});\n\n    for (const unavailableState of ['#offline', '#load-error']) {\n      await page.goto(`${pathToFileURL(candidatePath).href}${unavailableState}`, {waitUntil: 'load'});\n      const retry = page.locator('.screen:visible a[href=\"#loading\"]').first();\n      if (!(await retry.isVisible())) {\n        errors.push(`${viewport.name}: ${unavailableState} cannot reach read-only loading recovery`);\n      } else {\n        await retry.click();\n        await page.waitForFunction(() => location.hash === '#loading');\n      }\n      const loadingBypass = await page.locator('.screen:visible a[href=\"#chooser\"], .screen:visible a[href=\"#connected\"], .screen:visible a[href=\"#action-review\"], .screen:visible a[href=\"#signature-pending\"], .screen:visible a[href=\"#signed\"], .screen:visible a[href=\"#submission-pending\"], .screen:visible a[href=\"#finalized\"]').count();\n      if (loadingBypass !== 0) errors.push(`${viewport.name}: loading recovery exposes ${loadingBypass} execution/finality bypass route(s)`);\n      const safeReturn = page.locator('.screen:visible a[href=\"#wallet-state-unavailable-handoff\"]').first();\n      if (!(await safeReturn.isVisible())) {\n        errors.push(`${viewport.name}: loading recovery has no safe caller return`);\n      } else {\n        await safeReturn.click();\n        await page.waitForFunction(() => location.hash === '#wallet-state-unavailable-handoff');\n      }\n      interactionResults.push({viewport: viewport.name, path: `${unavailableState.slice(1)}-read-only-recovery`, finalHash: await page.evaluate(() => location.hash)});\n    }\n\n    const accountSwitchPath =",
  'QA availability interaction paths',
);

await writeFile(qaPath, qa);
console.log('Materialized J21 Disconnect / Offline / Loading / Load-provider-error cluster and exact-head QA coverage.');
