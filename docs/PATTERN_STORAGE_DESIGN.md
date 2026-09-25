# Pattern Storage Design — "Pattern มี semantic ของตัวเอง ตอนนี้ถึงเวลาให้มันมีบ้าน"

**Date:** 2026-09-26
**Branch:** `feature/home-creation-phase-0-999`
**Input:** `docs/PET_APPEARANCE_MODEL.md` (Model CLOSED) — Pattern คือชั้นเดียวของ Appearance Model ที่ยังไม่มี storage
**Scope:** ออกแบบที่เก็บ + migration draft เท่านั้น — **ไม่ apply, ไม่เลือก UI widget, ไม่แตะ code** (Input จะตามหลัง Storage เท่านั้น ตาม chain: Semantics → Storage → Input → Payload → DB)
**หลักยึด:** ไม่สร้าง Input ที่ระบบเก็บไม่ได้ · ไม่สร้าง Input ที่ระบบเก็บไม่ได้กลับกันคือ **Storage ต้องมาก่อน Input เสมอ**

---

## 1. Semantics ที่ตกลงแล้ว (จาก PET_APPEARANCE_MODEL — ยกมายืนยันก่อนออกแบบ)

| คุณสมบัติ | ค่า |
|---|---|
| Pattern คืออะไร | รูปแบบการกระจายสีบนตัว (Solid/Bicolor/Tricolor/Tabby/…) |
| Pattern ≠ Color Count | จำนวนสี = derived จาก Colors · Pattern = การจัดวาง — อนาคตมีได้ทั้ง 3 สี+Tabby และ 3 สี+Tricolor |
| 1 ตัวมีกี่ Pattern | 1 (สัตว์มีรูปแบบหลักเดียว) — จึงเป็น 1:1 กับ pets ไม่ใช่ 1:N |
| ห้าม derive จากสี | ระบบ**นับสีได้**แต่**บอก Pattern ไม่ได้** — ต้องเป็นความเห็นของผู้ใช้ |
| Test Case | ขนมครก: Colors [ส้ม, ขาว, ดำ] → Count=3 (derived) + Pattern=Tricolor (ผู้ใช้เลือก) |

## 2. ทางเลือก Storage (3 ทาง — พร้อมข้อดีข้อเสียตามบริบทบ้านนี้จริง)

### ทางเลือก A — `color_pattern TEXT` คอลัมน์เดียวบน `pets` ⭐ (แนะนำ)

```sql
-- DRAFT — ยังไม่ apply (ไฟล์เต็มใน §4)
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS color_pattern TEXT;
```

| มุม | ประเมิน |
|---|---|
| ความเข้ากัน | ตรง convention เดิมทุกด้าน: `gender`/`breed`/`species` ล้วนเป็น TEXT nullable, เก็บ English key แสดง Thai |
| ขนาดการเปลี่ยน | เล็กสุด — additive, idempotent, **ไม่ต้องแตะ RLS/GRANT ใหม่เลย** (คอลัมน์ใหม่อยู่ใต้ table policies เดิมอัตโนมัติ) |
| บทเรียน nickname/color | คอลัมน์ใหม่ = ต้อง apply บน prod ให้ทัน code ที่ใช้ — deploy checklist ใน §5 แก้ความเสี่ยงนี้โดยเฉพาะ |
| ข้อจำกัด | 1 ค่าต่อตัว (พอเพราะ 1:1) · ถ้าอนาคตต้องการ pattern หลายค่าจะต้อง redesign — แต่ตาม Model ปัจจุบันไม่มีเคส |

### ทางเลือก B — คอลัมน์ JSONB รวม Colors + Pattern

```sql
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS appearance JSONB;
-- {"colors":["ส้ม","ขาว"],"pattern":"tricolor"}
```

| มุม | ประเมิน |
|---|---|
| ข้อดี | โครงสร้างชัดในก้อนเดียว, colors เลิกใช้ space-joined ได้ |
| ข้อเสีย | **ขัด audit chain โดยตรง** — JSONB ฝังความหมายหลายชั้นใน field เดียว (โรคเดียวกับ content TEXT blob ของ life_journey_events ที่ audit แรกเจอ) · ต้อง migrate ข้อมูลเดิม · query/filter ยุ่งขึ้น · ใหญ่เกินจำเป็นสำหรับ attribute เดียว |

