-- Expose only the reads required by the client; RLS still controls visible rows.
grant select on public.plans to anon, authenticated;
grant select on public.orders, public.entitlements to authenticated;
