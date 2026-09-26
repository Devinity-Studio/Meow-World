'use client';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

function CatLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ears */}
      <polygon points="32,42 22,12 48,34" fill="#F5A623" />
      <polygon points="88,42 98,12 72,34" fill="#F5A623" />
      <polygon points="35,40 27,18 46,35" fill="#FFB8C6" />
      <polygon points="85,40 93,18 74,35" fill="#FFB8C6" />
      {/* Face */}
      <circle cx="60" cy="62" r="32" fill="#F5A623" />
      {/* Eyes */}
      <ellipse cx="48" cy="57" rx="4.5" ry="5.5" fill="#2D2D2D" />
      <ellipse cx="72" cy="57" rx="4.5" ry="5.5" fill="#2D2D2D" />
      <circle cx="50" cy="55.5" r="1.5" fill="white" />
      <circle cx="74" cy="55.5" r="1.5" fill="white" />
      {/* Nose */}
      <ellipse cx="60" cy="64" rx="3" ry="2" fill="#FF8FA3" />
      {/* Mouth */}
      <path d="M57,67 Q60,71 63,67" fill="none" stroke="#D4856A" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M60,64 L60,67" fill="none" stroke="#D4856A" strokeWidth="1" />
      {/* Whiskers */}
      <line x1="30" y1="60" x2="46" y2="63" stroke="#D4856A" strokeWidth="1" />
      <line x1="28" y1="66" x2="45" y2="66" stroke="#D4856A" strokeWidth="1" />
      <line x1="74" y1="63" x2="90" y2="60" stroke="#D4856A" strokeWidth="1" />
      <line x1="75" y1="66" x2="92" y2="66" stroke="#D4856A" strokeWidth="1" />
      {/* Blush */}
      <ellipse cx="40" cy="67" rx="5" ry="3" fill="#FFB8C6" opacity="0.4" />
      <ellipse cx="80" cy="67" rx="5" ry="3" fill="#FFB8C6" opacity="0.4" />
      {/* Body */}
      <ellipse cx="60" cy="98" rx="22" ry="16" fill="#F5A623" />
      {/* Paws */}
      <ellipse cx="48" cy="110" rx="8" ry="5" fill="#F5A623" />
      <ellipse cx="72" cy="110" rx="8" ry="5" fill="#F5A623" />
      <ellipse cx="48" cy="110" rx="6" ry="3.5" fill="#FFD9A0" />
      <ellipse cx="72" cy="110" rx="6" ry="3.5" fill="#FFD9A0" />
      {/* Tail */}
      <path d="M82,95 Q100,80 95,60" fill="none" stroke="#F5A623" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Loading({ size = 'md', text, fullScreen = false }: LoadingProps) {
  const sizeMap = {
    sm: { container: 'w-12 h-12', text: 'text-xs' },
    md: { container: 'w-16 h-16', text: 'text-sm' },
    lg: { container: 'w-24 h-24', text: 'text-base' },
  };

  const { container, text: textSize } = sizeMap[size];

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${container} animate-pulse`}
        style={{ animation: 'gentleBounce 2s ease-in-out infinite' }}
      >
        <CatLogo className="w-full h-full drop-shadow-md" />
      </div>
      {text && (
        <p className={`text-amber-900 font-semibold ${textSize} tracking-wide`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(180deg, #FDE8C8 0%, #F9D5A0 40%, #E8C99B 100%)' }}
      >
        {content}
      </div>
    );
  }

  return content;
}

export function LoadingCard() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-10 h-10 animate-pulse" style={{ animation: 'gentleBounce 2s ease-in-out infinite' }}>
        <CatLogo className="w-full h-full" />
      </div>
    </div>
  );
}
