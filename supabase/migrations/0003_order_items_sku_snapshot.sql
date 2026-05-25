-- Phase 10: snapshot the resolved SKU on each line item so fulfillment never
-- has to re-derive it from Sanity (where catalog state may drift). Nullable for
-- backfill; webhook falls back to the existing composite SKU pattern when
-- absent (pre-Phase-10 orders).

alter table order_items
  add column if not exists sku_snapshot text;
