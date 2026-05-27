import { supabaseAdmin } from "./supabase";

// ============================================================
// REQUESTS
// ============================================================

export type RequestRow = {
  id: string;
  request_code: string;
  customer: string | null;
  author: string | null;
  logist: string | null;
  status: string;
  status_1c: string | null;
  ai_transport_mode: string | null;
  ai_origin_city: string | null;
  ai_origin_country: string | null;
  ai_dest_city: string | null;
  ai_dest_country: string | null;
  ai_cargo_name: string | null;
  ai_incoterms: string | null;
  ai_container_type: string | null;
  received_at: string;
  sent_at: string | null;
  hours_elapsed: number | null;
  quotes_count: number;
  outreach_sent: number;
  outreach_replied: number;
  outreach_pending: number;
};

export async function getActiveRequests(): Promise<RequestRow[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc("dashboard_active_requests");
    if (error) {
      console.error("[getActiveRequests] RPC error:", error.message, error.code);
      return [];
    }
    return (data || []) as RequestRow[];
  } catch (e: any) {
    console.error("[getActiveRequests] exception:", e?.message);
    return [];
  }
}

export async function getRequestByCode(code: string) {
  const { data: r, error: re } = await supabaseAdmin
    .from("requests")
    .select("*")
    .eq("request_code", code)
    .maybeSingle();
  if (re) throw re;
  if (!r) return null;

  const { data: outreach, error: oe } = await supabaseAdmin
    .from("outreach_messages")
    .select(`
      id, status, wave, rank, sent_at, replied_at, channel, error_text,
      contractor:contractors(id, name, email, contact_language, response_rate_30d, priority_score)
    `)
    .eq("request_id", r.id)
    .order("rank", { ascending: true });
  if (oe) throw oe;

  const { data: quotes, error: qe } = await supabaseAdmin
    .from("quotes")
    .select(`
      id, price, currency, price_unit, estimated_total, transit_days, transit_days_min, transit_days_max,
      incoterms, container_type, valid_until, included, excluded, hidden_cost_warnings,
      notes, ai_confidence, is_best, is_selected, created_at, attachment_urls,
      summary_human, local_charges_breakdown, freight_amount,
      terminal_origin, terminal_dest, customs_included,
      inbound_message_id,
      contractor:contractors(id, name, email, priority_score),
      inbound:inbound_messages!inbound_message_id(body_text, attachment_urls)
    `)
    .eq("request_id", r.id)
    .order("created_at", { ascending: false });
  if (qe) throw qe;

  const quotesWithBody = (quotes || []).map((q: any) => ({
    ...q,
    email_body: q.inbound?.body_text || null,
    attachment_urls:
      q.attachment_urls && q.attachment_urls.length > 0
        ? q.attachment_urls
        : q.inbound?.attachment_urls || [],
  }));

  const { data: clarifications, error: ce } = await supabaseAdmin
    .from("inbound_messages")
    .select(`
      id, received_at, body_text, status,
      contractor:contractors(id, name, email)
    `)
    .eq("matched_request_id", r.id)
    .eq("status", "clarification_needed")
    .order("received_at", { ascending: false });
  if (ce) throw ce;

  return {
    request: r,
    outreach: outreach || [],
    quotes: quotesWithBody,
    clarifications: clarifications || [],
  };
}

// ============================================================
// CONTRACTORS
// ============================================================

export type ContractorStats = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contact_language: string | null;
  blacklisted: boolean;
  opted_out: boolean;
  total_sent: number;
  total_replied: number;
  total_quoted: number;
  total_wins: number;
  response_rate_pct: number;
  avg_response_min: number | null;
  last_reply_at: string | null;
  last_contacted_at: string | null;
  bounce_count: number;
  has_notes: boolean;
  priority_score: number;
  quote_win_rate: number;
};

/**
 * Loads all contractors with pagination.
 * Falls back to unpaginated call if the RPC doesn't support p_limit/p_offset yet.
 */
