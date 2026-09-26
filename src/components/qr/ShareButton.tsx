'use client';

import { useState } from 'react';
import { QRGenerator } from './QRGenerator';

interface ShareButtonProps {
  petId: string;
  petName: string;
}

export function ShareButton({ petId, petName }: ShareButtonProps) {
  const [showQR, setShowQR] = useState(false);
  const [context, setContext] = useState<'sharing' | 'vet' | 'family' | 'adoption'>('sharing');
  const [showMenu, setShowMenu] = useState(false);

  const menuItems = [
    {
      context: 'sharing' as const,
      icon: '🔗',
      label: 'แชร์ข้อมูลน้อง',
      description: 'ส่งต่อให้เพื่อน adopt',
    },
    {
      context: 'adoption' as const,
      icon: '📦',
      label: 'ส่ง QR รับเลี้ยง',
      description: 'สร้าง QR ให้คนรับน้อง',
    },
    {
      context: 'vet' as const,
      icon: '🏥',
      label: 'พาน้องไปพบหมอ',
      description: 'สร้าง QR สำหรับคลินิก',
    },
    {
      context: 'family' as const,
      icon: '👨‍👩‍👧‍👦',
      label: 'แชร์กับครอบครัว',
      description: 'ชวนคนในบ้านดูแล',
    },
  ];

  function handleSelectContext(selectedContext: typeof context) {
    setContext(selectedContext);
    setShowQR(true);
    setShowMenu(false);
  }

  return (
    <>
      {/* Share Button */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
        >
          <span>🔗</span>
          <span className="font-medium text-gray-700">แชร์</span>
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              {menuItems.map((item) => (
                <button
                  key={item.context}
                  onClick={() => handleSelectContext(item.context)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* QR Generator Modal */}
      {showQR && (
        <QRGenerator
          petId={petId}
          context={context}
          onClose={() => setShowQR(false)}
        />
      )}
    </>
  );
}
