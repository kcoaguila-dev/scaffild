interface ScaffildLogoProps {
  size?: number;
  className?: string;
}

export default function ScaffildLogo({ size = 20, className = "" }: ScaffildLogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden shadow-sm ${className}`}
    >
      <img
        src="/app-icon.jpg"
        alt="Scaffild Logo"
        className="w-full h-full object-cover select-none pointer-events-none"
      />
    </div>
  );
}
