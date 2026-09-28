-- 🐾 Migration: Certificate Persistence — digital_certificates + storage bucket (V.0.999)
--
-- Status: APPROVED (V.0.999 Reconcile 2026-09-28) — apply on prod BEFORE any UI that
-- writes this table. Boundary: Certificate domain only — ไม่แตะ pets/homes/events,
-- ไม่แตะ RLS ของตารางอื่น
--
-- Why (V.0.999 Must-Have 1 · Certificate):
--   UI upload/view มีอยู่แล้วทั้งหมด (DigitalCertificateModal + CertificateViewerModal
--   + PassportView) แต่ไม่มี persistence — เอกสารจริงเป็น base64/data URL ใน state
--   หายทุกครั้งที่ reload · V.0.999 ต้อง "Import เอกสาร Certificate ได้ + เปิดดูได้"
--
-- Contract (Certificate = Supporting Evidence — ไม่สร้างข้อมูล Domain ใหม่อัตโนมัติ):
--   digital_certificates 1 แถว = เอกสารจริง 1 ฉบับที่ผู้ใช้ import เข้ามาเอง
--   pet_id        FK pets (CASCADE) — เอกสารอยู่กับน้อง
--   home_id       FK homes (CASCADE) — เจ้าของเอกสารคือบ้าน (RLS ผ่าน membership)
--   cert_type     CHECK-locked: pedigree|vaccine|microchip|adoption|health|general
--                 (mirror ของ CertificateType ใน src/types/index.ts)
--   original_doc_url = URL ของไฟล์เอกสารจริงใน Storage (public read ผ่าน bucket policy)
--   metadata JSONB   = provenance เสริมที่ผู้ใช้กรอก (sire/dam/doctor/clinic/batch)
--   security_hash + verification_qr_payload = คง contract เดิมของ UI (ครั้งนี้ยังไม่สร้าง
--   Meow World Digital Certificate generation — Future V.1)
--
-- Storage: bucket 'certificates' (private) + path pattern {home_id}/{pet_id}/{filename}
--   — upload ผ่าน signed-in member, read ผ่าน signed URL หรือ public read ของ bucket policy
--   (V.0.999 ใช้ public read เพื่อให้ <img> ใน UI ทำงานตรง ๆ — เอกสารเป็นภาพใบรับรอง
--   ไม่ใช่ PII ระดับสูง; ปิด public ภายหลังได้โดย migration เดียว)
--
-- Idempotent · Additive only · ไม่แตะ RLS ของตารางอื่น

CREATE TABLE IF NOT EXISTS public.digital_certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  home_id UUID REFERENCES public.homes(id) ON DELETE CASCADE NOT NULL,
  cert_type TEXT NOT NULL CHECK (cert_type IN (
    'pedigree','vaccine','microchip','adoption','health','general'
  )),
  title TEXT NOT NULL,
  certificate_no TEXT NOT NULL,
  issuing_authority TEXT,
  issue_date DATE,
  expiry_date DATE,
  original_doc_url TEXT NOT NULL,
  generated_cert_url TEXT,
  security_hash TEXT,
  verification_qr_payload TEXT,
  metadata JSONB,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_digital_certificates_pet_id
  ON public.digital_certificates(pet_id);
CREATE INDEX IF NOT EXISTS idx_digital_certificates_home_id
  ON public.digital_certificates(home_id);

ALTER TABLE public.digital_certificates ENABLE ROW LEVEL SECURITY;

-- Members of the home can view certificates (same membership shape as pets/events)
CREATE POLICY "Home members view certificates" ON public.digital_certificates
  FOR SELECT USING (
    home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid())
  );

-- Members can add certificates (import เอกสาร = การใช้ชีวิตในบ้าน ไม่ใช่สิทธิ์พิเศษ)
CREATE POLICY "Home members add certificates" ON public.digital_certificates
  FOR INSERT WITH CHECK (
    home_id IN (SELECT home_id FROM public.home_members WHERE user_id = auth.uid())
  );

-- Owner manages (edit/delete) — consistent with "Owner full access on homes"
CREATE POLICY "Home owner manages certificates" ON public.digital_certificates
  FOR UPDATE USING (
    home_id IN (SELECT id FROM public.homes WHERE owner_id = auth.uid())
  );
CREATE POLICY "Home owner deletes certificates" ON public.digital_certificates
  FOR DELETE USING (
    home_id IN (SELECT id FROM public.homes WHERE owner_id = auth.uid())
  );

-- ── Storage bucket: certificates (private bucket + member read/write policy) ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;
