# jarvis-search-supplier

Authenticated read-only supplier search.

- JWT required at the platform boundary.
- No INSERT, UPDATE or DELETE.
- Queries the existing `public.suppliers` source of truth.
- Maximum 20 results.