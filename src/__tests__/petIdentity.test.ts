import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  BREED_KEYS,
  BREED_STATUS_KEYS,
  BREED_STATUS_OPTIONS,
  BREED_VOCABULARY,
  COLOR_KEYS,
  COLOR_VOCABULARY,
  PATTERN_KEYS,
  PATTERN_VOCABULARY,
  availablePatterns,
  babyIdentityFields,
  breedLabels,
  breedRequirement,
  breedStatusLabel,
  colorCount,
  colorCountLabel,
  colorLabels,
  labelOf,
  legacyColorTokens,
  normalizeBreedIdList,
  normalizeBreedKey,
  normalizeBreedStatus,
  normalizeColorList,
  normalizePatternKey,
  patternLabel,
  readPetIdentity,
  transitionBreedStatus,
} from '@/utils/petIdentity';
import { toPetInsertPayload } from '@/components/pets/PetForm';
import { PetFormData } from '@/types/pet';

/**
 * Task §12 — Tests (17 points) + drift guard (clarification #1):
 * literal vocab in migration 20260927100000 must equal module vocab — ถ้าเพี้ยน
 * test ตาย ไม่ใช่ prod ตาย (เหมือน boundary test ชุด Pattern เดิม)
 */

function baseForm(overrides: Partial<PetFormData> = {}): PetFormData {
  return {
    name: 'น้องโมจิ',
    species: 'Cat',
    nickname: '',
    breed: '',
    breed_status: '',
    breed_ids: [],
    dominant_breed_id: '',
    gender: '',
    birth_date: '',
    color: '',
    colors: [],
    color_pattern: '',
    ...overrides,
  };
}

describe('§1 Breed vocabulary — stable keys + localized labels', () => {
  it('stable keys never change with locale (§12.13)', () => {
    expect(labelOf({ th: 'สก็อตติช โฟลด์', en: 'Scottish Fold' }, 'th')).toBe('สก็อตติช โฟลด์');
    expect(labelOf({ th: 'สก็อตติช โฟลด์', en: 'Scottish Fold' }, 'en')).toBe('Scottish Fold');
    expect(BREED_KEYS).toContain('scottish_fold');
    expect(BREED_KEYS).not.toContain('Scottish Fold');
  });

  it('every vocab entry has both th and en labels (§12.14)', () => {
    for (const b of BREED_VOCABULARY) {
      expect(b.label.th.length).toBeGreaterThan(0);
      expect(b.label.en.length).toBeGreaterThan(0);
    }
    for (const c of COLOR_VOCABULARY) {
      expect(c.label.th.length).toBeGreaterThan(0);
      expect(c.label.en.length).toBeGreaterThan(0);
    }
    for (const p of PATTERN_VOCABULARY) {
      expect(p.label.th.length).toBeGreaterThan(0);
      expect(p.label.en.length).toBeGreaterThan(0);
    }
    expect(BREED_STATUS_OPTIONS.map((s) => s.key)).toEqual(['purebred', 'mixed', 'unknown']);
  });

  it('breed vocabulary is UI-independent and extensible (§1)', () => {
    const keys = BREED_KEYS as readonly string[];
    expect(keys).toEqual(expect.arrayContaining(['persian', 'scottish_fold', 'british_shorthair']));
    expect(new Set(keys).size).toBe(keys.length); // no duplicate keys
  });
});

describe('§2 Dominant Appearance — owner observation, not derivation', () => {
  it('optional: empty passes as null; any vocab key passes (§12.4)', () => {
    expect(normalizeBreedKey('')).toEqual({ invalid: false, value: null });
    expect(normalizeBreedKey(undefined)).toEqual({ invalid: false, value: null });
    expect(normalizeBreedKey('scottish_fold')).toEqual({ invalid: false, value: 'scottish_fold' });
    // อ้างนอก Known Breeds ได้ (clarification #3) — ตราบใดที่อยู่ใน vocab
    expect(normalizeBreedKey('british_shorthair')).toEqual({ invalid: false, value: 'british_shorthair' });
  });
});

