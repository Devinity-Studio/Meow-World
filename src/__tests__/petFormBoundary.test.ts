import { describe, it, expect } from 'vitest';
import { toPetInsertPayload } from '@/components/pets/PetForm';
import { PetFormData } from '@/types/pet';

/**
 * Boundary contract: Postgres rejects '' for date columns (22007) and empty
 * strings in optional text fields become junk data. Normalization must follow
 * per-field semantics (matching Birth Wizard reference behavior), not a blind
 * replace.
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
      gender: null,
      birth_date: null,
      color: null,
    });
  });

  it('keeps the killer case safe: missing birth_date becomes null, not ""', () => {
    // Root cause #2: birth_date: '' once reached Postgres as "" → 22007 → 400
    const payload = toPetInsertPayload(baseForm({ birth_date: '' }));
    expect(payload.birth_date).toBeNull();
    expect(payload.birth_date).not.toBe('');
  });

  it('keeps provided values as trimmed strings', () => {
    const payload = toPetInsertPayload(
      baseForm({
        nickname: '  โมจิ  ',
        breed: 'วิเชียรมาศ',
        gender: 'Male',
        birth_date: '2026-09-26',
        color: 'เทา',
      })
    );
    expect(payload).toEqual({
      name: 'น้องโมจิ',
      species: 'Cat',
      nickname: 'โมจิ',
      breed: 'วิเชียรมาศ',
      gender: 'Male',
      birth_date: '2026-09-26',
      color: 'เทา',
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
