'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pet, PetInsertPayload } from '@/types/pet';
import { PetForm } from '@/components/pets/PetForm';
import { createClient } from '@/utils/supabase/client';

export default function EditPetPage() {
  const params = useParams();
  const router = useRouter();
  const petId = params.id as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchPet();
  }, [petId]);

  async function fetchPet() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .single();

      if (error) throw error;
      setPet(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(data: PetInsertPayload) {
    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('pets')
        .update(data)
        .eq('id', petId);

      if (error) throw error;

      router.push(`/pets/${petId}`);
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">กำลังโหลด...</div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">เกิดข้อผิดพลาด: {error || 'ไม่พบข้อมูล'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push(`/pets/${petId}`)}
          className="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← กลับไปหน้ารายละเอียด
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            แก้ไขข้อมูลสัตว์เลี้ยง
          </h1>
          <PetForm
            pet={pet}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/pets/${petId}`)}
            isLoading={submitting}
          />
        </div>
      </div>
    </div>
  );
}