describe('§3 Colors — multi-select stable keys, count derived', () => {
  it('colors multi-select: keys pass, count derives from selection (§12.7, §12.8)', () => {
    const result = normalizeColorList(['orange', 'white', 'black']);
    expect(result).toEqual({ invalid: false, value: ['orange', 'white', 'black'] });
    expect(colorCount(['orange', 'white', 'black'])).toBe(3);
    expect(colorCountLabel(['orange', 'white', 'black'])).toBe('3 สี');
    expect(colorCountLabel(['orange'])).toBe('สีเดียว');
    expect(colorCountLabel([])).toBe('');
  });

  it('color count cannot be user-entered: payload has no color_count field (§12.9)', () => {
    const payload = toPetInsertPayload(
      baseForm({ colors: ['orange', 'white'] })
    );
    expect(payload).not.toHaveProperty('color_count');
    expect(payload.colors).toEqual(['orange', 'white']);
  });

  it('empty colors → null (optional), invalid key → rejected (§12.9 boundary)', () => {
    expect(normalizeColorList([])).toEqual({ invalid: false, value: null });
    expect(normalizeColorList(undefined)).toEqual({ invalid: false, value: null });
    expect(normalizeColorList(['orange', 'ส้ม'])).toEqual({
      invalid: true,
      reason: 'สีไม่อยู่ในรายการที่ระบบรองรับ (id: ส้ม)',
    });
  });
});

describe('§4 Pattern — separate semantic from Color', () => {
  it('pattern stored independently of colors (§12.10)', () => {
    const payload = toPetInsertPayload(
      baseForm({ colors: ['orange', 'white'], color_pattern: 'tabby' })
    );
    expect(payload.colors).toEqual(['orange', 'white']);
    expect(payload.color_pattern).toBe('tabby');
    expect('colors' in payload && 'color_pattern' in payload).toBe(true);
    expect('color_pattern_combined' in payload).toBe(false); // §6 — ห้ามรวม field เดียว
  });

  it('3 colors + tabby AND 3 colors + tricolor both valid (จำนวนสี ≠ รูปแบบลาย)', () => {
    expect(
      toPetInsertPayload(baseForm({ colors: ['orange', 'white', 'black'], color_pattern: 'tabby' })).color_pattern
    ).toBe('tabby');
    expect(
      toPetInsertPayload(baseForm({ colors: ['orange', 'white', 'black'], color_pattern: 'tricolor' })).color_pattern
    ).toBe('tricolor');
  });

  it('pattern key outside vocabulary → rejected (DB CHECK mirrors)', () => {
    expect(normalizePatternKey('สามสี')).toEqual({
      invalid: true,
      reason: 'ลักษณะสีไม่อยู่ในรายการที่ระบบรองรับ (id: สามสี)',
    });
  });
});

describe('§5 Pattern compatibility — assist, not decide (§12.12)', () => {
  it('filters only provably impossible: over-selection vs exact-count patterns', () => {
    // 2 colors: solid ขัดแน่ (ต้องการ ≤1), bicolor/tricolor/อื่น ๆ ยังได้
    expect(availablePatterns(['orange', 'white'])!.map((p) => p.key)).not.toContain('solid');
    expect(availablePatterns(['orange', 'white'])!.map((p) => p.key)).toContain('tricolor');
    // 3 colors: solid + bicolor ขัดแน่, tricolor ยังได้
    expect(availablePatterns(['orange', 'white', 'black'])!.map((p) => p.key)).toEqual(
      expect.arrayContaining(['tricolor', 'tabby', 'calico', 'tuxedo'])
    );
    expect(availablePatterns(['orange', 'white', 'black'])!.map((p) => p.key)).not.toContain('solid');
    expect(availablePatterns(['orange', 'white', 'black'])!.map((p) => p.key)).not.toContain('bicolor');
  });

  it('never narrows to a single answer: with colors, uncertain patterns always remain', () => {
    for (const n of [1, 2, 3, 4]) {
      const colors = COLOR_KEYS.slice(0, n) as unknown as string[];
      const keys = availablePatterns(colors)!.map((p) => p.key);
      // tabby/tortoiseshell/tuxedo/pointed/other ไม่มีวันถูกกรอง — ระบบไม่ตัดสินแทน
      expect(keys).toEqual(expect.arrayContaining(['tabby', 'other']));
      // over-selection เท่านั้นที่ถูกกรอง (n=1: solid ยัง valid — ถูกต้องตามกฎ)
      if (n >= 2) expect(keys).not.toContain('solid');
      if (n >= 3) expect(keys).not.toContain('bicolor');
    }
  });

  it('no colors → no filtering (null = คงตัวเลือกครบ)', () => {
    expect(availablePatterns([])).toBeNull();
    expect(availablePatterns(null)).toBeNull();
  });
});

