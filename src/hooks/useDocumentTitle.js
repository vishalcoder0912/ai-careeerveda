import {useEffect} from "react";
import {composeTitle, DEFAULT_DESCRIPTION} from "../config/pageMeta";

// Sets the browser-tab title (and, when given, the meta description) for as long
// as the calling component is mounted. `title` is the short label — it is run
// through composeTitle, so passing "Job Openings" produces "Job Openings |
// CareerVeda". Pass a falsy title to fall back to the brand name alone.
export function useDocumentTitle(title, description) {
  useEffect(() => {
    document.title = composeTitle(title);
    const meta = document.querySelector("meta[name='description']");
    if (meta) meta.setAttribute("content", description || DEFAULT_DESCRIPTION);
  }, [title, description]);
}
