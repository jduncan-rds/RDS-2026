-- Phase 8 — link Supabase profiles to Stripe customers.
--
-- When an authenticated user reaches checkout, we attach a Stripe Customer
-- to the Checkout Session via `customer: <stripe_customer_id>`. Stripe then
-- prefills email + saved shipping addresses for the buyer on the hosted
-- payment page. The customer record holds shipping addresses only — cards
-- are NOT saved (we never set `setup_future_usage`), so each checkout uses
-- a fresh card and PCI scope stays entirely with Stripe.
--
-- The id is written by the server (service role) the first time an authed
-- user checks out, then reused on subsequent checkouts.
--
-- Run in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/bamynwtivnstsaqfbslu/sql

alter table public.profiles
  add column if not exists stripe_customer_id text unique;
