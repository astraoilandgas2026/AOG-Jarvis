import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const allowedOrigins = new Set([
  "https://astraoilandgas2026.github.io",
  "http://localhost:3000",
  "http://localhost:5500"
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_ANON_KEY")!;
  const db = createClient(url, key, { global: { headers: { Authorization: auth } } });

  const { data: userData, error: authError } = await db.auth.getUser();
  if (authError || !userData.user) {
    return new Response(
      JSON.stringify({ error: "Invalid authentication" }),
      { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  let body: { q?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const q = typeof body.q === "string" ? body.q.trim() : "";
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 20);

  if (q.length < 2) {
    return new Response(
      JSON.stringify({ error: "Search term must contain at least 2 characters" }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const pattern = "%" + q.replace(/[%_]/g, "\\$&") + "%";

  const { data, error } = await db
    .from("suppliers")
    .select(
      "id,legal_name,trading_name,country,city,tax_id,cnae,administrator,legal_status,facility,operation_status,theoretical_capacity,real_production,available_volume,volume_to_astra,trial_volume,recurring_volume,infrastructure,lifecycle,created_at,updated_at"
    )
    .or(
      "legal_name.ilike." + pattern +
      ",trading_name.ilike." + pattern +
      ",tax_id.ilike." + pattern
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return new Response(
      JSON.stringify({ error: "Supplier query failed" }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      user_id: userData.user.id,
      count: data?.length ?? 0,
      suppliers: data ?? []
    }),
    { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
  );
});
