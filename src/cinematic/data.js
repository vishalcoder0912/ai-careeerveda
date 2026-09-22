import {
  BrainCircuit,
  Blocks,
  Workflow,
  Cpu,
  ServerCog,
  Sparkles,
  MessageSquare,
  Bot,
  Database,
  Network,
  Puzzle,
  Layers,
  Terminal,
  Code2,
  Zap,
  ShieldCheck,
  GitBranch,
  CloudCog,
  Boxes,
  GraduationCap,
  BookOpen,
  Rocket,
  Users,
  Briefcase,
  FolderKanban,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  Camera,
  MonitorPlay,
  ChevronDown,
  Menu,
  X,
  Radar,
  Orbit,
  Fingerprint,
  Globe,
  Search,
  Gauge,
  Lock,
  TrendingUp,
  Radio,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   NAVIGATION
──────────────────────────────────────────────────────────────────────────── */
export const navLinks = [
  {label: "Program", href: "#ga-program"},
  {label: "Curriculum", href: "#ga-architecture"},
  {label: "AI Stack", href: "#ga-stack"},
  {label: "Projects", href: "#ga-projects"},
  {label: "Career", href: "#ga-career"},
  {label: "Admissions", href: "#ga-cta"},
];

/* ────────────────────────────────────────────────────────────────────────────
   THE EVOLUTION OF INTELLIGENCE — 2020 → 2026
──────────────────────────────────────────────────────────────────────────── */
export const timelineData = [
  {
    year: "2020",
    title: "Foundation Models",
    description:
      "Scale defines intelligence. Massive neural language models begin to generalise across tasks they were never trained for.",
    tags: ["Transformers", "Pre-training", "Scale"],
  },
  {
    year: "2021",
    title: "Generative AI",
    description:
      "Models stop classifying the world and start creating it — text, code, images and thought in a single token stream.",
    tags: ["Generation", "Diffusion", "Creative AI"],
  },
  {
    year: "2022",
    title: "The LLM Era",
    description:
      "Conversational models put a fluent intelligence behind an API. Prompting becomes the new programming interface.",
    tags: ["LLMs", "Alignment", "RLHF"],
  },
  {
    year: "2023",
    title: "AI Copilots",
    description:
      "Intelligence moves into the tools people already use — writing code beside you, drafting, translating intent into output.",
    tags: ["Copilots", "Context", "UX"],
  },
  {
    year: "2024",
    title: "AI Agents",
    description:
      "LLMs begin interacting with tools, memory and external systems — reasoning, then acting, then observing the result.",
    tags: ["Tool use", "Memory", "Reasoning"],
  },
  {
    year: "2025",
    title: "Multi-Agent Systems",
    description:
      "Specialised agents collaborate. An orchestrator plans, delegates, evaluates and iterates across a team of skills.",
    tags: ["Orchestration", "Coordination", "Swarms"],
  },
  {
    year: "2026",
    title: "Autonomous AI",
    description:
      "Long-running autonomy: systems that hold objectives, manage their own tools, and complete multi-stage missions alone.",
    tags: ["Autonomy", "Self-correction", "Operations"],
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   WHAT YOU WILL MASTER — five skill domains
──────────────────────────────────────────────────────────────────────────── */
export const skillCategories = [
  {
    id: "01",
    title: "Generative AI",
    stack: [
      "LLMs",
      "Prompt Engineering",
      "RAG",
      "Fine-Tuning",
      "Multimodal AI",
      "Embeddings",
      "Vector Databases",
    ],
    icon: BrainCircuit,
    palette: "ember",
    intro:
      "Speak the native language of modern models — prompt, ground, specialise and reason.",
  },
  {
    id: "02",
    title: "Agentic AI",
    stack: [
      "AI Agents",
      "Tool Calling",
      "Agent Memory",
      "Planning",
      "Reasoning",
      "Multi-Agent Systems",
      "Autonomous Workflows",
    ],
    icon: Bot,
    palette: "gold",
    intro:
      "Convert models into actors that decide, act, observe and keep going.",
  },
  {
    id: "03",
    title: "AI Engineering",
    stack: [
      "Python",
      "APIs",
      "FastAPI",
      "LangChain",
      "LlamaIndex",
      "Model APIs",
      "Evaluation",
    ],
    icon: Code2,
    palette: "bronze",
    intro:
      "Ship AI as software — clean interfaces, measurable quality, production hygiene.",
  },
  {
    id: "04",
    title: "AI Automation",
    stack: [
      "n8n",
      "Make",
      "Zapier",
      "MCP",
      "Webhooks",
      "APIs",
      "Workflow Automation",
    ],
    icon: Workflow,
    palette: "tangerine",
    intro:
      "Connect intelligence to your entire stack — every tool, every trigger, every task.",
  },
  {
    id: "05",
    title: "AI Infrastructure",
    stack: [
      "Docker",
      "Cloud",
      "Git",
      "CI/CD",
      "Monitoring",
      "AI Security",
    ],
    icon: ServerCog,
    palette: "brass",
    intro:
      "Run it like an operator — containerised, deployed, observed and defended.",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   THE AI ENGINEERING STACK — eight layers
──────────────────────────────────────────────────────────────────────────── */
export const architectureLayers = [
  {layer: "01", title: "AI Foundations", note: "Math, Python, data & model science groundwork"},
  {layer: "02", title: "Generative AI", note: "LLM physics, prompting, multimodal models"},
  {layer: "03", title: "RAG & Knowledge Systems", note: "Embeddings, vector search, grounded answers"},
  {layer: "04", title: "AI Agents", note: "ReAct loops, tool calling, agent memory"},
  {layer: "05", title: "Multi-Agent Systems", note: "Orchestration, delegation, evaluation"},
  {layer: "06", title: "AI Automation", note: "MCP, n8n, Make, Zapier, webhooks"},
  {layer: "07", title: "AI Product Engineering", note: "FastAPI services, UX, evaluation & evals"},
  {layer: "08", title: "Deployment & MLOps", note: "Docker, cloud, CI/CD, monitoring, security"},
];

/* ────────────────────────────────────────────────────────────────────────────
   AGENTIC SYSTEM VISUALISATION — centre node + satellites
──────────────────────────────────────────────────────────────────────────── */
export const agentSystemNode = {
  id: "AGENT",
  label: "AI AGENT",
};

export const agentSatellites = [
  {label: "USER", icon: MessageSquare},
  {label: "LLM", icon: Cpu},
  {label: "MEMORY", icon: Database},
  {label: "TOOLS", icon: Puzzle},
  {label: "DATABASE", icon: Boxes},
  {label: "API", icon: Code2},
  {label: "SEARCH", icon: Search},
  {label: "CODE EXECUTION", icon: Terminal},
  {label: "WORKFLOW", icon: Workflow},
  {label: "OTHER AGENTS", icon: Network},
];

/* ────────────────────────────────────────────────────────────────────────────
   AGENT WORKFLOW — nine living states
──────────────────────────────────────────────────────────────────────────── */
export const workflowSteps = [
  {title: "Input", note: "Intent enters the system"},
  {title: "Understand", note: "Context is parsed"},
  {title: "Plan", note: "A strategy is formed"},
  {title: "Reason", note: "Consequences evaluated"},
  {title: "Select Tool", note: "The right instrument"},
  {title: "Execute", note: "Action taken on the world"},
  {title: "Observe", note: "The result is read"},
  {title: "Memory", note: "The outcome is stored"},
  {title: "Respond", note: "A finished answer returns"},
];

/* ────────────────────────────────────────────────────────────────────────────
   PROJECTS — orbit showcase
──────────────────────────────────────────────────────────────────────────── */
export const projectsData = [
  {
    id: "p1",
    name: "AI Customer Support Agent",
    stack: ["LLM", "Tool Calling", "Memory"],
    description: "A support agent that resolves tickets end-to-end across 40+ helpdesk actions.",
    icon: Bot,
    accent: "ember",
  },
  {
    id: "p2",
    name: "RAG Knowledge Assistant",
    stack: ["RAG", "Embeddings", "Vector DB"],
    description: "Grounded answers over a private document corpus with verifiable citations.",
    icon: Database,
    accent: "gold",
  },
  {
    id: "p3",
    name: "Multi-Agent Research System",
    stack: ["Orchestration", "Parallel Agents"],
    description: "Researcher, analyst and writer agents collaborating on long-form briefs.",
    icon: Network,
    accent: "bronze",
  },
  {
    id: "p4",
    name: "AI Sales Automation",
    stack: ["CRM APIs", "n8n", "Workflows"],
    description: "Lead qualification, follow-ups and pipeline updates without human operators.",
    icon: TrendingUp,
    accent: "tangerine",
  },
  {
    id: "p5",
    name: "AI Resume Analyzer",
    stack: ["Embeddings", "Skills Graph"],
    description: "Parses resumes into a skill graph and matches candidates to role requirements.",
    icon: Fingerprint,
    accent: "brass",
  },
  {
    id: "p6",
    name: "Autonomous Content System",
    stack: ["Agents", "Brand Voice", "Scheduling"],
    description: "A content engine that researches, drafts, edits and publishes on a cadence.",
    icon: Sparkles,
    accent: "ember",
  },
  {
    id: "p7",
    name: "AI Operations Copilot",
    stack: ["MCP", "FastAPI", "Guardrails"],
    description: "An ops copilot that reads dashboards, triages alerts and files resolutions.",
    icon: Gauge,
    accent: "gold",
  },
  {
    id: "p8",
    name: "Voice AI Agent",
    stack: ["STT", "LLM", "TTS"],
    description: "A telephone agent with live speech, turn-taking and graceful fallbacks.",
    icon: Radio,
    accent: "tangerine",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   CAREER OUTCOMES
──────────────────────────────────────────────────────────────────────────── */
export const careerRoles = [
  {role: "Generative AI Engineer", domain: "Applied AI · Model Integration"},
  {role: "Agentic AI Developer", domain: "Autonomous Systems · Tool Building"},
  {role: "AI Automation Engineer", domain: "Workflow Systems · MCP"},
  {role: "LLM Engineer", domain: "RAG · Fine-Tuning · Eval"},
  {role: "AI Product Engineer", domain: "Rapid Prototyping · APIs"},
  {role: "RAG Engineer", domain: "Knowledge Systems · Search"},
  {role: "AI Solutions Architect", domain: "System Design · Deployment"},
  {role: "AI Application Developer", domain: "Full-Stack Intelligence"},
];

/* ────────────────────────────────────────────────────────────────────────────
   PROGRAM STATISTICS
──────────────────────────────────────────────────────────────────────────── */
export const statistics = [
  {value: 8, suffix: "+", label: "AI Domains", note: "covered across the curriculum"},
  {value: 12, suffix: "+", label: "Real-World Projects", note: "built on live problem sets"},
  {value: 6, suffix: "+", label: "Capstone Systems", note: "portfolio-grade deliverables"},
  {value: 20, suffix: "+", label: "Tools & Frameworks", note: "from LangChain to n8n"},
  {value: 100, suffix: "+", label: "Hands-On Hours", note: "of applied engineering"},
];

/* ────────────────────────────────────────────────────────────────────────────
   LEARNING EXPERIENCE
──────────────────────────────────────────────────────────────────────────── */
export const learningPillars = [
  {title: "Live Classes", note: "Studio-taught, no recordings-only model", icon: BookOpen},
  {title: "Hands-On Labs", note: "Every concept exercised in real environments", icon: Terminal},
  {title: "AI Projects", note: "Builds production-shaped AI systems", icon: Rocket},
  {title: "Mentorship", note: "Engineers who work inside AI teams today", icon: Users},
  {title: "Industry Sessions", note: "Practitioners from live deployments", icon: Briefcase},
  {title: "Career Support", note: "Portfolio, interviews and referrals", icon: ArrowUpRight},
  {title: "Portfolio Building", note: "Artifacts that survive the hiring bar", icon: FolderKanban},
  {title: "Capstone Project", note: "A system you own end-to-end", icon: Trophy},
];

/* ────────────────────────────────────────────────────────────────────────────
   CERTIFICATION
──────────────────────────────────────────────────────────────────────────── */
export const certificates = [
  {
    title: "PG Program in Generative AI",
    focus: "LLMs · Prompting · RAG",
    mark: "PG-GEN-01",
  },
  {
    title: "PG Program in Agentic AI",
    focus: "Agents · Tools · Autonomy",
    mark: "PG-AGT-02",
  },
  {
    title: "AI Engineering Program",
    focus: "Systems · Deployment · Ops",
    mark: "PG-ENG-03",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   CONTACT / FOOTER
──────────────────────────────────────────────────────────────────────────── */
export const contactChannels = [
  {label: "Admissions", value: "admissions@careerveda.in", href: "mailto:admissions@careerveda.in", icon: Mail},
  {label: "Call", value: "+91 80000 00000", href: "tel:+918000000000", icon: Phone},
  {label: "LinkedIn", value: "CareerVeda", href: "#contact", icon: Briefcase},
  {label: "Instagram", value: "@careerveda", href: "#contact", icon: Camera},
  {label: "YouTube", value: "CareerVeda", href: "#contact", icon: MonitorPlay},
  {label: "GitHub", value: "careerveda-labs", href: "#contact", icon: GitBranch},
];

/* Small shared icon exports for section headings / UI chrome. */
export const uiIcons = {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Menu,
  X,
  Radar,
  Orbit,
  Globe,
  Layers,
  Blocks,
  Zap,
  ShieldCheck,
  GitBranch,
  CloudCog,
  Lock,
  GraduationCap,
};