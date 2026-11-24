import {getProgram} from "../../data/programCatalog";
import {genAiContent} from "../content.jsx";
import {CINEMATIC_COPY} from "./catalogPrograms";
import {PRODUCT_MANAGEMENT_COPY} from "./productManagementCopy";
import {templateFromContent} from "./cinematicCopy";
import {buildCinematicContent} from "./fromCatalog";
import {buildGenAiContent} from "./genAi";

/* The "Load current page copy" button in Admin → Programs is driven by this
   registry. Each cinematic route gets the copy that page actually renders, as
   plain JSON with icon tokens — never a Product Management template pasted into
   an unrelated programme. */

const catalogueTemplates = Object.fromEntries(
  Object.entries(CINEMATIC_COPY).map(([id, copy]) => [
    id,
    templateFromContent(buildCinematicContent(id, copy, getProgram(id))),
  ]),
);

export const CINEMATIC_COPY_TEMPLATES = {
  "product-management": PRODUCT_MANAGEMENT_COPY,
  "gen-ai-agentic-ai": templateFromContent(buildGenAiContent(getProgram("gen-ai-agentic-ai")), {
    keepTimelineFacts: true,
    keepWeeks: true,
  }),
  ...catalogueTemplates,
};

/* Admin passes the form rather than a slug, because a new record has no id yet.
   A new/unknown record gets the Product Management starting copy — the same
   template the panel used before templates became per-page — so the button is
   never empty and an existing programme always loads its own words. */
export const cinematicTemplateFor = (program) => {
  const id = typeof program === "string" ? program : program?.slug || program?.id;
  return CINEMATIC_COPY_TEMPLATES[id] || CINEMATIC_COPY_TEMPLATES["product-management"];
};

// Kept as a named export so a page/test can assert the flagship's roadmap made
// it into the editable template rather than being silently dropped.
export const GEN_AI_COPY_TEMPLATE = CINEMATIC_COPY_TEMPLATES["gen-ai-agentic-ai"];
export const BUILT_IN_GEN_AI_CONTENT = genAiContent;
