// ─────────────────────────────────────────────────────────────────────────────
//  PUT YOUR TWO LINKS HERE. This is the only file you need to edit.
// ─────────────────────────────────────────────────────────────────────────────
//
// These two destinations live outside the React app — the LMS is a separate
// product and the hiring form is a Google Form — so they are plain URLs rather
// than routes. They are collected here instead of being typed into the footer
// and the mobile drawer separately, because a link that is updated in one of
// the two places and not the other is the classic way these drift apart.
//
// Paste the full URL including https://. Leave a value as an empty string and
// the link simply does not render anywhere — no dead link ever ships.

// 1) "Access Your LMS" — your learning platform's login page.
//    e.g. "https://lms.careerveda.in"
export const LMS_URL = "https://careervedaopcprivatelimited.edmingle.com/";

// 2) "Hire From Us" — the Google Form employers fill in.
//    Open the form → Send → the link (🔗) tab → copy the URL.
//    e.g. "https://docs.google.com/forms/d/e/XXXXXXXX/viewform"
export const HIRE_FROM_US_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdAfc4cxb9x8ir9M3wcJ-WcsBZxPoLtVfAkN9OIYmVTh71dXA/viewform?usp=publish-editor";

// ─────────────────────────────────────────────────────────────────────────────

// The footer and the mobile drawer both render from this list, so adding a third
// external link later means adding one entry here and nothing else.
export const externalLinks = [
  {label: "Access Your LMS", href: LMS_URL, description: "Log in and continue learning"},
  {label: "Hire From Us", href: HIRE_FROM_US_URL, description: "Recruit from our talent pool"},
].filter((link) => link.href);

// ─────────────────────────────────────────────────────────────────────────────
//  SOCIAL PROFILES — PASTE YOUR PROFILE URLS HERE
// ─────────────────────────────────────────────────────────────────────────────
//
// Same rule as above: paste the full URL and the icon appears in the footer;
// leave it "" and that platform is simply absent. So an account you do not have —
// or do not post on — never becomes a dead icon on the site, and you can add them
// one at a time.
//
// `id` picks the icon drawn for the row (see SocialLinks.jsx) and must not change.
// `label` is the accessible name a screen reader announces, since the icon itself
// is a picture with nothing to read.
export const socialLinks = [
  {id: "linkedin", label: "CareerVeda on LinkedIn", href: "https://www.linkedin.com/company/careerveda-official/"},
  {id: "instagram", label: "CareerVeda on Instagram", href: "https://www.instagram.com/_careerveda_"},
  {id: "youtube", label: "CareerVeda on YouTube", href: ""},
  {id: "facebook", label: "CareerVeda on Facebook", href: "https://www.facebook.com/profile.php?id=61585569293075"},
  {id: "x", label: "CareerVeda on X", href: ""},
  {id: "whatsapp", label: "CareerVeda on WhatsApp", href: ""},
].filter((link) => link.href);
