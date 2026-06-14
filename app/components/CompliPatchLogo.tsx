type CompliPatchLogoProps = {
  compact?: boolean;
};

export function CompliPatchLogo({ compact = false }: CompliPatchLogoProps) {
  return (
    <span className={`brand-lockup ${compact ? "brand-compact" : ""}`} aria-label="CompliPatch">
      <svg className="brand-mark" viewBox="0 0 128 128" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="complypatchMark" x1="18" y1="18" x2="108" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5f5f5f" />
            <stop offset="1" stopColor="#b8b8b8" />
          </linearGradient>
        </defs>
        <path
          fill="url(#complypatchMark)"
          d="M64 12 108 37v31L93 59V46L64 29 35 46v36l29 17v17L20 91V37L64 12Z"
        />
        <path
          fill="url(#complypatchMark)"
          d="M64 54h44v36l-29 17V90l14-8V69H79v43l-15 9V54Z"
        />
        <path fill="#f8f8f8" d="M49 52 64 43l15 9-15 9-15-9Z" opacity="0.82" />
      </svg>
      {!compact && <span className="brand-word">CompliPatch</span>}
    </span>
  );
}
