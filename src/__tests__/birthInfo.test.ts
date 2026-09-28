import { describe, it, expect } from 'vitest';
import {
  buildBirthPayload,
  readBirthInfo,
  formatBirthDisplay,
  normalizeBirthPrecision,
} from '@/utils/birthInfo';

/**
 * Birth Info contract (V.0.999 — LOCKED):
 *  - "รู้แค่ไหน → บันทึกแค่นั้น" — ห้าม fake date (2020-01-01 แทน "เกิดปี 2020")
 *  - Shape = DB CHECK pets_birth_shape: year→month/day NULL, month→day NULL, exact→ครบ
 *  - legacy row (birth_precision NULL + birth_date มี) → exact โดยตีความ
 *  - incomplete = valid (ไม่มี precision ก็เป็นสถานะถูกต้อง)
 */
describe('buildBirthPayload — component storage boundary', () => {
  it('year-only: month/day เป็น NULL และไม่เกิด birth_date (ห้าม fake date)', () => {
    const result = buildBirthPayload({ precision: 'year', year: '2020', month: '', day: '' });
    expect(result.invalid).toBe(false);
    if (!result.invalid) {
      expect(result.payload).toEqual({
        birth_year: 2020,
        birth_month: null,
        birth_day: null,
        birth_precision: 'year',
        birth_date: null,
      });
    }
  });

  it('month: year+month ถูกเก็บ, day NULL, ไม่มี birth_date', () => {
    const result = buildBirthPayload({ precision: 'month', year: '2020', month: '6', day: '' });
    expect(result.invalid).toBe(false);
    if (!result.invalid) {
      expect(result.payload.birth_month).toBe(6);
      expect(result.payload.birth_day).toBeNull();
      expect(result.payload.birth_date).toBeNull();
      expect(result.payload.birth_precision).toBe('month');
    }
  });

  it('exact: ครบทั้ง component + birth_date จริง (ไม่ใช่ fake)', () => {
    const result = buildBirthPayload({ precision: 'exact', year: '2020', month: '6', day: '15' });
    expect(result.invalid).toBe(false);
    if (!result.invalid) {
      expect(result.payload).toEqual({
        birth_year: 2020,
        birth_month: 6,
        birth_day: 15,
        birth_precision: 'exact',
        birth_date: '2020-06-15',
      });
    }
  });

  it('month เลือกแต่ไม่กรอกเดือน → invalid พร้อมเหตุผล (ไม่เติมค่าแทน)', () => {
    const result = buildBirthPayload({ precision: 'month', year: '2020', month: '', day: '' });
    expect(result.invalid).toBe(true);
    if (result.invalid) expect(result.reason).toContain('เดือน');
  });

  it('exact ขาดวัน → invalid (ห้ามเดาวันที่)', () => {
    const result = buildBirthPayload({ precision: 'exact', year: '2020', month: '6', day: '' });
    expect(result.invalid).toBe(true);
  });

  it('precision แปลกปลอม → ถือว่ายังไม่ระบุ (null payload, normalizeBirthPrecision ตัดสิน)', () => {
    // normalizeBirthPrecision คือด่านตัดสิน — ค่าแปลกปลอม = ยังไม่รู้ = valid null
    const result = buildBirthPayload({ precision: 'decade', year: '2020', month: '', day: '' });
    expect(result.invalid).toBe(false);
    if (!result.invalid) expect(result.payload.birth_precision).toBeNull();
  });

  it('year นอกช่วง 1900–2100 → invalid (ตรง CHECK pets_birth_year_range)', () => {
    expect(buildBirthPayload({ precision: 'year', year: '1800', month: '', day: '' }).invalid).toBe(true);
    expect(buildBirthPayload({ precision: 'year', year: '2200', month: '', day: '' }).invalid).toBe(true);
  });

  it('missing precision → valid null payload (incomplete = valid — ไม่ error)', () => {
    const result = buildBirthPayload({ precision: '', year: '', month: '', day: '' });
    expect(result.invalid).toBe(false);
    if (!result.invalid) {
      expect(result.payload).toEqual({
        birth_year: null,
        birth_month: null,
        birth_day: null,
        birth_precision: null,
        birth_date: null,
      });
    }
  });
});

describe('readBirthInfo — read adapter (รองรับ legacy row)', () => {
  it('component row: อ่านตาม precision ที่เก็บ', () => {
    expect(
      readBirthInfo({ birth_year: 2020, birth_precision: 'year' })
    ).toEqual({ year: 2020, month: null, day: null, precision: 'year' });
  });

  it('legacy row: birth_date อย่างเดียว → exact โดยตีความ (Birth Wizard เดิมบังคับ exact)', () => {
    expect(
      readBirthInfo({ birth_date: '2020-06-15' })
    ).toEqual({ year: 2020, month: 6, day: 15, precision: 'exact' });
  });

  it('incomplete row (ไม่มีอะไรเลย) → null ทั้งหมด = valid', () => {
    expect(readBirthInfo({})).toEqual({ year: null, month: null, day: null, precision: null });
  });

  it('precision แปลกปลอมตกไปทาง legacy path (normalizeBirthPrecision ตัดสิน)', () => {
    expect(normalizeBirthPrecision('unknown-value')).toBeNull();
  });
});

describe('formatBirthDisplay — แสดงเฉพาะสิ่งที่รู้จริง', () => {
  it('year → "ปี 2020"', () => {
    expect(formatBirthDisplay({ year: 2020, month: null, day: null, precision: 'year' })).toBe('ปี 2020');
  });

  it('month → "มิถุนายน 2020"', () => {
    expect(formatBirthDisplay({ year: 2020, month: 6, day: null, precision: 'month' })).toBe('มิถุนายน 2020');
  });

  it('exact → "15 มิถุนายน 2020"', () => {
    expect(formatBirthDisplay({ year: 2020, month: 6, day: 15, precision: 'exact' })).toBe('15 มิถุนายน 2020');
  });

  it('incomplete → ข้อความว่าง (ไม่แต่งข้อมูล)', () => {
    expect(formatBirthDisplay({ year: null, month: null, day: null, precision: null })).toBe('');
  });
});
