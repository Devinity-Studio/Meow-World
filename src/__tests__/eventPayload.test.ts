import { describe, it, expect } from 'vitest';
import {
  normalizeJourneyEventInput,
  validateJourneyEventPayload,
  buildJourneyEventPayload,
} from '@/utils/eventPayload';

/**
 * Acceptance matrix (owner-defined, 8 cases) for the Event Payload Contract.
 * Home-integrity is the gate the DB cannot enforce for array columns.
 */
const HOME = '6624b327-144f-4ad9-9713-c874a601696e';
const OTHER_HOME = 'aaaaaaaa-0000-0000-0000-000000000000';
const AUTHOR = '9492124e-4f94-4770-91ae-ff302c5c5bab';
const MUUTU = '6a3e1771-138b-47d8-982a-d4cfafa1be0d';
const MOCHI = 'fb4d266e-df0c-4291-a0b7-a65ef08a6998';
const MEMBER = 'bbbbbbbb-0000-0000-0000-000000000000';
const OUTSIDER = 'cccccccc-0000-0000-0000-000000000000';

const OUTSIDER_PET = 'dddddddd-0000-0000-0000-000000000000';

const ctx = {
  petHomeIds: {
    [MUUTU]: HOME,
    [MOCHI]: HOME,
    [OUTSIDER_PET]: OTHER_HOME,
  } as Record<string, string | null>,
  memberUserIds: [AUTHOR, MEMBER],
};

function ok(result: ReturnType<typeof buildJourneyEventPayload>) {
  expect(result.invalid).toBe(false);
  return (result as { payload: ReturnType<typeof normalizeJourneyEventInput> }).payload;
}

describe('Event Payload Contract — acceptance matrix', () => {
  it('1. Event + 1 pet → passes (Birth Event shape, pet_id only)', () => {
    const payload = ok(
      buildJourneyEventPayload(
        { homeId: HOME, authorId: AUTHOR, petId: MUUTU, content: '🐣 Chapter 01' },
        ctx
      )
    );
    expect(payload.pet_id).toBe(MUUTU);
    expect(payload.pet_ids).toEqual([]);
    expect(payload.participant_ids).toEqual([]);
  });

  it('2. Event + many pets → passes; primary deduped out of pet_ids', () => {
    const payload = ok(
      buildJourneyEventPayload(
        {
          homeId: HOME,
          authorId: AUTHOR,
          petId: MUUTU,
          taggedPetIds: [MUUTU, MOCHI, '  ' + MOCHI + ' '],
        },
        ctx
      )
    );
    expect(payload.pet_id).toBe(MUUTU);
    expect(payload.pet_ids).toEqual([MOCHI]);
  });

  it('3. Event + human participants → passes; author may be in the list', () => {
    const payload = ok(
      buildJourneyEventPayload(
        {
          homeId: HOME,
          authorId: AUTHOR,
          participantIds: [AUTHOR, MEMBER],
        },
        ctx
      )
    );
    expect(payload.participant_ids).toEqual([AUTHOR, MEMBER]);
  });

  it('4. Event without pets → passes (home-only story, Q4)', () => {
    const payload = ok(
      buildJourneyEventPayload(
        { homeId: HOME, authorId: AUTHOR, content: 'ครอบครัวกินข้าวรวมกัน' },
        ctx
      )
    );
    expect(payload.pet_id).toBeNull();
    expect(payload.pet_ids).toEqual([]);
  });

  it('5. Event with pets but no human participants → passes (Q5, Birth shape)', () => {
    const payload = ok(
      buildJourneyEventPayload(
        { homeId: HOME, authorId: AUTHOR, petId: MUUTU, taggedPetIds: [MOCHI] },
        ctx
      )
    );
    expect(payload.participant_ids).toEqual([]);
    expect(payload.pet_ids).toEqual([MOCHI]);
  });

  it('6. Pet from another home → REJECTED (Home-integrity)', () => {
    const result = buildJourneyEventPayload(
      { homeId: HOME, authorId: AUTHOR, petId: OUTSIDER_PET },
      ctx
    );
    expect(result.invalid).toBe(true);
    if (result.invalid) expect(result.reason).toMatch(/Home-integrity/);
  });

  it('7. Participant not a home member → REJECTED', () => {
    const result = buildJourneyEventPayload(
      { homeId: HOME, authorId: AUTHOR, participantIds: [OUTSIDER] },
      ctx
    );
    expect(result.invalid).toBe(true);
    if (result.invalid) expect(result.reason).toMatch(/สมาชิก/);
  });

  it('8. Birth Event original shape unchanged → normalize keeps exact existing fields', () => {
    // exactly what the Birth Wizard sends today — no new required keys
    const payload = ok(
      buildJourneyEventPayload(
        {
          homeId: HOME,
          authorId: AUTHOR,
          petId: MUUTU,
          content: '🐣 Chapter 01 — My Beginning\nBirth Event: Litter #015',
          eventType: 'milestone',
        },
        ctx
      )
    );
    expect(payload).toEqual({
      home_id: HOME,
      author_id: AUTHOR,
      content: '🐣 Chapter 01 — My Beginning\nBirth Event: Litter #015',
      event_type: 'milestone',
      pet_id: MUUTU,
      pet_ids: [],
      participant_ids: [],
    });
  });
});

describe('Event Payload Contract — unknown pet ids', () => {
  it('unknown pet id (not in homes map) → REJECTED with friendly reason', () => {
    const result = buildJourneyEventPayload(
      { homeId: HOME, authorId: AUTHOR, petId: 'eeeeeeee-0000-0000-0000-000000000000' },
      ctx
    );
    expect(result.invalid).toBe(true);
    if (result.invalid) expect(result.reason).toMatch(/ไม่พบสัตว์เลี้ยง/);
  });
});