export async function getContractorStats(): Promise<ContractorStats[]> {
  // First attempt: paginated call
  const PAGE_SIZE = 1000;
  const all: ContractorStats[] = [];
  let offset = 0;
  let paginationSupported = true;

  while (paginationSupported) {
    const { data, error } = await supabaseAdmin.rpc("dashboard_contractor_stats", {
      p_limit: PAGE_SIZE,
      p_offset: offset,
    });

    if (error) {
      // Pagination params not supported by this version of the function — fall back once
      console.warn("dashboard_contractor_stats: pagination not supported, loading all:", error.message);
      paginationSupported = false;
      break;
    }

    const batch = (data || []) as ContractorStats[];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (paginationSupported) return all;

  // Fallback: load without params
  const { data: fallbackData, error: fallbackError } = await supabaseAdmin.rpc(
    "dashboard_contractor_stats"
  );
  if (fallbackError) throw fallbackError;
  return (fallbackData || []) as ContractorStats[];
}

export async function getContractorById(id: string) {
  const { data: contractor, error: ce } = await supabaseAdmin
    .from("contractors")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (ce) throw ce;
  if (!contractor) return null;

  const { data: notes, error: ne } = await supabaseAdmin.rpc("dashboard_contractor_notes", {
    p_contractor_id: id,
  });
  if (ne) throw ne;

  // Fetch total counts first so we can show "showing N of total" in the UI
  const [{ count: outreachTotal }, { count: quotesTotal }] = await Promise.all([
    supabaseAdmin
      .from("outreach_messages")
      .select("*", { count: "exact", head: true })
      .eq("contractor_id", id),
    supabaseAdmin
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("contractor_id", id),
  ]);

  const LIMIT = 50;

  const { data: outreach, error: oe } = await supabaseAdmin
    .from("outreach_messages")
    .select(`
      id, status, sent_at, replied_at, wave,
      request:requests(id, request_code, customer, ai_origin_city, ai_dest_city, ai_cargo_name, status)
    `)
    .eq("contractor_id", id)
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(LIMIT);
  if (oe) throw oe;

  const { data: quotes, error: qe } = await supabaseAdmin
    .from("quotes")
    .select(`
      id, price, currency, transit_days, incoterms, is_best, is_selected, created_at,
      request:requests(id, request_code, ai_origin_city, ai_dest_city)
    `)
    .eq("contractor_id", id)
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (qe) throw qe;

  return {
    contractor,
    notes: notes || [],
    outreach: outreach || [],
    outreachTotal: outreachTotal ?? (outreach?.length ?? 0),
    quotes: quotes || [],
    quotesTotal: quotesTotal ?? (quotes?.length ?? 0),
    limit: LIMIT,
  };
}

// ============================================================
// NOTES
// ============================================================

export type ContractorNote = {
  id: string;
  text: string;
  author: string;
  created_at: string;
  updated_at: string;
};

export async function addContractorNote(
  contractor_id: string,
  text: string,
  author: string,
) {
  const { data, error } = await supabaseAdmin
    .from("contractor_notes")
    .insert({ contractor_id, text, author })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateContractorNote(id: string, text: string) {
  const { data, error } = await supabaseAdmin
    .from("contractor_notes")
    .update({ text, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteContractorNote(id: string) {
  const { error } = await supabaseAdmin
    .from("contractor_notes")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return { ok: true };
}

// ============================================================
// INSIGHTS
// ============================================================

export type ProblematicRequest = {
  request_id: string;
  request_code: string;
  customer: string | null;
  route: string;
  cargo_name: string | null;
  clarification_count: number;
  quotes_count: number;
};

export async function getProblematicRequests(): Promise<ProblematicRequest[]> {
  const { data, error } = await supabaseAdmin.rpc("dashboard_problematic_requests");
  if (error) throw error;
  return (data || []) as ProblematicRequest[];
}

export type ClarificationEvent = {
  id: string;
  received_at: string;
  contractor_name: string | null;
  request_code: string | null;
  route: string | null;
  question_text: string;
};

export async function getRecentClarifications(limit = 30): Promise<ClarificationEvent[]> {
  const { data, error } = await supabaseAdmin.rpc("dashboard_recent_clarifications", {
    p_limit: limit,
  });
  if (error) throw error;
  return (data || []) as ClarificationEvent[];
}

// ============================================================
// SYSTEM
// ============================================================

export type SystemMetrics = {
  // Time-windowed (depend on p_hours)
  requests_24h: number;
  outreach_sent_24h: number;
  inbound_received_24h: number;
  quotes_received_24h: number;
  selected_24h: number;
  outreach_failed_24h: number;
  bounced_24h: number;
  ai_refusals_24h: number;
  // All-time totals (independent of p_hours)
  contractors_total: number;
  contractors_blacklisted: number;
  contractors_opted_out: number;
  requests_total: number;
  quotes_total: number;
};

export async function getSystemMetrics(hours = 24): Promise<SystemMetrics> {
  try {
    const { data, error } = await supabaseAdmin.rpc("dashboard_system_metrics", {
      p_hours: hours,
    });
    if (error) {
      console.error("[getSystemMetrics] RPC error:", error.message, error.code);
      return {} as SystemMetrics;
    }
    return (data?.[0] || {}) as SystemMetrics;
  } catch (e: any) {
    console.error("[getSystemMetrics] exception:", e?.message);
    return {} as SystemMetrics;
  }
}

export type AuditEvent = {
  id: number;
  created_at: string;
  entity_type: string;
  event: string;
  details: Record<string, unknown> | null;
};

export async function getRecentAudit(limit = 50): Promise<AuditEvent[]> {
  const { data, error } = await supabaseAdmin
    .from("audit_log")
    .select("id, created_at, entity_type, event, details")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as AuditEvent[];
}

export type FunnelStep = { step: string; count: number };

export async function getFunnel(): Promise<FunnelStep[]> {
  const { data, error } = await supabaseAdmin.rpc("dashboard_funnel");
  if (error) throw error;
  return (data || []) as FunnelStep[];
}

// ============================================================
// ARCHIVE (soft-delete: status → archived, data stays in DB)
// ============================================================

export async function archiveRequest(requestId: string) {
  const { error } = await supabaseAdmin
    .from("requests")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw error;
  return { ok: true };
}
