import {Building2, Calculator, FileSearch, FolderKanban, GraduationCap, Handshake, Landmark, Map as MapIcon, Presentation, Trophy} from "lucide-react";
import {art, buildProgramContent} from "./build";

// The cinematic page for the PG Program in Investment Banking.
export const investmentBankingContent = buildProgramContent("investment-banking", {
  hero: {
    title: ["Investment", "Banking"],
    sub: "Read it. Model it. Value it. Pitch it. Close it — from financial statements to live deals.",
    badges: ["6 MONTHS", "21 MODULES", "LIVE ONLINE", "M&A · LBO · DCM", "CAPSTONE PROJECT", "LIFETIME PLACEMENT SUPPORT"],
  },

  timeline: {
    label: "A Journey from Statements to Deals",
    title: ["The Making", "of an Investment Banker"],
    chapters: [
      [1, 3, "Finance Foundations", "How investment banks work, then accounting, financial statements and corporate finance."],
      [4, 6, "Mergers & Acquisitions", "M&A fundamentals, deal structuring and negotiation, and a full merger model."],
      [7, 9, "Equity Research", "Company analysis and forecasting, written up as a professional research report."],
      [10, 12, "Modeling & LBOs", "Banker-grade Excel, financial platforms and leveraged buyout models."],
      [13, 15, "Debt & Special Situations", "Restructuring, debt capital markets and the credit analysis lenders rely on."],
      [16, 21, "Sectors & Capstone", "Technology, healthcare, financial, energy and real estate sectors — then a capstone and interview prep."],
    ],
  },

  skills: {
    sub: "From a balance sheet to a closed deal — five domains, one banking discipline.",
    tag: "Analyst · Modeler · Dealmaker",
    items: [
      ["Accounting & Corporate Finance", Calculator, "Read every line of the three statements and know what drives value.", ["Income Statement", "Balance Sheet", "Cash Flow", "Ratios", "Time Value", "WACC", "Capital Structure"]],
      ["Financial Modeling & Valuation", Building2, "Build the models a deal is priced on — fast, clean and defensible.", ["3-Statement Model", "DCF", "Comparables", "Precedents", "LBO", "Sensitivities", "Excel"]],
      ["M&A & Deal Execution", Handshake, "Structure, negotiate and model a transaction from teaser to close.", ["Accretion / Dilution", "Deal Structuring", "Due Diligence", "Synergies", "Negotiation", "Merger Models", "Term Sheets"]],
      ["Equity Research & Credit", FileSearch, "Form a view on a company — or a borrower — and defend it in writing.", ["Company Analysis", "Forecasting", "Research Reports", "Credit Analysis", "Ratings", "DCM", "Restructuring"]],
      ["Pitching & Sectors", Presentation, "Know the sectors, build the pitchbook and present it to a client.", ["Pitchbooks", "Sector Analysis", "Bloomberg", "Capital IQ", "PowerPoint", "Client Presentations", "Storytelling"]],
    ],
  },

  quote: {
    lines: ["MODELS PRICE", "THE DEAL.", "GOOD BANKERS", "CLOSE IT."],
    cite: "— the investment banker’s credo",
  },

  architecture: {
    title: ["The Investment", "Banking Stack"],
    sub: "Eight layers, built in order — each one a foundation for the next.",
    layers: [
      ["Banking Foundations", "How banks work → divisions → the deal lifecycle"],
      ["Accounting", "Financial statements → ratios → accounting adjustments"],
      ["Corporate Finance", "Time value → cost of capital → capital structure"],
      ["Valuation", "DCF → comparables → precedent transactions"],
      ["M&A", "Deal structuring → negotiation → merger modeling"],
      ["Research & Credit", "Company forecasts → research reports → credit analysis"],
      ["Advanced Modeling", "Banker Excel → financial platforms → LBO → restructuring"],
      ["Sectors & Capstone", "Sector deep-dives → pitchbooks → live deal capstone"],
    ],
  },

  modules: {
    title: ["Five Stages.", {em: "Twenty-One Modules."}],
    sub: "One roadmap from financial statements to live deals — open a stage to see every module and topic.",
    stages: [
      ["Foundations", "Investment banking, accounting and corporate finance basics.", "Foundations", 1, 3],
      ["Mergers & Acquisitions", "M&A fundamentals, deal structuring and a full M&A model.", "M&A", 4, 6],
      ["Research & Modeling", "Equity research, banker Excel, financial platforms and LBOs.", "Model", 7, 12],
      ["Capital Markets", "Restructuring, debt capital markets and credit analysis.", "Markets", 13, 15],
      ["Sectors & Launch", "Five sector deep-dives, the capstone and interview readiness.", "Launch", 16, 21],
    ],
    art: {"01": "foundations", "02": "target", "03": "data", "04": "moneybag", "05": "lead"},
  },

  system: {
    title: ["The Deal", "System"],
    sub: "Everything an investment banker connects — clients, models, markets and investors — around one deal.",
    center: {title: "THE DEAL", sub: "model · pitch · close", art: art("moneybag")},
    nodes: [
      ["CLIENTS", art("people")],
      ["FINANCIALS", art("memo")],
      ["VALUATION", art("data")],
      ["MODELS", art("gear")],
      ["RESEARCH", art("discover")],
      ["PITCHBOOK", art("design")],
      ["INVESTORS", art("target")],
      ["CREDIT", art("compass")],
      ["MARKETS", art("map")],
      ["CLOSING", art("lead")],
    ],
  },

  workflow: {
    title: ["From Pitch", "to Close"],
    lead: "Ten steps, one deal loop — the order you learn to take a mandate from first pitch to a closed transaction.",
    pipeline: ["source", "analyse", "model", "value", "pitch", "structure", "diligence", "negotiate", "finance", "close"],
    steps: [
      ["Source", "Industry research & deal origination"],
      ["Analyse", "Financial statements & company analysis"],
      ["Model", "3-statement, merger & LBO models"],
      ["Value", "DCF, comparables & precedent transactions"],
      ["Pitch", "Pitchbooks & client presentations"],
      ["Structure", "Deal structure, consideration & terms"],
      ["Diligence", "Due diligence & risk assessment"],
      ["Negotiate", "Term sheets & negotiation"],
      ["Finance", "Debt capital markets & credit"],
      ["Close", "Signing, closing & post-deal integration"],
    ],
  },

  projects: {
    items: [
      ["3-Statement Model", ["Accounting", "Excel", "Forecasts"], "A linked income statement, balance sheet and cash flow for a listed company."],
      ["DCF Valuation", ["DCF", "WACC", "Sensitivities"], "Value a real company and show the assumptions that move the price."],
      ["M&A Merger Model", ["Accretion / Dilution", "Synergies", "Structuring"], "Model a merger and decide whether it creates value for shareholders."],
      ["Equity Research Report", ["Company Analysis", "Forecasting", "Rating"], "A buy, hold or sell report on a listed company, defended in writing."],
      ["LBO Model", ["Leverage", "IRR", "Debt Schedule"], "Model a private-equity buyout and the returns it needs to hit."],
      ["Credit Assessment", ["Credit Analysis", "Ratios", "Risk"], "Assess a borrower and recommend terms a lender would accept."],
      ["Sector Pitchbook", ["Pitchbook", "Sector Analysis", "Comps"], "A client-ready pitchbook on a sector and its most likely deals."],
      ["Capstone Live Deal", ["End-to-End", "Valuation", "Presentation"], "A full deal, from valuation to the final client presentation."],
    ],
    categories: ["Financial Modeling", "Valuation", "M&A", "Equity Research", "Private Equity", "Credit", "Pitching", "Capstone"],
    sideLeft: ["Statements", "Models", "Pitches", "Real Deals"],
    sideRight: ["Analyse", "Value", "Close"],
    footLeft: "Real companies · real portfolio",
    footRight: "Price the deal, not just the model",
  },

  careers: {
    lead: "The finance roles this track opens — one role at a time.",
    roles: [
      ["Investment Banking Analyst", "Fresher", "Models · Pitchbooks · Deals", "Build the models and pitchbooks behind live transactions.", ["Financial Modeling", "Valuation", "Excel", "PowerPoint", "M&A"]],
      ["Financial Analyst", "Fresher", "Forecasts · Valuation · Reporting", "Forecast, value and report on a company’s performance.", ["Financial Statements", "Forecasting", "DCF", "Excel", "Reporting"]],
      ["Equity Research Analyst", "Fresher", "Research · Forecasts · Ratings", "Cover listed companies and publish research investors act on.", ["Company Analysis", "Forecasting", "Report Writing", "Valuation", "Bloomberg"]],
      ["Credit Analyst", "Fresher", "Credit · Risk · Ratings", "Assess borrowers and recommend lending terms.", ["Credit Analysis", "Ratios", "Cash Flow", "Risk", "Covenants"]],
      ["Investment Banking Associate", "Mid-level", "Execution · Clients · Teams", "Run deal execution and manage analysts on live mandates.", ["Deal Execution", "LBO", "Client Management", "Negotiation", "Leadership"]],
      ["M&A Associate", "Mid-level", "Structuring · Diligence · Negotiation", "Structure and negotiate acquisitions for corporate clients.", ["Merger Models", "Due Diligence", "Structuring", "Term Sheets", "Synergies"]],
      ["Private Equity Analyst", "Mid-level", "LBOs · Returns · Portfolio", "Screen, model and monitor buyout investments.", ["LBO", "IRR", "Due Diligence", "Portfolio Monitoring", "Valuation"]],
      ["Debt Capital Markets Associate", "Mid-level", "Bonds · Credit · Issuance", "Help companies raise debt in the bond and loan markets.", ["DCM", "Credit", "Bond Pricing", "Ratings", "Investor Relations"]],
      ["Vice President, Investment Banking", "Experienced", "Mandates · Clients · Leadership", "Lead deal teams and own client relationships on major mandates.", ["Origination", "Client Relationships", "Negotiation", "Team Leadership", "Strategy"]],
      ["Corporate Development Manager", "Experienced", "Strategy · Acquisitions · Integration", "Lead acquisitions and partnerships from inside a company.", ["Corporate Strategy", "M&A", "Integration", "Valuation", "Executive Comms"]],
    ],
  },

  stats: {modulesNote: "statements to capstone"},

  learning: {
    title: ["Learn.", "Model. Close."],
    projects: "Every module models a real company or deal",
    items: [
      ["Bloomberg & Capital IQ", "Hands-on training on the platforms banks use daily", Landmark],
      ["IB Interview Mastery", "Technical rounds, modeling tests and mock interviews", Trophy],
    ],
  },

  certs: {
    certificates: [
      ["PG-IB-01", "PG Program in Investment Banking", "Valuation · M&A · Modeling", "program", "Take a deal from financial statements to close — valuation, M&A, LBOs, equity research and credit.", ["Valuation", "M&A", "LBO", "Research"]],
      ["PG-IBI-02", "Investment Banking Internship", "Deals · Models · Pitchbooks", "Internship program", "Real-world deal work — M&A execution, financial models, pitchbooks and equity research reports.", ["M&A", "Modeling", "Pitchbooks", "Research"]],
      ["PG-IBC-03", "Client Pitching & Negotiation", "Pitching · Negotiation · Clients", "Soft-skills program", "Pitch with conviction, negotiate deals and manage the client relationship.", ["Pitching", "Negotiation", "Client Management", "Storytelling"]],
    ],
    proofPillars: [
      ["Credential", "Program, internship and client-skills certificates, issued on completion.", GraduationCap],
      ["Deliverables", "A DCF, a merger model, an LBO and a research report — real work, not quizzes.", FolderKanban],
      ["Portfolio", "Every model and report in one portfolio a hiring desk can open.", MapIcon],
    ],
    note: "A portfolio your future desk can read — models, reports and pitches you can point to.",
  },

  cta: {word: "Your Banking", sub: "From financial statements to live deals."},
  footer: "Bigger Deals.",
});
