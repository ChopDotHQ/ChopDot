type PolkadotAppDeployConfig<T> = T;

const defineConfig = <T>(config: PolkadotAppDeployConfig<T>): PolkadotAppDeployConfig<T> => config;
const releaseDomain = process.env.RELEASE_DOMAIN;

if (!releaseDomain || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.dot$/.test(releaseDomain)) {
  throw new Error('RELEASE_DOMAIN must be the exact lowercase .dot name being published.');
}

export default defineConfig({
  domain: releaseDomain,
  displayName: 'ChopDot',
  description: 'Split shared spending, collect payments, and keep one clear group record.',
  icon: {path: './dist-dot-host/chopdot-icon.png', format: 'png'},
  executables: [
    {
      kind: 'app',
      path: './dist-dot-host',
      appVersion: [0, 1, 0],
    },
  ],
});
