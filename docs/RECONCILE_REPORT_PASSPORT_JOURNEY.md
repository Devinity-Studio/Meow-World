# Reconcile Report — Progressive Passport & Life Journey Foundation

**Date:** 2026-09-23
**Branch:** `claude-welcome-entry` (HEAD `16695df`)
**Scope:** Audit only — ไม่แก้ code ตามข้อกำหนด (มี 1 ข้อยกเว้นตามประกาศด้านล่าง)
**Purpose:** ตอบว่า Existing → Reusable → Missing → Conflict อะไรบ้าง ก่อนออกแบบ Passport รอบใหม่ เพื่อไม่สร้างซ้ำ/สวนกับของเดิม (commit `d054230`, `84f9597`)

> ⚠️ **ข้อยกเว้นการแก้ code (รายงานตามสัจจะ):** รอบนี้**ไม่ได้แก้ไฟล์ source ใดๆ** มีเพียงการติดตั้ง native binding เพื่อให้ Vitest รันบน Windows ได้ — เรื่องนี้จัดเป็น **Environment/Tooling issue แยกจาก application correctness** (รายละเอียดใน Section 9)

---

## 1. Evidence (ผลตรวจจริง)

### Build / Type / Test

| การตรวจ | คำสั่ง | ผล | สถานะ |
|---|---|---|---|
| TypeScript | `tsc --noEmit` | 0 errors | ✅ **PASS** |
| Unit tests | `vitest run` | **25/25 passed** (`src/__tests__/WelcomePage.test.tsx`) | ✅ **PASS** |
| Production build | `next build` | สำเร็จ 18 routes | ✅ **PASS** |

> หมายเหตุ: Test suite มี**ไฟล์เดียว** ครอบคลุมเฉพาะ Welcome Page — **ไม่มี test ใดๆ ของ Passport / Life Journey / Birth flow** (ตรวจจาก `glob src/**/*.test.*` + `vitest` output)

### ไฟล์ที่ใช้อ้างอิง (code paths จริง)

**Progressive Passport**
- `src/components/passport/ProgressivePassport.tsx` — Modal passport แบบ field-level ✓/○ + completeness bar (in use: imported ที่ `src/app/pets/[id]/page.tsx:11`)
- `src/types/pet.ts` — `Pet` interface (มี `pet_code`, `litter_id`, `mother_id`, `father_id`, `birth_weight`, `birth_time`, `observed_at`, `special_traits`)
- `supabase/migrations/20260901200000_create_litters.sql` — สร้าง `litters` table + เพิ่มคอลัมน์ด้านบนให้ `pets` + trigger `generate_pet_code()`

**Birth/Litter flow**
- `src/app/pets/birth/page.tsx` (630 lines) — wizard 3 steps: shared → babies → review → insert `litters` + `pets` + auto first Life Journey event
- `src/app/pets/litters/page.tsx` — list/delete litters (build route `/pets/litters`)

**Life Journey**
- `supabase/migrations/20260827130000_init_full_schema.sql` (lines 52–63) — `life_journey_events` จริง: `id, home_id, pet_id, author_id, content, event_type, media_urls, participant_ids, created_at`
- `src/app/pets/[id]/page.tsx` — timeline CRUD (add/delete event), EventForm
- `src/components/home/JourneyComposer.tsx` + `HomeMode.tsx` + `JourneyFeedCard.tsx` — feed UI (ดูหมายเหตุ orphan ด้านล่าง)
- `src/types/pet.ts` — `LifeJourneyEvent`, `LifeJourneyEventFormData` / `src/types/index.ts` — `JourneyEvent`, `EventCategory` (9 categories)
- `src/utils/mockData.ts` — mock events มี `event_date`

**Placeholder-related**
- `src/utils/token-validation.ts` + `src/app/api/tokens/validate/route.ts` + `src/app/adopt/[token]/page.tsx` + `src/app/api/test-tokens/page.tsx` — QR token system (นอก scope แต่เกี่ยวเนื่อง adopt flow)

---

## 2. Existing (มีอยู่จริง)

