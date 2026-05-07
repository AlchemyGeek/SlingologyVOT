import { supabase } from "@/integrations/supabase/client";
import type { VotEntry, VotSite } from "./vot-storage";
import type { ImportPayload } from "./vot-exports";

export interface PushResult {
  token: string;
  expiresAt: string;
  entryCount: number;
  siteCount: number;
}

export async function pushSync(
  entries: VotEntry[],
  sites: VotSite[],
): Promise<PushResult> {
  const { data, error } = await supabase.functions.invoke("sync-push", {
    body: {
      schema: "SlingologyVOT",
      version: 2,
      entries,
      sites,
    },
  });
  if (error) throw new Error(error.message ?? "Failed to upload sync payload");
  if (!data?.token) throw new Error("Invalid response from sync service");
  return data as PushResult;
}

export type PullErrorCode = "expired" | "consumed" | "not_found" | "invalid_token" | "network";

export class PullError extends Error {
  constructor(public code: PullErrorCode, message: string) {
    super(message);
  }
}

export async function pullSync(token: string): Promise<ImportPayload> {
  const { data, error } = await supabase.functions.invoke("sync-pull", {
    body: { token },
  });
  if (error) {
    // The function returns 410 with { error: code } for expired/consumed/not_found.
    // supabase-js surfaces non-2xx as error; try to read context.
    const ctx = (error as { context?: Response }).context;
    let code: PullErrorCode = "network";
    try {
      const body = ctx ? await ctx.clone().json() : null;
      if (body?.error) code = body.error as PullErrorCode;
    } catch {
      // ignore
    }
    throw new PullError(code, error.message ?? "Failed to retrieve sync payload");
  }
  const payload = data?.payload;
  const entries = Array.isArray(payload?.entries) ? (payload.entries as VotEntry[]) : [];
  const sites = Array.isArray(payload?.sites) ? (payload.sites as VotSite[]) : [];
  return { entries, sites };
}
