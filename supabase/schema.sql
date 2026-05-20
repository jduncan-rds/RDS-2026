-- Robert Duncan Fine Art — Initial Schema
-- Run this in the Supabase SQL editor: https://supabase.com/dashboard/project/bamynwtivnstsaqfbslu/sql

-- ─────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- favorites
-- ─────────────────────────────────────────
create table if not exists public.favorites (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles on delete cascade,
  sanity_artwork_id   text not null,
  created_at          timestamptz not null default now(),
  unique (user_id, sanity_artwork_id)
);

alter table public.favorites enable row level security;

create policy "Users can manage their own favorites"
  on public.favorites for all
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- orders
-- ─────────────────────────────────────────
create type public.order_status as enum ('pending', 'confirmed', 'shipped', 'complete');

create table if not exists public.orders (
  id                        uuid primary key default gen_random_uuid(),
  stripe_payment_intent_id  text unique,
  user_id                   uuid references public.profiles on delete set null,
  guest_email               text,
  status                    public.order_status not null default 'pending',
  shipping_address          jsonb,
  total                     integer not null,
  created_at                timestamptz not null default now(),
  constraint user_or_guest check (user_id is not null or guest_email is not null)
);

alter table public.orders enable row level security;

create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- Service role bypasses RLS for webhook writes — no insert policy needed for users

-- ─────────────────────────────────────────
-- order_items
-- ─────────────────────────────────────────
create type public.media_type as enum ('original', 'open_edition', 'pod_paper', 'pod_canvas');

create table if not exists public.order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders on delete cascade,
  sanity_product_id   text not null,
  title_snapshot      text not null,
  image_url_snapshot  text,
  media_type          public.media_type not null,
  size                text,
  frame_id            text,
  quantity            integer not null default 1,
  unit_price          integer not null
);

alter table public.order_items enable row level security;

create policy "Users can view items from their own orders"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- processed_webhook_events (idempotency)
-- ─────────────────────────────────────────
create table if not exists public.processed_webhook_events (
  stripe_event_id   text primary key,
  processed_at      timestamptz not null default now()
);

-- Service role bypasses RLS entirely, so enabling it here just locks out client access (correct)
alter table public.processed_webhook_events enable row level security;