describe('§1/§9 Breed status — requirements, transitions, no silent delete', () => {
  it('purebred requires exactly one breed (§12.1)', () => {
    expect(breedRequirement('purebred')).toEqual({ min: 1, max: 1 });
    expect(normalizeBreedIdList(['persian'], 'purebred')).toEqual({ invalid: false, value: ['persian'] });
    expect(normalizeBreedIdList([], 'purebred').invalid).toBe(true);
    expect(normalizeBreedIdList(['persian', 'scottish_fold'], 'purebred').invalid).toBe(true);
  });

  it('mixed allows 0..N known breeds (§12.2 — clarification #2)', () => {
    expect(breedRequirement('mixed')).toEqual({ min: 0, max: null });
    expect(normalizeBreedIdList([], 'mixed')).toEqual({ invalid: false, value: null });
    expect(normalizeBreedIdList(['persian'], 'mixed')).toEqual({ invalid: false, value: ['persian'] });
    expect(
      normalizeBreedIdList(['persian', 'scottish_fold', 'british_shorthair'], 'mixed')
    ).toEqual({ invalid: false, value: ['persian', 'scottish_fold', 'british_shorthair'] });
  });

  it('unknown has no breed requirement and rejects any breeds (§12.3)', () => {
    expect(breedRequirement('unknown')).toEqual({ min: 0, max: 0 });
    expect(normalizeBreedIdList([], 'unknown')).toEqual({ invalid: false, value: null });
    expect(normalizeBreedIdList(['persian'], 'unknown').invalid).toBe(true);
  });

  it('transition preserves selections — never silently deletes (§12.15, §9)', () => {
    const state = { breed_ids: ['persian', 'scottish_fold'], dominant_breed_id: 'persian' };
    for (const next of ['purebred', 'mixed', 'unknown', null] as const) {
      const after = transitionBreedStatus(state, next);
      expect(after.breed_ids).toEqual(['persian', 'scottish_fold']);
      expect(after.dominant_breed_id).toBe('persian');
    }
  });

  it('boundary sends unknown-status breeds as null (shape ตรง CHECK) — แต่ state เดิมไม่ถูกลบ', () => {
    // unknown + รายการค้าง → boundary reject (บังคับ UX แจ้งผู้ใช้ ไม่ลบเงียบ)
    expect(() =>
      toPetInsertPayload(baseForm({ breed_status: 'unknown', breed_ids: ['persian'] }))
    ).toThrow(/ไม่สามารถระบุได้/);
    // unknown แบบไม่มีรายการ → null
    expect(
      toPetInsertPayload(baseForm({ breed_status: 'unknown', breed_ids: [] })).breed_ids
    ).toBeNull();
  });
});

describe('Boundary — payload normalization (Pet Identity fields)', () => {
  it('full payload: identity fields normalized, legacy passthrough untouched', () => {
    const payload = toPetInsertPayload(
      baseForm({
        breed_status: 'mixed',
        breed_ids: ['persian', 'scottish_fold'],
        dominant_breed_id: 'scottish_fold',
        colors: ['orange', 'white'],
        color_pattern: 'tabby',
        nickname: ' โมจิ ',
        breed: 'ขนมครกสามสี',
        color: 'ส้ม ขาว',
      })
    );
    expect(payload).toEqual({
      name: 'น้องโมจิ',
      species: 'Cat',
      nickname: 'โมจิ',
      breed: 'ขนมครกสามสี',
      breed_status: 'mixed',
      breed_ids: ['persian', 'scottish_fold'],
      dominant_breed_id: 'scottish_fold',
      gender: null,
      birth_date: null,
      color: 'ส้ม ขาว',
      colors: ['orange', 'white'],
      color_pattern: 'tabby',
    });
  });

  it('all-empty form → every optional field null (never "")', () => {
    const payload = toPetInsertPayload(baseForm());
    expect(payload).toEqual({
      name: 'น้องโมจิ',
      species: 'Cat',
      nickname: null,
      breed: null,
      breed_status: null,
      breed_ids: null,
      dominant_breed_id: null,
      gender: null,
      birth_date: null,
      color: null,
      colors: null,
      color_pattern: null,
    });
  });

  it('purebred payload: exactly one breed key (stable, not a label)', () => {
    const payload = toPetInsertPayload(
      baseForm({ breed_status: 'purebred', breed_ids: ['scottish_fold'] })
    );
    expect(payload.breed_ids).toEqual(['scottish_fold']);
    expect(payload.breed_ids).not.toContain('Scottish Fold');
  });
});

