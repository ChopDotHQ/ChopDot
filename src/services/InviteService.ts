import { SupabaseClient } from "@supabase/supabase-js";

export interface Invite {
    id: string;
    pot_id: string;
    invitee_email: string;
    status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
    token: string;
    expires_at: string;
    created_at: string;
    created_by: string;
}

export class InviteService {
    constructor(private supabase: SupabaseClient | null) { }

    private async resolveCurrentUser(): Promise<{ id: string; email?: string } | null> {
        if (!this.supabase) return null;

        try {
            // Session user is local/fast and avoids transient getUser nulls during auth warmup.
            const { data: { session } } = await this.supabase.auth.getSession();
            const sessionUser = session?.user;
            if (sessionUser?.id) {
                return {
                    id: sessionUser.id,
                    email: sessionUser.email ?? undefined,
                };
            }
        } catch (error) {
            console.warn("[InviteService] getSession failed while resolving user", error);
        }

        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (user?.id) {
                return {
                    id: user.id,
                    email: user.email ?? undefined,
                };
            }
        } catch (error) {
            console.warn("[InviteService] getUser failed while resolving user", error);
        }

        return null;
    }

    /**
     * Send a new invite to an email address.
     * Checks for existing pending invites to avoid duplicates.
     */
    async createInvite(
        potId: string,
        email: string,
    ): Promise<{ success: boolean; error?: string; token?: string; alreadyExists?: boolean }> {
        if (!this.supabase) return { success: false, error: "Supabase not configured" };

        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes("@")) {
            return { success: false, error: "Invalid email address" };
        }

        try {
            const user = await this.resolveCurrentUser();
            if (!user?.id) {
                return {
                    success: false,
                    error: "Sign-in is still initializing. Please wait a moment and retry.",
                };
            }

            // 1. Check for existing pending invite
            const { data: existing } = await this.supabase
                .from("invites")
                .select("id, token")
                .eq("pot_id", potId)
                .eq("invitee_email", cleanEmail)
                .eq("status", "pending")
                .maybeSingle();

            if (existing) {
                // Reuse the existing pending invite token so UX can "resend" without erroring.
                return { success: true, token: existing.token, alreadyExists: true };
            }

            // 2. Create new invite
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
            const { data, error } = await this.supabase
                .from("invites")
                .insert({
                    pot_id: potId,
                    invitee_email: cleanEmail,
                    expires_at: expiresAt,
                    created_by: user.id,
                    status: 'pending'
                })
                .select('token')
                .single();

            if (error) throw error;
            return { success: true, token: data.token };

        } catch (err: any) {
            console.error("[InviteService] createInvite failed", err);
            return { success: false, error: err.message || "Failed to create invite" };
        }
    }

    /**
     * Get all pending invites sent TO the current user.
     */
    async getMyPendingInvites(): Promise<Invite[]> {
        if (!this.supabase) return [];

        const user = await this.resolveCurrentUser();
        const email = user?.email?.trim().toLowerCase();
        if (!email) return [];

        const { data, error } = await this.supabase
            .from("invites")
            .select("*")
            .ilike("invitee_email", email)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (error) {
            console.warn("[InviteService] getMyPendingInvites failed", error);
            return [];
        }
        return (data || []) as Invite[];
    }

    /**
     * Get all invites for a specific pot (for the Members list).
     */
    async getPotInvites(potId: string): Promise<Invite[]> {
        if (!this.supabase) return [];

        const { data, error } = await this.supabase
            .from("invites")
            .select("*")
            .eq("pot_id", potId)
            .order("created_at", { ascending: false });

        if (error) {
            console.warn("[InviteService] getPotInvites failed", error);
            return [];
        }
        return (data || []) as Invite[];
    }

    /**
     * Accept an invite via Edge Function.
     */
    async acceptInvite(token: string): Promise<{ success: boolean; potId?: string; error?: string }> {
        if (!this.supabase) return { success: false, error: "Supabase not configured" };

        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (!session?.access_token) return { success: false, error: "Log in to accept invite" };

            // Make sure the Edge Function URL is correct in your Vite env
            const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invite`;

            const response = await fetch(functionUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ token }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || result?.error) {
                return { success: false, error: result?.error || "Failed to accept invite" };
            }

            return { success: true, potId: result.potId };
        } catch (err: any) {
            console.error("[InviteService] acceptInvite failed", err);
            return { success: false, error: err.message || "Network error" };
        }
    }

    /**
     * Decline an invite via Edge Function.
     */
    async declineInvite(token: string): Promise<{ success: boolean; error?: string }> {
        if (!this.supabase) return { success: false, error: "Supabase not configured" };

        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (!session?.access_token) return { success: false, error: "Log in to decline invite" };

            const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decline-invite`;

            const response = await fetch(functionUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ token }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || result?.error) {
                return { success: false, error: result?.error || "Failed to decline invite" };
            }

            return { success: true };
        } catch (err: any) {
            console.error("[InviteService] declineInvite failed", err);
            return { success: false, error: err.message || "Network error" };
        }
    }

    /**
     * Revoke/Cancel an invite (for the sender).
     * This is a direct DB update since RLS should allow pot members to edit invites they created/own.
     */
    async revokeInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
        if (!this.supabase) return { success: false, error: "Supabase not configured" };

        try {
            const { error } = await this.supabase
                .from("invites")
                .update({ status: 'revoked' })
                .eq('id', inviteId);

            if (error) throw error;
            return { success: true };
        } catch (err: any) {
            console.error("[InviteService] revokeInvite failed", err);
            return { success: false, error: err.message || "Failed to revoke invite" };
        }
    }

    /**
     * Get a single invite by token (for previewing before accept).
     */
    async getInviteByToken(token: string): Promise<Partial<Invite> | null> {
        if (!this.supabase) return null;

        const { data, error } = await this.supabase
            .from("invites")
            .select("id, invitee_email, status, created_by, pot_id")
            .eq("token", token)
            .maybeSingle();

        if (error) {
            console.warn("[InviteService] getInviteByToken failed", error);
            return null;
        }
        return data as Partial<Invite>;
    }
}
