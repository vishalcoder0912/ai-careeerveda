import {getProgram} from "../../data/programCatalog";
import {genAiContent} from "../content.jsx";
import {
  applyOverrides,
  cloneCopy,
  iconComponent,
  pad,
  reapplyHeroBadges,
  toSerializableCopy,
  withFallback,
} from "./cinematicCopy";

/* The Gen AI & Agentic AI flagship keeps its hand-written cinematic voice, but
   it now goes through the same admin-override pipeline as every other
   cinematic programme: `cinematic` from the record is merged section by section,
   then the facts printed on the page are re-applied from the record itself. */

const fallbackProgram = getProgram("gen-ai-agentic-ai");
const serialisableCopy = toSerializableCopy(genAiContent);
const ROLE_FACT_KEYS = [
  "salary", "salaryVaried", "salaryMappedTo", "salaryMappedRange",
  "location", "year", "source",
];

const decodeIcons = (items, fallbackItems) =>
  (items || []).map((item, i) => ({
    ...item,
    icon: iconComponent(item.icon, fallbackItems?.[i]?.icon),
  }));

const durationMonths = (duration) => {
  const text = String(duration || "");
  const weeks = text.match(/(\d+)\s*weeks?/i);
  if (weeks) return Math.round(Number(weeks[1]) / 4);
  const months = text.match(/(\d+)\s*months?/i);
  return months ? Number(months[1]) : 0;
};

export const buildGenAiContent = (program = fallbackProgram) => {
  const record = withFallback(program, fallbackProgram);
  const copy = toSerializableCopy(serialisableCopy);
  const months = durationMonths(record.duration) || durationMonths(fallbackProgram.duration);
  const duration = record.duration || fallbackProgram.duration;
  const liveBadges = String(duration || "").toUpperCase() ? [String(duration).toUpperCase()] : [];
  const metaLeft = months ? `${months}-MONTH PROFESSIONAL PROGRAM` : genAiContent.hero.metaLeft;

  const base = {
    ...copy,
    id: record.id,
    programTitle: record.title,

    hero: {
      ...copy.hero,
      ariaLabel: record.title,
      badges: reapplyHeroBadges(copy.hero.badges, liveBadges),
      stats: [
        [record.duration, "Duration"],
        [record.mentorship, "Mentorship"],
        [record.format, "Format"],
        [record.learners, "Learners"],
      ],
      metaLeft,
      metaRight: record.nextBatch ? `Next batch · ${record.nextBatch}` : genAiContent.hero.metaRight,
      image: record.image || genAiContent.hero.image,
      video: record.heroVideo || "",
    },

    skills: {
      ...copy.skills,
      items: decodeIcons(copy.skills.items),
    },

    modules: {
      ...copy.modules,
      lockCard: {
        ...copy.modules.lockCard,
        programId: record.id,
      },
    },

    stats: cloneCopy(genAiContent.stats),

    careers: {
      ...copy.careers,
      roles: cloneCopy(genAiContent.careers.roles),
    },

    learning: {
      ...copy.learning,
      items: decodeIcons(copy.learning.items),
    },

    certs: {
      ...copy.certs,
      certificates: cloneCopy(genAiContent.certs.certificates),
      proofPillars: decodeIcons(copy.certs.proofPillars),
    },

    cta: {
      ...copy.cta,
      meta: record.nextBatch
        ? [
            `Next batch · ${record.nextBatch}`,
            record.seats || "Seats limited",
            "Scholarship review included",
          ]
        : cloneCopy(genAiContent.cta.meta),
    },

    footer: {
      ...copy.footer,
      channels: decodeIcons(copy.footer.channels),
    },
  };

  const content = applyOverrides(base, record.cinematic);

  // Facts win again after the merge. The roadmap, credo and module story stay
  // editable; the batch, seats, image, icons and structural numbers do not.
  content.hero.ariaLabel = record.title;
  content.hero.stats = base.hero.stats;
  content.hero.metaRight = record.nextBatch ? `Next batch · ${record.nextBatch}` : genAiContent.hero.metaRight;
  content.hero.image = record.image || genAiContent.hero.image;
  content.hero.video = record.heroVideo || "";
  content.hero.metaLeft = metaLeft;
  content.hero.badges = reapplyHeroBadges(content.hero.badges, liveBadges);

  content.timeline.items = (content.timeline.items || []).map((item, i) => ({...item, num: pad(i + 1)}));
  content.skills.items = decodeIcons(content.skills.items, base.skills.items);

  content.architecture.layers = (content.architecture.layers || []).map((layer, i) => ({
    ...layer,
    layer: pad(i + 1),
  }));

  content.modules.lockCard = {
    ...content.modules.lockCard,
    programId: record.id,
  };

  content.projects.items = (content.projects.items || []).map((item, i) => ({...item, id: `p${i + 1}`}));

  content.careers.roles = (content.careers.roles || []).map((role, i) => {
    const facts = {};
    for (const key of ROLE_FACT_KEYS) {
      if (base.careers.roles[i]?.[key] !== undefined) facts[key] = base.careers.roles[i][key];
    }
    return {...role, ...facts};
  });

  content.stats.items = (content.stats.items || []).map((item, i) => ({
    ...item,
    value: genAiContent.stats.items[i]?.value ?? item.value,
  }));

  content.learning.items = decodeIcons(content.learning.items, base.learning.items);

  content.certs.certificates = (content.certs.certificates || []).map((cert, i) => ({
    ...cert,
    mark: genAiContent.certs.certificates[i]?.mark || cert.mark,
    stage: genAiContent.certs.certificates[i]?.stage || cert.stage,
  }));
  content.certs.proofPillars = decodeIcons(content.certs.proofPillars, base.certs.proofPillars);

  const extraCtaMeta = (content.cta.meta || []).slice(2);
  content.cta.meta = record.nextBatch
    ? [
        `Next batch · ${record.nextBatch}`,
        record.seats || "Seats limited",
        ...(extraCtaMeta.length ? extraCtaMeta : ["Scholarship review included"]),
      ]
    : [...(extraCtaMeta.length ? extraCtaMeta : genAiContent.cta.meta)];

  content.footer.channels = decodeIcons(content.footer.channels, base.footer.channels);

  return content;
};
