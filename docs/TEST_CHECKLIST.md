# 🧪 Test Checklist — Meow World MVP

**วันที่:** 1 กันยายน 2026
**เวอร์ชัน:** Prototype V0 (after schema fix)
**Branch:** `qwen-prototype-v0`

---

## 📋 Pre-Test Setup

### Supabase SQL Editor
- [ ] รัน SQL สำหรับ Drop old policies
- [ ] รัน SQL สำหรับ Recreate policies ใหม่
- [ ] รัน migration สำหรับ weight/updated_at columns
- [ ] Verify ด้วย `SELECT * FROM pg_policies WHERE schemaname = 'public';`
- [ ] ตรวจสอบว่าไม่มี policy ไหน self-reference `home_members`

### Vercel
- [ ] ตรวจสอบว่า Preview deployment สำเร็จ
- [ ] ตรวจสอบ environment variables ครบถ้วน

---

## 🔐 Authentication Flow

### Google OAuth Login
- [ ] เปิดหน้า Login → เห็นปุ่ม "เข้าสู่ระบบด้วย Google"
- [ ] กดปุ่ม Google Login → Redirect ไป Google
- [ ] Login สำเร็จ → Redirect กลับ `/auth/callback`
- [ ] Redirect ไปหน้า Home (`/`)
- [ ] ตรวจสอบ session cookie ตั้งค่าถูกต้อง

### Session Management
- [ ] Login แล้ว refresh หน้า → ยังอยู่ในระบบ
- [ ] ปิด browser แล้วเปิดใหม่ → ยังอยู่ในระบบ (session persist)
- [ ] ตรวจสอบ proxy.ts middleware ทำงาน (session refresh)

### Error Handling
- [ ] Login ไม่สำเร็จ → แสดง error message บนหน้า Login
- [ ] ไม่มี session → redirect ไป `/login`

---

## 🏠 Home Page Flow

### Empty State (New User)
- [ ] User ใหม่ Login → เห็นหน้า "ยินดีต้อนรับสู่ Meow World"
- [ ] ตรวจสอบว่าสร้าง Home อัตโนมัติ (ชื่อ "บ้านของเรา")
- [ ] ตรวจสอบว่าสร้าง home_members record (role: owner)

### Nesting State (มีบ้าน ไม่มีสัตว์เลี้ยง)
- [ ] เห็นหน้า "บ้านหลังใหม่พร้อมแล้ว!"
- [ ] กดปุ่ม "รับน้องเข้าบ้าน" → redirect ไป `/pets`
- [ ] กด "ดู Passport ทั้งหมด" → redirect ไป `/pets`

### Living State (มีสัตว์เลี้ยง)
- [ ] เห็น header แสดงชื่อบ้านและจำนวนสมาชิก
- [ ] เห็น Pet cards แสดงชื่อ, species, avatar
- [ ] กด Pet card → redirect ไปหน้า Detail
- [ ] กดปุ่ม "+" → redirect ไปหน้า Detail ของสัตว์ตัวแรก
- [ ] เห็น Events feed แสดงความทรงจำล่าสุด
- [ ] กด "ดูทั้งหมด" → redirect ไปหน้า Detail

---

## 🐾 Pet Passport CRUD

### Create Pet
- [ ] กด "+ เพิ่มสัตว์เลี้ยง" → เห็น form modal
- [ ] กรอกข้อมูลครบ (name, species) → กด "สร้าง"
- [ ] Pet ใหม่ปรากฏใน list
- [ ] ตรวจสอบว่าบันทึกด้วย `home_id` (ไม่ใช่ `owner_id`)
- [ ] ตรวจสอบว่ามี default values (is_active: true)

### Read Pet
- [ ] เห็น Pet cards แสดงข้อมูลครบถ้วน
- [ ] แสดง: ชื่อ, species, breed, nickname, gender, color, วันเกิด
- [ ] คำนวณอายุถูกต้อง (ปี/เดือน/แรกเกิด)

### Update Pet
- [ ] กด "แก้ไข" → เห็น form pre-fill ข้อมูลเดิม
- [ ] แก้ไขข้อมูล → กด "อัปเดต"
- [ ] ข้อมูลอัปเดตถูกต้องใน list
- [ ] ตรวจสอบ updated_at trigger ทำงาน

### Delete Pet
- [ ] กด "ลบ" → เห็น confirmation dialog
- [ ] กด "ยืนยัน" → Pet ถูกลบจาก list
- [ ] กด "ยกเลิก" → ไม่ลบ

### Pet Detail Page
- [ ] แสดงข้อมูล Pet ครบถ้วน
- [ ] กด "แก้ไขข้อมูล" → redirect ไปหน้า Edit
- [ ] กด "← กลับไปหน้ารายชื่อ" → redirect กลับ

### Edit Pet Page
- [ ] แสดง form pre-fill ข้อมูลเดิม
- [ ] แก้ไขข้อมูล → กด "อัปเดต"
- [ ] Redirect กลับหน้า Detail

---

## 📸 Life Journey Events

### Create Event
- [ ] กด "+ เพิ่มเหตุการณ์" → เห็น form modal
- [ ] เลือกวันที่, ประเภท, กรอกหัวข้อ
- [ ] กด "บันทึก" → Event ใหม่ปรากฏใน Timeline
- [ ] ตรวจสอบว่าบันทึกด้วย `home_id`, `pet_id`, `author_id`

### Read Events
- [ ] Timeline เรียงตาม created_at (ใหม่สุดอยู่บน)
- [ ] แสดง: ประเภท (สี), วันที่, หัวข้อ, รายละเอียด
- [ ] แสดง icon ตาม event_type (medical, vaccine, milestone, memory)

