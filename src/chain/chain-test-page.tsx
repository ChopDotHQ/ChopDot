import { useEffect, useRef, useState } from 'react';
import { AddressDisplay } from '../components/AddressDisplay';
import Identicon from '@polkadot/react-identicon';
import { Copy, ExternalLink, Wallet, Send, CheckCircle, Clock, XCircle, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

const fmt = (n: string, decimals = 10) => {
  if (!n) return '0';
  const s = n.replace(/^0+(?=\d)/, '');
  if (s.length <= decimals) return `0.${'0'.repeat(decimals - s.length)}${s}`.replace(/\.?0+$/, '');
  const intPart = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, '');
  return frac ? `${intPart}.${frac}` : intPart;
};

export function ChainTestPage() {
  const [connectedWallet, setConnectedWallet] = useState<{ address: string; name?: string; provider?: string } | null>(null);
  const [selectedChain, setSelectedChain] = useState<'relay' | 'assethub'>('assethub'); // Default to Asset Hub
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('0.01');
  const [freeBalance, setFreeBalance] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'submitted' | 'inBlock' | 'finalized'>('idle');
  const [recent, setRecent] = useState<Array<{ hash: string; to: string; amount: string; status: 'submitted' | 'inBlock' | 'finalized' }>>([]);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);

  const debounceRef = useRef<number | null>(null);

  const [toValid, setToValid] = useState(false);
  const [toPrefix, setToPrefix] = useState<number | null>(null);
  const [amountValid, setAmountValid] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Auto-detect chain based on balance when wallet connects (only once)
  useEffect(() => {
    if (!connectedWallet) return;
    
    let cancelled = false;
    
    (async () => {
      try {
        const { polkadotChainService } = await import('../services/chain/polkadot');
        
        // Check both chains for balance
        polkadotChainService.setChain('relay');
        const relayBalance = await polkadotChainService.getFreeBalance(connectedWallet.address);
        
        if (cancelled) return;
        
        polkadotChainService.setChain('assethub');
        const assetHubBalance = await polkadotChainService.getFreeBalance(connectedWallet.address);
        
        if (cancelled) return;
        
        const relayBalanceNum = BigInt(relayBalance);
        const assetHubBalanceNum = BigInt(assetHubBalance);
        
        // Auto-select chain with highest balance, default to Asset Hub if both are 0
        if (assetHubBalanceNum > relayBalanceNum) {
          setSelectedChain('assethub');
          polkadotChainService.setChain('assethub');
          setFreeBalance(assetHubBalance);
        } else if (relayBalanceNum > 0n) {
          setSelectedChain('relay');
          polkadotChainService.setChain('relay');
          setFreeBalance(relayBalance);
        } else {
          // Both are 0, default to Asset Hub
          setSelectedChain('assethub');
          polkadotChainService.setChain('assethub');
          setFreeBalance('0');
        }
      } catch (e) {
        if (cancelled) return;
        console.error('[Auto-detect chain] Error:', e);
        // Default to Asset Hub on error
        setSelectedChain('assethub');
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [connectedWallet?.address]); // Only re-run if address changes

  // Update chain when selection changes
  useEffect(() => {
    (async () => {
      const { polkadotChainService } = await import('../services/chain/polkadot');
      polkadotChainService.setChain(selectedChain);
      // Reset balance when switching chains (but don't auto-fetch, let user click Check Balance)
      if (connectedWallet) {
        setFreeBalance(null);
        setEstimatedFee(null);
      }
    })();
  }, [selectedChain, connectedWallet]);

  useEffect(() => {
    (async () => {
      const { detectSs58Prefix, isValidSs58Any } = await import('../services/chain/address');
      setToValid(isValidSs58Any(to));
      setToPrefix(to ? detectSs58Prefix(to) : null);
    })();
  }, [to]);

  useEffect(() => {
    // Strict amount validation: prevent scientific notation, ensure it's a valid positive number
    const sanitized = amount.trim().replace(/[^0-9.]/g, ''); // Remove non-numeric except decimal
    if (sanitized !== amount && amount.length > 0) {
      // If sanitization changed the value, update it
      setAmount(sanitized);
      return;
    }
    
    // Prevent scientific notation (e, E, +, -)
    if (/[eE+\-]/.test(amount)) {
      setAmountValid(false);
      return;
    }
    
    const parsed = Number(amount);
    // Validate: must be finite, positive, and within reasonable bounds
    const MIN_AMOUNT = 0.0000000001; // 1 planck (minimum)
    const MAX_AMOUNT = 1000000; // 1M DOT (reasonable max)
    
    setAmountValid(
      Number.isFinite(parsed) && 
      parsed > 0 && 
      parsed >= MIN_AMOUNT && 
      parsed <= MAX_AMOUNT &&
      !isNaN(parsed)
    );
  }, [amount]);

  // Check if recipient is different from sender (memoized)
  const [isSelfSend, setIsSelfSend] = useState(false);
  
  useEffect(() => {
    if (!connectedWallet || !to || !toValid) {
      setIsSelfSend(false);
      return;
    }
    (async () => {
      try {
        const { normalizeToPolkadot } = await import('../services/chain/address');
        const normalizedTo = normalizeToPolkadot(to);
        const normalizedFrom = normalizeToPolkadot(connectedWallet.address);
        setIsSelfSend(normalizedTo === normalizedFrom);
      } catch {
        setIsSelfSend(false);
      }
    })();
  }, [connectedWallet, to, toValid]);
  
  const canSend = connectedWallet && toValid && amountValid && !busy && !isSelfSend;

  const [showExtensionSelector, setShowExtensionSelector] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [availableExtensions, setAvailableExtensions] = useState<Array<{ name: string; source: string; accounts: Array<{ address: string; name?: string; source?: string }> }>>([]);
  const [selectedExtension, setSelectedExtension] = useState<string | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<Array<{ address: string; name?: string; source?: string }>>([]);
  const [showNovaWalletConnect, setShowNovaWalletConnect] = useState(false);
  const [walletConnectUri, setWalletConnectUri] = useState<string | null>(null);
  const [walletConnectQrCode, setWalletConnectQrCode] = useState<string | null>(null);

  const handleConnectWallet = async () => {
    setError(null);
    setBusy(true);
    try {
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
      
      // Request permission (required by extension API)
      const extensions = await web3Enable('ChopDot');
      
      if (extensions.length === 0) {
        throw new Error('No wallet extension found. Install Nova Wallet, SubWallet, Talisman, Polkadot.js, or PolkaGate.');
      }
      
      const accounts = await web3Accounts();
      
      if (accounts.length === 0) {
        throw new Error('No accounts found in your wallet.');
      }
      
      // Group accounts by extension/source
      const accountsByExtension = new Map<string, Array<{ address: string; name?: string; source?: string }>>();
      
      
      accounts.forEach(acc => {
        const source = acc.meta.source || 'unknown';
        if (!accountsByExtension.has(source)) {
          accountsByExtension.set(source, []);
        }
        accountsByExtension.get(source)!.push({
          address: acc.address,
          name: acc.meta.name,
          source: acc.meta.source,
        });
      });
      
      // Convert to array format for UI with better wallet name mapping
      // Priority order: Nova (most popular), then SubWallet, Talisman, Polkadot.js, PolkaGate
      // Note: Nova Wallet might use different source identifiers, so we check multiple variations
      const walletNameMap: Record<string, string> = {
        'nova': 'Nova Wallet',
        'novawallet': 'Nova Wallet',
        'nova-wallet': 'Nova Wallet',
        'novawallet-extension': 'Nova Wallet',
        'subwallet-js': 'SubWallet',
        'subwallet': 'SubWallet',
        'talisman': 'Talisman',
        'polkadot-js': 'Polkadot.js',
        'polkadot{.js}': 'Polkadot.js',
        'polkagate': 'PolkaGate',
        'polkagate-extension': 'PolkaGate',
        'metamask': 'MetaMask',
      };
      
      // Priority order for wallet display (Nova first)
      const walletPriority: Record<string, number> = {
        'nova': 1,
        'novawallet': 1,
        'nova-wallet': 1,
        'novawallet-extension': 1,
        'subwallet-js': 2,
        'subwallet': 2,
        'talisman': 3,
        'polkadot-js': 4,
        'polkadot{.js}': 4,
        'polkagate': 5,
        'polkagate-extension': 5,
        'metamask': 6,
      };
      
      // Helper function to detect Nova Wallet by checking if source name contains "nova" (case-insensitive)
      const isNovaWallet = (source: string): boolean => {
        const lower = source.toLowerCase();
        return lower.includes('nova') && !lower.includes('novasnap');
      };
      
      // Override wallet name if it's Nova Wallet (more flexible detection)
      const getWalletName = (source: string): string => {
        const lower = source.toLowerCase();
        if (isNovaWallet(source)) {
          return 'Nova Wallet';
        }
        return walletNameMap[lower] || source.charAt(0).toUpperCase() + source.slice(1);
      };
      
      // Override priority if it's Nova Wallet
      const getWalletPriority = (source: string): number => {
        if (isNovaWallet(source)) {
          return 1; // Highest priority for Nova
        }
        return walletPriority[source.toLowerCase()] || 99;
      };
      
      const extensionList = Array.from(accountsByExtension.entries())
        .map(([source, accs]) => ({
          name: getWalletName(source),
          source,
          accounts: accs,
          priority: getWalletPriority(source),
        }))
        .sort((a, b) => a.priority - b.priority); // Sort by priority (Nova first)
      
      // Always show wallet selector to give user choice
      
      // Add Nova Wallet as a WalletConnect option (always available)
      const extensionListWithNova = [
        {
          name: 'Nova Wallet',
          source: 'nova-walletconnect',
          accounts: [],
          priority: 1, // Highest priority
          isWalletConnect: true,
        },
        ...extensionList,
      ].sort((a, b) => a.priority - b.priority);

      // Show extension selector
      setAvailableExtensions(extensionListWithNova as any);
      setShowExtensionSelector(true);
      setBusy(false);
    } catch (e: any) {
      const m = e?.message || '';
      if (/No wallet extension/.test(m)) setError('No wallet extension found. Install Nova Wallet, SubWallet, Talisman, Polkadot.js, or PolkaGate.');
      else if (/No accounts/.test(m)) setError('No accounts found in your wallet.');
      else setError(m || 'Failed to connect wallet');
      setBusy(false);
    }
  };

  const handleSelectExtension = async (source: string) => {
    // Check if this is Nova Wallet (WalletConnect)
    if (source === 'nova-walletconnect') {
      setShowExtensionSelector(false);
      await handleConnectNovaWallet();
      return;
    }

    const extension = availableExtensions.find(ext => ext.source === source);
    if (!extension) return;

    setSelectedExtension(source);
    setAvailableAccounts(extension.accounts);
    setShowExtensionSelector(false);

    // If only one account in this extension, connect directly
    if (extension.accounts.length === 1) {
      const account = extension.accounts[0];
      if (account) {
        handleSelectAccount(account);
      }
      return;
    }

    // Show account selector
    setShowAccountSelector(true);
  };

  const handleConnectNovaWallet = async () => {
    setBusy(true);
    setError(null);
    try {
      const { connectNovaWallet } = await import('../services/chain/walletconnect');
      const { uri, onConnect } = await connectNovaWallet();
      
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(uri, {
        errorCorrectionLevel: 'M',
        width: 300,
        margin: 2,
      });
      
      setWalletConnectUri(uri);
      setWalletConnectQrCode(qrCodeDataUrl);
      setShowNovaWalletConnect(true);
      
      // Wait for connection with timeout
      const connectionTimeout = setTimeout(() => {
        setError('Connection taking longer than expected. Please ensure Nova Wallet is open and try scanning again.');
      }, 60000);

      // Wait for connection
      const { address, accounts } = await onConnect;
      
      clearTimeout(connectionTimeout);
      
      // Normalize address
      const { normalizeToPolkadot } = await import('../services/chain/address');
      const normalized = normalizeToPolkadot(address);
      
      setConnectedWallet({
        address: normalized,
        name: 'Nova Wallet',
        provider: 'nova-walletconnect',
      });
      setFreeBalance(null);
      setShowNovaWalletConnect(false);
      setWalletConnectUri(null);
      setWalletConnectQrCode(null);
    } catch (e: any) {
      const m = e?.message || '';
      if (m.includes('User rejected') || m.includes('cancelled') || m.includes('rejected')) {
        setError('Connection cancelled by user. Please try again.');
      } else if (m.includes('timeout') || m.includes('expired')) {
        setError('Connection timeout. Please try scanning the QR code again.');
      } else {
        setError(m || 'Failed to connect Nova Wallet.');
      }
      setShowNovaWalletConnect(false);
      setWalletConnectUri(null);
      setWalletConnectQrCode(null);
    } finally {
      setBusy(false);
    }
  };

  const handleSelectAccount = async (account: { address: string; name?: string; source?: string }) => {
    try {
      const { normalizeToPolkadot } = await import('../services/chain/address');
      const normalized = normalizeToPolkadot(account.address);
      setConnectedWallet({ 
        address: normalized, 
        name: account.name, 
        provider: account.source || 'polkadot' 
      });
      setFreeBalance(null);
      setShowAccountSelector(false);
      setShowExtensionSelector(false);
      setAvailableAccounts([]); // Clear from memory
      setAvailableExtensions([]); // Clear from memory
      setSelectedExtension(null);
    } catch (e: any) {
      setError('Failed to select account');
    }
  };

  const handleDisconnectWallet = async () => {
    // Disconnect WalletConnect if connected
    if (connectedWallet?.provider === 'nova-walletconnect') {
      try {
        const { disconnectWalletConnect } = await import('../services/chain/walletconnect');
        await disconnectWalletConnect();
      } catch (e) {
        console.error('[Disconnect] Error disconnecting WalletConnect:', e);
      }
    }
    
    // Clear all wallet-related data from memory
    setConnectedWallet(null);
    setFreeBalance(null);
    setEstimatedFee(null);
    setAvailableAccounts([]);
    setAvailableExtensions([]);
    setShowAccountSelector(false);
    setShowExtensionSelector(false);
    setSelectedExtension(null);
    setTxHash(null);
    setTxStatus('idle');
    // Note: We never store addresses in localStorage/sessionStorage - all data is in-memory only
  };

  const handleCheckBalance = async () => {
    if (!connectedWallet) {
      setError('Please connect a wallet first');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { polkadotChainService } = await import('../services/chain/polkadot');
      const planck = await polkadotChainService.getFreeBalance(connectedWallet.address);
      setFreeBalance(planck);
    } catch (e: any) {
      console.error('[Balance Check] Error:', e);
      const errorMsg = e?.message || 'Failed to fetch balance';
      if (errorMsg.includes('account') || errorMsg.includes('not found')) {
        setError('Account not found on Polkadot mainnet. This might mean the account has never had any transactions on Polkadot.');
      } else if (errorMsg.includes('RPC') || errorMsg.includes('connection')) {
        setError('Failed to connect to Polkadot RPC. Please try again.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setBusy(false);
    }
  };

  // Update fee estimate when inputs valid or chain changes
  useEffect(() => {
    (async () => {
      try {
        setEstimatedFee(null);
        if (!connectedWallet || !toValid || !amountValid) return;
        const { polkadotChainService } = await import('../services/chain/polkadot');
        const { normalizeToPolkadot } = await import('../services/chain/address');
        const feePlanck = await polkadotChainService.estimateFee({ from: connectedWallet.address, to: normalizeToPolkadot(to), amountDot: Number(amount) });
        setEstimatedFee(feePlanck);
      } catch (_) {}
    })();
  }, [connectedWallet, to, amount, toValid, amountValid, selectedChain]);

  const handleSend = async () => {
    if (!connectedWallet) {
      setError('Please connect a wallet first');
      return;
    }
    if (debounceRef.current) return; // prevent double click
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current && window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }, 1500);

    setError(null);
    setTxHash(null);
    setTxStatus('idle');
    setBusy(true);
    
    // Set a timeout to detect if transaction is stuck
    const timeoutId = setTimeout(() => {
      if (txStatus === 'idle' && busy) {
        setError('Transaction seems stuck. Please check your wallet extension or try again.');
        setBusy(false);
      }
    }, 60000); // 60 second timeout
    
    try {
      const { polkadotChainService } = await import('../services/chain/polkadot');
      const { normalizeToPolkadot } = await import('../services/chain/address');
      
      // Security: Validate self-send
      const normalizedTo = normalizeToPolkadot(to);
      const normalizedFrom = normalizeToPolkadot(connectedWallet.address);
      if (normalizedTo === normalizedFrom) {
        throw new Error('Cannot send to your own address');
      }
      
      // Security: Validate amount is reasonable
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        throw new Error('Invalid amount');
      }
      
              // Security: Re-check balance immediately before sending (not cached)
              const currentBalance = await polkadotChainService.getFreeBalance(connectedWallet.address);
      setFreeBalance(currentBalance); // Update display
      
      // Show status immediately when starting
      setTxStatus('submitted'); // Will show "Signing transaction..." since no hash yet
      const valuePlanckStr = ((): string => {
        // reuse internal logic by sending and letting service convert; but for guard we approximate
        const config = polkadotChainService.getConfig();
        const decimals = config.dotDecimals;
        const s = amt.toString();
        const [i, f = ''] = s.split('.');
        const pad = (f + '0'.repeat(decimals)).slice(0, decimals);
        return `${i}${pad}`.replace(/^0+(?=\d)/, '') || '0';
      })();

      // Security: Use fresh balance check (not cached)
      const free = BigInt(currentBalance);
      // Use estimated fee if available, otherwise use conservative buffer
      const feeBuffer = estimatedFee ? BigInt(estimatedFee) : BigInt('2000000000'); // 0.2 DOT buffer
      const needed = BigInt(valuePlanckStr) + feeBuffer;
      if (free < needed) {
        throw new Error(`Insufficient balance. You have ${fmt(currentBalance)} DOT, but need ${fmt((needed).toString())} DOT (amount + fee)`);
      }

      // Show confirmation dialog before sending
      const confirmed = await new Promise<boolean>((resolve) => {
        setShowConfirmDialog(true);
        // Store resolve function to be called by dialog
        (window as any).__confirmTxResolve = resolve;
      });
      
      if (!confirmed) {
        setBusy(false);
        setTxStatus('idle');
        setShowConfirmDialog(false);
        return;
      }
      
      setShowConfirmDialog(false);
      
      // Try browser extension first for faster approval, but auto-fallback to WalletConnect if needed
      // The chain service will automatically check if browser extension has matching address
      // If not, it will fall back to WalletConnect (Nova Wallet)
      
      const res = await polkadotChainService.sendDot({ 
        from: connectedWallet.address, 
        to: normalizeToPolkadot(to), 
        amountDot: amt,
        forceBrowserExtension: false, // Don't force - let it auto-detect and fall back if needed
        onStatus: (s, ctx) => {
          clearTimeout(timeoutId); // Clear timeout on status update
          setTxStatus(s);
          if (ctx?.txHash) {
            const txHashValue = ctx.txHash; // Capture for type narrowing
            if (!txHash) {
              setTxHash(txHashValue);
            }
            // Update recent transactions
            setRecent((prev) => {
              const existing = prev.find(r => r.hash === txHashValue);
              if (existing) {
                return prev.map(r => r.hash === txHashValue ? { ...r, status: s } : r);
              }
              // Add new transaction
              return [{ hash: txHashValue, to, amount, status: s }, ...prev].slice(0, 5);
            });
          } else {
            // Update existing transaction status without hash
            setRecent((prev) => {
              if (prev.length === 0) return prev;
              const [head, ...rest] = prev;
              if (!head) return prev;
              return [{ ...head, status: s }, ...rest];
            });
          }
        } 
      });
      
      // Transaction resolved (in block)
      clearTimeout(timeoutId);
      setTxHash(res.txHash);
      setTxStatus('inBlock');
      setRecent((prev) => {
        // Update or add to recent
        const existing = prev.find(r => r.hash === res.txHash);
        if (existing) {
          return prev.map(r => r.hash === res.txHash ? { ...r, status: 'inBlock' as const } : r);
        }
        return [{ hash: res.txHash, to, amount, status: 'inBlock' as const }, ...prev].slice(0, 5);
      });
    } catch (e: any) {
      clearTimeout(timeoutId);
      const m = e?.message || '';
      if (/NO_WALLET/.test(m) || /No wallet extension/.test(m)) {
        // If connected via Nova Wallet, show different message
        if (connectedWallet?.provider === 'nova-walletconnect') {
          setError('Transaction failed. Please ensure Nova Wallet is connected and try again.');
        } else {
          setError('No wallet detected. Install SubWallet, Talisman, or Polkadot.js.');
        }
      } else if (/NO_ACCOUNT/.test(m) || /No.*account/.test(m)) {
        // Browser extension doesn't have matching address
        setError('Selected account not found in wallet extension. If using Nova Wallet, it will automatically use WalletConnect.');
        setTxStatus('idle');
      } else if (/User rejected/.test(m)) {
        setError('Transaction cancelled. If you approved in Nova Wallet but it still shows "Rejected", Nova Wallet may be rejecting because it shows "Polkadot Relay" while you selected Asset Hub. This is a WalletConnect limitation - the transaction will still go to Asset Hub. Try approving anyway or switch to Relay Chain.');
        setTxStatus('idle');
      } else if (/Insufficient balance/.test(m)) setError('Insufficient balance.');
      else if (/RPC connection failed/.test(m)) setError('RPC seems down. Try again later.');
      else {
        setError(m || 'Transaction failed');
        setTxStatus('idle');
      }
    } finally {
      setBusy(false);
    }
  };

  const subscanUrl = (hash: string) => {
    // Use current chain selection for Subscan link
    if (selectedChain === 'assethub') {
      return `https://assethub-polkadot.subscan.io/extrinsic/${hash}`;
    }
    return `https://polkadot.subscan.io/extrinsic/${hash}`;
  };

  return (
    <div className="min-h-screen p-6 flex flex-col gap-4" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <h1 className="text-xl font-semibold">Polkadot Chain Test</h1>
      <p className="text-sm opacity-70">Send a tiny amount of real DOT using balances.transferKeepAlive.</p>
      <p className="text-xs opacity-60">You can paste any SS58 address; we normalise to Polkadot (prefix 0).</p>

      {connectedWallet && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Network</label>
            <span className="text-xs opacity-60">Auto-detected</span>
          </div>
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-lg border font-medium transition-all flex-1 ${
                selectedChain === 'relay' 
                  ? 'bg-accent text-white border-accent' 
                  : 'bg-transparent border-border hover:bg-muted'
              }`}
              onClick={() => setSelectedChain('relay')}
              disabled={busy}
            >
              Relay Chain
            </button>
            <button
              className={`px-4 py-2 rounded-lg border font-medium transition-all flex-1 ${
                selectedChain === 'assethub' 
                  ? 'bg-accent text-white border-accent' 
                  : 'bg-transparent border-border hover:bg-muted'
              }`}
              onClick={() => setSelectedChain('assethub')}
              disabled={busy}
            >
              Asset Hub
            </button>
          </div>
          <p className="text-xs opacity-60">
            {selectedChain === 'relay' 
              ? 'Polkadot Relay Chain (native DOT)' 
              : 'Polkadot Asset Hub (parachain with DOT)'}
          </p>
        </div>
      )}

      {!connectedWallet ? (
        <div className="flex flex-col gap-3 p-4 rounded-xl border-2 border-dashed" style={{ borderColor: 'var(--muted)' }}>
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 opacity-60" />
            <div className="flex-1">
              <div className="text-sm font-medium">Wallet Connection</div>
              <p className="text-xs opacity-60 mt-1">Connect your Nova Wallet, SubWallet, Talisman, or Polkadot.js extension</p>
            </div>
          </div>
          <button
            className="px-4 py-2.5 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: 'var(--accent)', opacity: busy ? 0.6 : 1 }}
            onClick={handleConnectWallet}
            disabled={busy}
          >
            <Wallet className="w-4 h-4" />
            {busy ? 'Connecting…' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4 rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Identicon value={connectedWallet.address} size={32} theme="polkadot" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{connectedWallet.name || 'Connected Account'}</div>
                <AddressDisplay address={connectedWallet.address} className="text-xs" />
              </div>
            </div>
            <button
              className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted transition-colors"
              onClick={handleDisconnectWallet}
              disabled={busy}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium flex items-center gap-2">
          Recipient Address
          {toValid && to && <CheckCircle className="w-4 h-4 text-green-500" />}
        </label>
        <div className="relative group">
          <input
            className="w-full px-4 py-3 pr-12 rounded-lg border-2 bg-transparent font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            style={{ 
              borderColor: toValid && to ? '#10b981' : to && !toValid ? '#ef4444' : 'var(--border)',
              background: 'var(--card)'
            }}
            placeholder="Enter SS58 address (any prefix)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            onBlur={async () => {
              try {
                const { normalizeToPolkadot } = await import('../services/chain/address');
                if (to) setTo(normalizeToPolkadot(to));
              } catch (_) {}
            }}
          />
          {toValid && to && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          )}
        </div>
        {!toValid && to && (
          <div className="text-xs text-red-500 flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 dark:bg-red-900/20">
            <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Invalid SS58 address</span>
          </div>
        )}
        {toValid && to && toPrefix !== null && toPrefix !== 0 && (
          <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5 px-2 py-1 rounded bg-green-50 dark:bg-green-900/20">
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Address normalised to Polkadot format (SS58-0)</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium flex items-center gap-2">
          Amount
          {amountValid && amount && <CheckCircle className="w-4 h-4 text-green-500" />}
        </label>
        <div className="relative group">
          <input
            className="w-full px-4 py-3 pr-20 rounded-lg border-2 bg-transparent text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            style={{ 
              borderColor: amountValid && amount ? '#10b981' : amount && !amountValid ? '#ef4444' : 'var(--border)',
              background: 'var(--card)'
            }}
            placeholder="0.01"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              // Only allow numbers and decimal point
              const val = e.target.value.replace(/[^0-9.]/g, '');
              // Prevent multiple decimal points
              const parts = val.split('.');
              if (parts.length > 2) return;
              // Limit decimal places to 10 (DOT decimals)
              if (parts[1] && parts[1].length > 10) return;
              setAmount(val);
            }}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold opacity-70">DOT</div>
          {amountValid && amount && (
            <div className="absolute right-14 top-1/2 -translate-y-1/2 pointer-events-none">
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
          )}
        </div>
        {!amountValid && amount && (
          <div className="text-xs text-red-500 flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 dark:bg-red-900/20">
            <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {Number(amount) <= 0 ? 'Enter an amount greater than 0' :
               Number(amount) > 1000000 ? 'Amount too large (max 1,000,000 DOT)' :
               'Invalid amount format'}
            </span>
          </div>
        )}
        {isSelfSend && (
          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/20">
            <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Cannot send to your own address</span>
          </div>
        )}
      </div>

      {connectedWallet && (
        <div className="flex gap-3 mt-4">
          <button
            className="px-4 py-3 rounded-lg border-2 font-medium transition-all hover:opacity-80 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex-1"
            style={{ 
              background: 'var(--card)', 
              borderColor: 'var(--border)',
              color: 'var(--foreground)'
            }}
            onClick={handleCheckBalance}
            disabled={busy}
          >
            {busy ? 'Checking…' : 'Check Balance'}
          </button>
          <button
            className="px-6 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex-1 flex items-center justify-center gap-2 shadow-lg"
            style={{ 
              background: canSend ? 'var(--accent)' : 'var(--muted)',
              boxShadow: canSend ? '0 4px 14px 0 rgba(230, 0, 122, 0.3)' : 'none'
            }}
            onClick={handleSend}
            disabled={!canSend}
          >
            <Send className="w-4 h-4" />
            {busy ? 'Sending…' : 'Send DOT'}
          </button>
        </div>
      )}

      {freeBalance !== null && (
        <div className="p-4 rounded-xl border-2 shadow-sm" style={{ 
          background: 'var(--card)', 
          borderColor: freeBalance === '0' ? '#f59e0b' : 'var(--border)'
        }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium opacity-70 uppercase tracking-wide">Free Balance</div>
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
              {selectedChain === 'relay' ? 'Relay Chain' : 'Asset Hub'}
            </div>
          </div>
          <div className="text-2xl font-bold mb-1">{fmt(freeBalance)} <span className="text-base font-normal opacity-70">DOT</span></div>
          {freeBalance === '0' && (
            <div className="text-xs opacity-80 mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 text-base">⚠️</span>
                <div>
                  <div className="font-medium mb-1 text-amber-900 dark:text-amber-200">Zero balance on {selectedChain === 'relay' ? 'Relay Chain' : 'Asset Hub'}</div>
                  <div className="opacity-80 text-amber-800 dark:text-amber-300">
                    This account has 0 DOT on {selectedChain === 'relay' ? 'the Polkadot Relay Chain' : 'Polkadot Asset Hub'}. Try switching to the other chain if your funds are there. Each chain has separate balances.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {estimatedFee && amountValid && (
        <div className="p-4 rounded-xl border-2" style={{ 
          background: 'var(--muted)', 
          borderColor: 'var(--border)'
        }}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium opacity-70 uppercase tracking-wide">Amount</div>
              <div className="text-base font-semibold">{amount} <span className="text-sm font-normal opacity-70">DOT</span></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium opacity-70 uppercase tracking-wide">Estimated Fee</div>
              <div className="text-base font-semibold">{fmt(estimatedFee)} <span className="text-sm font-normal opacity-70">DOT</span></div>
            </div>
            <div className="border-t-2 pt-3 mt-2 flex items-center justify-between">
              <div className="text-sm font-bold uppercase tracking-wide">Total Cost</div>
              <div className="text-xl font-bold text-accent">{(Number(amount) + Number(fmt(estimatedFee))).toFixed(10).replace(/\.?0+$/, '')} <span className="text-base font-normal">DOT</span></div>
            </div>
          </div>
        </div>
      )}

      {(txHash || txStatus !== 'idle') && (
        <div className="p-4 rounded-lg border-2" style={{ background: 'var(--card)', borderColor: txStatus === 'finalized' ? '#10b981' : txStatus === 'inBlock' ? '#3b82f6' : txStatus === 'submitted' ? '#f59e0b' : '#6b7280' }}>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-1">
              {txStatus === 'finalized' && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
              {txStatus === 'inBlock' && <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />}
              {txStatus === 'submitted' && <Clock className="w-5 h-5 text-amber-500 animate-spin flex-shrink-0" />}
              {txStatus === 'idle' && busy && <Clock className="w-5 h-5 text-gray-500 animate-spin flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Transaction Status</div>
                <div className="text-xs opacity-70 mt-0.5">
                  {txStatus === 'submitted' ? 'Submitted to network - waiting for block inclusion' : 
                   txStatus === 'inBlock' ? 'Included in block - waiting for finality' : 
                   txStatus === 'finalized' ? 'Finalized - transaction is complete' : 
                   busy ? 'Signing transaction...' : '—'}
                </div>
                {txStatus === 'submitted' && (
                  <div className="text-xs opacity-60 mt-1">This usually takes 1-2 blocks (~12-24 seconds)</div>
                )}
              </div>
            </div>
            {txHash && (
              <a
                href={subscanUrl(txHash)}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg border hover:bg-muted transition-colors flex-shrink-0"
                title="View on Subscan"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          {txHash ? (
            <>
              <div className="text-xs font-mono break-all opacity-70 mb-2">{txHash}</div>
              <button
                onClick={() => navigator.clipboard.writeText(txHash)}
                className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy Hash
              </button>
            </>
          ) : busy && (
            <div className="text-xs opacity-60">Waiting for wallet signature...</div>
          )}
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium mb-3">Recent Transactions</h2>
          <div className="flex flex-col gap-2">
            {recent.map((r, idx) => (
              <div key={r.hash + idx} className="p-3 rounded-lg border flex items-center justify-between gap-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {r.status === 'finalized' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    {r.status === 'inBlock' && <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                    {r.status === 'submitted' && <Clock className="w-4 h-4 text-amber-500 animate-spin flex-shrink-0" />}
                    <a 
                      className="text-xs font-mono truncate hover:underline flex-1 min-w-0" 
                      href={subscanUrl(r.hash)} 
                      target="_blank" 
                      rel="noreferrer"
                    >
                      {r.hash.slice(0, 12)}...{r.hash.slice(-8)}
                    </a>
                  </div>
                  <div className="text-xs opacity-70 truncate">{r.amount} DOT → {r.to.slice(0, 10)}...{r.to.slice(-8)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    r.status === 'finalized' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                    r.status === 'inBlock' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                  }`}>
                    {r.status === 'submitted' ? 'Submitted' : r.status === 'inBlock' ? 'In Block' : 'Finalized'}
                  </span>
                  <button 
                    className="p-1.5 rounded border hover:bg-muted transition-colors" 
                    onClick={() => navigator.clipboard.writeText(r.hash)}
                    title="Copy hash"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg border-2 border-red-500/50 bg-red-50 dark:bg-red-900/20 flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-red-700 dark:text-red-400">Error</div>
            <div className="text-xs text-red-600 dark:text-red-300 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Transaction Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => {
          setShowConfirmDialog(false);
          if ((window as any).__confirmTxResolve) {
            (window as any).__confirmTxResolve(false);
            delete (window as any).__confirmTxResolve;
          }
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border-2 shadow-xl" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
            <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Confirm Transaction</h3>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm font-medium opacity-70">From:</span>
                <span className="text-sm font-mono font-semibold">{connectedWallet?.address.slice(0, 12)}...{connectedWallet?.address.slice(-10)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm font-medium opacity-70">To:</span>
                <span className="text-sm font-mono font-semibold">{to.slice(0, 12)}...{to.slice(-10)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm font-medium opacity-70">Amount:</span>
                <span className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{amount} DOT</span>
              </div>
              {estimatedFee && (
                <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-sm font-medium opacity-70">Fee:</span>
                  <span className="text-sm font-semibold">{fmt(estimatedFee)} DOT</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t-2" style={{ borderColor: 'var(--border)' }}>
                <span className="text-base font-bold">Total:</span>
                <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                  {(Number(amount) + Number(estimatedFee ? fmt(estimatedFee) : 0)).toFixed(10).replace(/\.?0+$/, '')} DOT
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-medium opacity-60">Network:</span>
                <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
                  {selectedChain === 'relay' ? 'Polkadot Relay Chain' : 'Polkadot Asset Hub'}
                </span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                className="px-6 py-3 rounded-lg border-2 font-semibold flex-1 hover:opacity-80 transition-opacity"
                style={{ 
                  borderColor: 'var(--border)', 
                  background: 'var(--card)',
                  color: 'var(--foreground)'
                }}
                onClick={() => {
                  setShowConfirmDialog(false);
                  if ((window as any).__confirmTxResolve) {
                    (window as any).__confirmTxResolve(false);
                    delete (window as any).__confirmTxResolve;
                  }
                }}
              >
                Cancel
              </button>
              <button
                className="px-6 py-3 rounded-lg font-bold flex-1 transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                style={{ 
                  background: 'var(--accent)', 
                  color: '#ffffff',
                  boxShadow: '0 4px 14px 0 rgba(230, 0, 122, 0.4)'
                }}
                onClick={() => {
                  setShowConfirmDialog(false);
                  if ((window as any).__confirmTxResolve) {
                    (window as any).__confirmTxResolve(true);
                    delete (window as any).__confirmTxResolve;
                  }
                }}
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extension Selector Modal */}
      {showExtensionSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => {
          setShowExtensionSelector(false);
          setAvailableExtensions([]);
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
            <h2 className="text-lg font-semibold mb-4">Select Wallet Extension</h2>
            <p className="text-sm opacity-70 mb-4">Choose which wallet extension to connect:</p>
            <div className="flex flex-col gap-2">
              {availableExtensions.map((extension, idx) => {
                // Check if this is Nova Wallet (WalletConnect)
                const isNova = extension.source === 'nova-walletconnect';
                const isWalletConnect = (extension as any).isWalletConnect;
                
                return (
                  <button
                    key={extension.source + idx}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isNova 
                        ? 'border-accent bg-accent/5 hover:bg-accent/10 shadow-sm' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleSelectExtension(extension.source)}
                  >
                    <div className="flex items-center gap-2">
                      {isWalletConnect ? (
                        <QrCode className="w-5 h-5 text-accent" />
                      ) : (
                        <Identicon value={extension.source} size={20} theme="polkadot" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{extension.name}</span>
                          {isNova && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-accent/20 text-accent font-medium">
                              Popular
                            </span>
                          )}
                          {isWalletConnect && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium">
                              Mobile
                            </span>
                          )}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {isWalletConnect 
                            ? 'Scan QR code with Nova Wallet app'
                            : `${extension.accounts.length} account${extension.accounts.length !== 1 ? 's' : ''} available`}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              className="mt-4 px-4 py-2 rounded-md border w-full"
              onClick={() => {
                setShowExtensionSelector(false);
                setAvailableExtensions([]);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Account Selector Modal */}
      {showAccountSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => {
          setShowAccountSelector(false);
          setAvailableAccounts([]);
          setSelectedExtension(null);
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
            <h2 className="text-lg font-semibold mb-4">Select Account</h2>
            <p className="text-sm opacity-70 mb-4">Choose which account to connect from {availableExtensions.find(e => e.source === selectedExtension)?.name || 'selected extension'}:</p>
            <div className="flex flex-col gap-2">
              {availableAccounts.map((account, idx) => (
                <button
                  key={account.address + idx}
                  className="p-3 rounded-md border text-left hover:bg-opacity-80 transition-colors"
                  onClick={() => handleSelectAccount(account)}
                >
                  <div className="font-medium">{account.name || 'Unnamed Account'}</div>
                  <div className="text-xs opacity-70 mt-1 font-mono">
                    {account.address.slice(0, 12)}...{account.address.slice(-10)}
                  </div>
                </button>
              ))}
            </div>
            <button
              className="mt-4 px-4 py-2 rounded-md border w-full"
              onClick={() => {
                setShowAccountSelector(false);
                setAvailableAccounts([]);
                setSelectedExtension(null);
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Nova Wallet Connect Modal (QR Code) */}
      {showNovaWalletConnect && walletConnectQrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => {
          setShowNovaWalletConnect(false);
          setWalletConnectUri(null);
          setWalletConnectQrCode(null);
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
            <h3 className="text-lg font-semibold mb-2">Connect Nova Wallet</h3>
            <p className="text-sm opacity-70 mb-4">Scan this QR code with your Nova Wallet app to connect</p>
            <p className="text-xs opacity-60 mb-4 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
              ⚠️ After scanning, check your browser console for pairing events. If nothing appears, Nova Wallet might not be connecting.
            </p>
            <p className="text-xs opacity-60 mb-4 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              ℹ️ <strong>Note:</strong> Nova Wallet may show "Polkadot Relay" in the connection prompt, but transactions will go to the chain you select above (Asset Hub or Relay Chain). This is a WalletConnect limitation.
            </p>
            
            <div className="flex justify-center mb-4 p-4 bg-white rounded-lg">
              <img src={walletConnectQrCode} alt="WalletConnect QR Code" className="w-64 h-64" />
            </div>
            
            {walletConnectUri && (
              <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono break-all opacity-70">
                <div className="font-semibold mb-1">URI (for debugging):</div>
                {walletConnectUri.substring(0, 80)}...
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <button
                className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
                onClick={() => {
                  if (walletConnectUri) {
                    navigator.clipboard.writeText(walletConnectUri);
                  }
                }}
              >
                Copy Connection Link
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
                onClick={() => {
                  setShowNovaWalletConnect(false);
                  setWalletConnectUri(null);
                  setWalletConnectQrCode(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChainTestPage;


