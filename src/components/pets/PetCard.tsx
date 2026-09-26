'use client';

import { Pet } from '@/types/pet';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface PetCardProps {
  pet: Pet;
  onView?: (pet: Pet) => void;
  onEdit?: (pet: Pet) => void;
  onDelete?: (pet: Pet) => void;
}

export function PetCard({ pet, onView, onEdit, onDelete }: PetCardProps) {
  const age = pet.birth_date ? calculateAge(pet.birth_date) : null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-800">{pet.name}</h3>
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
          {pet.breed && ` - ${pet.breed}`}
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
        {pet.color && (
          <p>
            <span className="font-medium">สี:</span> {pet.color}
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
