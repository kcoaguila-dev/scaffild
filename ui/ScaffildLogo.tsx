interface ScaffildLogoProps {
  size?: number;
  className?: string;
}

export default function ScaffildLogo({ size = 20, className = "" }: ScaffildLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="scaffildGradient" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00d2ff" />
          <stop offset="50%" stopColor="#3a7bd5" />
          <stop offset="100%" stopColor="#9d50bb" />
        </linearGradient>
        <linearGradient id="clapperStripe" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Scaffolding Frame (Truss Structure) */}
      <rect x="3" y="3" width="26" height="26" rx="4" stroke="url(#scaffildGradient)" strokeWidth="2" />
      
      {/* Structural X-Bracing */}
      <path d="M4 4L28 28M28 4L4 28" stroke="url(#scaffildGradient)" strokeWidth="1.2" strokeOpacity="0.4" />
      <path d="M4 16H28M16 4V28" stroke="url(#scaffildGradient)" strokeWidth="1.2" strokeOpacity="0.5" />

      {/* Clapperboard Centerpiece */}
      <rect x="8" y="10" width="16" height="13" rx="2" fill="#0f172a" stroke="url(#scaffildGradient)" strokeWidth="1.8" />
      
      {/* Angled Clapper Top Slate */}
      <path d="M7 9.5L24.5 4.5L25.5 7.5L8 12.5Z" fill="#1e293b" stroke="url(#scaffildGradient)" strokeWidth="1.5" />
      <path d="M12 8L14 6M17 6.5L19 4.8M21.5 5.5L23 4.2" stroke="url(#clapperStripe)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Joint Nodes */}
      <circle cx="4" cy="4" r="1.5" fill="#00d2ff" />
      <circle cx="28" cy="4" r="1.5" fill="#3a7bd5" />
      <circle cx="4" cy="28" r="1.5" fill="#3a7bd5" />
      <circle cx="28" cy="28" r="1.5" fill="#9d50bb" />
    </svg>
  );
}
