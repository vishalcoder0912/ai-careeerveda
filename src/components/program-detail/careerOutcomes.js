// Program Detail — "Career Outcomes" section data.
//
// Deliberately isolated from src/data/siteData: the Learner Outcomes widget on
// the Home and Programs pages reads `stats` + `reviews` from that module, so
// sharing those arrays here would make one component's content silently edit
// the others'. This module is ProgramCareers' own snapshot — editing the
// testimonials or metrics on the home/programs/alumni pages leaves this section
// untouched, and vice-versa. The alumni admin panel still overrides the
// testimonial carousel (ProgramCareers uses this list only as the offline
// fallback while the API answers).

export const careerStats = [
  ["13,000+", "Successful Learners"],
  ["900+", "Recruitment Partners"],
  ["86%", "Average Salary Growth"],
  ["300+", "Career Programs"],
  ["200+", "Professional Mentors"],
];

export const careerReviews = [
  [
    "Anant Shiva",
    "Product Development at High Radius",
    "This program was exactly what I needed to transition into Product Management the industry-relevant curriculum and strong placement support helped me secure a role at HighRadius. Grateful to Team CareerVeda for the exceptional support throughout my journey!",
    "Product Management",
    "https://ik.imagekit.io/q7ucn1rfni/careerveda/alumni/Achiever1-4e81fee0_jpg.webp?updatedAt=1783935492818",
  ],
  [
    "Nikunj Awasthi",
    "Associate Product Manager at Amazon",
    "My journey into Product Management started with a simple curiosity-how are products built, and what makes them valuable to users? As I explored the field, I became passionate about understanding customer problems and building meaningful solutions. The Product Management Program at CareerVeda helped me strengthen my skills in product strategy, customer-centric thinking, and practical problem-solving.",
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