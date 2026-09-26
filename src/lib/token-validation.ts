// ============================================================
// validateToken — client-side helper
//
// Calls POST /api/tokens/validate and returns a typed result.
// Use this from QRScannerModal, adopt page, or any component
// that needs to validate a scanned QR token.
// ============================================================

export type TokenContext = 'adoption' | 'sharing' | 'vet' | 'family';

export interface TokenInfo {
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

export interface ValidationError {
  code: string;
  message: string;
  layer: 1 | 2 | 3 | 4;
  message_th: string;
}

export interface TokenPermissions {
  scopes: string[];
  access_level: 'read' | 'write';
  actions: string[];
}

export interface TokenValidationResult {
  valid: boolean;
  token?: TokenInfo;
  error?: ValidationError;
  permissions?: TokenPermissions;
}

/**
 * Validate a QR token against the server-side API.
 *
 * @param tokenId   - The raw token UUID extracted from the QR code URL
 * @param userId    - (optional) Current user ID for self-action guard
 * @returns         - Typed validation result
 */
export async function validateToken(
  tokenId: string,
  userId?: string,
): Promise<TokenValidationResult> {
  try {
    const response = await fetch('/api/tokens/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenId, user_id: userId }),
    });

    if (!response.ok && response.status === 400) {
      return {
        valid: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Token is required',
          layer: 1,
          message_th: 'กรุณาระบุ QR Token',
        },
      };
    }

    const result: TokenValidationResult = await response.json();
    return result;
  } catch (err) {
    console.error('Token validation fetch error:', err);
    return {
      valid: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to validation server',
        layer: 1,
        message_th: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง',
      },
    };
  }
}

/**
 * Extract a token UUID from a scanned QR code string.
 *
 * Supports:
 *   - Full URL:  https://example.com/adopt/<uuid>
 *   - Path only: /adopt/<uuid>
 *   - Raw UUID
 */
export function extractTokenFromQR(qrString: string): string | null {
  const trimmed = qrString.trim();

  // Raw UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) return trimmed;

  // URL or path containing /adopt/<uuid>
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(
      /\/adopt\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    );
    if (match) return match[1];
  } catch {
    // Not a valid URL — try as relative path
    const match = trimmed.match(
      /\/adopt\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    );
    if (match) return match[1];
  }

  return null;
}

/**
 * Map a token context to a user-friendly label + icon.
 */
export const CONTEXT_DISPLAY: Record<
  TokenContext,
  { icon: string; label: string; label_en: string }
> = {
  adoption: { icon: '🐱', label: 'รับน้องไปเลี้ยง', label_en: 'Adoption' },
  sharing: { icon: '🔗', label: 'แชร์ข้อมูลน้อง', label_en: 'Sharing' },
  vet: { icon: '🏥', label: 'พบสัตวแพทย์', label_en: 'Vet Access' },
  family: { icon: '👨‍👩‍👧‍👦', label: 'สมาชิกครอบครัว', label_en: 'Household' },
};
