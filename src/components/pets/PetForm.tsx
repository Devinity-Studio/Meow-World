'use client';

import { useState } from 'react';
import { Pet, PetFormData, PetInsertPayload } from '@/types/pet';

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
        <input
          type="text"
          id="species"
          required
          value={formData.species}
          onChange={(e) => setFormData({ ...formData, species: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="เช่น แมว, สุนัข"
        />
      </div>

      <div>
        <label htmlFor="breed" className="block text-sm font-medium text-gray-700 mb-1">
          สายพันธุ์
        </label>
        <input
          type="text"
          id="breed"
          value={formData.breed}
          onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="เช่น เปอร์เซีย, โกลเด้น รีทรีฟเวอร์"
        />
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
          <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
            สี
          </label>
          <input
            type="text"
            id="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="เช่น ดำ, ขาว, สามสี"
          />
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
