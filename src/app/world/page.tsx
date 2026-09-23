'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface Home {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function WorldPage() {
  const router = useRouter();
  const [home, setHome] = useState<Home | null>(null);
  const [homeName, setHomeName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHome() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

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

  return (
    <main className="min-h-screen bg-orange-50 px-4 py-12">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-orange-600">บ้านของคุณ</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">{home.name}</h1>
        {home.description && <p className="mt-3 text-gray-600">{home.description}</p>}
        <p className="mt-6 text-sm text-gray-500">บ้านนี้ถูกบันทึกไว้แล้ว และจะยังอยู่ที่นี่เมื่อคุณกลับมาอีกครั้ง</p>
      </section>
    </main>
  );
}