# Data Semantics Audit — "ตอนนี้ Meow World รู้อะไรอยู่แล้ว และแต่ละข้อมูลหมายความว่าอะไรจริง ๆ"

**Date:** 2026-09-23
**Branch:** `claude-welcome-entry` (HEAD `a04882f`, ต่อจาก Decision A ใน `PRESENTATION_DECISION_AUDIT.md`)
**Scope:** Audit only — ไม่แก้ code, ไม่ migration, ไม่ตัดสินว่าจะเพิ่ม `occurred_at` / `date_precision` หรือไม่
**Method:** Trace จริงทุก field ที่เกี่ยวกับเวลา/วันที่: schema (13 migrations) → write sites → read sites → UI

**หลักยึดของรอบนี้:** ถ้า schema เดิมมีบางส่วนทำหน้าที่นี้อยู่แล้ว → **Expose → Map → Connect** แทน **Build → Migrate → Duplicate**

---

## 1. สรุปผูกพันรอบนี้ (ตอบคำถามเดียว)

> ระบบปัจจุบันมี **เวลาอยู่ 3 ชั้น** ที่ประกาศไว้ใน schema แต่มีเพียง **ชั้นเดียว** ที่ถูกใช้จริง:

| ชั้น | Semantics | ตัวตนใน DB ปัจจุบัน | สถานะ |
|---|---|---|---|
| **A. เวลาที่เหตุการณ์เกิด** (occurred) | "วันเกิดน้อง", "วันที่เหตุการณ์นั้นเกิด" | `pets.birth_date`, `litters.birth_date`, `pets.birth_time`, **(events: ไม่มีเลย)** | ⚠️ มีเฉพาะ birth / ไม่มี events |
| **B. เวลาที่บันทึก** (recorded) | "เราเขียนแถวนี้เมื่อไหร่" | `created_at` ทุกตาราง (DEFAULT NOW()) | ✅ มีและใช้อยู่ |
| **C. เวลาที่เฝ้าดู/ยืนยัน** (observed) | "เราพบเห็น/รับรู้ข้อเท็จจริงนี้เมื่อไหร่" | `pets.observed_at` (TIMESTAMPTZ, nullable) | 🔒 มีใน DB แต่**ไม่มีใครเขียน/อ่านเลย** |

**ข้อค้นพบสำคัญที่สุด:** การแยก occurred ≠ recorded **มีอยู่แล้วใน schema** อย่างน้อย 2 จุด (`birth_date` vs `created_at`, `observed_at`) — ที่ขาดไม่ใช่ "แนวคิด" แต่คือ **การเชื่อม UI กับมัน** และ **ช่อง occurred ของ `life_journey_events` เพียงจุดเดียว**

---

## 2. Mapping Table ต่อ Field (ตามฟอร์แมตที่กำหนด)

### 2.1 `created_at` — recorded time ที่ถูกใช้แทนทุกความหมาย

| หัวข้อ | ข้อเท็จจริง (Evidence) |
|---|---|
| **Where it lives** | ทุกตาราง: `profiles`, `homes`, `pets`, `life_journey_events`, `litters`, `qr_tokens`, `nests`, `feature_flags`, community/market (init schema L9/19/47/61, litters L20, ฯลฯ) |
| **Current meaning** | **DB row creation time** — เจ้าของความหมายคือ DB default `NOW()` ฝั่ง server |
| **Who owns the meaning** | Database (client ไม่เคย set ค่าเอง — grep ไม่พบ insert ที่ส่ง `created_at` เข้า pets/events จริง) |
| **When written** | ตอน INSERT โดย default ของคอลัมน์ |
| **Where read** | • Sort timeline: `pets/[id]/page.tsx:54` • Sort lists: `pets/page.tsx:49`, `litters/page.tsx:48`, `nests/page.tsx:61` • Stats 7 วัน: `admin/dashboard/page.tsx:101` • Notifications: `useRealtimeNotifications.ts:52` • Token list: `TokenList.tsx:59` |
| **UI usage** | • **แสดงเป็น "วันที่ของเหตุการณ์" ใน timeline** (`pets/[id]:281` — `format(created_at, 'd MMM yyyy')`) ← *นี่คือจุดที่ recorded ถูกตีความเป็น occurred* • "สร้างเมื่อ" ของ pet (`pets/[id]:226`, `PetCard.tsx:78`) • "สร้างเมื่อ" ของ litter (`litters:238`) • สร้างปีใน Passport ID (`PassportView.tsx:161`) |
| **Conflict / ambiguity** | (1) **Timeline sort จะพังทันทีที่มีการบันทึกย้อนหลัง** — เพราะ `created_at` บอก "วันไหนที่พิมพ์" ไม่ใช่ "วันไหนที่มันเกิด" (2) Passport ID ใช้ปีจาก created_at ขัดกับ `pet_code` PET-000x (trigger) — ระบบ ID สองชุดซ้อน (3) admin นับ "events 7 วัน" จาก created_at = นับกิจกรรมการบันทึก ไม่ใช่เหตุการณ์จริงในสัปดาห์นั้น |

