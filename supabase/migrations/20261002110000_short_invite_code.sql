-- ============================================================
-- Step 6 — Short Invite Code (Human Invite Code)
--
-- Data Contract (LOCKED):
--   FAM-XXXXXXXX = Human Invite Code
--   ├─ 'FAM-' = semantic prefix
--   ├─ 8 ตัว Crockford Base32 (ตัด I, L, O, U)
--   ├─ ไม่ encode home_id / user id ลงใน code
--   ├─ invite_code: NOT NULL · UNIQUE · immutable · server-generated
--   └─ qr_tokens.id ยังเป็น internal token id เดิม (code ไม่แทน id)
--
-- ไม่สร้างระบบ Join สองระบบ:
--   QR (uuid) และ Code (FAM-…) converge ที่ RPC เดียว — RPC รับ text
--   แล้ว resolve เป็น token id ฝั่ง server เสมอ (ห้าม client ตัดสินเอง)
-- ============================================================

-- 1) คอลัมน์ invite_code (nullable ชั่วคราวจนกว่า backfill จะเสร็จ)
ALTER TABLE public.qr_tokens
  ADD COLUMN IF NOT EXISTS invite_code text;

-- 2) Generator: 8 ตัว Crockford Base32 — get_byte % 32 ไม่มี modulo bias (256/32 = 8 พอดี)
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public, extensions
AS $$
DECLARE
  v_alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_bytes bytea;
  i int;
  v_code text;
BEGIN
  v_bytes := gen_random_bytes(8);
  v_code := '';
  FOR i IN 1..8 LOOP
    v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i - 1) % 32) + 1, 1);
  END LOOP;
  RETURN 'FAM-' || v_code;
END $$;

-- 3) Backfill token เก่าทุกตัว (retry เมื่อชน UNIQUE — ให้ DB เป็นผู้รับรองความ unique)
DO $$
DECLARE
  r record;
  v_try int;
BEGIN
  FOR r IN SELECT id FROM qr_tokens WHERE invite_code IS NULL LOOP
    FOR v_try IN 1..10 LOOP
      BEGIN
        UPDATE qr_tokens SET invite_code = generate_invite_code() WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF v_try = 10 THEN RAISE; END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

-- 4) Trigger: token ใหม่ทุกตัวได้ code จาก server เสมอ (client ห้ามตั้งเอง)
CREATE OR REPLACE FUNCTION public.set_invite_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_qr_tokens_invite_code ON public.qr_tokens;
CREATE TRIGGER trg_qr_tokens_invite_code
  BEFORE INSERT ON public.qr_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_invite_code();

-- Contract: invite_code immutable หลังสร้าง — ห้ามแก้ผ่าน UPDATE ทุกทาง (ทุก role)
CREATE OR REPLACE FUNCTION public.protect_invite_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_code IS DISTINCT FROM OLD.invite_code THEN
    RAISE EXCEPTION 'INVITE_CODE_IMMUTABLE';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_qr_tokens_invite_code_immutable ON public.qr_tokens;
CREATE TRIGGER trg_qr_tokens_invite_code_immutable
  BEFORE UPDATE ON public.qr_tokens
  FOR EACH ROW EXECUTE FUNCTION public.protect_invite_code();

