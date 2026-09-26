# Event Storage Design — "โครงสร้างของ Life Journey Event ให้รองรับความหมายที่ UI พยายามให้ผู้ใช้ป้อน"

**Date:** 2026-09-26
**Branch:** `feature/home-creation-phase-0-999`
**Input:** PET_APPEARANCE_MODEL (Model CLOSED) · PATTERN_STORAGE_DESIGN (รอตัดสิน แยกกันตามขนาดผลกระทบ) · ผลตรวจ wiring จริง: HomeMode/JourneyComposer = orphan, CreateMomentModal = orphan
**Scope:** Design only — **ไม่ apply migration, ไม่สร้างไฟล์ migration จริง, ไม่แก้ code, ไม่เลือก UI widget**
**Chain:** DATA_SEMANTICS_AUDIT → TIME_MODEL → PET_APPEARANCE_MODEL → PATTERN_STORAGE_DESIGN → **EVENT_STORAGE_DESIGN** (ฉบับนี้)
**Reference Contract ที่ห้ามทำให้เสีย:** Birth Wizard Reference Vertical Slice (`POST litters 201` → `POST pets 201` → `POST life_journey_events 201` — PET-0001 มู่ทู่)

---

## 0. หลักฐานปัจจุบัน (จาก prod probes + repo — read-only ทั้งหมด)

### โครงสร้างจริงบน prod (จาก audit events columns เมื่อวาน)

| คอลัมน์ | ชนิด | มีบน prod | มีใน repo | ใครเขียนจริง |
|---|---|---|---|---|
| id, home_id, pet_id, author_id, content, event_type | — | ✅ | ✅ | Birth wizard ✅ (201 จริง) |
| media_urls | ARRAY | ✅ | ✅ | ❌ ไม่มี live flow |
| visibility | text 'family' | ✅ | ❌ | ❌ |
| nest_id, created_at, updated_at | — | ✅ | ✅ | system |
| **participant_ids UUID[]** | ARRAY | **❌ หาย** | ✅ (init:60) | orphan code พยายาม (`CreateMomentModal:34`) — จะตาย 42501/PGRST204 ถ้า wire จริง |

### UI ที่พยายามป้อน (orphan — พิสูจน์ความตั้งใจของทีม)

| ความสามารถ | Composer (orphan) | Storage วันนี้ | สถานะความหมาย |
|---|---|---|---|
| แท็ก Human หลายคน | ✅ `selectedMemberIds[]` | `participant_ids UUID[]` — **ไม่มีบน prod** | ไม่มีบ้าน |
| แท็ก Pet หลายตัว | ✅ `selectedPetIds[]` + "แท็กทั้งบ้าน" | `pet_id UUID` เดี่ยว | **ความหมายขาด** — เก็บได้ตัวเดียว |
| Author | ✅ | `author_id` ✅ | มีบ้านแล้ว |
| Content/Type/เวลา | ✅ | ✅ | มีบ้านแล้ว |

> **ข้อเท็จจริงนำ:** UI orphan ทั้งสองชุดพิสูจน์ว่าทีมตั้งใจให้ Event มี participants + pets[] มาตลอด — เหมือน `event_date` ที่ถูกทิ้งกลางทางใน audit แรก ความตั้งใจมีอยู่ แค่ storage ไม่เคยตาม

---

## 1. ตอบ 6 คำถามของเจ้าของบ้าน

### Q1 — Human หลายคน: `participant_ids UUID[]` หรือ junction table?

**ตัดสิน: `participant_ids UUID[]` พอ — คง column เดิมตาม repo init (Expose→Map→Connect ที่ค้างมาตั้งแต่แรก)**

