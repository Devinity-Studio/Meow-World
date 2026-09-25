-- 🐾 Migration: Life Journey Event Storage — participants + multi-pet (EVENT_STORAGE_DESIGN)
--
-- Status: APPROVED (Reconcile 2026-09-26) — apply on prod via SQL Editor BEFORE any code
-- that uses these columns (deploy checklist). Boundary: Event domain only — the Pet
-- appearance column lives in a separate migration (20260926100000).
--
-- Contract (EVENT_STORAGE_DESIGN — 6/6 ตอบแล้ว):
--   participant_ids UUID[]  = Human[] ที่อยู่ในเรื่อง (เนื้อเรื่อง) — restore คอลัมน์ที่มีใน
--                             repo init:60 แต่หายบน prod (drift) · author_id ยังเป็น provenance
--                             แยกจาก participants ตาม Q3
--   pet_ids UUID[]          = Pets ที่เกี่ยวเพิ่มเติม — pet_id เดิมคงความหมาย "primary pet"
--                             กติกาอ่าน: allPets = [pet_id] if not null, then pet_ids[] (union)
--   Event ไม่มี pet ได้ (Q4) · ไม่มี human participant ได้ (Q5 — Birth Event จริงก็เป็นแบบนี้)
--
-- ⚠️ BUSINESS VALIDATION CONTRACT (Reconcile 2026-09-26):
--   Shape นี้ไม่รับประกันว่า UUID ข้างในเป็น pet/member ของ home_id เดียวกัน —
--   ความถูกต้อง "ทุก id อยู่ในบ้านเดียวกัน" เป็นหน้าที่ของ Payload Contract + Business
--   Validation ที่ app-level (slice ถัดไป) ไม่ใช่ "หวังว่า UI จะส่งถูก"
--   จึงไม่เพิ่ม FK แบบง่าย ๆ จนกว่า Data Model จะพิสูจน์ relationship จริง
--
-- Idempotent · Additive only · No backfill (birth events เดิมถูกต้องตามกติกาอ่านแล้ว) ·
-- No RLS/GRANT changes (คอลัมน์ใหม่อยู่ใต้ policies + grants เดิมของตาราง) ·
-- No CHECK: UUID[] ไม่มี enum domain ให้ lock — integrity อยู่ app-level ตาม Contract ข้างบน

ALTER TABLE public.life_journey_events
  ADD COLUMN IF NOT EXISTS participant_ids UUID[];

ALTER TABLE public.life_journey_events
  ADD COLUMN IF NOT EXISTS pet_ids UUID[];
