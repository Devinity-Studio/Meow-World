# 🐱 Meow World — Team Handoff Document

**Version:** Prototype V0 (ต้นแบบ)
**Last Updated:** 2026-09-01
**Branch:** `qwen-prototype-v0` (main branch สำหรับ development)
**Repository:** https://github.com/BombINdyBoy/Meow-World
**Production URL:** https://meow-world-heart-edition.vercel.app

---

## 📊 สถานะปัจจุบัน (อัพเดท: 1 กันยายน 2026)

```
┌─────────────────────────────────────────────────────────┐
│  Feature Status — 2026-09-01                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Core Features     ████████████████████░░░░  85%       │
│  QR System         ██████████████████░░░░░░  75%       │
│  Home Experience   ████████████████░░░░░░░░  70%       │
│  Production Ready  ██████████████░░░░░░░░░░  65%       │
│  Documentation     ████████████████████████  100%      │
│                                                         │
│  Overall Progress  ████████████████████░░░░  80%       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### สิ่งที่ทำเสร็จล่าสุด (1 กันยายน 2026)

| Feature | Status | Notes |
|---------|--------|-------|
| **Welcome Entry Screen** | ✅ | Storybook-style, interactive house |
| **QR Scanner Modal** | ✅ | html5-qrcode, camera integration |
| **Token Validation API** | ✅ | 4-Layer security model |
| **Client-side Validation** | ✅ | Helper + QR parser |
| **Design Spec Documents** | ✅ | 3 ฉบับ |
| **Production Deploy** | ✅ | Vercel Production |
| **Test Page** | ✅ | API testing tool |
| **Product Vision** | ✅ | Core Philosophy & Design Principles |

---

## 🌟 Core Design Principles

> **"Don't tell them what the world is. Let the world tell its own story."**
> **"ให้ภาพมันเล่าเรื่อง"**

### 10 หลักการออกแบบหลัก

| # | Principle | Description |
|---|-----------|-------------|
| 1 | **Free First** | คุณค่าหลักต้องเข้าถึงได้โดยไม่สร้างกำแพง |
| 2 | **Value Before Revenue** | สร้างคุณค่าให้ผู้ใช้ก่อน รายได้เป็นผลพลอยได้ |
| 3 | **Visual First** | ให้ภาพและบริบทช่วยสื่อสารแทนข้อความ |
| 4 | **Let the World Tell the Story** | "ให้ภาพมันเล่าเรื่อง" |
| 5 | **Data Should Tell the Story** | ข้อมูลสะท้อนประวัติและพฤติกรรมจริง |
| 6 | **Evaluate Privately** | ประเมินภายในโดยไม่เปิดเผยคะแนนดิบ |
| 7 | **Rank Without Shaming** | การจัดอันดับไม่ควรทำให้รู้สึกด้อยกว่า |
| 8 | **Preserve Credit** | ทุก Contribution ควรมีที่มาที่ไป |
| 9 | **Real Life First** | ส่วนต่อขยายของชีวิตจริง ไม่ใช่สิ่งแทนชีวิตจริง |
| 10 | **Memories Have Value** | คุณค่าเพราะวันหนึ่งอยากกลับมาดูอีกครั้ง |

### Visual World Principle

> **"ให้ภาพมันเล่าเรื่อง"**

- ผู้ใช้ควรเข้าใจสถานะจากสิ่งที่มองเห็นได้
- ไม่ต้องใช้ข้อความอธิบายทุกอย่าง
- Progressive Information: แตะเพื่อดูรายละเอียดเพิ่มเติม

### Life Journey = Core Concept

> **Life Journey ไม่ควรเป็นเพียง Data Timeline แต่เป็น Story of a Life**

- 🐣 วันแรก → 🏠 กลับบ้าน → 🧸 ของเล่น → 🏥 พบแพทย์ → 💉 วัคซีน
- ข้อมูลสามารถสร้าง AI Story / Short Video ได้
- Emotional Design: Flashback / Remembrance ไม่ใช่ "ระบบเศร้า"

### Evaluation Philosophy

> **Evaluate Privately. Rank Publicly. Explain Contextually.**

- จำนวนข้อมูล ≠ คุณภาพ
- ความถี่ ≠ ความใส่ใจ
- รูปแบบข้อมูลบน Timeline = Quality Signal

### Metaverse Philosophy

> **Tamagotchi 4.0 with Real Life**

- ไม่ใช่โลกที่ต้องเข้าไปอยู่ตลอดเวลา
- แต่เป็นพื้นที่ที่กลับเข้าไปหาได้เมื่ออยากพบคน/สัตว์/ความทรงจำ

---

## ⚙️ Feature Flag System: ควบคุมการเปิด/ปิดฟีเจอร์

### แนวคิด

> "เปิดใช้งานฟีเจอร์ได้จาก UI โดยไม่ต้อง deploy ใหม่"

### Feature Flags

| Flag | Description | Default |
|---|---|---|
| `home_mode` | Home Mode - หน้าหลัก | ✅ ON |
| `nest_system` | Nest System - รังส่วนตัว | ❌ OFF |
| `decoration` | Decoration - ตกแต่งบ้าน | ❌ OFF |
| `community` | Community - ชุมชน | ❌ OFF |
| `vet_market` | Vet Market - ตลาดสัตวแพทย์ | ❌ OFF |
| `family_package` | Family Package - พื้นที่จัดเก็บ | ❌ OFF |

### วิธีใช้

```sql
-- เปิดฟีเจอร์
UPDATE feature_flags SET is_enabled = true WHERE flag_name = 'nest_system';

-- ปิดฟีเจอร์
UPDATE feature_flags SET is_enabled = false WHERE flag_name = 'community';

