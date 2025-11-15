
import { getSupabase } from '../../utils/supabase-client';
import type { CRDTPotDocument, CRDTCheckpoint } from './types';
import * as Automerge from '@automerge/automerge';
import { compressDocument, decompressDocument, getHeads } from './automergeUtils';

const CHECKPOINT_INTERVAL = parseInt(import.meta.env.VITE_CHECKPOINT_INTERVAL || '50', 10);

export class CheckpointManager {
  private potId: string;
  private lastCheckpointChangeCount = 0;

  constructor(potId: string) {
    this.potId = potId;
  }

  /**
   * Check if checkpoint is needed
   */
  shouldCheckpoint(doc: Automerge.Doc<CRDTPotDocument>): boolean {
    const history = Automerge.getHistory(doc);
    const currentChangeCount = history.length;
    const changesSinceCheckpoint = currentChangeCount - this.lastCheckpointChangeCount;
    
    return changesSinceCheckpoint >= CHECKPOINT_INTERVAL;
  }

  /**
   * Create and save checkpoint
   */
  async createCheckpoint(
    doc: Automerge.Doc<CRDTPotDocument>,
    userId: string
  ): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
      console.warn('[CheckpointManager] Supabase not configured');
      return;
    }

    try {
      const compressed = compressDocument(doc);
      const heads = getHeads(doc);
      const history = Automerge.getHistory(doc);
      const changeCount = history.length;

      console.log('[CheckpointManager] Creating checkpoint', {
        potId: this.potId,
        changeCount,
        compressedSize: compressed.length,
      });

      const { error } = await supabase.from('crdt_checkpoints').insert({
        pot_id: this.potId,
        document_data: compressed,
        heads: heads.map((head: string) => head.toString()),
        change_count: changeCount,
        created_by: userId,
      });

      if (error) {
        console.error('[CheckpointManager] Failed to save checkpoint:', error);
        throw error;
      }

      this.lastCheckpointChangeCount = changeCount;

      console.log('[CheckpointManager] Checkpoint saved successfully');
    } catch (error) {
      console.error('[CheckpointManager] Error creating checkpoint:', error);
      throw error;
    }
  }

  /**
   * Load latest checkpoint
   */
  async loadLatestCheckpoint(): Promise<Automerge.Doc<CRDTPotDocument> | null> {
    const supabase = getSupabase();
    if (!supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('crdt_checkpoints')
        .select('*')
        .eq('pot_id', this.potId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.log('[CheckpointManager] No checkpoint found');
        return null;
      }

      console.log('[CheckpointManager] Loading checkpoint', {
        checkpointId: data.id,
        changeCount: data.change_count,
      });

      const compressed = new Uint8Array(data.document_data);
      const doc = decompressDocument(compressed);

      this.lastCheckpointChangeCount = data.change_count;

      return doc;
    } catch (error) {
      console.error('[CheckpointManager] Error loading checkpoint:', error);
      return null;
    }
  }

  /**
   * Get checkpoint metadata
   */
  async getCheckpointMetadata(): Promise<CRDTCheckpoint | null> {
    const supabase = getSupabase();
    if (!supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('crdt_checkpoints')
        .select('id, pot_id, heads, change_count, created_at, created_by')
        .eq('pot_id', this.potId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        potId: data.pot_id,
        documentData: new Uint8Array(),
        heads: data.heads,
        changeCount: data.change_count,
        createdAt: data.created_at,
        createdBy: data.created_by,
      };
    } catch (error) {
      console.error('[CheckpointManager] Error getting checkpoint metadata:', error);
      return null;
    }
  }

  /**
   * Clean up old checkpoints (keep last 10)
   */
  async cleanupOldCheckpoints(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('crdt_checkpoints')
        .select('id, created_at')
        .eq('pot_id', this.potId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        return;
      }

      const toDelete = data.slice(10);
      if (toDelete.length === 0) {
        return;
      }

      const idsToDelete = toDelete.map(c => c.id);
      const { error: deleteError } = await supabase
        .from('crdt_checkpoints')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('[CheckpointManager] Failed to cleanup old checkpoints:', deleteError);
      } else {
        console.log('[CheckpointManager] Cleaned up', toDelete.length, 'old checkpoints');
      }
    } catch (error) {
      console.error('[CheckpointManager] Error cleaning up checkpoints:', error);
    }
  }
}
