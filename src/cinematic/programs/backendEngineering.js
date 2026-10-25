import {Boxes, Cloud, Code2, Database, FolderKanban, GraduationCap, Lock, Map as MapIcon, Server, Trophy} from "lucide-react";
import {agentArt, art, buildProgramContent} from "./build";

// The cinematic page for the PG Program in Backend Development Engineering.
export const backendEngineeringContent = buildProgramContent("backend-engineering", {
  hero: {
    title: ["Backend", "Engineering"],
    sub: "Design it. Build it. Secure it. Scale it. Ship it — from your first API to production systems.",
    badges: ["6 MONTHS", "21 MODULES", "LIVE ONLINE", "NODE.JS · APIs · CLOUD", "CAPSTONE PROJECT", "LIFETIME PLACEMENT SUPPORT"],
  },

  timeline: {
    label: "A Journey from Request to Production",
    title: ["The Making", "of a Backend Engineer"],
    chapters: [
      [1, 3, "Language & Runtime", "How backends work, modern JavaScript and TypeScript, and the Node.js runtime.", "/images/timeline/tl-01.jpg"],
      [4, 5, "APIs", "Build services with Express and design REST APIs other teams love to use.", "/images/cybersecurity/networking.jpg"],
      [6, 8, "Databases", "SQL, NoSQL and MongoDB, and the data-access layers that sit on top.", "/images/data-analytics/da6-sql.jpg"],
      [9, 11, "Security & Testing", "Authentication, authorisation, API security and backends you can trust because they are tested.", "/images/cybersecurity/web-safety.webp"],
      [12, 15, "Performance & Architecture", "Caching, queues, real-time backends and microservice architecture.", "/images/cybersecurity/monitoring.jpg"],
      [16, 21, "Cloud, Scale & Capstone", "Docker, cloud deployment, observability and system design — then a capstone and interview prep.", "/images/timeline/tl-06.jpg"],
    ],
  },

  skills: {
    sub: "From a single endpoint to a system that serves millions — five domains, one engineering discipline.",
    tag: "Builder · Architect · Operator",
    items: [
      ["Languages & Runtime", Code2, "Write fast, typed, asynchronous server code with confidence.", ["JavaScript", "TypeScript", "Node.js", "Event Loop", "Async / Await", "npm", "Git"]],
      ["APIs & Services", Server, "Design APIs that are clear, consistent and pleasant to integrate with.", ["Express", "REST", "API Design", "OpenAPI", "WebSockets", "GraphQL", "Validation"]],
      ["Databases", Database, "Model data, query it efficiently and keep it consistent.", ["PostgreSQL", "MySQL", "MongoDB", "Prisma", "Indexes", "Transactions", "Redis"]],
      ["Security & Testing", Lock, "Protect users and data — and prove the code works before it ships.", ["JWT", "OAuth", "RBAC", "OWASP", "Rate Limiting", "Jest", "Integration Tests"]],
      ["Scale & DevOps", Cloud, "Containerise, deploy, observe and scale services in the cloud.", ["Docker", "CI/CD", "AWS", "Queues", "Microservices", "Observability", "System Design"]],
    ],
  },

  quote: {
    lines: ["USERS SEE", "THE INTERFACE.", "GOOD BACKENDS", "KEEP IT STANDING."],
    cite: "— the backend engineer’s credo",
  },

  architecture: {
    title: ["The Backend", "Engineering Stack"],
    sub: "Nine layers, built in order — each one a foundation for the next.",
    layers: [
      ["Foundations", "Client-server → the request lifecycle → backend careers"],
      ["Language & Runtime", "JavaScript → TypeScript → Node.js → the event loop"],
      ["APIs", "Express → routing → middleware → REST design"],
      ["Data", "SQL → NoSQL → ORMs → data-access layers"],
      ["Security", "Authentication → authorisation → API security"],
      ["Quality", "Unit tests → integration tests → test automation"],
      ["Performance", "Caching → queues → async jobs → real-time"],
      ["Architecture", "Microservices → system design → scalability"],
      ["Production", "Docker → cloud deployment → CI/CD → observability"],
    ],
  },

  modules: {
    title: ["Five Stages.", {em: "Twenty-One Modules."}],
    sub: "One roadmap from your first endpoint to production systems — open a stage to see every module and topic.",
    stages: [
      ["Foundations", "Backend engineering, JavaScript, TypeScript and Node.js.", "Foundations", 1, 3],
      ["APIs & Data", "Express, REST design, SQL, NoSQL and data-access layers.", "APIs", 4, 8],
      ["Secure & Test", "Authentication, API security and testing backend systems.", "Secure", 9, 11],
      ["Scale & Architect", "Caching, queues, real-time and microservice architecture.", "Scale", 12, 15],
      ["Ship & Launch", "Docker, cloud, observability, system design, the capstone and career readiness.", "Ship", 16, 21],
    ],
    art: {"01": "foundations", "02": "data", "03": "target", "04": "gear", "05": "production"},
  },

  system: {
    title: ["The Backend", "System"],
    sub: "Everything a backend engineer connects — clients, data, security and infrastructure — around one API.",
    center: {title: "API", sub: "request · process · respond", art: agentArt("api")},
    nodes: [
      ["CLIENTS", agentArt("user")],
      ["AUTH", agentArt("security")],
      ["ROUTES", art("map")],
      ["DATABASE", art("data")],
      ["CACHE", agentArt("memory")],
      ["QUEUES", art("memo")],
      ["SERVICES", art("gear")],
      ["TESTS", agentArt("eval")],
      ["CLOUD", art("production")],
      ["MONITORING", art("target")],
    ],
  },

  workflow: {
    title: ["From Request", "to Response"],
    lead: "Ten steps, one engineering loop — the order you learn to take a feature from API design to a monitored production service.",
    pipeline: ["design", "route", "validate", "authenticate", "query", "cache", "queue", "test", "deploy", "observe"],
    steps: [
      ["Design", "Resources, contracts & REST conventions"],
      ["Route", "Express routing & middleware"],
      ["Validate", "Input validation & error handling"],
      ["Authenticate", "JWT, OAuth & role-based access"],
      ["Persist", "SQL, MongoDB & ORMs"],
      ["Cache", "Redis caching & performance tuning"],
      ["Queue", "Background jobs & async processing"],
      ["Test", "Unit, integration & API tests"],
      ["Deploy", "Docker, CI/CD & cloud"],
      ["Observe", "Logs, metrics, tracing & alerts"],
    ],
  },

  projects: {
    items: [
      ["REST API Service", ["Express", "REST", "Validation"], "A clean, documented REST API with consistent errors and pagination."],
      ["Auth & RBAC System", ["JWT", "OAuth", "RBAC"], "Sign-up, login and role-based access, built and hardened."],
      ["E-commerce Backend", ["PostgreSQL", "Prisma", "Transactions"], "Products, carts and orders with safe, transactional payments flow."],
      ["Real-Time Chat", ["WebSockets", "Redis", "Presence"], "A chat backend with live messages, presence and history."],
      ["Job Queue Worker", ["Queues", "BullMQ", "Retries"], "Background jobs with retries, scheduling and failure alerts."],
      ["Tested Microservices", ["Microservices", "Jest", "Contracts"], "Two services that talk over APIs, each with its own test suite."],
      ["Cloud Deployment", ["Docker", "CI/CD", "AWS"], "Containerise a service and ship it to the cloud on every merge."],
      ["Capstone Production System", ["System Design", "Observability", "Scale"], "A complete backend, designed, deployed and monitored end to end."],
    ],
    categories: ["APIs", "Security", "Databases", "Real-Time", "Async", "Architecture", "DevOps", "Capstone"],
    sideLeft: ["APIs", "Data", "Systems", "Real Impact"],
    sideRight: ["Build", "Secure", "Scale"],
    footLeft: "Real services · real portfolio",
    footRight: "Ship the system, not just the endpoint",
  },

  careers: {
    lead: "The backend roles this track opens — one role at a time.",
    roles: [
      ["Backend Developer", "Fresher", "APIs · Databases · Node.js", "Build the APIs and data layers products run on.", ["Node.js", "Express", "SQL", "MongoDB", "Git"]],
      ["Software Development Engineer", "Fresher", "Code · Tests · Delivery", "Write, test and ship production code in a product team.", ["TypeScript", "DSA", "Testing", "APIs", "Code Review"]],
      ["API Developer", "Fresher", "REST · Integration · Docs", "Design and document APIs for internal and partner teams.", ["REST", "OpenAPI", "Validation", "Auth", "Postman"]],
      ["Junior Full-Stack Developer", "Fresher", "Backend · Frontend · Delivery", "Ship features across the backend and the interface.", ["Node.js", "React", "SQL", "REST", "Git"]],
      ["Senior Backend Engineer", "Mid-level", "Architecture · Performance · Ownership", "Own services end to end — design, performance and reliability.", ["System Design", "Caching", "Queues", "Mentoring", "SQL"]],
      ["Platform Engineer", "Mid-level", "Infrastructure · Tooling · Scale", "Build the internal platform other engineers ship on.", ["Docker", "Kubernetes", "CI/CD", "Terraform", "Observability"]],
      ["DevOps Engineer", "Mid-level", "CI/CD · Cloud · Reliability", "Automate builds, deployments and cloud infrastructure.", ["CI/CD", "AWS", "Docker", "Monitoring", "Scripting"]],
      ["Site Reliability Engineer", "Mid-level", "Uptime · Incidents · SLOs", "Keep production fast and available, and run incident response.", ["SLOs", "Observability", "Incident Response", "Linux", "Automation"]],
      ["Staff Backend Engineer", "Experienced", "Systems · Standards · Leadership", "Set technical direction across services and teams.", ["Architecture", "Distributed Systems", "Mentoring", "Standards", "Strategy"]],
      ["Engineering Manager", "Experienced", "Teams · Delivery · Hiring", "Lead a backend team and its delivery roadmap.", ["Team Leadership", "Delivery", "Hiring", "Stakeholders", "Roadmapping"]],
    ],
  },

  stats: {modulesNote: "first API to capstone"},

  learning: {
    title: ["Learn.", "Build. Scale."],
    projects: "Every module ships a working, tested service",
    items: [
      ["System Design Labs", "Live system design case studies and architecture reviews", Boxes],
      ["Backend Interview Mastery", "DSA, system design and mock coding interviews", Trophy],
    ],
  },

  certs: {
    certificates: [
      ["PG-BE-01", "PG Program in Backend Development Engineering", "APIs · Databases · Cloud", "program", "Build production backends — APIs, databases, security, testing, scale and cloud deployment.", ["Node.js", "APIs", "Databases", "DevOps"]],
      ["PG-BEI-02", "Backend Engineering Internship", "APIs · Code Review · Releases", "Internship program", "Real-world backend work — production-style APIs, database optimisation, code review and releases.", ["APIs", "Databases", "Code Review", "Deployment"]],
      ["PG-BEC-03", "Engineering Ownership & Communication", "Documentation · Reviews · Ownership", "Soft-skills program", "Document APIs, give constructive reviews and own what you ship — including on-call.", ["Documentation", "Code Review", "Collaboration", "Ownership"]],
    ],
    proofPillars: [
      ["Credential", "Program, internship and ownership certificates, issued on completion.", GraduationCap],
      ["Deliverables", "A REST API, an auth system, a real-time backend and a deployed capstone.", FolderKanban],
      ["Portfolio", "Every service in one GitHub portfolio a hiring manager can run.", MapIcon],
    ],
    note: "A portfolio your future team can run — services, tests and deployments you can point to.",
  },

  cta: {word: "Your Backend", sub: "From your first API to production systems."},
  footer: "Systems That Scale.",
});
