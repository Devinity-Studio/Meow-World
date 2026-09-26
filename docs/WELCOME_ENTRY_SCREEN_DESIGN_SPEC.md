# 🏠 Welcome / Entry Screen — Design Specification

**App:** MEOW WORLD  
**Version:** Heart Edition  
**Date:** 2026-09-01  
**Branch:** `qwen-prototype-v0`  
**Status:** ✅ Implemented (Living Mode)

---

## 📐 Concept

> ให้ผู้ใช้รู้สึกเหมือนกำลังเปิดประตูเข้าสู่ **"โลกของเจ้าเหมียว"** ไม่ใช่หน้าเว็บไซต์หรือหน้า Login ทั่วไป

ภาพควรมีบรรยากาศเหมือน **storybook illustration ที่มีชีวิต** อบอุ่น น่ารัก มี depth และมีพื้นที่สำหรับ animation เล็ก ๆ ในอนาคต

---

## 🖼️ Layout — Asymmetrical Composition

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  MEOW WORLD                    🌤️                       │
│                                                         │
│  ยินดีต้อนรับ                    🐦                     │
│  สู่โลกของเจ้าเหมียว                 🌳                 │
│                                      🏡 ← Interactive   │
│                                  🐱 👨‍👩‍👧 🌸              │
│                              🌿                           │
│                                                         │
│                                                         │
│  ───────────────────────────────────────────────        │
│      ＋ เพิ่มสมาชิก          ⌁ สแกน QR                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Layout Zones

| Zone | Content | Priority |
|------|---------|----------|
| **Top Left** | MEOW WORLD branding | 2 |
| **Left Center** | Welcome message | 2 |
| **Right Side** | Village scene (storybook illustration) | 1 (Main) |
| **Bottom** | Translucent glass navigation | 3 (Secondary) |

### Scene Composition

```
┌────────────────────────────────────────┐
│  ☀️ Sun (background)                  │
│     🐦 Birds flying                   │
│        🌳 Trees                       │
│           🏡 Interactive House        │
│         🐱 👨‍👩‍👧 🌸 Family & Cat          │
│        🌿 Grass & Flowers (foreground)│
└────────────────────────────────────────┘
```

### Depth Layers

| Layer | Elements | Purpose |
|-------|----------|----------|
| **Background** | Sun, sky | Create atmosphere |
| **Midground** | House, family, cat, trees | Main scene |
| **Foreground** | Flowers, grass, leaves | Add depth |

**กฎสำคัญ:**
- ❌ ห้ามวาง Main Button ขนาดใหญ่ตรงกลาง
- ❌ ห้ามใช้ Card หรือ Panel หนัก ๆ
- ✅ ให้ภาพเป็นพระเอกของหน้าจอ
- ✅ บ้านเป็นจุด Interactive ที่สำคัญที่สุด

---

## 🏷️ Left Side — Brand & Welcome

แสดงข้อความ:

- **MEOW WORLD**
- **ยินดีต้อนรับสู่โลกของเจ้าเหมียว**

Typography อบอุ่น เป็นมิตร อ่านง่าย แต่ไม่กินพื้นที่มากเกินไป  
ไม่ต้องมีปุ่ม "เริ่มสร้างโลก" ใต้ข้อความ

---

## 🏘️ Right Side — Village Scene

สร้างหมู่บ้านเล็ก ๆ ที่อบอุ่นและมีชีวิต

### Scene Elements

| Layer | Elements |
|-------|----------|
| **Background** | แสงพระอาทิตย์อุ่น ๆ, นกบนท้องฟ้า |
| **Midground** | บ้านหลังหนึ่งเป็นจุดเด่น, ครอบครัวอยู่บริเวณบ้าน, แมวอยู่ใกล้บ้าน, ต้นไม้, หญ้าและดอกไม้ |
| **Foreground** | ใบไม้หรือดอกไม้ เพื่อสร้าง depth |

Composition ต้องมี **foreground / midground / background** อย่างชัดเจน

---

## 🏠 Interactive House

> **💡 The house itself is the primary call-to-action. It must not look like a button.**
>
> **บ้านเป็น Primary Call-to-Action โดยตัวบ้านเอง ไม่ใช้กรอบปุ่มหรือปุ่ม UI มาครอบ**
>
> นี่คือหัวใจของ Interaction — บ้านต้องดูเหมือนเป็นส่วนหนึ่งของโลกจริง ๆ
> แต่ผู้ใช้ต้องรู้สึกว่า “แตะได้” โดยไม่ต้องมีปุ่ม UI กำกับ

