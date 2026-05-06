-- v4_items_unique_constraint_migration.sql
-- Adds the unique constraint required for merge-duplicates upserts on v4_items.
-- Without this, PostgREST INSERT with resolution=merge-duplicates falls back to plain INSERT,
-- creating duplicate rows on every document re-upload.
--
-- Also adds the same for v4_sections so its upsert path works correctly.
--
-- Run this after v4_schema_repair_migration.sql.

-- v4_items: unique per (document_id, item_number)
ALTER TABLE public.v4_items
  ADD CONSTRAINT v4_items_document_id_item_number_unique
  UNIQUE (document_id, item_number);

-- v4_sections: unique per (document_id, section_id)
ALTER TABLE public.v4_sections
  ADD CONSTRAINT v4_sections_document_id_section_id_unique
  UNIQUE (document_id, section_id);

-- Refresh the PostgREST schema cache so the new constraints are recognized.
NOTIFY pgrst, 'reload schema';
