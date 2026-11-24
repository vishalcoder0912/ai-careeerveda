import {socialLinks} from "../../config/externalLinks.js";
import {ORGANISATION} from "../../config/siteMeta.js";

/* Serializable copy for the Product Management cinematic page.
   Every value here can be overridden from Admin → Programs → Cinematic page.
   Icons and artwork are stored as tokens, never React components, so the object
   is safe to keep in Mongo and to edit as JSON in the panel. Live facts (batch,
   seats, modules, salary bands, images) stay on the programme record and are
   re-applied by productManagement.js after an override is merged. */

const socialHref = (id) => socialLinks.find((link) => link.id === id)?.href || "";

const channels = [
  {
    label: "Email",
    value: ORGANISATION.email,
    href: `mailto:${ORGANISATION.email}`,
    icon: "Mail",
  },
  {
    label: "Call",
    value: "+91 92178 01191",
    href: `tel:+${ORGANISATION.telephone.replace(/\D/g, "")}`,
    icon: "Phone",
  },
];

if (socialHref("linkedin")) {
  channels.push({label: "LinkedIn", value: "CareerVeda", href: socialHref("linkedin"), icon: "Briefcase", external: true});
}
if (socialHref("instagram")) {
  channels.push({label: "Instagram", value: "@_careerveda_", href: socialHref("instagram"), icon: "Camera", external: true});
}
if (socialHref("facebook")) {
  channels.push({label: "Facebook", value: "CareerVeda", href: socialHref("facebook"), icon: "Users", external: true});
}

