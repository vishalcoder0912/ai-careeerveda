import {BarChart3, Database, FolderKanban, GraduationCap, LineChart, Map as MapIcon, Sheet, Sparkles, Target, Trophy} from "lucide-react";
import {agentArt, art, buildProgramContent} from "./build";

// The cinematic page for the PG Program in Business Analytics with Generative AI.
export const businessAnalyticsContent = buildProgramContent("business-analytics", {
  hero: {
    title: ["Business", "Analytics"],
    sub: "Question it. Query it. Model it. Visualise it. Decide it — from raw spreadsheets to boardroom insight.",
    badges: ["6 MONTHS", "21 MODULES", "LIVE ONLINE", "GEN AI FOR ANALYSTS", "CAPSTONE PROJECT", "LIFETIME PLACEMENT SUPPORT"],
  },

  timeline: {
    label: "A Journey from Data to Decisions",
    title: ["The Making", "of a Business Analyst"],
    chapters: [
      [1, 3, "Excel & Business Foundations", "How analytics drives decisions, then Excel and spreadsheet models every business runs on."],
      [4, 5, "Statistics & Data Prep", "Business statistics, then cleaning and preparing messy data you can trust."],
      [6, 8, "SQL & Data Modeling", "Query, join and optimise with SQL, then model data so reports stay fast and right."],
      [9, 12, "Dashboards & Storytelling", "Power BI, DAX and Tableau — dashboards that tell leadership what to do next."],
      [13, 15, "Python, EDA & KPIs", "Python for analysis, exploratory data analysis and the KPI frameworks that run a business."],
      [16, 21, "Domain Analytics & Capstone", "Marketing, finance and predictive analytics, Gen AI for analysts, then a capstone and career prep."],
    ],
  },

  skills: {
    sub: "From a raw spreadsheet to a decision leadership acts on — five domains, one analytics discipline.",
    tag: "Analyst · Storyteller · Advisor",
    items: [
      ["Excel & Statistics", Sheet, "The analyst’s first tools — models, formulas and the statistics behind every claim.", ["Excel", "Pivot Tables", "Lookups", "Scenario Models", "Descriptive Stats", "Hypothesis Tests", "Regression"]],
      ["SQL & Data Modeling", Database, "Pull exactly the data a question needs, and shape it for reporting.", ["SQL", "Joins", "Window Functions", "CTEs", "Query Tuning", "Star Schema", "Data Cleaning"]],
      ["BI & Visualisation", BarChart3, "Build dashboards people open every morning — and understand at a glance.", ["Power BI", "DAX", "Tableau", "Dashboard Design", "Data Storytelling", "Power Query", "Reports"]],
      ["Business Metrics", Target, "Know which numbers move the business, and how to measure them honestly.", ["KPIs", "Unit Economics", "Marketing Analytics", "Sales Funnels", "Finance Analytics", "Operations", "A/B Tests"]],
      ["Python & Gen AI", Sparkles, "Analyse at scale with Python, forecast what comes next and work faster with AI.", ["Python", "pandas", "EDA", "Forecasting", "Predictive Models", "ChatGPT for Analysts", "Automation"]],
    ],
  },

  quote: {
    lines: ["DATA TELLS", "WHAT HAPPENED.", "GOOD ANALYSTS", "TELL WHAT’S NEXT."],
    cite: "— the business analyst’s credo",
  },

  architecture: {
    title: ["The Business", "Analytics Stack"],
    sub: "Eight layers, built in order — each one a foundation for the next.",
    layers: [
      ["Business Foundations", "Analytics in business → roles → the decision cycle"],
      ["Spreadsheets", "Excel → formulas → pivot tables → scenario models"],
      ["Statistics & Prep", "Business statistics → data cleaning → preparation"],
      ["SQL", "Queries → joins → window functions → optimisation"],
      ["Data Modeling", "Fact and dimension tables → star schemas → reporting models"],
      ["BI & Dashboards", "Power BI → DAX → Tableau → dashboard design"],
      ["Analysis & KPIs", "Python → EDA → KPI frameworks → domain analytics"],
      ["Prediction & AI", "Predictive analytics → Gen AI for analysts → capstone"],
    ],
  },

  modules: {
    title: ["Five Stages.", {em: "Twenty-One Modules."}],
    sub: "One roadmap from Excel to predictive, AI-assisted analytics — open a stage to see every module and topic.",
    stages: [
      ["Foundations", "Business analytics, Excel, spreadsheet modeling, statistics and data prep.", "Foundations", 1, 5],
      ["Query & Model", "SQL fundamentals, advanced SQL and data modeling for reporting.", "SQL", 6, 8],
      ["Visualise", "Power BI, DAX, Tableau and dashboard storytelling.", "BI", 9, 12],
      ["Analyse", "Python, EDA, KPI frameworks, marketing and finance analytics.", "Analyse", 13, 17],
      ["Predict & Launch", "Predictive analytics, Gen AI, the capstone and career readiness.", "Launch", 18, 21],
    ],
    art: {"01": "foundations", "02": "data", "03": "design", "04": "target", "05": "genai"},
  },

  system: {
    title: ["The Analytics", "System"],
    sub: "Everything a business analyst connects — data, tools, metrics and stakeholders — around one decision.",
    center: {title: "INSIGHT", sub: "query · analyse · decide", art: art("bulb")},
    nodes: [
      ["STAKEHOLDERS", art("people")],
      ["QUESTIONS", art("discover")],
      ["DATA", art("data")],
      ["SQL", agentArt("rag")],
      ["EXCEL", art("memo")],
      ["DASHBOARDS", art("design")],
      ["KPIs", art("target")],
      ["FORECASTS", art("compass")],
      ["GEN AI", art("genai")],
      ["REVENUE", art("moneybag")],
    ],
  },

  workflow: {
    title: ["From Question", "to Decision"],
    lead: "Ten steps, one analytics loop — the order you learn to take a business question to a decision leadership can act on.",
    pipeline: ["question", "source", "clean", "query", "model", "analyse", "visualise", "forecast", "present", "decide"],
    steps: [
      ["Frame", "Business question, stakeholders & success metric"],
      ["Source", "Spreadsheets, databases & data requirements"],
      ["Clean", "Data cleaning, validation & preparation"],
      ["Query", "SQL joins, aggregations & window functions"],
      ["Model", "Star schemas & reporting data models"],
      ["Analyse", "Statistics, Python & exploratory analysis"],
      ["Visualise", "Power BI, DAX & Tableau dashboards"],
      ["Forecast", "Predictive models & scenario planning"],
      ["Present", "Data storytelling & executive reporting"],
      ["Decide", "Recommendations, KPIs & follow-up tests"],
    ],
  },

  projects: {
    items: [
      ["Excel Business Model", ["Excel", "Scenarios", "Pivots"], "A spreadsheet model that tests pricing and cost scenarios for a real business."],
      ["Sales SQL Analysis", ["SQL", "Joins", "Window Functions"], "Answer revenue and churn questions straight from a sales database."],
      ["Executive Power BI Dashboard", ["Power BI", "DAX", "Data Model"], "A self-serve dashboard leadership can open every morning."],
      ["Tableau Story", ["Tableau", "Storytelling", "Design"], "A visual story that walks stakeholders from finding to recommendation."],
      ["KPI Framework", ["KPIs", "Unit Economics", "Metrics Tree"], "A metrics tree that ties daily numbers to company goals."],
      ["Marketing Funnel Analysis", ["Funnels", "Attribution", "A/B Tests"], "Find where customers drop off and which campaigns actually pay back."],
      ["Sales Forecast", ["Python", "Regression", "Forecasting"], "A predictive model that forecasts next quarter’s demand."],
      ["Capstone Insight Report", ["End-to-End", "Gen AI", "Presentation"], "A full business problem, from raw data to a board-ready recommendation."],
    ],
    categories: ["Spreadsheets", "SQL", "BI Dashboards", "Visual Story", "Metrics", "Marketing", "Prediction", "Capstone"],
    sideLeft: ["Data", "Insight", "Stories", "Real Impact"],
    sideRight: ["Query", "Visualise", "Decide"],
    footLeft: "Real datasets · real portfolio",
    footRight: "Answer the question, not just the query",
  },

  careers: {
    lead: "The analytics roles this track opens — one role at a time.",
    roles: [
      ["Business Analyst", "Fresher", "Requirements · Analysis · Insight", "Turn business questions into analysis and clear recommendations.", ["Excel", "SQL", "Power BI", "Requirements", "Storytelling"]],
      ["MIS Analyst", "Fresher", "Reports · Excel · Automation", "Own the reports and trackers a business runs on every week.", ["Excel", "Power Query", "Reporting", "SQL", "Automation"]],
      ["Reporting Analyst", "Fresher", "Dashboards · KPIs · Accuracy", "Build accurate dashboards that track the numbers that matter.", ["Power BI", "DAX", "KPIs", "SQL", "Data Validation"]],
      ["Junior Data Analyst", "Fresher", "SQL · Python · EDA", "Pull, clean and analyse data alongside senior analysts.", ["SQL", "Python", "pandas", "EDA", "Excel"]],
      ["BI Developer", "Mid-level", "Data Models · Dashboards · Scale", "Design the data models and dashboards a whole company uses.", ["Power BI", "Tableau", "Data Modeling", "SQL", "DAX"]],
      ["Marketing Analyst", "Mid-level", "Funnels · Campaigns · Attribution", "Measure campaigns, funnels and the true return on marketing spend.", ["Attribution", "Funnels", "A/B Testing", "SQL", "GA4"]],
      ["Financial Analyst", "Mid-level", "Forecasts · Budgets · Variance", "Forecast, budget and explain why the numbers moved.", ["Financial Models", "Excel", "Forecasting", "Variance", "Power BI"]],
      ["Product Analyst", "Mid-level", "Metrics · Experiments · Growth", "Track product usage and size the next opportunity with data.", ["SQL", "Experiments", "Cohorts", "Funnels", "Python"]],
      ["Senior Business Analyst", "Experienced", "Strategy · Stakeholders · Leadership", "Lead analytics for a business unit and advise its leadership.", ["Strategy", "Stakeholders", "Forecasting", "Mentoring", "Storytelling"]],
      ["Analytics Manager", "Experienced", "Teams · Roadmaps · Impact", "Run an analytics team and its roadmap of business questions.", ["Team Leadership", "Prioritisation", "KPIs", "Hiring", "Executive Comms"]],
    ],
  },

  stats: {modulesNote: "Excel to capstone"},

  learning: {
    title: ["Learn.", "Analyse. Decide."],
    projects: "Every module works on a real business dataset",
    items: [
      ["BI Tools in Practice", "Hands-on Excel, SQL, Power BI and Tableau labs", LineChart],
      ["Analyst Interview Mastery", "SQL rounds, case studies and mock interviews", Trophy],
    ],
  },

  certs: {
    certificates: [
      ["PG-BA-01", "PG Program in Business Analytics with Generative AI", "SQL · BI · Business Metrics", "program", "Take a business question from raw data to a decision — SQL, dashboards, KPIs, prediction and AI-assisted analysis.", ["SQL", "Power BI", "KPIs", "Python"]],
      ["PG-BAI-02", "Business Analytics Internship", "Dashboards · KPIs · Experiments", "Internship program", "Real-world analytics work — dashboard build-outs, KPI frameworks, A/B test analysis and stakeholder presentations.", ["Dashboards", "KPIs", "A/B Tests", "Reporting"]],
      ["PG-BAC-03", "Data Storytelling & Stakeholder Communication", "Storytelling · Requirements · Acumen", "Soft-skills program", "Gather requirements, present findings and turn analysis into decisions stakeholders act on.", ["Storytelling", "Presentation", "Requirements", "Business Acumen"]],
    ],
    proofPillars: [
      ["Credential", "Program, internship and storytelling certificates, issued on completion.", GraduationCap],
      ["Deliverables", "A Power BI dashboard, a KPI framework, a forecast and a capstone report.", FolderKanban],
      ["Portfolio", "Every analysis in one portfolio a hiring manager can open.", MapIcon],
    ],
    note: "A portfolio your future team can read — dashboards, analyses and decisions you can point to.",
  },

  cta: {word: "Your Analytics", sub: "From raw spreadsheets to boardroom insight."},
  footer: "Smarter Decisions.",
});
