export function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  // SVG-копия лого: текст INL + бирюзовый глобус со стрелкой + GIK
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 200 56" className="h-full w-auto" xmlns="http://www.w3.org/2000/svg">
        {/* INL */}
        <text x="0" y="40" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="36" fill="#1F2937">INL</text>
        {/* Глобус с стрелкой — бирюзовый круг */}
        <g transform="translate(78, 8)">
          <circle cx="20" cy="20" r="19" fill="none" stroke="#14B5A6" strokeWidth="3.5" />
          {/* Меридианы */}
          <ellipse cx="20" cy="20" rx="9" ry="19" fill="none" stroke="#14B5A6" strokeWidth="2.5" />
          {/* Экватор */}
          <line x1="1" y1="20" x2="39" y2="20" stroke="#14B5A6" strokeWidth="2" />
          {/* Стрелка */}
          <path d="M 14 28 L 28 14 M 22 14 L 28 14 L 28 20" fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        {/* GIK */}
        <text x="125" y="40" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="36" fill="#1F2937">GIK</text>
      </svg>
    </div>
  );
}
