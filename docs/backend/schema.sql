-- Atlas reference schema for Supabase / Lovable Cloud.
--
-- This is NOT an applied migration and must not be pasted into a production
-- project without review. Lovable manages schema changes: use its Cloud panel
-- or SQL editor, then test with two real accounts. Do not edit generated
-- migration folders by hand.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Identity and learner records
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  handle text unique,
  interests text[] not null default '{}',
  ambitions text[] not null default '{}',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'suspended')),
  display_name text not null default '',
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Content and production
-- ---------------------------------------------------------------------------

create table if not exists public.content_items (
  id text primary key,
  kind text not null check (kind in ('short', 'episode')),
  title text not null,
  summary text not null default '',
  category text not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'in-review', 'approved', 'published', 'suspended')),
  video_url text,
  captions_url text,
  sources jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.production_jobs (
  id uuid primary key default gen_random_uuid(),
  content_id text references public.content_items(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'rendering', 'rendered', 'failed', 'approved', 'published')),
  seconds_per_slide integer not null default 4 check (seconds_per_slide between 1 and 15),
  script jsonb not null default '{}'::jsonb,
  qc jsonb not null default '[]'::jsonb,
  signature text,
  attempts integer not null default 0 check (attempts >= 0),
  error text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_assets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.production_jobs(id) on delete cascade,
  storage_path text not null,
  mime_type text not null default 'video/webm',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  captions_path text,
  checksum text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  feature text not null check (feature in ('guide', 'script', 'research', 'narration', 'render')),
  requests integer not null default 0 check (requests >= 0),
  render_seconds integer not null default 0 check (render_seconds >= 0),
  estimated_cost_microunits bigint not null default 0 check (estimated_cost_microunits >= 0),
  primary key (user_id, day, feature)
);

-- ---------------------------------------------------------------------------
-- Plans, commerce and moderation
-- ---------------------------------------------------------------------------

create table if not exists public.plans (
  id text primary key,
  name text not null,
  price_minor integer check (price_minor is null or price_minor >= 0),
  currency text check (currency in ('GBP', 'USD', 'EUR')),
  payment_enabled boolean not null default false,
  benefits jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'inactive'
    check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  provider text not null default 'none',
  provider_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_products (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('learning-pack', 'course', 'creator-resource')),
  title text not null,
  summary text not null default '',
  price_minor integer not null check (price_minor >= 0),
  currency text not null check (currency in ('GBP', 'USD', 'EUR')),
  status text not null default 'draft'
    check (status in ('draft', 'in-review', 'published', 'suspended')),
  moderation_approved_at timestamptz,
  source_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.marketplace_products(id),
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null check (currency in ('GBP', 'USD', 'EUR')),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  provider text not null default 'none',
  provider_payment_id text unique,
  created_at timestamptz not null default now(),
  refunded_at timestamptz
);

create table if not exists public.revenue_ledger (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null unique references public.purchases(id) on delete restrict,
  creator_id uuid not null references public.profiles(id),
  platform_fee_bps integer not null check (platform_fee_bps between 0 and 10000),
  creator_amount_minor integer not null check (creator_amount_minor >= 0),
  platform_amount_minor integer not null check (platform_amount_minor >= 0),
  currency text not null check (currency in ('GBP', 'USD', 'EUR')),
  created_at timestamptz not null default now()
);

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  content_id text,
  product_id uuid references public.marketplace_products(id) on delete set null,
  reason text not null,
  details text not null default '',
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_notes text,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Operational controls and monitoring
-- ---------------------------------------------------------------------------

