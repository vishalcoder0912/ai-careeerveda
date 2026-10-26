// The generated portrait for a person with no photo: their initials on the
// accent gradient. Shared by the static alumni list and API-sourced alumni, so
// a profile without a portrait looks identical whichever source it came from.
//
// Its own module, not data/alumniSpotlight.js: contentAdapters is in the home
// page's entry chunk, and importing this from there dragged the whole alumni
// list (kept alive by its top-level .map calls) into every page's first load.
export const avatarPlaceholder = ({ initials, accent, accentEnd }) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 800" role="img" aria-label="${initials}">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${accent}" />
          <stop offset="1" stop-color="${accentEnd}" />
        </linearGradient>
        <filter id="grain"><feTurbulence baseFrequency=".8" numOctaves="2" stitchTiles="stitch" /></filter>
      </defs>
      <rect width="640" height="800" fill="url(#background)" />
      <rect width="640" height="800" opacity=".09" filter="url(#grain)" />
      <circle cx="500" cy="138" r="200" fill="#fff" opacity=".12" />
      <circle cx="120" cy="700" r="240" fill="#071323" opacity=".14" />
      <text x="320" y="450" text-anchor="middle" fill="#fff" font-family="Inter, Arial, sans-serif" font-size="188" font-weight="800" letter-spacing="-12">${initials}</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