-- กำหนดให้ user เฉพาะ
UPDATE feature_flags SET target_users = ARRAY['uuid1', 'uuid2'] 
WHERE flag_name = 'decoration';
```

### แผนภาพ

```
┌─────────────────────────────────────────┐
│  ⚙️ Feature Flags Management            │
│                                         │
│  🏠 Home Mode          [ON ] ✅         │
│  🪺 Nest System        [OFF] ❌         │
│  🎨 Decoration         [OFF] ❌         │
│  🏘️ Community          [OFF] ❌         │
│  🏪 Vet Market         [OFF] ❌         │
│  💾 Family Package     [OFF] ❌         │
│                                         │
│  📊 Rollout: 100% of users              │
│  👥 Target: All users                   │
└─────────────────────────────────────────┘
```

---

## 🐾 Multi-Species Vision: "เลี้ยงร่วมกันภายใต้หลังคาเดียวกัน"

### แนวคิดหลัก

> "Meow World ไม่ได้มีแค่แมว แต่เป็นบ้านสำหรับสัตว์ทุกชนิด"

### หลักการออกแบบ

| หลัก | อธิบาย |
|---|---|
| **ชื่อ "Meow World"** | เป็น brand ไม่ใช่ข้อจำกัด |
| **ทุกสัตว์อยู่ใต้หลังคาเดียวกัน** | เลี้ยงร่วมกันได้ |
| **ฟีเจอร์เท่าเทียม** | สุนัข might have more features than cats! |
| **ไม่แยก species** | ไม่รู้สึกเป็น "บุคลากรชั้น 3" |

### Species Features

| Species | ฟีเจอร์พิเศษ |
|---|---| 
| 🐱 แมว | Passport, Life Journey, Certificate |
| 🐕 สุนัข | + Walk Tracker, Training Log, Vaccination |
| 🐰 กระต่าย | + Housing Setup, Diet Planner |
| 🐦 นก | + Flight Log, Cage Setup |
| 🐹 อื่นๆ | + Custom fields |

### แผนภาพ

```
Meow World
├── 🏠 Home (บ้านหลัก)
│   ├── 🪺 Nest 1 (arthur — 🐱)
│   ├── 🪺 Nest 2 (Lucky — 🐕)
│   ├── 🪺 Nest 3 (มอลต์ — 🐰)
│   └── 🪺 Nest 4 (เจ้าสี — 🐦)
│
├── 📋 Species Features
│   ├── 🐱 Cat Mode
│   ├── 🐕 Dog Mode (+ Walk, Training)
│   ├── 🐰 Rabbit Mode (+ Housing, Diet)
│   └── 🐦 Bird Mode (+ Flight, Cage)
│
└── 💾 Shared Storage (Family Package)
```

---

## 📌 สรุปสำหรับผู้บริหาร (30 วินาที)

Meow World คือ **Living Passport & Life Journey** สำหรับสัตว์เลี้ยง — ไม่ใช่แค่แอพบันทึกข้อมูล แต่เป็น **ที่เก็บความทรงจำ** ที่ออกแบบมาให้ผู้ใช้รู้สึก **ผูกพัน** กับสัตว์เลี้ยงของตัวเอง

**สถานะปัจจุบัน:** Prototype V0 — มี UI ครบ แต่ database layer ยังมี blocker (RLS infinite recursion)

**สิ่งที่ต้องทำต่อ:** Fix RLS → ให้ flow ทำงานได้จริง → ทดสอบกับผู้ใช้จริง → Launch

---

## 🎨 UX Philosophy: Emotional Design

### แนวคิดหลัก

> "Meow World ไม่ใช่แค่แอพ แต่เป็น **ที่เก็บความทรงจำ** ที่ออกแบบมาให้ผู้ใช้รู้สึก **อบอุ่น** และ **ผูกพัน**"

### Emotional Journey ของผู้ใช้

```
┌─────────────────────────────────────────────────────────┐
│  Login: "A QUIET PLACE FOR BIG MEMORIES"                │
│         "Every chapter matters."                         │
│  → สื่อว่า: นี่คือที่เก็บความทรงจำ ไม่ใช่แค่แอพ          │
├─────────────────────────────────────────────────────────┤
│  Empty State: "ยินดีต้อนรับสู่ Meow World"              │
│               "ระบบกำลังเตรียมพื้นที่ส่วนตัวให้คุณ..."    │
│  → สื่อว่า: เริ่มต้น journey ใหม่                        │
├─────────────────────────────────────────────────────────┤
│  Nesting: 📦 "บ้านหลังใหม่พร้อมแล้ว!"                  │
│           "มาต้อนรับสมาชิกขนฟูคนแรกกันเถอะ"              │
│  → สื่อว่า: ความตื่นเต้นในการต้อนรับสัตว์เลี้ยงตัวแรก     │
├─────────────────────────────────────────────────────────┤
│  Living: 🏠 "บ้านของเรา"                                │
│          "2 สมาชิกขนฟู • 5 เรื่องราว"                   │
│  → สื่อว่า: ชีวิตที่เต็มไปด้วยความทรงจำ                  │
└─────────────────────────────────────────────────────────┘
```

### Design System

| Token | Color | สื่อความหมาย |
|---|---|---|
| `--brand-coral` | #E06D53 | อบอุ่น เป็นมิตร |
| `--brand-sage` | #6B8E68 | ธรรมชาติ ผ่อนคลาย |
| `--gold-cert` | #C89933 | หรูหรา มีคุณค่า |
| `--ink-primary` | #1F1E1D | เข้ม ชัดเจน |
| `--bg-warm` | #FAF7F2 | พื้นหลังอบอุ่น |

| Font | ใช้กับ | สื่อความหมาย |
|---|---|---|
| Playfair Display | หัวข้อ | หรูหราวิจิตร |
| Plus Jakarta Sans | เนื้อหา | ทันสมัย อ่านง่าย |
| DM Mono | Code/Eyebrow | เทคโนโลยี แม่นยำ |

### UX Flow

```
User เปิดแอพ
    │
    ▼
Login (_email/password หรือ Google OAuth_)
    │
    ▼
Empty State → สร้างบ้านอัตโนมัติ
    │
    ▼
Nesting State → กด "รับน้องเข้าบ้าน"
    │
    ▼
Pets Page → เพิ่มสัตว์เลี้ยง
    │
    ▼
Pet Detail → เพิ่ม Life Journey Event
    │
    ▼
Living State → เห็น Feed ความทรงจำ
```

---

## 🏠 Home Mode Concept: "บ้านของทุกคน"

### แนวคิดหลัก

```
🐱 MEOW WORLD
      │
      ▼
┌──────────────┐
│  HOME MODE   │  ← ตอนนี้ทำตรงนี้
│  COMPLETE    │
└──────┬───────┘
       │
┌──────▼───────┐
│  LAND / UI   │
│  2 HOME      │
└──────┬───────┘
       │
  ┌────┼────┐
  ▼    ▼    ▼
FARM COMMUNITY OTHER
  │
  ▼
