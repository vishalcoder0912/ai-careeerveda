import {Bot, Code2, Cpu, Database, FolderKanban, GraduationCap, Map as MapIcon, Network, ShieldCheck, Trophy} from "lucide-react";
import {agentArt, buildProgramContent} from "./build";

const tl = (n) => `/images/timeline/tl-0${n}.jpg`;

// The cinematic page for the PG Program in AI Systems & Agentic AI Engineering.
export const aiSystemsContent = buildProgramContent("ai-systems-agentic-ai", {
  hero: {
    title: ["AI Systems &", "Agentic Engineering"],
    sub: "Engineer it. Ground it. Orchestrate it. Evaluate it. Run it — from the raw terminal to production agents.",
    badges: ["6 MONTHS", "28 MODULES", "LIVE ONLINE", "MULTI-AGENT SYSTEMS", "HACKATHON-FIRST", "LIFETIME PLACEMENT SUPPORT"],
  },

  timeline: {
    label: "A Journey from Code to Agents",
    title: ["The Making", "of an AI Systems Engineer"],
    chapters: [
      [0, 4, "Engineering Foundations", "The terminal, Python, clean design, DSA and a tested, dockerized AI API.", tl(1)],
      [5, 7, "Data, ML & Deep Learning", "SQL and analytics, statistics and ML, then PyTorch and transformer foundations.", tl(2)],
      [8, 11, "LLMs & RAG Engineering", "Foundation models, context engineering, vector search and a RAG system you can measure.", tl(3)],
      [12, 15, "Agent Engineering", "Agent loops, robust tools, durable memory and long-running planning agents.", tl(4)],
      [16, 19, "Multi-Agent & Interop", "Agent teams, evaluated frameworks, MCP and A2A, multimodal and computer-use agents.", tl(5)],
      [20, 27, "Production AI", "GPUs, fine-tuning, evals, security and LLMOps — then a flagship system and three hackathons.", tl(6)],
    ],
  },

  skills: {
    sub: "From clean code to autonomous systems in production — five domains, one engineering discipline.",
    tag: "Engineer · Architect · Operator",
    items: [
      ["Software Engineering", Code2, "Write the code an AI system stands on — tested, typed and deployed.", ["Python", "OOP", "DSA", "FastAPI", "Docker", "Git", "Testing"]],
      ["Data & Models", Database, "Understand the data and the models before you build on top of them.", ["SQL", "Statistics", "scikit-learn", "PyTorch", "Transformers", "LLMs", "Embeddings"]],
      ["RAG & Context", Network, "Feed models the right context, and prove retrieval works with metrics.", ["Prompting", "Structured Output", "Vector Search", "RAG", "Re-ranking", "Golden Sets", "RAG Evals"]],
      ["Agents & Orchestration", Bot, "Build agents that plan, use tools, remember and work as a team.", ["Tool Calling", "Memory", "Planning", "Multi-Agent", "LangGraph", "MCP", "A2A"]],
      ["Production & Safety", ShieldCheck, "Serve, tune, evaluate, secure and pay for AI at production scale.", ["GPUs", "vLLM", "Fine-Tuning", "Evals", "Guardrails", "LLMOps", "MLOps"]],
    ],
  },

  quote: {
    lines: ["DEMOS IMPRESS.", "SYSTEMS DELIVER.", "GOOD ENGINEERS", "SHIP BOTH."],
    cite: "— the AI systems engineer’s credo",
  },

  architecture: {
    title: ["The AI Systems", "Engineering Stack"],
    sub: "Nine layers, built in order — each one a foundation for the next.",
    layers: [
      ["Engineering Base", "Terminal → Python → OOP → DSA → tested APIs"],
      ["Data & Analytics", "SQL → BI dashboards → statistics → ML foundations"],
      ["Deep Learning", "PyTorch → training curves → transformers"],
      ["LLM Engineering", "Foundation models → prompts → context → structured generation"],
      ["Retrieval", "Embeddings → vector search → RAG → RAG evaluation"],
      ["Agents", "Agent loops → tools → memory → planning"],
      ["Multi-Agent Systems", "Agent teams → frameworks → MCP & A2A → computer use"],
      ["AI Infrastructure", "GPUs → serving → fine-tuning → cost engineering"],
      ["Production & Trust", "Evals → security & governance → LLMOps → MLOps"],
    ],
  },

  modules: {
    title: ["Five Stages.", {em: "Twenty-Eight Modules."}],
    sub: "One roadmap from the raw terminal to production agents — open a stage to see every module, topic and deliverable.",
    stages: [
      ["Engineering Foundations", "The terminal, Python, design patterns, DSA and a deployed AI API.", "Foundations", 0, 4],
      ["Models & Retrieval", "Data, ML, deep learning, LLMs, context engineering and RAG.", "Models", 5, 11],
      ["Agent Engineering", "Agents, tools, memory, planning, multi-agent teams and MCP.", "Agents", 12, 19],
      ["AI Infrastructure", "GPUs, fine-tuning, evaluation, security and LLMOps.", "Infra", 20, 24],
      ["Production & Launch", "MLOps, business value and three hackathon builds.", "Ship", 25, 27],
    ],
    art: {"01": "foundations", "02": "genai", "03": "agents", "04": "gear", "05": "production"},
  },

  system: {
    title: ["The Agentic", "System"],
    sub: "Everything an AI systems engineer connects — models, memory, tools and infrastructure — around one agent.",
    center: {title: "AI AGENT", sub: "plan · act · observe", art: agentArt("agent")},
    nodes: [
      ["USER", agentArt("user")],
      ["LLM", agentArt("llm")],
      ["RAG", agentArt("rag")],
      ["MEMORY", agentArt("memory")],
      ["TOOLS", agentArt("tools")],
      ["MULTI-AGENT", agentArt("multi-agent")],
      ["APIs", agentArt("api")],
      ["GPU", agentArt("gpu")],
      ["EVALS", agentArt("eval")],
      ["SECURITY", agentArt("security")],
    ],
  },

  workflow: {
    title: ["From Code", "to Agent"],
    lead: "Ten steps, one engineering loop — the order you learn to take an AI system from first commit to a monitored production agent.",
    pipeline: ["code", "data", "model", "context", "retrieve", "plan", "act", "evaluate", "secure", "operate"],
    steps: [
      ["Engineer", "Python, tests, APIs & containers"],
      ["Analyse", "SQL, statistics & data understanding"],
      ["Model", "ML, deep learning & foundation models"],
      ["Contextualise", "Prompts, context windows & structured output"],
      ["Retrieve", "Embeddings, vector search & RAG"],
      ["Plan", "Agent loops, memory & long-running tasks"],
      ["Orchestrate", "Tools, multi-agent teams, MCP & A2A"],
      ["Evaluate", "Golden datasets, scorecards & regressions"],
      ["Secure", "Guardrails, governance & red-teaming"],
      ["Operate", "GPUs, LLMOps, cost dashboards & CI/CD"],
    ],
  },

  projects: {
    items: [
      ["Dockerized AI API", ["FastAPI", "Docker", "Tests"], "A tested AI service, containerised and deployed from the terminal."],
      ["Production RAG Pipeline", ["Vector Search", "RAG", "Metrics"], "A retrieval pipeline with measured recall, precision and answer quality."],
      ["RAG Evaluation Report", ["Golden Set", "Failure Lab", "Evals"], "A golden dataset and failure analysis that shows where retrieval breaks."],
      ["Autonomous Planning Agent", ["Planning", "Memory", "Tools"], "A long-running agent that plans, remembers and recovers from tool failures."],
      ["Multi-Agent Team", ["Supervisor", "LangGraph", "Review"], "Agents that split a task, hand off work and ship a reviewable result."],
      ["Publishable MCP Server", ["MCP", "A2A", "Interop"], "An MCP server and an agent that talks to others across protocols."],
      ["GPU Benchmark Card", ["GPUs", "vLLM", "Fine-Tuning"], "Served-model benchmarks plus a domain-tuned model with cost and safety notes."],
      ["Flagship Production AI", ["LLMOps", "CI/CD", "Monitoring"], "A flagship AI system, deployed with monitoring, cost tracking and CI/CD."],
    ],
    categories: ["Engineering", "Retrieval", "Evaluation", "Agents", "Multi-Agent", "Agent Protocols", "Infrastructure", "Production"],
    sideLeft: ["Code", "Context", "Agents", "Real Impact"],
    sideRight: ["Foundation", "Orchestration", "Safety"],
    footLeft: "Real systems · real portfolio",
    footRight: "Ship the system, not just the demo",
  },

  careers: {
    lead: "The AI engineering roles this track opens — one role at a time.",
    roles: [
      ["AI Engineer", "Fresher", "LLMs · RAG · APIs", "Build and ship LLM features and retrieval pipelines.", ["Python", "FastAPI", "RAG", "Vector DBs", "Docker"]],
      ["Agentic AI Developer", "Fresher", "Agents · Tools · Memory", "Build agents that use tools and finish multi-step tasks.", ["Agents", "Tool Calling", "LangGraph", "Memory", "Testing"]],
      ["ML Engineer (Associate)", "Fresher", "Models · Training · Evaluation", "Train and evaluate models alongside senior ML engineers.", ["PyTorch", "scikit-learn", "SQL", "Statistics", "Git"]],
      ["AI Backend Engineer", "Fresher", "Services · APIs · Data", "Build the services and data layers AI products run on.", ["Python", "APIs", "SQL", "Docker", "CI/CD"]],
      ["Agentic Systems Engineer", "Mid-level", "Multi-Agent · MCP · Orchestration", "Design multi-agent systems that coordinate across protocols.", ["Multi-Agent", "MCP", "A2A", "Planning", "Observability"]],
      ["LLM Engineer", "Mid-level", "Fine-Tuning · Serving · Quality", "Own model customisation, serving and quality for LLM products.", ["Fine-Tuning", "vLLM", "GPUs", "Evals", "Cost"]],
      ["AI Evaluation Engineer", "Mid-level", "Evals · Benchmarks · Regressions", "Build the eval harnesses that keep AI systems regression-safe.", ["Golden Sets", "Scorecards", "RAG Evals", "Python", "CI"]],
      ["LLMOps / MLOps Engineer", "Mid-level", "Deployment · Monitoring · Cost", "Run models in production with monitoring, CI/CD and cost control.", ["Kubernetes", "CI/CD", "Monitoring", "Cost Dashboards", "Cloud"]],
      ["Senior AI Systems Engineer", "Experienced", "Architecture · Reliability · Leadership", "Architect production AI systems and lead the team that runs them.", ["Architecture", "Security", "Governance", "Mentoring", "Strategy"]],
      ["AI Platform Architect", "Experienced", "Platforms · Infrastructure · Scale", "Design the AI platform an entire organisation builds on.", ["Platform Design", "GPUs", "Governance", "Cloud AI", "Leadership"]],
    ],
  },

  stats: {modulesNote: "terminal to production"},

  learning: {
    title: ["Learn.", "Build. Operate."],
    projects: "Every module ships a tested, working AI build",
    items: [
      ["GPU & Hackathon Labs", "GPU-enabled labs and three hackathon builds", Cpu],
      ["AI Interview Mastery", "AI system design, coding rounds and mock interviews", Trophy],
    ],
  },

  certs: {
    certificates: [
      ["PG-AIS-01", "PG Program in AI Systems & Agentic AI Engineering", "Agents · RAG · Production", "program", "Engineer AI systems end to end — from tested code and RAG to multi-agent platforms in production.", ["Agents", "RAG", "Evals", "LLMOps"]],
      ["PG-AISI-02", "AI Systems Internship", "RAG · Agents · GPU Optimisation", "Internship program", "Real-world AI systems work — production RAG and agent builds, GPU optimisation and multi-agent delivery.", ["RAG", "Agents", "GPUs", "Security"]],
      ["PG-AISR-03", "Responsible AI Engineering & Communication", "Design · Ethics · Collaboration", "Soft-skills program", "Explain AI systems clearly, run blameless incident reviews and engineer responsibly.", ["Communication", "System Design", "Ethics", "Collaboration"]],
    ],
    proofPillars: [
      ["Credential", "Program, internship and responsible-engineering certificates, issued on completion.", GraduationCap],
      ["Deliverables", "39+ builds — RAG pipelines, agents, an MCP server and a flagship system.", FolderKanban],
      ["Portfolio", "Every build in one GitHub portfolio a hiring manager can run.", MapIcon],
    ],
    note: "A portfolio your future team can run — systems, agents and evals you can point to.",
  },

  cta: {word: "Your AI Systems", sub: "From the raw terminal to production agents."},
  footer: "Intelligent Systems.",
});