### 2.2 `observed_at` — เมล็ดของ semantics ชั้น C ที่ถูกฝังไว้แล้วแต่ไม่มีใครปลุก

| หัวข้อ | ข้อเท็จจริง |
|---|---|
| **Where it lives** | `pets.observed_at` TIMESTAMPTZ nullable — เพิ่มโดย migration `20260901200000_create_litters.sql:55` |
| **Current meaning** | **ไม่มี consumer กำหนดความหมาย** — ประกาศค้างไว้เฉย ๆ |
| **Who owns the meaning** | **ยังไม่มีใคร** — type เดียวที่อ้างถึงคือ `types/pet.ts:23` |
| **When written** | **ไม่เคย** — grep ทั้ง `src/` ไม่มี write/read ใด ๆ (ต่างจาก reconcile report รอบก่อนที่ระบุไว้ตรงกัน) |
| **Where read** | ไม่มี |
| **UI usage** | ไม่มี |
| **Conflict / ambiguity** | ชื่อ field บ่ง "เวลาที่พบเห็น" แต่ถูกเพิ่มพร้อมกลุ่ม birth fields (`birth_time` L54, `observed_at` L55 ติดกัน) → ตีความที่ตั้งใจน่าจะเป็น **"เวลาที่เรารับรู้การเกิด"** = ชั้น C ของ birth. ⚠️ นี่คือ **capacity ที่มีอยู่แล้วโดยไม่ต้อง migrate** |

### 2.3 `birth_date` (pets + litters) — occurred ที่ถูกบังคับเป็น exact

| หัวข้อ | ข้อเท็จจริง |
|---|---|
| **Where it lives** | `pets.birth_date DATE` (init L43, nullable), `litters.birth_date DATE` (litters L8, nullable) |
| **Current meaning** | **วันที่เกิด (occurred)** — ความหมายที่ตั้งใจชัดเจน |
| **Who owns the meaning** | App layer ทั้งหมด: birth wizard, PetForm, AddPetModal, PassportView edit |
| **When written** | • Birth wizard: shared → `litters.birth_date` (`birth/page.tsx:154`), per-baby → `pets.birth_date` (`:181`) • Edit: `PetForm.tsx:20,129` • `AddPetModal.tsx:56` |
| **Where read** | อายุ: `calculateAge` ใน `PetCard.tsx:15`, `HouseGraphicCard.tsx:224`, `pets/[id]:152` • Passport: `ProgressivePassport.tsx:155-159` • Litters list: `litters:173` |
| **UI usage** | แสดงเป็นวันเต็ม `d MMMM yyyy` เสมอ + คำนวณอายุ |
| **Conflict / ambiguity** | (1) **DATE type = บังคับ precision ระดับวัน** ทั้งที่ litters.birth_date nullable แต่ wizard บังคับกรอก (`birth/page.tsx:403`) — ไม่มีทางเลือก "ไม่ทราบ/เดือนที่ทราบ" (2) อายุ (`calculateAge`) พึ่ง exact date โดยตรง — ถ้า precision ลดลง สูตรอายุจะต้องเปลี่ยนความหมายตาม (3) birth wizard ยังฝังวันที่ลง prose อีกชั้น (`Birth Date: ...` ใน content, `birth/page.tsx:200`) — ข้อมูลเดียวซ้ำ 2 รูปแบบ |

