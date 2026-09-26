'use client';

import { useState } from 'react';
import { validateToken, extractTokenFromQR, type TokenValidationResult } from '@/lib/token-validation';

type TestResult = {
  label: string;
  input: string;
  result: TokenValidationResult;
  timestamp: string;
};

export default function TokenTestPage() {
  const [tokenId, setTokenId] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  async function handleValidate() {
    if (!tokenId.trim()) return;
    setLoading(true);

    try {
      // Step 1: Extract token from input (supports UUID, URL, path)
      const extracted = extractTokenFromQR(tokenId);
      if (!extracted) {
        setResults((prev) => [
          {
            label: '❌ ไม่พบ Token',
            input: tokenId,
            result: {
              valid: false,
              error: {
                code: 'INVALID_FORMAT',
                message: 'Could not extract token UUID from input',
                layer: 1,
                message_th: 'ไม่พบ UUID ของ QR Token ในข้อความที่ระบุ',
              },
            },
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
        return;
      }

      // Step 2: Call validation API
      const result = await validateToken(extracted, userId || undefined);

      setResults((prev) => [
        {
          label: result.valid ? '✅ Token ถูกต้อง' : `❌ ${result.error?.code}`,
          input: extracted,
          result,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    } catch (err: any) {
      setResults((prev) => [
        {
          label: '❌ Error',
          input: tokenId,
          result: {
            valid: false,
            error: {
              code: 'CLIENT_ERROR',
              message: err.message,
              layer: 1,
              message_th: 'เกิดข้อผิดพลาดฝั่ง client',
            },
          },
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setResults([]);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🔐 Token Validation Test
          </h1>
          <p className="text-gray-600">
            ทดสอบ POST /api/tokens/validate — 4-Layer Security Model
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            {/* Token Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                QR Token (UUID, URL, หรือ path)
              </label>
              <input
                type="text"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                placeholder="เช่น https://meow-world-heart-edition.vercel.app/adopt/abc123..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                รองรับ: UUID, URL (/adopt/uuid), หรือ path (/adopt/uuid)
              </p>
            </div>

            {/* User ID Input (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID (ถ้ามี — สำหรับทดสอบ self-action guard)
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="optional user UUID"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleValidate}
                disabled={loading || !tokenId.trim()}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
              >
                {loading ? '⏳ กำลังตรวจสอบ...' : '🔍 ตรวจสอบ Token'}
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition"
              >
                🗑️ ล้าง
              </button>
            </div>
          </div>
        </div>

        {/* Security Layers Legend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-3">🛡️ Security Layers</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 rounded-xl p-3">
              <span className="font-medium text-blue-800">Layer 1</span>
              <p className="text-blue-600">Token Validity</p>
              <p className="text-xs text-gray-500">exists? expired? used?</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <span className="font-medium text-green-800">Layer 2</span>
              <p className="text-green-600">Purpose Matching</p>
              <p className="text-xs text-gray-500">context, eligibility</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <span className="font-medium text-purple-800">Layer 3</span>
              <p className="text-purple-600">Permission Scope</p>
              <p className="text-xs text-gray-500">scopes, actions</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3">
              <span className="font-medium text-orange-800">Layer 4</span>
              <p className="text-orange-600">Condition Enforcement</p>
              <p className="text-xs text-gray-500">self-guard, time</p>
            </div>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-bold text-gray-900">📋 ผลลัพธ์ ({results.length})</h2>
            {results.map((r, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-4 ${
                  r.result.valid
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">{r.label}</span>
                  <span className="text-xs text-gray-500">{r.timestamp}</span>
                </div>
                <p className="text-xs text-gray-500 font-mono mb-2">Token: {r.input}</p>

                {r.result.valid && r.result.token && (
                  <div className="bg-white rounded-xl p-3 space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Context:</span> {r.result.token.context}
                    </p>
                    <p>
                      <span className="font-medium">Pet:</span> {r.result.token.pet?.name} ({r.result.token.pet?.species})
                    </p>
                    <p>
                      <span className="font-medium">Sender:</span> {r.result.token.sender?.display_name}
                    </p>
                    <p>
                      <span className="font-medium">Scopes:</span>{' '}
                      {r.result.permissions?.scopes.join(', ')}
                    </p>
                    <p>
                      <span className="font-medium">Actions:</span>{' '}
                      {r.result.permissions?.actions.join(', ')}
                    </p>
                  </div>
                )}

                {!r.result.valid && r.result.error && (
                  <div className="bg-white rounded-xl p-3 text-sm">
                    <p>
                      <span className="font-medium">Code:</span> {r.result.error.code}
                    </p>
                    <p>
                      <span className="font-medium">Layer:</span> {r.result.error.layer}
                    </p>
                    <p className="text-red-600">{r.result.error.message_th}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Test Links */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-3">🧪 Quick Tests</h2>
          <div className="space-y-2 text-sm">
            <button
              onClick={() => setTokenId('not-a-real-token')}
              className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
            >
              ❌ Test: ใส่ token ปลอม → คาดว่า TOKEN_NOT_FOUND
            </button>
            <button
              onClick={() => setTokenId('00000000-0000-0000-0000-000000000000')}
              className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
            >
              ❌ Test: UUID ว่างเปล่า → คาดว่า TOKEN_NOT_FOUND
            </button>
            <button
              onClick={() => setTokenId('https://example.com/adopt/00000000-0000-0000-0000-000000000000')}
              className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
            >
              ❌ Test: URL ที่มี UUID ปลอม → คาดว่า TOKEN_NOT_FOUND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
