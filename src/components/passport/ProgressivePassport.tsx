'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Pet } from '@/types/pet';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface ParentInfo {
  id: string;
  name: string;
  species: string;
  breed: string | null;
}

interface PassportField {
  key: string;
  label: string;
  icon: string;
  value: string | null;
  hasData: boolean;
  category: 'identity' | 'family' | 'health' | 'future';
}

interface ProgressivePassportProps {
  petId: string;
  onClose?: () => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  identity: { label: 'ข้อมูลประจำตัว', color: 'text-[#E06D53]' },
  family: { label: 'ครอบครัว', color: 'text-[#6B8E68]' },
  health: { label: 'สุขภาพ', color: 'text-[#5B8DB8]' },
  future: { label: 'ข้อมูลเพิ่มเติม', color: 'text-[#8C867E]' },
};

export function ProgressivePassport({ petId, onClose }: ProgressivePassportProps) {
  const supabase = createClient();
  const [pet, setPet] = useState<Pet | null>(null);
  const [mother, setMother] = useState<ParentInfo | null>(null);
  const [father, setFather] = useState<ParentInfo | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPet = useCallback(async () => {
    setLoading(true);
    try {
      const { data: petData, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .single();

      if (error || !petData) return;
      setPet(petData);

      // Fetch parents
      if (petData.mother_id) {
        const { data } = await supabase
          .from('pets')
          .select('id, name, species, breed')
          .eq('id', petData.mother_id)
          .single();
        setMother(data);
      }
      if (petData.father_id) {
        const { data } = await supabase
          .from('pets')
          .select('id, name, species, breed')
          .eq('id', petData.father_id)
          .single();
        setFather(data);
      }

      // Count events
      const { count } = await supabase
        .from('life_journey_events')
        .select('*', { count: 'exact', head: true })
        .eq('pet_id', petId);
      setEventCount(count || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [petId, supabase]);

  useEffect(() => {
    void fetchPet();
  }, [fetchPet]);

  if (loading || !pet) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <p className="text-gray-600">กำลังโหลด Passport...</p>
        </div>
      </div>
    );
  }

  // Build passport fields
  const fields: PassportField[] = [
    // Identity
    {
      key: 'pet_code',
      label: 'Pet ID',
      icon: '🪪',
      value: pet.pet_code || null,
      hasData: !!pet.pet_code,
      category: 'identity',
    },
    {
      key: 'name',
      label: 'ชื่อ',
      icon: '📛',
      value: pet.name,
      hasData: !!pet.name,
      category: 'identity',
    },
    {
      key: 'avatar',
      label: 'รูปภาพ',
      icon: '📷',
      value: pet.avatar_url ? '✓ มีรูป' : null,
      hasData: !!pet.avatar_url,
      category: 'identity',
    },
    {
      key: 'species',
      label: 'ชนิดสัตว์',
      icon: '🐾',
      value: pet.species,
      hasData: !!pet.species,
      category: 'identity',
    },
    {
      key: 'breed',
      label: 'สายพันธุ์',
      icon: '🧬',
      value: pet.breed || null,
      hasData: !!pet.breed,
      category: 'identity',
    },
    {
      key: 'gender',
      label: 'เพศ',
      icon: '⚤',
      value: pet.gender === 'male' ? '♂ ผู้' : pet.gender === 'female' ? '♀ เมีย' : null,
      hasData: !!pet.gender,
      category: 'identity',
    },
    {
      key: 'birth_date',
      label: 'วันเกิด',
      icon: '🎂',
      value: pet.birth_date ? format(new Date(pet.birth_date), 'd MMMM yyyy', { locale: th }) : null,
      hasData: !!pet.birth_date,
      category: 'identity',
    },
    {
      key: 'color',
      label: 'สี',
      icon: '🎨',
      value: pet.color || null,
      hasData: !!pet.color,
      category: 'identity',
    },

    // Family
    {
      key: 'mother',
      label: 'แม่',
      icon: '🐱',
      value: mother?.name || null,
      hasData: !!mother?.name,
      category: 'family',
    },
    {
      key: 'father',
      label: 'พ่อ',
      icon: '🐕',
      value: father?.name || null,
      hasData: !!father?.name,
      category: 'family',
    },
    {
      key: 'litter',
      label: 'ครอก',
      icon: '🐣',
      value: pet.litter_id ? '✓ มาจากครอก' : null,
      hasData: !!pet.litter_id,
      category: 'family',
    },

    // Health
    {
      key: 'weight',
      label: 'น้ำหนัก',
      icon: '⚖️',
      value: pet.weight ? `${pet.weight} kg` : null,
      hasData: !!pet.weight,
      category: 'health',
    },
    {
      key: 'birth_weight',
      label: 'น้ำหนักแรกเกิด',
      icon: '👶',
      value: pet.birth_weight ? `${pet.birth_weight} g` : null,
      hasData: !!pet.birth_weight,
      category: 'health',
    },
    {
      key: 'events',
      label: 'Life Journey',
      icon: '📸',
      value: eventCount > 0 ? `${eventCount} เหตุการณ์` : null,
      hasData: eventCount > 0,
      category: 'health',
    },

    // Future (always empty — progressive)
    {
      key: 'microchip',
      label: 'Microchip',
      icon: '📡',
      value: null,
      hasData: false,
      category: 'future',
    },
    {
      key: 'biometrics',
      label: 'Biometrics',
      icon: '🔬',
      value: null,
      hasData: false,
      category: 'future',
    },
    {
      key: 'certificate',
      label: 'ใบรับรอง',
      icon: '📜',
      value: null,
      hasData: false,
      category: 'future',
    },
  ];

  const totalFields = fields.length;
  const filledFields = fields.filter((f) => f.hasData).length;
  const completeness = Math.round((filledFields / totalFields) * 100);

  const categories = ['identity', 'family', 'health', 'future'] as const;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Dark passport style */}
        <div className="bg-gradient-to-br from-[#1F1E1D] to-[#2D2A26] text-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-radial from-[#E06D53]/15 to-transparent rounded-full blur-2xl" />

          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#E8D28A] bg-[#383532] shrink-0">
                {pet.avatar_url ? (
                  <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-serif text-2xl font-bold text-[#E06D53]">
                    {pet.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E8D28A]/20 text-[#E8D28A] border border-[#E8D28A]/40 uppercase tracking-wider">
                  PET PASSPORT
                </span>
                <h2 className="font-serif font-bold text-xl mt-1">{pet.name}</h2>
                {pet.pet_code && (
                  <p className="text-xs font-mono text-[#E8D28A]">{pet.pet_code}</p>
                )}
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className="text-white/60 hover:text-white text-xl">✕</button>
            )}
          </div>

          {/* Completeness bar */}
          <div className="mt-4 relative z-10">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono text-[#BDB7AE]">ความสมบูรณ์ของ Identity</span>
              <span className="text-[10px] font-mono text-[#E8D28A] font-bold">{filledFields}/{totalFields} ({completeness}%)</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#E8D28A] to-[#C89933] rounded-full transition-all duration-500"
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        </div>

        {/* Fields by category */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {categories.map((cat) => {
            const catFields = fields.filter((f) => f.category === cat);
            const catFilled = catFields.filter((f) => f.hasData).length;
            const catConfig = CATEGORY_LABELS[cat];

            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-bold ${catConfig.color}`}>{catConfig.label}</h3>
                  <span className="text-[10px] font-mono text-gray-400">{catFilled}/{catFields.length}</span>
                </div>
                <div className="space-y-2">
                  {catFields.map((field) => (
                    <div
                      key={field.key}
                      className={`flex items-center gap-3 p-3 rounded-xl transition ${
                        field.hasData
                          ? 'bg-[#FAF7F2] border border-[#E8E2D9]'
                          : 'bg-gray-50 border border-dashed border-gray-200'
                      }`}
                    >
                      <span className="text-lg w-8 text-center">{field.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">{field.label}</p>
                        {field.hasData ? (
                          <p className="text-sm font-bold text-gray-900 truncate">{field.value}</p>
                        ) : (
                          <p className="text-xs text-gray-400 italic">ยังไม่มีข้อมูล</p>
                        )}
                      </div>
                      <span className={`text-lg shrink-0 ${field.hasData ? 'text-green-500' : 'text-gray-300'}`}>
                        {field.hasData ? '✓' : '○'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400">
            💡 Passport นี้จะสมบูรณ์ขึ้นเมื่อคุณเพิ่มข้อมูล — ไม่ต้องกรอกทุกอย่างวันแรก
          </p>
        </div>
      </div>
    </div>
  );
}