export const PRODUCT_MANAGEMENT_COPY = {
  hero: {
    eyebrow: "CAREERVEDA · PROFESSIONAL PROGRAM",
    title: ["Product", "Management"],
    sub: "Discover it. Define it. Build it. Launch it. Grow it — from customer problem to shipped product.",
    badges: ["6 MONTHS", "13 MODULES", "LIVE ONLINE", "AI-POWERED PM", "CAPSTONE PROJECT", "PLACEMENT SUPPORT"],
    metaLeft: "6-MONTH PROFESSIONAL PROGRAM",
  },

  timeline: {
    label: "A Journey from Idea to Impact",
    title: ["The Making", "of a Product Leader"],
    items: [
      {from: 1, to: 2, title: "Product Foundations", description: "Product thinking, digital platforms and the customer-obsessed mindset every PM starts from."},
      {from: 3, to: 4, title: "Market & User Discovery", description: "Size the market, benchmark competitors and validate real problems with real users."},
      {from: 5, to: 6, title: "Strategy & Roadmaps", description: "Vision, OKRs and prioritisation turned into a PRD and a roadmap a team can build from."},
      {from: 7, to: 8, title: "Design & Agile Delivery", description: "Wireframes, prototypes and design systems, shipped through Scrum sprints and releases."},
      {from: 9, to: 10, title: "Analytics & AI", description: "Product metrics, SQL, A/B tests and funnels — then AI-powered features, built responsibly."},
      {from: 11, to: 13, title: "Growth, Leadership & Capstone", description: "Pricing and go-to-market, leading without authority, and a full product built end to end."},
    ],
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
        icon: "Search",
        palette: "ember",
        intro: "Find the problem worth solving — and prove it with customers before a line is built.",
      },
      {
        id: "02",
        title: "Strategy & Roadmapping",
        stack: ["Vision", "OKRs", "RICE", "MoSCoW", "Business Models", "Monetization", "Roadmaps"],
        icon: "Compass",
        palette: "gold",
        intro: "Turn insight into a strategy, a bet list and a roadmap leadership will sign.",
      },
      {
        id: "03",
        title: "Specs, UX & Delivery",
        stack: ["PRDs", "User Stories", "Wireframes", "Prototypes", "Scrum", "Sprints", "Jira"],
        icon: "PenTool",
        palette: "bronze",
        intro: "Write the spec, shape the experience and ship it through agile delivery.",
      },
      {
        id: "04",
        title: "Product Analytics",
        stack: ["DAU / MAU", "LTV", "SQL", "A/B Testing", "Cohorts", "Funnels", "Tableau / Looker"],
        icon: "BarChart3",
        palette: "tangerine",
        intro: "Measure what matters and make the call with data, not opinion.",
      },
      {
        id: "05",
        title: "AI, Growth & Leadership",
        stack: ["GenAI for PMs", "Prompting", "Pricing", "Go-to-Market", "Growth Loops", "Stakeholders", "Negotiation"],
        icon: "Rocket",
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
      {title: "Product Foundations", note: "Product thinking → digital platforms → PM career paths → frameworks"},
      {title: "Customer Obsession", note: "Customer needs → JTBD → personas → value proposition"},
      {title: "Market & Discovery", note: "Market sizing → competitor benchmarking → interviews → problem validation"},
      {title: "Strategy", note: "Vision → OKRs → business model → prioritisation (RICE, MoSCoW)"},
      {title: "Requirements & Roadmaps", note: "PRDs → user stories → backlog → roadmap"},
      {title: "UX & Agile Delivery", note: "Wireframes → prototypes → Scrum → release management"},
      {title: "Analytics & AI", note: "Product metrics → SQL → A/B tests → AI-powered features"},
      {title: "Growth & Leadership", note: "Pricing → go-to-market → growth channels → stakeholder influence"},
      {title: "Capstone", note: "Real product challenge → build → iterate → portfolio showcase"},
    ],
  },

  modules: {
    label: "Curriculum Journey",
    title: ["Five Stages.", {em: "Thirteen Modules."}],
    sub: "One roadmap from product thinking to product leadership — open a stage to see every module, topic and deliverable.",
    unit: "modules",
    stages: [
      {id: "01", title: "Discover", range: "Modules 01–04", description: "Product foundations, customer obsession, market research and user discovery.", motif: "Discover", from: 1, to: 4},
      {id: "02", title: "Define", range: "Modules 05–06", description: "Turn discovery into a product strategy, a PRD and a roadmap.", motif: "Define", from: 5, to: 6},
      {id: "03", title: "Design & Deliver", range: "Modules 07–08", description: "Shape the experience, then ship it through agile sprints.", motif: "Deliver", from: 7, to: 8},
      {id: "04", title: "Measure & Grow", range: "Modules 09–11", description: "Analytics, AI-powered features and a go-to-market plan that grows.", motif: "Grow", from: 9, to: 11},
      {id: "05", title: "Lead & Launch", range: "Modules 12–13", description: "Lead the team, then build a complete product in the capstone.", motif: "Lead", from: 12, to: 13},
    ],
    art: {"01": "discover", "02": "define", "03": "design", "04": "data", "05": "lead"},
    lockCard: {
      badge: "+",
      title: "Internship Program",
      range: "Unlocked at enrollment",
    },
    tracksLabel: "Soft-skills program — runs alongside all 13 modules",
    tracks: [],
  },

  system: {
    label: "System Visualization",
    title: ["The Product", "System"],
    sub: "Everything a product manager connects — customers, data, teams and the market — around one product.",
    center: {title: "PRODUCT", sub: "discover · build · grow", art: "product"},
    nodes: [
      {label: "CUSTOMERS", icon: "people"},
      {label: "RESEARCH", icon: "discover"},
      {label: "STRATEGY", icon: "compass"},
      {label: "ROADMAP", icon: "map"},
      {label: "DESIGN", icon: "design"},
      {label: "ENGINEERING", icon: "gear"},
      {label: "DATA", icon: "data"},
      {label: "AI", icon: "genai"},
      {label: "GO-TO-MARKET", icon: "megaphone"},
      {label: "REVENUE", icon: "moneybag"},
    ],
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

  projects: {
    items: [
      {name: "Customer Insight Canvas", stack: ["JTBD", "Personas", "Value Prop"], description: "Map a real customer's jobs, pains and gains into a sharp value proposition.", accent: "ember"},
      {name: "Market Research Report", stack: ["Market Sizing", "SWOT", "Benchmarking"], description: "Size the opportunity and position the product against real competitors.", accent: "gold"},
      {name: "Product Strategy Deck", stack: ["Vision", "OKRs", "RICE"], description: "A vision, goals and a prioritised bet list a leadership team can approve.", accent: "bronze"},
      {name: "PRD & Roadmap", stack: ["PRD", "User Stories", "Roadmap"], description: "The spec and the roadmap an engineering team can actually build from.", accent: "tangerine"},
      {name: "Wireframes & Prototype", stack: ["Wireframes", "Prototype", "Usability"], description: "A clickable prototype, tested with users before anything is built.", accent: "brass"},
      {name: "Analytics Dashboard", stack: ["Metrics", "SQL", "A/B Tests"], description: "Track adoption, retention and experiments in one decision-ready view.", accent: "ember"},
      {name: "AI Product Use Case", stack: ["GenAI", "Prompting", "Responsible AI"], description: "Design an AI-powered feature — the use case, the prompts and the guardrails.", accent: "gold"},
      {name: "Go-to-Market Plan", stack: ["Pricing", "Channels", "Growth"], description: "Pricing, packaging and the launch plan that takes the product to market.", accent: "tangerine"},
    ],
    categories: ["Customer Discovery", "Market Intelligence", "Strategy", "Requirements", "Product Design", "Product Analytics", "AI Product", "Growth"],
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
      {role: "Associate Product Manager", level: "Fresher", domain: "Discovery · Specs · Delivery", description: "Own small features end to end alongside a senior PM.", skills: ["User Research", "PRDs", "Wireframes", "Jira", "Analytics"]},
      {role: "Product Analyst", level: "Fresher", domain: "Metrics · Experiments · Insight", description: "Measure adoption and size the next opportunity with data.", skills: ["SQL", "A/B Testing", "Funnels", "Dashboards", "Excel"]},
      {role: "Product Executive", level: "Fresher", domain: "Research · Operations · Launches", description: "Run research, coordinate launches and keep the product moving.", skills: ["Market Research", "Documentation", "Agile", "Stakeholders", "Reporting"]},
      {role: "Junior Product Manager", level: "Fresher", domain: "Backlog · Sprints · Releases", description: "Groom the backlog and ship sprint by sprint with engineering.", skills: ["Scrum", "User Stories", "Prioritisation", "Release Mgmt", "QA"]},
      {role: "Product Manager", level: "Mid-level", domain: "Strategy · Roadmap · Outcomes", description: "Own a product area — from strategy and roadmap to measured outcomes.", skills: ["Strategy", "Roadmapping", "OKRs", "Analytics", "Leadership"]},
      {role: "Product Owner", level: "Mid-level", domain: "Backlog · Scrum · Value", description: "Translate business goals into a prioritised backlog for agile squads.", skills: ["Scrum", "Backlog", "Acceptance Criteria", "Jira", "Stakeholders"]},
      {role: "Growth Product Manager", level: "Mid-level", domain: "Acquisition · Retention · Experiments", description: "Run the experiments that move acquisition, activation and retention.", skills: ["Growth Loops", "A/B Testing", "Funnels", "Pricing", "SQL"]},
      {role: "Technical Product Manager", level: "Mid-level", domain: "Platforms · APIs · Systems", description: "Define platform and API capabilities alongside engineering leads.", skills: ["APIs", "System Design", "SQL", "Specs", "AI Features"]},
      {role: "Senior Product Manager", level: "Experienced", domain: "Portfolio · Vision · Leadership", description: "Set product vision across a portfolio and lead the managers who ship it.", skills: ["Vision", "Portfolio", "Leadership", "GTM", "Negotiation"]},
      {role: "Group Product Manager", level: "Experienced", domain: "Teams · Strategy · Scale", description: "Lead a pod of product managers across a whole product line.", skills: ["Team Leadership", "Strategy", "OKRs", "Hiring", "Executive Comms"]},
    ],
  },

  stats: {
    label: "Program Statistics",
    items: [
      {key: "months", value: 6, suffix: "", label: "Months", note: "live, instructor-led"},
      {key: "modules", value: 13, suffix: "", label: "Structured Modules", note: "discovery to capstone"},
      {key: "assignments", value: 25, suffix: "+", label: "Assignments & Case Studies", note: "industry-grade practice"},
      {key: "projects", value: 30, suffix: "+", label: "Projects", note: "portfolio-ready deliverables"},
      {key: "certifications", value: 3, suffix: "", label: "Certifications", note: "issued on completion"},
    ],
  },

  learning: {
    label: "The Experience",
    title: ["Learn.", "Build. Launch."],
    items: [
      {title: "Live Instructor-Led Classes", note: "100% live, from trainers at top technology companies", icon: "BookOpen"},
      {title: "Daily Doubt-Solving", note: "Live sessions every day so nothing stays unclear", icon: "MessageCircle"},
      {title: "Real Industry Projects", note: "Every module ships a real product deliverable", icon: "Rocket"},
      {title: "Case Studies & Assignments", note: "25+ assignments and industry case studies", icon: "FileText"},
      {title: "Tech & Analytics for PM", note: "Dedicated tracks so you speak engineering and data", icon: "BarChart3"},
      {title: "PM Interview Mastery", note: "Product cases, metrics and mock interview labs", icon: "Trophy"},
      {title: "Portfolio, Resume & LinkedIn", note: "Dedicated profile building for the hiring bar", icon: "FolderKanban"},
      {title: "Placement Support", note: "Hiring preparation and interview support from the placement team", icon: "Briefcase"},
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
        stage: "Modules 01–13",
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
      {title: "Credential", note: "Program, internship and leadership certificates, issued on completion.", icon: "GraduationCap"},
      {title: "Deliverables", note: "A PRD, a prototype, a dashboard and a GTM plan — real work, not quizzes.", icon: "FolderKanban"},
      {title: "Portfolio", note: "Everything in one product portfolio a hiring manager can open.", icon: "MapIcon"},
    ],
    note: "A portfolio your future team can read — strategies, specs and launches you can point to.",
  },

  cta: {
    label: "Admissions Open",
    title: ["Your Product", "Journey", {em: "Starts Here."}],
    sub: "From customer problem to product leadership.",
    meta: ["", "", "No-cost EMI available"],
  },

  footer: {
    title: ["Let’s Build", {em: "Great Products."}],
    channels,
  },
};