-- 5) Constraints: UNIQUE (collision ได้รับการรับรองโดย DB) + family ต้องมี code เสมอ
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qr_tokens_invite_code_key') THEN
    ALTER TABLE public.qr_tokens
      ADD CONSTRAINT qr_tokens_invite_code_key UNIQUE (invite_code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qr_tokens_invite_family_check') THEN
    ALTER TABLE public.qr_tokens
      ADD CONSTRAINT qr_tokens_invite_family_check
      CHECK (context <> 'family' OR invite_code IS NOT NULL);
  END IF;
END $$;

-- 6) Resolve: เปลี่ยน "สิ่งที่มนุษย์ถือ" → token id — จุดเดียวของทุก entry point
--    รับได้: FAM-XXXXXXXX / XXXXXXXX (ไม่มี prefix) / UUID / URL ที่ฝัง /adopt/<uuid>
CREATE OR REPLACE FUNCTION public.resolve_invite_ref(p_ref text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_ref text := upper(trim(coalesce(p_ref, '')));
  v_id uuid;
  v_m text[];
BEGIN
  IF v_ref = '' THEN
    RAISE EXCEPTION 'TOKEN_NOT_FOUND';
  END IF;

  -- URL ที่ฝัง /adopt/<uuid>
  IF v_ref LIKE '%/ADOPT/%' THEN
    v_m := regexp_match(v_ref, '/ADOPT/([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})');
    IF v_m IS NOT NULL THEN
      SELECT id INTO v_id FROM qr_tokens WHERE id = v_m[1]::uuid AND context = 'family';
      IF v_id IS NULL THEN RAISE EXCEPTION 'TOKEN_NOT_FOUND'; END IF;
      RETURN v_id;
    END IF;
  END IF;

  -- FAM-code (ยอมรับกรณีพิมพ์ไม่ครบ prefix: 8 ตัว A-Z0-9 ล้วน)
  -- normalize ตัวสับสน: I/L→1, O→0, U→V (code จริงไม่มีตัวเหล่านี้ จึง map ได้ปลอดภัย)
  -- ⚠️ ห้ามตัด UUID — เช็ครูปแบบก่อนแล้วค่อย truncate สำหรับกรณี code เท่านั้น
  IF v_ref LIKE 'FAM-%' THEN
    v_ref := left(v_ref, 12);
  ELSIF v_ref ~ '^[0-9A-Z]{8}$' THEN
    v_ref := 'FAM-' || v_ref;
  ELSIF v_ref !~ '^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$' THEN
    v_ref := left(v_ref, 12); -- input แปลกปลอม: พยายามตีความเป็น code ก่อน (UUID ต้องผ่านไม่ถูกแตะ)
  END IF;

  IF v_ref LIKE 'FAM-%' THEN
    v_ref := translate(v_ref, 'ILOU', '110V');
    SELECT id INTO v_id FROM qr_tokens WHERE invite_code = v_ref AND context = 'family';
    IF v_id IS NULL THEN RAISE EXCEPTION 'TOKEN_NOT_FOUND'; END IF;
    RETURN v_id;
  END IF;

  -- UUID ล้วน
  IF v_ref ~ '^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$' THEN
    SELECT id INTO v_id FROM qr_tokens WHERE id = v_ref::uuid AND context = 'family';
    IF v_id IS NULL THEN RAISE EXCEPTION 'TOKEN_NOT_FOUND'; END IF;
    RETURN v_id;
  END IF;

  RAISE EXCEPTION 'TOKEN_NOT_FOUND';
END $$;

-- 7) Upgrade RPC ทั้งสอง: เดิมรับ uuid → ใหม่รับ text (converge ผ่าน resolve_invite_ref)
DROP FUNCTION IF EXISTS public.invite_preview(uuid);
DROP FUNCTION IF EXISTS public.join_home_with_invite(uuid);

CREATE OR REPLACE FUNCTION public.invite_preview(p_token text)
RETURNS TABLE (
  home_name text,
  home_description text,
  member_count bigint,
  pet_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
  v_sender uuid;
  v_used boolean;
  v_exp timestamptz;
BEGIN
  v_token := resolve_invite_ref(p_token);

  SELECT t.sender_id, t.is_used, t.expires_at
    INTO v_sender, v_used, v_exp
  FROM qr_tokens t
  WHERE t.id = v_token AND t.context = 'family';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOKEN_NOT_FOUND';
  END IF;
  IF v_used THEN
    RAISE EXCEPTION 'TOKEN_ALREADY_USED';
  END IF;
  IF v_exp IS NOT NULL AND v_exp < now() THEN
    RAISE EXCEPTION 'TOKEN_EXPIRED';
  END IF;

  RETURN QUERY
  SELECT h.name,
         h.description,
         (SELECT count(*) FROM home_members hm WHERE hm.home_id = h.id),
         (SELECT count(*) FROM pets p WHERE p.home_id = h.id AND p.is_active)
  FROM homes h
  WHERE h.owner_id = v_sender
  ORDER BY h.created_at
  LIMIT 1;
END $$;

CREATE OR REPLACE FUNCTION public.join_home_with_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
  v_uid uuid;
  v_home uuid;
  v_role text;
  v_exp timestamptz;
  v_used boolean;
  v_sender uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  v_token := resolve_invite_ref(p_token);

  SELECT t.sender_id, t.is_used, t.expires_at, t.role
    INTO v_sender, v_used, v_exp, v_role
  FROM qr_tokens t
  WHERE t.id = v_token AND t.context = 'family';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOKEN_NOT_FOUND';
  END IF;
  IF v_used THEN
    RAISE EXCEPTION 'TOKEN_ALREADY_USED';
  END IF;
  IF v_exp IS NOT NULL AND v_exp < now() THEN
    RAISE EXCEPTION 'TOKEN_EXPIRED';
  END IF;
  IF v_sender = v_uid THEN
    RAISE EXCEPTION 'SELF_INVITE_FORBIDDEN';
  END IF;

  SELECT h.id INTO v_home
  FROM homes h
  WHERE h.owner_id = v_sender
  ORDER BY h.created_at
  LIMIT 1;
  IF v_home IS NULL THEN
    RAISE EXCEPTION 'INVITER_HOME_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1 FROM home_members hm
    WHERE hm.home_id = v_home AND hm.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  INSERT INTO home_members (home_id, user_id, role)
  VALUES (v_home, v_uid, COALESCE(v_role, 'viewer'));

  UPDATE qr_tokens
  SET is_used = true, used_by = v_uid, used_at = now()
  WHERE id = v_token AND is_used = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOKEN_RACE';
  END IF;

  RETURN v_home;
END $$;

-- 8) ACL: เหมือนเดิม — authenticated เท่านั้น (anon ห้ามทุก entry; resolver เป็น helper ภายใน)
REVOKE EXECUTE ON FUNCTION public.invite_preview(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.join_home_with_invite(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.resolve_invite_ref(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.invite_preview(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_home_with_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_invite_ref(text) TO authenticated;
