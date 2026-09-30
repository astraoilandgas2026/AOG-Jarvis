# AOG-Jarvis Architecture

Boundary: AOG-Jarvis is an isolated assistant layer. It does not own supplier master data.

Existing Supabase Procurement OS tables remain authoritative: suppliers, contacts, products, technical_specs, commercial_offers, certifications, documents, due_diligence, logistics, timeline_events, follow_ups, red_flags, intelligence_facts.

Security model: Client → authenticated user → Jarvis tool endpoint → Supabase Auth validation → server-side Supabase client → existing data model.

The service-role key, if required by a server-side tool, must exist only as an Edge Function secret.

Milestone 1 is READ ONLY. First tool: search-supplier.

Input: q required string; limit optional integer capped server-side.

Output: supplier identity, legal status, operation status, location, lifecycle, capacity/volume fields and verification boundary.

No INSERT, UPDATE or DELETE capability exists in milestone 1.

Expansion path: search_supplier → supplier profile → products → technical/commercial intelligence → DD → documents → follow-ups/timeline → controlled write tools → automation.

Non-goals: duplicated supplier database, localStorage as source of truth, unrestricted SQL endpoint, generic CRUD endpoint, production data seeding.