บ้านหลังหลักคือ **Interactive Hotspot** ที่สำคัญที่สุดของหน้าจอ

### ⚠️ กฎสำคัญ

| ❌ ห้ามทำ | ✅ ทำได้ |
|-----------|----------|
| อย่าวาดกรอบปุ่มรอบบ้าน | แสงอ่อน ๆ รอบบ้าน |
| อย่าวาดปุ่ม UI ทับบ้าน | หน้าต่างมีแสง |
| อย่าใส่คำว่า "Click here" | แมวหันมาทางผู้ใช้ |
| | ประกายเล็ก ๆ |
| | subtle glow |
| | บ้านมีความรู้สึกมีชีวิต |

### Interaction Flow

```
ผู้ใช้แตะบ้าน
    ↓
บ้านจะกลายเป็น "บ้านของฉัน"
    ↓
เข้าสู่โลกของผู้ใช้
```

---

## 🎬 Animation-Friendly Design

ออกแบบภาพโดยเผื่อการทำ Motion Animation ภายหลัง:

| Element | Animation | Style |
|---------|-----------|-------|
| ☀️ แสงพระอาทิตย์ | เคลื่อนช้า ๆ | subtle, slow |
| 🐦 นก | บินผ่าน | subtle, slow |
| 🐱 แมว | กระดิกหาง / กระพริบตา | subtle, slow |
| 🍃 ใบไม้ | ไหวเบา ๆ | subtle, slow |
| 🌿 หญ้าและดอกไม้ | ขยับ | subtle, slow |
| ✨ ประกาย | กระพริบ | subtle, slow |
| 🪟 ผ้าม่านในบ้าน | ขยับเบา ๆ | subtle, slow |

**Animation ต้อง subtle และ slow**  
ไม่ให้ดูเหมือน video หรือ advertisement

---

## 📱 Bottom Navigation

ด้านล่างของหน้าจอมีเพียง 2 secondary actions:

```
┌─────────────────────────────────────────────────────────┐
│  ───────────────────────────────────────────────        │
│      ＋ เพิ่มสมาชิก          ⌁ สแกน QR                   │
└─────────────────────────────────────────────────────────┘
```

### Actions

| Icon | Label | Action |
|------|-------|--------|
| ＋ | เพิ่มสมาชิก | Navigate to `/pets/birth` |
| ⌁ | สแกน QR | Open QR scanner / invite |

### Style: Minimal Translucent Glass Navigation

- พื้นหลังโปร่งใสประมาณ 70–80%
- blur เล็กน้อย (backdrop-filter: blur)
- ไม่มีกรอบหนา
- ไม่มีสีฉูดฉาด
- ไม่ให้แย่งความสนใจจากบ้าน

สอง action นี้เป็นเพียงทางลัด และมีความสำคัญรองจาก Interactive House

---

## 🎯 Visual Hierarchy

ลำดับความสำคัญ:

1. **Interactive House / World**
2. **MEOW WORLD + Welcome message**
3. **Add Member / QR Scan**

### Overall Feel

- ✅ Warm / Magical / Cozy / Playful / Storybook / Living World
- ❌ ไม่ต้องดูเหมือน Corporate App
- ❌ ไม่ต้องดูเหมือน Dashboard
- ❌ ไม่ต้องดูเหมือน Login Screen
- ❌ ไม่ต้องใช้ UI แบบเว็บสมัยใหม่ที่มี Card เยอะ ๆ

---

## 📏 Specifications

| Property | Value |
|----------|-------|
| **Aspect Ratio** | 16:9 |
| **Platform** | Mobile-first (adapts to Tablet/Desktop) |
| **Space** | พื้นที่ว่างเพียงพอสำหรับ UI และ animation ในอนาคต |

---

## 🔗 Implementation Reference

| File | Description |
|------|-------------|
| `src/app/page.tsx` | Main Welcome Entry Screen implementation |
| `welcome entry ref 1-6.png` | Design reference images |
| `docs/QR_TOKEN_SYSTEM_DESIGN_SPEC.md` | QR Token System design specification |
| `docs/MEOW_PASSPORT_DESIGN_SPEC.md` | Meow Passport design specification |

---

## 📝 Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-09-01 | 1.0 | Initial design specification document |
| 2026-09-01 | 1.0 | Implemented in `page.tsx` with Living Mode |
