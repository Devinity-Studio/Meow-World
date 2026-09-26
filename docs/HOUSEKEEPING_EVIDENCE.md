# Housekeeping Evidence — สถานะข้อมูลจริงใน Production (2026-09-26)

**Input:** ดึงตรงจาก production DB ผ่าน REST (read-only, session จริงของ owner) วันที่ 2026-09-26
**Scope:** เอกสารตัดสินเท่านั้น — **ไม่มีข้อมูลใดถูกแก้/ลบ** จนกว่า owner จะอนุมัติจาก matrix
**หลัก:** Evidence → Decision → Action · "อย่าลบเพียงเพราะดูเป็น test data" — ตอบ 5 คำถามต่อรายการ

**บริบทของบ้าน:** `6624b327-144f-4ad9-9713-c874a601696e` "บ้านของเรา" · author ทุก event = `9492124e…` (BombINdyBoy)

---

## 1. Pets (4 แถว)

| pet_code | ชื่อ | species | breed | color | birth_date | litter_id | สถานะ |
|---|---|---|---|---|---|---|---|
| PET-0001 | มู่ทู่ | Cat | วิเชียรมาศ | ส้ม ขาว | 2026-09-26 | → Litter #015 | Reference Slice ✅ |
| PET-0002 | น้องโมจิ | Cat | ขนสั้น | เทา | null | — | Direct Add acceptance ✅ |
| PET-0003 | ขนมครก | **แมว** ⚠️ | ขนมครกสามสี | **ส้ม ขาว สามสี** ⚠️ | null | — | Data-semantics drift (ยุคก่อน contract) |
| PET-0004 | ทดสอบขนมปัง | Cat | null | น้ำตาล | null | — | Test-era (ชื่อบ่งบอกเอง) |

## 2. Litters (15 แถว)

| ช่วง | จำนวน | เวลาสร้าง | ความหมาย |
|---|---|---|---|
| #001 (×4 ชื่อซ้ำ) | 4 | 2026-09-23 08:02–08:04 | ความพยายามยุค 403 — user กด retry ก่อน fix |
| #005–#014 (×10) | 10 | 2026-09-23 17:31–17:50 + 09-24 | **Orphan litters** — litter insert ผ่าน แต่ pet insert ล้ม |
| #015 | 1 | 2026-09-25 21:37 | **ของจริง** — litter ของมู่ทู่ (pets.litter_id ชี้มา ✅) |

## 3. Life Journey Events (8 แถว — เรียงตามเวลา)

| # | หัวข้อ (บรรทัดแรกของ content) | pet_id | pet_ids[] | humans[] | ความหมาย |
|---|---|---|---|---|---|
| E1 | 🐣 Chapter 01 — My Beginning | มู่ทู่ | 0 | 0 | Birth Event — Reference ✅ |
| E2 | วันแรกของมู่ทู่ในบ้าน | **null** | 0 | 1 | **Inverted #1** (ตั้งใจแท็กมู่ทู่ — stale-init bug) |
| E3 | สามพี่น้องเล่นด้วยกันครั้งแรก | โมจิ | ขนมครก | 1 | **Inverted #2** (ตั้งใจ 3 ตัว) |
| E4 | วันนี้แม่มู่ไปเที่ยวกับครอบครัว | มู่ทู่ | 0 | 1 | **Inverted #3** (ตั้งใจไม่มี pet) |
| E5 | มู่ทู่นอนขดบนตักวันนี้ | มู่ทู่ | 0 | 1 | **Case A** — 1 Pet ✅ |
| E6 | สองพี่น้องตะเกียบกัน | มู่ทู่ | โมจิ | 1 | **Case B** — หลาย Pets ✅ |
| E7 | บรรยากาศบ้านวันนี้อบอุ่นดี | null | 0 | 1 | **Case C** — ไม่มี Pet (Q4) ✅ |
| E8 | เหตุการณ์ที่ไม่มีใครร่วมช่วงเวลา | null | 0 | **0** | **Case D** — ไม่มี Human (Q5) ✅ |

*IDs เต็มของทุกแถวถูกเก็บใน commit นี้ (evidence ไม่สูญแม้ลบจาก DB)*

---

## 4. Decision Matrix — ตอบ 5 คำถามต่อรายการ

> Q1 เป็น Evidence? · Q2 ลบแล้ว evidence หาย? · Q3 รบกวน Home Mode? · Q4 ถ้าเก็บ เก็บแบบไหน? · Q5 ผู้ใช้จริงควรเห็น?

