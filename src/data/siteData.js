export const navItems = [
  ["/programs", "Programs"],
  ["/alumni", "Alumni"],
  ["/jobs", "Jobs"],
  ["/faculty", "Faculty"],
  ["/blog", "Blog"],
  ["/about", "About"],
];

// Lives in its own module so pageMeta.js (also loaded by the node prerender
// scripts) can quote it without pulling in the rest of this file.
export {stats} from "./stats.js";

export const differentiators = [
  [
    "Industry-Aligned Curriculum",
    "Curriculum crafted with industry expectations, current tools, practical workflows, and skills employers actively seek.",
  ],
  [
    "Expert Mentorship",
    "Personalized guidance from 200+ seasoned professionals through live sessions, doubt clearing, feedback, and career planning.",
  ],
  [
    "Hands-On Learning",
    "Build portfolio-ready projects, solve real assignments, and work through case studies that mirror workplace problems.",
  ],
  [
    "100% Placement Assurance",
    "Resume support, LinkedIn optimization, mock interviews, soft skills training, referrals, and access to hiring partners.",
  ],
  [
    "High Salary Growth",
    "CareerVeda learners report strong ROI, career transitions, and salary growth across product, analytics, data, and AI roles.",
  ],
  [
    "Global Recognized Certification",
    "Earn industry-validated credentials that add credibility to your resume and help you stand out with employers.",
  ],
  [
    "Lifetime Career Support",
    "Access job alerts, alumni networking, career guidance, and upskilling support beyond graduation.",
  ],
  [
    "Flexible Learning Schedule",
    "Choose weekday or weekend batches, access recordings, revise with resources, and continue learning around your schedule.",
  ],
  [
    "Industry Case Studies",
    "Solve business challenges from leading companies and build decision-making confidence through practical examples.",
  ],
];

export const supportTracks = [
  {
    icon: "workshops",
    title: "Skill Enhancement Workshops",
    points: [
      "Hands-on workshops for in-demand workplace skills",
      "Communication, presentation, and confidence building",
      "Leadership, teamwork, and execution practice",
    ],
  },
  {
    icon: "tutoring",
    title: "Bespoke Tutoring Sessions",
    points: [
      "Interactive live classes with expert instructors",
      "Doubt clearing and guided revision support",
      "Technical help through practical problem solving",
    ],
  },
  {
    icon: "mentorship",
    title: "Career Aligned Mentorship",
    points: [
      "Personal mentor assigned based on your learning goals",
      "Weekly guidance sessions for career decisions",
      "Career roadmap, progress tracking, and feedback",
    ],
  },
];

export const careerSteps = [
  {
    number: "01",
    icon: "projects",
    title: "Hands-On Project Experience",
    body: "Build real-world applications through live projects, industry case studies, and collaborative sessions with expert mentors.",
    tags: ["Live Projects", "Case Studies", "Portfolio Building"],
  },
  {
    number: "02",
    icon: "certification",
    title: "Industry-Recognized Certifications",
    body: "Earn globally recognized, industry-aligned certifications that validate your expertise and boost your career prospects.",
    tags: ["Global Recognition", "Industry-Aligned", "Career Boost"],
  },
  {
    number: "03",
    icon: "placement",
    title: "Career Growth & Placement",
    body: "Access placement preparation, professional interview coaching, and direct connections with 900+ hiring partners nationwide.",
    tags: ["Interview Prep", "Resume Building", "Direct Hiring"],
  },
];

// [name, role, quote, program, photo?]. The photo is optional        a card without
// one falls back to the learner's initials, which is what every card did before.
export const reviews = [
  [
    "Anant Shiva",
    "Product Development at High Radius",
    "This program was exactly what I needed to transition into Product Management the industry-relevant curriculum and strong placement support helped me secure a role at HighRadius. Grateful to Team CareerVeda for the exceptional support throughout my journey!",
    "Product Management",
    "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever1-4e81fee0_jpg.webp?updatedAt=1783935492818"
  ],
  [
    "Nikunj Awasthi",
    "Associate Product Manager at Amazon",
    "My journey into Product Management started with a simple curiosity—how are products built, and what makes them valuable to users? As I explored the field, I became passionate about understanding customer problems and building meaningful solutions. The Product Management Program at CareerVeda helped me strengthen my skills in product strategy, customer-centric thinking, and practical problem-solving.",
    "Product Management",
  ],
  [
    "Anjali Singh",
    "Associate Product Manager at Amazon",
    "My journey into Product Management began with a growing interest in understanding customer needs, solving business problems, and building products that create real value. My experience as a Business Analyst at GoKwik gave me valuable exposure to data, business strategy, and customer-focused decision-making. As I explored Product Management further, the Product Management Program at CareerVeda helped me strengthen my understanding of product development, market research, Agile practices, and product strategy. Today, I'm working as an Associate Product Manager at Amazon, where I continue to learn, take on new challenges, and grow every day.",
    "Product Management",
    "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever5-09021396_jpg.webp?updatedAt=1783937327758",
  ],
  [
    "Himani Tamta",
    "Associate Product Manager at Wipro",
    "CareerVeda helped me build a strong foundation in problem-solving, feature prioritization, and product planning through practical projects. It equipped me with the data-driven frameworks needed to bridge customer psychology with business growth, ultimately helping me secure my role at Wipro.",
    "Product Management",
    "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever12jpeg-295bcdbc_jpg.webp",
  ],
];

// [score, source]. Shared by the reviews block on the blog and alumni pages, so
// a rating only has to be updated in one place.
export const ratings = [
  ["4.97", "Google"],
  ["4.92", "AmbitionBox"],
  ["4.94", "Glassdoor"],
  ["4.85", "Trustpilot"],
];

// FAQs live in their own module now        see the note at the top of
// src/data/faqs.js. Re-exported here so every existing importer is
// unaffected.
export {faqs} from "./faqs";
