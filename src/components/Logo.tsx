/**
 * Clause Anatomy mark — "the pulled-out clause": a document's clauses held between
 * section brackets, with one clause (yellow) drawn out past the page edge like a part in
 * an exploded anatomy diagram. Black tile, hard blue offset shadow. The colours are
 * fixed so the mark looks the same in light and dark themes and in the favicon.
 * Decorative: the product name is always shown or announced next to it.
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
      <rect x="7" y="7" width="40" height="40" fill="#2F4BFF" />
      <rect x="1" y="1" width="40" height="40" fill="#0E0E0E" />
      <path
        d="M12.5 9.5H8v23h4.5M29.5 9.5H34v23h-4.5"
        fill="none"
        stroke="#FFFDF6"
        strokeWidth="3"
        strokeLinecap="square"
      />
      <rect x="12" y="13" width="14" height="3" fill="#FFFDF6" />
      <rect x="12" y="26" width="9" height="3" fill="#FFFDF6" />
      <rect
        x="16.5"
        y="18.75"
        width="29"
        height="4.5"
        fill="#FFD60A"
        stroke="#0E0E0E"
        strokeWidth="1.5"
      />
    </svg>
  );
}
