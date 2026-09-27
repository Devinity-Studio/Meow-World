/**
 * Controlled input options for the Direct Add / Edit pet form — SPECIES ONLY.
 *
 * Pet Identity vocabulary (Breed / Color / Pattern) ย้ายไปอยู่ที่ domain module
 * เดียว: `src/utils/petIdentity.ts` (Task §1 "Breed vocabulary ต้องแยกจาก UI")
 * — ไฟล์นี้ re-export ให้ import paths เดิมยังใช้ได้ และมี drift-guard test
 * (petIdentity.test.ts) ตรวจว่า literal ใน migration 20260927100000 ≡ module นี้
 *
 * Sources of truth (no guessed hard-coded lists):
 *   - Species: SPECIES_CONFIG in src/types/species.ts (existing project config).
 *     Only 'cat' is enabled today — other species are visible but locked, which
 *     communicates "Meow World is not cats-only forever, but Cat ships first".
 */

import { SPECIES_CONFIG, SpeciesType } from '@/types/species';

export {
  // Pattern (existing contract — mirror ของ CHECK pets_color_pattern_allowed)
  PATTERN_VOCABULARY as PATTERN_OPTIONS,
  normalizePatternKey as normalizePatternValue,
  availablePatterns,
  colorCountLabel,
  colorCount,
  // Breed identity
  BREED_VOCABULARY,
  BREED_KEYS,
  BREED_STATUS_KEYS,
  BREED_STATUS_OPTIONS,
  breedRequirement,
  transitionBreedStatus,
  // Color identity
  COLOR_VOCABULARY,
  COLOR_KEYS,
  // Boundary normalizers
  normalizeBreedStatus,
  normalizeBreedIdList,
  normalizeBreedKey,
  normalizeColorList,
  // Display
  breedLabels,
  breedStatusLabel,
  colorLabels,
  patternLabel,
  // Legacy adapter
  legacyColorTokens,
  readPetIdentity,
} from '@/utils/petIdentity';

export interface SpeciesOption {
  id: SpeciesType;
  /** Stored value — English name, the existing DB convention ('Cat' in Birth Wizard & mockData). */
  value: string;
  /** Display label — Thai, from the same config. */
  label: string;
  icon: string;
  enabled: boolean;
}

const SPECIES_ORDER: SpeciesType[] = ['cat', 'dog', 'rabbit', 'other'];

export const SPECIES_OPTIONS: SpeciesOption[] = SPECIES_ORDER.map((id) => ({
  id,
  value: SPECIES_CONFIG[id].name,
  icon: SPECIES_CONFIG[id].icon,
  label: SPECIES_CONFIG[id].nameThai,
  // Business rule: only Cat is supported today (SPECIES_CONFIG already contains
  // the rest for the future — the UI shows them locked instead of hiding them).
  enabled: id === 'cat',
}));
