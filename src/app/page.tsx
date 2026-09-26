'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import VillageScene from '@/components/welcome/VillageScene'

const HINT_MS = 3000
const IDLE_MS = 8000
const VISIT_KEY = 'meow_world_visited'

export default function WelcomePage() {
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [firstVisit, setFirstVisit] = useState(false)
  const [hint, setHint] = useState(false)
  const [idleNudge, setIdleNudge] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [entering, setEntering] = useState(false)

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const seen = typeof window !== 'undefined' && localStorage.getItem(VISIT_KEY)
    setFirstVisit(!seen)
    setMounted(true)
    if (!seen) {
      setHint(true)
      const t = setTimeout(() => setHint(false), HINT_MS)
      return () => clearTimeout(t)
    }
  }, [])

  const resetIdle = useCallback(() => {
    setIdleNudge(false)
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setIdleNudge(true), IDLE_MS)
  }, [])

  useEffect(() => {
    resetIdle()
    const evts = ['pointermove', 'pointerdown', 'keydown', 'scroll'] as const
    evts.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }))

    const onVis = () => {
      document.documentElement.style.setProperty(
        '--mw-play', document.hidden ? 'paused' : 'running'
      )
    }

    document.addEventListener('visibilitychange', onVis)
    return () => {
      evts.forEach((e) => window.removeEventListener(e, resetIdle))
      document.removeEventListener('visibilitychange', onVis)
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [resetIdle])

  const enterHouse = () => {
    if (entering) return
    setEntering(true)
    localStorage.setItem(VISIT_KEY, '1')
    setTimeout(() => router.push('/world'), 620)
  }

  const houseActive = hovered || hint || idleNudge

  return (
    <main
      className="relative h-[100dvh] w-full overflow-hidden bg-[#FBE7CE]
                 [&_*]:[animation-play-state:var(--mw-play,running)]"
    >
      <div
        className={`absolute inset-0 transition-all duration-700 ease-out
          ${mounted ? 'opacity-100 blur-0' : 'opacity-0 blur-md'}
          ${entering ? 'scale-[1.6] opacity-0 duration-[600ms]' : 'scale-100'}`}
        style={{ transformOrigin: '68% 62%' }}
      >
        <VillageScene active={houseActive} pressed={pressed} />
      </div>

      <button
        type="button"
        onClick={enterHouse}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => { setHovered(false); setPressed(false) }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label="เข้าสู่บ้านของฉัน — โลกของเจ้าเหมียว"
        className="absolute left-[52%] top-[38%] h-[30%] min-h-[88px] w-[34%] min-w-[88px]
                   -translate-y-1/2 cursor-pointer rounded-[42%] bg-transparent
                   outline-none transition-shadow duration-300
                   focus-visible:shadow-[0_0_0_6px_rgba(255,217,138,.55),0_0_46px_18px_rgba(255,217,138,.4)]"
      />

      <p
        aria-hidden="true"
        className={`pointer-events-none absolute left-[52%] top-[68%] w-[34%] text-center
                    text-[13px] font-medium tracking-wide text-[#8A6A4B]
                    transition-opacity duration-700
                    ${(firstVisit && hint) || idleNudge ? 'opacity-90' : 'opacity-0'}`}
      >
        แตะบ้านเพื่อเข้าไป
      </p>

      <div
        className={`pointer-events-none absolute left-6 top-10 max-w-[42%] sm:left-12 sm:top-14
                    transition-all duration-700 delay-150
                    ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}
                    ${entering ? 'opacity-0 duration-300' : ''}`}
      >
        <h1 className="text-[clamp(20px,3.4vw,34px)] font-extrabold tracking-[.14em] text-[#7A5335]">
          MEOW WORLD
        </h1>
        <p className="mt-4 text-[clamp(16px,2.6vw,26px)] font-semibold leading-snug text-[#8A6446]">
          ยินดีต้อนรับ
          <br />
          <span className="text-[#A97C52]">สู่โลกของเจ้าเหมียว</span>
        </p>
      </div>

      <nav
        aria-label="ทางลัด"
        className={`absolute inset-x-0 bottom-0 transition-all duration-700 delay-300
                    ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
                    ${entering ? 'translate-y-4 opacity-0 duration-300' : ''}`}
      >
        <div className="mx-auto mb-[max(16px,env(safe-area-inset-bottom))] flex w-[min(560px,92%)]
                        items-center justify-around gap-2 rounded-3xl
                        border border-white/40 bg-white/25 px-4 py-3
                        shadow-[0_8px_28px_-12px_rgba(122,83,53,.35)]
                        backdrop-blur-md backdrop-saturate-150">
          <NavAction icon="＋" label="เพิ่มสมาชิก" onClick={() => router.push('/pets/birth')} />
          <span className="h-6 w-px bg-white/50" />
          <NavAction icon="⌁" label="สแกน QR" onClick={() => router.push('/scan')} />
        </div>
      </nav>
    </main>
  )
}

function NavAction({
  icon, label, onClick,
}: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2
                 text-[15px] font-medium text-[#7A5335] transition
                 hover:bg-white/35 active:scale-[.97]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
    >
      <span aria-hidden="true" className="text-lg leading-none">{icon}</span>
      {label}
    </button>
  )
}
