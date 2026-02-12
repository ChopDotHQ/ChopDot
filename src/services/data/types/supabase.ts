export interface SupabasePotRow {
  id: string;
  name: string | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  archived_at: string | null;
  automerge_heads: string[] | null;
  last_synced_at: string | null;
  metadata: Record<string, unknown> | null;
  base_currency: string | null;
  pot_type: string | null;
  checkpoint_enabled: boolean | null;
  budget_enabled: boolean | null;
  budget: number | null;
  goal_amount: number | null;
  goal_description: string | null;
  last_edit_at: string | null;
}

export interface SupabaseExpenseRow {
  id: string;
  pot_id: string;
  creator_id: string;
  paid_by: string | null;
  amount_minor: number | string;
  currency_code: string | null;
  description: string | null;
  expense_date: string | null;
  created_at: string | null;
  legacy_id: string | null;
  metadata: Record<string, unknown> | null;
}

export interface SupabaseExpenseSplitRow {
  expense_id: string;
  member_id: string;
  amount_minor: number | string;
}
