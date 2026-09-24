// Generates a single tall poster image that shows the entire "PG Program in
// AI Systems & Agentic AI Engineering" — hero, architecture, all 28 modules,
// flagships, portfolio, week map, tracks, stack, signature model, positioning.
//
// Renders a self-contained HTML file (fonts inlined as data URIs) headlessly
// with Playwright Chromium and screenshots the full page to poster/*.png.
//
//   node scripts/generate-program-poster.mjs

import {readFile, writeFile, mkdir} from "node:fs/promises";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "poster", "AI-Systems-Agentic-Engineering-poster.png");
const tmp = join(root, "poster");
const fonts = ["manrope-var-latin", "manrope-var-latin-ext", "inter-var-latin", "inter-var-latin-ext"];

const fontFace = async () => {
  const parts = [];
  for (const name of fonts) {
    const buf = await readFile(join(root, "public", "fonts", `${name}.woff2`));
    const meta = name.startsWith("manrope") ? {fam: "\x27Manrope\x27", w: "200 800"} : {fam: "\x27Inter\x27", w: "100 900"};
    parts.push(`@font-face{font-family:${meta.fam};font-style:normal;font-weight:${meta.w};font-display:block;src:url(data:font/woff2;base64,${buf.toString("base64")}) format("woff2");}`);
  }
  return parts.join("\n");
};

/* ------------------------------------------------------------------ data */

