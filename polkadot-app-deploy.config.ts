type PolkadotAppDeployConfig<T> = T;

const defineConfig = <T>(config: PolkadotAppDeployConfig<T>): PolkadotAppDeployConfig<T> => config;

export default defineConfig({
  domain: 'chopdot-shell-proof.dot',
  displayName: 'ChopDot',
  description: 'Split shared spending, collect payments, and keep one clear group record.',
  icon: {path: '../../public/assets/Logos/choptdot_whitebackground.png', format: 'png'},
  executables: [
    {
      kind: 'app',
      path: './dist',
      appVersion: [0, 2, 0],
    },
  ],
});
