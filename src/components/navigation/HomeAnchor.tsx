'use client';

import { usePathname, useRouter } from 'next/navigation';

/**
 * 🏠 Global Home Anchor (Gate 3)
 *
 * ความหมายที่ล็อกไว้: Home = Home ของ Current Mode — ไม่ใช่ "/world ตลอดไป"
 * V.0.999 มี Mode เดียว (Home Mode) → resolve เป็น /world ที่เดียวในไฟล์นี้
 * อนาคต: เพิ่ม mode resolver ที่นี่จุดเดียว (ห้าม hardcode ปลายทางใน UI/page layer)
 *
 * วางครั้งเดียวใน src/app/layout.tsx — ไม่แตะ page ใด ๆ / ไม่แตะ local navigation เดิม
 */

// V.0.999 — Current Mode = Home Mode (จุด resolve เดียวของระบบ)
const CURRENT_MODE_HOME = '/world';

// ซ่อน Anchor ตาม Design Lock — exact match
const HIDDEN_EXACT = new Set(['/', '/world']);
// ซ่อนแบบ prefix — /login* (authentication) · /adopt/[token] (guest/external flow)
const HIDDEN_PREFIXES = ['/login', '/adopt/'];

function isHidden(pathname: string): boolean {
  if (HIDDEN_EXACT.has(pathname)) return true;
  return HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export function HomeAnchor() {
  const pathname = usePathname();
  const router = useRouter();

  // SSR/prerender: pathname ยังว่าง — render null ไปก่อน (hydrate แล้วแสดงเอง)
  if (!pathname || isHidden(pathname)) return null;

  return (
    <button
      type="button"
      aria-label="กลับสู่บ้าน"
      title="กลับสู่บ้าน"
      onClick={() => router.push(CURRENT_MODE_HOME)}
      className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center
                 rounded-full border border-[#E8E2D9] bg-white/90 text-xl shadow-md
                 backdrop-blur-sm transition hover:scale-105 hover:bg-white
                 active:scale-95 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-[#E06D53]/60"
      style={{ minWidth: 44, minHeight: 44 }}
    >
      <span aria-hidden="true">🏠</span>
    </button>
  );
}
