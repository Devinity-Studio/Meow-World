/**
 * Pet Profile Image (Visual Identity) — "รูปที่ผู้ใช้เลือกให้ใช้แทนตัวน้อง"
 *
 * Contract (LOCKED 2026-09-29):
 *  - 1 Pet มี Profile Image หลัก 1 รูป — เก็บ URL ที่ `pets.avatar_url` (column
 *    ที่มีอยู่แล้วจาก init migration — ไม่มี migration ใหม่สำหรับ field นี้)
 *  - เปลี่ยนรูปได้ · ล้างได้ · ไม่มีรูปก็สร้าง/ใช้งาน Pet ได้ (NULL = valid)
 *  - ห้ามใช้รูปนี้ infer Breed / Colour / Pattern — รูปคือ Visual Identity
 *    เท่านั้น ไม่ใช่ข้อมูล Domain
 *  - Passport Profile ≠ Profile Image · Biometrics ≠ Profile Image — ห้ามนำไป
 *    ใช้แทนกันโดยอัตโนมัติ (คนละ context ไม่อยู่ใน scope นี้)
 *  - ไม่มี Gallery ใน scope นี้
 *
 * Storage: bucket 'meow-photos' (public, มีอยู่แล้ว) — path
 *   {home_id}/{pet_id}/{timestamp}-{filename}
 * สิทธิ์ผ่าน policies ของ migration 20260929100000 (member write, owner manage)
 */

import { createClient } from '@/utils/supabase/client';

const BUCKET = 'meow-photos';

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.\-ก-๙]+/g, '-');
  return cleaned.length > 80 ? cleaned.slice(-80) : cleaned || 'image';
}

/** Upload รูปโปรไฟล์ใหม่ + บันทึก URL ที่ pets.avatar_url (เปลี่ยนรูป = upload ทับแนวคิดเดิม) */
export async function setPetProfileImage(input: {
  homeId: string;
  petId: string;
  file: File;
}): Promise<{ url: string }> {
  const supabase = createClient();
  const path = `${input.homeId}/${input.petId}/${Date.now()}-${safeFileName(input.file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.file, { upsert: false, cacheControl: '3600' });
  if (uploadError) throw new Error(`อัปโหลดรูปไม่สำเร็จ: ${uploadError.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('ไม่สามารถสร้าง URL ของรูปได้');

  const { error: updateError } = await supabase
    .from('pets')
    .update({ avatar_url: data.publicUrl })
    .eq('id', input.petId);
  if (updateError) throw new Error(`บันทึกรูปโปรไฟล์ไม่สำเร็จ: ${updateError.message}`);

  return { url: data.publicUrl };
}

/** ล้างรูปโปรไฟล์ — น้องไม่มีรูปก็ยังเป็นน้องที่ถูกต้อง (NULL = valid) */
export async function clearPetProfileImage(petId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('pets')
    .update({ avatar_url: null })
    .eq('id', petId);
  if (error) throw new Error(`ล้างรูปโปรไฟล์ไม่สำเร็จ: ${error.message}`);
}
