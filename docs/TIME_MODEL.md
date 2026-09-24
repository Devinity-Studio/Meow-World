# Time Model — "เวลาแต่ละชนิดเป็นเจ้าของความหมายอะไร และเมื่อไรที่ระบบมีสิทธิ์พูดถึงมัน"

**Date:** 2026-09-23
**Branch:** `claude-welcome-entry`
**Input:** `docs/DATA_SEMANTICS_AUDIT.md` (PASS) — ใช้หลักฐานจาก audit เป็นฐาน ไม่ถือ definitions ล่วงหน้า
**Scope:** ตอบ 3 คำถามที่ส่งต่อมา + เสนอ Time Model — **ยังไม่ migration, ยังไม่แก้ code** (MIGRATE ต้องเป็นผลของ reasoning ไม่ใช่ assumption)

---

## 0. หลักฐานใหม่ที่เก็บเพิ่มสำหรับรอบนี้

| หลักฐาน | รายละเอียด | ผลต่อ Time Model |
|---|---|---|
| `calculateAge` **ซ้ำ 3 ฉบับ → 2 พฤติกรรม** | `certGenerator.ts:4` (จัดการ null + NaN → "ไม่ระบุวันเกิด", มี day-borrow ครบ) · `pets/[id]/page.tsx:419` และ `PetCard.tsx:85` (อ่านเนื้อจริงแล้ว: **เหมือนกันทุกตัวอักษร** — ไม่มี day-borrow → อายุคลาดได้ 1 เดือน) | Derived facts (อายุ) ถูกคำนวณจาก exact date **โดยไม่มีจุดกลางเดียว** — ถ้าเพิ่ม precision ทั้งสองพฤติกรรมต้องเปลี่ยนพร้อมกัน ไม่งั้นคนละความจริง (ถอดรื้อเต็มที่ §0.1) |
| Unknown เป็น "สถานะแอบแฝง" อยู่แล้ว | `pets.birth_date` nullable + UI ทุกจุด guard ด้วย `{pet.birth_date && (...)}` (`pets/[id]:209`, `PetCard:64`) + certGenerator แสดง "ไม่ระบุวันเกิด" | **ระบบมี 2 state อยู่แล้ว: exact / unknown(ซ่อน)** — state กลาง (month/year/approx) ไม่มีในระบบ และการกวาด Q1-B (§1.4) **ไม่พบ use case ที่พิสูจน์ความจำเป็น** |
| ฟอร์มบังคับ exact | birth wizard: `disabled={!sharedData.name \|\| !sharedData.birth_date}` (`birth/page.tsx:403`) — ไม่กรอกวันเต็ม = กดไม่ได้ | Unknown **ปิดกั้นเฉพาะใน birth flow** (ฟอร์มแรกของชีวิต) — แต่ PetForm/AddPetModal ไม่บังคับ (Gate §0.3) จึงถูกต้องว่า "ช่องว่างอยู่ที่ UI ไม่ใช่ DB" ในเชิงโครงสร้าง |
| EventForm default = วันนี้ | `pets/[id]:327` — `event_date: new Date().toISOString().substring(0,10)` | ฟอร์มเหตุการณ์ "เดา" ว่าเกิดวันนี้ แล้วค่าที่ผู้ใช้แก้ทับก็ถูกทิ้งตอน insert (semantic failure จาก audit) |

### 0.1 ถอดรื้อ `calculateAge` ตามคำถามตรวจสอบ 5 ข้อ

| คำถาม | คำตอบจากโค้ดจริง |
|---|---|
| **รับ input อะไร** | string วันเดียว (`birth_date` จาก `<input type="date">`) — certGenerator รับ `null` ได้, อีก 2 ฉบับ require non-null (caller guard เอง และทุก caller guard จริง: `pets/[id]:152,209`, `PetCard:15,64`, `HouseGraphicCard:224`) |
| **ต้องการ exact birth_date หรือไม่** | ใช่ — ทั้งหมดกิน year+month (certGenerator ถึง day) จาก DATE เดียว ไม่มี fallback สำหรับ precision ต่ำกว่าวัน |
| **ถ้าวันเกิดไม่ทราบแน่ชัด ทำอะไร** | certGenerator: ตอบ "ไม่ระบุวันเกิด" (graceful) · อีก 2 ฉบับ: **ไม่ถูกเรียกเลย** — caller ซ่อนบรรทัดอายุทั้งบรรทัด (unknown ไม่เคยถูก "พูดถึง" แค่ "ไม่แสดง") |
| **ใช้ทำอะไร** | **การแสดงผลล้วน** — PetCard, HouseGraphicCard, header หน้า pet, ใบรับรอง; ไม่มี validation / sorting / business logic ที่ใช้อายุ (grep `.order()` ครบทั้ง 12 จุด: เรียงด้วย created_at/name/flag_name เท่านั้น — **ไม่มีจุดใดเรียงด้วย birth_date เลย** ยิ่งยืนยันว่าอายุไม่มีบทบาทเชิง logic) |
| **มีการปัด/ประมาณหรือไม่** | มีโดยปริยาย: ฉบับ pets/[id]+PetCard ตัดทิ้งเกินเดือน (และไม่มี day-borrow) ส่วน certGenerator แม่นกว่า — **birth_date เดียวกันให้คำตอบต่างกันได้ขึ้นกับฉบับที่ถูกเรียก** |

ข้อสรุปจาก 5 ข้อ:
1. อายุเป็น **derived display fact** ของ occurred ของ birth เท่านั้น — สายสัมพันธ์กับ occurred ของ journey events เป็นศูนย์ (trace: ถูกเรียกด้วย `pet.birth_date` เท่านั้น ไม่เคยถูกป้อนเวลาของ event)
2. ดังนั้น **"อายุต้องการ exact" ≠ "ทุกเหตุการณ์ต้องการ exact"** — ข้อแรกคือความต้องการของสูตรตัวเลข ข้อหลังคือความต้องการของบันทึกชีวิต คนละเอนทิตี คนละคำถาม (ขยายที่ §1.5)
3. อายุแม้วันนี้ก็ไม่ exact แบบสม่ำเสมอ (2/3 ฉบับปัดลง, 1/3 แม่น) — เมื่อ precision ladder มาถึง อายุต้อง degrade ตามแหล่ง (year-only → "ราว X ปี") และ certGenerator มี unknown-copy ให้พร้อมอยู่แล้ว ("ไม่ระบุวันเกิด" บนใบรับรอง — สินค้าจริงที่พูดคำนี้อยู่)

### 0.2 "UI บังคับกรอก ≠ Domain จำเป็นต้องรู้"

| หลักฐาน | ฝั่ง UI | ฝั่ง Domain (DB + readers) |
|---|---|---|
| birth wizard บังคับ birth_date (`birth/page.tsx:403` — ไม่กรอกกดไม่ได้) | บังคับ exact | `pets.birth_date` **nullable** + ทุก read site guard NULL ได้ + certGenerator มี unknown copy → domain รองรับ unknown อยู่แล้ว |
| EventForm default วันนี้ (`:327`) | "เดา" occurred = recorded | DB ไม่มี occurred ของ event ให้เก็บเลย — ค่าที่บังคับกรอกก็ถูกทิ้งอยู่ดี |
| `<input type="date">` ทุกจุดที่เก็บวันที่ | จำกัด precision สูงสุดเท่า widget ให้ | DATE เก็บ value ได้ แต่ไม่มีที่เก็บ "ผู้ใช้แน่ใจแค่ไหน" |

**ข้อสรุป (แก้ไขหลัง Evidence Gate):** exact-required ที่พบเป็น**ข้อจำกัดของ implementation เดิม** (widget + ฟอร์ม) ไม่ใช่กฎของ domain — หลักฐานคือ domain ทั้ง DB และ readers เตรียมรับ unknown ไว้แล้ว และจากฟอร์มทั้ง 4 ที่รับ birth_date มีเพียง **birth wizard เท่านั้นที่บังคับกรอก** (PetForm และ AddPetModal ไม่ใส่ required — ประตูรับ unknown มีอยู่จริง 2 ทางตั้งแต่ต้น)

### 0.3 Evidence Verification Gate (ตารางตรวจ claim ต่อ claim)

สถานะ 3 ระดับ: **FACT** = หลักฐานตรงจาก code/schema · **INFERENCE** = หลักฐานหลายจุดนำสู่ข้อสรุป แต่ยังเป็นการตีความ · **ASSUMPTION** = ยังไม่มีหลักฐานพอ

| Claim ในเอกสาร | Evidence จริง | ตำแหน่ง | สถานะ |
|---|---|---|---|
| `calculateAge` ต้องการ exact date | signature `string \| null` + กิน year/month/day จาก DATE เดียว ไม่มี fallback ต่ำกว่าวัน; อีก 2 ฉบับไม่มี day-borrow | `certGenerator.ts:4-28`, `pets/[id]:419-433`, `PetCard.tsx:85-99` | ✅ FACT |
| date field ถูกบังคับ required | birth wizard ใช่ (`disabled={\!sharedData.birth_date}`) · EventForm ใช่ (`<input type="date" required>`) · **PetForm ไม่ใส่ required** · **AddPetModal ไม่ใส่ required** → claim เดิม "ฟอร์มบังคับ" ต้อง scope เฉพาะ 2 ฟอร์มแรก | `birth/page.tsx:403`, `pets/[id]:346-347`, `PetForm.tsx:122-135`, `AddPetModal.tsx:49-56` | ✅ FACT (แก้ขอบเขตแล้ว) |
| `birth_date` ใช้คำนวณอายุ | ทุก caller ส่ง `pet.birth_date` เข้า calculateAge เท่านั้น | `PetCard.tsx:15`, `HouseGraphicCard.tsx:224`, `pets/[id]:152`, `PassportView.tsx:187` | ✅ FACT |
| อายุไม่มีบทบาทเชิง logic | grep `.order()` ครบ 12 จุดทั้งระบบ — เรียงด้วย created_at/name/flag_name เท่านั้น ไม่มี birth_date | `pets/[id]:54`, `pets/page.tsx:49`, `litters/page.tsx:48,58`, `nests/page.tsx:61`, `TokenList.tsx:59`, `useRealtimeNotifications.ts:52`, `admin/dashboard/page.tsx:125,344`, `admin/flags/page.tsx:43`, `birth/page.tsx:76` | ✅ FACT (เลื่อนจาก INFERENCE หลัง sweep ครบ) |
| `event_date` ถูกเก็บใน UI state | default = วันนี้ + `<input type="date" required>` | `pets/[id]:327,346-347` | ✅ FACT |
| `event_date` ไม่ถูก persist | insert payload ส่งแค่ pet_id/home_id/author_id/event_type/content; schema `life_journey_events` ไม่มีคอลัมน์วันที่ใด (content/event_type/media_urls/participant_ids/created_at เท่านั้น) | `pets/[id]:96-101`, init migration `20260827130000_init_full_schema.sql:52-61` | ✅ FACT |
| `created_at` ถูกใช้เป็นวันที่เหตุการณ์ใน timeline | query `.order('created_at')` + render `format(event.created_at)` ในบล็อก event | `pets/[id]:54-55,281` | ✅ FACT |
| `observed_at` ไม่เคยถูกเขียน/อ่าน | search ครบทั้ง src — พบเฉพาะประกาศใน migration + type + docs ไม่มี write/read path เดียว | `20260901200000_create_litters.sql:55`, `types/pet.ts:23` | ✅ FACT |
| `used_at` = pattern "จับ occurred ณ ขณะเกิด" | client set `new Date().toISOString()` ตอน consume | `TokenList.tsx:80`, `adopt/[token]/page.tsx:138` | ✅ FACT |
| โมเดล 3 ชั้น occurred/observed/recorded | สังเคราะห์จาก FACT ทุกบรรทัดข้างบน | §2.2 | ⚠️ INFERENCE — รอ challenge ตอนเปิดกระดาน |
| นิยาม `observed_at` = "เวลาที่เริ่มรับรู้การเกิด" | อ่านจากตำแหน่งประกาศติดกับ birth fields ใน migration เดียว | `20260901200000_create_litters.sql:54-55` | ⚠️ INFERENCE (นิยามเชิงเจตนา ไม่มี consumer ยืนยัน) |
| บันได precision (exact/month/year/approx/unknown) | **ไม่มีหลักฐานในระบบปัจจุบัน** — เป็นข้อเสนอเชิงออกแบบที่ไม่ขัดกับหลักฐานใด | §1.2 | ⚠️ ASSUMPTION (proposal) |
| การจัดชั้น EXPOSE/MAP/CONNECT/FIX/MIGRATE | แต่ละแถวอ้าง FACT แต่ตัวการจัดชั้นเป็นการตัดสิน | §3 | ⚠️ INFERENCE — รอ challenge |

