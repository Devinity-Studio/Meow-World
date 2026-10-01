// ============================================================
// Invitations — Join Existing Home (Co-care Invitation)
//
// Design Lock:
//   Invitation เป็นสิทธิ์ชั่วคราว → ระบบตรวจ (security-definer RPC) →
//   Join สำเร็จ → Membership เกิด → Token ถูก consume (atomic)
//
// ทั้ง QRInviteModal (join tab) และ /adopt/[token] เรียกผ่าน helper นี้
// เพื่อให้ flow / ความหมายของ error เป็นอันเดียวกันทั้งแอป
// ============================================================

import { createClient } from '@/utils/supabase/client';
import { extractTokenFromQR } from '@/lib/token-validation';

export interface InvitePreview {
  home_name: string;
  home_description: string | null;
  member_count: number;
  pet_count: number;
}

export type InviteJoinResult =
  | { ok: true; homeId: string }
  | { ok: false; reason: string };

/** Map ข้อความ error จาก RPC เป็นข้อความที่ user อ่านเข้าใจ (ความหมายเดียวทั้งแอป) */
const INVITE_ERROR_TH: Record<string, string> = {
  UNAUTHENTICATED: 'กรุณาเข้าสู่ระบบก่อนเข้าร่วมบ้าน',
  TOKEN_NOT_FOUND: 'ไม่พบรหัสเชิญนี้ในระบบ',
  TOKEN_ALREADY_USED: 'รหัสเชิญนี้ถูกใช้ไปแล้ว',
  TOKEN_EXPIRED: 'รหัสเชิญนี้หมดอายุแล้ว',
  SELF_INVITE_FORBIDDEN: 'คุณเป็นคนส่งคำเชิญนี้เอง',
  INVITER_HOME_NOT_FOUND: 'ไม่พบบ้านของผู้เชิญ',
  ALREADY_MEMBER: 'คุณเป็นสมาชิกของบ้านนี้อยู่แล้ว',
  TOKEN_RACE: 'รหัสเชิญนี้เพิ่งถูกใช้โดยคนอื่น',
};

export function inviteErrorToThai(raw: string): string {
  const code = raw.split('\n')[0].trim();
  return INVITE_ERROR_TH[code] ?? 'เข้าร่วมบ้านไม่สำเร็จ กรุณาลองใหม่';
}

/**
 * Step 6 Contract: รับ input จาก human (FAM-code / UUID / URL ของ /adopt/<uuid>)
 * — normalize พื้นฐานฝั่ง client แล้วส่งดิบให้ resolver ฝั่ง server ตัดสินเสมอ
 * (ห้าม client แปลง/ตัดสิน token เอง — ทุก entry converge ที่ RPC เดียว)
 */
function normalizeInviteInput(input: string): string {
  const cleaned = input.trim().toUpperCase();
  return extractTokenFromQR(cleaned) ?? cleaned;
}

/**
 * ขอ preview ขั้นต่ำของบ้านเป้าหมายผ่าน security-definer RPC
 * (token คือสิทธิ์ชั่วคราวสำหรับ preview เท่านั้น — ไม่เปิด RLS กว้าง)
 */
export async function fetchInvitePreview(input: string): Promise<InvitePreview> {
  const ref = normalizeInviteInput(input);
  const { data, error } = await createClient()
    .rpc('invite_preview', { p_token: ref })
    .single<InvitePreview>();
  if (error) throw new Error(inviteErrorToThai(error.message));
  return data;
}

/**
 * Join จริง: resolve (uuid หรือ FAM-code) → validate → join → consume แบบ atomic ใน RPC เดียว
 * ถ้า membership ไม่สำเร็จ token ต้องยังใช้ได้ (ไม่กิน token ฟรี)
 */
export async function joinHomeWithInvite(input: string): Promise<InviteJoinResult> {
  const ref = normalizeInviteInput(input);
  const { data, error } = await createClient().rpc('join_home_with_invite', {
    p_token: ref,
  });

  if (error) return { ok: false, reason: inviteErrorToThai(error.message) };
  return { ok: true, homeId: data as string };
}
