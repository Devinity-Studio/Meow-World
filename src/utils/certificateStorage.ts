/**
 * Certificate persistence (V.0.999) — Import เอกสารจริง + เปิดดูได้
 *
 * Contract (LOCKED):
 *  - Certificate = Supporting Evidence — เก็บเอกสารที่ผู้ใช้ import เอง ไม่สร้าง
 *    ข้อมูล Domain ใหม่โดยอัตโนมัติ
 *  - Storage path: {home_id}/{pet_id}/{timestamp}-{filename}
 *  - DB row: digital_certificates (migration 20260928400000) — RLS ผ่าน home_members
 */

import { createClient } from '@/utils/supabase/client';
import type { DigitalCertificate } from '@/types';

export interface CertificateRow {
  id: string;
  pet_id: string;
  home_id: string;
  cert_type: DigitalCertificate['cert_type'];
  title: string;
  certificate_no: string;
  issuing_authority: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  original_doc_url: string;
  generated_cert_url: string | null;
  security_hash: string | null;
  verification_qr_payload: string | null;
  metadata: DigitalCertificate['metadata'] | null;
  created_by: string | null;
  created_at: string;
}

const BUCKET = 'certificates';

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.\-ก-๙]+/g, '-');
  return cleaned.length > 80 ? cleaned.slice(-80) : cleaned || 'document';
}

/** Upload ไฟล์เอกสารจริงเข้า Storage — คืน public URL ที่ <img> ใช้ได้ทันที */
export async function uploadCertificateFile(input: {
  homeId: string;
  petId: string;
  file: File;
}): Promise<{ url: string }> {
  const supabase = createClient();
  const path = `${input.homeId}/${input.petId}/${Date.now()}-${safeFileName(input.file.name)}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.file, { upsert: false, cacheControl: '3600' });
  if (error) throw new Error(`อัปโหลดเอกสารไม่สำเร็จ: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('ไม่สามารถสร้าง URL ของเอกสารได้');
  return { url: data.publicUrl };
}

/** Save certificate record — map จาก type เดิม (DigitalCertificate) เป็น row */
export async function saveCertificateRecord(cert: DigitalCertificate, homeId: string, createdBy: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('digital_certificates').insert({
    pet_id: cert.pet_id,
    home_id: homeId,
    cert_type: cert.cert_type,
    title: cert.title,
    certificate_no: cert.certificate_no,
    issuing_authority: cert.issuing_authority ?? null,
    issue_date: cert.issue_date || null,
    expiry_date: cert.expiry_date || null,
    original_doc_url: cert.original_doc_url,
    generated_cert_url: cert.generated_cert_url ?? null,
    security_hash: cert.security_hash ?? null,
    verification_qr_payload: cert.verification_qr_payload ?? null,
    metadata: cert.metadata ?? null,
    created_by: createdBy,
  });
  if (error) throw new Error(`บันทึกใบรับรองไม่สำเร็จ: ${error.message}`);
}

/** List certificates ของน้อง — อ่านกลับเป็น DigitalCertificate (type เดิม) */
export async function listCertificatesForPet(petId: string): Promise<DigitalCertificate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('digital_certificates')
    .select('*')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`โหลดใบรับรองไม่สำเร็จ: ${error.message}`);

  return (data as unknown as CertificateRow[]).map((row) => ({
    id: row.id,
    pet_id: row.pet_id,
    cert_type: row.cert_type,
    title: row.title,
    certificate_no: row.certificate_no,
    issuing_authority: row.issuing_authority ?? '',
    issue_date: row.issue_date ?? '',
    expiry_date: row.expiry_date ?? undefined,
    original_doc_url: row.original_doc_url,
    generated_cert_url: row.generated_cert_url ?? undefined,
    security_hash: row.security_hash ?? '',
    verification_qr_payload: row.verification_qr_payload ?? '',
    metadata: row.metadata ?? undefined,
    created_at: row.created_at,
  }));
}