**ผล Gate:** core claims 7/7 ผ่านด้วย FACT (1 ข้อแก้ขอบเขต, 1 ข้อเลื่อนจาก INFERENCE → FACT หลัง evidence เพิ่ม) — ข้อเสนอเชิงโมเดลยังคงสถานะ INFERENCE/ASSUMPTION ตามจริง ไม่มีการเลื่อนขึ้นโดยอาศัยความสมเหตุสมผล

---

## 1. Q1 — Meow World ต้องรองรับเวลาแบบไหน?

### 1.1 คำตอบจากหลักฐาน (ไม่ใช่จากความอยาก)

Domain ของ Meow World คือ **บันทึกชีวิตสัตว์เลี้ยงที่ย้อนหลังได้** — หลักฐานในระบบบอกว่าข้อมูลเวลามี 2 ที่มา:

1. **เหตุการณ์ที่บันทึกสด** — เกิดวันนี้ บันทึกวันนี้ (birth wizard ที่จับครอกใหม่, qr used_at) → exact เสมอโดยธรรมชาติ
2. **ความจำ/หลักฐานย้อนหลัง** — "รับน้องมาเลี้ยง 2 ปีก่อน", "หาตัวเจอเดือนที่แล้ว", "รูปเก่าปี 2019" → **human knowledge มักไม่เคย exact**

ข้อเท็จจริงเชิงโครงสร้างปัจจุบัน: ทุก input บังคับ exact (DATE + `<input type="date">`), unknown มีแค่ NULL ที่ UI ซ่อนทิ้ง ไม่มีช่วงกลางเลย

### 1.2 Q1-A — ระบบปัจจุบันรองรับอะไรจริง (FACT ทั้งตาราง)

| State | สถานะปัจจุบัน | หลักฐาน |
|---|---|---|
| **Exact date** | ✅ state เดียวที่ input ได้ | DATE (`init:43`, `litters:8`) + `<input type="date">` ทุกจุด + grep `type="month"/type="week"` ทั้ง src = **0** |
| **Unknown** | ⚠️ schema+readers รองรับ แต่ birth wizard ปิดทาง — ฟอร์มอื่น ๆ 4/6 รับ | Gate §0.3 (PetForm/AddPetModal/PassportEdit ไม่ใส่ required) |
| **Month** | ❌ ไม่มี — ไม่มี widget, ไม่มี data state, ไม่มีคำศัพท์ใน product | grep = 0; คำว่า "เดือนที่ทราบ" ไม่มีใน src/docs ฝั่ง product |
| **Year** | ❌ ไม่มี | เช่นเดียวกัน |
| **Approximate** | ❌ ไม่มี | grep `approximat/precision/estimat` ทั้ง src = **0** |

> บันได Precision 5 ขั้นที่ฉบับก่อนเสนอ (exact/month/year/approx/unknown) **ถอนกลับเป็น candidate — สถานะเดิม ASSUMPTION ยังคงอยู่** เหตุผลที่ §1.4

### 1.3 ตอบคำถามกระดาน: Precision vs Accuracy vs Confidence — คนละแกนจริง

| แกน | นิยาม | ตอบคำถาม | ตัวอย่าง |
|---|---|---|---|
| **Precision** | ความละเอียดของ**ค่า** | รู้ละเอียดแค่ไหน | "14 Aug 2019" ≠ "Aug 2019" ≠ "2019" |
| **Confidence** | ความมั่นใจของ**ผู้อ้าง** | เชื่อตัวเองแค่ไหน | "14 Aug 2019" ≠ "น่าจะ 14 Aug" |
| **Accuracy** | ความถูกต้องต่อ**ความจริง** | ถูกจริงไหม | พิสูจน์ได้เฉพาะผ่าน evidence |

**จุดสำคัญจากหลักฐาน:** product มี requirement ของแกน **Confidence** อยู่แล้ว — "กรณีเกิดข้ามวัน ใช้วันที่ของตัวแรกเป็น Birth Date **เบื้องต้น** แก้ไขภายหลังได้" (`HANDOFF.md:1210`) = ค่า exact ที่ผู้ใช้ไม่แน่ใจ + ระบบอนุญาตแก้ = **provisional-date** ไม่ใช่ precision ระดับใหม่

**ยอมรับข้อผิดพลาดของฉบับก่อน:** บันได 5 ขั้นเดิม**ผสม precision กับ confidence เป็นแกนเดียว** — "approximate" กอบรวมทั้ง year-only (precision ต่ำ) และ "น่าจะ 14 Aug" (confidence ต่ำ) ทั้งที่เป็นคนละแกน บันไดนั้นจึงไม่สมเหตุสมผลในตัวเองและถูกถอน (§1.2) — ทั้งที่เมทริกซ์ด้านล่างนี้แยกแกนถูกต้องอยู่แล้ว แต่ ladder ไม่ได้แยกตาม

---

### 1.3 Precision ≠ Accuracy — ทำไมต้องแยก

> **Precision** = รู้ละเอียดแค่ไหน (วัน/เดือน/ปี)
> **Accuracy** = สิ่งที่รู้นั้นถูกจริงแค่ไหน

"ประมาณปี 2019" **ไม่ใช่** "2019-01-01" — ถ้าระบบเก็บ approximate ใน DATE เปล่า ระบบจะ**หลอกตัวเองเป็นชั้นที่สอง** (เหมือน event_date ที่ถูกทิ้ง): ผู้ใช้บอกความไม่แน่นอน ระบบเก็บเป็นความแน่นอน

แยกสองแกนให้ชัด (precision คนละแกนกับความมั่นใจ):

| | ผู้ใช้ **แน่ใจ** | ผู้ใช้ **ไม่แน่ใจ** |
|---|---|---|
| **จำละเอียด** (มีค่าวันเต็ม) | exact จริง: "เกิด 14 ส.ค. 2019" (มีเอกสารยืนยัน) | **exact-but-unsure**: จำได้ 2019-08-14 แต่ไม่แน่ใจ — ปัจจุบัน DATE บังคับให้ระบบพูดแทนว่า "แน่นอน" (ความไม่แน่ใจหายทันทีที่กด save) |
| **จำคร่าว ๆ** | หายาก: "ปี 2019" ที่เอกสารบางส่วนยืนยัน | **approximate-but-honest**: "ประมาณปี 2019" — ตรงกับความจำจริงที่สุด แต่ถ้าเขียนลง DATE กลายเป็น 2019-01-01 (false precision) |

หลักที่ระบบต้องรักษา: **เก็บค่า (WHAT) กับระดับความแน่ใจของผู้อ้าง (HOW SURE) แยกกัน** — ห้ามเปลี่ยนความไม่แน่นอนให้เป็นความแน่นอนปลอม และห้ามลงทัณฑ์ความจำมนุษย์ด้วยการบังคับ exact (เพราะผลคือผู้ใช้เลือกค่าใกล้เคียงมั่ว ๆ → ข้อมูลเสียหายแบบเงียบ)

ผลสืบเนื่องที่จับต้องได้ใน code จริง:
- **Derived facts ต้องเสีย precision ตามแหล่งที่มา**: `calculateAge` จาก year-only ต้องแสดง "ราว X ปี" ไม่ใช่ "X ปี 3 เดือน" — ปัจจุบันทั้ง 3 ฉบับของ calculateAge กินได้แต่ exact เท่านั้น
- **Sort ต้องมีกติกา**: precision ต่ำยัง sort ได้ (year 2019 < month Mar 2020) แต่ต้องกำหนด sort key ชัด (เช่น ใช้ bound ล่าง) — ตัดสินตอน implement
- **Display ต้องแสดงความไม่แน่นอน** ("~", "ราว", "ประมาณ") ไม่อย่างนั้น UI จะกลายเป็นเครื่องหลอกอีกจุด

### 1.4 Q1-B — ผลการกวาด use case จริง 5 แหล่ง (เพื่อพิสูจน์ "required precision")

> กฎของกระดาน: candidate use case ไม่ใช่ evidence — ต้องเจอใน product/requirement จริงเท่านั้น

| แหล่ง | สิ่งที่ตรวจ | ผล | สถานะ |
|---|---|---|---|
| **1. Birth/Litter requirement** | `HANDOFF.md:1193` "Create Identity First... แม้ข้อมูลยังไม่สมบูรณ์" + `:1216` "ข้อมูลที่ไม่ทราบ: **ข้าม → บันทึกก่อน → เติมภายหลัง**" + `:1210` ข้ามวัน provisional-date | requirement ยอมรับ incomplete data ตั้งแต่วันเกิด + มีกลไก provisional-date ในแผนเดิม (ยังไม่ implement — wizard บังคับ exact) | **FACT (requirement)** |
| **2. คำศัพท์ "ไม่ทราบ" ใน UI** | gender มี option "❓ ไม่ทราบ" (`birth:453`, `PetForm:103`) แต่ไม่มีที่ใดใช้กับวันที่ | product มี pattern unknown-as-choice สำหรับ field ชีวประวัติอยู่แล้ว — แค่ยังไม่เคยใช้กับ date | **FACT** |
| **3. Life Journey** | 9 event types มี "แรกเกิด/วัยเด็ก" (`JourneyComposer:67`) และ "วันแรกที่ถึงบ้าน" (`:69`) — **แต่ composer อยู่ใต้ HomeMode ที่ไม่ถูก import โดย page ใด** (grep import ทั้ง src: HomeMode ไม่มี consumer); ฟอร์มสดที่ถามวันเหตุการณ์มี**แห่งเดียว** (EventForm `pets/[id]:346`); mockData ทุก event_date เป็นวัน exact (`mockData:122-272`) | ไม่มีหลักฐานว่า product เคยออกแบบ fuzzy date; หมวด "วัยเด็ก/วันแรกที่ถึงบ้าน" ชี้ธรรมชาติบันทึกย้อนหลัง แต่ UI ของมันยัง orphan | FACT (การไม่มี) + **INFERENCE** (หมวดนี้น่าจะต้องการ — รอ use case จริง) | **[แก้ไข: ฉบับก่อนเขียน "ฟอร์มสด 2 แห่ง" — ผิด ตรวจ import graph แล้ว JourneyComposer เป็น orphan]** |
| **4. รูป/สื่อเก่า** | `media_urls` ไม่เคยถูกใช้; upload = FileReader base64 ไม่จับเวลาใด (`JourneyComposer:96-105`) | ไม่มี pipeline; "รูปเก่า→ช่วงปี" ยังไม่มีตัวตนใน product | FACT (การไม่มี) — use case รูปเก่า = **ASSUMPTION** |
| **5. เอกสาร requirement ระดับ "รู้แค่ปี/ประมาณ"** | grep ทั้ง docs — พบเฉพาะ "หมดอายุ/อายุ" ที่ไม่เกี่ยวกับเรื่องนี้ + ข้อความของเราเองใน TIME_MODEL/audit | ไม่มีเอกสารใดตั้ง requirement ระดับ month/year/approx | **FACT (การไม่มี)** |

### 1.4 คำตัดสินของกระดาน — Q1-B PASS with boundary (2026-09-23)

| ประเด็น | สถานะที่กระดานบันทึก |
|---|---|
| Exact date | ✅ FACT — implementation ปัจจุบันใช้วันเต็ม |
| Unknown birth date | ⚠️ INFERENCE — domain philosophy รองรับ incomplete data (`HANDOFF:1193,1216`) แต่ไม่มีประโยค requirement ที่ระบุ birth date เป็น unknown ได้โดยตรง |
| Provisional exact date | ⚠️ DOMAIN EVIDENCE / strong INFERENCE — จาก birth override behavior ที่มีอยู่ (`birth:181`) + requirement "เบื้องต้น แก้ไขภายหลังได้" (`HANDOFF:1210`) |
| Month / Year / Approximate | ❌ NOT EVIDENCED → **ไม่สร้าง** (ตัดสินแล้ว — ไม่ใช่เพราะไม่ดี แต่ไม่มีหลักฐานว่าผู้ใช้ต้องการ) |
| Precision ladder (5 ขั้น) | ❌ ถอน — ออกแบบก่อนมี evidence + ผสมแกน precision กับ confidence |

**บันทึก semantic ส่งต่อ Q2:** Unknown = ไม่มีค่าที่เรารู้ · Provisional = **มีค่า** แต่สถานะความมั่นใจ/ความชั่วคราวต่างออกไป — อาจเป็น semantic dimension ที่มีประโยชน์ในภายหลังโดยไม่ต้องสร้าง precision ladder

### 1.4b สรุป Q1 (หลังคำตัดสินของกระดาน)

| เอนทิตี | ปัจจุบัน | ต้องมี (สถานะที่กระดานบันทึก) | ยังไม่พิสูจน์ |
|---|---|---|---|
| pets.birth | exact เท่านั้น (NULL ซ่อนอยู่) | exact (FACT) · unknown (INFERENCE) · provisional (DOMAIN EVIDENCE) | month/year/approx |
| litters.birth_date | exact เท่านั้น | สถานะเดียวกับ pets.birth | เดียวกัน |
| life_journey_events | ไม่มี occurred เลย | exact (สด) — fuzzy ยังเป็น INFERENCE จากหมวด "วัยเด็ก" | month/year/approx |
| recorded ทุกตาราง | created_at (system) | exact เสมอโดยนิยาม | — |

