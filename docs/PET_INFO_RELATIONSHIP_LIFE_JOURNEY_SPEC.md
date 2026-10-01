# 🐈 Meow World — Pet Info & Relationship System Specification

**Status:** Design / Domain Contract  
**Target:** Prototype V.1  
**Current implementation:** Not authorized by this document

## 1. Purpose

Pet Info เป็นศูนย์กลางข้อมูลและความสัมพันธ์ของสัตว์เลี้ยงแต่ละตัวภายใน Meow World

Core definition:
> **Pet Info = Identity + Records + Relationships + Journey Access**

Pet Info เชื่อมระหว่าง:
- Meow Info — Identity / Basic Information
- Meow Passport — Health / Documents / Important Records
- Family & Relation — People / Pets / Relationships
- Life Journey — Events involving this Pet

Pet Info ไม่ควรเป็นเพียงหน้า Profile แต่เป็น Domain Hub ที่ Feature อื่นสามารถอ้างอิงข้อมูลร่วมกันได้

## 2. Prototype V.1 Boundary

เอกสารนี้เป็น Design / Domain Contract สำหรับ Prototype V.1 เท่านั้น

Prototype V.0.999 ยังไม่ต้อง Implement Relationship System จากเอกสารนี้ ให้ใช้งานจริงและเก็บ Experience Feedback ก่อน

เมื่อเริ่ม V.1:

1. Reconcile กับ Implementation ปัจจุบัน
2. ตรวจ Data / Business Logic / UI ที่มีอยู่
3. กำหนด Minimum Domain Change
4. ทำ Vertical Slice ที่เล็กที่สุด
5. เก็บ Evidence

**เอกสารนี้ไม่ใช่คำสั่งให้สร้างระบบทั้งหมดทันที**

## 3. Pet Info Structure

```
Pet Info
├── Meow Info
├── Meow Passport
├── Family & Relation
└── Life Journey
```

### Meow Info
ข้อมูลระบุตัวตน เช่น Name, Pet ID, Species, Breed, Sex, Color, Birth information และ Current Status

### Meow Passport
ข้อมูลสำคัญ เช่น Vaccination, Medical Records, Veterinary Documents และ Identification Documents

Passport เป็น Living Document ที่ค่อย ๆ เติบโตไปพร้อมกับชีวิตของน้อง ไม่ใช่ Form ที่ต้องกรอกให้ครบในครั้งเดียว

### Family & Relation
ข้อมูลความสัมพันธ์ระหว่าง Pet, Person และ Entity ที่เกี่ยวข้อง เช่น Owner, Caregiver, Family Member, Sibling, Parent, Child, Companion และ Lives With

Relationship ต้องเป็น Domain Data ไม่ใช่ข้อมูลที่สร้างขึ้นเฉพาะเพื่อแสดง UI

### Life Journey
พื้นที่สำหรับเหตุการณ์ เรื่องราว และความทรงจำของ Pet โดย Pet Info ควรเป็น filtered view ของ Events ที่ Pet มีส่วนเกี่ยวข้อง ไม่ใช่สำเนา Event

## 4. Relationship Model

หนึ่ง Pet สามารถมี Relationship กับหลาย Entity และ Relationship ต้องมี Type ที่ชัดเจน

ตัวอย่าง:

```
Person A ── caregiver ──> Pet A
Pet A    ── sibling ─────> Pet B
Pet A    ── lives_with ──> Person B
```

Relationship ควรรองรับ Source Entity, Target Entity, Relationship Type และ Metadata ตาม Domain requirement

Relationship Type ต้องสามารถขยายได้โดยไม่ทำลายข้อมูลเดิม

## 5. Life Journey Event Relationship

หนึ่ง Life Journey Event ต้องรองรับ Participant ได้หลายคนและหลาย Pet

ตัวอย่าง: เหตุการณ์ "วันนี้พามูมู่ไปหาหมอ" อาจมี MooMoo, User และ Family Member เป็น Participants

**หนึ่ง Event ต้องเป็น Event เดียว แม้จะมีหลาย Participant**

ห้ามสร้าง Event ซ้ำเพียงเพราะมีหลาย Pet หรือหลาย Person

เมื่อเปิด Pet Info ของ Pet A ให้แสดง Events ที่ Pet A มีส่วนเกี่ยวข้อง

เมื่อเปิด Life Journey ของ Home ให้แสดง Event เดียวกันพร้อม Participants ที่เกี่ยวข้อง

## 6. One Real Event → Multiple Contexts

เหตุการณ์จริงหนึ่งเหตุการณ์อาจขับเคลื่อนหลาย Context พร้อมกัน

```
ONE REAL EVENT
   ├── Pet Status
   ├── Life Journey
   └── Community
```

### Missing Pet Example

