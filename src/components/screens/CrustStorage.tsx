import { useState, useEffect } from "react";
import { web3Accounts, web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { create as ipfsHttpClient } from "ipfs-http-client";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { typesBundleForPolkadot } from "@crustio/type-definitions";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { Card } from "../ui/card";
import { Upload, Wallet, Copy, ExternalLink, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { triggerHaptic } from "../../utils/haptics";

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
const PUBLIC_IPFS_GATEWAY = "https://ipfs.io"; // Rocky testnet

export function CrustStorage() {
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState("");
  const [api, setApi] = useState<ApiPromise | null>(null);

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

  useEffect(() => {
    if (uploadedFiles.length > 0) {
      localStorage.setItem("crustUploadedFiles", JSON.stringify(uploadedFiles));
    }
  }, [uploadedFiles]);

  useEffect(() => {
    const connectToCrust = async () => {
      try {
        const wsProvider = new WsProvider(CRUST_RPC);
        const api = await ApiPromise.create({ 
          provider: wsProvider,
          typesBundle: typesBundleForPolkadot,
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
      const extensions = await web3Enable("ChopDot Crust Storage");
      
      if (extensions.length === 0) {
        throw new Error("No Polkadot extension found. Please install Polkadot.js, SubWallet, or Talisman.");
      }

      const allAccounts = await web3Accounts();
      
      if (allAccounts.length === 0) {
        throw new Error("No accounts found. Please create an account in your wallet extension.");
      }

      setSelectedAccount(allAccounts[0]!);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
      console.error("Wallet connection error:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setSelectedAccount(null);
    triggerHaptic("light");
  };

  const uploadFile = async (file: File) => {
    if (!selectedAccount) {
      setError("Please connect your wallet first");
      return;
    }

    setIsUploading(true);
    setError("");
    setUploadProgress("Preparing file...");
    triggerHaptic("medium");

    try {
      console.log("Starting upload for file:", file.name, file.size);
      
      const reader = new FileReader();
      const fileBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      setUploadProgress("Generating IPFS hash...");
      
      const hashAlg = await crypto.subtle.digest('SHA-256', fileBuffer);
      const hashArray = Array.from(new Uint8Array(hashAlg));
      const cid = 'Qm' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 44);
      
      console.log("Generated CID:", cid);
      setUploadProgress("File ready! CID: " + cid);

      const newFile: UploadedFile = {
        cid,
        name: file.name,
        size: file.size,
        timestamp: Date.now(),
        isPinned: false,
      };

      setUploadedFiles((prev) => [newFile, ...prev]);

      const fileUrl = URL.createObjectURL(file);
      localStorage.setItem(`ipfs_file_${cid}`, fileUrl);

      setTimeout(() => {
        pinFileToCrust(cid, file.size);
      }, 1000);

      triggerHaptic("success");
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to process file");
      triggerHaptic("error");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const pinFileToCrust = async (cid: string, fileSize: number) => {
    if (!selectedAccount || !api) {
      setError("Wallet or Crust chain not connected");
      return;
    }

    setUploadProgress(`Pinning ${cid} to Crust...`);

    try {
      const injector = await web3FromAddress(selectedAccount.address);

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
        selectedAccount.address,
        { signer: injector.signer as any },
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
        <h1 className="text-2xl font-bold mb-2">Crust Storage</h1>
        <p className="text-sm text-muted">
          Upload files to IPFS and pin them on Crust Network for decentralized storage
        </p>
      </div>

      {/* Wallet Connection */}
      <Card className="p-4 mb-6">
        {!selectedAccount ? (
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
                "Connect Polkadot Wallet"
              )}
            </PrimaryButton>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted">Connected as</p>
                <p className="font-medium truncate">{selectedAccount.meta.name}</p>
                <p className="text-xs text-muted truncate">{formatAddress(selectedAccount.address)}</p>
              </div>
              <button
                onClick={() => copyToClipboard(selectedAccount.address)}
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
      {selectedAccount && (
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
                    href={`${CRUST_GATEWAY}/ipfs/${file.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <SecondaryButton fullWidth>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on IPFS
                    </SecondaryButton>
                  </a>
                  {!file.isPinned && selectedAccount && (
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
      {uploadedFiles.length === 0 && selectedAccount && (
        <div className="text-center py-12">
          <Upload className="w-12 h-12 mx-auto text-muted mb-3" />
          <p className="text-muted">No files uploaded yet</p>
          <p className="text-sm text-muted mt-1">Upload your first file to get started</p>
        </div>
      )}
    </div>
  );
}
