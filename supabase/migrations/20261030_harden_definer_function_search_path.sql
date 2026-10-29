-- SECURITY DEFINER functions must use a trusted, fixed search path.
alter function public.grant_order(text, text) set search_path = pg_catalog, public;
alter function public.consume_ai_quota(uuid, text, integer, integer) set search_path = pg_catalog, public;
