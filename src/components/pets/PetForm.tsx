'use client';

import { useState } from 'react';
import { Pet, PetFormData, PetInsertPayload } from '@/types/pet';
import { SPECIES_OPTIONS, BREED_OPTIONS, COLOR_OPTIONS, joinColors, splitColors, colorCountLabel } from './petFormOptions';

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
 *   - nickname/breed/gender/color: '' is "not provided" → null (keep DB clean)
 *   - name/species: required by the form, never normalized
 * Matches Birth Wizard behavior (birth/page.tsx maps '' → null before insert),
 * which is our reference behavior for pet creation.
 */
export function toPetInsertPayload(form: PetFormData): PetInsertPayload {
  return {
    name: form.name,
    species: form.species,
    nickname: form.nickname?.trim() || null,
    breed: form.breed?.trim() || null,
    gender: form.gender || null,
    birth_date: form.birth_date || null,
    color: form.color?.trim() || null,
  };
}

export function PetForm({ pet, onSubmit, onCancel, isLoading = false }: PetFormProps) {
  const [formData, setFormData] = useState<PetFormData>({
    name: pet?.name || '',
    species: pet?.species || '',
    nickname: pet?.nickname || '',
    breed: pet?.breed || '',
    gender: pet?.gender || '',
    birth_date: pet?.birth_date ? pet.birth_date.substring(0, 10) : '',
    color: pet?.color || '',
  });
  const knownBreed = BREED_OPTIONS.some((b) => b.value === formData.breed);
  const [customBreed, setCustomBreed] = useState(!!formData.breed && !knownBreed);

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

      <div>
        <label htmlFor="breed" className="block text-sm font-medium text-gray-700 mb-1">
          สายพันธุ์
        </label>
        <select
          id="breed"
          value={customBreed ? '__custom__' : formData.breed}
          onChange={(e) => {
            if (e.target.value === '__custom__') {
              setCustomBreed(true);
              setFormData({ ...formData, breed: '' });
            } else {
              setCustomBreed(false);
              setFormData({ ...formData, breed: e.target.value });
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- ไม่ระบุ --</option>
          {BREED_OPTIONS.filter((b) => b.note !== 'TEXT_INPUT').map((b) => (
            <option key={b.value} value={b.value}>
              {b.value}
            </option>
          ))}
          <option value="__custom__">อื่น ๆ (พิมพ์เอง)</option>
        </select>
        {customBreed && (
          <input
            type="text"
            id="breed_custom"
            value={formData.breed}
            onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
            placeholder="พิมพ์สายพันธุ์ เช่น วิเชียรมาศ"
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">สี</label>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_OPTIONS.map((c) => {
              const selected = splitColors(formData.color).includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    const current = splitColors(formData.color);
                    const next = selected
                      ? current.filter((x) => x !== c.value)
                      : [...current, c.value];
                    setFormData({ ...formData, color: joinColors(next) });
                  }}
                  className={`
                    px-2.5 py-1 rounded-full border text-xs transition-colors
                    ${selected
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}
                  `}
                >
                  {selected ? '☑ ' : ''}{c.value}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {colorCountLabel(splitColors(formData.color))
              ? `🎨 ${colorCountLabel(splitColors(formData.color))} — เลือกได้หลายสี เช่น มู่ทู่ คือ ส้ม ขาว`
              : 'เลือกได้หลายสี — เช่น มู่ทู่ คือ ส้ม ขาว'}
            {'' }
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-1">
          วันเกิด
        </label>
        <input
          type="date"
          id="birth_date"
          value={formData.birth_date}
          onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
