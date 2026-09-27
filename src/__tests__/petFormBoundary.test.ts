import { describe, it, expect } from 'vitest';
import { toPetInsertPayload } from '@/components/pets/PetForm';
import {
  SPECIES_OPTIONS,
  PATTERN_OPTIONS,
  COLOR_VOCABULARY,
  normalizePatternValue,
  colorCountLabel,
} from '@/components/pets/petFormOptions';
import { legacyColorTokens } from '@/utils/petIdentity';
import { PetFormData } from '@/types/pet';

/**
 * Boundary contract: Postgres rejects '' for date columns (22007) and empty
 * strings in optional text fields become junk data. Normalization must follow
 * per-field semantics (matching Birth Wizard reference behavior), not a blind
 * replace.
 *
 * Pet Identity fields (breed_status/breed_ids/dominant_breed_id/colors) follow
 * the same boundary discipline with vocabulary mirroring the DB CHECKs —
 * deeper coverage lives in petIdentity.test.ts.
 */
function baseForm(overrides: Partial<PetFormData> = {}): PetFormData {
  return {
    name: 'น้องโมจิ',
    species: 'Cat',
    nickname: '',
    breed: '',
    gender: '',
    birth_date: '',
    color: '',
    ...overrides,
  };
}

describe('toPetInsertPayload — Direct Add input boundary', () => {
  it('maps empty optional fields to null (never empty string)', () => {
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

  it('keeps the killer case safe: missing birth_date becomes null, not ""', () => {
    // Root cause #2: birth_date: '' once reached Postgres as "" → 22007 → 400
    const payload = toPetInsertPayload(baseForm({ birth_date: '' }));
    expect(payload.birth_date).toBeNull();
    expect(payload.birth_date).not.toBe('');
  });

  it('keeps provided legacy values as trimmed strings', () => {
    const payload = toPetInsertPayload(
      baseForm({
        nickname: '  โมจิ  ',
        breed: 'วิเชียรมาศ',
        gender: 'Male',
        birth_date: '2026-09-26',
        color: 'เทา',
        color_pattern: 'tricolor',
      })
    );
    expect(payload).toEqual({
      name: 'น้องโมจิ',
      species: 'Cat',
      nickname: 'โมจิ',
      breed: 'วิเชียรมาศ',
      breed_status: null,
      breed_ids: null,
      dominant_breed_id: null,
      gender: 'Male',
      birth_date: '2026-09-26',
      color: 'เทา',
      colors: null,
      color_pattern: 'tricolor',
    });
  });

  it('normalizes whitespace-only optional fields to null (trim semantics)', () => {
    const payload = toPetInsertPayload(baseForm({ nickname: '   ', color: '\t' }));
    expect(payload.nickname).toBeNull();
    expect(payload.color).toBeNull();
  });

  it('never normalizes required fields (name/species pass through untouched)', () => {
    const payload = toPetInsertPayload(baseForm({ name: 'หมูหยอง', species: 'Cat' }));
    expect(payload.name).toBe('หมูหยอง');
    expect(payload.species).toBe('Cat');
  });
});

describe('color semantics — pattern words are not colors', () => {
  it('never offers pattern words as color choices', () => {
    const keys = COLOR_VOCABULARY.map((c) => c.key);
    const thLabels = COLOR_VOCABULARY.map((c) => c.label.th);
    // สามสี/สองสี are derived facts; ลาย* are patterns — none may be a color option
    expect(keys).not.toContain('สามสี');
    expect(keys).not.toContain('สองสี');
    expect(keys.every((k) => !k.startsWith('ลาย'))).toBe(true);
    expect(thLabels).not.toContain('สามสี');
    expect(thLabels.every((l) => !l.startsWith('ลาย'))).toBe(true);
  });

  it('derives the count label from the selection, never stores it as a color', () => {
    expect(colorCountLabel([])).toBe('');
    expect(colorCountLabel(['orange'])).toBe('สีเดียว');
    expect(colorCountLabel(['orange', 'white'])).toBe('2 สี');
    expect(colorCountLabel(['orange', 'white', 'black'])).toBe('3 สี');
  });
});

describe('legacy color storage convention (space-joined free text)', () => {
  it('reads the existing convention "ส้ม ขาว" back into tokens', () => {
    expect(legacyColorTokens('ส้ม ขาว')).toEqual(['orange', 'white']);
    expect(legacyColorTokens('เทา')).toEqual(['gray']);
  });

  it('handles empty/null stored colors', () => {
    expect(legacyColorTokens(null)).toEqual([]);
    expect(legacyColorTokens('')).toEqual([]);
  });
});

describe('Pattern Input — vocabulary-locked semantic (separate from Colors)', () => {
  it('offers exactly the CHECK-locked vocabulary, nothing invented', () => {
    expect(PATTERN_OPTIONS.map((p) => p.key)).toEqual([
      'solid', 'bicolor', 'tricolor', 'tabby', 'calico', 'tortoiseshell', 'tuxedo', 'pointed', 'other',
    ]);
  });

  it('no pattern → null (optional field, contract of the boundary)', () => {
    expect(normalizePatternValue('')).toEqual({ invalid: false, value: null });
    expect(normalizePatternValue(undefined)).toEqual({ invalid: false, value: null });
    expect(normalizePatternValue('   ')).toEqual({ invalid: false, value: null });
    const payload = toPetInsertPayload(baseForm({ color_pattern: '' }));
    expect(payload.color_pattern).toBeNull();
  });

  it('valid pattern → passes through as the storage key', () => {
    expect(normalizePatternValue('tricolor')).toEqual({ invalid: false, value: 'tricolor' });
    expect(normalizePatternValue('  tabby  ')).toEqual({ invalid: false, value: 'tabby' });
    const payload = toPetInsertPayload(baseForm({ color_pattern: 'tricolor' }));
    expect(payload.color_pattern).toBe('tricolor');
  });

  it('pattern outside the vocabulary → rejected at the boundary (DB CHECK would also reject)', () => {
    const result = normalizePatternValue('สามสี'); // Thai display word is not a storage key
    expect(result.invalid).toBe(true);
    if (result.invalid) expect(result.reason).toMatch(/รายการที่ระบบรองรับ/);
    expect(() => toPetInsertPayload(baseForm({ color_pattern: 'rainbow' }))).toThrow(/รายการที่ระบบรองรับ/);
  });

  it('existing pets still read fine: pattern absent → field untouched, colors semantics intact', () => {
    const payload = toPetInsertPayload(baseForm());
    expect(payload).not.toHaveProperty('color_pattern', 'solid'); // never invented
    expect(payload.color_pattern).toBeNull();
    expect(payload.color).toBeNull(); // colors boundary unchanged
    expect(legacyColorTokens('ส้ม ขาว')).toEqual(['orange', 'white']); // existing data reads the same
  });
});

describe('Species options — unchanged by this slice', () => {
  it('only Cat is enabled today', () => {
    expect(SPECIES_OPTIONS.find((s) => s.id === 'cat')?.enabled).toBe(true);
    expect(SPECIES_OPTIONS.filter((s) => s.id !== 'cat').every((s) => !s.enabled)).toBe(true);
  });
});
