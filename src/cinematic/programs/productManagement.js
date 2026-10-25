import {BarChart3, Compass, FolderKanban, GraduationCap, Map as MapIcon, PenTool, Rocket, Search, Trophy} from "lucide-react";
import {art, buildProgramContent} from "./build";

// The cinematic page for the PG Program in Product Management.
export const productManagementContent = buildProgramContent("product-management", {
  hero: {
    title: ["Product", "Management"],
    sub: "Discover it. Define it. Build it. Launch it. Grow it — from customer problem to shipped product.",
    badges: ["6 MONTHS", "13 MODULES", "LIVE ONLINE", "AI-POWERED PM", "CAPSTONE PROJECT", "LIFETIME PLACEMENT SUPPORT"],
  },

  timeline: {
    label: "A Journey from Idea to Impact",
    title: ["The Making", "of a Product Leader"],
    chapters: [
      [1, 2, "Product Foundations", "Product thinking, digital platforms and the customer-obsessed mindset every PM starts from."],
      [3, 4, "Market & User Discovery", "Size the market, benchmark competitors and validate real problems with real users."],
      [5, 6, "Strategy & Roadmaps", "Vision, OKRs and prioritisation turned into a PRD and a roadmap a team can build from."],
      [7, 8, "Design & Agile Delivery", "Wireframes, prototypes and design systems, shipped through Scrum sprints and releases."],
      [9, 10, "Analytics & AI", "Product metrics, SQL, A/B tests and funnels — then AI-powered features, built responsibly."],
      [11, 13, "Growth, Leadership & Capstone", "Pricing and go-to-market, leading without authority, and a full product built end to end."],
    ],
  },

  skills: {
    sub: "From customer insight to market launch — five domains, one product discipline.",
    tag: "Thinker · Builder · Leader",
    items: [
      ["Discovery & Research", Search, "Find the problem worth solving — and prove it with customers before a line is built.", ["JTBD", "Personas", "User Interviews", "Surveys", "Usability Tests", "Journey Maps", "Market Sizing"]],
      ["Strategy & Roadmapping", Compass, "Turn insight into a strategy, a bet list and a roadmap leadership will sign.", ["Vision", "OKRs", "RICE", "MoSCoW", "Business Models", "Monetization", "Roadmaps"]],
      ["Specs, UX & Delivery", PenTool, "Write the spec, shape the experience and ship it through agile delivery.", ["PRDs", "User Stories", "Wireframes", "Prototypes", "Scrum", "Sprints", "Jira"]],
      ["Product Analytics", BarChart3, "Measure what matters and make the call with data, not opinion.", ["DAU / MAU", "LTV", "SQL", "A/B Testing", "Cohorts", "Funnels", "Tableau / Looker"]],
      ["AI, Growth & Leadership", Rocket, "Build AI-powered features, take them to market and lead the team that grows them.", ["GenAI for PMs", "Prompting", "Pricing", "Go-to-Market", "Growth Loops", "Stakeholders", "Negotiation"]],
    ],
  },

  quote: {
    lines: ["GREAT PRODUCTS", "START WITH PROBLEMS.", "GREAT MANAGERS", "SHIP THE ANSWERS."],
    cite: "— the product manager’s credo",
  },

  architecture: {
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
    ],
  },

  modules: {
    title: ["Five Stages.", {em: "Thirteen Modules."}],
    sub: "One roadmap from product thinking to product leadership — open a stage to see every module, topic and deliverable.",
    stages: [
      ["Discover", "Product foundations, customer obsession, market research and user discovery.", "Discover", 1, 4],
      ["Define", "Turn discovery into a product strategy, a PRD and a roadmap.", "Define", 5, 6],
      ["Design & Deliver", "Shape the experience, then ship it through agile sprints.", "Deliver", 7, 8],
      ["Measure & Grow", "Analytics, AI-powered features and a go-to-market plan that grows.", "Grow", 9, 11],
      ["Lead & Launch", "Lead the team, then build a complete product in the capstone.", "Lead", 12, 13],
    ],
    art: {"01": "discover", "02": "define", "03": "design", "04": "data", "05": "lead"},
  },

  system: {
    title: ["The Product", "System"],
    sub: "Everything a product manager connects — customers, data, teams and the market — around one product.",
    center: {title: "PRODUCT", sub: "discover · build · grow", art: art("product")},
    nodes: [
      ["CUSTOMERS", art("people")],
      ["RESEARCH", art("discover")],
      ["STRATEGY", art("compass")],
      ["ROADMAP", art("map")],
      ["DESIGN", art("design")],
      ["ENGINEERING", art("gear")],
      ["DATA", art("data")],
      ["AI", art("genai")],
      ["GO-TO-MARKET", art("megaphone")],
      ["REVENUE", art("moneybag")],
    ],
  },

  workflow: {
    title: ["From Problem", "to Product"],
    lead: "Ten steps, one product loop — the order you learn to take an idea from customer problem to a launched, growing product.",
    pipeline: ["problem", "insight", "opportunity", "strategy", "spec", "design", "build", "launch", "measure", "grow"],
    steps: [
      ["Discover", "Customer needs, JTBD & personas"],
      ["Research", "Market sizing & competitor benchmarking"],
      ["Validate", "Interviews, journeys & problem validation"],
      ["Envision", "Vision, mission & OKRs"],
      ["Prioritise", "RICE, MoSCoW & strategic roadmaps"],
      ["Specify", "PRDs, user stories & acceptance criteria"],
      ["Design", "Wireframes, prototypes & usability tests"],
      ["Deliver", "Scrum sprints & release management"],
      ["Measure", "Metrics, A/B tests & funnels"],
      ["Grow", "Pricing, go-to-market & growth loops"],
    ],
  },

  // Eight portfolio builds — the module deliverables a learner walks out with.
  projects: {
    items: [
      ["Customer Insight Canvas", ["JTBD", "Personas", "Value Prop"], "Map a real customer's jobs, pains and gains into a sharp value proposition."],
      ["Market Research Report", ["Market Sizing", "SWOT", "Benchmarking"], "Size the opportunity and position the product against real competitors."],
      ["Product Strategy Deck", ["Vision", "OKRs", "RICE"], "A vision, goals and a prioritised bet list a leadership team can approve."],
      ["PRD & Roadmap", ["PRD", "User Stories", "Roadmap"], "The spec and the roadmap an engineering team can actually build from."],
      ["Wireframes & Prototype", ["Wireframes", "Prototype", "Usability"], "A clickable prototype, tested with users before anything is built."],
      ["Analytics Dashboard", ["Metrics", "SQL", "A/B Tests"], "Track adoption, retention and experiments in one decision-ready view."],
      ["AI Product Use Case", ["GenAI", "Prompting", "Responsible AI"], "Design an AI-powered feature — the use case, the prompts and the guardrails."],
      ["Go-to-Market Plan", ["Pricing", "Channels", "Growth"], "Pricing, packaging and the launch plan that takes the product to market."],
    ],
    categories: ["Customer Discovery", "Market Intelligence", "Strategy", "Requirements", "Product Design", "Product Analytics", "AI Product", "Growth"],
    sideLeft: ["Insight", "Strategy", "Design", "Real Impact"],
    sideRight: ["Discovery", "Delivery", "Growth"],
    footLeft: "Real deliverables · real portfolio",
    footRight: "Build the product, not just the plan",
  },

  careers: {
    lead: "The product roles this track opens — one role at a time.",
    roles: [
      ["Associate Product Manager", "Fresher", "Discovery · Specs · Delivery", "Own small features end to end alongside a senior PM.", ["User Research", "PRDs", "Wireframes", "Jira", "Analytics"]],
      ["Product Analyst", "Fresher", "Metrics · Experiments · Insight", "Measure adoption and size the next opportunity with data.", ["SQL", "A/B Testing", "Funnels", "Dashboards", "Excel"]],
      ["Product Executive", "Fresher", "Research · Operations · Launches", "Run research, coordinate launches and keep the product moving.", ["Market Research", "Documentation", "Agile", "Stakeholders", "Reporting"]],
      ["Junior Product Manager", "Fresher", "Backlog · Sprints · Releases", "Groom the backlog and ship sprint by sprint with engineering.", ["Scrum", "User Stories", "Prioritisation", "Release Mgmt", "QA"]],
      ["Product Manager", "Mid-level", "Strategy · Roadmap · Outcomes", "Own a product area — from strategy and roadmap to measured outcomes.", ["Strategy", "Roadmapping", "OKRs", "Analytics", "Leadership"]],
      ["Product Owner", "Mid-level", "Backlog · Scrum · Value", "Translate business goals into a prioritised backlog for agile squads.", ["Scrum", "Backlog", "Acceptance Criteria", "Jira", "Stakeholders"]],
      ["Growth Product Manager", "Mid-level", "Acquisition · Retention · Experiments", "Run the experiments that move acquisition, activation and retention.", ["Growth Loops", "A/B Testing", "Funnels", "Pricing", "SQL"]],
      ["Technical Product Manager", "Mid-level", "Platforms · APIs · Systems", "Define platform and API capabilities alongside engineering leads.", ["APIs", "System Design", "SQL", "Specs", "AI Features"]],
      ["Senior Product Manager", "Experienced", "Portfolio · Vision · Leadership", "Set product vision across a portfolio and lead the managers who ship it.", ["Vision", "Portfolio", "Leadership", "GTM", "Negotiation"]],
      ["Group Product Manager", "Experienced", "Teams · Strategy · Scale", "Lead a pod of product managers across a whole product line.", ["Team Leadership", "Strategy", "OKRs", "Hiring", "Executive Comms"]],
    ],
  },

  stats: {modulesNote: "discovery to capstone"},

  learning: {
    title: ["Learn.", "Build. Launch."],
    projects: "Every module ships a real product deliverable",
    items: [
      ["Tech & Analytics for PM", "Dedicated tracks so you speak engineering and data", BarChart3],
      ["PM Interview Mastery", "Product cases, metrics and mock interview labs", Trophy],
    ],
  },

  certs: {
    certificates: [
      ["PG-PM-01", "PG Program in Product Management", "Strategy · Discovery · Delivery", "program", "Take a product from customer problem to launch — research, strategy, PRD, prototype, analytics and go-to-market.", ["Strategy", "Discovery", "PRDs", "Analytics"]],
      ["PG-PMI-02", "Product Management Internship", "Roadmaps · PRDs · Launches", "Internship program", "Real-world product work — roadmap development, PRD writing, feature launches and A/B testing under senior PMs.", ["Roadmaps", "PRDs", "A/B Testing", "Metrics"]],
      ["PG-PML-03", "Product Leadership & Communication", "Influence · Storytelling · Leadership", "Soft-skills program", "Lead without authority — stakeholder communication, executive storytelling and decisions under uncertainty.", ["Communication", "Influence", "Storytelling", "Leadership"]],
    ],
    proofPillars: [
      ["Credential", "Program, internship and leadership certificates, issued on completion.", GraduationCap],
      ["Deliverables", "A PRD, a prototype, a dashboard and a GTM plan — real work, not quizzes.", FolderKanban],
      ["Portfolio", "Everything in one product portfolio a hiring manager can open.", MapIcon],
    ],
    note: "A portfolio your future team can read — strategies, specs and launches you can point to.",
  },

  cta: {word: "Your Product", sub: "From customer problem to product leadership."},
  footer: "Great Products.",
});