STORAGE
```

### สมมุติฐาน: ครอบครัว 4 คน

```
👨 พ่อ: "ซื้อ family package ให้ทั้งบ้าน"
👩 แม่: "ใช้พื้นที่ร่วมกัน"
👦 ลูกชาย (8 ขวบ): "ผมก็อยากมีบ้านสำหรับเจ้า小康 ของผม"
👧 ลูกสาว (5 ขวบ): "หนูอยากมีบ้านสำหรับเจ้า arthur ของหนู"
```

**Key Insight:**
- ทุกคนมี **บ้านของตัวเอง** (home ส่วนตัว)
- แต่ใช้ **พื้นที่จัดเก็บร่วมกัน** (shared storage)
- พ่อเป็นคนจ่ายเงิน → family package
- ลูกๆ ไม่ต้องจ่าย → แต่มีพื้นที่ของตัวเอง

### Architecture ที่ขยาย

```
Home Mode
├── 🏠 My Home (บ้านส่วนตัวของแต่ละคน)
│   ├── Pets (สัตว์เลี้ยงของฉัน)
│   ├── Life Journey (ความทรงจำของฉัน)
│   └── Certificates (ใบรับรองของฉัน)
│
├── 👨‍👩‍👧‍👦 Family Home (บ้านครอบครัว)
│   ├── Family Members (สมาชิก)
│   ├── Shared Pets (สัตว์เลี้ยงที่แชร์)
│   └── Family Feed (เรื่องราวของครอบครัว)
│
├── 🌾 Farm Mode
│   ├── Pet Profiles (ข้อมูลสัตว์เลี้ยง)
│   ├── Health Records (บันทึกสุขภาพ)
│   └── Vaccination Tracker
│
├── 🌐 Community Mode
│   ├── Pet Profiles (โปรไฟล์สาธารณะ)
│   ├── Events (กิจกรรม)
│   └── Marketplace (ซื้อขาย)
│
└── 💾 Storage (พื้นที่จัดเก็บ)
    ├── Family Package (จ่ายคนเดียว ใช้ทั้งบ้าน)
    ├── Shared Storage (พื้นที่ร่วม)
    └── Individual Quota (โควตาแต่ละคน)
```

### Database Schema ที่ต้องเพิ่ม

```sql
-- Family Storage Package
CREATE TABLE public.family_packages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  storage_limit bigint DEFAULT 5368709120, -- 5GB default
  storage_used bigint DEFAULT 0,
  plan_type text DEFAULT 'free', -- free, basic, premium
  created_at timestamptz DEFAULT NOW(),
  expires_at timestamptz
);

-- Individual Home (บ้านส่วนตัวของแต่ละคน)
CREATE TABLE public.user_homes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id),
  home_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT NOW()
);

-- Shared Storage Usage
CREATE TABLE public.storage_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id),
  file_type text NOT NULL, -- image, video, document
  file_size bigint NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT NOW()
);
```

### Flow ของ Family Package

```
พ่อสมัคร Family Package
    │
    ▼
สร้าง Family Home
    │
    ├── 👨 พ่อ → มีบ้านส่วนตัว
    ├── 👩 แม่ → มีบ้านส่วนตัว
    ├── 👦 ลูกชาย → มีบ้านส่วนตัว (for เจ้า小康)
    └── 👧 ลูกสาว → มีบ้านส่วนตัว (for เจ้า arthur)
    │
    ▼
ทุกคนใช้พื้นที่จัดเก็บร่วมกัน (5GB)
    │
    ├── รูปภาพสัตว์เลี้ยง
    ├── วิดีโอความทรงจำ
    └── เอกสาร (ใบรับรอง, ผลตรวจสุขภาพ)
```

### UX Flow สำหรับ Family Mode

```
Login → เลือกบ้าน
    │
    ├── "บ้านของฉัน" → My Home (ส่วนตัว)
    │   ├── 🐱 Pets ของฉัน
    │   ├── 📸 Memories ของฉัน
    │   └── 📜 Certificates ของฉัน
    │
    └── "บ้านครอบครัว" → Family Home
        ├── 👨‍👩‍👧‍👦 สมาชิก
        ├── 🐾 สัตว์เลี้ยงทั้งหมด
        └── ✨ เรื่องราวของครอบครัว
```

---

## 🏡 GUI Design: "บ้านที่มีชีวิต"

### แนวคิดหลัก

> "ไม่ใช่แค่เก็บข้อมูล แต่เป็นบ้านที่มีชีวิต ที่ผู้ใช้ตกแต่งตามสไตล์ของตัวเอง"

### หน้าจอหลัก: หมู่บ้าน

```
┌─────────────────────────────────────────────────────────┐
│                    🏘️ หมู่บ้านของเรา                     │
│                                                         │
│    🏠          🏠          🏠          🏠               │
│   บ้านA       บ้านB       บ้านC       บ้านD             │
│  (พ่อ)       (แม่)       (ลูกชาย)    (ลูกสาว)          │
│                                                         │
│    👨          👩          👦          👧                │
│   🐕          🐈          🐕小康       🐈arthur          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  💾 พื้นที่จัดเก็บร่วม: 3.2 GB / 5 GB (64%)     │   │
│  │  ████████████████░░░░░░░░░░░░                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### เมื่อกดเข้าบ้านตัวเอง: พื้นที่ส่วนตัว

```
┌─────────────────────────────────────────────────────────┐
│  🏠 บ้านของลูกสาว                                      │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ 📚 ตู้   │  │ 🖼️ รูป  │  │ 🎄 ของ   │             │
│  │ เก็บ     │  │ ความ     │  │ ตกแต่ง   │             │
│  │ บันทึก   │  │ ทรงจำ    │  │ ตามเทศกาล│             │
│  │          │  │          │  │          │             │
│  │ ██████░░ │  │ ██░░░░░░ │  │ 🎃🎄🌸   │             │
│  │ 75%      │  │ 30%      │  │          │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                         │
│  🐈 arthur                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📸 รูปภาพ: 45 รูป (1.2 GB)                      │   │
│  │ 🎬 วิดีโอ: 12 คลิป (800 MB)                     │   │
│  │ 📄 เอกสาร: 8 ไฟล์ (200 MB)                      │   │
│  │                                                   │   │
│  │ ใช้ไป: 2.2 GB / 5 GB (44%)                       │   │
│  │ ████████████░░░░░░░░░░░░░░░░                     │   │
│  │                                                   │   │
│  │ 💡 "เก็บบันทึกไว้เต็มแล้ว?"                      │   │
│  │    กดที่ตู้เก็บเพื่อเพิ่มพื้นที่                   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### แสดงพื้นที่: ตู้เก็บบันทึก

```
┌─────────────────────────────────────────────────────────┐
│  📚 ตู้เก็บบันทึก                                       │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                   │   │
│  │   📸📸📸  🎬  📄📄                                │   │
│  │   รูปภาพ  วิดีโอ  เอกสาร                          │   │
│  │                                                   │   │
│  │   ████████████████████░░░░░░░░░░  64%            │   │
│  │   3.2 GB / 5 GB                                  │   │
│  │                                                   │   │
│  │   ┌─────────────────────────────────────────┐   │   │
│  │   │  🏪 กดเพิ่มพื้นที่                       │   │   │
│  │   │  (ไม่บังคับ ค่อยๆ เก็บเงินเอง)          │   │   │
│  │   └─────────────────────────────────────────┘   │   │
│  │                                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  💡 "เก็บบันทึกไว้เต็มแล้ว?"                           │
│     กดที่ตู้เก็บเพื่อดูตัวเลือก                         │
└─────────────────────────────────────────────────────────┘
```

### การตกแต่งบ้าน (ฟีเจอร์อนาคต)

```
┌─────────────────────────────────────────────────────────┐
│  🎨 ตกแต่งบ้าน                                          │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ตามเทศกาล:                                             │
│  ├── 🎃 ฮาโลวีน (ตุลาคม)                               │
│  ├── 🎄 คริสต์มาส (ธันวาคม)                             │
│  ├── 🌸 สงกรานต์ (เมษายน)                               │
│  └── 🎋 ลอยกระทง (พฤศจิกายน)                           │
│                                                         │
│  สไตล์ส่วนตัว:                                           │
│  ├── 🌿 ธรรมชาติ                                         │
│  ├── 🎨 ศิลปะ                                            │
│  ├── 🏖️ ชายหาด                                          │
│  └── 🌌 อวกาศ                                           │
│                                                         │
│  ไม่ใช่การแข่งขัน แต่เป็นการแสดงออกตัวตน                 │
│  "ตกแต่งโลกของเขาตามสไตล์ของเค้า"                      │
└─────────────────────────────────────────────────────────┘
```

### UX Flow: การจัดการพื้นที่

```
ผู้ใช้เปิดแอพ
    │
    ▼
