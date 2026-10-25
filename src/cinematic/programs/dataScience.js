import {Bot, Brain, Code2, Cpu, FolderKanban, GraduationCap, LineChart, Map as MapIcon, ShieldCheck, Trophy} from "lucide-react";
import {agentArt, art, buildProgramContent} from "./build";

const tl = (n) => `/images/timeline/tl-0${n}.jpg`;
const da = (name) => `/images/data-analytics/${name}.jpg`;

// The cinematic page for the PG Program in Data Science with Generative AI.
export const dataScienceContent = buildProgramContent("data-science-ai", {
  hero: {
    title: ["Data Science", "& Gen AI"],
    sub: "Explore it. Model it. Predict it. Generate it. Deploy it — from statistics to production AI.",
    badges: ["12 MONTHS", "21 MODULES", "LIVE ONLINE", "ML · DL · GEN AI", "CAPSTONE PROJECT", "LIFETIME PLACEMENT SUPPORT"],
  },

  timeline: {
    label: "A Journey from Data to Intelligence",
    title: ["The Making", "of a Data Scientist"],
    chapters: [
      [1, 3, "Python & Statistics", "The data science landscape, Python for data and the statistics every model rests on.", da("da8-python")],
      [4, 5, "Features & Exploration", "Wrangling, feature engineering and exploratory analysis that finds the signal.", da("da10-eda")],
      [6, 10, "Machine Learning", "Regression, classification, ensembles, unsupervised learning and time-series forecasting.", da("da18-predictive")],
      [11, 13, "Deep Learning", "Neural networks, then computer vision and natural language processing.", tl(2)],
      [14, 16, "LLMs, Gen AI & Agents", "Large language models, Gen AI applications and agentic AI systems.", tl(3)],
      [17, 21, "Scale, Ship & Capstone", "SQL and big data, MLOps and responsible AI — then a capstone and career prep.", tl(6)],
    ],
  },

  skills: {
    sub: "From a hypothesis to a model in production — five domains, one data science discipline.",
    tag: "Scientist · Modeler · Engineer",
    items: [
      ["Python & Statistics", Code2, "The language and the maths of data science, used with rigour.", ["Python", "NumPy", "pandas", "Probability", "Inference", "Feature Engineering", "EDA"]],
      ["Machine Learning", LineChart, "Train, tune and evaluate models that hold up on unseen data.", ["Regression", "Classification", "XGBoost", "Clustering", "Time Series", "Cross-Validation", "scikit-learn"]],
      ["Deep Learning", Brain, "Neural networks that see images and understand language.", ["Neural Nets", "PyTorch", "CNNs", "Computer Vision", "NLP", "Transformers", "Transfer Learning"]],
      ["Gen AI & Agents", Bot, "Put large language models and agents to work on real problems.", ["LLMs", "Prompting", "RAG", "Embeddings", "Agents", "LangChain", "Fine-Tuning"]],
      ["MLOps & Responsible AI", ShieldCheck, "Ship models to production and keep them fair, monitored and governed.", ["SQL", "Spark", "MLflow", "Docker", "Deployment", "Monitoring", "Model Governance"]],
    ],
  },

  quote: {
    lines: ["DATA HOLDS", "THE PATTERN.", "GOOD SCIENTISTS", "PROVE IT."],
    cite: "— the data scientist’s credo",
  },

  architecture: {
    title: ["The Data", "Science Stack"],
    sub: "Nine layers, built in order — each one a foundation for the next.",
    layers: [
      ["Python", "Python → NumPy → pandas → notebooks"],
      ["Statistics", "Probability → distributions → inference → experiments"],
      ["Data Preparation", "Wrangling → feature engineering → EDA → visualisation"],
      ["Supervised Learning", "Regression → classification → ensembles → tuning"],
      ["Unsupervised & Time Series", "Clustering → dimensionality reduction → forecasting"],
      ["Deep Learning", "Neural networks → computer vision → NLP"],
      ["Gen AI", "LLMs → Gen AI applications → agentic systems"],
      ["Data at Scale", "SQL → big data → distributed processing"],
      ["Production & Governance", "MLOps → deployment → monitoring → responsible AI"],
    ],
  },

  modules: {
    title: ["Five Stages.", {em: "Twenty-One Modules."}],
    sub: "One roadmap from statistics to production AI — open a stage to see every module and topic.",
    stages: [
      ["Foundations", "Data science, Python, statistics, feature engineering and EDA.", "Foundations", 1, 5],
      ["Machine Learning", "Regression, classification, ensembles, clustering and forecasting.", "ML", 6, 10],
      ["Deep Learning", "Neural networks, computer vision and NLP.", "DL", 11, 13],
      ["Gen AI & Agents", "LLMs, Gen AI applications and agentic AI systems.", "Gen AI", 14, 16],
      ["Scale & Launch", "Big data, MLOps, responsible AI, the capstone and career readiness.", "Ship", 17, 21],
    ],
    art: {"01": "foundations", "02": "data", "03": "labs", "04": "genai", "05": "production"},
  },

  system: {
    title: ["The Data", "Science System"],
    sub: "Everything a data scientist connects — data, models, compute and the business — around one model.",
    center: {title: "MODEL", sub: "learn · predict · improve", art: art("labs")},
    nodes: [
      ["BUSINESS", art("people")],
      ["DATA", art("data")],
      ["FEATURES", art("gear")],
      ["GPU", agentArt("gpu")],
      ["ML", art("target")],
      ["EXPERIMENTS", art("discover")],
      ["LLMs", agentArt("llm")],
      ["AGENTS", agentArt("agent")],
      ["DEEP LEARNING", art("bulb")],
      ["DEPLOY", art("production")],
    ],
  },

  workflow: {
    title: ["From Data", "to Model"],
    lead: "Ten steps, one modeling loop — the order you learn to take a business problem to a model running in production.",
    pipeline: ["problem", "data", "explore", "features", "train", "tune", "evaluate", "explain", "deploy", "monitor"],
    steps: [
      ["Frame", "Business problem & success metric"],
      ["Collect", "SQL, APIs & big data sources"],
      ["Explore", "EDA, statistics & visualisation"],
      ["Engineer", "Feature engineering & data wrangling"],
      ["Train", "ML, deep learning & LLM models"],
      ["Tune", "Hyperparameters, ensembles & fine-tuning"],
      ["Evaluate", "Cross-validation, metrics & error analysis"],
      ["Explain", "Interpretability & stakeholder storytelling"],
      ["Deploy", "MLflow, Docker & model serving"],
      ["Monitor", "Drift, fairness & model governance"],
    ],
  },

  projects: {
    items: [
      ["Statistical Analysis", ["Python", "Inference", "A/B Tests"], "Test a business hypothesis and report what the data really supports."],
      ["Churn Prediction", ["Classification", "XGBoost", "Features"], "Predict which customers will leave, and why."],
      ["Demand Forecast", ["Time Series", "Forecasting", "Evaluation"], "Forecast demand weeks ahead and measure the error honestly."],
      ["Customer Segmentation", ["Clustering", "PCA", "Profiling"], "Group customers by behaviour and give each segment a strategy."],
      ["Image Classifier", ["CNNs", "PyTorch", "Transfer Learning"], "A computer-vision model trained and evaluated on real images."],
      ["NLP Sentiment Engine", ["NLP", "Transformers", "Fine-Tuning"], "Read reviews at scale and score their sentiment."],
      ["RAG & Agent App", ["LLMs", "RAG", "Agents"], "A Gen AI assistant that answers from your data and takes actions."],
      ["Deployed ML Capstone", ["MLOps", "Docker", "Monitoring"], "A model in production — served, monitored and documented end to end."],
    ],
    categories: ["Statistics", "Classification", "Forecasting", "Clustering", "Computer Vision", "NLP", "Gen AI", "MLOps"],
    sideLeft: ["Data", "Models", "Predictions", "Real Impact"],
    sideRight: ["Learn", "Generate", "Deploy"],
    footLeft: "Real datasets · real portfolio",
    footRight: "Ship the model, not just the notebook",
  },

  careers: {
    lead: "The data science and AI roles this track opens — one role at a time.",
    roles: [
      ["Data Scientist", "Fresher", "Models · Experiments · Insight", "Build models and experiments that answer business questions.", ["Python", "Statistics", "scikit-learn", "SQL", "EDA"]],
      ["ML Engineer (Associate)", "Fresher", "Training · Pipelines · Deployment", "Train and package models alongside senior ML engineers.", ["Python", "PyTorch", "MLflow", "Docker", "Git"]],
      ["AI Engineer", "Fresher", "LLMs · RAG · Apps", "Build Gen AI features on top of large language models.", ["LLMs", "RAG", "Python", "APIs", "Vector DBs"]],
      ["Data Analyst", "Fresher", "SQL · Analysis · Dashboards", "Analyse data and report what it means for the business.", ["SQL", "Python", "Statistics", "Visualisation", "Excel"]],
      ["Senior Data Scientist", "Mid-level", "Modeling · Strategy · Impact", "Own modeling for a product area and its measured impact.", ["ML", "Experimentation", "Causal Inference", "Storytelling", "Mentoring"]],
      ["ML Engineer", "Mid-level", "Production · Scale · Reliability", "Run models in production reliably and at scale.", ["MLOps", "Kubernetes", "Feature Stores", "Monitoring", "Spark"]],
      ["NLP Engineer", "Mid-level", "Language · Transformers · LLMs", "Build language understanding and generation into products.", ["NLP", "Transformers", "Fine-Tuning", "RAG", "Evaluation"]],
      ["Computer Vision Engineer", "Mid-level", "Vision · Deep Learning · Edge", "Build models that detect, classify and track from images and video.", ["CNNs", "PyTorch", "OpenCV", "Detection", "Deployment"]],
      ["Lead Data Scientist", "Experienced", "Teams · Roadmaps · Research", "Lead a data science team and its research roadmap.", ["Leadership", "ML Strategy", "Research", "Governance", "Hiring"]],
      ["AI / ML Architect", "Experienced", "Platforms · Governance · Scale", "Design the ML and Gen AI platform an organisation runs on.", ["Platform Design", "MLOps", "Gen AI", "Responsible AI", "Cloud"]],
    ],
  },

  stats: {modulesNote: "statistics to capstone"},

  learning: {
    title: ["Learn.", "Model. Deploy."],
    projects: "Every module ships a real model or analysis",
    items: [
      ["GPU-Backed Labs", "Deep learning and Gen AI labs on real compute", Cpu],
      ["Data Science Interview Mastery", "ML theory, coding rounds, case studies and mock interviews", Trophy],
    ],
  },

  certs: {
    certificates: [
      ["PG-DS-01", "PG Program in Data Science with Generative AI", "ML · Deep Learning · Gen AI", "program", "Take a problem from data to a deployed model — statistics, ML, deep learning, Gen AI and MLOps.", ["ML", "Deep Learning", "Gen AI", "MLOps"]],
      ["PG-DSI-02", "Data Science & AI Internship", "Models · RAG · Deployment", "Internship program", "Real-world ML work — model development cycles, LLM and RAG builds, agentic workflows and deployment.", ["ML", "LLMs", "Agents", "Deployment"]],
      ["PG-DSC-03", "Scientific Thinking & Communication", "Framing · Explaining · Research", "Soft-skills program", "Frame problems scientifically, explain models to non-technical people and keep learning from research.", ["Communication", "Problem Framing", "Research", "Presentation"]],
    ],
    proofPillars: [
      ["Credential", "Program, internship and communication certificates, issued on completion.", GraduationCap],
      ["Deliverables", "A churn model, a forecast, a vision model and a deployed capstone — real work, not quizzes.", FolderKanban],
      ["Portfolio", "Every model in one GitHub portfolio a hiring manager can run.", MapIcon],
    ],
    note: "A portfolio your future team can run — models, notebooks and deployments you can point to.",
  },

  cta: {word: "Your Data Science", sub: "From statistics to production AI."},
  footer: "With Data & AI.",
});
