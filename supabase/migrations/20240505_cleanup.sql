-- Step C cleanup migration
-- Safe removals validated by SUPABASE_USAGE_AUDIT.json (no code references)

drop table if exists old_items cascade;
drop table if exists legacy_documents cascade;
drop table if exists v3_segments cascade;
drop table if exists simulation_cache cascade;