เห็นหมู่บ้าน (GUI)
    │
    ├── กดเข้าบ้านตัวเอง → เห็นพื้นที่ส่วนตัว
    │   ├── ตู้เก็บบันทึก (แสดง % การใช้งาน)
    │   ├── รูปความทรงจำ
    │   └── ของตกแต่ง
    │
    └── กดเข้าบ้านครอบครัว → เห็นบ้านทุกคน
        ├── บ้านของพ่อ
        ├── บ้านของแม่
        ├── บ้านของลูกชาย
        └── บ้านของลูกสาว
```

### การแสดงพื้นที่: ไม่ยัดเยียด

| สถานะ | การแสดงผล | การทำงาน |
|---|---|---|
| 0-50% | 🟢 เขียว | ใช้งานปกติ |
| 50-80% | 🟡 เหลือง | เริ่มเตือนเบาๆ |
| 80-95% | 🟠 ส้ม | แจ้งเตือน |
| 95-100% | 🔴 แดง | กดเพิ่มพื้นที่ได้ |

**หลักการออกแบบ:**
- ❌ ไม่ popup บังคับซื้อ
- ❌ ไม่ข้อความ "พื้นที่เต็ม!" แบบน่ากลัว
- ✅ แสดงเป็น visual บนตู้เก็บ
- ✅ ให้ผู้ใช้กดเองเมื่อพร้อม
- ✅ "ค่อยๆ คำนวณการใช้งานและเก็บเงิน"

---

## 🏗️ Meow World Architecture: "ขยายได้โดยไม่ต้องรื้อ"

### แผนผังโครงสร้างทั้งหมด

```
Meow Town (อนาคต)
├── 🏘️ Community (กลุ่มผู้เลี้ยง)
│   ├── Vet Market (ตลาดสัตวแพทย์)
│   ├── Pet Profiles (โปรไฟล์สาธารณะ)
│   └── Events (กิจกรรม)
│
├── 🏠 Home (บ้านหลัก — ทุกบ้านมีเหมือนกัน)
│   │
│   ├── 🪺 Nest 1 (รังส่วนตัว — สำหรับลูกสาว)
│   │   ├── 🐈 arthur (สัตว์เลี้ยง)
│   │   ├── 📸 Memories (ความทรงจำ)
│   │   ├── 📚 Storage (ตู้เก็บบันทึก)
│   │   └── 🎨 Decoration (ตกแต่ง)
│   │
│   ├── 🪺 Nest 2 (รังส่วนตัว — สำหรับลูกชาย)
│   │   ├── 🐕小康 (สัตว์เลี้ยง)
│   │   ├── 📸 Memories
│   │   ├── 📚 Storage
│   │   └── 🎨 Decoration
│   │
│   ├── 🏡 Yard (พื้นที่ส่วนกลางของบ้าน)
│   │   ├── 🌳 ต้นไม้
│   │   ├── 🪑 ม้านั่ง
│   │   ├── 🐟 บ่อปลา
│   │   └── 🌸 สวนดอกไม้
│   │
│   └── 💾 Shared Storage (พื้นที่จัดเก็บร่วม)
│
└── 🏪 Vet Market (อนาคต — หลังเป็นที่รู้จัก)
```

### แผนภาพ SQL Schema ที่รองรับการขยาย

```sql
-- บ้านหลัก (ทุกบ้านมีเหมือนกัน)
CREATE TABLE public.homes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Extension fields (พร้อมใช้เมื่อพร้อม)
  theme text DEFAULT 'default',
  banner_url text,
  created_at timestamptz DEFAULT NOW()
);

-- รังส่วนตัว (Nest) — ย่อยจาก homes
CREATE TABLE public.nests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  home_id uuid REFERENCES public.homes(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  nest_name text NOT NULL,
  description text,
  theme text DEFAULT 'default',
  banner_url text,
  created_at timestamptz DEFAULT NOW()
);

-- ของตกแต่ง (สำหรับรังและบ้าน)
CREATE TABLE public.decorations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nest_id uuid REFERENCES public.nests(id) ON DELETE CASCADE,
  home_id uuid REFERENCES public.homes(id) ON DELETE CASCADE,
  decoration_type text NOT NULL, -- tree, bench, pond, flower, etc.
  position_x int DEFAULT 0,
  position_y int DEFAULT 0,
  season text, -- null = ใช้ตลอด, 'christmas', 'halloween', etc.
  created_at timestamptz DEFAULT NOW()
);

-- พื้นที่จัดเก็บ (Family Package)
CREATE TABLE public.family_packages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid REFERENCES public.homes(id) ON DELETE CASCADE,
  storage_limit bigint DEFAULT 5368709120, -- 5GB
  storage_used bigint DEFAULT 0,
  plan_type text DEFAULT 'free',
  created_at timestamptz DEFAULT NOW(),
  expires_at timestamptz
);
```

### Flow การทำงาน

```
ขั้นที่ 1: สร้างบ้านหลัก (อัตโนมัติเมื่อ signup)
    │
    ▼
ขั้นที่ 2: เพิ่มรังส่วนตัว (แต่ละคนสร้างของตัวเอง)
    │
    ├── 👧 ลูกสาว → สร้างรังสำหรับ arthur
    ├── 👦 ลูกชาย → สร้างรังสำหรับ小康
    └── 👨 พ่อ → ซื้อของตกแต่งให้ลูกๆ
    │
    ▼
ขั้นที่ 3: ตกแต่งบ้าน (ปกติ + เทศกาล)
    │
    ├── 🌳 ต้นไม้ (ปกติ)
    ├── 🪑 ม้านั่ง (ปกติ)
    ├── 🐟 บ่อปลา (ปกติ)
    ├── 🎃 ฮาโลวีน (เฉพาะเดือนตุลาคม)
    └── 🎄 คริสต์มาส (เฉพาะเดือนธันวาคม)
    │
    ▼
ขั้นที่ 4: ขยายไป Community (อนาคต)
    │
    └── Meow Town → Vet Market
