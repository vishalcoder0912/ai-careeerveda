
// Inline brand marks for the ratings row (Google, AmbitionBox, Glassdoor,
// Trustpilot). Kept as self-contained SVGs so the logos need no image assets,
// stay crisp at any size and don't depend on an external CDN. The Google "G"
// and the Trustpilot star are the recognised brand marks; the Glassdoor and
// AmbitionBox tiles are simplified brand-colour renditions, not official files.
//
// Keyed by the same source string the `ratings` data uses, so a rating row can
// render its logo with just <BrandLogo source={source} />. An unknown source
// renders nothing rather than a broken glyph.

const MARKS = {
  Google: (
    <svg viewBox="0 0 48 48" role="img" aria-label="Google">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.573l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  ),
  Trustpilot: (
    <svg viewBox="0 0 24 24" role="img" aria-label="Trustpilot">
      <path
        fill="#00B67A"
        d="M12 1.6l2.85 6.86 7.4.6-5.64 4.86 1.72 7.22L12 17.35 5.67 21.14l1.72-7.22L1.75 9.06l7.4-.6z"
      />
    </svg>
  ),
  Glassdoor: (
    <svg viewBox="0 0 24 24" role="img" aria-label="Glassdoor">
      <rect width="24" height="24" rx="5.5" fill="#0CAA41" />
      {/* bracket + dot: the two-part Glassdoor mark, in white */}
      <path
        fill="#fff"
        d="M16 7.5v7.25a2.75 2.75 0 0 1-2.75 2.75H6.25v-2.5h6.5a.75.75 0 0 0 .75-.75V7.5z"
      />
      <circle cx="8" cy="8.75" r="1.6" fill="#fff" />
    </svg>
  ),
  AmbitionBox: (
    <svg viewBox="0 0 24 24" role="img" aria-label="AmbitionBox">
      <rect width="24" height="24" rx="5.5" fill="#4C3FE4" />
      {/* stylised "A" in white */}
      <path
        fill="#fff"
        d="M12 5.5l4.6 13h-2.9l-.83-2.6H11.1l-.82 2.6h-2.9zM12 9.7l-.98 3.35h1.96z"
      />
    </svg>
  ),
};

const BrandLogo = ({source, className = "brand-logo"}) => {
  const mark = MARKS[source];
  if (!mark) return null;
  return (
    <span className={className} aria-hidden="true">
      {mark}
    </span>
  );
};

export default BrandLogo;
