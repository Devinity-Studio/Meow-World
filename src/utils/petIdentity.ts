/**
 * 🐾 Pet Identity Domain — Breed / Color / Pattern / Lineage (Task §1–§11)
 *
 * หลักยึด: "มีข้อมูลให้ แต่ไม่ตัดสิน" · "จงสร้าง Input จากความหมายของข้อมูล"
 *
 * ชั้นความรับผิดชอบของ module นี้ (Domain → Data Contract):
 *   1. Vocabulary — stable keys ไม่ผูกภาษา + localized labels แยกชั้น
 *   2. Legacy adapter — อ่านข้อมูลเดิม (pets.breed / pets.color free text) ได้ครบ
 *      โดยไม่ตัดสินและไม่แปลงข้อมูลเดิมเป็นข้อมูลใหม่ (no backfill ทางอ้อม)
 *   3. Derived data — color_count คำนวณจาก colors เสมอ ห้ามเป็น input
 *   4. Pattern compatibility — filter เฉพาะสิ่งที่ Domain รู้แน่ว่าขัดกัน
 *      (over-selection ขัดกับ exact-count pattern) — ไม่เดา ไม่ "น่าจะเป็น"
 *   5. Boundary semantics — เหมือน pattern เดิมของ normalizePatternValue:
 *      normalize ที่ app boundary + literal vocab เดียวกับ DB CHECK (migration
 *      20260927100000) — vocab ผูกกันด้วย drift-guard test ไม่ใช่ด้วยความหวัง
 *   6. Status transition — ห้าม silently delete: เปลี่ยน breed_status แล้ว
 *      ข้อมูลเดิมคงอยู่ใน state เสมอ (transitionBreedStatus คืนของเดิมครบ)
 *
 * Lineage: father_id/mother_id บอกที่มา — ตัวลูกบอกตัวตนของมันเอง (§7)
 * module นี้ไม่มีฟังก์ชัน derive breed/color จาก parent แม้แต่ตัวเดียว
 */

// ─── Locale ──────────────────────────────────────────────────────────────────

export type Locale = 'th' | 'en';

export interface LocalizedLabel {
  th: string;
  en: string;
}

/** Display label ตาม locale — stable key ไม่มีวันเปลี่ยนตามภาษา (§12.13–14) */
export function labelOf(label: LocalizedLabel, locale: Locale = 'th'): string {
  return label[locale];
}

// ─── Breed vocabulary (§1) — stable keys, literal mirror ของ DB CHECK ────────

export const BREED_KEYS = [
  'persian',
  'scottish_fold',
  'british_shorthair',
  'khao_manee',
  'wichianmat',
  'korat',
  'thai_native',
  'other',
] as const;

export type BreedKey = (typeof BREED_KEYS)[number];

export interface BreedOption {
  key: BreedKey;
  label: LocalizedLabel;
}

export const BREED_VOCABULARY: BreedOption[] = [
  { key: 'persian', label: { th: 'ไทยเปอร์เซีย', en: 'Persian' } },
  { key: 'scottish_fold', label: { th: 'สก็อตติช โฟลด์', en: 'Scottish Fold' } },
  { key: 'british_shorthair', label: { th: 'บริติช ช็อตแฮร์', en: 'British Shorthair' } },
  { key: 'khao_manee', label: { th: 'ขาวมณี', en: 'Khao Manee' } },
  { key: 'wichianmat', label: { th: 'วิเชียรมาศ', en: 'Wichianmat' } },
  // Semantic Correction (2026-09-28): สีสวาด = ชื่อไทยของโคราช — แยกสี/ลายออกจาก breed
  { key: 'korat', label: { th: 'โคราช (สีสวาด)', en: 'Korat' } },
  { key: 'thai_native', label: { th: 'ไทยพื้นบ้าน', en: 'Thai Native' } },
  { key: 'other', label: { th: 'อื่น ๆ', en: 'Other' } },
];

/** เพิ่มตัวเลือก §1: สถานะพันธุ์ 3 ค่า — NULL = ยังไม่ระบุ (ไม่ตัดสินให้) */
export const BREED_STATUS_KEYS = ['purebred', 'mixed', 'unknown'] as const;

