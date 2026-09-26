"use client";

import React, { useState } from 'react';
import { Family, FamilyMember, JourneyEvent, Pet, UserProfile, UserRole } from '@/types';
import { HouseGraphicCard } from './HouseGraphicCard';
import { JourneyComposer } from './JourneyComposer';
import { JourneyFeedCard } from './JourneyFeedCard';

interface HomeModeProps {
  family: Family;
  members: FamilyMember[];
  pets: Pet[];
  events: JourneyEvent[];
  currentUser: UserProfile;
  userRole: UserRole;
  onOpenMembersModal: () => void;
  onOpenQRInviteModal: () => void;
  onSelectPet: (petId: string) => void;
  onAddNewPet: () => void;
  onAddEvent: (eventData: {
    pet_id?: string;
    tagged_pet_ids?: string[];
    tagged_user_ids?: string[];
    event_date: string;
    event_type: 'memory' | 'birth' | 'passport' | 'milestone' | 'medical' | 'vaccine' | 'certificate' | 'birthday' | 'grooming';
    title: string;
    description: string;
    image_url?: string;
    video_url?: string;
    location?: string;
  }) => void;
  /** Drift Inventory: like/comment ยังไม่มี storage — no-op จนกว่าตารางจะมีจริง */
  onToggleLike: (eventId: string) => void;
  onAddComment: (eventId: string, commentText: string) => void;
  onDeleteEvent?: (eventId: string) => void;
  onViewCertById?: (certId: string) => void;
}

export const HomeMode: React.FC<HomeModeProps> = ({
  family,
  members,
  pets,
  events,
  currentUser,
  userRole,
  onOpenMembersModal,
  onOpenQRInviteModal,
  onSelectPet,
  onAddNewPet,
  onAddEvent,
  onToggleLike,
  onAddComment,
  onDeleteEvent,
  onViewCertById,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [petFilter, setPetFilter] = useState<string>('all');

  const canPost = userRole === 'owner' || userRole === 'editor';

  const filteredEvents = events.filter((evt) => {
    // Filter Category
    let matchesCategory = true;
    if (categoryFilter === 'all') matchesCategory = true;
    else if (categoryFilter === 'memory') matchesCategory = evt.event_type === 'memory' || Boolean(evt.video_url);
    else if (categoryFilter === 'birth_passport') matchesCategory = evt.event_type === 'birth' || evt.event_type === 'passport' || evt.event_type === 'milestone';
    else if (categoryFilter === 'health') matchesCategory = evt.event_type === 'vaccine' || evt.event_type === 'medical';
    else if (categoryFilter === 'certificate') matchesCategory = evt.event_type === 'certificate';
    else if (categoryFilter === 'birthday') matchesCategory = evt.event_type === 'birthday';
    else matchesCategory = evt.event_type === categoryFilter;

    // Filter Pet
    let matchesPet = true;
    if (petFilter !== 'all') {
      if (evt.tagged_pet_ids && evt.tagged_pet_ids.length > 0) {
        matchesPet = evt.tagged_pet_ids.includes(petFilter);
      } else {
        matchesPet = evt.pet_id === petFilter;
      }
    }

    return matchesCategory && matchesPet;
  });

  return (
    <div className="space-y-6">
      {/* Top Graphic Interface: House with Co-owners, QR Token, and Household Pets Strip */}
      <HouseGraphicCard
        family={family}
        members={members}
        pets={pets}
        onOpenMembersModal={onOpenMembersModal}
        onOpenQRInviteModal={onOpenQRInviteModal}
        onSelectPet={onSelectPet}
        onAddNewPet={onAddNewPet}
      />

      {/* Main Private Life Journey Feed Section */}
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Post Composer: Ready to post immediately without pre-selecting a pet */}
        {canPost ? (
          <JourneyComposer
            pets={pets}
            members={members}
            user={currentUser}
            onAddEvent={onAddEvent}
          />
        ) : (
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9] text-center text-xs text-[#8C867E]">
            คุณอยู่ในสถานะ <strong className="text-[#1F1E1D]">ผู้เข้าชม (Viewer)</strong> สามารถดูบันทึกและให้กำลังใจได้
          </div>
        )}

        {/* Life Journey Timeline Filters */}
        <div className="bg-white rounded-2xl border border-[#E8E2D9] p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                categoryFilter === 'all'
                  ? 'bg-[#1F1E1D] text-white shadow-2xs'
                  : 'text-[#59554F] hover:bg-[#FAF7F2]'
              }`}
            >
              ทุกเรื่องราว ({events.length})
            </button>

            <button
              onClick={() => setCategoryFilter('birth_passport')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                categoryFilter === 'birth_passport'
                  ? 'bg-orange-100 text-orange-900 shadow-2xs'
                  : 'text-[#59554F] hover:bg-[#FAF7F2]'
              }`}
            >
              🐣 แรกเกิด & พาสปอร์ต
            </button>

            <button
              onClick={() => setCategoryFilter('certificate')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                categoryFilter === 'certificate'
                  ? 'bg-yellow-100 text-yellow-900 shadow-2xs'
                  : 'text-[#59554F] hover:bg-[#FAF7F2]'
              }`}
            >
              👑 ใบรับรองดิจิทัล
            </button>

            <button
              onClick={() => setCategoryFilter('health')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                categoryFilter === 'health'
                  ? 'bg-blue-100 text-blue-900 shadow-2xs'
                  : 'text-[#59554F] hover:bg-[#FAF7F2]'
              }`}
            >
              💉 วัคซีน & สุขภาพ
            </button>

            <button
              onClick={() => setCategoryFilter('memory')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                categoryFilter === 'memory'
                  ? 'bg-amber-100 text-amber-900 shadow-2xs'
                  : 'text-[#59554F] hover:bg-[#FAF7F2]'
              }`}
            >
              🌟 รูป & วิดีโอคลิป
            </button>

            <button
              onClick={() => setCategoryFilter('birthday')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                categoryFilter === 'birthday'
                  ? 'bg-pink-100 text-pink-900 shadow-2xs'
                  : 'text-[#59554F] hover:bg-[#FAF7F2]'
              }`}
            >
              🎂 วันเกิด
            </button>
          </div>

          {/* Pet Filter Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-[#59554F]">
            <span className="font-bold">กรองตามน้อง:</span>
            <select
              value={petFilter}
              onChange={(e) => setPetFilter(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E8E2D9] outline-none"
            >
              <option value="all">ทั้งบ้าน ({pets.length})</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timeline Stream */}
        <div className="space-y-5">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((evt) => (
              <JourneyFeedCard
                key={evt.id}
                event={evt}
                pets={pets}
                members={members}
                currentUser={currentUser}
                canEdit={canPost}
                onToggleLike={onToggleLike}
                onAddComment={onAddComment}
                onDeleteEvent={onDeleteEvent}
                onViewCertById={onViewCertById}
              />
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-[#E8E2D9] p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] text-[#8C867E] flex items-center justify-center text-2xl mx-auto">
                🐾
              </div>
              <h3 className="font-serif font-bold text-base text-[#1F1E1D]">ยังไม่มีเรื่องราวในหมวดหมู่นี้</h3>
              <p className="text-xs text-[#8C867E]">
                บันทึกความน่ารัก เรื่องสุขภาพ หรือก้าวสำคัญของน้องแมวในบ้านได้เลย
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
