"use client";

import React, { useState } from 'react';
import { Pencil, Check, X, Users, Cat } from 'lucide-react';
import { buildHomeIdentityUpdatePayload, type HomeIdentitySummary } from '@/utils/homeIdentity';

/**
 * Home Identity card — "บ้านนี้คือใคร"
 *
 * Data Contract (LOCKED 2026-09-28):
 *  - แก้ได้ตลอดเวลา (Owner เท่านั้นที่ปุ่ม edit — RLS "Owner full access on homes" เป็นด่านจริง)
 *  - incomplete = valid: ไม่มีคำอธิบาย / ไม่มี people / ไม่มี pets ก็ยังเป็นบ้านที่ถูกต้อง
 *  - People (MVP) = home_members; Pets = pets — ไม่สร้าง taxonomy ใหม่ในชั้นนี้
 */

interface HomeIdentityCardProps {
  identity: HomeIdentitySummary;
  isOwner: boolean;
  onSaved: (updated: { name: string; description: string | null }) => void;
}

export const HomeIdentityCard: React.FC<HomeIdentityCardProps> = ({
  identity,
  isOwner,
  onSaved,
}) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(identity.name);
  const [description, setDescription] = useState(identity.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setName(identity.name);
    setDescription(identity.description ?? '');
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    // Business Logic อยู่ที่ domain layer — UI แค่เรียก (integrity gate เสมอ)
    const result = buildHomeIdentityUpdatePayload({ name, description });
    if (result.invalid) {
      setError(result.reason);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from('homes')
        .update(result.payload)
        .eq('id', identity.homeId)
        .select('id, name, description, created_at')
        .single();

      if (updateError) throw updateError;

      onSaved({ name: data.name, description: data.description });
      setEditing(false);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'ไม่สามารถบันทึกข้อมูลบ้านได้');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white border border-[#E8E2D9] p-4 sm:p-5 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-3" aria-label="แก้ไขข้อมูลบ้าน">
              <div>
                <label htmlFor="home-identity-name" className="block text-xs font-medium text-[#8C867E]">
                  ชื่อบ้าน *
                </label>
                <input
                  id="home-identity-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E8E2D9] px-3 py-2 text-sm outline-none focus:border-[#6B8E68] focus:ring-2 focus:ring-[#6B8E68]/20"
                  placeholder="ชื่อบ้าน"
                  required
                />
              </div>
              <div>
                <label htmlFor="home-identity-description" className="block text-xs font-medium text-[#8C867E]">
                  คำอธิบาย (ถ้ามี — บ้านไม่มีคำอธิบายก็ยังเป็นบ้านที่ถูกต้อง)
                </label>
                <textarea
                  id="home-identity-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-[#E8E2D9] px-3 py-2 text-sm outline-none focus:border-[#6B8E68] focus:ring-2 focus:ring-[#6B8E68]/20"
                  placeholder="เล่าเรื่องบ้านของเรา (ถ้ามี)"
                />
              </div>
              {error && (
                <p role="alert" className="text-xs text-red-600">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#6B8E68] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#5A7B57] disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#E8E2D9] px-3 py-1.5 text-xs font-bold text-[#8C867E] hover:bg-[#F3EFEA] disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  ยกเลิก
                </button>
              </div>
            </form>
          ) : (
            <>
              <h2 className="truncate text-lg font-bold text-[#1F1E1D]">{identity.name}</h2>
              {identity.description ? (
                <p className="mt-0.5 text-sm text-[#8C867E]">{identity.description}</p>
              ) : (
                <p className="mt-0.5 text-sm italic text-[#B5AFA6]">
                  ยังไม่มีคำอธิบายบ้าน — บ้านของเราจะค่อย ๆ มีเรื่องเล่าไปด้วยกัน
                </p>
              )}
            </>
          )}
        </div>

        {!editing && isOwner && (
          <button
            type="button"
            onClick={startEdit}
            aria-label="แก้ไขข้อมูลบ้าน"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#E8E2D9] px-3 py-1.5 text-xs font-bold text-[#8C867E] hover:bg-[#F3EFEA]"
          >
            <Pencil className="h-3.5 w-3.5" />
            แก้ไข
          </button>
        )}
      </div>

      {/* Identity summary — People & Pets (ใครและอะไรอยู่ในบ้านนี้) */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F3EFEA] px-2.5 py-1 font-bold text-[#8C867E]">
          <Users className="h-3.5 w-3.5" />
          สมาชิก {identity.people.length} คน
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F3EFEA] px-2.5 py-1 font-bold text-[#8C867E]">
          <Cat className="h-3.5 w-3.5" />
          น้อง {identity.petCount} ตัว
        </span>
        {identity.people.slice(0, 4).map((person) => (
          <span
            key={person.userId}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E2D9] px-2.5 py-1 text-[#5F5B55]"
            title={person.role}
          >
            {person.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={person.avatarUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
            ) : (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E7F0E6] text-[10px] font-bold text-[#6B8E68]">
                {person.displayName.charAt(0)}
              </span>
            )}
            {person.displayName}
          </span>
        ))}
        {identity.people.length > 4 && (
          <span className="text-[#8C867E]">+{identity.people.length - 4}</span>
        )}
      </div>
    </section>
  );
};
