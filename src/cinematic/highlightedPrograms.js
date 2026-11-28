// Cinematic courses whose hero uses the highlighted batch pill and glass stat
// chips. Shared by the page wrapper (CSS scope) and the hero (pill class) so the
// two cannot drift apart as more courses are added.
export const HIGHLIGHTED_PROGRAMS = [
  "gen-ai-agentic-ai",
  "product-management",
  "business-analytics",
  "data-analytics",
];

export const isHighlightedProgram = (slug) => HIGHLIGHTED_PROGRAMS.includes(slug);

// The flagship also has a legacy URL without the /programs/ prefix.
export const programSlugFromPath = (route) => {
  const clean = route.replace(/\/$/, "");
  if (clean.startsWith("/programs/")) return clean.slice("/programs/".length);
  if (clean === "/generative-ai") return "gen-ai-agentic-ai";
  return "";
};