### Progressive Passport
| องค์ประกอบ | รายละเอียด | แหล่ง |
|---|---|---|
| Passport UI | Modal ✓/○ per-field, 4 หมวด identity/family/health/future, completeness bar % | `ProgressivePassport.tsx` |
| `pet_code` | Auto `PET-0001` ต่อบ้าน (trigger ฝั่ง DB) | `create_litters.sql` |
| Parent linkage | `mother_id`/`father_id` → fetch ชื่อ+species+breed มาโชว์ในหมวด family | migration + component |
| Litter linkage | `litter_id` → โชว์ "✓ มาจากครอก" | มาจาก migration + component |
| Future slots | microchip/biometrics/certificate = `hasData: false` hard-coded → สอดคล้องแนวคิด Progressive อยู่แล้ว | component lines 213–232 |

### Birth/Litter flow
| องค์ประกอบ | รายละเอียด |
|---|---|
| Litter table | `litters` (name, birth_date, location, notes, mother/father id+name fallback, RLS ครบ) |
| Shared→per-baby override | `birth_date_override`, `birth_weight`, `special_traits`, per-baby breed autoจากแม่ |
| Auto first journey | insert `life_journey_events` (`event_type='milestone'`, content เป็น plain text รวมข้อมูลเกิด) ต่อ 1 ลูก |
| Litter listing page | `/pets/litters` + delete (unlink ลูกก่อนลบ) |

### Life Journey
| องค์ประกอบ | รายละเอียด |
|---|---|
| DB | `life_journey_events` ตาม schema ข้างบน + `nest_id` (migration 20260831400000) + `updated_at` (20260901000000) |
| Timeline UI | `/pets/[id]` — เพิ่ม/ลบ event, แสดง `created_at`, badge event_type 4 แบบ |
| Composer (orphan) | JourneyComposer มี date picker, แท็กหลายแมว, แท็กคน, image/video, location, 9 event categories |
| Admin | `/admin/dashboard` นับ events (query จริง) |

---

## 3. Reusable (ต่อยอดได้โดยไม่สร้างใหม่)

1. **`ProgressivePassport.tsx` ทั้ง component** — โครง field-level ✓/○ + category + completeness ตรงกับแนวคิด "Living/Progressive Identity Record" อยู่แล้ว เพิ่ม field ใหม่ได้โดย append เข้า `fields[]`
2. **`pets` columns ที่มีคนลืม:** `birth_time` (TIME), `observed_at` (TIMESTAMPTZ), `special_traits`, `birth_weight` — โดยเฉพาะ **`observed_at` คือ seed ของแนวคิด occurred/recorded ที่มีอยู่แล้วใน DB แต่ UI ยังไม่ได้ใช้**
3. **`litters.birth_date` + `pets.birth_date_override`** — โครงสร้างรองรับ "วันที่เกิดของครอก vs ของตัว" แยกกันอยู่แล้ว
4. **Birth wizard (`birth/page.tsx`)** — flow shared→babies→review ใช้ต่อได้ เพียงเติมช่อง date precision / evidence ภายหลัง
5. **Event type taxonomy 9 หมวด** ใน `types/index.ts` (`EventCategory`) — ใช้เป็นฐาน enum ของ event_type ใหม่ได้
6. **JourneyComposer** (ถ้าจะกู้คืน) — date picker ย้อนหลัง, multi-tag, media, location อยู่ครบแล้ว
7. **`pet_code` trigger + RLS ของ `litters`** — ใช้ต่อได้ทันที

---

## 4. Missing (แนวคิดใหม่ต้องการ แต่ยังไม่มี)