export type BreedStatus = (typeof BREED_STATUS_KEYS)[number];

export interface BreedStatusOption {
  key: BreedStatus;
  label: LocalizedLabel;
}

export const BREED_STATUS_OPTIONS: BreedStatusOption[] = [
  { key: 'purebred', label: { th: 'พันธุ์แท้', en: 'Purebred' } },
  { key: 'mixed', label: { th: 'พันธุ์ผสม', en: 'Mixed' } },
  { key: 'unknown', label: { th: 'ไม่สามารถระบุได้', en: 'Unknown' } },
];

// ─── Color vocabulary (§3) — สีจริงเท่านั้น ห้ามปน pattern words ─────────────

export const COLOR_KEYS = [
  'orange',
  'white',
  'black',
  'gray',
  'brown',
  'cream',
  'blue',
] as const;

export type ColorKey = (typeof COLOR_KEYS)[number];

export interface ColorOption {
  key: ColorKey;
  label: LocalizedLabel;
}

export const COLOR_VOCABULARY: ColorOption[] = [
  { key: 'orange', label: { th: 'ส้ม', en: 'Orange' } },
  { key: 'white', label: { th: 'ขาว', en: 'White' } },
  { key: 'black', label: { th: 'ดำ', en: 'Black' } },
  { key: 'gray', label: { th: 'เทา', en: 'Gray' } },
  { key: 'brown', label: { th: 'น้ำตาล', en: 'Brown' } },
  { key: 'cream', label: { th: 'ครีม', en: 'Cream' } },
  { key: 'blue', label: { th: 'ฟ้า', en: 'Blue' } },
];

// ─── Pattern vocabulary (§4) — semantic แยกจาก Color เด็ดขาด ─────────────────
// Mirror ของ CHECK pets_color_pattern_allowed (migration 20260926100000)

export const PATTERN_KEYS = [
  'solid',
  'bicolor',
  'tricolor',
  'tabby',
  'calico',
  'tortoiseshell',
  'tuxedo',
  'pointed',
  'other',
] as const;

export type PatternKey = (typeof PATTERN_KEYS)[number];

export interface PatternOption {
  key: PatternKey;
  label: LocalizedLabel;
}

export const PATTERN_VOCABULARY: PatternOption[] = [
  { key: 'solid', label: { th: 'สีเดียว', en: 'Solid' } },
  { key: 'bicolor', label: { th: 'สองสี', en: 'Bicolor' } },
  { key: 'tricolor', label: { th: 'สามสี', en: 'Tricolor' } },
  { key: 'tabby', label: { th: 'ลายสลิด / ลายเสือ', en: 'Tabby' } },
  { key: 'calico', label: { th: 'สามสีลายจุด (calico)', en: 'Calico' } },
  { key: 'tortoiseshell', label: { th: 'ส้มดำปน (tortie)', en: 'Tortoiseshell' } },
  { key: 'tuxedo', label: { th: 'สูททักซิโด้', en: 'Tuxedo' } },
  { key: 'pointed', label: { th: 'ปลายสีเข้ม (วิเชียรมาศ)', en: 'Colorpoint' } },
  { key: 'other', label: { th: 'อื่น ๆ', en: 'Other' } },
];

// ─── Derived data (§3) — color_count คำนวณเสมอ ไม่มี input ───────────────────

/** Derived display label — 0 → '' · 1 → 'สีเดียว' · N → 'N สี' (สูตรเดิมจาก petFormOptions) */
export function colorCountLabel(colors: string[] | null | undefined): string {
  const n = colors?.length ?? 0;
  if (n === 0) return '';
  if (n === 1) return 'สีเดียว';
  return `${n} สี`;
}

/** จำนวนสีเป็นตัวเลขดิบ — ไว้แสดงหรือใช้ใน compatibility เท่านั้น */
export function colorCount(colors: string[] | null | undefined): number {
  return colors?.length ?? 0;
}

