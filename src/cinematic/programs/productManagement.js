import {getProgram} from "../../data/programCatalog";
import {getSalaryMarket} from "../../data/salaryMarket";
import {PRODUCT_MANAGEMENT_COPY} from "./productManagementCopy";
import {
  applyOverrides,
  artwork,
  cloneCopy,
  iconComponent,
  moduleRange,
  modulesAsWeeks,
  pad,
  reapplyHeroBadges,
  withFallback,
} from "./cinematicCopy";

/* The cinematic page for the PG Program in Product Management. Editorial copy
   lives in productManagementCopy.js so it can be edited in the admin panel;
   facts come from the catalogue/salary market and the live admin record, so the
   page and the standard program page can never disagree. */

const fallbackProgram = getProgram("product-management");
const market = getSalaryMarket("product-management");

const band = (level) => {
  const b = market.bands.find((x) => x.level === level) || market.bands[0];
  return {salary: `₹${b.low}–${b.high} LPA`, years: b.years.replace(" years", " yrs")};
};
const SALARY_SOURCE = "Glassdoor · AmbitionBox · Naukri · Levels.fyi";

const role = (title, level, domain, description, skills) => ({
  role: title,
  domain,
  description,
  skills,
  ...band(level),
  location: "India",
  year: 2026,
  source: SALARY_SOURCE,
});

