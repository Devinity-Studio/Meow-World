'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Family, FamilyMember, JourneyEvent, Pet, UserProfile } from '@/types';
import { HomeMode } from '@/components/home/HomeMode';
import { buildJourneyEventPayload } from '@/utils/eventPayload';
import { JOURNEY_EVENT_COLUMNS, adaptJourneyEventRow, JourneyEventRow } from '@/utils/journeyAdapter';

interface Home {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface HomeMemberRow {
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  profiles: { display_name: string | null; avatar_url: string | null } | null;
}

export default function WorldPage() {
  const router = useRouter();
  const [home, setHome] = useState<Home | null>(null);
  const [homeName, setHomeName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Home Mode state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHome() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUser({
        id: user.id,
        email: user.email ?? undefined,
        displayName:
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          user.email?.split('@')[0] ||
          'ผู้เลี้ยง',
        avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? undefined,
      });

      const { data, error: homeError } = await supabase
        .from('homes')
        .select('id, name, description, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (homeError) {
        setError(homeError.message);
      } else {
        setHome(data);
      }
      setLoading(false);
    }

    void loadHome();
  }, [router]);

  // ─── Home Mode data: pets + members + journey feed ───
  useEffect(() => {
    async function loadHomeMode() {
      if (!home || !currentUser) return;
      const supabase = createClient();
      setFeedError(null);

      const [petsRes, membersRes, eventsRes] = await Promise.all([
        supabase
          .from('pets')
          .select('id, owner_id, name, species, breed, gender, birth_date, weight, avatar_url, created_at')
          .eq('home_id', home.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        supabase
          .from('home_members')
          .select('user_id, role, profiles(display_name, avatar_url)')
          .eq('home_id', home.id)
          .order('user_id'),
        supabase
          .from('life_journey_events')
          .select(JOURNEY_EVENT_COLUMNS)
          .eq('home_id', home.id)
          .order('created_at', { ascending: false }),
      ]);

      if (petsRes.error || membersRes.error || eventsRes.error) {
        setFeedError(
          petsRes.error?.message || membersRes.error?.message || eventsRes.error?.message || 'โหลดข้อมูลบ้านไม่สำเร็จ'
        );
        return;
      }

      setPets((petsRes.data ?? []) as Pet[]);

      const memberRows = (membersRes.data ?? []) as unknown as HomeMemberRow[];
      const familyMembers: FamilyMember[] = memberRows.map((row) => ({
        family_id: home.id,
        user_id: row.user_id,
        display_name: row.profiles?.display_name || 'สมาชิก',
        avatar_url: row.profiles?.avatar_url ?? undefined,
        role: row.role,
        joined_at: '',
      }));
      setMembers(familyMembers);

      const authorNameById = new Map(familyMembers.map((m) => [m.user_id, m.display_name]));
      setEvents(
        (eventsRes.data as JourneyEventRow[]).map((row) =>
          adaptJourneyEventRow(row, row.author_id ? authorNameById.get(row.author_id) : undefined)
        )
      );
    }

    void loadHomeMode();
  }, [home, currentUser]);

  // ─── Composer → buildJourneyEventPayload → POST (integrity gate อยู่ที่ payload layer เสมอ) ───
  async function handleAddEvent(eventData: {
    pet_id?: string;
    tagged_pet_ids?: string[];
    tagged_user_ids?: string[];
    event_date: string;
    event_type: string;
    title: string;
    description: string;
    image_url?: string;
    video_url?: string;
  }) {
    if (!home || !currentUser || posting) return;
    setPosting(true);
    setFormError(null);

    // content contract: บรรทัดแรก = หัวข้อ ที่เหลือ = เรื่องราว (adapter split กลับตอนอ่าน)
    const content = [eventData.title, eventData.description].filter(Boolean).join('\n');

    const result = buildJourneyEventPayload(
      {
        homeId: home.id,
        authorId: currentUser.id,
        content,
        eventType: eventData.event_type,
        petId: eventData.pet_id ?? null,
        taggedPetIds: eventData.tagged_pet_ids ?? [],
        participantIds: eventData.tagged_user_ids ?? [],
      },
      {
        petHomeIds: Object.fromEntries(pets.map((p) => [p.id, (p as Pet & { home_id?: string }).home_id ?? home.id])),
        memberUserIds: members.map((m) => m.user_id),
      }
    );

    if (result.invalid) {
      // Cross-home / ไม่ใช่ member — ถูก gate ก่อน POST ตาม Business Validation Contract
      setFormError(result.reason);
      setPosting(false);
      return;
    }

    const { error: insertError } = await createClient()
      .from('life_journey_events')
      .insert(result.payload);

    if (insertError) {
      setFormError(insertError.message);
      setPosting(false);
      return;
    }

    const { data: created, error: refetchError } = await createClient()
      .from('life_journey_events')
      .select(JOURNEY_EVENT_COLUMNS)
      .eq('home_id', home.id)
      .order('created_at', { ascending: false });

    if (!refetchError && created) {
      const authorNameById = new Map(members.map((m) => [m.user_id, m.display_name]));
      setEvents(
        (created as JourneyEventRow[]).map((row) =>
          adaptJourneyEventRow(row, row.author_id ? authorNameById.get(row.author_id) : undefined)
        )
      );
    }
    setPosting(false);
  }

  // Drift Inventory: like/comment ยังไม่มี storage (ไม่มีตาราง journey_likes/journey_comments
  // ใน repo และ prod) — no-op เฉพาะเพื่อ satisfy existing props ตาม Design Lock ข้อ 4
  const handleToggleLike = (_eventId: string) => {};
  const handleAddComment = (_eventId: string, _commentText: string) => {};

  async function handleCreateHome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = homeName.trim();

    if (!name) {
      setError('กรุณาระบุชื่อบ้าน');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: createdHome, error: createError } = await supabase
        .from('homes')
        .insert({
          name,
          description: description.trim() || null,
          owner_id: user.id,
        })
        .select('id, name, description, created_at')
        .single();

      if (createError) throw createError;

      const { error: memberError } = await supabase
        .from('home_members')
        .insert({
          home_id: createdHome.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) {
        await supabase.from('homes').delete().eq('id', createdHome.id);
        throw memberError;
      }

      setHome(createdHome);
      setHomeName('');
      setDescription('');
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : 'ไม่สามารถสร้างบ้านได้');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-gray-50 p-8 text-center text-gray-600">กำลังโหลดข้อมูลบ้าน...</main>;
  }

  if (error && !home) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-red-600">เกิดข้อผิดพลาด: {error}</p>
          <button onClick={() => router.push('/')} className="mt-4 rounded-xl bg-gray-900 px-5 py-2 text-white">
            กลับหน้าหลัก
          </button>
        </div>
      </main>
    );
  }

  if (!home) {
    return (
      <main className="min-h-screen bg-orange-50 px-4 py-12">
        <form onSubmit={handleCreateHome} className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">สร้างบ้านของคุณ</h1>
          <p className="mt-2 text-gray-600">เริ่มต้นพื้นที่สำหรับสมาชิกและแมวของคุณ</p>

          <label htmlFor="home-name" className="mt-6 block text-sm font-medium text-gray-700">ชื่อบ้าน *</label>
          <input
            id="home-name"
            value={homeName}
            onChange={(event) => setHomeName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            placeholder="เช่น บ้านของเรา"
            required
          />

          <label htmlFor="home-description" className="mt-4 block text-sm font-medium text-gray-700">คำอธิบาย</label>
          <textarea
            id="home-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            rows={3}
            placeholder="คำอธิบายบ้าน (ถ้ามี)"
          />

          {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving || !homeName.trim()}
            className="mt-6 w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'สร้างบ้าน'}
          </button>
        </form>
      </main>
    );
  }

  // มีบ้าน → Home Mode (JourneyComposer + Journey Feed + Birth Event เดิมอ่านผ่าน adapter)
  const family: Family = {
    id: home.id,
    name: home.name,
    owner_id: currentUser?.id ?? '',
    created_at: home.created_at,
  };

  const userRole = members.find((m) => m.user_id === currentUser?.id)?.role ?? 'owner';

  return (
    <main className="min-h-screen bg-[#FAF7F2] px-4 py-8">
      {feedError && (
        <div className="mx-auto mb-4 max-w-3xl rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          โหลดข้อมูลบางส่วนไม่สำเร็จ: {feedError}
        </div>
      )}
      <div className="mx-auto max-w-5xl">
        <HomeMode
          family={family}
          members={members}
          pets={pets}
          events={events}
          currentUser={currentUser ?? { id: '', displayName: 'ผู้เลี้ยง' }}
          userRole={userRole}
          onOpenMembersModal={() => {}}
          onOpenQRInviteModal={() => {}}
          onSelectPet={(petId) => router.push(`/pets/${petId}`)}
          onAddNewPet={() => router.push('/pets')}
          onAddEvent={handleAddEvent}
          onToggleLike={handleToggleLike}
          onAddComment={handleAddComment}
        />
        {formError && (
          <div role="alert" className="mx-auto mt-4 max-w-3xl rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {formError}
          </div>
        )}
      </div>
    </main>
  );
}