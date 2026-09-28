"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Copy, Check, Download, KeyRound, ArrowRight, Users } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Family, UserRole } from '@/types';

interface QRInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: Family;
  currentUserName: string;
  /** น้องตัวแรกของบ้าน — anchor ของ token (qr_tokens.pet_id เป็น NOT NULL ตาม schema) */
  anchorPetId?: string;
  onJoinWithToken?: () => void;
}

export const QRInviteModal: React.FC<QRInviteModalProps> = ({
  isOpen,
  onClose,
  family,
  currentUserName,
  anchorPetId,
  onJoinWithToken,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [role, setRole] = useState<UserRole>('editor');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [inputToken, setInputToken] = useState<string>('');
  const [joinStatus, setJoinStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Invite จริง (V.0.999): token ถูกบันทึกใน qr_tokens (context 'family') ผูกกับบ้านนี้
  // — คนที่ scan จะได้เป็นสมาชิกบ้านผู้เชิญ (ไม่ใช่รับน้องไป)
  const [inviteTokenId, setInviteTokenId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const createInvite = React.useCallback(async () => {
    setCreating(true);
    setInviteError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้');
      if (!anchorPetId) throw new Error('บ้านยังไม่มีน้อง — เพิ่มน้องก่อนจึงจะเชิญสมาชิกได้');

      const code = `FAM-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      const { data, error } = await supabase
        .from('qr_tokens')
        .insert({
          pet_id: anchorPetId,
          sender_id: user.id,
          context: 'family',
          message: `เชิญเข้าร่วม "${family.name}" ในบทบาท ${role}`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('id')
        .single();
      if (error) throw error;

      // เก็บ role ที่เลือกไว้ใน message (qr_tokens ยังไม่มีคอลัมน์ role — V.0.999 อ่านจาก message)
      setInviteTokenId(data.id);
      setInviteCode(code);
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : 'สร้างคำเชิญไม่สำเร็จ');
    } finally {
      setCreating(false);
    }
  }, [anchorPetId, family.name, role]);

  // สร้าง QR Code เมื่อมี token id (ชี้ไปที่ /adopt/{id} — flow เดิมที่ validate แล้ว)
  useEffect(() => {
    if (isOpen && activeTab === 'create' && inviteTokenId) {
      const inviteUrl = `${window.location.origin}/adopt/${inviteTokenId}`;
      const encodedData = encodeURIComponent(inviteUrl);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQrCodeDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`);
    }
  }, [isOpen, activeTab, inviteTokenId]);

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `invite-${family.name}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // จำลองการตรวจสอบ Token
    if (inputToken.length > 4) {
      setJoinStatus({ success: true, message: 'เข้าร่วมบ้านสำเร็จ! กำลังตรวจสอบสิทธิ์...' });
      setTimeout(() => {
        if (onJoinWithToken) onJoinWithToken();
        onClose();
      }, 1500);
    } else {
      setJoinStatus({ success: false, message: 'รหัสไม่ถูกต้อง กรุณาลองใหม่' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            เชิญร่วมสร้างบ้าน
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => { setActiveTab('create'); setJoinStatus(null); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'create' 
                ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            สร้างคำเชิญ
          </button>
          <button
            onClick={() => { setActiveTab('join'); setJoinStatus(null); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'join' 
                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            เข้าร่วมบ้าน
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto">
          
          {/* TAB: CREATE INVITE */}
          {activeTab === 'create' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  สวัสดี <span className="font-semibold text-gray-900">{currentUserName}</span>
                </p>
                <p className="text-xs text-gray-500">
                  ชวนคนในครอบครัวมาร่วมสร้าง <span className="font-bold text-orange-600">&quot;{family.name}&quot;</span>
                </p>
              </div>

              {/* QR Code Display */}
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                {inviteError && (
                  <p role="alert" className="mb-3 text-xs text-red-600">{inviteError}</p>
                )}
                {!inviteTokenId ? (
                  <>
                    <p className="mb-3 text-center text-xs text-gray-500">
                      สร้างคำเชิญเข้าบ้าน — คนที่ scan จะเป็นสมาชิกร่วมดูแลน้องในบ้านนี้
                    </p>
                    <button
                      onClick={createInvite}
                      disabled={creating}
                      className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      {creating ? 'กำลังสร้าง...' : 'สร้างคำเชิญ'}
                    </button>
                  </>
                ) : (
                  <>
                    {qrCodeDataUrl ? (
                      <Image
                        src={qrCodeDataUrl}
                        alt="Invite QR"
                        width={192}
                        height={192}
                        className="w-48 h-48 rounded-lg shadow-sm bg-white p-2 mb-4"
                        unoptimized
                      />
                    ) : (
                      <div className="w-48 h-48 bg-gray-200 animate-pulse rounded-lg mb-4"></div>
                    )}

                    <div className="flex gap-2 w-full max-w-[200px]">
                      <button 
                        onClick={handleCopy}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'คัดลอกแล้ว' : 'คัดลอกรหัส'}
                      </button>
                      <button 
                        onClick={handleDownloadQR}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        บันทึกภาพ
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-mono">{inviteCode}</p>
                    <p className="text-[10px] text-gray-400 mt-1">ใช้ได้ 7 วัน · คนที่ scan จะเป็นสมาชิกบ้านนี้</p>
                  </>
                )}
              </div>

              {/* Settings */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">สิทธิ์การเข้าถึง</label>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-200 outline-none"
                  >
                    <option value="viewer">ผู้ดู (ดูอย่างเดียว)</option>
                    <option value="editor">ผู้แก้ไข (บันทึกเรื่องราวได้)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB: JOIN FAMILY */}
          {activeTab === 'join' && (
            <div className="space-y-6">
              <div className="text-center">
                <KeyRound className="w-12 h-12 text-blue-500 mx-auto mb-3 opacity-80" />
                <h3 className="text-lg font-bold text-gray-900">มีรหัสเชิญหรือไม่?</h3>
                <p className="text-sm text-gray-500 mt-1">กรอกรหัสเพื่อเข้าร่วมครอบครัว</p>
              </div>

              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">รหัสเชิญ (Token)</label>
                  <input
                    type="text"
                    value={inputToken}
                    onChange={(e) => setInputToken(e.target.value.toUpperCase())}
                    placeholder="เช่น MW-ABC123"
                    className="w-full p-3 text-center font-mono text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none uppercase tracking-widest"
                  />
                </div>

                {joinStatus && (
                  <div className={`p-3 rounded-lg text-xs text-center ${
                    joinStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {joinStatus.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!inputToken || !!joinStatus}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  เข้าร่วมบ้าน <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t text-center">
          <p className="text-[10px] text-gray-400">
            การเข้าร่วมหมายถึงการยอมรับกฎกติกาของบ้านและการแบ่งปันความทรงจำร่วมกัน
          </p>
        </div>
      </div>
    </div>
  );
};