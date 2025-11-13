
import { getSupabase } from '../../utils/supabase-client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { CRDTChangeEvent } from './types';
import * as Automerge from '@automerge/automerge';
import type { CRDTPotDocument } from './types';

export type ChangeHandler = (change: CRDTChangeEvent) => void;

export class PotRealtimeSync {
  private potId: string;
  private channel: RealtimeChannel | null = null;
  private changeHandlers: Set<ChangeHandler> = new Set();
  private isConnected = false;

  constructor(potId: string) {
    this.potId = potId;
  }

  /**
   * Start listening for realtime changes
   */
  async start(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
      console.warn('[PotRealtimeSync] Supabase not configured, sync disabled');
      return;
    }

    const channelName = `pot:${this.potId}`;
    this.channel = supabase.channel(channelName);

    this.channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crdt_changes',
          filter: `pot_id=eq.${this.potId}`,
        },
        (payload) => {
          console.log('[PotRealtimeSync] Received change', payload);
          this.handleIncomingChange(payload.new as any);
        }
      )
      .subscribe((status) => {
        console.log('[PotRealtimeSync] Subscription status:', status);
        this.isConnected = status === 'SUBSCRIBED';
      });
  }

  /**
   * Stop listening for changes
   */
  async stop(): Promise<void> {
    if (this.channel) {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.removeChannel(this.channel);
      }
      this.channel = null;
      this.isConnected = false;
    }
  }

  /**
   * Broadcast a change to other clients
   */
  async broadcastChange(
    doc: Automerge.Doc<CRDTPotDocument>,
    change: Uint8Array,
    userId: string
  ): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
      console.warn('[PotRealtimeSync] Supabase not configured');
      return;
    }

    try {
      const hash = this.hashChange(change);
      const actor = this.getActor(doc);
      const seq = this.getSequenceNumber(doc);

      const { error } = await supabase.from('crdt_changes').insert({
        pot_id: this.potId,
        change_data: change,
        hash,
        actor,
        seq,
        user_id: userId,
      });

      if (error) {
        console.error('[PotRealtimeSync] Failed to broadcast change:', error);
        throw error;
      }

      console.log('[PotRealtimeSync] Broadcasted change', { hash, actor, seq });
    } catch (error) {
      console.error('[PotRealtimeSync] Error broadcasting change:', error);
      throw error;
    }
  }

  /**
   * Register a change handler
   */
  onChange(handler: ChangeHandler): () => void {
    this.changeHandlers.add(handler);
    return () => this.changeHandlers.delete(handler);
  }

  /**
   * Get connection status
   */
  isOnline(): boolean {
    return this.isConnected;
  }

  /**
   * Handle incoming change from realtime
   */
  private handleIncomingChange(data: any): void {
    try {
      const changeEvent: CRDTChangeEvent = {
        potId: data.pot_id,
        changeData: new Uint8Array(data.change_data),
        hash: data.hash,
        actor: data.actor,
        seq: data.seq,
        userId: data.user_id,
        createdAt: data.created_at,
      };

      this.changeHandlers.forEach(handler => {
        try {
          handler(changeEvent);
        } catch (error) {
          console.error('[PotRealtimeSync] Error in change handler:', error);
        }
      });
    } catch (error) {
      console.error('[PotRealtimeSync] Error handling incoming change:', error);
    }
  }

  /**
   * Hash a change for deduplication
   */
  private hashChange(change: Uint8Array): string {
    let hash = 0;
    for (let i = 0; i < change.length; i++) {
      const byte = change[i];
      if (byte !== undefined) {
        hash = ((hash << 5) - hash) + byte;
        hash = hash & hash;
      }
    }
    return hash.toString(16);
  }

  /**
   * Get actor ID from document
   */
  private getActor(_doc: Automerge.Doc<CRDTPotDocument>): string {
    return 'actor-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get sequence number for this actor
   */
  private getSequenceNumber(doc: Automerge.Doc<CRDTPotDocument>): number {
    const history = Automerge.getHistory(doc);
    return history.length;
  }
}

export async function fetchRecentChanges(
  potId: string,
  sinceTimestamp?: string
): Promise<CRDTChangeEvent[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  try {
    let query = supabase
      .from('crdt_changes')
      .select('*')
      .eq('pot_id', potId)
      .order('created_at', { ascending: true });

    if (sinceTimestamp) {
      query = query.gt('created_at', sinceTimestamp);
    }

    const { data, error } = await query.limit(1000);

    if (error) {
      console.error('[PotRealtimeSync] Failed to fetch changes:', error);
      return [];
    }

    return (data || []).map(row => ({
      potId: row.pot_id,
      changeData: new Uint8Array(row.change_data),
      hash: row.hash,
      actor: row.actor,
      seq: row.seq,
      userId: row.user_id,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('[PotRealtimeSync] Error fetching changes:', error);
    return [];
  }
}
