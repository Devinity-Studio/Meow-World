'use client'

type Props = {
  active?: boolean
  pressed?: boolean
}

export default function VillageScene({ active = false, pressed = false }: Props) {
  return (
    <svg
      viewBox="0 0 900 640"
      className="h-full w-full"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE9C7" />
          <stop offset="45%" stopColor="#FFD9B0" />
          <stop offset="100%" stopColor="#FBE7CE" />
        </linearGradient>
        <radialGradient id="sunGlow">
          <stop offset="0%" stopColor="#FFF3C4" stopOpacity=".95" />
          <stop offset="100%" stopColor="#FFF3C4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="houseGlow">
          <stop offset="0%" stopColor="#FFD98A" stopOpacity=".85" />
          <stop offset="100%" stopColor="#FFD98A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BFE0A8" /><stop offset="100%" stopColor="#A5D18C" />
        </linearGradient>
        <linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A3D186" /><stop offset="100%" stopColor="#7FBA69" />
        </linearGradient>
      </defs>

      <g>
        <rect width="900" height="640" fill="url(#sky)" />
        <circle cx="700" cy="120" r="150" fill="url(#sunGlow)" className="anim-sun" />
        <circle cx="700" cy="120" r="46" fill="#FFE08A" className="anim-sun" />

        <g className="anim-cloud" opacity=".75" fill="#FFF8EC">
          <ellipse cx="180" cy="110" rx="52" ry="20" />
          <ellipse cx="215" cy="100" rx="38" ry="24" />
          <ellipse cx="560" cy="70" rx="44" ry="17" />
        </g>

        <g stroke="#8A7A62" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".55">
          <g className="anim-bird-a">
            <path d="M120 90 q8 -8 16 0 q8 -8 16 0" />
            <path d="M168 118 q6 -6 12 0 q6 -6 12 0" />
          </g>
          <g className="anim-bird-b">
            <path d="M60 150 q7 -7 14 0 q7 -7 14 0" />
          </g>
        </g>
      </g>

      <g>
        <path d="M0 400 Q220 340 470 400 T900 372 V640 H0 Z" fill="url(#hillFar)" />
        <path d="M0 470 Q260 415 520 470 T900 448 V640 H0 Z" fill="url(#hillNear)" />

        {[[150, 415, 0.85], [790, 400, 0.95], [270, 398, 0.6]].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <rect x="-7" y="-4" width="14" height="58" rx="6" fill="#9A6F4E" />
            <g className="anim-leaf" style={{ animationDelay: `${i * 0.9}s` }}>
              <circle cx="0" cy="-30" r="42" fill="#6FAE5C" />
              <circle cx="-26" cy="-10" r="28" fill="#7CBB66" />
              <circle cx="26" cy="-12" r="26" fill="#63A052" />
            </g>
          </g>
        ))}

        <g
          transform={`translate(560 300) scale(${pressed ? 0.975 : active ? 1.025 : 1})`}
          style={{ transformOrigin: '560px 380px', transition: 'transform .35s cubic-bezier(.2,.8,.3,1)' }}
        >
          <ellipse
            cx="0" cy="90" rx="210" ry="130"
            fill="url(#houseGlow)"
            className={active ? '' : 'anim-breath'}
            style={{ opacity: active ? 0.9 : undefined, transition: 'opacity .4s' }}
          />
          <ellipse cx="0" cy="152" rx="110" ry="18" fill="#5E9A4C" opacity=".35" />

          <g className="anim-smoke" opacity=".5">
            <circle cx="52" cy="-52" r="9" fill="#FFF6E8" />
          </g>
          <rect x="42" y="-56" width="22" height="34" rx="4" fill="#C97F63" />

          <path d="M-108 -6 L0 -88 L108 -6 Z" fill="#E0785F" />
          <path d="M-108 -6 L0 -88 L108 -6 Z" fill="#000" opacity=".08" />
          <rect x="-86" y="-6" width="172" height="152" rx="12" fill="#FFF3DF" />
          <rect x="-86" y="-6" width="172" height="152" rx="12" fill="#E8B98F" opacity=".18" />

          {[-54, 30].map((x, i) => (
            <g key={i}>
              <rect x={x} y="26" width="52" height="46" rx="8" fill="#FFCE73" />
              <g className="anim-curtain" style={{ animationDelay: `${i * 1.4}s` }}>
                <path d={`M${x + 4} 28 q10 20 0 40 h-4 v-42 Z`} fill="#FFF0CE" opacity=".8" />
              </g>
              <rect x={x} y="26" width="52" height="46" rx="8" fill="none" stroke="#C98A5E" strokeWidth="3" />
            </g>
          ))}

          <rect x="-22" y="88" width="46" height="58" rx="8" fill="#B5714F" />
          <circle cx="14" cy="118" r="3.5" fill="#FFE3A8" />

          {[[-120, 20, 0], [118, 54, 1.2], [-96, 108, 2.4], [96, -34, 3.1]].map(([x, y, d], i) => (
            <g key={i} className="anim-sparkle" style={{ animationDelay: `${d}s` }}>
              <path
                d={`M${x} ${y} l4 -9 l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4 Z`}
                fill="#FFF1B8"
              />
            </g>
          ))}
        </g>

        <g transform="translate(400 470)">
          {[[0, 0, 1, '#7EA6D8'], [34, 4, 0.94, '#E79BB4'], [62, 14, 0.66, '#F5C46A']].map(
            ([x, y, s, c], i) => (
              <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
                <path d="M-13 0 q13 -34 26 0 z" fill={String(c)} />
                <circle cx="0" cy="-12" r="9" fill="#F6D5B8" />
                <path d="M-9 -16 q9 -12 18 0 q-9 -5 -18 0" fill="#5B4636" />
              </g>
            )
          )}
        </g>

        <g transform="translate(492 476) scale(1.15)">
          <g className="anim-tail" transform="translate(-18 -6)">
            <path d="M0 0 q-20 -6 -16 -24" stroke="#F2A55C" strokeWidth="7" fill="none" strokeLinecap="round" />
          </g>
          <ellipse cx="0" cy="-8" rx="17" ry="12" fill="#F7B36B" />
          <circle cx="12" cy="-22" r="12" fill="#F7B36B" />
          <path d="M4 -32 l2 -10 l8 6 z M20 -32 l-2 -10 l-8 6 z" fill="#F7B36B" />
          <g className="anim-blink">
            <circle cx="8" cy="-24" r="2.2" fill="#3D2B1F" />
            <circle cx="17" cy="-24" r="2.2" fill="#3D2B1F" />
          </g>
          <path d="M11.5 -19 l1.5 2 l1.5 -2 z" fill="#D9736A" />
        </g>
      </g>

      <g>
        <path d="M0 560 Q240 528 500 558 T900 540 V640 H0 Z" fill="#6FAE5C" />
        <g className="anim-grass">
          {Array.from({ length: 26 }).map((_, i) => {
            const x = i * 36 + 10
            return <path key={i} d={`M${x} 600 q4 -26 10 -34 q-2 24 -4 34 z`} fill="#5C9A4B" opacity=".8" />
          })}
        </g>
        {[[70, 592], [300, 606], [640, 596], [830, 610]].map(([x, y], i) => (
          <g key={i} className="anim-grass" style={{ animationDelay: `${i * 0.7}s` }}>
            <path d={`M${x} ${y} v-26`} stroke="#4E8A40" strokeWidth="3" />
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse
                key={a} cx={x} cy={y - 30} rx="5" ry="9"
                fill={i % 2 ? '#F6A6C1' : '#FFD98A'}
                transform={`rotate(${a} ${x} ${y - 30})`}
              />
            ))}
            <circle cx={x} cy={y - 30} r="3.5" fill="#FFF3D0" />
          </g>
        ))}
        <g className="anim-leaf" opacity=".9">
          <path d="M900 0 q-90 40 -150 20 q70 -60 150 -60 z" fill="#4F8F42" />
          <path d="M0 0 q80 30 120 90 q-90 -20 -120 -20 z" fill="#5C9A4B" opacity=".85" />
        </g>
      </g>
    </svg>
  )
}
