/// <reference lib="deno.unstable" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const badRequest = (message: string) => json({ error: message }, 400);
const unauthorized = () => json({ error: "Unauthorized" }, 401);
const conflict = (message: string) => json({ error: message }, 409);
const gone = (message: string) => json({ error: message }, 410);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const { error: updateError } = await admin
      .from("invites")
      .update({
        status: "accepted",
        accepted_at: nowIso,
        accepted_by: user.id,
      })
      .eq("id", invite.id);

    if (updateError) return json({ error: updateError.message }, 500);

    const { error: insertError } = await admin.from("pot_members").insert({
      pot_id: invite.pot_id,
      user_id: user.id,
      role: "member",
      status: "active",
      joined_at: nowIso,
    });

    if (insertError) return json({ error: insertError.message }, 500);

    return json({ success: true, potId: invite.pot_id });
  } catch (err) {
    console.error("[accept-invite] error:", err);
    return json({ error: "Unexpected error" }, 500);
  }
});