### 1.5 ขอบเขตที่ต้องแยก: อายุ vs เหตุการณ์ (จาก §0.1)

- **อายุ** (derived จาก birth_date): ต้องการ exact เพื่อตัวเลขละเอียด แต่ degrade เป็นขั้นได้**ถ้า precision ลดลงจริง** (ladder ยังเป็น ASSUMPTION §1.2) — exact → "X ขวบ X เดือน" · month → "ราว X เดือน" · year → "ราว X ปี" · unknown → "ไม่ระบุวันเกิด" (copy มีอยู่จริงใน certGenerator)
- **เหตุการณ์ใน Life Journey**: ไม่มีสูตรใดร้องขอ exact — คุณค่าที่ผู้ใช้ต้องการคือ "จำได้ว่าเกิดเมื่อไหร่" แบบซื่อตรงกับความจำ
- ทั้งสองอยู่บน occurred ของ**เอนทิตีต่างกัน** (pets.birth vs life_journey_events) — ใช้ precision ladder **เดียวกัน แต่ต่างระดับตามธรรมชาติของเอนทิตี** ไม่ใช่ "ทั้งระบบต้อง exact" หรือ "ทั้งระบบต้อง approximate"

---

## 2. Q2 — ใครเป็นเจ้าของความหมายของแต่ละเวลา?

### 2.0 ตรวจหลักฐานต่อ claim ก่อนเปิด challenge (สถานะสามระดับเหมือน Gate)

| Claim ที่โมเดล Q2 ยืนอยู่ | Evidence ที่ตรวจแล้วด้วยตา | ตำแหน่ง | สถานะ |
|---|---|---|---|
| `created_at` เจ้าของ = ระบบ (DB default) | `DEFAULT NOW() NOT NULL` ใน schema; grep `created_at:` ทั้ง src — ไม่มี DB insert ใด set ค่าเอง (เจอเฉพาะ type decl, mock fixtures, in-memory cert object) | `init:47,61` · `DigitalCertificateModal.tsx:121` | ✅ FACT |
| litters UI ตีความ created_at ถูกต้องว่า "สร้างเมื่อ" | แสดง `สร้างเมื่อ {format(litter.created_at)}` | `litters/page.tsx:238` | ✅ FACT |
| `used_at` = pattern "จับ occurred ณ ขณะเกิด" | client set `new Date().toISOString()` ณ ขณะ consume | `TokenList.tsx:80`, `adopt/[token]/page.tsx:138` | ✅ FACT |
| `birth_date` เจ้าของ = มนุษย์ | ผู้ใช้พิมพ์ผ่าน wizard/form ทุก write path | `birth/page.tsx:154,181` | ✅ FACT |
| ระบบปฏิเสธสิทธิ์ occurred ของ event โดยพฤตินัย | EventForm บังคับกรอก + payload ทิ้ง + timeline ใช้ created_at แทน | `pets/[id]:327,347` / `:96-101` / `:54-55,281` | ✅ FACT |
| `observed_at` นิยาม = "เวลาที่เริ่มรับรู้การเกิด" | ยืนยัน adjacency จริง: `birth_time TIME` (L54) ติดกับ `observed_at TIMESTAMPTZ` (L55) — จัดกลุ่มกับ birth fields โดยตำแหน่ง; ไม่มี consumer ยืนยันความหมาย | `20260901200000_create_litters.sql:54-55` | ⚠️ INFERENCE (ตำแหน่ง schema สนับสนุน แต่ยังเป็นการตีความเจตนา) |
| โมเดล 3 ชั้น occurred/observed/recorded | สังเคราะห์จาก FACT 6 แถวบน + INFERENCE 1 แถว | §2.2 | ⚠️ INFERENCE — คงสถานะเดิม รอ challenge |
| กฎ occurred ≤ observed ≤ recorded | กฎเชิงตรรกะจากนิยามความหมาย — **ไม่มี code ใดบังคับ** (เป็นกฎเชิงโมเดล ไม่ใช่ enforcement) | §2.2 | ⚠️ INFERENCE |

> ข้อสังเกตต่อกระดาน: คำสั่งเวลาส่วนที่เป็น FACT ของ Q2 ครอบเฉพาะ "ใครเขียน/ใครอ่าน/เขียนตอนไหน" — ส่วน "เจ้าของความหมาย" โดยรวมยังเป็นการตีความจาก behavior ทั้งหมด ไม่มี requirement ใดประกาศ ownership ตรง ๆ (HANDOFF บอก workflow ไม่ได้บอก ownership ทางการ)

### 2.1 ตรวจจาก behavior จริง (ไม่ถือ definitions ล่วงหน้า)

| หลักฐาน | บอกอะไรเรื่อง ownership |
|---|---|
| `created_at` = DB default, client ไม่เคย set, litters page เรียกมันว่า "สร้างเมื่อ" แล้วถูกต้อง | เจ้าของ = **ระบบ** ความหมาย = จุดที่ record เข้าสู่ Meow World — ผู้ใช้/app ไม่มีสิทธิ์แตะ |
| `qr_tokens.used_at` = client set `new Date()` **ณ ขณะ action เกิด** (`TokenList:80`, `adopt:138`) | codebase มี pattern ที่ถูกอยู่แล้ว: เวลาเกิดเหตุการณ์จับตอนมันเกิด โดยผู้กระทำ |
| `birth_date` = ผู้ใช้พิมพ์ลง wizard/form | เจ้าของ = **มนุษย์** (ความจำ/หลักฐานของครอบครัว) ระบบเป็นแค่ผู้จด |
| `event_date` ใน EventForm = ผู้ใช้ assert "เกิดวันที่ X" แล้วค่าหาย | ระบบ**ปัจจุบันปฏิเสธสิทธิ์**ของผู้ใช้ในการเป็นเจ้าของ occurred ของ event โดยพฤตินัย |
| `observed_at` = ชื่อบอก "เวลาที่พบเห็น" ถูกเพิ่มคู่ birth fields แต่ไม่มี consumer | ตำแหน่งว่างของ "เจ้าของที่สาม" ถูกเตรียมไว้: เวลาที่ครอบครัว/ระบบ **เริ่มรับรู้** ข้อเท็จจริง |

### 2.2 Time Model ที่เสนอ (ยึดจาก behavior + domain intent)

```
น้องเกิด / เหตุการณ์เกิด
   │
   ├── OCCURRED   เกิดจริงเมื่อไหร่          เจ้าของ: มนุษย์ (ความจำ / evidence ที่ยืนยันแล้ว)
   │              → มีสิทธิ์มี precision ทุกระดับ + unknown
   │
   ├── OBSERVED   ครอบครัว/ระบบเริ่มรู้เมื่อไหร่   เจ้าของ: มนุษย์เช่นกัน แต่ตอบคนละคำถาม
   │              ("รู้ว่าเขาเกิด ~2019" ≠ "เขาเกิด ~2019")
   │
   └── RECORDED   บันทึกลงระบบเมื่อไหร่      เจ้าของ: ระบบ (created_at) — แตะไม่ได้ แก้ไม่ได้
                  → exact เสมอ โดยนิยาม
```