| เกณฑ์ | UUID[] | junction `event_participants` |
|---|---|---|
| ความหมายที่ต้องการ | "ใครอยู่ในเรื่องนี้" — list ธรรมดา, ไม่มี metadata ต่อคน | รองรับ `role_at_event`/`joined_at` ต่อคน — **ยังไม่มีเคส** |
| การอ่าน | อ่าน row เดียวจบ | JOIN เพิ่มทุกครั้ง |
| ผลกระทบต่อ Birth Wizard | ✅ ไม่แตะเลย | ต้องเพิ่ม insert ที่สองต่อ event (แตะ reference slice โดยไม่จำเป็น) |
| ตรง convention บ้าน | ✅ คงที่มีใน init + orphan code เขียนรออยู่แล้ว | ตารางใหม่ = policies ใหม่ (บทเรียน drift) |
| เครื่องมือ filter | `= ANY(participant_ids)` ใช้ได้จริงใน PostgREST | ต้อง query ผ่านตารางลูก |

เงื่อนไขเปลี่ยนใจ (เขียนไว้ล่วงหน้า ไม่ใช่เดา): เมื่อต้องการ **บทบาทต่อคนในเหตุการณ์** (ผู้บันทึก/ผู้เข้าร่วม/ผู้ยืนยัน) หรือ **ลบ user แบบ cascade ล้าง list** อัตโนมัติ — ตอนนั้นขยับเป็น junction แบบมีเหตุผล

### Q2 — Pet หลายตัว: เปลี่ยน `pet_id UUID` เป็นอะไร?

**ตัดสิน: เพิ่ม `pet_ids UUID[]` คง `pet_id` เดิมไว้เป็น "primary pet" — ไม่ลบอะไร**

```
pets ที่เกี่ยว = [pet_id (primary)] ∪ pet_ids[]        (หลักการเดียวกับ litters.birth_date vs birth_date_override)
```

ทางเลือกที่พิจารณาแล้วไม่เลือก:
- **junction `event_pets`** — แข็งแรงสุดเชิง relational แต่: birth wizard ต้องเขียน 2 ตารางต่อ event (ทำให้ Reference Slice โยคยากขึ้นทันที), RLS ใหม่ทั้งชุด, และปัจจุบัน**ไม่มี query ไหนต้องการ** (grep ไม่มี filter ตาม pet ใน events) — over-engineering ณ วันนี้
- **เก็บ JSONB** — ผิดหลักเดียวกับที่ปฏิเสธใน PATTERN_STORAGE_DESIGN ทางเลือก B
- **TEXT[] เก็บชื่อ** — ชี้ชื่อ ไม่ชี้ identity — ผิดหลัก foreign key

จุดต่ออนาคต: ถ้าเคส "timeline ต่อแมวแต่ละตัว" กลายเป็น query หลักจริง (filter events โดย pet member) และ `ANY()` เริ่มช้า — ตอนนั้น migrate เป็น junction แบบมีหลักฐาน perf

### Q3 — Author กับ Participants แยกกันไหม?

**ตัดสิน: แยก semantic แต่ไม่ต้อง force เขียนซ้ำ — Author เป็น field เดิม `author_id`, Participants เป็น list ที่ประกอบด้วย author หรือไม่ก็ได้**

| เหตุผล | รายละเอียด |
|---|---|
| semantic คนละความหมาย | Author = ใครเขียน (บันทึกเมื่อไหร่จากใคร — provenance) · Participant = ใครอยู่ในเรื่อง (เนื้อเรื่อง) |
| ยืดหยุ่นตรงความจริง | แม่มู่บันทึกให้ลูก 3 ตัว: author=แม่มู่, participants=[แม่มู่, คุณพ่อ] — author อยู่ใน list · แต่ "น้องเกิด" อาจ participants=[ลูกแมว?] — ไม่, pets แยกชั้นอยู่แล้ว — ตัวอย่างจริง: คนอื่นบันทึกแทนและไม่ tag ตัวเอง |
| อ่านง่าย | Feed แสดง "บันทึกโดย X · ร่วมกับ [ผู้คน]" — ใช้สอง field ตรง ๆ |
| กฎ validation ย้ายไป app | "author ควรอยู่ใน participants ไหม" = กฎ UX ของ Composer (ตอนนี้ orphan tag ตัวเองอัตโนมัติ) — ไม่ฝังลง storage |

