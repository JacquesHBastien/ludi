import type { ReactNode } from 'react';

const icon = (d: ReactNode, join = false) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin={join ? 'round' : undefined}
    aria-hidden="true"
  >
    {d}
  </svg>
);

export const Icons = {
  menu: icon(<path d="M4 7h16M4 12h16M4 17h16" />),
  rules: icon(
    <>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
      <path d="M5 17a3 3 0 0 1 3-3h11" />
    </>,
    true,
  ),
  back: icon(<path d="M15 18l-6-6 6-6" />, true),
  close: icon(<path d="M6 6l12 12M18 6L6 18" />),
  phone: icon(
    <>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M11 18h2" />
    </>,
    true,
  ),
  globe: icon(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </>,
    true,
  ),
  join: icon(<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />, true),
  plus: icon(<path d="M12 5v14M5 12h14" />),
  computer: icon(
    <>
      <rect x="4" y="7" width="16" height="12" rx="3" />
      <path d="M12 7V4M9 12h.01M15 12h.01M9 16h6" />
    </>,
    true,
  ),
  /** The iPhone Share icon: a box with an arrow pointing up. */
  share: icon(
    <>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" />
    </>,
    true,
  ),
  /** "Add to Home Screen": a rounded square with a plus. */
  addSquare: icon(
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </>,
    true,
  ),
  /** Android Chrome's menu: three dots. */
  dots: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  ),
  zoomIn: icon(
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L20 20M8 10.5h5M10.5 8v5" />
    </>,
  ),
  zoomOut: icon(
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L20 20M8 10.5h5" />
    </>,
  ),
};
