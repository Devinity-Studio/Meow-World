export interface Pet {
  id: string;
  home_id: string;
  name: string;
  nickname?: string | null;
  species: string;
  breed?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  color?: string | null;
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
 */
export interface PetInsertPayload {
  name: string;
  species: string;
  nickname?: string | null;
  breed?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  color?: string | null;
}

export interface PetFormData {
  name: string;
  species: string;
  nickname?: string;
  breed?: string;
  gender?: string;
  birth_date?: string;
  color?: string;
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