### Q4 — Event ไม่มี Pet ได้ไหม ("วันนี้ครอบครัวไปเที่ยวกัน")?

**ตัดสิน: ได้ — และ prod รองรับอยู่แล้ว (`pet_id` nullable ตาม init:55 `ON DELETE SET NULL`) — เพียงยืนยันว่าเป็น feature ไม่ใช่ bug**

- `pet_ids[]` ที่เสนอเป็น nullable เช่นกัน → "บันทึกเหตุการณ์บ้านล้วน" ถูกต้องตาม Model
- นี่คือเหตุผลหนึ่งที่ HomeMode จำเป็น: feed ควรแสดง event บ้านที่ไม่ผูกแมว (ปัจจุบัน timeline ต่อแมวกรองออกเองตามธรรมชาติ)
- RLS ไม่กระทบ: ทุก event ผูกกับ `home_id` เสมอ — สิทธิ์อยู่ที่บ้าน ไม่ใช่แมว

### Q5 — Event มีหลาย Pet แต่ไม่มี Human Participant ได้ไหม?

**ตัดสิน: ได้ — participants เป็น nullable/empty ได้ตามความจริงของเหตุการณ์**

- เคสจริง: birth wizard สร้าง "🐣 Chapter 01 — My Beginning" **ไม่มี human participants เลย** (มีแค่ author) — ถ้า force ให้ต้องมี = ทำให้ Reference Slice เสีย → ห้าม
- Matrix ความจริงที่ Model รองรับ (ทั้งหมด valid):

| pets | participants | เคสจริง |
|---|---|---|
| ✅ | — | Birth event (มีอยู่จริงแล้ววันนี้) |
| ✅ | ✅ | "ทั้งบ้านพา 3 ตัวไปหาหมอ กับพ่อแม่" |
| — | ✅ | "ครอบครัวกินข้าวรวมกัน" |
| — | — | บันทึกส่วนตัวล้วน (มี author ก็ยังมีความหมาย) |

### Q6 — Existing Birth Event ต้องอ่านได้เหมือนเดิมไหม?

**ตัดสิน: ต้อง — และ design นี้ออกแบบให้ Birth Wizard ไม่ต้องแก้แม้แต่บรรทัด**

| จุด | ยืนยัน |
|---|---|
| `pet_id` คงอยู่ + คงความหมาย primary pet | birth wizard ยัง insert แบบเดิม (one pet per event) → อ่าน/เขียนเหมือนเดิม 100% |
| `pet_ids[]` ใหม่ = nullable, default ไม่มี | แถวเดิม = `pet_ids: null` ≡ "ชุดเดียวกับ pet_id" (กติกาอ่าน: union) — ไม่ backfill ไม่ยุ่งข้อมูล |
| `participant_ids[]` ใหม่ = nullable | แถวเดิม = null ≡ ไม่มี human participant — ตรงกับที่ birth event เป็นอยู่แล้ว |
| ไม่มีการย้าย/ยุบ/แปลง | **Zero migration บนข้อมูลเดิม** — additive เท่านั้น (บทเรียน nickname/color: additive = ไม่ทำให้ slice ที่ปิดแล้วพัง) |

---

## 2. โครงสร้าง Event หลัง design (Target Shape)

```
LifeJourneyEvent
├── Event Identity:     id (เดิม)
├── Home (tenancy):     home_id (เดิม — RLS ยึดที่นี่เสมอ)
├── Author:             author_id (เดิม — provenance)
├── Pets:               pet_id (เดิม = primary) + pet_ids UUID[] (ใหม่, nullable, nullable ต่อ Q4)
├── Participants:       participant_ids UUID[] (restore — หายบน prod, มีใน repo init)
├── Content:            content (เดิม)
├── Event Type:         event_type (เดิม)
├── Timestamps:         created_at / updated_at (เดิม — ตาม TIME_MODEL)
└── (media_urls, visibility, nest_id — คงเดิม ไม่ยุ่ง)
```

