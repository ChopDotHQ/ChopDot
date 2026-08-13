type PolkadotAppDeployConfig<T> = T;

const defineConfig = <T>(config: PolkadotAppDeployConfig<T>): PolkadotAppDeployConfig<T> => config;

export default defineConfig({
  domain: process.env.POLKADOT_APP_DEPLOY_DOMAIN ?? 'chopdot-shell-proof.dot',
  displayName: 'ChopDot',
  description: 'Split shared spending, collect payments, and keep one clear group record.',
  icon: {path: '../../public/assets/Logos/choptdot_whitebackground.png', format: 'png'},
  executables: [
    {
      kind: 'app',
      path: './dist',
      appVersion: [0, 5, 6],
    },
  ],
});
