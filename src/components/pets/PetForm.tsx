'use client';

import { useState } from 'react';
import { Pet, PetFormData, PetInsertPayload } from '@/types/pet';
import { buildBirthPayload, readBirthInfo } from '@/utils/birthInfo';
import { SPECIES_OPTIONS } from './petFormOptions';
import {
  BREED_VOCABULARY,
  BREED_STATUS_OPTIONS,
  COLOR_VOCABULARY,
  PATTERN_VOCABULARY,
  availablePatterns,
  transitionBreedStatus,
  colorCountLabel,
  normalizeBreedStatus,
  normalizeBreedIdList,
  normalizeBreedKey,
  normalizeColorList,
  normalizePatternKey,
} from '@/utils/petIdentity';

interface PetFormProps {
  pet?: Pet;
  onSubmit: (data: PetInsertPayload) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Input boundary: Postgres rejects '' for date columns (22007) and we do not
 * want stray empty strings stored as data in optional text fields either.
 * Semantics per field — not a blind replace:
 *   - birth_date: '' is "no date" → null (date column cannot hold empty string)
 *   - nickname/breed(legacy)/gender/color(legacy): '' is "not provided" → null
 *   - Pet Identity (breed_status/breed_ids/dominant_breed_id/colors/color_pattern):
 *     normalized against the same literal vocabularies as the DB CHECK
 *     constraints (migration 20260927100000) — invalid values fail here with a
 *     readable reason before Postgres sees them. Shape (purebred=1, unknown=0,
 *     mixed=0..N) mirrors pets_breed_status_shape exactly.
 * Matches Birth Wizard behavior ('' → null), our reference for pet creation.
 *
 * Compatibility rule (task §5): pattern×colors filtering is ASSIST-level — the
 * impossible options are disabled in the UI and flagged, but an existing value
 * is never silently cleared or rewritten (ห้าม silently delete). The boundary
 * validates vocabulary membership only — เหมือน CHECK ที่ DB ทำได้จริง.
 */
export function toPetInsertPayload(form: PetFormData): PetInsertPayload {
  const pattern = normalizePatternKey(form.color_pattern);
  if (pattern.invalid) throw new Error(pattern.reason);

  const status = normalizeBreedStatus(form.breed_status);

  const breeds = normalizeBreedIdList(form.breed_ids, status);
  if (breeds.invalid) throw new Error(breeds.reason);

  const dominant = normalizeBreedKey(form.dominant_breed_id);
  if (dominant.invalid) throw new Error(dominant.reason);

  const colors = normalizeColorList(form.colors);
  if (colors.invalid) throw new Error(colors.reason);

  // Birth component storage (V.0.999) — "รู้แค่ไหน → บันทึกแค่นั้น":
  // legacy birth_date ไม่มีใน form แล้ว (แทนด้วย precision + component fields)
  const birth = buildBirthPayload({
    precision: form.birth_precision,
    year: form.birth_year,
    month: form.birth_month,
    day: form.birth_day,
  });
  if (birth.invalid) throw new Error(birth.reason);

  return {
    name: form.name,
    species: form.species,
    nickname: form.nickname?.trim() || null,
    breed: form.breed?.trim() || null,
    breed_status: status,
    breed_ids: breeds.value,
    dominant_breed_id: dominant.value,
    gender: form.gender || null,
    birth_date: birth.payload.birth_date,
    birth_year: birth.payload.birth_year,
    birth_month: birth.payload.birth_month,
    birth_day: birth.payload.birth_day,
    birth_precision: birth.payload.birth_precision,
    color: form.color?.trim() || null,
    colors: colors.value,
    color_pattern: pattern.value,
  };
}

export function PetForm({ pet, onSubmit, onCancel, isLoading = false }: PetFormProps) {
  const [formData, setFormData] = useState<PetFormData>({
    name: pet?.name || '',
    species: pet?.species || '',
    nickname: pet?.nickname || '',
    // Legacy free text — preserved and re-saved untouched (existing data stays readable)
    breed: pet?.breed || '',
    breed_status: pet?.breed_status || '',
    breed_ids: pet?.breed_ids || [],
    dominant_breed_id: pet?.dominant_breed_id || '',
    gender: pet?.gender || '',
    // Birth component storage — อ่านผ่าน adapter (legacy row ได้ exact โดยตีความ)
    ...(() => {
      const birth = readBirthInfo(pet ?? {});
      return {
        birth_precision: birth.precision ?? '',
        birth_year: birth.year !== null ? String(birth.year) : '',
        birth_month: birth.month !== null ? String(birth.month) : '',
        birth_day: birth.day !== null ? String(birth.day) : '',
      };
    })(),
    color: pet?.color || '',
    colors: pet?.colors || [],
    color_pattern: pet?.color_pattern || '',
  });

  const status = normalizeBreedStatus(formData.breed_status);

  // §9 — ห้าม silently delete: รายการเดิมคงอยู่ใน state เสมอ แต่ถ้าสถานะปัจจุบัน
  // ไม่อนุญาต ต้องบอกผู้ใช้ว่า "จะไม่ถูกบันทึกขณะสถานะนี้" (แจ้งชัด ไม่ลบเงียบ)
  const preservedBreedCount = formData.breed_ids?.length ?? 0;
  const showBreedPreservationNotice =
    preservedBreedCount > 0 &&
    (status === null ||
      status === 'unknown' ||
      (status === 'purebred' && preservedBreedCount !== 1));

  // §5 — conservative compatibility: filter เฉพาะจำนวนสีที่ขัดแน่นอน
  const patterns = availablePatterns(formData.colors);
  const currentPatternBlocked =
    patterns !== null &&
    !!formData.color_pattern &&
    !patterns.some((p) => p.key === formData.color_pattern);

  function toggleBreed(key: string) {
    setFormData((prev) => {
      const current = prev.breed_ids ?? [];
      const next = current.includes(key)
        ? current.filter((b) => b !== key)
        : [...current, key];
      return { ...prev, breed_ids: next };
    });
  }

  function toggleColor(key: string) {
    setFormData((prev) => {
      const current = prev.colors ?? [];
      const next = current.includes(key)
        ? current.filter((c) => c !== key)
        : [...current, key];
      return { ...prev, colors: next };
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(toPetInsertPayload(formData));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          ชื่อสัตว์เลี้ยง *
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="เช่น เจ้าดำ, มิ้วมิ้ว"
        />
      </div>

      <div>
        <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
          ชื่อเล่น
        </label>
        <input
          type="text"
          id="nickname"
          value={formData.nickname}
          onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="เช่น มิ้ว, ดำ"
        />
      </div>

      <div>
        <label htmlFor="species" className="block text-sm font-medium text-gray-700 mb-1">
          ชนิดสัตว์ *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SPECIES_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={!s.enabled}
              aria-pressed={formData.species === s.value}
              onClick={() => setFormData({ ...formData, species: s.value })}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors
                ${formData.species === s.value
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-300 bg-white text-gray-700'}
                ${!s.enabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
              `}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
              {!s.enabled && <span className="ml-auto" title="เร็ว ๆ นี้">🔒</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Breed Status (§1, §9) — input มาจากความหมาย: สถานะก่อน แล้ว selector ตาม ── */}
      <div>
        <label htmlFor="breed_status" className="block text-sm font-medium text-gray-700 mb-1">
          สถานะสายพันธุ์
        </label>
        <div className="flex flex-wrap gap-2">
          {BREED_STATUS_OPTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={status === s.key}
              onClick={() =>
                setFormData((prev) => {
                  // transition preserves everything — ห้าม silently delete (§9)
                  const preserved = transitionBreedStatus(
                    {
                      breed_ids: prev.breed_ids ?? [],
                      dominant_breed_id: prev.dominant_breed_id || null,
                    },
                    s.key
                  );
                  return {
                    ...prev,
                    breed_status: s.key,
                    breed_ids: preserved.breed_ids,
                    dominant_breed_id: preserved.dominant_breed_id ?? '',
                  };
                })
              }
              className={`
                px-3 py-1.5 rounded-full border text-sm transition-colors
                ${status === s.key
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}
              `}
            >
              {s.label.th}
            </button>
          ))}
        </div>

        {/* Breed selector — แสดงเฉพาะเมื่อสถานะมีความหมายรองรับ (§8: Unknown → ไม่แสดง) */}
        {status === 'purebred' && (
          <div className="mt-3">
            <label htmlFor="breed_ids" className="block text-sm font-medium text-gray-700 mb-1">
              สายพันธุ์ (เลือก 1 รายการ)
            </label>
            <select
              id="breed_ids"
              value={formData.breed_ids?.[0] ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  // การเลือกของผู้ใช้เอง — ไม่ใช่ระบบลบเงียบ
                  breed_ids: e.target.value ? [e.target.value] : [],
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- เลือกสายพันธุ์ --</option>
              {BREED_VOCABULARY.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label.th}
                </option>
              ))}
            </select>
          </div>
        )}

        {status === 'mixed' && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Known Breeds (เลือกได้หลายรายการ)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {BREED_VOCABULARY.map((b) => {
                const selected = (formData.breed_ids ?? []).includes(b.key);
                return (
                  <button
                    key={b.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleBreed(b.key)}
                    className={`
                      px-2.5 py-1 rounded-full border text-xs transition-colors
                      ${selected
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}
                    `}
                  >
                    {selected ? '☑ ' : ''}{b.label.th}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              ไม่ทราบว่าผสมอะไร → ไม่ต้องเลือกเลยก็ได้ — ระบบเก็บว่าเป็นพันธุ์ผสมเฉย ๆ
            </p>

            {/* Dominant Appearance (§2) — Owner Observation · optional · ทั้ง vocab
                (ไม่จำกัดเฉพาะ Known Breeds — clarification #3) · ห้าม auto-select */}
            <div className="mt-3">
              <label htmlFor="dominant_breed_id" className="block text-sm font-medium text-gray-700 mb-1">
                ลักษณะที่ดูเด่น (Optional)
              </label>
              <select
                id="dominant_breed_id"
                value={formData.dominant_breed_id ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, dominant_breed_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- ไม่ระบุ --</option>
                {BREED_VOCABULARY.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label.th}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                สิ่งที่เจ้าของสังเกตเองว่าดูเด่น/คล้ายสายพันธุ์ใด — เลือกจากทั้งรายการได้
                ไม่ต้องตรงกับ Known Breeds · ระบบไม่เดาและไม่ดึงจากพ่อแม่ให้
              </p>
            </div>
          </div>
        )}

        {status === 'unknown' && (
          <p className="text-xs text-gray-400 mt-2">
            ไม่ต้องเลือกสายพันธุ์ — ระบบเก็บว่ายังระบุไม่ได้ (มีข้อมูลให้ แต่ไม่ตัดสิน)
          </p>
        )}

        {status === null && (
          <p className="text-xs text-gray-400 mt-2">
            เลือกสถานะสายพันธุ์ก่อน เพื่อให้ช่องกรอกตรงกับความหมายของข้อมูล
          </p>
        )}

        {showBreedPreservationNotice && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ มีรายการสายพันธุ์ที่เคยเลือกไว้ {preservedBreedCount} รายการ —
            ข้อมูลไม่ถูกลบ แต่จะไม่ถูกบันทึกขณะใช้สถานะนี้ (เปลี่ยนสถานะเพื่อแก้ไขต่อ)
          </p>
        )}

        {pet?.breed && (
          <p className="text-xs text-gray-400 mt-2">
            ข้อมูลสายพันธุ์เดิม: “{pet.breed}” — เก็บแยกไว้ ไม่ถูกลบหรือแปลง
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            เพศ
          </label>
          <select
            id="gender"
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">เลือกเพศ</option>
            <option value="Male">ผู้ชาย</option>
            <option value="Female">ผู้หญิง</option>
            <option value="Unknown">ไม่ทราบ</option>
          </select>
        </div>
      </div>

      {/* ── Birth Info (V.0.999) — precision-first: "รู้แค่ไหน → บันทึกแค่นั้น" ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          รู้วันเกิดแค่ไหน?
        </label>
        <div className="flex flex-wrap gap-1.5">
          {([
            { key: 'year', label: 'แค่ปี' },
            { key: 'month', label: 'ปี + เดือน' },
            { key: 'exact', label: 'วันที่แน่นอน' },
          ] as const).map((opt) => {
            const selected = formData.birth_precision === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setFormData({ ...formData, birth_precision: opt.key })}
                className={`
                  px-2.5 py-1 rounded-full border text-xs transition-colors
                  ${selected
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}
                `}
              >
                {opt.label}
              </button>
            );
          })}
          {formData.birth_precision && (
            <button
              type="button"
              aria-label="ล้างวันเกิด"
              onClick={() => setFormData({ ...formData, birth_precision: '', birth_year: '', birth_month: '', birth_day: '' })}
              className="px-2.5 py-1 rounded-full border border-gray-300 bg-white text-xs text-gray-500 hover:border-gray-400"
            >
              ยังไม่ระบุ
            </button>
          )}
        </div>

        {formData.birth_precision && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="birth_year" className="block text-xs text-gray-500 mb-1">ปี *</label>
              <input
                type="number"
                id="birth_year"
                min={1900}
                max={2100}
                value={formData.birth_year}
                onChange={(e) => setFormData({ ...formData, birth_year: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2563"
              />
            </div>
            {(formData.birth_precision === 'month' || formData.birth_precision === 'exact') && (
              <div>
                <label htmlFor="birth_month" className="block text-xs text-gray-500 mb-1">เดือน *</label>
                <select
                  id="birth_month"
                  value={formData.birth_month}
                  onChange={(e) => setFormData({ ...formData, birth_month: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">เลือกเดือน</option>
                  {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'].map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>
            )}
            {formData.birth_precision === 'exact' && (
              <div>
                <label htmlFor="birth_day" className="block text-xs text-gray-500 mb-1">วันที่ *</label>
                <input
                  type="number"
                  id="birth_day"
                  min={1}
                  max={31}
                  value={formData.birth_day}
                  onChange={(e) => setFormData({ ...formData, birth_day: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="15"
                />
              </div>
            )}
          </div>
        )}
        {!formData.birth_precision && (
          <p className="mt-1 text-xs text-gray-400">ไม่รู้วันเกิดก็บันทึกได้ — รู้เพิ่มเมื่อไหร่ค่อยเติม</p>
        )}
      </div>

      {/* ── Colors (§3) — multi-select stable keys · color_count = derived (read-only) ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">สี</label>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_VOCABULARY.map((c) => {
            const selected = (formData.colors ?? []).includes(c.key);
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleColor(c.key)}
                className={`
                  px-2.5 py-1 rounded-full border text-xs transition-colors
                  ${selected
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}
                `}
              >
                {selected ? '☑ ' : ''}{c.label.th}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {colorCountLabel(formData.colors)
            ? `🎨 ${colorCountLabel(formData.colors)} — ระบบนับจากสีที่เลือก (แก้เองไม่ได้) · เช่น มู่ทู่ คือ ส้ม ขาว`
            : 'เลือกได้หลายสี — เช่น มู่ทู่ คือ ส้ม ขาว'}
        </p>
        {pet?.color && (
          <p className="text-xs text-gray-400 mt-1">
            ข้อมูลสีเดิม: “{pet.color}” — เก็บแยกไว้ ไม่ถูกลบหรือแปลง
          </p>
        )}
      </div>

      {/* ── Pattern (§4, §5) — semantic แยกจาก Color · vocabulary CHECK-locked ·
          compatibility กรองเฉพาะสิ่งที่ขัดแน่นอน (Assist, not decide) ── */}
      <div>
        <label htmlFor="color_pattern" className="block text-sm font-medium text-gray-700 mb-1">
          ลักษณะสี (Pattern)
        </label>
        <select
          id="color_pattern"
          value={formData.color_pattern}
          onChange={(e) => setFormData({ ...formData, color_pattern: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- ไม่ระบุ --</option>
          {PATTERN_VOCABULARY.map((p) => {
            const impossible = patterns !== null && !patterns.some((a) => a.key === p.key);
            return (
              <option key={p.key} value={p.key} disabled={impossible}>
                {p.label.th}{impossible ? ' (ขัดกับจำนวนสีที่เลือก)' : ''}
              </option>
            );
          })}
        </select>
        {currentPatternBlocked ? (
          <p className="text-xs text-amber-600 mt-1">
            ⚠️ ลักษณะสีที่เลือกไว้ขัดกับจำนวนสีปัจจุบัน — ค่าเดิมยังไม่ถูกลบ
            แต่แนะนำให้เลือกใหม่ให้สอดคล้องก่อนบันทึก
          </p>
        ) : (
          <p className="text-xs text-gray-400 mt-1">
            จำนวนสีระบบนับให้เอง — ลักษณะสีบอกว่าสีกระจายบนตัวอย่างไร (เช่น สามสี หรือ ลายสลิด)
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'กำลังบันทึก...' : pet ? 'อัปเดต' : 'สร้าง'}
        </button>
      </div>
    </form>
  );
}
