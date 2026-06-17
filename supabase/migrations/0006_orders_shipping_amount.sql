-- Adds a shipping_amount column to orders so the shipping portion of an order
-- is recorded separately (orders.total is the grand total incl. shipping).
-- Existing rows default to 0 (they predate shipping charges).

alter table public.orders
  add column if not exists shipping_amount integer not null default 0;
