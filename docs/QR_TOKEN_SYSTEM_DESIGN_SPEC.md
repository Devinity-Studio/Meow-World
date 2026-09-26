# 🔳 QR Token System — Design Specification

**App:** MEOW WORLD  
**Version:** Heart Edition  
**Date:** 2026-09-01  
**Branch:** `qwen-prototype-v0`  
**Status:** ✅ Implemented (Basic Flow)

---

## 📐 Concept

> **QR = Physical / Visual Entry Point**  
> **Token = Intent + Permission + Conditions**  
> **Meow World = Policy Enforcement + Experience**

QR ของ Meow World ไม่ใช่ QR Code ธรรมดา — มันคือ **Physical Entry Point** ที่เชื่อมต่อเข้าสู่โลกดิจิทัลของผู้ใช้

---

## 🔄 Flow Diagram

```
                    📱 Scan QR
                         │
                         ▼
                  Decode Token
                         │
                         ▼
                 ตรวจสอบ Token
                         │
             ┌───────────┼───────────┐
             │           │           │
          Purpose     Permission   Conditions
             │           │           │
             └───────────┼───────────┘
                         ▼
                 Determine Action
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       🐱 Adoption    👨‍👩‍👧 Join       🩺 Vet
          │              │              │
       รับน้อง         เข้าบ้าน       ข้อมูลรักษา
          │
          ├── 🏆 Contest Registration
          ├── 🏥 Medical Access
          ├── 🏠 Household Invitation
          └── ... อื่น ๆ
```

---

## 🎯 Token Purposes

### 🐱 Adoption (รับน้องไปเลี้ยง)

ผู้สร้าง Token กำหนด:

| Property | Description |
|----------|-------------|
| **Purpose** | Adoption |
| **Visibility** | ข้อมูลอะไรที่ผู้รับสามารถดูได้ |
| **Verification** | ต้องยืนยันตัวตนหรือไม่ |
| **Usage Limit** | Token ใช้ได้กี่ครั้ง |
| **Expiration** | หมดอายุเมื่อใด |

**Flow:**
```
ผู้สแกน → ระบบรู้ว่าเป็น Adoption Flow → เปิดขั้นตอนรับน้อง
```

---

### 👨‍👩‍👧 Household Invitation (เพื่อนเข้าร่วมเป็นสมาชิกในบ้าน)

QR ถูกสร้างโดยเจ้าของบ้าน:

| Property | Description |
|----------|-------------|
| **Purpose** | Household Invitation |
| **Role** | Member (หรือ role อื่น) |
| **Expiration** | 24h (หรือตามที่กำหนด) |
| **Permission** | ตามที่เจ้าของกำหนด |

**Flow:**
```
สแกนแล้ว → เข้าสู่ Join Household Flow
```

---

### 🩺 Veterinary Access (สัตวแพทย์ดึงข้อมูลการรักษา)

QR จากเจ้าของ/ระบบที่ได้รับอนุญาต:

| Property | Description |
|----------|-------------|
| **Purpose** | Veterinary Access |
| **Scope** | Medical Records |
| **Access** | Read Only |
| **Expiration** | ตามเงื่อนไข |

**Flow:**
```
Vet สแกน → ระบบไม่ได้ให้สิทธิ์ทั้งหมด
         → เปิดเฉพาะข้อมูลที่ Token อนุญาต
```

---

### 🏆 Contest Registration (กองประกวดรับลงทะเบียน)

QR ของงานประกวด:

| Property | Description |
|----------|-------------|
| **Purpose** | Contest Registration |
| **Event** | XXX (ชื่องาน) |
| **Action** | Register |
| **Conditions** | ตามกติกาของงาน |

**Flow:**
```
สแกน → เปิด Registration Flow ของงานนั้น
```

---

## 🏗️ Token Structure

```json
{
  "token_id": "uuid",
  "purpose": "adoption | household_invitation | vet_access | contest_registration",
  "created_by": "user_id",
  "permissions": {
    "scope": ["profile", "medical", "journey"],
    "access_level": "read | write | admin",
    "target_entity": "pet_id | home_id | event_id"
  },
  "conditions": {
    "requires_verification": true,
    "usage_limit": 1,
    "expires_at": "2026-09-08T00:00:00Z",
    "allowed_users": ["user_id1", "user_id2"]
  },
  "metadata": {
    "pet_name": "ชื่อสัตว์เลี้ยง",
    "home_name": "ชื่อบ้าน",
    "event_name": "ชื่องานประกวด"
  }
}
```

---

## 🔐 Security Model

### Permission Layers

```
┌─────────────────────────────────────────┐
│  Layer 1: Token Validity               │
│  - Is token expired?                   │
│  - Is usage limit reached?             │
│  - Is token revoked?                   │
├─────────────────────────────────────────┤
│  Layer 2: Purpose Matching             │
│  - Does scan context match purpose?    │
│  - Is user eligible for this purpose?  │
├─────────────────────────────────────────┤
│  Layer 3: Permission Scope             │
│  - What data can be accessed?          │
│  - What actions are allowed?           │
├─────────────────────────────────────────┤
│  Layer 4: Condition Enforcement        │
│  - Verification required?              │
│  - Time-based restrictions?            │
│  - User-based restrictions?            │
└─────────────────────────────────────────┘
```

### Access Control Matrix

| Purpose | Profile | Medical | Journey | Actions |
|---------|---------|---------|---------|---------|
| **Adoption** | ✅ Read | ❌ | ❌ | Adopt |
| **Household** | ✅ Read | ✅ If owner | ✅ If owner | View/Edit |
| **Vet Access** | ✅ Read | ✅ Read | ❌ | View only |
| **Contest** | ✅ Read | ❌ | ✅ If required | Register |