// ─── Pattern Compatibility (§5) — Assist, not decide ─────────────────────────
//
// Conservative rule — filter เฉพาะทิศทางเดียวที่ deterministic:
//   "สีที่สังเกตได้ มากกว่าจำนวนสีที่ pattern ให้ได้" = ขัดแน่นอน
//     solid (ให้ได้ 1 สี)     → ขัดเมื่อเลือก ≥ 2 สี
//     bicolor (ให้ได้ 2 สี)   → ขัดเมื่อเลือก ≥ 3 สี
//     tricolor (ให้ได้ 3 สี)  → ขัดเมื่อเลือก ≥ 4 สี
//   ทิศตรงข้าม (เลือกสีน้อยกว่าที่ pattern ต้องการ) ไม่กรอง — เพราะการเลือกสี
//   ขาดได้ (under-selection) เป็นไปได้เสมอ ระบบไม่รู้ว่ารายการสี "ครบแล้ว"
//   (จำนวนสี ≠ รูปแบบลาย — §4)
//
// Return null = ไม่มีการ filter (colors ยังว่าง) — field คงตัวเลือกครบทุก key

export function availablePatterns(
  colors: string[] | null | undefined
): PatternOption[] | null {
  const n = colors?.length ?? 0;
  if (n === 0) return null;

  const maxColorsFor: Partial<Record<PatternKey, number>> = {
    solid: 1,
    bicolor: 2,
    tricolor: 3,
  };

  return PATTERN_VOCABULARY.filter((p) => {
    const max = maxColorsFor[p.key];
    return max === undefined || n <= max;
  });
}

// ─── Breed Status semantics (§9) — requirement ต่อสถานะ ──────────────────────

export interface BreedRequirement {
  /** จำนวน breed_ids ขั้นต่ำที่สถานะนี้ยอมรับ */
  min: number;
  /** จำนวนสูงสุด (null = ไม่จำกัด) — mixed เลือก 0..N ได้ (clarification #2) */
  max: number | null;
}

export function breedRequirement(status: BreedStatus | null): BreedRequirement {
  switch (status) {
    case 'purebred':
      return { min: 1, max: 1 };
    case 'mixed':
      return { min: 0, max: null }; // 0 known breeds = "ผสมแต่ไม่รู้ผสมอะไร" — ข้อมูลจริง
    case 'unknown':
      return { min: 0, max: 0 };
    default:
      return { min: 0, max: null }; // ยังไม่ระบุสถานะ — ยังเลือกไม่ได้จนกว่าจะเลือกสถานะ
  }
}

/**
 * §9 — เปลี่ยนสถานะแล้วข้อมูลเดิมไม่ถูกลบโดยเงียบ ๆ
 * ฟังก์ชันนี้เป็น "หลักฐานเชิงโครงสร้าง" ว่า transition ไม่ mutate อะไรเลย:
 * คืน state เดิมครบทุก field (breed_ids, dominant_breed_id) — การกันค่าหลุด
 * ออกจาก payload เป็นหน้าที่ของ boundary (unknown → null) + UX ที่บอกผู้ใช้
 * อย่างชัดเจนว่า "รายการที่เลือกไว้จะไม่ถูกบันทึกขณะสถานะนี้" (แจ้ง ไม่ลบเงียบ)
 */
export interface BreedSelectionState {
  breed_ids: string[];
  dominant_breed_id: string | null;
}

export function transitionBreedStatus(
  state: BreedSelectionState,
  _next: BreedStatus | null
): BreedSelectionState {
  // Preserve everything — ห้าม silently delete (task §9)
  return {
    breed_ids: [...state.breed_ids],
    dominant_breed_id: state.dominant_breed_id,
  };
}

// ─── Boundary normalization — mirror ของ DB CHECK (§12.1–3) ──────────────────

export type VocabularyResult =
  | { invalid: false; value: string | null }
  | { invalid: true; reason: string };

export type VocabularyListResult =
  | { invalid: false; value: string[] | null }
  | { invalid: true; reason: string };

export function normalizeBreedStatus(
  raw: string | null | undefined
): BreedStatus | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return (BREED_STATUS_KEYS as readonly string[]).includes(trimmed)
    ? (trimmed as BreedStatus)
    : null;
}

