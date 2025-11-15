interface ImportMetaEnv {
  readonly VITE_ENABLE_LUNOKIT?: string;
  readonly VITE_ENABLE_EMBEDDED_WALLET?: string;
  readonly VITE_ENABLE_POLKADOT_BALANCE_UI?: string;
  readonly VITE_ENABLE_LOGIN_PANEL_UI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
