import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function packageName(lockPath, rootName) {
  if (!lockPath) return rootName;
  const marker = 'node_modules/';
  const index = lockPath.lastIndexOf(marker);
  return index < 0 ? lockPath : lockPath.slice(index + marker.length);
}

export async function createSupplyChainEvidence(root) {
  const lockBytes = await readFile(path.join(root, 'package-lock.json'));
  const lock = JSON.parse(lockBytes);
  const packages = Object.entries(lock.packages ?? {}).map(([lockPath, entry]) => ({
    lockPath: lockPath || '.',
    name: packageName(lockPath, lock.name),
    version: entry.version ?? null,
    integrity: entry.integrity ?? null,
    resolved: entry.resolved ?? null,
    dev: entry.dev === true,
    optional: entry.optional === true,
  })).sort((a, b) => a.lockPath.localeCompare(b.lockPath));
  const licenses = [];
  for (const [lockPath, entry] of Object.entries(lock.packages ?? {})) {
    let license = entry.license ?? (lockPath ? 'UNKNOWN' : 'UNLICENSED');
    let licenseFileSha256 = null;
    if (license === 'UNKNOWN') {
      try {
        const licenseBytes = await readFile(path.join(root, lockPath, 'LICENSE'));
        const text = licenseBytes.toString('utf8');
        licenseFileSha256 = sha256(licenseBytes);
        if (/Apache License\s+Version 2\.0/i.test(text)) license = 'Apache-2.0';
        else if (/Permission is hereby granted, free of charge/i.test(text)) license = 'MIT';
      } catch {}
    }
    licenses.push({
      lockPath: lockPath || '.',
      name: packageName(lockPath, lock.name),
      version: entry.version ?? null,
      license,
      licenseFileSha256,
    });
  }
  licenses.sort((a, b) => a.lockPath.localeCompare(b.lockPath));
  const packageLockSha256 = sha256(lockBytes);
  const sbomBytes = Buffer.from(`${JSON.stringify({
    schema: 'chopdot.npm-sbom.v1',
    packageLockVersion: lock.lockfileVersion,
    packageLockSha256,
    packages,
  }, null, 2)}\n`);
  const licenseBytes = Buffer.from(`${JSON.stringify({
    schema: 'chopdot.npm-license-inventory.v1',
    packageLockSha256,
    packages: licenses,
    unknownLicenseCount: licenses.filter((entry) => entry.license === 'UNKNOWN').length,
  }, null, 2)}\n`);
  return {
    packageLockSha256,
    packageCount: packages.length,
    unknownLicenseCount: licenses.filter((entry) => entry.license === 'UNKNOWN').length,
    sbom: {path: 'sbom.json', bytes: sbomBytes, sha256: sha256(sbomBytes)},
    licenses: {path: 'licenses.json', bytes: licenseBytes, sha256: sha256(licenseBytes)},
  };
}