```

### หลักการออกแบบ: ขยายได้โดยไม่ต้องรื้อ

| หลัก | วิธีทำ |
|---|---| 
| **Schema พร้อมใช้** | เพิ่ม column ได้โดยไม่ต้อง drop table |
| **Decoration system** | เป็น table แยก ไม่ผูกกับ business logic |
| **Season layer** | เพิ่ม season ได้โดยไม่ต้องแก้ code หลัก |
| **Nest = ย่อยจาก Home** | ลบ nest ไม่กระทบ home |
| **Storage = Family Package** | ขยาย plan ได้โดยไม่ต้อง migrate ใหม่ |

### แผนภาพความสัมพันธ์

```
profiles
  │
  └── homes (บ้านหลัก)
        ├── nests (รังส่วนตัว)
        │     ├── pets (สัตว์เลี้ยง)
        │     ├── life_journey_events
        │     └── decorations (ของตกแต่ง)
        ├── home_members (สมาชิก)
        ├── family_packages (พื้นที่จัดเก็บ)
        └── decorations (ของตกแต่งส่วนกลาง)
```

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | Next.js (App Router) | 16.3.3 |
| **UI** | React | 19.2.8 |
| **Styling** | Tailwind CSS | 3.4.1 |
| **Language** | TypeScript | 5.x |
| **Database** | Supabase (PostgreSQL) | — |
| **Auth** | Supabase Auth (Email + Google OAuth) | — |
| **Hosting** | Vercel | Hobby plan |
| **Version Control** | Git + GitHub | — |

### Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (ไม่มี custom fonts)
│   ├── page.tsx                # 🏠 Home page (3 states: empty/nesting/living)
│   ├── globals.css             # Tailwind v3 + custom CSS
│   ├── login/page.tsx          # 🔐 Google OAuth login
│   ├── auth/callback/route.tsx # OAuth callback handler
│   └── pets/
│       ├── page.tsx            # 📋 Pet list (CRUD)
│       ├── [id]/page.tsx       # 🐱 Pet detail + Life Journey
│       └── [id]/edit/page.tsx  # ✏️ Edit pet
├── components/
│   └── pets/
│       ├── PetCard.tsx         # Pet card component
│       └── PetForm.tsx         # Pet create/edit form
├── types/
│   └── pet.ts                  # TypeScript interfaces
├── utils/supabase/
│   ├── client.ts               # Browser Supabase client
│   ├── server.ts               # Server Supabase client
│   └── middleware.ts           # Session refresh middleware
└── middleware.ts                # Next.js middleware wrapper
```

---

## 🗄️ Database Schema

### Tables (จาก migration จริง)

```
auth.users (Supabase managed)
    │
    ▼
profiles
├── id: uuid (PK, FK → auth.users)
├── display_name: text
├── avatar_url: text
└── created_at: timestamptz

homes
├── id: uuid (PK)
├── name: text
├── description: text
├── owner_id: uuid (FK → profiles)
└── created_at: timestamptz

home_members
├── id: uuid (PK)
├── home_id: uuid (FK → homes)
├── user_id: uuid (FK → profiles)
├── role: text (default: 'member')
├── joined_at: timestamptz
└── UNIQUE(home_id, user_id)

pets
├── id: uuid (PK)
├── home_id: uuid (FK → homes) ← ไม่ใช่ owner_id!
├── name: text
├── nickname: text
├── species: text (default: 'Cat')
├── breed: text
├── gender: text
├── birth_date: date
├── color: text
├── avatar_url: text
├── is_active: boolean (default: true)
└── created_at: timestamptz

life_journey_events
├── id: uuid (PK)
├── home_id: uuid (FK → homes)
├── pet_id: uuid (FK → pets, nullable)
├── author_id: uuid (FK → profiles, nullable)
├── content: text
├── event_type: text (default: 'memory')
├── media_urls: text[]
├── participant_ids: uuid[]
└── created_at: timestamptz
```

### Relationships

```
profiles ──< homes (owner_id)
homes ──< home_members
homes ──< pets (home_id)
homes ──< life_journey_events (home_id)
pets ──< life_journey_events (pet_id)
```

**สำคัญ:** ตารางใช้ `home_id` ไม่ใช่ `owner_id` สำหรับ pets และ events

---

## ⚠️ Known Issues

### ✅ FIXED: `home_members` RLS Infinite Recursion

**Status:** Fixed in previous session

**Error:** `infinite recursion detected in policy for relation "home_members"`

**วิธีแก้:** Drop policy ที่ self-reference แล้ว recreate ใหม่

### ✅ FIXED: Home Page ติด Empty State

**Status:** Fixed in previous session

**Cause:** Query `homes` fail → setViewMode("empty") → loop

**วิธีแก้:** ปรับ default viewMode เป็น "nesting" แทน "empty"

### 🔜 TODO: Google OAuth Redirect URI

**Status:** ต้องตั้งค่าบน Supabase

**สิ่งที่ต้องทำ:**
1. Supabase → Authentication → URL Configuration
2. เพิ่ม Site URL: `https://meow-world-heart-edition.vercel.app`
3. เพิ่ม Redirect URL: `https://meow-world-heart-edition.vercel.app/auth/callback`

### 🔜 TODO: Token Expiry Selector

**Status:** ยังไม่ทำ

**Current:** Token หมดอายุ 7 วันอัตโนมัติ

**Future:** ให้ผู้ใช้เลือก expiry (1 วัน, 7 วัน, 30 วัน, ไม่จำกัด)

---

## 🚀 Deployment

### URLs

| Environment | URL |
|---|---|
| **Production** | `meow-world-heart-edition.vercel.app` |
| **Preview** | `meow-world-heart-edition-61blnekzx-thdev8studio.vercel.app` |
| **GitHub** | `github.com/BombINdyBoy/Meow-World` |

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://eqemlaqgzzjilshrhgdo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

**Vercel Settings:** ต้องเปิดทั้ง Production + Preview + Development

### Git Workflow

```
Branch: qwen-prototype-v0 (development)
    │
    ├─ git push origin qwen-prototype-v0 → Vercel Preview
    │
    └─ merge to main → Vercel Production
```

---

## 📋 Roadmap (อัพเดท: 1 กันยายน 2026)

> เรียงตามลำดับความสำคัญ — **Home Mode ก่อน** ตาม Core V0 Addendum

---

### Phase 1A: Home Mode Core ✅ (ทำเสร็จแล้ว)

- [x] Next.js project foundation + Supabase setup
- [x] Authentication flow (Email + Google OAuth)
- [x] Pet CRUD UI (list, detail, edit)
- [x] Life Journey timeline UI
- [x] Home / Family UI
- [x] Vercel deployment + Tailwind CSS
- [x] Fix RLS infinite recursion
- [x] Feature flag system
- [x] Multi-species support
- [x] Nest system
- [x] Decoration system
- [x] Family package / storage
- [x] Community features
- [x] Vet market features

