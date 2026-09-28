-- 🏠 Migration: Home Identity MVP — homes.updated_at
--
-- Status: DRAFT → apply on prod via SQL Editor BEFORE code that uses this column
-- (same house workflow as 20260927100000_add_pet_identity_domain.sql).
-- Boundary: Home Identity domain only — ไม่แตะ home_members, pets, life_journey_events,
--           ไม่แตะ RLS/GRANT (คอลัมน์ใหม่อยู่ใต้ policy เดิม "Owner full access on homes").
--
-- Contract (HOME IDENTITY — "บ้านที่ข้อมูลยังไม่ครบ ถือเป็น Valid State ไม่ใช่ Error"):
--   homes.updated_at TIMESTAMPTZ  timestamp ของการแก้ไข Home Identity ล่าสุด
--                                 (name / description) — ใช้โดย Home Identity editor ที่ /world
--                                 NULL = ยังไม่เคยแก้ไขหลังสร้าง (valid state)
--   Trigger set_updated_at        ตั้งค่าอัตโนมัติตอน UPDATE แถว homes — ไม่ใช่ application discipline
--
-- Multi-home note (Data Contract LOCKED 2026-09-28):
--   ไม่มี unique(owner_id) ใด ๆ — User 1 คนมีได้หลายบ้าน (ตาม PRODUCT_VISION "1 User = Multiple Homes")
--   ไม่มี parent_home_id — Nested Home (Child Home vs Space) ยังเป็น OPEN Domain Question
--   ห้ามเพิ่ม constraint ที่ปิดทางต่อยอดทั้งสองกรณี
--
-- Idempotent · Additive only · No backfill · No RLS/GRANT changes

ALTER TABLE public.homes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Trigger: ตั้ง updated_at อัตโนมัติทุกครั้งที่ UPDATE แถวใน homes
-- (ใช้ function แยกชื่อเฉพาะ home — ไม่ไปแตะ trigger/pattern ของ pets)
CREATE OR REPLACE FUNCTION public.set_homes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_homes_updated_at ON public.homes;
CREATE TRIGGER trg_homes_updated_at
  BEFORE UPDATE ON public.homes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_homes_updated_at();
