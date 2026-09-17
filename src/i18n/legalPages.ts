/** The site's policy pages: ids and titles only, so routing and links stay tiny. */

export const LEGAL_PAGES = ['privacy', 'terms', 'disclaimer', 'accessibility'] as const;
export type LegalPage = (typeof LEGAL_PAGES)[number];

export const LEGAL_TITLE_KEYS = {
  privacy: 'legalPrivacy',
  terms: 'legalTerms',
  disclaimer: 'legalDisclaimer',
  accessibility: 'legalAccessibility',
} as const satisfies Record<LegalPage, string>;
