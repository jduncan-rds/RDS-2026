-- Adds a tax_amount column to orders, recorded from Stripe's actual
-- total_details.amount_tax once Stripe Tax is enabled (0 until then).
-- orders.total is authoritative and now updated on webhook confirm from
-- Stripe's amount_total, so it reflects tax when present.
-- Existing rows default to 0 (they predate tax collection).

alter table public.orders
  add column if not exists tax_amount integer not null default 0;
