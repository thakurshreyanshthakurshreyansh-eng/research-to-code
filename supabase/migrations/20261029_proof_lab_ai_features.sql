-- Add the Proof Lab AI modes to an existing database without recreating tables.
-- Safe to run once in the Supabase SQL editor or through the migration runner.
alter table public.ai_usage_events
  drop constraint if exists ai_usage_events_feature_check;
alter table public.ai_usage_events
  add constraint ai_usage_events_feature_check
  check (feature in ('summary','explain','improve','tests','claims','compatibility','fix'));

create or replace function public.consume_ai_quota(
  p_user uuid, p_feature text, p_limit integer, p_input_chars integer
) returns boolean
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_limit < 1
     or p_input_chars < 0
     or p_input_chars > 22000
     or p_feature not in ('summary','explain','improve','tests','claims','compatibility','fix')
  then return false; end if;
  perform pg_advisory_xact_lock(
    hashtextextended(p_user::text || date_trunc('month', now())::text, 0)
  );
  select count(*) into n
    from public.ai_usage_events
    where user_id = p_user and created_at >= date_trunc('month', now());
  if n >= p_limit then return false; end if;
  insert into public.ai_usage_events(user_id, feature, input_chars)
    values (p_user, p_feature, p_input_chars);
  return true;
end $$;

revoke all on function public.consume_ai_quota(uuid,text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid,text,integer,integer)
  to service_role;
