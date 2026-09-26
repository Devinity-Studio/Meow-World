"use client";

import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Video,
  X,
  Calendar,
  Send,
  Users,
  Sparkles,
  Tag,
} from 'lucide-react';
import { EventCategory, FamilyMember, Pet, UserProfile } from '@/types';

interface JourneyComposerProps {
  pets: Pet[];
  members?: FamilyMember[];
  user: UserProfile;
  onAddEvent: (eventData: {
    pet_id?: string;
    tagged_pet_ids?: string[];
    tagged_user_ids?: string[];
    event_date: string;
    event_type: EventCategory;
    title: string;
    description: string;
    image_url?: string;
    video_url?: string;
    location?: string;
  }) => void;
  isOpenModal?: boolean;
  onCloseModal?: () => void;
}

export const JourneyComposer: React.FC<JourneyComposerProps> = ({
  pets,
  members = [],
  user,
  onAddEvent,
  isOpenModal = false,
  onCloseModal,
}) => {
  // Tagged Pets state (can tag multiple pets or all)
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>(() =>
    pets.length > 0 ? [pets[0].id] : []
  );
  // Tagged Members state
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([user.id]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventCategory>('memory');
  // event_date: คงอยู่ใน UI/flow ตาม Design Lock — แต่ยังไม่ถูก persist (TIME_MODEL ยังไม่ตัดสิน
  // occurred-date semantic; created_at เป็นค่าตั้งต้นชั่วคราวใน adapter)
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [showMemberTagging, setShowMemberTagging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: { type: EventCategory; label: string; icon: string; bg: string }[] = [
    { type: 'memory', label: 'ความทรงจำ & รูป/คลิป', icon: '🌟', bg: 'hover:bg-amber-50 text-amber-900 border-amber-200' },
    { type: 'birth', label: 'แรกเกิด / วัยเด็ก', icon: '🐣', bg: 'hover:bg-orange-50 text-orange-900 border-orange-200' },
    { type: 'passport', label: 'สร้างพาสปอร์ต', icon: '📘', bg: 'hover:bg-sky-50 text-sky-900 border-sky-200' },
    { type: 'milestone', label: 'วันแรกที่ถึงบ้าน / ก้าวสำคัญ', icon: '🏠', bg: 'hover:bg-emerald-50 text-emerald-900 border-emerald-200' },
    { type: 'vaccine', label: 'ฉีดวัคซีน / ถ่ายพยาธิ', icon: '💉', bg: 'hover:bg-blue-50 text-blue-900 border-blue-200' },
    { type: 'medical', label: 'ตรวจสุขภาพ / พบแพทย์', icon: '🩺', bg: 'hover:bg-purple-50 text-purple-900 border-purple-200' },
    { type: 'certificate', label: 'ได้รับใบรับรองดิจิทัล', icon: '👑', bg: 'hover:bg-yellow-50 text-yellow-900 border-yellow-200' },
    { type: 'birthday', label: 'วันเกิด / ฉลอง', icon: '🎂', bg: 'hover:bg-pink-50 text-pink-900 border-pink-200' },
    { type: 'grooming', label: 'กรูมมิ่ง / อาบน้ำ', icon: '✂️', bg: 'hover:bg-teal-50 text-teal-900 border-teal-200' },
  ];

  const handleTogglePetTag = (petId: string) => {
    setSelectedPetIds((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId]
    );
  };

  const handleSelectAllPets = () => {
    if (selectedPetIds.length === pets.length) {
      setSelectedPetIds([]);
    } else {
      setSelectedPetIds(pets.map((p) => p.id));
    }
  };

  const handleToggleMemberTag = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target?.result as string);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddEvent({
      pet_id: selectedPetIds[0] || (pets[0]?.id ?? undefined),
      tagged_pet_ids: selectedPetIds.length > 0 ? selectedPetIds : pets.map((p) => p.id),
      tagged_user_ids: selectedMemberIds,
      event_date: eventDate,
      event_type: eventType,
      title: title.trim(),
      description: description.trim(),
      image_url: imageUrl || undefined,
      video_url: videoUrl.trim() || undefined,
      // location: ไม่ส่งเข้า DB — ยังไม่มีที่เก็บ (กฎ: ไม่สร้าง input ที่ระบบเก็บไม่ได้)
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setImageUrl('');
    setVideoUrl('');
    if (onCloseModal) onCloseModal();
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Author & Multi-Pet Tagging Strip */}
      <div className="space-y-3 pb-3 border-b border-[#E8E2D9]">
        {/* User Author line */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#E8E2D9] shrink-0 border border-white shadow-xs">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                  {user.displayName.slice(0, 1)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-[#1F1E1D]">{user.displayName}</div>
              <div className="text-[11px] text-[#8C867E]">บันทึก Life Journey ของครอบครัว</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMemberTagging(!showMemberTagging)}
            className="flex items-center gap-1 text-[11px] font-bold text-[#6B8E68] hover:text-[#4F6D4C] bg-[#EBF1E8] px-2.5 py-1 rounded-lg transition-colors"
          >
            <Users className="w-3 h-3" />
            <span>แท็กผู้ร่วมดูแล ({selectedMemberIds.length})</span>
          </button>
        </div>

        {/* 1. Tag Pets Section (ไม่จำเป็นต้องเลือกสัตว์เลี้ยงตัวเดียวก่อน สามารถแท็กได้ตามต้องการ) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#8C867E] flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#E06D53]" />
              <span>แท็กสัตว์เลี้ยงในเรื่องราวนี้:</span>
            </label>
            {pets.length > 1 && (
              <button
                type="button"
                onClick={handleSelectAllPets}
                className="text-[10px] text-[#E06D53] hover:underline font-bold"
              >
                {selectedPetIds.length === pets.length ? 'ยกเลิกเลือกทั้งหมด' : '🐾 แท็กทั้งบ้าน'}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {pets.map((pet) => {
              const isSelected = selectedPetIds.includes(pet.id);
              return (
                <button
                  type="button"
                  key={pet.id}
                  onClick={() => handleTogglePetTag(pet.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#1F1E1D] text-white shadow-xs scale-102'
                      : 'bg-[#FAF7F2] text-[#59554F] border border-[#E8E2D9] hover:border-[#1F1E1D]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#E06D53]"></span>
                  <span>{pet.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Tag Co-owners (Optional Drawer) */}
        {showMemberTagging && members.length > 0 && (
          <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9] space-y-2 animate-in fade-in">
            <span className="text-[11px] font-bold text-[#59554F]">ผู้เลี้ยงร่วมที่อยู่ในช่วงเวลานี้:</span>
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => {
                const isSelected = selectedMemberIds.includes(member.user_id);
                return (
                  <button
                    type="button"
                    key={member.user_id}
                    onClick={() => handleToggleMemberTag(member.user_id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#6B8E68] text-white'
                        : 'bg-white text-[#59554F] border border-[#E8E2D9]'
                    }`}
                  >
                    <span>👤 {member.display_name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Category Pills (รองรับทุกเหตุการณ์ตั้งแต่แรกเกิด ถึงรับวัคซีนและใบรับรอง) */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C867E] mb-1.5">
          ประเภทเหตุการณ์ในไทม์ไลน์:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.type}
              onClick={() => setEventType(cat.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                eventType === cat.type
                  ? 'bg-[#E06D53] text-white shadow-xs scale-102'
                  : 'bg-[#FAF7F2] text-[#59554F] border border-[#E8E2D9] hover:border-[#E06D53]'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Title Input */}
      <div>
        <input
          type="text"
          placeholder="หัวข้อเรื่องราว (เช่น ภาพถ่ายวันแรกคลอด, วันแรกที่ย้ายเข้าบ้าน, ผลตรวจสุขภาพ...)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full text-sm font-bold px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D9] outline-none focus:border-[#E06D53] text-[#1F1E1D]"
        />
      </div>

      {/* Description / Story Textarea */}
      <div>
        <textarea
          placeholder="เขียนเล่าเรื่องราว รายละเอียด หรือบันทึกความรู้สึกเกี่ยวกับน้อง..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D9] outline-none focus:border-[#E06D53] text-[#1F1E1D] resize-none"
        />
      </div>

      {/* Video URL Input (if toggled) */}
      {showVideoInput && (
        <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9] space-y-1.5">
          <label className="block text-xs font-bold text-[#1F1E1D]">ลิงก์วิดีโอคลิป (Video URL):</label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="วางลิงก์วิดีโอ (เช่น MP4, YouTube, หรือ Cloud Storage)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="flex-1 text-xs px-3 py-2 rounded-xl bg-white border border-[#E8E2D9] outline-none focus:border-[#E06D53]"
            />
            <button
              type="button"
              onClick={() => setShowVideoInput(false)}
              className="px-3 text-xs text-[#8C867E] hover:text-[#1F1E1D]"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* Image Preview (if uploaded) */}
      {imageUrl && (
        <div className="relative rounded-2xl overflow-hidden border border-[#E8E2D9] max-h-64 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Uploaded preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => setImageUrl('')}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Media & Meta Attachment Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E8E2D9]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Photo Button */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F3EFEA] border border-[#E8E2D9] text-xs font-semibold text-[#59554F] transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#E06D53]" />
            <span>{imageUrl ? 'เปลี่ยนรูป' : 'เพิ่มรูปถ่าย'}</span>
          </button>

          {/* Video Button */}
          <button
            type="button"
            onClick={() => setShowVideoInput(!showVideoInput)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              videoUrl || showVideoInput
                ? 'bg-purple-50 border-purple-300 text-purple-700'
                : 'bg-[#FAF7F2] hover:bg-[#F3EFEA] border-[#E8E2D9] text-[#59554F]'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-purple-600" />
            <span>{videoUrl ? 'มีวิดีโอแนบ' : 'เพิ่มวิดีโอ'}</span>
          </button>

          {/* Event Date Picker — คงไว้ใน flow ตาม Design Lock (ยังไม่ persist รอ TIME_MODEL) */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D9] text-xs text-[#59554F]">
            <Calendar className="w-3.5 h-3.5 text-[#6B8E68]" />
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="bg-transparent border-0 outline-none text-xs text-[#1F1E1D] font-mono cursor-pointer"
            />
          </div>
          {/* หมายเหตุ: ช่องสถานที่ถูกพักไว้ — ระบบยังไม่มีที่เก็บ (โรคเดียวกับ event_date ใน audit แรก) */}
        </div>

        {/* Submit Post Button */}
        <button
          type="submit"
          disabled={!title.trim() || isUploading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E06D53] hover:bg-[#CC573C] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#E06D53]/20 disabled:opacity-50 transition-all active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          <span>บันทึกลง Life Journey</span>
        </button>
      </div>
    </form>
  );

  if (isOpenModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E8E2D9] p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E8E2D9]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#E06D53]" />
              <h3 className="font-serif font-bold text-lg text-[#1F1E1D]">บันทึกช่วงเวลาใหม่ (Life Journey)</h3>
            </div>
            {onCloseModal && (
              <button
                onClick={onCloseModal}
                className="p-1.5 rounded-full text-[#8C867E] hover:text-[#1F1E1D] hover:bg-[#E8E2D9]/60"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {content}
        </div>
      </div>
    );
  }

  // Inline Composer Box in Home Feed
  return (
    <div className="bg-white rounded-3xl border border-[#E8E2D9] shadow-sm p-5 sm:p-6 mb-6">
      {content}
    </div>
  );
};
