'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface Token {
  id: string;
  context: string;
  message: string | null;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

type TokenStatus = 'active' | 'used' | 'expired';

const CONTEXT_LABELS: Record<string, { icon: string; label: string }> = {
  sharing: { icon: '🔗', label: 'แชร์ข้อมูล' },
  vet: { icon: '🏥', label: 'พบหมอ' },
  family: { icon: '👨‍👩‍👧‍👦', label: 'ครอบครัว' },
  adoption: { icon: '📦', label: 'รับเลี้ยง' },
};

const STATUS_CONFIG: Record<TokenStatus, { label: string; color: string }> = {
  active: { label: 'ใช้งานได้', color: 'bg-green-100 text-green-800' },
  used: { label: 'ใช้แล้ว', color: 'bg-gray-100 text-gray-600' },
  expired: { label: 'หมดอายุ', color: 'bg-red-100 text-red-800' },
};

function getTokenStatus(token: Token): TokenStatus {
  if (token.is_used) return 'used';
  if (token.expires_at && new Date(token.expires_at) < new Date()) return 'expired';
  return 'active';
}

interface TokenListProps {
  petId: string;
  onClose?: () => void;
}

export function TokenList({ petId, onClose }: TokenListProps) {
  const supabase = createClient();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TokenStatus | 'all'>('all');
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('qr_tokens')
        .select('id, context, message, is_used, used_by, used_at, expires_at, created_at')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens(data || []);
    } catch (err) {
      console.error('Error fetching tokens:', err);
    } finally {
      setLoading(false);
    }
  }, [petId, supabase]);

  useEffect(() => {
    void fetchTokens();
  }, [fetchTokens]);

  async function handleRevoke(tokenId: string) {
    if (!confirm('ต้องการเพิกถอน QR Token นี้?')) return;
    setRevoking(tokenId);
    try {
      const { error } = await supabase
        .from('qr_tokens')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', tokenId)
        .eq('is_used', false);

      if (error) throw error;
      fetchTokens();
    } catch (err) {
      console.error('Error revoking token:', err);
      alert('เกิดข้อผิดพลาดในการเพิกถอน');
    } finally {
      setRevoking(null);
    }
  }

  async function handleDelete(tokenId: string) {
    if (!confirm('ต้องการลบ QR Token นี้ถาวร?')) return;
    try {
      const { error } = await supabase
        .from('qr_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;
      fetchTokens();
    } catch (err) {
      console.error('Error deleting token:', err);
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  }

  const filtered = tokens.filter((t) => {
    if (filter === 'all') return true;
    return getTokenStatus(t) === filter;
  });

  const counts = {
    all: tokens.length,
    active: tokens.filter((t) => getTokenStatus(t) === 'active').length,
    used: tokens.filter((t) => getTokenStatus(t) === 'used').length,
    expired: tokens.filter((t) => getTokenStatus(t) === 'expired').length,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">QR Tokens</h2>
            <p className="text-sm text-gray-500">ทั้งหมด {tokens.length} รายการ</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
              ✕
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 p-4 overflow-x-auto">
          {(['all', 'active', 'used', 'expired'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === tab
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'all' && `ทั้งหมด (${counts.all})`}
              {tab === 'active' && `ใช้งานได้ (${counts.active})`}
              {tab === 'used' && `ใช้แล้ว (${counts.used})`}
              {tab === 'expired' && `หมดอายุ (${counts.expired})`}
            </button>
          ))}
        </div>

        {/* Token List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500">ยังไม่มี QR Token</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((token) => {
                const status = getTokenStatus(token);
                const ctx = CONTEXT_LABELS[token.context] || { icon: '❓', label: token.context };
                const statusConfig = STATUS_CONFIG[status];

                return (
                  <div
                    key={token.id}
                    className="border border-gray-200 rounded-xl p-4 space-y-2"
                  >
                    {/* Top Row: Context + Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{ctx.icon}</span>
                        <span className="font-medium text-gray-900">{ctx.label}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Message */}
                    {token.message && (
                      <p className="text-sm text-gray-600 italic truncate">&quot;{token.message}&quot;</p>
                    )}

                    {/* Dates */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>
                        สร้าง: {format(new Date(token.created_at), 'd MMM yyyy HH:mm', { locale: th })}
                      </span>
                      {token.used_at && (
                        <span>
                          ใช้: {format(new Date(token.used_at), 'd MMM yyyy HH:mm', { locale: th })}
                        </span>
                      )}
                      {token.expires_at && status !== 'used' && (
                        <span>
                          หมดอายุ: {format(new Date(token.expires_at), 'd MMM yyyy', { locale: th })}
                        </span>
                      )}
                    </div>

                    {/* Token ID */}
                    <p className="text-xs text-gray-400 font-mono">{token.id.slice(0, 12)}...</p>

                    {/* Actions */}
                    {status === 'active' && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleRevoke(token.id)}
                          disabled={revoking === token.id}
                          className="text-xs px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition disabled:opacity-50"
                        >
                          {revoking === token.id ? 'กำลังเพิกถอน...' : '🔒 เพิกถอน'}
                        </button>
                        <button
                          onClick={() => handleDelete(token.id)}
                          className="text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
                        >
                          🗑️ ลบ
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
