import {Fragment, createContext, useContext} from "react";
import {
  agentCenterArt,
  agentSatellites,
  architectureLayers,
  careerRoles,
  certificates,
  contactChannels,
  continuousTracks,
  credentialNarrative,
  credentialRoadmap,
  curriculumJourney,
  learningPillars,
  projectsData,
  proofPillars,
  skillCategories,
  statistics,
  timelineData,
  workflowSteps,
} from "./data";

/* Everything a cinematic program page says, in one object. The components read
   it through useCinematic(), so the same sections render the Gen AI page (this
   default) or any program that supplies its own object of the same shape —
   see programs/*.js and CinematicProgramPage.jsx.

   Headings are arrays of lines; a line written as {em: "…"} renders in the
   page's italic accent. */
export const genAiContent = {
  id: "gen-ai-agentic-ai",
  programTitle: "PG Program in Generative AI & Agentic AI",

  hero: {
    eyebrow: "CAREERVEDA · PROFESSIONAL PROGRAM",
    title: ["Gen AI &", "Agentic AI Engineering"],
    ariaLabel: "PG Program in Gen AI and Agentic AI Engineering",
    sub: "Build AI. Break AI. Measure AI. Secure AI. Deploy AI — from Python to production agents.",
    badges: ["24 WEEKS", "6 MONTHS", "PROJECT-DRIVEN", "GPU-ENABLED", "PRODUCTION-ORIENTED", "HACKATHON-FIRST"],
    stats: [
      ["24 Weeks", "Duration"],
      ["Expert AI Mentors", "Mentorship"],
      ["Live Online", "Format"],
      ["10,000+", "Learners"],
    ],
    metaLeft: "6-MONTH PROFESSIONAL PROGRAM",
    metaRight: "Batch 2026 · Applications open",
    image: "/images/genai-engineering-studio.webp",
  },

  timeline: {
    label: "A Journey from Models to Agents",
    title: ["The Evolution", "of Intelligence"],
    items: timelineData,
  },

  skills: {
    label: "The Laboratory",
    title: ["What You", "Will Master"],
    sub: "From prompts to autonomous systems — five domains, one engineering discipline.",
    tag: "Practitioner · Builder · Operator",
    items: skillCategories,
  },

  quote: {
    lines: ["GOOD IDEAS", "BECOME SYSTEMS.", "GOOD SYSTEMS", "BECOME IMPACT."],
    cite: "— the operator’s credo",
  },

  architecture: {
    label: "Curriculum",
    title: ["The AI", "Engineering Stack"],
    sub: "Eight layers, built in order — each one a foundation for the next.",
    layers: architectureLayers,
  },

  modules: {
    label: "Curriculum Journey",
    title: ["Five Stages.", {em: "Twenty-Four Weeks."}],
    sub: "One roadmap from Python to production agents — open a stage to see every week, topic and build.",
    stages: curriculumJourney,
    // Stage art (Fluent Emoji 3D) by stage id, from public/images/curriculum/.
    art: {"01": "foundations", "02": "data", "03": "genai", "04": "agents", "05": "production"},
    unit: "weeks",
    lockCard: {
      programId: "gen-ai-agentic-ai",
      badge: "+6",
      title: "Agentic AI Application Labs",
      range: "Unlocked at enrollment",
      description:
        "Six bonus weeks of hands-on agentic builds — MCP tooling, multi-agent orchestration and a production capstone.",
    },
    tracksLabel: "Continuous tracks — run through all 24 weeks",
    tracks: continuousTracks,
  },

  system: {
    label: "System Visualization",
    title: ["The Agentic", "System"],
    sub: "AI that can reason, use tools, remember context and execute multi-step tasks.",
    center: {title: "AI AGENT", sub: "reason · act · observe", art: agentCenterArt},
    nodes: agentSatellites,
  },

  workflow: {
    label: "Living Workflow",
    title: ["From Input", "to Response"],
    lead:
      "Ten stages, one engineering loop — the order you learn to take an AI idea from first line of code to proven, deployed system.",
    pipeline: ["input", "understand", "plan", "reason", "tool", "execute", "observe", "memory", "respond"],
    steps: workflowSteps,
  },

  projects: {
    items: projectsData,
    categories: [
      "Enterprise AI",
      "Business Intelligence",
      "Enterprise AI",
      "Research Platform",
      "Agent Protocols",
      "Data Intelligence",
      "Evaluation",
      "Security",
    ],
    sideLeft: ["Ideas", "Interfaces", "Experiences", "Real Impact"],
    sideRight: ["Foundation", "Orchestration", "Safety"],
    footLeft: "Real projects · real stories",
    footRight: "Designing a brighter tomorrow",
  },

  careers: {
    label: "Outcomes",
    title: ["Where This", "Can Take You"],
    lead: "The career paths this track opens — one role at a time.",
    roles: careerRoles,
  },

  stats: {label: "Program Statistics", items: statistics},

  learning: {
    label: "The Experience",
    title: ["Learn.", "Create. Achieve."],
    items: learningPillars,
  },

  certs: {
    label: "Proof of Work",
    title: ["Build Proof.", "Not Just Knowledge."],
    lede: "Three postgraduate credentials, issued on completion. Pick one, put your name on it, and take it with you.",
    certificates,
    proofPillars,
    roadmap: {
      title: "10+ industry credentials, mapped to your 24 weeks",
      sub:
        "Learning from providers your next employer already recognises — earned in the module that uses them, not collected in a separate tab.",
      rows: credentialRoadmap,
      narrative: credentialNarrative,
      caveat:
        "Provider catalogues, badge requirements and promotional free-assessment offers change without notice, so the live list is maintained on the course portal rather than printed as a permanent promise. What is fixed is the target: ten or more industry credentials, one project per module, and a repository that shows the work.",
    },
    note: "A credential your future team can read — programs, projects and systems you can point to.",
  },

  cta: {
    label: "Admissions Open",
    title: ["Your AI", "Journey", {em: "Starts Here."}],
    sub: "From understanding models to engineering intelligent systems.",
    meta: ["Batch starts soon", "Seats limited", "Scholarship review included"],
  },

  footer: {
    title: ["Let’s Build", {em: "With AI."}],
    channels: contactChannels,
  },
};

export const CinematicContext = createContext(genAiContent);

export const useCinematic = () => useContext(CinematicContext);

/* A heading written as lines, with <br /> between them — the same DOM the
   headings had when they were typed inline. */
export const Lines = ({lines}) =>
  lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {typeof line === "string" ? line : <em>{line.em}</em>}
    </Fragment>
  ));