### 2.4 `birth_date_override` — แนวคิดที่มีชีวิตเฉพาะฟอร์ม แล้วละลายหายที่ DB

| หัวข้อ | ข้อเท็จจริง |
|---|---|
| **Where it lives** | **ไม่มีใน DB** — มีเฉพาะ client: `types/pet.ts:99` (พร้อม comment "if different from litter default") + state ของ birth wizard |
| **Current meaning** | "ลูกตัวนี้เกิดไม่ตรงกับวันของครอก" — กลไก per-baby override |
| **Who owns the meaning** | Birth wizard เท่านั้น |
| **When written** | ณ ปุ่ม submit: `birth/page.tsx:181` — `birth_date: baby.birth_date_override || sharedData.birth_date || null` |
| **Where read** | ไม่มี — ค่าถูก **ยุบรวมเข้า `pets.birth_date`** ทันทีตอน insert |
| **UI usage** | Review step แสดง per-baby (`:580`) |
| **Conflict / ambiguity** | **Provenance หายถาวรหลัง insert** — หลังบันทึก ระบบไม่มีทางรู้อีกเลยว่าวันเกิดตัวนี้ "มาจากครอก" หรือ "ผู้ใช้กรอกเองต่างหาก" ทั้งที่ตอนกรอก ระบบรู้. นี่คือร่องรอยของ concept "วันตามครอก vs วันตามที่ยืนยันเอง" ที่มีอยู่แล้วใน UX แต่ไม่ถูกเก็บ |

### 2.5 `event_date` — ช่องว่างเชิงโครงสร้างที่ UI หลอกตัวเอง

| หัวข้อ | ข้อเท็จจริง |
|---|---|
| **Where it lives** | **ไม่มีใน DB** — `life_journey_events` ไม่มีคอลัมน์นี้ (init L52-63 + updated_at จาก migration 20260901000000 เท่านั้น) มีเฉพาะ: `types/pet.ts:50,56`, `types/index.ts:57`, mockData, orphan components |
| **Current meaning** | "วันที่เหตุการณ์เกิด" ในความเข้าใจของผู้ใช้ที่กรอกฟอร์ม |
| **Who owns the meaning** | EventForm (หน้าจอจริงที่ใช้งานได้!) — ตั้ง default = **วันนี้** (`pets/[id]:327`) |
| **When written** | **ไม่เคยถึง DB** — `handleAddEvent` รับค่าแล้วทิ้ง (`pets/[id]:91-103`: คอมเมนต์บอกว่า "stored as metadata in content or just use created_at" แต่จริง ๆ โค้ด**ไม่ใส่ลง content ด้วยซ้ำ** — title/description เข้า content, event_date หายเงียบ) |
| **Where read** | เฉพาะ orphan UI (`JourneyFeedCard.tsx:128`, `PassportView.tsx:482,519`, mockData) |
| **UI usage** | EventForm แสดง `<input type="date">` ให้กรอก (`pets/[id]:347`) — ผู้ใช้เชื่อว่าบันทึกวันที่ได้ |
| **Conflict / ambiguity** | **False completion ระดับร้ายแรงที่สุดของระบบเวลา** — ฟอร์มเก็บค่า, DB ทิ้ง, timeline แสดง created_at แทน → ผู้ใช้บันทึกเหตุการณ์ "เมื่อวาน" วันนี้ แล้วเห็นเป็นวันนี้. ⚠️ จุดนี้คือ**เหตุผลเชิงหลักฐาน**ว่าทำไม events จึงเป็นช่องเดียวที่ Expose→Map→Connect **ไม่ครบ** — เพราะไม่มี column ใดใน `life_journey_events` รองรับ occurred (content เป็น TEXT blob ฝังวันที่เป็น prose ไม่ได้ = ไม่ใช่ structure) |