const MODULES = [
  {
    id: "M00",
    title: "Engineering Bridge",
    weeks: "Week 0 · Pre-course",
    phase: "Foundations",
    topics: [
      "Computer fundamentals", "Linux command line", "VS Code", "Git / GitHub basics",
      "Python environment setup", "Virtual environments", "Package management",
      "APIs & JSON", "Basic math for AI", "Linear algebra fundamentals", "Probability fundamentals",
    ],
    project: "Outcome: Clone → Run → Debug → Commit → Push",
  },
  {
    id: "M01",
    title: "Python for AI Engineering",
    weeks: "Week 1",
    phase: "Foundations",
    topics: [
      "Python foundations: variables, types, operators, conditionals, loops, functions",
      "Utilities: strings, lists, tuples, sets, dicts, comprehensions, modules & packages",
      "File handling: JSON, CSV, exceptions",
      "Engineering Python: type hints, logging, config, env vars, dependency management, CLI apps",
      "AI-oriented: NumPy, Pandas introduction, data processing, API integration",
    ],
    project: "P01 — Python Automation & Data Toolkit",
  },
  {
    id: "M02",
    title: "OOP & Software Design",
    weeks: "Week 2",
    phase: "Foundations",
    topics: [
      "OOP: classes, objects, constructors, inheritance, encapsulation, polymorphism, abstraction",
      "Composition, abstract classes, interfaces / protocols, dependency injection",
      "Architecture: SOLID, modular design, service layer, repository, factory, strategy, configuration",
      "Engineering quality: clean code, code review, documentation, testing principles",
    ],
    project: "P02 — Modular Document Processing Engine",
  },
  {
    id: "M03",
    title: "DSA & AI Problem Solving",
    weeks: "Week 3",
    phase: "Foundations",
    topics: [
      "Core: arrays, strings, hash maps, sets, stacks, queues, linked lists, trees, heaps, graphs, recursion",
      "Algorithms: searching, sorting, two pointers, sliding window, BFS, DFS, complexity analysis",
      "AI applications: search, ranking, retrieval, priority queues, caching, graph traversal",
      "Agent state graphs, task queues, memory retrieval",
    ],
    project: "P03 — Search & Ranking Engine",
    note: "DSA continues continuously through all 24 weeks.",
  },
  {
    id: "M04",
    title: "Backend & AI Software Engineering",
    weeks: "Week 4",
    phase: "Foundations",
    topics: [
      "Backend: HTTP, REST, JSON, API architecture, authentication, authorization",
      "FastAPI, Pydantic, async Python, asyncio, concurrency, background workers, WebSockets",
      "Databases: PostgreSQL, design, transactions, indexing, connection pooling",
      "Redis & caching · Testing: pytest, unit, integration, API tests",
      "Containerization: Docker, Dockerfile, Docker Compose, environment management",
    ],
    project: "P04 — Production AI API · auth + database + cache + logging + tests + Docker + docs",
  },
  {
    id: "M05",
    title: "SQL, Data Analytics & Business Intelligence",
    weeks: "Week 5",
    phase: "Data & ML",
    topics: [
      "SQL: SELECT, filtering, aggregation, GROUP BY / HAVING, JOINs, subqueries, CTEs, window functions, CASE, views, indexes",
      "Data analytics: cleaning, missing values, outliers, grouping, time-series analysis",
      "Business analytics: KPI design, revenue, customer & cohort analysis, segmentation, root-cause analysis",
      "Visualization: Matplotlib, Plotly, interactive dashboards",
    ],
    project: "P05 — Business Intelligence Command Center",
  },
  {
    id: "M06",
    title: "Statistics, Data Science & Machine Learning",
    weeks: "Weeks 6–7",
    phase: "Data & ML",
    topics: [
      "Statistics: descriptive stats, probability, distributions, sampling, correlation, inference, hypothesis testing",
      "Data science: EDA, feature engineering, preprocessing, train/val/test, data leakage, baselines, experiment tracking",
      "Machine learning: linear & logistic regression, decision trees, random forest, gradient boosting",
      "Classification, regression, clustering · Evaluation: accuracy, precision, recall, F1, ROC-AUC, MAE, MSE, RMSE",
    ],
    project: "P06 — Predictive Business Intelligence System",
  },
  {
    id: "M07",
    title: "Deep Learning & Transformer Foundations",
    weeks: "Week 8",
    phase: "Data & ML",
    topics: [
      "Deep learning: neural networks, layers, activations, loss functions, backpropagation, optimization, regularization",
      "CNN & RNN concepts, representation learning",
      "Transformers: tokenization, embeddings, positional encoding, self-attention, multi-head attention",
      "Encoder, decoder, causal language modeling, transformer blocks",
      "Modern: foundation models, reasoning models, Mixture of Experts, small language models, multimodal",
    ],
    project: "P07 — Attention From Scratch",
  },
  {
    id: "M08",
    title: "LLM Engineering & Foundation Models",
    weeks: "Week 9",
    phase: "Data & ML",
    topics: [
      "Models: open-source vs proprietary, model families, size, context windows, inference needs",
      "Latency, cost, privacy, licensing, model selection",
      "LLM parameters: temperature, top-p, token limits, sampling, context management",
      "Interfaces: API models, local models, Hugging Face, Ollama, OpenAI-compatible APIs",
    ],
    project: "P08 — LLM Model Benchmark · quality, latency, tokens, cost, reliability",
  },
  {
    id: "M09",
    title: "Prompt, Context & Structured Generation Engineering",
    weeks: "Week 10",
    phase: "GenAI & RAG",
    topics: [
      "Prompting: zero-shot, few-shot, system instructions, role & example prompting, decomposition, chaining",
      "Structured generation: JSON Schema, structured outputs, function calling, tool schemas",
      "Context engineering: selection, compression, boundaries, long-context strategies, versioning, regression testing",
      "Advanced: reflection, self-consistency, critique, program-aided prompting, prompt optimization",
      "Safety: prompt injection, instruction conflicts, guardrails",
    ],
    project: "P09 — Enterprise Information Extraction Agent",
  },
  {
    id: "M10",
    title: "Embeddings, Vector Search & RAG Engineering",
    weeks: "Weeks 11–12",
    phase: "GenAI & RAG",
    topics: [
      "Embeddings: semantic representations, cosine similarity, dot product, distance functions",
      "Vector databases: FAISS, Qdrant, Chroma, vector indexes, metadata filtering",
      "Retrieval: top-K, dense, sparse, hybrid search, reranking",
      "RAG architecture: ingestion, parsing, cleaning, chunking, metadata, retrieval, reranking, context, generation, citations",
      "Advanced RAG: query rewriting, multi-query, contextual compression, hierarchical, parent-child, GraphRAG, knowledge graphs",
    ],
    project: "P10 — Production Enterprise Knowledge Copilot · auth + citations + evaluation + caching + Docker + deploy",
  },
  {
    id: "M11",
    title: "RAG Evaluation & Knowledge Systems",
    weeks: "Integrated · Wks 11–12",
    phase: "GenAI & RAG",
    topics: [
      "Retrieval evaluation: Recall@K, Precision@K, MRR, NDCG",
      "Generation evaluation: faithfulness, groundedness, relevance, completeness, correctness",
      "Evaluation systems: golden datasets, regression testing, human & automated evaluation, benchmarks",
      "Failure Lab — students intentionally create bad chunks, irrelevant retrieval, outdated docs, missing context, hallucinations & citation errors, then fix them",
    ],
    project: "P11 — RAG Evaluation & Failure Lab",
  },
  {
    id: "M12",
    title: "Agent Engineering Fundamentals",
    weeks: "Week 13",
    phase: "Agentic AI",
    topics: [
      "LLM application vs Agent: input → LLM → output, versus goal → observe → plan → tool → act → evaluate",
      "Agent loop, ReAct, tool calling, function calling, state, planning, reasoning",
      "Termination, reflection, retry, checkpoints",
      "Deterministic workflow vs agentic workflow vs hybrid workflow — and when not to use an agent",
    ],
    project: "P12 — Tool-Using Research Agent",
  },
  {
    id: "M13",
    title: "Tool Engineering & Agent Runtime",
    weeks: "Week 14",
    phase: "Agentic AI",
    topics: [
      "Tools: schemas, JSON Schema, input & output validation, discovery, versioning",
      "Reliability: retry, timeout, fallback, circuit breaker, parallel tool calls",
      "Security: tool permissions, authentication, least privilege, sandboxing",
      "Executions: Python, web, database, search, file and API tools",
    ],
    project: "P13 — Five-Tool Autonomous Research Agent · evaluated on 20 benchmark tasks → task completion rate",
  },
  {
    id: "M14",
    title: "Agent Memory & State Engineering",
    weeks: "Week 15",
    phase: "Agentic AI",
    topics: [
      "Memory types: working, in-context, semantic, episodic, structured, persistent",
      "Infrastructure: Redis, PostgreSQL, vector DB",
      "Memory lifecycle: retrieval, update, compression, relevance, forgetting, privacy, memory poisoning",
      "State: agent state, persistent state, checkpoints, resume, human state transitions",
    ],
    project: "P14 — Persistent Personal Agent",
  },
  {
    id: "M15",
    title: "Planning, Reasoning & Long-Running Agents",
    weeks: "Week 16",
    phase: "Agentic AI",
    topics: [
      "Planning: task decomposition, plan-and-execute, dynamic replanning, dependencies, constraints, parallel execution, plan verification",
      "Long-running agents: checkpointing, resume, state persistence, background execution",
      "Human approval, pause / resume, error recovery",
      "Advanced reasoning: reflection, critic, judge, verification, self-correction",
    ],
    project: "P15 — Autonomous Data Analyst",
  },
  {
    id: "M16",
    title: "Multi-Agent Systems",
    weeks: "Week 17",
    phase: "Multi-Agent",
    topics: [
      "Architectures: supervisor, sequential, pipeline, hierarchical, router, parallel, peer-to-peer, debate, critic / judge",
      "Coordination: agent handoffs, shared state, context boundaries, result aggregation, failure propagation",
      "Governance: permission boundaries, agent identity, capability restrictions, human approval",
    ],
    project: "P16 — Multi-Agent Enterprise Research Platform",
  },
  {
    id: "M17",
    title: "Agent Framework Engineering",
    weeks: "Week 18",
    phase: "Multi-Agent",
    topics: [
      "Frameworks: LangGraph, CrewAI, LlamaIndex, AutoGen-style orchestration, lightweight code-first agents",
      "Deep LangGraph: state, nodes, edges, conditional routing, persistence, human-in-the-loop, checkpointing",
      "Critical exercise: build one agent WITHOUT a framework, then rebuild it WITH one — document what abstraction the framework provides, what it simplified and hid, and when it should not be used",
    ],
    project: "P17 — Framework Comparison Project",
  },
  {
    id: "M18",
    title: "MCP, Agent Interoperability & A2A",
    weeks: "Week 19",
    phase: "Multi-Agent",
    topics: [
      "MCP: client / server architecture, tools, resources, prompts, discovery, permissions, authorization, context boundaries, secure tool exposure",
      "A2A: agent identity, discovery, capability descriptions, task delegation, agent communication, structured handoffs",
      "Artifacts, task lifecycle, streaming, remote agents — without exposing internal state, memory or tools",
    ],
    project: "P17b — MCP Enterprise Agent · Supervisor → MCP → CRM DB / knowledge base → agents & tools",
  },
  {
    id: "M19",
    title: "Multimodal & Computer-Use AI",
    weeks: "Week 20",
    phase: "Multi-Agent",
    topics: [
      "Vision-language models, image & document understanding, audio & speech AI",
      "Multimodal embeddings, image & video generation concepts, multimodal RAG",
      "Computer use: browser interaction, UI actions, screenshots, action verification",
      "Permission boundaries and human approval",
    ],
    project: "P18 — Multimodal Enterprise Intelligence Agent · PDF + image + chart + text + audio → evidence-backed analysis",
  },
  {
    id: "M20",
    title: "GPU & AI Infrastructure Engineering",
    weeks: "Weeks 21–22",
    phase: "GPU & Models",
    topics: [
      "GPU fundamentals: CPU vs GPU, CUDA, threads, blocks, warps, kernels, VRAM, memory bandwidth",
      "PyTorch GPU: CUDA tensors, GPU data loading & training, mixed precision FP32 / FP16 / BF16",
      "Optimization: batch size, memory, gradient accumulation, activation checkpointing",
      "Quantization: INT8, INT4, GPTQ & AWQ · Inference: KV cache, continuous batching, tokens/sec, TTFT, p50 / p95 latency",
      "Serving: vLLM, FastAPI, Docker, GPU containers, concurrency, load testing",
    ],
    project: "GPU LABS — A: Inference Optimization (FP32→FP16→INT8→INT4, measuring VRAM/latency/throughput/quality/cost) · B: QLoRA Fine-Tuning · C: Production LLM Serving (client→API→router→queue→vLLM→GPU→open model)",
  },
  {
    id: "M21",
    title: "LLM Fine-Tuning & Model Customization",
    weeks: "Integrated · M20",
    phase: "GPU & Models",
    topics: [
      "Dataset design, data cleaning, instruction datasets, train / validation splits",
      "Fine-tuning fundamentals: PEFT, LoRA, QLoRA, adapters, checkpoints, hyperparameters",
      "Evaluation, model merging · Required comparison: Prompting vs RAG vs Fine-Tuning — justify the architecture choice",
    ],
    project: "QLoRA Fine-Tuning Lab → evaluated model",
  },
  {
    id: "M22",
    title: "AI Evaluation Engineering",
    weeks: "Week 23",
    phase: "Production AI",
    topics: [
      "LLM: accuracy, relevance, groundedness, faithfulness, hallucination",
      "RAG: retrieval & generation metrics, citation correctness",
      "Agent: task completion, tool correctness, plan quality, recovery rate, trajectory evaluation",
      "Production: latency p50 / p95 / p99, cost per request, token usage, error rate, reliability",
      "Infrastructure: golden datasets, regression suites, human & automated evaluation, benchmark pipelines",
    ],
    project: "P19 — AI Evaluation Platform",
  },
  {
    id: "M23",
    title: "AI Security, Governance & Responsible AI",
    weeks: "Integrated · Wks 22–23",
    phase: "Production AI",
    topics: [
      "Agent attacks: direct & indirect prompt injection, tool poisoning, malicious documents & web content, data leakage, memory poisoning, excessive permissions, unsafe code execution",
      "Defenses: guardrails, input & output filtering, least privilege, tool permissioning, sandboxing, allowlists, approval gates, audit logs, kill switches",
      "Enterprise governance: data privacy, access control, auditability, human oversight, model governance, AI risk management",
    ],
    project: "P20 — AI Red-Team & Security Lab · BUILD → ATTACK → PATCH → RETEST → REGRESSION",
  },
  {
    id: "M24",
    title: "LLMOps, Observability & AI Cost Engineering",
    weeks: "Week 23",
    phase: "Production AI",
    topics: [
      "Observability: logs, metrics, traces, spans, agent trajectories, tool calls, token usage",
      "Monitoring: success & failure rate, latency, p95, cost, model performance",
      "Tools: Langfuse, LangSmith, Prometheus, Grafana, OpenTelemetry concepts",
      "Cost engineering: model routing, prompt & context optimization, semantic / response caching, token budgets, agent iteration limits, GPU utilization, cost per task",
    ],
    project: "P21 — AI Observability & Cost Dashboard",
  },
  {
    id: "M25",
    title: "Production AI Engineering & MLOps",
    weeks: "Week 24 + continuous",
    phase: "Production AI",
    topics: [
      "Application engineering: FastAPI, PostgreSQL, Redis, queues, workers, async architecture",
      "Docker & CI/CD: GitHub Actions, automated tests, build & deployment pipelines, rollback",
      "Cloud (GCP): Compute Engine, Cloud Run, Cloud Storage, IAM, networking, secrets, logging, monitoring",
      "Reliability: retry, exponential backoff, timeout, rate limiting, circuit breakers, idempotency, checkpointing, graceful shutdown",
      "Scaling: queues, workers, horizontal scaling, caching, connection pooling",
      "Deployment gate: environment, API, agent, RAG, database, security, monitoring, scaling, recovery, testing, documentation",
    ],
    project: "Flagship deployment gate → production system",
  },
  {
    id: "M26",
    title: "AI Product Engineering & Business Value",
    weeks: "Months 3–6",
    phase: "Product & Hackathon",
    topics: [
      "Product: problem discovery, user personas, jobs-to-be-done, AI use-case identification & suitability, workflow redesign, human-in-the-loop",
      "Architecture decisions — students defend: why this model? RAG? agent? multi-agent? GPU? database? deployment architecture?",
      "Business: ROI, cost savings, productivity impact, risk reduction, implementation cost, AI adoption",
    ],
    project: "Deliverable — AI Product Case Study + ROI Report",
  },
  {
    id: "M27",
    title: "Hackathon Engineering",
    weeks: "Months 2–6",
    phase: "Product & Hackathon",
    topics: [
      "Hackathon 01 — Data / ML (Week 8): dataset → EDA → ML → evaluation → submission",
      "Hackathon 02 — GenAI / Agent (Week 16): problem → research → RAG / agent → MVP → demo → pitch",
      "Hackathon 03 — Production AI (Week 24): problem → architecture → multi-agent → GPU → security → evaluation → deployment → pitch",
      "Methodology: problem → user → pain point → AI opportunity → architecture → MVP → implementation → testing → evaluation → security → deployment → demo → pitch → technical defense",
    ],
    project: "3 graded hackathons across the program",
  },
];

