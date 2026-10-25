import {BookOpen, Briefcase, FileText, FolderKanban, MessageCircle, Rocket} from "lucide-react";
import {getProgram} from "../../data/programCatalog";
import {getSalaryMarket} from "../../data/salaryMarket";
import {contactChannels} from "../data";

/* Turns a program's editorial copy into the full cinematic content object
   (shape: see content.jsx). Facts come from the catalogue (modules,
   internship, soft skills, duration, batch) and the salary bands from
   salaryMarket, so a cinematic page and the standard program page can never
   disagree. A program file (programs/*.js) only writes what a page says:
   headings, chapters, domains, projects, roles. */

export const pad = (n) => String(n).padStart(2, "0");
export const art = (name) => `/images/curriculum/${name}.webp`;
export const agentArt = (name) => `/images/agent-system/${name}.webp`;
export const moduleRange = (from, to) =>
  from === to ? `Module ${pad(from)}` : `Modules ${pad(from)}–${pad(to)}`;

const PALETTES = ["ember", "gold", "bronze", "tangerine", "brass"];
const SALARY_SOURCE = "Glassdoor · AmbitionBox · Naukri · Levels.fyi";

export function buildProgramContent(id, copy) {
  const program = getProgram(id);
  const {modules} = program;
  const market = getSalaryMarket(id);

  // Modules are looked up by their number, not their index: some programs
  // start at module 00.
  const between = (from, to) => modules.filter((m) => m.n >= from && m.n <= to);
  const moduleNo = (n) => modules.find((m) => m.n === n);
  const first = modules[0].n;
  const last = modules[modules.length - 1].n;
  const months = parseInt(program.duration, 10);

  const band = (level) => {
    const b = market.bands.find((x) => x.level === level);
    return {salary: `₹${b.low}–${b.high} LPA`, years: b.years.replace(" years", " yrs")};
  };

  // The internship's mentors, from its closing "Industry Mentorship by …"
  // line; plain words lowercased, acronyms (PMs, AI) kept.
  const internWork = program.internship.filter((x) => !/mentorship/i.test(x));
  const mentors = (program.internship.at(-1).match(/Mentorship by (.+)$/)?.[1] ?? "Industry Mentors")
    .replace(/\b[A-Z][a-z]+\b/g, (w) => w.toLowerCase());

  return {
    id,
    programTitle: program.title,

    hero: {
      eyebrow: "CAREERVEDA · PROFESSIONAL PROGRAM",
      ariaLabel: program.title,
      stats: [
        [program.duration, "Duration"],
        [program.mentorship, "Mentorship"],
        [program.format, "Format"],
        [program.learners, "Learners"],
      ],
      metaLeft: `${months}-MONTH PROFESSIONAL PROGRAM`,
      metaRight: `Next batch · ${program.nextBatch}`,
      image: program.image,
      ...copy.hero,
    },

    // Six chapters, each pictured by its own image or its first module's.
    timeline: {
      label: copy.timeline.label,
      title: copy.timeline.title,
      items: copy.timeline.chapters.map(([from, to, title, description, image], i) => ({
        num: pad(i + 1),
        year: moduleRange(from, to),
        title,
        description,
        tags: [moduleNo(to).deliverable ?? moduleNo(to).title],
        image: image ?? moduleNo(from).image,
      })),
    },

    skills: {
      label: "The Toolkit",
      title: ["What You", "Will Master"],
      ...copy.skills,
      items: copy.skills.items.map(([title, icon, intro, stack], i) => ({
        id: pad(i + 1),
        title,
        stack,
        icon,
        palette: PALETTES[i % PALETTES.length],
        intro,
      })),
    },

    quote: copy.quote,

    architecture: {
      label: "Curriculum",
      ...copy.architecture,
      layers: copy.architecture.layers.map(([title, note], i) => ({layer: pad(i + 1), title, note})),
    },

    modules: {
      label: "Curriculum Journey",
      title: copy.modules.title,
      sub: copy.modules.sub,
      unit: "modules",
      stages: copy.modules.stages.map(([title, description, motif, from, to], i) => ({
        id: pad(i + 1),
        title,
        range: moduleRange(from, to),
        description,
        motif,
        weeks: between(from, to).map((m) => ({
          id: `M${pad(m.n)}`,
          title: m.title,
          topics: m.points,
          build: m.deliverable ? `Deliverable — ${m.deliverable}` : undefined,
        })),
      })),
      art: copy.modules.art,
      lockCard: {
        programId: id,
        badge: "+",
        title: "Internship Program",
        range: "Unlocked at enrollment",
        description: `${internWork[0]} — ${internWork.slice(1).join(", ")} — with mentorship by ${mentors}.`,
      },
      tracksLabel: `Soft-skills program — runs alongside all ${modules.length} modules`,
      tracks: program.softSkills.map((title) => ({title, range: "All modules"})),
    },

    system: {
      label: "System Visualization",
      ...copy.system,
      nodes: copy.system.nodes.map(([label, img]) => ({label, img})),
    },

    workflow: {
      label: "Living Workflow",
      ...copy.workflow,
      steps: copy.workflow.steps.map(([title, note]) => ({title, note})),
    },

    projects: {
      ...copy.projects,
      items: copy.projects.items.map(([name, stack, description], i) => ({
        id: `p${i + 1}`,
        name,
        stack,
        description,
        accent: PALETTES[i % PALETTES.length],
      })),
    },

    careers: {
      label: "Outcomes",
      title: ["Where This", "Can Take You"],
      lead: copy.careers.lead,
      roles: copy.careers.roles.map(([role, level, domain, description, skills]) => ({
        role,
        domain,
        description,
        skills,
        ...band(level),
        location: "India",
        year: 2026,
        source: SALARY_SOURCE,
      })),
    },

    stats: {
      label: "Program Statistics",
      items: [
        {value: months, suffix: "", label: "Months", note: "live, instructor-led"},
        {value: modules.length, suffix: "", label: "Structured Modules", note: copy.stats.modulesNote},
        {value: 25, suffix: "+", label: "Assignments & Case Studies", note: "industry-grade practice"},
        {value: parseInt(program.projects, 10), suffix: "+", label: "Projects", note: "portfolio-ready deliverables"},
        {value: copy.certs.certificates.length, suffix: "", label: "Certifications", note: "issued on completion"},
      ],
    },

    learning: {
      label: "The Experience",
      title: copy.learning.title,
      items: [
        {title: "Live Instructor-Led Classes", note: "100% live, from trainers at top companies", icon: BookOpen},
        {title: "Daily Doubt-Solving", note: "Live sessions every day so nothing stays unclear", icon: MessageCircle},
        {title: "Real Industry Projects", note: copy.learning.projects, icon: Rocket},
        {title: "Case Studies & Assignments", note: "25+ assignments and industry case studies", icon: FileText},
        ...copy.learning.items.map(([title, note, icon]) => ({title, note, icon})),
        {title: "Portfolio, Resume & LinkedIn", note: "Dedicated profile building for the hiring bar", icon: FolderKanban},
        {title: "Lifetime Placement Assistance", note: "Hiring preparation and support that never expires", icon: Briefcase},
      ],
    },

    certs: {
      label: "Proof of Work",
      title: ["Build Proof.", "Not Just Knowledge."],
      lede: "Three credentials, issued on completion. Pick one, put your name on it, and take it with you.",
      ...copy.certs,
      certificates: copy.certs.certificates.map(([mark, title, focus, stage, outcome, skills]) => ({
        mark,
        title,
        focus,
        stage: stage === "program" ? moduleRange(first, last) : stage,
        outcome,
        skills,
      })),
      proofPillars: copy.certs.proofPillars.map(([title, note, icon]) => ({title, note, icon})),
    },

    cta: {
      label: "Admissions Open",
      title: [copy.cta.word, "Journey", {em: "Starts Here."}],
      sub: copy.cta.sub,
      meta: [`Next batch · ${program.nextBatch}`, program.seats, "No-cost EMI available"],
    },

    footer: {
      title: ["Let’s Build", {em: copy.footer}],
      channels: contactChannels,
    },
  };
}
