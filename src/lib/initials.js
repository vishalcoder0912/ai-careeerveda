// Initials for the monogram shown when a person has no photo yet. Takes the first
// letter of the first and last word, so "Priya Raghavan" reads PR — the shape a
// name badge would take.
//
// Its own module, not data/mentors.js: contentAdapters is in the home page's
// entry chunk, and importing this from mentors.js dragged the whole mentor list
// (kept alive by its top-level .filter) into every page's first download.
export const initialsOf = (name) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
};
