
import { uploadToIPFS } from '../storage/ipfsWithOnboarding';
import { getSupabase } from '../../utils/supabase-client';

export async function uploadReceipt(
  potId: string,
  expenseId: string,
  file: File,
  userId: string,
  walletAddress?: string
): Promise<string> {
  try {
    console.log('[ReceiptService] Uploading receipt', {
      potId,
      expenseId,
      filename: file.name,
      size: file.size,
    });

    const cid = await uploadToIPFS(file, true, walletAddress);

    console.log('[ReceiptService] Receipt uploaded to IPFS', { cid });

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('receipts').insert({
        pot_id: potId,
        expense_id: expenseId,
        cid,
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: userId,
      });

      if (error) {
        console.error('[ReceiptService] Failed to store receipt metadata:', error);
      }
    }

    return cid;
  } catch (error) {
    console.error('[ReceiptService] Failed to upload receipt:', error);
    throw error;
  }
}

export async function getReceiptCid(
  potId: string,
  expenseId: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('cid')
      .eq('pot_id', potId)
      .eq('expense_id', expenseId)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.cid;
  } catch (error) {
    console.error('[ReceiptService] Error getting receipt CID:', error);
    return null;
  }
}

export async function getReceiptMetadata(cid: string): Promise<{
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
} | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('filename, mime_type, size_bytes, uploaded_at')
      .eq('cid', cid)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      filename: data.filename,
      mimeType: data.mime_type,
      sizeBytes: data.size_bytes,
      uploadedAt: data.uploaded_at,
    };
  } catch (error) {
    console.error('[ReceiptService] Error getting receipt metadata:', error);
    return null;
  }
}

export async function listPotReceipts(potId: string): Promise<Array<{
  expenseId: string;
  cid: string;
  filename: string;
  uploadedAt: string;
}>> {
  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('expense_id, cid, filename, uploaded_at')
      .eq('pot_id', potId)
      .order('uploaded_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(row => ({
      expenseId: row.expense_id,
      cid: row.cid,
      filename: row.filename,
      uploadedAt: row.uploaded_at,
    }));
  } catch (error) {
    console.error('[ReceiptService] Error listing pot receipts:', error);
    return [];
  }
}
