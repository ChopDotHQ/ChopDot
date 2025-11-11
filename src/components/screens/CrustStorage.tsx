import { useState, useEffect, useRef } from "react";
import { web3FromAddress } from "@polkadot/extension-dapp";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { Card } from "../ui/card";
import { Upload, Wallet, Copy, ExternalLink, CheckCircle, AlertCircle, Loader2, X, Settings } from "lucide-react";
import { triggerHaptic } from "../../utils/haptics";
import { uploadToIPFS } from "../../services/storage/ipfsWithOnboarding";
import { getIPFSGatewayUrl } from "../../services/storage/ipfs";
import { useAccount } from "../../contexts/AccountContext";
import QRCodeLib from 'qrcode';

interface UploadedFile {
  cid: string;
  name: string;
  size: number;
  timestamp: number;
  isPinned?: boolean;
  txHash?: string;
}

const CRUST_GATEWAY = "https://gw.crustfiles.app";
const CRUST_RPC = "wss://rpc-rocky.crust.network";

interface CrustStorageProps {
  onAuthSetup?: () => void;
}

export function CrustStorage({ onAuthSetup }: CrustStorageProps = {}) {
  const account = useAccount(); // Use AccountContext for wallet connection (supports extensions + WalletConnect)
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState("");
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [showWalletConnectQR, setShowWalletConnectQR] = useState(false);
  const [walletConnectQRCode, setWalletConnectQRCode] = useState<string | null>(null);
  const [walletConnectURI, setWalletConnectURI] = useState<string | null>(null);
  const walletConnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("crustUploadedFiles");
    if (stored) {
      try {
        setUploadedFiles(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load uploaded files", e);
      }
    }
  }, []);

  // Listen for WalletConnect connection completion
  useEffect(() => {
    if (!showWalletConnectQR || !walletConnectURI) {
      return;
    }

    // Check if connection completed
    if (account.status === 'connected' && account.address0) {
      console.log('[CrustStorage] ✅ WalletConnect connection detected! Address:', account.address0);
      
      // Clear timeout
      if (walletConnectTimeoutRef.current) {
        clearTimeout(walletConnectTimeoutRef.current);
        walletConnectTimeoutRef.current = null;
      }

      // Close QR modal
      setShowWalletConnectQR(false);
      setWalletConnectQRCode(null);
      setWalletConnectURI(null);
      setIsConnecting(false);
      
      triggerHaptic('success');
    }
  }, [account.status, account.address0, showWalletConnectQR, walletConnectURI]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (walletConnectTimeoutRef.current) {
        clearTimeout(walletConnectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (uploadedFiles.length > 0) {
      localStorage.setItem("crustUploadedFiles", JSON.stringify(uploadedFiles));
    }
  }, [uploadedFiles]);

  useEffect(() => {
    const connectToCrust = async () => {
      try {
        // Note: Crust type definitions are optional
        // If @crustio/type-definitions is installed, you can add typesBundle here
        // For now, using default Polkadot types which work fine for most operations
        const wsProvider = new WsProvider(CRUST_RPC);
        const api = await ApiPromise.create({ 
          provider: wsProvider,
          // typesBundle: typesBundleForPolkadot, // Optional: add if @crustio/type-definitions is installed
        });
        setApi(api);
      } catch (e) {
        console.error("Failed to connect to Crust chain", e);
      }
    };

    connectToCrust();

    return () => {
      if (api) {
        api.disconnect();
      }
    };
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError("");
    triggerHaptic("light");

    try {
      // Use AccountContext's connect method which supports both extensions and WalletConnect
      if (account.connectExtension) {
        await account.connectExtension();
      } else {
        throw new Error("Wallet connection not available. Please use the login screen to connect your wallet.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
      console.error("Wallet connection error:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    if (account.disconnect) {
      account.disconnect();
    }
    triggerHaptic("light");
  };

  const uploadFile = async (file: File) => {
    if (!account.address0) {
      setError("Please connect your wallet first");
      return;
    }

    setIsUploading(true);
    setError("");
    setUploadProgress("Uploading to IPFS...");
    triggerHaptic("medium");

    try {
      console.log("[CrustStorage] Starting IPFS upload for file:", file.name, file.size);
      
      // Upload file to IPFS via Crust gateway (with onboarding if needed)
      setUploadProgress("Uploading to IPFS via Crust gateway...");
      const cid = await uploadToIPFS(file, true, account.address0 || undefined);
      
      console.log("[CrustStorage] File uploaded to IPFS, CID:", cid);
      setUploadProgress(`Uploaded! CID: ${cid}`);

      const newFile: UploadedFile = {
        cid,
        name: file.name,
        size: file.size,
        timestamp: Date.now(),
        isPinned: false,
      };

      setUploadedFiles((prev) => [newFile, ...prev]);

      // Store file metadata in localStorage (not the file itself - it's on IPFS)
      const fileMetadata = {
        cid,
        name: file.name,
        size: file.size,
        timestamp: Date.now(),
        gatewayUrl: getIPFSGatewayUrl(cid, true),
      };
      localStorage.setItem(`ipfs_file_${cid}`, JSON.stringify(fileMetadata));

      // Automatically pin to Crust after upload
      setTimeout(() => {
        pinFileToCrust(cid, file.size);
      }, 1000);

      triggerHaptic("success");
    } catch (err: any) {
      console.error("[CrustStorage] Upload error:", err);
      setError(err.message || "Failed to upload file to IPFS");
      triggerHaptic("error");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const pinFileToCrust = async (cid: string, fileSize: number) => {
    if (!account.address0 || !api) {
      setError("Wallet or Crust chain not connected");
      return;
    }

    setUploadProgress(`Pinning ${cid} to Crust...`);

    try {
      // For WalletConnect, we need to use the chain service's signAndSendExtrinsic
      // For browser extensions, use web3FromAddress
      let signer: any;
      
      if (account.connector === 'walletconnect') {
        // WalletConnect signing is handled via chain service
        const chainService = await import('../../services/chain');
        if (!api.tx.market?.placeStorageOrder) {
          throw new Error('Market pallet not available');
        }
        const tx = api.tx.market.placeStorageOrder(cid, fileSize, 0, "");
        
        await chainService.chain.signAndSendExtrinsic({
          from: account.address0,
          buildTx: () => tx,
          onStatus: (status, ctx) => {
            if (status === 'inBlock' && ctx?.txHash) {
              setUploadProgress(`Pinned! Tx hash: ${ctx.txHash}`);
              setUploadedFiles((prev) =>
                prev.map((f) =>
                  f.cid === cid
                    ? { ...f, isPinned: true, txHash: ctx.txHash }
                    : f
                )
              );
              triggerHaptic("success");
              setTimeout(() => setUploadProgress(""), 3000);
            }
          },
          forceBrowserExtension: false, // Use WalletConnect
        });
        return;
      } else {
        // Browser extension
        const injector = await web3FromAddress(account.address0);
        signer = injector.signer;
      }

      if (!api.tx.market || !api.tx.market.placeStorageOrder) {
        throw new Error("Market pallet not found on this chain");
      }

      const tx = api.tx.market.placeStorageOrder(
        cid,
        fileSize,
        0,
        ""
      );

      const unsub = await tx.signAndSend(
        account.address0,
        { signer: signer as any },
        ({ status, txHash }) => {
          if (status.isInBlock) {
            setUploadProgress(`Pinned! Tx hash: ${txHash.toString()}`);
            
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.cid === cid
                  ? { ...f, isPinned: true, txHash: txHash.toString() }
                  : f
              )
            );

            unsub();
            triggerHaptic("success");
            setTimeout(() => setUploadProgress(""), 3000);
          }
        }
      );
    } catch (err: any) {
      setError(`Failed to pin file: ${err.message}`);
      console.error("Pin error:", err);
      triggerHaptic("error");
      setUploadProgress("");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      uploadFile(files[0]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerHaptic("light");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Crust Storage</h1>
          {onAuthSetup && (
            <button
              onClick={onAuthSetup}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Setup Authentication"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted">
          Upload files to IPFS and pin them on Crust Network for decentralized storage
        </p>
        {error && error.includes('403') && (
          <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Authentication Required</p>
              <p className="text-xs text-secondary mt-1">
                IPFS uploads require authentication. Click the settings icon above to generate a token.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Connection */}
      <Card className="p-4 mb-6">
        {!account.address0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Connect Wallet</p>
                <p className="text-sm text-muted">Connect to upload and manage files</p>
              </div>
            </div>
            <div className="space-y-2">
              <PrimaryButton
                onClick={connectWallet}
                disabled={isConnecting}
                fullWidth
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Browser Extension"
                )}
              </PrimaryButton>
              {account.connectWalletConnect && (
                <SecondaryButton
                  onClick={async () => {
                    try {
                      setIsConnecting(true);
                      setError("");
                      triggerHaptic("light");
                      
                      const uri = await account.connectWalletConnect();
                      
                      // Generate QR code
                      const qrCodeDataUrl = await QRCodeLib.toDataURL(uri, {
                        width: 300,
                        margin: 2,
                        color: {
                          dark: '#000000',
                          light: '#FFFFFF',
                        },
                      });
                      
                      setWalletConnectURI(uri);
                      setWalletConnectQRCode(qrCodeDataUrl);
                      setShowWalletConnectQR(true);
                      
                      // Set timeout (60 seconds)
                      walletConnectTimeoutRef.current = setTimeout(() => {
                        if (account.status !== 'connected') {
                          setShowWalletConnectQR(false);
                          setWalletConnectQRCode(null);
                          setWalletConnectURI(null);
                          setIsConnecting(false);
                          setError('Connection timed out. Please try again.');
                          triggerHaptic('error');
                        }
                      }, 60000);
                    } catch (err: any) {
                      console.error('[CrustStorage] WalletConnect connection failed:', err);
                      setError(err.message || "Failed to connect via WalletConnect");
                      setIsConnecting(false);
                      triggerHaptic('error');
                    }
                  }}
                  disabled={isConnecting}
                  fullWidth
                >
                  Connect via WalletConnect
                </SecondaryButton>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted">Connected as</p>
                <p className="font-medium truncate">{account.walletName || 'Connected Wallet'}</p>
                <p className="text-xs text-muted truncate">{formatAddress(account.address0!)}</p>
              </div>
              <button
                onClick={() => copyToClipboard(account.address0!)}
                className="p-2 hover:bg-accent/10 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <SecondaryButton onClick={disconnectWallet} fullWidth>
              Disconnect
            </SecondaryButton>
          </div>
        )}
      </Card>

      {/* Upload Section */}
      {account.address0 && (
        <Card className="p-4 mb-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-accent" />
              <h2 className="font-semibold">Upload File</h2>
            </div>

            <label className="block">
              <input
                type="file"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
                id="file-upload"
              />
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors">
                {isUploading ? (
                  <div className="space-y-2">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-accent" />
                    <p className="text-sm text-muted">{uploadProgress}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted" />
                    <p className="font-medium">Click to upload</p>
                    <p className="text-sm text-muted">
                      Files will be uploaded to IPFS and pinned on Crust
                    </p>
                  </div>
                )}
              </div>
            </label>

            {uploadProgress && !isUploading && (
              <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success" />
                <p className="text-sm">{uploadProgress}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-3 bg-danger/10 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">Your Files ({uploadedFiles.length})</h2>
          
          {uploadedFiles.map((file) => (
            <Card key={file.cid} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted">
                      {formatFileSize(file.size)} • {new Date(file.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  {file.isPinned && (
                    <div className="px-2 py-1 bg-success/10 rounded text-xs font-medium text-success">
                      Pinned
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted flex-shrink-0">CID:</p>
                    <p className="text-xs font-mono truncate flex-1">{file.cid}</p>
                    <button
                      onClick={() => copyToClipboard(file.cid)}
                      className="p-1 hover:bg-accent/10 rounded transition-colors flex-shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  {file.txHash && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted flex-shrink-0">Tx:</p>
                      <p className="text-xs font-mono truncate flex-1">{file.txHash}</p>
                      <button
                        onClick={() => copyToClipboard(file.txHash!)}
                        className="p-1 hover:bg-accent/10 rounded transition-colors flex-shrink-0"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <a
                    href={getIPFSGatewayUrl(file.cid, true)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <SecondaryButton fullWidth>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on IPFS
                    </SecondaryButton>
                  </a>
                  {!file.isPinned && account.address0 && (
                    <button
                      onClick={() => pinFileToCrust(file.cid, file.size)}
                      className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
                    >
                      Pin
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {uploadedFiles.length === 0 && account.address0 && (
        <div className="text-center py-12">
          <Upload className="w-12 h-12 mx-auto text-muted mb-3" />
          <p className="text-muted">No files uploaded yet</p>
          <p className="text-sm text-muted mt-1">Upload your first file to get started</p>
        </div>
      )}

      {/* WalletConnect QR Code Modal */}
      {showWalletConnectQR && walletConnectQRCode && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Connect via WalletConnect</h3>
              <button
                onClick={() => {
                  setShowWalletConnectQR(false);
                  setWalletConnectQRCode(null);
                  setWalletConnectURI(null);
                  setIsConnecting(false);
                  if (walletConnectTimeoutRef.current) {
                    clearTimeout(walletConnectTimeoutRef.current);
                    walletConnectTimeoutRef.current = null;
                  }
                  triggerHaptic('light');
                }}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white p-4 rounded-lg">
                  <img src={walletConnectQRCode} alt="WalletConnect QR Code" className="w-64 h-64" />
                </div>
                <p className="text-sm text-muted text-center">
                  {account.status === 'connecting' 
                    ? 'Scan this QR code with Nova Wallet, SubWallet mobile, or Talisman mobile'
                    : 'Waiting for connection...'}
                </p>
              </div>
              
              {account.status === 'connecting' && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Waiting for connection...</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
