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

// Generate a random password <= 72 characters (Supabase limit)
const randomString = (length = 32) => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomBytes, (byte) => chars[byte % chars.length]).join("");
};

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
  try {
    // listUsers doesn't support direct email filtering, so we paginate and search
    let page = 1;
    const perPage = 1000;
    
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      
      if (error) {
        console.error("[wallet-auth] listUsers failed:", error);
        return null;
      }
      
      const users = data?.users ?? [];
      if (!users || users.length === 0) {
        // No more users to check
        break;
      }
      
      // Search for user with matching email
      const foundUser = users.find((user) => user.email === email);
      if (foundUser) {
        return foundUser.id;
      }
      
      // If we got fewer users than perPage, we've reached the end
      if (users.length < perPage) {
        break;
      }
      
      page++;
    }
    
    return null;
  } catch (err) {
    console.error("[wallet-auth] fetchUserIdByEmail exception:", err);
    return null;
  }
}

async function ensureUser(address: string, chain: "polkadot" | "evm", email: string, password: string) {
  // Try to find existing user by email using Admin API
  let userId = await fetchUserIdByEmail(email);

  if (!userId) {
    // User doesn't exist, create them
    console.log("[wallet-auth] Creating new user:", { email, address, chain });
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { wallet_address: address, auth_method: chain },
    });
    
    if (error) {
      // If user already exists (race condition), fetch them
      if (error.message?.includes("already registered") || error.code === "email_exists") {
        console.log("[wallet-auth] User already exists, fetching:", email);
        userId = await fetchUserIdByEmail(email);
        if (!userId) {
          console.error("[wallet-auth] User exists but couldn't fetch:", error);
          throw new Error("User exists but couldn't be retrieved");
        }
      } else {
        console.error("[wallet-auth] createUser error:", error);
        throw error;
      }
    } else {
      userId = data?.user?.id ?? null;
    }
  }

  if (!userId) {
    throw new Error("Failed to create or fetch user");
  }

  console.log("[wallet-auth] Updating user password and metadata:", userId);
  // Rotate password and metadata
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
    user_metadata: { wallet_address: address, auth_method: chain },
  });
  if (updateError) {
    console.error("[wallet-auth] updateUser error:", updateError);
    throw updateError;
  }

  // Ensure profile row exists (profiles table only has: id, username, created_at, updated_at)
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id" });
  if (profileError) {
    console.warn("[wallet-auth] profile upsert warning:", profileError.message);
    // Non-fatal, continue
  }

  // Link wallet to user (upsert to handle existing links)
  const walletProvider = chain === "polkadot" ? "Polkadot" : "EVM";
  const { error: walletLinkError } = await supabaseAdmin
    .from("wallet_links")
    .upsert({
      user_id: userId,
      chain,
      address: address.toLowerCase().trim(),
      provider: walletProvider,
      verified_at: new Date().toISOString(),
    }, {
      onConflict: "user_id,chain,lower(address)",
      ignoreDuplicates: false,
    });
  
  if (walletLinkError) {
    console.warn("[wallet-auth] wallet_links upsert warning:", walletLinkError.message);
    // Non-fatal, continue
  } else {
    console.log("[wallet-auth] Wallet linked to user:", { userId, chain, address, provider: walletProvider });
  }

  return userId;
}