### Phase 1B: Home Mode — Birth & Identity ✅ (ทำเสร็จแล้ว)

- [x] QR Token adoption flow (create, share, adopt)
- [x] QR Token viewer (list, revoke, delete)
- [x] Adopt page (login → preview → adopt + edge cases)
- [x] Birth/Litter creation (3-step: shared → babies → review)
- [x] Auto PET-XXXX code generation
- [x] Auto Life Journey "Chapter 01" creation
- [x] Progressive Passport view (✓/○ indicators + completeness bar)
- [x] Litter list page (birth history)
- [x] Core V0 Addendum documentation

### Phase 1C: QR Token System ✅ (ทำเสร็จแล้ว — 1 กันยายน 2026)

- [x] Welcome / Entry Screen — storybook-style Meow World
- [x] Interactive House (asymmetrical layout, glass bottom nav)
- [x] QR Scanner Modal (html5-qrcode)
- [x] Token Validation API (4-Layer Security)
- [x] Client-side validation helper
- [x] Adopt page ใช้ validation API
- [x] Bottom Nav: "สแกน QR"
- [x] Design Spec documents (3 ฉบับ)
- [x] Test page สำหรับ API testing
- [x] Deploy ขึ้น Vercel Production

### Phase 2A: QR System Complete 🔜 (ทำต่อ)

- [ ] Purpose-based Router (auto-route by context)
- [ ] Household Invitation Flow
- [ ] Vet Access Flow
- [ ] Contest Registration Flow
- [ ] Token Templates (predefined purposes)
- [ ] Token Analytics (scan count, conversion)

### Phase 2B: Enhanced Home Experience 🔜

- [ ] Real-time Journey Updates (Supabase Realtime)
- [ ] Pet Interaction Animations
- [ ] Photo Upload
- [ ] Life Journey events with media (photo, video)
- [ ] Push Notifications (FCM)
- [ ] Mobile responsive polish

### Phase 3: Visual World Foundation 🔜

> สอดคล้องกับ Product Vision: "ให้ภาพมันเล่าเรื่อง"

- [ ] Home as Visual Space (Interactive House)
- [ ] Progressive Information UI
- [ ] Visual Language System (icons, symbols)
- [ ] Home ID system (บ้านเลขที่)
- [ ] Multi-Home support (1 User = Multiple Homes)

### Phase 4: Life Journey Enhancement 🔜

> สอดคล้องกับ Product Vision: "Story of a Life"

- [ ] Life Journey as Story (ไม่ใช่แค่ Data Timeline)
- [ ] AI Story Selection (เลือก Moment ที่มีความหมาย)
- [ ] Short Video generation (Birthday, Anniversary)
- [ ] Emotional Design (Flashback / Remembrance)
- [ ] Temporal Behavior analysis

### Phase 5: Production Readiness 🔜

- [ ] Error Handling Polish
- [ ] Performance Optimization
- [ ] SEO & Meta Tags
- [ ] PWA Support
- [ ] Test with real user data
- [ ] Launch to 10-50 beta users

### Phase 6: Family & Social 🔜

> สอดคล้องกับ Product Vision: "Relationship"

- [ ] Family sharing & permissions (member, editor, viewer)
- [ ] Family feed (เรื่องราวร่วมกัน)
- [ ] Friend / Home Relationship
- [ ] Home visibility settings
- [ ] Multi-language support

### Phase 7: Community & Knowledge 🔜

> สอดคล้องกับ Product Vision: "Meow Wiki"

- [ ] Community platform
- [ ] Meow Wiki (knowledge base)
- [ ] Contributor recognition (Hall of Fame)
- [ ] Article versioning (ต้นแบบ → การต่อยอด)

### Phase 8: Visual Town 🔜

> สอดคล้องกับ Product Vision: "Visual World"

- [ ] Town Overview
- [ ] Town Emotion (activity density)
- [ ] Walk Mode (Street View style)
- [ ] Home discovery

### Phase 9: Evaluation System 🔜

> สอดคล้องกับ Product Vision: "Evaluate Privately"

- [ ] Internal Quality Signals
- [ ] Temporal Behavior analysis
- [ ] Context Events handling
- [ ] Visual Reputation (ไม่ใช่ตัวเลข)

### Phase 10: Monetization 🔜

- [ ] Premium features (Freemium model)
- [ ] Digital certificates
- [ ] Marketplace integration
- [ ] Advanced storage management

### Out of Scope (for now)

- Biometrics
- AI Features (ยกเว้น Life Journey Video)
- Gamification
- Graphic Engine
- VR / Immersive Interface
- Internal Currency / Meow Points

---

## 🏡 Welcome / Entry Screen: Meow World

**Purpose:** ออกแบบหน้าจอ Welcome / Entry Screen สำหรับ MEOW WORLD — ให้ผู้ใช้รู้สึกเหมือนกำลังเปิดประตูเข้าสู่ "โลกของเจ้าเหมียว"

> **หลักสำคัญ:** ไม่ใช่หน้าเว็บไซต์หรือหน้า Login ทั่วไป ภาพควรมีบรรยากาศเหมือน **storybook illustration ที่มีชีวิต** อบอุ่น น่ารัก มี depth และมีพื้นที่สำหรับ animation เล็ก ๆ ในอนาคต

---

### Layout

ใช้ Layout แบบ **Asymmetrical Composition** ไม่จัดทุกอย่างไว้ตรงกลาง

* ด้านซ้ายเป็นพื้นที่สำหรับ Brand และข้อความ
* ด้านขวาเป็นฉากหลักของโลก Meow World
* ห้ามวาง Main Button ขนาดใหญ่ตรงกลาง
* ห้ามใช้ Card หรือ Panel หนัก ๆ
* ให้ภาพเป็นพระเอกของหน้าจอ

---

### ด้านซ้าย

แสดงข้อความ:

**MEOW WORLD**

**ยินดีต้อนรับสู่โลกของเจ้าเหมียว**

Typography อบอุ่น เป็นมิตร อ่านง่าย แต่ไม่กินพื้นที่มากเกินไป

ไม่ต้องมีปุ่ม "เริ่มสร้างโลก" ใต้ข้อความ

---

### ฉากด้านขวา

สร้างหมู่บ้านเล็ก ๆ ที่อบอุ่นและมีชีวิต

มีองค์ประกอบ:

* บ้านหลังหนึ่งเป็นจุดเด่น
* ครอบครัวอยู่บริเวณบ้าน
* แมวอยู่ใกล้บ้าน
* ต้นไม้
* หญ้าและดอกไม้
* นกบนท้องฟ้า
* แสงพระอาทิตย์อุ่น ๆ
* foreground เช่น ใบไม้หรือดอกไม้ เพื่อสร้าง depth

Composition ต้องมี **foreground / midground / background** อย่างชัดเจน

---

### Interactive House

