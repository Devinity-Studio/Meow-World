-- ============================================================
-- Join Existing Home (Co-care Invitation) — Data Contract
--
-- Design Lock:
--   Invitation เป็นสิทธิ์ชั่วคราว → ระบบตรวจ → Join สำเร็จ →
--   Membership เกิด → Token ถูก consume (atomic, ใน transaction เดียว)
--
-- หลักการ:
--   additive migration — ไม่ลบ/แก้ข้อมูลเดิม, ไม่แก้ policy เดิม, ไม่ลบคอลัมน์
--   stable keys — role ของคำเชิญเป็น structured value ไม่ใช่ free text
-- ============================================================

-- 1) role ของคำเชิญ (V.0.999 ซ่อนอยู่ใน message — ยกเป็นคอลัมน์จริง)
ALTER TABLE public.qr_tokens
  ADD COLUMN IF NOT EXISTS role text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qr_tokens_role_check'
  ) THEN
    ALTER TABLE public.qr_tokens
      ADD CONSTRAINT qr_tokens_role_check
      CHECK (role IS NULL OR role IN ('viewer', 'editor'));
  END IF;
END $$;

-- เติมค่าย้อนหลังจาก message เดิม — QRInviteModal ฝังค่า enum ดิบ ("ในบทบาท editor")
-- ไม่ใช่ label ไทย จึง match ทั้งสองรูปแบบเพื่อกัน drift
UPDATE public.qr_tokens
SET role = CASE
  WHEN message LIKE '%บทบาท editor%' OR message LIKE '%ผู้แก้ไข%' THEN 'editor'
  WHEN message LIKE '%บทบาท viewer%' OR message LIKE '%ผู้ดู%' THEN 'viewer'
END
WHERE role IS NULL AND context = 'family';

-- 2) Preview: ข้อมูลขั้นต่ำของบ้านเป้าหมาย — token คือสิทธิ์ชั่วคราวสำหรับหน้า preview เท่านั้น
--    (security definer = ระบบเป็นผู้ตรวจ, ไม่เปิด RLS กว้าง)
CREATE OR REPLACE FUNCTION public.invite_preview(p_token uuid)
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
  v_sender uuid;
  v_used boolean;
  v_exp timestamptz;
BEGIN
  SELECT t.sender_id, t.is_used, t.expires_at
    INTO v_sender, v_used, v_exp
  FROM qr_tokens t
  WHERE t.id = p_token AND t.context = 'family';

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

-- 3) Join: membership สำเร็จก่อน จึง consume token — ถ้า fail ที่จุดใด token ยังใช้ได้
--    (แก้ failure mode ที่พิสูจน์แล้ว: token ถูกกินแต่ membership ไม่เกิด)
CREATE OR REPLACE FUNCTION public.join_home_with_invite(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

  SELECT t.sender_id, t.is_used, t.expires_at, t.role
    INTO v_sender, v_used, v_exp, v_role
  FROM qr_tokens t
  WHERE t.id = p_token AND t.context = 'family';

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

  -- บ้านของผู้เชิญ (คำเชิญผูกกับบ้านผู้ส่ง — ไม่สร้างบ้านใหม่, ไม่ transfer น้อง)
  SELECT h.id INTO v_home
  FROM homes h
  WHERE h.owner_id = v_sender
  ORDER BY h.created_at
  LIMIT 1;
  IF v_home IS NULL THEN
    RAISE EXCEPTION 'INVITER_HOME_NOT_FOUND';
  END IF;

  -- เป็นสมาชิกอยู่แล้ว → ไม่ทำอะไร (ไม่ consume token, DB มี UNIQUE(home_id, user_id) กันซ้ำอยู่แล้ว)
  IF EXISTS (
    SELECT 1 FROM home_members hm
    WHERE hm.home_id = v_home AND hm.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  -- Invitation เป็นผู้กำหนด role — join flow ไม่ตัดสินเอง
  INSERT INTO home_members (home_id, user_id, role)
  VALUES (v_home, v_uid, COALESCE(v_role, 'viewer'));

  -- membership เกิดจริงแล้ว → consume token (จุดเดียวที่ is_used ถูกตั้ง)
  UPDATE qr_tokens
  SET is_used = true, used_by = v_uid, used_at = now()
  WHERE id = p_token AND is_used = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOKEN_RACE';
  END IF;

  RETURN v_home;
END $$;

-- 4) Home discovery (แบบ additive): สมาชิกอ่านบ้านที่ตัวเองเป็นสมาชิกได้ (SELECT เท่านั้น)
-- ⚠️ ห้ามให้ policy บน home_members query home_members ตรง ๆ — จะเกิด infinite recursion (42P17)
--    (พิสูจน์แล้วด้วย Runtime Evidence รอบแรก) จึงอ่านผ่าน security-definer helper แทน
CREATE OR REPLACE FUNCTION public.my_member_home_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT home_id FROM home_members WHERE user_id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.my_member_home_ids() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_member_home_ids() TO authenticated;

CREATE POLICY "Members can view their homes"
  ON public.homes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM my_member_home_ids() ids
      WHERE ids = homes.id
    )
  );

-- 5) Co-members: สมาชิกบ้านมองเห็นสมาชิกด้วยกัน (HomeMode ต้อง list ทุกคน — ผ่าน helper เดียวกัน)
CREATE POLICY "Members can view co-members"
  ON public.home_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM my_member_home_ids() ids
      WHERE ids = home_members.home_id
    )
  );

-- 6) เรียกได้เฉพาะ user ที่ล็อกอินแล้ว (anon ห้าม)
REVOKE EXECUTE ON FUNCTION public.invite_preview(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.join_home_with_invite(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.invite_preview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_home_with_invite(uuid) TO authenticated;
