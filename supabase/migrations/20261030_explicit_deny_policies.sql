-- Explicit deny policies make the intended service-only access visible to the security advisor.
-- No anon/authenticated grants are given to these tables; service_role bypasses RLS.
create policy "service role only ai usage events"
  on public.ai_usage_events for all to anon, authenticated
  using (false) with check (false);
create policy "service role only webhook events"
  on public.webhook_events for all to anon, authenticated
  using (false) with check (false);
