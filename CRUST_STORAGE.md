# Crust Storage Integration

This feature allows users to upload files to IPFS via Crust Network and pin them on-chain for decentralized storage.

## Features

- **Wallet Authentication**: Connect with Polkadot.js, SubWallet, or Talisman
- **File Upload**: Upload files to IPFS using Crust gateway
- **On-chain Pinning**: Automatically pin files on Crust chain for guaranteed storage
- **File Management**: View all uploaded files with CIDs and transaction hashes
- **IPFS Gateway**: Direct links to view files via Crust IPFS gateway

## How to Use

1. Navigate to Settings > Crust Storage (IPFS)
2. Connect your Polkadot wallet
3. Click the upload area to select a file
4. File will be uploaded to IPFS and automatically pinned on Crust
5. View your files with their CIDs and pin status

## Technical Details

### Network
- Using **Crust Rocky Testnet** (`wss://rpc-rocky.crust.network`)
- Gateway: `https://gw.crustfiles.app`

### Storage Process
1. File is uploaded to IPFS via Crust's Web3Auth gateway
2. Returns a CID (Content Identifier)
3. Places a storage order on Crust chain via `market.placeStorageOrder` extrinsic
4. File is pinned and replicated across Crust storage nodes

### File Persistence
- Uploaded files are stored in browser localStorage
- CIDs and transaction hashes are preserved
- Files can be accessed via IPFS gateway at any time

## Supported Wallets

- **Polkadot.js** extension
- **SubWallet** extension
- **Talisman** extension
- **Nova Wallet** (mobile via WalletConnect)

## Future Enhancements

- [ ] Support for multiple networks (mainnet, testnet)
- [ ] File deletion/unpinning
- [ ] Storage duration management
- [ ] Cost estimation before upload
- [ ] Batch file uploads
- [ ] Folder support
- [ ] File sharing via links
- [ ] Encryption for private files

## Resources

- [Crust Network Docs](https://wiki.crust.network/)
- [Crust Storage 101](https://wiki.crust.network/docs/build/build-developer-guidance/crust-storage-101)
- [IPFS Documentation](https://docs.ipfs.tech/)
