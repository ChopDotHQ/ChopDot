/// <reference lib="deno.unstable" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// CORS headers helper
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "npm:@supabase/supabase-js@2.48.0";
import { blake2b } from "npm:@noble/hashes@1.3.3/blake2b";
// Base64 encoding helper
const base64Encode = (bytes: Uint8Array): string => {
  return btoa(String.fromCharCode(...bytes));
};
import { signatureVerify, cryptoWaitReady } from "npm:@polkadot/util-crypto";
import { stringToU8a } from "npm:@polkadot/util";
import { verifyMessage as verifyEvmMessage } from "npm:ethers@6.11.1";

type RequestNoncePayload = { address: string };
type VerifyPayload = { address: string; signature: string; chain: "polkadot" | "evm" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEFAULT_DOMAIN = Deno.env.get("VITE_WALLET_EMAIL_DOMAIN") || "chopdot.app";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const randomString = (bytes = 32) =>
  crypto.randomUUID().replace(/-/g, "") + crypto.getRandomValues(new Uint8Array(bytes)).join("");

const deriveWalletEmail = (address: string) => {
  const addr = address.toLowerCase().trim();
  const hashBytes = blake2b(addr, { dkLen: 32 });
  const firstNine = hashBytes.slice(0, 9);
  const base64Encoded = base64Encode(firstNine);
  const sanitized = base64Encoded
    .replace(/[+/=]/g, (c) => (c === "+" ? "p" : c === "/" ? "s" : "e"))
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10) || "wallet";
  return `wallet.user.${sanitized}@${DEFAULT_DOMAIN}`.toLowerCase();
};

const buildMessage = (nonce: string) => `Sign this message to login to ChopDot.\nNonce: ${nonce}`;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

async function handleRequestNonce(body: RequestNoncePayload) {
  const address = body.address?.trim();
  if (!address) return json({ error: "address required" }, 400);

  const nonce = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  const { error } = await supabaseAdmin
    .from("auth_nonces")
    .upsert({ address, nonce, expires_at: expiresAt, created_at: new Date().toISOString() });

  if (error) return json({ error: error.message }, 500);
  return json({ nonce, expires_at: expiresAt });
}

async function verifyPolkadotSignature(address: string, message: string, signature: string) {
  await cryptoWaitReady();
  // Convert message to Uint8Array for signature verification
  const messageBytes = stringToU8a(message);
  const result = signatureVerify(messageBytes, signature, address);
  return result.isValid;
}

async function verifyEvmSignature(address: string, message: string, signature: string) {
  try {
    const recovered = verifyEvmMessage(message, signature);
    return recovered.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

async function fetchUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from("auth.users").select("id").eq("email", email).maybeSingle();
  if (error) {
    console.error("[wallet-auth] fetch user by email failed:", error);
    return null;
  }
  return data?.id ?? null;
}

async function ensureUser(address: string, chain: "polkadot" | "evm", email: string, password: string) {
  // Try to find existing user by email first
  let userId = await fetchUserIdByEmail(email);

  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { wallet_address: address, auth_method: chain },
    });
    if (error && !error.message.includes("already registered")) {
      console.error("[wallet-auth] createUser error:", error);
      throw error;
    }
    userId = data?.user?.id ?? (await fetchUserIdByEmail(email));
  }

  if (!userId) {
    throw new Error("Failed to create or fetch user");
  }

  // Rotate password and metadata
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
    user_metadata: { wallet_address: address, auth_method: chain },
  });
  if (updateError) {
    console.error("[wallet-auth] updateUser error:", updateError);
    throw updateError;
  }

  // Ensure profile row exists
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, wallet_address: address }, { onConflict: "id" });
  if (profileError) {
    console.warn("[wallet-auth] profile upsert warning:", profileError.message);
  }

  return userId;
}

async function handleVerify(body: VerifyPayload) {
  const address = body.address?.trim();
  const signature = body.signature?.trim();
  const chain = body.chain;
  if (!address || !signature || !chain) return json({ error: "address, signature, and chain required" }, 400);

  // Pull nonce
  const { data: nonceRow, error: nonceError } = await supabaseAdmin
    .from("auth_nonces")
    .select("*")
    .eq("address", address)
    .maybeSingle();
  if (nonceError || !nonceRow) return json({ error: "nonce not found" }, 400);
  if (new Date(nonceRow.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from("auth_nonces").delete().eq("address", address);
    return json({ error: "nonce expired" }, 400);
  }

  const message = buildMessage(nonceRow.nonce);
  let valid = false;
  if (chain === "polkadot") {
    valid = await verifyPolkadotSignature(address, message, signature);
  } else {
    valid = await verifyEvmSignature(address, message, signature);
  }
  if (!valid) return json({ error: "invalid signature" }, 401);

  // Consume nonce
  await supabaseAdmin.from("auth_nonces").delete().eq("address", address);

  const email = deriveWalletEmail(address);
  const password = randomString(16);
  const userId = await ensureUser(address, chain, email, password);

  // Sign in server-side with rotated password to issue tokens
  const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !sessionData.session) {
    console.error("[wallet-auth] signIn failed:", signInError);
    return json({ error: "failed to create session" }, 500);
  }

  return json({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    user_id: userId,
    email,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  }

  const url = new URL(req.url);
  const pathname = url.pathname.toLowerCase();

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (pathname.endsWith("/request-nonce")) {
      return await handleRequestNonce(body as RequestNoncePayload);
    }
    if (pathname.endsWith("/verify")) {
      return await handleVerify(body as VerifyPayload);
    }
    return json({ error: "not found" }, 404);
  } catch (error) {
    console.error("[wallet-auth] unhandled error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[wallet-auth] error stack:", errorStack);
    return json({ error: "internal error", details: errorMessage }, 500);
  }
});
