interface ImportMetaEnv {
  readonly VITE_AUTO_GUEST_AUTH?: string;
  readonly VITE_E2E_GUEST_USER_ID?: string;
  readonly VITE_E2E_GUEST_USER_NAME?: string;
  readonly VITE_ENABLE_LUNOKIT?: string;
  readonly VITE_ENABLE_EMBEDDED_WALLET?: string;
  readonly VITE_ENABLE_POLKADOT_BALANCE_UI?: string;
  readonly VITE_ENABLE_LOGIN_PANEL_UI?: string;
  readonly VITE_ENABLE_PVM_CLOSEOUT?: string;
  readonly VITE_PVM_CLOSEOUT_CONTRACT_ADDRESS?: string;
  readonly VITE_PVM_CLOSEOUT_EXPLORER_BASE_URL?: string;
  readonly VITE_PVM_CLOSEOUT_CHAIN_ID?: string;
  readonly VITE_PVM_CLOSEOUT_CHAIN_NAME?: string;
  readonly VITE_PVM_CLOSEOUT_RPC_URL?: string;
  readonly VITE_PVM_CLOSEOUT_BLOCK_EXPLORER_URL?: string;
  readonly VITE_SIMULATE_PVM_CLOSEOUT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
