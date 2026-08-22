
export const pressLogos = {
  // "IndiaNews24": "/press/indianews24.png",
  // "The Indi-Forbes": "https://ik.imagekit.io/anwnlsdyv/careerveda/press/indiforbes.png",
  "IndiaNews24": "https://ik.imagekit.io/q7ucn1rfni/careerveda/press/cropped-India-News24-PNG-b24338bd_png.webp?updatedAt=1786622627531",
  "The Indi-Forbes": "https://ik.imagekit.io/q7ucn1rfni/careerveda/press/theindianforbes-df6206e5_png.jpeg?updatedAt=1786622627715",
  "Hindustan Insider": "https://ik.imagekit.io/q7ucn1rfni/careerveda/press/hindustaninsider-9a75e37e_jpg.webp?updatedAt=1786622627659",
  "Hindustan Metro": "https://ik.imagekit.io/q7ucn1rfni/careerveda/press/hindustanmetro-cfc1bd68_png.webp?updatedAt=1786622627861",
  "Hindustan Bytes": "",
  "The Viral Bytes": "https://ik.imagekit.io/q7ucn1rfni/careerveda/press/the%20viral%20bytes.jpg?updatedAt=1786622627558",
  "Punjab Bytes": "https://ik.imagekit.io/q7ucn1rfni/careerveda/press/punjab_bytes-5a917311_png.webp?updatedAt=1786622627793",
  "Entrepreneur Hunt": "https://ik.imagekit.io/q7ucn1rfni/careerveda/press/entrepreneu-hunt-796c3957.png?updatedAt=1786622627468",
  "TPTV": "https://ik.imagekit.io/q7ucn1rfni/careerveda/press/tptc-9571c98a_png.webp?updatedAt=1786622627753",
  "The Daily Beat": "https://ik.imagekit.io/q7ucn1rfni/careerveda/press/The_daily_beat-fe2d5c62_png.webp?updatedAt=1786622627830",
  "Influencive India": "https://ik.imagekit.io/q7ucn1rfni/careerveda/press/influencive_india-47c660cf_png.webp?updatedAt=1786622627694",
  "InstaStory": "https://ik.imagekit.io/q7ucn1rfni/careerveda/press/insta_story-523a01e0_png.webp?updatedAt=1786622627807",
  "DailyHunt": "https://ik.imagekit.io/q7ucn1rfni/careerveda/press/daily%20hunt%201.jpg",
};


export const pressArticles = [
  {
    id: "placement-benchmarks",
    tag: "Placement Milestone",
    date: "April 2026",
    image: "",
    title:
      "CareerVeda Sets New Placement Benchmarks in Product Management & Analytics Programs",
    excerpt:
      "CareerVeda closed its latest placement season with standout results across its Product Management, Business Analytics, and Data Analytics programs  with over 68% of the Product Management batch placed within just 18 days, driven by practical, mentor-led learning.",
    stats: [
      ["300+", "Students placed"],
      ["130+", "Recruiters"],
      ["68%", "Placed in 18 days"],
      ["20+ LPA", "Highest package"],
    ],
    highlights: [
      "72%+ secured packages above 10 LPA",
      "Average package 10 LPA",
      "20+ first-time recruiters onboarded",
    ],
    sources: [
      {name: "IndiaNews24", url: "https://indianews24.co/careerveda-sets-new-placement-benchmarks-in-product-management-analytics-programs/"},
      {name: "The Indi-Forbes", url: "https://theindi-forbes.com/2026/04/08/careerveda-sets-new-placement-benchmarks-in-product-management-analytics-programs/"},
      {name: "Hindustan Insider", url: "https://hindustaninsider.in/2026/04/08/careerveda-sets-new-placement-benchmarks-in-product-management-analytics-programs/"},
    ],
  },
  {
    id: "best-institute",
    tag: "Recognition",
    date: "March 2026",
    image: "",
    title:
      "CareerVeda Recognized as India's Best Institute for Online Upskilling with Placement Support",
    excerpt:
      "CareerVeda has earned recognition as India's premier online upskilling institute, praised for its industry-aligned programs in Data Science, Business Analytics, and emerging technologies  backed by hands-on projects, real-world case studies, and dedicated placement support.",
    highlights: [
      "Industry-aligned curriculum",
      "Hands-on projects & case studies",
      "Resume, mock interviews & hiring partners",
    ],
    sources: [
      {name: "Hindustan Metro", url: "https://www.hindustanmetro.com/careerveda-recognized-as-indias-best-institute-for-online-upskilling-with-placement-support/"},
      //{name: "Hindustan Bytes", url: "https://hindustanbytes.com/careerveda-recognized-as-indias-best-institute-for-online-upskilling-with-placement-support"},
      {name: "The Viral Bytes", url: "https://theviralbytes.in/careerveda-recognized-as-indias-best-institute-for-online-upskilling-with-placement-support"},
      {name: "Punjab Bytes", url: "https://english.punjabbytes.com/careerveda-recognized-as-indias-best-institute-for-online-upskilling-with-placement-support"},
      {name: "Entrepreneur Hunt", url: "https://entrepreneurhunt.com/careerveda-recognized-as-indias-best-institute-for-online-upskilling-with-placement-support"},
      {name: "TPTV", url: "https://tptv.in/careerveda-recognized-as-indias-best-institute-for-online-upskilling-with-placement-support"},
      {name: "The Daily Beat", url: "https://thedailybeat.in/careerveda-recognized-as-indias-best-institute-for-online-upskilling-with-placement-support"},
      {name: "Influencive India", url: "https://influenciveindia.in/careerveda-recognized-as-indias-best-institute-for-online-upskilling-with-placement-support"},
      {name: "InstaStory", url: "https://instastory.in/careerveda-recognized-as-indias-best-institute-for-online-upskilling-with-placement-support"},
      {name: "DailyHunt", url: "https://dhunt.in/13OAkM"},
    ],
  },
];

// Every outlet that has featured CareerVeda, for the closing "media wall" card.
export const pressOutlets = pressArticles
  .flatMap((a) => a.sources)
  .filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i);
