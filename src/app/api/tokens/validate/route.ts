import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// ============================================================
// Token Validation API — /api/tokens/validate
//
// Implements the 4-layer security model from QR_TOKEN_SYSTEM_DESIGN_SPEC:
//   Layer 1: Token Validity (exists, not expired, usage limit)
//   Layer 2: Purpose Matching (context, eligibility)
//   Layer 3: Permission Scope (what data can be accessed)
//   Layer 4: Condition Enforcement (verification, time, user)
// ============================================================

/** Every token context that the system supports */
type TokenContext = 'adoption' | 'sharing' | 'vet' | 'family';

/** Validation result shapes */
interface ValidationResult {
  valid: boolean;
  token?: TokenInfo;
  error?: ValidationError;
}

interface TokenInfo {
  id: string;
  context: TokenContext;
  message: string | null;
  created_at: string;
  expires_at: string | null;
  sender: {
    id: string;
    display_name: string | null;
  } | null;
  pet: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    avatar_url: string | null;
  } | null;
}

interface ValidationError {
  code: string;
  message: string;
  layer: 1 | 2 | 3 | 4;
  /** Human-readable Thai message */
  message_th: string;
}

/** Permission scope per context — what the scanner can access */
const PERMISSION_MATRIX: Record<
  TokenContext,
  {
    scopes: string[];
    access_level: 'read' | 'write';
    actions: string[];
  }
> = {
  adoption: {
    scopes: ['pet_profile'],
    access_level: 'read',
    actions: ['adopt_pet'],
  },
  sharing: {
    scopes: ['pet_profile', 'pet_photos'],
    access_level: 'read',
    actions: ['view_pet'],
  },
  vet: {
    scopes: ['pet_profile', 'medical_records', 'vaccination'],
    access_level: 'read',
    actions: ['view_medical'],
  },
  family: {
    scopes: ['pet_profile', 'pet_photos', 'household_info'],
    access_level: 'read',
    actions: ['view_household', 'edit_household'],
  },
};

// ----------------------------------------------------------
// POST /api/tokens/validate
//
// Body: { token: string, user_id?: string }
//
// Returns:
//   200 + valid result   — token is valid
//   200 + invalid result — token is invalid (with error detail)
//   400 — missing token
//   500 — server error
// ----------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tokenId = body.token as string | undefined;
    const requestUserId = body.user_id as string | undefined;

    // ---- Pre-check: body must contain token ----
    if (!tokenId) {
      return NextResponse.json(
        {
          valid: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Token is required',
            layer: 1,
            message_th: 'กรุณาระบุ QR Token',
          } satisfies ValidationError,
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // ---- Layer 1: Token Validity ----
    // Fetch token with joined pet and sender info
    const { data: tokenRow, error: fetchError } = await supabase
      .from('qr_tokens')
      .select(
        `
        id,
        context,
        message,
        is_used,
        used_by,
        used_at,
        expires_at,
        created_at,
        pet:pets(id, name, species, breed, avatar_url),
        sender:profiles!sender_id(id, display_name)
      `,
      )
      .eq('id', tokenId)
      .single();

    // 1a — Token does not exist
    if (fetchError || !tokenRow) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'TOKEN_NOT_FOUND',
          message: 'Token not found',
          layer: 1,
          message_th: 'QR Token ไม่ถูกต้อง หรือไม่มีอยู่ในระบบ',
        } satisfies ValidationError,
      } satisfies ValidationResult);
    }

    // 1b — Token is already used
    if (tokenRow.is_used) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'TOKEN_ALREADY_USED',
          message: 'Token has already been used',
          layer: 1,
          message_th: 'QR Token นี้ถูกใช้ไปแล้ว',
        } satisfies ValidationError,
      } satisfies ValidationResult);
    }

    // 1c — Token has expired
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired',
          layer: 1,
          message_th: 'QR Token หมดอายุแล้ว',
        } satisfies ValidationError,
      } satisfies ValidationResult);
    }

    // ---- Layer 2: Purpose Matching ----
    // Validate that the context is one we recognise
    const knownContexts: TokenContext[] = ['adoption', 'sharing', 'vet', 'family'];
    if (!knownContexts.includes(tokenRow.context as TokenContext)) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'UNKNOWN_CONTEXT',
          message: `Unknown token context: ${tokenRow.context}`,
          layer: 2,
          message_th: 'ประเภท QR Token ไม่รู้จัก',
        } satisfies ValidationError,
      } satisfies ValidationResult);
    }

    // ---- Layer 3: Permission Scope ----
    const permissions = PERMISSION_MATRIX[tokenRow.context as TokenContext];
    if (!permissions) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'NO_PERMISSIONS',
          message: 'No permissions defined for this context',
          layer: 3,
          message_th: 'ไม่พบการกำหนดสิทธิ์สำหรับ QR Token นี้',
        } satisfies ValidationError,
      } satisfies ValidationResult);
    }

    // ---- Layer 4: Condition Enforcement ----
    // 4a — Self-adoption guard: if user_id provided, check they're not the sender
    const rawSenderForGuard = Array.isArray(tokenRow.sender)
      ? tokenRow.sender[0]
      : tokenRow.sender;
    if (requestUserId && rawSenderForGuard) {
      const senderId =
        typeof rawSenderForGuard === 'object' ? rawSenderForGuard.id : rawSenderForGuard;
      if (requestUserId === senderId) {
        return NextResponse.json({
          valid: false,
          error: {
            code: 'SELF_ACTION_FORBIDDEN',
            message: 'User cannot use their own token',
            layer: 4,
            message_th:
              tokenRow.context === 'adoption'
                ? 'คุณไม่สามารถ adopt สัตว์ของตัวเองได้'
                : 'คุณไม่สามารถใช้ QR Token ของตัวเองได้',
          } satisfies ValidationError,
        } satisfies ValidationResult);
      }
    }

    // ---- All checks passed — build response ----
    // Supabase may return joins as arrays or single objects depending on FK type
    const rawSender = Array.isArray(tokenRow.sender)
      ? tokenRow.sender[0]
      : tokenRow.sender;
    const rawPet = Array.isArray(tokenRow.pet)
      ? tokenRow.pet[0]
      : tokenRow.pet;

    const tokenInfo: TokenInfo = {
      id: tokenRow.id,
      context: tokenRow.context as TokenContext,
      message: tokenRow.message,
      created_at: tokenRow.created_at,
      expires_at: tokenRow.expires_at,
      sender:
        rawSender && typeof rawSender === 'object'
          ? { id: rawSender.id, display_name: rawSender.display_name }
          : null,
      pet:
        rawPet && typeof rawPet === 'object'
          ? {
              id: rawPet.id,
              name: rawPet.name,
              species: rawPet.species,
              breed: rawPet.breed,
              avatar_url: rawPet.avatar_url,
            }
          : null,
    };

    return NextResponse.json({
      valid: true,
      token: tokenInfo,
      permissions,
    } satisfies ValidationResult & { permissions: typeof permissions });
  } catch (err) {
    console.error('Token validation error:', err);
    return NextResponse.json(
      {
        valid: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          layer: 1,
          message_th: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง',
        } satisfies ValidationError,
      } satisfies ValidationResult,
      { status: 500 },
    );
  }
}
