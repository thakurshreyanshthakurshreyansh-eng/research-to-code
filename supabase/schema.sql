-- Research to Code: database setup. Run once in Supabase > SQL Editor.
create table public.plans(
  id text primary key, name text not null,
  price_paise integer not null check (price_paise >= 100),
  duration_days integer not null check (duration_days > 0),
  active boolean not null default false);
create table public.orders(
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  amount_paise integer not null,
  status text not null default 'created' check (status in ('created','paid','failed')),
  payment_id text, created_at timestamptz not null default now(), paid_at timestamptz);
create index on public.orders(user_id, created_at);
create index on public.orders(plan_id);
create table public.entitlements(
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  expires_at timestamptz not null);
create index on public.entitlements(plan_id);
create table public.webhook_events(id text primary key, received_at timestamptz not null default now());

alter table public.plans enable row level security;
alter table public.orders enable row level security;
alter table public.entitlements enable row level security;
alter table public.webhook_events enable row level security;
create policy "active plans are public" on public.plans for select using (active);
create policy "users read own orders" on public.orders for select to authenticated using ((select auth.uid()) = user_id);
create policy "users read own entitlement" on public.entitlements for select to authenticated using ((select auth.uid()) = user_id);
-- No insert/update/delete policies exist: only the server (service role key) can write.
revoke insert, update, delete on public.plans, public.orders, public.entitlements, public.webhook_events from anon, authenticated;
revoke all on public.webhook_events from anon, authenticated;

-- TEST MODE ONLY: a ₹1 test plan for exercising the checkout flow.
-- Razorpay TEST mode does not charge real money. Do not use this as a live offer.
insert into public.plans(id, name, price_paise, duration_days, active)
values ('premium_test_30d', 'Premium Test (30 days)', 100, 30, true)
on conflict (id) do nothing;

-- One transaction: mark the order paid exactly once and extend the plan.
create function public.grant_order(p_order text, p_payment text) returns text
language plpgsql security definer set search_path = public as $$
declare o public.orders; d int; cur timestamptz;
begin
  update public.orders set status='paid', payment_id=p_payment, paid_at=now()
    where id=p_order and status<>'paid' returning * into o;
  if not found then return 'duplicate'; end if;
  select duration_days into d from public.plans where id=o.plan_id;
  select expires_at into cur from public.entitlements where user_id=o.user_id;
  insert into public.entitlements(user_id, plan_id, expires_at)
    values (o.user_id, o.plan_id, greatest(now(), coalesce(cur, now())) + make_interval(days => d))
    on conflict (user_id) do update set plan_id=excluded.plan_id, expires_at=excluded.expires_at;
  return 'paid';
end $$;
revoke all on function public.grant_order(text, text) from public, anon, authenticated;
grant execute on function public.grant_order(text, text) to service_role;

-- Prices are YOUR decision. Add a plan only when Premium features exist, for example:
-- insert into public.plans values ('premium_30d', 'Premium (30 days)', <price in paise>, 30, true);


-- AI usage ledger. Input/output content is intentionally NOT stored here.
create table public.ai_usage_events(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('summary','explain','improve','tests','claims','compatibility','fix')),
  input_chars integer not null check (input_chars between 0 and 22000),
  created_at timestamptz not null default now()
);
create index ai_usage_user_created on public.ai_usage_events(user_id, created_at desc);
alter table public.ai_usage_events enable row level security;
revoke all on public.ai_usage_events from anon, authenticated;

-- Atomically enforce a monthly per-user request quota; only the service role may call it.
create function public.consume_ai_quota(p_user uuid, p_feature text, p_limit integer, p_input_chars integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_limit < 1 or p_input_chars < 0 or p_input_chars > 22000 or p_feature not in ('summary','explain','improve','tests','claims','compatibility','fix') then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || date_trunc('month', now())::text, 0));
  select count(*) into n from public.ai_usage_events where user_id=p_user and created_at >= date_trunc('month', now());
  if n >= p_limit then return false; end if;
  insert into public.ai_usage_events(user_id, feature, input_chars) values (p_user, p_feature, p_input_chars);
  return true;
end $$;
revoke all on function public.consume_ai_quota(uuid,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid,text,integer,integer) to service_role;
