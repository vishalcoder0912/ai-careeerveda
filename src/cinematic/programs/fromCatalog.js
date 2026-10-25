import {
  BookOpen,
  Briefcase,
  Compass,
  FileText,
  FolderKanban,
  GraduationCap,
  Layers,
  Map as MapIcon,
  MessageCircle,
  Rocket,
  Trophy,
  Wrench,
} from "lucide-react";
import {getProgram} from "../../data/programCatalog";
import {getSalaryMarket} from "../../data/salaryMarket";
import {contactChannels} from "../data";

/* The cinematic page for any catalogue program, in the same shape as
   productManagement.js. Every fact — modules, topics, tools, internship, soft
   skills, batch, fees, salary bands — is read from the catalogue and
   salaryMarket, so this page and the standard program page can never disagree.
   Only the voice (hero line, credo, closing line) comes from `copy`; see
   catalogPrograms.js. Nothing here invents a module, a project or a number. */

const pad = (n) => String(n).padStart(2, "0");
const art = (name) => `/images/curriculum/${name}.webp`;
const moduleRange = (from, to) => (from === to ? `Module ${pad(from)}` : `Modules ${pad(from)}–${pad(to)}`);

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
const SKILL_ICONS = [Layers, Wrench, Compass, Rocket, Trophy];
const SALARY_SOURCE = "Glassdoor · AmbitionBox · Naukri · Levels.fyi";
const LEVELS = ["Fresher", "Mid-level", "Experienced"];
const LEVEL_NOTES = {
  Fresher: "An entry role — own well-scoped work alongside a senior team.",
  "Mid-level": "Own an area end to end and deliver measurable outcomes.",
  Experienced: "Lead the work, the direction and the people around it.",
};

export const buildCinematicContent = (programId, copy) => {
  const program = getProgram(programId);
  const modules = program.modules;
  const market = getSalaryMarket(programId);
  const months = parseInt(program.duration, 10);
  const projectCount = parseInt(program.projects, 10) || modules.length;

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

  return {
    id: program.id,
    programTitle: program.title,

    hero: {
      eyebrow: "CAREERVEDA · PROFESSIONAL PROGRAM",
      title: copy.title,
      ariaLabel: program.title,
      sub: copy.sub,
      badges: [
        program.duration.toUpperCase(),
        `${modules.length} MODULES`,
        program.format.toUpperCase(),
        ...copy.badges,
        "CAPSTONE PROJECT",
        "LIFETIME PLACEMENT SUPPORT",
      ],
      stats: [
        [program.duration, "Duration"],
        [program.mentorship, "Mentorship"],
        [program.format, "Format"],
        [program.learners, "Learners"],
      ],
      metaLeft: `${months}-MONTH PROFESSIONAL PROGRAM`,
      metaRight: `Next batch · ${program.nextBatch}`,
      image: program.image,
    },

    // Six chapters of consecutive modules, each pictured by its first module.
    timeline: {
      label: copy.journey,
      title: copy.timelineTitle,
      items: chunk(modules, 6).map((group, i) => ({
        num: pad(i + 1),
        year: moduleRange(firstN(group), lastN(group)),
        title: short(group[0].title),
        description: group.map((m) => m.title).join(" · "),
        tags: [short(group[group.length - 1].title)],
        image: group[0].image,
      })),
    },

    // Five domains = the five curriculum stages, each listing its modules.
    skills: {
      label: "The Toolkit",
      title: ["What You", "Will Master"],
      sub: `From ${short(modules[0].title).toLowerCase()} to ${short(modules[modules.length - 1].title).toLowerCase()} — five domains, one discipline.`,
      tag: copy.tag,
      items: stages.map((group, i) => ({
        id: pad(i + 1),
        title: short(group[0].title),
        stack: group.map((m) => short(m.title)),
        icon: SKILL_ICONS[i],
        palette: ACCENTS[i],
        intro: group[0].points[0],
      })),
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
      stages: stages.map((group, i) => ({
        id: pad(i + 1),
        title: short(group[0].title),
        range: moduleRange(firstN(group), lastN(group)),
        description: group.map((m) => short(m.title)).join(", "),
        motif: short(group[0].title).split(/\s+/)[0],
        weeks: group.map((m) => ({id: `M${pad(m.n)}`, title: m.title, topics: m.points})),
      })),
      art: Object.fromEntries(STAGE_ART.map((name, i) => [pad(i + 1), name])),
      lockCard: {
        programId: program.id,
        badge: "+",
        title: "Internship Program",
        range: "Unlocked at enrollment",
        description: `Real-world work — ${program.internship.slice(0, 4).join(", ").toLowerCase()}.`,
      },
      tracksLabel: `Soft-skills program — runs alongside all ${modules.length} modules`,
      tracks: program.softSkills.map((title) => ({title, range: "All modules"})),
    },

    system: {
      label: "System Visualization",
      title: copy.systemTitle,
      sub: `Everything the program connects — the tools, the methods and the work — around one discipline.`,
      center: {title: copy.center, sub: copy.centerSub, art: art("product")},
      nodes: [...program.skills, ...stages.map((g) => short(g[0].title))]
        .slice(0, 10)
        .map((label, i) => ({label: label.toUpperCase(), img: art(SYSTEM_ART[i % SYSTEM_ART.length])})),
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

    stats: {
      label: "Program Statistics",
      items: [
        {value: months, suffix: "", label: "Months", note: "live, instructor-led"},
        {value: modules.length, suffix: "", label: "Structured Modules", note: "foundations to capstone"},
        {value: projectCount, suffix: "+", label: "Projects", note: "portfolio-ready work"},
        {value: program.skills.length, suffix: "", label: "Core Tools", note: program.skills.join(" · ")},
        {value: 3, suffix: "", label: "Certifications", note: "issued on completion"},
      ],
    },

    learning: {
      label: "The Experience",
      title: copy.learningTitle,
      items: [
        {title: "Live Instructor-Led Classes", note: "100% live, from industry practitioners", icon: BookOpen},
        {title: "Daily Doubt-Solving", note: "Live sessions so nothing stays unclear", icon: MessageCircle},
        {title: "Real Industry Projects", note: `${program.projects} projects across the curriculum`, icon: Rocket},
        {title: "Hands-On Tools", note: program.skills.join(", "), icon: Wrench},
        {title: "Case Studies & Assignments", note: "Industry case studies in every stage", icon: FileText},
        {title: "Interview Mastery", note: "Mock interviews and hiring-bar preparation", icon: Trophy},
        {title: "Portfolio, Resume & LinkedIn", note: "Dedicated profile building for hiring", icon: FolderKanban},
        {title: "Lifetime Placement Assistance", note: "Hiring preparation and support that never expires", icon: Briefcase},
      ],
    },

    certs: {
      label: "Proof of Work",
      title: ["Build Proof.", "Not Just Knowledge."],
      lede: "Three credentials, issued on completion. Pick one, put your name on it, and take it with you.",
      certificates: [
        {
          mark: `${copy.code}-01`,
          title: program.title,
          focus: program.skills.slice(0, 3).join(" · "),
          stage: moduleRange(1, modules.length),
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
      ],
      proofPillars: [
        {title: "Credential", note: "Program, internship and professional-skills certificates, issued on completion.", icon: GraduationCap},
        {title: "Deliverables", note: `${program.projects} projects — real work, not quizzes.`, icon: FolderKanban},
        {title: "Portfolio", note: "Everything in one portfolio a hiring manager can open.", icon: MapIcon},
      ],
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
      channels: contactChannels,
    },
  };
};
