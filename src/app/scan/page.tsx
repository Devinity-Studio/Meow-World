'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { fetchInvitePreview, joinHomeWithInvite, inviteErrorToThai } from '@/lib/invitations';

type Step = 'idle' | 'submitting' | 'joining' | 'success' | 'error';

export default function ScanPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [preview, setPreview] = useState<{ name: string; description: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: family family (family) token family input
  // FAM-XXXXXXXX รับได้ พร้อม แม่พิมพ์ไหว้ครับ
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCode(e.target.value.toUpperCase());
  }

  // Step 2: preview family step 1 family (family) preview of family target home
  // ไม่ให้ preview เป็นอุปสรรคในการ join ครับ (incomplete = valid)
  async function handlePreview() {
    try {
      const data = await fetchInvitePreview(code);
      setPreview({ name: data.home_name, description: data.home_description });
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'ไม่สามารถตรวจสอบรหัสเชิญได้');
      setPreview(null);
    }
  }

  // Step 3: join family — design lock + join → membership atomic + consume token
  // membership ไม่สำเร็จ = token ยังคงใช้ได้ (ไม่ให้ code ฟรีหมด)
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setStep('submitting');
    setError(null);
    const result = await joinHomeWithInvite(code.trim());
    if (!result.ok) {
      setStep('error');
      setError(result.reason);
      return;
    }
    setStep('joining');
    setTimeout(() => {
      router.push('/world');
    }, 1200);
  }

  if (step === 'success') {
    return (
      <main className="min-h-screen bg-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">เข้าร่วมบ้านสำเร็จ!</h1>
          <p className="text-gray-600 mb-6">คุณเป็นสมาชิกของบ้านแล้ว — กลับไปที่บ้านของเราเพื่อเริ่มใช้งานร่วมกัน</p>
          <button
            onClick={() => router.push('/world')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl"
          >
            ไปที่บ้านของเรา
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-orange-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">สแกนเชิญเข้าบ้าน</h1>
        <p className="text-sm text-gray-600 mb-6">
          พิมพ์รหัสเชิญที่ได้รับ (FAM-A7K3Q9MX แบบ) เพื่อเข้าร่วมครอบครัว
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสเชิญ (FAM-XXXXXXXX)
            </label>
            <input
              type="text"
              value={code}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none uppercase"
              placeholder="เช่น FAM-A7K3Q9MX"
              autoFocus
            />
          </div>

          {preview ? (
            <div className="bg-orange-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">กำลังตรวจสอบรหัสเชิญ...</p>
              <h2 className="text-lg font-bold text-gray-900">{preview.name}</h2>
              {preview.description && <p className="text-sm text-gray-600 mt-1">{preview.description}</p>}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">รหัสเชิญ</p>
              <p className="font-mono text-sm text-gray-700">{code || '—'}</p>
            </div>
          )}

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!code.trim()}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 disabled:opacity-50"
            >
              ตรวจสอบ
            </button>
            <button
              type="submit"
              disabled={!code.trim() || step === 'submitting' || step === 'joining'}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {step === 'submitting' ? 'กำลังตรวจสอบ...' : 'เข้าร่วมบ้าน'}
            </button>
          </div>
        </form>

        <p className="text-[10px] text-gray-400 mt-4">
          มีรหัสเชิญหรือไม่? พิมพ์รหัส FAM-XXXXXXXX ที่เจ้าของบ้านส่งมา
        </p>
      </div>
    </main>
  );
}
