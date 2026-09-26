# 🐱 Meow Passport — Design Specification

**App:** MEOW WORLD  
**Version:** Heart Edition  
**Date:** 2026-09-01  
**Branch:** `qwen-prototype-v0`  
**Status:** ✅ Implemented (Basic Identity)

---

## 📐 Concept

> **Meow Passport ไม่ใช่แบบฟอร์มที่ต้องกรอกให้ครบ**  
> **แต่เป็น Identity Record ที่ค่อย ๆ เติบโตไปพร้อมกับชีวิตของเจ้าเหมียว**

Meow Passport คือ **Living Document** ที่เติบโตไปพร้อมกับสัตว์เลี้ยง ไม่ใช่ Form ที่ต้องกรอกให้ครบในครั้งเดียว

---

## 🌱 Growth Model

### Day 1: Minimal Identity

```
Meow Passport
├── Identity
│   ├── Name
│   └── Basic identity (species, breed, birthday)
│
└── Created
```

### Later: Progressive Growth

```
Meow Passport
├── Identity
│   ├── Name
│   ├── Basic identity
│   └── Photos
│
├── Profile
│   ├── Personality
│   ├── Habits
│   └── Preferences
│
├── Family / Household
│   ├── Owner(s)
│   ├── Members
│   └── Relationships
│
├── Medical
│   ├── Health records
│   ├── Conditions
│   └── Allergies
│
├── Vaccination
│   ├── Vaccines
│   ├── Schedule
│   └── Certificates
│
├── Nutrition
│   ├── Diet
│   ├── Feeding schedule
│   └── Preferences
│
├── Behavior
│   ├── Training
│   ├── Socialization
│   └── Notes
│
├── Adoption History
│   ├── Previous homes
│   ├── Shelter records
│   └── Transfer history
│
├── Contest / Achievement
│   ├── Registrations
│   ├── Awards
│   └── Certificates
│
└── Life Journey
    ├── Timeline events
    ├── Milestones
    └── Memories
```

---

## 🔑 Key Principles

### 1. ไม่บังคับให้ทุก Section ต้องมีข้อมูล

```typescript
interface PassportSection {
  id: string;
  name: string;
  data: Record<string, any>;
  isComplete: boolean;  // ไม่บังคับ
  lastUpdated: Date;
}
```

ข้อมูลบางอย่างอาจยังไม่มีวันนี้ แต่สามารถถูกเติมเข้ามาในอนาคต

### 2. ข้อมูลมาจากหลายแหล่ง

```
Owner
   ↓
Vet
   ↓
Breeder
   ↓
Shelter
   ↓
Contest
   ↓
Meow World Events
   ↓
        Meow Passport
```

### 3. แต่ละข้อมูลมี Metadata กำกับ

```typescript
interface PassportRecord {
  id: string;
  section: string;
  data: Record<string, any>;
  
  // Metadata
  source: 'owner' | 'vet' | 'breeder' | 'shelter' | 'contest' | 'system';
  issuer?: string;        // ใครเป็นผู้ให้ข้อมูล
  timestamp: Date;        // เมื่อไหร่
  permission: Permission; // สิทธิ์การเข้าถึง
  trustContext: TrustLevel; // ความน่าเชื่อถือ
}
```

---

## 🔐 Permission Model

### Access Levels

| Level | Description | Example |
|-------|-------------|---------|
| **Owner** | เข้าถึงทุกอย่าง | เจ้าของ |
| **Family** | เข้าถึงบางส่วน | สมาชิกในบ้าน |
| **Vet** | เข้าถึง medical เท่านั้น | สัตวแพทย์ |
| **Public** | เข้าถึง profile เท่านั้น | สาธารณะ |

### Trust Levels

| Level | Description | Source |
|-------|-------------|--------|
| **Verified** | ข้อมูลที่ยืนยันแล้ว | Vet, Official records |
| **Self-reported** | ข้อมูลที่เจ้าของกรอก | Owner |
| **Imported** | ข้อมูลที่นำเข้าจากภายนอก | QR token |
| **System** | ข้อมูลที่ระบบสร้าง | Meow World |

---

## 🔗 QR Token Integration

### QR = Channel for Adding Authorized Data

QR ไม่ได้แค่พาไปหน้าใดหน้าหนึ่ง  
แต่มันสามารถเป็นช่องทางที่ทำให้เกิด:

> **"เพิ่มข้อมูลที่ได้รับอนุญาตเข้าไปใน Meow Passport"**

### Use Cases

| QR Source | Action | Data Added |
|-----------|--------|------------|
| 🩺 **Vet สแกน** | เพิ่ม medical record | Medical records, vaccination |
| 🏆 **กองประกวดสแกน** | เพิ่ม contest record | Contest registration, awards |
| 🐱 **เจ้าของใหม่สแกน** | รับช่วง identity/history | Identity, history (permission-based) |
| 🏠 **Household สแกน** | เพิ่ม family member | Family/household data |
| 🏥 **Shelter สแกน** | นำเข้า adoption history | Previous records |

### Flow: QR → Passport Update

```
1. Source creates QR Token
   ↓
2. QR contains: Purpose + Permission + Scope
   ↓
3. User/Device scans QR
   ↓
4. System validates token
   ↓
5. Determines what data can be added
   ↓
6. Adds data to Meow Passport
   ↓
7. Data gets metadata (source, timestamp, permission)
   ↓
8. Passport grows incrementally
```

---

## 📊 Progressive Completeness

### Visual Indicators

