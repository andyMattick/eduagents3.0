# Phase 1 Supabase Safe Cleanup Checklist

Use this procedure for each candidate legacy table (for example: v4_items, v4_sections, v4_analysis, user_daily_simulations_legacy, cognitive_templates).

## 1. Confirm code-level references

- Search app, api, lib, scripts, and tests for table names.
- Include dynamic query builders and string interpolation patterns.
- Mark each match as read, write, policy, migration, or comment-only.

Suggested commands:

- rg "v4_items|v4_sections|v4_analysis|user_daily_simulations_legacy|cognitive_templates" src api lib scripts tests
- rg "from\(|supabaseRest\(|rest/v1/" src api lib

## 2. Confirm runtime query usage

- Inspect Supabase query logs for the table over a representative window.
- Confirm whether reads/writes come from active routes or old jobs.
- Separate production traffic from local/dev noise.

Checklist:

- Last observed SELECT timestamp
- Last observed INSERT/UPDATE/DELETE timestamp
- Caller endpoint or service identity

## 3. Confirm dependency graph (FKs, views, materialized views)

- Check inbound and outbound foreign keys.
- Check views and materialized views selecting from the table.
- Check constraints that will fail after drop.

SQL:

- select conname, conrelid::regclass as child_table, confrelid::regclass as parent_table from pg_constraint where contype = 'f' and (conrelid::regclass::text = '<table>' or confrelid::regclass::text = '<table>');
- select schemaname, viewname from pg_views where definition ilike '%<table>%';
- select schemaname, matviewname from pg_matviews where definition ilike '%<table>%';

## 4. Confirm functions and triggers

- Find RPC functions that query or mutate the table.
- Find triggers that populate deprecated columns or sync data.

SQL:

- select n.nspname as schema_name, p.proname as function_name from pg_proc p join pg_namespace n on n.oid = p.pronamespace where pg_get_functiondef(p.oid) ilike '%<table>%';
- select event_object_table, trigger_name, action_statement from information_schema.triggers where action_statement ilike '%<table>%';

## 5. Confirm RLS policy references

- Check policies on the table and policies on other tables referencing it.
- Flag policy expressions containing v3, v4, old_owner_id, or legacy_user_id.

SQL:

- select schemaname, tablename, policyname, qual, with_check from pg_policies where tablename = '<table>' or qual ilike '%<table>%' or with_check ilike '%<table>%';

## 6. Confirm storage object coupling

- Identify buckets whose lifecycle is tied to rows in the table.
- Verify no cleanup jobs still depend on table IDs.

Candidates to remove when unused:

- v3-documents
- v4-documents
- legacy-ingestion

## 7. Confirm API route ownership

- Map table usage to live routes only: ingestion, simulation, feedback loop.
- Mark routes as active, deprecated, or removable.

## 8. Execute two-phase migration

- Phase A: disable writes, keep reads, and monitor errors.
- Phase B: drop table/columns/policies/functions/triggers after clean monitoring window.
- Include rollback SQL for recreate or restore.

## 9. Final validation gate before drop

- npm test
- npm run phase1:check
- npm run phase3:check
- Run targeted regression for ingestion/doc flow when relevant.

## 10. Candidate removals after validation

Tables:

- old_items
- legacy_documents
- v3_segments
- v4_items
- simulation_cache (only if replaced by snapshot)

Columns:

- difficulty_old
- linguisticLoad_old
- bloom_old
- concepts_raw
- steps_raw

Policies/functions/triggers:

- remove legacy references to v3, v4, old_owner_id, legacy_user_id
- remove deprecated RPC functions not used by ingestion, segmentation, item parsing, simulation, feedback loop
- remove triggers that fill deprecated columns

Add one enforcing migration that locks the canonical schema after cleanup.
