import { describe, it, expect } from 'vitest';
import {
  normalizeHomeName,
  normalizeHomeDescription,
  buildHomeIdentityUpdatePayload,
  buildHomeIdentitySummary,
} from '@/utils/homeIdentity';

/**
 * Boundary contract (same discipline as petFormBoundary.test.ts):
 *  - Postgres treats '' as junk data in optional text fields → null, never ""
 *  - Home Identity: name จำเป็น, description optional — "incomplete = valid"
 *  - ไม่มีการสร้าง taxonomy/relationship_key ใด ๆ ในชั้นนี้ (Stable Key & Free Text Policy)
 */
describe('normalizeHomeName', () => {
  it('trims whitespace', () => {
    expect(normalizeHomeName('  บ้านอุ่นไอรัก  ')).toBe('บ้านอุ่นไอรัก');
  });

  it('maps non-string to empty string (never throws)', () => {
    expect(normalizeHomeName(undefined)).toBe('');
    expect(normalizeHomeName(null)).toBe('');
    expect(normalizeHomeName(42)).toBe('');
  });
});

describe('normalizeHomeDescription — optional text boundary', () => {
  it('keeps meaningful text trimmed', () => {
    expect(normalizeHomeDescription('  บ้านสองชั้นริมคลอง  ')).toBe('บ้านสองชั้นริมคลอง');
  });

  it('maps empty string to null (never empty string — Postgres boundary)', () => {
    expect(normalizeHomeDescription('')).toBeNull();
    expect(normalizeHomeDescription('   ')).toBeNull();
  });

  it('maps undefined/null to null', () => {
    expect(normalizeHomeDescription(undefined)).toBeNull();
    expect(normalizeHomeDescription(null)).toBeNull();
  });
});

describe('buildHomeIdentityUpdatePayload — Home Identity edit business logic', () => {
  it('rejects empty name (name จำเป็น)', () => {
    const result = buildHomeIdentityUpdatePayload({ name: '   ', description: '' });
    expect(result.invalid).toBe(true);
    if (result.invalid) expect(result.reason).toBe('กรุณาระบุชื่อบ้าน');
  });

  it('accepts name-only home — description becomes null (incomplete = valid)', () => {
    const result = buildHomeIdentityUpdatePayload({ name: 'บ้านใหม่', description: '' });
    expect(result.invalid).toBe(false);
    if (!result.invalid) {
      expect(result.payload).toEqual({ name: 'บ้านใหม่', description: null });
    }
  });

  it('accepts full identity and never leaks empty strings', () => {
    const result = buildHomeIdentityUpdatePayload({
      name: '  บ้านอุ่นไอรัก ',
      description: ' บ้านสองชั้น ',
    });
    expect(result.invalid).toBe(false);
    if (!result.invalid) {
      expect(result.payload).toEqual({ name: 'บ้านอุ่นไอรัก', description: 'บ้านสองชั้น' });
      Object.values(result.payload).forEach((value) => {
        expect(value).not.toBe('');
      });
    }
  });
});

describe('buildHomeIdentitySummary — read-side (incomplete = valid)', () => {
  it('summarizes a complete home', () => {
    const summary = buildHomeIdentitySummary({
      home: { id: 'home-1', name: 'บ้านอุ่นไอรัก', description: 'ริมคลอง' },
      people: [
        { userId: 'u1', displayName: 'คุณเอ', avatarUrl: null, role: 'owner' },
        { userId: 'u2', displayName: 'คู่ชีวิต', avatarUrl: null, role: 'editor' },
      ],
      pets: [{ id: 'p1' }, { id: 'p2' }],
    });
    expect(summary).toEqual({
      homeId: 'home-1',
      name: 'บ้านอุ่นไอรัก',
      description: 'ริมคลอง',
      people: expect.any(Array),
      petCount: 2,
    });
    expect(summary.people).toHaveLength(2);
  });

  it('summarizes an empty home without people or pets (valid state, not error)', () => {
    const summary = buildHomeIdentitySummary({
      home: { id: 'home-2', name: 'บ้านเริ่มต้น', description: null },
      people: [],
      pets: [],
    });
    expect(summary.people).toEqual([]);
    expect(summary.petCount).toBe(0);
    expect(summary.description).toBeNull();
  });
});