บ้านหลังหลักคือ **Interactive Hotspot**

สำคัญมาก:

* **อย่าวาดกรอบปุ่มรอบบ้าน**
* **อย่าวาดปุ่ม UI ทับบ้าน**
* **อย่าใส่คำว่า "Click here"**

บ้านต้องดูเหมือนเป็นส่วนหนึ่งของโลกจริง ๆ แต่มี visual cue เล็ก ๆ ว่า "แตะได้"

เช่น:

* แสงอ่อน ๆ รอบบ้าน
* หน้าต่างมีแสง
* แมวหันมาทางผู้ใช้
* ประกายเล็ก ๆ
* subtle glow
* บ้านมีความรู้สึกมีชีวิต

แนวคิดคือ:

> **ผู้ใช้แตะบ้าน → บ้านจะกลายเป็น "บ้านของฉัน" → จากนั้นเข้าสู่โลกของผู้ใช้**

ดังนั้นบ้านต้องเป็นจุด Interactive ที่สำคัญที่สุดของหน้าจอ

---

### Animation-friendly design

ออกแบบภาพโดยเผื่อการทำ Motion Animation ภายหลัง:

* แสงพระอาทิตย์สามารถเคลื่อนช้า ๆ
* นกสามารถบินผ่าน
* แมวสามารถกระดิกหาง / กระพริบตา
* ใบไม้สามารถไหวเบา ๆ
* หญ้าและดอกไม้สามารถขยับ
* ประกายเล็ก ๆ สามารถกระพริบ
* ผ้าม่านหรือองค์ประกอบในบ้านสามารถขยับเบา ๆ

Animation ต้อง subtle และ slow — ไม่ให้ดูเหมือน video หรือ advertisement

---

### Bottom Navigation

ด้านล่างของหน้าจอมีเพียง 2 secondary actions:

**＋ เพิ่มสมาชิก**

**⌁ สแกน QR**

ทำเป็น **minimal translucent glass navigation**

* พื้นหลังโปร่งใสประมาณ 70–80%
* blur เล็กน้อย
* ไม่มีกรอบหนา
* ไม่มีสีฉูดฉาด
* ไม่ให้แย่งความสนใจจากบ้าน

สอง action นี้เป็นเพียงทางลัด และมีความสำคัญรองจาก Interactive House

---

### Visual hierarchy

ลำดับความสำคัญ:

1. Interactive House / World
2. MEOW WORLD + Welcome message
3. Add Member / QR Scan

ภาพรวมต้องรู้สึก:

> **Warm / Magical / Cozy / Playful / Storybook / Living World**

* ไม่ต้องดูเหมือน Corporate App
* ไม่ต้องดูเหมือน Dashboard
* ไม่ต้องดูเหมือน Login Screen
* ไม่ต้องใช้ UI แบบเว็บสมัยใหม่ที่มี Card เยอะ ๆ

Aspect ratio: **16:9** — ออกแบบสำหรับ Mobile-first experience แต่สามารถนำไป adapt กับ Tablet/Desktop ได้

ภาพควรมีพื้นที่ว่างเพียงพอสำหรับ UI และ animation ในอนาคต

---

## 🐣 Core V0 Addendum: Birth → Identity → Home/Context/Role

**Purpose:** เอกสารข้อกำหนดและแนวคิดเพิ่มเติมสำหรับ Prototype V0

> **หลักสำคัญ:** Core ต้องชัด แต่ Implementation ยังเปิดกว้างสำหรับการทดลองและปรับปรุง

---

### Part 1 — Birth → First Life Journey → Progressive Passport

#### 1. แนวคิดหลัก

> **Create Identity First. Complete It Over Time.**

ระบบควรเริ่มต้น Identity ของสัตว์ได้ตั้งแต่วันเกิด แม้ข้อมูลยังไม่สมบูรณ์

**เกิด → จับกลุ่ม → ข้อมูลเบื้องต้น → Pet ID → First Life Journey → Progressive Passport**

#### 2. Birth Event / Litter

ข้อมูลที่เหมือนกันเก็บในระดับ **Litter / Birth Context** เพื่อลดการกรอกซ้ำ:

* พ่อ, แม่, วันที่เกิด, สถานที่, สายพันธุ์ที่คาดหมาย, บริบทการเกิด, ผู้บันทึก

จากนั้นแต่ละ Baby มีข้อมูลเฉพาะของตัวเอง

#### 3. ลดการกรอกข้อมูลซ้ำ

**Create Litter → Shared Information ครั้งเดียว → เพิ่มสมาชิกแต่ละตัว**

ข้อมูลที่ Override รายตัวได้: วันเกิด, น้ำหนัก, สี, ลักษณะพิเศษ, รูป, ชื่อเรียก

กรณีเกิดข้ามวัน ใช้วันที่ของตัวแรกเป็น Birth Date เบื้องต้น แก้ไขภายหลังได้

#### 4. Initial Pet Information

ควรใช้ Dropdown / Checkbox / Selection เป็นหลัก ลดการพิมพ์และข้อมูลผิดรูปแบบ

ข้อมูลที่ไม่ทราบ: **ข้าม → บันทึกก่อน → เติมภายหลัง**

#### 5. Parent Relationship

* มี Identity อยู่แล้ว → เลือก Parent → เชื่อม Relationship
* ยังไม่มี → สร้าง Parent Reference → เชื่อมภายหลังได้

ไม่ควรบังคับให้ Parent มี Passport สมบูรณ์ก่อน

#### 6. First Life Journey

Birth Event = Life Journey Event แรก

ข้อความสามารถปรับตาม Context:

| Context | สิ่งที่เน้น |
|---|---|
| **Home** | เรื่องราว, ความทรงจำ |
| **Farm** | ความรวดเร็ว, ข้อมูลสำคัญ |
| **Vet** | ข้อมูลการดูแล |

#### 7. Progressive Passport

Passport เป็น **Living / Progressive Identity Record**

```
Day 1:     Photo + Pet ID + Birth + Basic Info
ภายหลัง:   + Parent + Health + Documents
สุดท้าย:   + Biometrics + Certificates + Verified Evidence
```

---

### Part 2 — Home → Context → Role → Work Mode

#### 8. Home = Personal Anchor

> Home คือ Personal Anchor ของผู้ใช้งาน ไม่ใช่ "บ้านที่มีสัตว์"

ผู้ใช้สร้าง Home ได้แม้ยังไม่มีสัตว์เลี้ยงเลย

#### 9. Context

ผู้ใช้ 1 คนมีหลาย Context ได้:

```
User
├── Personal Home
├── Farm A
├── Farm B
└── Vet Clinic
```

ไม่ควรออกแบบ Account ให้เป็นประเภทเดียว เพราะคนเดียวมีหลายบทบาทได้

#### 10. Farm / Vet = Workspace / Organization

Farm และ Vet Clinic เป็น Entity แยกจาก User:

