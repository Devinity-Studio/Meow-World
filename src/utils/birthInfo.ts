/**
 * Birth Info domain — component-based storage (V.0.999).
 *
 * Data Contract (LOCKED 2026-09-28):
 *   รู้แค่ไหน → บันทึกแค่นั้น — ห้าม fake date (2020-01-01 แทน "เกิดปี 2020" ❌)
 *   birth_year + birth_month? + birth_day? + birth_precision ('year'|'month'|'exact')
 *   Shape = DB CHECK pets_birth_shape (migration 20260928300000):
 *     year  → month/day NULL · month → month ✓ day NULL · exact → month ✓ day ✓
 *   birth_date เดิมคงอยู่แบบ additive — legacy row อ่านผ่าน readBirthInfo ด้วย
 *   precision='exact' โดยตีความ (Birth Wizard เดิมบังคับ exact date เสมอ)
 */

export type BirthPrecision = 'year' | 'month' | 'exact';

export const BIRTH_PRECISION_KEYS: readonly BirthPrecision[] = ['year', 'month', 'exact'];

export interface BirthInfoInput {
  precision?: string;
  year?: string;
  month?: string;
  day?: string;
}

export type BirthInfoResult =
  | { invalid: true; reason: string }
  | {
      invalid: false;
      payload: {
        birth_year: number | null;
        birth_month: number | null;
        birth_day: number | null;
        /** null = ยังไม่ระบุระดับความรู้ (incomplete = valid) */
        birth_precision: BirthPrecision | null;
        /** legacy column — ให้ค่าต่อเนื่องเมื่อ precision = 'exact' เท่านั้น */
        birth_date: string | null;
      };
    };

function toInt(value: string | undefined): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

/**
 * Build birth payload จาก UI (precision-first UI: เลือกระดับที่รู้ก่อน แล้วกรอกเท่านั้น)
 * — คืน invalid พร้อมเหตุผลภาษาไทยเมื่อ component ขาด/เกิน ตาม shape
 */
export function buildBirthPayload(input: BirthInfoInput): BirthInfoResult {
  const precision = normalizeBirthPrecision(input.precision);
  if (!precision) {
    // ไม่เลือกระดับ = ยังไม่รู้วันเกิด — incomplete = valid (null ทั้งหมด ไม่ error)
    return {
      invalid: false,
      payload: {
        birth_year: null,
        birth_month: null,
        birth_day: null,
        birth_precision: null,
        birth_date: null,
      },
    };
  }

  const year = toInt(input.year);
  if (year === null || year < 1900 || year > 2100) {
    return { invalid: true, reason: 'ปีเกิดต้องเป็นตัวเลขระหว่าง 1900–2100' };
  }

  const month = toInt(input.month);
  const day = toInt(input.day);

  if (precision === 'year') {
    return {
      invalid: false,
      payload: { birth_year: year, birth_month: null, birth_day: null, birth_precision: 'year', birth_date: null },
    };
  }

  if (month === null || month < 1 || month > 12) {
    return { invalid: true, reason: 'เดือนเกิดต้องระหว่าง 1–12' };
  }

  if (precision === 'month') {
    return {
      invalid: false,
      payload: { birth_year: year, birth_month: month, birth_day: null, birth_precision: 'month', birth_date: null },
    };
  }

  if (day === null || day < 1 || day > 31) {
    return { invalid: true, reason: 'วันที่เกิดต้องระหว่าง 1–31' };
  }

  // exact — เก็บ birth_date ต่อเนื่อง (ครบวันจริง ไม่ใช่ fake)
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return {
    invalid: false,
    payload: {
      birth_year: year,
      birth_month: month,
      birth_day: day,
      birth_precision: 'exact',
      birth_date: `${year}-${mm}-${dd}`,
    },
  };
}

/** normalize precision จาก input ภายนอก — ค่าแปลกปลอม → null (ยังไม่ระบุ) */
export function normalizeBirthPrecision(value: unknown): BirthPrecision | null {
  return typeof value === 'string' && (BIRTH_PRECISION_KEYS as readonly string[]).includes(value)
    ? (value as BirthPrecision)
    : null;
}

/**
 * Read adapter — BirthRow คือ shape ที่อ่านจาก DB (รองรับ legacy row)
 * คืน component fields + precision ที่ระบบเข้าใจเสมอ:
 *   1) มี birth_precision → ใช้ตรง ๆ
 *   2) legacy (precision NULL แต่ birth_date มี) → exact (Birth Wizard เดิมบังคับ exact)
 *   3) ไม่มีอะไรเลย → null ทั้งหมด (incomplete = valid)
 */
export function readBirthInfo(row: {
  birth_date?: string | null;
  birth_year?: number | null;
  birth_month?: number | null;
  birth_day?: number | null;
  birth_precision?: string | null;
}): {
  year: number | null;
  month: number | null;
  day: number | null;
  precision: BirthPrecision | null;
} {
  const precision = normalizeBirthPrecision(row.birth_precision);
  if (precision) {
    return { year: row.birth_year ?? null, month: row.birth_month ?? null, day: row.birth_day ?? null, precision };
  }
  if (row.birth_date) {
    // legacy exact date: แตก component กลับ (ไม่แตะ DB — อ่านอย่างเดียว)
    const [y, m, d] = row.birth_date.split('-').map((part) => Number(part));
    if (y && m && d) return { year: y, month: m, day: d, precision: 'exact' };
  }
  return { year: null, month: null, day: null, precision: null };
}

/** แสดงผลอ่านง่ายตาม precision — แค่สิ่งที่ระบบรู้จริง เช่น "เกิด ปี 2020" */
export function formatBirthDisplay(birth: {
  year: number | null;
  month: number | null;
  day: number | null;
  precision: BirthPrecision | null;
}): string {
  // แสดงเฉพาะสิ่งที่รู้จริงตาม precision — month/day ที่ NULL ตาม shape ไม่ถูกอ้างถึง
  if (!birth.precision || birth.year === null) return '';
  if (birth.precision === 'year') return `ปี ${birth.year}`;
  const monthsTh = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  if (birth.precision === 'month') {
    return birth.month ? `${monthsTh[birth.month - 1]} ${birth.year}` : '';
  }
  if (!birth.month || !birth.day) return '';
  return `${birth.day} ${monthsTh[birth.month - 1]} ${birth.year}`;
}
