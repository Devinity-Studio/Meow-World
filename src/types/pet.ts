export interface Pet {
  id: string;
  home_id: string;
  name: string;
  nickname?: string | null;
  species: string;
  /** Legacy free text — คงอยู่เพื่ออ่านข้อมูลเดิม (Pet Identity: แสดงผ่าน legacy adapter) */
  breed?: string | null;
  /** Breed Status key: purebred | mixed | unknown — NULL = ยังไม่ระบุ (CHECK pets_breed_status_allowed) */
  breed_status?: string | null;
  /** Known Breeds — stable keys TEXT[] (CHECK pets_breed_ids_allowed + pets_breed_status_shape) */
  breed_ids?: string[] | null;
  /** Owner Observation — ลักษณะที่ดูเด่น/คล้าย อ้างได้ทั้ง vocab ไม่จำกัดเฉพาะ breed_ids */
  dominant_breed_id?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  /** Birth component storage (V.0.999) — "เก็บเท่าที่รู้ ไม่เติมค่าที่ไม่รู้" */
  birth_year?: number | null;
  birth_month?: number | null;
  birth_day?: number | null;
  /** 'year' | 'month' | 'exact' — NULL = legacy row (อ่านผ่าน birth_date adapter) */
  birth_precision?: string | null;
  /** Legacy space-joined free text ("ส้ม ขาว") — คงอยู่เพื่ออ่านข้อมูลเดิม */
  color?: string | null;
  /** สีจริงหลายสี — stable keys TEXT[] (CHECK pets_colors_allowed) · color_count = derived */
  colors?: string[] | null;
  /** Color Pattern key (solid/bicolor/tricolor/…) — CHECK-locked vocabulary, migration 20260926100000 */
  color_pattern?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  // Optional fields added via migration
  weight?: number | null;
  updated_at?: string | null;
  // Litter/parent fields
  litter_id?: string | null;
  mother_id?: string | null;
  father_id?: string | null;
  birth_weight?: number | null;
  birth_time?: string | null;
  observed_at?: string | null;
  special_traits?: string[] | null;
  pet_code?: string | null;
}

/**
 * Payload shape sent to the `pets` table after form normalization.
 * Optional fields are null (not '') when not provided — Postgres date columns
 * reject empty strings (22007) and empty strings in text fields become junk data.
 *
 * Pet Identity contract: stable keys เท่านั้น (ไม่มี display label หลุดเข้า payload)
 * — breed_status/breed_ids/dominant_breed_id/colors normalize ที่ boundary โดย
 * petIdentity.ts และ shape ต้องผ่าน CHECK เดียวกับ migration 20260927100000
 */
export interface PetInsertPayload {
  name: string;
  species: string;
  nickname?: string | null;
  breed?: string | null;
  breed_status?: string | null;
  breed_ids?: string[] | null;
  dominant_breed_id?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  /** Birth component storage (V.0.999) — shape ตรวจที่ app boundary + DB CHECK */
  birth_year?: number | null;
  birth_month?: number | null;
  birth_day?: number | null;
  birth_precision?: string | null;
  color?: string | null;
  colors?: string[] | null;
  /** CHECK-locked vocabulary — null when not provided */
  color_pattern?: string | null;
}

export interface PetFormData {
  name: string;
  species: string;
  nickname?: string;
  breed?: string;
  /** raw status key ('' when untouched) — normalized at the boundary */
  breed_status?: string;
  /** raw breed keys — normalized at the boundary */
  breed_ids?: string[];
  /** raw breed key ('' when untouched) — normalized at the boundary */
  dominant_breed_id?: string;
  gender?: string;
  /** raw precision key ('' when untouched) — normalized at the boundary (V.0.999) */
  birth_precision?: string | undefined;
  birth_year?: string | undefined;
  birth_month?: string | undefined;
  birth_day?: string | undefined;
  color?: string;
  /** raw color keys — normalized at the boundary */
  colors?: string[];
  /** raw pattern key (or '' when untouched) — normalized at the boundary */
  color_pattern?: string;
  weight?: number;
}

export interface LifeJourneyEvent {
  id: string;
  home_id: string;
  pet_id: string | null;
  author_id: string | null;
  content?: string | null;
  event_type: string;
  media_urls?: string[] | null;
  participant_ids?: string[] | null;
  created_at: string;
  // Fields from form (mapped to content/event_type)
  event_date?: string;
  title?: string;
  description?: string;
}

export interface LifeJourneyEventFormData {
  event_date: string;
  event_type: string;
  title: string;
  description?: string;
}

// === Litter / Birth Event Types ===

export interface Litter {
  id: string;
  home_id: string;
  name: string;
  birth_date?: string | null;
  location?: string | null;
  notes?: string | null;
  mother_id?: string | null;
  father_id?: string | null;
  mother_name?: string | null;
  father_name?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LitterFormData {
  name: string;
  birth_date: string;
  location: string;
  notes?: string;
  mother_id?: string | null;
  father_id?: string | null;
  mother_name?: string;
  father_name?: string;
}

export interface BabyData {
  name: string;
  nickname?: string;
  gender?: string;
  breed?: string;
  color?: string;
  birth_weight?: number;
  special_traits?: string[];
  birth_date_override?: string; // if different from litter default
}
