import {useEffect} from "react";

import {useDocumentTitle} from "../hooks/useDocumentTitle";
import {applySeo} from "../lib/seoTags";
import {courseSchema, breadcrumbSchema, useJsonLd} from "../lib/structuredData";
import {absoluteUrl, OG_IMAGE} from "../config/siteMeta";
import {composeTitle, programMeta} from "../config/pageMeta";

// The same search tags and structured data the standard program page writes
// (ProgramDetailPage), shared by every cinematic program route so swapping the
// layout never costs a page its SEO. `program` may be the live admin record.
export function useProgramSeo(program) {
  const description = programMeta(program)?.description;
  const href = program ? `/programs/${program.id}` : "/";

  useDocumentTitle(program?.title, description);

  useEffect(() => {
    if (!program) return;
    applySeo({
      title: composeTitle(program.title),
      description,
      url: absoluteUrl(href),
      image: program.image || OG_IMAGE,
      type: "article",
    });
  }, [program, description, href]);

  useJsonLd("ld-course", program ? courseSchema(program) : null);
  useJsonLd(
    "ld-breadcrumb",
    program
      ? breadcrumbSchema([
          {name: "Home", path: "/"},
          {name: "Programs", path: "/programs"},
          {name: program.title, path: href},
        ])
      : null,
  );
}
