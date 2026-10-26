import {useEffect} from "react";
import {useDocumentTitle} from "../hooks/useDocumentTitle";
import {getProgram} from "../data/programCatalog";
import {applySeo} from "../lib/seoTags";
import {courseSchema, breadcrumbSchema, useJsonLd} from "../lib/structuredData";
import {absoluteUrl, OG_IMAGE} from "../config/siteMeta";
import {composeTitle, programMeta} from "../config/pageMeta";
import {GenerativeAIPage} from "./GenerativeAIPage";
import {productManagementContent} from "./programs/productManagement";
import {CATALOG_CINEMATIC} from "./programs/catalogPrograms";

/* Programs that render as a cinematic page instead of the standard program
   template. The slug list lives in lib/routeChunks.js too (CINEMATIC_PROGRAMS),
   so the right chunk is warmed on hover. Product Management keeps its
   hand-written page; the rest are built from the catalogue (fromCatalog.js). */
const CINEMATIC_CONTENT = {
  ...CATALOG_CINEMATIC,
  "product-management": productManagementContent,
};

// The same search tags and structured data the standard program page writes
// (ProgramDetailPage), so swapping the layout never costs the page its SEO.
const useProgramSeo = (program) => {
  const description = programMeta(program)?.description;
  const href = `/programs/${program.id}`;

  useDocumentTitle(program.title, description);

  useEffect(() => {
    applySeo({
      title: composeTitle(program.title),
      description,
      url: absoluteUrl(href),
      image: program.image || OG_IMAGE,
      type: "article",
    });
  }, [program, description, href]);

  useJsonLd("ld-course", courseSchema(program));
  useJsonLd(
    "ld-breadcrumb",
    breadcrumbSchema([
      {name: "Home", path: "/"},
      {name: "Programs", path: "/programs"},
      {name: program.title, path: href},
    ]),
  );
};

export default function CinematicProgramPage({programId}) {
  const program = getProgram(programId);
  useProgramSeo(program);

  // Keyed by program: the page's GSAP/ScrollTrigger setup runs once per mount,
  // so moving between two cinematic programs must start a fresh page.
  return <GenerativeAIPage key={programId} content={CINEMATIC_CONTENT[programId]} />;
}
