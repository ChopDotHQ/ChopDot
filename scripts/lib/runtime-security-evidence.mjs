import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import * as esbuild from 'esbuild';

const SUSPECT_PACKAGES = ['deepmerge-ts', 'write-package', '@polkadot-api/cli'];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
export async function createRuntimeSecurityEvidence(root) {
  const [lockBytes, packageBytes] = await Promise.all([
    readFile(path.join(root, 'package-lock.json')),
    readFile(path.join(root, 'package.json')),
  ]);
  const lock = JSON.parse(lockBytes);
  const installedDeepmerge = lock.packages?.['node_modules/deepmerge-ts']?.version;
  const installedWritePackage = lock.packages?.['node_modules/write-package']?.version;
  const installedCli = lock.packages?.['node_modules/@polkadot-api/cli']?.version;
  if (installedDeepmerge !== '7.1.5' || installedWritePackage !== '7.2.0' || installedCli !== '0.21.7') {
    throw new Error('Runtime vulnerability disposition must be reviewed again after dependency graph changes.');
  }
  const bundle = await esbuild.build({
    absWorkingDir: root,
    entryPoints: ['src/main.tsx'],
    bundle: true,
    write: false,
    metafile: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    external: ['*.css'],
    logLevel: 'silent',
  });
  const inputs = Object.keys(bundle.metafile.inputs).sort();
  const suspectInputs = inputs.filter(input => SUSPECT_PACKAGES.some(name => input.includes(`/node_modules/${name}/`)));
  if (suspectInputs.length) throw new Error(`Vulnerable developer-only dependency entered the browser graph: ${suspectInputs.join(', ')}`);
  const packageJson = JSON.parse(packageBytes);
  const releaseCommands = Object.entries(packageJson.scripts ?? {})
    .filter(([name]) => /build|deploy|release|verify|security|contract/u.test(name))
    .map(([name, command]) => ({name, command}));
  if (releaseCommands.some(({command}) => /(?:^|\s)papi\s+generate(?:\s|$)/u.test(command))) {
    throw new Error('PAPI generation is forbidden in the release pipeline while GHSA-ggr8-5vv4-36mx remains open upstream.');
  }
  return {
    schema: 'chopdot.runtime-security-boundary.v1',
    advisory: {
      id: 1145093,
      ghsa: 'GHSA-ggr8-5vv4-36mx',
      package: 'deepmerge-ts',
      vulnerableRange: '<8.0.0',
      installedVersion: installedDeepmerge,
      issue: 'stack exhaustion on attacker-controlled recursive object graphs',
    },
    dependencyPath: [
      `polkadot-api@${lock.packages?.['node_modules/polkadot-api']?.version}`,
      `@polkadot-api/cli@${installedCli}`,
      `write-package@${installedWritePackage}`,
      `deepmerge-ts@${installedDeepmerge}`,
    ],
    runtimeReachability: {
      entry: 'src/main.tsx',
      esbuildInputCount: inputs.length,
      suspectPackages: SUSPECT_PACKAGES,
      suspectInputCount: suspectInputs.length,
      suspectInputs,
      inputManifestSha256: sha256(inputs.map(input => `${input}\n`).join('')),
    },
    releasePipeline: {
      papiGenerateForbidden: true,
      reviewedCommands: releaseCommands.map(({name}) => name).sort(),
    },
    disposition: {
      status: 'accepted-for-public-testnet-only',
      rationale: 'The affected package path is developer CLI code and is absent from the complete browser import graph; no recursive package object is processed by the shipped application.',
      mainnetAllowed: false,
      followUp: 'Monitor upstream polkadot-api CLI/write-package remediation and rerun this gate after every lockfile change.',
    },
    packageLockSha256: sha256(lockBytes),
    packageJsonSha256: sha256(packageBytes),
  };
}
