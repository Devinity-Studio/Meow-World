'use client';

import { Pet } from '@/types/pet';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  readPetIdentity,
  breedLabels,
  colorLabels,
  patternLabel,
  colorCountLabel,
} from '@/utils/petIdentity';

interface PetCardProps {
  pet: Pet;
  onView?: (pet: Pet) => void;
  onEdit?: (pet: Pet) => void;
  onDelete?: (pet: Pet) => void;
}

export function PetCard({ pet, onView, onEdit, onDelete }: PetCardProps) {
  const age = pet.birth_date ? calculateAge(pet.birth_date) : null;

  // §16 — ข้อมูลเดิมอ่านได้ครบ: identity ใหม่เมื่อมี · legacy free text แสดงต่อเมื่อยังไม่มี
  const identity = readPetIdentity(pet);
  const breedText =
    identity.breed_ids.length > 0
      ? breedLabels(identity.breed_ids).join(' + ')
      : identity.legacyBreed;
  const colorText =
    identity.colors.length > 0 ? colorLabels(identity.colors).join(' ') : pet.color;
  const patternText = patternLabel(identity.color_pattern);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Profile Image — Visual Identity เท่านั้น (ไม่ใช่ Passport Profile/Biometrics) */}
          <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden bg-[#F3EFEA] border-2 border-white shadow-xs">
            {pet.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">🐾</div>
            )}
          </div>
          <h3 className="text-xl font-semibold text-gray-800 truncate">{pet.name}</h3>
        </div>
        <div className="flex gap-2">
          {onView && (
            <button
              onClick={() => onView(pet)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ดูรายละเอียด
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(pet)}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              แก้ไข
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(pet)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              ลบ
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 text-gray-600">
        <p>
          <span className="font-medium">สายพันธุ์:</span> {pet.species}
          {breedText && ` - ${breedText}`}
        </p>
        {pet.nickname && (
          <p>
            <span className="font-medium">ชื่อเล่น:</span> {pet.nickname}
          </p>
        )}
        {pet.gender && (
          <p>
            <span className="font-medium">เพศ:</span> {pet.gender}
          </p>
        )}
        {pet.birth_date && (
          <p>
            <span className="font-medium">วันเกิด:</span>{' '}
            {format(new Date(pet.birth_date), 'd MMMM yyyy', { locale: th })}
            {age && ` (${age})`}
          </p>
        )}
        {colorText && (
          <p>
            <span className="font-medium">สี:</span> {colorText}
            {identity.colors.length > 1 && colorCountLabel(identity.colors) && ` (${colorCountLabel(identity.colors)})`}
            {patternText && ` · ${patternText}`}
          </p>
        )}
        <p className="text-sm text-gray-400">
          สร้างเมื่อ:{' '}
          {format(new Date(pet.created_at), 'd MMM yyyy', { locale: th })}
        </p>
      </div>
    </div>
  );
}

function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();

  if (years > 0) {
    return `${years} ปี`;
  } else if (months > 0) {
    return `${months} เดือน`;
  } else {
    return 'แรกเกิด';
  }
}
