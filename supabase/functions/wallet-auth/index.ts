/// <reference lib="deno.unstable" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.48.0";
import { blake2b } from "npm:@noble/hashes@1.3.3/blake2b";
import { signatureVerify, cryptoWaitReady } from "npm:@polkadot/util-crypto";
import { stringToU8a } from "npm:@polkadot/util";

const ALLOWED_ORIGINS = [
  "https://chopdot.app",
  "https://www.chopdot.app",
  Deno.env.get("ALLOWED_ORIGIN") ?? "",
].filter(Boolean);

const NONCE_TTL_MS = 2 * 60 * 1000;
const NONCE_REQUEST_COOLDOWN_MS = 30 * 1000;

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".vercel.app") ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.startsWith("https://localhost:");
}

function getOriginHost(origin: string): string {
  if (!origin) return DEFAULT_DOMAIN;
  try {
    return new URL(origin).host || DEFAULT_DOMAIN;
  } catch {
    return DEFAULT_DOMAIN;
  }
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = isAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0] ?? "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

type RequestNoncePayload = { address: string };
type VerifyPayload = { address: string; signature: unknown; chain: "polkadot" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEFAULT_DOMAIN = Deno.env.get("VITE_WALLET_EMAIL_DOMAIN") || "chopdot.app";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const base64Encode = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

const randomString = (length = 64) => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomBytes, (byte) => chars[byte % chars.length]).join("");
};

const deriveWalletEmail = (address: string) => {
  const addr = address.toLowerCase().trim();
  const hashBytes = blake2b(addr, { dkLen: 32 });
  const firstNine = hashBytes.slice(0, 9);
  const sanitized = base64Encode(firstNine)
    .replace(/[+/=]/g, (c) => (c === "+" ? "p" : c === "/" ? "s" : "e"))
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10) || "wallet";
  return `wallet.user.${sanitized}@${DEFAULT_DOMAIN}`.toLowerCase();
};

const buildMessage = (nonce: string, domain: string, chain: "polkadot") =>
  [
    "Sign this message to login to ChopDot.",
    `Domain: ${domain}`,
    `Chain: ${chain}`,
    `Nonce: ${nonce}`,
  ].join("\n");

let _corsHeaders: Record<string, string> = {};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ..._corsHeaders },
  });

// --- POST /request-nonce ---

async function handleRequestNonce(req: Request, body: RequestNoncePayload) {
  const address = body.address?.trim();
  if (!address) return json({ error: "address required" }, 400);
  const origin = req.headers.get("Origin") ?? "";
  if (!isAllowedOrigin(origin)) {
    return json({ error: "origin not allowed" }, 403);
  }

  const { data: existingNonce, error: lookupError } = await supabaseAdmin
    .from("auth_nonces")
    .select("created_at,expires_at")
    .eq("address", address)
    .maybeSingle();

  if (lookupError) return json({ error: lookupError.message }, 500);
  if (
    existingNonce?.created_at &&
    Date.now() - new Date(existingNonce.created_at).getTime() < NONCE_REQUEST_COOLDOWN_MS
  ) {
    return json({ error: "nonce requested too recently" }, 429);
  }

  const nonce = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();

  const { error } = await supabaseAdmin
    .from("auth_nonces")
    .upsert({ address, nonce, expires_at: expiresAt, created_at: new Date().toISOString() });

  if (error) return json({ error: error.message }, 500);
  return json({ nonce, expires_at: expiresAt });
}

// --- POST /verify (Polkadot only — EVM uses native Supabase Web3 auth) ---