const WEEKMAP = [
  ["01", "Python Engineering", "Automation Toolkit"],
  ["02", "OOP & Software Design", "Document Engine"],
  ["03", "DSA", "Search Engine"],
  ["04", "Backend & Docker", "AI API"],
  ["05", "SQL + Analytics", "BI System"],
  ["06", "Statistics + Data Science", "Analytics Lab"],
  ["07", "Machine Learning", "Predictive System"],
  ["08", "ML + Deep Learning", "ML Competition"],
  ["09", "Transformers + LLMs", "Attention"],
  ["10", "Prompt + Context Engineering", "Extraction Agent"],
  ["11", "Embeddings + Vector Search", "Semantic Search"],
  ["12", "RAG + Evaluation", "Enterprise RAG"],
  ["13", "Agent Fundamentals", "Research Agent"],
  ["14", "Tool Engineering", "Tool Agent"],
  ["15", "Memory Engineering", "Persistent Agent"],
  ["16", "Planning + Data Agents", "Autonomous Data Analyst + Hackathon"],
  ["17", "Multi-Agent Systems", "Multi-Agent Platform"],
  ["18", "Agent Framework Engineering", "Framework Comparison"],
  ["19", "MCP + A2A", "Enterprise MCP Agent"],
  ["20", "Multimodal AI", "Multimodal Agent"],
  ["21", "GPU + CUDA", "GPU Benchmark"],
  ["22", "Fine-Tuning + Inference", "QLoRA + Serving"],
  ["23", "Security + Evaluation + Observability", "Production AI Lab"],
  ["24", "Cloud + CI/CD + Grand Hackathon", "Flagship Production AI"],
];

