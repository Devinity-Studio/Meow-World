/**
 * 🐾 Journey Adapter — DB row → UI model (Home Mode wire slice)
 *
 * Design lock (owner-approved 2026-09-26):
 *   - pet_ids[]        → tagged_pet_ids[]     (UI model คนละตระกูล — adapter คือสะพานเดียว)
 *   - participant_ids[] → tagged_user_ids[]
 *   - content          → title + description  (line 1 = title, ที่เหลือ = description)
 *   - created_at       → event_date           (TEMPORARY per TIME_MODEL — occurred-date
 *                                              semantic ยังไม่ถูกตัดสิน; audit chain ตัดสินก่อน
 *                                              เปลี่ยน — ห้ามให้ UI สร้าง semantic เอง)
 *   - event_type       → EventCategory (fallback 'memory' — prod default เดียวกัน)
 *
 * ไม่สร้าง Model ใหม่ — UI ยังใช้ JourneyEvent เดิมจาก types/index.ts
 * เขียนครั้งเดียวอ่านทุกที่: Feed + Filters กิน union read เดิมของ composer
 * (tagged_pet_ids → fallback pet_id) โดยไม่ต้องแตะ JourneyFeedCard เลย
 */

import { JourneyEvent } from '@/types';

/** Row shape ตรงกับคอลัมน์ที่เลือกจริง (คอลัมน์ใหม่จาก migration 20260926200000) */
export interface JourneyEventRow {
  id: string;
  home_id: string;
  pet_id: string | null;
  pet_ids: string[] | null;
  participant_ids: string[] | null;
  author_id: string | null;
  content: string | null;
  event_type: string | null;
  created_at: string;
}

/** Select string กลาง — กันคอลัมน์เพี้ยนระหว่าง call sites (โรคเดียวกับ drift ที่เคยเจอ) */
export const JOURNEY_EVENT_COLUMNS =
  'id, home_id, pet_id, pet_ids, participant_ids, author_id, content, event_type, created_at';

/** content = เรื่องราวทั้งก้อน — บรรทัดแรกคือหัวข้อ (composer เขียนแบบเดียวกัน) */
function splitContent(content: string | null): { title: string; description: string | null } {
  if (!content) return { title: '(ไม่มีหัวข้อ)', description: null };
  const [first = '', ...rest] = content.split('\n');
  return { title: first.trim() || '(ไม่มีหัวข้อ)', description: rest.join('\n').trim() || null };
}

/** DB row → JourneyEvent UI (authorName จากผู้เรียกที่ join profiles แล้ว) */
export function adaptJourneyEventRow(row: JourneyEventRow, authorName?: string): JourneyEvent {
  const { title, description } = splitContent(row.content);
  // union read ตาม EVENT_STORAGE_DESIGN: ชุดสัตว์ของเรื่องราว = [pet_id ∪ pet_ids[]]
  // — [] ต้องกลายเป็น undefined เพื่อให้ feed/filter fallback ไป pet_id ได้ตาม UI contract เดิม
  const allPetIds = [...new Set([row.pet_id, ...(row.pet_ids ?? [])].filter((id): id is string => !!id))];
  return {
    id: row.id,
    pet_id: row.pet_id ?? undefined,
    tagged_pet_ids: allPetIds.length > 0 ? allPetIds : undefined,
    tagged_user_ids: row.participant_ids ?? undefined,
    author_id: row.author_id ?? undefined,
    author_name: authorName,
    event_date: row.created_at.slice(0, 10),
    event_type: (row.event_type ?? 'memory') as JourneyEvent['event_type'],
    title,
    description,
    created_at: row.created_at,
  };
}
