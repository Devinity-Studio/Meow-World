-- 🐾 Migration: Breed Semantic Correction — korat + thai_native, ถอด colour-ish breeds
--
-- Status: APPROVED (V.0.999 Reconcile 2026-09-28) — apply on prod BEFORE any UI that
-- offers the new vocabulary (same house workflow: SQL Editor / db push).
-- Boundary: Breed vocabulary only — ไม่แตะ Color/Pattern/Status vocab, ไม่แตะ RLS/GRANT,
--           ไม่แตะตารางอื่น
--
-- Why (Semantic Correction — รากของ Domain):
--   orange_tabby  = สี + ลาย (colour/pattern semantics) — ไม่ใช่ breed
--   golden_shorthair = สี + ความยาวขน — ไม่ใช่ breed
--   Domain Rule 3: "Breed ต้องเป็น Breed จริง ไม่เอา Colour / Pattern / Coat มาปะปน"
--   แมวส้มลายไทยที่แท้จริง = ไทยพื้นบ้าน (thai_native) + colors[orange] + pattern(tabby)
--   — แยกชั้นความหมายชัดเจนแทนการกลืนสอง domain เป็น key เดียว
--
-- Change:
--   + korat        โคราช / สีสวาด (Khao Manee, Wichianmat อยู่แล้ว — ครบแมวไทยแท้ V.0.999)
--   + thai_native  ไทยพื้นบ้าน
--   − orange_tabby, golden_shorthair (ย้ายความหมายไป colors + color_pattern ที่มีอยู่แล้ว)
--
-- Safety:
--   Production pets = [] (verified 2026-09-28 via PostgREST count) — การ drop/re-add
--   constraint จึงไม่มีแถวใดพาดุลย์ผ่าน CHECK ไม่ได้ · ไม่ backfill · ไม่ destructive
--   ต่อข้อมูล (ไม่มี DROP COLUMN/TABLE, ไม่มี DELETE)
--
-- Idempotent · Additive-only vocabulary change · No RLS/GRANT changes
-- ขยาย/ถอน vocab ภายหลัง = migration เดียว (drop + re-add constraint) ตาม workflow เดิม

DO $$
BEGIN
  -- breed_ids: ถอด 2 key เดิม + เพิ่ม 2 key ใหม่
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_breed_ids_allowed') THEN
    ALTER TABLE public.pets DROP CONSTRAINT pets_breed_ids_allowed;
  END IF;
  ALTER TABLE public.pets
    ADD CONSTRAINT pets_breed_ids_allowed
    CHECK (breed_ids IS NULL OR breed_ids <@ ARRAY[
      'persian','scottish_fold','british_shorthair','khao_manee','wichianmat',
      'korat','thai_native','other'
    ]::text[]);

  -- dominant_breed_id: ชุดเดียวกับ breed_ids (owner observation อ้างได้ทั้ง vocab)
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pets_dominant_breed_id_allowed') THEN
    ALTER TABLE public.pets DROP CONSTRAINT pets_dominant_breed_id_allowed;
  END IF;
  ALTER TABLE public.pets
    ADD CONSTRAINT pets_dominant_breed_id_allowed
    CHECK (dominant_breed_id IS NULL OR dominant_breed_id IN (
      'persian','scottish_fold','british_shorthair','khao_manee','wichianmat',
      'korat','thai_native','other'
    ));
END$$;

-- No backfill จำเป็น: pets = [] — ไม่มีแถวเดิมที่ใช้ orange_tabby/golden_shorthair
-- (หากอนาคตมีข้อมูลแล้วต้องถอน key: ต้องทำ reconcile + migrate ค่าก่อนเสมอ ห้าม drop ตรง ๆ)