const TRACKS = [
  ["DSA", "Weeks 1–24"],
  ["Git / GitHub", "Weeks 1–24"],
  ["Python", "Weeks 1–24"],
  ["Project Building", "Weeks 1–24"],
  ["AI Evaluation", "Weeks 11–24"],
  ["Security", "Weeks 10–24"],
  ["Cloud / Deployment", "Weeks 4–24"],
  ["Hackathon Training", "Weeks 8–24"],
  ["AI Product / Business", "Weeks 9–24"],
];

const PORTFOLIO = [
  ["Software", [1, 2, 3, 4, 5].map((n) => ({n, t: ["Python project", "OOP project", "DSA / search project", "FastAPI backend", "Dockerized application"][n - 1]}))],
  ["Data", [6, 7, 8, 9, 10].map((n) => ({n, t: ["SQL project", "Analytics dashboard", "Statistics project", "Data science project", "ML system"][n - 1]}))],
  ["GenAI", [11, 12, 13, 14, 15, 16].map((n) => ({n, t: ["Attention from scratch", "Model benchmark", "Prompt engineering system", "Semantic search", "Enterprise RAG", "RAG evaluation"][n - 1]}))],
  ["Agentic AI", [17, 18, 19, 20, 21, 22, 23].map((n) => ({n, t: ["Tool agent", "Memory agent", "Planning agent", "Autonomous Data Analyst", "Multi-Agent system", "MCP system", "A2A interoperability lab"][n - 1]}))],
  ["GPU / Model", [24, 25, 26, 27, 28].map((n) => ({n, t: ["GPU benchmark", "CUDA optimization", "LLM inference optimization", "QLoRA fine-tuning", "Production LLM serving"][n - 1]}))],
  ["Production", [29, 30, 31, 32, 33, 34].map((n) => ({n, t: ["AI evaluation platform", "Security / red-team lab", "Observability dashboard", "Cost optimization system", "CI/CD pipeline", "Cloud deployment"][n - 1]}))],
  ["Hackathon", [35, 36, 37].map((n) => ({n, t: ["ML competition", "AI / Agent hackathon", "Production grand hackathon"][n - 1]}))],
  ["Flagship", [38, 39].map((n) => ({n, t: ["Private Enterprise AI Platform", "Autonomous Business Intelligence Platform"][n - 1]}))],
];

