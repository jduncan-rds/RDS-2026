-- Phase 7 — allow pre-created orders to exist before we know the buyer.
--
-- Orders are inserted at Stripe Checkout Session creation with status
-- 'pending'. At that point there is no authenticated user (auth is Phase 8)
-- and no email yet (Stripe collects it during checkout). The original
-- user_or_guest constraint required one of them up front, which blocked
-- pre-creation. Relax it so a *pending* order may lack both, but any order
-- past pending (confirmed/shipped/complete) must still identify the buyer.
--
-- Run in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/bamynwtivnstsaqfbslu/sql

alter table public.orders
  drop constraint if exists user_or_guest;

alter table public.orders
  add constraint user_or_guest check (
    status = 'pending'
    or user_id is not null
    or guest_email is not null
  );
