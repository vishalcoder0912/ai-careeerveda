// Add a hosted image URL to a profile's `imageUrl` field below, or drop a
// portrait into src/assets/alumni. A URL takes priority, then the local file,
// then the generated initials placeholder.
const uploadedPhotos = import.meta.glob(
  "../assets/alumni/*.{avif,gif,jpeg,jpg,png,svg,webp}",
  { eager: true, import: "default", query: "?url" },
);

const photoBySlug = Object.fromEntries(
  Object.entries(uploadedPhotos).map(([path, url]) => {
    const filename = path.split("/").pop() || "";
    const slug = filename.replace(/\.[^.]+$/, "");
    return [slug, url];
  }),
);

// Exported because API-sourced alumni need the same placeholder: a profile the
// admin has not uploaded a portrait for must look identical whether it came
// from this file or from the database.
export const avatarPlaceholder = ({ initials, accent, accentEnd }) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 800" role="img" aria-label="${initials}">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${accent}" />
          <stop offset="1" stop-color="${accentEnd}" />
        </linearGradient>
        <filter id="grain"><feTurbulence baseFrequency=".8" numOctaves="2" stitchTiles="stitch" /></filter>
      </defs>
      <rect width="640" height="800" fill="url(#background)" />
      <rect width="640" height="800" opacity=".09" filter="url(#grain)" />
      <circle cx="500" cy="138" r="200" fill="#fff" opacity=".12" />
      <circle cx="120" cy="700" r="240" fill="#071323" opacity=".14" />
      <text x="320" y="450" text-anchor="middle" fill="#fff" font-family="Inter, Arial, sans-serif" font-size="188" font-weight="800" letter-spacing="-12">${initials}</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const spotlightProfiles = [
  {
    id: "anant-shiva",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever1-4e81fee0_jpg.webp?updatedAt=1786622628341",
    initials: "AS",
    name: "Anant Shiva",
    hike: "86% Hike",
    role: "Product Development, HighRadius",
    story: "This program was exactly what I needed to transition into Product Management      the industry-relevant curriculum and strong placement support helped me secure a role at HighRadius. Grateful to Team CareerVeda for the exceptional support throughout my journey!",
    accent: "#0f766e",
    accentEnd: "#164e63",
  },
  {
    id: "syed-arif",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/SYED-ARIF-b2eea077_jpg.webp?updatedAt=1786622628709",
    initials: "SA",
    name: "Syed Arif",
    hike: "118% Hike",
    role: "Product Manager at Razorpay",
    story: "Built strategic product thinking and secured a high-growth fintech product role.",
    accent: "#2563eb",
    accentEnd: "#4338ca",
  },
  {
    id: "anjali-singh",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever5-09021396.jpg",
    initials: "AS",
    name: "Anjali Singh",
    hike: "220% Hike",
    role: "Product Owner at Amazon",
    story: "Achieved rapid professional growth from 5 LPA to 16 LPA through product leadership and execution skills.",
    accent: "#c2410c",
    accentEnd: "#b45309",
  },
  {
    id: "garima-singh",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever4-9d672823.jpg",
    initials: "GS",
    name: "Garima Singh",
    hike: "200% Hike",
    role: "Product Manager at PepsiCo",
    story: "Transitioned into a global FMCG product role with strong leadership and product management capability.",
    accent: "#be185d",
    accentEnd: "#7e22ce",
  },
  {
    id: "shalini-kumari",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever2-3a2e0a3b.jpg",
    initials: "SK",
    name: "Shalini Kumari",
    hike: "58.33% Hike",
    role: "Associate Product Manager at Abbott",
    story: "Grew from 12 LPA to 19 LPA while strengthening product strategy and hands-on problem solving.",
    accent: "#0369a1",
    accentEnd: "#0f766e",
  },
  {
    id: "aditya-ahlawat",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever3-7a90ad07.jpg",
    initials: "AA",
    name: "Aditya Ahlawat",
    hike: "66% Hike",
    role: "Associate Product Manager, BlackRock",
    story: "Strengthened product strategy and problem-solving capabilities for a finance leadership role.",
    accent: "#312e81",
    accentEnd: "#1e3a8a",
  },
  {
    id: "ipsita sen",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever7-4f504cd7.jpg",
    initials: "IS",
    name: "Ipsita Sen",
    hike: "220% Hike",
    role: "Business Analyst at Concentrix",
    story: "Ipsita Sen successfully secured a Business Analyst role at Concentrix with an exceptional 220% salary hike, showcasing remarkable career growth and professional transformation. Through consistent upskilling, analytical thinking, and dedication towards learning business and product strategies, she strengthened her expertise and unlocked new career opportunities. Her journey reflects determination, continuous improvement, and the ability to achieve significant career advancement in a highly competitive industry",
    accent: "#312e81",
    accentEnd: "#1e3a8a",
  },
  {
    id: "Vikram Singh",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever8-1a1454dd.jpg",
    initials: "VK",
    name: "Vikram Singh",
    hike: "300% Hike",
    role: "Product Manager at Interactly.ai",
    story: "Vikram Singh successfully transitioned into a Product Manager role at Interactly.ai with a remarkable 300% salary hike, demonstrating his ability to drive product strategy and lead cross-functional teams. His journey reflects a strong commitment to continuous learning and professional development.",
    accent: "#312e81",
    accentEnd: "#1e3a8a",
  },
  {
    id: "anjali Desai",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever9-ac333547.jpg",
    initials: "AD",
    name: "Anjali Desai",
    hike: "170% Hike",
    role: "Product Manager at Zomato",
    story: "CareerVeda helped me move into Product Management. The product strategy and user research modules were true game-changers for my career.",
    accent: "#312e81",
    accentEnd: "#1e3a8a",
  },
  {
    id: "Aarohi Khurana",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever10-4a35da07.jpg",
    initials: "AK",
    name: "Aarohi Khurana",
    hike: "90% Hike",
    role: "Growth Product Manager at Airbnb",
    story: "Successfully transitioned into a Growth Product Manager role at Airbnb with an outstanding 90% salary hike, increasing from 10 LPA to 19 LPA. Demonstrated exceptional expertise in product growth strategies, user engagement, and data-driven decision-making throughout the transition journey. Secured a high-impact opportunity with one of the worldâ€™s leading technology and hospitality platforms, marking significant professional and career growth.",
    accent: "#9d174d",
    accentEnd: "#7c2d12",
  },
  {
    id: "Sneha Agarwal",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever11jpeg-79c014b5.jpg?updatedAt=1784010443321",
    initials: "SA",
    name: "Sneha Agarwal",
    hike: "150% Hike",
    role: "Product Executive at PW",
    story: "Contributed to product development, feature execution, and stakeholder coordination while driving business impact and improving user experience. Achieved rapid professional growth with a 150% increase in salary.",
    accent: "#9d174d",
    accentEnd: "#7c2d12",
  },
   {
     id: "Himani Tamta",
     imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever12jpeg-295bcdbc.jpg",
     initials: "HT",
     name: "Himani Tamta",
     hike: "150% Hike",
     role: "Associate Product Manager at Wipro",
     story: "CareerVeda helped me build a strong foundation in problem-solving, feature prioritization, and product planning through practical projects. It equipped me with the data-driven frameworks needed to bridge customer psychology with business growth, ultimately helping me secure my role at Wipro.",
     accent: "#9d174d",
     accentEnd: "#7c2d12",
   },
   {
    id: "Riya Malhotra",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Riya-Malhotra-877ecf3a.jpg?updatedAt=1784206969785",
    initials: "RM",
    name: "Riya Malhotra",
    hike: "140% Hike",
    role: "Senior Business Analyst at Incedo Inc.",
    story: "Contributed to product development, feature execution, and stakeholder coordination while driving business impact and improving user experience. Achieved rapid professional growth with a 140% increase in salary.",
    accent: "#9d174d",
    accentEnd: "#7c2d12",
  },
   {
    id: "Niharika Verma",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Niharika-Verma-1a611215.jpg?updatedAt=1784206793089",
    initials: "NV",
    name: "Niharika Verma",
    hike: "120% Hike",
    role: "Product Analyst at Cognizant Softvision",
    story: "Contributed to product development, feature execution, and stakeholder coordination while driving business impact and improving user experience. Achieved rapid professional growth with a 120% increase in salary.",
    accent: "#9d174d",
    accentEnd: "#7c2d12",
  },
   {
    id: "Sanya Kapoor",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Sanya-Kapoor-964e07e6.jpg?updatedAt=1784206653269",
    initials: "SK",
    name: "Sanya Kapoor",
    hike: "165% Hike",
    role: "Data Analytics Consultant at Brillio",
    story: "Contributed to product development, feature execution, and stakeholder coordination while driving business impact and improving user experience. Achieved rapid professional growth with a 165% increase in salary.",
    accent: "#9d174d",
    accentEnd: "#7c2d12",
  },
   {
    id: "Arjun Mehta",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Arjun-Mehta-743badce.jpg?updatedAt=1784206469468",
    initials: "AM",
    name: "Arjun Mehta",
    hike: "120% Hike",
    role: "Business Intelligence Specialist at Tredence ",
    story: "Contributed to product development, feature execution, and stakeholder coordination while driving business impact and improving user experience. Achieved rapid professional growth with a 120% increase in salary.",
    accent: "#9d174d",
    accentEnd: "#7c2d12",
  },
   {
    id: "Karan Sharma",
    imageUrl: "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever13-13af87cb.jpg?updatedAt=1784206303783",
    initials: "KS",
    name: "Karan Sharma",
    hike: "100% Hike",
    role: "Senior Data Analyst at LatentView Analytics",
    story: "Contributed to product development, feature execution, and stakeholder coordination while driving business impact and improving user experience. Achieved rapid professional growth with a 100% increase in salary.",
    accent: "#9d174d",
    accentEnd: "#7c2d12",
  },
  
];

const resolveProfileImage = (profile) => {
  const imageUrl = typeof profile.imageUrl === "string" ? profile.imageUrl.trim() : "";
  return imageUrl || photoBySlug[profile.id] || avatarPlaceholder(profile);
};

export const alumniSpotlights = spotlightProfiles.map((profile) => ({
  ...profile,
  image: resolveProfileImage(profile),
}));

export const alumniDomeImages = alumniSpotlights.map(({ id, image, name }) => ({
  id,
  src: image,
  alt: `Portrait of ${name}`,
}));
