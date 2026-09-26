-- 🐾 Migration Fix: pets schema drift — Restore Repo Contract (2026-09-26)
--
-- Root cause (evidence chain in docs/PET_INSERT_ROOT_CAUSE.md):
--   Production `pets` table was missing `nickname` and `color` columns that exist
--   in repo migration 20260827130000_init_full_schema.sql (L39, L44).
--   Every pets INSERT from both birth wizard (birth/page.tsx:197,202) and direct
--   add (pets/page.tsx) sent `nickname`/`color` keys → PostgREST PGRST204
--   ("Could not find the column") → PET_INSERT failed silently as generic
--   "เกิดข้อผิดพลาด" while LITTER_INSERT succeeded, leaving orphan litters #010–#014.
--
-- Idempotent, additive only, matches repo contract exactly:
--   nickname TEXT (init_full_schema.sql:39)
--   color    TEXT (init_full_schema.sql:44)
-- No conflicting migration exists in repo (verified: no later migration references
-- nickname/color definitions, no DROP COLUMN anywhere).
--
-- Applied on production via Supabase SQL Editor: 2026-09-26 (by repo owner).
-- Post-apply read-back: GET /rest/v1/pets?select=id,nickname,color → 200 [].

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS nickname TEXT;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS color TEXT;
