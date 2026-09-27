-- 🐾 Migration: Pet Identity Domain — Breed / Color / Pattern (Task §1–§7, §13)
--
-- Status: DRAFT → apply on prod via SQL Editor BEFORE code that uses these columns
-- (deploy checklist of PATTERN_STORAGE_DESIGN §5 — same house workflow).
-- Boundary: Pet Identity domain only — ไม่แตะ life_journey_events, ไม่แตะ RLS/GRANT.
--
-- Contract (PET IDENTITY — "มีข้อมูลให้ แต่ไม่ตัดสิน"):
--   breed_status          'purebred' | 'mixed' | 'unknown' | NULL (ยังไม่ระบุ)
--                         NULL = legacy/ยังไม่ได้กรอก — ไม่ backfill เพราะ derive จาก
--                         breed เดิมไม่ได้ (breed เดิมเป็น free text อ่านอย่างเดียว)
--   breed_ids TEXT[]      Known Breeds — stable keys (persian, scottish_fold, …)
--                         purebred → exactly 1 · mixed → 0..N (0 = "ผสมแต่ไม่รู้ผสมอะไร"
--                         เป็นข้อมูลจริง ห้ามบังคับ ≥1) · unknown → ห้ามมี
--   dominant_breed_id     Owner Observation — "ลักษณะที่เจ้าของสังเกตว่าดูเด่น/คล้าย"
--                         อ้างได้ทั้ง vocab (ไม่จำกัดเฉพาะ breed_ids — เจ้าของอาจเห็น
--                         ลักษณะคล้าย breed ที่ไม่ได้อยู่ใน Known Breeds)
--                         ห้าม auto-select จากพ่อ/แม่ · ไม่ใช่ DNA result
--   colors TEXT[]         สีจริงหลายสี — stable keys (orange, white, …)
--                         color_count = count(colors) เป็น DERIVED — ไม่มี column
--   color_pattern         คงเดิม (migration 20260926100000) — แยก semantic จาก colors
--
-- Lineage (father_id/mother_id มีอยู่แล้ว ตาม migration 20260901200000) ยังเป็นข้อมูล
-- ที่มาเท่านั้น — ห้าม auto-copy breed จาก parent ไป child (task §7) — ไม่มี column
-- ใหม่ในชั้น lineage, ไม่ flatten ancestry ลง breed_ids
--
-- Vocabulary enforcement (clarification #1): vocab เป็น LITERAL ใน CHECK constraint
-- ไม่ใช่ application-only validation — DB ตรวจเองได้จริง ขยาย vocab = migration
-- เดียว (drop + re-add constraint) ตาม workflow เดิม
--
-- Idempotent · Additive only · No backfill (ค่าเก่าอ่านผ่าน legacy adapter ที่ app —
-- pets.breed TEXT คงอยู่) · No RLS/GRANT changes (คอลัมน์ใหม่อยู่ใต้ policies เดิม)

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS breed_status TEXT;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS breed_ids TEXT[];

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS dominant_breed_id TEXT;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS colors TEXT[];

-- ── Vocabulary locks (literal ใน constraint — DB เป็นด่านสุดท้ายจริง) ──────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_breed_status_allowed') THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_breed_status_allowed
      CHECK (breed_status IS NULL OR breed_status IN ('purebred','mixed','unknown'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_breed_ids_allowed') THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_breed_ids_allowed
      CHECK (breed_ids IS NULL OR breed_ids <@ ARRAY[
        'persian','scottish_fold','british_shorthair','khao_manee','wichianmat',
        'orange_tabby','golden_shorthair','other'
      ]::text[]);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_dominant_breed_id_allowed') THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_dominant_breed_id_allowed
      CHECK (dominant_breed_id IS NULL OR dominant_breed_id IN (
        'persian','scottish_fold','british_shorthair','khao_manee','wichianmat',
        'orange_tabby','golden_shorthair','other'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_colors_allowed') THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_colors_allowed
      CHECK (colors IS NULL OR colors <@ ARRAY[
        'orange','white','black','gray','brown','cream','blue'
      ]::text[]);
  END IF;

  -- Shape rule (clarification #2 encoded at DB — not app-only):
  --   purebred → exactly 1 breed_id · unknown → 0 breeds · mixed → free (0..N)
  -- COALESCE เพราะ breed_ids NULL ทำให้ array_length/cardinality คืน NULL —
  -- และ CHECK ที่ผลลัพธ์ NULL = ผ่าน (hole: purebred + breed_ids NULL จะหลุด) —
  -- ต้อง normalize เป็น 0 ก่อนเปรียบเทียบเสมอ
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_breed_status_shape') THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_breed_status_shape CHECK (
        breed_status IS NULL
        OR (breed_status = 'purebred' AND COALESCE(cardinality(breed_ids), 0) = 1)
        OR (breed_status = 'unknown'  AND COALESCE(cardinality(breed_ids), 0) = 0)
        OR breed_status = 'mixed'
      );
  END IF;
END$$;

-- No backfill: pets.breed (legacy free text) คงอยู่และอ่านผ่าน legacy adapter
-- (petIdentity.ts) — ระบบ derive breed_status จาก free text ไม่ได้ตาม Contract
-- ("มีข้อมูลให้ แต่ไม่ตัดสิน") จึงปล่อย NULL ให้เจ้าของบ้านกรอกผ่าน UI
