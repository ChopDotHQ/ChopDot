import {accountIdFromBytes} from '@parity/product-sdk-address';
import type {PolkadotAssetPaymentReceipt, User} from '../types';

export interface PolkadotAssetConfig {
  network: 'paseo' | 'polkadot';
  assetId: string | null;
  symbol: string;
  decimals: number;
  ss58Prefix: number;
  metadataVerified: boolean;
  executionEnabled: boolean;
  verificationNote: string;
}

export const POLKADOT_USDC_CONFIG: PolkadotAssetConfig = {
  network: 'polkadot',
  assetId: '1337',
  symbol: 'USDC',
  decimals: 6,
  ss58Prefix: 0,
  metadataVerified: true,
  executionEnabled: false,
  verificationNote: 'Mainnet metadata is documented, but the current Product SDK polkadot preset is not available yet.',
};

export const PASEO_USDC_UNVERIFIED_CONFIG: PolkadotAssetConfig = {
  network: 'paseo',
  assetId: null,
  symbol: 'USDC',
  decimals: 6,
  ss58Prefix: 0,
  metadataVerified: false,
  executionEnabled: false,
  verificationNote: 'No verified USDC registration/asset id has been established for the current Paseo Asset Hub.',
};

export interface PolkadotAssetPaymentPlan {
  productId: string;
  senderPublicKeyHex: `0x${string}`;
  senderAccountId: string;
  recipientAccountId: string;
  amountBaseUnits: string;
  config: PolkadotAssetConfig & {assetId: string};
}

export interface PolkadotAssetTransferExecutor {
  execute(plan: PolkadotAssetPaymentPlan): Promise<PolkadotAssetPaymentReceipt>;
}

export function assetAmountToBaseUnits(amount: number | string, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30) throw new Error('Asset decimals are invalid.');
  const source = typeof amount === 'number' ? String(amount) : amount.trim();
  const pattern = new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`, 'u');
  if (!pattern.test(source)) throw new Error('Enter a valid asset amount.');
  const [whole, fraction = ''] = source.split('.');
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0'))).toString();
}

export function canExecutePolkadotAsset(config: PolkadotAssetConfig): boolean {
  return config.metadataVerified && config.executionEnabled && typeof config.assetId === 'string' && /^\d+$/u.test(config.assetId);
}

export function buildPolkadotAssetPaymentPlan({
  payer,
  receiver,
  amount,
  currency,
  config,
}: {
  payer: User;
  receiver: User;
  amount: number | string;
  currency: string;
  config: PolkadotAssetConfig;
}): PolkadotAssetPaymentPlan {
  if (!canExecutePolkadotAsset(config)) throw new Error(config.verificationNote || 'This asset is not enabled for execution.');
  if (!payer.hostIdentity) throw new Error('Connect Polkadot before paying this asset.');
  if (!receiver.hostIdentity) throw new Error(`${receiver.name} needs to connect Polkadot before receiving this asset.`);
  if (currency !== config.symbol) throw new Error(`This obligation is not denominated in ${config.symbol}.`);
  if (payer.hostIdentity.productId !== receiver.hostIdentity.productId) throw new Error('The two Polkadot identities use different ChopDot product accounts.');

  const senderPublicKey = publicKeyBytes(payer.hostIdentity.accountPublicKeyHex);
  const recipientPublicKey = publicKeyBytes(receiver.hostIdentity.accountPublicKeyHex);
  return {
    productId: payer.hostIdentity.productId,
    senderPublicKeyHex: payer.hostIdentity.accountPublicKeyHex,
    senderAccountId: accountIdFromBytes(senderPublicKey, config.ss58Prefix),
    recipientAccountId: accountIdFromBytes(recipientPublicKey, config.ss58Prefix),
    amountBaseUnits: assetAmountToBaseUnits(amount, config.decimals),
    config: {...config, assetId: config.assetId as string},
  };
}

export async function executePolkadotAssetPayment(
  plan: PolkadotAssetPaymentPlan,
  executor: PolkadotAssetTransferExecutor,
): Promise<PolkadotAssetPaymentReceipt> {
  if (!canExecutePolkadotAsset(plan.config)) throw new Error('This asset configuration is not enabled for execution.');
  const receipt = await executor.execute(plan);
  if (!assetReceiptMatchesPlan(receipt, plan)) throw new Error('The returned asset payment evidence does not match the requested settlement.');
  return receipt;
}

export function assetReceiptMatchesPlan(receipt: PolkadotAssetPaymentReceipt, plan: PolkadotAssetPaymentPlan): boolean {
  return receipt.network === plan.config.network
    && receipt.assetId === plan.config.assetId
    && receipt.symbol === plan.config.symbol
    && receipt.senderAccountId === plan.senderAccountId
    && receipt.recipientAccountId === plan.recipientAccountId
    && receipt.amountBaseUnits === plan.amountBaseUnits
    && /^0x[0-9a-f]+$/iu.test(receipt.txHash)
    && /^0x[0-9a-f]+$/iu.test(receipt.blockHash)
    && /^\d+$/u.test(receipt.blockNumber);
}

function publicKeyBytes(value: `0x${string}`): Uint8Array {
  const normalized = value.slice(2).toLowerCase();
  if (!/^[0-9a-f]{64}$/u.test(normalized)) throw new Error('The authenticated product public key is invalid.');
  return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], byte => Number.parseInt(byte, 16));
}