/** Pattern key → null ได้ (optional) · key นอก vocab → invalid (DB CHECK จะ reject เหมือนกัน) */
export function normalizePatternKey(raw: string | null | undefined): VocabularyResult {
  const trimmed = raw?.trim() || null;
  if (trimmed === null) return { invalid: false, value: null };
  if ((PATTERN_KEYS as readonly string[]).includes(trimmed)) {
    return { invalid: false, value: trimmed };
  }
  return {
    invalid: true,
    reason: `ลักษณะสีไม่อยู่ในรายการที่ระบบรองรับ (id: ${trimmed})`,
  };
}

/** Color list — ทุก key ต้องอยู่ใน vocab (อ่านง่าย: '' whitespace รายการใด ๆ ถือว่าไม่ได้เลือก) */
export function normalizeColorList(
  raw: string[] | null | undefined
): VocabularyListResult {
  const cleaned = (raw ?? [])
    .map((c) => (typeof c === 'string' ? c.trim() : ''))
    .filter(Boolean);
  if (cleaned.length === 0) return { invalid: false, value: null };
  const bad = cleaned.find((c) => !(COLOR_KEYS as readonly string[]).includes(c));
  if (bad) {
    return {
      invalid: true,
      reason: `สีไม่อยู่ในรายการที่ระบบรองรับ (id: ${bad})`,
    };
  }
  return { invalid: false, value: cleaned };
}

/** Single breed key (dominant_breed_id / purebred เลือกเดี่ยว) */
export function normalizeBreedKey(raw: string | null | undefined): VocabularyResult {
  const trimmed = raw?.trim() || null;
  if (trimmed === null) return { invalid: false, value: null };
  if ((BREED_KEYS as readonly string[]).includes(trimmed)) {
    return { invalid: false, value: trimmed };
  }
  return {
    invalid: true,
    reason: `สายพันธุ์ไม่อยู่ในรายการที่ระบบรองรับ (id: ${trimmed})`,
  };
}

/**
 * breed_ids × breed_status — shape เดียวกับ CHECK pets_breed_status_shape:
 *   purebred → exactly 1 · unknown → 0 · mixed → 0..N (free)
 * คืน null เมื่อรายการว่าง (optional) — ยกเว้น purebred ที่ต้องมีพอดี 1
 */
export function normalizeBreedIdList(
  raw: string[] | null | undefined,
  status: BreedStatus | null
): VocabularyListResult {
  const cleaned = (raw ?? [])
    .map((b) => (typeof b === 'string' ? b.trim() : ''))
    .filter(Boolean);
  const bad = cleaned.find((b) => !(BREED_KEYS as readonly string[]).includes(b));
  if (bad) {
    return {
      invalid: true,
      reason: `สายพันธุ์ไม่อยู่ในรายการที่ระบบรองรับ (id: ${bad})`,
    };
  }

  if (status === 'purebred') {
    if (cleaned.length !== 1) {
      return {
        invalid: true,
        reason: 'พันธุ์แท้ต้องเลือกสายพันธุ์พอดี 1 รายการ',
      };
    }
    return { invalid: false, value: cleaned };
  }

  if (status === 'unknown') {
    if (cleaned.length > 0) {
      return {
        invalid: true,
        reason: 'สถานะ "ไม่สามารถระบุได้" ต้องไม่มีรายการสายพันธุ์',
      };
    }
    return { invalid: false, value: null };
  }

  // mixed หรือยังไม่ระบุ — 0..N
  if (cleaned.length === 0) return { invalid: false, value: null };
  return { invalid: false, value: cleaned };
}

// ─── Legacy adapter (§16) — ข้อมูลเดิมอ่านได้ ไม่ตัดสิน ไม่แปลงเป็นข้อมูลใหม่ ──

/** 'ส้ม' → 'orange' — token นอกตาราง → null (ผู้อ่านเลือกแสดง raw เอง) */
export function legacyColorToKey(word: string): ColorKey | null {
  const found = COLOR_VOCABULARY.find((c) => c.label.th === word.trim());
  return found ? found.key : null;
}

