-- 🐾 Migration: Pet Appearance Storage — color_pattern (PATTERN_STORAGE_DESIGN ทางเลือก A + CHECK)
--
-- Status: APPROVED (Reconcile 2026-09-26) — applied on prod by repo owner via SQL Editor
-- BEFORE any code that uses this column (deploy checklist §5 of PATTERN_STORAGE_DESIGN).
-- Boundary: Pet domain only — Life Journey Event columns live in a separate migration
-- (20260926200000) so a failure here is diagnosable per domain.
--
-- Contract (PET_APPEARANCE_MODEL):
--   color_pattern = รูปแบบการกระจายสีบนตัว (Solid/Tricolor/Tabby/...) — คนละ semantic
--   กับ colors (สีจริง, space-joined) และกับ Color Count (derived, ไม่ถูกเก็บ)
--   1 ตัวมี 1 ค่า (1:1) · NULL = ยังไม่ระบุ · ห้าม derive จากสี
--
-- Idempotent · Additive only · No backfill (derive Pattern ไม่ได้ตาม Contract —
-- ค่าเก่าให้กรอกภายหลังผ่าน UI/SQL) · No RLS/GRANT changes (คอลัมน์ใหม่อยู่ใต้
-- policies + grants เดิมของตาราง pets)
--
-- Apply/read-back evidence: 2026-09-26 — GET /rest/v1/pets?select=id,color_pattern → 200
-- Test Case ปิดท้าย slice Pattern Input: ขนมครก — colors[ส้ม,ขาว,ดำ] + color_pattern='tricolor'
--   + count แสดง "3 สี"

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS color_pattern TEXT;

-- Vocabulary lock at DB level — ด่านสุดท้ายกับการเขียนมือผ่าน SQL Editor
-- (หลักฐาน hand-patch: pet_* / ev_* policies) · เพิ่มค่าใหม่ภายหลัง = ALTER constraint ครั้งเดียว
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pets_color_pattern_allowed'
  ) THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_color_pattern_allowed
      CHECK (color_pattern IS NULL OR color_pattern IN (
        'solid','bicolor','tricolor','tabby','calico','tortoiseshell','tuxedo','pointed','other'
      ));
  END IF;
END$$;
