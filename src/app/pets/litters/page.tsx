'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Litter, Pet } from '@/types/pet';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface LitterWithBabies extends Litter {
  babies: Pet[];
}

export default function LittersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [litters, setLitters] = useState<LitterWithBabies[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLitters = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('ไม่พบข้อมูลผู้ใช้');
        return;
      }

      const { data: homes } = await supabase
        .from('homes')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (!homes || homes.length === 0) {
        setLitters([]);
        return;
      }

      const homeId = homes[0].id;

      // Fetch litters
      const { data: litterData, error: litterError } = await supabase
        .from('litters')
        .select('*')
        .eq('home_id', homeId)
        .order('created_at', { ascending: false });

      if (litterError) throw litterError;

      // Fetch babies for each litter
      const litterIds = (litterData || []).map((l) => l.id);
      const { data: allPets } = await supabase
        .from('pets')
        .select('*')
        .in('litter_id', litterIds)
        .order('created_at', { ascending: true });

      const petsByLitter = new Map<string, Pet[]>();
      (allPets || []).forEach((pet) => {
        if (!pet.litter_id) return;
        const list = petsByLitter.get(pet.litter_id) || [];
        list.push(pet);
        petsByLitter.set(pet.litter_id, list);
      });

      const enriched = (litterData || []).map((litter) => ({
        ...litter,
        babies: petsByLitter.get(litter.id) || [],
      }));

      setLitters(enriched);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchLitters();
  }, [fetchLitters]);

  async function handleDeleteLitter(litter: LitterWithBabies) {
    if (!confirm(`ต้องการลบ "${litter.name}"? (ลูกจะไม่ถูกลบ แต่จะถูก unlink จากครอก)`)) return;

    try {
      // Unlink babies first
      for (const baby of litter.babies) {
        await supabase
          .from('pets')
          .update({ litter_id: null })
          .eq('id', baby.id);
      }

      // Delete litter
      const { error } = await supabase
        .from('litters')
        .delete()
        .eq('id', litter.id);

      if (error) throw error;
      fetchLitters();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      alert(message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.push('/pets')}
              className="mb-2 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            >
              ← กลับไปหน้าสัตว์เลี้ยง
            </button>
            <h1 className="text-3xl font-bold text-gray-900">🐣 ประวัติการเกิด</h1>
            <p className="text-gray-600 mt-1">ครอกทั้งหมดที่บันทึกไว้</p>
          </div>
          <button
            onClick={() => router.push('/pets/birth')}
            className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            + บันทึกการเกิดใหม่
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6">
            ❌ {error}
          </div>
        )}

        {/* Litter List */}
        {litters.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-md">
            <div className="text-6xl mb-4">🥚</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">ยังไม่มีประวัติการเกิด</h3>
            <p className="text-gray-500 mb-6">เริ่มบันทึกครอกแรกของบ้านกันเลย</p>
            <button
              onClick={() => router.push('/pets/birth')}
              className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition"
            >
              🐣 บันทึกการเกิด
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {litters.map((litter) => (
              <div key={litter.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
                {/* Litter Header */}
                <div className="bg-gradient-to-r from-orange-50 to-pink-50 px-6 py-4 border-b border-orange-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">🐣 {litter.name}</h2>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                        {litter.birth_date && (
                          <span>📅 {format(new Date(litter.birth_date), 'd MMM yyyy', { locale: th })}</span>
                        )}
                        {litter.location && <span>📍 {litter.location}</span>}
                        {litter.mother_name && <span>🐱 แม่: {litter.mother_name}</span>}
                        {litter.father_name && <span>🐕 พ่อ: {litter.father_name}</span>}
                        <span>🐱 {litter.babies.length} ตัว</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteLitter(litter)}
                      className="text-red-400 hover:text-red-600 text-sm shrink-0"
                    >
                      🗑️
                    </button>
                  </div>
                  {litter.notes && (
                    <p className="text-sm text-gray-500 mt-2 italic">"{litter.notes}"</p>
                  )}
                </div>

                {/* Babies */}
                {litter.babies.length > 0 ? (
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {litter.babies.map((baby) => (
                        <button
                          key={baby.id}
                          onClick={() => router.push(`/pets/${baby.id}`)}
                          className="text-left p-4 bg-gray-50 rounded-xl hover:bg-orange-50 hover:border-orange-200 border border-gray-100 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-xl overflow-hidden shrink-0">
                              {baby.avatar_url ? (
                                <img src={baby.avatar_url} alt={baby.name} className="w-full h-full object-cover" />
                              ) : (
                                '🐱'
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-sm truncate">
                                {baby.name || 'ยังไม่ตั้งชื่อ'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {baby.gender === 'male' ? '♂ ผู้' : baby.gender === 'female' ? '♀ เมีย' : ''}
                                {baby.color && ` • ${baby.color}`}
                              </p>
                              {baby.pet_code && (
                                <p className="text-[10px] font-mono text-gray-400">{baby.pet_code}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    ไม่พบข้อมูลลูกในครอกนี้
                  </div>
                )}

                {/* Created at */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    สร้างเมื่อ {format(new Date(litter.created_at), 'd MMM yyyy HH:mm', { locale: th })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
