-- Improve foreign-key lookup performance and avoid per-row auth.uid() evaluation.
create index if not exists orders_plan_id_idx on public.orders(plan_id);
create index if not exists entitlements_plan_id_idx on public.entitlements(plan_id);

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders"
  on public.orders for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users read own entitlement" on public.entitlements;
create policy "users read own entitlement"
  on public.entitlements for select to authenticated
  using ((select auth.uid()) = user_id);