```
┌─────────────────────────────────────────────────────────┐
│  🐱 Meow Passport — Mochi                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Identity      ✓ Complete                              │
│  Profile       ✓ Complete                              │
│  Medical       ○ 3/7 records                           │
│  Vaccination   ✓ Complete                              │
│  Nutrition     ○ Incomplete                            │
│  Behavior      — No data yet                           │
│  Journey       ✓ 12 events                             │
│                                                         │
│  ───────────────────────────────────────────────        │
│  Overall: ████████████░░░░░░░░  60%                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Indicators

| Symbol | Meaning |
|--------|---------|
| ✓ | Complete |
| ○ | Partial (show count) |
| — | No data yet |

---

## 🏗️ Data Structure

### Passport Schema

```typescript
interface MeowPassport {
  id: string;
  pet_id: string;
  home_id: string;
  
  // Core Identity (always present)
  identity: {
    name: string;
    species: string;
    breed?: string;
    birthday?: Date;
    gender?: 'male' | 'female' | 'unknown';
    avatar_url?: string;
  };
  
  // Progressive Sections
  sections: PassportSection[];
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  completeness: number; // 0-100%
}

interface PassportSection {
  id: string;
  name: string;
  type: 'identity' | 'profile' | 'medical' | 'vaccination' | 
        'nutrition' | 'behavior' | 'adoption' | 'contest' | 'journey';
  
  records: PassportRecord[];
  
  // Completeness
  isComplete: boolean;
  requiredFields: string[];
  completedFields: string[];
}

interface PassportRecord {
  id: string;
  section_id: string;
  
  // Data
  data: Record<string, any>;
  
  // Metadata
  source: DataSource;
  issuer?: string;
  issuer_id?: string;
  timestamp: Date;
  permission: PermissionLevel;
  trust: TrustLevel;
  
  // QR Reference (if imported via QR)
  qr_token_id?: string;
  qr_purpose?: string;
}
```

---

## 🎨 UI Components

### Passport Card (List View)

```
┌─────────────────────────────────────────┐
│  🐱 Mochi                    ✓ 85%     │
│  Persian • Female • 2 years            │
│                                         │
│  ┌─────┬─────┬─────┬─────┐             │
│  │ ✓   │ ✓   │ ○   │ ✓   │             │
│  │ ID  │ Med │ Vac │ Jny │             │
│  └─────┴─────┴─────┴─────┘             │
└─────────────────────────────────────────┘
```

### Passport Detail (Full View)

```
┌─────────────────────────────────────────┐
│  ← Back                    Edit │ More │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │         🐱 Avatar              │    │
│  │                                 │    │
│  │     Mochi                       │    │
│  │     Persian • Female            │    │
│  │     Born: Jan 2024              │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─── Sections ──────────────────────── │
│                                         │
│  ✓ Identity          3 records         │
│  ✓ Profile           5 records         │
│  ○ Medical           3/7 records       │
│  ✓ Vaccination       4 records         │
│  ○ Nutrition         1/3 records       │
│  — Behavior          No data yet       │
│  ✓ Journey           12 events         │
│                                         │
│  ─── Actions ────────────────────────  │
│                                         │
│  [ + Add Record ]  [ 🔳 Scan QR ]      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔗 Connection to QR System

### QR Token Purpose → Passport Section Mapping

| QR Purpose | Passport Section | Data Added |
|------------|------------------|------------|
| **Adoption** | Adoption History | Previous home, shelter records |
| **Vet Access** | Medical, Vaccination | Medical records, vaccination |
| **Contest** | Contest / Achievement | Registration, awards |
| **Household** | Family / Household | Member relationships |
| **Breeder** | Identity, Adoption History | Breeder info, lineage |

### Permission Flow

```
QR Token
    │
    ├── Purpose: Vet Access
    │   └── Permission: Write to Medical
    │       └── Scope: Medical Records Only
    │
    ├── Purpose: Contest
    │   └── Permission: Write to Contest
    │       └── Scope: This Event Only
    │
    └── Purpose: Adoption
        └── Permission: Read Identity + History
            └── Scope: Permission-based
```

---

## 📱 Integration Points

### Existing Components

| Component | File | Description |
|-----------|------|-------------|
| **PassportView** | `src/components/passport/PassportView.tsx` | Full passport view |
| **ProgressivePassport** | `src/components/passport/ProgressivePassport.tsx` | Progressive completeness |
| **AddPetModal** | `src/components/passport/AddPetModal.tsx` | Add new pet |
| **QRViewerModal** | `src/components/qr/QRViewerModal.tsx` | QR code viewer |

### New Components Needed

| Component | Description |
|-----------|-------------|
| **PassportSection** | Individual section view |
| **RecordCard** | Single record with metadata |
| **QRScanner** | Camera-based QR scanner |
| **ImportModal** | Import data from QR |
| **SourceBadge** | Show data source/issuer |

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Current)

- [x] Basic passport structure
- [x] Progressive completeness indicators
- [x] QR token viewer
- [ ] QR scanner integration

### Phase 2: Sections

- [ ] Medical section with records
- [ ] Vaccination section with schedule
- [ ] Nutrition section
- [ ] Behavior section

### Phase 3: QR Integration

- [ ] Vet QR → Medical record import
- [ ] Contest QR → Contest registration
- [ ] Household QR → Family member add
- [ ] Adoption QR → History import

### Phase 4: Advanced

- [ ] Source verification
- [ ] Trust scoring
- [ ] Data export
- [ ] sharing controls

---

## 📝 Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-09-01 | 1.0 | Initial design specification document |
| 2026-09-01 | 1.0 | Basic passport implemented |