**กติกาอ่าน (app-level, เขียนครั้งเดียวเป็น helper ในอนาคต):** `allPets = [pet_id] if not null, then pet_ids[] minus duplicates of pet_id`

## 3. Migration Sketch — เอกสารเท่านั้น ยังไม่สร้างไฟล์ ยังไม่ apply

```
-- ชื่อที่เสนอเมื่ออนุมัติ: 20260926200000_add_event_pets_and_participants.sql
-- (1) restore participants — ปิด drift ระหว่าง repo init กับ prod
ALTER TABLE public.life_journey_events
  ADD COLUMN IF NOT EXISTS participant_ids UUID[];
-- (2) multi-pet — เก็บเป็น list, pet_id เดิมคือ primary
ALTER TABLE public.life_journey_events
  ADD COLUMN IF NOT EXISTS pet_ids UUID[];
-- (3) เพิ่ม RLS ไม่จำเป็น: คอลัมน์ใหม่อยู่ใต้ policies เดิมของตาราง (เหมือนกรณี nickname/color)
-- (4) ไม่ backfill: birth events เดิมถูกต้องตามกติกาอ่านแล้ว
-- CHECK แบบ color_pattern? — ไม่เสนอ: UUID[] ไม่มี enum domain ให้ lock, integrity อยู่ที่ FK ระดับแถวซึ่ง array ทำไม่ได้
--   → ความถูกต้อง "ทุก id เป็นแมวของบ้านเดียวกัน" เป็นหน้าที่ app-level validation ณ insert time (จะเขียนใน Payload slice)
```

**หมายเหตุความแตกต่างจาก Pattern (เหตุผลที่เจ้าของบ้านสั่งแยกเอกสาร):** อันนี้คือ "นิยามโครงสร้าง Event ใหม่" ทั้งที่ prod ขาดคอลัมน์ repo ด้วยซ้ำ — ขนาดผลกระทบใหญ่กว่า color_pattern (attribute เดียว) จึงอยู่ต่างห้อง แต่ deploy checklist เดียวกัน (§5 ของ PATTERN_STORAGE_DESIGN): **apply บน prod ก่อน code ที่ใช้ → read-back → แล้วค่อย Input**

## 4. ผลต่อชิ้นอื่น (ทำให้เห็นเป็นระบบ)

| ชิ้น | ผล |
|---|---|
| JourneyComposer (orphan) | หลัง apply: multi-pet + participant tagging **มีบ้านจริง** — wire ได้ใน slice Home Mode (ยังไม่ทำตอนนี้) |
| CreateMomentModal (orphan) | `participant_ids:[userId]` จะไม่ตายอีกต่อไป — แต่ตัดสินเอาไว้ใช้/ลบทีหลังใน Home Mode slice |
| Birth Wizard | ศูนย์ผลกระทบ — Reference Contract คงเดิม (Q6) |
| TIME_MODEL | ไม่แตะ — occurred/recorded ของ events ยังเป็น decision ค้างของ TIME_MODEL เอง (event occurred time) ไม่ผสมห้องนี้ |
| Home Mode route | ยังพัก — design นี้คือเงื่อนไขเบื้องหลังที่ทำให้คำถาม "Create Home แล้วไปไหน" จะตอบได้ถูกเมื่อถึงคราว |

## 5. สิ่งที่ยังไม่ตัดสิน (เก็บไว้ให้ตรง scope)

- ❌ apply จริง / สร้างไฟล์ migration จริง — รวมตัดสินกับ Pattern Storage ตอน Reconcile รวม
- ❌ UI ของ participants/pets[] (แสดงยังไงใน feed) — Home Mode slice
- ❌ validation กฎ Q3/Q4/Q5 ที่ app-level — Payload slice
- ❌ การตัด CreateMomentModal หรือว่าใช้มัน — Home Mode slice

---

*ตรวจโดย GLM (Codebuff) — 6 คำถาม · design only · ไม่มี code/migration ถูกแตะในเอกสารนี้*
