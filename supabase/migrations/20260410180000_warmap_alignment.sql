-- ─────────────────────────────────────────
-- WarMap Items — Add North Star alignment
-- ─────────────────────────────────────────

-- Add alignment notes field to warmap_items
alter table warmap_items
  add column if not exists north_star_alignment text;

-- Optional: Add index for querying items with alignment
create index if not exists idx_warmap_items_alignment on warmap_items(north_star_alignment) 
  where north_star_alignment is not null;