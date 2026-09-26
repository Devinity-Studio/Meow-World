# Presentation Decision Audit — Life Journey + Progressive Passport Spine

**Date:** 2026-09-23
**Branch:** `claude-welcome-entry` (HEAD `16695df`)
**คำถามเดียวของ audit นี้:** "ใช้ `/pets/[id]` เป็น Life Journey + Progressive Passport spine ต่อไป หรือกู้ Presentation Layer เดิม (HomeMode cluster) กลับมา?"
**ข้อจำกัด:** ห้ามแก้ code / ห้ามลบ code — เดินด้วย Evidence ล้วน
**Method:** Trace จริงทุกเส้นทาง: Welcome → Action → Destination → Data/Behavior → DB writes

---

## 1. บันไดสถานะ (ตามที่กำหนด)

```
EXISTS      route/component มีจริงใน source
BUILT       Next build สร้าง route นี้จริง (18 routes จาก next build)
REACHABLE   มีเส้นทางจาก Welcome/User action ไปถึง
FUNCTIONAL  action ทำงาน + data flow จริง
PERSISTED   ผลลัพธ์ถูกบันทึก DB จริง (code-level)
VERIFIED    มี test/evidence รองรับ
```

> หลักยึด: "มี route/component" ≠ "มี functionality จริง" และ "มี code รองรับ" ≠ "มี evidence ว่าใช้จริง"

---

## 2. Trace เส้นทางจาก Welcome (`/`)

Welcome page (`src/app/page.tsx`) มีทางออก **3 เส้น**:

| # | Action | Destination | สถานะ | Evidence |
|---|---|---|---|---|
| 1 | แตะบ้าน (house button) | `/world` | ❌ **BROKEN — ไม่มี route นี้ใน build** (18 routes ไม่มี /world) | `page.tsx:64` + build output + test `WelcomePage.test.tsx:125-147` ยืนยันว่า source**ตั้งใจ**พาไป /world |
| 2 | "เพิ่มสมาชิก" | `/pets/birth` | ✅ BUILT + REACHABLE | `page.tsx:136` |
| 3 | "สแกน QR" | `/scan` | ❌ **BROKEN — ไม่มี route นี้ใน build** | `page.tsx:138` + test `:237-244` |

**ข้อสรุปเรื่อง /world และ /scan:** source **และ test** ระบุชัดว่า Welcome ต้อง navigate ไป 2 route นี้ → เป็น **broken journey ที่บันทึกไว้จริง** (ไม่ใช่แค่ "route ไม่มี") แต่**ไม่ใช่ blocker ของ Passport/Journey** เพราะทางออกที่มีชีวิต (เส้นทางที่ 2) วิ่งเข้าสู่ระบบ pet โดยตรง:

```
Welcome → /pets/birth (wizard) → /pets → /pets/[id] → Passport/QR/Journey   ← เส้นทางที่มีชีวิต
Welcome → /world (ตาย) · Welcome → /scan → QRScannerModal (orphan) → /adopt/[token]   ← เส้นทางสาขาที่ขาด
```

> ทางเข้า `/adopt/[token]` จริงๆ ใน production คือ**การสแกน QR จากกล้องภายนอกเครื่องผู้รับ** (URL ใน QR) — ไม่ผ่าน /scan ในแอป จึงยังพอเดินได้แบบ external ส่วน QRScannerModal (in-app scanner) เป็น orphan: ไม่มี page ใด render

---

## 3. ตาราง Trace ทุก Route (ladder ต่อ route)

