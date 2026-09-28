-- 🐾 Migration: Storage policies for bucket 'certificates' (V.0.999 — Final Blocker)
--
-- Status: APPROVED (Runtime Evidence Gate 2026-09-28) — companion of
-- 20260928400000_certificate_persistence.sql which created the bucket but not
-- the storage.objects policies (bucket existed, uploads would 403 — found by
-- runtime evidence: pg_policies on storage.objects = 0).
--
-- Boundary: certificate domain only — ไม่แตะ RLS ของ public tables,
-- ไม่แตะ bucket อื่น, ไม่แตะ policies ของ authenticated/anon ที่มีอยู่
--
-- Contract (mirror ของ digital_certificates RLS — Owner ≠ Member รักษาไว้):
--   INSERT/SELECT = home members (ผ่าน home_members) — path {home_id}/... ต้องตรง folder แรก
--   UPDATE/DELETE = home owner (ผ่าน homes.owner_id)
--   bucket = public read (เอกสารใบรับรองเป็นภาพ/PDF ที่ <img> อ่านผ่าน public URL ตาม
--   certificateStorage.ts — ปิด public ภายหลังได้ด้วย migration เดียว)
--
-- Idempotent · Additive only · No data backfill

DROP POLICY IF EXISTS "Certificate upload: home members" ON storage.objects;
DROP POLICY IF EXISTS "Certificate read: home members" ON storage.objects;
DROP POLICY IF EXISTS "Certificate update: home owner" ON storage.objects;
DROP POLICY IF EXISTS "Certificate delete: home owner" ON storage.objects;

CREATE POLICY "Certificate upload: home members" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'certificates'
  AND EXISTS (
    SELECT 1 FROM public.home_members hm
    WHERE hm.user_id = auth.uid()
      AND hm.home_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Certificate read: home members" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'certificates'
  AND EXISTS (
    SELECT 1 FROM public.home_members hm
    WHERE hm.user_id = auth.uid()
      AND hm.home_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Certificate update: home owner" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'certificates'
  AND EXISTS (
    SELECT 1 FROM public.homes h
    WHERE h.owner_id = auth.uid()
      AND h.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Certificate delete: home owner" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'certificates'
  AND EXISTS (
    SELECT 1 FROM public.homes h
    WHERE h.owner_id = auth.uid()
      AND h.id::text = (storage.foldername(name))[1]
  )
);
