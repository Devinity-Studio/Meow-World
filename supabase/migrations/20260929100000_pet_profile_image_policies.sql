-- 🐾 Migration: Storage policies for bucket 'meow-photos' (Pet Profile Image)
--
-- Status: APPROVED (Pet Profile Image 2026-09-29) — apply on prod BEFORE any UI
-- that uploads pet profile images (same house workflow: db push).
-- Boundary: storage policies only — ไม่แตะตาราง, ไม่แตะ RLS ของ public tables,
-- ไม่แตะ policies ของ bucket 'certificates' ที่มีอยู่
--
-- Why:
--   bucket 'meow-photos' (public, สร้างใน init migration) ไม่มี policy บน
--   storage.objects → upload ด้วย user session จะโดน 403 (ช่องว่างเดียวกับ
--   certificates ที่จับได้จาก Runtime Evidence รอบก่อน)
--
-- Contract (Pet Profile Image — "รูปที่ผู้ใช้เลือกให้ใช้แทนตัวน้อง"):
--   - 1 pet มี profile image หลัก 1 รูป (เก็บ URL ที่ pets.avatar_url ที่มีอยู่)
--   - ไม่มีรูปก็ใช้งานได้ (avatar_url NULL = valid) — ห้ามบังคับ
--   - ห้ามใช้รูป infer Breed/Colour/Pattern — รูปคือ Visual Identity เท่านั้น
--   - Passport Profile / Biometrics เป็นคนละ context — นโยบายนี้ไม่ครอบคลุม
--   - Path: {home_id}/{pet_id}/{filename} — folder แรกผูกบ้าน (ตรวจสิทธิ์ผ่าน
--     home_members เหมือน certificates — Owner ≠ Member รักษาไว้)
--
-- Idempotent · Additive only · No RLS/GRANT changes ที่ public tables

DROP POLICY IF EXISTS "Pet photo upload: home members" ON storage.objects;
DROP POLICY IF EXISTS "Pet photo read: home members" ON storage.objects;
DROP POLICY IF EXISTS "Pet photo update: home owner" ON storage.objects;
DROP POLICY IF EXISTS "Pet photo delete: home owner" ON storage.objects;

CREATE POLICY "Pet photo upload: home members" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'meow-photos'
  AND EXISTS (
    SELECT 1 FROM public.home_members hm
    WHERE hm.user_id = auth.uid()
      AND hm.home_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Pet photo read: home members" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'meow-photos'
  AND EXISTS (
    SELECT 1 FROM public.home_members hm
    WHERE hm.user_id = auth.uid()
      AND hm.home_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Pet photo update: home owner" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'meow-photos'
  AND EXISTS (
    SELECT 1 FROM public.homes h
    WHERE h.owner_id = auth.uid()
      AND h.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Pet photo delete: home owner" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'meow-photos'
  AND EXISTS (
    SELECT 1 FROM public.homes h
    WHERE h.owner_id = auth.uid()
      AND h.id::text = (storage.foldername(name))[1]
  )
);
