/// <reference lib="deno.unstable" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.0";

const ALLOWED_ORIGINS = [
  "https://chopdot.app",
  "https://www.chopdot.app",
  Deno.env.get("ALLOWED_ORIGIN") ?? "",
].filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0] ?? "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

let _corsHeaders: Record<string, string> = {};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ..._corsHeaders },
  });

const badRequest = (message: string) => json({ error: message }, 400);
const unauthorized = () => json({ error: "Unauthorized" }, 401);
const forbidden = () => json({ error: "Forbidden" }, 403);
const conflict = (message: string) => json({ error: message }, 409);
const gone = (message: string) => json({ error: message }, 410);

serve(async (req) => {
  _corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: _corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return badRequest("Only POST is supported");
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const {
      data: { user },
      error: userError,
    } = await anonClient.auth.getUser();
    if (userError || !user) return unauthorized();

    const body = await req.json().catch(() => ({}));
    const token = body?.token?.trim();
    if (!token) return badRequest("token required");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: invite, error: inviteError } = await admin
      .from("invites")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (inviteError) return json({ error: inviteError.message }, 500);
    if (!invite) return badRequest("invalid invite");

    if (invite.status !== "pending") {
      return conflict("invite already processed");
    }

    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return gone("invite expired");
    }

    const userEmail = (user.email ?? "").toLowerCase().trim();
    const inviteeEmail = (invite.invitee_email ?? "").toLowerCase().trim();
    if (inviteeEmail && userEmail !== inviteeEmail) {
      return forbidden();
    }

    // Ensure the auth user exists in public.users (FK target for pot_members)
    const { error: ensureUserError } = await admin
      .from("users")
      .upsert(
        { id: user.id, name: user.email ?? null },
        { onConflict: "id" },
      );
    if (ensureUserError) return json({ error: ensureUserError.message }, 500);

    // Best-effort: populate inviter name (email) for nicer member displays.
    try {
      const inviter = await admin.auth.admin.getUserById(invite.created_by);
      const inviterEmail = inviter.data?.user?.email;
      if (inviterEmail) {
        await admin
          .from("users")
          .upsert({ id: invite.created_by, name: inviterEmail }, { onConflict: "id" });
      }
    } catch {
      // ignore
    }

    // Check if user is already a member
    const { data: existingMember, error: memberError } = await admin
      .from("pot_members")
      .select("id")
      .eq("pot_id", invite.pot_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError) return json({ error: memberError.message }, 500);
    if (existingMember) {
      // Mark invite accepted anyway
      await admin
        .from("invites")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq("id", invite.id);
      return json({ success: true, potId: invite.pot_id, alreadyMember: true });
    }

    const nowIso = new Date().toISOString();

    // Create membership first so we never end up with "accepted invite" but no membership row.
    const { error: upsertMemberError } = await admin.from("pot_members").upsert(
      {
        pot_id: invite.pot_id,
        user_id: user.id,
        role: "member",
        status: "active",
        joined_at: nowIso,
      },
      { onConflict: "pot_id,user_id" },
    );

    if (upsertMemberError) return json({ error: upsertMemberError.message }, 500);

    const { error: updateError } = await admin
      .from("invites")
      .update({
        status: "accepted",
        accepted_at: nowIso,
        accepted_by: user.id,
      })
      .eq("id", invite.id);

    if (updateError) return json({ error: updateError.message }, 500);

    return json({ success: true, potId: invite.pot_id });
  } catch (err) {
    console.error("[accept-invite] error:", err);
    return json({ error: "Unexpected error" }, 500);
  }
});
