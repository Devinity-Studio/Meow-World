/**
 * Controlled input options for the Direct Add / Edit pet form.
 *
 * Sources of truth (no guessed hard-coded lists):
 *   - Species: SPECIES_CONFIG in src/types/species.ts (existing project config).
 *     Only 'cat' is enabled today — other species are visible but locked, which
 *     communicates "Meow World is not cats-only forever, but Cat ships first".
 *   - Breed:   convention from real data + mockData format: "ชื่อไทย (English)".
 *     Includes an "อื่น ๆ" escape hatch that reveals a text input, so nobody is
 *     blocked by an incomplete list.
 *   - Color:   cats commonly have multiple colors → checklist (multi-select),
 *     stored as the existing space-joined convention ("ส้ม ขาว" — มู่ทู่'s data).
 */

import { SPECIES_CONFIG, SpeciesType } from '@/types/species';

export interface SpeciesOption {
  id: SpeciesType;
  icon: string;
  label: string;
  enabled: boolean;
}

const SPECIES_ORDER: SpeciesType[] = ['cat', 'dog', 'rabbit', 'other'];

export const SPECIES_OPTIONS: SpeciesOption[] = SPECIES_ORDER.map((id) => ({
  id,
  icon: SPECIES_CONFIG[id].icon,
  label: SPECIES_CONFIG[id].nameThai,
  // Business rule: only Cat is supported today (SPECIES_CONFIG already contains
  // the rest for the future — the UI shows them locked instead of hiding them).
  enabled: id === 'cat',
}));

export interface BreedOption {
  value: string; // stored value, "ชื่อไทย (English)" convention
  note?: string;
}

export const BREED_OPTIONS: BreedOption[] = [
  { value: 'วิเชียรมาศ (Wichianmat)' },
  { value: 'ขาวมณี (Khao Manee)' },
  { value: 'บริติช ช็อตแฮร์ (British Shorthair)' },
  { value: 'สก็อตติช โฟลด์ (Scottish Fold)' },
  { value: 'ส้มลายเสือ (Orange Tabby)' },
  { value: 'สีสวาด (Black-and-white Bicolor)' },
  { value: 'ขนสั้นสีทอง (Golden Shorthair)' },
  { value: 'อื่น ๆ', note: 'TEXT_INPUT' },
];

export interface ColorOption {
  value: string;
}

export const COLOR_OPTIONS: ColorOption[] = [
  { value: 'ส้ม' },
  { value: 'ขาว' },
  { value: 'ดำ' },
  { value: 'เทา' },
  { value: 'น้ำตาล' },
  { value: 'ครีม' },
  { value: 'สามสี' },
  { value: 'สองสี' },
  { value: 'ลายเสือ' },
  { value: 'ฟ้า' },
];

/** Join selected colors using the existing storage convention ("ส้ม ขาว"). */
export function joinColors(selected: string[]): string {
  return selected.join(' ');
}

/** Split a stored color string back into checklist selections. */
export function splitColors(stored: string | null | undefined): string[] {
  if (!stored) return [];
  return stored.split(/\s+/).filter(Boolean);
}