describe('§16 Legacy adapter — existing pet data reads correctly', () => {
  it('legacy color text maps to keys, unknown tokens preserved (§12.16)', () => {
    expect(legacyColorTokens('ส้ม ขาว')).toEqual(['orange', 'white']);
    expect(legacyColorTokens('ส้ม ลายเสือ')).toEqual(['orange', 'ลายเสือ']); // ไม่ทิ้ง token แปลก
    expect(legacyColorTokens(null)).toEqual([]);
  });

  it('readPetIdentity: structured fields win, legacy free text survives untouched', () => {
    const identity = readPetIdentity({
      breed: 'ขนมครกสามสี',
      color: 'ส้ม ขาว',
      breed_status: 'mixed',
      breed_ids: ['persian'],
      colors: ['orange'],
      color_pattern: 'tricolor',
    });
    expect(identity).toEqual({
      breed_status: 'mixed',
      breed_ids: ['persian'],
      dominant_breed_id: null,
      colors: ['orange'],
      color_pattern: 'tricolor',
      legacyBreed: 'ขนมครกสามสี',
      legacyColor: 'ส้ม ขาว',
    });
  });

  it('readPetIdentity: legacy-only row (pre-migration) reads with empty structured fields', () => {
    const identity = readPetIdentity({ breed: 'วิเชียรมาศ', color: 'ส้ม ขาว' });
    expect(identity.breed_status).toBeNull();
    expect(identity.breed_ids).toEqual([]);
    expect(identity.colors).toEqual([]);
    expect(identity.legacyBreed).toBe('วิเชียรมาศ');
    expect(identity.legacyColor).toBe('ส้ม ขาว');
  });

  it('display helpers: labels by locale, keys untouched (§12.13–14)', () => {
    expect(breedLabels(['scottish_fold'], 'th')).toEqual(['สก็อตติช โฟลด์']);
    expect(breedLabels(['scottish_fold'], 'en')).toEqual(['Scottish Fold']);
    expect(colorLabels(['orange'], 'th')).toEqual(['ส้ม']);
    expect(patternLabel('tricolor', 'en')).toBe('Tricolor');
    expect(breedStatusLabel('unknown', 'th')).toBe('ไม่สามารถระบุได้');
    // key นอก vocab → raw (ไม่เดา label)
    expect(breedLabels(['mystery_breed'])).toEqual(['mystery_breed']);
  });
});

describe('§7 Parent / Lineage — never derived from parents', () => {
  it('babyIdentityFields accepts no parent param — pass-through only (§12.5)', () => {
    expect(babyIdentityFields({ breed: ' บริติช  ', color: ' เทา ' })).toEqual({
      breed: 'บริติช',
      color: 'เทา',
    });
    expect(babyIdentityFields({ breed: null, color: undefined })).toEqual({
      breed: null,
      color: null,
    });
  });

  it('birth payload cannot gain parent-derived breed: signature has no parent input', () => {
    // ถ้ามีใครเพิ่ม parent derivation คืนมา test นี้จะจับ type ที่เปลี่ยน
    const fields = babyIdentityFields({ breed: 'X', color: 'Y' });
    expect(Object.keys(fields).sort()).toEqual(['breed', 'color']);
  });
});

describe('Drift guard — module vocabulary ≡ migration 20260927100000 literal (clarification #1)', () => {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20260927100000_add_pet_identity_domain.sql');
  const migrationSql = readFileSync(migrationPath, 'utf8');

  it('migration file exists and locks every vocabulary as literals', () => {
    expect(migrationSql).toContain('pets_breed_ids_allowed');
    expect(migrationSql).toContain('pets_breed_status_allowed');
    expect(migrationSql).toContain('pets_dominant_breed_id_allowed');
    expect(migrationSql).toContain('pets_colors_allowed');
    expect(migrationSql).toContain('pets_breed_status_shape');
  });

  it('breed literal list ≡ BREED_KEYS', () => {
    const section = migrationSql.slice(
      migrationSql.indexOf('pets_breed_ids_allowed'),
      migrationSql.indexOf('pets_dominant_breed_id_allowed')
    );
    for (const key of BREED_KEYS) expect(section).toContain(`'${key}'`);
  });

  it('color literal list ≡ COLOR_KEYS', () => {
    const section = migrationSql.slice(
      migrationSql.indexOf('pets_colors_allowed'),
      migrationSql.indexOf('-- No backfill')
    );
    for (const key of COLOR_KEYS) expect(section).toContain(`'${key}'`);
    expect(section).not.toContain("'tabby'"); // pattern word ห้ามหลุดเป็นสี
  });

  it('status literal list ≡ BREED_STATUS_KEYS', () => {
    const section = migrationSql.slice(
      migrationSql.indexOf('pets_breed_status_allowed'),
      migrationSql.indexOf('pets_breed_ids_allowed')
    );
    for (const key of BREED_STATUS_KEYS) expect(section).toContain(`'${key}'`);
  });

  it('shape rule matches the app-level semantics (purebred=1, unknown=0, mixed free)', () => {
    expect(migrationSql).toContain("breed_status = 'purebred' AND COALESCE(cardinality(breed_ids), 0) = 1");
    expect(migrationSql).toContain("breed_status = 'unknown'  AND COALESCE(cardinality(breed_ids), 0) = 0");
    expect(migrationSql).toContain("OR breed_status = 'mixed'");
  });
});
