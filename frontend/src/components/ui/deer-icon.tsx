'use client';

interface DeerIconProps {
  className?: string;
  size?: number;
}

export function DeerIcon({ className = 'text-primary', size = 28 }: DeerIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
    >
      {/* Noble Stag / Ciervo Head & Antlers */}
      <path d="M12 21v-5m0 0a3 3 0 00-3-3H8m4 3a3 3 0 013-3h1" />
      <path d="M7 13L4.5 9.5M4.5 9.5L2 10.5M4.5 9.5L3 7M4.5 9.5L6 7.5M7.5 8L6.5 5.5M6.5 5.5L4 4.5M6.5 5.5L8 3.5" />
      <path d="M17 13l2.5-3.5M19.5 9.5L22 10.5M19.5 9.5L21 7M19.5 9.5L18 7.5M16.5 8l1-2.5M17.5 5.5L20 4.5M17.5 5.5L16 3.5" />
      <path d="M9.5 16a2.5 2.5 0 0 1 5 0" />
      <circle cx="10" cy="15.5" r="0.75" fill="currentColor" />
      <circle cx="14" cy="15.5" r="0.75" fill="currentColor" />
    </svg>
  );
}
