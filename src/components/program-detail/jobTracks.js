import {jobs as allJobs} from "../../data/jobsData";

// A handful of curated role keywords that map to each program id. Every value
// is a real role title present in jobsData; the filter is a plain substring
// match, so listings never appear under a program they do not obviously belong
// to. Programs without a track key (none today) simply show no roles.
const JOB_TRACKS = {
  "product-management": [
    "Product Manager", "Product Owner", "Product Analyst",
    "Growth Product Manager", "Associate Product Manager",
    "Technical Product Manager", "Product Operations Manager",
    "Product Management Intern", "Product Marketing Manager",
    "Group Product Manager", "Platform Product Manager",
    "Product Manager – Payments",
  ],
  "business-analytics": [
    "Business Analyst", "Business Intelligence", "Pricing Analyst",
    "Reporting Analyst", "BI Developer", "Marketing Analytics",
    "Revenue Operations",
  ],
  "data-analytics": [
    "Data Analyst", "Analytics Engineer", "Data Visualization",
    "Data Quality Analyst", "Risk Data Analyst", "Operations Data",
    "Customer Insights", "Lead Data Analyst", "Data Analytics Intern",
    "Product Data Analyst", "Marketing Data Analyst",
  ],
  "investment-banking": [
    "Investment Banking", "Equity Research", "M&A Analyst",
    "Private Equity", "Credit Research", "Valuations Analyst",
    "Debt Capital Markets", "Venture Capital", "Transaction Advisory",
    "Financial Analyst", "Corporate Finance",
  ],
  "data-science-ai": [
    "Data Scientist", "Machine Learning", "AI Engineer",
  ],
  "gen-ai": [
    "AI Engineer", "Data Scientist", "Machine Learning",
  ],
  "data-engineering": [
    "Data Engineer", "Analytics Engineer",
  ],
  "backend-engineering": [
    "Backend Developer", "Node.js Developer", "Full-Stack Developer",
    "Software Development Engineer", "DevOps Engineer",
    "React Developer", "Frontend Developer",
  ],
  cybersecurity: [
    "Cybersecurity Analyst", "SOC Analyst", "Security",
  ],
};

export const matchJobs = (program, limit = 3) => {
  const keywords = JOB_TRACKS[program.id];
  if (!keywords) return [];
  return allJobs
    .filter((job) => keywords.some((k) => job.title.includes(k)))
    .slice(0, limit);
};

export default JOB_TRACKS;