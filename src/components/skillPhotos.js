// Small real photographs shown to the left of a skill's label, in the explorer's
// skill-chip row and the program page's "Skills covered" tags. One map keeps both
// in step — a skill without a photo keeps its plain icon chip instead.
export const SKILL_PHOTOS = {
  "Product Strategy": "/images/pm/product-strategy.jpg",
  "User Research": "/images/pm/user-research.jpg",
  "Agile": "/images/pm/agile.jpg",
  "Analytics": "/images/pm/analytics.jpg",
  "Gen AI": "/images/pm/analytics.jpg",
};

export const skillPhoto = (skill) => SKILL_PHOTOS[skill] || null;