/// <reference lib="deno.unstable" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIRMA_WEBHOOK_SECRET = Deno.env.get("FIRMA_WEBHOOK_SECRET") ?? "";

type FirmaWebhookPayload = {
  id: string;
  type: string;
  created_at: string;
  data: {
    amount: number;
    currency: string;
    memo: string;
    payer_ref?: string;
    payee_ref?: string;
    transaction_id?: string;
  };
};

function parseFirmaMemo(memo: string): { legId: string; potId: string; chapterId: string } | null {
  const match = memo.match(/^chopdot:leg:([^:]+):pot:([^:]+):chapter:(.+)$/);
  if (!match) return null;
  const legId = match[1];
  const potId = match[2];
  const chapterId = match[3];
  if (!legId || !potId || !chapterId) return null;
  return { legId, potId, chapterId };
}

async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i += 1) {
    result |= expected.charCodeAt(i) ^ signature.toLowerCase().charCodeAt(i);
  }
  return result === 0;
}

function markLegPaid(chapter: Record<string, unknown>, legId: string): Record<string, unknown> {
  const legs = (chapter.legs as Array<Record<string, unknown>>) ?? [];
  const now = new Date().toISOString();
  return {
    ...chapter,
    legs: legs.map((leg) =>
      leg.id === legId ? { ...leg, state: "claimed", claimedAt: now } : leg,
    ),
  };
}

function chapterToPotProjection(chapter: Record<string, unknown>, pot: Record<string, unknown>) {
  return {
    ...pot,
    chapter,
    mode: "auditable",
    confirmationsEnabled: true,
    lastEditAt: new Date().toISOString(),
  };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST supported" }), { status: 400 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-Firma-Payment-Signature");
  const deliveryId = req.headers.get("X-Firma-Delivery-Id") ?? crypto.randomUUID();
  const eventType = req.headers.get("X-Firma-Event") ?? "payment.settled";

  if (FIRMA_WEBHOOK_SECRET) {
    const valid = await verifySignature(rawBody, signature, FIRMA_WEBHOOK_SECRET);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
    }
  }

  let payload: FirmaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as FirmaWebhookPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: existing } = await admin
    .from("capture_webhook_events")
    .select("id")
    .eq("provider", "firma")
    .eq("delivery_id", deliveryId)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200 });
  }

  const refs = parseFirmaMemo(payload.data?.memo ?? "");
  if (!refs || payload.type !== "payment.settled") {
    await admin.from("capture_webhook_events").insert({
      provider: "firma",
      delivery_id: deliveryId,
      event_type: eventType,
      payload,
      error: "Ignored — no matching memo or unsupported type",
      processed_at: new Date().toISOString(),
    });
    return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 202 });
  }

  const { data: pot, error: potError } = await admin
    .from("pots")
    .select("id, chapter, expenses, members, mode, confirmations_enabled")
    .eq("id", refs.potId)
    .maybeSingle();

  if (potError || !pot?.chapter) {
    await admin.from("capture_webhook_events").insert({
      provider: "firma",
      delivery_id: deliveryId,
      event_type: eventType,
      payload,
      pot_id: refs.potId,
      chapter_id: refs.chapterId,
      leg_id: refs.legId,
      error: "Pot or chapter not found",
    });
    return new Response(JSON.stringify({ error: "Pot not found" }), { status: 202 });
  }

  const chapter = pot.chapter as Record<string, unknown>;
  const legs = (chapter.legs as Array<Record<string, unknown>>) ?? [];
  const leg = legs.find((item) => item.id === refs.legId);

  if (!leg || leg.state !== "open") {
    await admin.from("capture_webhook_events").insert({
      provider: "firma",
      delivery_id: deliveryId,
      event_type: eventType,
      payload,
      pot_id: refs.potId,
      chapter_id: refs.chapterId,
      leg_id: refs.legId,
      error: "Leg not open",
      processed_at: new Date().toISOString(),
    });
    return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 202 });
  }

  if (Number(leg.amount) !== payload.data.amount || String(leg.currency) !== payload.data.currency) {
    await admin.from("capture_webhook_events").insert({
      provider: "firma",
      delivery_id: deliveryId,
      event_type: eventType,
      payload,
      pot_id: refs.potId,
      chapter_id: refs.chapterId,
      leg_id: refs.legId,
      error: "Amount or currency mismatch",
    });
    return new Response(JSON.stringify({ error: "Mismatch" }), { status: 202 });
  }

  const updatedChapter = markLegPaid(chapter, refs.legId);
  const updatedPot = chapterToPotProjection(updatedChapter, pot);

  const { error: updateError } = await admin
    .from("pots")
    .update({
      chapter: updatedPot.chapter,
      mode: updatedPot.mode,
      confirmations_enabled: updatedPot.confirmationsEnabled,
      last_edit_at: updatedPot.lastEditAt,
    })
    .eq("id", refs.potId);

  if (updateError) {
    await admin.from("capture_webhook_events").insert({
      provider: "firma",
      delivery_id: deliveryId,
      event_type: eventType,
      payload,
      pot_id: refs.potId,
      chapter_id: refs.chapterId,
      leg_id: refs.legId,
      error: updateError.message,
    });
    return new Response(JSON.stringify({ error: "Update failed" }), { status: 500 });
  }

  await admin.from("capture_webhook_events").insert({
    provider: "firma",
    delivery_id: deliveryId,
    event_type: eventType,
    payload,
    pot_id: refs.potId,
    chapter_id: refs.chapterId,
    leg_id: refs.legId,
    processed_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ ok: true, legId: refs.legId }), { status: 200 });
});