1. **`occurred_at`** — ไม่มีทั้งใน DB และ type (`life_journey_events` มีแค่ `created_at`)
2. **`recorded_at`** — มี `created_at` ครอบคลุม semantic นี้อยู่แล้ว (แต่ UI ปัจจุบัน**ตีความเป็น occurred** ดู Conflict #1)
3. **Date precision** — ไม่มี `date_precision` (exact / month / year / approximate / unknown) ทั้ง pets และ events; ทุกที่บังคับ `<input type="date">` ที่ต้องเลือกวันเต็ม
4. **Evidence / source linkage** — ไม่มี `source_type`, `source_ref` (เช่น photo_id), `evidence` table, `confidence` — แนวคิด "File metadata เป็น Evidence" ยังไม่มีที่เก็บ
5. **Historical event from photo** — ไม่มี flow "นำรูปเก่ามาสร้าง event ย้อนหลัง" (JourneyComposer มี date picker แต่เป็น orphan + ยังไม่มี evidence linkage)
6. **Tests** — ไม่มี test สำหรับ Passport/Birth/Journey เลย (มีแค่ WelcomePage)
7. **`media_urls` ไม่เคยถูกใช้** — schema มีคอลัมน์แต่ทุก insert ใช้ `image_url`/URL ใน content text แทน (JourneyComposer orphan)

---

## 5. Conflict (มีอยู่แต่ขัด/ไม่ตรงกับหลักใหม่)

1. **`created_at` ถูกใช้เป็น "วันที่เกิดเหตุการณ์" ใน UI** — `pets/[id]/page.tsx` sort และแสดง `created_at` เป็นวันที่ของ event ใน timeline ขัดกับหลัก occurred ≠ recorded
2. **`event_date` หายตอน insert** — `EventForm` กรอก `event_date` ได้ แต่ `handleAddEvent` (บรรทัด 95–103) **ไม่ส่ง** `event_date` ลง DB (และ DB ก็ไม่มีคอลัมน์นี้) — form หลอกผู้ใช้ว่าเลือกวันที่ได้
3. **Metadata→Fact โดยไม่มี evidence กลาง** — ตอนนี้ facts เก็บเป็น column ตรงของ `pets` (`birth_date`, `birth_weight`) ทันที ไม่มีชั้น evidence/observation กั้น — ตรงข้ามกับหลัก "metadata ไม่ใช่ Fact จนผู้ใช้ยืนยัน" (รอบนี้ไม่แก้ แค่ระบุ)
4. **`observed_at` ซ้ำซ้อนกับที่ตั้งใจ** — มีคอลัมน์แล้วแต่ type `Pet.observed_at` ไม่เคยถูกอ่านที่ไหนเลย (search ทั้ง `src/` มีแค่ประกาศใน type)
5. **Date model ขัดแยะภายในตัวเอง** — `pets.birth_date` เป็น DATE (บังคับ exact) แต่ real-world ต้องการ precision; `litters.birth_date` ก็ DATE เช่นกัน
6. **Journey event content เป็น plain text blob** — Birth event รวมข้อมูลเป็น string (`Chapter 01 — My Beginning...`) parse กลับยาก ขัดหลัก structured evidence
7. **หลาย "Pet" type ซ้ำซ้อน** — `src/types/pet.ts` (`Pet` with `home_id`) vs `src/types/index.ts` (`Pet` with `owner_id`, `microchip_id`, `is_spayed`) — สอง world ที่ไม่ตรงกัน ขัดกับ schema จริงใน DB

---

## 6. Placeholder / False Completion (UI exists — behavior not verified)

| รายการ | ไฟล์ | สถานะจริง |
|---|---|---|
| **Home Mode ทั้งหมด** (`HomeMode`, `JourneyComposer`, `JourneyFeedCard`, `HouseGraphicCard`, `FamilyMembersModal`, `QRInviteModal`) | `src/components/home/*` | **UI exists — behavior not verified.** ไม่มี page ไหน import `HomeMode` เลย (grep `HomeMode` เจอแค่ในตัวมันเอง + JourneyComposer) → ทั้ง feed/like/comment/filter ทดสอบไม่ได้จริง |
| **CreateMomentModal** | `src/components/CreateMomentModal.tsx` | **UI exists — behavior not verified** — insert จริง แต่**ไม่มี page ไหน render** component นี้ |
| **PassportView (ตัวเก่า)** | `src/components/passport/PassportView.tsx` (660 lines) | **UI exists — behavior not verified** — ไม่มี page import แล้ว (มีแค่ ProgressivePassport ถูกใช้) + อ้าง `Pet` จาก types/index ที่ไม่ตรง DB (ใช้ `owner_id`, `color_marking`, `microchip_id` ซึ่ง DB ไม่มี) |
| **`event_date` ใน EventForm** | `src/app/pets/[id]/page.tsx:327,347` | **UI exists — behavior not verified** — form บังคับกรอกวันที่ แต่ค่าถูกทิ้งตอน insert (ไม่มี column) |
| **mockData** | `src/utils/mockData.ts` | Data ปลอมทั้งไฟล์ (7 events มี `event_date`) — ถูกอ้างถึงใน docs แต่ **ไม่มี page import แล้ว** (grep เจอแค่ใน PassportView orphan) |
| **"Progressive Information UI"** | `docs/HANDOFF.md` line 959 | ถูกระบุ `[ ]` (ยังไม่ทำ) — ตรงข้ามกับ `MEOW_PASSPORT_DESIGN_SPEC.md` ที่ checklist `[x]` ทั้งที่ UI เกี่ยวข้อง orphan |
| **`birth_time`, `observed_at`, `special_traits` UI** | types + migration มี / birth wizard ใส่แค่ weight+traits | `observed_at`/`birth_time` **ไม่มี input ใดๆ** — column รองรับแต่ UI ไม่มี |
| **แอดมิน dashboard นับ events** | `src/app/admin/dashboard/page.tsx` | Query จริง แต่ **UI exists — behavior not verified** (ไม่มี test, ไม่มี auth guard เห็นได้ชัดในไฟล์ที่อ่าน) |

**False Completion ที่เขียนไว้ใน docs:**
- `docs/MEOW_PASSPORT_DESIGN_SPEC.md` — checklist `[x]` รายการที่ implementation เป็น orphan (ProgressivePassport ใช้จริง / PassportView ไม่ใช้)
- `TRACKING.md` — "Pet Passport: UI Ready" แต่ PassportView (ตัวหลักของ spec เดิม) ยังไม่ถูก wire เข้า route ใด

---

## 7. Date Capability Checklist (ของจริง ณ ปัจจุบัน)

| Capability | มีไหม | หลักฐาน |
|---|---|---|
| **exact date** | ⚠️ บังคับในบางที่ | `<input type="date">` ทั้ง EventForm (`pets/[id]/page.tsx:347`), JourneyComposer (orphan), birth wizard (`birth_date` บังคับใน step 1 ของ `birth/page.tsx`) |
| **month + year** | ❌ | ไม่มี mechanism ใด |
| **year only** | ❌ | ไม่มี mechanism ใด |
| **approximate** | ❌ | ไม่มี mechanism ใด (`birth_date_override` ก็ยังเป็น DATE) |
| **unknown** | ❌ | birth wizard บังคับ `birth_date` required; EventForm default = today; ไม่มี "ไม่ทราบวันที่" |
| **occurred_at** | ❌ (DB) / ⚠️ (concept ฝังอยู่) | ไม่มี column; มีแค่ `pets.observed_at` (TIMESTAMPTZ) ที่ไม่เคยถูกใช้ |
| **recorded_at** | ✅ เทียบเท่า | `created_at` ทุกตาราง (แต่ UI ปัจจุบันใช้ผิด semantic ดู Conflict #1) |
| **source / evidence** | ❌ | ไม่มี table/column/type; มีเพียง `media_urls` (TEXT[]) ที่ไม่เคยใช้ |

> **สรุปด้านวันที่:** ปัจจุบันระบบรองรับ**เฉพาะ exact date** ที่ถูกบังคับจาก input, ส่วน recorded_at ได้จาก `created_at` โดยปริยาย ที่เหลือ (month/year/approximate/unknown/evidence) **ยังไม่มีเลย** — แต่โครง `observed_at` + `birth_date_override` แสดงว่าทีมเดิมมีแนวคิดนี้ฝังอยู่แล้วบางส่วน

---

## 8. Data Presence Map — "ข้อมูลเหล่านี้อยู่ตรงไหนแล้วในระบบเดิม?"

ตอบ chain: Progressive Passport → Birth/Litter → Life Journey → Photo/Evidence → File Metadata → Date/Location/People

| Layer | ที่อยู่จริงของข้อมูลในระบบเดิม | สถานะ | งานที่เหลือใน pipeline |
|---|---|---|---|
| **1. Progressive Passport** | `pets` identity columns + view `ProgressivePassport.tsx` (✓/○ ต่อ field + completeness bar) + `pets.pet_code` (DB trigger) — ใช้งานจริงที่ `/pets/[id]` | **Existing** | เติม precision/evidence ต่อ field; **ไม่ต้องสร้าง Passport ใหม่** |
| **2. Birth / Litter** | `litters` table (birth_date, location, notes, parents id + name fallback) + wizard `birth/page.tsx` 3 steps + per-baby override (`birth_date_override`, `birth_weight`, `special_traits`) + list page `/pets/litters` | **Existing** | เติม precision + evidence ช่องวันที่ใน wizard; กลไก litter→baby mapping มีอยู่แล้ว |
| **3. Life Journey** | `life_journey_events` (content, event_type, media_urls, participant_ids, created_at, nest_id) + timeline add/delete ที่ `/pets/[id]` + auto first event ตอนเกิด + taxonomy 9 หมวด (`EventCategory`) | **Existing** (composer/feed เป็น orphan) | mapping `created_at` → recorded, เพิ่ม occurred/precision; ตัดสินใจ wire หรือลบ orphan |
| **4. Photo / Evidence** | `pets.avatar_url` (ใช้จริง) · `life_journey_events.media_urls` (คอลัมน์มีแต่**ไม่เคยถูกใช้**) · image upload แบบ dataURL ใน JourneyComposer (orphan) · certificate UI (`src/components/certificate/*`, ไม่พบ table ใน init schema — NOT VERIFIED) | **Partial** — photo มี แต่ evidence linkage ไม่มีเลย | สร้างชั้น evidence บาง ๆ (source_type/source_ref) + User Confirmation; **ยังไม่ต้องแตะ EXIF** |
| **5. File Metadata** | — ไม่มีอะไรใน code เลย | **Missing** (ตั้งใจ — out of scope ตามข้อกำหนดรอบนี้) | เมื่อทำจะอยู่ในชั้น evidence เท่านั้น ไม่ลง Fact ตรง |
| **6. Date / Location / People** | **Date:** `pets.birth_date` (exact เท่านั้น) + `birth_time`, `observed_at` (คอลัมน์มี ไม่มี UI) + `litters.birth_date` + `created_at` (ถูกใช้ผิดเป็น occurred) · **Location:** `litters.location` (free text) เท่านั้น — events ไม่มี location column · **People:** `author_id`, `participant_ids`, `home_members` (ติด RLS recursion), `tagged_*` (orphan types) | **Partial** | Date = mapping precision enum · Location = เลือก reuse แพทเทิร์น `litters.location` หรือเพิ่ม column · People = **แก้ RLS เป็นเงื่อนไขบรรทัดแรก** |

**ข้อสรุปจากแผนที่:** Layer 1–3 **ไม่ต้องสร้างใหม่เกือบทั้งหมด** — สิ่งที่ขาดคือสามขั้นตอนตามสมการ:

```
Existing Data → Mapping → Presentation → User Confirmation
```

- **Mapping:** precision enum + evidence ref ทับบนข้อมูลที่มีอยู่ (ไม่ย้ายบ้านข้อมูล)
- **Presentation:** แยกคำว่า "เกิดเมื่อ" (occurred) กับ "บันทึกเมื่อ" (recorded) บนหน้าจอ
- **User Confirmation:** metadata/ข้อเสนอจากรูปต้องผ่านการยืนยันก่อนกลายเป็น Fact

---

## 9. Gate Status & Environment/Tooling Issues

### Build Health Gate: ✅ PASS
- `tsc --noEmit` → PASS
- `vitest run` → PASS (25/25 — ขอบเขตเฉพาะ WelcomePage)
- `next build` → PASS (18 routes)

### Functional Evidence Gate: ⚠️ NOT PROVEN (ยังไม่ผ่าน — แต่ไม่ใช่ FAIL)
> **Build ผ่าน ≠ Passport/Journey ทำงานครบ**

- ไม่มี test ใดครอบคลุม Passport / Birth / Life Journey
- Orphan UIs (`HomeMode`, `PassportView`, `CreateMomentModal`) ยังไม่ถูกพิสูจน์ว่าทำงานจริง
- ประโยคที่ใช้ได้ตอนนี้: **"ระบบโดยรวม build ได้ แต่ capability ของ Passport/Life Journey ยังไม่ได้รับการพิสูจน์ด้วย test"**

### Environment/Tooling Issues (แยกจาก application correctness)

| ปัญหา | ผลกระทบ | การจัดการ |
|---|---|---|
| `node_modules` ถูกติดตั้งจาก Linux → `rolldown` มีเฉพาะ `binding-linux-x64-*` | Vitest รันบน Windows ไม่ได้ (**test tooling เท่านั้น** — ไม่กระทบ tsc/build) | ติดตั้ง `@rolldown/binding-win32-x64-msvc@1.2.7` ไว้นอกโปรเจกต์ (`/tmp/rolldown-win`) + `NODE_PATH` — repo, `package.json`, lockfile ไม่ถูกแตะ |
| การลอง `npm i --no-save` ครั้งแรก fail ด้วย ERESOLVE | ไม่เกิดการเปลี่ยนแปลงใดกับไฟล์ | ใช้วิธี temp dir แทน |
| `package.json` **ไม่มี script `test`** (มีแค่ dev/build/start/lint) | ต้องรันผ่าน `node_modules/.bin/vitest` ตรง | ข้อเสนอ: เพิ่ม `"test": "vitest run"` — เป็น code change เล็ก ทำรวมในรอบถัดไป |

---

## 10. Recommended Next Step (สำหรับ GLM รอบถัดไป)

0. **เดินตาม pipeline ให้ครบทุก layer:** Existing Data → Mapping → Presentation → User Confirmation — เริ่มจาก Date เพราะข้อมูลเก่า (`observed_at`, `birth_date_override`) รองรับแนวคิดนี้อยู่แล้ว
1. **ยึด `ProgressivePassport.tsx` เป็นฐาน** — อย่าสร้าง Passport ใหม่ ให้ extend: เพิ่ม `date_precision` ที่ field วันเกิด + ผูก evidence ต่อ field (ยังไม่ต้องทำ EXIF)
2. **รอบนี้ไม่ต้องสร้าง schema ใหม่** — แต่ถ้าจะทำในรอบถัดไป: `occurred_at` (timestamptz nullable), `date_precision` (enum: exact/month/year/approximate/unknown), `evidence` (source_type/source_ref) ครอบทั้ง events และ pet birth info — ออกแบบให้ `pets.observed_at` กลายเป็นกรณีเฉพาะของ evidence
3. **กำจัด False Completion ก่อนขยายงาน:**
   - ลบหรือ wire `PassportView`, `HomeMode`, `CreateMomentModal`, `mockData` ให้ชัดเจนว่าใช้/ไม่ใช้
   - แก้ `event_date` ให้ลง column จริง หรือตัด input ทิ้งก่อนจะหลอกผู้ใช้
4. **เขียน test แรกของ Passport/Journey** — อย่างน้อย test ว่า: birth wizard สร้าง event แรก, `event_date` behavior, precision display ที่จะเพิ่มใหม่
5. **แยกชั้น Fact vs Evidence** — UI แสดง "จากรูป" / "จากความจำ" ให้ต่างกัน แต่**ยังไม่ต้องตีความ metadata อัตโนมัติ**

---

*ตรวจโดย GLM Reconcile round — audit-only ไม่มีการแก้ไข source ใดๆ ทั้งสิ้น*