| Record | Q1 | Q2 | Q3 | Q4 | Q5 | **ข้อเสนอ** |
|---|---|---|---|---|---|---|
| E1 Birth Event | ใช่ — Reference Slice | ใช่ | ไม่ | PRESERVE | ควร | **PRESERVE** |
| E5–E8 (Case A–D) | ใช่ — acceptance runtime ครบ 4 เคส | ใช่ (เคสไม่ซ้ำกัน) | ไม่ — เนื้อหาอ่านเป็นธรรมชาติ | PRESERVE | ควร | **PRESERVE** |
| PET-0001 มู่ทู่ / PET-0002 โมจิ | ใช่ + เป็นแมวของบ้านตามเรื่องจริง | ใช่ | ไม่ | PRESERVE | ควร | **PRESERVE** |
| Litter #015 | ใช่ | ใช่ | ไม่ | PRESERVE | (ไม่โชว์ตรง) | **PRESERVE** |
| Litters #001–#014 | ใช่ — หลักฐาน campaign 403 (retry ×4 + orphan chain) | จาก DB ใช่ / จาก project ไม่ (snapshot ครบในเอกสารนี้) | **ไม่** — ไม่โชว์ใน feed · และถ้าลบ ตัวนับ Litter จะกลับมาเริ่ม #002 ชนความหมายประวัติ | PRESERVE (คงตัวนับ #016 ต่อเนื่อง) | ไม่เห็นโดยตรง | **PRESERVE** (ตามหลักไม่ลบของที่ไม่รบกวน) |
| E2–E4 (Inverted ×3) | ใช่ — ตัวอย่างเดียวใน DB ของ stale-init bug | จาก DB ใช่ / จาก project ไม่ (snapshot + TRACKING root-cause + unit tests lock fix ครบ) | **ใช่เล็กน้อย** — "วันแรกของมู่ทู่" ไร้แมวผูก · "แม่มู่ไปเที่ยว" กลับผูกมู่ทู่ | (ก) DELETE หลัง evidence ถูก commit · (b) MARK ด้วย prefix `[DEV-EVIDENCE]` — แต่การ mark = แก้ตัว evidence เอง | ไม่ควร | **ตัดสิน 2 ทาง** — แนะนำ (a) DELETE: feed เป็นพื้นที่ของผู้ใช้จริง, evidence ครบในเอกสารนี้แล้ว |
| PET-0003 ขนมครก | ใช่ — หลักฐาน drift ที่จุดกำเนิด PET_APPEARANCE_MODEL | ไม่ (snapshot ครบ) | **ใช่** — species "แมว" ทำ `getSpeciesConfig` fallback ผิดตัว | **FIX (UPDATE ไม่ใช่ DELETE):** species→`Cat` · color→`ส้ม ขาว` · color_pattern→`tricolor` (column มีบ้านแล้ว!) · คงชื่อ/breed | ควร หลังแก้ | **FIX** — แปลง drift เป็นข้อมูลถูก contract โดยรักษาตัวตนในบ้าน |
| PET-0004 ทดสอบขนมปัง | ชื่อบ่งบอกเองว่า test — ไม่มีคุณค่าเชิงเรื่องเล่า | ไม่ (snapshot ครบ) | ใช่ — "ทดสอบ…" ปรากฏในบ้านผู้ใช้จริง | (a) DELETE · (b) rename เป็นชื่อแมวจริง | ไม่ควร | **ตัดสิน 2 ทาง** — แนะนำ (a) DELETE หลัง snapshot ถูก commit |

## 5. สรุปคำขออนุมัติ (3 การตัดสิน — ไม่มีอะไรถูก execute จนกว่าคำสั่ง)

```
อัตโนมัติตาม matrix (ถ้าเห็นด้วย):  PRESERVE E1, E5–E8, PET-0001/0002, Litter #015, Litters #001–#014
รอตัดสิน 1:  E2–E4 inverted ×3  → DELETE (แนะนำ) / MARK / PRESERVE
รอตัดสิน 2:  PET-0003           → FIX ด้วย UPDATE SQL (แนะนำ) / PRESERVE ไว้ก่อน
รอตัดสิน 3:  PET-0004           → DELETE (แนะนำ) / rename / PRESERVE
```

*หลักดำเนินการหลังอนุมัติ: SQL ทุกคำสั่งถูกร่าง + ส่งให้ owner รันใน SQL Editor เท่านั้น (มือของ owner) → read-back หลังรัน → อัปเดต TRACKING ปิดห้อง*
