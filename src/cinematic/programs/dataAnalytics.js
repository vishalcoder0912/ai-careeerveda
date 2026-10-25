import {BarChart3, Code2, Database, FolderKanban, GraduationCap, LineChart, Map as MapIcon, Sheet, Sparkles, Trophy} from "lucide-react";
import {agentArt, art, buildProgramContent} from "./build";

// The cinematic page for the PG Program in Data Analytics with Generative AI.
export const dataAnalyticsContent = buildProgramContent("data-analytics", {
  hero: {
    title: ["Data", "Analytics"],
    sub: "Collect it. Clean it. Query it. Visualise it. Explain it — from messy data to insight people act on.",
    badges: ["6 MONTHS", "21 MODULES", "LIVE ONLINE", "AI-ASSISTED ANALYTICS", "CAPSTONE PROJECT", "LIFETIME PLACEMENT SUPPORT"],
  },

  timeline: {
    label: "A Journey from Data to Insight",
    title: ["The Making", "of a Data Analyst"],
    chapters: [
      [1, 3, "Excel & Analytics Foundations", "What analysts do, then Excel and Power Query for fast, repeatable analysis."],
      [4, 5, "Statistics & Data Wrangling", "The statistics behind every insight, then cleaning and wrangling messy data."],
      [6, 7, "SQL for Analytics", "From first SELECT to window functions and CTEs on real databases."],
      [8, 10, "Python & EDA", "Python, pandas and exploratory analysis — finding the story hidden in the data."],
      [11, 16, "Visualise & Tell the Story", "Visualisation principles, Power BI, DAX and Tableau, reporting workflows and data storytelling."],
      [17, 21, "Metrics, AI & Capstone", "Business metrics, predictive analysis and AI-assisted workflows — then a capstone and career prep."],
    ],
  },

  skills: {
    sub: "From a messy export to an insight people act on — five domains, one analytics discipline.",
    tag: "Analyst · Investigator · Storyteller",
    items: [
      ["Excel & Statistics", Sheet, "Fast analysis in spreadsheets, grounded in statistics you can defend.", ["Excel", "Power Query", "Pivot Tables", "Lookups", "Descriptive Stats", "Probability", "Hypothesis Tests"]],
      ["SQL", Database, "Ask the database exactly the right question — and get the answer fast.", ["SELECT", "Joins", "Aggregations", "Subqueries", "CTEs", "Window Functions", "Query Tuning"]],
      ["Python & EDA", Code2, "Clean, reshape and explore data at a scale spreadsheets cannot reach.", ["Python", "pandas", "NumPy", "Data Wrangling", "EDA", "Matplotlib", "Seaborn"]],
      ["BI & Storytelling", BarChart3, "Dashboards and narratives that turn numbers into the next decision.", ["Power BI", "DAX", "Tableau", "Visual Design", "Reporting", "Storytelling", "KPIs"]],
      ["Prediction & AI", Sparkles, "Look ahead with predictive models and work faster with AI assistants.", ["Regression", "Forecasting", "Root-Cause Analysis", "ChatGPT for Analysts", "AI Workflows", "Automation", "Metrics"]],
    ],
  },

  quote: {
    lines: ["NUMBERS DON’T", "SPEAK FOR THEMSELVES.", "GOOD ANALYSTS", "GIVE THEM A VOICE."],
    cite: "— the data analyst’s credo",
  },

  architecture: {
    title: ["The Data", "Analytics Stack"],
    sub: "Eight layers, built in order — each one a foundation for the next.",
    layers: [
      ["Analytics Foundations", "The analyst role → the analytics lifecycle → data types"],
      ["Spreadsheets", "Excel → formulas → pivot tables → Power Query"],
      ["Statistics", "Descriptive stats → probability → hypothesis testing"],
      ["Data Wrangling", "Cleaning → validation → reshaping → integrity checks"],
      ["SQL", "Queries → joins → CTEs → window functions"],
      ["Python & EDA", "Python → pandas → exploratory analysis"],
      ["Visualisation & BI", "Design principles → Power BI → DAX → Tableau → reporting"],
      ["Insight & AI", "Storytelling → business metrics → prediction → AI workflows"],
    ],
  },

  modules: {
    title: ["Five Stages.", {em: "Twenty-One Modules."}],
    sub: "One roadmap from Excel to AI-assisted analytics — open a stage to see every module and topic.",
    stages: [
      ["Foundations", "Data analytics, Excel, Power Query, statistics and data wrangling.", "Foundations", 1, 5],
      ["Query & Code", "SQL fundamentals, advanced SQL, Python and pandas.", "SQL", 6, 9],
      ["Explore & Visualise", "EDA, visualisation principles, Power BI, DAX and Tableau.", "Visualise", 10, 14],
      ["Report & Explain", "Reporting workflows, data storytelling and business metrics.", "Explain", 15, 17],
      ["Predict & Launch", "Predictive analysis, AI workflows, the capstone and career readiness.", "Launch", 18, 21],
    ],
    art: {"01": "foundations", "02": "data", "03": "design", "04": "megaphone", "05": "genai"},
  },

  system: {
    title: ["The Analytics", "System"],
    sub: "Everything a data analyst connects — sources, tools and the people who decide — around one insight.",
    center: {title: "INSIGHT", sub: "clean · explore · explain", art: art("bulb")},
    nodes: [
      ["STAKEHOLDERS", art("people")],
      ["QUESTIONS", art("discover")],
      ["RAW DATA", art("data")],
      ["SQL", agentArt("rag")],
      ["PYTHON", art("gear")],
      ["EXCEL", art("memo")],
      ["DASHBOARDS", art("design")],
      ["METRICS", art("target")],
      ["AI", art("genai")],
      ["STORY", art("megaphone")],
    ],
  },

  workflow: {
    title: ["From Data", "to Insight"],
    lead: "Ten steps, one analytics loop — the order you learn to take raw data to an insight people act on.",
    pipeline: ["ask", "collect", "clean", "query", "explore", "analyse", "visualise", "predict", "report", "act"],
    steps: [
      ["Ask", "Problem framing & the right question"],
      ["Collect", "Spreadsheets, databases & exports"],
      ["Clean", "Wrangling, validation & data integrity"],
      ["Query", "SQL joins, CTEs & window functions"],
      ["Explore", "pandas & exploratory data analysis"],
      ["Analyse", "Statistics, segments & root causes"],
      ["Visualise", "Power BI, DAX & Tableau"],
      ["Predict", "Regression & forecasting basics"],
      ["Report", "Dashboards & reporting workflows"],
      ["Act", "Storytelling, recommendations & follow-up"],
    ],
  },

  projects: {
    items: [
      ["Excel Sales Tracker", ["Excel", "Power Query", "Pivots"], "An automated tracker that refreshes from raw exports in one click."],
      ["Data Cleaning Pipeline", ["pandas", "Validation", "Integrity"], "Turn a messy real-world dataset into an analysis-ready table."],
      ["SQL Business Case", ["SQL", "CTEs", "Window Functions"], "Answer a company’s revenue and retention questions in SQL."],
      ["EDA Notebook", ["Python", "pandas", "Seaborn"], "An exploratory analysis that surfaces three findings worth acting on."],
      ["Power BI Report", ["Power BI", "DAX", "Data Model"], "An interactive report with drill-downs for every region and product."],
      ["Tableau Dashboard", ["Tableau", "Visual Design", "KPIs"], "A KPI dashboard designed for a five-second read."],
      ["Root-Cause Investigation", ["Metrics", "Segmentation", "Storytelling"], "Explain why a key metric dropped, and what to do about it."],
      ["Capstone Analytics Project", ["End-to-End", "AI Workflows", "Presentation"], "A full analysis from raw data to a stakeholder presentation."],
    ],
    categories: ["Spreadsheets", "Data Cleaning", "SQL", "Exploration", "Power BI", "Tableau", "Investigation", "Capstone"],
    sideLeft: ["Data", "Patterns", "Stories", "Real Impact"],
    sideRight: ["Clean", "Explore", "Explain"],
    footLeft: "Real datasets · real portfolio",
    footRight: "Find the insight, not just the chart",
  },

  careers: {
    lead: "The data roles this track opens — one role at a time.",
    roles: [
      ["Data Analyst", "Fresher", "SQL · Python · Dashboards", "Pull, clean and analyse data to answer business questions.", ["SQL", "Excel", "Python", "Power BI", "Statistics"]],
      ["BI Analyst", "Fresher", "Dashboards · Reports · KPIs", "Build the dashboards and reports teams check every day.", ["Power BI", "Tableau", "DAX", "SQL", "KPIs"]],
      ["Reporting Analyst", "Fresher", "Reports · Accuracy · Automation", "Own accurate, automated reporting for a business function.", ["Excel", "Power Query", "SQL", "Reporting", "Automation"]],
      ["Junior Data Scientist", "Fresher", "Python · Models · EDA", "Explore data and build first predictive models with senior support.", ["Python", "pandas", "EDA", "Regression", "Statistics"]],
      ["Senior Data Analyst", "Mid-level", "Analysis · Insight · Ownership", "Own analysis for a product or business area end to end.", ["Advanced SQL", "Python", "Storytelling", "Experiments", "Stakeholders"]],
      ["Visualisation Specialist", "Mid-level", "Design · BI · Storytelling", "Design dashboards and visual stories that leadership trusts.", ["Tableau", "Power BI", "Visual Design", "DAX", "UX"]],
      ["Product Analyst", "Mid-level", "Usage · Experiments · Growth", "Measure product usage and size the next opportunity.", ["SQL", "Cohorts", "Funnels", "A/B Tests", "Python"]],
      ["Operations Analyst", "Mid-level", "Processes · Efficiency · Metrics", "Find and fix the bottlenecks hiding in operational data.", ["SQL", "Excel", "Process Metrics", "Root-Cause", "Power BI"]],
      ["Lead Data Analyst", "Experienced", "Standards · Mentoring · Strategy", "Set analytics standards and mentor a team of analysts.", ["Data Strategy", "Mentoring", "Governance", "Storytelling", "SQL"]],
      ["Analytics Manager", "Experienced", "Teams · Roadmaps · Impact", "Run an analytics team and the roadmap of questions it answers.", ["Team Leadership", "Prioritisation", "KPIs", "Hiring", "Executive Comms"]],
    ],
  },

  stats: {modulesNote: "Excel to capstone"},

  learning: {
    title: ["Learn.", "Explore. Explain."],
    projects: "Every module works on a real, messy dataset",
    items: [
      ["Hands-On Tool Labs", "Excel, SQL, Python, Power BI and Tableau in every week", LineChart],
      ["Analyst Interview Mastery", "SQL rounds, case studies and mock interviews", Trophy],
    ],
  },

  certs: {
    certificates: [
      ["PG-DA-01", "PG Program in Data Analytics with Generative AI", "SQL · Python · BI", "program", "Take raw data to insight — cleaning, SQL, Python, dashboards, storytelling and AI-assisted analysis.", ["SQL", "Python", "Power BI", "Statistics"]],
      ["PG-DAI-02", "Data Analytics Internship", "Analysis · Dashboards · Root Cause", "Internship program", "Real-world analytics work — end-to-end cleaning and analysis, dashboards and metric investigations.", ["Analysis", "Dashboards", "Root Cause", "Reporting"]],
      ["PG-DAC-03", "Data Storytelling & Communication", "Storytelling · Framing · Integrity", "Soft-skills program", "Frame the right question, keep data honest and present insight people act on.", ["Storytelling", "Presentation", "Problem Framing", "Data Integrity"]],
    ],
    proofPillars: [
      ["Credential", "Program, internship and storytelling certificates, issued on completion.", GraduationCap],
      ["Deliverables", "A SQL case, an EDA notebook, a Power BI report and a capstone — real work, not quizzes.", FolderKanban],
      ["Portfolio", "Every analysis in one portfolio a hiring manager can open.", MapIcon],
    ],
    note: "A portfolio your future team can read — analyses, dashboards and insights you can point to.",
  },

  cta: {word: "Your Data", sub: "From messy data to insight people act on."},
  footer: "With Data.",
});
