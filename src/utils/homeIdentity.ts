/**
 * Home Identity domain — stable meaning for "บ้านนี้คือใคร มีใครและอะไรอยู่ในบ้านนี้".
 *
 * Data Contract (LOCKED 2026-09-28 — docs/HOME_MODE_DESIGN_SPEC.md):
 *   - Home Identity ≠ Home Access / Permission · Owner ≠ Member
 *   - User 1 คนมีได้หลายบ้าน (ไม่มี unique(owner_id)) — Active/Current Home เป็น Future Gate
 *   - บ้านที่ข้อมูลยังไม่ครบ ถือเป็น Valid State ไม่ใช่ Error (incomplete = valid)
 *   - People (MVP) = home_members ที่มี User account — Person Identity ≠ Home Membership ≠ Permission
 *   - Structured Data เป็น Default เมื่อข้อมูลมี Meaning ที่ระบบรู้จัก · Free Text สำหรับ
 *     Human Expression จริง ๆ (ชื่อบ้าน / คำอธิบายบ้าน) — ห้ามสร้าง relationship_key
 *     หรือ taxonomy ใด ๆ โดยไม่มี Requirement (มีข้อมูลให้ แต่ไม่ตัดสิน)
 *
 * Boundary discipline (same as petIdentity/PetForm):
 *   Postgres treats '' as junk data in optional text fields — empty optional fields
 *   become null, never empty string. `updated_at` ตั้งโดย trigger trg_homes_updated_at
 *   (migration 20260928100000) — payload ห้ามส่ง updated_at เอง
 */

import type { UserRole } from '@/types';

export interface HomeIdentityUpdateInput {
  name: string;
  description: string;
}

export type HomeIdentityUpdateResult =
  | { invalid: true; reason: string }
  | { invalid: false; payload: { name: string; description: string | null } };

export interface HomeIdentityPerson {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
}

export interface HomeIdentitySummary {
  homeId: string;
  name: string;
  description: string | null;
  people: HomeIdentityPerson[];
  petCount: number;
}

/** Trim อย่างปลอดภัย — non-string (จาก input ที่ยังไม่ควบคุม) → '' */
export function normalizeHomeName(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

/** Optional text boundary: trim → '' / undefined / null → null (never empty string) */
export function normalizeHomeDescription(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Business Logic ของการแก้ไข Home Identity (name จำเป็น, description optional):
 * บ้านที่ไม่มีคำอธิบายยังเป็นบ้านที่ถูกต้อง — บังคับเฉพาะ name เท่านั้น (incomplete = valid)
 */
export function buildHomeIdentityUpdatePayload(
  input: HomeIdentityUpdateInput
): HomeIdentityUpdateResult {
  const name = normalizeHomeName(input.name);
  if (name === '') {
    return { invalid: true, reason: 'กรุณาระบุชื่อบ้าน' };
  }
  return {
    invalid: false,
    payload: {
      name,
      description: normalizeHomeDescription(input.description),
    },
  };
}

/**
 * Read-side adapter: รวม home + people + pets เป็น Home Identity summary
 * (incomplete = valid — บ้านที่ยังไม่มี people/pets ก็เป็น summary ที่ถูกต้อง)
 */
export function buildHomeIdentitySummary(input: {
  home: { id: string; name: string; description: string | null };
  people: HomeIdentityPerson[];
  pets: { id: string }[];
}): HomeIdentitySummary {
  return {
    homeId: input.home.id,
    name: input.home.name,
    description: input.home.description,
    people: input.people,
    petCount: input.pets.length,
  };
}