/**
 * อ่าน pets.color เดิม ("ส้ม ขาว") → tokens: key ที่รู้ + token ดิบที่ไม่รู้
 * ไม่ตัด token แปลก ๆ ทิ้ง — ข้อมูลเดิมต้องแสดงได้ครบตามที่มันเป็น (§12.16)
 */
export function legacyColorTokens(
  stored: string | null | undefined
): string[] {
  if (!stored) return [];
  return stored
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => legacyColorToKey(word) ?? word);
}

/**
 * อ่าน identity ของ pet จากแถวจริง (คอลัมน์ใหม่ + คอลัมน์ legacy)
 * - คอลัมน์ใหม่เป็น null ได้ = ยังไม่ระบุ — ห้ามเดา/derive ให้ (§11)
 * - legacyBreed = free text เดิม แสดงได้ต่อ (ไม่ map กลับเข้า key space)
 */
export interface PetIdentityRead {
  breed_status: BreedStatus | null;
  breed_ids: string[];
  dominant_breed_id: string | null;
  colors: string[];
  color_pattern: string | null;
  /** legacy free text — คงอยู่และแสดงได้ต่อ ไม่ map เป็น key */
  legacyBreed: string | null;
  /** legacy space-joined color text ("ส้ม ขาว") — คงอยู่และแสดงได้ต่อ */
  legacyColor: string | null;
}

export function readPetIdentity(pet: {
  breed_status?: string | null;
  breed_ids?: string[] | null;
  dominant_breed_id?: string | null;
  colors?: string[] | null;
  color_pattern?: string | null;
  breed?: string | null;
  color?: string | null;
}): PetIdentityRead {
  return {
    breed_status: normalizeBreedStatus(pet.breed_status ?? null),
    breed_ids: (pet.breed_ids ?? []).filter(Boolean),
    dominant_breed_id: pet.dominant_breed_id ?? null,
    colors: (pet.colors ?? []).filter(Boolean),
    color_pattern: pet.color_pattern ?? null,
    legacyBreed: pet.breed ?? null,
    legacyColor: pet.color ?? null,
  };
}

// ─── Display helpers (§14 — label ตาม locale, key ไม่เปลี่ยน) ────────────────

export function breedStatusLabel(status: BreedStatus | null, locale: Locale = 'th'): string | null {
  if (!status) return null;
  const opt = BREED_STATUS_OPTIONS.find((s) => s.key === status);
  return opt ? labelOf(opt.label, locale) : null;
}

export function breedLabels(ids: string[], locale: Locale = 'th'): string[] {
  return ids.map((id) => {
    const opt = BREED_VOCABULARY.find((b) => b.key === id);
    return opt ? labelOf(opt.label, locale) : id; // key นอก vocab → แสดง raw (ไม่เดา)
  });
}

export function colorLabels(colors: string[], locale: Locale = 'th'): string[] {
  return colors.map((c) => {
    const opt = COLOR_VOCABULARY.find((x) => x.key === c);
    return opt ? labelOf(opt.label, locale) : c;
  });
}

export function patternLabel(pattern: string | null, locale: Locale = 'th'): string | null {
  if (!pattern) return null;
  const opt = PATTERN_VOCABULARY.find((p) => p.key === pattern);
  return opt ? labelOf(opt.label, locale) : pattern;
}

// ─── Birth wizard (§7) — ลูกบอกตัวตนของมันเอง ไม่มีการสืบทอด ─────────────────

/**
 * Payload fields ของลูกแต่งานเกิด — pass-through เท่านั้น:
 * ไม่มีพารามิเตอร์ parent แม้แต่ตัวเดียว (type system บังคับว่า derive จาก
 * แม่/พ่อไม่ได้) — breed/color ของลูกเป็น legacy free text ตาม reference slice
 * จนกว่า Birth Wizard จะมี slice ของตัวเองยกระดับเป็น structured keys
 */
export function babyIdentityFields(baby: {
  breed?: string | null;
  color?: string | null;
}): { breed: string | null; color: string | null } {
  return {
    breed: baby.breed?.trim() || null,
    color: baby.color?.trim() || null,
  };
}