| Route | EXISTS | BUILT | REACHABLE | FUNCTIONAL | PERSISTED | VERIFIED |
|---|---|---|---|---|---|---|
| `/` (Welcome) | ✅ | ✅ | — (จุดเริ่ม) | ⚠️ 1/3 actions มีปลายทาง | n/a | ✅ 25 tests |
| `/pets/birth` | ✅ | ✅ | ✅ (Welcome, /pets, /pets/litters) | ✅ wizard 3 steps | ✅ litters + pets + first journey event | ❌ |
| `/pets` | ✅ | ✅ | ✅ (birth done, litters, adopt success, admin) | ✅ CRUD | ✅ pets CRUD | ❌ |
| **`/pets/[id]`** | ✅ | ✅ | ✅ (/pets, /pets/litters, adopt success) | ✅ add/delete event, Passport modal, QR share, Tokens | ✅ events + qr_tokens (QRGenerator insert ที่ `QRGenerator.tsx:68-69`) | ❌ |
| `/pets/[id]/edit` | ✅ | ✅ | ✅ (จาก /pets/[id]) | ✅ | ✅ pets.update | ❌ |
| `/pets/litters` | ✅ | ✅ | ⚠️ จาก /pets เท่านั้น | ✅ list/delete (unlink ลูกก่อนลบ) | ✅ | ❌ |
| `/adopt/[token]` | ✅ | ✅ | ⚠️ **external QR เท่านั้น** (in-app scanner orphan, /scan ไม่มี) | ✅ validateToken API + optimistic lock | ✅ qr_tokens + homes + home_members + pets.transfer | ❌ |
| `/login`, forgot/reset | ✅ | ✅ | ✅ (landing, nests, admin redirect) | ✅ (TRACKING 30 ส.ค. ทดสอบบน prod แล้ว) | ✅ | ⚠️ ทดสอบด้วยมือครั้ง历史 ไม่มี test อัตโนมัติ |
| `/nests` | ✅ | ✅ | ❌ **ไม่มีใคร push ไป /nests** | ⚠️ ขึ้นกับ feature flag + **self-link `/nests/[id]` ไม่มีใน build** | ✅ nests CRUD | ❌ |
| `/landing` | ✅ | ✅ | ❌ **ไม่มี inbound link** | static page | n/a | ❌ |
| `/admin/dashboard`, `/admin/flags` | ✅ | ✅ | ❌ ไม่มีทางเข้าจาก flow หลัก | ⚠️ | ✅ feature_flags | ❌ |
| `/api/tokens/validate` | ✅ | ✅ (ƒ) | ✅ (ถูกเรียกจาก adopt) | ✅ | read-only | ❌ |
| `/api/test-tokens` | ✅ | ✅ (○ static!) | ❌ | dev tool | read | ❌ |
| `/world`, `/scan` | ✅ ใน source | ❌ **ไม่มีใน build** | ❌ | ❌ | — | test ยืนยันว่าตั้งใจให้มี |

---

## 4. Decision Matrix (ตามฟอร์แมตที่กำหนด)

| Candidate | ใช้จริง (Reachable) | Data จริง | Interaction จริง | Test | สถานะสูงสุดบนบันได |
|---|---|---|---|---|---|
| **`/pets/[id]` spine** (detail + Passport + timeline) | ✅ | ✅ pets + life_journey_events | ✅ add/delete event, passport, QR share persist | ❌ 0 tests | **PERSISTED** |
| `/pets` (list/CRUD) | ✅ | ✅ | ✅ | ❌ | **PERSISTED** |
| `/pets/birth` (wizard) | ✅ | ✅ | ✅ | ❌ | **PERSISTED** |
| **HomeMode** (`HomeMode.tsx`) | ❌ ไม่มี importer | ❌ ใช้ type `Family`/`JourneyEvent` ที่**ไม่มีตารางจริง** (families ไม่มีใน DB) | ⚠️ รับ callback อย่างเดียว | ❌ | **EXISTS** (ไม่ถึง BUILT เพราะไม่มี route ใด render) |
| **JourneyFeedCard** | ❌ (ถูกเรียกโดย HomeMode เท่านั้น) | ❌ like/comment เป็น props ล้วน | ⚠️ **Interaction contract exists, persistence not proven** | ❌ | **EXISTS** |
| **JourneyComposer** | ❌ (via HomeMode เท่านั้น) | ⚠️ ส่ง `event_date`/media แต่ไม่มี handler จริงรับ | ⚠️ | ❌ | **EXISTS** (rich, reusable) |
| Welcome → `/world` | ❌ | — | ❌ | ✅ test ยืนยันความตั้งใจ | **BROKEN JOURNEY** |
| Welcome → `/scan` | ❌ | — | ❌ | ✅ test ยืนยันความตั้งใจ | **BROKEN JOURNEY** |

### หลักฐานประกอบ like/comment (ตามข้อกำหนด)
- `JourneyFeedCard.tsx` รับ `onToggleLike` / `onAddComment` ผ่าน props เท่านั้น — **ไม่มี DB operation ในตัว component** (อ่านไฟล์เต็มแล้ว)
- **DB ไม่มีตารางปลายทางเลย:** migrations ทั้ง 13 ไฟล์สร้างแค่ `profiles, homes, home_members, pets, life_journey_events, feature_flags, nests, decorations, decoration_items, family_packages, storage_usage, community_posts/comments/likes, market_*, qr_tokens, litters` — **ไม่มี families / event_likes / event_comments** (`community_likes` เป็นของ community_posts ไม่เกี่ยว)
- ผู้ให้บริการ callback (HomeMode) เองก็ถูก orphan → **การ persist ของ like/comment ไม่เคยมีอยู่จริงในทุกชั้น**

