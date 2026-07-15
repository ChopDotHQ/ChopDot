#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const date = process.env.CHOPDOT_DOT_SMOKE_DATE || '2026-07-07';
const outDir = join(process.cwd(), 'artifacts', 'chopdot-dot-smoke', date, 'site');

mkdirSync(outDir, { recursive: true });

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ChopDot.dot Smoke</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #07080a;
        color: #f7f7fb;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at 70% 90%, rgba(230, 0, 126, 0.28), transparent 34rem),
          radial-gradient(circle at 12% 8%, rgba(34, 197, 94, 0.16), transparent 24rem),
          #07080a;
      }

      main {
        width: min(92vw, 430px);
        min-height: min(760px, 94vh);
        padding: 28px 24px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 34px;
        background: linear-gradient(180deg, rgba(18, 20, 25, 0.96), rgba(6, 8, 11, 0.98));
        box-shadow: 0 32px 90px rgba(0, 0, 0, 0.45);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        color: rgba(255, 255, 255, 0.72);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .mark {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: #ec008c;
        color: white;
        font-weight: 900;
      }

      h1 {
        margin: 68px 0 10px;
        font-size: clamp(42px, 12vw, 62px);
        line-height: 0.94;
        letter-spacing: 0;
      }

      p {
        margin: 0;
        color: rgba(247, 247, 251, 0.68);
        font-size: 17px;
        line-height: 1.45;
      }

      .panel {
        margin-top: 36px;
        padding: 18px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.045);
      }

      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .row:last-child {
        border-bottom: 0;
      }

      .label {
        color: rgba(247, 247, 251, 0.58);
        font-size: 13px;
      }

      .value {
        text-align: right;
        font-weight: 750;
      }

      .cta {
        margin-top: 42px;
        width: 100%;
        min-height: 56px;
        border: 0;
        border-radius: 999px;
        background: #ec008c;
        color: white;
        font-size: 17px;
        font-weight: 800;
      }

      footer {
        margin-top: 32px;
        color: rgba(247, 247, 251, 0.42);
        font-size: 12px;
        line-height: 1.4;
      }
    </style>
  </head>
  <body>
    <main>
      <section>
        <div class="brand"><span class="mark">C</span> ChopDot</div>
        <h1>Friday Crew is ready.</h1>
        <p>A tiny static proof page for the current .dot hosting path. The real app stays focused on group money, not infrastructure.</p>
        <div class="panel" aria-label="Smoke status">
          <div class="row">
            <span class="label">Journey</span>
            <span class="value">Dinner split</span>
          </div>
          <div class="row">
            <span class="label">Next action</span>
            <span class="value">Open pot</span>
          </div>
          <div class="row">
            <span class="label">Record</span>
            <span class="value">Readable</span>
          </div>
        </div>
        <button class="cta" type="button">View Friday Crew</button>
      </section>
      <footer>
        Smoke artifact only. It proves static delivery readiness, not live payment, storage, identity, or shared-state readiness.
      </footer>
    </main>
  </body>
</html>
`;

const manifest = {
  kind: 'chopdot-dot-smoke',
  date,
  purpose: 'Static .dot hosting preflight artifact for Parity polkadot-app-deploy checks.',
  boundaries: [
    'Does not prove full Polkadot host-native app state.',
    'Does not prove Statement Store, Bulletin receipt archive, Product Account signing, Asset Hub payment, or .dot listing readiness.',
    'Does not replace the normal ChopDot product journey.'
  ],
  outputDir: outDir
};

writeFileSync(join(outDir, 'index.html'), html);
writeFileSync(join(outDir, 'smoke-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Built ChopDot.dot smoke site: ${outDir}`);