### 2.6 `recorded_at` — concept ที่ไม่เคยมีตัวตน

| หัวข้อ | ข้อเท็จจริง |
|---|---|
| **Where it lives** | **ไม่มี column ชื่อนี้ทั้งระบบ** (grep ทั้ง migrations + src) |
| **Current meaning** | ไม่มี — บทบาทนี้ถูก `created_at` รับไปโดยปริยาย |
| **Conflict / ambiguity** | ไม่มีปัญหาเชิง structure — เป็นเพียง "ชื่อที่ยังไม่ถูกตั้ง" ให้ created_at การตีความ created_at เป็น recorded ไม่ต้อง migrate เลย เพียงแค่**ตั้งชื่อความหมายใน UI/เอกสาร**

### 2.7 `updated_at` (pets, life_journey_events) — เขียนโดย trigger อ่านโดยไม่มีใคร

| หัวข้อ | ข้อเท็จจริง |
|---|---|
| **Where it lives** | `pets.updated_at` + `life_journey_events.updated_at` (migration `20260901000000:9,27`) + litters/nests/flags/community |
| **Current meaning** | เวลา mutation ล่าสุดของแถว (system-level, trigger `update_updated_at_column`) |
| **Who owns the meaning** | Database trigger 100% |
| **When written** | ทุกครั้งที่ UPDATE (BEFORE UPDATE trigger) |
| **Where read** | **ไม่มี UI อ่าน pets/events updated_at เลย** (grep ทั้ง src — zero hits) |
| **UI usage** | ไม่มี |
| **Conflict / ambiguity** | ไม่มี conflict — เป็น write-only metadata ที่สงวนไว้ (มีประโยชน์อนาคตสำหรับ sync/evidence "แก้ไขล่าสุดเมื่อไหร่" ของเหตุการณ์) |

### 2.8 Upload time / file time — ยังไม่มีอยู่จริงแม้แต่ชั้นเดียว

| หัวข้อ | ข้อเท็จจริง |
|---|---|
| **Where it lives** | **ไม่มี pipeline** — `pets.avatar_url` (TEXT, ไม่มีเวลากำกับ), `life_journey_events.media_urls TEXT[]` (init L59 — **คอลัมน์มีแต่ไม่เคยถูก insert/read จาก live flow**, ยืนยันซ้ำจาก reconcile report) |
| **Current meaning** | ไม่มี file time ใด ๆ ในระบบ |
| **เพียงข้อยกเว้น** | Certificate in-memory: `DigitalCertificateModal.tsx:121` set `created_at: new Date().toISOString()` — เป็น object ฝั่ง client ไม่ใช่ DB |
| **Conflict / ambiguity** | เมื่อ Evidence layer มาถึง (ตาม roadmap) "upload time" จะเป็นเวลา recorded ของหลักฐาน — ปัจจุบันไม่มีที่เก็บ จึง**ไม่มีอะไรต้อง mapping** รอบนี้ |

### 2.9 ตารางเสริมที่เกี่ยว: `joined_at` + qr_tokens trio

| Field | Lives | Meaning | สถานะ |
|---|---|---|---|
| `home_members.joined_at` | init L29 | เวลาที่เข้าร่วมบ้านเกิดขึ้นจริง (occurred = recorded เพราะเกิดตอนกด) | ถูกต้องเชิง semantics แต่ real UI ไม่แสดง (มีแต่ mockData) |
| `qr_tokens.used_at` | TokenList.tsx:80, adopt:138 | **เวลาที่ action เกิด ณ ขณะนั้น** — client set `new Date().toISOString()` ตอน consume | ✅ **ตัวอย่างที่ดีที่สุดใน codebase**: จับ "เวลาเกิดของเหตุการณ์" ที่ moment ที่มันเกิดจริง |
| `qr_tokens.expires_at` | QRGenerator.tsx:74 | เวลาในอนาคตที่กำหนด | ปกติ |

