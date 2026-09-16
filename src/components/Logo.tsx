import { useId } from 'react';

/**
 * Clause Anatomy brand mark: a paper under a magnifying lens, on the brand gradient.
 * Decorative (the product name is always shown as text next to it).
 */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  const gradientId = `${useId()}-brand`;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${gradientId})`} />
      <path d="M15 10h13l7 7v20a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2Z" fill="#fff" />
      <path d="M28 10v5a2 2 0 0 0 2 2h5Z" fill="#c7d2fe" />
      <rect x="17" y="21" width="12" height="2.6" rx="1.3" fill="#4f46e5" />
      <rect x="17" y="26.5" width="8" height="2.6" rx="1.3" fill="#c7d2fe" />
      <rect x="17" y="32" width="6" height="2.6" rx="1.3" fill="#c7d2fe" />
      <circle cx="31" cy="31" r="5.4" fill="#fff" stroke="#f59e0b" strokeWidth="2.8" />
      <path d="m35 35 4 4" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
