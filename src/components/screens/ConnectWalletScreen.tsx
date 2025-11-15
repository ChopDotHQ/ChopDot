import { PrimaryButton } from '../PrimaryButton';
import { useAccount } from '../../contexts/AccountContext';
import { WalletConnectionSheet } from '../WalletConnectionSheet';
import { useState } from 'react';

export function ConnectWalletScreen({ onWalletConnected }: { onWalletConnected: () => void }) {
  const { connect } = useAccount();
  const [showWalletSheet, setShowWalletSheet] = useState(false);

  const handleConnectWallet = async () => {
    // The wallet connection logic is handled by the WalletConnectionSheet
    // and the AccountProvider. We just need to show the sheet.
    setShowWalletSheet(true);
  };

  // The AccountContext will change its state when a wallet is connected.
  // We can listen to that change to automatically proceed.
  // For now, we'll just have a "Skip for now" button.

  return (
    <div className="p-4 text-center">
      <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
      <p className="mb-6 text-gray-600">
        Connect your Polkadot wallet to participate in on-chain activities like settlements and governance.
      </p>
      
      <div className="space-y-4">
        <PrimaryButton onClick={handleConnectWallet}>
          Connect Wallet
        </PrimaryButton>
        <button 
          onClick={onWalletConnected} 
          className="text-gray-500 hover:text-gray-700"
        >
          Skip for now
        </button>
      </div>

      {showWalletSheet && (
        <WalletConnectionSheet
          isConnected={false}
          onClose={() => setShowWalletSheet(false)}
          onConnect={async (provider: string) => {
            await connect({ provider });
            setShowWalletSheet(false);
            onWalletConnected();
          }}
          onDisconnect={() => {}}
        />
      )}
    </div>
  );
}