---

## 5. False Completion ที่ตรวจพบเพิ่ม (รอบนี้)

| รายการ | สถานะจริง |
|---|---|
| `/nests` self-link ไป `/nests/[id]` | **Route ไม่มีใน build** — คลิกแล้ว 404 |
| `/api/test-tokens` | Build เป็น **static page** (○) — dev tool โดน build รวมมาด้วย |
| `/landing` | สวย ครบ แต่**ไม่มีเส้นทางเข้า** (orphan route) |
| QRScannerModal | **Orphan component** — ไม่มี page render → in-app scan ตาย |
| Welcome ปุ่ม 2/3 | มีปุ่ม มี test คาดหวัง แต่ปลายทางไม่มีใน build |

---

## 6. คำตอบ: A หรือ B

## **คำตอบ: A — ใช้ `/pets/[id]` เป็น Life Journey + Progressive Passport spine ต่อไป**

**เหตุผลจาก Evidence (ไม่ใช่รสนิยม UI):**

1. **เส้นทางที่มีชีวิตจริงวิ่งผ่าน A อยู่แล้ว** — ทางเข้าระบบ pet เดียวที่ REACHABLE+PERSISTED คือ `Welcome → /pets/birth → /pets → /pets/[id]` ทุกจุดในเส้นนี้เขียน DB จริง (`litters`, `pets`, `life_journey_events`, `qr_tokens`)
2. **B ไม่ใช่ "กู้" แต่คือ "สร้างใหม่เกือบทั้งชุด"** — HomeMode cluster: (ก) ไม่มี route ใด render, (ข) types สวนกับ DB (`Family`/`families` ไม่มีใน schema, `event_date` ไม่มีคอลัมน์), (ค) like/comment ไม่มีตารางปลายทางเลย — การกู้ B ต้องแก้ data layer ก่อนจะถึงจุดเริ่มของ A
3. **ProgressivePassport อาศัยอยู่บน A แล้ว** (`/pets/[id]` เปิด modal) — การเลือก B ต้องย้าย/ทำซ้ำ
4. **ต้นทุนแบบ asymmetry** — A = ต่อยอดจาก PERSISTED spine (เหลือแค่เพิ่ม test + แก้ `event_date` bug) / B = ต้อง wire orphan + แก้ type divergence + สร้างตาราง like/comment ก่อนถึงเส้นสายเดียวกับ A
5. **`/world` + `/scan` ที่ขาดไม่เปลี่ยนคำตอบ** — เป็น broken journeys ที่ต้องบันทึกไว้ (มี test ยืนยันความตั้งใจ) แต่การซ่อมคือเพิ่ม route/ปรับ nav ในภายหลัง ไม่ได้ทำให้ B มีชีวิตมากขึ้น

**เงื่อนไขที่ติดมากับคำตอบ A (ไม่ใช่เหตุผลหักล้าง):**
- `event_date` ถูกทิ้งตอน insert (`pets/[id]/page.tsx:95-103`) — ต้องแก้ใน phase Data Semantics/Time Model
- A ยังไม่ VERIFIED — ไม่มี test เลย ต้องตามลำดับที่ตกลง: **Presentation Decision → Data Semantics → Time Model → Evidence → Functional Tests**
- ชะตา orphan components (HomeMode/JourneyComposer/JourneyFeedCard/PassportView/CreateMomentModal/mockData) ยังไม่ตัดสินในรอบนี้ — แต่ใต้คำตอบ A จะกลายเป็น "แหล่ง reusable UI parts" ไม่ใช่ "spine"

---

## 7. สิ่งที่ไม่ได้ทำในรอบนี้ (ตามข้อตกลง)

- ❌ ไม่แก้ code / ไม่ลบ code ทุกกรณี
- ❌ ไม่แตะ Missing (date precision, evidence, occurred_at)
- ❌ ไม่ตัดสินชะตา orphan components นอกจากการจัดสถานะ
- ✅ ได้เพียงคำตอบเดียว: **A** พร้อม Evidence ฉบับนี้

---

*Audit by GLM — trace-based, no code changes*
