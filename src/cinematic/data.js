import {
  BrainCircuit,
  Blocks,
  Cpu,
  ServerCog,
  MessageSquare,
  Bot,
  Database,
  Network,
  Puzzle,
  Layers,
  Code2,
  Zap,
  ShieldCheck,
  GitBranch,
  CloudCog,
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
} from "lucide-react";
import {ORGANISATION} from "../config/siteMeta";
import {socialLinks} from "../config/externalLinks";

/* ────────────────────────────────────────────────────────────────────────────
   NAVIGATION
──────────────────────────────────────────────────────────────────────────── */
export const navLinks = [
  {label: "Roadmap", href: "#ga-program"},
  {label: "Architecture", href: "#ga-architecture"},
  {label: "Modules", href: "#ga-modules"},
  {label: "Projects", href: "#ga-projects"},
  {label: "Career", href: "#ga-career"},
  {label: "Admissions", href: "#ga-cta"},
];

/* ────────────────────────────────────────────────────────────────────────────
   THE 24-WEEK DELIVERY MAP — week by week
──────────────────────────────────────────────────────────────────────────── */
export const timelineData = [
  {num: "01", year: "Weeks 01–04", title: "Engineering Foundations", description: "Python, OOP, DSA and backend APIs — the software base under every AI system.", tags: ["Python → FastAPI"], image: "/images/timeline/tl-01.jpg"},
  {num: "02", year: "Weeks 05–08", title: "Data, ML & Deep Learning", description: "SQL, statistics and EDA, then regression to neural nets and deep learning.", tags: ["Analytics → DL"], image: "/images/timeline/tl-02.jpg"},
  {num: "03", year: "Weeks 09–12", title: "Generative AI & RAG", description: "Transformers, prompting, embeddings and a full retrieval-augmented pipeline.", tags: ["Enterprise RAG"], image: "/images/timeline/tl-03.jpg"},
  {num: "04", year: "Weeks 13–16", title: "Agent Engineering", description: "Agent loops, tool calling, memory and plan-and-execute workflows.", tags: ["Autonomous Agent"], image: "/images/timeline/tl-04.jpg"},
  {num: "05", year: "Weeks 17–20", title: "Multi-Agent & Interop", description: "Supervisors, frameworks, MCP/A2A protocols and multimodal agents.", tags: ["Multi-Agent Platform"], image: "/images/timeline/tl-05.jpg"},
  {num: "06", year: "Weeks 21–24", title: "Production AI", description: "GPU optimisation, fine-tuning, evals, security and cloud deployment.", tags: ["Flagship Production AI"], image: "/images/timeline/tl-06.jpg"},
];

