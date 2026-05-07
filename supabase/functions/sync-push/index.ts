import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TTL_MINUTES = 10;
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

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
    const text = await req.text();
    if (text.length > MAX_PAYLOAD_BYTES) {
      return json({ error: "payload_too_large" }, 413);
    }
    const body = JSON.parse(text);
    const entries = Array.isArray(body?.entries) ? body.entries : null;
    const sites = Array.isArray(body?.sites) ? body.sites : null;
    if (!entries || !sites) return json({ error: "invalid_payload" }, 400);
    if (entries.length === 0 && sites.length === 0) {
      return json({ error: "empty_payload" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000).toISOString();
    const payload = {
      schema: body.schema ?? "slingology-vot",
      version: body.version ?? 1,
      entries,
      sites,
    };

    const { data, error } = await supabase
      .from("sync_payloads")
      .insert({
        payload,
        entry_count: entries.length,
        site_count: sites.length,
        expires_at: expiresAt,
      })
      .select("token, expires_at, entry_count, site_count")
      .single();

    if (error) {
      console.error("insert error", error);
      return json({ error: "db_error" }, 500);
    }

    return json({
      token: data.token,
      expiresAt: data.expires_at,
      entryCount: data.entry_count,
      siteCount: data.site_count,
    });
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
