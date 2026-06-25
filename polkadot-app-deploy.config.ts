type PolkadotAppDeployConfig<T> = T;

const defineConfig = <T>(config: PolkadotAppDeployConfig<T>): PolkadotAppDeployConfig<T> => config;

export default defineConfig({
  domain: process.env.POLKADOT_APP_DEPLOY_DOMAIN ?? process.env.DOT_DEPLOY_DOMAIN ?? 'chopdotws01.dot',
  displayName: 'ChopDot',
  description: 'Group money coordination for expenses, savings circles, emergency pots, and community funds.',
  icon: { path: './public/assets/Logos/choptdot_whitebackground.png', format: 'png' },
  executables: [
    {
      kind: 'app',
      path: './dist-dot-host',
      appVersion: [0, 1, 0],
    },
  ],
});
