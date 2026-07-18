-- Adds a frame_name_snapshot column to order_items, capturing the frame's
-- display name at checkout time (same snapshot pattern as sku_snapshot) so
-- fulfillment (ShipStation) and order history can show which frame was
-- picked without re-resolving frame_id against Sanity, which may not have
-- that frame document anymore.
-- Existing rows default to null (they predate this column; frame_id alone
-- is all that's available for them).

alter table public.order_items
  add column if not exists frame_name_snapshot text;
