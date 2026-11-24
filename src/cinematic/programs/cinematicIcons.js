import {
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  Briefcase,
  Camera,
  Code2,
  Compass,
  Cpu,
  Database,
  FileText,
  Fingerprint,
  FolderKanban,
  Gauge,
  GitBranch,
  GraduationCap,
  Layers,
  Lock,
  Mail,
  Map as MapIcon,
  MessageCircle,
  Network,
  PenTool,
  Phone,
  Puzzle,
  Radar,
  Rocket,
  Search,
  ServerCog,
  ShieldCheck,
  Trophy,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

/* One icon registry for every cinematic program page. Mongo stores the token on
   the left; the page turns it back into the component on the right. Keeping the
   map here means a token saved on the Product Management page and one saved on
   the Gen AI flagship decode the same way, and a bad token falls back to the
   section's built-in icon rather than crashing the whole page. */
export const CINEMATIC_ICONS = {
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  Briefcase,
  Camera,
  Code2,
  Compass,
  Cpu,
  Database,
  FileText,
  Fingerprint,
  FolderKanban,
  Gauge,
  GitBranch,
  GraduationCap,
  Layers,
  Lock,
  Mail,
  MapIcon,
  MessageCircle,
  Network,
  PenTool,
  Phone,
  Puzzle,
  Radar,
  Rocket,
  Search,
  ServerCog,
  ShieldCheck,
  Trophy,
  TrendingUp,
  Users,
  Wrench,
  Zap,
};

export const iconComponent = (token, fallback) => CINEMATIC_ICONS[token] || fallback;

// The reverse map is only used when exporting a live page into a JSON template.
// The React component is the key because that is what data.js stores today.
export const iconToken = (component) => ICON_TOKENS.get(component);

const ICON_TOKENS = new Map(
  Object.entries(CINEMATIC_ICONS).map(([token, component]) => [component, token]),
);