async function handleVerify(req: Request, body: VerifyPayload) {
  // Parse signature
  const signature = typeof body.signature === "string"
    ? body.signature.trim()
    : typeof body.signature === "object" && body.signature && "signature" in body.signature
      ? String((body.signature as { signature: string }).signature).trim()
      : null;

  if (!signature) return json({ error: "invalid signature format" }, 400);

  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (!address || !body.chain) return json({ error: "address and chain required" }, 400);
  const origin = req.headers.get("Origin") ?? "";
  if (!isAllowedOrigin(origin)) {
    return json({ error: "origin not allowed" }, 403);
  }

  if (body.chain !== "polkadot") {
    return json({ error: "Only Polkadot chain supported here. Use native Supabase Web3 auth for Ethereum." }, 400);
  }

  // --- Nonce validation ---
  const { data: nonceRow, error: nonceError } = await supabaseAdmin
    .from("auth_nonces")
    .select("*")
    .eq("address", address)
    .maybeSingle();

  if (nonceError) return json({ error: "nonce lookup failed" }, 500);
  if (!nonceRow) return json({ error: "nonce not found — request one first" }, 400);
  if (new Date(nonceRow.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from("auth_nonces").delete().eq("address", address);
    return json({ error: "nonce expired" }, 400);
  }

  // --- Polkadot signature verification ---
  const message = buildMessage(nonceRow.nonce, getOriginHost(origin), body.chain);
  let valid = false;
  try {
    await cryptoWaitReady();
    const result = signatureVerify(stringToU8a(message), signature, address);
    valid = result.isValid;
  } catch (err) {
    console.error("[wallet-auth] sig verify error:", err);
    return json({ error: "signature verification failed" }, 500);
  }

  if (!valid) return json({ error: "invalid signature" }, 401);
  await supabaseAdmin.from("auth_nonces").delete().eq("address", address);

  // --- Find or create Supabase user ---
  const normalizedAddress = address.trim();
  const email = deriveWalletEmail(address);
  const password = randomString(64);

  const { data: link } = await supabaseAdmin
    .from("wallet_links")
    .select("user_id")
    .eq("chain", "polkadot")
    .eq("address", normalizedAddress)
    .maybeSingle();

  let userId = link?.user_id ?? null;

  if (!userId) {
    const { data: existingUser } = await supabaseAdmin
      .schema("auth")
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    userId = existingUser?.id ?? null;
  }

  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { wallet_address: address, auth_method: "polkadot" },
    });

    if (error) {
      if (error.message?.includes("already registered") || error.code === "email_exists") {
        const { data: found } = await supabaseAdmin
          .schema("auth")
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        userId = found?.id ?? null;
        if (!userId) return json({ error: "User exists but could not be retrieved" }, 500);
      } else {
        console.error("[wallet-auth] create user error:", error.message);
        return json({ error: "Failed to create user" }, 500);
      }
    } else {
      userId = data?.user?.id ?? null;
    }
  }

  if (!userId) return json({ error: "Failed to resolve user" }, 500);

  // Rotate password + update metadata
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
    user_metadata: { wallet_address: address, auth_method: "polkadot" },
  });
  if (updateError) {
    console.error("[wallet-auth] update user error:", updateError.message);
    return json({ error: "Failed to update user" }, 500);
  }

  // Ensure profile + wallet link rows exist
  await supabaseAdmin.from("profiles").upsert({ id: userId }, { onConflict: "id" });
  await supabaseAdmin.from("wallet_links").upsert(
    {
      user_id: userId,
      chain: "polkadot",
      address: normalizedAddress,
      provider: "Polkadot",
      verified_at: new Date().toISOString(),
    },
    { onConflict: "user_id,chain,address" },
  );

  // --- Sign in and return session tokens ---
  const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !sessionData.session) {
    console.error("[wallet-auth] session error:", signInError?.message ?? "no session");
    return json({ error: "Failed to create session" }, 500);
  }

  return json({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    user_id: userId,
    email,
  });
}

// --- Router ---

serve(async (req) => {
  _corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { ..._corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" },
    });
  }

  const url = new URL(req.url);
  const pathname = url.pathname.toLowerCase();

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (pathname.endsWith("/request-nonce")) {
      return await handleRequestNonce(req, body as RequestNoncePayload);
    }
    if (pathname.endsWith("/verify")) {
      return await handleVerify(req, body as VerifyPayload);
    }
    return json({ error: "not found" }, 404);
  } catch (error) {
    console.error("[wallet-auth] unhandled error:", error);
    return json({ error: "internal error" }, 500);
  }
});
