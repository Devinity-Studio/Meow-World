# Meow World V4.1 Heart Edition Tracking

**Updated:** 2026-09-26 — **🏠 MERGED TO MAIN — PRODUCTION LIVE**
**Active Branch:** `main` (merge commit `08aa733` = origin/main — feature branch คงอยู่เป็นหลักฐาน)
**Production:** `meow-world-heart-edition.vercel.app` (deployment `qutxn9ik5`, build จาก main) — **/world LIVE ไม่ใช่ 404 แล้ว**
**Verified on production:** / → Welcome → tap บ้าน → /world → Home Mode → 3 แมว + 5 events + Composer · Google OAuth บน prod origin ผ่านครั้งแรก (ไม่ต้อง transplant session)
**Merge note:** main-side `4c7209e` (README) รวมสำเร็จ — zero conflict (ort) · Group D artifacts ถูก stash ไว้ (`group-d-artifacts-preserved-before-merge`) ก่อน checkout
**Scope:** Roadmap 1 — Passport + Life Journey + Home + Shared Home + Family

---

## Current State (2026-09-26)

| Domain | Status | หลักฐาน |
| --- | --- | --- |
| Schema ↔ Repo Contract | ✅ RECONCILED | homes/pets/life_journey_events ตรง migration ทั้งหมด (Drift #1–#3 ปิด) |
| Birth Wizard | ✅ CLOSED (Reference Vertical Slice) | PET-0001 มู่ทู่ — Litter/Pet/Journey 201 ทั้งชุด, pet_code trigger ทำงาน |
| Pet Direct Add | ✅ CLOSED | normalize `'' → null` — POST 201 + DB read-back 2 pets |
| Pet Form UX | ✅ CLOSED | species grid / breed dropdown + escape hatch / color checklist (semantic จริง) |
| Pet Appearance Model | ✅ CLOSED (Contract) | Colors จริง · Count = derived · Pattern = คนละ semantic — `PET_APPEARANCE_MODEL.md` |
| Pattern Input | ✅ CLOSED | vocabulary 9 keys = CHECK บน prod — `435f53b`, tsc 0 · 50/50 |
| Event Payload + Home-integrity | ✅ CLOSED | `buildJourneyEventPayload` gate ก่อน POST — `8a5433a`, 50/50 |
| Home Mode | ✅ CLOSED | orphan UI → production-backed — wire `a7e1ab3` + fixes `eb1602d`/`1c32106`/`dc68b0b`, runtime acceptance ครบ |
| Welcome Entry | ✅ CLOSED (0 code changes) | สะพาน `/` → `/world` ถูกออกแบบ+ทดสอบไว้แล้ว (unit 25) — Final Walk ผ่าน: tap บ้าน → /world → Home Mode + Feed 8 events จริง |
| Housekeeping | ✅ CLOSED | Evidence snapshot `86eabf3` → Final Decision → owner executed (Pre-flight→Execute→Read-back): DELETE inverted ×3 · FIX PET-0003 (`tricolor` — บ้านเต็มใบแรกของ color_pattern) · DELETE PET-0004 · PRESERVE litters ครบ 15 — `docs/HOUSEKEEPING_EVIDENCE.md` |
| Journey Composer / Feed | ✅ LIVE บน `/world` | POST 201 ×5 · DB read-back ตรงทุกแถว · Birth Event regression PASS |
| Docs Chain | ✅ CURRENT | DATA_SEMANTICS_AUDIT → TIME_MODEL → PET_APPEARANCE_MODEL → PATTERN_STORAGE_DESIGN → EVENT_STORAGE_DESIGN |
| Production data | **3 pets · 5 journey events · 15 litters** (14 structural history + #015 ของจริง) | บ้าน "บ้านของเรา" (6624b327) — หลัง Housekeeping 2026-09-26 |

## Root Cause Archive — เคสที่ปิดด้วยหลักฐาน (ไม่ใช่การเดา)

| # | อาการ | Root Cause จริง | บทเรียน |
| --- | --- | --- | --- |
| 1 | Pet Insert 403 (3 สัปดาห์) | **Production schema drift** — pets ขาด `nickname`/`color` ที่ repo มี; RLS/GRANT/policy ปกติทุกชั้น | **"Production schema drift can masquerade as RLS failure"** — ตรวจ pg_policies + grants + columns คู่ขนาน อย่าโทษ RLS ก่อนเห็น error ดิบ |
| 2 | Direct Add `22007` | `birth_date: ''` ส่งถึง DATE column | normalize ตาม **semantics ต่อ field** (`'' → null` เฉพาะ optional) — ไม่ blind replace |
| 3 | `/world` พังมาตั้งแต่เกิด (Drift #3) | prod ขาด `homes.description` ที่ repo init มี | Reconcile = แก้ prod ให้ตรง Contract ไม่ใช่บิดโค้ดตาม drift |
| 4 | DB เก็บ tag กลับด้าน (runtime จับได้) | Composer init `useState(() => pets[0])` ตอน pets ยังว่าง (async) → stale selection | **"UI ไม่เดาแทนผู้ใช้"** + DB ไม่เคยผิด — DB = สิ่งที่ UI ส่งจริง |

## Vertical Slices — CLOSED (commit + evidence)

| Slice | Commits | Evidence |
| --- | --- | --- |
| Evidence instrumentation (mw_insert_evidence) | `2f229b8` | 7-gate logs → ระบุ pets INSERT ตายจริง |
| Audit/Time Model docs | `6ed6f5d` | DATA_SEMANTICS_AUDIT.md, TIME_MODEL.md |
| Schema Drift #1 (nickname/color) | `b2f0f66` | prod ALTER + REST read-back 200 |
| Direct Add fix | `9b7d03e` | 201 + 2 pets (preview runtime) |
| Form UX (controlled input) | `89c9396` `bf6268e` `552171d` `0c49eb0` | 201 ×3 รอบ + จับ escape-hatch/species-contract bug ตอน runtime |
| PET_APPEARANCE_MODEL | `6cf4219` | Model CLOSED ก่อนเลือก widget |
| PATTERN_STORAGE_DESIGN | `4c63558` | A/B/C + CHECK constraint — owner เลือก A แยก migration |
| EVENT_STORAGE_DESIGN | `2cecd37` | 6/6 คำถาม (Q4/Q5 ได้ · Q6 birth-safe) |
| Migrations (แยก boundary 2 ไฟล์) | `255e7ac` | apply prod → catalog + REST read-back ครบ, 4 แถวเดิม NULL ไม่มี backfill |
| Event Payload + validation | `8a5433a` | acceptance matrix 8 เคสใน unit test |
| Pattern Input | `435f53b` | vocabulary-locked, reject นอก list ก่อน POST |
| Home Mode wire | `a7e1ab3` `eb1602d` `1c32106` `dc68b0b` | **Runtime: POST 201 ×5 (1 pet / หลาย pets / ไม่มี pet / ไม่มี human / human default) + DB read-back 8 แถวตรง + Birth Event regression PASS** |

**หลักพิสูจน์ของบ้าน:** Unit Test ≠ Runtime Evidence — แยกชั้นเสมอ (code-level: tsc + vitest / runtime: preview + network + DB read-back)

## Drift Inventory (known debt — บันทึกไว้ ไม่ block งานปัจจุบัน)

> รายการต่อไปนี้คือสิ่งที่ค้นพบแล้วแต่**ตั้งใจไม่แตะ** — housekeeping เป็น slice แยก ตามหลัก "Drift ที่ค้นพบ ≠ งานที่ต้องรีบแก้"

| รายการ | รายละเอียด | การตัดสินที่รอ |
| --- | --- | --- |
| like/comment ไม่มี storage | UI affordance มี แต่ไม่มีตาราง — ทำ no-op แล้ว (`a7e1ab3`) | ออกแบบตารางเมื่อเปิด slice |
| Event rows ยุคทดสอบ (3 แถว inverted) | ~~หลักฐานการค้นพบบั๊ก stale-init~~ | **RESOLVED (2026-09-26)** — snapshot ครบใน `HOUSEKEEPING_EVIDENCE.md` → DELETE ตาม Final Decision |
| PET-0003 ขนมครก | ~~species "แมว" + "สามสี" ใน color~~ | **RESOLVED (2026-09-26)** — FIX: `Cat / ส้ม ขาว / tricolor` (color_pattern ได้บ้านเต็มใบแรก) |
| Orphan litters #010–#014 | litter insert สำเร็จแต่ pet insert ล้ม (ก่อน fix) | Transaction/atomicity slice — แยกจาก housekeeping |
| Duplicate RLS policies | `pet_*`/`ev_*` คู่กับ "Home members …" เงื่อนไขเดียวกัน (prod dump ยืนยัน) | policy cleanup slice — ยังไม่มีหลักฐานว่าทำให้ flow พัง |
| `visibility` column | prod มี / repo init ไม่มี (ทิศตรงข้ามกับ drift อื่น) | ตัดสิน semantic ตอน Event domain ขยาย |
| `event_date` ใน Composer | คง input ไว้ใน flow แต่**ไม่ persist** | รอ TIME_MODEL ตัดสิน occurred-date semantic |
| ช่องสถานที่ (location) | ถูกถอดออกจาก Composer — ไม่มีที่เก็บ | อนาคต fold เป็น prose หรือเพิ่ม column |
| Vercel Git integration | ไม่ auto-deploy ตั้งแต่ย้าย org `BombINdyBoy` → `Devinity-Studio` — ต้อง deploy ผ่าน CLI | reconnect Git integration เมื่อ merge → main |
| OAuth allowlist | ครอบเฉพาะ prod origin — preview/localhost ดีดกลับ prod (login บน preview ใช้ session transplant) | เพิ่ม wildcard `*-thdev8studio.vercel.app` ใน Supabase redirect URLs (config slice แยก) |
| Welcome Entry Adjacent: `/scan` route missing | ปุ่ม "สแกน QR" บน Welcome ชี้ `/scan` ซึ่งไม่มี route (404) | **Known incomplete · Non-blocking** · Scope: QR Scan / future invitation flow — ไม่ตัดปุ่ม (การตัดคือ product behavior อีก slice) |
| Welcome Entry Adjacent: HouseGraphicCard "สร้าง QR เชิญ" | no-op handler (`a7e1ab3`) — planned capability ยังไม่มี implementation | **No-op · Non-blocking** · Scope: future invitation flow |
| Group D artifacts | `.freebuff/project-id`, `next-env.d.ts`, `tsconfig.tsbuildinfo` ค้าง uncommitted | ตามข้อตกลง — git/environment hygiene slice แยก |

## Backlog / ห้องถัดไป (ลำดับที่ owner วาง)

```
TRACKING            ✅ CLOSED (1a19a9b)
Welcome Entry       ✅ CLOSED (0 code changes — bridge unit-tested + Final Walk ผ่าน)
Housekeeping        ✅ CLOSED (86eabf3 evidence → Final Decision → executed + read-back ครบ)
RECONCILE           ✅ PASSED (Code ✅ DB ✅ Docs ✅ Drift เจ้าของสถานะครบ)
Merge → Main        ✅ DONE (08aa733 — production build Ready + production walk ผ่านครบ)
ห้องถัดไป           POST-LAUNCH: บันทึก playbook จากประสบการณ์จริง + คิว drift/debt ตาม inventory
```

## Schema ปัจจุบัน (prod = repo หลัง reconciliation)

```
profiles (id, display_name, avatar_url, created_at)
  └── homes (id, name, description✨, owner_id, storage_*, theme_config, created_at)
        ├── home_members (home_id, user_id, role, joined_at)
        ├── pets (…, nickname✨, color✨, color_pattern✨CHECK-9, litter_id, mother_id, father_id,
        │         birth_weight, birth_time, observed_at, special_traits, pet_code)
        └── life_journey_events (…, pet_id (primary), pet_ids✨UUID[], participant_ids✨UUID[],
                                  content, event_type, media_urls, visibility, nest_id)
✨ = เติมให้ตรง Contract ระหว่าง 2026-09-25/26 (additive, nullable, ไม่ backfill)
```

**กติกา integrity ที่ DB ไม่ enforce ได้ (array columns):** ทุก UUID ใน `pet_ids[]` ต้องเป็น pet ของ `home_id` เดียวกัน และทุก UUID ใน `participant_ids[]` ต้องเป็น member ของบ้าน — เป็นหน้าที่ของ `validateJourneyEventPayload()` ที่ gate ก่อน POST เสมอ (Business Logic Contract ไม่ใช่ "หวังว่า UI จะส่งถูก")

## วิธีทำงานของบ้าน (ทุก slice ต้องเดินครบ)

```
RECONCILE → ตรวจ Current State → ตรวจ Evidence ล่าสุด → ระบุ Failure/Next Slice
  → ลงมือ (Design ก่อน wire เมื่อแตะ Domain) → VERIFY (tsc+test / runtime แยกชั้น)
  → COMMIT → PUSH → CHECKPOINT
กฎเหล็ก: อย่าให้ UI วิ่งนำ Domain · อย่าให้ Code วิ่งนำ Storage · อย่าให้ Migration วิ่งนำ Evidence
         ไม่สร้าง Input ที่ระบบเก็บไม่ได้ · Derived ห้ามเป็น Input · เคสจริง 1 เคส > เดา 10 หน้า
```

---

## ประวัติยุคก่อน (2026-08 — ถูกแทนที่ด้วยสถานะข้างบนแล้ว)

- **RLS infinite recursion บน `home_members`** — ✅ RESOLVED แล้วด้วย `nuclear_rls_fix` (prod policies dump 2026-09-26 ยืนยัน: membership-based SELECT/INSERT ปกติ, ไม่มี recursion) — รายละเอียดยุคนั้นอยู่ใน git history (`cff74d8`–`74fda24`, branch `qwen-prototype-v0` ถูก merge หลายรอบ)
- **`handle_new_user()` trigger** — workaround insert profile มือใช้งานได้จริง (profile 9492124e = BombINdyBoy อยู่จริง); การสร้าง trigger ใหม่เป็นงานแยกถ้ามี user ใหม่
- ไทม์ไลน์เดิม: 2026-08-26 รากฐาน V4.1 · 08-27 migration + RLS · 08-28 certificate · 08-30 OAuth fix · 08-31 RLS/tailwind/หน้า home

## Change Log

### 2026-09-26 — Home Mode Campaign (เซสชันนี้)
- **🏠 MERGE → MAIN — PRODUCTION LIVE** — merge `08aa733` (no-ff, zero conflict กับ `4c7209e` README) · production deploy `qutxn9ik5` Ready · production walk ผ่านครบ: `/` → tap → `/world` → Home Mode → 3 แมว + 5 events · OAuth prod origin ผ่านครั้งแรก
- **Housekeeping CLOSED** — evidence snapshot `86eabf3` → Final Decision → owner executed (SQL Editor): DELETE inverted ×3 · FIX PET-0003 → `Cat/ส้ม ขาว/tricolor` · DELETE PET-0004 · PRESERVE litters 15 — read-back: pets=3, events=5
- **Welcome Entry CLOSED (0 code changes)** — สะพาน `/` → `/world` พิสูจน์ครบ 3 ชั้น: unit 25 tests + ปลายทาง Home Mode (runtime acceptance รอบก่อน) + Final Walk จริง (tap → /world → Feed 8 events) · infra evidence: Vercel SSO/2FA ไม่ใช่ app bug · production ยัง 404 ที่ `/world` = หลักฐาน Merge → Main
- **Event Payload + Business Validation** (`8a5433a`) — home-integrity gate ก่อน POST, pure module
- **Pattern Input** (`435f53b`) — vocabulary-locked select, normalize/reject ตาม contract
- **Home Mode wire** (`a7e1ab3`) — `/world` เป็น host: fetch pets/members(profiles join)/events, adapter `journeyAdapter.ts` (pet_ids∪pet_id → UI, content→title/desc, created_at→event_date ชั่วคราว), Composer submit → `buildJourneyEventPayload`, like/comment no-op (ไม่มี fake interaction)
- **Runtime fixes จาก evidence** — `eb1602d` (fallback แท็กทุกตัวแทนผู้ใช้), `1c32106` (adapter union read), `dc68b0b` (stale-init: เริ่ม selection ว่างเสมอ + เคลียร์หลัง submit)
- **Schema Drift #3 CLOSED** — `homes.description` เติมบน prod (ALTER + catalog + REST + runtime 3 ชั้นตรงกัน)
- **Acceptance Runtime ครบ** — POST 201 ×5, DB read-back 8 แถวตรง state ที่ส่ง, Birth Event regression PASS
- Docs ใหม่ก่อนหน้าในเซสชัน: PET_APPEARANCE_MODEL / PATTERN_STORAGE_DESIGN / EVENT_STORAGE_DESIGN / migrations 2 ไฟล์ (applied + verified)

### 2026-09-25 — Pet Insert 403 → Root Cause + ปิด Pet Domain
- Evidence instrumentation → พบ gate จริงคือ pets INSERT → pg_policies/grants/schema/triggers ครบ → **schema drift** (nickname/color) → apply → Birth Wizard CLOSED (PET-0001) → Direct Add fix (`9b7d03e`) → Form UX + data semantics (สี/จำนวนสี/pattern แยกชั้น)

### 2026-08-31 และก่อนหน้า
- ดู "ประวัติยุคก่อน" ข้างบน + git history
