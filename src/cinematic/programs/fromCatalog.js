import {getProgram} from "../../data/programCatalog";
import {getSalaryMarket} from "../../data/salaryMarket";
import {contactChannels} from "../data";
import {
  applyOverrides,
  art,
  artwork,
  iconComponent,
  moduleRange,
  pad,
  reapplyHeroBadges,
  toSerializableCopy,
  withFallback,
} from "./cinematicCopy";

/* The cinematic page for any catalogue program, in the same shape as
   productManagement.js. Every fact — modules, topics, tools, internship, soft
   skills, batch, fees, salary bands — is read from the catalogue and
   salaryMarket, so this page and the standard program page can never disagree.
   `copy` carries the page's editorial voice; `liveProgram.cinematic` carries an
   editor's section overrides. Neither can rewrite a fact. */

// Splits the modules into `count` consecutive groups, as evenly as possible,
// earlier groups taking the remainder (21 → 5,4,4,4,4).
const chunk = (list, count) => {
  const size = Math.floor(list.length / count);
  let extra = list.length % count;
  const groups = [];
  for (let i = 0, start = 0; i < count && start < list.length; i += 1) {
    const end = start + size + (extra > 0 ? 1 : 0);
    extra -= 1;
    groups.push(list.slice(start, end));
    start = end;
  }
  return groups;
};

// "Introduction to Data Analytics" → "Data Analytics": the label a stage or
// layer reads better without.
const short = (title) => title.replace(/^(Introduction to|Fundamentals of|Foundations of)\s+/i, "");

const ACCENTS = ["ember", "gold", "bronze", "tangerine", "brass"];
const STAGE_ART = ["foundations", "data", "design", "labs", "production"];
const SYSTEM_ART = ["people", "discover", "data", "compass", "gear", "design", "genai", "target", "megaphone", "moneybag"];
const SKILL_ICONS = ["Layers", "Wrench", "Compass", "Rocket", "Trophy"];
const LEARNING_ICONS = ["BookOpen", "MessageCircle", "Rocket", "Wrench", "FileText", "Trophy", "FolderKanban", "Briefcase"];
const PROOF_ICONS = ["GraduationCap", "FolderKanban", "MapIcon"];
const SALARY_SOURCE = "Glassdoor · AmbitionBox · Naukri · Levels.fyi";
const LEVELS = ["Fresher", "Mid-level", "Experienced"];
const LEVEL_NOTES = {
  Fresher: "An entry role — own well-scoped work alongside a senior team.",
  "Mid-level": "Own an area end to end and deliver measurable outcomes.",
  Experienced: "Lead the work, the direction and the people around it.",
};
const ROLE_FACT_KEYS = ["salary", "years", "location", "year", "source"];

const withIcons = (items, baseItems) =>
  (items || []).map((item, i) => ({
    ...item,
    icon: iconComponent(item.icon, baseItems?.[i]?.icon),
  }));

