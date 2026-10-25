import {Activity, FolderKanban, GraduationCap, KeyRound, Map as MapIcon, Network, ShieldAlert, ShieldCheck, Terminal, Trophy} from "lucide-react";
import {agentArt, art, buildProgramContent} from "./build";

const cs = (name) => `/images/cybersecurity/${name}`;

// The cinematic page for the PG Program in CyberSecurity.
export const cybersecurityContent = buildProgramContent("cybersecurity", {
  hero: {
    title: ["Cyber", "Security"],
    sub: "Understand it. Harden it. Monitor it. Respond to it. Report it — from networks to the security operations centre.",
    badges: ["6 MONTHS", "21 MODULES", "LIVE ONLINE", "SOC · SIEM · INCIDENT RESPONSE", "CAPSTONE PROJECT", "LIFETIME PLACEMENT SUPPORT"],
  },

  timeline: {
    label: "A Journey from Networks to the SOC",
    title: ["The Making", "of a Security Analyst"],
    chapters: [
      [1, 3, "Networks & Linux", "The security landscape, networking from OSI to Wireshark, and Linux for security work.", cs("networking.jpg")],
      [4, 7, "Systems & Identity", "Endpoint security, security frameworks, cryptography and identity and access management.", cs("linux.jpg")],
      [8, 10, "Web & Network Defence", "Web application security, perimeter defence and a vulnerability management programme.", cs("web-safety.webp")],
      [11, 14, "Detect & Monitor", "Threat intelligence, log analysis, SIEM monitoring and real SOC workflows.", cs("monitoring.jpg")],
      [15, 17, "Respond & Investigate", "Incident response, digital forensics and defence against malware and phishing.", cs("reports.jpg")],
      [18, 21, "Cloud, GRC & Capstone", "Cloud security, governance, risk and compliance — then a capstone and career prep.", "/images/timeline/tl-06.jpg"],
    ],
  },

  skills: {
    sub: "From a single packet to a resolved incident — five domains, one defensive discipline.",
    tag: "Defender · Analyst · Responder",
    items: [
      ["Networks & Systems", Network, "Know how networks and operating systems work before you defend them.", ["TCP/IP", "Subnetting", "DNS", "Wireshark", "Linux", "Windows", "Hardening"]],
      ["Identity & Cryptography", KeyRound, "Control who gets in, and keep data private in transit and at rest.", ["IAM", "MFA", "Active Directory", "PKI", "Encryption", "Hashing", "Zero Trust"]],
      ["Vulnerability Management", ShieldAlert, "Find weaknesses first, rank them by risk and get them fixed.", ["OWASP Top 10", "Nessus", "Burp Suite", "CVSS", "Patching", "Firewalls", "Web Security"]],
      ["Detection & SOC", Activity, "Watch the logs, triage the alerts and spot the attack in progress.", ["SIEM", "Splunk", "Log Analysis", "Threat Intel", "MITRE ATT&CK", "Alert Triage", "Playbooks"]],
      ["Response, Cloud & GRC", ShieldCheck, "Contain incidents, investigate what happened and keep the organisation compliant.", ["Incident Response", "Forensics", "Malware Analysis", "Cloud Security", "ISO 27001", "NIST", "Risk"]],
    ],
  },

  quote: {
    lines: ["ATTACKERS NEED", "ONE GAP.", "GOOD DEFENDERS", "CLOSE THEM ALL."],
    cite: "— the security analyst’s credo",
  },

  architecture: {
    title: ["The Security", "Defence Stack"],
    sub: "Nine layers, built in order — each one a foundation for the next.",
    layers: [
      ["Security Foundations", "The CIA triad → threats → risk → security careers"],
      ["Networks", "OSI & TCP/IP → protocols → packet analysis"],
      ["Systems", "Linux → Windows → endpoint security"],
      ["Identity & Crypto", "Frameworks → cryptography → identity and access"],
      ["Application & Network Defence", "Web security → perimeter defence → vulnerability management"],
      ["Detection", "Threat intelligence → logging → SIEM monitoring"],
      ["Operations", "SOC workflows → alert triage → escalation"],
      ["Response", "Incident response → forensics → malware and phishing defence"],
      ["Cloud & Governance", "Cloud security → governance → risk → compliance"],
    ],
  },

  modules: {
    title: ["Five Stages.", {em: "Twenty-One Modules."}],
    sub: "One roadmap from networks to the security operations centre — open a stage to see every module and topic.",
    stages: [
      ["Foundations", "Security basics, networking, Linux and Windows endpoints.", "Foundations", 1, 4],
      ["Protect", "Frameworks, cryptography, identity, web and network defence.", "Protect", 5, 9],
      ["Detect", "Vulnerability management, threat intelligence, logging and SIEM.", "Detect", 10, 13],
      ["Respond", "SOC workflows, incident response, forensics and malware defence.", "Respond", 14, 17],
      ["Govern & Launch", "Cloud security, GRC, the capstone and career readiness.", "Launch", 18, 21],
    ],
    art: {"01": "foundations", "02": "target", "03": "discover", "04": "megaphone", "05": "lead"},
  },

  system: {
    title: ["The Security", "System"],
    sub: "Everything a security analyst connects — networks, identities, logs and people — around one defended organisation.",
    center: {title: "SOC", sub: "detect · respond · recover", art: agentArt("security")},
    nodes: [
      ["USERS", agentArt("user")],
      ["IDENTITY", art("people")],
      ["NETWORK", art("map")],
      ["ENDPOINTS", art("gear")],
      ["WEB APPS", agentArt("api")],
      ["LOGS", art("memo")],
      ["SIEM", art("data")],
      ["THREAT INTEL", art("discover")],
      ["CLOUD", art("production")],
      ["COMPLIANCE", art("compass")],
    ],
  },

  workflow: {
    title: ["From Alert", "to Recovery"],
    lead: "Ten steps, one defence loop — the order you learn to protect an organisation and handle an incident end to end.",
    pipeline: ["identify", "protect", "monitor", "detect", "triage", "contain", "investigate", "recover", "report", "improve"],
    steps: [
      ["Identify", "Assets, risks & attack surface"],
      ["Protect", "Hardening, identity & encryption"],
      ["Monitor", "Logging & SIEM dashboards"],
      ["Detect", "Threat intel & detection rules"],
      ["Triage", "Alert review & SOC escalation"],
      ["Contain", "Isolation & incident playbooks"],
      ["Investigate", "Forensics & root-cause analysis"],
      ["Recover", "Restore, patch & verify"],
      ["Report", "Incident reports & stakeholder updates"],
      ["Improve", "Lessons learned, GRC & controls"],
    ],
  },

  projects: {
    items: [
      ["Network Traffic Analysis", ["Wireshark", "TCP/IP", "Protocols"], "Capture and analyse traffic to spot suspicious behaviour."],
      ["Linux Hardening Audit", ["Linux", "CIS Benchmarks", "Hardening"], "Audit and harden a Linux server against a security baseline."],
      ["IAM & Access Review", ["IAM", "MFA", "Least Privilege"], "Review who can access what, and tighten it to least privilege."],
      ["Web Vulnerability Assessment", ["OWASP", "Burp Suite", "Reporting"], "Assess a practice web app in a lab and report findings by risk."],
      ["SIEM Detection Rules", ["SIEM", "Splunk", "MITRE ATT&CK"], "Write detection rules that catch real attack techniques in logs."],
      ["SOC Alert Triage", ["Triage", "Playbooks", "Escalation"], "Work a queue of alerts and escalate the ones that matter."],
      ["Incident Response Report", ["IR", "Forensics", "Timeline"], "Investigate a simulated breach and write the incident report."],
      ["Capstone Security Programme", ["Cloud", "GRC", "End-to-End"], "Design the defences, monitoring and response plan for an organisation."],
    ],
    categories: ["Networks", "Systems", "Identity", "AppSec", "Detection", "SOC", "Incident Response", "Capstone"],
    sideLeft: ["Networks", "Signals", "Responses", "Real Impact"],
    sideRight: ["Protect", "Detect", "Respond"],
    footLeft: "Real labs · real portfolio",
    footRight: "Stop the incident, not just the alert",
  },

  careers: {
    lead: "The security roles this track opens — one role at a time.",
    roles: [
      ["SOC Analyst (L1)", "Fresher", "Monitoring · Triage · Escalation", "Monitor alerts, triage events and escalate real threats.", ["SIEM", "Log Analysis", "Triage", "Networking", "Reporting"]],
      ["Security Analyst", "Fresher", "Risk · Monitoring · Reporting", "Watch for threats and report risk across the organisation.", ["Threat Intel", "SIEM", "Vulnerability Scans", "Linux", "Documentation"]],
      ["Vulnerability Analyst", "Fresher", "Scanning · Risk · Remediation", "Find, rank and track the fixing of vulnerabilities.", ["Nessus", "CVSS", "OWASP", "Patching", "Reporting"]],
      ["IT Security Associate", "Fresher", "Hardening · Access · Support", "Harden systems and manage access for IT teams.", ["Hardening", "IAM", "Windows", "Linux", "Firewalls"]],
      ["SOC Analyst (L2/L3)", "Mid-level", "Investigation · Hunting · Response", "Investigate escalated incidents and hunt for hidden threats.", ["Threat Hunting", "Forensics", "EDR", "MITRE ATT&CK", "Playbooks"]],
      ["Incident Responder", "Mid-level", "Containment · Forensics · Recovery", "Lead containment and recovery when an incident hits.", ["Incident Response", "Forensics", "Malware Analysis", "Communication", "IR Plans"]],
      ["Cloud Security Engineer", "Mid-level", "Cloud · Identity · Posture", "Secure cloud workloads, identities and configurations.", ["AWS", "Azure", "IAM", "CSPM", "Zero Trust"]],
      ["GRC Analyst", "Mid-level", "Risk · Compliance · Audits", "Run risk assessments, policies and compliance audits.", ["ISO 27001", "NIST", "Risk Assessment", "Policies", "Audits"]],
      ["Security Engineer", "Experienced", "Architecture · Controls · Automation", "Design and automate the controls that protect the business.", ["Security Architecture", "Automation", "Detection Engineering", "Cloud", "Mentoring"]],
      ["SOC Manager", "Experienced", "Teams · Operations · Metrics", "Run a security operations centre and its response team.", ["Team Leadership", "SOC Metrics", "Incident Command", "Hiring", "Executive Comms"]],
    ],
  },

  stats: {modulesNote: "networks to capstone"},

  learning: {
    title: ["Learn.", "Defend. Respond."],
    projects: "Every module runs a hands-on defensive lab",
    items: [
      ["Live Security Labs", "Hands-on SIEM, forensics and hardening labs", Terminal],
      ["Security Interview Mastery", "Technical rounds, incident scenarios and mock interviews", Trophy],
    ],
  },

  certs: {
    certificates: [
      ["PG-CS-01", "PG Program in CyberSecurity", "Defence · Detection · Response", "program", "Defend an organisation end to end — networks, identity, vulnerability management, SOC, incident response and GRC.", ["SOC", "SIEM", "Incident Response", "GRC"]],
      ["PG-CSI-02", "CyberSecurity Internship", "SOC · Assessment · Response", "Internship program", "Real-world defensive work — SOC alert triage, vulnerability assessments, incident simulations and hardening reviews.", ["SOC", "Assessments", "IR", "Hardening"]],
      ["PG-CSC-03", "Security Communication & Reporting", "Reporting · Risk · Coordination", "Soft-skills program", "Communicate under pressure, write clear security reports and explain risk to non-technical leaders.", ["Reporting", "Risk Communication", "Coordination", "Investigation"]],
    ],
    proofPillars: [
      ["Credential", "Program, internship and communication certificates, issued on completion.", GraduationCap],
      ["Deliverables", "A hardening audit, SIEM rules, an incident report and a capstone programme.", FolderKanban],
      ["Portfolio", "Every lab and report in one portfolio a hiring manager can open.", MapIcon],
    ],
    note: "A portfolio your future team can read — audits, detections and reports you can point to.",
  },

  cta: {word: "Your Security", sub: "From networks to the security operations centre."},
  footer: "Safer Systems.",
});
