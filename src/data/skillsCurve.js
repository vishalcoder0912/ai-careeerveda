import {getSalaryMarket} from "./salaryMarket";

// Each role reads its mid-level (3–6 years) band from salaryMarket.js, so the
// chart moves when those benchmarks are updated and carries no numbers of its
// own. "Average" is the middle of the band; "AI-upskilled" is its top — where
// candidates with AI, data and automation skills are typically placed.
const ROLES = [
  {id: "product-management", label: "AI Product Management"},
  {id: "business-analytics", label: "Business Analyst"},
  {id: "data-science-ai", label: "AI Data Science"},
  {id: "data-analytics", label: "Data Analyst"},
  {id: "gen-ai-agentic-ai", label: "Advanced Generative AI"},
];

export const skillsCurveData = () =>
  ROLES.map(({id, label}) => {
    const band = getSalaryMarket(id).bands.find((entry) => entry.level === "Mid-level");
    return {id, label, average: (band.low + band.high) / 2, upskilled: band.high};
  });