/* ────────────────────────────────────────────────────────────────────────────
   WHAT YOU WILL MASTER — five skill domains
──────────────────────────────────────────────────────────────────────────── */
export const skillCategories = [
  {
    id: "01",
    title: "AI Systems Engineering",
    stack: [
      "Python",
      "OOP & DSA",
      "FastAPI",
      "PostgreSQL",
      "Redis",
      "Docker",
      "CI/CD",
    ],
    icon: Code2,
    palette: "ember",
    intro:
      "Engineer AI as disciplined software — typed, tested and deployed like production systems.",
  },
  {
    id: "02",
    title: "Data, ML & Deep Learning",
    stack: [
      "SQL",
      "Analytics",
      "Statistics",
      "ML",
      "Deep Learning",
      "Transformers",
      "PyTorch",
    ],
    icon: Database,
    palette: "gold",
    intro:
      "Move from raw data to predictive and neural systems with rigorous evaluation.",
  },
  {
    id: "03",
    title: "Generative AI & RAG",
    stack: [
      "LLMs",
      "Prompting",
      "Embeddings",
      "Vector Search",
      "RAG",
      "Fine-Tuning",
      "Citations",
    ],
    icon: BrainCircuit,
    palette: "bronze",
    intro:
      "Ground, specialise and verify foundation models into production-grade answers.",
  },
  {
    id: "04",
    title: "Agentic & Multi-Agent AI",
    stack: [
      "Agents",
      "Tools",
      "Memory",
      "Planning",
      "Multi-Agent",
      "MCP",
      "A2A",
    ],
    icon: Bot,
    palette: "tangerine",
    intro:
      "Turn models into autonomous actors that plan, act, observe and collaborate.",
  },
  {
    id: "05",
    title: "GPU & Production Engineering",
    stack: [
      "GPU & CUDA",
      "Quantization",
      "Inference",
      "Evals",
      "Security",
      "Observability",
      "MLOps",
    ],
    icon: ServerCog,
    palette: "brass",
    intro:
      "Run it like an operator — optimised, measured, secured and delivered.",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   PROGRAM ARCHITECTURE — nine stages
──────────────────────────────────────────────────────────────────────────── */
export const architectureLayers = [
  {layer: "01", title: "AI Foundations", note: "Python → OOP → DSA → software engineering"},
  {layer: "02", title: "Data & ML", note: "SQL → analytics → statistics → ML → deep learning"},
  {layer: "03", title: "Generative AI", note: "Transformers → LLMs → prompting → embeddings → RAG"},
  {layer: "04", title: "Agentic AI", note: "Tools → memory → planning → reasoning → code agents"},
  {layer: "05", title: "Advanced Agents", note: "Multi-agent → MCP → A2A → long-running workflows"},
  {layer: "06", title: "Model Engineering", note: "Fine-tuning → LoRA → QLoRA → GPU → quantization"},
  {layer: "07", title: "Production AI", note: "Evaluation → security → observability → cost → MLOps"},
  {layer: "08", title: "Deployment", note: "Docker → CI/CD → cloud → scaling → reliability"},
  {layer: "09", title: "Hackathon", note: "Real problem → MVP → production system → technical defense"},
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
  {label: "SECURITY", icon: ShieldCheck},
  {label: "LLM", icon: Cpu},
  {label: "EVAL", icon: Radar},
  {label: "MEMORY", icon: Database},
  {label: "MULTI-AGENT", icon: Network},
  {label: "TOOLS", icon: Puzzle},
  {label: "GPU", icon: Gauge},
  {label: "RAG", icon: Search},
  {label: "API", icon: Code2},
];

/* ────────────────────────────────────────────────────────────────────────────
   CAREERVEDA SIGNATURE MODEL — ten living stages
──────────────────────────────────────────────────────────────────────────── */
export const workflowSteps = [
  {title: "Code", note: "Python, OOP & DSA foundations"},
  {title: "Understand", note: "Data, ML & LLMs"},
  {title: "Build", note: "RAG, agents & multi-agent"},
  {title: "Connect", note: "Tools, MCP & A2A"},
  {title: "Accelerate", note: "GPU, quantization & fine-tuning"},
  {title: "Break", note: "Failure testing & red-teaming"},
  {title: "Measure", note: "Evaluation & observability"},
  {title: "Optimize", note: "Cost, latency & reliability"},
  {title: "Deploy", note: "Docker, CI/CD & cloud"},
  {title: "Prove", note: "ROI, portfolio & technical defense"},
];

/* ────────────────────────────────────────────────────────────────────────────
   PROJECTS — orbit showcase
──────────────────────────────────────────────────────────────────────────── */
export const projectsData = [
  {
    id: "p1",
    name: "Private Enterprise AI Platform",
    stack: ["LLM", "Multi-Agent", "MCP", "GPU"],
    description: "A private, GPU-backed enterprise platform — auth to observability.",
    icon: Bot,
    accent: "ember",
  },
  {
    id: "p2",
    name: "Autonomous Business Intelligence",
    stack: ["SQL", "ML", "Agents", "ROI"],
    description: "Executive-grade BI with planners, critic review and human approval.",
    icon: TrendingUp,
    accent: "gold",
  },
  {
    id: "p3",
    name: "Enterprise Knowledge Copilot",
    stack: ["Hybrid Search", "RAG", "Citations"],
    description: "Grounded answers over private corpora with evaluation and feedback.",
    icon: Database,
    accent: "bronze",
  },
  {
    id: "p4",
    name: "Multi-Agent Research Platform",
    stack: ["Supervisor", "Handoffs", "Pipelines"],
    description: "Specialised agents collaborating through governed, observable pipelines.",
    icon: Network,
    accent: "tangerine",
  },
  {
    id: "p5",
    name: "MCP Enterprise Agent",
    stack: ["MCP", "A2A", "Permissions"],
    description: "Protocol-native agent that discovers tools and delegates securely.",
    icon: Puzzle,
    accent: "brass",
  },
  {
    id: "p6",
    name: "Autonomous Data Analyst",
    stack: ["Planner", "SQL Agent", "Reviewer"],
    description: "A self-revising analyst that turns business data into verified reports.",
    icon: Fingerprint,
    accent: "ember",
  },
  {
    id: "p7",
    name: "AI Evaluation Platform",
    stack: ["Golden Sets", "Metrics", "Regression"],
    description: "Measure retrieval, generation and agents across cost and quality.",
    icon: Gauge,
    accent: "gold",
  },
  {
    id: "p8",
    name: "AI Red-Team & Security Lab",
    stack: ["Attacks", "Guardrails", "Kill Switches"],
    description: "Build → attack → patch → retest → regression on live agents.",
    icon: ShieldCheck,
    accent: "tangerine",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   CAREER OUTCOMES
   Salary figures are indicative India market ranges (2026) for ~3–6 yrs of
   experience, drawn from the cited public sources. Roles whose title is too
   new for a reliable documented range (RAG Engineer, GPU / Inference Engineer)
   show the closest documented role as reference instead of an invented number.
──────────────────────────────────────────────────────────────────────────── */
export const careerRoles = [
  {
    role: "AI Engineer",
    domain: "Systems · APIs · Deployment",
    description: "Ship production AI systems — LLM APIs, RAG pipelines, evals.",
    skills: ["Python", "RAG", "Prompting", "FastAPI", "Vector DBs"],
    salary: "₹14–28 LPA",
    location: "India",
    year: 2026,
    source: "AmbitionBox · GCC benchmarks",
  },
  {
    role: "Generative AI Engineer",
    domain: "LLM Workflows · Evals · Guardrails",
    description: "Generative features with structured LLM orchestration and evals.",
    skills: ["LangChain", "Prompting", "Evals", "Model APIs", "Guardrails"],
    salary: "₹20–45 LPA",
    location: "India",
    year: 2026,
    source: "Intellipaat 2026",
  },
  {
    role: "LLM Engineer",
    domain: "RAG · Fine-Tuning · Prompting",
    description: "Fine-tune, prompt and serve LLMs in production.",
    skills: ["RAG", "Fine-Tuning", "Prompting", "Evaluation", "vLLM"],
    salary: "₹18–38 LPA",
    location: "India",
    year: 2026,
    source: "Glassdoor India 2026",
  },
  {
    role: "AI Systems Engineer",
    domain: "Backend · Model Serving · MLOps",
    description: "Architect the APIs and serving behind model services.",
    skills: ["Backend", "APIs", "Python", "Model Serving", "MLOps"],
    salary: "₹15–30 LPA",
    location: "India",
    year: 2026,
    source: "GCC benchmarks 2026",
  },
  {
    role: "Agentic AI Engineer",
    domain: "Tools · Memory · Orchestration",
    description: "Autonomous agents with tool use, memory and orchestration.",
    skills: ["LangGraph", "Tools & MCP", "Memory", "Orchestration", "Agents"],
    salary: "₹16–35 LPA",
    location: "India",
    year: 2026,
    source: "KnowledgeHut · amQuest",
  },
  {
    role: "RAG Engineer",
    domain: "Retrieval · Reranking · Grounding",
    description: "The right context at the right time — retrieval, reranking, grounding.",
    skills: ["Embeddings", "Retrieval", "Rerankers", "Vector DBs", "Grounding"],
    salaryVaried: true,
    salaryMappedTo: "LLM Engineer",
    salaryMappedRange: "₹18–38 LPA",
    location: "India",
    year: 2026,
    source: "Glassdoor India · LLM Engineer 2026",
  },
  {
    role: "ML Engineer",
    domain: "Models · Evaluation · Production",
    description: "Train and ship ML models — from pipelines to served predictions.",
    skills: ["PyTorch", "Training", "Evaluation", "Serving", "Pipelines"],
    salary: "₹18–35 LPA",
    location: "India",
    year: 2026,
    source: "Naukri JobSpeak",
  },
  {
    role: "MLOps / AI Infrastructure Engineer",
    domain: "Docker · Cloud · Observability",
    description: "Deploy, automate and observe a fleet of models.",
    skills: ["Docker", "Kubernetes", "CI/CD", "Observability", "MLflow"],
    salary: "₹18–38 LPA",
    location: "India",
    year: 2026,
    source: "Naukri · GCC benchmarks",
  },
  {
    role: "GPU / Inference Engineer",
    domain: "CUDA · Quantization · Serving",
    description: "Lowest-latency inference — quantization, batching, kernels, serving.",
    skills: ["CUDA", "Quantization", "vLLM", "TensorRT", "GPU Serving"],
    salaryVaried: true,
    salaryMappedTo: "MLOps Engineer",
    salaryMappedRange: "₹18–38 LPA",
    location: "India",
    year: 2026,
    source: "Naukri · MLOps 2026",
  },
  {
    role: "AI Platform Engineer",
    domain: "Platform APIs · Cost · Governance",
    description: "The platform that runs models safely at scale.",
    skills: ["Platform APIs", "IaC", "Kubernetes", "Cost", "Observability"],
    salary: "₹20–38 LPA",
    location: "India",
    year: 2026,
    source: "GCC benchmarks 2026",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   PROGRAM STATISTICS
──────────────────────────────────────────────────────────────────────────── */
export const statistics = [
  {value: 24, suffix: "", label: "Weeks", note: "intensive, project-driven"},
  {value: 28, suffix: "+", label: "Structured Modules", note: "stacked end-to-end"},
  {value: 21, suffix: "+", label: "Projects & Labs", note: "GPU, eval and red-team included"},
  {value: 3, suffix: "", label: "Flagship Systems", note: "portfolio-grade, end-to-end"},
  {value: 10, suffix: "+", label: "Production Disciplines", note: "from evaluation to MLOps"},
];

/* ────────────────────────────────────────────────────────────────────────────
   FULL CURRICULUM — 28 modules
──────────────────────────────────────────────────────────────────────────── */
export const moduleData = [
  {
    id: "00",
    title: "Engineering Bridge",
    week: "Week 0 · Pre-course",
    objective: "Align every learner before the advanced curriculum begins.",
    topics: [
      "Computer fundamentals & Linux command line",
      "VS Code, Git & GitHub basics",
      "Python environment setup, virtual environments & packages",
      "APIs, JSON & working with data",
      "Maths for AI — linear algebra & probability fundamentals",
    ],
    build: "Outcome — every learner can clone → run → debug → commit → push",
  },
  {
    id: "01",
    title: "Python for AI Engineering",
    week: "Week 1",
    objective: "Python as an engineering language — from foundations to AI-oriented data tooling.",
    topics: [
      "Variables, types, operators, conditions & loops",
      "Functions, collections & comprehensions",
      "Modules, packages & file handling (JSON, CSV)",
      "Exception handling, type hints, logging & configuration",
      "CLI applications, dependency management & API consumption",
      "NumPy, Pandas & data processing",
    ],
    build: "Project 01 — Python Automation & Data Toolkit",
  },
  {
    id: "02",
    title: "OOP & Software Design",
    week: "Week 2",
    objective: "Software architecture that keeps AI systems maintainable and testable.",
    topics: [
      "Classes, objects, inheritance, encapsulation & polymorphism",
      "Abstraction, composition, interfaces & dependency injection",
      "SOLID principles & modular architecture",
      "Service, repository, factory & strategy patterns",
      "Clean code, code review, documentation & testing principles",
    ],
    build: "Project 02 — Modular Document Processing Engine",
  },
  {
    id: "03",
    title: "DSA & AI Problem Solving",
    week: "Week 3",
    objective: "The data structures behind retrieval, ranking and agent state.",
    topics: [
      "Arrays, strings, hash maps & sets",
      "Stacks, queues, linked lists, trees, heaps & graphs",
      "Searching, sorting, two pointers & sliding window",
      "BFS, DFS & complexity analysis",
      "Search, ranking, retrieval, priority queues & caching",
      "Graph traversal, task queues & agent state graphs",
    ],
    build: "Project 03 — Search & Ranking Engine · DSA continues through all 24 weeks",
  },
  {
    id: "04",
    title: "Backend & AI Software Engineering",
    week: "Week 4",
    objective: "Ship AI as a production API — typed, tested, containerised.",
    topics: [
      "HTTP, REST, JSON & API architecture",
      "Authentication & authorization",
      "FastAPI, Pydantic & async Python",
      "Concurrency, background workers & WebSockets",
      "PostgreSQL — database design, transactions, indexing, pooling",
      "Redis caching, pytest, unit/integration/API tests",
      "Docker, Compose & environment management",
    ],
    build: "Project 04 — Production AI API",
  },
  {
    id: "05",
    title: "SQL, Data Analytics & Business Intelligence",
    week: "Week 5",
    objective: "Data mastery in the service of agents and business decisions.",
    topics: [
      "SELECT, filtering, aggregation, GROUP BY & HAVING",
      "JOINs, subqueries, CTEs & window functions",
      "CASE, views, indexes & data cleaning",
      "Time-series, KPI, revenue & cohort analysis",
      "Root-cause analysis & business segmentation",
      "Matplotlib, Plotly & interactive dashboards",
    ],
    build: "Project 05 — Business Intelligence Command Center",
  },
  {
    id: "06",
    title: "Statistics, Data Science & ML",
    week: "Weeks 6–7",
    objective: "Statistical rigour behind every model, split and evaluation.",
    topics: [
      "Descriptive statistics, probability & distributions",
      "Sampling, correlation, inference & hypothesis testing",
      "EDA, feature engineering & preprocessing",
      "Train/validation/test splits, data leakage & baselines",
      "Linear/logistic regression, decision trees, forests & boosting",
      "Classification, clustering & evaluation — accuracy to ROC-AUC, MAE/MSE/RMSE",
    ],
    build: "Project 06 — Predictive Business Intelligence System",
  },
  {
    id: "07",
    title: "Deep Learning & Transformer Foundations",
    week: "Week 8",
    objective: "From neural nets to the transformer blocks that power everything.",
    topics: [
      "Layers, activations, loss functions & backpropagation",
      "Optimization, regularization, CNN & RNN concepts",
      "Tokenization, embeddings & positional encoding",
      "Self-attention, multi-head attention, encoder & decoder",
      "Causal language modeling",
      "Foundation models, reasoning models, MoE & multimodal concepts",
    ],
    build: "Project 07 — Attention From Scratch",
  },
  {
    id: "08",
    title: "LLM Engineering & Foundation Models",
    week: "Week 9",
    objective: "Choose, run and call models like an engineer — not a tourist.",
    topics: [
      "Open-source vs proprietary, model families & sizing",
      "Context windows, inference requirements, latency & cost",
      "Temperature, top-p, token limits, sampling & context management",
      "API models, local models, Hugging Face & Ollama",
      "OpenAI-compatible APIs & model selection",
    ],
    build: "Project 08 — LLM Model Benchmark · quality, latency, tokens, cost",
  },
  {
    id: "09",
    title: "Prompt, Context & Structured Generation Engineering",
    week: "Week 10",
    objective: "Prompting and structured output as an engineering discipline.",
    topics: [
      "Zero-shot, few-shot, system instructions & role prompting",
      "Prompt decomposition, chaining & decomposition",
      "JSON Schema, structured outputs & function calling",
      "Context selection, compression & long-context strategies",
      "Prompt versioning & regression testing",
      "Prompt injection defence, instruction conflicts & guardrails",
    ],
    build: "Project 09 — Enterprise Information Extraction Agent",
  },
  {
    id: "10",
    title: "Embeddings, Vector Search & RAG Engineering",
    week: "Weeks 11–12",
    objective: "Grounded, verifiable answers over private knowledge.",
    topics: [
      "Embeddings, cosine similarity, dot product & distance functions",
      "FAISS, Qdrant & vector indexes",
      "Top-K, dense vs sparse retrieval & hybrid search",
      "Reranking & RAG ingestion — parsing, cleaning, chunking, metadata",
      "Context construction, generation & citations",
      "Advanced RAG — query rewriting, hierarchical, GraphRAG",
    ],
    build: "Project 10 — Production Enterprise Knowledge Copilot",
  },
  {
    id: "11",
    title: "RAG Evaluation & Failure Lab",
    week: "Integrated · Weeks 11–12",
    objective: "Measure retrieval and generation — then deliberately break it.",
    topics: [
      "Retrieval metrics — Recall@K, Precision@K, MRR, NDCG",
      "Generation metrics — faithfulness, groundedness, relevance, correctness",
      "Golden datasets, regression testing & benchmark pipelines",
      "Failure lab — bad chunks, irrelevant retrieval, hallucinations, citation errors",
      "Fix, re-measure and defend the cured system",
    ],
    build: "Project 11 — RAG Evaluation & Failure Lab",
  },
  {
    id: "12",
    title: "Agent Engineering Fundamentals",
    week: "Week 13",
    objective: "Know when to build an agent — and when not to.",
    topics: [
      "LLM application vs agent",
      "Agent loop, ReAct, tool & function calling",
      "State, planning, reasoning & termination",
      "Reflection, retry & checkpoints",
      "Deterministic vs agentic vs hybrid workflows",
    ],
    build: "Project 12 — Tool-Using Research Agent",
  },
  {
    id: "13",
    title: "Tool Engineering & Agent Runtime",
    week: "Week 14",
    objective: "Reliable, secure tools your agents can trust under load.",
    topics: [
      "Tool schemas, JSON Schema & input/output validation",
      "Tool discovery, versioning, retry, timeout & fallback",
      "Circuit breakers & parallel tool calls",
      "Permissions, auth, least privilege & sandboxing",
      "Python, web, database, search, file & API tools",
    ],
    build: "Project 13 — Five-Tool Autonomous Research Agent · 20 benchmark tasks",
  },
  {
    id: "14",
    title: "Agent Memory & State Engineering",
    week: "Week 15",
    objective: "Memory that persists, updates and forgets safely.",
    topics: [
      "Working, in-context, semantic & episodic memory",
      "Redis, PostgreSQL & vector memory stores",
      "Retrieval, update, compression & forgetting",
      "Privacy & memory-poisoning defences",
      "Agent state, checkpoints, resume & human state transitions",
    ],
    build: "Project 14 — Persistent Personal Agent",
  },
  {
    id: "15",
    title: "Planning, Reasoning & Long-Running Agents",
    week: "Week 16",
    objective: "Agents that plan ahead and survive for hours of work.",
    topics: [
      "Task decomposition & plan-and-execute",
      "Dynamic replanning, dependencies & parallel execution",
      "Checkpointing, resume, pause & background execution",
      "Human approval & error recovery",
      "Reflection, critic, judge, verification & self-correction",
    ],
    build: "Project 15 — Autonomous Data Analyst",
  },
  {
    id: "16",
    title: "Multi-Agent Systems",
    week: "Week 17",
    objective: "Orchestrate teams of agents with clear boundaries.",
    topics: [
      "Supervisor, sequential, pipeline & hierarchical",
      "Router, parallel, peer-to-peer, debate & critic/judge",
      "Agent handoffs, shared state & context boundaries",
      "Result aggregation & failure propagation",
      "Permission boundaries, agent identity & human approval",
    ],
    build: "Project 16 — Multi-Agent Enterprise Research Platform",
  },
  {
    id: "17",
    title: "Agent Framework Engineering",
    week: "Week 18",
    objective: "Understand frameworks by building without one first.",
    topics: [
      "LangGraph, CrewAI, LlamaIndex & code-first agents",
      "State, nodes, edges & conditional routing",
      "Persistence, human-in-the-loop & checkpointing",
      "Build one agent with no framework — then rebuild it",
      "Document what the framework simplified, hid — and when not to use one",
    ],
    build: "Project 17 — Agent Framework Comparison",
  },
  {
    id: "18",
    title: "MCP, Agent Interoperability & A2A",
    week: "Week 19",
    objective: "Make agents discover, delegate and interoperate at protocol level.",
    topics: [
      "MCP client/server — tools, resources & prompts",
      "Tool discovery, permissions, auth & context boundaries",
      "A2A — agent identity, discovery & capability descriptions",
      "Task delegation, artifacts & task lifecycle",
      "Remote agents, streaming & structured handoffs",
    ],
    build: "Project 18 — MCP Enterprise Agent",
  },
  {
    id: "19",
    title: "Multimodal & Computer-Use AI",
    week: "Week 20",
    objective: "Agents that see, hear and operate real interfaces.",
    topics: [
      "Vision-language & document understanding",
      "Audio understanding & speech AI",
      "Multimodal embeddings, image/video concepts & multimodal RAG",
      "Computer use — browser, UI actions, screenshots",
      "Action verification, permission boundaries & human approval",
    ],
    build: "Project 19 — Multimodal Enterprise Intelligence Agent",
  },
  {
    id: "20",
    title: "GPU & AI Infrastructure Engineering",
    week: "Weeks 21–22",
    objective: "GPU fluency — from kernels to production serving.",
    topics: [
      "CPU vs GPU, CUDA, threads, blocks, warps & kernels",
      "VRAM, memory bandwidth & host/device memory",
      "PyTorch GPU, mixed precision & memory optimization",
      "INT8/INT4 quantization, KV cache & continuous batching",
      "Throughput, tokens/sec, TTFT, p50/p95 latency",
      "vLLM, FastAPI, Docker, GPU containers & load testing",
    ],
    build: "Three GPU Labs — Inference Optimization · QLoRA · Production LLM Serving",
  },
  {
    id: "21",
    title: "LLM Fine-Tuning & Model Customization",
    week: "Integrated · Week 20–22",
    objective: "Specialise models without losing the platform.",
    topics: [
      "Dataset design, cleaning & instruction datasets",
      "Train/validation split & checkpointing",
      "PEFT, LoRA, QLoRA & adapters",
      "Hyperparameters & evaluation",
      "RAG vs prompting vs fine-tuning — justify the choice",
    ],
    build: "Project 20 — QLoRA Fine-Tuning Lab",
  },
  {
    id: "22",
    title: "AI Evaluation Engineering",
    week: "Week 23",
    objective: "Evaluation as its own engineering discipline.",
    topics: [
      "LLM metrics — accuracy, relevance, groundedness, hallucination",
      "RAG metrics — retrieval, generation & citation correctness",
      "Agent metrics — task completion, tool correctness, recovery rate",
      "Production metrics — latency, p50/p95/p99, cost per request, error rate",
      "Golden datasets, regression suites & benchmark pipelines",
    ],
    build: "Project 21 — AI Evaluation Platform",
  },
  {
    id: "23",
    title: "AI Security, Governance & Responsible AI",
    week: "Integrated · Weeks 22–23",
    objective: "Assume the attacker is already inside the context window.",
    topics: [
      "Direct & indirect prompt injection, tool poisoning",
      "Malicious documents & web content",
      "Data leakage, memory poisoning & unsafe code execution",
      "Guardrails, validation, least privilege & sandboxing",
      "Approval gates, audit logs, kill switches & human oversight",
      "Privacy, auditability & AI risk management",
    ],
    build: "Project 22 — AI Red-Team & Security Lab",
  },
  {
    id: "24",
    title: "LLMOps, Observability & AI Cost Engineering",
    week: "Week 23",
    objective: "Operate AI you can see, trace and budget.",
    topics: [
      "Logs, metrics, traces, spans & agent trajectories",
      "Langfuse, LangSmith, Prometheus, Grafana & OpenTelemetry",
      "Success/failure rate, latency, token usage & model performance",
      "Model routing, prompt/context optimization & semantic caching",
      "Token budgets, agent iteration limits & cost per task",
    ],
    build: "Project 23 — AI Observability & Cost Dashboard",
  },
  {
    id: "25",
    title: "Production AI Engineering & MLOps",
    week: "Week 24 · Preparation + continuous",
    objective: "Deploy it like an operator — and keep it alive under load.",
    topics: [
      "FastAPI, PostgreSQL, Redis, queues & async workers",
      "Docker, Compose, images, containers & secrets",
      "GitHub Actions, automated tests, build & deploy pipelines, rollback",
      "GCP — Compute Engine, Cloud Run, Cloud Storage, IAM, logging",
      "Retry, exponential backoff, timeout, rate limiting & circuit breakers",
      "Idempotency, checkpointing, recovery, graceful shutdown & scaling",
    ],
    build: "Project 24 — Production Deployment Gate",
  },
  {
    id: "26",
    title: "AI Product Engineering & Business Value",
    week: "Runs throughout Months 3–6",
    objective: "Ship products people pay for — then prove the ROI.",
    topics: [
      "Problem discovery, user personas & jobs-to-be-done",
      "AI use-case identification, suitability & workflow redesign",
      "Human-in-the-loop & architectural decisions",
      "Defend — why this model, RAG, agent, multi-agent, GPU, database?",
      "ROI, cost savings, risk reduction & adoption",
      "AI Product Case Study & ROI Report",
    ],
    build: "Deliverable — AI Product Case Study + ROI Report",
  },
  {
    id: "27",
    title: "Hackathon Engineering",
    week: "Runs throughout Months 2–6",
    objective: "Three flagship hackathons that mirror real production pressure.",
    topics: [
      "Hackathon 01 — DATA/ML · dataset → EDA → ML → submission",
      "Hackathon 02 — GENAI/AGENT · problem → RAG/agent → MVP → pitch",
      "Hackathon 03 — PRODUCTION · multi-agent → GPU → security → deployment → defense",
      "Problem → user → pain point → AI opportunity → architecture → MVP",
      "Implementation → testing → evaluation → security → deployment → demo → pitch",
    ],
    build: "Technical Defense — the final bottleneck every engineer must clear",
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   CURRICULUM JOURNEY — 5 stages × 24 weeks
   Progressive-disclosure roadmap: the 24 weeks are grouped into five stages.
──────────────────────────────────────────────────────────────────────────── */
export const curriculumJourney = [
  {
    id: "01",
    title: "Engineering Foundations",
    range: "Weeks 01–04",
    motif: "Engineer",
    description: "Build the engineering foundation required to work with modern AI systems.",
    weeks: [
      {
        id: "W01",
        title: "Python Engineering",
        topics: ["Python foundations", "NumPy", "Pandas", "CLI tooling", "APIs"],
        build: "Project 01 — Python Automation & Data Toolkit",
      },
      {
        id: "W02",
        title: "OOP & Software Design",
        topics: ["Object-oriented programming", "SOLID", "Modular architecture", "Clean code"],
        build: "Project 02 — Modular Document Processing Engine",
      },
      {
        id: "W03",
        title: "DSA & AI Problem Solving",
        topics: ["Data structures", "Algorithms", "Search", "Ranking", "Problem solving"],
        build: "Project 03 — Search & Ranking Engine",
      },
      {
        id: "W04",
        title: "Backend & Docker",
        topics: ["REST APIs", "FastAPI", "Authentication", "Docker", "Backend architecture"],
        build: "Project 04 — Production AI API",
      },
    ],
  },
  {
    id: "02",
    title: "Data & Machine Intelligence",
    range: "Weeks 05–08",
    motif: "Analyze",
    description: "Move from raw data and statistics into machine learning and deep learning.",
    weeks: [
      {
        id: "W05",
        title: "SQL + Analytics",
        topics: ["SQL", "Data analysis", "KPIs", "Business analytics"],
        build: "Project 05 — Business Intelligence Command Center",
      },
      {
        id: "W06",
        title: "Statistics + Data Science",
        topics: ["Probability", "Statistics", "EDA", "Feature engineering", "Data science workflows"],
        build: "Project 06 — Predictive Business Intelligence System",
      },
      {
        id: "W07",
        title: "Machine Learning",
        topics: ["Regression", "Classification", "Clustering", "Model evaluation"],
        build: "Prediction models on structured business data",
      },
      {
        id: "W08",
        title: "ML + Deep Learning",
        topics: ["Neural networks", "Deep learning", "Optimization", "Transformers foundations"],
        build: "Project 07 — Attention From Scratch",
      },
    ],
  },
  {
    id: "03",
    title: "Generative AI & RAG",
    range: "Weeks 09–12",
    motif: "Understand",
    description: "Understand modern foundation models and build production-ready RAG systems.",
    weeks: [
      {
        id: "W09",
        title: "Transformers + LLMs",
        topics: ["Transformers", "LLM architecture", "Embeddings", "Model inference"],
        build: "Project 08 — LLM Model Benchmark",
      },
      {
        id: "W10",
        title: "Prompt + Context Engineering",
        topics: ["Prompt engineering", "Structured outputs", "Function calling", "Context management"],
        build: "Project 09 — Enterprise Information Extraction Agent",
      },
      {
        id: "W11",
        title: "Embeddings + Vector Search",
        topics: ["Embeddings", "Vector databases", "Similarity search", "Hybrid retrieval", "Reranking"],
        build: "Project 10 — Production Enterprise Knowledge Copilot",
      },
      {
        id: "W12",
        title: "RAG + Evaluation",
        topics: ["Document ingestion", "Chunking", "Retrieval", "RAG pipelines", "Evaluation", "Citations"],
        build: "Project 11 — RAG Evaluation & Failure Lab",
      },
    ],
  },
  {
    id: "04",
    title: "Agentic AI Systems",
    range: "Weeks 13–20",
    motif: "Build Agents",
    description: "Build autonomous AI systems that can reason, use tools, maintain memory and collaborate.",
    weeks: [
      {
        id: "W13",
        title: "Agent Fundamentals",
        topics: ["Agent loops", "ReAct", "Tool calling", "State", "Reasoning"],
        build: "Project 12 — Tool-Using Research Agent",
      },
      {
        id: "W14",
        title: "Tool Engineering",
        topics: ["Tool schemas", "Validation", "Retries", "Permissions", "Tool execution"],
        build: "Project 13 — Five-Tool Autonomous Research Agent",
      },
      {
        id: "W15",
        title: "Memory Engineering",
        topics: ["Short-term memory", "Long-term memory", "Semantic memory", "Persistent state"],
        build: "Project 14 — Persistent Personal Agent",
      },
      {
        id: "W16",
        title: "Planning + Data Agents",
        topics: ["Task decomposition", "Planning", "Replanning", "Data agents", "Human approval"],
        build: "Project 15 — Autonomous Data Analyst",
      },
      {
        id: "W17",
        title: "Multi-Agent Systems",
        topics: ["Supervisors", "Routers", "Parallel agents", "Agent collaboration"],
        build: "Project 16 — Multi-Agent Enterprise Research Platform",
      },
      {
        id: "W18",
        title: "Agent Framework Engineering",
        topics: ["LangGraph", "CrewAI", "LlamaIndex", "Agent orchestration"],
        build: "Project 17 — Agent Framework Comparison",
      },
      {
        id: "W19",
        title: "MCP + A2A",
        topics: ["MCP", "Agent discovery", "Tool/resource protocols", "Agent-to-agent communication"],
        build: "Project 18 — MCP Enterprise Agent",
      },
      {
        id: "W20",
        title: "Multimodal AI",
        topics: ["Vision", "Documents", "Audio", "Multimodal RAG", "Computer-use concepts"],
        build: "Project 19 — Multimodal Enterprise Intelligence Agent",
      },
    ],
  },
  {
    id: "05",
    title: "Production AI & Deployment",
    range: "Weeks 21–24",
    motif: "Deploy",
    description: "Turn AI systems into optimized, secure and deployable production systems.",
    weeks: [
      {
        id: "W21",
        title: "GPU + CUDA",
        topics: ["GPU architecture", "CUDA", "VRAM", "Inference optimization", "Performance"],
        build: "GPU Lab A — Inference Optimization",
      },
      {
        id: "W22",
        title: "Fine-Tuning + Inference",
        topics: ["LoRA", "QLoRA", "Fine-tuning", "Model serving", "Inference optimization"],
        build: "Project 20 — QLoRA Fine-Tuning Lab",
      },
      {
        id: "W23",
        title: "Security + Evaluation + Observability",
        topics: ["AI evaluation", "Security", "Guardrails", "Monitoring", "Tracing", "Reliability"],
        build: "Project 21 — AI Evaluation Platform + Red-Team Lab",
      },
      {
        id: "W24",
        title: "Cloud + Grand Hackathon",
        topics: ["CI/CD", "GCP", "Production deployment", "Scaling", "Flagship production build", "Grand Hackathon"],
        build: "Project 24 — Production Deployment Gate",
      },
    ],
  },
];

export const continuousTracks = [
  {title: "DSA", range: "Weeks 1–24"},
  {title: "Git/GitHub", range: "Weeks 1–24"},
  {title: "Python", range: "Weeks 1–24"},
  {title: "Project Building", range: "Weeks 1–24"},
  {title: "AI Evaluation", range: "Weeks 11–24"},
  {title: "Security", range: "Weeks 10–24"},
  {title: "Cloud/Deployment", range: "Weeks 4–24"},
  {title: "Hackathon Training", range: "Weeks 8–24"},
  {title: "AI Product/Business", range: "Weeks 9–24"},
];

/* ────────────────────────────────────────────────────────────────────────────
   LEARNING EXPERIENCE
──────────────────────────────────────────────────────────────────────────── */
export const learningPillars = [
  {title: "Live Studio Classes", note: "IIT-inspired lecture + lab rhythm", icon: BookOpen},
  {title: "GPU-Enabled Labs", note: "Inference, quantization and QLoRA on real GPUs", icon: Cpu},
  {title: "Project-Driven Builds", note: "Every module ships a working system", icon: Rocket},
  {title: "Hackathon Program", note: "Three flagship hackathons across the 24 weeks", icon: Trophy},
  {title: "Engineering Mentors", note: "Builders working inside AI systems today", icon: Users},
  {title: "Failure & Eval Labs", note: "Break it, then patch it — deliberately", icon: Radar},
  {title: "Portfolio Engineering", note: "Artifacts that survive the hiring bar", icon: FolderKanban},
  {title: "Career & ROI Support", note: "Technical defense, interviews and referrals", icon: Briefcase},
];

/* ────────────────────────────────────────────────────────────────────────────
   CERTIFICATION
──────────────────────────────────────────────────────────────────────────── */
export const certificates = [
  {
    mark: "PG-AIS-01",
    title: "PG Program in AI Systems Engineering",
    focus: "Systems · Backend · MLOps",
    stage: "Modules 01–02",
    outcome: "Ship an end-to-end AI service — data pipeline, trained model, containerised API with monitoring.",
    skills: ["Python", "DSA", "FastAPI", "MLOps"],
  },
  {
    mark: "PG-AGT-02",
    title: "PG Program in Agentic AI Engineering",
    focus: "Agents · Multi-Agent · MCP/A2A",
    stage: "Modules 03–05",
    outcome: "Design tool-using agents with memory, planning, multi-agent orchestration and MCP/A2A interop.",
    skills: ["RAG", "Tool calling", "Memory", "MCP/A2A"],
  },
  {
    mark: "PG-APR-03",
    title: "PG Program in Applied Production AI",
    focus: "GPU · Eval · Security · Cloud",
    stage: "Module 06",
    outcome: "Optimise and defend a production LLM stack — GPU serving, evals, red-teaming and cloud rollout.",
    skills: ["GPU", "Evals", "Security", "Cloud"],
  },
];

/* A learning badge is not a certificate, and a certificate is not proof you can
   build. These three are deliberately separate: the roadmap below buys the first,
   the project buys the second, and the repository is what a hiring manager
   actually opens. Presenting one as the other is how a brochure loses its
   credibility in the first interview. */
export const proofPillars = [
  {
    title: "Credential",
    note: "External industry learning, mapped to the module it was earned in.",
    icon: GraduationCap,
  },
  {
    title: "Project",
    note: "A deployed system, not a notebook — something a user or a team can open.",
    icon: FolderKanban,
  },
  {
    title: "GitHub evidence",
    note: "Architecture, tests and commit history — proof of how you work.",
    icon: GitBranch,
  },
];

/* The 24-week curriculum mapped onto external, industry-recognised learning.
   `cost` is deliberately worded as "Free" / "Free assessment" rather than a
   promise of a permanently free certificate: provider catalogues, badge
   requirements and promotional exam offers all change without notice, and a
   brochure that names one as free forever is the first thing a sceptical
   admissions panel catches. The exact live list belongs on the course portal. */
export const credentialRoadmap = [
  {stage: "Foundation", weeks: "Weeks 1–2", credential: "AI & Python foundations", provider: "IBM SkillsBuild", cost: "Free"},
  {stage: "Foundation → ML", weeks: "Week 4", credential: "Introduction to Machine Learning", provider: "Google for Developers", cost: "Free"},
  {stage: "ML", weeks: "Weeks 5–8", credential: "ML Crash Course — core + module badges", provider: "Google for Developers", cost: "Free"},
  {stage: "ML", weeks: "Week 8", credential: "Classification & Embeddings badges", provider: "Google for Developers", cost: "Free"},
  {stage: "GenAI", weeks: "Weeks 9–12", credential: "Foundations in Generative AI", provider: "IBM SkillsBuild", cost: "Free"},
  {stage: "GenAI", weeks: "Week 12", credential: "Large Language Models badge", provider: "Google for Developers", cost: "Free"},
  {stage: "Agentic AI", weeks: "Weeks 13–16", credential: "AI Agents — Applied Skills", provider: "Microsoft Learn", cost: "Free assessment where offered"},
  {stage: "Advanced agents", weeks: "Weeks 17–20", credential: "Agent orchestration — Applied Skills", provider: "Microsoft Learn", cost: "Free assessment where offered"},
  {stage: "Production", weeks: "Weeks 21–24", credential: "Production ML Systems badge", provider: "Google for Developers", cost: "Free"},
  {stage: "AI engineering", weeks: "Week 24", credential: "AI, data & cloud credentials", provider: "IBM SkillsBuild", cost: "Free"},
];

/* The narrative the ten credentials are meant to tell, in order. */
export const credentialNarrative = [
  "Developer",
  "ML Engineer",
  "GenAI Engineer",
  "Agent Engineer",
  "Production AI Engineer",
];

/* ────────────────────────────────────────────────────────────────────────────
   CONTACT / FOOTER
   ────────────────────────────────────────────────────────────────────────────
   The email and phone come from ORGANISATION in src/config/siteMeta.js, and the
   social rows are read out of the shared list in src/config/externalLinks.js —
   the same source the main site footer and the mobile drawer use.

   This block used to hand-type its own values instead, and every one of them was
   wrong: a placeholder phone number (+91 80000 00000), an admissions@ address
   that exists nowhere else on the site, three social rows pointing at #contact
   rather than the profile, a YouTube channel and a GitHub org for accounts that
   have never existed. Reading the shared config is what stops the two footers
   from drifting apart again.

   A blank href in externalLinks.js means "no account, do not render" — so the
   missing YouTube and X profiles simply drop out of this list instead of
   shipping a dead link. `value` is display text only; the href is what matters,
   and it can no longer be wrong. */
const telHref = (number) => `tel:+${number.replace(/\D/g, "")}`;

const SOCIAL_CHANNELS = {
  linkedin: {label: "LinkedIn", value: "CareerVeda", icon: Briefcase},
  instagram: {label: "Instagram", value: "@_careerveda_", icon: Camera},
  facebook: {label: "Facebook", value: "CareerVeda", icon: Users},
};

export const contactChannels = [
  {label: "Email", value: ORGANISATION.email, href: `mailto:${ORGANISATION.email}`, icon: Mail},
  {label: "Call", value: "+91 92178 01191", href: telHref(ORGANISATION.telephone), icon: Phone},
  ...socialLinks
    .filter((link) => SOCIAL_CHANNELS[link.id])
    .map((link) => ({
      ...SOCIAL_CHANNELS[link.id],
      href: link.href,
      external: true,
    })),
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