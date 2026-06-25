/// <reference lib="deno.unstable" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://chopdot.app",
  "https://www.chopdot.app",
  Deno.env.get("ALLOWED_ORIGIN") ?? "",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

function corsHeaders(origin: string) {
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".vercel.app") ||
    origin.startsWith("http://localhost:");
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0] ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

type GenerateWalletPassRequest = {
  label: string;
  spendUrl: string;
  spendCardId?: string;
};

serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST supported" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as GenerateWalletPassRequest;
    if (!body.label || !body.spendUrl) {
      return new Response(JSON.stringify({ error: "label and spendUrl required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const appleConfigured = Boolean(
      Deno.env.get("APPLE_PASS_TYPE_ID") && Deno.env.get("APPLE_PASS_CERT_PEM"),
    );

    return new Response(
      JSON.stringify({
        mode: appleConfigured ? "apple_pkpass_pending" : "url_fallback",
        spendUrl: body.spendUrl,
        label: body.label,
        walletPassExternalId: body.spendCardId ?? null,
        message: appleConfigured
          ? "PassKit generation requires certificate wiring — use spend URL + QR for now."
          : "Launcher pass stores URL only — add spend link to wallet manually or scan QR.",
      }),
      {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request" }),
      {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      },
    );
  }
});