const STACK = [
  ["PRODUCT", "Problem-First Engineering"],
  ["PROBLEM", "Discovery & Scoping"],
  ["DATA", "SQL · Analytics · Pipelines"],
  ["ML", "Models · Metrics · Features"],
  ["LLMs", "Foundation Models · Prompting"],
  ["RAG", "Retrieval · Context · Citations"],
  ["AGENTS", "Tools · Memory · Planning"],
  ["MULTI-AGENTS", "Orchestration · Handoffs"],
  ["MCP / A2A", "Interoperability"],
  ["MULTIMODAL", "Vision · Audio · Docs"],
  ["GPU / FINE-TUNING", "QLoRA · Quantization · Serving"],
  ["EVALUATION", "Golden Datasets · Metrics"],
  ["SECURITY", "Guardrails · Red-Team"],
  ["OBSERVABILITY", "Traces · Costs · Latency"],
  ["COST ENGINEERING", "Routing · Caching · Budgets"],
  ["MLOPS / CI-CD", "Pipelines · Rollbacks"],
  ["CLOUD", "GCP · Containers · Scale"],
  ["PRODUCTION", "Reliability · Monitoring"],
  ["HACKATHON", "Ship · Demo · Defense"],
];

const SIGMODEL = [
  ["CODE", "Python + OOP + DSA"],
  ["UNDERSTAND", "Data + ML + LLMs"],
  ["BUILD", "RAG + Agents + Multi-Agent"],
  ["CONNECT", "Tools + MCP + A2A"],
  ["ACCELERATE", "GPU + Quantization + Fine-Tuning"],
  ["BREAK", "Failure Testing + Red Teaming"],
  ["MEASURE", "Evaluation + Observability"],
  ["OPTIMIZE", "Cost + Latency + Reliability"],
  ["DEPLOY", "Docker + CI/CD + Cloud"],
  ["PROVE", "ROI + Portfolio + Technical Defense"],
];

const ARCH = [
  ["FOUNDATIONS", "Python → OOP → DSA → Software Engineering"],
  ["DATA & ML", "SQL → Analytics → Statistics → Data Science → ML → DL"],
  ["GENERATIVE AI", "Transformers → LLMs → Prompting → Embeddings → RAG"],
  ["AGENTIC AI", "Tools → Memory → Planning → Reasoning → Code Agents"],
  ["ADVANCED AGENTS", "Multi-Agent → MCP → A2A → Long-Running Workflows"],
  ["MODEL ENGINEERING", "Fine-Tuning → LoRA → QLoRA → GPU → Quantization"],
  ["PRODUCTION AI", "Evaluation → Security → Observability → Cost → MLOps"],
  ["DEPLOYMENT", "Docker → CI/CD → Cloud → Scaling → Reliability"],
  ["HACKATHON", "Real Problem → MVP → Production System → Technical Defense"],
];

const PHASE_COLOR = {
  "Foundations": "#2563eb",
  "Data & ML": "#0e7490",
  "GenAI & RAG": "#7c3aed",
  "Agentic AI": "#ea580c",
  "Multi-Agent": "#d97706",
  "GPU & Models": "#0891b2",
  "Production AI": "#dc2626",
  "Product & Hackathon": "#f97316",
};

/* ---------------------------------------------------------------- markup */

const chip = (t) => `<span class="chip">${t}</span>`;

const moduleRow = (m) => `
  <div class="mod-row">
    <div class="mod-rail" style="--pc:${PHASE_COLOR[m.phase] || "#1d5fd3"}">
      <div class="mod-id">${m.id}</div>
      <div class="mod-phase">${m.phase}</div>
      <div class="mod-weeks">${m.weeks}</div>
    </div>
    <div class="mod-mid">
      <div class="mod-title">${m.title}</div>
      <div class="mod-tags">${m.topics.map(chip).join("")}</div>
      ${m.note ? `<div class="mod-note">${m.note}</div>` : ""}
    </div>
    <div class="mod-build">
      <div class="build-label">BUILD</div>
      <div class="build-name">${m.project}</div>
    </div>
  </div>`;