create table if not exists public.system_controls (
  id boolean primary key default true check (id),
  payments_enabled boolean not null default false,
  ai_provider_enabled boolean not null default false,
  emergency_shutdown boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.system_controls (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.health_checks (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null default now(),
  scope text not null,
  source text not null default 'scheduled',
  checks jsonb not null default '[]'::jsonb,
  counts jsonb not null default '{}'::jsonb,
  notes text
);

-- ---------------------------------------------------------------------------
-- Helpers, indexes and triggers
-- ---------------------------------------------------------------------------

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated;

create or replace function public.guard_creator_profile_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
begin
  if new.status is distinct from old.status and not public.is_owner() then
    raise exception 'Only platform owners can change creator approval status'
      using errcode = '42501';
  end if;
  return new;
end;
$;

revoke all on function public.guard_creator_profile_status() from public;
grant execute on function public.guard_creator_profile_status() to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $
begin
  new.updated_at = now();
  return new;
end;
$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create index if not exists content_items_status_idx on public.content_items(status);
create index if not exists production_jobs_status_idx on public.production_jobs(status);
create index if not exists production_jobs_created_by_idx on public.production_jobs(created_by);
create index if not exists marketplace_products_status_idx on public.marketplace_products(status);
create index if not exists purchases_buyer_idx on public.purchases(buyer_id);
create index if not exists purchases_product_idx on public.purchases(product_id);
create index if not exists moderation_reports_status_idx on public.moderation_reports(status);
create index if not exists health_checks_checked_at_idx on public.health_checks(checked_at desc);

drop trigger if exists creator_profiles_status_guard on public.creator_profiles;
create trigger creator_profiles_status_guard before update on public.creator_profiles
for each row execute function public.guard_creator_profile_status();

drop trigger if exists creator_profiles_touch on public.creator_profiles;
create trigger creator_profiles_touch before update on public.creator_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists learning_state_touch on public.learning_state;
create trigger learning_state_touch before update on public.learning_state
for each row execute function public.touch_updated_at();

drop trigger if exists content_items_touch on public.content_items;
create trigger content_items_touch before update on public.content_items
for each row execute function public.touch_updated_at();

drop trigger if exists production_jobs_touch on public.production_jobs;
create trigger production_jobs_touch before update on public.production_jobs
for each row execute function public.touch_updated_at();

drop trigger if exists products_touch on public.marketplace_products;
create trigger products_touch before update on public.marketplace_products
for each row execute function public.touch_updated_at();

drop trigger if exists reports_touch on public.moderation_reports;
create trigger reports_touch before update on public.moderation_reports
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Every exposed table below has RLS enabled. There is no client-side owner gate.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.learning_state enable row level security;
alter table public.platform_admins enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.content_items enable row level security;
alter table public.production_jobs enable row level security;
alter table public.video_assets enable row level security;
alter table public.ai_usage enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.marketplace_products enable row level security;
alter table public.purchases enable row level security;
alter table public.revenue_ledger enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.system_controls enable row level security;
alter table public.admin_audit enable row level security;
alter table public.health_checks enable row level security;

-- Profiles: a learner can only read/update their own row. Owners can inspect all.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select using (auth.uid() = id or public.is_owner());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (auth.uid() = id or public.is_owner())
with check (auth.uid() = id or public.is_owner());

-- Learning state: owner of the row only.
drop policy if exists learning_state_select_own on public.learning_state;
create policy learning_state_select_own on public.learning_state
for select using (auth.uid() = user_id or public.is_owner());

drop policy if exists learning_state_insert_own on public.learning_state;
create policy learning_state_insert_own on public.learning_state
for insert with check (auth.uid() = user_id);

drop policy if exists learning_state_update_own on public.learning_state;
create policy learning_state_update_own on public.learning_state
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Admin membership is readable only by owners; writes happen out-of-band.
drop policy if exists platform_admins_owner_select on public.platform_admins;
create policy platform_admins_owner_select on public.platform_admins
for select using (public.is_owner());

-- Creator profiles: public display data for approved creators; own edits.
drop policy if exists creator_profiles_public_read on public.creator_profiles;
create policy creator_profiles_public_read on public.creator_profiles
for select using (status = 'approved' or auth.uid() = user_id or public.is_owner());

drop policy if exists creator_profiles_own_write on public.creator_profiles;
create policy creator_profiles_own_write on public.creator_profiles
for insert with check (auth.uid() = user_id and status = 'pending');

-- Creator profile updates are row-scoped; a trigger independently prevents self-approval.
drop policy if exists creator_profiles_pending_update on public.creator_profiles;
drop policy if exists creator_profiles_approved_update on public.creator_profiles;
drop policy if exists creator_profiles_owner_update on public.creator_profiles;
drop policy if exists creator_profiles_own_update on public.creator_profiles;
create policy creator_profiles_own_update on public.creator_profiles
for update using (auth.uid() = user_id or public.is_owner())
with check (auth.uid() = user_id or public.is_owner());

-- Content: published rows are public; owners can manage everything.
drop policy if exists content_items_public_read on public.content_items;
create policy content_items_public_read on public.content_items
for select using (status = 'published' or public.is_owner());

drop policy if exists content_items_owner_write on public.content_items;
create policy content_items_owner_write on public.content_items
for all using (public.is_owner()) with check (public.is_owner());

-- Production jobs/assets: owner-only operational records.
drop policy if exists production_jobs_owner on public.production_jobs;
create policy production_jobs_owner on public.production_jobs
for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists video_assets_owner on public.video_assets;
create policy video_assets_owner on public.video_assets
for all using (public.is_owner()) with check (public.is_owner());

-- AI usage: learners can inspect their own usage; only server writes.
drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage
for select using (auth.uid() = user_id or public.is_owner());

-- Plans: public read of active plans; owner writes.
drop policy if exists plans_public_read on public.plans;
create policy plans_public_read on public.plans
for select using (active = true or public.is_owner());

drop policy if exists plans_owner_write on public.plans;
create policy plans_owner_write on public.plans
for all using (public.is_owner()) with check (public.is_owner());

-- Subscriptions/purchases/ledger: own read, owner read; server-side writes.
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
for select using (auth.uid() = user_id or public.is_owner());

drop policy if exists purchases_select_own on public.purchases;
create policy purchases_select_own on public.purchases
for select using (auth.uid() = buyer_id or public.is_owner());

drop policy if exists revenue_ledger_select_own on public.revenue_ledger;
create policy revenue_ledger_select_own on public.revenue_ledger
for select using (auth.uid() = creator_id or public.is_owner());

-- Marketplace products: published public, creator own, owner all.
drop policy if exists products_public_read on public.marketplace_products;
create policy products_public_read on public.marketplace_products
for select using (status = 'published' or auth.uid() = creator_id or public.is_owner());

drop policy if exists products_creator_write on public.marketplace_products;
create policy products_creator_write on public.marketplace_products
for insert with check (
  auth.uid() = creator_id
  and status in ('draft', 'in-review')
  and moderation_approved_at is null
);

drop policy if exists products_creator_update on public.marketplace_products;
create policy products_creator_update on public.marketplace_products
for update using (auth.uid() = creator_id)
with check (
  auth.uid() = creator_id
  and status in ('draft', 'in-review')
  and moderation_approved_at is null
);

drop policy if exists products_owner_update on public.marketplace_products;
create policy products_owner_update on public.marketplace_products
for update using (public.is_owner()) with check (public.is_owner());

-- Moderation: reporters create/read their own; owners manage every report.
drop policy if exists reports_insert_own on public.moderation_reports;
create policy reports_insert_own on public.moderation_reports
for insert with check (
  auth.uid() = reporter_id
  and status = 'open'
  and resolved_by is null
  and resolution_notes is null
);

drop policy if exists reports_select_own on public.moderation_reports;
create policy reports_select_own on public.moderation_reports
for select using (auth.uid() = reporter_id or public.is_owner());

drop policy if exists reports_owner_update on public.moderation_reports;
create policy reports_owner_update on public.moderation_reports
for update using (public.is_owner()) with check (public.is_owner());

-- System controls and audit: owner reads; server/service role writes.
drop policy if exists controls_owner_read on public.system_controls;
create policy controls_owner_read on public.system_controls
for select using (public.is_owner());

drop policy if exists audit_owner_read on public.admin_audit;
create policy audit_owner_read on public.admin_audit
for select using (public.is_owner());

drop policy if exists health_owner_read on public.health_checks;
create policy health_owner_read on public.health_checks
for select using (public.is_owner());

-- Do not grant anon write access to private tables.
revoke insert, update, delete on public.profiles from anon;
revoke insert, update, delete on public.learning_state from anon;
revoke insert, update, delete on public.ai_usage from anon;
revoke insert, update, delete on public.subscriptions from anon;
revoke insert, update, delete on public.purchases from anon;
revoke insert, update, delete on public.revenue_ledger from anon;
revoke insert, update, delete on public.system_controls from anon;
revoke insert, update, delete on public.admin_audit from anon;
revoke insert, update, delete on public.health_checks from anon;
