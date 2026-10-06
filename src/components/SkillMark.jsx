import {useState} from "react";
import {
  Bot,
  Brain,
  ChartColumn,
  Cloud,
  CodeXml,
  Database,
  FileText,
  Layers,
  Presentation,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";

import {skillIconFor} from "../data/skillIcons";

/* The mark painted to the left of a skill's name in whichever chip renders it.
   A real brand logo from `skillIcons` wins; every other skill (ETL, Pipelines,
   Gen AI, Agile…) gets a line icon chosen by keyword, so no chip is left as
   bare text. First match wins, so the more specific patterns come first. */
const ICON_PROPS = {className: "skill-mark skill-mark--icon", size: 16, strokeWidth: 2, "aria-hidden": true};

const KEYWORD_ICONS = [
  [/etl|pipeline|airflow|workflow|orchestrat|automation/, Workflow],
  [/agent|mcp|a2a|bot/, Bot],
  [/rag|retriev|vector|embedding|search/, Search],
  [/gen ?ai|llm|prompt|fine-?tun|generative|\bai\b|^ai/, Sparkles],
  [/machine learning|\bml\b|deep learning|nlp|neural|pytorch|tensorflow|transformer/, Brain],
  [/data|sql|warehouse|snowflake|dbt|spark|lake|mongo|postgres|redis/, Database],
  [/analytic|metric|statistic|dashboard|tableau|looker|visuali|\bbi\b|excel|monitor|observab/, ChartColumn],
  [/cloud|aws|azure|gcp|docker|kubernetes|devops|ci\/cd|deploy|mlops/, Cloud],
  [/security|cyber|soc\b|siem|threat|network|vulnerab|auth|safety/, ShieldCheck],
  [/research|discovery|interview/, Search],
  [/financ|valuation|banking|dcf|lbo|model(l)?ing|account|equity|market/, TrendingUp],
  [/strategy|roadmap|product|vision|okr/, Target],
  [/agile|scrum|sprint|kanban/, RefreshCw],
  [/stakeholder|leadership|team|communication/, Users],
  [/powerpoint|pitch|deck|presentation/, Presentation],
  [/api|backend|frontend|node|express|java|react|code|program|python|linux|bash|system design/, CodeXml],
  [/writing|document|prd|report/, FileText],
].map(([pattern, Icon]) => [pattern, <Icon key={pattern.source} {...ICON_PROPS} />]);

// Elements built once at module load; React renders a shared element fine,
// and it keeps component identity out of render.
const FALLBACK_ICON = <Layers {...ICON_PROPS} />;

const iconFor = (name) => {
  const key = String(name || "").toLowerCase();
  return KEYWORD_ICONS.find(([pattern]) => pattern.test(key))?.[1] || FALLBACK_ICON;
};

const SkillMark = ({name}) => {
  const [failed, setFailed] = useState(false);
  const url = skillIconFor(name);

  if (url && !failed) {
    return (
      <img
        className="skill-mark"
        src={url}
        alt=""
        width="16"
        height="16"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return iconFor(name);
};

export default SkillMark;
