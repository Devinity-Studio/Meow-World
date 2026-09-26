# Root Cause Report — Pet Insert 403: "The Door That Was Never Built"

**Date:** 2026-09-26
**Branch:** `feature/home-creation-phase-0-999`
**Method:** Evidence chain 3 layers (Repo migration ↔ Production DB ↔ Runtime) — read-only until root cause confirmed; zero code/config/RLS changes during collection
**Lesson (บทเรียนของบ้าน):** **Production schema drift can masquerade as RLS failure.**

---

## 1. อาการ

- Birth Wizard และ Direct Add ตายทั้งคู่ด้วยข้อความกลืนหมด "เกิดข้อผิดพลาด"
- `LITTER_INSERT` สำเร็จทุกครั้ง → ซาก orphan litters #010–#014 สะสมใน prod
- `GET /rest/v1/pets` ตอบ 200 ปกติ → ทีมสงสัย RLS มาตลอด 3 สัปดาห์ (TRACKING.md blocker: "RLS infinite recursion")

## 2. Evidence Chain (สิ่งที่ตรวจจริง ตามลำดับ)

| # | ชั้น | การตรวจ | ผล |
|---|---|---|---|
| 1 | RUNTIME | `petInsertEvidence` instrumentation (commit `2f229b8`) — prod ไม่มี code นี้ จึงใช้ GET probes ผ่าน Supabase REST ด้วย session จริงของเจ้าของบ้าน | SESSION ✅ · HOME_LOOKUP ✅ · HOME_MEMBERSHIP ✅ (role=owner) · LITTER_INSERT ✅ (มีซากจริง 5 แถว) · **PET_INSERT ❌** · JOURNEY_INSERT ⛔ ไม่ถึง |
| 2 | PROD `pg_policies` (pets) | 6 policies = 2 จาก nuclear fix + `pet_select/insert/update/delete` 4 ตัวแฝง (hand-added) — เงื่อนไขซ้ำเป๊ะ | ทุกตัว PERMISSIVE, roles={public} → duplicates inert · **RLS: CLOSED** |
| 3 | PROD `pg_policies` (events/litters) | litters = repo 100% (3 policies มี OR owner) · events = 2 + `ev_*` แฝง 4 เหมือน pets | litters สะอาดสนิท = ตารางเดียวที่ไม่โดนมือแตะ = ตารางเดียวที่ insert ผ่าน (correlation, ไม่ใช่ proof) |
| 4 | PROD `role_table_grants` | `authenticated` มี SELECT/INSERT/UPDATE/DELETE ครบทุกตาราง | **GRANT: CLOSED** (ตัดสมมติฐาน REVOKE) |
| 5 | PROD `information_schema.columns` (pets) | 22 คอลัมน์ — **ไม่มี `nickname` ไม่มี `color`** ทั้งที่ repo init L39/L44 มี | **ROOT CAUSE 🎯** |
| 6 | PROD `pg_trigger` (pets) | แค่ `on_pet_created`→`generate_pet_code` + `update_pets_updated_at` = ตรง repo | **Trigger: CLOSED** |
| 7 | CODE | `birth/page.tsx:197,202` ส่ง `nickname`/`color` เสมอ · `pets/page.tsx` ส่งทั้ง form state | ทั้งสอง flow อวยพรให้ fail เหมือนกัน |
| 8 | RUNTIME (post-fix) | Birth Wizard จริง 1 รอบบน prod: `POST litters 201` · `POST pets 201` · `POST life_journey_events 201` · DB read-back: pet `PET-0001` "มู่ทู่" + journey event แรก | **VERTICAL SLICE ✅** |

## 3. Root Cause

> **Production `pets` table ถูกสร้างจาก schema ที่เก่ากว่า init migration (หรือสร้างมือ) — ขาด `nickname` และ `color` — ขณะที่ RLS policies ถูก hand-patch เพิ่มเต็มที่ (`pet_*`, `ev_*`)**
>
> PostgREST ปฏิเสธทุก INSERT ที่มี key `nickname`/`color` ด้วย PGRST204 → UI แสดง error กลืน ๆ → ทั้งทีมไปวงอยู่ที่ RLS ซึ่งเป็นของกลาง

## 4. Fix (applied)

```sql
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS color TEXT;
```

- ไฟล์: `supabase/migrations/20260926000000_fix_pets_schema_drift.sql` (idempotent, additive-only, ตรง repo contract เป๊ะ)
- Migration review ก่อน apply: ไม่มี migration ใดใน repo ขัดแย้งชื่อ/ชนิด, ไม่มี DROP COLUMN
- Applied บน prod โดยเจ้าของบ้านผ่าน Supabase SQL Editor: 2026-09-26
- Read-back 2 ชั้น: SQL Editor (expected 24 cols) + `GET /rest/v1/pets?select=id,nickname,color → 200 []` (PostgREST เห็นจริง)

## 5. Drift ค้างรอตัดสิน (ไม่แก้ตอนนี้ — ไม่มีหลักฐานว่าทำ flow พัง)

| รายการ | สถานะ | ความเสี่ยง |
|---|---|---|
| `life_journey_events`: `participant_ids UUID[]` repo มี / prod ไม่มี | ⏸️ บันทึก drift | JourneyComposer (orphan, แท็กคน) จะพังถ้าเอามาใช้ — เป็น roadmap เดียวกับ DATA_SEMANTICS_AUDIT |
| `life_journey_events`: `visibility text DEFAULT 'family'` prod มี / repo ไม่มี | ⏸️ บันทึก drift | inert — ไม่มี code เขียน/อ่าน |
| duplicate policies `pet_*`/`ev_*` (4+4) | ⏸️ ไม่ทำความสะอาด | permissive ซ้ำเป๊ะ = inert แต่เป็นหลักฐาน pattern "hand-patched DB" ของ BRM |
| Orphan litters #010–#014 | ⏸️ ไม่แตะ | แก้ด้วย transaction/rollback ใน birth wizard เป็นอีก checkpoint (คนละปัญหากัน) |

## 6. Evidence Scoreboard (สรุปเชิงกระบวนการ)

```
RLS policy      → CLOSED
Table grants    → CLOSED
Schema pets     → ROOT CAUSE 🎯 (nickname, color missing)
Trigger pets    → CLOSED
Schema events   → drift บันทึกไว้ (ไม่กระทบ flow)
Runtime         → VERIFIED POST-FIX (3× 201 + PET-0001)
```

**บทเรียนเชิงกระบวนการ (สำหรับ BRM):**
1. Evidence ก่อนเสมอ — ถ้าเชื่อสมมติฐาน RLS เก่าแล้ว DROP policy ไปแล้ว จะซ่อมของที่ไม่พัง
2. "GET ผ่าน" ไม่เคยพิสูจน์ว่า INSERT ผ่าน — schema drift ซ่อนอยู่หลัง SELECT
3. Repo ไม่ใช่ Production — ต้องมี read-back จากบ้านจริงทุกครั้งที่สงสัย
4. Error message ที่กลืนหมด ("เกิดข้อผิดพลาด") คือคู่หูของ drift — instrumentation (commit `2f229b8`) สร้างมาเพื่อกันเคสนี้
5. ห้องเดียวกัน อาจมีคนมือที่สาม (hand-patch) เข้าไปก่อนหน้า — ทุก policies/คอลัมน์ต้องเทียบกับแบบแปลนก่อนเชื่อ

---

*ตรวจโดย GLM (Codebuff) + เจ้าของบ้าน — Evidence → Root Cause → Fix → Runtime Verify*
