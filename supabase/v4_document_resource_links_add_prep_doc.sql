-- Add prep-doc as a valid companion resource type.
-- Safe additive migration for existing environments.

alter table public.v4_document_resource_links
  drop constraint if exists v4_document_resource_links_resource_type_check;

alter table public.v4_document_resource_links
  add constraint v4_document_resource_links_resource_type_check
  check (resource_type in ('answer-key', 'worked-solution', 'rubric', 'prep-doc'));
