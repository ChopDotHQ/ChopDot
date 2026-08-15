import type {NativePolkadotPaymentReceipt, User} from '../types';

export interface NativeAssetConfig {
  network: 'paseo' | 'polkadot';
  asset: 'PAS' | 'DOT';
  decimals: number;
  ss58Prefix: number;
}

export const PASEO_NATIVE_CONFIG: NativeAssetConfig = {
  network: 'paseo',
  asset: 'PAS',
  decimals: 10,
  ss58Prefix: 0,
};

export const POLKADOT_NATIVE_CONFIG: NativeAssetConfig = {
  network: 'polkadot',
  asset: 'DOT',
  decimals: 10,
  ss58Prefix: 0,
};

export interface NativePaymentPlan {
  productId: string;
  senderAccountId: string;
  recipientAccountId: string;
  amountBaseUnits: string;
  config: NativeAssetConfig;
}

export function nativeAmountToBaseUnits(amount: number | string, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30) throw new Error('Asset decimals are invalid.');
  const source = typeof amount === 'number' ? String(amount) : amount.trim();
  const pattern = new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`, 'u');
  if (!pattern.test(source)) throw new Error('Enter a valid native-asset amount.');
  const [whole, fraction = ''] = source.split('.');
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0'))).toString();
}

export function buildNativePaymentPlan({
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
  config: NativeAssetConfig;
}): NativePaymentPlan {
  if (!payer.hostIdentity) throw new Error('Connect Polkadot before paying with the native network.');
  if (!receiver.hostIdentity) throw new Error(`${receiver.name} needs to connect Polkadot before receiving a native payment.`);
  if (currency !== config.asset) throw new Error(`This obligation is not denominated in ${config.asset}.`);
  if (payer.hostIdentity.productId !== receiver.hostIdentity.productId) {
    throw new Error('The two Polkadot identities use different ChopDot product accounts.');
  }

  return {
    productId: payer.hostIdentity.productId,
    senderAccountId: payer.hostIdentity.accountId,
    recipientAccountId: receiver.hostIdentity.accountId,
    amountBaseUnits: nativeAmountToBaseUnits(amount, config.decimals),
    config,
  };
}

export async function executeNativePolkadotPayment(plan: NativePaymentPlan): Promise<NativePolkadotPaymentReceipt> {
  const [{SignerManager}, {getChainAPI}, {submitAndWatch}] = await Promise.all([
    import('@parity/product-sdk-signer'),
    import('@parity/product-sdk-chain-client'),
    import('@parity/product-sdk-tx'),
  ]);

  const manager = new SignerManager({
    ss58Prefix: plan.config.ss58Prefix,
    dappName: 'chopdot',
  });

  try {
    const connected = await manager.connect();
    if (!connected.ok) throw new Error(connected.error.message);

    const productResult = await manager.getProductAccount(plan.productId, 0);
    if (!productResult.ok) throw new Error(productResult.error.message);
    const productAccount = productResult.value;
    if (productAccount.address !== plan.senderAccountId) {
      throw new Error('The active Polkadot product account does not match the connected ChopDot identity.');
    }

    const chain = await getChainAPI(plan.config.network);
    const tx = chain.assetHub.tx.Balances.transfer_keep_alive({
      dest: {type: 'Id', value: plan.recipientAccountId},
      value: BigInt(plan.amountBaseUnits),
    });

    const result = await submitAndWatch(tx, productAccount.getSigner(), {waitFor: 'finalized'});
    if (!result.ok) throw new Error(result.error.message);
    if (!result.value.ok || result.value.dispatchError) {
      throw new Error(result.value.dispatchError ? String(result.value.dispatchError) : 'The native transfer failed.');
    }

    return {
      network: plan.config.network,
      asset: plan.config.asset,
      txHash: result.value.txHash,
      senderAccountId: plan.senderAccountId,
      recipientAccountId: plan.recipientAccountId,
      amountBaseUnits: plan.amountBaseUnits,
      blockHash: result.value.block.hash,
      blockNumber: String(result.value.block.number),
      finalizedAt: new Date().toISOString(),
    };
  } finally {
    manager.destroy();
  }
}

export function nativeReceiptMatchesPlan(receipt: NativePolkadotPaymentReceipt, plan: NativePaymentPlan): boolean {
  return receipt.network === plan.config.network
    && receipt.asset === plan.config.asset
    && receipt.senderAccountId === plan.senderAccountId
    && receipt.recipientAccountId === plan.recipientAccountId
    && receipt.amountBaseUnits === plan.amountBaseUnits
    && /^0x[0-9a-f]+$/iu.test(receipt.txHash)
    && /^0x[0-9a-f]+$/iu.test(receipt.blockHash)
    && /^\d+$/u.test(receipt.blockNumber);
}