-- Phase 10: calendars / cards / gifts ride through order_items as
-- media_type='simple'. Extend the existing enum to accept it. Idempotent —
-- IF NOT EXISTS guards a re-run.

alter type public.media_type add value if not exists 'simple';
