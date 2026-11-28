import {useMemo} from "react";
import {useContentItem} from "../hooks/useContent";
import {getProgram} from "../data/programCatalog";
import {adaptProgram} from "../lib/contentAdapters";
import {GenerativeAIPage} from "./GenerativeAIPage";
import {useProgramSeo} from "./useProgramSeo";
import {buildProductManagementContent} from "./programs/productManagement";
import {buildCinematicContent} from "./programs/fromCatalog";
import {CINEMATIC_COPY} from "./programs/catalogPrograms";

/* Programs that render as a cinematic page instead of the standard program
   template are listed in lib/routeChunks.js (CINEMATIC_PROGRAMS), so the right
   chunk is warmed on hover. Product Management keeps its hand-written voice;
   the rest are built from the catalogue (fromCatalog.js). Both are rebuilt from
   the live admin record at runtime, not frozen at build time. */

export default function CinematicProgramPage({programId}) {
  // Static catalogue is the fallback. Once the admin API answers, its record
  // wins — that is what makes a batch date typed in the panel print in this
  // hero instead of the build-time date baked into the content files. A 404
  // from the API for a slug that ships in the catalogue must NOT blank the
  // page: the static record still carries every section and its animations.
  const fallback = getProgram(programId);
  const {item, isPending} = useContentItem("programs", programId, {
    fallback,
    adapt: adaptProgram,
  });
  const program = item || fallback;

  const content = useMemo(() => {
    if (!program) return null;
    if (programId === "product-management") return buildProductManagementContent(program);
    const copy = CINEMATIC_COPY[programId];
    return copy ? buildCinematicContent(programId, copy, program) : null;
  }, [programId, program]);

  useProgramSeo(program);

  // Keyed by program: the page's GSAP/ScrollTrigger setup runs once per mount,
  // so moving between two cinematic programs must start a fresh page.
  if (!program || !content) return null;
  return <GenerativeAIPage key={programId} content={content} isPending={isPending} />;
}
