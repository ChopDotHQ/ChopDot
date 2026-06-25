import { captureLinkService } from './CaptureLinkService';
import { encodeCaptureUrl } from './QRPayloadCodec';

export type WalletPassProvisionInput = {
  potId: string;
  chapterId: string;
  spendCardId: string;
  payerId: string;
  label: string;
  spendSessionId?: string;
};

export type WalletPassProvisionResult = {
  token: string;
  spendUrl: string;
  walletPassExternalId?: string;
  mode: 'url_fallback' | 'apple_pkpass_pending';
  message: string;
};

export class WalletPassService {
  mintSpendLauncher(input: WalletPassProvisionInput): WalletPassProvisionResult {
    const sessionId = input.spendSessionId ?? `ws_${Date.now()}`;
    const token = captureLinkService.mintSpendToken({
      potId: input.potId,
      chapterId: input.chapterId,
      spendSessionId: sessionId,
      payerId: input.payerId,
      spendCardId: input.spendCardId,
    });

    const spendUrl = encodeCaptureUrl('spend', token);

    return {
      token,
      spendUrl,
      walletPassExternalId: input.spendCardId,
      mode: 'url_fallback',
      message: 'Launcher pass — not a bank card. Opens your group spend screen.',
    };
  }

  async requestRemotePass(input: WalletPassProvisionInput): Promise<WalletPassProvisionResult> {
    const local = this.mintSpendLauncher(input);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

    if (!supabaseUrl || !anonKey) {
      return local;
    }

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-wallet-pass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          label: input.label,
          spendUrl: local.spendUrl,
          spendCardId: input.spendCardId,
        }),
      });

      if (!response.ok) {
        return local;
      }

      const remote = (await response.json()) as Partial<WalletPassProvisionResult>;
      return {
        ...local,
        mode: remote.mode === 'apple_pkpass_pending' ? 'apple_pkpass_pending' : 'url_fallback',
        message: remote.message ?? local.message,
      };
    } catch {
      return local;
    }
  }
}

export const walletPassService = new WalletPassService();
