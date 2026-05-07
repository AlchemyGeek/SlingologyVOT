import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Restrict to known app clients by requiring one of the project's public keys.
  const allowed = getAllowedPublicKeys();
  const providedKeys = [
    req.headers.get("apikey"),
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""),
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => !!value);

  if (allowed.size === 0 || !providedKeys.some((key) => allowed.has(key))) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!UUID_RE.test(token)) return json({ error: "invalid_token" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Atomically claim the payload: only succeeds if not yet consumed and not expired.
    const nowIso = new Date().toISOString();
    const { data: claimed, error: claimErr } = await supabase
      .from("sync_payloads")
      .update({ consumed_at: nowIso })
      .eq("token", token)
      .is("consumed_at", null)
      .gt("expires_at", nowIso)
      .select("payload")
      .maybeSingle();

    if (claimErr) {
      console.error("claim error", claimErr);
      return json({ error: "db_error" }, 500);
    }

    if (claimed) return json({ payload: claimed.payload });

    // Not claimed — figure out why.
    const { data: row } = await supabase
      .from("sync_payloads")
      .select("consumed_at, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (!row) return json({ error: "not_found" }, 410);
    if (row.consumed_at) return json({ error: "consumed" }, 410);
    return json({ error: "expired" }, 410);
  } catch (e) {
    console.error(e);
    return json({ error: "bad_request" }, 400);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAllowedPublicKeys() {
  const values = [
    Deno.env.get("SUPABASE_ANON_KEY"),
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
    Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"),
  ];

  return new Set(
    values.flatMap(parseSecretValues).map((value) => value.trim()).filter(Boolean),
  );
}

function parseSecretValues(value: string | undefined): string[] {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
    if (typeof parsed === "string") return [parsed];
  } catch {
    // Fall back to comma-separated/plain secret values.
  }

  return trimmed.split(",");
}
