'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  validateToken,
  type TokenInfo,
  type TokenContext,
  type TokenValidationResult,
  CONTEXT_DISPLAY,
} from '@/lib/token-validation';

/** Shape of token data used in the adopt page (flattened from API response) */
interface QRTokenData {
  id: string;
  pet_id: string;
  sender_id: string;
  context: string;
  message: string | null;
  is_used: boolean;
  expires_at: string | null;
  created_at: string;
  // Joined data
  pet?: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    avatar_url: string | null;
  };
  sender?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

type AdoptStep = 'loading' | 'login' | 'preview' | 'create-home' | 'success' | 'error';

export default function AdoptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const supabase = createClient();

  const [step, setStep] = useState<AdoptStep>('loading');
  const [tokenData, setTokenData] = useState<QRTokenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [homeName, setHomeName] = useState('บ้านของเรา');
  const [isProcessing, setIsProcessing] = useState(false);

  // Check session and load token data via Validation API
  useEffect(() => {
    async function init() {
      try {
        // Get current user (may be null if not logged in)
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (session) {
          setUser({ id: session.user.id, email: session.user.email });
        }

        // Validate token via centralized API (handles all 4 layers)
        const result: TokenValidationResult = await validateToken(token, userId);

        if (!result.valid || !result.token) {
          setError(result.error?.message_th || 'QR Token ไม่ถูกต้อง');
          setStep('error');
          return;
        }

        // Map API response to local QRTokenData shape
        const t = result.token;
        setTokenData({
          id: t.id,
          pet_id: t.pet?.id || '',
          sender_id: t.sender?.id || '',
          context: t.context,
          message: t.message,
          is_used: false,
          expires_at: t.expires_at,
          created_at: t.created_at,
          pet: t.pet || undefined,
          sender: t.sender ? { ...t.sender, avatar_url: null } : undefined,
        });

        if (session) {
          setStep('preview');
        } else {
          setStep('login');
        }
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        setStep('error');
      }
    }

    init();
  }, [token]);

  // One-Click Login with Google
  async function handleOneClickLogin() {
    setIsProcessing(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/adopt/${token}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการ login');
      setIsProcessing(false);
    }
  }

  // Create home and adopt pet
  async function handleAdopt() {
    if (!user || !tokenData) return;
    
    setIsProcessing(true);
    try {
      // Guard: prevent sender from adopting their own pet
      if (user.id === tokenData.sender_id) {
        throw new Error('คุณไม่สามารถ adopt สัตว์ของตัวเองได้');
      }

      // 1. Mark token as used FIRST (prevent race condition)
      const { error: tokenUpdateError } = await supabase
        .from('qr_tokens')
        .update({
          is_used: true,
          used_by: user.id,
          used_at: new Date().toISOString(),
        })
        .eq('id', token)
        .eq('is_used', false); // optimistic lock

      if (tokenUpdateError) throw tokenUpdateError;

      // Re-check that the update actually affected a row (race condition safety)
      const { data: verifyToken } = await supabase
        .from('qr_tokens')
        .select('is_used, used_by')
        .eq('id', token)
        .single();

      if (!verifyToken || verifyToken.used_by !== user.id) {
        throw new Error('QR Token นี้ถูกใช้โดยคนอื่นไปแล้ว');
      }

      // 2. Check if user already has a home
      const { data: existingHomes } = await supabase
        .from('homes')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      let homeId: string;

      if (existingHomes && existingHomes.length > 0) {
        homeId = existingHomes[0].id;
      } else {
        // Create new home
        const { data: newHome, error: homeError } = await supabase
          .from('homes')
          .insert({ name: homeName, owner_id: user.id })
          .select()
          .single();

        if (homeError) throw homeError;
        homeId = newHome.id;

        // Add user as owner in home_members
        await supabase.from('home_members').insert({
          home_id: homeId,
          user_id: user.id,
          role: 'owner',
        });
      }

      // 3. Transfer pet to new home
      const { error: petError } = await supabase
        .from('pets')
        .update({ home_id: homeId })
        .eq('id', tokenData.pet_id);

      if (petError) throw petError;

      // 4. Show success
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการรับน้อง');
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  }

  // Render based on step
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐱</div>
          <p className="text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="text-6xl mb-4">😿</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">เกิดข้อผิดพลาด</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  if (step === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="text-6xl mb-4">🐱</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">มาadoptน้องกันเถอะ!</h1>
          <p className="text-gray-600 mb-2">กดปุ่มเดียวเพื่อเข้าสู่ระบบ</p>
          <p className="text-sm text-gray-500 mb-6">ป้องกันข้อมูลน้องหาย</p>

          <button
            onClick={handleOneClickLogin}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl py-4 px-4 font-bold hover:bg-gray-50 transition shadow-sm disabled:opacity-50 text-lg"
          >
            {isProcessing ? (
              <span className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full"></span>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                เข้าสู่ระบบด้วย Google
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'preview' && tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">📦</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">มา adopt น้องกัน!</h1>
            <p className="text-gray-600">{tokenData.sender?.display_name || 'Someone'} ชวนคุณมารับน้อง</p>
          </div>

          {/* Pet Preview */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-4xl overflow-hidden">
                {tokenData.pet?.avatar_url ? (
                  <img 
                    src={tokenData.pet.avatar_url} 
                    alt={tokenData.pet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  '🐱'
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{tokenData.pet?.name}</h2>
                <p className="text-gray-600">{tokenData.pet?.species}</p>
                {tokenData.pet?.breed && (
                  <p className="text-sm text-gray-500">{tokenData.pet.breed}</p>
                )}
              </div>
            </div>
          </div>

          {/* Message */}
          {tokenData.message && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <p className="text-blue-800 text-sm italic">"{tokenData.message}"</p>
            </div>
          )}

          {/* Create Home Option */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ตั้งชื่อบ้านของคุณ
            </label>
            <input
              type="text"
              value={homeName}
              onChange={(e) => setHomeName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="เช่น บ้านของเรา, บ้าน arthur"
            />
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleAdopt}
            disabled={isProcessing || !homeName.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/30 transition transform hover:scale-[1.02] flex items-center justify-center gap-3 text-lg disabled:opacity-50"
          >
            {isProcessing ? (
              <span className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
              <>
                <span>🏠</span> รับน้องเข้าบ้าน
              </>
            )}
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full mt-4 text-gray-500 hover:text-gray-800 font-medium text-sm"
          >
            ข้ามไปก่อน
          </button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">สำเร็จ!</h1>
          <p className="text-gray-600 mb-6">
            น้อง <span className="font-bold">{tokenData?.pet?.name}</span> เข้าบ้านแล้ว!
          </p>

          <div className="bg-green-50 rounded-xl p-4 mb-6">
            <p className="text-green-800 text-sm">
              ✅ ข้อมูลน้องปลอดภัยแล้ว
            </p>
          </div>

          <button
            onClick={() => router.push(`/pets/${tokenData?.pet_id}`)}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold"
          >
            ไปดูน้องในบ้าน
          </button>

          <p className="text-xs text-gray-400 mt-4">
            💡 ดาวน์โหลดแอพเพื่อประสบการณ์ที่ดีกว่า
          </p>
        </div>
      </div>
    );
  }

  return null;
}
