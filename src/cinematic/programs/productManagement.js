import {
  BarChart3,
  BookOpen,
  Briefcase,
  Compass,
  FileText,
  FolderKanban,
  GraduationCap,
  Map as MapIcon,
  MessageCircle,
  PenTool,
  Rocket,
  Search,
  Trophy,
} from "lucide-react";
import {getProgram} from "../../data/programCatalog";
import {getSalaryMarket} from "../../data/salaryMarket";
import {contactChannels} from "../data";

/* The cinematic page for the PG Program in Product Management. Facts come
   from the catalogue (modules, deliverables, internship, soft skills, fees,
   batch) and the salary bands from salaryMarket, so this page and the
   standard program page can never disagree. Only the page's editorial copy —
   headings, the credo, the hero line — is written here. */

const program = getProgram("product-management");
const modules = program.modules;
const market = getSalaryMarket("product-management");

const pad = (n) => String(n).padStart(2, "0");
const art = (name) => `/images/curriculum/${name}.webp`;
const moduleRange = (from, to) => (from === to ? `Module ${pad(from)}` : `Modules ${pad(from)}–${pad(to)}`);

// Modules n..m as stage "weeks" for the curriculum dialog.
const modulesAsWeeks = (from, to) =>
  modules.slice(from - 1, to).map((m) => ({
    id: `M${pad(m.n)}`,
    title: m.title,
    topics: m.points,
    build: m.deliverable ? `Deliverable — ${m.deliverable}` : undefined,
  }));