> ข้อสังเกต: `qr_tokens` พิสูจน์ว่า **ทีมเดิมเขียน pattern "occurred at action time" มาแล้ว** — แค่ไม่เคยถูกขยายไปที่ journey events

---

## 3. แผนที่รวม: ใครถือความหมาย "เวลา" อยู่ในมือใคร

```
ชั้นความหมาย        pets          litters       life_journey_events
─────────────────────────────────────────────────────────────────
OCCURRED        birth_date    birth_date     ❌ ไม่มี (event_date
(+birth_time)   (DATE exact)  (DATE exact)      หลุดกลางทาง)
                                                            
OBSERVED        observed_at   —              ❌ ไม่มี
                (มีแต่ไม่มี                 
                 ใครแตะ)                    
                                                            
RECORDED        created_at    created_at     created_at ← ถูกใช้
                updated_at    updated_at     updated_at    แทน occurred
                (ไม่มีใคร     (แสดง"สร้าง     (แสดงเป็น    
                 อ่าน)         เมื่อ"ถูกต้อง)  วันที่เหตุการณ์❌)
```

**อ่านแผนที่นี้ได้ว่า:**
1. **litters** เกือบสมบูรณ์: occurred (birth_date) ≠ recorded (created_at) แยกกันชัด และ UI "สร้างเมื่อ" ใช้ถูกต้อง
2. **pets** มีครบ 3 ชั้นใน schema แต่ observed_at ยังไม่ถูก expose — **เป็น candidate อันดับหนึ่งของ Expose→Map→Connect**
3. **life_journey_events** เป็นชั้นเดียวที่ occurred **ไม่มีตัวตนเลย** — UI จึงยืม created_at มาใช้แทน และ EventForm เก็บ event_date ในฝั่งอากาศ

---

## 4. ช่องว่างที่ Expose→Map→Connect ครอบคลุมได้ vs ไม่ได้ (ไม่ตัดสิน — แค่วางข้อเท็จจริง)

### ✅ ครอบคลุมได้โดยไม่ต้อง migrate
| รายการ | วิธีเชิงแนวคิด |
|---|---|
| `observed_at` บน pets | Expose ใน birth wizard + ProgressivePassport ("เมื่อไหร่ที่เรารู้จักน้อง") — column พร้อมอยู่แล้ว |
| `created_at` → recorded | ตั้งชื่อ/แสดงผลให้ต่างจาก occurred ("บันทึกเมื่อ") — ไม่ต้องแตะ DB |
| `birth_date_override` provenance | Wizard **รู้อยู่แล้วตอน insert** ว่าเป็น override — ความรู้นี้แค่ต้องถูกพาไปถึง presentation ก่อนที่มันจะหาย (หมายเหตุ: ถ้าต้องการ provenance หลัง insert ถาวร อาจต้องมีที่เก็บ — เป็นข้อตัดสินรอบถัดไป ไม่ใช่รอบนี้) |
| `media_urls` | คอลัมน์พร้อม — เมื่อ Evidence layer มา ใช้เป็นที่เก็บ source ได้ทันที |
| Sort litters ด้วย birth_date | ปัจจุบัน sort ด้วย created_at (`litters:48`) ทั้งที่ occurred มีอยู่ — เปลี่ยนการอ่าน ไม่ใช่เปลี่ยน schema |

### ⚠️ จุดเดียวที่ Expose→Map→Connect **ไม่ครอบคลุม**
> **`life_journey_events` ไม่มี column ใดถือ occurred** — content เป็น TEXT, event_date ถูกทิ้ง, created_at คือ recorded.
> ข้อเท็จจริงนี้หมายความว่า: ถ้าวันหน้าต้องการให้ event มี "วันที่เกิดจริง" อย่างถูกต้อง **จะเป็น migrate ครั้งเดียวที่หลีกเลี่ยงไม่ได้** (ชื่อ/รูปแบบ/precision ใด ๆ เป็นการตัดสินรอบ Time Model — **ไม่ตัดสินในรอบนี้**)
>
> สิ่งที่ค้นพบเพิ่มจากการ trace: `birth_date_override` + `event_date` เป็นหลักฐานว่า **UX layer ออกแบบมาสำหรับ occurred อยู่แล้ว** — ทั้งคู่ตายเพราะไม่มีที่ไป ไม่ใช่เพราะไม่มีความตั้งใจ

