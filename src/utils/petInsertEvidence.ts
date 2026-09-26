/**
 * 🐾 PET INSERT GATE — Runtime Evidence Logger (INSTRUMENTATION ONLY)
 *
 * DO NOT FIX ANYTHING HERE. This module only records evidence:
 *   [1] auth.uid() of the established session
 *   [2] home_id used by the handler
 *   [3] exact payload sent to pets / litters / life_journey_events
 *   [4] the real Supabase PostgrestError
 *
 * Output: browser console (grouped) + localStorage 'mw_insert_evidence'
 * (last 50 records, survives page reload). Zero behavior change.
 */

const LS_KEY = 'mw_insert_evidence';

export interface EvidenceRecord {
  ts: string;
  gate: string;
  authUid: string | null;
  homeId: string | null;
  payload: Record<string, unknown> | null;
  error: {
    message: string | null;
    code: string | null;
    details: string | null;
    hint: string | null;
  } | null;
  membership?: unknown;
}

export function logInsertEvidence(
  gate: string,
  fields: {
    authUid?: string | null;
    homeId?: string | null;
    payload?: Record<string, unknown> | null;
    error?: {
      message?: string | null;
      code?: string | null;
      details?: string | null;
      hint?: string | null;
    } | null;
    membership?: unknown;
  }
): void {
  const record: EvidenceRecord = {
    ts: new Date().toISOString(),
    gate,
    authUid: fields.authUid ?? null,
    homeId: fields.homeId ?? null,
    payload: fields.payload ?? null,
    error: fields.error
      ? {
          message: fields.error.message ?? null,
          code: fields.error.code ?? null,
          details: fields.error.details ?? null,
          hint: fields.error.hint ?? null,
        }
      : null,
    ...(fields.membership !== undefined ? { membership: fields.membership } : {}),
  };

  // Console — grouped so the gate report is copy-paste friendly
  const label = `🔬 [EVIDENCE] ${gate}`;
  // eslint-disable-next-line no-console
  console.groupCollapsed(label);
  // eslint-disable-next-line no-console
  console.log('⏱ ts:', record.ts);
  // eslint-disable-next-line no-console
  console.log('[1] auth.uid():', record.authUid);
  // eslint-disable-next-line no-console
  console.log('[2] home_id:', record.homeId);
  // eslint-disable-next-line no-console
  console.log('[3] payload:', record.payload);
  // eslint-disable-next-line no-console
  console.log('[4] PostgrestError:', record.error);
  if ('membership' in record) {
    // eslint-disable-next-line no-console
    console.log('[5] home_members rows visible to this uid:', record.membership);
  }
  // eslint-disable-next-line no-console
  console.groupEnd();

  // localStorage — evidence survives reload, last 50 records
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    const list: EvidenceRecord[] = raw ? (JSON.parse(raw) as EvidenceRecord[]) : [];
    list.push(record);
    window.localStorage.setItem(LS_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    // storage unavailable — console evidence still stands
  }
}

/** Dump all stored evidence as JSON (for the gate report). */
export function dumpInsertEvidence(): EvidenceRecord[] {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as EvidenceRecord[]) : [];
  } catch {
    return [];
  }
}
