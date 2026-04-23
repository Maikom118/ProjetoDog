interface PetConnectLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function PawIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 4 toe beans */}
      <ellipse cx="14" cy="18" rx="6"   ry="7.5"  fill="#FF6900" />
      <ellipse cx="27" cy="11" rx="6.5" ry="7.5"  fill="#FF6900" />
      <ellipse cx="40" cy="11" rx="6.5" ry="7.5"  fill="#FF6900" />
      <ellipse cx="52" cy="18" rx="6"   ry="7.5"  fill="#FF6900" />
      {/* Main central pad — rounded heart-like shape */}
      <path
        d="M32 56 C22 56 12 48 11 39 C10 31 16 26 23 27 C26 27.5 29 29 32 29 C35 29 38 27.5 41 27 C48 26 54 31 53 39 C52 48 42 56 32 56 Z"
        fill="#FF6900"
      />
    </svg>
  );
}

export function PetConnectLogo({ size = 'md', className = '' }: PetConnectLogoProps) {
  const config = {
    sm: { text: 'text-xl',  icon: 28 },
    md: { text: 'text-3xl', icon: 38 },
    lg: { text: 'text-4xl', icon: 48 },
  };
  const { text, icon } = config[size];

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <span className={`font-extrabold ${text} leading-none`} style={{ color: '#FF6900' }}>
        Pet
      </span>
      <PawIcon size={icon} />
      <span className={`font-extrabold ${text} leading-none`} style={{ color: '#FE9A00' }}>
        Connect
      </span>
    </div>
  );
}
