/**
 * 🐾 Event Payload Contract + Business Validation (EVENT_STORAGE_DESIGN slice)
 *
 * Chain: Input → Payload Normalization → Business Validation → POST life_journey_events
 *
 * Business Validation Contract (Reconcile 2026-09-26, recorded in migration
 * 20260926200000): the storage shape (participant_ids/pet_ids UUID[]) does NOT
 * guarantee that every UUID belongs to the same home — integrity at insert time
 * is THIS module's responsibility, not "hope the UI sends it right".
 *
 * Domain rules (EVENT_STORAGE_DESIGN):
 *   - pet_id stays the "primary pet"; pet_ids[] holds additional pets (union read)
 *   - Event may have no pets (Q4) and no human participants (Q5 — Birth Event is one)
 *   - author_id is provenance, separate semantics from participants (Q3)
 *   - dedupe: pet_id never repeated inside pet_ids[]
 *
 * Pure module — no Supabase import — so the contract is unit-testable and the
 * Birth Wizard Reference Slice stays untouched.
 */

export interface JourneyEventInput {
  homeId: string;
  authorId: string;
  content?: string | null;
  eventType?: string;
  /** primary pet (existing semantics) */
  petId?: string | null;
  /** additional tagged pets (Composer's tagged_pet_ids[]) */
  taggedPetIds?: string[] | null;
  /** tagged humans incl. or excl. author (Composer's tagged_user_ids[]) */
  participantIds?: string[] | null;
}

export interface LifeJourneyEventInsert {
  home_id: string;
  author_id: string;
  content: string | null;
  event_type: string;
  pet_id: string | null;
  pet_ids: string[];
  participant_ids: string[];
}

export interface InvalidEventPayload {
  readonly invalid: true;
  readonly reason: string;
}

/** Normalize the shape sent to Supabase. Dedupes and cleans empty values. */
export function normalizeJourneyEventInput(input: JourneyEventInput): LifeJourneyEventInsert {
  const petId = input.petId?.trim() || null;
  const taggedPetIds = (input.taggedPetIds ?? [])
    .map((id) => id?.trim())
    .filter((id): id is string => !!id);
  // primary pet is part of the union; never duplicated in pet_ids[]
  const petIds = [...new Set(taggedPetIds.filter((id) => id !== petId))];

  const participantIds = [
    ...new Set(
      (input.participantIds ?? []).map((id) => id?.trim()).filter((id): id is string => !!id)
    ),
  ];

  return {
    home_id: input.homeId,
    author_id: input.authorId,
    content: input.content?.trim() || null,
    event_type: input.eventType?.trim() || 'memory',
    pet_id: petId,
    pet_ids: petIds,
    participant_ids: participantIds,
  };
}

export type ValidatedJourneyEvent =
  | { readonly invalid: false; readonly payload: LifeJourneyEventInsert }
  | InvalidEventPayload;

/**
 * Business Validation: every pet and every human referenced must belong to the
 * same home as the event. Home-integrity at the boundary — the DB cannot check
 * this for array columns, so this is the single gate before POST.
 */
export function validateJourneyEventPayload(
  payload: LifeJourneyEventInsert,
  ctx: {
    petHomeIds: Record<string, string | null | undefined>;
    memberUserIds: string[];
  }
): ValidatedJourneyEvent {
  const allPetIds = payload.pet_id
    ? [payload.pet_id, ...payload.pet_ids]
    : payload.pet_ids;

  for (const petId of allPetIds) {
    const home = ctx.petHomeIds[petId];
    if (home === undefined) {
      return { invalid: true, reason: `ไม่พบสัตว์เลี้ยงที่แท็ก (id: ${petId.slice(0, 8)}…)` };
    }
    if (home !== payload.home_id) {
      return {
        invalid: true,
        reason: 'สัตว์เลี้ยงที่แท็กไม่ได้อยู่ในบ้านเดียวกัน — ปฏิเสธตาม Home-integrity contract',
      };
    }
  }

  const members = new Set(ctx.memberUserIds);
  for (const participantId of payload.participant_ids) {
    if (!members.has(participantId)) {
      return {
        invalid: true,
        reason: `ผู้ร่วมเหตุการณ์ไม่ใช่สมาชิกของบ้านนี้ (id: ${participantId.slice(0, 8)}…)`,
      };
    }
  }

  return { invalid: false, payload };
}

/** One-call convenience: normalize then validate. */
export function buildJourneyEventPayload(
  input: JourneyEventInput,
  ctx: Parameters<typeof validateJourneyEventPayload>[1]
): ValidatedJourneyEvent {
  return validateJourneyEventPayload(normalizeJourneyEventInput(input), ctx);
}