async function handleVerify(body: VerifyPayload) {
  try {
    // Handle signature - it might be a string or an object with a signature property
    let signature: string;
    if (typeof body.signature === 'string') {
      signature = body.signature.trim();
    } else if (body.signature && typeof body.signature === 'object' && 'signature' in body.signature) {
      signature = String(body.signature.signature).trim();
    } else {
      console.error("[wallet-auth] Invalid signature format:", { signature: body.signature, signatureType: typeof body.signature });
      return json({ error: "invalid signature format" }, 400);
    }
    
    const address = typeof body.address === 'string' ? body.address.trim() : String(body.address || '').trim();
    const chain = body.chain;
    console.log("[wallet-auth] verify request:", { address, signatureLength: signature?.length, chain, signatureType: typeof signature });
    
    if (!address || !signature || !chain) {
      console.error("[wallet-auth] Missing required fields:", { hasAddress: !!address, hasSignature: !!signature, hasChain: !!chain });
      return json({ error: "address, signature, and chain required" }, 400);
    }

    // Pull nonce
    const { data: nonceRow, error: nonceError } = await supabaseAdmin
      .from("auth_nonces")
      .select("*")
      .eq("address", address)
      .maybeSingle();
    
    if (nonceError) {
      console.error("[wallet-auth] Nonce lookup error:", nonceError);
      return json({ error: "nonce lookup failed" }, 500);
    }
    
    if (!nonceRow) {
      console.error("[wallet-auth] Nonce not found for address:", address);
      return json({ error: "nonce not found" }, 400);
    }
    
    if (new Date(nonceRow.expires_at).getTime() < Date.now()) {
      console.error("[wallet-auth] Nonce expired:", { expiresAt: nonceRow.expires_at, now: new Date().toISOString() });
      await supabaseAdmin.from("auth_nonces").delete().eq("address", address);
      return json({ error: "nonce expired" }, 400);
    }

    const message = buildMessage(nonceRow.nonce);
    console.log("[wallet-auth] Verifying signature:", { chain, messageLength: message.length, signatureLength: signature.length });
    
    let valid = false;
    if (chain === "polkadot") {
      try {
        valid = await verifyPolkadotSignature(address, message, signature);
        console.log("[wallet-auth] Polkadot signature verification result:", valid);
      } catch (verifyError) {
        console.error("[wallet-auth] Polkadot signature verification error:", verifyError);
        return json({ error: "signature verification failed", details: verifyError instanceof Error ? verifyError.message : String(verifyError) }, 500);
      }
    } else {
      try {
        valid = await verifyEvmSignature(address, message, signature);
        console.log("[wallet-auth] EVM signature verification result:", valid);
      } catch (verifyError) {
        console.error("[wallet-auth] EVM signature verification error:", verifyError);
        return json({ error: "signature verification failed", details: verifyError instanceof Error ? verifyError.message : String(verifyError) }, 500);
      }
    }
    
    if (!valid) {
      console.error("[wallet-auth] Signature invalid");
      return json({ error: "invalid signature" }, 401);
    }

    // Consume nonce
    await supabaseAdmin.from("auth_nonces").delete().eq("address", address);
    console.log("[wallet-auth] Nonce consumed");

    const email = deriveWalletEmail(address);
    // Generate password <= 72 chars (Supabase limit: 72 characters)
    const password = randomString(64);
    console.log("[wallet-auth] Creating/updating user:", { email, address, chain });
    
    let userId: string;
    try {
      userId = await ensureUser(address, chain, email, password);
      console.log("[wallet-auth] User ensured:", userId);
    } catch (userError) {
      console.error("[wallet-auth] ensureUser failed:", userError);
      return json({ error: "failed to create user", details: userError instanceof Error ? userError.message : String(userError) }, 500);
    }

    // Sign in server-side with rotated password to issue tokens
    console.log("[wallet-auth] Signing in with password to get tokens");
    const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });
    
    if (signInError) {
      console.error("[wallet-auth] signInWithPassword failed:", signInError);
      return json({ error: "failed to create session", details: signInError.message }, 500);
    }
    
    if (!sessionData.session) {
      console.error("[wallet-auth] No session returned from signInWithPassword");
      return json({ error: "failed to create session", details: "No session data returned" }, 500);
    }

    console.log("[wallet-auth] ✅ Login successful:", { userId, email });
    return json({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      user_id: userId,
      email,
    });
  } catch (error) {
    console.error("[wallet-auth] handleVerify unhandled error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[wallet-auth] error stack:", errorStack);
    return json({ error: "internal error", details: errorMessage }, 500);
  }
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