ผู้ใช้สามารถ:
1. เข้า Pet Info
2. เลือก แจ้งสัตว์เลี้ยงหาย
3. Upload missing-pet poster
4. เปลี่ยน Pet Status เป็น Missing
5. เลือกว่าจะสร้าง Life Journey Event
6. เลือกว่าจะเผยแพร่ไปยัง Meow Community

เมื่อพบ Pet แล้วเปลี่ยน Missing → Found / Home แต่ Historical Event เรื่องการหายยังคงอยู่

**Current State เปลี่ยนได้ แต่ History ไม่ควรถูกลบเพียงเพราะ State เปลี่ยน**

## 7. One Source of Truth

ไม่ควรสร้างสำเนา:
- Pet A Journey Copy
- Pet B Journey Copy
- Home Journey Copy
- Community Journey Copy

ควรมี Domain Event เดียว แล้วให้แต่ละ Feature เป็น View / Context ของข้อมูลต้นทางเดียวกัน

```
Life Journey Event
   ├── Pet A
   ├── Pet B
   ├── Person A
   └── Person B
```

## 8. Data → Life Journey

Feature ต่าง ๆ สามารถเสนอ Life Journey Suggestion จากการกระทำจริงของผู้ใช้ได้ ผู้ใช้ไม่จำเป็นต้องเข้า Life Journey ก่อนเสมอไป

ตัวอย่าง:

```
Update Meow Passport
       ↓
Save successfully
       ↓
Meaningful event detected
       ↓
Generated Story Suggestion
       ↓
Edit / Rewrite / Save / Dismiss
```

ตัวอย่างข้อความ Suggestion:
> วันนี้พามูมู่ไปหาหมอมา โดนฉีดยาไป 2 เข็ม ไม่ร้องสักนิดเดียว มูมู่เก่งมากๆ

Generated Story เป็น **Suggestion ของระบบ ไม่ใช่ User-owned Story** ผู้ใช้เป็นผู้ตัดสินใจว่าจะใช้ แก้ เขียนใหม่ บันทึก หรือ Dismiss

## 9. Life Journey → Data

ความสัมพันธ์เป็น Bidirectional แต่ Story ไม่ควรเปลี่ยน Domain State โดยอัตโนมัติเพียงเพราะระบบอ่านข้อความ

ตัวอย่างที่ปลอดภัย:

```
Life Journey Event
"วันนี้มูมู่กลับบ้านแล้ว"
       ↓
User confirms
       ↓
Pet Status = Found / Home
```

หลักการ:
> **Generated Suggestion ≠ Confirmed Domain Data**

การเปลี่ยน Domain State ต้องผ่าน Explicit User Action หรือ Business Rule ที่กำหนดไว้อย่างชัดเจน

## 10. Current State vs Life History

### Pet Info
ตอบคำถาม: **ตอนนี้น้องเป็นอย่างไร?**

เช่น Current Status, Current Home, Current Relationships และ Current Important Records

### Life Journey
ตอบคำถาม: **น้องกับเราเคยผ่านอะไรมาบ้าง?**

เช่น Birth, Adoption, Medical Events, Missing, Found, Memories, Photos, Stories และ Milestones

> **อยู่กับปัจจุบัน แต่ไม่ทิ้งอดีต**

## 11. Life Journey Event DateTime

ตำแหน่งบน Timeline ต้องอ้างอิงเวลาที่เหตุการณ์เกิดขึ้นจริง ไม่ใช่เวลาที่ Record ถูกสร้าง

- journey_at — เวลาที่เหตุการณ์เกิดขึ้นจริง
- created_at — เวลาที่สร้าง Record
- uploaded_at — เวลาที่ Upload File ถ้ามี

ตัวอย่าง: ถ้า Photo เกิดขึ้นวันที่ 2021-08-15 แต่ผู้ใช้สร้าง Record ในปี 2026 Event ต้องอยู่ตำแหน่งปี 2021

## 12. Photo Metadata as Evidence

เมื่อเพิ่ม Photo เข้า Life Journey:

- Camera Photo → current Date / Time เป็น Initial Suggestion
- Existing Photo → File Metadata / EXIF เป็น Initial Suggestion
- GPS metadata → Place Suggestion เมื่อมีข้อมูล

ผู้ใช้สามารถ Confirm, Edit, Replace หรือ Ignore ได้

หลักการ:
> **File Info = Evidence discovered by the system**  
> **Confirmed Life Journey data = User's source of truth**

User-facing File Info ให้ความสำคัญ:
1. Date
2. Time
3. Place

## 13. Memory Making > Data Entry

Life Journey ไม่ควรบังคับให้ผู้ใช้กรอกทุกอย่างพร้อมกัน

