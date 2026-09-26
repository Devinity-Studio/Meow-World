# Pet Appearance Model — "สี จำนวนสี และลวดลาย เป็นคนละความหมายกัน"

**Date:** 2026-09-26
**Branch:** `feature/home-creation-phase-0-999`
**Input:** เคส ขนมครก (challenge case จาก Form UX slice) — จับ Data Semantics ได้ก่อนกลายเป็นข้อมูลจริงเต็มระบบ
**Scope:** Model + Data Semantics เท่านั้น — **ไม่เลือก UI widget, ไม่ migration, ไม่ตัดสินที่เก็บ Pattern** (MIGRATE ต้องเป็นผลของ reasoning)
**Chain:** DATA_SEMANTICS_AUDIT → TIME_MODEL → **PET_APPEARANCE_MODEL** (ฉบับนี้)
**หลักยึด:** *อย่ารีบสร้าง Input จากคำที่เห็นบนหน้าจอ — จงสร้าง Input จากความหมายของข้อมูล* · **UI ไม่กำหนด Model — Domain Model กำหนด UI**

---

## 1. เคส ขนมครก — จุดที่ Model เดิมย้อนแย่งตัวเอง

Form เดิมให้เลือกสีจาก checklist ที่มีทั้งสีจริงและคำบรรยายลวดลายปนกัน ผลคือแถวที่เกิดขึ้นจริง:

```
สี: "ส้ม ขาว สามสี"   ← ❌ สามสี ไม่ใช่สีระดับเดียวกับ ส้ม/ขาว
```

ความหมายจริงของคำ ๆ นั้น:

| คำ | ความหมายจริง | ระดับข้อมูล |
|---|---|---|
| ส้ม, ขาว, ดำ, เทา, น้ำตาล, ครีม, ฟ้า | สีพื้นฐานที่มีอยู่จริงบนตัวสัตว์ | **Color** |
| สองสี, สามสี | จำนวนสีที่ระบบ**นับได้เอง**จาก Colors | **Color Count (Derived)** |
| ลายเสือ (Tabby), ลายสลิด, ลายแต้ม, สีเดียว (Solid) | รูปแบบการกระจายสีบนตัว | **Pattern** |

## 2. Domain Contract (ตัดสินแล้ว)

```
Pet Appearance
│
├── Colors            ← ชุดสีพื้นฐาน (multi-select, ตามความจริงของตัวสัตว์)
│     └── [Orange, White, Black]
│
├── Color Count       ← DERIVED = count(Colors) — ห้ามเป็น input ของผู้ใช้
│     └── 3
│
└── Pattern           ← คนละ Semantic กับ Color Count อย่างเด็ดขาด
      └── Tricolor | Bicolor | Solid | Tabby | ...
```

**ทำไม Color Count ≠ Pattern:** อนาคตมีได้ทั้ง `Orange+White+Black + Tabby` และ `Orange+White+Black + Tricolor` — จำนวนสีบอก "กี่สี" ส่วน Pattern บอก "สีกระจายอย่างไร" — ข้อมูลคนละชั้น ห้ามยุบรวมกัน

**ทำไม Count ต้อง Derived:** ถ้าให้ผู้ใช้เลือก "สองสี" ทั้งที่เลือกสีไว้ 3 สี ระบบเก็บความขัดแย้งถาวร — ข้อเท็จจริงที่ระบบคำนวณได้เองต้องไม่ถามผู้ใช้

## 3. สถานะ Implementation ปัจจุบัน (ตามจริง — commit `0d4ddd5`)

| ส่วน | สถานะ |
|---|---|
| `COLOR_OPTIONS` | ✅ สีจริงเท่านั้น — ตัด สามสี/สองสี/ลายเสือ ออกแล้ว, มี test ห้ามกลับมา (`color semantics — pattern words are not colors`) |
| Color Count | ✅ Derived: `colorCountLabel()` → '' / 'สีเดียว' / 'N สี' — แสดง live ในฟอร์ม (🎨), **ไม่ถูกเก็บ** |
| Pattern | ⏸️ **ยังไม่มี input** — ตั้งใจ: ไม่มี column รองรับ (`pets` ไม่มี `color_pattern`) จึงไม่สร้าง input ที่ระบบเก็บไม่ได้ |
| Storage เดิม | ⚠️ `pets.color` เป็น TEXT รวมทุกอย่างด้วยช่องว่าง ("ส้ม ขาว") — พอสำหรับ Colors · แถว PET-0003 มีคำว่า "สามสี" ติดค้างจากรอบทดสอบ (ข้อมูลทดสอบ ไม่ใช่ production จริงของผู้ใช้) |

## 4. สิ่งที่ยังไม่ตัดสิน (ตามข้อตกลง — เป็นของ slice ถัดไป)

- ❌ UI ของ Pattern (dropdown/checklist/radio) — ยังไม่เลือกจนกว่าจะมีที่เก็บ
- ❌ `color_pattern` column หรือตาราง appearance แยก — เป็น migration ที่ต้องออกแบบกับ Known Drift Inventory (เช่น `visibility`, `participant_ids`) พร้อมกัน
- ❌ การแก้แถว PET-0003 — เป็นข้อมูลทดสอบ อยู่ในคิว housekeeping
- ❌ Breed semantics ("ขนมครกสามสี" เป็นชื่อเรียกสายพันธุ์เฉพาะ ไม่ใช่ Pattern ของตัวใดตัวหนึ่ง) — ระบุให้ชัดว่า Breed เป็น label อิสระ ไม่เกี่ยวกับ Appearance fields

## 5. กติกาที่ได้จากเคสนี้ (สำหรับทุก input ในอนาคต)

1. แยกคำเป็นชั้นความหมายก่อน: ข้อเท็จจริงพื้นฐาน / สิ่งที่คำนวณได้ / การจัดหมวด
2. Derived data ห้ามเป็น input
3. ไม่สร้าง input ที่ไม่มีที่เก็บ (input ที่ระบบทิ้ง = โรคเดียวกับ `event_date` ใน DATA_SEMANTICS_AUDIT §2.5)
4. เคสจริง 1 เคส > เดา 10 หน้า — ใช้ขนมครกเป็น Test Case ของ Model นี้เสมอ

---

*ตรวจโดย GLM (Codebuff) + เจ้าของบ้าน — Domain → Data Semantics → Model → (Form UX → Payload → DB ตามลำดับ)*
