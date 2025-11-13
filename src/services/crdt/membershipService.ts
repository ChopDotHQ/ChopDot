
import { getSupabase } from '../../utils/supabase-client';

export interface PotMember {
  userId: string;
  role: 'owner' | 'member';
  status: 'active' | 'pending' | 'removed';
  joinedAt: string;
}

export async function isPotMember(
  potId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('pot_members')
      .select('status')
      .eq('pot_id', potId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('[MembershipService] Error checking pot membership:', error);
    return false;
  }
}

export async function isPotOwner(
  potId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('pot_members')
      .select('role')
      .eq('pot_id', potId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .eq('status', 'active')
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('[MembershipService] Error checking pot ownership:', error);
    return false;
  }
}

export async function getPotMembers(potId: string): Promise<PotMember[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('pot_members')
      .select('user_id, role, status, joined_at')
      .eq('pot_id', potId)
      .eq('status', 'active');

    if (error || !data) {
      return [];
    }

    return data.map(row => ({
      userId: row.user_id,
      role: row.role as 'owner' | 'member',
      status: row.status as 'active' | 'pending' | 'removed',
      joinedAt: row.joined_at,
    }));
  } catch (error) {
    console.error('[MembershipService] Error getting pot members:', error);
    return [];
  }
}

export async function addPotMember(
  potId: string,
  userId: string,
  role: 'owner' | 'member' = 'member'
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase.from('pot_members').insert({
      pot_id: potId,
      user_id: userId,
      role,
      status: 'active',
    });

    if (error) {
      console.error('[MembershipService] Failed to add pot member:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[MembershipService] Error adding pot member:', error);
    return false;
  }
}

export async function removePotMember(
  potId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('pot_members')
      .update({ status: 'removed' })
      .eq('pot_id', potId)
      .eq('user_id', userId);

    if (error) {
      console.error('[MembershipService] Failed to remove pot member:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[MembershipService] Error removing pot member:', error);
    return false;
  }
}

export async function invitePotMember(
  potId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase.from('pot_members').insert({
      pot_id: potId,
      user_id: userId,
      role: 'member',
      status: 'pending',
    });

    if (error) {
      console.error('[MembershipService] Failed to invite pot member:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[MembershipService] Error inviting pot member:', error);
    return false;
  }
}

export async function acceptPotInvitation(
  potId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('pot_members')
      .update({ status: 'active' })
      .eq('pot_id', potId)
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('[MembershipService] Failed to accept invitation:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[MembershipService] Error accepting invitation:', error);
    return false;
  }
}