// Salary band for a seniority tier, as printed on the role panel.
const band = (level) => {
  const b = market.bands.find((x) => x.level === level);
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

export const productManagementContent = {
  id: program.id,
  programTitle: program.title,

  hero: {
    eyebrow: "CAREERVEDA · PROFESSIONAL PROGRAM",
    title: ["Product", "Management"],
    ariaLabel: program.title,
    sub: "Discover it. Define it. Build it. Launch it. Grow it — from customer problem to shipped product.",
    badges: ["6 MONTHS", "13 MODULES", "LIVE ONLINE", "AI-POWERED PM", "CAPSTONE PROJECT", "LIFETIME PLACEMENT SUPPORT"],
    stats: [
      [program.duration, "Duration"],
      [program.mentorship, "Mentorship"],
      [program.format, "Format"],
      [program.learners, "Learners"],
    ],
    metaLeft: "6-MONTH PROFESSIONAL PROGRAM",
    metaRight: `Next batch · ${program.nextBatch}`,
    image: program.image,
  },

  // Thirteen modules told as six chapters, each pictured by its first module.
  timeline: {
    label: "A Journey from Idea to Impact",
    title: ["The Making", "of a Product Leader"],
    items: [
      [1, 2, "Product Foundations", "Product thinking, digital platforms and the customer-obsessed mindset every PM starts from."],
      [3, 4, "Market & User Discovery", "Size the market, benchmark competitors and validate real problems with real users."],
      [5, 6, "Strategy & Roadmaps", "Vision, OKRs and prioritisation turned into a PRD and a roadmap a team can build from."],
      [7, 8, "Design & Agile Delivery", "Wireframes, prototypes and design systems, shipped through Scrum sprints and releases."],
      [9, 10, "Analytics & AI", "Product metrics, SQL, A/B tests and funnels — then AI-powered features, built responsibly."],
      [11, 13, "Growth, Leadership & Capstone", "Pricing and go-to-market, leading without authority, and a full product built end to end."],
    ].map(([from, to, title, description], i) => ({
      num: pad(i + 1),
      year: moduleRange(from, to),
      title,
      description,
      tags: [modules[to - 1].deliverable],
      image: modules[from - 1].image,
    })),
  },

  skills: {
    label: "The Toolkit",
    title: ["What You", "Will Master"],
    sub: "From customer insight to market launch — five domains, one product discipline.",
    tag: "Thinker · Builder · Leader",
    items: [
      {
        id: "01",
        title: "Discovery & Research",
        stack: ["JTBD", "Personas", "User Interviews", "Surveys", "Usability Tests", "Journey Maps", "Market Sizing"],
        icon: Search,
        palette: "ember",
        intro: "Find the problem worth solving — and prove it with customers before a line is built.",
      },
      {
        id: "02",
        title: "Strategy & Roadmapping",
        stack: ["Vision", "OKRs", "RICE", "MoSCoW", "Business Models", "Monetization", "Roadmaps"],
        icon: Compass,
        palette: "gold",
        intro: "Turn insight into a strategy, a bet list and a roadmap leadership will sign.",
      },
      {
        id: "03",
        title: "Specs, UX & Delivery",
        stack: ["PRDs", "User Stories", "Wireframes", "Prototypes", "Scrum", "Sprints", "Jira"],
        icon: PenTool,
        palette: "bronze",
        intro: "Write the spec, shape the experience and ship it through agile delivery.",
      },
      {
        id: "04",
        title: "Product Analytics",
        stack: ["DAU / MAU", "LTV", "SQL", "A/B Testing", "Cohorts", "Funnels", "Tableau / Looker"],
        icon: BarChart3,
        palette: "tangerine",
        intro: "Measure what matters and make the call with data, not opinion.",
      },
      {
        id: "05",
        title: "AI, Growth & Leadership",
        stack: ["GenAI for PMs", "Prompting", "Pricing", "Go-to-Market", "Growth Loops", "Stakeholders", "Negotiation"],
        icon: Rocket,
        palette: "brass",
        intro: "Build AI-powered features, take them to market and lead the team that grows them.",
      },
    ],
  },

  quote: {
    lines: ["GREAT PRODUCTS", "START WITH PROBLEMS.", "GREAT MANAGERS", "SHIP THE ANSWERS."],
    cite: "— the product manager’s credo",
  },

  architecture: {
    label: "Curriculum",
    title: ["The Product", "Management Stack"],
    sub: "Nine layers, built in order — each one a foundation for the next.",
    layers: [
      ["Product Foundations", "Product thinking → digital platforms → PM career paths → frameworks"],
      ["Customer Obsession", "Customer needs → JTBD → personas → value proposition"],
      ["Market & Discovery", "Market sizing → competitor benchmarking → interviews → problem validation"],
      ["Strategy", "Vision → OKRs → business model → prioritisation (RICE, MoSCoW)"],
      ["Requirements & Roadmaps", "PRDs → user stories → backlog → roadmap"],
      ["UX & Agile Delivery", "Wireframes → prototypes → Scrum → release management"],
      ["Analytics & AI", "Product metrics → SQL → A/B tests → AI-powered features"],
      ["Growth & Leadership", "Pricing → go-to-market → growth channels → stakeholder influence"],
      ["Capstone", "Real product challenge → build → iterate → portfolio showcase"],
    ].map(([title, note], i) => ({layer: pad(i + 1), title, note})),
  },

  modules: {
    label: "Curriculum Journey",
    title: ["Five Stages.", {em: "Thirteen Modules."}],
    sub: "One roadmap from product thinking to product leadership — open a stage to see every module, topic and deliverable.",
    unit: "modules",
    stages: [
      ["01", "Discover", moduleRange(1, 4), "Product foundations, customer obsession, market research and user discovery.", "Discover", 1, 4],
      ["02", "Define", moduleRange(5, 6), "Turn discovery into a product strategy, a PRD and a roadmap.", "Define", 5, 6],
      ["03", "Design & Deliver", moduleRange(7, 8), "Shape the experience, then ship it through agile sprints.", "Deliver", 7, 8],
      ["04", "Measure & Grow", moduleRange(9, 11), "Analytics, AI-powered features and a go-to-market plan that grows.", "Grow", 9, 11],
      ["05", "Lead & Launch", moduleRange(12, 13), "Lead the team, then build a complete product in the capstone.", "Lead", 12, 13],
    ].map(([id, title, range, description, motif, from, to]) => ({
      id,
      title,
      range,
      description,
      motif,
      weeks: modulesAsWeeks(from, to),
    })),
    art: {"01": "discover", "02": "define", "03": "design", "04": "data", "05": "lead"},
    lockCard: {
      programId: program.id,
      badge: "+",
      title: "Internship Program",
      range: "Unlocked at enrollment",
      description: `Real-world product work — ${program.internship.slice(1, 5).join(", ").toLowerCase()} — with mentorship by senior PMs.`,
    },
    tracksLabel: "Soft-skills program — runs alongside all 13 modules",
    tracks: program.softSkills.map((title) => ({title, range: "All modules"})),
  },

  system: {
    label: "System Visualization",
    title: ["The Product", "System"],
    sub: "Everything a product manager connects — customers, data, teams and the market — around one product.",
    center: {title: "PRODUCT", sub: "discover · build · grow", art: art("product")},
    nodes: [
      ["CUSTOMERS", "people"],
      ["RESEARCH", "discover"],
      ["STRATEGY", "compass"],
      ["ROADMAP", "map"],
      ["DESIGN", "design"],
      ["ENGINEERING", "gear"],
      ["DATA", "data"],
      ["AI", "genai"],
      ["GO-TO-MARKET", "megaphone"],
      ["REVENUE", "moneybag"],
    ].map(([label, icon]) => ({label, img: art(icon)})),
  },

  workflow: {
    label: "Living Workflow",
    title: ["From Problem", "to Product"],
    lead: "Ten steps, one product loop — the order you learn to take an idea from customer problem to a launched, growing product.",
    pipeline: ["problem", "insight", "opportunity", "strategy", "spec", "design", "build", "launch", "measure", "grow"],
    steps: [
      {title: "Discover", note: "Customer needs, JTBD & personas"},
      {title: "Research", note: "Market sizing & competitor benchmarking"},
      {title: "Validate", note: "Interviews, journeys & problem validation"},
      {title: "Envision", note: "Vision, mission & OKRs"},
      {title: "Prioritise", note: "RICE, MoSCoW & strategic roadmaps"},
      {title: "Specify", note: "PRDs, user stories & acceptance criteria"},
      {title: "Design", note: "Wireframes, prototypes & usability tests"},
      {title: "Deliver", note: "Scrum sprints & release management"},
      {title: "Measure", note: "Metrics, A/B tests & funnels"},
      {title: "Grow", note: "Pricing, go-to-market & growth loops"},
    ],
  },

  // Eight portfolio builds — the module deliverables a learner walks out with.
  projects: {
    items: [
      ["Customer Insight Canvas", ["JTBD", "Personas", "Value Prop"], "Map a real customer's jobs, pains and gains into a sharp value proposition.", "ember"],
      ["Market Research Report", ["Market Sizing", "SWOT", "Benchmarking"], "Size the opportunity and position the product against real competitors.", "gold"],
      ["Product Strategy Deck", ["Vision", "OKRs", "RICE"], "A vision, goals and a prioritised bet list a leadership team can approve.", "bronze"],
      ["PRD & Roadmap", ["PRD", "User Stories", "Roadmap"], "The spec and the roadmap an engineering team can actually build from.", "tangerine"],
      ["Wireframes & Prototype", ["Wireframes", "Prototype", "Usability"], "A clickable prototype, tested with users before anything is built.", "brass"],
      ["Analytics Dashboard", ["Metrics", "SQL", "A/B Tests"], "Track adoption, retention and experiments in one decision-ready view.", "ember"],
      ["AI Product Use Case", ["GenAI", "Prompting", "Responsible AI"], "Design an AI-powered feature — the use case, the prompts and the guardrails.", "gold"],
      ["Go-to-Market Plan", ["Pricing", "Channels", "Growth"], "Pricing, packaging and the launch plan that takes the product to market.", "tangerine"],
    ].map(([name, stack, description, accent], i) => ({id: `p${i + 1}`, name, stack, description, accent})),
    categories: [
      "Customer Discovery",
      "Market Intelligence",
      "Strategy",
      "Requirements",
      "Product Design",
      "Product Analytics",
      "AI Product",
      "Growth",
    ],
    sideLeft: ["Insight", "Strategy", "Design", "Real Impact"],
    sideRight: ["Discovery", "Delivery", "Growth"],
    footLeft: "Real deliverables · real portfolio",
    footRight: "Build the product, not just the plan",
  },

  careers: {
    label: "Outcomes",
    title: ["Where This", "Can Take You"],
    lead: "The product roles this track opens — one role at a time.",
    roles: [
      role("Associate Product Manager", "Fresher", "Discovery · Specs · Delivery", "Own small features end to end alongside a senior PM.", ["User Research", "PRDs", "Wireframes", "Jira", "Analytics"]),
      role("Product Analyst", "Fresher", "Metrics · Experiments · Insight", "Measure adoption and size the next opportunity with data.", ["SQL", "A/B Testing", "Funnels", "Dashboards", "Excel"]),
      role("Product Executive", "Fresher", "Research · Operations · Launches", "Run research, coordinate launches and keep the product moving.", ["Market Research", "Documentation", "Agile", "Stakeholders", "Reporting"]),
      role("Junior Product Manager", "Fresher", "Backlog · Sprints · Releases", "Groom the backlog and ship sprint by sprint with engineering.", ["Scrum", "User Stories", "Prioritisation", "Release Mgmt", "QA"]),
      role("Product Manager", "Mid-level", "Strategy · Roadmap · Outcomes", "Own a product area — from strategy and roadmap to measured outcomes.", ["Strategy", "Roadmapping", "OKRs", "Analytics", "Leadership"]),
      role("Product Owner", "Mid-level", "Backlog · Scrum · Value", "Translate business goals into a prioritised backlog for agile squads.", ["Scrum", "Backlog", "Acceptance Criteria", "Jira", "Stakeholders"]),
      role("Growth Product Manager", "Mid-level", "Acquisition · Retention · Experiments", "Run the experiments that move acquisition, activation and retention.", ["Growth Loops", "A/B Testing", "Funnels", "Pricing", "SQL"]),
      role("Technical Product Manager", "Mid-level", "Platforms · APIs · Systems", "Define platform and API capabilities alongside engineering leads.", ["APIs", "System Design", "SQL", "Specs", "AI Features"]),
      role("Senior Product Manager", "Experienced", "Portfolio · Vision · Leadership", "Set product vision across a portfolio and lead the managers who ship it.", ["Vision", "Portfolio", "Leadership", "GTM", "Negotiation"]),
      role("Group Product Manager", "Experienced", "Teams · Strategy · Scale", "Lead a pod of product managers across a whole product line.", ["Team Leadership", "Strategy", "OKRs", "Hiring", "Executive Comms"]),
    ],
  },

  stats: {
    label: "Program Statistics",
    items: [
      {value: 6, suffix: "", label: "Months", note: "live, instructor-led"},
      {value: modules.length, suffix: "", label: "Structured Modules", note: "discovery to capstone"},
      {value: 25, suffix: "+", label: "Assignments & Case Studies", note: "industry-grade practice"},
      {value: parseInt(program.projects, 10), suffix: "+", label: "Projects", note: "portfolio-ready deliverables"},
      {value: 3, suffix: "", label: "Certifications", note: "issued on completion"},
    ],
  },

  learning: {
    label: "The Experience",
    title: ["Learn.", "Build. Launch."],
    items: [
      {title: "Live Instructor-Led Classes", note: "100% live, from trainers at top technology companies", icon: BookOpen},
      {title: "Daily Doubt-Solving", note: "Live sessions every day so nothing stays unclear", icon: MessageCircle},
      {title: "Real Industry Projects", note: "Every module ships a real product deliverable", icon: Rocket},
      {title: "Case Studies & Assignments", note: "25+ assignments and industry case studies", icon: FileText},
      {title: "Tech & Analytics for PM", note: "Dedicated tracks so you speak engineering and data", icon: BarChart3},
      {title: "PM Interview Mastery", note: "Product cases, metrics and mock interview labs", icon: Trophy},
      {title: "Portfolio, Resume & LinkedIn", note: "Dedicated profile building for the hiring bar", icon: FolderKanban},
      {title: "Lifetime Placement Assistance", note: "Hiring preparation and support that never expires", icon: Briefcase},
    ],
  },

  certs: {
    label: "Proof of Work",
    title: ["Build Proof.", "Not Just Knowledge."],
    lede: "Three credentials, issued on completion. Pick one, put your name on it, and take it with you.",
    certificates: [
      {
        mark: "PG-PM-01",
        title: "PG Program in Product Management",
        focus: "Strategy · Discovery · Delivery",
        stage: moduleRange(1, 13),
        outcome: "Take a product from customer problem to launch — research, strategy, PRD, prototype, analytics and go-to-market.",
        skills: ["Strategy", "Discovery", "PRDs", "Analytics"],
      },
      {
        mark: "PG-PMI-02",
        title: "Product Management Internship",
        focus: "Roadmaps · PRDs · Launches",
        stage: "Internship program",
        outcome: "Real-world product work — roadmap development, PRD writing, feature launches and A/B testing under senior PMs.",
        skills: ["Roadmaps", "PRDs", "A/B Testing", "Metrics"],
      },
      {
        mark: "PG-PML-03",
        title: "Product Leadership & Communication",
        focus: "Influence · Storytelling · Leadership",
        stage: "Soft-skills program",
        outcome: "Lead without authority — stakeholder communication, executive storytelling and decisions under uncertainty.",
        skills: ["Communication", "Influence", "Storytelling", "Leadership"],
      },
    ],
    proofPillars: [
      {title: "Credential", note: "Program, internship and leadership certificates, issued on completion.", icon: GraduationCap},
      {title: "Deliverables", note: "A PRD, a prototype, a dashboard and a GTM plan — real work, not quizzes.", icon: FolderKanban},
      {title: "Portfolio", note: "Everything in one product portfolio a hiring manager can open.", icon: MapIcon},
    ],
    note: "A portfolio your future team can read — strategies, specs and launches you can point to.",
  },

  cta: {
    label: "Admissions Open",
    title: ["Your Product", "Journey", {em: "Starts Here."}],
    sub: "From customer problem to product leadership.",
    meta: [`Next batch · ${program.nextBatch}`, program.seats, "No-cost EMI available"],
  },

  footer: {
    title: ["Let’s Build", {em: "Great Products."}],
    channels: contactChannels,
  },
};
