-- E2E Cleanup (รันใน Supabase Dashboard → SQL Editor) — ฉบับ verified จริงจาก DB
-- ทดสอบวันที่ 2026-09-29 · Birth Contract Runtime Evidence (3/3 PASSED)
--
-- Test homes ทั้งหมดถูกลบผ่าน API แล้วตอนจบ script (cascade ครบ)
-- profiles.id REFERENCES auth.users ON DELETE CASCADE → ลบ auth.users แล้ว profile ตามไปเอง
--
-- Test accounts 4 ตัว (ยืนยันจาก query จริง — ไม่มี real user ใน list นี้):

delete from auth.users where email in (
  'e2e-probe-1790653504988@e2e.meowworld.test.dev',
  'e2e-birth-1790653653331@e2e.meowworld.test.dev',
  'e2e-birth-1790653781025@e2e.meowworld.test.dev',
  'e2e-birth-1790653917659@e2e.meowworld.test.dev'
);
