/**
 * Clause Anatomy mark: a document block with a hard offset shadow, its clauses as
 * heavy rules, one clause highlighted — the product in one glance. Decorative: the
 * name is always shown as text next to it.
 */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className ? `logo ${className}` : 'logo'}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="7" y="7" width="39" height="39" className="logo__shadow" />
      <rect x="2" y="2" width="39" height="39" className="logo__page" strokeWidth="3" />
      <rect x="9" y="10" width="24" height="4" className="logo__ink" />
      <rect x="9" y="18" width="16" height="4" className="logo__ink" />
      <rect x="9" y="26" width="25" height="5" className="logo__highlight" />
      <rect x="9" y="34" width="12" height="4" className="logo__ink" />
    </svg>
  );
}
