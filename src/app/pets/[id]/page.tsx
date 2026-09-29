'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pet, LifeJourneyEvent, LifeJourneyEventFormData } from '@/types/pet';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { createClient } from '@/utils/supabase/client';
import {
  readPetIdentity,
  breedLabels,
  colorLabels,
  patternLabel,
  colorCountLabel,
} from '@/utils/petIdentity';
import { ShareButton } from '@/components/qr/ShareButton';
import { TokenList } from '@/components/qr/TokenList';
import { ProgressivePassport } from '@/components/passport/ProgressivePassport';
import { useRef } from 'react';
import { CertificateSection } from '@/components/certificate/CertificateSection';
import { setPetProfileImage, clearPetProfileImage } from '@/utils/petProfileImage';

const EVENT_TYPES = [
  { value: 'medical', label: 'การรักษาพยาบาล', color: 'bg-red-100 text-red-800' },
  { value: 'vaccine', label: 'วัคซีน', color: 'bg-blue-100 text-blue-800' },
  { value: 'milestone', label: 'พัฒนาการ', color: 'bg-green-100 text-green-800' },
  { value: 'memory', label: 'ความทรงจำ', color: 'bg-purple-100 text-purple-800' },
];

export default function PetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const petId = params.id as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [events, setEvents] = useState<LifeJourneyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [showPassport, setShowPassport] = useState(false);
  const [certContext, setCertContext] = useState<{ homeId: string; userId: string } | null>(null);
  const [profileUploading, setProfileUploading] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const fetchPetData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: petData, error: petError } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .single();

      if (petError) throw petError;
      setPet(petData);

      // Query life_journey_events using created_at for ordering
      const { data: eventsData, error: eventsError } = await supabase
        .from('life_journey_events')
        .select('*')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Certificate context — home ของน้อง (RLS ตาราง digital_certificates ผูก home_members)
      const { data: certHome } = await supabase
        .from('home_members')
        .select('home_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .limit(1);
      if (certHome && certHome.length > 0) {
        setCertContext({ homeId: certHome[0].home_id, userId: (await supabase.auth.getUser()).data.user!.id });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลสัตว์เลี้ยงได้';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [petId, supabase]);

  // Profile Image — Visual Identity (1 รูป · เปลี่ยนได้ · ล้างได้ · ไม่บังคับ)
  // ห้ามใช้รูป infer Breed/Colour/Pattern · ไม่เกี่ยวกับ Passport Profile/Biometrics
  async function handleProfileImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !certContext) return;
    try {
      setProfileUploading(true);
      await setPetProfileImage({ homeId: certContext.homeId, petId, file });
      await fetchPetData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'นำเข้ารูปไม่สำเร็จ');
    } finally {
      setProfileUploading(false);
    }
  }

  async function handleProfileImageClear() {
    try {
      setProfileUploading(true);
      await clearPetProfileImage(petId);
      await fetchPetData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'ล้างรูปไม่สำเร็จ');
    } finally {
      setProfileUploading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPetData();
  }, [fetchPetData]);

  async function handleAddEvent(data: LifeJourneyEventFormData) {
    try {
      setSubmitting(true);

      // Get user's home_id for the event
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้');

      const { data: homes } = await supabase
        .from('homes')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (!homes || homes.length === 0) {
        throw new Error('ไม่พบบ้าน');
      }

      // Map form data to DB fields
      // title + description → content field
      // event_date is stored as metadata in content or just use created_at
      const contentParts: string[] = [];
      if (data.title) contentParts.push(data.title);
      if (data.description) contentParts.push(data.description);

      const { error } = await supabase
        .from('life_journey_events')
        .insert({
          pet_id: petId,
          home_id: homes[0].id,
          author_id: user.id,
          event_type: data.event_type,
          content: contentParts.join('\n'),
        });

      if (error) throw error;

      setShowEventForm(false);
      fetchPetData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเพิ่มเหตุการณ์';
      alert(`เกิดข้อผิดพลาด: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm('คุณต้องการลบเหตุการณ์นี้ใช่หรือไม่?')) return;

    try {
      const { error } = await supabase
        .from('life_journey_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      fetchPetData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบเหตุการณ์';
      alert(`เกิดข้อผิดพลาด: ${message}`);
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

  const age = pet.birth_date ? calculateAge(pet.birth_date) : null;

  // §16 — identity ใหม่เมื่อมี · legacy free text แสดงต่อเมื่อยังไม่มี structured data
  const identity = readPetIdentity(pet);
  const breedText =
    identity.breed_ids.length > 0
      ? breedLabels(identity.breed_ids).join(' + ')
      : identity.legacyBreed;
  const colorText =
    identity.colors.length > 0 ? colorLabels(identity.colors).join(' ') : pet.color;
  const patternText = patternLabel(identity.color_pattern);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/pets')}
          className="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← กลับไปหน้ารายชื่อ
        </button>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start gap-4 min-w-0">
              {/* Profile Image — 1 รูป · เปลี่ยน/ล้างได้ · ไม่บังคับ */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#F3EFEA] border-2 border-white shadow-sm">
                  {pet.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
                  )}
                </div>
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileImageChange}
                />
                <div className="absolute -bottom-2 -right-2 flex gap-1">
                  <button
                    type="button"
                    aria-label={pet.avatar_url ? 'เปลี่ยนรูปประจำตัว' : 'เพิ่มรูปประจำตัว'}
                    title="รูปประจำตัวน้อง (ไม่บังคับ)"
                    disabled={profileUploading}
                    onClick={() => profileInputRef.current?.click()}
                    className="w-7 h-7 rounded-full bg-white border border-gray-300 shadow-sm text-xs hover:bg-gray-50 disabled:opacity-50"
                  >
                    {profileUploading ? '…' : pet.avatar_url ? '✏️' : '📷'}
                  </button>
                  {pet.avatar_url && (
                    <button
                      type="button"
                      aria-label="ล้างรูปประจำตัว"
                      title="ล้างรูปประจำตัว"
                      disabled={profileUploading}
                      onClick={handleProfileImageClear}
                      className="w-7 h-7 rounded-full bg-white border border-gray-300 shadow-sm text-xs hover:bg-gray-50 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{pet.name}</h1>
                <p className="text-gray-600 mt-1">
                  {pet.species}{breedText && ` - ${breedText}`}
                  {age && ` • ${age}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPassport(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#1F1E1D] to-[#2D2A26] text-white rounded-md hover:opacity-90 text-sm font-bold"
              >
                📋 Passport
              </button>
              <ShareButton petId={petId} petName={pet.name} />
              <button
                onClick={() => setShowTokens(true)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                🔑 Tokens
              </button>
              <button
                onClick={() => router.push(`/pets/${petId}/edit`)}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                แก้ไขข้อมูล
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            {pet.nickname && (
              <div>
                <p className="text-sm text-gray-500">ชื่อเล่น</p>
                <p className="font-medium">{pet.nickname}</p>
              </div>
            )}
            {pet.gender && (
              <div>
                <p className="text-sm text-gray-500">เพศ</p>
                <p className="font-medium">{pet.gender}</p>
              </div>
            )}
            {pet.birth_date && (
              <div>
                <p className="text-sm text-gray-500">วันเกิด</p>
                <p className="font-medium">
                  {format(new Date(pet.birth_date), 'd MMM yyyy', { locale: th })}
                </p>
              </div>
            )}
            {colorText && (
              <div>
                <p className="text-sm text-gray-500">สี</p>
                <p className="font-medium">
                  {colorText}
                  {identity.colors.length > 1 && colorCountLabel(identity.colors) && ` (${colorCountLabel(identity.colors)})`}
                  {patternText && ` · ${patternText}`}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">สร้างเมื่อ</p>
              <p className="font-medium">
                {format(new Date(pet.created_at), 'd MMM yyyy', { locale: th })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Life Journey</h2>
            <button
              onClick={() => setShowEventForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + เพิ่มเหตุการณ์
            </button>
          </div>

          {showEventForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">เพิ่มเหตุการณ์ใหม่</h3>
                <EventForm
                  onSubmit={handleAddEvent}
                  onCancel={() => setShowEventForm(false)}
                  isLoading={submitting}
                />
              </div>
            </div>
          )}

          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ยังไม่มีเหตุการณ์ใน Life Journey
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => {
                const eventType = EVENT_TYPES.find(e => e.value === event.event_type);
                // Parse content to extract title and description
                const contentLines = (event.content || '').split('\n');
                const title = contentLines[0] || 'ไม่มีหัวข้อ';
                const description = contentLines.slice(1).join('\n') || null;

                return (
                  <div
                    key={event.id}
                    className="border-l-4 border-blue-500 pl-4 py-2 relative"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${eventType?.color || 'bg-gray-100 text-gray-800'}`}>
                            {eventType?.label || event.event_type}
                          </span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(event.created_at), 'd MMM yyyy', { locale: th })}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900">{title}</h4>
                        {description && (
                          <p className="text-gray-600 mt-1">{description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-red-600 hover:text-red-800 text-sm ml-4"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Certificate Section (V.0.999) — Import เอกสารจริง + เปิดดู */}
      {certContext && (
        <CertificateSection petId={petId} homeId={certContext.homeId} userId={certContext.userId} />
      )}

      {/* Token List Modal */}
      {showTokens && (
        <TokenList petId={petId} onClose={() => setShowTokens(false)} />
      )}

      {/* Progressive Passport Modal */}
      {showPassport && (
        <ProgressivePassport petId={petId} onClose={() => setShowPassport(false)} />
      )}
    </div>
  );
}

function EventForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (data: LifeJourneyEventFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<LifeJourneyEventFormData>({
    event_date: new Date().toISOString().substring(0, 10),
    event_type: 'memory',
    title: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          วันที่ *
        </label>
        <input
          type="date"
          required
          value={formData.event_date}
          onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ประเภทเหตุการณ์ *
        </label>
        <select
          required
          value={formData.event_type}
          onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {EVENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          หัวข้อ *
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="เช่น ฉีดวัคซีนเข็มแรก, เดินได้ก้าวแรก"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          รายละเอียด
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="เพิ่มเติมรายละเอียด..."
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
          {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </form>
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
