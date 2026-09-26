'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import QRCode from 'qrcode';

interface QRGeneratorProps {
  petId: string;
  context: 'sharing' | 'vet' | 'family' | 'adoption';
  onClose?: () => void;
}

interface QRToken {
  id: string;
  message: string;
}

const CONTEXT_CONFIG = {
  sharing: {
    icon: '🔗',
    title: 'แชร์ข้อมูลน้อง',
    defaultMessage: 'มารับน้องเข้าบ้านกันเถอะ! 🐱',
    color: 'bg-blue-50 text-blue-800',
  },
  vet: {
    icon: '🏥',
    title: 'พาน้องไปพบหมอ',
    defaultMessage: 'ข้อมูลสำหรับคลินิกสัตวแพทย์',
    color: 'bg-green-50 text-green-800',
  },
  family: {
    icon: '👨‍👩‍👧‍👦',
    title: 'แชร์กับครอบครัว',
    defaultMessage: 'มาร่วมดูแลน้องกันเถอะ! 🏠',
    color: 'bg-purple-50 text-purple-800',
  },
  adoption: {
    icon: '📦',
    title: 'รับน้องเข้าบ้าน',
    defaultMessage: 'มา adopt น้องกันเถอะ!',
    color: 'bg-orange-50 text-orange-800',
  },
};

export function QRGenerator({ petId, context, onClose }: QRGeneratorProps) {
  const supabase = createClient();
  const config = CONTEXT_CONFIG[context];

  const [message, setMessage] = useState(config.defaultMessage);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [token, setToken] = useState<QRToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateToken();
  }, [petId, context]);

  async function generateToken() {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้');

      // Create QR token
      const { data: newToken, error: tokenError } = await supabase
        .from('qr_tokens')
        .insert({
          pet_id: petId,
          sender_id: user.id,
          context: context,
          message: message,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

      if (tokenError) throw tokenError;

      setToken(newToken);

      // Generate QR code
      const qrUrl = `${window.location.origin}/adopt/${newToken.id}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1F1E1D',
          light: '#FFFFFF',
        },
      });

      setQrDataUrl(qrDataUrl);
    } catch (err) {
      console.error('Error generating QR:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyMessage() {
    if (!token) return;
    
    const fullMessage = `${message}\n\n🔗 ลิงก์: ${window.location.origin}/adopt/${token.id}`;
    
    try {
      await navigator.clipboard.writeText(fullMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying:', err);
    }
  }

  async function handleShareLINE() {
    if (!token) return;
    
    const fullMessage = `${message}\n\n🔗 ${window.location.origin}/adopt/${token.id}`;
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(fullMessage)}`;
    
    window.open(lineUrl, '_blank');
  }

  function handleDownloadQR() {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `meow-world-qr-${token?.id}.png`;
    link.href = qrDataUrl;
    link.click();
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <p className="text-gray-600">กำลังสร้าง QR Token...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{config.icon}</span>
            <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Message Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ข้อความ (ปรับแต่งได้)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            rows={3}
            placeholder="พิมพ์ข้อความ..."
          />
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
            </div>
          </div>
        )}

        {/* Token Info */}
        <div className={`${config.color} rounded-xl p-4 mb-6`}>
          <p className="text-sm">
            <span className="font-medium">Token ID:</span> {token?.id.slice(0, 8)}...
          </p>
          <p className="text-sm">
            <span className="font-medium">หมดอายุ:</span> 7 วัน
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleShareLINE}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition"
          >
            <span>📱</span> ส่งต่อผ่าน LINE
          </button>

          <button
            onClick={handleCopyMessage}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition"
          >
            <span>{copied ? '✅' : '📋'}</span> {copied ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความ'}
          </button>

          <button
            onClick={handleDownloadQR}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition"
          >
            <span>💾</span> บันทึกรูป QR
          </button>
        </div>

        {/* Context Tips */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <h3 className="font-medium text-gray-700 mb-2">💡 วิธีใช้</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            {context === 'sharing' && (
              <>
                <li>• ส่ง QR ให้เพื่อนที่ต้องการ adopt น้อง</li>
                <li>• ผู้รับสแกนแล้วจะเข้าสู่ flow รับน้องทันที</li>
              </>
            )}
            {context === 'vet' && (
              <>
                <li>• แสดง QR ให้หมอสัตว์สแกน</li>
                <li>• หมอจะเห็นข้อมูลน้องทันที</li>
              </>
            )}
            {context === 'family' && (
              <>
                <li>• ส่ง QR ให้สมาชิกในครอบครัว</li>
                <li>• ทุกคนจะเห็นข้อมูลน้องร่วมกัน</li>
              </>
            )}
            {context === 'adoption' && (
              <>
                <li>• สร้าง QR สำหรับ adopt น้อง</li>
                <li>• ผู้รับจะเข้าสู่ flow รับน้องทันที</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