### Delete Event
- [ ] กด "ลบ" → เห็น confirmation dialog
- [ ] กด "ยืนยัน" → Event ถูกลบ
- [ ] Timeline อัปเดตทันที

### Event Types
- [ ] medical → แสดงสีแดง
- [ ] vaccine → แสดงสีน้ำเงิน
- [ ] milestone → แสดงสีเขียว
- [ ] memory → แสดงสีม่วง

---

## 🪺 Nest System

### Feature Flag Check
- [ ] เปิด `/admin/flags` → ตรวจสอบ nest_system flag
- [ ] ปิด flag → `/nests` แสดงหน้า "ฟีเจอร์นี้ยังไม่เปิดใช้งาน"
- [ ] เปิด flag → `/nests` แสดงหน้า Nest management

### Create Nest
- [ ] กด "+ สร้างรังใหม่" → เห็น form
- [ ] กรอกชื่อรัง → กด "สร้างรัง"
- [ ] Nest ใหม่ปรากฏใน list

### Nest Card
- [ ] แสดงชื่อรัง, จำนวนสัตว์เลี้ยง
- [ ] กด Nest card → redirect ไปหน้า Detail (ถ้ามี)

---

## ⚙️ Admin Dashboard

### Dashboard Stats
- [ ] เปิด `/admin/dashboard` → เห็นสถิติ
- [ ] แสดง: ผู้ใช้ทั้งหมด, active users, สัตว์เลี้ยง, ความทรงจำ
- [ ] แสดง Feature Usage chart

### Feature Flags Management
- [ ] เปิด `/admin/flags` → เห็น list ของ flags
- [ ] กด toggle → flag เปลี่ยนสถานะ
- [ ] ตรวจสอบว่า flag มีผลทันที (ไม่ต้อง deploy ใหม่)

### Recent Activity
- [ ] แสดงกิจกรรมล่าสุด
- [ ] แสดง time ago format (ถูกต้อง)

---

## 🔧 Edge Cases & Error Handling

### Network Errors
- [ ] ปิด internet → แสดง error message ที่เข้าใจง่าย
- [ ] Server error → ไม่ crash, แสดง fallback UI

### Invalid Data
- [ ] สร้าง Pet โดยไม่ใส่ name → แสดง validation error
- [ ] สร้าง Event โดยไม่ใส่ title → แสดง validation error

### RLS Protection
- [ ] User A สร้าง Pet → User B มองไม่เห็น (ถ้าไม่ได้อยู่ใน home เดียวกัน)
- [ ] User A สร้าง Event → User B มองไม่เห็น

---

## 📱 Responsive Design

### Mobile (< 640px)
- [ ] Home page แสดงถูกต้อง
- [ ] Pet cards จัดเรียง vertical
- [ ] Form modal ใช้งานง่าย
- [ ] Navigation สะดวก

### Tablet (640px - 1024px)
- [ ] Pet cards จัดเรียง 2 columns
- [ ] Dashboard stats จัดเรียง 2 columns

### Desktop (> 1024px)
- [ ] Pet cards จัดเรียง 3 columns
- [ ] Dashboard stats จัดเรียง 4 columns

---

## 🚀 Performance

### Load Time
- [ ] Home page โหลดภายใน 3 วินาที
- [ ] Pets page โหลดภายใน 3 วินาที
- [ ] Pet detail โหลดภายใน 2 วินาที

### Build
- [ ] `npm run build` สำเร็จ (ไม่มี TypeScript errors)
- [ ] ไม่มี console errors ใน production

---

## ✅ Acceptance Criteria

### Core Flow
- [ ] User สามารถ Login ได้
- [ ] User สามารถสร้าง Pet Passport ได้
- [ ] User สามารถแก้ไข/ดู Pet ได้
- [ ] User สามารถเพิ่ม Life Journey Event ได้
- [ ] User สามารถดู Timeline ได้
- [ ] Login กลับมาแล้วข้อมูลเดิมยังอยู่

### Data Integrity
- [ ] ข้อมูลบันทึกใน Supabase ถูกต้อง
- [ ] RLS ป้องกันข้อมูลข้าม user ได้
- [ ] home_id ใช้แทน owner_id ถูกต้อง

---

## 📝 Bug Report Template

```markdown
**Bug Title:** [ชื่อ bug]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[สิ่งที่ควรเกิดขึ้น]

**Actual Behavior:**
[สิ่งที่เกิดขึ้นจริง]

**Screenshot:** [ถ้ามี]

**Environment:**
- Browser: [Chrome/Safari/Firefox]
- Device: [Desktop/Mobile]
- OS: [Windows/macOS/iOS/Android]
```

---

## 🎯 Priority Testing

### P0 — Must Pass (Blocker)
- [ ] Login สำเร็จ
- [ ] Home state แสดงถูกต้อง (ไม่ติด Empty State)
- [ ] สร้าง Pet ได้
- [ ] เพิ่ม Event ได้
- [ ] ข้อมูลบันทึกและแสดงถูกต้อง

### P1 — Should Pass
- [ ] Edit/Delete Pet ได้
- [ ] Delete Event ได้
- [ ] Feature Flags ทำงาน
- [ ] Responsive design ถูกต้อง

### P2 — Nice to Have
- [ ] Nest System ทำงาน
- [ ] Admin Dashboard แสดงสถิติ
- [ ] Error messages เข้าใจง่าย

---

*สร้างเมื่อ: 1 กันยายน 2026*
*สำหรับ: ทดสอบ Meow World MVP หลังแก้ Schema*