---

## 5. Conflict Register (สรุปทุก conflict ในไฟล์เดียว)

| # | Conflict | ความรุนแรง | ผู้เสียหาย |
|---|---|---|---|
| 1 | Timeline แสดง created_at เป็น "วันที่เหตุการณ์" (`pets/[id]:281`) | 🔴 สูง — บิดเบือนประวัติโดยตรง | ผู้ใช้บันทึกย้อนหลังทุกคน |
| 2 | EventForm ให้เลือก event_date แต่ค่าถูกทิ้ง (`pets/[id]:91-103,327,347`) | 🔴 สูง — false completion | ผู้ใช้ทุกคนที่กรอกวันที่ |
| 3 | Birth wizard ฝังวันที่เป็น prose ใน content (`birth/page.tsx:200`) ซ้ำกับ birth_date | 🟡 กลาง — ข้อมูลซ้ำ 2 รูปแบบ | การ parse/ยืนยันภายหลัง |
| 4 | birth_date_override ยุบหายที่ DB (`birth/page.tsx:181`) — provenance หาย | 🟡 กลาง | กรณี "วันเกิดตัวนี้ไม่ตรงครอก" |
| 5 | observed_at ไม่ถูกใช้แม้แต่บรรทัดเดียว | 🟢 ต่ำ — โอกาสมากกว่าปัญหา | — |
| 6 | Sort litters/events ด้วย recorded แทน occurred | 🟡 กลาง | ลำดับประวัติ |
| 7 | Passport ID จาก created_at year ขัดกับ pet_code trigger | 🟢 ต่ำ — ID สองระบบซ้อน | PassportView (orphan) |
| 8 | DATE บังคับ precision=exact ทั้ง pets และ litters; ไม่มี "ไม่ทราบ" | 🟡 กลาง | แมวที่รับมาเลี้ยงไม่รู้วันเกิด |
| 9 | media_urls ไม่เคยถูกใช้ — upload time ไม่มีตัวตน | 🟢 ต่ำ (out of scope รอบนี้) | Evidence layer อนาคต |

---

## 6. สิ่งที่รอบนี้**ไม่ได้ตัดสิน** (ตามข้อตกลง)

- ❌ ไม่ตัดสินว่าจะเพิ่ม `occurred_at` / `date_precision` / evidence table หรือไม่
- ❌ ไม่แก้ `event_date` bug, ไม่แก้ sort, ไม่ expose `observed_at` (เป็น code change)
- ❌ ไม่แตะ EXIF / file metadata
- ✅ ได้เพียง: **แผนที่ความหมายจริงของทุก field เวลา** + ข้อเท็จจริงว่า occurred/recorded split **มีอยู่แล้วบางส่วนใน schema** + จุดเดียวที่ migrate หลีกเลี่ยงไม่ได้คือ events

---

## 7. ทางต่อไปบนกระดาน

```
Presentation Decision ✅ → Git Scope ✅ → Data Semantics Audit ✅ (ฉบับนี้)
                                    ↓
                              Time Model   ← NEXT (ตัดสิน: occurred ของ events
                                             เป็น column ใด / precision แบบใด)
                                    ↓
                                Evidence
                                    ↓
                            Functional Tests
```

คำถามที่ Time Model จะต้องตอบ (เก็บมาจากรอบนี้):
1. Events: เพิ่ม occurred ที่ column เดียว หรือยุบเข้า content — โดยมีข้อเท็จจริงว่า event_date ถูกทิ้งมาตลอด
2. Precision: DATE ปัจจุบันบังคับ exact — pets.observed_at จะถูก define บทบาทอย่างไร
3. Override provenance: เก็บถาวรที่ DB หรือพอแค่ตอน insert

---

*ตรวจโดย GLM — Data Semantics Audit round: trace-based, no code changes, no migrations*