// `liveProgram` can be supplied by the page from the admin API. The fallback
// keeps the static build/tests working when no live record has been fetched yet.
export const buildCinematicContent = (programId, copy, liveProgram = getProgram(programId)) => {
  /* Admin records are optional-field documents. Merge live values over the
     static catalogue so a blank field can never throw while building a section
     and blank the page (and every animation on it). */
  const staticProgram = getProgram(programId) || {};
  const record = withFallback(liveProgram, staticProgram);
  const pickList = (value, fallback) => (Array.isArray(value) && value.length ? value : fallback || []);
  const program = {
    ...record,
    modules: pickList(record.modules, staticProgram.modules),
    skills: pickList(record.skills, staticProgram.skills),
    internship: pickList(record.internship, staticProgram.internship),
    softSkills: pickList(record.softSkills, staticProgram.softSkills),
  };

  const modules = program.modules;
  const market = getSalaryMarket(programId);
  const months = parseInt(program.duration, 10) || parseInt(staticProgram.duration, 10) || 6;
  const projectCount =
    parseInt(program.projects, 10) || parseInt(staticProgram.projects, 10) || modules.length;

  const stages = chunk(modules, 5);
  const firstN = (group) => group[0].n;
  const lastN = (group) => group[group.length - 1].n;

  const band = (level) => {
    const b = market?.bands.find((x) => x.level === level);
    return b ? {salary: `₹${b.low}–${b.high} LPA`, years: b.years.replace(" years", " yrs")} : {};
  };

  // Role titles are editorial (copy.roles, by seniority); every salary is the
  // real band for that seniority from salaryMarket.
  const roles = LEVELS.flatMap((level) =>
    (copy.roles[level] || []).map((title) => ({
      role: title,
      domain: program.skills.slice(0, 3).join(" · "),
      description: LEVEL_NOTES[level],
      skills: program.skills,
      ...band(level),
      location: "India",
      year: 2026,
      source: SALARY_SOURCE,
    })),
  ).slice(0, 10);

  // Six chapters of consecutive modules, each pictured by its first module.
  const timelineItems = chunk(modules, 6).map((group, i) => ({
    num: pad(i + 1),
    year: moduleRange(firstN(group), lastN(group)),
    title: short(group[0].title),
    description: group.map((m) => m.title).join(" · "),
    tags: [short(group[group.length - 1].title)],
    image: group[0].image,
  }));
  const timelineFacts = (item, i) => {
    const fallback = timelineItems[i] || timelineItems[0] || {};
    return {
      num: pad(i + 1),
      year: fallback.year || item.year,
      tags: Array.isArray(item.tags) && item.tags.length ? item.tags : fallback.tags || [],
      image: item.image || fallback.image,
    };
  };

  // Module numbers are labels, not positions: the AI Systems track starts at
  // n=0 ("Engineering Bridge"). Resolve an edited from/to back to an index
  // through this map so a stage never silently drops its first or last module.
  const moduleIndex = new Map(modules.map((module, index) => [module.n, index]));
  let cursor = 0;
  const stageSlices = stages.map((group) => {
    const start = cursor;
    cursor += group.length;
    return {start, end: cursor - 1};
  });
  const weeksForStage = (stage, i) => {
    const fallback = stageSlices[i] || stageSlices[0] || {start: 0, end: modules.length - 1};
    const from = Number.isInteger(stage.from) ? moduleIndex.get(stage.from) : fallback.start;
    const to = Number.isInteger(stage.to) ? moduleIndex.get(stage.to) : fallback.end;
    const start = Number.isInteger(from) ? from : fallback.start;
    const end = Number.isInteger(to) && to >= start ? to : fallback.end;
    return modules.slice(start, end + 1).map((m) => ({id: `M${pad(m.n)}`, title: m.title, topics: m.points}));
  };

  const derivedStages = stages.map((group, i) => ({
    id: pad(i + 1),
    title: short(group[0].title),
    range: moduleRange(firstN(group), lastN(group)),
    description: group.map((m) => short(m.title)).join(", "),
    motif: short(group[0].title).split(/\s+/)[0],
    from: firstN(group),
    to: lastN(group),
    weeks: weeksForStage({from: firstN(group), to: lastN(group)}, i),
  }));

  const derivedNodes = [...program.skills, ...stages.map((g) => short(g[0].title))]
    .slice(0, 10)
    .map((label, i) => ({label: label.toUpperCase(), img: art(SYSTEM_ART[i % SYSTEM_ART.length])}));

  const derivedStats = [
    {key: "months", value: months, suffix: "", label: "Months", note: "live, instructor-led"},
    {key: "modules", value: modules.length, suffix: "", label: "Structured Modules", note: "foundations to capstone"},
    {key: "projects", value: projectCount, suffix: "+", label: "Projects", note: "portfolio-ready work"},
    {key: "tools", value: program.skills.length, suffix: "", label: "Core Tools", note: program.skills.join(" · ")},
    {key: "certifications", value: 3, suffix: "", label: "Certifications", note: "issued on completion"},
  ];

  const derivedCertificates = [
    {
      mark: `${copy.code}-01`,
      title: program.title,
      focus: program.skills.slice(0, 3).join(" · "),
      stage: moduleRange(modules[0].n, modules[modules.length - 1].n),
      outcome: program.lead,
      skills: program.skills.slice(0, 4),
    },
    {
      mark: `${copy.code}I-02`,
      title: `${copy.center.charAt(0)}${copy.center.slice(1).toLowerCase()} Internship`,
      focus: program.internship.slice(0, 3).map((s) => s.split(/\s+/).slice(0, 2).join(" ")).join(" · "),
      stage: "Internship program",
      outcome: `Real-world work — ${program.internship.slice(0, 3).join(", ").toLowerCase()}.`,
      skills: program.skills.slice(0, 4),
    },
    {
      mark: `${copy.code}L-03`,
      title: "Professional Skills & Communication",
      focus: program.softSkills.slice(0, 3).map((s) => s.split(/\s+/)[0]).join(" · "),
      stage: "Soft-skills program",
      outcome: program.softSkills.slice(0, 3).join(", ") + ".",
      skills: ["Communication", "Collaboration", "Problem Framing", "Leadership"],
    },
  ];

  const channelCopy = toSerializableCopy(contactChannels);
  const liveBadges = [
    String(program.duration || "").toUpperCase(),
    `${modules.length} MODULES`,
    String(program.format || "").toUpperCase(),
  ].filter(Boolean);
  const metaLeft = `${months}-MONTH PROFESSIONAL PROGRAM`;
  const tracksLabel = `Soft-skills program — runs alongside all ${modules.length} modules`;
  const tracks = program.softSkills.map((title) => ({title, range: "All modules"}));
  const lockDescription = `Real-world work — ${program.internship.slice(0, 4).join(", ").toLowerCase()}.`;

  const base = {
    id: program.id,
    programTitle: program.title,

    hero: {
      eyebrow: "CAREERVEDA · PROFESSIONAL PROGRAM",
      title: copy.title,
      ariaLabel: program.title,
      sub: copy.sub,
      badges: reapplyHeroBadges(
        [
          ...liveBadges,
          ...copy.badges,
          "CAPSTONE PROJECT",
          "PLACEMENT SUPPORT",
        ],
        liveBadges,
      ),
      stats: [
        [program.duration, "Duration"],
        [program.mentorship, "Mentorship"],
        [program.format, "Format"],
        [program.learners, "Learners"],
      ],
      metaLeft,
      metaRight: `Next batch · ${program.nextBatch}`,
      image: program.image,
      video: program.heroVideo || "",
    },

    timeline: {
      label: copy.journey,
      title: copy.timelineTitle,
      items: timelineItems.map((item) => ({...item})),
    },

    // Five domains = the five curriculum stages, each listing its modules.
    skills: {
      label: "The Toolkit",
      title: ["What You", "Will Master"],
      sub: `From ${short(modules[0].title).toLowerCase()} to ${short(modules[modules.length - 1].title).toLowerCase()} — five domains, one discipline.`,
      tag: copy.tag,
      items: withIcons(
        stages.map((group, i) => ({
          id: pad(i + 1),
          title: short(group[0].title),
          stack: group.map((m) => short(m.title)),
          icon: SKILL_ICONS[i],
          palette: ACCENTS[i],
          intro: group[0].points[0],
        })),
      ),
    },

    quote: copy.quote,

    architecture: {
      label: "Curriculum",
      title: copy.stackTitle,
      sub: "Seven layers, built in order — each one a foundation for the next.",
      layers: chunk(modules, 7).map((group, i) => ({
        layer: pad(i + 1),
        title: short(group[0].title),
        note: group.map((m) => short(m.title)).join(" → "),
      })),
    },

    modules: {
      label: "Curriculum Journey",
      title: ["Five Stages.", {em: `${modules.length} Modules.`}],
      sub: "One roadmap through the whole program — open a stage to see every module and topic.",
      unit: "modules",
      stages: derivedStages,
      // Tokens, not paths: ModuleGrid adds /images/curriculum/ itself.
      art: Object.fromEntries(STAGE_ART.map((name, i) => [pad(i + 1), name])),
      lockCard: {
        programId: program.id,
        badge: "+",
        title: "Internship Program",
        range: "Unlocked at enrollment",
        description: lockDescription,
      },
      tracksLabel,
      tracks,
    },

    system: {
      label: "System Visualization",
      title: copy.systemTitle,
      sub: "Everything the program connects — the tools, the methods and the work — around one discipline.",
      center: {title: copy.center, sub: copy.centerSub, art: art("product")},
      nodes: derivedNodes,
    },

    // Ten steps: ten modules spread evenly across the program.
    workflow: (() => {
      const picks = Array.from({length: 10}, (_, i) => modules[Math.round((i * (modules.length - 1)) / 9)]);
      return {
        label: "Living Workflow",
        title: copy.workflowTitle,
        lead: "Ten steps, one loop — the order you learn the craft, from first principles to real-world delivery.",
        pipeline: picks.map((m) => short(m.title).split(/\s+/)[0].toLowerCase()),
        steps: picks.map((m) => ({title: short(m.title), note: m.points[0]})),
      };
    })(),

    // Eight portfolio builds, one per curriculum stretch.
    projects: {
      items: chunk(modules, 8).map((group, i) => ({
        id: `p${i + 1}`,
        name: `${short(group[0].title)} Project`,
        stack: program.skills.slice(i % 3, (i % 3) + 3),
        description: group[0].points[1] || group[0].points[0],
        accent: ACCENTS[i % ACCENTS.length],
      })),
      categories: chunk(modules, 8).map((group) => short(group[0].title)),
      sideLeft: copy.sideLeft,
      sideRight: copy.sideRight,
      footLeft: "Real projects · real portfolio",
      footRight: copy.footRight,
    },

    careers: {
      label: "Outcomes",
      title: ["Where This", "Can Take You"],
      lead: "The roles this track opens — one role at a time.",
      roles,
    },

    stats: {label: "Program Statistics", items: derivedStats},

    learning: {
      label: "The Experience",
      title: copy.learningTitle,
      items: withIcons(
        [
          {title: "Live Instructor-Led Classes", note: "100% live, from industry practitioners", icon: LEARNING_ICONS[0]},
          {title: "Daily Doubt-Solving", note: "Live sessions so nothing stays unclear", icon: LEARNING_ICONS[1]},
          {title: "Real Industry Projects", note: `${program.projects} projects across the curriculum`, icon: LEARNING_ICONS[2]},
          {title: "Hands-On Tools", note: program.skills.join(", "), icon: LEARNING_ICONS[3]},
          {title: "Case Studies & Assignments", note: "Industry case studies in every stage", icon: LEARNING_ICONS[4]},
          {title: "Interview Mastery", note: "Mock interviews and hiring-bar preparation", icon: LEARNING_ICONS[5]},
          {title: "Portfolio, Resume & LinkedIn", note: "Dedicated profile building for hiring", icon: LEARNING_ICONS[6]},
          {title: "Placement Support", note: "Hiring preparation and interview support from the placement team", icon: LEARNING_ICONS[7]},
        ],
      ),
    },

    certs: {
      label: "Proof of Work",
      title: ["Build Proof.", "Not Just Knowledge."],
      lede: "Three credentials, issued on completion. Pick one, put your name on it, and take it with you.",
      certificates: derivedCertificates,
      proofPillars: withIcons(
        [
          {title: "Credential", note: "Program, internship and professional-skills certificates, issued on completion.", icon: PROOF_ICONS[0]},
          {title: "Deliverables", note: `${program.projects} projects — real work, not quizzes.`, icon: PROOF_ICONS[1]},
          {title: "Portfolio", note: "Everything in one portfolio a hiring manager can open.", icon: PROOF_ICONS[2]},
        ],
      ),
      note: "A portfolio your future team can read — work you can point to.",
    },

    cta: {
      label: "Admissions Open",
      title: copy.ctaTitle,
      sub: copy.ctaSub,
      meta: [`Next batch · ${program.nextBatch}`, program.seats, "No-cost EMI available"],
    },

    footer: {
      title: copy.footer,
      channels: withIcons(channelCopy),
    },
  };

  const content = applyOverrides(base, program.cinematic);

  // Facts go back on top of the merged copy. Editors own the voice; the
  // programme record, salary market and catalogue own the numbers.
  content.hero.ariaLabel = program.title;
  content.hero.stats = base.hero.stats;
  content.hero.metaRight = `Next batch · ${program.nextBatch}`;
  content.hero.image = program.image;
  content.hero.video = program.heroVideo || "";
  content.hero.metaLeft = metaLeft;
  content.hero.badges = reapplyHeroBadges(content.hero.badges, liveBadges);

  content.timeline.items = content.timeline.items.map((item, i) => ({
    ...item,
    ...timelineFacts(item, i),
  }));

  content.skills.items = withIcons(content.skills.items, base.skills.items);

  content.architecture.layers = content.architecture.layers.map((layer, i) => ({...layer, layer: pad(i + 1)}));

  content.modules.stages = content.modules.stages.map((stage, i) => {
    const fallbackStage = derivedStages[i] || derivedStages[0];
    const resolved = {
      from: Number.isInteger(stage.from) ? stage.from : fallbackStage?.from,
      to: Number.isInteger(stage.to) ? stage.to : fallbackStage?.to,
    };
    return {
      ...stage,
      ...resolved,
      weeks: weeksForStage(resolved, i),
    };
  });
  // Tokens stay tokens — ModuleGrid resolves them to image paths at render time.
  content.modules.art = {...content.modules.art};
  content.modules.lockCard = {
    ...content.modules.lockCard,
    programId: program.id,
    description: lockDescription,
  };
  content.modules.tracksLabel = tracksLabel;
  content.modules.tracks = tracks;

  content.system.center = {...content.system.center, art: artwork(content.system.center?.art)};
  content.system.nodes = (content.system.nodes || []).map((node, i) => ({
    ...node,
    img: node.img || derivedNodes[i]?.img || art(SYSTEM_ART[i % SYSTEM_ART.length]),
  }));

  content.projects.items = content.projects.items.map((item, i) => ({...item, id: `p${i + 1}`}));

  content.careers.roles = content.careers.roles.map((role, i) => {
    const facts = {};
    for (const key of ROLE_FACT_KEYS) {
      if (base.careers.roles[i]?.[key] !== undefined) facts[key] = base.careers.roles[i][key];
    }
    return {...role, ...facts};
  });

  content.stats.items = content.stats.items.map((item, i) => {
    const fact = derivedStats.find((stat) => stat.key === item.key) || derivedStats[i];
    return {...item, value: fact?.value ?? item.value};
  });

  content.learning.items = withIcons(content.learning.items, base.learning.items);

  content.certs.certificates = content.certs.certificates.map((cert, i) => ({
    ...cert,
    mark: base.certs.certificates[i]?.mark || cert.mark,
    stage: base.certs.certificates[i]?.stage || cert.stage,
  }));
  content.certs.proofPillars = withIcons(content.certs.proofPillars, base.certs.proofPillars);

  const extraCtaMeta = (content.cta.meta || []).slice(2);
  content.cta.meta = [
    `Next batch · ${program.nextBatch}`,
    program.seats,
    ...(extraCtaMeta.length ? extraCtaMeta : ["No-cost EMI available"]),
  ];

  content.footer.channels = withIcons(content.footer.channels, base.footer.channels);

  return content;
};
