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

  // Restrict to known app clients by requiring the project anon key.
  const expectedKey = Deno.env.get("SUPABASE_ANON_KEY");
  const providedKey =
    req.headers.get("apikey") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!expectedKey || providedKey !== expectedKey) {
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