### ทางเลือก C — ตาราง `pet_appearance` แยก (1:1)

| มุม | ประเมิน |
|---|---|
| ข้อดี | ขยายได้ (ตา/ลายตัว/สีตา ฯลฯ) |
| ข้อเสีย | ต้นทุนแพงเกินวันนี้: ตารางใหม่ = **RLS policies + grants ชุดใหม่** (เพิ่งเก็บ drift policy มาทั้งบ้าน) · JOIN ทุกจุดอ่าน · สำหรับ 1 attribute = over-engineering |

## 3. Sub-decision: กันค่าเพี้ยนที่ชั้นไหน (เพราะบ้านนี้มีประวัติ hand-patch)

| ทางเลือก | ผล |
|---|---|
| **DB CHECK constraint** ⭐ | `CHECK (color_pattern IS NULL OR color_pattern IN (…))` — DB เป็นด่านสุดท้ายกับมือที่สาม (หลักฐานจาก `pet_*`/`ev_*` ว่ามีมือแอบเข้าจริง) · เพิ่มค่าใหม่ภายหลัง = ALTER ครั้งเดียว |
| App-level เท่านั้น | ยืดหยุ่นกว่า แต่เปิดช่องเขียนมือผ่าน SQL Editor ทิ้งค่าขยะ — ตรงกับโรคที่เจอมา |

## 4. Vocabulary (seed) + Migration Draft — **DRAFT เท่านั้น ยังไม่ apply**

เก็บ English key ตาม convention (`'Cat'`, `'male'`), แสดง Thai ที่ UI (UI มาทีหลัง Storage):

| key | แสดง (Thai) |
|---|---|
| `solid` | สีเดียว |
| `bicolor` | สองสี |
| `tricolor` | สามสี |
| `tabby` | ลายสลิด / ลายเสือ |
| `calico` | สามสีลายจุด (calico) |
| `tortoiseshell` | ส้มดำปน (tortie) |
| `tuxedo` | สูททักซิโด้ |
| `pointed` | ปลายสีเข้ม (วิเชียรมาศ) |
| `other` | อื่น ๆ |

```sql
-- ไฟล์เสนอชื่อ: supabase/migrations/20260926100000_add_color_pattern.sql
-- Status: DRAFT — apply เมื่อเจ้าของบ้านอนุมัติเท่านั้น
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS color_pattern TEXT;

ALTER TABLE public.pets
  ADD CONSTRAINT pets_color_pattern_allowed
  CHECK (color_pattern IS NULL OR color_pattern IN (
    'solid','bicolor','tricolor','tabby','calico','tortoiseshell','tuxedo','pointed','other'
  ));

-- No backfill: เรา derive Pattern จากสีไม่ได้ตาม Contract — ค่าเก่าให้เจ้าของบ้านกรอกภายหลังผ่าน UI/SQL
-- No RLS/GRANT changes: คอลัมน์ใหม่อยู่ใต้ policies + grants เดิมของตาราง pets
```

## 5. Deploy Checklist เมื่ออนุมัติ (กันซ้ำบทเรียน nickname/color)

```
1. commit migration file (draft → จริง)
2. เจ้าของบ้าน apply ใน Supabase SQL Editor (prod)     ← ก่อน code ที่ใช้ขึ้น prod เสมอ
3. read-back: GET /rest/v1/pets?select=id,color_pattern → 200 (คอลัมน์มีจริง)
4. แล้วค่อยเริ่ม slice ถัดไป: Pattern Input → Payload → Form
5. Test Case ปิดท้าย: ขนมครก — colors[ส้ม,ขาว,ดำ] + color_pattern='tricolor' + count แสดง 3 สี
```

## 6. ไม่ตัดสินในเอกสารนี้ (เป็นของ slice ถัดไปตามลำดับ)

- ❌ UI widget ของ Pattern (radio/dropdown) — Storage ตัดสินก่อน
- ❌ Housekeeping PET-0003 ("สามสี" ค้างใน color text) — ทำหลังมี color_pattern จริง (ตอนนั้นถึงย้าย/ตัดคำได้อย่างมีบ้าน)
- ❌ การย้าย colors จาก TEXT ไปโครงสร้างอื่น — ไม่อยู่ใน scope

---

*ตรวจโดย GLM (Codebuff) — Semantics → Storage → (รออนุมัติ) → Input → Payload → DB → Test Case ขนมครก*