const html = (css) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>CareerVeda — PG Program in AI Systems &amp; Agentic AI Engineering</title>
<style>
${css}
</style>
</head>
<body>
  <div class="page">

    <!-- top brand bar -->
    <div class="topbar">
      <div class="brand">
        <span class="mark">CV</span>
        <div>
          <div class="a">CareerVeda</div>
          <div class="b">Learn. Analyze. Lead.</div>
        </div>
      </div>
      <div class="bar-chips">
        <span>Program Studio · Engineering Track</span>
        <span class="hot">Admissions Open</span>
      </div>
    </div>

    <!-- hero -->
    <header class="hero">
      <div class="eyebrow">6-MONTH PROFESSIONAL PROGRAM</div>
      <h1>AI Systems &amp; <span>Agentic AI Engineering</span></h1>
      <p class="promise">Build AI. Break AI. <span>Measure AI.</span> Secure AI. Deploy AI.</p>
      <div class="hero-chips">
        <span>24 Weeks · 6 Months</span><span>Project-Driven</span><span>GPU-Enabled</span>
        <span>Production-Oriented</span><span>Hackathon-First</span><span>Hiring-Ready</span>
      </div>
      <div class="progression">
        <span>Python</span><i>→</i><span>Data</span><i>→</i><span>ML</span><i>→</i><span>GenAI</span><i>→</i><span>RAG</span><i>→</i><span>Agents</span><i>→</i><span>Multi-Agent</span><i>→</i><span>MCP / A2A</span><i>→</i><span>GPU</span><i>→</i><span>Production</span><i>→</i><span>Hackathon</span>
      </div>
      <div class="hero-stats">
        <div><b>28</b><span>Modules (00–27)</span></div>
        <div><b>24</b><span>Week Delivery Map</span></div>
        <div><b>21+</b><span>Build Projects</span></div>
        <div><b>3</b><span>GPU Labs + 3 Hackathons</span></div>
        <div><b>39</b><span>Portfolio Projects</span></div>
        <div><b>2</b><span>Flagship Platforms</span></div>
      </div>
    </header>

    <!-- architecture -->
    <section class="sec">
      <div class="sec-label">PROGRAM ARCHITECTURE</div>
      <h2>One complete AI systems stack</h2>
      <p class="lead">Engineering-first, production-grade and hackathon-final — the curriculum is a single pipeline from bare Python to shipped AI systems.</p>
      <div class="arch">
        ${ARCH.map(([t, d], i) => `
          <div class="arch-row">
            <div class="arch-num">${String(i + 1).padStart(2, "0")}</div>
            <div class="arch-t">${t}</div>
            <div class="arch-d">${d}</div>
          </div>`).join("")}
      </div>
    </section>

    <!-- curriculum -->
    <section class="sec">
      <div class="sec-label">CURRICULUM</div>
      <h2>28 modules · from product thinker to AI systems engineer</h2>
      <p class="lead">Every module ends in a working build you keep — 21 build projects plus three GPU labs and three hackathons across the 24 weeks.</p>
      <div class="modules">
        ${MODULES.map(moduleRow).join("")}
      </div>
    </section>

    <!-- flagship projects -->
    <section class="sec">
      <div class="sec-label">FINAL FLAGSHIP PROJECTS</div>
      <h2>Two production capstones</h2>
      <div class="flag-grid">
        <div class="flag">
          <div class="flag-num">FLAGSHIP 01</div>
          <div class="flag-title">Private Enterprise AI Platform</div>
          <div class="flag-tech">${["LLM", "RAG", "Multi-Agent", "MCP", "Private / open model", "GPU", "Security", "Observability", "Cloud"].map(chip).join("")}</div>
          <div class="flag-flow">User → Authentication → API Gateway → Agent Orchestrator → RAG → MCP Tools → Private GPU Model → Evaluation → Security → Observability → Production</div>
        </div>
        <div class="flag">
          <div class="flag-num">FLAGSHIP 02</div>
          <div class="flag-title">Autonomous Business Intelligence Platform</div>
          <div class="flag-tech">${["SQL", "Data Analytics", "Statistics", "Machine Learning", "RAG", "Agents", "Multi-Agent", "GPU", "Evaluation", "Business ROI"].map(chip).join("")}</div>
          <div class="flag-flow">Business Data → SQL → Data Analysis → ML → Planner → SQL / Python / ML Agents → Business Analyst → GPU Reasoning → Critic → Human Approval → Executive Report</div>
        </div>
      </div>
    </section>

    <!-- portfolio -->
    <section class="sec">
      <div class="sec-label">FINAL STUDENT PORTFOLIO</div>
      <h2>39 artifacts every graduate ships</h2>
      <div class="pf-grid">
        ${PORTFOLIO.map(([group, items]) => `
          <div class="pf-card">
            <div class="pf-head">${group} <b>${items.length}</b></div>
            <ol>${items.map((it) => `<li><span>${String(it.n).padStart(2, "0")}</span>${it.t}</li>`).join("")}</ol>
          </div>`).join("")}
      </div>
    </section>

    <!-- week map -->
    <section class="sec">
      <div class="sec-label">THE 24-WEEK DELIVERY MAP</div>
      <h2>Week by week, build by build</h2>
      <table class="weekmap">
        <thead><tr><th>Week</th><th>Core Module</th><th>Major Build</th></tr></thead>
        <tbody>
          ${WEEKMAP.map(([wk, mod, build]) => `<tr><td>${wk}</td><td>${mod}</td><td>${build}</td></tr>`).join("")}
        </tbody>
      </table>
    </section>

    <!-- continuous tracks -->
    <section class="sec">
      <div class="sec-label">THE CONTINUOUS TRACKS</div>
      <h2>Skills that never stop</h2>
      <div class="tracks">
        ${TRACKS.map(([t, w]) => `<div class="track"><b>${t}</b><span>${w}</span></div>`).join("")}
      </div>
    </section>

    <!-- final stack -->
    <section class="sec">
      <div class="sec-label">THE CAREERVEDA ENGINEER PROFILE</div>
      <h2>AI Systems Engineer · full stack</h2>
      <div class="stack">
        ${STACK.map(([t, d], i) => `
          <div class="stack-row">
            <div class="stack-num">${i + 1}</div>
            <div class="stack-t">${t}</div>
            <div class="stack-d">${d}</div>
            ${i < STACK.length - 1 ? `<i class="stack-arrow">↓</i>` : ""}
          </div>`).join("")}
      </div>
    </section>

    <!-- signature model -->
    <section class="sec">
      <div class="sec-label">CAREERVEDA SIGNATURE MODEL</div>
      <h2>From code to proof in ten moves</h2>
      <div class="sig">
        ${SIGMODEL.map(([t, d], i) => `
          <div class="sig-step">
            <div class="sig-order">${String(i + 1).padStart(2, "0")}</div>
            <div class="sig-t">${t}</div>
            <div class="sig-d">${d}</div>
          </div>`).join("")}
      </div>
    </section>

    <!-- positioning / promise -->
    <section class="cta">
      <div class="cta-rule">DO NOT POSITION AS A “GENERATIVE AI COURSE” OR A “GENTIC AI COURSE” ALONE</div>
      <div class="cta-name">6-MONTH PROFESSIONAL PROGRAM IN<br/><em>AI Systems &amp; Agentic AI Engineering</em></div>
      <p class="cta-pro">Build AI. Break AI. Measure AI. Secure AI. Deploy AI.</p>
      <div class="cta-who">The graduate can move end-to-end: Python → Data → ML → GenAI → RAG → Agents → Multi-Agent → MCP / A2A → GPU → Production → Hackathon</div>
    </section>

    <!-- footer -->
    <footer class="foot">CareerVeda · Learn. Analyze. Lead. — Empowering learners worldwide to achieve career excellence</footer>

  </div>
