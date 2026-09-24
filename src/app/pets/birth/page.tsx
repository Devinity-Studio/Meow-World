'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { logInsertEvidence } from '@/utils/petInsertEvidence';
import { LitterFormData, BabyData, Pet } from '@/types/pet';
import { SPECIES_CONFIG, SpeciesType } from '@/types/species';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

type Step = 'shared' | 'babies' | 'review' | 'creating' | 'done';

const SPECIAL_TRAIT_OPTIONS = [
  { value: 'white_chest', label: 'White Chest', icon: '🤍' },
  { value: 'white_paws', label: 'White Paws', icon: '🐾' },
  { value: 'odd_eyes', label: 'Odd Eyes', icon: '👀' },
  { value: 'distinctive_marking', label: 'Distinctive Marking', icon: '✨' },
  { value: 'stripes', label: 'Stripes', icon: '🌈' },
];

export default function BirthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('shared');
  const [userId, setUserId] = useState<string | null>(null);
  const [homeId, setHomeId] = useState<string | null>(null);
  const [existingPets, setExistingPets] = useState<Pet[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Shared data (Step 1)
  const [sharedData, setSharedData] = useState<LitterFormData>({
    name: '',
    birth_date: format(new Date(), 'yyyy-MM-dd'),
    location: 'Home',
    notes: '',
    mother_id: null,
    father_id: null,
    mother_name: '',
    father_name: '',
  });

  // Baby data (Step 2)
  const [babies, setBabies] = useState<BabyData[]>([
    { name: '', gender: 'unknown', color: '' },
  ]);

  // Init
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      logInsertEvidence('SESSION', { authUid: user.id });

      const { data: homes } = await supabase
        .from('homes')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (!homes || homes.length === 0) {
        logInsertEvidence('HOME_LOOKUP', { authUid: user.id, homeId: null });
        setError('กรุณาสร้างบ้านก่อน');
        return;
      }
      setHomeId(homes[0].id);

      // 📷 Evidence: is this uid a home_members row? (RLS discriminator — read-only)
      const { data: membership } = await supabase
        .from('home_members')
        .select('home_id, role')
        .eq('user_id', user.id);
      logInsertEvidence('HOME_MEMBERSHIP', {
        authUid: user.id,
        homeId: homes[0].id,
        membership,
      });

      // Fetch existing pets for parent selection
      const { data: pets } = await supabase
        .from('pets')
        .select('*')
        .eq('home_id', homes[0].id)
        .eq('is_active', true)
        .order('name');

      setExistingPets(pets || []);

      // Auto-generate litter name
      const { count } = await supabase
        .from('litters')
        .select('*', { count: 'exact', head: true })
        .eq('home_id', homes[0].id);

      setSharedData((prev) => ({
        ...prev,
        name: `Litter #${String((count || 0) + 1).padStart(3, '0')}`,
      }));
    }
    void init();
  }, [supabase, router]);

  // Baby management
  function addBaby() {
    setBabies((prev) => [
      ...prev,
      { name: '', gender: 'unknown', color: '' },
    ]);
  }

  function removeBaby(index: number) {
    if (babies.length <= 1) return;
    setBabies((prev) => prev.filter((_, i) => i !== index));
  }

  function updateBaby(index: number, field: keyof BabyData, value: string | number | string[] | undefined) {
    setBabies((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  }

  function toggleTrait(babyIndex: number, trait: string) {
    setBabies((prev) =>
      prev.map((b, i) => {
        if (i !== babyIndex) return b;
        const current = b.special_traits || [];
        const updated = current.includes(trait)
          ? current.filter((t) => t !== trait)
          : [...current, trait];
        return { ...b, special_traits: updated };
      })
    );
  }

  // Find parent by ID or name
  function resolveParent(
    petId: string | null | undefined,
    nameFallback: string | null | undefined
  ): { id: string; name: string } | { id: null; name: string } {
    if (petId) {
      const pet = existingPets.find((p) => p.id === petId);
      if (pet) return { id: pet.id, name: pet.name };
    }
    return { id: null, name: nameFallback || '' };
  }

  // Create everything
  async function handleCreate() {
    if (!homeId || !userId) return;
    setStep('creating');
    setError(null);

    try {
      const mother = resolveParent(sharedData.mother_id, sharedData.mother_name);
      const father = resolveParent(sharedData.father_id, sharedData.father_name);

      // 1. Create litter
      const litterPayload = {
        home_id: homeId,
        name: sharedData.name,
        birth_date: sharedData.birth_date || null,
        location: sharedData.location,
        notes: sharedData.notes || null,
        mother_id: mother.id,
        father_id: father.id,
        mother_name: mother.name || null,
        father_name: father.name || null,
        created_by: userId,
      };
      const { data: litter, error: litterError } = await supabase
        .from('litters')
        .insert(litterPayload)
        .select()
        .single();

      logInsertEvidence('LITTER_INSERT', {
        authUid: userId,
        homeId,
        payload: litterPayload,
        error: litterError,
      });

      if (litterError) throw litterError;

      // 2. Create each baby pet
      const createdPets: { id: string; name: string }[] = [];

      for (const baby of babies) {
        const petPayload = {
          home_id: homeId,
          name: baby.name || `Baby #${createdPets.length + 1}`,
          nickname: baby.nickname || null,
          species: sharedData.location === 'Farm' ? 'Cat' : 'Cat', // default, user picks
          breed: baby.breed || null,
          gender: baby.gender || null,
          birth_date: baby.birth_date_override || sharedData.birth_date || null,
          color: baby.color || null,
          litter_id: litter.id,
          mother_id: mother.id,
          father_id: father.id,
          birth_weight: baby.birth_weight || null,
          special_traits: baby.special_traits?.length ? baby.special_traits : null,
        };
        const { data: pet, error: petError } = await supabase
          .from('pets')
          .insert(petPayload)
          .select('id, name')
          .single();

        logInsertEvidence('PET_INSERT', {
          authUid: userId,
          homeId,
          payload: petPayload,
          error: petError,
        });

        if (petError) throw petError;
        createdPets.push(pet);

        // 3. Create first Life Journey event for each baby
        const journeyContent = [
          `🐣 Chapter 01 — My Beginning`,
          ``,
          `Birth Event: ${sharedData.name}`,
          sharedData.birth_date ? `Birth Date: ${sharedData.birth_date}` : '',
          mother.name ? `Mother: ${mother.name}` : '',
          father.name ? `Father: ${father.name}` : '',
          baby.color ? `Color: ${baby.color}` : '',
          baby.birth_weight ? `Birth Weight: ${baby.birth_weight} g` : '',
          baby.special_traits?.length ? `Special Traits: ${baby.special_traits.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        const journeyPayload = {
          home_id: homeId,
          pet_id: pet.id,
          author_id: userId,
          event_type: 'milestone',
          content: journeyContent,
        };
        const { error: journeyError } = await supabase
          .from('life_journey_events')
          .insert(journeyPayload);

        logInsertEvidence('JOURNEY_INSERT', {
          authUid: userId,
          homeId,
          payload: journeyPayload,
          error: journeyError,
        });
      }

      setStep('done');
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String(err.message)
          : 'เกิดข้อผิดพลาด';
      logInsertEvidence('CREATE_ABORT', {
        authUid: userId,
        homeId,
        error: { message },
      });
      setError(message);
      setStep('review');
    }
  }

  // Auto-select species default breed from parent
  useEffect(() => {
    if (sharedData.mother_id) {
      const mother = existingPets.find((p) => p.id === sharedData.mother_id);
      if (mother?.breed) {
        setBabies((prev) =>
          prev.map((b) => (b.breed ? b : { ...b, breed: mother.breed! }))
        );
      }
    }
  }, [sharedData.mother_id, existingPets]);

  if (error && !step) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => router.push('/pets')} className="text-blue-600 hover:text-blue-800">
            ← กลับ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => {
            if (step === 'babies') setStep('shared');
            else if (step === 'review') setStep('babies');
            else router.push('/pets');
          }}
          className="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← {step === 'babies' ? 'แก้ไขข้อมูลกลุ่ม' : step === 'review' ? 'แก้ไขข้อมูลลูก' : 'กลับไปหน้าสัตว์เลี้ยง'}
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {(['shared', 'babies', 'review'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === s
                    ? 'bg-orange-500 text-white'
                    : (['shared', 'babies', 'review'].indexOf(step) > i)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="w-8 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Step 1: Shared Context */}
        {step === 'shared' && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🐣</div>
              <h1 className="text-2xl font-bold text-gray-900">บันทึกการเกิด</h1>
              <p className="text-gray-500 text-sm mt-1">ข้อมูลร่วมของครอก</p>
            </div>

            <div className="space-y-4">
              {/* Litter Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อครอก *</label>
                <input
                  type="text"
                  value={sharedData.name}
                  onChange={(e) => setSharedData({ ...sharedData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="เช่น Litter #003"
                />
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันเกิด *</label>
                <input
                  type="date"
                  value={sharedData.birth_date}
                  onChange={(e) => setSharedData({ ...sharedData, birth_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สถานที่</label>
                <div className="flex gap-2">
                  {['Home', 'Vet Clinic', 'Farm', 'Other'].map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setSharedData({ ...sharedData, location: loc })}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                        sharedData.location === loc
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {loc === 'Home' ? '🏠 บ้าน' : loc === 'Vet Clinic' ? '🏥 คลินิก' : loc === 'Farm' ? '🌾 ฟาร์ม' : '📍 อื่นๆ'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mother */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🐱 แม่</label>
                <select
                  value={sharedData.mother_id || ''}
                  onChange={(e) => setSharedData({ ...sharedData, mother_id: e.target.value || null, mother_name: '' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2"
                >
                  <option value="">-- เลือกจากสัตว์เลี้ยงในบ้าน --</option>
                  {existingPets.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                  ))}
                </select>
                {!sharedData.mother_id && (
                  <input
                    type="text"
                    value={sharedData.mother_name || ''}
                    onChange={(e) => setSharedData({ ...sharedData, mother_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="หรือพิมพ์ชื่อแม่..."
                  />
                )}
              </div>

              {/* Father */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🐕 พ่อ</label>
                <select
                  value={sharedData.father_id || ''}
                  onChange={(e) => setSharedData({ ...sharedData, father_id: e.target.value || null, father_name: '' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2"
                >
                  <option value="">-- เลือกจากสัตว์เลี้ยงในบ้าน --</option>
                  {existingPets.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                  ))}
                </select>
                {!sharedData.father_id && (
                  <input
                    type="text"
                    value={sharedData.father_name || ''}
                    onChange={(e) => setSharedData({ ...sharedData, father_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="หรือพิมพ์ชื่อพ่อ..."
                  />
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <textarea
                  value={sharedData.notes || ''}
                  onChange={(e) => setSharedData({ ...sharedData, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  rows={2}
                  placeholder="รายละเอียดเพิ่มเติม..."
                />
              </div>
            </div>

            <button
              onClick={() => setStep('babies')}
              disabled={!sharedData.name || !sharedData.birth_date}
              className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg transition disabled:opacity-50"
            >
              ถัดไป → เพิ่มลูก
            </button>
          </div>
        )}

        {/* Step 2: Baby Entries */}
        {step === 'babies' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold text-gray-900">ข้อมูลลูกแต่ละตัว</h1>
              <p className="text-gray-500 text-sm mt-1">{sharedData.name} • {babies.length} ตัว</p>
            </div>

            {babies.map((baby, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    🐣 ตัวที่ {index + 1}
                    {baby.name && ` — ${baby.name}`}
                  </h2>
                  {babies.length > 1 && (
                    <button
                      onClick={() => removeBaby(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ลบ
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Name */}
                  <input
                    type="text"
                    value={baby.name}
                    onChange={(e) => updateBaby(index, 'name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="ชื่อ (ถ้ายังไม่ตั้ง ปล่อยว่าง)"
                  />

                  {/* Gender */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">เพศ</label>
                    <div className="flex gap-2">
                      {[
                        { value: 'male', label: '♂ ผู้' },
                        { value: 'female', label: '♀ เมีย' },
                        { value: 'unknown', label: '❓ ไม่ทราบ' },
                      ].map((g) => (
                        <button
                          key={g.value}
                          onClick={() => updateBaby(index, 'gender', g.value)}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                            baby.gender === g.value
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">สี</label>
                    <input
                      type="text"
                      value={baby.color || ''}
                      onChange={(e) => updateBaby(index, 'color', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="เช่น Silver Tabby, Calico..."
                    />
                  </div>

                  {/* Breed (inherited from parent) */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">สายพันธุ์</label>
                    <input
                      type="text"
                      value={baby.breed || ''}
                      onChange={(e) => updateBaby(index, 'breed', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder={sharedData.mother_id ? `สืบทอดจากแม่...` : "เช่น British Shorthair..."}
                    />
                  </div>

                  {/* Birth Weight */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">น้ำหนักแรกเกิด (กรัม)</label>
                    <input
                      type="number"
                      value={baby.birth_weight || ''}
                      onChange={(e) => updateBaby(index, 'birth_weight', Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="เช่น 92"
                    />
                  </div>

                  {/* Special Traits */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">ลักษณะพิเศษ</label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIAL_TRAIT_OPTIONS.map((trait) => (
                        <button
                          key={trait.value}
                          onClick={() => toggleTrait(index, trait.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                            baby.special_traits?.includes(trait.value)
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {trait.icon} {trait.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Baby Button */}
            <button
              onClick={addBaby}
              className="w-full bg-white border-2 border-dashed border-gray-300 hover:border-orange-400 text-gray-600 hover:text-orange-600 font-medium py-4 rounded-2xl transition"
            >
              + เพิ่มลูกอีกตัว
            </button>

            {/* Next */}
            <button
              onClick={() => setStep('review')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg transition"
            >
              ถัดไป → ตรวจสอบ
            </button>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">✅</div>
              <h1 className="text-2xl font-bold text-gray-900">ตรวจสอบข้อมูล</h1>
            </div>

            {/* Litter Summary */}
            <div className="bg-orange-50 rounded-xl p-4 mb-4">
              <h3 className="font-bold text-gray-900 mb-2">🐣 {sharedData.name}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>📅 {sharedData.birth_date ? format(new Date(sharedData.birth_date), 'd MMM yyyy', { locale: th }) : '-'}</div>
                <div>📍 {sharedData.location}</div>
                {resolveParent(sharedData.mother_id, sharedData.mother_name).name && (
                  <div>🐱 แม่: {resolveParent(sharedData.mother_id, sharedData.mother_name).name}</div>
                )}
                {resolveParent(sharedData.father_id, sharedData.father_name).name && (
                  <div>🐕 พ่อ: {resolveParent(sharedData.father_id, sharedData.father_name).name}</div>
                )}
              </div>
            </div>

            {/* Baby List */}
            <div className="space-y-2 mb-6">
              {babies.map((baby, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-2xl">🐱</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{baby.name || `Baby #${i + 1}`}</p>
                    <p className="text-xs text-gray-500">
                      {baby.gender === 'male' ? '♂ ผู้' : baby.gender === 'female' ? '♀ เมีย' : '❓ ไม่ทราบ'}
                      {baby.color && ` • ${baby.color}`}
                      {baby.birth_weight && ` • ${baby.birth_weight}g`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">
                ❌ {error}
              </div>
            )}

            <button
              onClick={handleCreate}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg transition"
            >
              🐣 สร้าง Pet ID ทั้งหมด ({babies.length} ตัว)
            </button>
          </div>
        )}

        {/* Creating */}
        {step === 'creating' && (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <div className="text-6xl mb-4 animate-bounce">🐣</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">กำลังสร้าง...</h1>
            <p className="text-gray-500">สร้าง Pet ID และ Life Journey ให้ลูกแต่ละตัว</p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">สำเร็จ!</h1>
            <p className="text-gray-600 mb-6">
              สร้าง Pet ID ให้ลูก {babies.length} ตัวเรียบร้อย
            </p>
            <button
              onClick={() => router.push('/pets')}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold"
            >
              ไปดูสัตว์เลี้ยง
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