---

## 📱 QR Scanner Integration

### Scan Flow

```
1. User taps "สแกน QR" in Bottom Nav
   ↓
2. Camera opens with QR scanner
   ↓
3. QR code detected → Decode token
   ↓
4. Token validated (Layer 1-4)
   ↓
5. Purpose determined
   ↓
6. Redirect to appropriate flow
   ↓
7. User completes action
```

### Error Handling

| Error | Message | Action |
|-------|---------|--------|
| **Invalid Token** | QR ไม่ถูกต้อง | แสดง error, กลับหน้าหลัก |
| **Expired Token** | QR หมดอายุแล้ว | แสดง error, แจ้งผู้สร้าง Token |
| **Usage Limit** | ใช้ QR นี้ครบจำนวนแล้ว | แสดง error, แจ้งผู้สร้าง Token |
| **Permission Denied** | ไม่มีสิทธิ์เข้าถึง | แสดง error, แจ้งสิทธิ์ที่มี |
| **Verification Required** | ต้องยืนยันตัวตนก่อน | เปิด verification flow |

---

## 🎨 UI Components

### Bottom Nav — QR Scanner Button

```
┌─────────────────────────────────────────┐
│  ───────────────────────────────────────│
│      ＋ เพิ่มสมาชิก          ⌁ สแกน QR  │
└─────────────────────────────────────────┘
```

**Icon:** QR scanner icon (.rectangles with scan line)  
**Action:** Opens camera with QR scanner  
**Style:** Minimal, translucent glass (matches design spec)

### Scanner Modal

```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │      📷 Camera View             │    │
│  │                                 │    │
│  │      ┌─────────────┐           │    │
│  │      │  QR Target  │           │    │
│  │      └─────────────┘           │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│      สแกน QR Code ของ Meow World       │
│                                         │
│      [  ยกเลิก  ]                       │
└─────────────────────────────────────────┘
```

---

## 🔗 Existing Implementation

| File | Description |
|------|-------------|
| `src/app/api/tokens/validate/route.ts` | **Token Validation API** — 4-layer security check |
| `src/lib/token-validation.ts` | Client-side validation helper + QR parser |
| `src/app/adopt/[token]/page.tsx` | Adoption flow (uses validation API) |
| `src/components/qr/QRScannerModal.tsx` | QR Scanner modal (validates before navigate) |
| `src/components/qr/QRGenerator.tsx` | QR code generator |
| `src/components/qr/TokenList.tsx` | Token management list |
| `src/components/home/QRInviteModal.tsx` | QR invite for household |

---

## 🔌 API Reference

### POST `/api/tokens/validate`

Validate a QR token against the 4-layer security model.

**Request:**
```json
{
  "token": "uuid-string",
  "user_id": "optional-user-uuid"
}
```

**Response (valid):**
```json
{
  "valid": true,
  "token": {
    "id": "uuid",
    "context": "adoption",
    "message": "Come adopt this cat!",
    "created_at": "2026-09-01T...",
    "expires_at": "2026-09-08T...",
    "sender": { "id": "uuid", "display_name": "Owner" },
    "pet": { "id": "uuid", "name": "Mochi", "species": "cat", ... }
  },
  "permissions": {
    "scopes": ["pet_profile"],
    "access_level": "read",
    "actions": ["adopt_pet"]
  }
}
```

**Response (invalid):**
```json
{
  "valid": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Token has expired",
    "layer": 1,
    "message_th": "QR Token หมดอายุแล้ว"
  }
}
```

**Error Codes:**

| Code | Layer | Thai Message |
|------|-------|-------------|
| `TOKEN_NOT_FOUND` | 1 | QR Token ไม่ถูกต้อง หรือไม่มีอยู่ในระบบ |
| `TOKEN_ALREADY_USED` | 1 | QR Token นี้ถูกใช้ไปแล้ว |
| `TOKEN_EXPIRED` | 1 | QR Token หมดอายุแล้ว |
| `UNKNOWN_CONTEXT` | 2 | ประเภท QR Token ไม่รู้จัก |
| `NO_PERMISSIONS` | 3 | ไม่พบการกำหนดสิทธิ์สำหรับ QR Token นี้ |
| `SELF_ACTION_FORBIDDEN` | 4 | คุณไม่สามารถ adopt สัตว์ของตัวเองได้ |

---

## 🚀 Future Enhancements

### Phase 1 (Current)

- [x] Token Validation API (4-layer security)
- [x] Client-side validation helper
- [x] QR Scanner modal with validation
- [x] Adopt page using validation API

### Phase 2: Advanced Token Features

- [ ] Token Templates (predefined purposes)
- [ ] Batch Token Generation
- [ ] Token Analytics (scan count, conversion)
- [ ] Dynamic QR (token can be updated)
- [ ] Purpose-based Router (auto-route by context)

### Phase 3: Ecosystem Integration

- [ ] Vet Clinic Integration
- [ ] Contest Platform Integration
- [ ] Pet Store Integration
- [ ] Insurance Provider Integration

---

## 🔗 Related Documents

| Document | Description |
|----------|-------------|
| `docs/MEOW_PASSPORT_DESIGN_SPEC.md` | Meow Passport — Identity Record that grows with the cat |
| `docs/WELCOME_ENTRY_SCREEN_DESIGN_SPEC.md` | Welcome Entry Screen design specification |

---

## 📝 Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-09-01 | 1.0 | Initial design specification document |
| 2026-09-01 | 1.0 | Implemented basic adoption flow |
| 2026-09-01 | 1.1 | Added Token Validation API (4-layer security), client-side helper, updated adopt page & scanner |