</body>
</html>`;

/* ------------------------------------------------------------------ css */

const css = `
:root{
  --navy:#10183f; --navy-deep:#0b102b; --ink:#102a5c; --ink2:#33486b; --muted:#64748b;
  --blue:#1d5fd3; --orange:#f97316; --orange-d:#ea580c; --amber:#fb923c;
  --line:#e6ebf4; --soft:#f4f7fd;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#eef2f9;font-family:'Inter',sans-serif;color:#0f1b33;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.page{width:1740px;margin:0 auto;background:#ffffff}

/* top bar */
.topbar{display:flex;align-items:center;justify-content:space-between;padding:26px 56px;background:var(--navy-deep)}
.brand{display:flex;align-items:center;gap:16px}
.mark{width:52px;height:52px;border-radius:12px;display:grid;place-items:center;font-family:'Manrope';font-weight:800;color:#fff;
  background:linear-gradient(135deg,var(--blue),var(--orange-d));font-size:20px;letter-spacing:.04em}
.brand .a{font-family:'Manrope';font-weight:800;font-size:24px;color:#fff;letter-spacing:.01em}
.brand .b{font-size:13px;color:#aebcf0;letter-spacing:.22em;text-transform:uppercase;margin-top:2px}
.bar-chips{display:flex;gap:10px}
.bar-chips span{font-size:13px;border:1px solid rgba(255,255,255,.22);color:#dfe7ff;border-radius:999px;padding:8px 16px;letter-spacing:.05em}
.bar-chips .hot{background:linear-gradient(135deg,var(--orange),var(--orange-d));border-color:transparent;color:#fff;font-weight:700}

/* hero */
.hero{background:radial-gradient(100% 120% at 80% 0%,rgba(29,95,211,.42) 0%,rgba(29,95,211,0) 46%),radial-gradient(60% 90% at 92% 18%,rgba(249,115,22,.28) 0%,rgba(249,115,22,0) 55%),linear-gradient(135deg,#10183f 0%,#162153 54%,#0b102b 100%);
  color:#fff;padding:64px 56px 60px}
.eyebrow{font-size:15px;letter-spacing:.34em;color:var(--amber);font-weight:800;margin-bottom:22px}
.hero h1{font-family:'Manrope';font-weight:800;font-size:78px;line-height:1;letter-spacing:-.02em}
.hero h1 span{display:block;color:var(--amber);text-shadow:0 0 80px rgba(249,115,22,.45)}
.promise{font-family:'Manrope';font-weight:700;font-size:26px;margin:28px 0 26px;color:#fff;letter-spacing:.01em}
.promise span{color:var(--amber)}
.hero-chips{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:30px}
.hero-chips span{font-size:14px;font-weight:600;border:1px solid rgba(255,255,255,.26);color:#e8eeff;border-radius:999px;padding:10px 18px;background:rgba(255,255,255,.06)}
.progression{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;padding:16px 20px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(255,255,255,.05)}
.progression span{font-family:'Manrope';font-weight:700;font-size:15px;letter-spacing:.04em}
.progression i{color:var(--amber);font-style:normal;font-size:16px}
.hero-stats{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-top:30px}
.hero-stats div{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:16px;text-align:center}
.hero-stats b{font-family:'Manrope';font-weight:800;font-size:34px;display:block;color:var(--amber)}
.hero-stats span{font-size:12.5px;color:#c9d3f5;margin-top:4px;display:block}

/* sections */
.sec{padding:54px 56px 60px;border-bottom:1px solid var(--line)}
.sec-label{font-size:13px;font-weight:800;letter-spacing:.3em;color:var(--orange);margin-bottom:14px}
h2{font-family:'Manrope';font-weight:800;font-size:38px;color:var(--ink);letter-spacing:-.02em;line-height:1.08}
.lead{color:var(--muted);font-size:16px;max-width:1100px;margin:14px 0 30px;line-height:1.6}

/* architecture */
.arch{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.arch-row{position:relative;background:linear-gradient(160deg,#ffffff,#f6f9ff);border:1px solid var(--line);border-radius:14px;padding:18px 18px 18px 60px}
.arch-num{position:absolute;left:16px;top:18px;font-family:'Manrope';font-weight:800;font-size:22px;color:var(--blue)}
.arch-t{font-family:'Manrope';font-weight:800;font-size:16px;color:var(--ink);letter-spacing:.01em}
.arch-d{font-size:13px;color:var(--muted);margin-top:6px;line-height:1.5}

/* modules */
.modules{display:flex;flex-direction:column}
.mod-row{display:grid;grid-template-columns:230px 1fr 330px;gap:24px;padding:20px 24px 20px 0;border-bottom:1px solid var(--line)}
.mod-row:last-child{border-bottom:0}
.mod-rail{border-left:5px solid var(--pc);padding-left:18px;align-self:center}
.mod-id{font-family:'Manrope';font-weight:800;font-size:26px;color:var(--ink);letter-spacing:.02em}
.mod-phase{font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--pc);margin-top:4px}
.mod-weeks{font-size:12.5px;color:var(--muted);margin-top:6px;font-weight:600}
.mod-mid{align-self:center}
.mod-title{font-family:'Manrope';font-weight:800;font-size:19px;color:var(--ink);margin-bottom:10px}
.mod-tags{display:flex;flex-wrap:wrap;gap:6px}
.chip{font-size:10.6px;font-weight:500;color:#1e3a8a;background:var(--soft);border:1px solid #dbe4f6;border-radius:999px;padding:4px 9px;line-height:1.4}
.mod-note{margin-top:10px;font-size:12.5px;font-weight:600;color:var(--orange-d)}
.mod-build{align-self:center;background:#fff7f0;border:1px solid #fbd9bd;border-left:4px solid var(--orange);border-radius:12px;padding:14px 16px}
.build-label{font-size:10px;font-weight:800;letter-spacing:.26em;color:var(--orange-d);margin-bottom:6px}
.build-name{font-family:'Manrope';font-weight:700;font-size:13.5px;color:#9a3412;line-height:1.5}

/* flagships */
.flag-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:26px}
.flag{background:linear-gradient(165deg,#ffffff,#f6f9ff);border:1px solid var(--line);border-top:5px solid var(--orange);border-radius:16px;padding:26px;box-shadow:0 24px 50px -34px rgba(16,24,64,.35)}
.flag-num{font-size:11px;font-weight:800;letter-spacing:.3em;color:var(--orange-d)}
.flag-title{font-family:'Manrope';font-weight:800;font-size:22px;color:var(--ink);margin:8px 0 14px}
.flag-tech{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.flag-flow{font-size:13px;color:var(--ink2);line-height:1.7;padding:14px 16px;background:#fff;border:1px dashed #cdd8f0;border-radius:10px}

/* portfolio */
.pf-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:26px}
.pf-card{background:var(--soft);border:1px solid var(--line);border-radius:14px;padding:18px}
.pf-head{font-family:'Manrope';font-weight:800;font-size:15px;color:var(--ink);display:flex;justify-content:space-between;margin-bottom:10px}
.pf-head b{color:var(--orange);font-size:13px;background:#fff;border:1px solid #fbd9bd;border-radius:999px;padding:2px 10px}
.pf-card ol{list-style:none;display:flex;flex-direction:column;gap:8px}
.pf-card li{font-size:12.5px;color:var(--ink2);display:flex;gap:8px;align-items:baseline;line-height:1.4}
.pf-card li span{font-family:'Manrope';font-weight:700;font-size:11px;color:var(--blue);flex:0 0 22px}

/* week map */
.weekmap{width:100%;border-collapse:collapse;margin-top:24px;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.weekmap thead th{background:var(--navy);color:#fff;font-family:'Manrope';font-weight:800;font-size:13.5px;letter-spacing:.06em;padding:13px 16px;text-align:left}
.weekmap td{padding:10.5px 16px;font-size:13.5px;color:var(--ink2);border-top:1px solid var(--line)}
.weekmap td:first-child{font-family:'Manrope';font-weight:800;color:var(--blue)}
.weekmap tr:nth-child(even) td{background:var(--soft)}

/* tracks */
.tracks{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:26px}
.track{display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px 18px}
.track b{font-family:'Manrope';font-weight:800;font-size:15px;color:var(--ink)}
.track span{font-size:12.5px;color:var(--orange-d);font-weight:700}

/* stack */
.stack{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:26px}
.stack-row{position:relative;background:linear-gradient(165deg,#ffffff,#f6f9ff);border:1px solid var(--line);border-radius:12px;padding:14px 14px 14px 48px}
.stack-num{position:absolute;left:14px;top:14px;font-family:'Manrope';font-weight:800;font-size:15px;color:var(--orange)}
.stack-t{font-family:'Manrope';font-weight:800;font-size:13.5px;color:var(--ink);letter-spacing:.02em}
.stack-d{font-size:11px;color:var(--muted);margin-top:3px}

/* signature model */
.sig{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:26px}
.sig-step{background:#fff7f0;border:1px solid #fbd9bd;border-radius:12px;padding:16px 14px;text-align:center;min-height:120px}
.sig-order{font-family:'Manrope';font-weight:800;font-size:13px;color:var(--orange-d)}
.sig-t{font-family:'Manrope';font-weight:800;font-size:15px;color:var(--ink);margin:8px 0 6px;letter-spacing:.04em}
.sig-d{font-size:11px;color:var(--muted);line-height:1.5}

/* cta */
.cta{background:radial-gradient(80% 120% at 85% 0%,rgba(249,115,22,.24) 0%,rgba(249,115,22,0) 40%),radial-gradient(60% 100% at 10% 100%,rgba(29,95,211,.35) 0%,rgba(29,95,211,0) 55%),linear-gradient(135deg,#10183f 0%,#0b102b 70%);color:#fff;padding:70px 56px;text-align:center}
.cta-rule{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.24em;color:#c9d3f5;border:1px solid rgba(255,255,255,.24);border-radius:999px;padding:10px 20px;margin-bottom:26px}
.cta-name{font-family:'Manrope';font-weight:800;font-size:46px;line-height:1.12;letter-spacing:-.02em}
.cta-name em{color:var(--amber);font-style:normal;text-shadow:0 0 60px rgba(249,115,22,.4)}
.cta-pro{font-family:'Manrope';font-weight:700;font-size:22px;margin:24px 0 18px}
.cta-pro{color:var(--amber)}
.cta-who{font-size:15px;color:#c9d3f5;max-width:1060px;margin:0 auto;line-height:1.7}

/* footer */
.foot{background:var(--navy-deep);color:#93a4d4;text-align:center;padding:34px 56px;font-size:14px;letter-spacing:.06em}
`;

/* --------------------------------------------------------------- render */

const run = async () => {
  await mkdir(tmp, {recursive: true});
  const ff = await fontFace();
  const file = join(tmp, "poster.html");
  await writeFile(file, html(` ${ff} ${css}`));
  console.log(`[poster] html → ${file}`);

  const {chromium} = await import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1740, height: 1000}, deviceScaleFactor: 1.5});
  await page.goto(pathToFileURL(file).href, {waitUntil: "networkidle"});
  await page.evaluate(() => document.fonts.ready.then(() => undefined)); // eslint-disable-line no-undef
  await page.screenshot({path: OUT, fullPage: true, type: "png"});
  await browser.close();

  const {size} = await (await import("node:fs")).promises.stat(OUT);
  console.log(`[poster] png → ${OUT} (${(size / 1024 / 1024).toFixed(1)} MB)`);
};

run().catch((error) => {
  console.error("[poster]", error);
  process.exit(1);
});