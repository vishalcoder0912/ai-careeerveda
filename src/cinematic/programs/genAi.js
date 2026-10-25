import {Bot, Code2, Database, FolderKanban, GraduationCap, Map as MapIcon, ShieldCheck, Sparkles, Trophy} from "lucide-react";
import {agentArt, art, buildProgramContent} from "./build";

const tl = (n) => `/images/timeline/tl-0${n}.jpg`;

// The cinematic page for the PG Program in GEN AI.
export const genAiProgramContent = buildProgramContent("gen-ai", {
  hero: {
    title: ["Generative", "AI"],
    sub: "Prompt it. Ground it. Tune it. Ship it. Trust it — from your first model to a production Gen AI app.",
    badges: ["6 MONTHS", "16 MODULES", "LIVE ONLINE", "LLM APPS & RAG", "CAPSTONE PROJECT", "LIFETIME PLACEMENT SUPPORT"],
  },

  timeline: {
    label: "A Journey from Models to Products",
    title: ["The Making", "of a Gen AI Engineer"],
    chapters: [
      [1, 3, "Foundations", "The Gen AI landscape, Python for AI and the deep learning every model is built on.", tl(1)],
      [4, 5, "Language & LLMs", "NLP foundations, then transformers and how large language models really work.", tl(2)],
      [6, 7, "Prompts & LLM Apps", "Prompt engineering and LLM APIs — models turned into features, with token costs tracked.", tl(3)],
      [8, 10, "Retrieval & Tuning", "Embeddings, vector databases, grounded RAG and a model fine-tuned to your domain.", tl(5)],
      [11, 12, "Multimodal & Agents", "Image, audio and multimodal generation, then agents that use tools inside guardrails.", tl(4)],
      [13, 16, "Ship, Secure & Launch", "LLMOps, evaluation and safe Gen AI — then a production capstone and a job-ready portfolio.", tl(6)],
    ],
  },

  skills: {
    sub: "From a first neural network to a deployed Gen AI product — five domains, one engineering discipline.",
    tag: "Prompter · Builder · Shipper",
    items: [
      ["Python & Deep Learning", Code2, "The code and the maths under every model — written, trained and understood.", ["Python", "NumPy", "PyTorch", "Neural Nets", "NLP", "Tokenisation", "Transformers"]],
      ["LLMs & Prompting", Sparkles, "Make a language model do exactly what the product needs, every time.", ["GPT", "Claude", "Llama", "Prompt Patterns", "Structured Output", "LLM APIs", "Token Costs"]],
      ["RAG & Fine-Tuning", Database, "Ground answers in your data, and tune a model when prompting is not enough.", ["Embeddings", "Vector DBs", "Semantic Search", "RAG", "LoRA", "Fine-Tuning", "Evals"]],
      ["Agents & Multimodal", Bot, "Go beyond chat — agents that act, and models that see, hear and draw.", ["Agents", "Tool Calling", "LangChain", "Diffusion", "Speech", "Vision", "Automation"]],
      ["LLMOps & Responsible AI", ShieldCheck, "Deploy, monitor and secure Gen AI so people can trust what it says.", ["FastAPI", "Docker", "Monitoring", "Guardrails", "Red-Teaming", "Safety", "Cost Control"]],
    ],
  },

  quote: {
    lines: ["GOOD PROMPTS", "GET ANSWERS.", "GOOD SYSTEMS", "EARN TRUST."],
    cite: "— the Gen AI builder’s credo",
  },

  architecture: {
    title: ["The Gen AI", "Engineering Stack"],
    sub: "Eight layers, built in order — each one a foundation for the next.",
    layers: [
      ["Python & Maths", "Python → NumPy → probability → model intuition"],
      ["Deep Learning", "Neural networks → training → PyTorch → evaluation"],
      ["Language Models", "NLP → transformers → attention → LLM families"],
      ["Prompt Engineering", "Prompt patterns → structured output → prompt libraries"],
      ["LLM Applications", "LLM APIs → app components → token and cost tracking"],
      ["Retrieval & Tuning", "Embeddings → vector databases → RAG → fine-tuning"],
      ["Agents & Multimodal", "Tool use → agent loops → image, audio and video generation"],
      ["LLMOps & Safety", "Deployment → monitoring → evaluation → guardrails"],
    ],
  },

  modules: {
    title: ["Five Stages.", {em: "Sixteen Modules."}],
    sub: "One roadmap from Python to a production Gen AI app — open a stage to see every module, topic and deliverable.",
    stages: [
      ["Foundations", "The Gen AI landscape, Python and deep learning essentials.", "Foundations", 1, 3],
      ["Language Models", "NLP, transformers, prompt engineering and LLM APIs.", "LLMs", 4, 7],
      ["Retrieval & Tuning", "Embeddings, vector search, RAG and fine-tuning.", "RAG", 8, 10],
      ["Multimodal & Agents", "Image, audio and multimodal generation, then agentic automation.", "Agents", 11, 12],
      ["Ship & Launch", "LLMOps, responsible AI, the capstone and career readiness.", "Ship", 13, 16],
    ],
    art: {"01": "foundations", "02": "genai", "03": "data", "04": "agents", "05": "production"},
  },

  system: {
    title: ["The Gen AI", "System"],
    sub: "Everything a Gen AI engineer connects — data, models, tools and guardrails — around one LLM application.",
    center: {title: "GEN AI", sub: "prompt · ground · generate", art: agentArt("llm")},
    nodes: [
      ["USER", agentArt("user")],
      ["PROMPTS", art("memo")],
      ["LLM", agentArt("llm")],
      ["TOOLS", agentArt("tools")],
      ["VECTOR DB", agentArt("rag")],
      ["EMBEDDINGS", art("data")],
      ["AGENTS", agentArt("agent")],
      ["EVALS", agentArt("eval")],
      ["GUARDRAILS", agentArt("security")],
      ["DEPLOY", art("production")],
    ],
  },

  workflow: {
    title: ["From Prompt", "to Product"],
    lead: "Ten steps, one build loop — the order you learn to take a Gen AI idea from a first prompt to a deployed, trusted app.",
    pipeline: ["idea", "data", "prompt", "model", "retrieve", "tune", "act", "evaluate", "secure", "ship"],
    steps: [
      ["Frame", "Use case, users & success metrics"],
      ["Prepare", "Data collection, cleaning & chunking"],
      ["Prompt", "Prompt patterns & structured output"],
      ["Choose", "Open vs closed models & cost trade-offs"],
      ["Ground", "Embeddings, vector search & RAG"],
      ["Tune", "Fine-tuning & model customisation"],
      ["Act", "Agents, tool calling & automation"],
      ["Evaluate", "Golden sets, evals & hallucination checks"],
      ["Secure", "Guardrails, red-teaming & safety reviews"],
      ["Ship", "APIs, deployment, monitoring & logs"],
    ],
  },

  projects: {
    items: [
      ["Prompt Library", ["Prompting", "Structured Output", "Evals"], "A reusable library of tested prompts, with evaluation notes for each."],
      ["LLM Chat App", ["LLM APIs", "Streaming", "Token Costs"], "A chat product on a hosted LLM, with streaming responses and cost tracking."],
      ["Semantic Search Engine", ["Embeddings", "Vector DB", "Ranking"], "Search a document set by meaning, not keywords, with ranked results."],
      ["Enterprise RAG Assistant", ["RAG", "Chunking", "Citations"], "A grounded assistant that answers from company documents and cites its sources."],
      ["Fine-Tuned Domain Model", ["LoRA", "Datasets", "Evaluation"], "A model tuned on a domain dataset, benchmarked against the base model."],
      ["Multimodal Studio", ["Diffusion", "Speech", "Vision"], "Generate and transform images and audio from one creative workflow."],
      ["Agentic Automation", ["Agents", "Tools", "Guardrails"], "An agent that completes a multi-step business task with tools and safety limits."],
      ["Production Gen AI App", ["FastAPI", "Docker", "Monitoring"], "The capstone — a packaged, monitored Gen AI app deployed end to end."],
    ],
    categories: ["Prompting", "LLM Apps", "Search", "Retrieval", "Fine-Tuning", "Multimodal", "Agents", "Production"],
    sideLeft: ["Prompts", "Models", "Products", "Real Impact"],
    sideRight: ["Foundation", "Retrieval", "Safety"],
    footLeft: "Real builds · real portfolio",
    footRight: "Ship the model, not just the notebook",
  },

  careers: {
    lead: "The Gen AI roles this track opens — one role at a time.",
    roles: [
      ["Gen AI Engineer", "Fresher", "LLMs · RAG · Apps", "Build LLM features and RAG pipelines into real products.", ["Python", "LLM APIs", "RAG", "Vector DBs", "FastAPI"]],
      ["Prompt Engineer", "Fresher", "Prompts · Evals · Output", "Design, test and maintain the prompts a product depends on.", ["Prompting", "Evals", "Structured Output", "Python", "Docs"]],
      ["AI Application Developer", "Fresher", "APIs · Integration · UX", "Wire models into apps users can actually rely on.", ["LLM APIs", "Python", "REST", "Streaming", "Testing"]],
      ["Junior ML Engineer", "Fresher", "Models · Training · Data", "Train, evaluate and package models alongside senior engineers.", ["PyTorch", "NumPy", "Training", "Evaluation", "Git"]],
      ["Applied AI Specialist", "Mid-level", "Use Cases · Delivery · Value", "Turn business problems into Gen AI solutions that ship.", ["Use-Case Design", "RAG", "Agents", "Stakeholders", "ROI"]],
      ["LLM Engineer", "Mid-level", "Fine-Tuning · Retrieval · Scale", "Own retrieval, fine-tuning and model quality for an LLM product.", ["Fine-Tuning", "LoRA", "RAG", "Evals", "GPUs"]],
      ["Conversational AI Engineer", "Mid-level", "Assistants · Dialogue · Voice", "Build assistants and voice bots that hold a useful conversation.", ["Dialogue Design", "Speech", "LLMs", "Memory", "Analytics"]],
      ["LLMOps Engineer", "Mid-level", "Deployment · Monitoring · Cost", "Deploy, monitor and control the cost of models in production.", ["Docker", "CI/CD", "Monitoring", "Cost Control", "Cloud"]],
      ["Senior Gen AI Engineer", "Experienced", "Architecture · Quality · Leadership", "Architect Gen AI systems and lead the engineers who build them.", ["Architecture", "Evals", "Security", "Mentoring", "Strategy"]],
      ["AI Solutions Architect", "Experienced", "Platforms · Strategy · Scale", "Design enterprise AI platforms and guide adoption across teams.", ["Solution Design", "Cloud AI", "Governance", "Pre-Sales", "Leadership"]],
    ],
  },

  stats: {modulesNote: "foundations to capstone"},

  learning: {
    title: ["Learn.", "Build. Ship."],
    projects: "Every module ships a working Gen AI build",
    items: [
      ["GPU-Backed Labs", "Hands-on labs for training, tuning and serving models", Sparkles],
      ["AI Interview Mastery", "Gen AI system design, coding rounds and mock interviews", Trophy],
    ],
  },

  certs: {
    certificates: [
      ["PG-GAI-01", "PG Program in GEN AI", "LLMs · RAG · Deployment", "program", "Build and ship Gen AI products — prompting, RAG, fine-tuning, agents and LLMOps, end to end.", ["LLMs", "RAG", "Fine-Tuning", "LLMOps"]],
      ["PG-GAII-02", "Gen AI Internship", "LLM Apps · Optimisation · Deployment", "Internship program", "Real-world AI implementation — LLM application development, model optimisation and production deployment.", ["LLM Apps", "Optimisation", "R&D", "Deployment"]],
      ["PG-GAIR-03", "Responsible AI & Communication", "Ethics · Presentation · Collaboration", "Soft-skills program", "Present AI work clearly, collaborate in agile teams and practise ethical, responsible AI.", ["Communication", "Ethics", "Agile", "Presentation"]],
    ],
    proofPillars: [
      ["Credential", "Program, internship and responsible-AI certificates, issued on completion.", GraduationCap],
      ["Deliverables", "A RAG assistant, a tuned model, an agent and a deployed app — real builds, not quizzes.", FolderKanban],
      ["Portfolio", "Every build in one GitHub portfolio a hiring manager can run.", MapIcon],
    ],
    note: "A portfolio your future team can run — prompts, pipelines and apps you can point to.",
  },

  cta: {word: "Your Gen AI", sub: "From your first prompt to a production Gen AI app."},
  footer: "With Gen AI.",
});
