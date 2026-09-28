-- 🐾 Migration: Birth Info — component-based storage (V.0.999)
--
-- Status: APPROVED (V.0.999 Reconcile 2026-09-28) — apply on prod BEFORE any UI that
-- writes these columns. Boundary: Birth domain only — ไม่แตะ breed/color vocab,
-- ไม่แตะ RLS/GRANT, ไม่แตะตารางอื่น
--
-- Why (Domain Rule 1–2: "ผู้ใช้บันทึกเฉพาะสิ่งที่ตนรู้ · Unknown/Incomplete = valid"):
--   birth_date DATE บังคับความแม่นยำระดับวัน — ผู้ใช้ที่รู้แค่ "เกิดปี 2020" ต้องกรอก
--   2020-01-01 ซึ่งเป็นข้อมูลที่ผู้ใช้ไม่เคยรู้จริง (fake date) · DB ต้องไม่เก็บความหมาย
--   ที่ต้นทางไม่ยืนยัน
--
-- Contract (BirthInfo — component storage + explicit precision):
--   birth_year      INTEGER NOT NULL เมื่อบันทึก (พร้อม CHECK 1900..2100)
--   birth_month     INTEGER NULL (1..12) — NULL เมื่อรู้แค่ปี
--   birth_day       INTEGER NULL (1..31) — NULL เมื่อรู้แค่ปี/เดือน
--   birth_precision TEXT 'year' | 'month' | 'exact' — NOT NULL เมื่อบันทึก
--   Shape (DB-locked เช่นเดียวกับ pets_breed_status_shape):
--     year   → year ✓, month NULL, day NULL
--     month  → year ✓, month ✓, day NULL
--     exact  → year ✓, month ✓, day ✓
--
-- birth_date เดิม (DATE, nullable) คงอยู่แบบ additive — ไม่ลบ ไม่ backfill:
--   ค่าเดิมทั้งหมดมาจาก Birth Wizard ที่บังคับ exact date จึงอ่านเป็น precision='exact'
--   ได้เสมอผ่าน read adapter (adapter ใช้ birth_precision เป็นตัวตั้ง — ถ้า NULL และมี
--   birth_date = legacy row ที่ exact อยู่แล้ว) · การเขียนใหม่ผ่าน UI จะเขียน component
--   fields + precision เป็นหลัก
--
-- Idempotent · Additive only · No RLS/GRANT changes (คอลัมน์ใหม่อยู่ใต้ policies เดิม)

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS birth_year INTEGER;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS birth_month INTEGER;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS birth_day INTEGER;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS birth_precision TEXT;

-- ── Shape + range locks (literal ใน CHECK — DB เป็นด่านสุดท้ายจริง) ──────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_birth_precision_allowed') THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_birth_precision_allowed
      CHECK (birth_precision IS NULL OR birth_precision IN ('year','month','exact'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_birth_year_range') THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_birth_year_range
      CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_birth_month_range') THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_birth_month_range
      CHECK (birth_month IS NULL OR birth_month BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_birth_day_range') THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_birth_day_range
      CHECK (birth_day IS NULL OR birth_day BETWEEN 1 AND 31);
  END IF;

  -- Shape rule — บังคับสามแบบเท่านั้น (ตารางเดียวกับ doc ของ task):
  --   year  : month NULL และ day NULL
  --   month : month NOT NULL และ day NULL
  --   exact : month NOT NULL และ day NOT NULL
  -- year NOT NULL ทุกกรณีที่ precision ถูกตั้ง
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_birth_shape') THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_birth_shape CHECK (
        birth_precision IS NULL
        OR (
          birth_year IS NOT NULL
          AND (
            (birth_precision = 'year'  AND birth_month IS NULL AND birth_day IS NULL)
            OR (birth_precision = 'month' AND birth_month IS NOT NULL AND birth_day IS NULL)
            OR (birth_precision = 'exact' AND birth_month IS NOT NULL AND birth_day IS NOT NULL)
          )
        )
      );
  END IF;
END$$;

-- No backfill: birth_date เดิมคงอยู่และอ่านผ่าน adapter (precision='exact' โดยตีความ) —
-- ระบบไม่ตัดสินแทนผู้ใช้ว่าแถวเดิม "จริง ๆ รู้ระดับไหน" (Domain Rule 6)
