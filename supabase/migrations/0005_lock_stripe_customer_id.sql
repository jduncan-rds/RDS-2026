-- Phase 10 hardening — `profiles.stripe_customer_id` is written by the server
-- (service role) on first authed checkout and is then load-bearing for
-- prefilling buyer info on subsequent Stripe Checkout Sessions. Without
-- column-level lockdown, a user could PATCH their own row to point at someone
-- else's Stripe Customer (if its id were ever known) and inherit their saved
-- shipping address on the next checkout.
--
-- Postgres supports column-level GRANTs. Revoking UPDATE on this single
-- column from `authenticated` (and `anon`, for paranoia) means clients can
-- still update full_name etc., but the column is server-write-only. Service
-- role bypasses all of this and continues to work.
--
-- Run in the Supabase SQL editor:
--   https://supabase.com/dashboard/project/bamynwtivnstsaqfbslu/sql

revoke update (stripe_customer_id) on public.profiles from authenticated;
revoke update (stripe_customer_id) on public.profiles from anon;
