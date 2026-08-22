interface ScaffildLogoProps {
  size?: number;
  className?: string;
}

export default function ScaffildLogo({ size = 20, className = "" }: ScaffildLogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
    >
      <img
        src="/app-icon.png"
        alt="Scaffild Logo"
        className="w-full h-full object-contain select-none pointer-events-none drop-shadow-md"
      />
    </div>
  );
}