export const buildProductManagementContent = (program = fallbackProgram) => {
  /* Admin records are optional-field documents: a field can be missing or blank
     even though this hand-curated page needs all 13 modules. Merge live values
     over the static catalogue so a partial edit can never throw here and take
     the whole page — and every scroll animation on it — down with it. */
  const copy = cloneCopy(PRODUCT_MANAGEMENT_COPY);
  const record = withFallback(program, fallbackProgram);
  const liveModules = Array.isArray(record.modules) ? record.modules : [];
  const staticModules = Array.isArray(fallbackProgram.modules) ? fallbackProgram.modules : [];
  const modules = Array.from(
    {length: Math.max(13, liveModules.length, staticModules.length)},
    (_, i) => (liveModules[i]?.title ? liveModules[i] : staticModules[i]),
  ).filter(Boolean);
  const internship =
    Array.isArray(record.internship) && record.internship.length
      ? record.internship
      : fallbackProgram.internship || [];
  const softSkills =
    Array.isArray(record.softSkills) && record.softSkills.length
      ? record.softSkills
      : fallbackProgram.softSkills || [];
  const liveProjects = Number.parseInt(record.projects, 10);
  const projectsCount = Number.isFinite(liveProjects)
    ? liveProjects
    : Number.parseInt(fallbackProgram.projects, 10) || 8;
  const months = Number.parseInt(record.duration, 10) || 6;
  const liveBadges = [
    String(record.duration || "").toUpperCase(),
    `${modules.length} MODULES`,
    String(record.format || "").toUpperCase(),
  ].filter(Boolean);
  const metaLeft = `${months}-MONTH PROFESSIONAL PROGRAM`;
  const tracksLabel = `Soft-skills program — runs alongside all ${modules.length} modules`;
  const lockDescription = `Real-world product work — ${internship.slice(1, 5).join(", ").toLowerCase()} — with mentorship by senior PMs.`;

  const derivedTimeline = copy.timeline.items.map((item, i) => ({
    num: pad(i + 1),
    year: moduleRange(item.from, item.to),
    tags: [modules[item.to - 1]?.deliverable].filter(Boolean),
    image: modules[item.from - 1]?.image,
  }));
  const timelineFacts = (item, i) => {
    const fallback = copy.timeline.items[i] || copy.timeline.items[0];
    const from = Number.isInteger(item.from) ? item.from : fallback.from;
    const to = Number.isInteger(item.to) ? item.to : fallback.to;
    return {
      num: pad(i + 1),
      year: moduleRange(from, to),
      tags: Array.isArray(item.tags) && item.tags.length ? item.tags : [modules[to - 1]?.deliverable].filter(Boolean),
      image: item.image || modules[from - 1]?.image,
    };
  };

  const base = {
    id: record.id,
    programTitle: record.title,

    hero: {
      eyebrow: copy.hero.eyebrow,
      title: copy.hero.title,
      ariaLabel: record.title,
      sub: copy.hero.sub,
      badges: reapplyHeroBadges(copy.hero.badges, liveBadges),
      stats: [
        [record.duration, "Duration"],
        [record.mentorship, "Mentorship"],
        [record.format, "Format"],
        [record.learners, "Learners"],
      ],
      metaLeft,
      metaRight: `Next batch · ${record.nextBatch}`,
      image: record.image,
    },

    timeline: {
      label: copy.timeline.label,
      title: copy.timeline.title,
      items: copy.timeline.items.map((item, i) => ({
        ...derivedTimeline[i],
        title: item.title,
        description: item.description,
      })),
    },

    skills: {
      label: copy.skills.label,
      title: copy.skills.title,
      sub: copy.skills.sub,
      tag: copy.skills.tag,
      items: copy.skills.items.map((item) => ({...item, icon: iconComponent(item.icon)})),
    },

    quote: copy.quote,

    architecture: {
      label: copy.architecture.label,
      title: copy.architecture.title,
      sub: copy.architecture.sub,
      layers: copy.architecture.layers.map((layer, i) => ({...layer, layer: pad(i + 1)})),
    },

    modules: {
      label: copy.modules.label,
      title: copy.modules.title,
      sub: copy.modules.sub,
      unit: copy.modules.unit,
      stages: copy.modules.stages.map((stage) => ({
        ...stage,
        weeks: modulesAsWeeks(modules, stage.from, stage.to),
      })),
      // Keep art as tokens: ModuleGrid adds the /images/curriculum/ prefix.
      art: cloneCopy(copy.modules.art),
      lockCard: {
        ...copy.modules.lockCard,
        programId: record.id,
        description: lockDescription,
      },
      tracksLabel,
      tracks: softSkills.map((title) => ({title, range: "All modules"})),
    },

    system: {
      label: copy.system.label,
      title: copy.system.title,
      sub: copy.system.sub,
      center: {...copy.system.center, art: artwork(copy.system.center.art)},
      nodes: copy.system.nodes.map((node) => ({label: node.label, img: artwork(node.icon)})),
    },

    workflow: copy.workflow,

    projects: {
      items: copy.projects.items.map((item, i) => ({...item, id: `p${i + 1}`})),
      categories: copy.projects.categories,
      sideLeft: copy.projects.sideLeft,
      sideRight: copy.projects.sideRight,
      footLeft: copy.projects.footLeft,
      footRight: copy.projects.footRight,
    },

    careers: {
      label: copy.careers.label,
      title: copy.careers.title,
      lead: copy.careers.lead,
      roles: copy.careers.roles.map((item) => role(item.role, item.level, item.domain, item.description, item.skills)),
    },

    stats: {
      label: copy.stats.label,
      items: copy.stats.items.map((item, i) => ({
        ...item,
        value: [months, modules.length, 25, projectsCount, 3][i],
      })),
    },

    learning: {
      label: copy.learning.label,
      title: copy.learning.title,
      items: copy.learning.items.map((item) => ({...item, icon: iconComponent(item.icon)})),
    },

    certs: {
      label: copy.certs.label,
      title: copy.certs.title,
      lede: copy.certs.lede,
      certificates: copy.certs.certificates.map((cert, i) => ({
        ...cert,
        stage: i === 0 ? moduleRange(1, modules.length) : cert.stage,
      })),
      proofPillars: copy.certs.proofPillars.map((item) => ({...item, icon: iconComponent(item.icon)})),
      note: copy.certs.note,
    },

    cta: {
      label: copy.cta.label,
      title: copy.cta.title,
      sub: copy.cta.sub,
      meta: [`Next batch · ${record.nextBatch}`, record.seats, copy.cta.meta[2]],
    },

    footer: {
      title: copy.footer.title,
      channels: copy.footer.channels.map((channel) => ({...channel, icon: iconComponent(channel.icon)})),
    },
  };

  const content = applyOverrides(base, record.cinematic);

  // Re-apply facts after the merge. An editor can rewrite the story, but not
  // silently detach it from the programme record the page is describing.
  content.hero.ariaLabel = record.title;
  content.hero.stats = base.hero.stats;
  content.hero.metaRight = `Next batch · ${record.nextBatch}`;
  content.hero.image = record.image;
  content.hero.metaLeft = metaLeft;
  content.hero.badges = reapplyHeroBadges(content.hero.badges, liveBadges);

  content.timeline.items = content.timeline.items.map((item, i) => ({
    ...item,
    ...timelineFacts(item, i),
  }));

  content.skills.items = content.skills.items.map((item, i) => ({
    ...item,
    icon: iconComponent(item.icon, base.skills.items[i]?.icon),
  }));

  content.architecture.layers = content.architecture.layers.map((layer, i) => ({...layer, layer: pad(i + 1)}));

  content.modules.stages = content.modules.stages.map((stage, i) => {
    const fallbackStage = copy.modules.stages[i] || copy.modules.stages[0];
    const from = Number.isInteger(stage.from) ? stage.from : fallbackStage.from;
    const to = Number.isInteger(stage.to) ? stage.to : fallbackStage.to;
    return {...stage, weeks: modulesAsWeeks(modules, from, to)};
  });
  // Tokens stay tokens — ModuleGrid resolves them to image paths at render time.
  content.modules.art = {...content.modules.art};
  content.modules.lockCard = {
    ...content.modules.lockCard,
    programId: record.id,
    description: lockDescription,
  };
  content.modules.tracksLabel = tracksLabel;
  content.modules.tracks = softSkills.map((title) => ({title, range: "All modules"}));

  content.system.center = {...content.system.center, art: artwork(content.system.center?.art)};
  content.system.nodes = content.system.nodes.map((node, i) => ({
    ...node,
    img: node.img || artwork(node.icon || copy.system.nodes[i]?.icon),
  }));

  content.projects.items = content.projects.items.map((item, i) => ({...item, id: `p${i + 1}`}));

  content.careers.roles = content.careers.roles.map((item, i) => ({
    ...item,
    ...band(item.level || copy.careers.roles[i]?.level),
    location: "India",
    year: 2026,
    source: SALARY_SOURCE,
  }));

  const statValues = [months, modules.length, 25, projectsCount, 3];
  content.stats.items = content.stats.items.map((item, i) => ({
    ...item,
    value: statValues[i] ?? item.value,
  }));

  content.learning.items = content.learning.items.map((item, i) => ({
    ...item,
    icon: iconComponent(item.icon, base.learning.items[i]?.icon),
  }));

  content.certs.certificates = content.certs.certificates.map((cert, i) => ({
    ...cert,
    mark: base.certs.certificates[i]?.mark || cert.mark,
    stage: i === 0 ? moduleRange(1, modules.length) : base.certs.certificates[i]?.stage || cert.stage,
  }));
  content.certs.proofPillars = content.certs.proofPillars.map((item, i) => ({
    ...item,
    icon: iconComponent(item.icon, base.certs.proofPillars[i]?.icon),
  }));

  const extraCtaMeta = (content.cta.meta || []).slice(2);
  content.cta.meta = [
    `Next batch · ${record.nextBatch}`,
    record.seats,
    ...(extraCtaMeta.length ? extraCtaMeta : [copy.cta.meta[2]]),
  ];

  content.footer.channels = content.footer.channels.map((channel, i) => ({
    ...channel,
    icon: iconComponent(channel.icon, base.footer.channels[i]?.icon),
  }));

  return content;
};

// Kept for the existing section-shape tests and any caller that wants the
// build-time object; the page itself rebuilds from the live record.
export const productManagementContent = buildProductManagementContent();