```
Farm A
├── Owner
├── Partner
├── Staff
└── Vet
```

ผู้ใช้แต่ละคนเข้าร่วม Entity ด้วย Role ที่แตกต่างกัน

#### 11. Role ไม่เปลี่ยน Identity

```
User A
├── Personal Home → Pet Parent
├── Farm A → Staff
└── Vet Clinic → Staff / Vet
```

Role = ความสัมพันธ์ระหว่าง User กับ Context ไม่ใช่ประเภทถาวรของ Account

#### 12. Default Context

เมื่อไม่มี Work Context: **Default = Personal Home**

เมื่อเข้าร่วม Farm → เปลี่ยน Default Context ได้:

```
Home → Joined Farm A → Role: Staff
Default → Farm A
→ Today's Tasks, Animals, Birth, Records
```

#### 13. Default Context ≠ Identity

การเปลี่ยน Default ไม่เปลี่ยนตัวตนหรือ Role

#### 14. Personal Home ต้องคงอยู่เสมอ

```
User
├── Personal Home → My Pets
└── Farm A → Role: Staff
```

เปลี่ยน Default กลับ Personal Home ได้ตลอด
Membership ใน Farm A ยังคงอยู่

---

### Part 3 — UX Principle

#### 15. Home = Smart Launcher

Home เชื่อม: **User → Context → Role → Tools**

```
Staff:    App → Farm A → Today's Work → เริ่มงาน
Vet:      App → Vet Clinic → Today's Patients → เริ่มงาน
Pet Parent: App → Personal Home → My Pets → Life Journey
```

---

### Part 4 — Farm Evidence / Trust

#### 16. Farm สามารถสะสม Evidence ได้

เอกสารที่เก็บได้:

* ทะเบียนพาณิชย์, เอกสารจดทะเบียน, ใบอนุญาต, เอกสารรับรอง

สถานะ: **Uploaded → Digitized → Verified**

#### 17. Trust ไม่ใช่ Binary

ควรแสดง:

* มี Identity → มี Evidence → มีเอกสารประกอบ → มี Verified Evidence

> ระบบไม่ได้รับรองผู้ใช้ แต่ช่วยสร้างโครงสร้างให้สะสมหลักฐานและเพิ่มความน่าเชื่อถือ

---

### Part 5 — Core Philosophy

#### 18. สิ่งที่ควรรักษาเป็น Core

1. Identity สามารถเกิดก่อนข้อมูลสมบูรณ์
2. Shared Information ไม่ควรถูกกรอกซ้ำ
3. Birth เป็นจุดเริ่มต้นของ Life Journey
4. Passport สมบูรณ์ขึ้นตามเวลา
5. Home = Personal Anchor
6. Context = สิ่งที่ผู้ใช้เข้าไปทำงาน
7. Role = ความสัมพันธ์กับ Context
8. Default Context ลดขั้นตอนการเข้าถึงงาน
9. Pet Identity ไม่ผูกถาวรกับ Farm หรือ Owner
10. Evidence เพิ่มความน่าเชื่อถือ แต่ไม่เท่ากับการรับรอง

#### 19. Implementation Philosophy

Prototype V0 = Core Flow ที่ทำงานได้จริงก่อน

หลักการ: **Build → Branch → Compare → Compose → Validate → Merge**

ไม่จำเป็นต้องเลือก A หรือ B ทั้งระบบ — สามารถเลือกจุดที่ดีที่สุดจากแต่ละ Branch

> **Prototype V0 คือ DNA ของระบบ ไม่ใช่กรงที่ปิดกั้นการพัฒนา**

---

## 📁 Files Summary

### Configuration Files

| File | Purpose |
|---|---|
| `package.json` | Dependencies (Tailwind v3, Supabase, Next.js 16) |
| `tsconfig.json` | TypeScript config |
| `tailwind.config.js` | Tailwind v3 content paths |
| `postcss.config.js` | PostCSS with tailwindcss + autoprefixer |
| `.env.local` | Supabase credentials (not committed) |
| `.env.local.example` | Template for env vars |
| `.gitignore` | Git ignore rules |

### Source Files

| File | Purpose |
|---|---|
| `src/app/page.tsx` | Home page (3 states) |
| `src/app/login/page.tsx` | Login page (Google OAuth) |
| `src/app/pets/page.tsx` | Pet list (CRUD) |
| `src/app/pets/[id]/page.tsx` | Pet detail + Life Journey |
| `src/app/pets/[id]/edit/page.tsx` | Edit pet |
| `src/components/pets/PetForm.tsx` | Pet form component |
| `src/components/pets/PetCard.tsx` | Pet card component |
| `src/types/pet.ts` | TypeScript interfaces |
| `src/utils/supabase/client.ts` | Browser client |
| `src/utils/supabase/server.ts` | Server client |
| `src/utils/supabase/middleware.ts` | Session middleware |

### Database Migrations

| File | Purpose |
|---|---|
| `20260827130000_init_full_schema.sql` | Main schema (homes, home_members, pets, events) |
| `20260831000000_fix_rls_and_profile.sql` | Fix RLS + insert profile |
| `20260831100000_fix_rls_recursion.sql` | Fix recursion (incomplete) |
| `20260831200000_nuclear_rls_fix.sql` | Nuclear fix (incomplete) |

---

## 🎯 How to Start (สำหรับ developer ใหม่)

### Step 1: Clone & Setup

```bash
git clone -b qwen-prototype-v0 https://github.com/BombINdyBoy/Meow-World.git
cd Meow-World
npm install
cp .env.local.example .env.local
# ใส่ Supabase credentials ใน .env.local
npm run dev
```

### Step 2: Fix Database (BLOCKER)

ไปที่ Supabase SQL Editor แล้วรัน:

```sql
-- ดู policy ที่มีอยู่
SELECT * FROM pg_policies WHERE tablename = 'home_members';

-- Drop ตัวที่ cause recursion (ใช้ชื่อจริงจากผลลัพธ์ข้างบน)
-- DROP POLICY IF EXISTS "ชื่อpolicyจริง" ON public.home_members;

-- Recreate
CREATE POLICY "Users see own membership" ON public.home_members
  FOR SELECT USING (user_id = auth.uid());
```

### Step 3: Test

```bash
npm run build    # ตรวจสอบ build สำเร็จ
npm run dev      # รัน local
# เปิด http://localhost:3000
# Login → ควรเห็น Home state
```

### Step 4: Deploy

```bash
git push origin qwen-prototype-v0
# Vercel auto-deploy Preview
# Merge to main → Production
```

---

## 📞 Contact

- **Repository:** https://github.com/BombINdyBoy/Meow-World
- **Branch:** `qwen-prototype-v0`

---

*เอกสารนี้สร้างขึ้นเมื่อ 2026-08-31 โดย AI Codebuff*
*สำหรับทีมพัฒนา Meow World V4.1 Heart Edition*
