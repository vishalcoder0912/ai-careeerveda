import {useMemo} from "react";

import {useContentItem} from "../hooks/useContent";
import {getProgram} from "../data/programCatalog";
import {adaptProgram} from "../lib/contentAdapters";
import {GenerativeAIPage} from "./GenerativeAIPage";
import {genAiContent} from "./content";
import {buildGenAiContent} from "./programs/genAi";
import {useProgramSeo} from "./useProgramSeo";

// The flagship keeps its hand-written cinematic voice, but every fact it prints
// — batch, seats, duration, format, learners, image and structural numbers — is
// re-applied from the admin record, exactly like every other program route.
export default function GenAiProgramPage() {
  const fallback = getProgram("gen-ai-agentic-ai");
  const {item} = useContentItem("programs", "gen-ai-agentic-ai", {
    fallback,
    adapt: adaptProgram,
  });
  // A 404 from the API must not blank the flagship page — the catalogue record
  // is a complete fallback, including all of the cinematic animations.
  const program = item || fallback;

  const content = useMemo(() => {
    if (!program) return genAiContent;
    return buildGenAiContent(program);
  }, [program]);

  useProgramSeo(program);

  if (!program) return null;
  return <GenerativeAIPage content={content} />;
}