ผู้ใช้สามารถเลือก Photo → ตรวจสอบ Date / Time / Place → เพิ่ม People / Pets / Tags → Save → กลับมาเขียน Story ภายหลัง

ตัวอย่าง Prompt:
- วันนี้มีอะไรอยากเก็บไว้ให้น้องไหม?
- มีอะไรอยากเล่าเกี่ยวกับวันนี้ไหม?
- เขียนเรื่องราว

## 14. View Model

### Home View
Current Home, Current Pets / People, Latest Feed, Memory Overlay และทางเข้า Life Journey

### Pet Info View
Meow Info, Meow Passport, Family & Relation และ Life Journey Events ที่ Pet นี้เกี่ยวข้อง

### Life Journey View
Unified Timeline, Event, Participants, Previous / Next Event, Photos, Story และ Related Pets / People

ผู้ใช้ควรสามารถเดินทาง Home → Pet → Relationship → Life Journey Event → Other Participant → Other Pet / Person ได้โดยไม่ต้องสร้างข้อมูลซ้ำ

## 15. UX Principles

1. **One Real Event → Multiple Contexts**
2. **One Source of Truth**
3. **Data → Story**
4. **Story → Data เมื่อ User ยืนยัน**
5. **Current State ≠ Historical Record**
6. **Preserve everything, reveal selectively**
7. **ลด Information Density ไม่ใช่ลด Data**
8. **Memory Making > Data Entry**
9. **Relationship เป็น Domain Data ไม่ใช่ UI decoration**
10. **ไม่สร้าง Feature ให้เป็นเกาะ**

## 16. Acceptance Criteria for Prototype V.1

- [ ] Pet มี Relationship กับ Person / Pet อื่นได้
- [ ] Relationship มี Type ที่ชัดเจน
- [ ] Relationship เป็น Domain Data ที่ Feature อื่นนำไปใช้ได้
- [ ] Pet Info มี Meow Info
- [ ] Pet Info มี Meow Passport
- [ ] Pet Info มี Family & Relation
- [ ] Pet Info เข้าถึง Life Journey ของ Pet ได้
- [ ] Life Journey Event รองรับหลาย Participants
- [ ] Event เดียวปรากฏในหลาย Context ได้
- [ ] ไม่มี Duplicate Event เพราะมีหลาย Participant
- [ ] Current State เปลี่ยนได้โดยไม่ลบ History
- [ ] Meaningful app action สามารถเสนอ Life Journey Suggestion ได้
- [ ] Generated Story เป็น Suggestion ไม่ใช่ Final User Story
- [ ] User แก้ / Rewrite / Save / Dismiss Suggestion ได้
- [ ] journey_at เป็นตัวกำหนด Timeline position
- [ ] Photo metadata เป็น Evidence / Suggestion ไม่ใช่ Truth โดยอัตโนมัติ
- [ ] User-confirmed data เป็น Source of Truth
- [ ] User ไม่ถูกบังคับให้เขียน Story ทันที
- [ ] ไม่มีการสร้างข้อมูลซ้ำเพียงเพื่อรองรับหลาย View

## 17. Developer Rule

ก่อนเริ่ม Implementation ใน Prototype V.1:

```
READ CONTRACT
    ↓
INSPECT CURRENT IMPLEMENTATION
    ↓
RECONCILE
    ↓
DEFINE MINIMUM DOMAIN CHANGE
    ↓
VERTICAL SLICE
    ↓
EVIDENCE
```

ห้ามตีความเอกสารนี้เป็นคำสั่งให้สร้างทุกอย่างในครั้งเดียว ให้เลือก Vertical Slice ที่เล็กที่สุดซึ่งพิสูจน์ Relationship Model ได้จริง แล้วค่อยขยาย

## 18. Final Concept

```
                 HOME
                   ↓
                PET INFO
                   │
       ┌───────────┼───────────┐
       ↓           ↓           ↓
  Meow Info   Meow Passport  Family &
                             Relation
       └───────────┼───────────┘
                   ↓
              Life Journey
                   ↓
             One Real Event
                   │
       ┌───────────┼───────────┐
       ↓           ↓           ↓
      Pet        Person      Context
```

> **Pet Info เป็นตัวขับเคลื่อน Identity, Records, Relationships และ Journey Access ของน้อง**

> **Life Journey เป็นเรื่องราวที่เชื่อมคน สัตว์เลี้ยง และเหตุการณ์เข้าด้วยกัน**

> **Relationship คือสะพานที่ทำให้ข้อมูลเหล่านี้เชื่อมถึงกันโดยไม่ต้องสร้างข้อมูลซ้ำ**

> **อย่าสร้าง Feature ให้เป็นเกาะ ให้สร้าง Domain Data ที่สามารถเชื่อมโยงและขับเคลื่อน Experience อื่นได้**