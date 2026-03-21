import { ArrowLeft, CheckCircle, ChevronRight, QrCode, Wallet, X } from 'lucide-react';
import { BottomSheet } from '../BottomSheet';
import { walletConnectLinks } from '../../config/wallet-connect-links';

type ExtensionOption = {
  name: string;
  source: string;
};

type ExtensionAccountOption = {
  address: string;
  name?: string;
  source?: string;
};

interface ConnectWalletSheetProps {
  isOpen: boolean;
  isMobile: boolean;
  connecting: boolean;
  availableExtensions: ExtensionOption[];
  availableExtensionAccounts: ExtensionAccountOption[];
  selectedExtensionName?: string | null;
  showWalletConnect: boolean;
  walletConnectQRCode: string | null;
  walletConnectUri: string | null;
  accountStatus: string;
  accountError?: string | null;
  onClose: () => void;
  onConnectExtension: (source: string) => Promise<void>;
  onConnectExtensionAccount: (address: string) => Promise<void>;
  onConnectWalletConnect: () => Promise<void>;
  onBackFromExtensionAccounts: () => void;
  onBackFromWalletConnect: () => void;
  onOpenWalletConnectMobileWallet: (walletId: string, uri?: string) => Promise<void>;
}

export function ConnectWalletSheet({
  isOpen,
  isMobile,
  connecting,
  availableExtensions,
  availableExtensionAccounts,
  selectedExtensionName,
  showWalletConnect,
  walletConnectQRCode,
  walletConnectUri,
  accountStatus,
  accountError,
  onClose,
  onConnectExtension,
  onConnectExtensionAccount,
  onConnectWalletConnect,
  onBackFromExtensionAccounts,
  onBackFromWalletConnect,
  onOpenWalletConnectMobileWallet,
}: ConnectWalletSheetProps) {
  const isConnected = accountStatus === 'connected';

  const walletButtonClassName =
    'w-full rounded-2xl border border-border bg-background px-4 py-4 text-left transition-all duration-150 hover:bg-muted/40 active:scale-[0.99]';
  const iconWrapClassName = 'rounded-2xl bg-muted/60 p-3';

  if (availableExtensionAccounts.length > 0) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Choose account" maxWidth="520px">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBackFromExtensionAccounts}
              className="inline-flex items-center gap-2 text-sm font-medium text-secondary transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 text-sm font-medium text-secondary transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Select an account</h3>
            <p className="text-sm text-secondary">
              {selectedExtensionName
                ? `Choose which ${selectedExtensionName} account to connect.`
                : 'Choose which account to connect.'}
            </p>
          </div>

          <div className="space-y-3">
            {availableExtensionAccounts.map((accountOption) => (
              <button
                key={accountOption.address}
                type="button"
                onClick={() => void onConnectExtensionAccount(accountOption.address)}
                className={walletButtonClassName}
                disabled={connecting}
              >
                <div className="flex items-center gap-3">
                  <div className={iconWrapClassName}>
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-medium truncate">
                      {accountOption.name || 'Unnamed account'}
                    </div>
                    <p className="mt-1 font-mono text-sm text-secondary">
                      {accountOption.address.slice(0, 12)}...{accountOption.address.slice(-10)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-secondary" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>
    );
  }

  if (showWalletConnect) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="WalletConnect" maxWidth="520px">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBackFromWalletConnect}
              className="inline-flex items-center gap-2 text-sm font-medium text-secondary transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 text-sm font-medium text-secondary transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          <div className="card rounded-2xl p-5">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Connect with your mobile wallet</h3>
              <p className="text-sm text-secondary">
                {isMobile
                  ? 'Choose your wallet and approve the WalletConnect request.'
                  : 'Scan the QR code with Nova, SubWallet, Talisman, or another WalletConnect wallet.'}
              </p>
            </div>

            {accountError && (
              <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {accountError}
              </div>
            )}

            {isMobile ? (
              <div className="mt-4 space-y-2">
                {walletConnectLinks
                  .filter((link) => ['nova', 'subwallet', 'talisman'].includes(link.id))
                  .map((link) => (
                    <button
                      key={link.id}
                      type="button"
                      onClick={() => void onOpenWalletConnectMobileWallet(link.id, walletConnectUri || undefined)}
                      className={walletButtonClassName}
                    >
                      <div className="flex items-center gap-3">
                        <img src={link.icon} alt={link.label} className="h-10 w-10 rounded-xl object-contain" />
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-medium">{link.label}</div>
                          {link.description && (
                            <p className="mt-1 text-sm text-secondary">{link.description}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-secondary" />
                      </div>
                    </button>
                  ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-border bg-white p-4">
                {walletConnectQRCode ? (
                  <img
                    src={walletConnectQRCode}
                    alt="WalletConnect QR Code"
                    className="mx-auto h-56 w-56 sm:h-64 sm:w-64"
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center text-sm text-secondary sm:h-64">
                    Preparing QR code...
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 rounded-2xl bg-muted/40 p-3 text-sm text-secondary">
              {accountStatus === 'connecting'
                ? 'Waiting for approval in your wallet.'
                : isConnected
                ? 'Connected successfully. This sheet will close automatically.'
                : 'If your wallet does not open automatically, retry from the previous step.'}
            </div>

            {isConnected && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle className="h-4 w-4" />
                Connected
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    );
  }

  return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Connect wallet" maxWidth="520px">
      <div className="mx-auto w-full max-w-md space-y-4">
        <p className="text-sm text-secondary">
          Choose your wallet to start settlement and closeout.
        </p>

        <div className="space-y-3">
          {availableExtensions.length > 0 ? (
            <section className="space-y-2">
              <div className="px-1 text-xs font-medium uppercase tracking-[0.14em] text-secondary">
                Browser wallets
              </div>
              {availableExtensions.map((extensionOption) => (
                <button
                  key={extensionOption.source}
                  type="button"
                  onClick={() => void onConnectExtension(extensionOption.source)}
                  className={walletButtonClassName}
                  disabled={connecting}
                >
                  <div className="flex items-center gap-3">
                    <div className={iconWrapClassName}>
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-medium">{extensionOption.name}</div>
                      <p className="mt-1 text-sm text-secondary">
                        Connect this extension for Asset Hub settlement.
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-secondary" />
                  </div>
                </button>
              ))}
            </section>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-secondary">
              No supported browser wallet detected. Install Talisman, SubWallet, or Polkadot.js, or use WalletConnect.
            </div>
          )}

          <section className="space-y-2">
            <div className="px-1 text-xs font-medium uppercase tracking-[0.14em] text-secondary">
              Mobile wallets
            </div>
            <button
              type="button"
              onClick={() => void onConnectWalletConnect()}
              className={walletButtonClassName}
              disabled={connecting}
            >
              <div className="flex items-center gap-3">
                <div className={iconWrapClassName}>
                  <QrCode className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-medium">WalletConnect</div>
                  <p className="mt-1 text-sm text-secondary">
                    Connect with Nova, SubWallet, Talisman, or another WalletConnect wallet.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-secondary" />
              </div>
            </button>
          </section>
        </div>
      </div>
    </BottomSheet>
  );
}