กฎความสัมพันธ์ (จาก behavior จริง ไม่ใช่ความอยาก):
1. **occurred ≤ observed ≤ recorded เสมอ** (เกิดก่อนรู้ รู้ก่อนจด — ยกเว้นเหตุการณ์สดทั้งสามอันซ้อนกันเป็นจุดเดียว ซึ่งเป็นกรณีปกติของ birth wizard + used_at)
2. **recorded เป็น exact เสมอ** — ไม่มีเหตุผล domain ให้ "บันทึกโดยประมาณ"
3. **occurred มีสิทธิ์เป็น unknown** — และเมื่อ occurred unknown, **observed กลายเป็นข้อมูลที่มีค่าที่สุด** ("ไม่รู้เกิดวันไหน แต่รู้ว่ารับมา 2 ปีก่อน") — จุดนี้ทำให้ observed_at ไม่ใช่ column ตกแต่ง แต่คือครึ่งหลังของความจริงเรื่องแมวจร (อ่าน: cats don't come with birth certificates)
4. **การเปลี่ยน occurred ต้องมีร่องรอย** (เชื่อม Evidence round: ใครยืนยัน/จากหลักฐานอะไร) — ปัจจุบัน override provenance หายตอน insert เป็นตัวอย่างว่าไม่มีร่องรอยแล้วเสียหายอย่างไร

สรุป: definitions ที่ส่งมา (occurred = human memory/evidence-confirmed, observed = first awareness, recorded = entered system) **ตรงกับ behavior จริงของ codebase ทุกข้อ** — ผมจึงรับไว้เป็นโมเดล แต่ด้วยหลักฐานสนับสนุน ไม่ใช่ด้วยการถือตาม *(หมายเหตุหลัง challenge: ประโยคนี้เขียนก่อน Q2.1–2.3 — สถานะล่าสุดให้ดูตารางคำตัดสินใน §2.2b)*

### 2.2b คำตัดสินของกระดานหลัง challenge รอบแรก (2026-09-23)

| ชั้น | สถานะที่กระดานรับรอง |
|---|---|
| **RECORDED** | ✅ FACT (implementation): `created_at` = DB record creation time · ⚠️ การเรียกมันว่า domain "recorded_at" = INFERENCE เล็กน้อย — **boundary: DB creation time ≠ มนุษย์ตั้งใจบันทึกเหตุการณ์** (นึกขึ้นได้ 3 วันต่อมา → created_at = วันที่ 3) — wording ที่ถูก: *system-record creation time* |
| **OCCURRED** | ⚠️ STRONG INFERENCE — พิสูจน์ได้: มนุษย์ให้ข้อมูลเวลาเหตุการณ์ได้ (birth_date/birth_time เขียนโดยมนุษย์ + event_date เป็น user input จริง) · ยังพิสูจน์ไม่ได้: ownership โดยสมบูรณ์ (input ≠ ownership) |
| **OBSERVED** | ⚠️ WEAK INFERENCE — เพียง: schema มี field + ตำแหน่งสัมพันธ์กับ birth data · **ยังพูดไม่ได้ว่าหมายถึง "เวลาเริ่มรับรู้การเกิด"** (write 0 / read 0 / consumer 0) |
| **Ordering rule** | ⏸️ DESIGN CANDIDATE — **ไม่รับรองเป็นกฎ** — สร้างเอง ไม่มี enforcement/requirement/validation รองรับ + ยังไม่นิยาม actor ของ observation ("ใคร" รับรู้?) |

**หลักใหม่ที่กระดานกำหนด:** *อย่าให้ชื่อ field เป็นคนกำหนดความหมายของข้อมูล* — observed_at ชื่อบอกอย่างหนึ่ง แต่ evidence พูดได้เพียงว่ามันมีอยู่

### 2.2c เจาะ OCCURRED — ประเด็นสำคัญที่สุดของ Life Journey Time Model

**สิ่งที่ยืนยันเพิ่มด้วยตาต่อจาก challenge:**
| ข้อเท็จจริง | ตำแหน่ง |
|---|---|
| HomeMode (ต้นไม้ JourneyComposer/JourneyFeedCard) ไม่มี import ใด — ฟอร์ม event สดมีแห่งเดียว | grep import ทั้ง src = 0 consumer |
| ฟอร์มสดนั้น (EventForm) ให้ผู้ใช้เลือกวันเอง ไม่บังคับวันนี้ — default วันนี้แต่แก้ได้ | `pets/[id]:327,346-347` |
| display ที่ "คาดหวัง" event_date มี 2 กลุ่ม: live = ไทม์ไลน์ในหน้า pet ใช้ created_at **แทน**; orphan = JourneyFeedCard:128 + PassportView:507 แสดง event_date ตรง ๆ | `pets/[id]:281` / orphan components |
| PassportView (orphan) มี input แก้ birth_date เป็นวันเต็ม | `PassportView:570-573` |

**แกนที่ซ่อนใน event_date ที่ UI รับแล้วทิ้ง — มันพิสูจน์สองสิ่งพร้อมกัน:**
1. **มีความตั้งใจเก็บเวลา occurred ของ event** (user input จริง + display ทั้ง live และ orphan คาดหวังมัน)
2. **มีร่องรอยแกน provenance** — event_date ที่ผู้ใช้ assert แยกจาก created_at ที่ระบบจับ = การแยก "ค่าของเวลา" ออกจาก "ที่มา/ขณะของการ assert"

**สิ่งที่ event_date พิสูจน์และไม่พิสูจน์ (กรอบของกระดาน):** user input พิสูจน์ intent, ไม่พิสูจน์ domain ownership โดยสมบูรณ์ — สถานะคงเป็น STRONG INFERENCE

**ทางเลือกการอ่านหลักฐาน (อนุญาตให้มี 2 การอ่าน):**
- **การอ่านแบบ semantic:** occurred เป็นเวลาชนิดที่สองที่แตกต่างจาก recorded — เข้ากับ STRONG INFERENCE ที่กระดานรับไว้
- **การอ่านแบบ conservative:** ระบบปัจจุบันมีเพียง "เวลาบันทึก" เดียว + "user claim ที่ยังไม่มีที่เก็บ" — occurred อาจเป็นเพียง claim เอกชนต่อแถว ไม่ใช่เวลาชนิดใหม่ จนกว่าจะพิสูจน์ว่าจำเป็นต้องมีความหมายแยกชั้น

**คำถามที่กระดานต้องตอบเพื่อปิด OCCURRED (ท้าทายที่สุด):**
> "human-provided event time" คือความหมายแยกชั้นของตัวเอง หรือเป็นเพียงค่าที่ควรถูกเก็บให้ถึงที่หมาย?
> ถ้าเป็นแบบหลัง โมเดล 3 ชั้นจะลดเหลือ 2 ชั้น (recorded + human-claimed) และ observed_at อาจไม่จำเป็นต้องเป็นชั้นที่สามเลย

สถานะ: ยังไม่ตัดสิน — รอกระดานเลือกการอ่าน ก่อนไป OBSERVED ต่อ *(ต่อมา: กระดานตัดสินแล้วที่ §2.2d)*

### 2.2d บันทึกคำตัดสินของกระดาน + ผล trace สุดท้ายของ observed_at (2026-09-23)

**Trace ครบทุกขั้นตามคำสั่งของกระดาน (ทุกลิงก์ตรวจด้วยตารอบนี้):**

| ขั้น | ผล | ตำแหน่ง |
|---|---|---|
| schema | มี | `20260901200000_create_litters.sql:55` |
| types | มี (mirror) | `types/pet.ts:23` |
| insert / update / select | **0 ทั้งสาม** | grep `observed_at` ทั้ง src |
| UI | 0 | — |
| requirements / docs | **0** — grep `observed` ใน `HANDOFF.md` ไม่พบ; ทั้ง docs/ ไม่พบนอกเอกสาร audit ที่ทีม audit เขียนเอง | grep ตรง |

→ **ไม่มี evidence เชิง domain behavior นอก migration เลย** — เงื่อนไข "ถอดออกจาก Time Model หลัก" ของกระดานครบ

**คำตัดสินที่บันทึก:**

| รายการ | สถานะ |
|---|---|
| OCCURRED | ❌ ไม่รับเป็น "ชั้นข้อมูลที่มีอยู่แล้วในระบบ" — รับเป็น **candidate domain meaning** ที่เกิดจาก human-claimed event time |
| HUMAN-CLAIMED EVENT TIME | ✅ STRONG EVIDENCE (มีจริงใน UX) · ⚠️ ยังไม่ persisted · ชื่อ domain ยังไม่ตัดสิน (ใช้ชื่อนี้ชั่วคราว — ไม่บังคับว่า claim = truth: เก็บได้ว่า "ผู้ใช้ระบุวันนั้น" โดยไม่ประกาศ "เกิดแน่นอนวันนั้น" — สอดคล้อง Provisional จาก §1.4) |
| observed_at | **ถอดออกจาก Time Model หลัก** → เก็บเป็น legacy/latent field ที่ยังไม่กำหนด semantic — หลัก: **Schema existence ≠ domain requirement** |
| 3-LAYER MODEL | ⏸️ NOT DECIDED — ถ้าหลักฐานบอก 2 ชั้น จะไม่สร้างชั้นที่ 3 เพื่อความสมบูรณ์ของ architecture |
| occurred ≤ observed ≤ recorded | ❌ ไม่รับเป็น rule (คงสถานะ DESIGN CANDIDATE) |
| การ migrate | ยังไม่ migrate observed_at / ไม่เพิ่ม occurred_at |

**ประโยคปิด Q2:** ปัญหาที่พิสูจน์แล้ว**ไม่ใช่** "Meow World ขาด 3 time layers" แต่คือ **"user มีความหมายเรื่องเวลาของเหตุการณ์ แต่ระบบยังไม่มีที่เก็บความหมายนั้น"**

> ผลต่อโมเดลตอน implement: อาจจบที่ `recorded_at` + `human_claimed_event_time` แทน `occurred_at` + `observed_at` + `recorded_at` — การตัดสิน 3 หรือ 2 ชั้นเป็นของกระดาน ไม่ใช่ของเอกสารฉบับนี้

**สถานะ Q2: ปิดได้** — ไม่มี assumption ใดถูกยกฐานะเกินหลักฐาน; สิ่งที่คงอยู่คือ FACT + STRONG EVIDENCE + สิ่งที่ถูกถอดออกอย่างมีเหตุผล

---

## 3. Q3 — อะไรต้อง MIGRATE จริง อะไรแค่ MAP/EXPOSE?

> ⚠️ **หมายเหตุหลัง Q2 challenge (§2.2d):** การจัดชั้นใน §3 เขียนบนโมเดล 3 ชั้นฉบับก่อน challenge — รายการ EXPOSE `observed_at` ถูกถอนแล้ว (legacy/latent) และ MIGRATE candidate "occurred_at" ต้องอ่านใหม่เป็น "ที่เก็บ human-claimed event time" ซึ่งชื่อ/รูปร่างยังไม่ตัดสิน — Q3 จะถูก challenge ใหม่ทั้งชุดหลัง Q2 ปิด

### 3.1 Q3.1 — Human Claim มี "หน้าที่" อะไร (trace ตามขอบเขตกระดาน — ไม่ออกแบบ field)

**การยืนยันเพิ่มก่อนตอบ (ตรวจด้วยตารอบนี้):**

| ข้อ | ผล |
|---|---|
| ProgressivePassport (live) ใช้ event_date? | **ไม่** — เพียงนับจำนวน events (`count: 'exact'`, `ProgressivePassport.tsx:77-80`) |
| client-side `.sort()` ทั้ง src | **0 จุด** — ordering เกิดที่ DB `.order('created_at')` ล้วน |
| mockData คู่ event_date vs created_at | **7/7 events เป็นวันเดียวกัน** (`mockData:121-271` + `:17-200`) — design เดิมไม่เคยซ้อมกรณี claim ≠ record แม้ในข้อมูลปลอม |

**ตอบ 5 คำถามของกระดาน:**

1. **User ระบุวันที่เพื่ออะไร (UX ที่มีอยู่):** EventForm ติดป้าย "วันที่ *" และ**บังคับ**ก่อน submit — ผู้ใช้ถูกถาม "เหตุการณ์นี้เกิดวันไหน" ทุกครั้ง (FACT `pets/[id]:345-347`) · design เดิม (orphan) แสดงวันนี้เป็นวันของ moment บน feed/passport (FACT ของ design artifacts: `JourneyFeedCard:128`, `PassportView:482,519`) · ที่ live UI ผู้ใช้**ไม่เคยเห็น**วันที่ตนระบุเลย (FACT)

2. **หลัง submit วันที่ถูกใช้ที่ไหนก่อนถูกทิ้ง:** **ไม่ถูกใช้แม้แต่ครั้งเดียว** — `handleAddEvent` อ่านเฉพาะ title/description/event_type, event_date ไม่ถูกอ้างอิงจากบรรทัดใดหลัง submit (FACT `pets/[id]:88-104`)

3. **Reader ที่คาดหวัง:** live = **0** (ไทม์ไลน์ใช้ created_at `:281`; ProgressivePassport นับจำนวนเท่านั้น) · orphan = 3 (`JourneyFeedCard:128`, `PassportView:482,519`) + types + mockData (FACT)

4. **ถ้าวันที่หาย ระบบเสียความหมายอะไร:** กรณีบันทึกย้อนหลัง (record date ≠ event date) — ไทม์ไลน์แสดง**วันที่บันทึก**และเรียงตามมัน (`:54,281`) วันที่ที่ผู้ใช้ assert จึงหายทั้งการแสดงผลและตำแหน่งลำดับ → สำหรับ entry ย้อนหลัง UI บิดเบือนทั้ง "วันของเหตุการณ์" และตำแหน่งในเรื่องชีวิต (FACT ของพฤติกรรมเมื่อเงื่อนไขวันต่างกันเป็นจริง; เงื่อนไขนี้มี design artifacts + ปรัชญา "Story of a Life" `HANDOFF:74` รองรับว่าเป็นกรณีที่ product ตั้งใจรองรับ)

5. **หลักฐานเรื่องการเรียง:** **ไม่มี requirement ใดพูดถึง sort key โดยตรง** — พบเพียง "Life Journey ไม่ควรเป็นเพียง Data Timeline แต่เป็น Story of a Life" (`HANDOFF:74`) + "รูปแบบข้อมูลบน Timeline = Quality Signal" (`:86`) = สนับสนุนเชิงปรัชญา ไม่ใช่คำสั่งเรียง; พฤติกรรมจริงทั้งหมดเรียงด้วย created_at (FACT) → **การเรียงตาม event date = INFERENCE (ยังไม่พิสูจน์)** — และสำคัญ: แม้จะเก็บ claim ก็ไม่จำเป็นต้องแปลว่าต้องเรียงใหม่

**ตาราง 4 ด้าน:**

| ด้าน | ผล | สถานะ |
|---|---|---|
| UX | ฟอร์มบังคับถามทุกครั้ง แต่ live UI ไม่เคยแสดง; design เดิม (orphan) แสดง | FACT (input + orphan) / INFERENCE (ความต้องการเห็นใน live) |
| Business Meaning | วันที่เป็นส่วนของ identity ของ moment ใน design เดิม (mock 7/7 มีวันเฉพาะ + หมวด "วันแรกที่ถึงบ้าน/เกิด") | FACT ของ design artifacts / INFERENCE ของ product ปัจจุบัน |
| Read | live 0 / orphan 3 | FACT |
| Persistence | ทิ้งที่ payload; DB ไม่มีคอลัมน์; สำหรับ entry ย้อนหลัง ความหมายหายจริง (แสดงผล + ลำดับ ผิดจาก assertion) | FACT |

**ข้อสรุป Q3.1 (เล็กที่สุดตามที่กระดานขอ):**
> ระบบมีข้อมูลที่ผู้ใช้ตั้งใจระบุ (FACT) และข้อมูลนั้นถูก design ให้มีความหมายต่อ Life Journey (FACT ของ design artifacts) แต่ persistence contract ยังไม่รักษามัน (FACT) — ส่วน "ต้องเรียงตามวันเหตุการณ์" ยังไม่ถูกพิสูจน์ (INFERENCE)

### 3.1b คำตัดสินกระดาน — Q3.1 PASS / CLOSED (2026-09-23)

| ประเด็น | คำตัดสิน |
|---|---|
| User ระบุ Event Date / ระบบรับใน Form | ✅ FACT |
| หลัง Submit มีการใช้ค่าต่อ | ❌ FACT — ไม่ใช้ |
| Live UI อ่าน Event Date | ❌ FACT — 0 จุด |
| Reader ที่ยังคาดหวัง | ⚠️ Orphan 3 จุด |
| Persistence | ❌ FACT — ค่าหาย |
| การเก็บย้อนหลังเป็น use case | ✅ มีหลักฐานจาก Product direction |
| Timeline ต้องเรียงตาม Event Date | ⚠️ ยังไม่พิสูจน์ |
| event_date = occurred_at | ❌ ยังไม่ตัดสิน |

> ข้อสรุปที่กระดานรับ: "ผู้ใช้สามารถให้ข้อมูลเกี่ยวกับเวลาของเหตุการณ์ได้ แต่ระบบปัจจุบันไม่รักษาข้อมูลนั้น และ Live Journey ก็ไม่ได้ใช้มัน" — และ: แม้เก็บ Human Claim ได้ ก็ไม่แปลว่า Timeline ต้องเปลี่ยน sort key

### 3.2 Semantic Scope of Human Claim — ผล trace + คำตัดสิน (2026-09-23)

**การยืนยันเพิ่มก่อนตัด scope (ตรวจด้วยตา — มีข้อแก้ไข):**

| ข้อ | ผล |
|---|---|
| liveness ของ birth_date age-readers | **แก้ไข:** PetCard = live (`pets/page.tsx:6`) · header หน้า pet = live · ProgressivePassport = live · **HouseGraphicCard = orphan** (import โดย HomeMode ที่ไม่มี consumer) · **PassportView = orphan** → live 3 + orphan 2 ไม่ใช่ "4+ live" ตามที่เขียนก่อนหน้า |
| ใบรับรอง (DigitalCertificateModal) | มี human-set date (`issue_date` default วันนี้ แก้ได้ `:47,358`) แต่ **orphan ทั้งตัว** — ไม่มีใคร import, `onSaveCertificate` ไม่มี parent รับ, **ไม่มี supabase ในไฟล์** → ไม่นับเป็น live scope |
| AddPetModal | orphan (ยืนยันก่อนหน้า) |
| PetForm | live 2 จุด (`pets/page.tsx:7`, `pets/[id]/edit/page.tsx:6`) — ไม่บังคับ birth_date |
| `updated_at` (pets + life_journey_events) | ยืนยัน trigger จริง: auto-update ทุก UPDATE (`20260901000000_add_weight_updated_at.sql:9-32`) — กลไก system-side "แก้ไขล่าสุดเมื่อไหร่" **มีอยู่จริง** แต่ UI ไม่เคยอ่าน (audit §2.7) |
| `birth_date_override` | ยืนยัน comment เจตนา: `// if different from litter default` (`types/pet.ts:99`) |

**ตาราง scope ที่กระดานตัดสิน:**

| Human claim | Persistence | Live readers | Scope ที่พิสูจน์ได้ |
|---|---|---|---|
| `birth_date` | ✅ persisted | live จริง (PetCard, pet header, ProgressivePassport, litters display) | กว้างกว่า Event เดียว — domain data ที่มีชีวิตหลายจุด |
| `event_date` | ❌ ไม่ persisted | 0 | พบเฉพาะ Event flow + design artifacts (orphan) |
| ใบรับรอง issue_date | — (orphan ทั้ง component) | 0 | ไม่นับเป็น live scope |

**คำตัดสิน Q3.2:** 🟢 **PASS — Scope evidence established** · 🟡 **Architectural classification — ยังไม่ตัดสิน**

- **distinction ที่บันทึก:** "Human-provided" ≠ "Time Layer" — birth_date เป็น human-provided time ที่ scope กว้างจริง · event_date เป็น human-provided time ที่หลักฐานปัจจุบันชี้ไปที่ **attribute ของ Life Journey Event**
- **Hypothesis B แข็งแรงกว่าบน evidence ปัจจุบัน** (Event: event data + human-claimed time + created_at) — **แต่ยังไม่เป็นข้อสรุปสุดท้าย** เพราะยังไม่พิสูจน์ว่า concept นี้จะถูกใช้ร่วมกับ entity/workflow อื่นตาม requirement จริงในอนาคต
- ห้ามเลือก A หรือ B ในรอบนี้

### 3.3 เปิดประตูถัดไป: ระบบต้อง "รักษาความหมาย" อะไรนอกจากตัววันที่?

> ขอบเขตเดิมครบ: ❌ ไม่ตั้งชื่อ field · ❌ ไม่ออกแบบ schema · ❌ ไม่ migration · ❌ ไม่ตัดสิน Time Layer — เปิดทีละประตู 🚪

คำถามใหญ่: ถ้า human claim เป็นข้อมูลของ Life Journey Event จริง การ "เก็บวันที่" เพียงอย่างเดียวอาจไม่พอที่จะรักษา**ความหมาย**ที่ผู้ใช้ตั้งใจ — ประตูที่เปิดได้ มีหลักฐานเริ่มต้นดังนี้:

| # | ประตู | คำถามของประตู | หลักฐานเริ่มต้น (สถานะ ณ วันนี้) |
|---|---|---|---|
| 1 | **Claim vs Fact** | ระบบควรจำแนก "ผู้ใช้ระบุ" ออกจาก "ยืนยันแล้ว" หรือเก็บอย่างเดียวพอ? | EventForm รับแต่ไม่ถามระดับความแน่ใจ (FACT ของ UI ปัจจุบัน); User Confirmation flow ยังไม่ถูกนิยาม (คำถามค้างของ Evidence round) |
| 2 | **Provisional** | ค่าที่กรอก "เบื้องต้น แก้ไขภายหลัง" (`HANDOFF:1210`) ต้องถูกจำว่าเป็น provisional หรือไม่? | birth_date_override มีอยู่ (FACT `birth:181` + comment `pet.ts:99`); `updated_at` trigger มีกลไกจับ "แก้ภายหลัง" อยู่แล้ว (FACT `migration:9-32`) แต่การผูก provisional semantics กับมัน = ยังไม่มีใครพูดถึง |
| 3 | **Provenance** | ต้องรู้ไหมว่าวันที่มาจากไหน (ตามครอก / กรอกเอง / จากหลักฐาน)? | birth_date_override provenance หายตอน insert (FACT — audit Conflict #4); event claim ยังไม่มีที่เก็บเลย |
| 4 | **Confidence** | "น่าจะวันนั้น" vs "แน่วันนั้น" — แกน confidence ที่ Q1 ค้นพบ มีที่อยู่ใน Event หรือไม่? | UI ปัจจุบันไม่ถาม (FACT); Provisional จาก §1.4 เป็นกรณีแรกที่ requirement พูดถึงแกนนี้ |
| 5 | **Truthfulness ของ claim เมื่อเวลาผ่านไป** | claim ที่บันทึกไว้ เมื่อเรื่องเล่าเปลี่ยน ระบบเก็บประวัติการแก้ได้ไหม (updated_at มีแต่ไม่มีใครอ่าน)? | updated_at = FACT ว่ากลไกมี, read = 0 (FACT) |

> ประตูไหนที่ evidence ยังบาง จะถูกตอบแบบ "ยังไม่ตัดสิน — รอ evidence เพิ่ม" ตามกติกา ไม่ใช่ตอบด้วยการออกแบบ

### 3.3a Q3.3 Door 2 — PROVISIONAL (trace Requirement → Workflow → Data → Read → Edit)

**ข้อค้นพบใหม่ที่แก้การตีความเดิม:** `birth_date_override` **ไม่มี write path ใน src ทั้งหมด** — grep ครบ: มีเพียงจุดอ่านตอน insert (`birth:181` — ประเมินจาก `baby.birth_date_override` ที่**ไม่มี input ใด set ค่า**) และ type (`pet.ts:99`) → field นี้เป็น **latent: ไม่เคยถูก populated, fallback ทำให้ `sharedData.birth_date` ชนะเสมอ** — การตีความเดิมของ audit Conflict #4 ("wizard รู้ค่า override ณ ตอน insert") **เกินหลักฐาน**: wizard ไม่ได้ "รู้" — มันแค่ประเมิน optional field ที่เป็น undefined เสมอ *(แก้ไขบันทึกลงเอกสาร)*

**ตอบ 4 คำถามของกระดาน:**

**1. Requirement พูดถึง provisional อย่างไร?** — บริบทเต็ม `HANDOFF:1211`: "กรณีเกิดข้ามวัน ใช้วันที่ของตัวแรกเป็น Birth Date เบื้องต้น แก้ไขภายหลังได้" = **คำสั่งเชิง workflow** (กรณีข้ามวัน → ใช้ค่าหนึ่งเป็นตัวแทนไปก่อน → แก้ทีหลัง) — ไม่มีประโยคใดบอกว่า**ข้อมูลต้องจำสถานะชั่วคราวของตัวเอง**; ภาษาเดียวกันทั้งเอกสาร: `:1217` (ข้าม → บันทึกก่อน → เติมภายหลัง), `:1223` (parent เชื่อมภายหลังได้), `:1240` (Passport Day 1 → ภายหลัง → สุดท้าย), `:1191` (Complete It Over Time) — ทั้งหมดพูดถึง**การทยอยเติมตามเวลาของผู้ใช้** ไม่ใช่สถานะของข้อมูล (FACT)

**2. birth_date_override ทำหน้าที่อะไรจริง?** — trace: input (**ไม่มี**) → state (**ไม่มี**) → insert (อ่านค่าที่ undefined เสมอ `:181`) → read/display (**ไม่มี** — หลัง insert ค่า fallback ถูกเก็บเป็น birth_date ปกติ) → edit (PetForm ไม่รู้จัก override) → **หน้าที่จริงวันนี้ = ไม่มี** — สิ่งที่มันพิสูจน์: **เจตนา design** กรณี per-baby ต่างวันจากครอก (FACT ของ type+comment) — การจัดว่าเป็น provenance / temporary status / business distinction = **NOT DECIDED** (ไม่มี behavior ให้ตัดสิน)

**3. มี evidence ของ "ค่าก่อนหน้า"?** — ไม่มี: edit path ของ pets เป็น UPDATE ตรง ๆ (`pets/[id]/edit/page.tsx:47-49`) — ค่าเก่าถูกเขียนทับ ไม่มีใครจับ; ทั้ง 13 migrations **ไม่มีตาราง history/version**; สิ่งเดียวที่รอดคือ `updated_at` (ว่าแก้ล่าสุดเมื่อไหร่) — **"อะไร" ถูกแก้ ไม่มีที่เก็บ** (FACT)

**4. updated_at มี semantic role?** — pets/events: write โดย trigger จริง (`migration:9-32`) แต่ **read = 0** (grep: จุดเดียวที่มีคนเขียน+อ่าน updated_at คือ admin/flags — อีกตาราง) → เป็น **system metadata ไร้ consumer เชิง domain** — และ evidence ยืนยันข้อห้ามทั้งสี่ของกระดาน: updated_at ≠ confirmation ≠ provenance ≠ confidence ≠ provisional (FACT)

**คำตอบต่อกระดาน — "Provisional มี semantic ที่พิสูจน์ได้ว่าอะไร?":**

| ระดับ | สิ่งที่พิสูจน์ | สถานะ |
|---|---|---|
| **Workflow** | requirement สั่ง "ใช้ก่อน → แก้ภายหลัง" หลายจุด; กลไกแก้ค่ามีจริง (edit page + updated_at) | ✅ FACT — แต่เป็น editability + ลำดับการทำงาน ไม่ใช่ความหมายของข้อมูล |
| **Data-level status** | "ค่านี้ provisional" ต้องถูกจำโดยระบบ — **ไม่มีหลักฐานใด** (ไม่มี input, ไม่มีที่เก็บ, ไม่มี consumer, ไม่มี requirement ประโยคใดพูดถึงสถานะของข้อมูล) | ❌ NOT EVIDENCED |
| Override field | latent — ไม่เคยถูก populated; การตีความเดิมเกินหลักฐาน | ⚠️ แก้ไขบันทึก |

**ข้อสรุป Door 2 (PARTIAL):**
> สิ่งที่ระบบพิสูจน์ได้คือ **workflow ที่ทยอยเติมข้อมูล + ค่าแก้ไขได้** — ส่วน "Provisional" ในฐานะสถานะของข้อมูลที่ระบบต้องจำ = **NOT EVIDENCED** · สองข้อห้ามของกระดานได้รับการยืนยันจาก evidence เอง: editable ≠ provisional (กลไกแก้ไม่สร้างความหมาย) และ override ≠ uncertainty (override แม้ไม่เคยทำงานเลย)

### 3.3b คำตัดสิน Door 2 — PARTIAL / CLOSED + หลักใหม่ (2026-09-23)

| กระดานตัดสิน | สถานะ |
|---|---|
| Workflow: ใช้ค่าหนึ่งก่อน แล้วแก้ภายหลัง | ✅ FACT |
| Data มีสถานะ provisional | ❌ NOT EVIDENCED |
| birth_date_override มีชีวิตจริง | ❌ latent (declared → never populated → never read) |
| มี history ของค่าก่อนหน้า | ❌ |
| updated_at บอก semantic ของการแก้ไข | ❌ |
| ต้องสร้าง Provisional mechanism | ❌ ยังไม่มีเหตุผลจาก Evidence |

**ประโยคที่กระดานเก็บ:** *Editability ≠ Provisionality* · *Workflow ที่อนุญาตให้แก้ภายหลัง ≠ Data ที่ประกาศว่าตัวเองเป็น provisional*

**หลักใหม่ (แข็งขึ้นจากกรณี override):** *Schema / Type / Comment / Requirement wording เพียงอย่างเดียว ยังไม่ทำให้ Domain Concept มีชีวิต — ต้องมีอย่างน้อย behavior ที่ตรวจสอบได้ จึงค่อยยกระดับความหมาย* — และ: ชื่อ field + comment + workflow description สามารถทำให้ "คิดว่ามี feature" ทั้งที่ runtime ไม่มี feature นั้น (กรณี override อยู่กลุ่มเดียวกับ observed_at)

### 3.3c Q3.3 Door 3 — PROVENANCE ("ใครบอก / มาจากไหน" — trace ระดับ Actor / Source / Chain)

**หลักฐานที่ตรวจด้วยตารอบนี้:**

| ข้อ | ผล | ตำแหน่ง |
|---|---|---|
| events.author_id | **NOT NULL โดย schema** — ทุก event มี author เชิงโครงสร้าง; เขียนจาก `auth.uid()` ณ insert; live read = **0** (admin นับ author_id เป็นสถิติ — ไม่ใช่ attribution); display "บันทึกโดย" มีเฉพาะ orphan | `init:56` · `pets/[id]:101` · `admin/dashboard:100` · `JourneyFeedCard:122`, `PassportView:486` |
| litters.created_by | เขียนจริงตอนสร้างครอก + มี index; **read = 0** (หน้า litters ไม่แสดง) | `litters migration:19,26` · `birth:161` |
| qr_tokens.used_by | เขียน (`adopt:137`) **และถูกใช้ตัดสิน business จริง**: ตรวจว่าผู้ consume = ผู้รับ token (`adopt:152` `verifyToken.used_by !== user.id`) | ✅ **actor-provenance ที่มีชีวิตจุดเดียวของระบบ** |
| Source ของค่าวันที่ | ไม่มีจุดใดจำ "มาจากครอก / กรอกเอง / จากหลักฐาน" — override latent (Door 2), event claim ไม่มีที่เก็บ, ไม่มี source_type/source_ref | FACT (การไม่มี) |
| Requirement ระดับ source | "ผู้บันทึก" อยู่ในลิสต์ข้อมูล litter (`HANDOFF:1201`); "Verified Evidence" เป็นขั้นปลายของ Passport (`:1245`, `:1354`) — เอ่ยชื่อ concept แต่ไม่นิยาม mechanism | FACT (ภาษา) / mechanism ❌ |
| Chain: claim → fact | พบแบบแผนสมบูรณ์ **1 จุด**: QR adoption — token (claim เชิงเชิญ) → used_by + used_at (พิสูจน์ด้วย action + ร่องรอย + ตรวจสิทธิ์) | ✅ FACT (1 จุด) |

**คำตอบต่อกระดาน:**

| ระดับ | สิ่งที่พิสูจน์ | สถานะ |
|---|---|---|
| Actor — เขียน | author_id (NOT NULL ทุก event) / created_by (litters) / used_by (tokens) ถูกเก็บ ณ insert | ✅ FACT |
| Actor — อ่าน/ใช้จริง | มีชีวิตเฉพาะ used_by (ตรวจสิทธิ์การรับ) — attribution (แสดง "ใครบอก") **ไม่มี live consumer** | FACT |
| Source — ที่มาของค่า | ระบบไม่จำแหล่งที่มาของ**วันที่**ได้เลยทั้งระบบ | ❌ NOT EVIDENCED |
| Chain — claim→fact | มีตัวอย่างอ้างอิงได้ 1 จุด (QR) — เป็น business transition ที่มีร่องรอย | ✅ FACT (1 จุด) |

**ข้อสรุป Door 3 (PARTIAL):**
> **"ใครบอก"** — ระบบเก็บ actor ไว้ในโครงสร้างทุก entity หลัก (แม้แต่บังคับ NOT NULL) แต่ provenance แบบ attribution ไม่มีชีวิต — มีชีวิตเมื่อ actor ถูกใช้**ตัดสิน** (QR) ไม่ใช่เมื่อถูกแสดง · **"มาจากไหน"** — ยังไม่มี evidence ว่าระบบจำแหล่งที่มาของค่าวันที่ได้; requirement เอ่ยชื่อ ("ผู้บันทึก", "Verified Evidence") แต่ไม่มี mechanism · ดังนั้น Human Claim วันนี้พิสูจน์ได้แค่ **"ค่าที่มนุษย์ป้อน (มี author ติดมาโดยโครงสร้าง)"** — ส่วน "ต้องรักษา provenance ของผู้ให้ claim" = **ยังไม่ถูกพิสูจน์** (มีแบบแผนอ้างอิง 1 จุด: QR)

### 3.3d คำตัดสิน Door 3 — PARTIAL / CLOSED (2026-09-23)

| คำถาม | ผล |
|---|---|
| ระบบรู้ว่าใครเป็น actor เชิงโครงสร้าง | ✅ FACT |
| Actor attribution มีชีวิตใน Life Journey | ❌ |
| ระบบรู้ว่า date claim มาจาก source ใด | ❌ |
| ต้องรักษา provenance ของ Human Claim | ❌ NOT PROVEN |
| มี reference pattern | ✅ QR adoption |
| Provenance มี semantic เพียงเพราะถูกแสดง | ❌ |

**หลักที่กระดานเก็บ:** *การมี actor อยู่ในข้อมูล ≠ การมี provenance ที่มีชีวิต* · *Provenance จะมีน้ำหนักทาง Domain เมื่อมันถูกใช้ร่วมกับกฎหรือการตัดสินใจ ไม่ใช่เพียงเพราะมี column เก็บ actor* — และ: **ยังไม่สร้าง provenance mechanism**

### 3.3e Q3.3 Door 1 — CLAIM vs FACT ("ระบบรู้จักคำว่า Fact จาก behavior จริงตรงไหน?")

**Reference case: QR adoption — chain ครบที่ตรวจด้วยตาทุกขั้น:**

| ขั้น | หลักฐาน | ตำแหน่ง |
|---|---|---|
| Claim | sender สร้าง token (ข้อเชิญชวน) | `QRGenerator` flow |
| User Action | receiver login + กด adopt | `adopt/[token]:110-117` |
| Validation / Business Rule | **API route เดียวของทั้งระบบ** — 4 ชั้น: token มีตัวตน/ไม่ถูกใช้/ไม่หมดอายุ → context รู้จัก → permission matrix → condition (self-adoption guard) + client guard sender≠receiver + **optimistic lock** `.eq('is_used', false)` + **re-verify หลังเขียน** (`used_by !== user.id` → reject) | `validate/route.ts:120-209` · `adopt:114,123-154` |
| Persistence | is_used / used_by / used_at | `adopt:123-129` |
| System Acceptance | **world state เปลี่ยนจริง**: `pets.home_id` ถูกย้ายไปบ้านใหม่ | `adopt:181-186` |
| Reader / Decision | TokenList แสดงสถานะ; validate ปฏิเสธการใช้ซ้ำ | `TokenList:200-202` · `validate:146-154` |

**การเปรียบเทียบ flow อื่น:** birth wizard / journey events / PetForm — insert ตรง ๆ **ไม่มีชั้น validation, ไม่มี acceptance, ไม่มี status** ใด — claims ถูกเก็บเรียบ ๆ แยกไม่ออกจาก "ข้อเท็จจริงที่ระบบยอมรับแล้ว" (FACT)

**คำตอบต่อกระดาน:**

| คำถาม | ผล |
|---|---|
| ระบบมี validation/business rule? | ✅ FACT — **จุดเดียว**: QR (4 layers + lock + re-verify) |
| Acceptance ทิ้งร่องรอย? | ✅ FACT — is_used/used_by/used_at + re-verify |
| Acceptance เปลี่ยน world state? | ✅ FACT — การย้ายบ้านของ pet |
| Flow อื่นมีโครงสร้าง acceptance? | ❌ FACT — ไม่มีเลย |
| มี concept "สถานะ verified/fact" บนข้อมูล? | ❌ FACT — ไม่มี field ใด; requirement เอ่ย "Verified" เฉพาะ roadmap ("Uploaded → Digitized → **Verified**" `HANDOFF:1348`, "+ Verified Evidence" `:1245`) — เจตนาอนาคต ไม่ใช่ mechanism |
| QR consume พิสูจน์ความจริงของ**เนื้อหา**ที่ claim? | ❌ ไม่ — พิสูจน์เฉพาะ "action ถูกยอมรับตามกฎ" (ข้อระวังของกระดานได้รับการยืนยัน) |

**ข้อสรุป Door 1 (PARTIAL):**
> "Fact" ใน Meow World ปัจจุบัน **มีตัวตนจริงใน 1 workflow** และความหมายที่นั่นคือ **"action ที่ถูกยอมรับผ่านกฎ + มีร่องรอย + เปลี่ยน world state"** — **ไม่ใช่** "claim ที่ถูกตรวจว่าจริง" · นอกจากนั้น ระบบทั้งหมด**ไม่รู้จักคำว่า Fact** — ค่าจากมนุษย์ทุกชนิดถูกเก็บแบนเสมอ แยก claim กับ accepted-fact ไม่ได้ · ดังนั้น **ห้าม generalize QR → Human Claim → Fact** (ตามข้อระวังของกระดาน): QR พิสูจน์เฉพาะ acceptance-of-action ไม่ใช่ truth-of-content · คำถามว่า Life Journey claim จำเป็นต้องมีสถานะ verification หรือไม่ = **NOT EVIDENCED** (requirement พูดถึง Verified เฉพาะ Passport/Evidence roadmap ไม่ใช่ Journey)

> ข้อสังเกตสถาปัตยกรรม (ไม่ใช่ข้อเสนอ): "Fact" ที่มีอยู่จริงเป็น **state transition + guard** ไม่ใช่ **status field บน claim** — สองอย่างนี้ต่างกันเชิง architecture และการตัดสินใจว่า Journey ต้องการแบบใด (หรือไม่ต้องการเลย) เป็นของกระดาน

### 3.3f คำตัดสิน Door 1 — PARTIAL / CLOSED (2026-09-23)

- QR chain ยอมรับได้: Claim/Request → Validation → Permission → Guard → **Accepted Action** → **World State Changed** → **Audit evidence**
- **"Fact" ใน workflow นี้ = ระบบยอมรับว่า Action เกิดขึ้นตามกฎ + ผลเกิดขึ้นจริงใน world state — ไม่ใช่ "พิสูจน์ว่าเนื้อหาที่มนุษย์บอกเป็นความจริง"** (แยก Fact ออกจาก Truth ได้จาก evidence)
- Journey ปัจจุบัน: Human Input → INSERT → Stored Data — **ไม่มี validation/acceptance/verification/status** → ยังไม่มีหลักฐานว่า Journey มี Claim→Fact transition
- **ห้ามย้าย architecture จาก QR ไป Journey** (เช่น event + status=fact) — การย้าย workflow หนึ่งไปใส่อีก workflow หนึ่งโดยไม่มี evidence = ห้าม (ตัดสินแล้ว)

| Concept | สิ่งที่ Evidence บอก ณ จุดนี้ |
|---|---|
| Claim | Human ป้อนข้อมูลได้ |
| Fact | mechanism จริงเฉพาะ QR acceptance |
| Provisional | workflow "แก้ภายหลัง" มี แต่ไม่มี data semantic |
| Provenance | actor เชิงโครงสร้างมี มีชีวิตเมื่อถูกใช้โดย rule |
| Truth | ยังไม่พิสูจน์ว่าเป็น concept ของ Journey |

### 3.3g Q3.3 Door 4 — CONFIDENCE ("ระบบต้องรู้ความมั่นใจของผู้ใช้แยกจากข้อมูลหรือไม่?" — trace User uncertainty → Input/UI → Data → Reader → Requirement)

**หลักฐานที่ตรวจรอบนี้ (grep ครบทั้ง src + docs):**

| ขั้น | ผล | หลักฐาน |
|---|---|---|
| Input/UI ถามความมั่นใจ? | ❌ — grep `confidence/แน่ใจ/มั่นใจ/แน่นอน` ทั้ง src = **0** (ยกเว้น mockData) | grep |
| Data เก็บ confidence? | ❌ — ไม่มี column ใด; ไม่มี "~"/"ราว" ใน display เลย (grep `ราว` เจอเฉพาะ "เรื่องราว") | grep |
| Reader ใช้? | ❌ | grep |
| Requirement เอ่ย? | เพียง **1 ประโยค**: "สายพันธุ์ที่คาดหมาย" (`HANDOFF:1201`) — ข้อมูลที่ requirement **ติดป้ายความไม่แน่ใจไว้** แต่ไม่มีใน schema/UI แม้แต่ column (grep `expected_breed/สายพันธุ์ที่คาดหมาย` ใน src+supabase = **0**) | FACT (ภาษา) + latent (การไม่มี) |
| สิ่งที่ใกล้ที่สุดที่มีอยู่จริง | "ไม่ทราบ" ของ gender (`birth:453`, `PetForm:103`) — แต่เป็น **unknown-as-value** (ค่าพิเศษแทนที่) ไม่ใช่ **confidence-as-metadata** (แกนแยกจากค่า) | FACT |
| ของที่เคยคิดว่าใช่ | Provisional (Door 2: workflow ≠ confidence) · editable (≠ confidence) — ปิดไปแล้ว | §3.3b |

**ข้อสรุป Door 4 (NOT EVIDENCED):**
> ทุกลิงก์ของ chain ว่าง: ไม่ถาม · ไม่เก็บ · ไม่แสดง · ไม่ใช้ · requirement มีเพียงชื่อ concept ("สายพันธุ์ที่คาดหมาย") ที่แม้กระทั่งไม่ถูก implement — และข้อสังเกตสำคัญ: domain เลือกจัดการความไม่แน่ใจด้วยวิธีอื่นแล้ว = **ค่าพิเศษบน field เอง** ("ไม่ทราบ" ของ gender) ไม่ใช่แกน metadata แยก → **Confidence Layer = ไม่มีเหตุผลจาก evidence เช่นเดียวกับ Provisional** — ข้อเสนอ: ไม่สร้าง (รอคำตัดสินกระดาน)

> ข้อสังเกตส่งต่อ Door 5: ถ้าแม้ "สายพันธุ์ที่คาดหมาย" — requirement ที่ติดป้าย uncertainty ชัดที่สุด — ไม่เคยมีชีวิตใน schema เลย มีน้ำหนักว่า requirement ภาษาเดียวไม่พอตั้ง concept ในระบบนี้ (สอดคล้องหลัก §3.3b)

### 3.3h คำตัดสิน Door 4 — NOT EVIDENCED / CLOSED (2026-09-23)

- ทุกลิงก์ว่าง: ไม่ถาม · ไม่เก็บ · ไม่แสดง · ไม่ใช้ — requirement มีเพียงชื่อ concept ("สายพันธุ์ที่คาดหมาย") ที่แม้ไม่ถูก implement
- **ไม่สร้าง Confidence Layer** — เหตุผลจาก evidence เช่นเดียวกับ Provisional
- บันทึกเพิ่ม: domain เลือกจัดการความไม่แน่ใจด้วย **ค่าพิเศษบน field** ("ไม่ทราบ" ของ gender) ไม่ใช่แกน metadata แยก
- "สายพันธุ์ที่คาดหมาย" = ตัวอย่างว่า *Requirement language บอกความคิดได้ แต่ไม่พอพิสูจน์ว่า Domain Concept มีชีวิต จนกว่าจะพบ behavior ที่ตรวจสอบได้*

### 3.3i Q3.3 Door 5 — TRUTHFULNESS OVER TIME (เมื่อ Human Claim ถูกแก้ ระบบรักษาอะไร / ทำอะไรหาย?)

**Chain ตรวจครบทุกขั้นด้วยตา:**

| ขั้น | ผล | หลักฐาน |
|---|---|---|
| 1. Initial value | ค่าแรกถูกเก็บเป็น cell เดียวใน row — ไม่มี "ครั้งแรก" แยกจาก "ปัจจุบัน" | `init:43` เก็บค่าเดียว |
| 2. Edit | **UPDATE ตรง** (`birth_date`, ชื่อ, ฯลฯ) — ค่าเก่าถูกเขียนทับทันที | `pets/[id]/edit:47-49` |
| 3. History | **ไม่มี**: 13 migrations ไม่มี table/audit/log/version ใด (grep `history\|audit\|_log\|version` = 0); events DELETE = **hard delete** (`pets/[id]:119-123`) — ค่าถูกทำลายจริง ไม่มี soft-delete | grep + `:119` |
| 4. updated_at | ยืนยันในบริบทนี้: ตอบได้เฉพาะ "**เมื่อไหร่** record ถูกแก้" — **ไม่ตอบ** อะไรถูกแก้ / จากอะไร→เป็นอะไร / ใครแก้ / ทำไม (ไม่มี consumer/record อื่นรองรับ — read=0 ใน domain) | `migration:9-32` + §3.3a |
| 5. Product Meaning | "Data Should Tell the Story — ข้อมูลสะท้อน**ประวัติ**และพฤติกรรมจริง" (`HANDOFF:57`) — ต้องอ่านละเอียด: "ประวัติ" ที่ว่าคือ **ประวัติชีวิตของสัตว์เลี้ยงที่ถูกบันทึกเป็น event ใหม่** ไม่ใช่ **ประวัติการแก้ไขข้อมูล** — evidence ของแกนหลัง = ไม่มี; นอกนั้น requirement พูดถึงการเติมภายหลังล้วน (`:1211,1217,1223`) | FACT (ภาษา) / ตีความ = INFERENCE |

**ข้อสรุป Door 5:**
> **Current-value-only = FACT** — ระบบรักษาเฉพาะ "ค่าปัจจุบัน + เวลาแก้ล่าสุด" · **History = NOT EVIDENCED** — ไม่มี table/audit/log, DELETE ทำลายจริง, ไม่มี requirement ใดต้องการจำ "สิ่งที่เคยเชื่อ" · และเช่นเคย: **ชื่อประตูไม่ใช่ requirement** — "Truthfulness over Time" ที่แท้จริงของระบบนี้ถูกทำสำเร็จโดย **เก็บแต่ละช่วงเวลาเป็น event ใหม่** (Life Journey เองคือกลไก history ที่ domain เลือก) ไม่ใช่โดยการเก็บ version ของ field

> หมายเหตุ: "ประวัติ" ใน `HANDOFF:57` ถูกตีความเป็นประวัติชีวิต-ผ่าน-event — INFERENCE ที่ต้องชั่งในการชั่งน้ำหนักตอนจบ Q3.3

### 3.3j คำตัดสิน Door 5 — CLOSED (2026-09-23)

- Current-value-only = **FACT** · History = **NOT EVIDENCED**
- **Life Journey มี History คนละชนิดอยู่แล้ว**: เก็บ "ประวัติของชีวิต" ด้วยการสร้าง Event ใหม่ (A → B → C ตามเวลา) = domain history — ไม่ใช่ data version history (birth_date v1→v2→v3) ซึ่งไม่มีหลักฐาน
- ห้ามใช้ "ไม่มี History table" สรุปว่า Life Journey ไม่มี History

---

## 7. Final Evidence Synthesis — Time Model ที่เล็กที่สุดเท่าที่ Evidence บังคับ (2026-09-23)

> คำถามเดียวของรอบนี้: *"Time Model ที่เล็กที่สุดเท่าที่ Evidence ทั้งหมดบังคับให้เราต้องมี คืออะไร?"* — ไม่ใช่ที่สวยที่สุด ไม่ใช่ที่เผื่ออนาคตมากที่สุด ไม่ใช่ที่เคยคิดไว้ตั้งแต่แรก

### 7.1 กองหลักฐานบนโต๊ะ (ทุกชิ้นตรวจด้วยตาระหว่าง Q1→Q3)

| กลุ่ม | หลักฐาน | สถานะ |
|---|---|---|
| **เวลาที่มีตัวตนใน data** | `created_at` (ทุกตาราง, DB default, client ไม่แตะ) · `birth_date` pets/litters (DATE, human-provided, NULL ได้) · `used_at`+`used_by` (QR, มีชีวิตผ่าน business rule) | FACT |
| **เวลาที่ถูก claim แต่ไม่มีที่ไป** | `event_date` ของ Journey (ฟอร์มบังคับ → ทิ้งที่ payload → 0 live reader) | FACT |
| **latent** | `observed_at` · `birth_date_override` · `birth_time` — declared, never populated/read | FACT |
| **สิ่งที่ไม่มีทั้งระบบ** | month/year/approximate · provisional-status · confidence · source-of-value · history/version · status-field บน claim | FACT (การไม่มี) |
| **พฤติกรรมทั้งหมด** | ordering = created_at ล้วน (12 จุด) · อายุ = derived display จาก birth_date เท่านั้น (3 ฉบับ 2 พฤติกรรม) · Journey = input→INSERT (ไม่มี validation/status) · QR = chain acceptance เดียว (4 layers + lock + world-state change) | FACT |
| **ภาษา requirement** | progressive philosophy (Complete It Over Time / เบื้องต้น→แก้ภายหลัง / ข้าม→บันทึกก่อน→เติมภายหลัง) = workflow ระดับลำดับงาน ไม่ใช่ data-status · "ประวัติ" = ประวัติชีวิตผ่าน event | FACT (ภาษา) / ตีความ = INFERENCE |
| **provenance** | actor ถูกเก็บเชิงโครงสร้าง (author_id NOT NULL / created_by) แต่ attribution ไม่มีชีวิต — มีชีวิตเมื่อถูกใช้ตัดสิน (QR) | FACT |

### 7.2 สิ่งที่ Evidence **บังคับ** และ **ไม่บังคับ**

**บังคับ (ต้องมีใน model เพื่ออธิบายระบบจริง):**
1. **สอง semantics ที่มีชีวิต**: *Recorded time* (ระบบ, exact, ครอบ ordering+display ทั้งหมดวันนี้) และ *Human-provided event time* (มนุษย์, exact-หรือ-NULL, persisted เฉพาะ birth family — ส่วน Journey claim ยังไม่ถึง data)
2. **ช่องว่างหนึ่งจุดที่พิสูจน์แล้ว**: Journey event claim ไม่มี persistence destination (Q2 §2.2c + Q3.1) และไทม์ไลน์แสดง recorded แทนวันเหตุการณ์ (semantic confusion จุดเดียว)
3. **Unknown เป็น state เดียวที่ไม่ใช่ exact** ที่มีอยู่จริง (NULL + "ไม่ทราบ" ของ gender เป็นแบบแผน unknown-as-value)
4. **QR = reference pattern** ของ acceptance (state transition + guard — ไม่ใช่ status field)

**ไม่บังคับ (เคยเสนอแล้วถูก evidence ตัด):** 3-layer model (observed ถูกถอด §2.2d, occurred = candidate meaning ไม่ใช่ชั้น) · precision ladder 5 ขั้น (§1.2 ถอน) · Provisional/Confidence Layer (NOT EVIDENCED) · provenance mechanism (NOT PROVEN) · history/versioning (NOT EVIDENCED) · status-field บน claim (ห้ามย้ายจาก QR §3.3f)

### 7.3 Time Model ที่เล็กที่สุด (คำตอบของรอบนี้ — รอกระดานชั่ง)

```
                Meow World — เวลาในระบบจริง

  มนุษย์ให้ค่า                ระบบจับค่า
  ─────────────────────       ─────────────────────
  HUMAN-PROVIDED TIME         RECORDED TIME
  (exact หรือ NULL)           (exact เสมอ)
       │                            │
       ├─ birth family:             ├─ created_at ทุกตาราง
       │   ✅ persisted             ├─ ครอบ ordering ทั้งหมด
       │   ✅ อ่านจริง (อายุ/แสดง)   └─ ถูกแสดงเป็น "วันที่เหตุ
       │                                การณ์" ของ Journey (ผิด
       ├─ journey event:                ความหมายที่พิสูจน์แล้ว)
       │   ⚠️ claim ไม่ถึง data        
       │   (ช่องว่างที่พิสูจน์แล้ว)      
       └─ used_at (QR):                
           ✅ มีชีวิตผ่าน rule          

  latent (ไม่นับเป็น model): observed_at · birth_date_override · birth_time
```

**ขนาดของ model:** 2 semantics · 1 ช่องว่างที่พิสูจน์ · 1 reference pattern · 0 concepts ที่ต้องสร้างเพิ่มวันนี้

### 7.4 คำตอบต่อ hypothesis ของกระดาน

> *"Time Model ของ Meow World อาจเล็กกว่าที่เราคิดไว้มาก"* — **รับเป็นข้อสรุปที่ evidence รองรับ**: จากแนวคิดตั้งต้น (3 layers + บันได 5 precision + provisional/confidence/provenance/status ≈ 8 concepts) เหลือสิ่งที่ evidence บังคับจริง **2 semantics** — และที่เหลือไม่ได้ถูกปฏิเสธเพราะ "ไม่ดี" แต่เพราะ **ไม่มี behavior ที่ตรวจสอบได้รองรับ** ตามหลัก §3.3b

### 7.5 สิ่งที่ model นี้**ยังไม่ตัดสิน** (ส่งต่อ implement round — ห้ามตัดสินเดี๋ยวนี้)

- ❌ ชื่อ column/type ของที่เก็บ Journey claim ("occurred_at" ยังไม่ถูกใช้)
- ❌ สถาปัตยกรรมของที่เก็บ: attribute เดี่ยวบน event (Hypothesis B — แข็งแรงกว่า ณ ตอนนี้) vs Time Layer กลาง (A) — Q3.2 ยังไม่ตัดสิน
- ❌ จะแก้ช่องว่าง / แก้ semantic confusion ของ timeline เมื่อไร อย่างไร
- ❌ precision ที่จะเปิดใน UI (month/year/approx ยัง NOT EVIDENCED — เปิดเมื่อมี use case จริง)
- ❌ จะนำ QR pattern ไปใช้ที่ใด (ถ้ามี)
- ❌ รวม calculateAge 3 ฉบับ (เงื่อนไขเบื้องต้นของ implement round)

> หมายเหตุ extension: Human-provided time คือจุดต่อยอดธรรมชาติ ถ้าวันหน้า evidence โผล่ (month/year/approx/evidence-link) — model นี้ไม่ปิดประตูนั้น แต่ก็ไม่สร้างล่วงหน้า (Build Small — Design for Extension)

### เดินตาม funnel ก่อนจัดชั้น (MIGRATE = ปลายทาง ไม่ใช่จุดตั้งต้น)

```
ข้อมูลที่มีอยู่        birth_date(+time) · observed_at(ว่าง) · created_at · event_date(UI-only)
                      · override knowledge · media_urls(ว่าง) · used_at pattern
   ↓
ความหมายที่ตรวจพบ    3 ชั้น occurred/observed/recorded · precision ladder ·
                      unknown เป็น first-class · UI-บังคับ ≠ domain (§0.1–0.2)
   ↓
ผู้ใช้ต้องเห็นอะไร    วันที่ที่ตน assert ไม่ถูกทิ้ง · อายุที่ซื่อสัตย์กับ precision ·
                      "ไม่ทราบ" ที่ถูกเคารพ · ป้าย "บันทึกเมื่อ" แยกจาก "เกิดเมื่อ"
   ↓
ระบบต้องรักษาอะไร    สิทธิ์ occurred ของผู้ใช้ · ความไม่แน่นอน (ห้ามกลืนเป็น exact) ·
                      เจ้าของความหมายแยกชั้น · provenance ของการ override
   ↓
วิธีที่เล็กที่สุด      จัดชั้นตาม "กำลังที่ระบบมีอยู่แล้ว" ของแต่ละเป้าหมาย ⬇️
```

### EXPOSE (column มีอยู่ แค่ไม่มีใครใช้)
| รายการ | เหตุผลเชิงหลักฐาน |
|---|---|
| `pets.observed_at` | คอลัมน์พร้อม (litters migration:55) — นิยามตาม Q2 §2.2, เขียนจาก birth wizard ("ตอนกรอกเรารู้แล้ว") + แสดงใน ProgressivePassport หมวด identity |

### MAP (เปลี่ยนการอ่าน/การตีความ ไม่แตะ DB)
| รายการ | เหตุผล |
|---|---|
| `created_at` → ชื่อ "recorded" ใน UI/เอกสาร | timeline `pets/[id]:281` เลิกแสดง created_at เป็น "วันที่เหตุการณ์" เมื่อ occurred มีตัวตน; litters "สร้างเมื่อ" เป็นแบบอย่างที่ทำถูกอยู่แล้ว |
| Sort litters ด้วย `birth_date` แทน `created_at` | `litters:48` — occurred มีอยู่จริง การเปลี่ยนคืออ่านคอลัมน์อื่น เท่านั้น |
| Unknown จาก NULL → state ที่แสดง | certGenerator แสดง "ไม่ระบุวันเกิด" อยู่แล้ว ขยายเป็น state กลางของ UI ทั้งหมด |

### CONNECT (ความรู้ที่มีอยู่แล้ว หาทางพาไปถึงจุดหมาย)
| รายการ | เหตุผล |
|---|---|
| `birth_date` + `birth_time` | คู่ occurred ของ birth ที่มีอยู่แล้ว — precision ระดับ exact เป็นกรณีเฉพาะของบันไดเดียวกัน |
| Override knowledge ตอน insert | wizard รู้ `birth_date_override` ณ บรรทัด `:181` — ความรู้นี้ต้องถูกพาไปถึง presentation/evidence ก่อนหาย (ถาวรหรือไม่ = ตัดสินตอน implement) |
| `media_urls` | ช่องทาง evidence ที่ว่างอยู่แล้วสำหรับ round ถัดไป |

### FIX (goal ที่มองเห็นจาก UI)
| รายการ | เหตุผล |
|---|---|
| `event_date` ต้องถึงที่ปลอดภัย | ผู้ใช้ assert occurred ระบบต้องเก็บ — แต่ FIX นี้**มีข้อกำหนดเบื้องหลังที่ขัดข้อง** ⬇️ |

### MIGRATE (ผลของ reasoning — ไม่ใช่ assumption)

> **ต้อง migrate: `life_journey_events` ขาดที่เก็บ occurred โดยโครงสร้าง**

ใต้ FIX มีเพียง 2 ทางเลือกเชิงตรรกะ:
1. **ฝัง event_date ลง `content` (TEXT)** — ปฏิเสธ: content เป็น prose blob อยู่แล้ว (birth event รวมวันเกิดเป็น string ตาม audit Conflict #3) การฝังเพิ่มทำให้ occurred **parse ไม่ได้ เรียงไม่ได้ ตรวจสอบไม่ได้** — ละเมิดหลัก structured evidence ของระบบเราเอง
2. **คอลัมน์ใหม่** — เหลือทางเดียวที่ occurred ของ event จะ "มีชีวิต" ได้

เมื่อทาง (1) ถูกปฏิเสธด้วยเหตุผล ทาง (2) จึงเป็น MIGRATE เพียงรายการที่หลีกเลี่ยงไม่ได้ — **ชื่อ column / type / precision ใด** = การตัดสินตอน implement ไม่ใช่ตอนนี้ (ข้อเสนอที่เป็นไปได้: `occurred_at TIMESTAMPTZ NULL` + `date_precision` แยก เพื่อให้ approximate ไม่ถูกกลืนเป็น exact — วางไว้เป็น candidate)

### สิ่งที่ MIGRATE **ไม่**ครอบคลุม (ระวังขยายตัว)
| รายการ | เหตุผลที่ยังไม่ต้อง migrate |
|---|---|
| precision ของ `pets.birth_date` / `litters.birth_date` | DATE ปัจจุบันเก็บ value ได้อยู่แล้ว precision flag เป็น**การเพิ่มความหมาย** — ทำตามหลังการตัดสิน precision จริง (Q1) ตอน implement; ระบุเป็น candidate ไว้ |
| ตาราง evidence / EXIF / upload time | เป็นของ Evidence round — เวลานั้นระบบยังไม่มี pipeline เลย ไม่มีอะไรให้ migrate |
| รวม calculateAge 3 ฉบับเป็นตัวเดียว | code cleanup — แต่**จำเป็นก่อน** precision มาถึง (ทั้ง 3 ต้องเข้าใจ precision แบบเดียวกัน) จึงวางเป็นเงื่อนไขของ implement round |

---

## 4. ภาพรวมต่อเอนทิตี (สถานะหลัง Q2 challenge — แทนฉบับ "หลังรับโมเดล")

| เอนทิตี | human-claimed event time | recorded (system) | หมายเหตุ |
|---|---|---|---|
| pets.birth | `birth_date`(+`birth_time`) — เขียนโดยมนุษย์; provisional ตาม requirement `HANDOFF:1210` | `created_at` | observed_at ถูกถอด (legacy/latent §2.2d); "occurred เป็นชั้นของตัวเอง?" ยังไม่ตัดสิน |
| litters | `birth_date` | `created_at` | — |
| life_journey_events | `event_date` — **มี claim ไม่มีที่เก็บ** (STRONG EVIDENCE §2.2c) | `created_at` (ถูกแสดงแทน claim — ยังไม่แก้) | โครงสร้างปลายทาง = ตัดสินหลัง 3-vs-2 ชั้น |

---

## 5. สิ่งที่รอบนี้ไม่ได้ตัดสิน (ตามข้อตกลง)

- ❌ ไม่ migration / ไม่แก้ code ทุกกรณี
- ❌ ไม่ตั้งชื่อ column / type จริงของ occurred ของ events (เสนอ candidate เท่านั้น)
- ❌ ไม่ตัดสินว่า precision flag เก็บที่ไหน (column คู่ / enum / อื่น)
- ❌ ไม่ตัดสิน override provenance เก็บถาวรหรือไม่
- ✅ ได้: โมเดลเจ้าของความหมาย 3 ชั้น + บันได precision + การแบ่ง EXPOSE/MAP/CONNECT/FIX/MIGRATE ที่ MIGRATE มีเหตุผลเดียวและหลีกเลี่ยงไม่ได้จริง

---

## 6. กระดาน

```
Presentation ✅ → Data Semantics ✅ → Evidence Verification ✅
                                    ↓
                              Time Model
                              ├─ Q1-A Current capability  ✅ FACT (§1.2)
                              ├─ Q1-B Required precision  ✅ PASS with boundary — ตัดสินแล้ว (§1.4)
                              │    Exact=FACT · M/Y/Approx=NOT EVIDENCED → ไม่สร้าง
                              │    Unknown birth=INFERENCE · Provisional=DOMAIN EVIDENCE
                              ├─ Q2 Ownership             ✅ ปิดแล้ว (§2.2b–2.2d)
                              │    RECORDED=FACT · HUMAN-CLAIMED=STRONG EVIDENCE (ไม่ persisted)
                              │    observed_at=ถอดเป็น legacy/latent · 3-layer=NOT DECIDED
                              │    Ordering rule=ไม่รับ (DESIGN CANDIDATE)
                              └─ Q3 การจัดชั้น            ├─ Q3.1 ✅ CLOSED (§3.1b)
                                   ├─ Q3.2 ✅ Scope evidence PASS · Architectural classification ยังไม่ตัดสิน (§3.2)
                                   └─ Q3.3 5 ประตู (§3.3)
                                        ├─ Door 2 Provisional: ✅ PARTIAL / CLOSED (§3.3b)
                                        │    Editability ≠ Provisionality · override = latent
                                        ├─ Door 3 Provenance: ✅ PARTIAL / CLOSED (§3.3d)
                                        │    actor ≠ provenance · ไม่สร้าง provenance mechanism
                                        ├─ Door 1 Claim vs Fact: ✅ PARTIAL / CLOSED (§3.3f)
                                        │    Fact(QR) = accepted-action ≠ Truth · ห้ามย้าย arch ไป Journey
                                        ├─ Door 4 Confidence: ✅ NOT EVIDENCED / CLOSED (§3.3h)
                                        │    ไม่ถาม ไม่เก็บ ไม่แสดง ไม่ใช้ — ไม่สร้าง Confidence Layer
                                        └─ Door 5 Truthfulness: ✅ CLOSED (§3.3j)
                                             current-value=FACT · domain-history=มีผ่าน Event
                                             · data-version-history=NOT EVIDENCED
                              ↓
                    FINAL SYNTHESIS (§7): Model ที่เล็กที่สุด =
                    2 semantics (Human-provided / Recorded) + 1 ช่องว่างที่พิสูจน์
                    + 1 reference pattern (QR) — ✅ ACCEPTED (Final Evidence Gate)
                                    ↓
                                Evidence   (media_urls ว่างอยู่แล้ว · source_type/source_ref ·
                                            human-claimed time ต้องผูกกับ "จากไหน" ก่อน users ยืนยัน)
                                    ↓
                            Functional Tests
```

คำถามที่ Evidence round ต้องตอบ (ส่งต่อจาก Time Model — อัปเดตตามโมเดลหลัง challenge):
1. Evidence ครอบ human-claimed event time อย่างไร — "จากความจำ" vs "จากรูป" vs "จากเอกสาร" ต่างกันที่ชั้นไหน
2. `media_urls` กลายเป็นที่อยู่ของ evidence หรือมีชั้นกลาง (source_type/source_ref) — reconcile report รอบก่อนเสนอชั้นบางไว้แล้ว
3. User Confirmation flow: จุดที่ "ผู้ใช้ระบุ" กลายเป็น Fact อยู่ตรงไหนของ flow — คำถามนี้จะตัดสินว่า claim ต้องถูกยกระดับเป็น truth หรือคงสถานะ claim ตลอดชีวิตของ record

---

## 8. Final Evidence Gate — ปิดอย่างเป็นทางการ (2026-09-23)

| รายการ | สถานะ |
|---|---|
| Q1 Current Capability / Required Precision | ✅ CLOSED |
| Q2 Semantic Ownership | ✅ CLOSED |
| Q3 Event Date / Scope / Five Doors | ✅ CLOSED |
| §7 Final Evidence Synthesis | ✅ ACCEPTED |
| Time Model | ✅ Evidence-backed candidate accepted (§7.3) |
| Migration / Column naming / Architecture A vs B | ⏸️ NOT DECIDED |
| Implementation | ⏸️ ยังไม่เริ่มจาก Time Model |

**ประโยคปิด:** Meow World มี Time Model ที่**เล็กที่สุดเท่าที่ Evidence ปัจจุบันรองรับ** — สิ่งที่ถูกตัดออกไม่ได้แปลว่า "ไม่ดี" แต่แปลว่า "วันนี้ยังไม่มีหลักฐานเพียงพอที่จะสร้างมัน" — HUMAN-PROVIDED TIME คือ extension point เมื่อ evidence ใหม่มาถึง (เช่น การเจอหลักฐานวันเกิดจริงหลังบันทึกไปแล้ว) model จะถูกถามใหม่ว่าต้องเติบโตหรือไม่ — สร้างบ้านหลังแรกให้น้องโดยไม่สร้างห้องที่ยังไม่มีเหตุผลว่าต้องมี 🏠🐈

---

*ตรวจโดย GLM — Time Model round: reasoning-based, no code changes, no migrations — Final Evidence Synthesis ACCEPTED*
